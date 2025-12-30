/**
 * Feature Flags - Server-side utilities
 * 
 * Server-side feature flag evaluation for SvelteKit load functions and API routes.
 * Provides consistent feature flag access across client and server.
 */

import { GrowthBook } from '@growthbook/growthbook';
import type { FeatureDefinition } from '@growthbook/growthbook';
import type { RequestEvent } from '@sveltejs/kit';

// =============================================================================
// SERVER-SIDE GROWTHBOOK
// =============================================================================

/**
 * Create a GrowthBook instance for server-side rendering
 * Each request should have its own instance for proper user targeting
 */
export function createServerGrowthBook(event: RequestEvent): GrowthBook {
	const clientKey = process.env.GROWTHBOOK_CLIENT_KEY || 'sdk-VQW82OY28wqny0K';
	const user = event.locals.user;
	
	const gb = new GrowthBook({
		apiHost: 'https://cdn.growthbook.io',
		clientKey,
		enableDevMode: process.env.NODE_ENV === 'development',
		attributes: {
			id: user?.id || 'anonymous',
			role: user?.role || 'guest',
			isGuest: user?.isGuest ?? true,
			sessionId: user?.sessionId,
		},
	});
	
	return gb;
}

/**
 * Load features for server-side GrowthBook instance
 * Uses caching to avoid repeated API calls
 */
const featureCache = new Map<string, { data: Record<string, FeatureDefinition<any>>; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

export async function loadServerFeatures(gb: GrowthBook): Promise<void> {
	const cacheKey = 'growthbook-features';
	const cached = featureCache.get(cacheKey);
	
	// Use cached features if fresh
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		gb.setFeatures(cached.data);
		return;
	}
	
	try {
		await gb.loadFeatures({ timeout: 2000 });
		
		// Cache the features
		featureCache.set(cacheKey, {
			data: gb.getFeatures(),
			timestamp: Date.now(),
		});
	} catch (error) {
		console.warn('[GrowthBook Server] Failed to load features, using defaults:', error);
		// Continue with empty features - fail open
	}
}

/**
 * Helper to evaluate feature flags in load functions
 * 
 * @example
 * ```typescript
 * // +page.server.ts
 * export async function load(event) {
 *   const flags = await getServerFeatureFlags(event);
 *   return {
 *     showPreviewTools: flags.isOn('preview_tools_enabled'),
 *   };
 * }
 * ```
 */
export async function getServerFeatureFlags(event: RequestEvent): Promise<GrowthBook> {
	const gb = createServerGrowthBook(event);
	await loadServerFeatures(gb);
	return gb;
}

// =============================================================================
// TOOL GRADUATION LOGIC
// =============================================================================

export interface GraduationCriteria {
	minimumUsageCount: number;
	minimumUniqueUsers: number;
	maximumErrorRate: number;
	minimumFeedbackScore: number;
	minimumDaysInPreview: number;
}

export interface ToolMetrics {
	toolId: string;
	usageCount: number;
	uniqueUsers: number;
	errorCount: number;
	errorRate: number;
	likes: number;
	dislikes: number;
	feedbackScore: number;
	daysInPreview: number;
	firstUsed: Date;
	lastUsed: Date;
}

export interface GraduationResult {
	eligible: boolean;
	criteria: GraduationCriteria;
	metrics: ToolMetrics;
	failedCriteria: string[];
	recommendation: 'graduate' | 'continue_preview' | 'deprecate';
}

const DEFAULT_GRADUATION_CRITERIA: GraduationCriteria = {
	minimumUsageCount: 100,
	minimumUniqueUsers: 20,
	maximumErrorRate: 0.01, // 1%
	minimumFeedbackScore: 70, // 70% positive
	minimumDaysInPreview: 7,
};

/**
 * Evaluate if a preview tool should graduate to standard
 */
