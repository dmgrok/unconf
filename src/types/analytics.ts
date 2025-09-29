/**
 * Analytics and audit logging interfaces for the UnConf platform
 */

import type { BaseEntity } from './entities';
import type { AuditAction, EntityType, ActivityType, UserRole } from './enums';

// Audit logging for system actions and user activities
export interface AuditLog extends BaseEntity {
	userId?: string; // Can be null for system actions
	eventId?: string; // Context event if applicable
	action: AuditAction;
	entityType: EntityType;
	entityId: string;
	oldValues?: Record<string, unknown>;
	newValues?: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
	sessionId?: string;
	success: boolean;
	error?: string;
	duration?: number; // milliseconds
	metadata?: Record<string, unknown>;
}

// Analytics for event performance and engagement
export interface EventAnalytics extends BaseEntity {
	eventId: string;
	metrics: EventMetrics;
	participation: ParticipationMetrics;
	engagement: EngagementMetrics;
	performance: PerformanceMetrics;
	voting: VotingAnalytics;
	activities: ActivityAnalytics[];
	summary: AnalyticsSummary;
	timeRange: TimeRange;
}

export interface EventMetrics {
	totalParticipants: number;
	activeParticipants: number;
	guestParticipants: number;
	registeredParticipants: number;
	peakConcurrency: number;
	averageConcurrency: number;
	totalSessions: number;
	averageSessionDuration: number;
	dropoutRate: number;
	completionRate: number;
}

export interface ParticipationMetrics {
	joinRate: number; // participants/minute
	retentionRate: number; // percentage staying throughout
	reengagementRate: number; // percentage returning after disconnect
	participationByActivity: Record<ActivityType, number>;
	participationByTimeSlot: TimeSlotMetric[];
	demographicBreakdown?: DemographicMetric[];
}

export interface EngagementMetrics {
	averageEngagementScore: number;
	topicSubmissionRate: number;
	votingParticipationRate: number;
	discussionParticipationRate: number;
	gameParticipationRate: number;
	feedbackSubmissionRate: number;
	interactionFrequency: number; // actions per minute
	socialInteractions: number;
}

export interface PerformanceMetrics {
	averageResponseTime: number; // milliseconds
	systemUptime: number; // percentage
	errorRate: number; // percentage
	activitySwitchLatency: number; // milliseconds
	websocketReliability: number; // percentage
	dataConsistency: number; // percentage
	scalabilityMetrics: ScalabilityMetric[];
}

export interface VotingAnalytics {
	totalVotes: number;
	uniqueVoters: number;
	votingCompletionRate: number;
	averageVotingTime: number; // seconds
	voteDistribution: VoteDistribution;
	topicPopularity: TopicPopularityMetric[];
	votingPatterns: VotingPattern[];
}

export interface ActivityAnalytics {
	activityType: ActivityType;
	duration: number; // milliseconds
	participantCount: number;
	engagementScore: number;
	completionRate: number;
	switchLatency: number; // milliseconds
	errorCount: number;
	metrics: Record<string, number>;
	feedback?: ActivityFeedback[];
}

export interface AnalyticsSummary {
	overallScore: number; // 0-100
	successFactors: string[];
	improvementAreas: string[];
	recommendations: string[];
	keyInsights: string[];
	comparisons?: ComparisonMetric[];
}

// Supporting types for analytics
export interface TimeRange {
	startTime: Date;
	endTime: Date;
	duration: number; // milliseconds
}

export interface TimeSlotMetric {
	timeSlot: Date;
	participantCount: number;
	engagementLevel: 'low' | 'medium' | 'high';
	activities: ActivityType[];
}

export interface DemographicMetric {
	category: string;
	value: string;
	count: number;
	percentage: number;
}

export interface ScalabilityMetric {
	participantCount: number;
	responseTime: number;
	cpuUsage: number;
	memoryUsage: number;
	networkLatency: number;
	errorRate: number;
}

export interface VoteDistribution {
	firstChoice: Record<string, number>; // topicId -> count
	secondChoice: Record<string, number>;
	thirdChoice: Record<string, number>;
	weightedScores: Record<string, number>;
}

export interface TopicPopularityMetric {
	topicId: string;
	topicTitle: string;
	totalVotes: number;
	weightedScore: number;
	rank: number;
	voteProgression: VoteProgression[];
}

export interface VoteProgression {
	timestamp: Date;
	cumulativeVotes: number;
	cumulativeScore: number;
}

export interface VotingPattern {
	pattern: string;
	frequency: number;
	description: string;
	impact: 'positive' | 'negative' | 'neutral';
}

export interface ActivityFeedback {
	userId: string;
	rating: number; // 1-5
	comment?: string;
	timestamp: Date;
	categories: string[];
}

export interface ComparisonMetric {
	metric: string;
	currentValue: number;
	previousValue?: number;
	benchmarkValue?: number;
	trend: 'up' | 'down' | 'stable';
	significance: 'high' | 'medium' | 'low';
}

// Real-time analytics for live monitoring
export interface LiveAnalytics {
	eventId: string;
	timestamp: Date;
	currentActivity: ActivityType;
	activeParticipants: number;
	realtimeMetrics: RealtimeMetric[];
	alerts: AnalyticsAlert[];
	performance: LivePerformance;
}

export interface RealtimeMetric {
	name: string;
	value: number;
	unit: string;
	trend: 'up' | 'down' | 'stable';
	threshold?: number;
	severity?: 'info' | 'warning' | 'critical';
}

export interface AnalyticsAlert {
	id: string;
	type: 'performance' | 'engagement' | 'error' | 'capacity';
	severity: 'low' | 'medium' | 'high' | 'critical';
	message: string;
	timestamp: Date;
	acknowledged: boolean;
	resolvedAt?: Date;
	metadata?: Record<string, unknown>;
}

export interface LivePerformance {
	responseTime: number;
	throughput: number;
	errorRate: number;
	activeConnections: number;
	systemLoad: number;
	memoryUsage: number;
}

// Data export formats for analytics
export interface AnalyticsExport {
	format: 'csv' | 'json' | 'xlsx' | 'pdf';
	data: Record<string, unknown>;
	metadata: ExportMetadata;
}

export interface ExportMetadata {
	exportedAt: Date;
	exportedBy: string;
	eventId: string;
	timeRange: TimeRange;
	dataTypes: string[];
	recordCount: number;
}

// Utility functions for analytics
export function calculateEngagementScore(metrics: EngagementMetrics): number {
	// Implementation would calculate weighted engagement score
	return 0; // Placeholder
}

export function generateAnalyticsSummary(analytics: EventAnalytics): AnalyticsSummary {
	// Implementation would analyze metrics and generate insights
	return {
		overallScore: 0,
		successFactors: [],
		improvementAreas: [],
		recommendations: [],
		keyInsights: [],
	}; // Placeholder
}

export function isAlertCritical(alert: AnalyticsAlert): boolean {
	return alert.severity === 'critical' || alert.severity === 'high';
}

export function calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
	const threshold = 0.05; // 5% threshold for considering stable
	const change = (current - previous) / previous;

	if (Math.abs(change) < threshold) return 'stable';
	return change > 0 ? 'up' : 'down';
}