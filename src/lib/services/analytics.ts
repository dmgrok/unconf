import type {
	EventAnalytics,
	LiveAnalytics,
	EventMetrics,
	ParticipationMetrics,
	EngagementMetrics,
	PerformanceMetrics,
	VotingAnalytics,
	ActivityAnalytics,
	AnalyticsSummary,
	TimeRange,
	RealtimeMetric,
	AnalyticsAlert,
	LivePerformance
} from '../../types/analytics';
import type { ActivityType } from '../../types/enums';
import { AnalyticsRepository, LiveAnalyticsRepository } from '../storage/AnalyticsRepository';
import type { RepositoryOperationResult } from '../storage/Repository';

export interface AnalyticsEvent {
	type: 'participation' | 'engagement' | 'activity_switch' | 'vote' | 'error' | 'performance';
	eventId: string;
	userId?: string;
	activityType?: ActivityType;
	metadata?: Record<string, unknown>;
	timestamp: Date;
	duration?: number;
}

export interface ParticipationEvent extends AnalyticsEvent {
	type: 'participation';
	action: 'join' | 'leave' | 'reconnect';
}

export interface EngagementEvent extends AnalyticsEvent {
	type: 'engagement';
	action: 'vote' | 'submit_topic' | 'discuss' | 'game_action' | 'feedback';
}

export interface ActivitySwitchEvent extends AnalyticsEvent {
	type: 'activity_switch';
	fromActivity?: ActivityType;
	toActivity: ActivityType;
	switchLatency: number;
	organizerId?: string;
}

export interface VoteEvent extends AnalyticsEvent {
	type: 'vote';
	topicId: string;
	voteWeight: number;
	voteRank: number;
}

export interface PerformanceEvent extends AnalyticsEvent {
	type: 'performance';
	metric: string;
	value: number;
	threshold?: number;
}

/**
 * Analytics tracking service for collecting and analyzing event data
 */
export class AnalyticsService {
	private analyticsRepo: AnalyticsRepository;
	private liveAnalyticsRepo: LiveAnalyticsRepository;
	private eventBuffer: Map<string, AnalyticsEvent[]>;
	private flushInterval: number = 60000; // 1 minute
	private flushTimer?: ReturnType<typeof setTimeout>;

	constructor(storagePath: string) {
		this.analyticsRepo = new AnalyticsRepository({ storagePath });
		this.liveAnalyticsRepo = new LiveAnalyticsRepository({ storagePath });
		this.eventBuffer = new Map();
		this.startAutoFlush();
	}

	/**
	 * Track an analytics event
	 */
	async trackEvent(event: AnalyticsEvent): Promise<void> {
		const { eventId } = event;

		// Add to buffer
		if (!this.eventBuffer.has(eventId)) {
			this.eventBuffer.set(eventId, []);
		}
		this.eventBuffer.get(eventId)!.push(event);

		// Update live analytics immediately for real-time monitoring
		await this.updateLiveAnalytics(eventId);
	}

	/**
	 * Track participation event (join, leave, reconnect)
	 */
	async trackParticipation(event: ParticipationEvent): Promise<void> {
		await this.trackEvent(event);
	}

	/**
	 * Track engagement event (votes, topic submissions, etc.)
	 */
	async trackEngagement(event: EngagementEvent): Promise<void> {
		await this.trackEvent(event);
	}

	/**
	 * Track activity switch with latency measurement
	 */
	async trackActivitySwitch(event: ActivitySwitchEvent): Promise<void> {
		await this.trackEvent(event);
	}

	/**
	 * Track vote event
	 */
	async trackVote(event: VoteEvent): Promise<void> {
		await this.trackEvent(event);
	}

	/**
	 * Track performance metric
	 */
	async trackPerformance(event: PerformanceEvent): Promise<void> {
		await this.trackEvent(event);
	}

	/**
	 * Update live analytics for real-time monitoring
	 */
	private async updateLiveAnalytics(eventId: string): Promise<void> {
		const events = this.eventBuffer.get(eventId) || [];
		const now = new Date();

		// Calculate real-time metrics
		const activeParticipants = this.calculateActiveParticipants(events);
		const currentActivity = this.getCurrentActivity(events);
		const realtimeMetrics = this.calculateRealtimeMetrics(events);
		const alerts = this.generateAlerts(events, realtimeMetrics);
		const performance = this.calculateLivePerformance(events);

		const liveAnalytics: Omit<LiveAnalytics, 'id' | 'createdAt' | 'updatedAt'> = {
			eventId,
			timestamp: now,
			currentActivity,
			activeParticipants,
			realtimeMetrics,
			alerts,
			performance
		};

		await this.liveAnalyticsRepo.create(liveAnalytics);

		// Cleanup old live analytics data
		await this.liveAnalyticsRepo.cleanup(eventId, 100);
	}

