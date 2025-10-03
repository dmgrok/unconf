import type { EventAnalytics, LiveAnalytics } from '../../types/analytics';
import { JSONRepository, type JSONRepositoryConfig } from './JSONRepository';
import type { RepositoryOperationResult, ValidationResult } from './Repository';

export class AnalyticsRepository extends JSONRepository<EventAnalytics> {
	constructor(config: Omit<JSONRepositoryConfig, 'filename'>) {
		super('analytics', {
			...config,
			filename: 'analytics.json'
		});
	}

	validate(entity: Partial<EventAnalytics>): ValidationResult {
		const baseValidation = this.validateRequired(entity, ['eventId', 'metrics', 'participation', 'engagement', 'performance', 'voting', 'activities', 'summary', 'timeRange']);
		if (!baseValidation.isValid) {
			return baseValidation;
		}

		const errors: string[] = [];

		// Validate eventId
		if (entity.eventId && typeof entity.eventId !== 'string') {
			errors.push('Event ID must be a string');
		}

		// Validate time range
		if (entity.timeRange) {
			if (!entity.timeRange.startTime || !entity.timeRange.endTime) {
				errors.push('Time range must have start and end time');
			}
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	/**
	 * Find analytics by event ID
	 */
	async findByEventId(eventId: string): Promise<RepositoryOperationResult<EventAnalytics[]>> {
		return this.findBy({ eventId });
	}

	/**
	 * Find analytics within a date range
	 */
	async findByDateRange(
		startDate: Date,
		endDate: Date
	): Promise<RepositoryOperationResult<EventAnalytics[]>> {
		const allAnalytics = await this.findAll();
		if (!allAnalytics.success || !allAnalytics.data) {
			return allAnalytics;
		}

		const filtered = allAnalytics.data.filter((analytics) => {
			const analyticsStart = new Date(analytics.timeRange.startTime);
			const analyticsEnd = new Date(analytics.timeRange.endTime);
			return analyticsStart >= startDate && analyticsEnd <= endDate;
		});

		return {
			success: true,
			data: filtered
		};
	}

	/**
	 * Get latest analytics for an event
	 */
	async findLatestByEventId(eventId: string): Promise<RepositoryOperationResult<EventAnalytics | null>> {
		const result = await this.findByEventId(eventId);
		if (!result.success || !result.data || result.data.length === 0) {
			return {
				success: true,
				data: null
			};
		}

		// Sort by createdAt descending and get the first one
		const sorted = result.data.sort((a, b) =>
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);

		return {
			success: true,
			data: sorted[0]
		};
	}
}

/**
 * Repository for live analytics (real-time tracking)
 */
export class LiveAnalyticsRepository extends JSONRepository<LiveAnalytics> {
	constructor(config: Omit<JSONRepositoryConfig, 'filename'>) {
		super('liveanalytics', {
			...config,
			filename: 'live-analytics.json'
		});
	}

	validate(entity: Partial<LiveAnalytics>): ValidationResult {
		const baseValidation = this.validateRequired(entity, [
			'eventId',
			'timestamp',
			'currentActivity',
			'activeParticipants',
			'realtimeMetrics',
			'alerts',
			'performance'
		]);

		if (!baseValidation.isValid) {
			return baseValidation;
		}

		const errors: string[] = [];

		if (entity.eventId && typeof entity.eventId !== 'string') {
			errors.push('Event ID must be a string');
		}

		if (entity.activeParticipants !== undefined && typeof entity.activeParticipants !== 'number') {
			errors.push('Active participants must be a number');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	/**
	 * Find live analytics by event ID
	 */
	async findByEventId(eventId: string): Promise<RepositoryOperationResult<LiveAnalytics[]>> {
		return this.findBy({ eventId });
	}

	/**
	 * Get latest live analytics for an event
	 */
	async findLatestByEventId(eventId: string): Promise<RepositoryOperationResult<LiveAnalytics | null>> {
		const result = await this.findByEventId(eventId);
		if (!result.success || !result.data || result.data.length === 0) {
			return {
				success: true,
				data: null
			};
		}

		// Sort by timestamp descending and get the first one
		const sorted = result.data.sort((a, b) =>
			new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		);

		return {
			success: true,
			data: sorted[0]
		};
	}

	/**
	 * Clean up old live analytics data (keep last N records per event)
	 */
	async cleanup(eventId: string, keepCount: number = 100): Promise<RepositoryOperationResult<number>> {
		const result = await this.findByEventId(eventId);
		if (!result.success || !result.data) {
			return {
				success: false,
				error: this.createError('CLEANUP_FAILED', 'Failed to fetch analytics for cleanup')
			};
		}

		// Sort by timestamp descending
		const sorted = result.data.sort((a, b) =>
			new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		);

		// Keep only the latest N records
		const toDelete = sorted.slice(keepCount);
		let deletedCount = 0;

		for (const analytics of toDelete) {
			const deleteResult = await this.delete(analytics.id);
			if (deleteResult.success) {
				deletedCount++;
			}
		}

		return {
			success: true,
			data: deletedCount
		};
	}
}
