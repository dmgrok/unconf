import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnalyticsService, type AnalyticsEvent, type ActivitySwitchEvent, type VoteEvent } from '../analytics';
import type { ActivityType } from '../../../types/enums';
import fs from 'fs';
import path from 'path';

describe('AnalyticsService', () => {
	let service: AnalyticsService;
	const testStoragePath = './test-data';

	beforeEach(() => {
		// Create test storage directory
		if (!fs.existsSync(testStoragePath)) {
			fs.mkdirSync(testStoragePath, { recursive: true });
		}
		service = new AnalyticsService(testStoragePath);
	});

	afterEach(() => {
		// Clean up test data
		service.stop();
		if (fs.existsSync(testStoragePath)) {
			fs.rmSync(testStoragePath, { recursive: true, force: true });
		}
	});

	describe('Event Tracking', () => {
		it('should track participation events', async () => {
			const event: AnalyticsEvent = {
				type: 'participation',
				eventId: 'test-event-1',
				userId: 'user-1',
				timestamp: new Date(),
				metadata: { action: 'join' }
			};

			await service.trackEvent(event);
			const result = await service.flush('test-event-1');

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data?.eventId).toBe('test-event-1');
		});

		it('should track activity switch events', async () => {
			const event: ActivitySwitchEvent = {
				type: 'activity_switch',
				eventId: 'test-event-1',
				fromActivity: 'voting' as ActivityType,
				toActivity: 'discussion' as ActivityType,
				switchLatency: 150,
				organizerId: 'org-1',
				timestamp: new Date()
			};

			await service.trackActivitySwitch(event);
			const result = await service.flush('test-event-1');

			expect(result.success).toBe(true);
			expect(result.data?.performance.activitySwitchLatency).toBeGreaterThan(0);
		});

		it('should track vote events', async () => {
			const event: VoteEvent = {
				type: 'vote',
				eventId: 'test-event-1',
				userId: 'user-1',
				topicId: 'topic-1',
				voteWeight: 3,
				voteRank: 1,
				timestamp: new Date()
			};

			await service.trackVote(event);
			const result = await service.flush('test-event-1');

			expect(result.success).toBe(true);
			expect(result.data?.voting.totalVotes).toBeGreaterThan(0);
		});
	});

	describe('Analytics Calculation', () => {
		it('should calculate event metrics correctly', async () => {
			const eventId = 'test-event-metrics';

			// Add participation events
			await service.trackEvent({
				type: 'participation',
				eventId,
				userId: 'user-1',
				timestamp: new Date(),
				metadata: { action: 'join' }
			});

			await service.trackEvent({
				type: 'participation',
				eventId,
				userId: 'user-2',
				timestamp: new Date(),
				metadata: { action: 'join' }
			});

			const result = await service.flush(eventId);

			expect(result.success).toBe(true);
			expect(result.data?.metrics.totalParticipants).toBeGreaterThan(0);
		});

		it('should calculate engagement metrics', async () => {
			const eventId = 'test-event-engagement';

			await service.trackEvent({
				type: 'engagement',
				eventId,
				userId: 'user-1',
				timestamp: new Date(),
				metadata: { action: 'vote' }
			});

			await service.trackEvent({
				type: 'engagement',
				eventId,
				userId: 'user-2',
				timestamp: new Date(),
				metadata: { action: 'discuss' }
			});

			const result = await service.flush(eventId);

			expect(result.success).toBe(true);
			expect(result.data?.engagement.averageEngagementScore).toBeGreaterThan(0);
		});
	});

	describe('Live Analytics', () => {
		it('should update live analytics in real-time', async () => {
			const eventId = 'test-event-live';

			await service.trackEvent({
				type: 'participation',
				eventId,
				userId: 'user-1',
				timestamp: new Date(),
				metadata: { action: 'join' }
			});

			// Wait a bit for live analytics to update
			await new Promise(resolve => setTimeout(resolve, 100));

			const liveResult = await service.getLiveAnalytics(eventId);

			expect(liveResult.success).toBe(true);
			expect(liveResult.data).toBeDefined();
		});
	});

	describe('Data Export', () => {
		it('should retrieve event analytics', async () => {
			const eventId = 'test-event-export';

			await service.trackEvent({
				type: 'participation',
				eventId,
				userId: 'user-1',
				timestamp: new Date(),
				metadata: { action: 'join' }
			});

			await service.flush(eventId);
			const result = await service.getEventAnalytics(eventId);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data?.eventId).toBe(eventId);
		});

		it('should retrieve analytics by date range', async () => {
			const eventId = 'test-event-daterange';
			const now = new Date();
			const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
			const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

			await service.trackEvent({
				type: 'participation',
				eventId,
				userId: 'user-1',
				timestamp: now,
				metadata: { action: 'join' }
			});

			await service.flush(eventId);
			const result = await service.getAnalyticsByDateRange(yesterday, tomorrow);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
		});
	});

	describe('Performance', () => {
		it('should handle high volume of events', async () => {
			const eventId = 'test-event-performance';
			const eventCount = 1000;

			const startTime = Date.now();

			for (let i = 0; i < eventCount; i++) {
				await service.trackEvent({
					type: 'participation',
					eventId,
					userId: `user-${i}`,
					timestamp: new Date(),
					metadata: { action: i % 2 === 0 ? 'join' : 'leave' }
				});
			}

			const endTime = Date.now();
			const duration = endTime - startTime;

			expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

			const result = await service.flush(eventId);
			expect(result.success).toBe(true);
		});
	});

	describe('Error Handling', () => {
		it('should handle flush with no events', async () => {
			const result = await service.flush('nonexistent-event');

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should handle invalid event data gracefully', async () => {
			const invalidEvent = {
				type: 'participation',
				eventId: 'test-event-invalid',
				// Missing required fields
				timestamp: new Date()
			} as AnalyticsEvent;

			await expect(service.trackEvent(invalidEvent)).resolves.not.toThrow();
		});
	});
});