	/**
	 * Flush buffered events and generate analytics report
	 */
	async flush(eventId: string): Promise<RepositoryOperationResult<EventAnalytics>> {
		const events = this.eventBuffer.get(eventId) || [];
		if (events.length === 0) {
			return {
				success: false,
				error: {
					name: 'NoEventsError',
					message: 'No events to flush',
					code: 'NO_EVENTS'
				}
			};
		}

		// Calculate time range
		const timestamps = events.map(e => e.timestamp.getTime());
		const startTime = new Date(Math.min(...timestamps));
		const endTime = new Date(Math.max(...timestamps));
		const timeRange: TimeRange = {
			startTime,
			endTime,
			duration: endTime.getTime() - startTime.getTime()
		};

		// Calculate all metrics
		const metrics = this.calculateEventMetrics(events);
		const participation = this.calculateParticipationMetrics(events);
		const engagement = this.calculateEngagementMetrics(events);
		const performance = this.calculatePerformanceMetrics(events);
		const voting = this.calculateVotingAnalytics(events);
		const activities = this.calculateActivityAnalytics(events);
		const summary = this.generateSummary(metrics, participation, engagement, performance, voting);

		const analytics: Omit<EventAnalytics, 'id' | 'createdAt' | 'updatedAt'> = {
			eventId,
			metrics,
			participation,
			engagement,
			performance,
			voting,
			activities,
			summary,
			timeRange
		};

		// Save analytics
		const result = await this.analyticsRepo.create(analytics);

		// Clear buffer for this event
		this.eventBuffer.delete(eventId);

		return result;
	}

	/**
	 * Get analytics for an event
	 */
	async getEventAnalytics(eventId: string): Promise<RepositoryOperationResult<EventAnalytics | null>> {
		return this.analyticsRepo.findLatestByEventId(eventId);
	}

	/**
	 * Get live analytics for an event
	 */
	async getLiveAnalytics(eventId: string): Promise<RepositoryOperationResult<LiveAnalytics | null>> {
		return this.liveAnalyticsRepo.findLatestByEventId(eventId);
	}

	/**
	 * Get analytics by date range
	 */
	async getAnalyticsByDateRange(
		startDate: Date,
		endDate: Date
	): Promise<RepositoryOperationResult<EventAnalytics[]>> {
		return this.analyticsRepo.findByDateRange(startDate, endDate);
	}

	/**
	 * Calculate event metrics
	 */
	private calculateEventMetrics(events: AnalyticsEvent[]): EventMetrics {
		const participationEvents = events.filter(e => e.type === 'participation') as ParticipationEvent[];
		const uniqueUsers = new Set(events.filter(e => e.userId).map(e => e.userId!));

		const joinEvents = participationEvents.filter(e => e.action === 'join');
		const leaveEvents = participationEvents.filter(e => e.action === 'leave');

		return {
			totalParticipants: uniqueUsers.size,
			activeParticipants: joinEvents.length - leaveEvents.length,
			guestParticipants: 0, // TODO: Implement guest tracking
			registeredParticipants: uniqueUsers.size,
			peakConcurrency: this.calculatePeakConcurrency(participationEvents),
			averageConcurrency: this.calculateAverageConcurrency(participationEvents),
			totalSessions: joinEvents.length,
			averageSessionDuration: this.calculateAverageSessionDuration(events),
			dropoutRate: leaveEvents.length / joinEvents.length,
			completionRate: 1 - (leaveEvents.length / joinEvents.length)
		};
	}

	/**
	 * Calculate participation metrics
	 */
	private calculateParticipationMetrics(events: AnalyticsEvent[]): ParticipationMetrics {
		const participationEvents = events.filter(e => e.type === 'participation') as ParticipationEvent[];
		const timespan = this.getTimespan(events);

		return {
			joinRate: participationEvents.filter(e => e.action === 'join').length / (timespan / 60000),
			retentionRate: 0.85, // TODO: Calculate actual retention rate
			reengagementRate: participationEvents.filter(e => e.action === 'reconnect').length / participationEvents.filter(e => e.action === 'leave').length || 0,
			participationByActivity: this.calculateParticipationByActivity(events),
			participationByTimeSlot: []
		};
	}

