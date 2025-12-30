/**
 * Error Handling Alerting Integration
 * Automatically triggers alerts based on error patterns and frequency
 */

import { alertManager } from '../alerting/index.js';
import { logger } from '../logging/index.js';
import type { AppError } from '../errors/index.js';

export interface ErrorPattern {
  id: string;
  pattern: RegExp | string;
  severity: 'critical' | 'warning' | 'info';
  threshold: number; // Number of occurrences within time window
  timeWindowMs: number; // Time window in milliseconds
  cooldownMs: number; // Cooldown between alerts
}

export class ErrorAlertingIntegration {
  private errorCounts = new Map<string, Date[]>();
  private lastAlerts = new Map<string, Date>();
  
  private readonly defaultPatterns: ErrorPattern[] = [
    {
      id: 'database-connection-error',
      pattern: /database.*connection.*failed|ECONNREFUSED.*database|connection.*timeout.*database/i,
      severity: 'critical',
      threshold: 3,
      timeWindowMs: 5 * 60 * 1000, // 5 minutes
      cooldownMs: 15 * 60 * 1000 // 15 minutes
    },
    {
      id: 'authentication-failures',
      pattern: /authentication.*failed|unauthorized.*access|invalid.*credentials/i,
      severity: 'warning',
      threshold: 10,
      timeWindowMs: 10 * 60 * 1000, // 10 minutes
      cooldownMs: 30 * 60 * 1000 // 30 minutes
    },
    {
      id: 'websocket-connection-error',
      pattern: /websocket.*connection.*failed|ws.*connection.*error|socket.*disconnect/i,
      severity: 'warning',
      threshold: 5,
      timeWindowMs: 5 * 60 * 1000, // 5 minutes
      cooldownMs: 10 * 60 * 1000 // 10 minutes
    },
    {
      id: 'memory-errors',
      pattern: /out.*of.*memory|memory.*allocation.*failed|heap.*overflow/i,
      severity: 'critical',
      threshold: 1,
      timeWindowMs: 60 * 1000, // 1 minute
      cooldownMs: 5 * 60 * 1000 // 5 minutes
    },
    {
      id: 'file-system-errors',
      pattern: /ENOENT|EACCES|EMFILE|disk.*full|filesystem.*error/i,
      severity: 'warning',
      threshold: 5,
      timeWindowMs: 10 * 60 * 1000, // 10 minutes
      cooldownMs: 20 * 60 * 1000 // 20 minutes
    },
    {
      id: 'api-rate-limit-errors',
      pattern: /rate.*limit.*exceeded|too.*many.*requests|quota.*exceeded/i,
      severity: 'warning',
      threshold: 3,
      timeWindowMs: 5 * 60 * 1000, // 5 minutes
      cooldownMs: 15 * 60 * 1000 // 15 minutes
    }
  ];

  constructor() {
    // Clean up old error counts periodically
    setInterval(() => {
      this.cleanupOldErrors();
    }, 60 * 1000); // Every minute
  }

  /**
   * Track an error and potentially trigger alerts
   */
  trackError(error: Error | AppError | string): void {
    const errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.debug('Error tracked for alerting', { component: 'error-alerting' }, {
      message: errorMessage,
      stack: errorStack
    });

    // Check against all patterns
    for (const pattern of this.defaultPatterns) {
      if (this.matchesPattern(errorMessage, pattern)) {
        this.recordError(pattern.id);
        this.checkThreshold(pattern, errorMessage, errorStack);
      }
    }
  }

  /**
   * Track a critical system error
   */
  trackCriticalError(error: Error | AppError | string, component: string): void {
    const errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
    
    logger.error('Critical error tracked', { component: 'error-alerting' }, {
      component,
      error: errorMessage
    });

    // Immediately trigger critical alert
    alertManager.triggerAlert('critical-system-error', 1, {
      component,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined
    });
  }

  /**
   * Track API errors and check for patterns
   */
  trackAPIError(endpoint: string, method: string, statusCode: number, error?: Error): void {
    logger.warn('API error tracked', { component: 'error-alerting' }, {
      endpoint,
      method,
      statusCode,
      error: error?.message
    });

    // Track 5xx errors specifically
    if (statusCode >= 500) {
      this.recordError('api-5xx-errors');
      
      const pattern: ErrorPattern = {
        id: 'api-5xx-errors',
        pattern: '', // Not used for this check
        severity: 'warning',
        threshold: 10,
        timeWindowMs: 10 * 60 * 1000, // 10 minutes
        cooldownMs: 20 * 60 * 1000 // 20 minutes
      };

      this.checkThreshold(pattern, `API 5xx errors on ${endpoint}`, undefined);
    }

    // Track specific error patterns in API responses
    if (error) {
      this.trackError(error);
    }
  }

