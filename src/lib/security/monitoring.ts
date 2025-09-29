/**
 * Security Monitoring and Logging System
 *
 * This module provides comprehensive security monitoring by:
 * 1. Logging security events and violations
 * 2. Monitoring authentication attempts and failures
 * 3. Tracking rate limit violations and suspicious activities
 * 4. Providing security metrics and alerting
 * 5. Creating audit trails for security-related actions
 */

import type { RequestEvent } from '@sveltejs/kit';
import type { UserRole } from '$lib/auth/middleware';

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: SecuritySeverity;
  source: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  metadata?: Record<string, any>;
}

export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_SUCCESS = 'password_reset_success',
  ACCOUNT_LOCKED = 'account_locked',

  // Authorization events
  ACCESS_DENIED = 'access_denied',
  PRIVILEGE_ESCALATION_ATTEMPT = 'privilege_escalation_attempt',
  UNAUTHORIZED_API_ACCESS = 'unauthorized_api_access',

  // Rate limiting events
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  RATE_LIMIT_WARNING = 'rate_limit_warning',

  // Security violations
  CSRF_VIOLATION = 'csrf_violation',
  XSS_ATTEMPT = 'xss_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  CSP_VIOLATION = 'csp_violation',

  // Suspicious activities
  SUSPICIOUS_USER_AGENT = 'suspicious_user_agent',
  MULTIPLE_FAILED_LOGINS = 'multiple_failed_logins',
  UNUSUAL_ACCESS_PATTERN = 'unusual_access_pattern',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',

  // Application events
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  ADMIN_ACTION = 'admin_action',
  CONFIGURATION_CHANGE = 'configuration_change',

  // System events
  SECURITY_SCAN_DETECTED = 'security_scan_detected',
  MALWARE_DETECTION = 'malware_detection',
  VULNERABILITY_EXPLOIT_ATTEMPT = 'vulnerability_exploit_attempt'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecuritySeverity, number>;
  uniqueIPs: number;
  failedLoginAttempts: number;
  rateLimitViolations: number;
  suspiciousActivities: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface SecurityAlert {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: SecuritySeverity;
  message: string;
  details: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

/**
 * Security monitoring class
 */
export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private events: SecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];
  private ipAttempts = new Map<string, { count: number; lastAttempt: Date }>();
  private userAttempts = new Map<string, { count: number; lastAttempt: Date }>();

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  /**
   * Log a security event
   */
  logSecurityEvent(
    type: SecurityEventType,
    details: Record<string, any>,
    event?: RequestEvent,
    severity?: SecuritySeverity
  ): SecurityEvent {
    const securityEvent: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type,
      severity: severity || this.determineSeverity(type),
      source: event?.url.pathname || 'unknown',
      userId: event?.locals.user?.id,
      sessionId: event?.locals.user?.sessionId,
      ipAddress: event?.getClientAddress(),
      userAgent: event?.request.headers.get('user-agent') || undefined,
      details,
      metadata: {
        url: event?.url.href,
        method: event?.request.method,
        referrer: event?.request.headers.get('referer') || undefined
      }
    };

    this.events.push(securityEvent);
    this.pruneOldEvents();

    // Check for patterns that require alerts
    this.analyzeForAlerts(securityEvent);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`🔒 Security Event [${severity}]:`, {
        type,
        details,
        ip: securityEvent.ipAddress,
        user: securityEvent.userId
      });
    }

    return securityEvent;
  }

  /**
   * Log authentication attempt
   */
  logAuthAttempt(
    success: boolean,
    event: RequestEvent,
    details: Record<string, any> = {}
  ): void {
    const eventType = success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILURE;
    const ip = event.getClientAddress();
    const userId = success ? event.locals.user?.id : details.userId || details.email;

    this.logSecurityEvent(eventType, {
      success,
      userId,
      ...details
    }, event);

    if (!success) {
      // Track failed attempts by IP
      this.trackFailedAttempt(ip, 'ip');

      // Track failed attempts by user
      if (userId) {
        this.trackFailedAttempt(userId, 'user');
      }
    } else {
      // Clear failed attempts on success
      this.ipAttempts.delete(ip);
      if (userId) {
        this.userAttempts.delete(userId);
      }
    }
  }

  /**
   * Log rate limit violation
   */
  logRateLimitViolation(
    event: RequestEvent,
    limit: number,
    current: number,
    resetTime: number
  ): void {
    this.logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
      endpoint: event.url.pathname,
      limit,
      current,
      resetTime,
      method: event.request.method
    }, event, SecuritySeverity.MEDIUM);
  }

  /**
   * Log CSRF violation
   */
  logCSRFViolation(event: RequestEvent, details: Record<string, any> = {}): void {
    this.logSecurityEvent(SecurityEventType.CSRF_VIOLATION, {
      endpoint: event.url.pathname,
      method: event.request.method,
      ...details
    }, event, SecuritySeverity.HIGH);
  }

  /**
   * Log XSS attempt
   */
  logXSSAttempt(
    event: RequestEvent,
    field: string,
    payload: string,
    details: Record<string, any> = {}
  ): void {
    this.logSecurityEvent(SecurityEventType.XSS_ATTEMPT, {
      field,
      payload: payload.substring(0, 200), // Limit payload logging
      endpoint: event.url.pathname,
      ...details
    }, event, SecuritySeverity.HIGH);
  }

  /**
   * Log SQL injection attempt
   */
  logSQLInjectionAttempt(
    event: RequestEvent,
    field: string,
    payload: string,
    details: Record<string, any> = {}
  ): void {
    this.logSecurityEvent(SecurityEventType.SQL_INJECTION_ATTEMPT, {
      field,
      payload: payload.substring(0, 200), // Limit payload logging
      endpoint: event.url.pathname,
      ...details
    }, event, SecuritySeverity.CRITICAL);
  }

  /**
   * Log CSP violation
   */
  logCSPViolation(report: any): void {
    this.logSecurityEvent(SecurityEventType.CSP_VIOLATION, {
      violatedDirective: report['violated-directive'],
      blockedUri: report['blocked-uri'],
      documentUri: report['document-uri'],
      sourceFile: report['source-file'],
      lineNumber: report['line-number'],
      originalPolicy: report['original-policy']
    }, undefined, SecuritySeverity.MEDIUM);
  }

  /**
   * Log access denied event
   */
  logAccessDenied(
    event: RequestEvent,
    requiredRole: UserRole,
    userRole?: UserRole,
    details: Record<string, any> = {}
  ): void {
    this.logSecurityEvent(SecurityEventType.ACCESS_DENIED, {
      endpoint: event.url.pathname,
      method: event.request.method,
      requiredRole,
      userRole,
      ...details
    }, event, SecuritySeverity.MEDIUM);
  }

  /**
   * Get security metrics for a time range
   */
  getSecurityMetrics(
    startTime: Date = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    endTime: Date = new Date()
  ): SecurityMetrics {
    const relevantEvents = this.events.filter(
      event => event.timestamp >= startTime && event.timestamp <= endTime
    );

    const eventsByType: Record<SecurityEventType, number> = {} as any;
    const eventsBySeverity: Record<SecuritySeverity, number> = {} as any;
    const uniqueIPs = new Set<string>();

    let failedLoginAttempts = 0;
    let rateLimitViolations = 0;
    let suspiciousActivities = 0;

    for (const event of relevantEvents) {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

      // Count by severity
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;

      // Track unique IPs
      if (event.ipAddress) {
        uniqueIPs.add(event.ipAddress);
      }

      // Count specific types
      if (event.type === SecurityEventType.LOGIN_FAILURE) {
        failedLoginAttempts++;
      }

      if (event.type === SecurityEventType.RATE_LIMIT_EXCEEDED) {
        rateLimitViolations++;
      }

      if ([
        SecurityEventType.XSS_ATTEMPT,
        SecurityEventType.SQL_INJECTION_ATTEMPT,
        SecurityEventType.BRUTE_FORCE_ATTEMPT,
        SecurityEventType.SUSPICIOUS_USER_AGENT
      ].includes(event.type)) {
        suspiciousActivities++;
      }
    }

    return {
      totalEvents: relevantEvents.length,
      eventsByType,
      eventsBySeverity,
      uniqueIPs: uniqueIPs.size,
      failedLoginAttempts,
      rateLimitViolations,
      suspiciousActivities,
      timeRange: { start: startTime, end: endTime }
    };
  }

  /**
   * Get recent security events
   */
  getRecentEvents(count: number = 100): SecurityEvent[] {
    return this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count);
  }

  /**
   * Get active security alerts
   */
  getActiveAlerts(): SecurityAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve a security alert
   */
  resolveAlert(alertId: string, resolvedBy?: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
    }
  }

  /**
   * Check if IP is suspicious
   */
  isSuspiciousIP(ip: string): boolean {
    const attempts = this.ipAttempts.get(ip);
    if (!attempts) return false;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return attempts.count >= 5 && attempts.lastAttempt > fiveMinutesAgo;
  }

  /**
   * Private methods
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineSeverity(type: SecurityEventType): SecuritySeverity {
    const criticalEvents = [
      SecurityEventType.SQL_INJECTION_ATTEMPT,
      SecurityEventType.VULNERABILITY_EXPLOIT_ATTEMPT,
      SecurityEventType.MALWARE_DETECTION
    ];

    const highEvents = [
      SecurityEventType.XSS_ATTEMPT,
      SecurityEventType.CSRF_VIOLATION,
      SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT,
      SecurityEventType.BRUTE_FORCE_ATTEMPT
    ];

    const mediumEvents = [
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      SecurityEventType.ACCESS_DENIED,
      SecurityEventType.CSP_VIOLATION,
      SecurityEventType.MULTIPLE_FAILED_LOGINS
    ];

    if (criticalEvents.includes(type)) return SecuritySeverity.CRITICAL;
    if (highEvents.includes(type)) return SecuritySeverity.HIGH;
    if (mediumEvents.includes(type)) return SecuritySeverity.MEDIUM;
    return SecuritySeverity.LOW;
  }

  private trackFailedAttempt(identifier: string, type: 'ip' | 'user'): void {
    const map = type === 'ip' ? this.ipAttempts : this.userAttempts;
    const existing = map.get(identifier) || { count: 0, lastAttempt: new Date(0) };

    // Reset count if last attempt was more than 15 minutes ago
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (existing.lastAttempt < fifteenMinutesAgo) {
      existing.count = 0;
    }

    existing.count++;
    existing.lastAttempt = new Date();
    map.set(identifier, existing);

    // Create alert for brute force attempts
    if (existing.count >= 5) {
      this.createAlert(SecurityEventType.BRUTE_FORCE_ATTEMPT, {
        [type]: identifier,
        attemptCount: existing.count
      });
    }
  }

  private analyzeForAlerts(event: SecurityEvent): void {
    // Create alerts for critical events
    if (event.severity === SecuritySeverity.CRITICAL) {
      this.createAlert(event.type, event.details);
    }

    // Check for suspicious patterns
    if (event.ipAddress && this.isSuspiciousIP(event.ipAddress)) {
      this.createAlert(SecurityEventType.SUSPICIOUS_USER_AGENT, {
        ip: event.ipAddress,
        reason: 'Multiple failed attempts from same IP'
      });
    }
  }

  private createAlert(type: SecurityEventType, details: Record<string, any>): void {
    const alert: SecurityAlert = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type,
      severity: this.determineSeverity(type),
      message: this.generateAlertMessage(type, details),
      details,
      resolved: false
    };

    this.alerts.push(alert);

    // In production, you might want to send notifications
    if (process.env.NODE_ENV === 'production') {
      console.error(`🚨 SECURITY ALERT [${alert.severity}]:`, alert.message);
      // Example: Send to monitoring service
      // notificationService.sendAlert(alert);
    }
  }

  private generateAlertMessage(type: SecurityEventType, details: Record<string, any>): string {
    switch (type) {
      case SecurityEventType.BRUTE_FORCE_ATTEMPT:
        return `Brute force attack detected from ${details.ip || details.user}`;
      case SecurityEventType.SQL_INJECTION_ATTEMPT:
        return `SQL injection attempt detected in field: ${details.field}`;
      case SecurityEventType.XSS_ATTEMPT:
        return `XSS attempt detected in field: ${details.field}`;
      case SecurityEventType.CSRF_VIOLATION:
        return `CSRF token validation failed for ${details.endpoint}`;
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        return `Rate limit exceeded for ${details.endpoint}`;
      default:
        return `Security event: ${type}`;
    }
  }

  private pruneOldEvents(): void {
    // Keep events for 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.events = this.events.filter(event => event.timestamp > sevenDaysAgo);

    // Keep alerts for 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > thirtyDaysAgo);
  }
}

/**
 * Security logger utility functions
 */
