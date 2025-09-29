/**
 * WebSocket Alerting Integration
 * Connects WebSocket events to the alerting system
 */

import { alertManager } from '../alerting/index.js';
import { logger } from '../logging/index.js';

export class WebSocketAlertingIntegration {
  private connectionFailures = 0;
  private totalConnections = 0;
  private recentFailures: Date[] = [];
  private readonly failureWindowMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Track a successful WebSocket connection
   */
  trackConnectionSuccess(): void {
    this.totalConnections++;
    this.cleanupOldFailures();
    
    logger.debug('WebSocket connection success tracked', { component: 'websocket-alerting' }, {
      totalConnections: this.totalConnections,
      recentFailures: this.recentFailures.length
    });
  }

  /**
   * Track a WebSocket connection failure
   */
  trackConnectionFailure(error?: Error): void {
    this.connectionFailures++;
    this.totalConnections++;
    this.recentFailures.push(new Date());
    
    this.cleanupOldFailures();
    
    const failureRate = this.getRecentFailureRate();
    
    logger.warn('WebSocket connection failure tracked', { component: 'websocket-alerting' }, {
      error: error?.message,
      totalConnections: this.totalConnections,
      connectionFailures: this.connectionFailures,
      recentFailureRate: failureRate
    });

    // Check if we should trigger alerts
    this.checkFailureRateThresholds();
  }

  /**
   * Track WebSocket message failure
   */
  trackMessageFailure(error?: Error): void {
    logger.warn('WebSocket message failure tracked', { component: 'websocket-alerting' }, {
      error: error?.message
    });

    // Trigger alert if we have frequent message failures
    alertManager.triggerAlert('websocket-message-failures', 1, {
      error: error?.message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track slow WebSocket response
   */
  trackSlowResponse(responseTime: number): void {
    if (responseTime > 5000) { // 5 seconds
      logger.warn('Slow WebSocket response detected', { component: 'websocket-alerting' }, {
        responseTime
      });

      alertManager.triggerAlert('websocket-slow-response', responseTime, {
        responseTime,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get recent failure rate (within the last 5 minutes)
   */
  private getRecentFailureRate(): number {
    this.cleanupOldFailures();
    const recentConnections = Math.max(this.recentFailures.length, 1);
    return (this.recentFailures.length / recentConnections) * 100;
  }

  /**
   * Remove failures older than the failure window
   */
  private cleanupOldFailures(): void {
    const cutoff = new Date(Date.now() - this.failureWindowMs);
    this.recentFailures = this.recentFailures.filter(failure => failure > cutoff);
  }

  /**
   * Check failure rate against thresholds and trigger alerts
   */
  private checkFailureRateThresholds(): void {
    const failureRate = this.getRecentFailureRate();
    
    if (failureRate >= 25) {
      // Critical failure rate
      alertManager.triggerAlert('websocket-critical-failure-rate', failureRate, {
        failureRate,
        recentFailures: this.recentFailures.length,
        timestamp: new Date().toISOString()
      });
    } else if (failureRate >= 10) {
      // High failure rate warning
      alertManager.triggerAlert('websocket-high-failure-rate', failureRate, {
        failureRate,
        recentFailures: this.recentFailures.length,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Reset connection statistics
   */
  reset(): void {
    this.connectionFailures = 0;
    this.totalConnections = 0;
    this.recentFailures = [];
    
    logger.info('WebSocket alerting statistics reset', { component: 'websocket-alerting' });
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      connectionFailures: this.connectionFailures,
      totalConnections: this.totalConnections,
      recentFailures: this.recentFailures.length,
      recentFailureRate: this.getRecentFailureRate()
    };
  }
}

// Create singleton instance
export const websocketAlerting = new WebSocketAlertingIntegration();