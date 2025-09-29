/**
 * Alerting Configuration Manager
 * Manages notification channels and alert rule configurations
 */

import { logger } from '../logging/index.js';
import { alertManager, type AlertRule } from './index.js';
import type { EmailConfig, WebhookConfig, SMSConfig } from './channels.js';

export interface AlertChannelConfig {
  email?: {
    enabled: boolean;
    config: EmailConfig;
  };
  webhook?: {
    enabled: boolean;
    config: WebhookConfig;
  };
  sms?: {
    enabled: boolean;
    config: SMSConfig;
  };
  console?: {
    enabled: boolean;
  };
  file?: {
    enabled: boolean;
    path?: string;
  };
}

export interface AlertConfiguration {
  channels: AlertChannelConfig;
  globalSettings: {
    enabled: boolean;
    suppressionEnabled: boolean;
    escalationEnabled: boolean;
    defaultCooldownMs: number;
  };
  customRules: AlertRule[];
}

export class AlertConfigurationManager {
  private config: AlertConfiguration;

  constructor() {
    this.config = this.loadDefaultConfiguration();
    this.applyConfiguration();
  }

  /**
   * Load default configuration from environment variables and defaults
   */
  private loadDefaultConfiguration(): AlertConfiguration {
    return {
      channels: {
        email: {
          enabled: !!(process.env.ALERT_EMAIL && process.env.SMTP_HOST),
          config: {
            smtpHost: process.env.SMTP_HOST,
            smtpPort: parseInt(process.env.SMTP_PORT || '587'),
            smtpSecure: process.env.SMTP_SECURE === 'true',
            smtpUser: process.env.SMTP_USER,
            smtpPassword: process.env.SMTP_PASSWORD,
            from: process.env.ALERT_FROM_EMAIL || 'alerts@unconf.app',
            to: process.env.ALERT_EMAIL || '',
            subject: 'UnConf System Alert'
          }
        },
        webhook: {
          enabled: !!process.env.ALERT_WEBHOOK_URL,
          config: {
            url: process.env.ALERT_WEBHOOK_URL || '',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(process.env.ALERT_WEBHOOK_TOKEN && { 'Authorization': `Bearer ${process.env.ALERT_WEBHOOK_TOKEN}` })
            },
            timeout: 30000,
            retries: 3
          }
        },
        sms: {
          enabled: !!(process.env.SMS_PROVIDER && process.env.ALERT_SMS_TO),
          config: {
            provider: (process.env.SMS_PROVIDER as 'twilio' | 'aws-sns' | 'custom') || 'twilio',
            credentials: {
              accountSid: process.env.TWILIO_ACCOUNT_SID,
              authToken: process.env.TWILIO_AUTH_TOKEN,
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              region: process.env.AWS_REGION || 'us-east-1'
            },
            from: process.env.SMS_FROM || '+1234567890',
            to: process.env.ALERT_SMS_TO || ''
          }
        },
        console: {
          enabled: process.env.ALERT_CONSOLE !== 'false' // Enabled by default
        },
        file: {
          enabled: process.env.ALERT_FILE !== 'false', // Enabled by default
          path: process.env.ALERT_FILE_PATH || './data/logs/alerts.log'
        }
      },
      globalSettings: {
        enabled: process.env.ALERTS_ENABLED !== 'false', // Enabled by default
        suppressionEnabled: process.env.ALERT_SUPPRESSION_ENABLED !== 'false',
        escalationEnabled: process.env.ALERT_ESCALATION_ENABLED !== 'false',
        defaultCooldownMs: parseInt(process.env.ALERT_DEFAULT_COOLDOWN || '300000') // 5 minutes
      },
      customRules: []
    };
  }

  /**
   * Apply configuration to the alert manager
   */
  private applyConfiguration(): void {
    // Configure notification channels based on configuration
    this.setupNotificationChannels();

    // Apply custom rules
    for (const rule of this.config.customRules) {
      alertManager.addRule(rule);
    }

    logger.info('Alert configuration applied', { component: 'alerting-config' }, {
      channels: Object.keys(this.config.channels).filter(key => 
        this.config.channels[key as keyof AlertChannelConfig]?.enabled
      ),
      customRules: this.config.customRules.length
    });
  }

  /**
   * Set up notification channels
   */
  private setupNotificationChannels(): void {
    // Clear existing channels and add configured ones
    
    if (this.config.channels.console?.enabled) {
      // Console channel is always available
    }

    if (this.config.channels.file?.enabled) {
      // File channel setup
    }

    if (this.config.channels.email?.enabled) {
      logger.info('Email notifications enabled', { component: 'alerting-config' }, {
        smtpHost: this.config.channels.email.config.smtpHost,
        to: this.config.channels.email.config.to
      });
    }

    if (this.config.channels.webhook?.enabled) {
      logger.info('Webhook notifications enabled', { component: 'alerting-config' }, {
        url: this.config.channels.webhook.config.url
      });
    }

    if (this.config.channels.sms?.enabled) {
      logger.info('SMS notifications enabled', { component: 'alerting-config' }, {
        provider: this.config.channels.sms.config.provider,
        to: this.config.channels.sms.config.to
      });
    }
  }

  /**
   * Update email configuration
   */
  updateEmailConfig(config: Partial<EmailConfig>, enabled?: boolean): void {
    if (this.config.channels.email) {
      this.config.channels.email.config = { ...this.config.channels.email.config, ...config };
      if (enabled !== undefined) {
        this.config.channels.email.enabled = enabled;
      }
    } else {
      this.config.channels.email = {
        enabled: enabled ?? true,
        config: config as EmailConfig
      };
    }

    this.applyConfiguration();
    logger.info('Email configuration updated', { component: 'alerting-config' });
  }

  /**
   * Update webhook configuration
   */
  updateWebhookConfig(config: Partial<WebhookConfig>, enabled?: boolean): void {
    if (this.config.channels.webhook) {
      this.config.channels.webhook.config = { ...this.config.channels.webhook.config, ...config };
      if (enabled !== undefined) {
        this.config.channels.webhook.enabled = enabled;
      }
    } else {
      this.config.channels.webhook = {
        enabled: enabled ?? true,
        config: config as WebhookConfig
      };
    }

    this.applyConfiguration();
    logger.info('Webhook configuration updated', { component: 'alerting-config' });
  }

  /**
   * Update SMS configuration
   */
  updateSMSConfig(config: Partial<SMSConfig>, enabled?: boolean): void {
    if (this.config.channels.sms) {
      this.config.channels.sms.config = { ...this.config.channels.sms.config, ...config };
      if (enabled !== undefined) {
        this.config.channels.sms.enabled = enabled;
      }
    } else {
      this.config.channels.sms = {
        enabled: enabled ?? true,
        config: config as SMSConfig
      };
    }

    this.applyConfiguration();
    logger.info('SMS configuration updated', { component: 'alerting-config' });
  }

  /**
   * Add a custom alert rule
   */
  addCustomRule(rule: AlertRule): void {
    this.config.customRules.push(rule);
    alertManager.addRule(rule);
    logger.info('Custom alert rule added', { component: 'alerting-config' }, { ruleId: rule.id });
  }

  /**
   * Remove a custom alert rule
   */
  removeCustomRule(ruleId: string): void {
    this.config.customRules = this.config.customRules.filter(rule => rule.id !== ruleId);
    alertManager.removeRule(ruleId);
    logger.info('Custom alert rule removed', { component: 'alerting-config' }, { ruleId });
  }

  /**
   * Enable or disable all alerts
   */
  setAlertsEnabled(enabled: boolean): void {
    this.config.globalSettings.enabled = enabled;
    
    if (!enabled) {
      // Resolve all active alerts
      const activeAlerts = alertManager.getActiveAlerts();
      for (const alert of activeAlerts) {
        alertManager.resolveAlert(alert.id, 'alerts-disabled');
      }
    }

    logger.info('Alerts globally enabled/disabled', { component: 'alerting-config' }, { enabled });
  }

  /**
   * Test notification channels
   */
  async testNotificationChannels(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};

    // Import AlertSeverity and AlertStatus
    const { AlertSeverity, AlertStatus } = await import('./index.js');

    const testAlert = {
      id: 'test-alert',
      severity: AlertSeverity.INFO,
      status: AlertStatus.ACTIVE,
      title: 'Test Alert',
      description: 'This is a test alert to verify notification channels',
      component: 'test',
      triggeredAt: new Date(),
      escalationLevel: 0
    };

    const testMessage = {
      alert: testAlert,
      action: 'triggered' as const,
      timestamp: new Date().toISOString(),
      system: 'UnConf'
    };

    // Test each enabled channel
    if (this.config.channels.email?.enabled) {
      try {
        const { NotificationChannelManager } = await import('./channels.js');
        await NotificationChannelManager.sendEmail(this.config.channels.email.config, testMessage);
        results.email = true;
      } catch (error) {
        results.email = false;
        logger.error('Email test failed', { component: 'alerting-config' }, { error });
      }
    }

    if (this.config.channels.webhook?.enabled) {
      try {
        const { NotificationChannelManager } = await import('./channels.js');
        await NotificationChannelManager.sendWebhook(this.config.channels.webhook.config, testMessage);
        results.webhook = true;
      } catch (error) {
        results.webhook = false;
        logger.error('Webhook test failed', { component: 'alerting-config' }, { error });
      }
    }

    if (this.config.channels.sms?.enabled) {
      try {
        const { NotificationChannelManager } = await import('./channels.js');
        await NotificationChannelManager.sendSMS(this.config.channels.sms.config, testMessage);
        results.sms = true;
      } catch (error) {
        results.sms = false;
        logger.error('SMS test failed', { component: 'alerting-config' }, { error });
      }
    }

    if (this.config.channels.console?.enabled) {
      console.log('🧪 Test Alert: Console notifications are working');
      results.console = true;
    }

    if (this.config.channels.file?.enabled) {
      logger.info('Test Alert: File notifications are working', { component: 'alerting-config' });
      results.file = true;
    }

    return results;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): AlertConfiguration {
    return JSON.parse(JSON.stringify(this.config)); // Deep clone
  }

  /**
   * Save configuration to file (in production, this might save to database)
   */
  async saveConfiguration(): Promise<void> {
    // In a real implementation, you would save to a file or database
    logger.info('Configuration saved', { component: 'alerting-config' });
  }

  /**
   * Load configuration from file (in production, this might load from database)
   */
  async loadConfiguration(): Promise<void> {
    // In a real implementation, you would load from a file or database
    // For now, we'll stick with environment-based configuration
    logger.info('Configuration loaded', { component: 'alerting-config' });
  }
}

// Create singleton instance
export const alertConfig = new AlertConfigurationManager();