	/**
	 * Calculate engagement metrics
	 */
	private calculateEngagementMetrics(events: AnalyticsEvent[]): EngagementMetrics {
		const engagementEvents = events.filter(e => e.type === 'engagement') as EngagementEvent[];
		const uniqueUsers = new Set(events.filter(e => e.userId).map(e => e.userId!));
		const timespan = this.getTimespan(events);

		return {
			averageEngagementScore: 75, // TODO: Implement engagement score calculation
			topicSubmissionRate: engagementEvents.filter(e => e.action === 'submit_topic').length / uniqueUsers.size,
			votingParticipationRate: engagementEvents.filter(e => e.action === 'vote').length / uniqueUsers.size,
			discussionParticipationRate: engagementEvents.filter(e => e.action === 'discuss').length / uniqueUsers.size,
			gameParticipationRate: engagementEvents.filter(e => e.action === 'game_action').length / uniqueUsers.size,
			feedbackSubmissionRate: engagementEvents.filter(e => e.action === 'feedback').length / uniqueUsers.size,
			interactionFrequency: engagementEvents.length / (timespan / 60000),
			socialInteractions: engagementEvents.filter(e => e.action === 'discuss').length
		};
	}

	/**
	 * Calculate performance metrics
	 */
	private calculatePerformanceMetrics(events: AnalyticsEvent[]): PerformanceMetrics {
		const performanceEvents = events.filter(e => e.type === 'performance') as PerformanceEvent[];
		const activitySwitchEvents = events.filter(e => e.type === 'activity_switch') as ActivitySwitchEvent[];
		const errorEvents = events.filter(e => e.type === 'error');

		const responseTimes = performanceEvents.filter(e => e.metric === 'response_time').map(e => e.value);
		const avgResponseTime = responseTimes.length > 0
			? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
			: 0;

		const switchLatencies = activitySwitchEvents.map(e => e.switchLatency);
		const avgSwitchLatency = switchLatencies.length > 0
			? switchLatencies.reduce((a, b) => a + b, 0) / switchLatencies.length
			: 0;

		return {
			averageResponseTime: avgResponseTime,
			systemUptime: 99.9, // TODO: Calculate actual uptime
			errorRate: errorEvents.length / events.length,
			activitySwitchLatency: avgSwitchLatency,
			websocketReliability: 99.5, // TODO: Calculate actual reliability
			dataConsistency: 100, // TODO: Calculate actual consistency
			scalabilityMetrics: []
		};
	}

	/**
	 * Calculate voting analytics
	 */
	private calculateVotingAnalytics(events: AnalyticsEvent[]): VotingAnalytics {
		const voteEvents = events.filter(e => e.type === 'vote') as VoteEvent[];
		const uniqueVoters = new Set(voteEvents.map(e => e.userId).filter(Boolean));

		return {
			totalVotes: voteEvents.length,
			uniqueVoters: uniqueVoters.size,
			votingCompletionRate: uniqueVoters.size > 0 ? voteEvents.length / (uniqueVoters.size * 3) : 0,
			averageVotingTime: this.calculateAverageVotingTime(voteEvents),
			voteDistribution: {
				firstChoice: {},
				secondChoice: {},
				thirdChoice: {},
				weightedScores: {}
			},
			topicPopularity: [],
			votingPatterns: []
		};
	}

	/**
	 * Calculate activity-specific analytics
	 */
	private calculateActivityAnalytics(events: AnalyticsEvent[]): ActivityAnalytics[] {
		const activityTypes = new Set(events.filter(e => e.activityType).map(e => e.activityType!));
		const analytics: ActivityAnalytics[] = [];

		for (const activityType of activityTypes) {
			const activityEvents = events.filter(e => e.activityType === activityType);
			const switchEvents = events.filter(
				e => e.type === 'activity_switch' && (e as ActivitySwitchEvent).toActivity === activityType
			) as ActivitySwitchEvent[];

			const avgLatency = switchEvents.length > 0
				? switchEvents.reduce((sum, e) => sum + e.switchLatency, 0) / switchEvents.length
				: 0;

			analytics.push({
				activityType,
				duration: this.calculateActivityDuration(activityEvents),
				participantCount: new Set(activityEvents.filter(e => e.userId).map(e => e.userId!)).size,
				engagementScore: 75, // TODO: Calculate engagement score
				completionRate: 0.9, // TODO: Calculate completion rate
				switchLatency: avgLatency,
				errorCount: activityEvents.filter(e => e.type === 'error').length,
				metrics: {}
			});
		}

		return analytics;
	}

