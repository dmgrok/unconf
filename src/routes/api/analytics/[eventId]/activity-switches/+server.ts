import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	ActivitySwitchHistoryRepository,
	type ActivitySwitchHistory
} from '$lib/storage/ActivitySwitchHistoryRepository';

const repository = new ActivitySwitchHistoryRepository({ storagePath: './data' });

/**
 * GET /api/analytics/:eventId/activity-switches
 * Get activity switch history for an event
 */
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const { eventId } = params;
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');
		const organizerId = url.searchParams.get('organizerId');
		const highLatency = url.searchParams.get('highLatency');

		let result;

		if (organizerId) {
			// Get switches by organizer
			result = await repository.findByOrganizerId(organizerId);
			if (result.success && result.data) {
				result.data = result.data.filter(s => s.eventId === eventId);
			}
		} else if (highLatency) {
			// Get high latency switches
			const threshold = parseInt(highLatency, 10);
			result = await repository.findHighLatencySwitches(eventId, threshold);
		} else if (startDate && endDate) {
			// Get switches in date range
			result = await repository.findByDateRange(
				eventId,
				new Date(startDate),
				new Date(endDate)
			);
		} else {
			// Get all switches for event
			result = await repository.findByEventId(eventId);
		}

		if (!result.success) {
			return json(
				{ error: result.error?.message || 'Failed to fetch activity switches' },
				{ status: 500 }
			);
		}

		return json(result.data || []);
	} catch (error) {
		console.error('Error fetching activity switches:', error);
		return json(
			{ error: 'Failed to fetch activity switches' },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/analytics/:eventId/activity-switches
 * Create a new activity switch record
 */
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { eventId } = params;
		const data: Omit<ActivitySwitchHistory, 'id' | 'createdAt' | 'updatedAt' | 'eventId'> =
			await request.json();

		// Validate required fields
		if (!data.toActivity || data.switchLatency === undefined) {
			return json(
				{ error: 'Missing required fields: toActivity, switchLatency' },
				{ status: 400 }
			);
		}

		const result = await repository.create({
			...data,
			eventId
		});

		if (!result.success) {
			return json(
				{ error: result.error?.message || 'Failed to create activity switch record' },
				{ status: 500 }
			);
		}

		return json(result.data, { status: 201 });
	} catch (error) {
		console.error('Error creating activity switch record:', error);
		return json(
			{ error: 'Failed to create activity switch record' },
			{ status: 500 }
		);
	}
};
