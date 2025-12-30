/**
 * Feature Flags - Svelte 5 Stores
 * 
 * Reactive stores for feature flags that work with Svelte 5 runes.
 * These stores automatically update when GrowthBook features change.
 */

import { browser } from '$app/environment';
import { 
	getGrowthBook, 
	isFeatureEnabled, 
	getToolConfig,
	type ToolStatus 
} from './growthbook.js';

// =============================================================================
// TYPES
// =============================================================================

export interface ToolInfo {
	id: string;
	name: string;
	description: string;
	icon: string;
	route: string;
	status: ToolStatus;
	enabled: boolean;
	isPreview: boolean;
}

// =============================================================================
// TOOL REGISTRY WITH STATUS
// =============================================================================

/**
 * Master registry of all tools with their metadata
 * Status is dynamically determined by feature flags
 */
export const TOOL_REGISTRY: Record<string, Omit<ToolInfo, 'status' | 'enabled' | 'isPreview'>> = {
	shuffler: {
		id: 'shuffler',
		name: 'Team Shuffler',
		description: 'Randomly assign participants to balanced teams',
		icon: '🎲',
		route: '/events/[eventId]/tools/shuffler',
	},
	timer: {
		id: 'timer',
		name: 'Session Timer',
		description: 'Full-screen countdown timer for sessions',
		icon: '⏱️',
		route: '/events/[eventId]/tools/timer',
	},
	poll: {
		id: 'poll',
		name: 'Quick Poll',
		description: 'Live voting and polling for participants',
		icon: '🗳️',
		route: '/events/[eventId]/tools/poll',
	},
	checkin: {
		id: 'checkin',
		name: 'QR Check-In',
		description: 'Scan QR codes to check in participants',
		icon: '📱',
		route: '/events/[eventId]/checkin',
	},
	survey: {
		id: 'survey',
		name: 'Survey Builder',
		description: 'Create and distribute surveys to participants',
		icon: '📋',
		route: '/events/[eventId]/tools/survey',
	},
};

// =============================================================================
// REACTIVE TOOL ACCESS
// =============================================================================

/**
 * Get full tool info including dynamic status from feature flags
 */
export function getToolInfo(toolId: string): ToolInfo | null {
	const baseTool = TOOL_REGISTRY[toolId];
	if (!baseTool) return null;
	
	const config = getToolConfig(toolId);
	
	return {
		...baseTool,
		status: config.status,
		enabled: config.enabled,
		isPreview: config.status === 'preview' || config.status === 'beta',
	};
}

/**
 * Get all tools with their current status
 */
export function getAllTools(): ToolInfo[] {
	return Object.keys(TOOL_REGISTRY)
		.map(getToolInfo)
		.filter((tool): tool is ToolInfo => tool !== null);
}

/**
 * Get only standard (non-preview) tools
 */
export function getStandardTools(): ToolInfo[] {
	return getAllTools().filter(tool => 
		tool.enabled && tool.status === 'standard'
	);
}

/**
 * Get only preview/beta tools
 */
export function getPreviewTools(): ToolInfo[] {
	const showPreview = isFeatureEnabled('preview_tools_enabled');
	if (!showPreview) return [];
	
	return getAllTools().filter(tool => 
		tool.enabled && (tool.status === 'preview' || tool.status === 'beta')
	);
}

/**
 * Check if preview tools should be shown to current user
 */
export function shouldShowPreviewTools(): boolean {
	return isFeatureEnabled('preview_tools_enabled');
}

// =============================================================================
// SVELTE 5 REACTIVE STATE
// =============================================================================

/**
 * Create a reactive feature flag state for Svelte 5
 * Use this in components to get automatic updates
 * 
 * @example
 * ```svelte
 * <script>
 *   import { createFeatureFlagState } from '$lib/feature-flags/stores';
 *   const flags = createFeatureFlagState();
 * </script>
 * 
 * {#if flags.previewToolsEnabled}
 *   <PreviewToolsBadge />
 * {/if}
 * ```
 */
export function createFeatureFlagState() {
	// These will be reactive when used with $state in components
	let previewToolsEnabled = $state(isFeatureEnabled('preview_tools_enabled'));
	let standardTools = $state(getStandardTools());
	let previewTools = $state(getPreviewTools());
	let allTools = $state(getAllTools());
	
	// Set up listener for feature updates (browser only)
	if (browser) {
		const gb = getGrowthBook();
		
		// GrowthBook emits events when features change
		gb.setRenderer(() => {
			previewToolsEnabled = isFeatureEnabled('preview_tools_enabled');
			standardTools = getStandardTools();
			previewTools = getPreviewTools();
			allTools = getAllTools();
		});
	}
	
	return {
		get previewToolsEnabled() { return previewToolsEnabled; },
		get standardTools() { return standardTools; },
		get previewTools() { return previewTools; },
		get allTools() { return allTools; },
	};
}

// =============================================================================
// FEEDBACK TRACKING
// =============================================================================

export interface ToolFeedback {
	toolId: string;
	likes: number;
	dislikes: number;
	comments: string[];
}

// In-memory feedback store (would be persisted in production)
const feedbackStore = new Map<string, ToolFeedback>();

/**
 * Record feedback for a tool
 */
export function recordToolFeedback(
	toolId: string, 
	type: 'like' | 'dislike',
	comment?: string
): void {
	let feedback = feedbackStore.get(toolId);
	
	if (!feedback) {
		feedback = {
			toolId,
			likes: 0,
			dislikes: 0,
			comments: [],
		};
		feedbackStore.set(toolId, feedback);
	}
	
	if (type === 'like') {
		feedback.likes++;
	} else {
		feedback.dislikes++;
	}
	
	if (comment) {
		feedback.comments.push(comment);
	}
}

/**
 * Get feedback stats for a tool
 */
export function getToolFeedback(toolId: string): ToolFeedback {
	return feedbackStore.get(toolId) || {
		toolId,
		likes: 0,
		dislikes: 0,
		comments: [],
	};
}

/**
 * Calculate feedback score (percentage of positive feedback)
 */
export function getToolFeedbackScore(toolId: string): number {
	const feedback = getToolFeedback(toolId);
	const total = feedback.likes + feedback.dislikes;
	if (total === 0) return 0;
	return Math.round((feedback.likes / total) * 100);
}
