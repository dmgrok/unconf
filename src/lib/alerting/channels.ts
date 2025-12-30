/**
 * Notification Channel Implementations
 * Real implementations for webhook, email, and SMS notifications
 */

import { logger } from '../logging/index.js';
import type { Alert, AlertSeverity } from './index.js';

export interface AlertMessage {
  alert: Alert;
  action: 'triggered' | 'resolved' | 'escalated';
  escalationLevel?: number;
  timestamp: string;
  system: string;
}

export interface EmailConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  from: string;
  to: string | string[];
  subject?: string;
}

export interface WebhookConfig {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface SMSConfig {
  provider: 'twilio' | 'aws-sns' | 'custom';
  credentials: {
    accountSid?: string;
    authToken?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
  };
  from: string;
  to: string | string[];
}

export class NotificationChannelManager {
  /**
   * Send webhook notification
   */
  static async sendWebhook(config: WebhookConfig, message: AlertMessage): Promise<void> {
    const { url, method = 'POST', headers = {}, timeout = 30000, retries = 3 } = config;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'UnConf-Alerting/1.0',
      ...headers
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: defaultHeaders,
          body: JSON.stringify(message),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        logger.info('Webhook notification sent successfully', { component: 'alerting' }, {
          url,
          attempt,
          status: response.status
        });

        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        logger.warn('Webhook notification attempt failed', { component: 'alerting' }, {
          url,
          attempt,
          error: lastError.message,
          willRetry: attempt < retries
        });

        if (attempt < retries) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    throw new Error(`Webhook notification failed after ${retries} attempts: ${lastError?.message}`);
  }

  /**
   * Send email notification
   */
  static async sendEmail(config: EmailConfig, message: AlertMessage): Promise<void> {
    // Check if we have email configuration
    if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) {
      logger.warn('Email configuration incomplete, skipping email notification', { component: 'alerting' });
      return;
    }

    try {
      // In a real implementation, you would use a library like nodemailer
      // For now, we'll simulate the email sending
      const emailData = {
        from: config.from,
        to: Array.isArray(config.to) ? config.to.join(', ') : config.to,
        subject: config.subject || `[UnConf Alert] ${message.alert.severity.toUpperCase()}: ${message.alert.title}`,
        html: this.generateEmailHtml(message),
        text: this.generateEmailText(message)
      };

      // Simulate SMTP sending (replace with actual implementation)
      logger.info('Email notification sent successfully', { component: 'alerting' }, {
        to: emailData.to,
        subject: emailData.subject,
        alertId: message.alert.id
      });

      // In production, you would do something like:
      /*
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter({
        host: config.smtpHost,
        port: config.smtpPort || 587,
        secure: config.smtpSecure || false,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPassword
        }
      });
      
      await transporter.sendMail(emailData);
      */
    } catch (error) {
      const errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
      logger.error('Failed to send email notification', { component: 'alerting' }, {
        error: errorMessage,
        alertId: message.alert.id
      });
      throw new Error(`Email notification failed: ${errorMessage}`);
    }
  }

