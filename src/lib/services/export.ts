import type { EventAnalytics, AnalyticsExport, ExportMetadata } from '../../types/analytics';

export type ExportFormat = 'csv' | 'json';

export interface ExportOptions {
	format: ExportFormat;
	eventId: string;
	dateRange?: {
		start: Date;
		end: Date;
	};
	includeMetrics?: boolean;
	includeParticipation?: boolean;
	includeEngagement?: boolean;
	includePerformance?: boolean;
	includeVoting?: boolean;
	includeActivities?: boolean;
}

/**
 * Service for exporting analytics data in various formats
 */
export class ExportService {
	/**
	 * Export analytics data
	 */
	async exportAnalytics(
		analytics: EventAnalytics | EventAnalytics[],
		options: ExportOptions
	): Promise<AnalyticsExport> {
		const analyticsArray = Array.isArray(analytics) ? analytics : [analytics];

		let data: Record<string, unknown>;
		if (options.format === 'csv') {
			data = { content: this.convertToCSV(analyticsArray, options) };
		} else {
			data = this.convertToJSON(analyticsArray, options);
		}

		const metadata: ExportMetadata = {
			exportedAt: new Date(),
			exportedBy: 'system', // TODO: Get actual user ID
			eventId: options.eventId,
			timeRange: options.dateRange
				? {
					startTime: options.dateRange.start,
					endTime: options.dateRange.end,
					duration: options.dateRange.end.getTime() - options.dateRange.start.getTime()
				}
				: analyticsArray[0].timeRange,
			dataTypes: this.getDataTypes(options),
			recordCount: analyticsArray.length
		};

		return {
			format: options.format,
			data,
			metadata
		};
	}

	/**
	 * Convert analytics to CSV format
	 */
	private convertToCSV(analytics: EventAnalytics[], options: ExportOptions): string {
		const rows: string[][] = [];

		// Build headers based on what's included
		const headers: string[] = ['Event ID', 'Start Time', 'End Time', 'Duration (ms)'];

		if (options.includeMetrics !== false) {
			headers.push(
				'Total Participants',
				'Active Participants',
				'Peak Concurrency',
				'Average Concurrency',
				'Dropout Rate',
				'Completion Rate'
			);
		}

		if (options.includeParticipation !== false) {
			headers.push(
				'Join Rate',
				'Retention Rate',
				'Reengagement Rate'
			);
		}

		if (options.includeEngagement !== false) {
			headers.push(
				'Engagement Score',
				'Voting Participation Rate',
				'Discussion Participation Rate',
				'Interaction Frequency'
			);
		}

		if (options.includePerformance !== false) {
			headers.push(
				'Average Response Time',
				'System Uptime',
				'Error Rate',
				'Activity Switch Latency'
			);
		}

		if (options.includeVoting !== false) {
			headers.push(
				'Total Votes',
				'Unique Voters',
				'Voting Completion Rate',
				'Average Voting Time'
			);
		}

		rows.push(headers);

		// Add data rows
		for (const a of analytics) {
			const row: (string | number)[] = [
				a.eventId,
				a.timeRange.startTime.toISOString(),
				a.timeRange.endTime.toISOString(),
				a.timeRange.duration
			];

			if (options.includeMetrics !== false) {
				row.push(
					a.metrics.totalParticipants,
					a.metrics.activeParticipants,
					a.metrics.peakConcurrency,
					a.metrics.averageConcurrency,
					a.metrics.dropoutRate,
					a.metrics.completionRate
				);
			}

			if (options.includeParticipation !== false) {
				row.push(
					a.participation.joinRate,
					a.participation.retentionRate,
					a.participation.reengagementRate
				);
			}

			if (options.includeEngagement !== false) {
				row.push(
					a.engagement.averageEngagementScore,
					a.engagement.votingParticipationRate,
					a.engagement.discussionParticipationRate,
					a.engagement.interactionFrequency
				);
			}

			if (options.includePerformance !== false) {
				row.push(
					a.performance.averageResponseTime,
					a.performance.systemUptime,
					a.performance.errorRate,
					a.performance.activitySwitchLatency
				);
			}

			if (options.includeVoting !== false) {
				row.push(
					a.voting.totalVotes,
					a.voting.uniqueVoters,
					a.voting.votingCompletionRate,
					a.voting.averageVotingTime
				);
			}

			rows.push(row.map(String));
		}

		return rows.map(row => row.map(cell => this.escapeCSV(cell)).join(',')).join('\n');
	}

	/**
	 * Convert analytics to JSON format
	 */
	private convertToJSON(analytics: EventAnalytics[], options: ExportOptions): Record<string, unknown> {
		const filtered = analytics.map(a => {
			const result: Partial<EventAnalytics> = {
				id: a.id,
				eventId: a.eventId,
				timeRange: a.timeRange,
				createdAt: a.createdAt,
				updatedAt: a.updatedAt
			};

			if (options.includeMetrics !== false) {
				result.metrics = a.metrics;
			}

			if (options.includeParticipation !== false) {
				result.participation = a.participation;
			}

			if (options.includeEngagement !== false) {
				result.engagement = a.engagement;
			}

			if (options.includePerformance !== false) {
				result.performance = a.performance;
			}

			if (options.includeVoting !== false) {
				result.voting = a.voting;
			}

			if (options.includeActivities !== false) {
				result.activities = a.activities;
			}

			result.summary = a.summary;

			return result;
		});

		return {
			analytics: filtered,
			count: filtered.length
		};
	}

	/**
	 * Escape CSV values
	 */
	private escapeCSV(value: string): string {
		if (typeof value !== 'string') {
			return String(value);
		}

		// Escape quotes and wrap in quotes if contains comma, quote, or newline
		if (value.includes(',') || value.includes('"') || value.includes('\n')) {
			return `"${value.replace(/"/g, '""')}"`;
		}

		return value;
	}

	/**
	 * Get list of included data types
	 */
	private getDataTypes(options: ExportOptions): string[] {
		const types: string[] = [];

		if (options.includeMetrics !== false) types.push('metrics');
		if (options.includeParticipation !== false) types.push('participation');
		if (options.includeEngagement !== false) types.push('engagement');
		if (options.includePerformance !== false) types.push('performance');
		if (options.includeVoting !== false) types.push('voting');
		if (options.includeActivities !== false) types.push('activities');

		return types;
	}

	/**
	 * Generate filename for export
	 */
	generateFilename(eventId: string, format: ExportFormat): string {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		return `analytics-${eventId}-${timestamp}.${format}`;
	}
}
