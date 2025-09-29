/**
 * Automated Alerting System for Critical Failures
 * Monitors system metrics and triggers alerts based on thresholds
 */

import { logger } from '../logging/index.js';
import { metricsCollector } from '../monitoring/index.js';
import type { AppError } from '../errors/index.js';
import { 
  NotificationChannelManager, 
  type AlertMessage, 
  type EmailConfig, 
  type WebhookConfig, 
  type SMSConfig 
} from './channels.js';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved'
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  component: string;
  metric?: string;
  threshold?: number;
  currentValue?: number;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
  escalationLevel: number;
  suppressionRules?: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  component: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  severity: AlertSeverity;
  duration: number; // Minimum duration in milliseconds before triggering
  cooldown: number; // Cooldown period before same alert can trigger again
  enabled: boolean;
  suppressionRules?: string[];
  escalationRules?: EscalationRule[];
}

export interface EscalationRule {
  level: number;
  delayMinutes: number;
  channels: NotificationChannel[];
  repeatInterval?: number; // Minutes between repeat notifications
}

export interface NotificationChannel {
  type: 'email' | 'webhook' | 'console' | 'file' | 'sms';
  config: EmailConfig | WebhookConfig | SMSConfig | Record<string, unknown>;
  enabled: boolean;
}

class AlertingManager {
  private rules = new Map<string, AlertRule>();
  private activeAlerts = new Map<string, Alert>();
  private suppressedAlerts = new Set<string>();
  private channels = new Map<string, NotificationChannel>();
  private alertHistory: Alert[] = [];
  private evaluationInterval?: NodeJS.Timeout;
  private escalationInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeDefaultRules();
    this.initializeDefaultChannels();
    this.startEvaluation();
  }

  private initializeDefaultRules(): void {
    // WebSocket connection failure rules
    this.addRule({
      id: 'websocket-high-failure-rate',
      name: 'High WebSocket Connection Failure Rate',
      description: 'WebSocket connection failure rate is above acceptable threshold',
      component: 'websocket',
      metric: 'connection_failure_rate',
      condition: 'greater_than',
      threshold: 10, // 10% failure rate
      severity: AlertSeverity.WARNING,
      duration: 120000, // 2 minutes
      cooldown: 300000, // 5 minutes
      enabled: true,
      escalationRules: [
        {
          level: 1,
          delayMinutes: 5,
          channels: [
            { type: 'console', config: {}, enabled: true },
            { type: 'file', config: { path: 'alerts.log' }, enabled: true }
          ]
        },
        {
          level: 2,
          delayMinutes: 15,
          channels: [
            { type: 'webhook', config: { url: process.env.ALERT_WEBHOOK_URL }, enabled: !!process.env.ALERT_WEBHOOK_URL }
          ],
          repeatInterval: 30
        }
      ]
    });

    this.addRule({
      id: 'websocket-critical-failure-rate',
      name: 'Critical WebSocket Connection Failure Rate',
      description: 'WebSocket connection failure rate is critically high',
      component: 'websocket',
      metric: 'connection_failure_rate',
      condition: 'greater_than',
      threshold: 25, // 25% failure rate
      severity: AlertSeverity.CRITICAL,
      duration: 60000, // 1 minute
      cooldown: 180000, // 3 minutes
      enabled: true,
      escalationRules: [
        {
          level: 1,
          delayMinutes: 0, // Immediate
          channels: [
            { type: 'console', config: {}, enabled: true },
            { type: 'webhook', config: { url: process.env.ALERT_WEBHOOK_URL }, enabled: !!process.env.ALERT_WEBHOOK_URL }
          ]
        },
        {
          level: 2,
          delayMinutes: 5,
          channels: [
            { type: 'email', config: { to: process.env.ALERT_EMAIL }, enabled: !!process.env.ALERT_EMAIL }
          ],
          repeatInterval: 15
        }
      ]
    });

    // API performance rules
    this.addRule({
      id: 'api-slow-response-time',
      name: 'Slow API Response Time',
      description: 'API average response time is above acceptable threshold',
      component: 'api',
      metric: 'average_response_time',
      condition: 'greater_than',
      threshold: 3000, // 3 seconds
      severity: AlertSeverity.WARNING,
      duration: 180000, // 3 minutes
      cooldown: 600000, // 10 minutes
      enabled: true
    });

    this.addRule({
      id: 'api-high-error-rate',
      name: 'High API Error Rate',
      description: 'API error rate is above acceptable threshold',
      component: 'api',
      metric: 'error_rate',
      condition: 'greater_than',
      threshold: 5, // 5% error rate
      severity: AlertSeverity.WARNING,
      duration: 120000, // 2 minutes
      cooldown: 300000, // 5 minutes
      enabled: true
    });

    this.addRule({
      id: 'api-critical-error-rate',
      name: 'Critical API Error Rate',
      description: 'API error rate is critically high',
      component: 'api',
      metric: 'error_rate',
      condition: 'greater_than',
      threshold: 15, // 15% error rate
      severity: AlertSeverity.CRITICAL,
      duration: 60000, // 1 minute
      cooldown: 180000, // 3 minutes
      enabled: true
    });

    // System resource rules
    this.addRule({
      id: 'high-memory-usage',
      name: 'High Memory Usage',
      description: 'System memory usage is above safe threshold',
      component: 'system',
      metric: 'memory_usage',
      condition: 'greater_than',
      threshold: 85, // 85%
      severity: AlertSeverity.WARNING,
      duration: 300000, // 5 minutes
      cooldown: 900000, // 15 minutes
      enabled: true
    });

    this.addRule({
      id: 'critical-memory-usage',
      name: 'Critical Memory Usage',
      description: 'System memory usage is critically high',
      component: 'system',
      metric: 'memory_usage',
      condition: 'greater_than',
      threshold: 95, // 95%
      severity: AlertSeverity.CRITICAL,
      duration: 60000, // 1 minute
      cooldown: 300000, // 5 minutes
      enabled: true
    });

    // Database performance rules
    this.addRule({
      id: 'database-slow-queries',
      name: 'Slow Database Queries',
      description: 'Database query response time is above acceptable threshold',
      component: 'database',
      metric: 'average_query_time',
      condition: 'greater_than',
      threshold: 2000, // 2 seconds
      severity: AlertSeverity.WARNING,
      duration: 180000, // 3 minutes
      cooldown: 600000, // 10 minutes
      enabled: true
    });
  }

  private initializeDefaultChannels(): void {
    // Console notification channel
    this.channels.set('console', {
      type: 'console',
      config: {},
      enabled: true
    });

    // File notification channel
    this.channels.set('file', {
      type: 'file',
      config: {
        path: './data/logs/alerts.log'
      },
      enabled: true
    });

    // Webhook notification channel (if configured)
    if (process.env.ALERT_WEBHOOK_URL) {
      this.channels.set('webhook', {
        type: 'webhook',
        config: {
          url: process.env.ALERT_WEBHOOK_URL,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        enabled: true
      });
    }

    // Email notification channel (if configured)
    if (process.env.ALERT_EMAIL) {
      this.channels.set('email', {
        type: 'email',
        config: {
          to: process.env.ALERT_EMAIL,
          from: process.env.ALERT_FROM_EMAIL || 'alerts@unconf.app',
          subject: 'UnConf System Alert'
        },
        enabled: true
      });
    }
  }

  /**
   * Add a new alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info('Alert rule added', { component: 'alerting' }, { ruleId: rule.id, rule });
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    logger.info('Alert rule removed', { component: 'alerting' }, { ruleId });
  }

  /**
   * Enable or disable an alert rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      logger.info('Alert rule status changed', { component: 'alerting' }, { ruleId, enabled });
    }
  }

  /**
   * Manually trigger an alert
   */
  triggerAlert(
    ruleId: string,
    currentValue: number,
    metadata?: Record<string, unknown>
  ): void {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      logger.warn('Attempted to trigger unknown alert rule', { component: 'alerting' }, { ruleId });
      return;
    }

    this.createAlert(rule, currentValue, metadata);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy?: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert && alert.status === AlertStatus.ACTIVE) {
      alert.status = AlertStatus.ACKNOWLEDGED;
      alert.acknowledgedAt = new Date();
      alert.metadata = { ...alert.metadata, acknowledgedBy };

      logger.info('Alert acknowledged', { component: 'alerting' }, { alertId, acknowledgedBy });
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolvedBy?: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = AlertStatus.RESOLVED;
      alert.resolvedAt = new Date();
      alert.metadata = { ...alert.metadata, resolvedBy };

      this.activeAlerts.delete(alertId);
      this.alertHistory.push(alert);

      logger.info('Alert resolved', { component: 'alerting' }, { alertId, resolvedBy });

      // Notify about resolution
      this.sendNotification(alert, 'resolved');
    }
  }

  /**
   * Suppress alerts matching certain criteria
   */
  suppressAlerts(pattern: string, duration: number): void {
    this.suppressedAlerts.add(pattern);

    // Auto-remove suppression after duration
    setTimeout(() => {
      this.suppressedAlerts.delete(pattern);
      logger.info('Alert suppression removed', { component: 'alerting' }, { pattern });
    }, duration);

    logger.info('Alert suppression added', { component: 'alerting' }, { pattern, duration });
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get alert rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Start periodic evaluation of alert rules
   */
  private startEvaluation(): void {
    // Evaluate rules every 30 seconds
    this.evaluationInterval = setInterval(() => {
      this.evaluateRules();
    }, 30000);

    // Handle escalations every minute
    this.escalationInterval = setInterval(() => {
      this.handleEscalations();
    }, 60000);

    logger.info('Alert evaluation started', { component: 'alerting' });
  }

  /**
   * Evaluate all alert rules against current metrics
   */
  private evaluateRules(): void {
    const dashboardMetrics = metricsCollector.getDashboardMetrics();

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const currentValue = this.extractMetricValue(rule, dashboardMetrics);
      if (currentValue === null) continue;

      const shouldTrigger = this.evaluateCondition(rule, currentValue);

      if (shouldTrigger) {
        // Check if this alert is in cooldown
        const existingAlert = Array.from(this.activeAlerts.values())
          .find(alert => alert.component === rule.component && alert.metric === rule.metric);

        if (existingAlert) {
          const timeSinceTriggered = Date.now() - existingAlert.triggeredAt.getTime();
          if (timeSinceTriggered < rule.cooldown) {
            continue; // Still in cooldown
          }
        }

        // Check suppression rules
        if (this.isAlertSuppressed(rule)) {
          continue;
        }

        this.createAlert(rule, currentValue);
      } else {
        // Check if we should auto-resolve any existing alerts
        this.autoResolveAlerts(rule, currentValue);
      }
    }
  }

  /**
   * Extract metric value from dashboard metrics
   */
  private extractMetricValue(rule: AlertRule, metrics: Record<string, unknown>): number | null {
    // Type-safe access to metrics data
    const websocketMetrics = metrics.websocket as { totalConnections?: number; connectionFailures?: number; averageResponseTime?: number } | undefined;
    const performanceMetrics = metrics.performance as { 
      apiRequests?: { total?: number; failed?: number; averageResponseTime?: number };
      system?: { memoryUsage?: number; cpuUsage?: number };
      database?: { averageQueryTime?: number };
    } | undefined;
    
    switch (rule.component) {
      case 'websocket':
        if (rule.metric === 'connection_failure_rate') {
          const total = websocketMetrics?.totalConnections ?? 0;
          const failures = websocketMetrics?.connectionFailures ?? 0;
          return total > 0 ? (failures / total) * 100 : 0;
        }
        if (rule.metric === 'average_response_time') {
          return websocketMetrics?.averageResponseTime ?? null;
        }
        break;

      case 'api':
        if (rule.metric === 'average_response_time') {
          return performanceMetrics?.apiRequests?.averageResponseTime ?? null;
        }
        if (rule.metric === 'error_rate') {
          const total = performanceMetrics?.apiRequests?.total ?? 0;
          const failed = performanceMetrics?.apiRequests?.failed ?? 0;
          return total > 0 ? (failed / total) * 100 : 0;
        }
        break;

      case 'system':
        if (rule.metric === 'memory_usage') {
          return performanceMetrics?.system?.memoryUsage ?? null;
        }
        if (rule.metric === 'cpu_usage') {
          return performanceMetrics?.system?.cpuUsage ?? null;
        }
        break;

      case 'database':
        if (rule.metric === 'average_query_time') {
          return performanceMetrics?.database?.averageQueryTime ?? null;
        }
        break;
    }

    return null;
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(rule: AlertRule, currentValue: number): boolean {
    switch (rule.condition) {
      case 'greater_than':
        return currentValue > rule.threshold;
      case 'less_than':
        return currentValue < rule.threshold;
      case 'equals':
        return currentValue === rule.threshold;
      case 'not_equals':
        return currentValue !== rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Check if alert is suppressed
   */
  private isAlertSuppressed(rule: AlertRule): boolean {
    for (const pattern of this.suppressedAlerts) {
      if (rule.component.includes(pattern) || rule.name.includes(pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Create a new alert
   */
  private createAlert(
    rule: AlertRule,
    currentValue: number,
    metadata?: Record<string, unknown>
  ): void {
    const alertId = `${rule.id}-${Date.now()}`;

    const alert: Alert = {
      id: alertId,
      severity: rule.severity,
      status: AlertStatus.ACTIVE,
      title: rule.name,
      description: rule.description,
      component: rule.component,
      metric: rule.metric,
      threshold: rule.threshold,
      currentValue,
      triggeredAt: new Date(),
      metadata,
      escalationLevel: 0
    };

    this.activeAlerts.set(alertId, alert);

    logger.error('Alert triggered', { component: 'alerting' }, {
      alertId,
      rule: rule.name,
      currentValue,
      threshold: rule.threshold
    });

    // Send immediate notifications
    this.sendNotification(alert, 'triggered');

    // Start escalation if rules are defined
    if (rule.escalationRules && rule.escalationRules.length > 0) {
      this.scheduleEscalation(alert, rule.escalationRules);
    }
  }

  /**
   * Auto-resolve alerts when conditions are no longer met
   */
  private autoResolveAlerts(rule: AlertRule, currentValue: number): void {
    const alertsToResolve = Array.from(this.activeAlerts.values())
      .filter(alert =>
        alert.component === rule.component &&
        alert.metric === rule.metric &&
        !this.evaluateCondition(rule, currentValue)
      );

    for (const alert of alertsToResolve) {
      this.resolveAlert(alert.id, 'auto-resolved');
    }
  }

  /**
   * Handle escalations for active alerts
   */
  private handleEscalations(): void {
    for (const alert of this.activeAlerts.values()) {
      if (alert.status !== AlertStatus.ACTIVE) continue;

      const rule = this.rules.get(alert.id.split('-')[0]);
      if (!rule?.escalationRules) continue;

      const minutesSinceTriggered = (Date.now() - alert.triggeredAt.getTime()) / 60000;

      for (const escalationRule of rule.escalationRules) {
        if (alert.escalationLevel >= escalationRule.level) continue;

        if (minutesSinceTriggered >= escalationRule.delayMinutes) {
          alert.escalationLevel = escalationRule.level;
          this.sendEscalationNotification(alert, escalationRule);
        }
      }
    }
  }

  /**
   * Schedule escalation for an alert
   */
  private scheduleEscalation(alert: Alert, escalationRules: EscalationRule[]): void {
    for (const rule of escalationRules) {
      setTimeout(() => {
        if (this.activeAlerts.has(alert.id) && alert.status === AlertStatus.ACTIVE) {
          alert.escalationLevel = Math.max(alert.escalationLevel, rule.level);
          this.sendEscalationNotification(alert, rule);
        }
      }, rule.delayMinutes * 60000);
    }
  }

  /**
   * Send notification for an alert
   */
  private async sendNotification(alert: Alert, action: 'triggered' | 'resolved'): Promise<void> {
    const message: AlertMessage = {
      alert,
      action,
      timestamp: new Date().toISOString(),
      system: 'UnConf'
    };

    // Send to all enabled channels
    for (const channel of this.channels.values()) {
      if (!channel.enabled) continue;

      try {
        await this.sendToChannel(channel, message);
      } catch (error) {
        logger.error('Failed to send alert notification', { component: 'alerting' }, {
          channelType: channel.type,
          alertId: alert.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Send escalation notification
   */
  private async sendEscalationNotification(alert: Alert, escalationRule: EscalationRule): Promise<void> {
    const message: AlertMessage = {
      alert,
      action: 'escalated',
      escalationLevel: escalationRule.level,
      timestamp: new Date().toISOString(),
      system: 'UnConf'
    };

    for (const channel of escalationRule.channels) {
      if (!channel.enabled) continue;

      try {
        await this.sendToChannel(channel, message);
      } catch (error) {
        logger.error('Failed to send escalation notification', { component: 'alerting' }, {
          channelType: channel.type,
          alertId: alert.id,
          escalationLevel: escalationRule.level,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Send message to specific notification channel
   */
  private async sendToChannel(channel: NotificationChannel, message: AlertMessage): Promise<void> {
    switch (channel.type) {
      case 'console':
        console.log('🚨 ALERT:', JSON.stringify(message, null, 2));
        break;

      case 'file':
        // In a real implementation, this would write to a file
        logger.info('Alert notification', { component: 'alerting' }, { alertId: message.alert.id, action: message.action });
        break;

      case 'webhook':
        await NotificationChannelManager.sendWebhook(channel.config as WebhookConfig, message);
        break;

      case 'email':
        await NotificationChannelManager.sendEmail(channel.config as EmailConfig, message);
        break;

      case 'sms':
        await NotificationChannelManager.sendSMS(channel.config as SMSConfig, message);
        break;

      default:
        logger.warn('Unknown notification channel type', { component: 'alerting' }, { type: channel.type });
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
    }
    if (this.escalationInterval) {
      clearInterval(this.escalationInterval);
    }

    logger.info('Alert manager cleaned up', { component: 'alerting' });
  }
}

// Create singleton instance
export const alertManager = new AlertingManager();
export { AlertingManager };

// Export additional alerting functionality
export { websocketAlerting } from './websocket-integration.js';
export { errorAlerting } from './error-integration.js';
export { alertConfig } from './config.js';
export { NotificationChannelManager } from './channels.js';
export type { AlertMessage, EmailConfig, WebhookConfig, SMSConfig } from './channels.js';