export const securityLogger = {
  logAuthAttempt: (success: boolean, event: RequestEvent, details?: Record<string, any>) =>
    SecurityMonitor.getInstance().logAuthAttempt(success, event, details),

  logRateLimitViolation: (event: RequestEvent, limit: number, current: number, resetTime: number) =>
    SecurityMonitor.getInstance().logRateLimitViolation(event, limit, current, resetTime),

  logCSRFViolation: (event: RequestEvent, details?: Record<string, any>) =>
    SecurityMonitor.getInstance().logCSRFViolation(event, details),

  logXSSAttempt: (event: RequestEvent, field: string, payload: string, details?: Record<string, any>) =>
    SecurityMonitor.getInstance().logXSSAttempt(event, field, payload, details),

  logSQLInjectionAttempt: (event: RequestEvent, field: string, payload: string, details?: Record<string, any>) =>
    SecurityMonitor.getInstance().logSQLInjectionAttempt(event, field, payload, details),

  logCSPViolation: (report: any) =>
    SecurityMonitor.getInstance().logCSPViolation(report),

  logAccessDenied: (event: RequestEvent, requiredRole: UserRole, userRole?: UserRole, details?: Record<string, any>) =>
    SecurityMonitor.getInstance().logAccessDenied(event, requiredRole, userRole, details),

  logSecurityEvent: (type: SecurityEventType, details: Record<string, any>, event?: RequestEvent, severity?: SecuritySeverity) =>
    SecurityMonitor.getInstance().logSecurityEvent(type, details, event, severity)
};

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance();