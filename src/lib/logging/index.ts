/**
 * Structured Logging System with Error Categorization
 * Provides comprehensive logging capabilities across the application
 */

import { ErrorCategory, ErrorSeverity, type AppError } from '../errors/index.js';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  context: LogContext;
  metadata?: Record<string, unknown>;
  error?: AppError;
  traceId?: string;
  sessionId?: string;
  correlationId?: string;
}

export interface LogContext {
  component?: string;
  operation?: string;
  userId?: string;
  eventId?: string;
  topicId?: string;
  socketId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  duration?: number;
  additionalData?: Record<string, unknown>;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableStructured: boolean;
  logDirectory?: string;
  maxFileSize?: number;
  maxFiles?: number;
  enableRemoteLogging?: boolean;
  remoteEndpoint?: string;
}

class Logger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private flushInterval?: NodeJS.Timeout;
  private correlationIds = new Map<string, string>();

  constructor(config: LoggerConfig) {
    this.config = {
      ...config,
      level: config.level ?? LogLevel.INFO,
      enableConsole: config.enableConsole ?? true,
      enableFile: config.enableFile ?? false,
      enableStructured: config.enableStructured ?? true,
      maxFileSize: config.maxFileSize ?? 10 * 1024 * 1024, // 10MB
      maxFiles: config.maxFiles ?? 5
    };

    if (this.config.enableFile) {
      this.setupFileLogging();
    }

    // Flush logs every 5 seconds
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, 5000);
  }

  /**
   * Create a structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    category: string,
    message: string,
    context: LogContext = {},
    metadata?: Record<string, unknown>,
    error?: AppError
  ): LogEntry {
    return {
      timestamp: new Date(),
      level,
      category,
      message,
      context,
      metadata,
      error,
      traceId: this.generateTraceId(),
      sessionId: context.userId ? this.getSessionId(context.userId) : undefined,
      correlationId: context.requestId ? this.getCorrelationId(context.requestId) : undefined
    };
  }

  /**
   * Debug logging
   */
  debug(message: string, context: LogContext = {}, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, 'debug', message, context, metadata);
  }

  /**
   * Info logging
   */
  info(message: string, context: LogContext = {}, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, 'info', message, context, metadata);
  }

  /**
   * Warning logging
   */
  warn(message: string, context: LogContext = {}, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, 'warning', message, context, metadata);
  }

  /**
   * Error logging
   */
  error(message: string, context: LogContext = {}, metadata?: Record<string, unknown>, error?: AppError): void {
    this.log(LogLevel.ERROR, 'error', message, context, metadata, error);
  }

  /**
   * Critical error logging
   */
  critical(message: string, context: LogContext = {}, metadata?: Record<string, unknown>, error?: AppError): void {
    this.log(LogLevel.CRITICAL, 'critical', message, context, metadata, error);
  }

  /**
   * Log application errors with proper categorization
   */
  logError(error: AppError, context: LogContext = {}): void {
    const level = this.getLogLevelFromSeverity(error.severity);
    const enhancedContext = {
      ...context,
      ...error.context,
      errorCode: error.code,
      errorCategory: error.category,
      retryable: error.retryable
    };

    this.log(level, error.category, error instanceof Error ? error.message : String(error), enhancedContext, undefined, error);
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, duration: number, context: LogContext = {}): void {
    this.info(`Performance: ${operation}`, {
      ...context,
      component: 'performance',
      operation,
      duration
    }, {
      durationMs: duration,
      performanceCategory: this.categorizePerformance(duration)
    });
  }

  /**
   * Log WebSocket events
   */
  logWebSocket(event: string, context: LogContext = {}, metadata?: Record<string, unknown>): void {
    this.info(`WebSocket: ${event}`, {
      ...context,
      component: 'websocket',
      operation: event
    }, metadata);
  }

  /**
   * Log database operations
   */
  logDatabase(operation: string, context: LogContext = {}, metadata?: Record<string, unknown>): void {
    this.info(`Database: ${operation}`, {
      ...context,
      component: 'database',
      operation
    }, metadata);
  }

  /**
   * Log authentication events
   */
  logAuth(event: string, context: LogContext = {}, metadata?: Record<string, unknown>): void {
    // Never log sensitive data
    const sanitizedMetadata = metadata ? this.sanitizeAuthMetadata(metadata) : undefined;

    this.info(`Auth: ${event}`, {
      ...context,
      component: 'authentication',
      operation: event
    }, sanitizedMetadata);
  }

  /**
   * Log security events
   */
  logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context: LogContext = {}): void {
    const level = severity === 'critical' ? LogLevel.CRITICAL :
                  severity === 'high' ? LogLevel.ERROR :
                  severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;

    this.log(level, 'security', `Security: ${event}`, {
      ...context,
      component: 'security',
      operation: event
    }, { securitySeverity: severity });
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    category: string,
    message: string,
    context: LogContext = {},
    metadata?: Record<string, unknown>,
    error?: AppError
  ): void {
    if (level < this.config.level) {
      return;
    }

    const logEntry = this.createLogEntry(level, category, message, context, metadata, error);

    // Add to buffer for batch processing
    this.logBuffer.push(logEntry);

    // Console logging (immediate)
    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    // Critical errors are flushed immediately
    if (level >= LogLevel.CRITICAL) {
      this.flushLogs();
    }
  }

  /**
   * Log to console with proper formatting
   */
  private logToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();

    let consoleFn: typeof console.log;
    switch (entry.level) {
      case LogLevel.CRITICAL:
      case LogLevel.ERROR:
        consoleFn = console.error;
        break;
      case LogLevel.WARN:
        consoleFn = console.warn;
        break;
      case LogLevel.INFO:
        consoleFn = console.info;
        break;
      default:
        consoleFn = console.log;
    }

    if (this.config.enableStructured) {
      consoleFn(JSON.stringify({
        timestamp,
        level: levelName,
        category: entry.category,
        message: entry.message,
        context: entry.context,
        metadata: entry.metadata,
        error: entry.error ? {
          code: entry.error.code,
          category: entry.error.category,
          severity: entry.error.severity,
          retryable: entry.error.retryable,
          stack: process.env.NODE_ENV === 'development' ? entry.error.stack : undefined
        } : undefined,
        traceId: entry.traceId,
        sessionId: entry.sessionId,
        correlationId: entry.correlationId
      }, null, 2));
    } else {
      const contextStr = Object.keys(entry.context).length > 0
        ? ` [${Object.entries(entry.context).map(([k, v]) => `${k}:${v}`).join(', ')}]`
        : '';

      consoleFn(`${timestamp} [${levelName}] ${entry.category}: ${entry.message}${contextStr}`);

      if (entry.error && process.env.NODE_ENV === 'development') {
        consoleFn(entry.error.stack);
      }
    }
  }

  /**
   * Flush buffered logs
   */
  private flushLogs(): void {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    // File logging
    if (this.config.enableFile) {
      this.writeToFile(logsToFlush);
    }

    // Remote logging
    if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
      this.sendToRemote(logsToFlush);
    }
  }

  /**
   * Setup file logging (placeholder)
   */
  private setupFileLogging(): void {
    // Implementation would depend on file system access
    // For now, just log that file logging is enabled
    console.info('File logging enabled - logs will be written to', this.config.logDirectory);
  }

  /**
   * Write logs to file (placeholder)
   */
  private writeToFile(logs: LogEntry[]): void {
    // Implementation would write to actual files
    // For demo purposes, just log the count
    console.info(`Would write ${logs.length} log entries to file`);
  }

  /**
   * Send logs to remote endpoint (placeholder)
   */
  private sendToRemote(logs: LogEntry[]): void {
    // Implementation would send to monitoring service
    console.info(`Would send ${logs.length} log entries to remote endpoint`);
  }

  /**
   * Convert error severity to log level
   */
  private getLogLevelFromSeverity(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return LogLevel.CRITICAL;
      case ErrorSeverity.HIGH:
        return LogLevel.ERROR;
      case ErrorSeverity.MEDIUM:
        return LogLevel.WARN;
      case ErrorSeverity.LOW:
        return LogLevel.INFO;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * Categorize performance based on duration
   */
  private categorizePerformance(duration: number): string {
    if (duration < 100) return 'excellent';
    if (duration < 500) return 'good';
    if (duration < 1000) return 'acceptable';
    if (duration < 3000) return 'slow';
    return 'very_slow';
  }

  /**
   * Sanitize authentication metadata to prevent logging sensitive data
   */
  private sanitizeAuthMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    const sanitized = { ...metadata };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Generate unique trace ID
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get or create session ID for user
   */
  private getSessionId(userId: string): string {
    const existing = this.correlationIds.get(`session_${userId}`);
    if (existing) return existing;

    const sessionId = `session_${userId}_${Date.now()}`;
    this.correlationIds.set(`session_${userId}`, sessionId);
    return sessionId;
  }

  /**
   * Get or create correlation ID for request
   */
  private getCorrelationId(requestId: string): string {
    const existing = this.correlationIds.get(`correlation_${requestId}`);
    if (existing) return existing;

    const correlationId = `corr_${requestId}_${Date.now()}`;
    this.correlationIds.set(`correlation_${requestId}`, correlationId);
    return correlationId;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushLogs();
    this.correlationIds.clear();
  }
}

// Create default logger instance
const defaultConfig: LoggerConfig = {
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableFile: false,
  enableStructured: process.env.NODE_ENV === 'development',
  enableRemoteLogging: false
};

export const logger = new Logger(defaultConfig);

// Export Logger class
export { Logger };
export default logger;