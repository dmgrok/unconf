/**
 * Demo API route showcasing the structured logging system
 */

import type { RequestHandler } from './$types';
import { apiRoute, extractRequestContext } from '$lib/errors/handler.js';
import { logger } from '$lib/logging/index.js';
import { appLogger } from '$lib/logging/applicationLogger.js';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = apiRoute(async (event) => {
  const logType = event.url.searchParams.get('type');
  const context = extractRequestContext(event);

  // Simulate different logging scenarios
  switch (logType) {
    case 'event':
      appLogger.event.created('demo-event-123', 'user-456', context);
      appLogger.event.statusChanged('demo-event-123', 'draft', 'active', context);
      break;

    case 'voting':
      appLogger.voting.cast('vote-789', 'user-456', 'topic-101', 'first', context);
      appLogger.voting.roundStarted('demo-event-123', 1, context);
      break;

    case 'auth':
      appLogger.auth.login('user-456', 'google', context);
      appLogger.auth.sessionCreated('user-456', 'session-abc', context);
      break;

    case 'security':
      appLogger.security.suspiciousActivity('Multiple failed login attempts', 'medium', context);
      appLogger.security.rateLimitExceeded('192.168.1.100', '/api/votes', context);
      break;

    case 'performance':
      const startTime = Date.now();
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 150));
      const duration = Date.now() - startTime;

      appLogger.performance.apiRequest('/api/logging/demo', 'GET', duration, 200, context);
      appLogger.performance.databaseQuery('SELECT', 'events', 45, context);
      break;

    case 'system':
      appLogger.system.healthCheck('healthy', {
        database: true,
        websocket: true,
        storage: true
      }, context);
      appLogger.system.resourceUsage(45, 62, 150, context);
      break;

    case 'structured':
      // Demonstrate various log levels with structured data
      logger.debug('Debug message with context', context, { debugData: 'test' });
      logger.info('Info message', context, { infoData: { nested: 'object' } });
      logger.warn('Warning message', context, { warningLevel: 'medium' });
      logger.error('Error message', context, { errorDetails: 'simulation' });
      break;

    case 'websocket':
      logger.logWebSocket('message_received', context, {
        messageType: 'join_event',
        payload: { eventId: 'demo-123', userId: 'user-456' }
      });
      logger.logWebSocket('broadcast_sent', context, {
        event: 'user_count_update',
        recipients: 25
      });
      break;

    case 'database':
      logger.logDatabase('query_executed', context, {
        table: 'events',
        operation: 'SELECT',
        rowsAffected: 5,
        executionTime: 23
      });
      logger.logDatabase('migration_applied', context, {
        version: '1.2.3',
        tables: ['events', 'users']
      });
      break;

    default:
      // Show all available demo types
      const demoTypes = [
        'event', 'voting', 'auth', 'security', 'performance',
        'system', 'structured', 'websocket', 'database'
      ];

      logger.info('Logging demo accessed', context, {
        availableTypes: demoTypes,
        requestedType: logType
      });

      return json({
        success: true,
        message: 'Logging system demo',
        availableTypes: demoTypes,
        usage: 'Add ?type=event (or other type) to see different logging examples',
        currentlyLogged: 'This request has been logged with structured data'
      });
  }

  return json({
    success: true,
    message: `Demonstrated ${logType} logging`,
    note: 'Check console/logs for structured output'
  });
});

export const POST: RequestHandler = apiRoute(async (event) => {
  const startTime = Date.now();
  const context = extractRequestContext(event);

  try {
    const body = await event.request.json();

    // Log the request
    logger.info('Demo POST request received', context, {
      bodyKeys: Object.keys(body),
      contentType: event.request.headers.get('content-type')
    });

    // Simulate processing
    if (body.simulateError) {
      throw new Error('Simulated processing error');
    }

    if (body.simulateSlowResponse) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const duration = Date.now() - startTime;

    // Log performance
    appLogger.performance.apiRequest('/api/logging/demo', 'POST', duration, 200, context);

    // Log successful processing
    logger.info('Demo POST request processed successfully', context, {
      processingTime: duration,
      responseSize: body.responseSize || 'small'
    });

    return json({
      success: true,
      message: 'POST request processed and logged',
      processingTime: duration,
      logged: {
        request: 'Incoming request logged with body analysis',
        performance: 'Processing time tracked and logged',
        response: 'Response logged with metadata'
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    // Error is automatically logged by the error handler
    // But we can add additional context here
    logger.error('Demo POST request processing failed', context, {
      processingTime: duration,
      errorStep: 'request_processing'
    });

    throw error; // Re-throw to trigger error handler
  }
});