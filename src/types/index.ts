/**
 * Centralized type exports and validation utilities for the UnConf platform
 */

// Import types for local use within this file
import type { Event as EventType, User as UserType, Topic as TopicType, Vote as VoteType } from './entities';
import {
	UserRole as _UserRole,
	EventStatus as _EventStatus,
	WebSocketEventType as _WebSocketEventType,
	ROLE_HIERARCHY as _ROLE_HIERARCHY
} from './enums';
import {
	validateUser as _validateUser,
	validateEvent as _validateEvent,
	validateTopic as _validateTopic,
	validateVote as _validateVote
} from './schemas';

// Re-export all core entity types
export type {
	BaseEntity,
	Event,
	EventSettings,
	User,
	UserPreferences,
	Topic,
	Vote
} from './entities';

// Re-export all enums from enums.ts (canonical source)
export {
	UserRole,
	ActivityType,
	VoteWeight,
	EventStatus,
	TopicStatus,
	ActivityState,
	ConnectionStatus,
	AuditAction,
	EntityType,
	WebSocketEventType,
	TeamStatus,
	TeamMemberRole,
	FormationStrategy,
	VOTE_WEIGHTS,
	ROLE_HIERARCHY,
	DEFAULT_SETTINGS,
	isValidUserRole,
	isValidActivityType,
	isValidVoteWeight,
	isValidEventStatus,
	isValidTopicStatus,
	isValidActivityState,
	isValidConnectionStatus,
	isValidAuditAction,
	isValidEntityType,
	isValidWebSocketEventType,
	hasPermission
} from './enums';

// Re-export session management types
export type {
	Round,
	RoundSettings,
	RoundResults,
	Room,
	RoomParticipant,
	RoomState,
	RoomMessage,
	Team,
	TeamMember,
	TeamFormation,
	FormationCriteria,
	BalanceFactor,
	TeamConstraint,
	ActivityOrchestration,
	ActivityTimer,
	TimerWarning,
	ParticipantState,
	OrchestrationSettings,
	ActivityTransition
} from './session';

export {
	isValidTeamStatus,
	isValidTeamMemberRole,
	isValidFormationStrategy,
	calculateTeamBalance,
	isRoomAvailable,
	getTeamCapacity
} from './session';

// Re-export analytics and audit types
export type {
	AuditLog,
	EventAnalytics,
	EventMetrics,
	ParticipationMetrics,
	EngagementMetrics,
	PerformanceMetrics,
	VotingAnalytics,
	ActivityAnalytics,
	AnalyticsSummary,
	TimeRange,
	TimeSlotMetric,
	DemographicMetric,
	ScalabilityMetric,
	VoteDistribution,
	TopicPopularityMetric,
	VoteProgression,
	VotingPattern,
	ActivityFeedback,
	ComparisonMetric,
	LiveAnalytics,
	RealtimeMetric,
	AnalyticsAlert,
	LivePerformance,
	AnalyticsExport,
	ExportMetadata
} from './analytics';

export {
	calculateEngagementScore,
	generateAnalyticsSummary,
	isAlertCritical,
	calculateTrend
} from './analytics';

// Re-export all Zod schemas and validation functions
export {
	BaseEntitySchema,
	EventSchema,
	EventSettingsSchema,
	UserSchema,
	UserPreferencesSchema,
	TopicSchema,
	VoteSchema,
	RoundSchema,
	RoundSettingsSchema,
	RoundResultsSchema,
	RoomSchema,
	RoomParticipantSchema,
	RoomMessageSchema,
	RoomStateSchema,
	TeamSchema,
	TeamMemberSchema,
	TeamFormationSchema,
	FormationCriteriaSchema,
	BalanceFactorSchema,
	TeamConstraintSchema,
	AuditLogSchema,
	WebSocketEventSchema,
	PartialEventSchema,
	PartialUserSchema,
	PartialTopicSchema,
	PartialVoteSchema,
	PartialRoomSchema,
	PartialTeamSchema,
	validateEvent,
	validateUser,
	validateTopic,
	validateVote,
	validateRoom,
	validateTeam,
	validateAuditLog,
	validateWebSocketEvent,
	createValidationResult
} from './schemas';

// Re-export inferred types from schemas
export type {
	EventData,
	UserData,
	TopicData,
	VoteData,
	RoomData,
	TeamData,
	AuditLogData,
	WebSocketEventData
} from './schemas';

// Additional utility types for the application
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// API response types
export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
	errors?: string[];
	message?: string;
	timestamp: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// WebSocket message types
export interface WebSocketMessage<T = unknown> {
	type: _WebSocketEventType;
	eventId: string;
	userId?: string;
	timestamp: string;
	data: T;
	acknowledgmentId?: string;
}

// Error types
export interface ValidationError {
	field: string;
	message: string;
	code: string;
}

export interface ApiError {
	code: string;
	message: string;
	details?: Record<string, unknown>;
	stack?: string;
}

// Permission types
export interface Permission {
	action: string;
	resource: string;
	conditions?: Record<string, unknown>;
}