	/**
	 * Generate analytics summary
	 */
	private generateSummary(
		metrics: EventMetrics,
		participation: ParticipationMetrics,
		engagement: EngagementMetrics,
		performance: PerformanceMetrics,
		voting: VotingAnalytics
	): AnalyticsSummary {
		const overallScore = this.calculateOverallScore(metrics, participation, engagement, performance);

		return {
			overallScore,
			successFactors: this.identifySuccessFactors(metrics, engagement),
			improvementAreas: this.identifyImprovementAreas(metrics, performance),
			recommendations: this.generateRecommendations(metrics, participation, engagement),
			keyInsights: this.generateKeyInsights(metrics, voting, engagement)
		};
	}

	// Helper methods

	private calculateActiveParticipants(events: AnalyticsEvent[]): number {
		const participationEvents = events.filter(e => e.type === 'participation') as ParticipationEvent[];
		const joins = participationEvents.filter(e => e.action === 'join').length;
		const leaves = participationEvents.filter(e => e.action === 'leave').length;
		return Math.max(0, joins - leaves);
	}

	private getCurrentActivity(events: AnalyticsEvent[]): ActivityType {
		const switchEvents = events.filter(e => e.type === 'activity_switch') as ActivitySwitchEvent[];
		if (switchEvents.length === 0) {
			return 'voting' as ActivityType;
		}
		const latestSwitch = switchEvents[switchEvents.length - 1];
		return latestSwitch.toActivity;
	}

	private calculateRealtimeMetrics(events: AnalyticsEvent[]): RealtimeMetric[] {
		return [
			{
				name: 'Active Participants',
				value: this.calculateActiveParticipants(events),
				unit: 'users',
				trend: 'stable'
			},
			{
				name: 'Events Per Minute',
				value: events.length / (this.getTimespan(events) / 60000),
				unit: 'events/min',
				trend: 'stable'
			}
		];
	}

	private generateAlerts(events: AnalyticsEvent[], metrics: RealtimeMetric[]): AnalyticsAlert[] {
		const alerts: AnalyticsAlert[] = [];

		// Check for high error rate
		const errorRate = events.filter(e => e.type === 'error').length / events.length;
		if (errorRate > 0.05) {
			alerts.push({
				id: `alert_${Date.now()}`,
				type: 'error',
				severity: errorRate > 0.1 ? 'critical' : 'high',
				message: `High error rate detected: ${(errorRate * 100).toFixed(2)}%`,
				timestamp: new Date(),
				acknowledged: false
			});
		}

		return alerts;
	}

	private calculateLivePerformance(events: AnalyticsEvent[]): LivePerformance {
		const performanceEvents = events.filter(e => e.type === 'performance') as PerformanceEvent[];
		const responseTimes = performanceEvents.filter(e => e.metric === 'response_time').map(e => e.value);
		const avgResponseTime = responseTimes.length > 0
			? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
			: 0;

		return {
			responseTime: avgResponseTime,
			throughput: events.length / (this.getTimespan(events) / 1000),
			errorRate: events.filter(e => e.type === 'error').length / events.length,
			activeConnections: this.calculateActiveParticipants(events),
			systemLoad: 0.5, // TODO: Get actual system load
			memoryUsage: 0.6 // TODO: Get actual memory usage
		};
	}

	private calculatePeakConcurrency(events: ParticipationEvent[]): number {
		let current = 0;
		let peak = 0;

		for (const event of events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())) {
			if (event.action === 'join') {
				current++;
				peak = Math.max(peak, current);
			} else if (event.action === 'leave') {
				current = Math.max(0, current - 1);
			}
		}

