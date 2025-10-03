import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AnalyticsService } from '$lib/services/analytics';
import type { AnalyticsEvent } from '$lib/services/analytics';

const analyticsService = new AnalyticsService('./data');

/**
 * POST /api/analytics/track
 * Track an analytics event
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const event: AnalyticsEvent = await request.json();

		// Validate required fields
		if (!event.type || !event.eventId || !event.timestamp) {
			return json(
				{ error: 'Missing required fields: type, eventId, timestamp' },
				{ status: 400 }
			);
		}

		// Ensure timestamp is a Date object
		event.timestamp = new Date(event.timestamp);

		await analyticsService.trackEvent(event);

		return json({ success: true });
	} catch (error) {
		console.error('Error tracking analytics event:', error);
		return json(
			{ error: 'Failed to track analytics event' },
			{ status: 500 }
		);
	}
};
