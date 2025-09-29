/**
 * Application-specific logging utilities
 * Provides domain-specific logging methods for UnConf
 */

import { logger, type LogContext } from './index.js';

/**
 * Event-related logging
 */
export const eventLogger = {
  created: (eventId: string, organizerId: string, context: LogContext = {}) => {
    logger.info('Event created', {
      ...context,
      component: 'events',
      operation: 'create',
      eventId,
      organizerId
    });
  },

  updated: (eventId: string, changes: string[], context: LogContext = {}) => {
    logger.info('Event updated', {
      ...context,
      component: 'events',
      operation: 'update',
      eventId
    }, { changes });
  },

  deleted: (eventId: string, context: LogContext = {}) => {
    logger.warn('Event deleted', {
      ...context,
      component: 'events',
      operation: 'delete',
      eventId
    });
  },

  statusChanged: (eventId: string, oldStatus: string, newStatus: string, context: LogContext = {}) => {
    logger.info('Event status changed', {
      ...context,
      component: 'events',
      operation: 'status_change',
      eventId
    }, { oldStatus, newStatus });
  },

  participated: (eventId: string, userId: string, context: LogContext = {}) => {
    logger.info('User joined event', {
      ...context,
      component: 'events',
      operation: 'join',
      eventId,
      userId
    });
  }
};

/**
 * Voting-related logging
 */
export const votingLogger = {
  cast: (voteId: string, userId: string, topicId: string, weight: string, context: LogContext = {}) => {
    logger.info('Vote cast', {
      ...context,
      component: 'voting',
      operation: 'cast',
      userId,
      topicId
    }, { voteId, weight });
  },

  updated: (voteId: string, userId: string, topicId: string, newWeight: string, context: LogContext = {}) => {
    logger.info('Vote updated', {
      ...context,
      component: 'voting',
      operation: 'update',
      userId,
      topicId
    }, { voteId, newWeight });
  },

  removed: (voteId: string, userId: string, topicId: string, context: LogContext = {}) => {
    logger.info('Vote removed', {
      ...context,
      component: 'voting',
      operation: 'remove',
      userId,
      topicId
    }, { voteId });
  },

  roundStarted: (eventId: string, round: number, context: LogContext = {}) => {
    logger.info('Voting round started', {
      ...context,
      component: 'voting',
      operation: 'round_start',
      eventId
    }, { round });
  },

  roundEnded: (eventId: string, round: number, totalVotes: number, context: LogContext = {}) => {
    logger.info('Voting round ended', {
      ...context,
      component: 'voting',
      operation: 'round_end',
      eventId
    }, { round, totalVotes });
  }
};

/**
 * Topic-related logging
 */
export const topicLogger = {
  submitted: (topicId: string, userId: string, eventId: string, title: string, context: LogContext = {}) => {
    logger.info('Topic submitted', {
      ...context,
      component: 'topics',
      operation: 'submit',
      topicId,
      userId,
      eventId
    }, { title });
  },

  approved: (topicId: string, moderatorId: string, context: LogContext = {}) => {
    logger.info('Topic approved', {
      ...context,
      component: 'topics',
      operation: 'approve',
      topicId,
      userId: moderatorId
    });
  },

  rejected: (topicId: string, moderatorId: string, reason: string, context: LogContext = {}) => {
    logger.warn('Topic rejected', {
      ...context,
      component: 'topics',
      operation: 'reject',
      topicId,
      userId: moderatorId
    }, { reason });
  },

  statsUpdated: (topicId: string, voteCount: number, averageWeight: number, context: LogContext = {}) => {
    logger.debug('Topic stats updated', {
      ...context,
      component: 'topics',
      operation: 'stats_update',
      topicId
    }, { voteCount, averageWeight });
  }
};

/**
 * Authentication-related logging
 */
export const authLogger = {
  login: (userId: string, provider: string, context: LogContext = {}) => {
    logger.logAuth('user_login', {
      ...context,
      userId
    }, { provider });
  },

  logout: (userId: string, context: LogContext = {}) => {
    logger.logAuth('user_logout', {
      ...context,
      userId
    });
  },

  loginFailed: (email: string, reason: string, context: LogContext = {}) => {
    logger.warn('Login failed', {
      ...context,
      component: 'authentication',
      operation: 'login_failed'
    }, { email: email.replace(/(?<=.{2}).(?=.*@)/g, '*'), reason });
  },

  sessionCreated: (userId: string, sessionId: string, context: LogContext = {}) => {
    logger.logAuth('session_created', {
      ...context,
      userId
    }, { sessionId });
  },

  sessionExpired: (userId: string, sessionId: string, context: LogContext = {}) => {
    logger.logAuth('session_expired', {
      ...context,
      userId
    }, { sessionId });
  },

  guestAccess: (guestId: string, eventId: string, context: LogContext = {}) => {
    logger.logAuth('guest_access', {
      ...context,
      userId: guestId,
      eventId
    });
  }
};

