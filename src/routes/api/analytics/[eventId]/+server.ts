import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AnalyticsService } from '$lib/services/analytics';

const analyticsService = new AnalyticsService('./data');

/**
 * GET /api/analytics/:eventId
 * Get analytics for a specific event
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const { eventId } = params;

		const result = await analyticsService.getEventAnalytics(eventId);

		if (!result.success) {
			return json(
				{ error: result.error?.message || 'Failed to fetch analytics' },
				{ status: 500 }
			);
		}

		if (!result.data) {
			return json(
				{ error: 'No analytics found for this event' },
				{ status: 404 }
			);
		}

		return json(result.data);
	} catch (error) {
		console.error('Error fetching analytics:', error);
		return json(
			{ error: 'Failed to fetch analytics' },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/analytics/:eventId
 * Flush buffered events and generate analytics report
 */
export const POST: RequestHandler = async ({ params }) => {
	try {
		const { eventId } = params;

		const result = await analyticsService.flush(eventId);

		if (!result.success) {
			return json(
				{ error: result.error?.message || 'Failed to generate analytics' },
				{ status: 500 }
			);
		}

		return json(result.data);
	} catch (error) {
		console.error('Error generating analytics:', error);
		return json(
			{ error: 'Failed to generate analytics' },
			{ status: 500 }
		);
	}
};
