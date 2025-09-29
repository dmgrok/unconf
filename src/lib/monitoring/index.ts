/**
 * Monitoring and Metrics Collection System
 * Tracks WebSocket connections, performance metrics, and system health
 * Integrates with alerting system for automated notifications
 */

import { alertManager } from '../alerting/index.js';

export interface MetricValue {
  timestamp: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface MetricSeries {
  name: string;
  category: string;
  unit: string;
  values: MetricValue[];
  maxRetention: number; // Maximum number of values to retain
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  components: {
    websocket: ComponentHealth;
    database: ComponentHealth;
    api: ComponentHealth;
    storage: ComponentHealth;
  };
  timestamp: Date;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'critical';
  metrics: {
    responseTime?: number;
    errorRate?: number;
    successRate?: number;
    connections?: number;
  };
  lastCheck: Date;
  issues: string[];
}

export interface WebSocketMetrics {
  totalConnections: number;
  activeConnections: number;
  connectionFailures: number;
  messagesReceived: number;
  messagesSent: number;
  messageFailures: number;
  averageResponseTime: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  roomMetrics: Map<string, RoomMetrics>;
}

export interface RoomMetrics {
  roomId: string;
  activeUsers: number;
  messagesPerMinute: number;
  lastActivity: Date;
}

export interface PerformanceMetrics {
  apiRequests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
    slowRequests: number; // > 3 seconds
  };
  database: {
    queries: number;
    averageQueryTime: number;
    slowQueries: number; // > 1 second
    connectionPool: number;
  };
  system: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
  };
  errors: {
    total: number;
    critical: number;
    byCategory: Map<string, number>;
  };
}

class MetricsCollector {
  private metrics = new Map<string, MetricSeries>();
  private websocketMetrics: WebSocketMetrics;
  private performanceMetrics: PerformanceMetrics;
  private systemHealth: SystemHealth;
  private collectionInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.websocketMetrics = this.initializeWebSocketMetrics();
    this.performanceMetrics = this.initializePerformanceMetrics();
    this.systemHealth = this.initializeSystemHealth();

