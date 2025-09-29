/**
 * Alerting Configuration and Testing API
 * Provides endpoints for managing alert configurations and testing notification channels
 */

import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { apiRoute } from '$lib/errors/handler.js';
import { 
  alertConfig, 
  alertManager, 
  websocketAlerting, 
  errorAlerting,
  AlertSeverity
} from '$lib/alerting/index.js';

export const GET: RequestHandler = apiRoute(async (event) => {
  const action = event.url.searchParams.get('action');

  switch (action) {
    case 'config':
      return json({
        success: true,
        data: {
          configuration: alertConfig.getConfiguration(),
          activeAlerts: alertManager.getActiveAlerts(),
          rules: alertManager.getRules()
        }
      });

    case 'stats':
      return json({
        success: true,
        data: {
          websocketStats: websocketAlerting.getStats(),
          errorStats: errorAlerting.getStats(),
          activeAlerts: alertManager.getActiveAlerts().length,
          alertHistory: alertManager.getAlertHistory(20)
        }
      });

    case 'test': {
      const testResults = await alertConfig.testNotificationChannels();
      return json({
        success: true,
        data: {
          testResults,
          timestamp: new Date().toISOString()
        }
      });
    }

    default:
      return json({
        success: true,
        data: {
          activeAlerts: alertManager.getActiveAlerts(),
          recentHistory: alertManager.getAlertHistory(10)
        }
      });
  }
});

export const POST: RequestHandler = apiRoute(async (event) => {
  const data = await event.request.json();
  const action = data.action;

  switch (action) {
    case 'update-email-config':
      alertConfig.updateEmailConfig(data.config, data.enabled);
      return json({
        success: true,
        message: 'Email configuration updated'
      });

    case 'update-webhook-config':
      alertConfig.updateWebhookConfig(data.config, data.enabled);
      return json({
        success: true,
        message: 'Webhook configuration updated'
      });

    case 'update-sms-config':
      alertConfig.updateSMSConfig(data.config, data.enabled);
      return json({
        success: true,
        message: 'SMS configuration updated'
      });

    case 'add-custom-rule': {
      const rule = {
        ...data.rule,
        id: data.rule.id || `custom-${Date.now()}`,
        enabled: data.rule.enabled ?? true
      };
      alertConfig.addCustomRule(rule);
      return json({
        success: true,
        message: 'Custom rule added',
        data: { ruleId: rule.id }
      });
    }

    case 'remove-custom-rule':
      alertConfig.removeCustomRule(data.ruleId);
      return json({
        success: true,
        message: 'Custom rule removed'
      });

    case 'toggle-alerts':
      alertConfig.setAlertsEnabled(data.enabled);
      return json({
        success: true,
        message: `Alerts ${data.enabled ? 'enabled' : 'disabled'}`
      });

    case 'trigger-test-alert':
      // Trigger a test alert
      alertManager.triggerAlert('test-alert-manual', 1, {
        severity: data.severity || AlertSeverity.INFO,
        message: data.message || 'Manual test alert triggered',
        triggeredBy: 'admin',
        timestamp: new Date().toISOString()
      });
      return json({
        success: true,
        message: 'Test alert triggered'
      });

    case 'simulate-websocket-failure': {
      // Simulate WebSocket failures for testing
      const failures = data.failures || 5;
      for (let i = 0; i < failures; i++) {
        websocketAlerting.trackConnectionFailure(new Error('Simulated connection failure'));
      }
      return json({
        success: true,
        message: `Simulated ${failures} WebSocket failures`
      });
    }

    case 'simulate-error-pattern': {
      // Simulate error patterns for testing
      const errorMessage = data.errorMessage || 'Database connection failed';
      const count = data.count || 3;
      for (let i = 0; i < count; i++) {
        errorAlerting.trackError(new Error(errorMessage));
      }
      return json({
        success: true,
        message: `Simulated ${count} errors with pattern: ${errorMessage}`
      });
    }

    case 'reset-stats':
      websocketAlerting.reset();
      errorAlerting.reset();
      return json({
        success: true,
        message: 'Statistics reset'
      });

    case 'acknowledge-alert':
      alertManager.acknowledgeAlert(data.alertId, data.acknowledgedBy || 'admin');
      return json({
        success: true,
        message: 'Alert acknowledged'
      });

    case 'resolve-alert':
      alertManager.resolveAlert(data.alertId, data.resolvedBy || 'admin');
      return json({
        success: true,
        message: 'Alert resolved'
      });

    case 'suppress-alerts':
      alertManager.suppressAlerts(data.pattern, data.duration || 3600000); // 1 hour default
      return json({
        success: true,
        message: `Alerts suppressed for pattern: ${data.pattern}`
      });

    default:
      return json({
        success: false,
        error: 'Unknown action'
      }, { status: 400 });
  }
});