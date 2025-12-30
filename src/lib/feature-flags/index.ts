/**
 * Feature Flags Module
 * 
 * Re-exports all feature flag functionality for convenient imports.
 * 
 * @example
 * ```typescript
 * // Client-side
 * import { isFeatureEnabled, trackToolUsage } from '$lib/feature-flags';
 * 
 * // Server-side
 * import { getServerFeatureFlags } from '$lib/feature-flags/server';
 * ```
 */

// Core GrowthBook functionality
export {
	initGrowthBook,
	getGrowthBook,
	loadFeatures,
	updateUserAttributes,
	destroyGrowthBook,
	isFeatureEnabled,
	getFeatureValue,
	getFeature,
	getToolConfig,
	isToolAvailable,
	getAvailableTools,
	trackToolUsage,
	trackToolFeedback,
	getToolUsageStats,
	getExposureLog,
	getUsageEvents,
	TOOL_FLAGS,
	type ToolStatus,
	type ToolFeatureConfig,
	type FeatureFlagUser,
	type ExperimentExposure,
} from './growthbook.js';

// Svelte stores and UI helpers
export {
	TOOL_REGISTRY,
	getToolInfo,
	getAllTools,
	getStandardTools,
	getPreviewTools,
	shouldShowPreviewTools,
	createFeatureFlagState,
	recordToolFeedback,
	getToolFeedback,
	getToolFeedbackScore,
	type ToolInfo,
	type ToolFeedback,
} from './stores.js';

// Default configurations
export {
	DEFAULT_TOOL_CONFIGS,
	DEFAULT_FLAGS,
	getDefaultToolConfig,
	getDefaultFlag,
	isToolGraduated,
	getGraduatedTools,
	getPreviewToolsList,
} from './defaults.js';
