/**
 * Default Feature Flag Configurations
 * 
 * These are the default configurations for all tools and features.
 * They serve as fallbacks when GrowthBook is unavailable or flags aren't configured.
 * 
 * GRADUATED TOOLS: shuffler, timer, poll (status: 'standard')
 * PREVIEW TOOLS: checkin, survey (status: 'preview')
 */

import type { ToolFeatureConfig } from './growthbook.js';

// =============================================================================
// DEFAULT TOOL CONFIGURATIONS
// =============================================================================

/**
 * Default configurations for all tools.
 * These are used when GrowthBook flags aren't set.
 */
export const DEFAULT_TOOL_CONFIGS: Record<string, ToolFeatureConfig> = {
	// =========================================================================
	// GRADUATED TOOLS (Standard - fully released)
	// =========================================================================
	shuffler: {
		toolId: 'shuffler',
		status: 'standard',
		enabled: true,
		rolloutPercentage: 100,
		graduationThreshold: 70,
		minimumUsageCount: 100,
		minimumPreviewDays: 7,
	},
	timer: {
		toolId: 'timer',
		status: 'standard',
		enabled: true,
		rolloutPercentage: 100,
		graduationThreshold: 70,
		minimumUsageCount: 100,
		minimumPreviewDays: 7,
	},
	poll: {
		toolId: 'poll',
		status: 'standard',
		enabled: true,
		rolloutPercentage: 100,
		graduationThreshold: 70,
		minimumUsageCount: 100,
		minimumPreviewDays: 7,
	},
	
	// =========================================================================
	// PREVIEW TOOLS (Testing - collecting feedback)
	// =========================================================================
	checkin: {
		toolId: 'checkin',
		status: 'preview',
		enabled: true,
		rolloutPercentage: 100,
		graduationThreshold: 70,
		minimumUsageCount: 100,
		minimumPreviewDays: 7,
	},
	survey: {
		toolId: 'survey',
		status: 'preview',
		enabled: true,
		rolloutPercentage: 100,
		graduationThreshold: 70,
		minimumUsageCount: 100,
		minimumPreviewDays: 7,
	},
};

// =============================================================================
// DEFAULT FEATURE FLAGS
// =============================================================================

/**
 * Default feature flag values.
 * Used as fallbacks when GrowthBook is unavailable.
 */
export const DEFAULT_FLAGS: Record<string, boolean | string | number | object> = {
	// Tool visibility
	tool_shuffler_enabled: true,
	tool_timer_enabled: true,
	tool_poll_enabled: true,
	tool_checkin_enabled: true,
	tool_survey_enabled: true,
	
	// Preview tools toggle (show preview tools to users)
	preview_tools_enabled: true,
	
	// Feature experiments (A/B tests)
	experiment_new_shuffler_ui: false,
	experiment_poll_reactions: false,
	experiment_timer_sounds: false,
	
	// Tool configurations (JSON objects)
	tool_shuffler_config: DEFAULT_TOOL_CONFIGS.shuffler,
	tool_timer_config: DEFAULT_TOOL_CONFIGS.timer,
	tool_poll_config: DEFAULT_TOOL_CONFIGS.poll,
	tool_checkin_config: DEFAULT_TOOL_CONFIGS.checkin,
	tool_survey_config: DEFAULT_TOOL_CONFIGS.survey,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get default config for a tool
 */
export function getDefaultToolConfig(toolId: string): ToolFeatureConfig {
	return DEFAULT_TOOL_CONFIGS[toolId] || {
		toolId,
		status: 'preview',
		enabled: false,
		rolloutPercentage: 0,
		graduationThreshold: 70,
		minimumUsageCount: 100,
		minimumPreviewDays: 7,
	};
}

/**
 * Get default value for a feature flag
 */
export function getDefaultFlag<T>(key: string, fallback: T): T {
	const value = DEFAULT_FLAGS[key];
	return (value !== undefined ? value : fallback) as T;
}

/**
 * Check if a tool is graduated (standard status)
 */
export function isToolGraduated(toolId: string): boolean {
	const config = DEFAULT_TOOL_CONFIGS[toolId];
	return config?.status === 'standard';
}

/**
 * Get all graduated tools
 */
export function getGraduatedTools(): string[] {
	return Object.entries(DEFAULT_TOOL_CONFIGS)
		.filter(([, config]) => config.status === 'standard')
		.map(([toolId]) => toolId);
}

/**
 * Get all preview tools
 */
export function getPreviewToolsList(): string[] {
	return Object.entries(DEFAULT_TOOL_CONFIGS)
		.filter(([, config]) => config.status === 'preview' || config.status === 'beta')
		.map(([toolId]) => toolId);
}
