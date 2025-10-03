import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ActivitySwitchHistoryRepository } from '$lib/storage/ActivitySwitchHistoryRepository';

const repository = new ActivitySwitchHistoryRepository({ storagePath: './data' });

/**
 * GET /api/analytics/:eventId/activity-switches/flow
 * Get the sequence of activities for an event
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const { eventId } = params;

		const result = await repository.getActivityFlow(eventId);

		if (!result.success) {
			return json(
				{ error: result.error?.message || 'Failed to fetch activity flow' },
				{ status: 500 }
			);
		}

		return json({
			eventId,
			flow: result.data || [],
			count: result.data?.length || 0
		});
	} catch (error) {
		console.error('Error fetching activity flow:', error);
		return json(
			{ error: 'Failed to fetch activity flow' },
			{ status: 500 }
		);
	}
};
