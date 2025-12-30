/**
 * GrowthBook Feature Flags Integration for SvelteKit
 * 
 * Provides feature flag and A/B testing capabilities for trunk-based development.
 * Tools can be marked as 'preview' and graduate to 'standard' based on metrics.
 * 
 * @see https://docs.growthbook.io/lib/js
 */

import { GrowthBook, type Context, type FeatureResult } from '@growthbook/growthbook';
import { browser } from '$app/environment';

// =============================================================================
// TYPES
// =============================================================================

export type ToolStatus = 'standard' | 'preview' | 'beta' | 'deprecated';

export interface ToolFeatureConfig {
	/** Unique identifier for the tool */
	toolId: string;
	/** Current status of the tool */
	status: ToolStatus;
	/** Whether the tool is enabled (can be toggled via GrowthBook) */
	enabled: boolean;
	/** Percentage of users who see this tool (0-100) */
	rolloutPercentage: number;
	/** Minimum feedback score to graduate (0-100) */
	graduationThreshold?: number;
	/** Minimum usage count to graduate */
	minimumUsageCount?: number;
	/** Days in preview before graduation eligibility */
	minimumPreviewDays?: number;
}

export interface FeatureFlagUser {
	id: string;
	role: 'organizer' | 'participant' | 'guest';
	isGuest: boolean;
	eventId?: string;
	/** Custom attributes for targeting */
	attributes?: Record<string, string | number | boolean>;
}

export interface ExperimentExposure {
	experimentId: string;
	variationId: string;
	userId: string;
	timestamp: Date;
	attributes?: Record<string, unknown>;
}

// =============================================================================
// GROWTHBOOK CLIENT
// =============================================================================

let growthbookInstance: GrowthBook | null = null;
const exposureLog: ExperimentExposure[] = [];

/**
 * Initialize GrowthBook client
 * Should be called once on app startup (client-side) or per-request (server-side)
 */
export function initGrowthBook(user?: FeatureFlagUser): GrowthBook {
	const clientKey = import.meta.env.VITE_GROWTHBOOK_CLIENT_KEY || 'sdk-VQW82OY28wqny0K';
	
	const context: Context = {
		apiHost: 'https://cdn.growthbook.io',
		clientKey,
		enableDevMode: import.meta.env.DEV,
		// Track experiment exposures for analytics
		trackingCallback: (experiment, result) => {
			const exposure: ExperimentExposure = {
				experimentId: experiment.key,
				variationId: String(result.variationId),
				userId: user?.id || 'anonymous',
				timestamp: new Date(),
				attributes: user?.attributes,
			};
			exposureLog.push(exposure);
			
			// Log in dev mode
			if (import.meta.env.DEV) {
				console.log('[GrowthBook] Experiment exposure:', exposure);
			}
			
			// Send to analytics (implement your own tracking)
			trackExperimentExposure(exposure);
		},
		attributes: user ? {
			id: user.id,
			role: user.role,
			isGuest: user.isGuest,
			eventId: user.eventId,
			...user.attributes,
		} : {},
	};

	growthbookInstance = new GrowthBook(context);
	return growthbookInstance;
}

/**
 * Get the current GrowthBook instance
 * Creates a new one if not initialized
 */
export function getGrowthBook(): GrowthBook {
	if (!growthbookInstance) {
		growthbookInstance = initGrowthBook();
	}
	return growthbookInstance;
}

/**
 * Load feature flags from GrowthBook CDN
 * Call this after initialization to fetch latest flags
 */
export async function loadFeatures(): Promise<void> {
	const gb = getGrowthBook();
	try {
		await gb.loadFeatures({ autoRefresh: browser });
	} catch (error) {
		console.error('[GrowthBook] Failed to load features:', error);
		// Continue with defaults - feature flags should fail open
	}
}

/**
 * Update user attributes (e.g., after login or joining event)
 */
export function updateUserAttributes(attributes: Partial<FeatureFlagUser>): void {
	const gb = getGrowthBook();
	const currentAttrs = gb.getAttributes();
	gb.setAttributes({
		...currentAttrs,
		...attributes,
	});
}

