import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AnalyticsService } from '$lib/services/analytics';
import { ExportService, type ExportFormat, type ExportOptions } from '$lib/services/export';

const analyticsService = new AnalyticsService('./data');
const exportService = new ExportService();

/**
 * GET /api/analytics/:eventId/export?format=csv|json
 * Export analytics data in specified format
 */
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const { eventId } = params;
		const format = (url.searchParams.get('format') || 'json') as ExportFormat;

		// Validate format
		if (format !== 'csv' && format !== 'json') {
			return json(
				{ error: 'Invalid format. Must be csv or json' },
				{ status: 400 }
			);
		}

		// Get analytics data
		const result = await analyticsService.getEventAnalytics(eventId);

		if (!result.success || !result.data) {
			return json(
				{ error: 'No analytics found for this event' },
				{ status: 404 }
			);
		}

		// Parse export options from query params
		const options: ExportOptions = {
			format,
			eventId,
			includeMetrics: url.searchParams.get('includeMetrics') !== 'false',
			includeParticipation: url.searchParams.get('includeParticipation') !== 'false',
			includeEngagement: url.searchParams.get('includeEngagement') !== 'false',
			includePerformance: url.searchParams.get('includePerformance') !== 'false',
			includeVoting: url.searchParams.get('includeVoting') !== 'false',
			includeActivities: url.searchParams.get('includeActivities') !== 'false'
		};

		// Export data
		const exportData = await exportService.exportAnalytics(result.data, options);

		// Return appropriate response based on format
		if (format === 'csv') {
			const filename = exportService.generateFilename(eventId, 'csv');
			return new Response(exportData.data.content as string, {
				headers: {
					'Content-Type': 'text/csv',
					'Content-Disposition': `attachment; filename="${filename}"`
				}
			});
		} else {
			return json(exportData);
		}
	} catch (error) {
		console.error('Error exporting analytics:', error);
		return json(
			{ error: 'Failed to export analytics' },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/analytics/:eventId/export
 * Export analytics data with custom date range and filters
 */
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { eventId } = params;
		const body = await request.json();

		const {
			format = 'json',
			startDate,
			endDate,
			includeMetrics = true,
			includeParticipation = true,
			includeEngagement = true,
			includePerformance = true,
			includeVoting = true,
			includeActivities = true
		} = body;

		// Validate format
		if (format !== 'csv' && format !== 'json') {
			return json(
				{ error: 'Invalid format. Must be csv or json' },
				{ status: 400 }
			);
		}

		// Get analytics data with optional date range
		let analyticsData;

		if (startDate && endDate) {
			const result = await analyticsService.getAnalyticsByDateRange(
				new Date(startDate),
				new Date(endDate)
			);

			if (!result.success || !result.data) {
				return json(
					{ error: 'No analytics found for this date range' },
					{ status: 404 }
				);
			}

			// Filter by eventId
			analyticsData = result.data.filter(a => a.eventId === eventId);

			if (analyticsData.length === 0) {
				return json(
					{ error: 'No analytics found for this event in the specified date range' },
					{ status: 404 }
				);
			}
		} else {
			const result = await analyticsService.getEventAnalytics(eventId);

			if (!result.success || !result.data) {
				return json(
					{ error: 'No analytics found for this event' },
					{ status: 404 }
				);
			}

			analyticsData = result.data;
		}

		// Prepare export options
		const options: ExportOptions = {
			format: format as ExportFormat,
			eventId,
			dateRange: startDate && endDate
				? { start: new Date(startDate), end: new Date(endDate) }
				: undefined,
			includeMetrics,
			includeParticipation,
			includeEngagement,
			includePerformance,
			includeVoting,
			includeActivities
		};

		// Export data
		const exportData = await exportService.exportAnalytics(analyticsData, options);

		// Return appropriate response based on format
		if (format === 'csv') {
			const filename = exportService.generateFilename(eventId, 'csv');
			return new Response(exportData.data.content as string, {
				headers: {
					'Content-Type': 'text/csv',
					'Content-Disposition': `attachment; filename="${filename}"`
				}
			});
		} else {
			return json(exportData);
		}
	} catch (error) {
		console.error('Error exporting analytics:', error);
		return json(
			{ error: 'Failed to export analytics' },
			{ status: 500 }
		);
	}
};
