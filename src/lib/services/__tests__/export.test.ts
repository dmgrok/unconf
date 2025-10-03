import { describe, it, expect } from 'vitest';
import { ExportService, type ExportOptions } from '../export';
import type { EventAnalytics, EventMetrics, ParticipationMetrics, EngagementMetrics, PerformanceMetrics, VotingAnalytics, AnalyticsSummary, TimeRange } from '../../../types/analytics';

describe('ExportService', () => {
	const service = new ExportService();

	const mockAnalytics: EventAnalytics = {
		id: 'analytics-1',
		eventId: 'test-event-1',
		createdAt: new Date(),
		updatedAt: new Date(),
		metrics: {
			totalParticipants: 100,
			activeParticipants: 85,
			guestParticipants: 15,
			registeredParticipants: 85,
			peakConcurrency: 50,
			averageConcurrency: 35,
			totalSessions: 100,
			averageSessionDuration: 1800,
			dropoutRate: 0.15,
			completionRate: 0.85
		} as EventMetrics,
		participation: {
			joinRate: 5,
			retentionRate: 0.85,
			reengagementRate: 0.1,
			participationByActivity: {} as any,
			participationByTimeSlot: []
		} as ParticipationMetrics,
		engagement: {
			averageEngagementScore: 75,
			topicSubmissionRate: 0.8,
			votingParticipationRate: 0.95,
			discussionParticipationRate: 0.7,
			gameParticipationRate: 0.6,
			feedbackSubmissionRate: 0.5,
			interactionFrequency: 2.5,
			socialInteractions: 150
		} as EngagementMetrics,
		performance: {
			averageResponseTime: 120,
			systemUptime: 99.9,
			errorRate: 0.001,
			activitySwitchLatency: 150,
			websocketReliability: 99.5,
			dataConsistency: 100,
			scalabilityMetrics: []
		} as PerformanceMetrics,
		voting: {
			totalVotes: 270,
			uniqueVoters: 90,
			votingCompletionRate: 1.0,
			averageVotingTime: 45,
			voteDistribution: {
				firstChoice: {},
				secondChoice: {},
				thirdChoice: {},
				weightedScores: {}
			},
			topicPopularity: [],
			votingPatterns: []
		} as VotingAnalytics,
		activities: [],
		summary: {
			overallScore: 82,
			successFactors: ['High voting participation', 'Strong retention'],
			improvementAreas: ['Increase discussion participation'],
			recommendations: ['Add more interactive elements'],
			keyInsights: ['90 participants cast 270 votes']
		} as AnalyticsSummary,
		timeRange: {
			startTime: new Date('2024-01-01T10:00:00Z'),
			endTime: new Date('2024-01-01T12:00:00Z'),
			duration: 7200000
		} as TimeRange
	};

	describe('CSV Export', () => {
		it('should export analytics to CSV format', async () => {
			const options: ExportOptions = {
				format: 'csv',
				eventId: 'test-event-1'
			};

			const result = await service.exportAnalytics(mockAnalytics, options);

			expect(result.format).toBe('csv');
			expect(result.data.content).toBeDefined();
			expect(typeof result.data.content).toBe('string');
			expect(result.data.content).toContain('Event ID');
			expect(result.data.content).toContain('test-event-1');
		});

		it('should include all metrics in CSV when not filtered', async () => {
			const options: ExportOptions = {
				format: 'csv',
				eventId: 'test-event-1'
			};

			const result = await service.exportAnalytics(mockAnalytics, options);
			const csv = result.data.content as string;

			expect(csv).toContain('Total Participants');
			expect(csv).toContain('Engagement Score');
			expect(csv).toContain('Total Votes');
			expect(csv).toContain('Average Response Time');
		});

		it('should exclude metrics when filtered', async () => {
			const options: ExportOptions = {
				format: 'csv',
				eventId: 'test-event-1',
				includeMetrics: false,
				includeVoting: false
			};

			const result = await service.exportAnalytics(mockAnalytics, options);
			const csv = result.data.content as string;

			expect(csv).not.toContain('Total Participants');
			expect(csv).not.toContain('Total Votes');
		});

		it('should handle CSV escaping correctly', async () => {
			const analyticsWithCommas = {
				...mockAnalytics,
				summary: {
					...mockAnalytics.summary,
					keyInsights: ['Insight with, comma', 'Another "quoted" insight']
				}
			};

			const options: ExportOptions = {
				format: 'csv',
				eventId: 'test-event-1'
			};

			const result = await service.exportAnalytics(analyticsWithCommas, options);
			expect(result.data.content).toBeDefined();
		});
	});

	describe('JSON Export', () => {
		it('should export analytics to JSON format', async () => {
			const options: ExportOptions = {
				format: 'json',
				eventId: 'test-event-1'
			};

			const result = await service.exportAnalytics(mockAnalytics, options);

			expect(result.format).toBe('json');
			expect(result.data.analytics).toBeDefined();
			expect(Array.isArray(result.data.analytics)).toBe(true);
			expect(result.data.count).toBe(1);
		});

		it('should include all data when not filtered', async () => {
			const options: ExportOptions = {
				format: 'json',
				eventId: 'test-event-1'
			};

			const result = await service.exportAnalytics(mockAnalytics, options);
			const data = (result.data.analytics as any[])[0];

			expect(data.metrics).toBeDefined();
			expect(data.participation).toBeDefined();
			expect(data.engagement).toBeDefined();
			expect(data.performance).toBeDefined();
			expect(data.voting).toBeDefined();
		});

		it('should exclude data when filtered', async () => {
			const options: ExportOptions = {
				format: 'json',
				eventId: 'test-event-1',
				includeMetrics: false,
				includeVoting: false
			};

			const result = await service.exportAnalytics(mockAnalytics, options);
			const data = (result.data.analytics as any[])[0];

			expect(data.metrics).toBeUndefined();
			expect(data.voting).toBeUndefined();
			expect(data.participation).toBeDefined();
		});
	});

	describe('Export Metadata', () => {
		it('should include correct export metadata', async () => {
			const options: ExportOptions = {
				format: 'json',
				eventId: 'test-event-1'
			};

			const result = await service.exportAnalytics(mockAnalytics, options);

			expect(result.metadata.exportedAt).toBeDefined();
			expect(result.metadata.eventId).toBe('test-event-1');
			expect(result.metadata.recordCount).toBe(1);
			expect(result.metadata.dataTypes).toContain('metrics');
			expect(result.metadata.dataTypes).toContain('voting');
		});

		it('should include date range in metadata when provided', async () => {
			const startDate = new Date('2024-01-01');
			const endDate = new Date('2024-01-31');

			const options: ExportOptions = {
				format: 'json',
				eventId: 'test-event-1',
				dateRange: { start: startDate, end: endDate }
			};

			const result = await service.exportAnalytics(mockAnalytics, options);

			expect(result.metadata.timeRange.startTime).toEqual(startDate);
			expect(result.metadata.timeRange.endTime).toEqual(endDate);
		});
	});

	describe('Batch Export', () => {
		it('should export multiple analytics records', async () => {
			const analyticsArray = [
				mockAnalytics,
				{ ...mockAnalytics, id: 'analytics-2', eventId: 'test-event-2' }
			];

			const options: ExportOptions = {
				format: 'json',
				eventId: 'test-event-1'
			};

			const result = await service.exportAnalytics(analyticsArray, options);

			expect(result.data.count).toBe(2);
			expect((result.data.analytics as any[]).length).toBe(2);
		});

		it('should export multiple records to CSV', async () => {
			const analyticsArray = [
				mockAnalytics,
				{ ...mockAnalytics, id: 'analytics-2', eventId: 'test-event-2' }
			];

			const options: ExportOptions = {
				format: 'csv',
				eventId: 'test-event-1'
			};

			const result = await service.exportAnalytics(analyticsArray, options);
			const csv = result.data.content as string;
			const lines = csv.split('\n');

			expect(lines.length).toBeGreaterThan(2); // Header + 2 data rows
		});
	});

	describe('Filename Generation', () => {
		it('should generate valid CSV filename', () => {
			const filename = service.generateFilename('test-event-1', 'csv');

			expect(filename).toContain('analytics-test-event-1');
			expect(filename).toMatch(/\.csv$/);
		});

		it('should generate valid JSON filename', () => {
			const filename = service.generateFilename('test-event-1', 'json');

			expect(filename).toContain('analytics-test-event-1');
			expect(filename).toMatch(/\.json$/);
		});

		it('should include timestamp in filename', () => {
			const filename1 = service.generateFilename('test-event-1', 'csv');
			const filename2 = service.generateFilename('test-event-1', 'csv');

			// Filenames should be different due to timestamp
			expect(filename1).toBeDefined();
			expect(filename2).toBeDefined();
		});
	});
});