export function evaluateGraduation(
	metrics: ToolMetrics,
	criteria: GraduationCriteria = DEFAULT_GRADUATION_CRITERIA
): GraduationResult {
	const failedCriteria: string[] = [];
	
	if (metrics.usageCount < criteria.minimumUsageCount) {
		failedCriteria.push(`Usage count (${metrics.usageCount}) below minimum (${criteria.minimumUsageCount})`);
	}
	
	if (metrics.uniqueUsers < criteria.minimumUniqueUsers) {
		failedCriteria.push(`Unique users (${metrics.uniqueUsers}) below minimum (${criteria.minimumUniqueUsers})`);
	}
	
	if (metrics.errorRate > criteria.maximumErrorRate) {
		failedCriteria.push(`Error rate (${(metrics.errorRate * 100).toFixed(1)}%) above maximum (${criteria.maximumErrorRate * 100}%)`);
	}
	
	if (metrics.feedbackScore < criteria.minimumFeedbackScore) {
		failedCriteria.push(`Feedback score (${metrics.feedbackScore}%) below minimum (${criteria.minimumFeedbackScore}%)`);
	}
	
	if (metrics.daysInPreview < criteria.minimumDaysInPreview) {
		failedCriteria.push(`Days in preview (${metrics.daysInPreview}) below minimum (${criteria.minimumDaysInPreview})`);
	}
	
	const eligible = failedCriteria.length === 0;
	
	// Determine recommendation
	let recommendation: GraduationResult['recommendation'] = 'continue_preview';
	
	if (eligible) {
		recommendation = 'graduate';
	} else if (
		metrics.errorRate > criteria.maximumErrorRate * 5 || // 5x error rate
		(metrics.feedbackScore < 30 && metrics.usageCount > 50) // Very negative feedback with decent usage
	) {
		recommendation = 'deprecate';
	}
	
	return {
		eligible,
		criteria,
		metrics,
		failedCriteria,
		recommendation,
	};
}

// =============================================================================
// METRICS STORAGE (would use database in production)
// =============================================================================

// In-memory metrics store for demo purposes
// In production, this would be stored in a database
const toolMetricsStore = new Map<string, ToolMetrics>();

/**
 * Record a tool usage event
 */
export function recordToolMetric(
	toolId: string,
	eventType: 'use' | 'error' | 'like' | 'dislike',
	userId: string
): void {
	let metrics = toolMetricsStore.get(toolId);
	
	if (!metrics) {
		metrics = {
			toolId,
			usageCount: 0,
			uniqueUsers: 0,
			errorCount: 0,
			errorRate: 0,
			likes: 0,
			dislikes: 0,
			feedbackScore: 0,
			daysInPreview: 0,
			firstUsed: new Date(),
			lastUsed: new Date(),
		};
		toolMetricsStore.set(toolId, metrics);
	}
	
	const uniqueUsersSet = new Set<string>();
	
	switch (eventType) {
		case 'use':
			metrics.usageCount++;
			uniqueUsersSet.add(userId);
			metrics.uniqueUsers = uniqueUsersSet.size;
			break;
		case 'error':
			metrics.errorCount++;
			break;
		case 'like':
			metrics.likes++;
			break;
		case 'dislike':
			metrics.dislikes++;
			break;
	}
	
	// Recalculate derived metrics
	metrics.errorRate = metrics.usageCount > 0 
		? metrics.errorCount / metrics.usageCount 
		: 0;
	
	const totalFeedback = metrics.likes + metrics.dislikes;
	metrics.feedbackScore = totalFeedback > 0 
		? Math.round((metrics.likes / totalFeedback) * 100) 
		: 0;
	
	metrics.lastUsed = new Date();
	metrics.daysInPreview = Math.floor(
		(Date.now() - metrics.firstUsed.getTime()) / (1000 * 60 * 60 * 24)
	);
	
	toolMetricsStore.set(toolId, metrics);
}

/**
 * Get metrics for a tool
 */
export function getToolMetrics(toolId: string): ToolMetrics | null {
	return toolMetricsStore.get(toolId) || null;
}

/**
 * Get all tool metrics
 */
export function getAllToolMetrics(): ToolMetrics[] {
	return Array.from(toolMetricsStore.values());
}
