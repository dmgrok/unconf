import { json, error } from '@sveltejs/kit';
import { securityMonitor } from '$lib/security/monitoring';
import type { RequestHandler } from './$types';

/**
 * Security Dashboard API
 *
 * Provides security metrics and monitoring data for administrators.
 * Only accessible to users with admin role.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
  // Check if user is admin
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Access denied. Admin role required.');
  }

  try {
    // Get query parameters for time range
    const hoursBack = parseInt(url.searchParams.get('hours') || '24');
    const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const endTime = new Date();

    // Get security metrics
    const metrics = securityMonitor.getSecurityMetrics(startTime, endTime);

    // Get recent events
    const recentEvents = securityMonitor.getRecentEvents(50);

    // Get active alerts
    const activeAlerts = securityMonitor.getActiveAlerts();

    return json({
      metrics,
      recentEvents: recentEvents.map(event => ({
        ...event,
        // Sanitize sensitive data for display
        details: {
          ...event.details,
          payload: event.details.payload ? '[REDACTED]' : undefined
        }
      })),
      activeAlerts,
      summary: {
        totalEvents: metrics.totalEvents,
        criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length,
        highAlerts: activeAlerts.filter(a => a.severity === 'high').length,
        recentFailedLogins: metrics.failedLoginAttempts,
        rateLimitViolations: metrics.rateLimitViolations,
        suspiciousActivities: metrics.suspiciousActivities
      }
    });
  } catch (err) {
    console.error('Error fetching security dashboard data:', err);
    throw error(500, 'Failed to fetch security data');
  }
};

export const POST: RequestHandler = async ({ locals, request }) => {
  // Check if user is admin
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Access denied. Admin role required.');
  }

  try {
    const { action, alertId } = await request.json();

    if (action === 'resolve_alert' && alertId) {
      securityMonitor.resolveAlert(alertId, locals.user.id);
      return json({ success: true });
    }

    throw error(400, 'Invalid action');
  } catch (err) {
    console.error('Error processing security dashboard action:', err);
    throw error(500, 'Failed to process action');
  }
};