  /**
   * Check if error message matches a pattern
   */
  private matchesPattern(message: string, pattern: ErrorPattern): boolean {
    if (pattern.pattern instanceof RegExp) {
      return pattern.pattern.test(message);
    } else {
      return message.toLowerCase().includes(pattern.pattern.toLowerCase());
    }
  }

  /**
   * Record an error occurrence
   */
  private recordError(patternId: string): void {
    const now = new Date();
    const errors = this.errorCounts.get(patternId) || [];
    errors.push(now);
    this.errorCounts.set(patternId, errors);
  }

  /**
   * Check if error threshold is exceeded and trigger alert
   */
  private checkThreshold(pattern: ErrorPattern, errorMessage: string, errorStack?: string): void {
    const errors = this.errorCounts.get(pattern.id) || [];
    const cutoff = new Date(Date.now() - pattern.timeWindowMs);
    const recentErrors = errors.filter(error => error > cutoff);

    if (recentErrors.length >= pattern.threshold) {
      // Check cooldown
      const lastAlert = this.lastAlerts.get(pattern.id);
      if (lastAlert && (Date.now() - lastAlert.getTime()) < pattern.cooldownMs) {
        return; // Still in cooldown
      }

      // Trigger alert
      this.triggerPatternAlert(pattern, recentErrors.length, errorMessage, errorStack);
      this.lastAlerts.set(pattern.id, new Date());
    }
  }

  /**
   * Trigger an alert for a pattern
   */
  private triggerPatternAlert(
    pattern: ErrorPattern, 
    errorCount: number, 
    lastError: string, 
    errorStack?: string
  ): void {
    logger.warn('Error pattern threshold exceeded', { component: 'error-alerting' }, {
      patternId: pattern.id,
      errorCount,
      threshold: pattern.threshold,
      timeWindow: pattern.timeWindowMs
    });

    alertManager.triggerAlert(pattern.id, errorCount, {
      pattern: pattern.pattern.toString(),
      errorCount,
      threshold: pattern.threshold,
      timeWindowMs: pattern.timeWindowMs,
      lastError,
      errorStack,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Clean up old error records
   */
  private cleanupOldErrors(): void {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    for (const [patternId, errors] of this.errorCounts.entries()) {
      const recentErrors = errors.filter(error => error > cutoff);
      if (recentErrors.length === 0) {
        this.errorCounts.delete(patternId);
      } else {
        this.errorCounts.set(patternId, recentErrors);
      }
    }

    // Clean up old alert records
    for (const [patternId, lastAlert] of this.lastAlerts.entries()) {
      if (Date.now() - lastAlert.getTime() > 24 * 60 * 60 * 1000) { // 24 hours
        this.lastAlerts.delete(patternId);
      }
    }
  }

  /**
   * Add a custom error pattern
   */
  addPattern(pattern: ErrorPattern): void {
    this.defaultPatterns.push(pattern);
    logger.info('Custom error pattern added', { component: 'error-alerting' }, { patternId: pattern.id });
  }

  /**
   * Remove an error pattern
   */
  removePattern(patternId: string): void {
    const index = this.defaultPatterns.findIndex(p => p.id === patternId);
    if (index !== -1) {
      this.defaultPatterns.splice(index, 1);
      this.errorCounts.delete(patternId);
      this.lastAlerts.delete(patternId);
      logger.info('Error pattern removed', { component: 'error-alerting' }, { patternId });
    }
  }

  /**
   * Get current error statistics
   */
  getStats() {
    const stats: Record<string, { count: number; lastOccurrence?: Date }> = {};
    
    for (const [patternId, errors] of this.errorCounts.entries()) {
      stats[patternId] = {
        count: errors.length,
        lastOccurrence: errors.length > 0 ? errors[errors.length - 1] : undefined
      };
    }

    return stats;
  }

  /**
   * Reset all error statistics
   */
  reset(): void {
    this.errorCounts.clear();
    this.lastAlerts.clear();
    logger.info('Error alerting statistics reset', { component: 'error-alerting' });
  }
}

// Create singleton instance
export const errorAlerting = new ErrorAlertingIntegration();