export interface RolePermissions {
	role: _UserRole;
	permissions: Permission[];
}

// Configuration types
export interface AppConfig {
	environment: 'development' | 'staging' | 'production';
	apiUrl: string;
	wsUrl: string;
	maxFileSize: number;
	supportedLanguages: string[];
	features: Record<string, boolean>;
}

// Utility functions for type validation and manipulation
export function isValidId(id: unknown): id is string {
	return typeof id === 'string' && id.length > 0;
}

export function isValidEmail(email: unknown): email is string {
	if (typeof email !== 'string') return false;
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function isValidUrl(url: unknown): url is string {
	if (typeof url !== 'string') return false;
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

export function isValidDate(date: unknown): date is Date {
	return date instanceof Date && !isNaN(date.getTime());
}

export function isNonEmptyArray<T>(arr: unknown): arr is T[] {
	return Array.isArray(arr) && arr.length > 0;
}

export function isRecord(obj: unknown): obj is Record<string, unknown> {
	return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

// Type assertion helpers
export function assertIsUser(obj: unknown): asserts obj is UserType {
	const result = _validateUser(obj);
	if (!result.success) {
		throw new Error(`Invalid user object: ${result.error?.issues.map(i => i.message).join(', ')}`);
	}
}

export function assertIsEvent(obj: unknown): asserts obj is EventType {
	const result = _validateEvent(obj);
	if (!result.success) {
		throw new Error(`Invalid event object: ${result.error?.issues.map(i => i.message).join(', ')}`);
	}
}

export function assertIsTopic(obj: unknown): asserts obj is TopicType {
	const result = _validateTopic(obj);
	if (!result.success) {
		throw new Error(`Invalid topic object: ${result.error?.issues.map(i => i.message).join(', ')}`);
	}
}

export function assertIsVote(obj: unknown): asserts obj is VoteType {
	const result = _validateVote(obj);
	if (!result.success) {
		throw new Error(`Invalid vote object: ${result.error?.issues.map(i => i.message).join(', ')}`);
	}
}

// Safe parsing utilities
export function safeParseJson<T = unknown>(json: string): T | null {
	try {
		return JSON.parse(json) as T;
	} catch {
		return null;
	}
}

export function safeStringify(obj: unknown): string | null {
	try {
		return JSON.stringify(obj);
	} catch {
		return null;
	}
}

// Role-based access control utilities
export function canUserAccessEvent(userRole: _UserRole, eventStatus: _EventStatus): boolean {
	// Admins can access any event
	if (userRole === _UserRole.ADMIN) return true;

	// Organizers can access their events in any status
	if (userRole === _UserRole.ORGANIZER) return true;

	// Participants and guests can only access active events
	return eventStatus === _EventStatus.ACTIVE;
}

export function canUserPerformAction(
	userRole: _UserRole,
	action: string,
	resource: string,
	context?: Record<string, unknown>
): boolean {
	// Basic role hierarchy check
	const roleLevel = _ROLE_HIERARCHY[userRole];

	// Define action requirements
	const actionRequirements: Record<string, number> = {
		'create_event': _ROLE_HIERARCHY[_UserRole.ORGANIZER],
		'delete_event': _ROLE_HIERARCHY[_UserRole.ADMIN],
		'manage_users': _ROLE_HIERARCHY[_UserRole.ADMIN],
		'create_topic': _ROLE_HIERARCHY[_UserRole.PARTICIPANT],
		'vote': _ROLE_HIERARCHY[_UserRole.PARTICIPANT],
		'join_event': _ROLE_HIERARCHY[_UserRole.GUEST]
	};

	const requiredLevel = actionRequirements[`${action}_${resource}`] ??
		actionRequirements[action] ??
		_ROLE_HIERARCHY[_UserRole.ADMIN];

	return roleLevel >= requiredLevel;
}

// Data transformation utilities
export function sanitizeUserForPublic(user: UserType): Omit<UserType, 'email' | 'metadata'> {
	const { email, metadata, ...publicUser } = user;
	return publicUser;
}

export function sanitizeEventForPublic(event: EventType): Omit<EventType, 'metadata'> {
	const { metadata, ...publicEvent } = event;
	return publicEvent;
}

// Constants for the application
export const APP_CONSTANTS = {
	MAX_PARTICIPANTS_PER_EVENT: 200,
	MAX_TOPICS_PER_USER: 5,
	MAX_VOTES_PER_TOPIC: 3,
	MIN_VOTING_TIME: 30, // seconds
	MAX_VOTING_TIME: 3600, // seconds
	DEFAULT_VOTING_TIME: 300, // seconds
	MAX_EVENT_TITLE_LENGTH: 200,
	MAX_TOPIC_TITLE_LENGTH: 200,
	MAX_DESCRIPTION_LENGTH: 1000,
	HEARTBEAT_INTERVAL: 30000, // milliseconds
	RECONNECT_TIMEOUT: 5000, // milliseconds
	MAX_RECONNECT_ATTEMPTS: 5
} as const;
