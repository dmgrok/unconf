/**
 * Error Handler Middleware and Utilities
 */

import { json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { AppError, ValidationError, createErrorFromUnknown, ErrorCategory } from './index.js';
import { logger } from '../logging/index.js';
import type { RequestEvent } from '@sveltejs/kit';

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    retryable: boolean;
    details?: unknown;
  };
  timestamp: string;
  requestId?: string;
}

export interface ErrorHandlerOptions {
  includeStackTrace?: boolean;
  logErrors?: boolean;
  includeContext?: boolean;
}

/**
 * Extract context information from a SvelteKit request event
 */
export function extractRequestContext(event: RequestEvent): Record<string, unknown> {
  return {
    url: event.url.toString(),
    method: event.request.method,
    userAgent: event.request.headers.get('user-agent'),
    referer: event.request.headers.get('referer'),
    ip: event.getClientAddress(),
    sessionId: event.cookies.get('session-id'),
    userId: event.locals.user?.id
  };
}

/**
 * Handle errors in API routes
 */
export function handleApiError(
  error: unknown,
  context: Record<string, unknown> = {},
  options: ErrorHandlerOptions = {}
): Response {
  const { includeStackTrace = false, logErrors = true, includeContext = false } = options;

  let appError: AppError;

  // Convert various error types to AppError
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof ZodError) {
    appError = new ValidationError(
      'Validation failed',
      context,
      { validationErrors: error.issues }
    );
  } else {
    appError = createErrorFromUnknown(error, ErrorCategory.SYSTEM, context);
  }

  // Log the error if requested
  if (logErrors) {
    logger.logError(appError, context);
  }

  // Create response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message: appError.userFriendlyMessage,
      code: appError.code,
      retryable: appError.retryable,
      ...(includeContext && { details: appError.context.additionalData })
    },
    timestamp: new Date().toISOString(),
    ...(context.requestId && { requestId: String(context.requestId) })
  };

  // Include stack trace in development
  if (includeStackTrace && process.env.NODE_ENV === 'development') {
    errorResponse.error.details = {
      ...errorResponse.error.details,
      stackTrace: appError.stack,
      originalMessage: appError.message
    };
  }

  return json(errorResponse, { status: appError.statusCode });
}

/**
 * Async wrapper that automatically handles errors
 */
export function withErrorHandling<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>,
  context: Record<string, unknown> = {}
) {
  return async (...args: T): Promise<R | Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error, context);
    }
  };
}

/**
 * SvelteKit API route wrapper
 */
export function apiRoute<T extends RequestEvent>(
  handler: (event: T) => Promise<Response>,
  options: ErrorHandlerOptions = {}
) {
  return async (event: T): Promise<Response> => {
    try {
      return await handler(event);
    } catch (error) {
      const context = extractRequestContext(event);
      return handleApiError(error, context, options);
    }
  };
}

/**
 * Handle WebSocket errors
 */
export function handleWebSocketError(
  error: unknown,
  context: Record<string, unknown> = {}
): { success: false; error: string; retryable: boolean } {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else {
    appError = createErrorFromUnknown(error, ErrorCategory.WEBSOCKET, context);
  }

  logger.logError(appError, context);

  return {
    success: false,
    error: appError.userFriendlyMessage,
    retryable: appError.retryable
  };
}

/**
 * Error boundary for Svelte components
 */
export function createErrorBoundary(
  onError?: (error: AppError) => void
) {
  return {
    handleError(error: unknown, context: Record<string, unknown> = {}): AppError {
      const appError = error instanceof AppError
        ? error
        : createErrorFromUnknown(error, ErrorCategory.SYSTEM, context);

      logger.logError(appError, context);

      if (onError) {
        onError(appError);
      }

      return appError;
    }
  };
}


/**
 * Rate limiting for error reporting
 */
const errorRateLimit = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // Max 10 errors per minute per error code

export function shouldLogError(errorCode: string): boolean {
  const now = Date.now();
  const entry = errorRateLimit.get(errorCode);

  if (!entry || now - entry.lastReset > RATE_LIMIT_WINDOW) {
    errorRateLimit.set(errorCode, { count: 1, lastReset: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}