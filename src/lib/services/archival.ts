import type { EventAnalytics } from '../../types/analytics';
import { AnalyticsRepository } from '../storage/AnalyticsRepository';
import { ActivitySwitchHistoryRepository } from '../storage/ActivitySwitchHistoryRepository';
import { AuditLogRepository } from '../storage/AuditLogRepository';
import type { RepositoryOperationResult } from '../storage/Repository';

export interface ArchivalPolicy {
	retentionDays: number;
	archiveAfterDays: number;
	deleteAfterDays?: number;
}

export interface ArchivalStats {
	totalRecords: number;
	archivedRecords: number;
	deletedRecords: number;
	errors: number;
}

/**
 * Service for archiving and managing historical analytics data
 */
export class ArchivalService {
	private analyticsRepo: AnalyticsRepository;
	private activitySwitchRepo: ActivitySwitchHistoryRepository;
	private auditLogRepo: AuditLogRepository;

	// Default retention policy
	private defaultPolicy: ArchivalPolicy = {
		retentionDays: 90, // Keep active data for 90 days
		archiveAfterDays: 30, // Archive data older than 30 days
		deleteAfterDays: 365 // Delete data older than 1 year
	};

	constructor(storagePath: string) {
		this.analyticsRepo = new AnalyticsRepository({ dataDir: storagePath });
		this.activitySwitchRepo = new ActivitySwitchHistoryRepository({ dataDir: storagePath });
		this.auditLogRepo = new AuditLogRepository({ dataDir: storagePath });
	}

	/**
	 * Archive old analytics data
	 */
	async archiveAnalytics(policy?: ArchivalPolicy): Promise<ArchivalStats> {
		const effectivePolicy = policy || this.defaultPolicy;
		const stats: ArchivalStats = {
			totalRecords: 0,
			archivedRecords: 0,
			deletedRecords: 0,
			errors: 0
		};

		try {
			// Get all analytics
			const result = await this.analyticsRepo.findAll();
			if (!result.success || !result.data) {
				stats.errors++;
				return stats;
			}

			stats.totalRecords = result.data.length;
			const now = new Date();
			const archiveDate = new Date(now.getTime() - effectivePolicy.archiveAfterDays * 24 * 60 * 60 * 1000);
			const deleteDate = effectivePolicy.deleteAfterDays
				? new Date(now.getTime() - effectivePolicy.deleteAfterDays * 24 * 60 * 60 * 1000)
				: null;

			for (const analytics of result.data) {
				const createdAt = new Date(analytics.createdAt);

				// Delete if past deletion date
				if (deleteDate && createdAt < deleteDate) {
					const deleteResult = await this.analyticsRepo.delete(analytics.id);
					if (deleteResult.success) {
						stats.deletedRecords++;
					} else {
						stats.errors++;
					}
					continue;
				}

				// Archive if past archive date
				if (createdAt < archiveDate) {
					// Mark as archived in metadata
					const updateResult = await this.analyticsRepo.update(analytics.id, {
						metadata: {
							...((analytics as any).metadata || {}),
							archived: true,
							archivedAt: now.toISOString()
						}
					} as any);

					if (updateResult.success) {
						stats.archivedRecords++;
					} else {
						stats.errors++;
					}
				}
			}
		} catch (error) {
			console.error('Error archiving analytics:', error);
			stats.errors++;
		}

		return stats;
	}

	/**
	 * Archive old activity switch history
	 */
	async archiveActivitySwitches(eventId: string, policy?: ArchivalPolicy): Promise<ArchivalStats> {
		const effectivePolicy = policy || this.defaultPolicy;
		const stats: ArchivalStats = {
			totalRecords: 0,
			archivedRecords: 0,
			deletedRecords: 0,
			errors: 0
		};

		try {
			const result = await this.activitySwitchRepo.findByEventId(eventId);
			if (!result.success || !result.data) {
				stats.errors++;
				return stats;
			}

			stats.totalRecords = result.data.length;
			const now = new Date();
			const deleteDate = effectivePolicy.deleteAfterDays
				? new Date(now.getTime() - effectivePolicy.deleteAfterDays * 24 * 60 * 60 * 1000)
				: null;

			for (const switchHistory of result.data) {
				const createdAt = new Date(switchHistory.createdAt);

				// Delete old records
				if (deleteDate && createdAt < deleteDate) {
					const deleteResult = await this.activitySwitchRepo.delete(switchHistory.id);
					if (deleteResult.success) {
						stats.deletedRecords++;
					} else {
						stats.errors++;
					}
				}
			}
		} catch (error) {
			console.error('Error archiving activity switches:', error);
			stats.errors++;
		}

		return stats;
	}

