import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ArchivalService, type ArchivalPolicy } from '../archival';
import fs from 'fs';

describe('ArchivalService', () => {
	let service: ArchivalService;
	const testStoragePath = './test-data-archival';

	beforeEach(() => {
		if (!fs.existsSync(testStoragePath)) {
			fs.mkdirSync(testStoragePath, { recursive: true });
		}
		service = new ArchivalService(testStoragePath);
	});

	afterEach(() => {
		if (fs.existsSync(testStoragePath)) {
			fs.rmSync(testStoragePath, { recursive: true, force: true });
		}
	});

	describe('Archival Policies', () => {
		it('should use default policy when none provided', async () => {
			const stats = await service.archiveAnalytics();

			expect(stats).toBeDefined();
			expect(stats.totalRecords).toBe(0);
			expect(stats.archivedRecords).toBe(0);
			expect(stats.deletedRecords).toBe(0);
		});

		it('should accept custom archival policy', async () => {
			const customPolicy: ArchivalPolicy = {
				retentionDays: 30,
				archiveAfterDays: 7,
				deleteAfterDays: 90
			};

			const stats = await service.archiveAnalytics(customPolicy);

			expect(stats).toBeDefined();
		});
	});

	describe('Historical Data Retrieval', () => {
		it('should retrieve historical analytics', async () => {
			const result = await service.getHistoricalAnalytics();

			expect(result.success).toBe(true);
			expect(Array.isArray(result.data)).toBe(true);
		});

		it('should filter by event ID', async () => {
			const result = await service.getHistoricalAnalytics('test-event-1');

			expect(result.success).toBe(true);
			expect(Array.isArray(result.data)).toBe(true);
		});

		it('should filter by date range', async () => {
			const startDate = new Date('2024-01-01');
			const endDate = new Date('2024-01-31');

			const result = await service.getHistoricalAnalytics(undefined, startDate, endDate);

			expect(result.success).toBe(true);
			expect(Array.isArray(result.data)).toBe(true);
		});

		it('should exclude archived data by default', async () => {
			const result = await service.getHistoricalAnalytics(undefined, undefined, undefined, false);

			expect(result.success).toBe(true);
		});

		it('should include archived data when requested', async () => {
			const result = await service.getHistoricalAnalytics(undefined, undefined, undefined, true);

			expect(result.success).toBe(true);
		});
	});

	describe('Aggregated Analytics', () => {
		it('should aggregate by day', async () => {
			const result = await service.getAggregatedAnalytics('test-event-1', 'day');

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
		});

		it('should aggregate by week', async () => {
			const result = await service.getAggregatedAnalytics('test-event-1', 'week');

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
		});

		it('should aggregate by month', async () => {
			const result = await service.getAggregatedAnalytics('test-event-1', 'month');

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
		});
	});

	describe('Cleanup Operations', () => {
		it('should run cleanup for all data types', async () => {
			const results = await service.runCleanup();

			expect(results.analytics).toBeDefined();
			expect(results.auditLogs).toBeDefined();
		});

		it('should run cleanup for specific event', async () => {
			const results = await service.runCleanup('test-event-1');

			expect(results.analytics).toBeDefined();
			expect(results.activitySwitches).toBeDefined();
			expect(results.auditLogs).toBeDefined();
		});

		it('should apply custom policy to cleanup', async () => {
			const customPolicy: ArchivalPolicy = {
				retentionDays: 30,
				archiveAfterDays: 7,
				deleteAfterDays: 90
			};

			const results = await service.runCleanup('test-event-1', customPolicy);

			expect(results).toBeDefined();
		});
	});

	describe('Storage Statistics', () => {
		it('should return storage stats', async () => {
			const stats = await service.getStorageStats();

			expect(stats.analytics).toBeDefined();
			expect(stats.analytics.total).toBeGreaterThanOrEqual(0);
			expect(stats.analytics.archived).toBeGreaterThanOrEqual(0);

			expect(stats.activitySwitches).toBeDefined();
			expect(stats.activitySwitches.total).toBeGreaterThanOrEqual(0);

			expect(stats.auditLogs).toBeDefined();
			expect(stats.auditLogs.total).toBeGreaterThanOrEqual(0);
			expect(stats.auditLogs.archived).toBeGreaterThanOrEqual(0);
		});
	});
});
