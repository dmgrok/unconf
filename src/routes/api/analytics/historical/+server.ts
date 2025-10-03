import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ArchivalService } from '$lib/services/archival';

const archivalService = new ArchivalService('./data');

/**
 * GET /api/analytics/historical
 * Get historical analytics with filtering
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const eventId = url.searchParams.get('eventId') || undefined;
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');
		const includeArchived = url.searchParams.get('includeArchived') === 'true';
		const groupBy = url.searchParams.get('groupBy') as 'day' | 'week' | 'month' | null;

		if (groupBy && eventId) {
			// Return aggregated data
			const result = await archivalService.getAggregatedAnalytics(eventId, groupBy);

			if (!result.success) {
				return json(
					{ error: result.error?.message || 'Failed to fetch aggregated analytics' },
					{ status: 500 }
				);
			}

			// Convert Map to object for JSON serialization
			const aggregated: Record<string, any[]> = {};
			result.data!.forEach((value, key) => {
				aggregated[key] = value;
			});

			return json({
				groupBy,
				data: aggregated
			});
		} else {
			// Return filtered historical data
			const result = await archivalService.getHistoricalAnalytics(
				eventId,
				startDate ? new Date(startDate) : undefined,
				endDate ? new Date(endDate) : undefined,
				includeArchived
			);

			if (!result.success) {
				return json(
					{ error: result.error?.message || 'Failed to fetch historical analytics' },
					{ status: 500 }
				);
			}

			return json(result.data || []);
		}
	} catch (error) {
		console.error('Error fetching historical analytics:', error);
		return json(
			{ error: 'Failed to fetch historical analytics' },
			{ status: 500 }
		);
	}
};