/**
 * Clean up GrowthBook instance
 */
export function destroyGrowthBook(): void {
	if (growthbookInstance) {
		growthbookInstance.destroy();
		growthbookInstance = null;
	}
}

// =============================================================================
// FEATURE FLAG HELPERS
// =============================================================================

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(featureKey: string): boolean {
	const gb = getGrowthBook();
	return gb.isOn(featureKey);
}

/**
 * Get feature value with type safety
 */
export function getFeatureValue<T>(featureKey: string, defaultValue: T): T {
	const gb = getGrowthBook();
	const result = gb.getFeatureValue(featureKey, defaultValue);
	return result as T;
}

/**
 * Get full feature result (includes experiment info)
 */
export function getFeature<T>(featureKey: string): FeatureResult<T | null> {
	const gb = getGrowthBook();
	return gb.evalFeature<T>(featureKey);
}

// =============================================================================
// TOOL-SPECIFIC FLAGS
// =============================================================================

/** Feature flag keys for tools */
export const TOOL_FLAGS = {
	// Tool visibility flags
	SHUFFLER_ENABLED: 'tool_shuffler_enabled',
	TIMER_ENABLED: 'tool_timer_enabled',
	POLL_ENABLED: 'tool_poll_enabled',
	CHECKIN_ENABLED: 'tool_checkin_enabled',
	SURVEY_ENABLED: 'tool_survey_enabled',
	
	// Preview tools (new features in testing)
	PREVIEW_TOOLS_ENABLED: 'preview_tools_enabled',
	
	// Tool configurations
	SHUFFLER_CONFIG: 'tool_shuffler_config',
	TIMER_CONFIG: 'tool_timer_config',
	POLL_CONFIG: 'tool_poll_config',
	
	// Feature experiments
	NEW_SHUFFLER_UI: 'experiment_new_shuffler_ui',
	POLL_REACTIONS: 'experiment_poll_reactions',
	TIMER_SOUNDS: 'experiment_timer_sounds',
} as const;

/**
 * Get tool configuration from feature flags
 * Uses defaults from defaults.ts when GrowthBook flag isn't set
 */
export function getToolConfig(toolId: string): ToolFeatureConfig {
	const flagKey = `tool_${toolId}_config`;
	
	// Import defaults dynamically to avoid circular dependencies
	const defaultConfigs: Record<string, ToolFeatureConfig> = {
		// GRADUATED TOOLS (Standard)
		shuffler: { toolId: 'shuffler', status: 'standard', enabled: true, rolloutPercentage: 100, graduationThreshold: 70, minimumUsageCount: 100, minimumPreviewDays: 7 },
		timer: { toolId: 'timer', status: 'standard', enabled: true, rolloutPercentage: 100, graduationThreshold: 70, minimumUsageCount: 100, minimumPreviewDays: 7 },
		poll: { toolId: 'poll', status: 'standard', enabled: true, rolloutPercentage: 100, graduationThreshold: 70, minimumUsageCount: 100, minimumPreviewDays: 7 },
		// PREVIEW TOOLS
		checkin: { toolId: 'checkin', status: 'preview', enabled: true, rolloutPercentage: 100, graduationThreshold: 70, minimumUsageCount: 100, minimumPreviewDays: 7 },
		survey: { toolId: 'survey', status: 'preview', enabled: true, rolloutPercentage: 100, graduationThreshold: 70, minimumUsageCount: 100, minimumPreviewDays: 7 },
	};
	
	const defaultConfig = defaultConfigs[toolId] || {
		toolId,
		status: 'preview' as ToolStatus,
		enabled: false,
		rolloutPercentage: 0,
		graduationThreshold: 70,
		minimumUsageCount: 100,
		minimumPreviewDays: 7,
	};
	
	return getFeatureValue<ToolFeatureConfig>(flagKey, defaultConfig);
}

/**
 * Check if a tool is available for the current user
 */
