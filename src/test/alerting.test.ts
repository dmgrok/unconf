/**
 * Test suite for the automated alerting system
 * Tests alert rules, notification channels, and integrations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { alertManager, websocketAlerting, errorAlerting, AlertSeverity, AlertStatus } from '$lib/alerting/index.js';

describe('Automated Alerting System', () => {
  beforeEach(() => {
    // Reset alerting state before each test
    websocketAlerting.reset();
    errorAlerting.reset();
  });

  afterEach(() => {
    // Clean up after each test
    vi.clearAllMocks();
  });

  describe('Alert Manager', () => {
    it('should have default alert rules configured', () => {
      const rules = alertManager.getRules();
      expect(rules.length).toBeGreaterThan(0);
      
      // Check for critical WebSocket failure rule
      const websocketRule = rules.find(rule => rule.id === 'websocket-critical-failure-rate');
      expect(websocketRule).toBeDefined();
      expect(websocketRule?.severity).toBe(AlertSeverity.CRITICAL);
    });

    it('should trigger and resolve alerts', () => {
      // Trigger a test alert
      alertManager.triggerAlert('test-alert', 100, {
        message: 'Test alert for unit test'
      });

      let activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts.length).toBe(1);
      expect(activeAlerts[0].id).toContain('test-alert');

      // Resolve the alert
      alertManager.resolveAlert(activeAlerts[0].id, 'test-resolver');

      activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts.length).toBe(0);

      // Check alert history
      const history = alertManager.getAlertHistory();
      expect(history.length).toBe(1);
      expect(history[0].status).toBe('resolved');
    });

    it('should acknowledge alerts', () => {
      // Trigger a test alert
      alertManager.triggerAlert('test-alert', 100, {
        message: 'Test alert for acknowledgment'
      });

      const activeAlerts = alertManager.getActiveAlerts();
      const alertId = activeAlerts[0].id;

      // Acknowledge the alert
      alertManager.acknowledgeAlert(alertId, 'test-acknowledger');

      const acknowledgedAlert = alertManager.getActiveAlerts().find(a => a.id === alertId);
      expect(acknowledgedAlert?.status).toBe('acknowledged');
      expect(acknowledgedAlert?.acknowledgedAt).toBeDefined();
    });

    it('should suppress alerts by pattern', () => {
      // Suppress websocket alerts
      alertManager.suppressAlerts('websocket', 1000); // 1 second

      // Try to trigger a websocket alert
      alertManager.triggerAlert('websocket-test', 100, {
        message: 'This should be suppressed'
      });

      const activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts.length).toBe(0);
    });
  });

  describe('WebSocket Alerting Integration', () => {
    it('should track connection failures', () => {
      // Track some successful connections
      for (let i = 0; i < 10; i++) {
        websocketAlerting.trackConnectionSuccess();
      }

      // Track some failures
      for (let i = 0; i < 3; i++) {
        websocketAlerting.trackConnectionFailure(new Error('Connection failed'));
      }

      const stats = websocketAlerting.getStats();
      expect(stats.connectionFailures).toBe(3);
      expect(stats.totalConnections).toBe(13);
      expect(stats.recentFailures).toBe(3);
    });

    it('should calculate failure rates correctly', () => {
      // Create a scenario with 25% failure rate
      for (let i = 0; i < 8; i++) {
        websocketAlerting.trackConnectionSuccess();
      }
      for (let i = 0; i < 2; i++) {
        websocketAlerting.trackConnectionFailure(new Error('Connection failed'));
      }

      const stats = websocketAlerting.getStats();
      expect(stats.recentFailureRate).toBe(20); // 2 failures out of 10 total connections
    });

    it('should track slow responses', () => {
      // Track a slow response (> 5 seconds)
      websocketAlerting.trackSlowResponse(6000);

      // Should trigger an alert
      const activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts.length).toBeGreaterThan(0);
    });
  });

  describe('Error Alerting Integration', () => {
    it('should track database connection errors', () => {
      // Simulate database connection errors
      for (let i = 0; i < 3; i++) {
        errorAlerting.trackError(new Error('Database connection failed'));
      }

      const stats = errorAlerting.getStats();
      expect(stats['database-connection-error']).toBeDefined();
      expect(stats['database-connection-error'].count).toBe(3);
    });

    it('should track authentication failures', () => {
      // Simulate authentication failures
      for (let i = 0; i < 10; i++) {
        errorAlerting.trackError(new Error('Authentication failed'));
      }

      const stats = errorAlerting.getStats();
      expect(stats['authentication-failures']).toBeDefined();
      expect(stats['authentication-failures'].count).toBe(10);
    });

    it('should track critical errors immediately', () => {
      errorAlerting.trackCriticalError(new Error('System out of memory'), 'system');

      const activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts.length).toBeGreaterThan(0);
      
      const criticalAlert = activeAlerts.find(alert => alert.id.includes('critical-system-error'));
      expect(criticalAlert).toBeDefined();
    });

    it('should track API errors', () => {
      // Simulate API 5xx errors
      for (let i = 0; i < 10; i++) {
        errorAlerting.trackAPIError('/api/test', 'GET', 500, new Error('Internal server error'));
      }

      const stats = errorAlerting.getStats();
      expect(stats['api-5xx-errors']).toBeDefined();
      expect(stats['api-5xx-errors'].count).toBe(10);
    });

    it('should match error patterns correctly', () => {
      // Test memory error pattern
      errorAlerting.trackError(new Error('Out of memory error occurred'));
      
      const stats = errorAlerting.getStats();
      expect(stats['memory-errors']).toBeDefined();
      expect(stats['memory-errors'].count).toBe(1);
    });
  });

  describe('Alert Configuration', () => {
    it('should load default configuration', async () => {
      const { alertConfig } = await import('$lib/alerting/config.js');
      const config = alertConfig.getConfiguration();
      
      expect(config.globalSettings.enabled).toBe(true);
      expect(config.channels.console?.enabled).toBe(true);
      expect(config.channels.file?.enabled).toBe(true);
    });

    it('should test notification channels', async () => {
      const { alertConfig } = await import('$lib/alerting/config.js');
      const testResults = await alertConfig.testNotificationChannels();
      
      expect(testResults.console).toBe(true);
      expect(testResults.file).toBe(true);
    });
  });

  describe('Notification Channels', () => {
    it('should format email content correctly', async () => {
      const { NotificationChannelManager } = await import('$lib/alerting/channels.js');
      
      const testMessage = {
        alert: {
          id: 'test-alert-1',
          severity: AlertSeverity.WARNING,
          status: AlertStatus.ACTIVE,
          title: 'Test Alert',
          description: 'This is a test alert',
          component: 'test',
          triggeredAt: new Date(),
          escalationLevel: 0
        },
        action: 'triggered' as const,
        timestamp: new Date().toISOString(),
        system: 'UnConf'
      };

      // Test that email formatting doesn't throw errors
      expect(() => {
        // This would normally send an email, but we're just testing the formatting
        const emailConfig = {
          from: 'test@example.com',
          to: 'admin@example.com'
        };
        
        // The actual email sending is mocked in the implementation
        NotificationChannelManager.sendEmail(emailConfig, testMessage);
      }).not.toThrow();
    });

    it('should handle webhook failures gracefully', async () => {
      const { NotificationChannelManager } = await import('$lib/alerting/channels.js');
      
      const testMessage = {
        alert: {
          id: 'test-alert-2',
          severity: AlertSeverity.CRITICAL,
          status: AlertStatus.ACTIVE,
          title: 'Test Critical Alert',
          description: 'This is a test critical alert',
          component: 'test',
          triggeredAt: new Date(),
          escalationLevel: 1
        },
        action: 'triggered' as const,
        timestamp: new Date().toISOString(),
        system: 'UnConf'
      };

      const webhookConfig = {
        url: 'https://invalid-webhook-url.example.com/hook',
        retries: 1,
        timeout: 1000
      };

      // Should handle webhook failures gracefully
      await expect(
        NotificationChannelManager.sendWebhook(webhookConfig, testMessage)
      ).rejects.toThrow();
    });
  });
});