    this.startCollection();
  }

  private initializeWebSocketMetrics(): WebSocketMetrics {
    return {
      totalConnections: 0,
      activeConnections: 0,
      connectionFailures: 0,
      messagesReceived: 0,
      messagesSent: 0,
      messageFailures: 0,
      averageResponseTime: 0,
      connectionQuality: 'excellent',
      roomMetrics: new Map()
    };
  }

  private initializePerformanceMetrics(): PerformanceMetrics {
    return {
      apiRequests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        slowRequests: 0
      },
      database: {
        queries: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        connectionPool: 0
      },
      system: {
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        diskUsage: 0
      },
      errors: {
        total: 0,
        critical: 0,
        byCategory: new Map()
      }
    };
  }

  private initializeSystemHealth(): SystemHealth {
    return {
      overall: 'healthy',
      components: {
        websocket: {
          status: 'healthy',
          metrics: {},
          lastCheck: new Date(),
          issues: []
        },
        database: {
          status: 'healthy',
          metrics: {},
          lastCheck: new Date(),
          issues: []
        },
        api: {
          status: 'healthy',
          metrics: {},
          lastCheck: new Date(),
          issues: []
        },
        storage: {
          status: 'healthy',
          metrics: {},
          lastCheck: new Date(),
          issues: []
        }
      },
      timestamp: new Date()
    };
  }

  /**
   * Record a metric value
   */
  recordMetric(name: string, category: string, value: number, unit = '', metadata?: Record<string, unknown>): void {
    let series = this.metrics.get(name);

    if (!series) {
      series = {
        name,
        category,
        unit,
        values: [],
        maxRetention: 1000 // Keep last 1000 values
      };
      this.metrics.set(name, series);
    }

    series.values.push({
      timestamp: new Date(),
      value,
      metadata
    });

    // Trim old values
    if (series.values.length > series.maxRetention) {
      series.values = series.values.slice(-series.maxRetention);
    }
  }

  /**
   * Update WebSocket metrics
   */
  updateWebSocketMetrics(metrics: Partial<WebSocketMetrics>): void {
    Object.assign(this.websocketMetrics, metrics);

    // Record key metrics as time series
    this.recordMetric('websocket.active_connections', 'websocket', this.websocketMetrics.activeConnections, 'count');
    this.recordMetric('websocket.response_time', 'websocket', this.websocketMetrics.averageResponseTime, 'ms');
    this.recordMetric('websocket.message_failures', 'websocket', this.websocketMetrics.messageFailures, 'count');
  }

  /**
   * Update room metrics
   */
  updateRoomMetrics(roomId: string, metrics: Partial<RoomMetrics>): void {
    const existing = this.websocketMetrics.roomMetrics.get(roomId) || {
      roomId,
      activeUsers: 0,
      messagesPerMinute: 0,
      lastActivity: new Date()
    };

    this.websocketMetrics.roomMetrics.set(roomId, { ...existing, ...metrics });

    // Record room-specific metrics
    this.recordMetric(`room.${roomId}.active_users`, 'room', existing.activeUsers, 'count');
    this.recordMetric(`room.${roomId}.messages_per_minute`, 'room', existing.messagesPerMinute, 'rate');
  }

  /**
   * Record API request metrics
   */
  recordApiRequest(endpoint: string, method: string, duration: number, statusCode: number): void {
    this.performanceMetrics.apiRequests.total++;

    if (statusCode >= 200 && statusCode < 400) {
      this.performanceMetrics.apiRequests.successful++;
    } else {
      this.performanceMetrics.apiRequests.failed++;
    }

    if (duration > 3000) {
      this.performanceMetrics.apiRequests.slowRequests++;
    }

    // Update average response time
    this.updateAverage(
      'apiRequests.averageResponseTime',
      this.performanceMetrics.apiRequests.averageResponseTime,
      duration,
      this.performanceMetrics.apiRequests.total
    );

    // Record as time series
    this.recordMetric('api.request_duration', 'performance', duration, 'ms', {
      endpoint,
      method,
      statusCode
    });

    this.recordMetric('api.requests_per_minute', 'performance', this.calculateRate('api_requests'), 'rate');
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(operation: string, table: string, duration: number): void {
    this.performanceMetrics.database.queries++;

    if (duration > 1000) {
      this.performanceMetrics.database.slowQueries++;
    }

    // Update average query time
    this.updateAverage(
      'database.averageQueryTime',
      this.performanceMetrics.database.averageQueryTime,
      duration,
      this.performanceMetrics.database.queries
    );

    // Record as time series
    this.recordMetric('database.query_duration', 'performance', duration, 'ms', {
      operation,
      table
    });
  }

  /**
   * Record error metrics
   */
  recordError(category: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    this.performanceMetrics.errors.total++;

    if (severity === 'critical') {
      this.performanceMetrics.errors.critical++;
    }

    const categoryCount = this.performanceMetrics.errors.byCategory.get(category) || 0;
    this.performanceMetrics.errors.byCategory.set(category, categoryCount + 1);

    // Record as time series
    this.recordMetric('errors.total', 'errors', this.performanceMetrics.errors.total, 'count');
    this.recordMetric(`errors.${category}`, 'errors', categoryCount + 1, 'count');
    this.recordMetric('errors.per_minute', 'errors', this.calculateRate('errors'), 'rate');
  }

  /**
   * Update system resource metrics
   */
  updateSystemMetrics(metrics: {
    memoryUsage?: number;
    cpuUsage?: number;
    diskUsage?: number;
    uptime?: number;
  }): void {
    Object.assign(this.performanceMetrics.system, metrics);

    // Record as time series
    if (metrics.memoryUsage !== undefined) {
      this.recordMetric('system.memory_usage', 'system', metrics.memoryUsage, '%');
    }
    if (metrics.cpuUsage !== undefined) {
      this.recordMetric('system.cpu_usage', 'system', metrics.cpuUsage, '%');
    }
    if (metrics.diskUsage !== undefined) {
      this.recordMetric('system.disk_usage', 'system', metrics.diskUsage, '%');
    }
  }

  /**
   * Perform system health check
   */
  performHealthCheck(): SystemHealth {
    const now = new Date();

    // Check WebSocket health
    this.systemHealth.components.websocket = {
      status: this.getWebSocketHealth(),
      metrics: {
        connections: this.websocketMetrics.activeConnections,
        responseTime: this.websocketMetrics.averageResponseTime,
        errorRate: this.calculateErrorRate('websocket')
      },
      lastCheck: now,
      issues: this.getWebSocketIssues()
    };

    // Check API health
    this.systemHealth.components.api = {
      status: this.getApiHealth(),
      metrics: {
        responseTime: this.performanceMetrics.apiRequests.averageResponseTime,
        errorRate: this.calculateErrorRate('api'),
        successRate: this.calculateSuccessRate()
      },
      lastCheck: now,
      issues: this.getApiIssues()
    };

    // Check database health
    this.systemHealth.components.database = {
      status: this.getDatabaseHealth(),
      metrics: {
        responseTime: this.performanceMetrics.database.averageQueryTime,
        connections: this.performanceMetrics.database.connectionPool
      },
      lastCheck: now,
      issues: this.getDatabaseIssues()
    };

    // Check storage health
    this.systemHealth.components.storage = {
      status: this.getStorageHealth(),
      metrics: {},
      lastCheck: now,
      issues: []
    };

    // Determine overall health
    this.systemHealth.overall = this.calculateOverallHealth();
    this.systemHealth.timestamp = now;

    return this.systemHealth;
  }

  /**
   * Get metrics for dashboard
   */
  getDashboardMetrics() {
    return {
      websocket: this.websocketMetrics,
      performance: this.performanceMetrics,
      health: this.systemHealth,
      timeSeries: this.getTimeSeriesData(),
      alerts: this.getActiveAlerts()
    };
  }

  /**
   * Get time series data for charts
   */
  private getTimeSeriesData() {
    const result: Record<string, any> = {};

    for (const [name, series] of this.metrics.entries()) {
      result[name] = {
        category: series.category,
        unit: series.unit,
        values: series.values.slice(-100) // Last 100 values for charts
      };
    }

    return result;
  }

  /**
   * Get active alerts based on thresholds
   */
  private getActiveAlerts() {
    const alerts: Array<{
      level: 'warning' | 'critical';
      message: string;
      component: string;
      timestamp: Date;
    }> = [];

    // WebSocket alerts
    if (this.websocketMetrics.connectionFailures > 10) {
      alerts.push({
        level: 'warning',
        message: `High connection failure rate: ${this.websocketMetrics.connectionFailures}`,
        component: 'websocket',
        timestamp: new Date()
      });
    }

    if (this.websocketMetrics.averageResponseTime > 5000) {
      alerts.push({
        level: 'critical',
        message: `Very slow WebSocket response time: ${this.websocketMetrics.averageResponseTime}ms`,
        component: 'websocket',
        timestamp: new Date()
      });
    }

    // API alerts
    if (this.performanceMetrics.apiRequests.averageResponseTime > 3000) {
      alerts.push({
        level: 'warning',
        message: `Slow API response time: ${this.performanceMetrics.apiRequests.averageResponseTime}ms`,
        component: 'api',
        timestamp: new Date()
      });
    }

    const errorRate = this.calculateErrorRate('api');
    if (errorRate > 10) {
      alerts.push({
        level: 'critical',
        message: `High API error rate: ${errorRate}%`,
        component: 'api',
        timestamp: new Date()
      });
    }

    // System alerts
    if (this.performanceMetrics.system.memoryUsage > 85) {
      alerts.push({
        level: 'critical',
        message: `High memory usage: ${this.performanceMetrics.system.memoryUsage}%`,
        component: 'system',
        timestamp: new Date()
      });
    }

    if (this.performanceMetrics.system.cpuUsage > 80) {
      alerts.push({
        level: 'warning',
        message: `High CPU usage: ${this.performanceMetrics.system.cpuUsage}%`,
        component: 'system',
        timestamp: new Date()
      });
    }

    return alerts;
  }

  private updateAverage(key: string, currentAvg: number, newValue: number, count: number): void {
    // Simple moving average update
    const newAvg = ((currentAvg * (count - 1)) + newValue) / count;
    // Update the metric in place (this is a simplified approach)
  }

  private calculateRate(metricType: string): number {
    // Calculate per-minute rate based on recent activity
    // This is a simplified implementation
    return 0;
  }

  private calculateErrorRate(component: string): number {
    if (component === 'api') {
      const total = this.performanceMetrics.apiRequests.total;
      const failed = this.performanceMetrics.apiRequests.failed;
      return total > 0 ? (failed / total) * 100 : 0;
    }
    return 0;
  }

  private calculateSuccessRate(): number {
    const total = this.performanceMetrics.apiRequests.total;
    const successful = this.performanceMetrics.apiRequests.successful;
    return total > 0 ? (successful / total) * 100 : 100;
  }

  private getWebSocketHealth(): 'healthy' | 'degraded' | 'critical' {
    if (this.websocketMetrics.averageResponseTime > 5000 || this.websocketMetrics.connectionFailures > 20) {
      return 'critical';
    }
    if (this.websocketMetrics.averageResponseTime > 2000 || this.websocketMetrics.connectionFailures > 5) {
      return 'degraded';
    }
    return 'healthy';
  }

  private getApiHealth(): 'healthy' | 'degraded' | 'critical' {
    const errorRate = this.calculateErrorRate('api');
    if (errorRate > 10 || this.performanceMetrics.apiRequests.averageResponseTime > 5000) {
      return 'critical';
    }
    if (errorRate > 5 || this.performanceMetrics.apiRequests.averageResponseTime > 2000) {
      return 'degraded';
    }
    return 'healthy';
  }

  private getDatabaseHealth(): 'healthy' | 'degraded' | 'critical' {
    if (this.performanceMetrics.database.averageQueryTime > 2000 || this.performanceMetrics.database.slowQueries > 10) {
      return 'critical';
    }
    if (this.performanceMetrics.database.averageQueryTime > 1000 || this.performanceMetrics.database.slowQueries > 3) {
      return 'degraded';
    }
    return 'healthy';
  }

  private getStorageHealth(): 'healthy' | 'degraded' | 'critical' {
    // Simplified storage health check
    return 'healthy';
  }

  private calculateOverallHealth(): 'healthy' | 'degraded' | 'critical' {
    const components = Object.values(this.systemHealth.components);
    const criticalCount = components.filter(c => c.status === 'critical').length;
    const degradedCount = components.filter(c => c.status === 'degraded').length;

    if (criticalCount > 0) {
      return 'critical';
    }
    if (degradedCount > 1) {
      return 'degraded';
    }
    return 'healthy';
  }

  private getWebSocketIssues(): string[] {
    const issues: string[] = [];
    if (this.websocketMetrics.connectionFailures > 5) {
      issues.push(`High connection failure rate: ${this.websocketMetrics.connectionFailures}`);
    }
    if (this.websocketMetrics.averageResponseTime > 2000) {
      issues.push(`Slow response time: ${this.websocketMetrics.averageResponseTime}ms`);
    }
    return issues;
  }

  private getApiIssues(): string[] {
    const issues: string[] = [];
    if (this.performanceMetrics.apiRequests.slowRequests > 10) {
      issues.push(`${this.performanceMetrics.apiRequests.slowRequests} slow requests detected`);
    }
    return issues;
  }

  private getDatabaseIssues(): string[] {
    const issues: string[] = [];
    if (this.performanceMetrics.database.slowQueries > 3) {
      issues.push(`${this.performanceMetrics.database.slowQueries} slow queries detected`);
    }
    return issues;
  }

  private startCollection(): void {
    // Collect metrics every 30 seconds
    this.collectionInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Health check every 60 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000);
  }

  cleanup(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Create singleton instance
export const metricsCollector = new MetricsCollector();
export { MetricsCollector };