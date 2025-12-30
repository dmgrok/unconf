/**
 * WebSocket Monitoring API
 * Provides detailed WebSocket connection and performance metrics
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { metricsCollector } from '$lib/monitoring/index.js';
import { apiRoute } from '$lib/errors/handler.js';

export const GET: RequestHandler = apiRoute(async (event) => {
  const roomId = event.url.searchParams.get('roomId');
  const includeHistory = event.url.searchParams.get('includeHistory') === 'true';

  const dashboardMetrics = metricsCollector.getDashboardMetrics();
  const websocketMetrics = dashboardMetrics.websocket;

  if (roomId) {
    // Get metrics for specific room
    const roomMetrics = websocketMetrics.roomMetrics.get(roomId);

    if (!roomMetrics) {
      return json({
        success: false,
        error: `Room '${roomId}' not found`
      }, { status: 404 });
    }

    const roomTimeSeries = includeHistory
      ? filterTimeSeriesByPrefix(dashboardMetrics.timeSeries, `room.${roomId}`)
      : {};

    return json({
      success: true,
      data: {
        room: roomMetrics,
        timeSeries: roomTimeSeries,
        health: calculateRoomHealth(roomMetrics),
        alerts: dashboardMetrics.alerts.filter(alert =>
          alert.message.includes(roomId)
        )
      }
    });
  }

  // Get overall WebSocket metrics
  const websocketTimeSeries = includeHistory
    ? filterTimeSeriesByPrefix(dashboardMetrics.timeSeries, 'websocket')
    : {};

  return json({
    success: true,
    data: {
      overview: {
        totalConnections: websocketMetrics.totalConnections,
        activeConnections: websocketMetrics.activeConnections,
        connectionFailures: websocketMetrics.connectionFailures,
        messagesReceived: websocketMetrics.messagesReceived,
        messagesSent: websocketMetrics.messagesSent,
        messageFailures: websocketMetrics.messageFailures,
        averageResponseTime: websocketMetrics.averageResponseTime,
        connectionQuality: websocketMetrics.connectionQuality
      },
      rooms: Array.from(websocketMetrics.roomMetrics.entries()).map(([id, metrics]) => ({
        ...metrics,
        roomId: id,
        health: calculateRoomHealth(metrics)
      })),
      performance: {
        connectionSuccessRate: calculateConnectionSuccessRate(websocketMetrics),
        messageSuccessRate: calculateMessageSuccessRate(websocketMetrics),
        averageLatency: websocketMetrics.averageResponseTime,
        peakConnections: findPeakConnections(websocketTimeSeries),
        connectionTrend: calculateConnectionTrend(websocketTimeSeries)
      },
      timeSeries: websocketTimeSeries,
      health: dashboardMetrics.health.components.websocket,
      alerts: dashboardMetrics.alerts.filter(alert => alert.component === 'websocket')
    }
  });
});

export const POST: RequestHandler = apiRoute(async (event) => {
  const body = await event.request.json();
  const { action, data } = body;

  switch (action) {
    case 'update_connection_metrics':
      if (!data) {
        return json({
          success: false,
          error: 'Connection metrics data is required'
        }, { status: 400 });
      }

      metricsCollector.updateWebSocketMetrics(data);

      return json({
        success: true,
        message: 'Connection metrics updated'
      });

    case 'update_room_metrics':
      if (!data.roomId) {
        return json({
          success: false,
          error: 'Room ID is required'
        }, { status: 400 });
      }

      metricsCollector.updateRoomMetrics(data.roomId, data);

      return json({
        success: true,
        message: 'Room metrics updated'
      });

    case 'record_connection_event':
      if (!data.event || !data.socketId) {
        return json({
          success: false,
          error: 'Event type and socket ID are required'
        }, { status: 400 });
      }

      recordConnectionEvent(data.event, data.socketId, data.metadata);

      return json({
        success: true,
        message: 'Connection event recorded'
      });

    case 'record_message_metrics':
      if (!data.messageType || data.duration === undefined) {
        return json({
          success: false,
          error: 'Message type and duration are required'
        }, { status: 400 });
      }

      recordMessageMetrics(data.messageType, data.duration, data.success, data.metadata);

      return json({
        success: true,
        message: 'Message metrics recorded'
      });

    case 'get_connection_quality':
      const quality = assessConnectionQuality();

      return json({
        success: true,
        data: {
          quality: quality.overall,
          factors: quality.factors,
          recommendations: quality.recommendations
        }
      });

    default:
      return json({
        success: false,
        error: 'Invalid action. Available: update_connection_metrics, update_room_metrics, record_connection_event, record_message_metrics, get_connection_quality'
      }, { status: 400 });
  }
});

/**
 * Filter time series data by prefix
 */
function filterTimeSeriesByPrefix(timeSeries: Record<string, any>, prefix: string): Record<string, any> {
  const filtered: Record<string, any> = {};

  for (const [key, series] of Object.entries(timeSeries)) {
    if (key.startsWith(prefix)) {
      filtered[key] = series;
    }
  }

  return filtered;
}

/**
 * Calculate room health based on metrics
 */