		return peak;
	}

	private calculateAverageConcurrency(events: ParticipationEvent[]): number {
		// TODO: Implement proper average concurrency calculation
		return this.calculatePeakConcurrency(events) * 0.7;
	}

	private calculateAverageSessionDuration(events: AnalyticsEvent[]): number {
		// TODO: Implement session duration tracking
		return 1800; // 30 minutes placeholder
	}

	private calculateParticipationByActivity(events: AnalyticsEvent[]): Record<ActivityType, number> {
		const result: Partial<Record<ActivityType, number>> = {};
		const activityEvents = events.filter(e => e.activityType);

		for (const event of activityEvents) {
			const activity = event.activityType!;
			result[activity] = (result[activity] || 0) + 1;
		}

		return result as Record<ActivityType, number>;
	}

	private calculateAverageVotingTime(voteEvents: VoteEvent[]): number {
		if (voteEvents.length === 0) return 0;

		const votingTimes = voteEvents
			.filter(e => e.duration !== undefined)
			.map(e => e.duration!);

		if (votingTimes.length === 0) return 0;

		return votingTimes.reduce((a, b) => a + b, 0) / votingTimes.length / 1000;
	}

	private calculateActivityDuration(events: AnalyticsEvent[]): number {
		if (events.length === 0) return 0;

		const timestamps = events.map(e => e.timestamp.getTime());
		return Math.max(...timestamps) - Math.min(...timestamps);
	}

	private getTimespan(events: AnalyticsEvent[]): number {
		if (events.length === 0) return 1;

		const timestamps = events.map(e => e.timestamp.getTime());
		return Math.max(...timestamps) - Math.min(...timestamps) || 1;
	}

	private calculateOverallScore(
		metrics: EventMetrics,
		participation: ParticipationMetrics,
		engagement: EngagementMetrics,
		performance: PerformanceMetrics
	): number {
		// Weighted average of key metrics
		const weights = {
			completion: 0.3,
			engagement: 0.3,
			performance: 0.2,
			retention: 0.2
		};

		return (
			metrics.completionRate * 100 * weights.completion +
			engagement.averageEngagementScore * weights.engagement +
			performance.systemUptime * weights.performance +
			participation.retentionRate * 100 * weights.retention
		);
	}

	private identifySuccessFactors(metrics: EventMetrics, engagement: EngagementMetrics): string[] {
		const factors: string[] = [];

		if (metrics.completionRate > 0.8) {
			factors.push('High completion rate indicates strong participant commitment');
		}

		if (engagement.votingParticipationRate > 0.9) {
			factors.push('Excellent voting participation shows strong engagement');
		}

		return factors;
	}

	private identifyImprovementAreas(metrics: EventMetrics, performance: PerformanceMetrics): string[] {
		const areas: string[] = [];

		if (metrics.dropoutRate > 0.3) {
			areas.push('High dropout rate - consider improving onboarding and engagement');
		}

		if (performance.activitySwitchLatency > 2000) {
			areas.push('Activity switching latency is high - optimize transitions');
		}

		return areas;
	}

	private generateRecommendations(
		metrics: EventMetrics,
		participation: ParticipationMetrics,
		engagement: EngagementMetrics
	): string[] {
		const recommendations: string[] = [];

		if (participation.retentionRate < 0.7) {
			recommendations.push('Implement engagement notifications to improve retention');
		}

		if (engagement.interactionFrequency < 1) {
			recommendations.push('Add more interactive elements to increase engagement');
		}

		return recommendations;
	}

	private generateKeyInsights(
		metrics: EventMetrics,
		voting: VotingAnalytics,
		engagement: EngagementMetrics
	): string[] {
		const insights: string[] = [];

		insights.push(`${metrics.totalParticipants} participants with ${metrics.peakConcurrency} peak concurrency`);
		insights.push(`${voting.uniqueVoters} unique voters cast ${voting.totalVotes} total votes`);
		insights.push(`Average engagement score: ${engagement.averageEngagementScore.toFixed(1)}`);

		return insights;
	}

	/**
	 * Start auto-flush timer
	 */
	private startAutoFlush(): void {
		this.flushTimer = setInterval(() => {
			for (const eventId of this.eventBuffer.keys()) {
				this.flush(eventId).catch(err => {
					console.error(`Failed to auto-flush analytics for event ${eventId}:`, err);
				});
			}
		}, this.flushInterval);
	}

	/**
	 * Stop auto-flush timer
	 */
	stop(): void {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
		}
	}
}
