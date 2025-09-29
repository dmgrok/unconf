/**
 * Centralized Error Handling System
 * Provides consistent error handling across the entire application
 */

export interface ErrorContext {
  userId?: string;
  eventId?: string;
  topicId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  timestamp: Date;
  stackTrace?: string;
  additionalData?: Record<string, unknown>;
}

export interface UserFriendlyError {
  message: string;
  code: string;
  retryable: boolean;
  supportContact?: string;
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  DATABASE = 'database',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  EXTERNAL_SERVICE = 'external_service',
  WEBSOCKET = 'websocket'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export class AppError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly userFriendlyMessage: string;
  public readonly retryable: boolean;
  public readonly statusCode: number;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: Partial<ErrorContext> = {},
    userFriendlyMessage?: string,
    retryable = false,
    statusCode = 500
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.context = {
      timestamp: new Date(),
      stackTrace: this.stack,
      ...context
    };
    this.userFriendlyMessage = userFriendlyMessage || this.getDefaultUserMessage();
    this.retryable = retryable;
    this.statusCode = statusCode;
  }

  private getDefaultUserMessage(): string {
    switch (this.category) {
      case ErrorCategory.VALIDATION:
        return 'Please check your input and try again.';
      case ErrorCategory.AUTHENTICATION:
        return 'Please sign in to continue.';
      case ErrorCategory.AUTHORIZATION:
        return 'You don\'t have permission to perform this action.';
      case ErrorCategory.NETWORK:
        return 'Network connection issue. Please try again.';
      case ErrorCategory.DATABASE:
        return 'Unable to save your changes. Please try again.';
      case ErrorCategory.BUSINESS_LOGIC:
        return 'This action cannot be completed right now.';
      case ErrorCategory.WEBSOCKET:
        return 'Real-time connection lost. Reconnecting...';
      default:
        return 'Something went wrong. Please try again later.';
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      userFriendlyMessage: this.userFriendlyMessage,
      retryable: this.retryable,
      statusCode: this.statusCode
    };
  }
}

// Predefined error types for common scenarios
export class ValidationError extends AppError {
  constructor(message: string, context?: Partial<ErrorContext>, details?: Record<string, unknown>) {
    super(
      message,
      'VALIDATION_ERROR',
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      { ...context, additionalData: details },
      'Please check your input and try again.',
      false,
      400
    );
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, context?: Partial<ErrorContext>) {
    super(
      message,
      'AUTHENTICATION_ERROR',
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.MEDIUM,
      context,
      'Please sign in to continue.',
      false,
      401
    );
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, context?: Partial<ErrorContext>) {
    super(
      message,
      'AUTHORIZATION_ERROR',
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.MEDIUM,
      context,
      'You don\'t have permission to perform this action.',
      false,
      403
    );
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context?: Partial<ErrorContext>) {
    super(
      `${resource} not found`,
      'NOT_FOUND_ERROR',
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.LOW,
      context,
      `The requested ${resource.toLowerCase()} could not be found.`,
      false,
      404
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Partial<ErrorContext>) {
    super(
      message,
      'CONFLICT_ERROR',
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      context,
      'This action conflicts with existing data.',
      false,
      409
    );
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Partial<ErrorContext>) {
    super(
      message,
      'DATABASE_ERROR',
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      context,
      'Unable to save your changes. Please try again.',
      true,
      500
    );
  }
}

export class NetworkError extends AppError {
  constructor(message: string, context?: Partial<ErrorContext>) {
    super(
      message,
      'NETWORK_ERROR',
      ErrorCategory.NETWORK,
      ErrorSeverity.MEDIUM,
      context,
      'Network connection issue. Please try again.',
      true,
      503
    );
  }
}

export class WebSocketError extends AppError {
  constructor(message: string, context?: Partial<ErrorContext>) {
    super(
      message,
      'WEBSOCKET_ERROR',
      ErrorCategory.WEBSOCKET,
      ErrorSeverity.MEDIUM,
      context,
      'Real-time connection lost. Reconnecting...',
      true,
      500
    );
  }
}

export class SystemError extends AppError {
  constructor(message: string, context?: Partial<ErrorContext>) {
    super(
      message,
      'SYSTEM_ERROR',
      ErrorCategory.SYSTEM,
      ErrorSeverity.CRITICAL,
      context,
      'System is temporarily unavailable. Please try again later.',
      true,
      500
    );
  }
}

// Error factory for creating errors from unknown sources
export function createErrorFromUnknown(
  error: unknown,
  category: ErrorCategory = ErrorCategory.SYSTEM,
  context: Partial<ErrorContext> = {}
): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      'UNKNOWN_ERROR',
      category,
      ErrorSeverity.MEDIUM,
      { ...context, stackTrace: error.stack },
      undefined,
      true
    );
  }

  return new AppError(
    String(error),
    'UNKNOWN_ERROR',
    category,
    ErrorSeverity.MEDIUM,
    context,
    undefined,
    true
  );
}