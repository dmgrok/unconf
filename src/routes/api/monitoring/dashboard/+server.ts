/**
 * Monitoring Dashboard API
 * Provides real-time metrics and health data for the monitoring dashboard
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { metricsCollector } from '$lib/monitoring/index.js';
import { apiRoute } from '$lib/errors/handler.js';

export const GET: RequestHandler = apiRoute(async (event) => {
  const component = event.url.searchParams.get('component');
  const timeRange = event.url.searchParams.get('timeRange') || '1h';
  const format = event.url.searchParams.get('format') || 'full';

  // Get comprehensive dashboard metrics
  const dashboardMetrics = metricsCollector.getDashboardMetrics();

  // Filter by component if requested
  if (component) {
    switch (component) {
      case 'websocket':
        return json({
          success: true,
          data: {
            websocket: dashboardMetrics.websocket,
            health: dashboardMetrics.health.components.websocket,
            alerts: dashboardMetrics.alerts.filter(alert => alert.component === 'websocket'),
            timeSeries: filterTimeSeriesByCategory(dashboardMetrics.timeSeries, 'websocket')
          }
        });

      case 'api':
        return json({
          success: true,
          data: {
            performance: dashboardMetrics.performance.apiRequests,
            health: dashboardMetrics.health.components.api,
            alerts: dashboardMetrics.alerts.filter(alert => alert.component === 'api'),
            timeSeries: filterTimeSeriesByCategory(dashboardMetrics.timeSeries, 'performance')
          }
        });

      case 'database':
        return json({
          success: true,
          data: {
            database: dashboardMetrics.performance.database,
            health: dashboardMetrics.health.components.database,
            alerts: dashboardMetrics.alerts.filter(alert => alert.component === 'database'),
            timeSeries: filterTimeSeriesByCategory(dashboardMetrics.timeSeries, 'database')
          }
        });

      case 'system':
        return json({
          success: true,
          data: {
            system: dashboardMetrics.performance.system,
            health: dashboardMetrics.health.components.storage,
            alerts: dashboardMetrics.alerts.filter(alert => alert.component === 'system'),
            timeSeries: filterTimeSeriesByCategory(dashboardMetrics.timeSeries, 'system')
          }
        });

      default:
        return json({
          success: false,
          error: 'Invalid component. Available: websocket, api, database, system'
        }, { status: 400 });
    }
  }

  // Return format based on request
  if (format === 'summary') {
    return json({
      success: true,
      data: {
        health: dashboardMetrics.health.overall,
        activeConnections: dashboardMetrics.websocket.activeConnections,
        apiResponseTime: dashboardMetrics.performance.apiRequests.averageResponseTime,
        errorRate: calculateOverallErrorRate(dashboardMetrics.performance),
        activeAlerts: dashboardMetrics.alerts.length,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Full dashboard data
  return json({
    success: true,
    data: {
      ...dashboardMetrics,
      metadata: {
        timeRange,
        lastUpdate: new Date().toISOString(),
        refreshRate: '30s'
      }
    }
  });
});

export const POST: RequestHandler = apiRoute(async (event) => {
  const body = await event.request.json();
  const { action, component, data } = body;

  switch (action) {
    case 'record_metric':
      if (!data.name || !data.category || data.value === undefined) {
        return json({
          success: false,
          error: 'Missing required fields: name, category, value'
        }, { status: 400 });
      }

      metricsCollector.recordMetric(
        data.name,
        data.category,
        data.value,
        data.unit,
        data.metadata
      );

      return json({
        success: true,
        message: 'Metric recorded successfully'
      });

    case 'update_websocket_metrics':
      if (!data) {
        return json({
          success: false,
          error: 'Metrics data is required'
        }, { status: 400 });
      }

      metricsCollector.updateWebSocketMetrics(data);

      return json({
        success: true,
        message: 'WebSocket metrics updated'
      });

    case 'record_api_request':
      if (!data.endpoint || !data.method || data.duration === undefined || !data.statusCode) {
        return json({
          success: false,
          error: 'Missing required fields: endpoint, method, duration, statusCode'
        }, { status: 400 });
      }

      metricsCollector.recordApiRequest(
        data.endpoint,
        data.method,
        data.duration,
        data.statusCode
      );

      return json({
        success: true,
        message: 'API request metrics recorded'
      });

    case 'record_database_query':
      if (!data.operation || !data.table || data.duration === undefined) {
        return json({
          success: false,
          error: 'Missing required fields: operation, table, duration'
        }, { status: 400 });
      }

      metricsCollector.recordDatabaseQuery(
        data.operation,
        data.table,
        data.duration
      );

      return json({
        success: true,
        message: 'Database query metrics recorded'
      });

    case 'record_error':
      if (!data.category || !data.severity) {
        return json({
          success: false,
          error: 'Missing required fields: category, severity'
        }, { status: 400 });
      }

      metricsCollector.recordError(data.category, data.severity);

      return json({
        success: true,
        message: 'Error metrics recorded'
      });

    case 'update_system_metrics':
      if (!data) {
        return json({
          success: false,
          error: 'System metrics data is required'
        }, { status: 400 });
      }

      metricsCollector.updateSystemMetrics(data);

      return json({
        success: true,
        message: 'System metrics updated'
      });

    case 'health_check':
      const health = metricsCollector.performHealthCheck();

      return json({
        success: true,
        data: health
      });

    default:
      return json({
        success: false,
        error: 'Invalid action. Available: record_metric, update_websocket_metrics, record_api_request, record_database_query, record_error, update_system_metrics, health_check'
      }, { status: 400 });
  }
});

/**
 * Filter time series data by category
 */
function filterTimeSeriesByCategory(timeSeries: Record<string, any>, category: string): Record<string, any> {
  const filtered: Record<string, any> = {};

  for (const [key, series] of Object.entries(timeSeries)) {
    if (series.category === category || key.startsWith(category + '.')) {
      filtered[key] = series;
    }
  }

  return filtered;
}

/**
 * Calculate overall error rate
 */
function calculateOverallErrorRate(performance: any): number {
  const apiTotal = performance.apiRequests.total;
  const apiFailed = performance.apiRequests.failed;
  const totalErrors = performance.errors.total;

  if (apiTotal === 0) return 0;

  return ((apiFailed + totalErrors) / apiTotal) * 100;
}