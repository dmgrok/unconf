import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ArchivalService, type ArchivalPolicy } from '$lib/services/archival';

const archivalService = new ArchivalService('./data');

/**
 * POST /api/analytics/archive
 * Run archival process for analytics data
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const {
			eventId,
			policy
		}: {
			eventId?: string;
			policy?: ArchivalPolicy;
		} = body;

		const results = await archivalService.runCleanup(eventId, policy);

		return json({
			success: true,
			results
		});
	} catch (error) {
		console.error('Error running archival process:', error);
		return json(
			{ error: 'Failed to run archival process' },
			{ status: 500 }
		);
	}
};

/**
 * GET /api/analytics/archive/stats
 * Get storage statistics
 */
export const GET: RequestHandler = async () => {
	try {
		const stats = await archivalService.getStorageStats();

		return json(stats);
	} catch (error) {
		console.error('Error getting storage stats:', error);
		return json(
			{ error: 'Failed to get storage statistics' },
			{ status: 500 }
		);
	}
};