/**
 * Security-related logging
 */
export const securityLogger = {
  suspiciousActivity: (description: string, severity: 'low' | 'medium' | 'high' | 'critical', context: LogContext = {}) => {
    logger.logSecurity(`Suspicious activity: ${description}`, severity, context);
  },

  rateLimitExceeded: (identifier: string, endpoint: string, context: LogContext = {}) => {
    logger.logSecurity(`Rate limit exceeded for ${endpoint}`, 'medium', {
      ...context,
      additionalData: { identifier, endpoint }
    });
  },

  unauthorizedAccess: (resource: string, context: LogContext = {}) => {
    logger.logSecurity(`Unauthorized access attempt to ${resource}`, 'high', context);
  },

  dataValidationFailed: (field: string, value: string, context: LogContext = {}) => {
    logger.logSecurity(`Data validation failed for ${field}`, 'low', {
      ...context,
      additionalData: { field, value: value.substring(0, 50) + '...' }
    });
  },

  csrfAttempt: (context: LogContext = {}) => {
    logger.logSecurity('Potential CSRF attempt detected', 'high', context);
  },

  xssAttempt: (input: string, context: LogContext = {}) => {
    logger.logSecurity('Potential XSS attempt detected', 'high', {
      ...context,
      additionalData: { input: input.substring(0, 100) + '...' }
    });
  }
};

/**
 * Performance logging
 */
export const performanceLogger = {
  apiRequest: (endpoint: string, method: string, duration: number, statusCode: number, context: LogContext = {}) => {
    logger.logPerformance(`API ${method} ${endpoint}`, duration, {
      ...context,
      component: 'api'
    });

    if (duration > 3000) {
      logger.warn('Slow API request detected', {
        ...context,
        component: 'performance',
        operation: 'slow_request'
      }, { endpoint, method, duration, statusCode });
    }
  },

  databaseQuery: (operation: string, table: string, duration: number, context: LogContext = {}) => {
    logger.logPerformance(`DB ${operation} ${table}`, duration, {
      ...context,
      component: 'database'
    });

    if (duration > 1000) {
      logger.warn('Slow database query detected', {
        ...context,
        component: 'performance',
        operation: 'slow_query'
      }, { operation, table, duration });
    }
  },

  websocketMessage: (messageType: string, duration: number, context: LogContext = {}) => {
    logger.logPerformance(`WebSocket ${messageType}`, duration, {
      ...context,
      component: 'websocket'
    });
  },

  fileOperation: (operation: string, filename: string, duration: number, context: LogContext = {}) => {
    logger.logPerformance(`File ${operation} ${filename}`, duration, {
      ...context,
      component: 'filesystem'
    });
  }
};

/**
 * System monitoring logging
 */
export const systemLogger = {
  startup: (version: string, environment: string, context: LogContext = {}) => {
    logger.info('Application startup', {
      ...context,
      component: 'system',
      operation: 'startup'
    }, { version, environment });
  },

  shutdown: (reason: string, context: LogContext = {}) => {
    logger.info('Application shutdown', {
      ...context,
      component: 'system',
      operation: 'shutdown'
    }, { reason });
  },

  healthCheck: (status: 'healthy' | 'degraded' | 'unhealthy', checks: Record<string, boolean>, context: LogContext = {}) => {
    const level = status === 'healthy' ? 'info' : status === 'degraded' ? 'warn' : 'error';

    logger[level](`Health check: ${status}`, {
      ...context,
      component: 'system',
      operation: 'health_check'
    }, { checks });
  },

  resourceUsage: (cpu: number, memory: number, connections: number, context: LogContext = {}) => {
    logger.debug('Resource usage', {
      ...context,
      component: 'system',
      operation: 'resource_monitoring'
    }, { cpu, memory, connections });

    // Alert on high resource usage
    if (cpu > 80 || memory > 85) {
      logger.warn('High resource usage detected', {
        ...context,
        component: 'system',
        operation: 'resource_alert'
      }, { cpu, memory, connections });
    }
  },

  errorThreshold: (errorType: string, count: number, threshold: number, context: LogContext = {}) => {
    logger.error('Error threshold exceeded', {
      ...context,
      component: 'system',
      operation: 'error_threshold'
    }, { errorType, count, threshold });
  }
};

/**
 * Export all loggers for easy access
 */
export const appLogger = {
  event: eventLogger,
  voting: votingLogger,
  topic: topicLogger,
  auth: authLogger,
  security: securityLogger,
  performance: performanceLogger,
  system: systemLogger
};