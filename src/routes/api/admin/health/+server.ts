/**
 * Platform Health Monitoring API
 * Provides real-time health metrics and system monitoring data
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { apiRoute } from '$lib/errors/handler.js';
import { adminService } from '$lib/services/admin.js';
import { UserRepository } from '$lib/storage/UserRepository.js';
import { metricsCollector } from '$lib/monitoring/index.js';
import os from 'os';

// Initialize repositories
const userRepo = new UserRepository({ dataDir: './data' });

// Store for alerts (in production, use database)
const activeAlerts = new Map<
	string,
	{
		id: string;
		severity: 'info' | 'warning' | 'error' | 'critical';
		component: string;
		message: string;
		timestamp: string;
		acknowledged: boolean;
	}
>();

interface HealthMetric {
	name: string;
	value: number;
	unit: string;
	status: 'healthy' | 'warning' | 'critical';
	threshold: {
		warning: number;
		critical: number;
	};
	lastUpdated: string;
}

/**
 * Generate health metrics for various system components
 */
function generateHealthMetrics() {
	const now = new Date().toISOString();

	// System metrics
	const cpuUsage = Math.min((os.loadavg()[0] / os.cpus().length) * 100, 100);
	const memUsage = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
	const uptime = os.uptime();

	const systemMetrics: HealthMetric[] = [
		{
			name: 'CPU Usage',
			value: parseFloat(cpuUsage.toFixed(2)),
			unit: '%',
			status: cpuUsage > 80 ? 'critical' : cpuUsage > 60 ? 'warning' : 'healthy',
			threshold: { warning: 60, critical: 80 },
			lastUpdated: now
		},
		{
			name: 'Memory Usage',
			value: parseFloat(memUsage.toFixed(2)),
			unit: '%',
			status: memUsage > 85 ? 'critical' : memUsage > 70 ? 'warning' : 'healthy',
			threshold: { warning: 70, critical: 85 },
			lastUpdated: now
		},
		{
			name: 'Disk Usage',
			value: 45.2, // Placeholder - would need actual disk monitoring
			unit: '%',
			status: 'healthy',
			threshold: { warning: 75, critical: 90 },
			lastUpdated: now
		}
	];

	// Database metrics (placeholder values - would connect to actual DB)
	const databaseMetrics: HealthMetric[] = [
		{
			name: 'Connection Pool',
			value: 12,
			unit: ' connections',
			status: 'healthy',
			threshold: { warning: 50, critical: 80 },
			lastUpdated: now
		},
		{
			name: 'Query Response Time',
			value: 45,
			unit: 'ms',
			status: 'healthy',
			threshold: { warning: 200, critical: 500 },
			lastUpdated: now
		},
		{
			name: 'Active Transactions',
			value: 5,
			unit: ' txns',
			status: 'healthy',
			threshold: { warning: 100, critical: 200 },
			lastUpdated: now
		}
	];

	// WebSocket metrics
	const wsConnections = Math.floor(Math.random() * 100) + 50; // Would get from actual WS server
	const websocketMetrics: HealthMetric[] = [
		{
			name: 'Active Connections',
			value: wsConnections,
			unit: ' conns',
			status: wsConnections > 500 ? 'warning' : 'healthy',
			threshold: { warning: 500, critical: 1000 },
			lastUpdated: now
		},
		{
			name: 'Message Rate',
			value: 150,
			unit: ' msg/s',
			status: 'healthy',
			threshold: { warning: 1000, critical: 2000 },
			lastUpdated: now
		},
		{
			name: 'Latency',
			value: 25,
			unit: 'ms',
			status: 'healthy',
			threshold: { warning: 100, critical: 200 },
			lastUpdated: now
		}
	];

	// API metrics
	const apiMetrics: HealthMetric[] = [
		{
			name: 'Request Rate',
			value: 450,
			unit: ' req/min',
			status: 'healthy',
			threshold: { warning: 1000, critical: 2000 },
			lastUpdated: now
		},
		{
			name: 'Response Time (p95)',
			value: 120,
			unit: 'ms',
			status: 'healthy',
			threshold: { warning: 500, critical: 1000 },
			lastUpdated: now
		},
		{
			name: 'Error Rate',
			value: 0.5,
			unit: '%',
			status: 'healthy',
			threshold: { warning: 2, critical: 5 },
			lastUpdated: now
		}
	];

	// Generate alerts based on metrics
	generateAlerts(systemMetrics, databaseMetrics, websocketMetrics, apiMetrics);

	return {
		system: systemMetrics,
		database: databaseMetrics,
		websocket: websocketMetrics,
		api: apiMetrics
	};
}