	/**
	 * Archive old audit logs
	 */
	async archiveAuditLogs(eventId?: string, policy?: ArchivalPolicy): Promise<ArchivalStats> {
		const effectivePolicy = policy || this.defaultPolicy;
		const stats: ArchivalStats = {
			totalRecords: 0,
			archivedRecords: 0,
			deletedRecords: 0,
			errors: 0
		};

		try {
			let result;
			if (eventId) {
				result = await this.auditLogRepo.findByEventId(eventId);
			} else {
				result = await this.auditLogRepo.findAll();
			}

			if (!result.success || !result.data) {
				stats.errors++;
				return stats;
			}

			stats.totalRecords = result.data.length;
			const now = new Date();
			const archiveDate = new Date(now.getTime() - effectivePolicy.archiveAfterDays * 24 * 60 * 60 * 1000);
			const deleteDate = effectivePolicy.deleteAfterDays
				? new Date(now.getTime() - effectivePolicy.deleteAfterDays * 24 * 60 * 60 * 1000)
				: null;

			for (const log of result.data) {
				const createdAt = new Date(log.createdAt);

				// Delete if past deletion date
				if (deleteDate && createdAt < deleteDate) {
					const deleteResult = await this.auditLogRepo.delete(log.id);
					if (deleteResult.success) {
						stats.deletedRecords++;
					} else {
						stats.errors++;
					}
					continue;
				}

				// Archive if past archive date
				if (createdAt < archiveDate) {
					const updateResult = await this.auditLogRepo.update(log.id, {
						metadata: {
							...((log as any).metadata || {}),
							archived: true,
							archivedAt: now.toISOString()
						}
					} as any);

					if (updateResult.success) {
						stats.archivedRecords++;
					} else {
						stats.errors++;
					}
				}
			}
		} catch (error) {
			console.error('Error archiving audit logs:', error);
			stats.errors++;
		}

		return stats;
	}

	/**
	 * Get historical analytics with filtering
	 */
	async getHistoricalAnalytics(
		eventId?: string,
		startDate?: Date,
		endDate?: Date,
		includeArchived: boolean = false
	): Promise<RepositoryOperationResult<EventAnalytics[]>> {
		try {
			let result;

			if (startDate && endDate) {
				result = await this.analyticsRepo.findByDateRange(startDate, endDate);
			} else {
				result = await this.analyticsRepo.findAll();
			}

			if (!result.success || !result.data) {
				return result;
			}

			let filtered = result.data;

			// Filter by event ID if provided
			if (eventId) {
				filtered = filtered.filter(a => a.eventId === eventId);
			}

			// Filter out archived data unless requested
			if (!includeArchived) {
				filtered = filtered.filter(a => {
					const metadata = (a as any).metadata;
					return !metadata || !metadata.archived;
				});
			}

			return {
				success: true,
				data: filtered
			};
		} catch (error) {
			return {
				success: false,
				error: {
					name: 'QueryError',
					message: 'Failed to retrieve historical analytics',
					code: 'QUERY_FAILED'
				}
			};
		}
	}

	/**
	 * Get analytics aggregated by time period
	 */
	async getAggregatedAnalytics(
		eventId: string,
		groupBy: 'day' | 'week' | 'month'
	): Promise<RepositoryOperationResult<Map<string, EventAnalytics[]>>> {
		try {
			const result = await this.analyticsRepo.findByEventId(eventId);
			if (!result.success || !result.data) {
				return {
					success: false,
					error: result.error
				};
			}

			const grouped = new Map<string, EventAnalytics[]>();

			for (const analytics of result.data) {
				const date = new Date(analytics.createdAt);
				let key: string;

				switch (groupBy) {
					case 'day':
						key = date.toISOString().split('T')[0];
						break;
					case 'week':
						const weekStart = new Date(date);
						weekStart.setDate(date.getDate() - date.getDay());
						key = weekStart.toISOString().split('T')[0];
						break;
					case 'month':
						key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
						break;
				}

				if (!grouped.has(key)) {
					grouped.set(key, []);
				}
				grouped.get(key)!.push(analytics);
			}

			return {
				success: true,
				data: grouped
			};
		} catch (error) {
			return {
				success: false,
				error: {
					name: 'AggregationError',
					message: 'Failed to aggregate analytics',
					code: 'AGGREGATION_FAILED'
				}
			};
		}
	}

	/**
	 * Run cleanup for all data types
	 */
	async runCleanup(eventId?: string, policy?: ArchivalPolicy): Promise<Record<string, ArchivalStats>> {
		const results: Record<string, ArchivalStats> = {};

		// Archive analytics
		results.analytics = await this.archiveAnalytics(policy);

		// Archive activity switches
		if (eventId) {
			results.activitySwitches = await this.archiveActivitySwitches(eventId, policy);
		}

		// Archive audit logs
		results.auditLogs = await this.archiveAuditLogs(eventId, policy);

		return results;
	}

	/**
	 * Get total storage stats
	 */
	async getStorageStats(): Promise<{
		analytics: { total: number; archived: number };
		activitySwitches: { total: number };
		auditLogs: { total: number; archived: number };
	}> {
		const analyticsResult = await this.analyticsRepo.findAll();
		const activitySwitchesResult = await this.activitySwitchRepo.findAll();
		const auditLogsResult = await this.auditLogRepo.findAll();

		const analytics = analyticsResult.data || [];
		const activitySwitches = activitySwitchesResult.data || [];
		const auditLogs = auditLogsResult.data || [];

		return {
			analytics: {
				total: analytics.length,
				archived: analytics.filter(a => (a as any).metadata?.archived).length
			},
			activitySwitches: {
				total: activitySwitches.length
			},
			auditLogs: {
				total: auditLogs.length,
				archived: auditLogs.filter(a => (a as any).metadata?.archived).length
			}
		};
	}
}
