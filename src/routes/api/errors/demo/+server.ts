/**
 * Demo API route showcasing the new centralized error handling system
 */

import type { RequestHandler } from './$types';
import { apiRoute, extractRequestContext } from '$lib/errors/handler.js';
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  DatabaseError,
  SystemError
} from '$lib/errors/index.js';
import { json } from '@sveltejs/kit';

// Demo route using new error handling
export const GET: RequestHandler = apiRoute(async (event) => {
  const errorType = event.url.searchParams.get('type');
  const context = extractRequestContext(event);

  switch (errorType) {
    case 'validation':
      throw new ValidationError('Invalid demo parameters', context, {
        allowedTypes: ['validation', 'auth', 'notfound', 'database', 'system']
      });

    case 'auth':
      throw new AuthenticationError('Demo authentication failure', context);

    case 'notfound':
      throw new NotFoundError('Demo Resource', context);

    case 'database':
      throw new DatabaseError('Demo database connection failed', context);

    case 'system':
      throw new SystemError('Demo system failure', context);

    case 'unknown':
      // Simulate an unknown error
      throw new Error('This is an unhandled error type');

    default:
      return json({
        success: true,
        message: 'Error handling demo',
        availableTypes: ['validation', 'auth', 'notfound', 'database', 'system', 'unknown'],
        usage: 'Add ?type=validation (or other type) to see error handling in action'
      });
  }
}, {
  includeStackTrace: true,
  logErrors: true,
  includeContext: true
});

export const POST: RequestHandler = apiRoute(async (event) => {
  const body = await event.request.json().catch(() => null);

  if (!body) {
    throw new ValidationError('Request body is required');
  }

  if (!body.message) {
    throw new ValidationError('Message field is required', undefined, {
      receivedFields: Object.keys(body)
    });
  }

  return json({
    success: true,
    message: 'Successfully processed request',
    echo: body.message
  });
});