function calculateRoomHealth(roomMetrics: any): 'healthy' | 'degraded' | 'critical' {
  const timeSinceLastActivity = Date.now() - new Date(roomMetrics.lastActivity).getTime();

  // Room is critical if no activity for 30 minutes
  if (timeSinceLastActivity > 30 * 60 * 1000) {
    return 'critical';
  }

  // Room is degraded if no activity for 10 minutes
  if (timeSinceLastActivity > 10 * 60 * 1000) {
    return 'degraded';
  }

  // Room is degraded if message rate is very low
  if (roomMetrics.messagesPerMinute < 0.1 && roomMetrics.activeUsers > 0) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Calculate connection success rate
 */
function calculateConnectionSuccessRate(metrics: any): number {
  const total = metrics.totalConnections;
  const failures = metrics.connectionFailures;

  if (total === 0) return 100;

  return ((total - failures) / total) * 100;
}

/**
 * Calculate message success rate
 */
function calculateMessageSuccessRate(metrics: any): number {
  const total = metrics.messagesReceived + metrics.messagesSent;
  const failures = metrics.messageFailures;

  if (total === 0) return 100;

  return ((total - failures) / total) * 100;
}

/**
 * Find peak connections from time series data
 */
function findPeakConnections(timeSeries: Record<string, any>): number {
  const connectionSeries = timeSeries['websocket.active_connections'];

  if (!connectionSeries || !connectionSeries.values) return 0;

  return Math.max(...connectionSeries.values.map((v: any) => v.value));
}

/**
 * Calculate connection trend
 */
function calculateConnectionTrend(timeSeries: Record<string, any>): 'increasing' | 'decreasing' | 'stable' {
  const connectionSeries = timeSeries['websocket.active_connections'];

  if (!connectionSeries || !connectionSeries.values || connectionSeries.values.length < 2) {
    return 'stable';
  }

  const values = connectionSeries.values;
  const recent = values.slice(-10); // Last 10 values
  const firstHalf = recent.slice(0, 5);
  const secondHalf = recent.slice(5);

  const firstAvg = firstHalf.reduce((sum: number, v: any) => sum + v.value, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum: number, v: any) => sum + v.value, 0) / secondHalf.length;

  const change = (secondAvg - firstAvg) / firstAvg;

  if (change > 0.1) return 'increasing';
  if (change < -0.1) return 'decreasing';
  return 'stable';
}

/**
 * Record connection event
 */
function recordConnectionEvent(event: string, socketId: string, metadata?: Record<string, unknown>): void {
  metricsCollector.recordMetric(
    `websocket.connection.${event}`,
    'websocket',
    1,
    'count',
    { socketId, ...metadata }
  );
}

/**
 * Record message metrics
 */
function recordMessageMetrics(
  messageType: string,
  duration: number,
  success: boolean,
  metadata?: Record<string, unknown>
): void {
  metricsCollector.recordMetric(
    `websocket.message.${messageType}.duration`,
    'websocket',
    duration,
    'ms',
    { success, ...metadata }
  );

  metricsCollector.recordMetric(
    `websocket.message.${messageType}.${success ? 'success' : 'failure'}`,
    'websocket',
    1,
    'count',
    metadata
  );
}

/**
 * Assess overall connection quality
 */
function assessConnectionQuality(): {
  overall: 'excellent' | 'good' | 'poor' | 'critical';
  factors: Record<string, any>;
  recommendations: string[];
} {
  const dashboardMetrics = metricsCollector.getDashboardMetrics();
  const wsMetrics = dashboardMetrics.websocket;

  const factors = {
    responseTime: wsMetrics.averageResponseTime,
    connectionSuccessRate: calculateConnectionSuccessRate(wsMetrics),
    messageSuccessRate: calculateMessageSuccessRate(wsMetrics),
    connectionFailures: wsMetrics.connectionFailures,
    activeConnections: wsMetrics.activeConnections
  };

  const recommendations: string[] = [];
  let quality: 'excellent' | 'good' | 'poor' | 'critical' = 'excellent';

  // Assess response time
  if (factors.responseTime > 5000) {
    quality = 'critical';
    recommendations.push('Investigate server performance - response time is critically slow');
  } else if (factors.responseTime > 2000) {
    quality = 'poor';
    recommendations.push('Optimize server response time - consider scaling or performance tuning');
  } else if (factors.responseTime > 1000) {
    if (quality === 'excellent') quality = 'good';
    recommendations.push('Monitor response time trends - consider minor optimizations');
  }

  // Assess success rates
  if (factors.connectionSuccessRate < 90) {
    quality = 'critical';
    recommendations.push('High connection failure rate - check network infrastructure');
  } else if (factors.connectionSuccessRate < 95) {
    if (quality !== 'critical') quality = 'poor';
    recommendations.push('Connection success rate below optimal - investigate connectivity issues');
  }

  if (factors.messageSuccessRate < 95) {
    if (quality === 'excellent') quality = 'good';
    recommendations.push('Message delivery issues detected - check WebSocket stability');
  }

  // Assess connection failures
  if (factors.connectionFailures > 20) {
    quality = 'critical';
    recommendations.push('Very high connection failure count - immediate investigation required');
  } else if (factors.connectionFailures > 10) {
    if (quality !== 'critical') quality = 'poor';
    recommendations.push('Elevated connection failures - monitor and investigate patterns');
  }

  if (recommendations.length === 0) {
    recommendations.push('WebSocket connections are performing well - continue monitoring');
  }

  return { overall: quality, factors, recommendations };
}