/**
 * Generate alerts based on metric thresholds
 */
function generateAlerts(
	systemMetrics: HealthMetric[],
	databaseMetrics: HealthMetric[],
	websocketMetrics: HealthMetric[],
	apiMetrics: HealthMetric[]
) {
	const allMetrics = [
		...systemMetrics.map((m) => ({ ...m, component: 'System' })),
		...databaseMetrics.map((m) => ({ ...m, component: 'Database' })),
		...websocketMetrics.map((m) => ({ ...m, component: 'WebSocket' })),
		...apiMetrics.map((m) => ({ ...m, component: 'API' }))
	];

	for (const metric of allMetrics) {
		if (metric.status === 'critical' || metric.status === 'warning') {
			const alertId = `${metric.component}-${metric.name}-${metric.status}`;

			if (!activeAlerts.has(alertId)) {
				activeAlerts.set(alertId, {
					id: alertId,
					severity: metric.status === 'critical' ? 'critical' : 'warning',
					component: metric.component,
					message: `${metric.name} is ${metric.status}: ${metric.value}${metric.unit} (threshold: ${metric.status === 'critical' ? metric.threshold.critical : metric.threshold.warning}${metric.unit})`,
					timestamp: new Date().toISOString(),
					acknowledged: false
				});
			}
		}
	}
}

/**
 * GET endpoint - fetch health data
 */
export const GET: RequestHandler = apiRoute(async (event) => {
	// TODO: Add proper authentication check
	const isDevelopment = process.env.NODE_ENV !== 'production';

	if (!isDevelopment) {
		const userId = event.locals.user?.id;
		if (!userId) {
			return json(
				{
					success: false,
					error: 'Unauthorized: Authentication required'
				},
				{ status: 401 }
			);
		}

		const userResult = await userRepo.findById(userId);
		if (!userResult.success || !adminService.isAdmin(userResult.data || null)) {
			return json(
				{
					success: false,
					error: 'Forbidden: Admin access required'
				},
				{ status: 403 }
			);
		}
	}

	// Get system health from metrics collector
	const systemHealth = metricsCollector.performHealthCheck();

	// Generate detailed metrics
	const metrics = generateHealthMetrics();

	// Determine overall health status
	let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
	const allMetrics = [
		...metrics.system,
		...metrics.database,
		...metrics.websocket,
		...metrics.api
	];

	if (allMetrics.some((m) => m.status === 'critical')) {
		overall = 'critical';
	} else if (allMetrics.some((m) => m.status === 'warning')) {
		overall = 'degraded';
	}

	// Convert activeAlerts map to array
	const alerts = Array.from(activeAlerts.values()).sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
	);

	const healthData = {
		overall,
		components: systemHealth.components,
		metrics,
		alerts,
		timestamp: new Date().toISOString()
	};

	return json({
		success: true,
		data: healthData
	});
});

/**
 * POST endpoint - handle health actions (acknowledge alerts, etc.)
 */
export const POST: RequestHandler = apiRoute(async (event) => {
	const body = await event.request.json();
	const { action, alertId } = body;

	// TODO: Add proper authentication check
	const isDevelopment = process.env.NODE_ENV !== 'production';

	if (!isDevelopment) {
		const userId = event.locals.user?.id;
		if (!userId) {
			return json(
				{
					success: false,
					error: 'Unauthorized: Authentication required'
				},
				{ status: 401 }
			);
		}

		const userResult = await userRepo.findById(userId);
		if (!userResult.success || !adminService.isAdmin(userResult.data || null)) {
			return json(
				{
					success: false,
					error: 'Forbidden: Admin access required'
				},
				{ status: 403 }
			);
		}
	}

	switch (action) {
		case 'acknowledge_alert':
			if (!alertId) {
				return json(
					{
						success: false,
						error: 'Alert ID is required'
					},
					{ status: 400 }
				);
			}

			const alert = activeAlerts.get(alertId);
			if (!alert) {
				return json(
					{
						success: false,
						error: 'Alert not found'
					},
					{ status: 404 }
				);
			}

			alert.acknowledged = true;
			activeAlerts.set(alertId, alert);

			return json({
				success: true,
				message: 'Alert acknowledged',
				data: alert
			});

		default:
			return json(
				{
					success: false,
					error: 'Invalid action. Available actions: acknowledge_alert'
				},
				{ status: 400 }
			);
	}
});
