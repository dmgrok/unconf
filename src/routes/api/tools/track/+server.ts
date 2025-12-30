/**
 * POST /api/tools/track
 * 
 * Track tool usage events for graduation metrics.
 * Events: use, error, like, dislike
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { recordToolMetric, getToolMetrics } from '$lib/feature-flags/server';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	
	try {
		const body = await request.json();
		const { toolId, eventType, metadata } = body;
		
		// Validate input
		if (!toolId || typeof toolId !== 'string') {
			return json({ error: 'toolId is required' }, { status: 400 });
		}
		
		if (!eventType || !['use', 'error', 'like', 'dislike'].includes(eventType)) {
			return json({ error: 'Invalid eventType' }, { status: 400 });
		}
		
		const userId = user?.id || 'anonymous';
		
		// Record the metric
		recordToolMetric(toolId, eventType, userId);
		
		// Log in development
		if (process.env.NODE_ENV === 'development') {
			console.log('[Tool Tracking]', { toolId, eventType, userId, metadata });
		}
		
		return json({ 
			success: true,
			message: `Tracked ${eventType} for ${toolId}`,
		});
	} catch (error) {
		console.error('[Tool Tracking Error]', error);
		return json({ error: 'Failed to track event' }, { status: 500 });
	}
};

/**
 * GET /api/tools/track?toolId=xxx
 * 
 * Get metrics for a specific tool (organizer/admin only)
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const user = locals.user;
	
	// Only organizers can view metrics
	if (user?.role !== 'organizer') {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}
	
	const toolId = url.searchParams.get('toolId');
	
	if (!toolId) {
		return json({ error: 'toolId is required' }, { status: 400 });
	}
	
	const metrics = getToolMetrics(toolId);
	
	if (!metrics) {
		return json({ 
			toolId,
			metrics: null,
			message: 'No metrics recorded yet',
		});
	}
	
	return json({
		toolId,
		metrics,
	});
};
