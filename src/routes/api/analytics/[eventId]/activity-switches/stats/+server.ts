import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ActivitySwitchHistoryRepository } from '$lib/storage/ActivitySwitchHistoryRepository';

const repository = new ActivitySwitchHistoryRepository({ storagePath: './data' });

/**
 * GET /api/analytics/:eventId/activity-switches/stats
 * Get statistics about activity switches
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const { eventId } = params;

		// Get all switches
		const switchesResult = await repository.findByEventId(eventId);
		if (!switchesResult.success) {
			return json(
				{ error: switchesResult.error?.message || 'Failed to fetch activity switches' },
				{ status: 500 }
			);
		}

		const switches = switchesResult.data || [];

		// Calculate statistics
		const averageLatencyResult = await repository.getAverageSwitchLatency(eventId);
		const averageLatency = averageLatencyResult.success ? averageLatencyResult.data || 0 : 0;

		const organizerStatsResult = await repository.getOrganizerStats(eventId);
		const organizerStats = organizerStatsResult.success ? organizerStatsResult.data || {} : {};

		// Calculate latency distribution
		const latencies = switches.map(s => s.switchLatency);
		const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
		const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;

		// Count switches to each activity
		const activityCounts: Record<string, number> = {};
		for (const switchHistory of switches) {
			const activity = switchHistory.toActivity;
			activityCounts[activity] = (activityCounts[activity] || 0) + 1;
		}

		return json({
			eventId,
			totalSwitches: switches.length,
			averageLatency,
			minLatency,
			maxLatency,
			activityCounts,
			organizerStats,
			latencyPercentiles: calculatePercentiles(latencies)
		});
	} catch (error) {
		console.error('Error fetching activity switch stats:', error);
		return json(
			{ error: 'Failed to fetch activity switch statistics' },
			{ status: 500 }
		);
	}
};

function calculatePercentiles(values: number[]): Record<string, number> {
	if (values.length === 0) {
		return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 };
	}

	const sorted = [...values].sort((a, b) => a - b);
	const getPercentile = (p: number) => {
		const index = Math.ceil((p / 100) * sorted.length) - 1;
		return sorted[Math.max(0, index)];
	};

	return {
		p50: getPercentile(50),
		p75: getPercentile(75),
		p90: getPercentile(90),
		p95: getPercentile(95),
		p99: getPercentile(99)
	};
}
