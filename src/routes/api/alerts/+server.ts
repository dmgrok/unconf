/**
 * Alerts Management API
 * Provides endpoints for managing alerts, rules, and notifications
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { alertManager, type AlertRule, AlertSeverity } from '$lib/alerting/index.js';
import { apiRoute } from '$lib/errors/handler.js';

export const GET: RequestHandler = apiRoute(async (event) => {
  const type = event.url.searchParams.get('type') || 'active';
  const component = event.url.searchParams.get('component');
  const severity = event.url.searchParams.get('severity');

  switch (type) {
    case 'active':
      let activeAlerts = alertManager.getActiveAlerts();

      // Filter by component if specified
      if (component) {
        activeAlerts = activeAlerts.filter(alert => alert.component === component);
      }

      // Filter by severity if specified
      if (severity) {
        activeAlerts = activeAlerts.filter(alert => alert.severity === severity);
      }

      return json({
        success: true,
        data: {
          alerts: activeAlerts,
          count: activeAlerts.length,
          summary: {
            critical: activeAlerts.filter(a => a.severity === 'critical').length,
            warning: activeAlerts.filter(a => a.severity === 'warning').length,
            info: activeAlerts.filter(a => a.severity === 'info').length
          }
        }
      });

    case 'history':
      const limit = parseInt(event.url.searchParams.get('limit') || '50');
      const history = alertManager.getAlertHistory(limit);

      return json({
        success: true,
        data: {
          alerts: history,
          count: history.length
        }
      });

    case 'rules':
      const rules = alertManager.getRules();

      return json({
        success: true,
        data: {
          rules,
          count: rules.length,
          summary: {
            enabled: rules.filter(r => r.enabled).length,
            disabled: rules.filter(r => !r.enabled).length,
            byComponent: rules.reduce((acc, rule) => {
              acc[rule.component] = (acc[rule.component] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          }
        }
      });

    case 'summary':
      const activeCount = alertManager.getActiveAlerts();
      const rulesCount = alertManager.getRules();

      return json({
        success: true,
        data: {
          activeAlerts: activeCount.length,
          totalRules: rulesCount.length,
          enabledRules: rulesCount.filter(r => r.enabled).length,
          criticalAlerts: activeCount.filter(a => a.severity === 'critical').length,
          warningAlerts: activeCount.filter(a => a.severity === 'warning').length,
          lastUpdate: new Date().toISOString()
        }
      });

    default:
      return json({
        success: false,
        error: 'Invalid type. Available: active, history, rules, summary'
      }, { status: 400 });
  }
});

export const POST: RequestHandler = apiRoute(async (event) => {
  const body = await event.request.json();
  const { action, data } = body;

  switch (action) {
    case 'acknowledge':
      if (!data.alertId) {
        return json({
          success: false,
          error: 'Alert ID is required'
        }, { status: 400 });
      }

      alertManager.acknowledgeAlert(data.alertId, data.acknowledgedBy);

      return json({
        success: true,
        message: 'Alert acknowledged successfully'
      });

    case 'resolve':
      if (!data.alertId) {
        return json({
          success: false,
          error: 'Alert ID is required'
        }, { status: 400 });
      }

      alertManager.resolveAlert(data.alertId, data.resolvedBy);

      return json({
        success: true,
        message: 'Alert resolved successfully'
      });

    case 'suppress':
      if (!data.pattern || !data.duration) {
        return json({
          success: false,
          error: 'Pattern and duration are required'
        }, { status: 400 });
      }

      alertManager.suppressAlerts(data.pattern, data.duration);

      return json({
        success: true,
        message: 'Alert suppression added successfully'
      });

    case 'trigger':
      if (!data.ruleId || data.currentValue === undefined) {
        return json({
          success: false,
          error: 'Rule ID and current value are required'
        }, { status: 400 });
      }

      alertManager.triggerAlert(data.ruleId, data.currentValue, data.metadata);

      return json({
        success: true,
        message: 'Alert triggered manually'
      });

    case 'add_rule':
      if (!data.rule) {
        return json({
          success: false,
          error: 'Rule configuration is required'
        }, { status: 400 });
      }

      // Validate required rule fields
      const requiredFields = ['id', 'name', 'component', 'metric', 'condition', 'threshold', 'severity'];
      const missingFields = requiredFields.filter(field => !data.rule[field]);

      if (missingFields.length > 0) {
        return json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        }, { status: 400 });
      }

      // Set defaults
      const rule: AlertRule = {
        duration: 60000, // 1 minute
        cooldown: 300000, // 5 minutes
        enabled: true,
        ...data.rule
      };

      alertManager.addRule(rule);

      return json({
        success: true,
        message: 'Alert rule added successfully',
        ruleId: rule.id
      });

    case 'update_rule':
      if (!data.ruleId) {
        return json({
          success: false,
          error: 'Rule ID is required'
        }, { status: 400 });
      }

      // For simplicity, we'll remove and re-add the rule
      // In a real implementation, you'd have an update method
      alertManager.removeRule(data.ruleId);

      if (data.rule) {
        alertManager.addRule({ id: data.ruleId, ...data.rule });
      }

      return json({
        success: true,
        message: 'Alert rule updated successfully'
      });

    case 'enable_rule':
      if (!data.ruleId) {
        return json({
          success: false,
          error: 'Rule ID is required'
        }, { status: 400 });
      }

      alertManager.setRuleEnabled(data.ruleId, true);

      return json({
        success: true,
        message: 'Alert rule enabled'
      });

    case 'disable_rule':
      if (!data.ruleId) {
        return json({
          success: false,
          error: 'Rule ID is required'
        }, { status: 400 });
      }

      alertManager.setRuleEnabled(data.ruleId, false);

      return json({
        success: true,
        message: 'Alert rule disabled'
      });

    case 'remove_rule':
      if (!data.ruleId) {
        return json({
          success: false,
          error: 'Rule ID is required'
        }, { status: 400 });
      }

      alertManager.removeRule(data.ruleId);

      return json({
        success: true,
        message: 'Alert rule removed successfully'
      });

    case 'test_notification':
      // Create a test alert to verify notification channels
      const testAlert = {
        id: 'test-' + Date.now(),
        severity: AlertSeverity.INFO,
        title: 'Test Alert',
        description: 'This is a test alert to verify notification channels',
        component: 'system',
        triggeredAt: new Date(),
        metadata: { test: true, triggeredBy: data.triggeredBy || 'manual' }
      };

      // This would trigger the notification system
      alertManager.triggerAlert('test-alert', 0, testAlert.metadata);

      return json({
        success: true,
        message: 'Test notification sent',
        testAlert
      });

    default:
      return json({
        success: false,
        error: 'Invalid action. Available: acknowledge, resolve, suppress, trigger, add_rule, update_rule, enable_rule, disable_rule, remove_rule, test_notification'
      }, { status: 400 });
  }
});

export const DELETE: RequestHandler = apiRoute(async (event) => {
  const alertId = event.url.searchParams.get('alertId');
  const ruleId = event.url.searchParams.get('ruleId');

  if (alertId) {
    alertManager.resolveAlert(alertId, 'deleted');
    return json({
      success: true,
      message: 'Alert deleted successfully'
    });
  }

  if (ruleId) {
    alertManager.removeRule(ruleId);
    return json({
      success: true,
      message: 'Alert rule deleted successfully'
    });
  }

  return json({
    success: false,
    error: 'Either alertId or ruleId is required'
  }, { status: 400 });
});