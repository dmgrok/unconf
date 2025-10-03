import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AnalyticsService } from '$lib/services/analytics';

const analyticsService = new AnalyticsService('./data');

/**
 * GET /api/analytics/:eventId/live
 * Get live analytics for a specific event
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const { eventId } = params;

		const result = await analyticsService.getLiveAnalytics(eventId);

		if (!result.success) {
			return json(
				{ error: result.error?.message || 'Failed to fetch live analytics' },
				{ status: 500 }
			);
		}

		if (!result.data) {
			return json(
				{ error: 'No live analytics found for this event' },
				{ status: 404 }
			);
		}

		return json(result.data);
	} catch (error) {
		console.error('Error fetching live analytics:', error);
		return json(
			{ error: 'Failed to fetch live analytics' },
			{ status: 500 }
		);
	}
};