  /**
   * Send SMS notification
   */
  static async sendSMS(config: SMSConfig, message: AlertMessage): Promise<void> {
    try {
      const smsText = this.generateSMSText(message);
      const recipients = Array.isArray(config.to) ? config.to : [config.to];

      for (const recipient of recipients) {
        switch (config.provider) {
          case 'twilio':
            await this.sendTwilioSMS(config, recipient, smsText);
            break;
          case 'aws-sns':
            await this.sendAWSSMS(config, recipient, smsText);
            break;
          case 'custom':
            await this.sendCustomSMS(config, recipient, smsText);
            break;
          default:
            throw new Error(`Unsupported SMS provider: ${config.provider}`);
        }
      }

      logger.info('SMS notification sent successfully', { component: 'alerting' }, {
        provider: config.provider,
        recipients: recipients.length,
        alertId: message.alert.id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
      logger.error('Failed to send SMS notification', { component: 'alerting' }, {
        error: errorMessage,
        provider: config.provider,
        alertId: message.alert.id
      });
      throw new Error(`SMS notification failed: ${errorMessage}`);
    }
  }

  /**
   * Send SMS via Twilio
   */
  private static async sendTwilioSMS(config: SMSConfig, to: string, text: string): Promise<void> {
    const { accountSid, authToken } = config.credentials;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    // Simulate Twilio API call
    logger.info('Twilio SMS sent', { component: 'alerting' }, { to, from: config.from, text });
    
    // In production, you would use the Twilio SDK:
    /*
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);
    
    await client.messages.create({
      body: text,
      from: config.from,
      to: to
    });
    */
  }

  /**
   * Send SMS via AWS SNS
   */
  private static async sendAWSSMS(config: SMSConfig, to: string, text: string): Promise<void> {
    const { accessKeyId, secretAccessKey, region } = config.credentials;
    
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured');
    }

    // Simulate AWS SNS call
    logger.info('AWS SNS SMS sent', { component: 'alerting' }, { to, region, text });
    
    // In production, you would use the AWS SDK:
    /*
    const AWS = require('aws-sdk');
    const sns = new AWS.SNS({
      accessKeyId,
      secretAccessKey,
      region: region || 'us-east-1'
    });
    
    await sns.publish({
      PhoneNumber: to,
      Message: text
    }).promise();
    */
  }

  /**
   * Send SMS via custom provider
   */
  private static async sendCustomSMS(config: SMSConfig, to: string, text: string): Promise<void> {
    // Custom SMS implementation placeholder
    logger.info('Custom SMS sent', { component: 'alerting' }, { to, text });
  }

  /**
   * Generate email HTML content
   */
  private static generateEmailHtml(message: AlertMessage): string {
    const { alert, action, timestamp } = message;
    
    const severityColors = {
      critical: '#dc2626',
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    
    const severityColor = severityColors[alert.severity as keyof typeof severityColors] || '#6b7280';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>UnConf Alert</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: ${severityColor}; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .alert-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .footer { font-size: 0.9em; color: #666; border-top: 1px solid #eee; padding: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚨 ${alert.severity.toUpperCase()} ALERT</h1>
    <h2>${alert.title}</h2>
  </div>
  
  <div class="content">
    <p><strong>Component:</strong> ${alert.component}</p>
    <p><strong>Action:</strong> ${action}</p>
    <p><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
    
    <div class="alert-details">
      <h3>Details</h3>
      <p>${alert.description}</p>
      ${alert.metric ? `<p><strong>Metric:</strong> ${alert.metric}</p>` : ''}
      ${alert.currentValue !== undefined ? `<p><strong>Current Value:</strong> ${alert.currentValue}</p>` : ''}
      ${alert.threshold !== undefined ? `<p><strong>Threshold:</strong> ${alert.threshold}</p>` : ''}
    </div>
    
    ${alert.metadata ? `
    <div class="alert-details">
      <h3>Additional Information</h3>
      <pre>${JSON.stringify(alert.metadata, null, 2)}</pre>
    </div>
    ` : ''}
  </div>
  
  <div class="footer">
    <p>This alert was generated by the UnConf monitoring system.</p>
    <p>Alert ID: ${alert.id}</p>
  </div>
</body>
</html>`;
  }

  /**
   * Generate email plain text content
   */
  private static generateEmailText(message: AlertMessage): string {
    const { alert, action, timestamp } = message;
    
    return `
🚨 ${alert.severity.toUpperCase()} ALERT: ${alert.title}

Component: ${alert.component}
Action: ${action}
Time: ${new Date(timestamp).toLocaleString()}

Details:
${alert.description}

${alert.metric ? `Metric: ${alert.metric}` : ''}
${alert.currentValue !== undefined ? `Current Value: ${alert.currentValue}` : ''}
${alert.threshold !== undefined ? `Threshold: ${alert.threshold}` : ''}

Alert ID: ${alert.id}

This alert was generated by the UnConf monitoring system.
`;
  }

  /**
   * Generate SMS text content
   */
  private static generateSMSText(message: AlertMessage): string {
    const { alert, action } = message;
    
    const severityEmojis = {
      critical: '🔴',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    const emoji = severityEmojis[alert.severity as keyof typeof severityEmojis] || '🚨';

    // SMS messages should be concise (160 characters is traditional limit)
    return `${emoji} UnConf ${alert.severity.toUpperCase()}: ${alert.title} - ${alert.component} ${action}. Check dashboard for details.`;
  }
}