export function isToolAvailable(toolId: string): boolean {
	const config = getToolConfig(toolId);
	
	// Tool must be enabled
	if (!config.enabled) return false;
	
	// Check preview tools setting for preview/beta tools
	if (config.status === 'preview' || config.status === 'beta') {
		if (!isFeatureEnabled(TOOL_FLAGS.PREVIEW_TOOLS_ENABLED)) {
			return false;
		}
	}
	
	// Deprecated tools are hidden
	if (config.status === 'deprecated') return false;
	
	return true;
}

/**
 * Get all available tools for the current user
 */
export function getAvailableTools(): string[] {
	const allTools = ['shuffler', 'timer', 'poll', 'checkin', 'survey'];
	return allTools.filter(isToolAvailable);
}

// =============================================================================
// ANALYTICS TRACKING
// =============================================================================

interface ToolUsageEvent {
	type: 'tool_open' | 'tool_complete' | 'tool_error' | 'tool_feedback';
	toolId: string;
	userId: string;
	eventId?: string;
	metadata?: Record<string, unknown>;
	timestamp: Date;
}

const usageEvents: ToolUsageEvent[] = [];

/**
 * Track experiment exposure (called by GrowthBook tracking callback)
 */
function trackExperimentExposure(exposure: ExperimentExposure): void {
	// In production, send to your analytics service
	// Example: PostHog, Mixpanel, custom backend
	if (browser && typeof window !== 'undefined') {
		// Could dispatch custom event for analytics
		window.dispatchEvent(new CustomEvent('growthbook:exposure', { 
			detail: exposure 
		}));
	}
}

/**
 * Track tool usage for graduation metrics
 */
export function trackToolUsage(
	type: ToolUsageEvent['type'],
	toolId: string,
	userId: string,
	eventId?: string,
	metadata?: Record<string, unknown>
): void {
	const event: ToolUsageEvent = {
		type,
		toolId,
		userId,
		eventId,
		metadata,
		timestamp: new Date(),
	};
	
	usageEvents.push(event);
	
	// In dev mode, log events
	if (import.meta.env.DEV) {
		console.log('[ToolUsage]', event);
	}
	
	// Dispatch for external analytics
	if (browser && typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('tool:usage', { detail: event }));
	}
}

/**
 * Track tool feedback (likes/dislikes)
 */
export function trackToolFeedback(
	toolId: string,
	userId: string,
	feedback: 'like' | 'dislike',
	comment?: string
): void {
	trackToolUsage('tool_feedback', toolId, userId, undefined, {
		feedback,
		comment,
	});
}

/**
 * Get usage statistics for a tool (for graduation decisions)
 */
export function getToolUsageStats(toolId: string): {
	totalUses: number;
	uniqueUsers: number;
	errorRate: number;
	feedbackScore: number;
} {
	const toolEvents = usageEvents.filter(e => e.toolId === toolId);
	const opens = toolEvents.filter(e => e.type === 'tool_open');
	const errors = toolEvents.filter(e => e.type === 'tool_error');
	const feedbacks = toolEvents.filter(e => e.type === 'tool_feedback');
	
	const uniqueUsers = new Set(opens.map(e => e.userId)).size;
	const likes = feedbacks.filter(e => e.metadata?.feedback === 'like').length;
	const dislikes = feedbacks.filter(e => e.metadata?.feedback === 'dislike').length;
	const totalFeedback = likes + dislikes;
	
	return {
		totalUses: opens.length,
		uniqueUsers,
		errorRate: opens.length > 0 ? errors.length / opens.length : 0,
		feedbackScore: totalFeedback > 0 ? (likes / totalFeedback) * 100 : 0,
	};
}

/**
 * Get all experiment exposures (for debugging/analytics)
 */
export function getExposureLog(): ExperimentExposure[] {
	return [...exposureLog];
}

/**
 * Get all usage events (for debugging/analytics)
 */
export function getUsageEvents(): ToolUsageEvent[] {
	return [...usageEvents];
}
