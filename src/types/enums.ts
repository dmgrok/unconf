/**
 * Enums and constants for the UnConf platform
 */

// User role enumeration
export enum UserRole {
	GUEST = 'guest',
	PARTICIPANT = 'participant',
	ORGANIZER = 'organizer',
	ADMIN = 'admin'
}

// Activity type enumeration for event orchestration
export enum ActivityType {
	VOTING = 'voting',
	GROUP_INTELLIGENCE = 'intelligence',
	DISCUSSION_GROUPS = 'discussion',
	TEAM_DISTRIBUTION = 'teams'
}

// Vote weight enumeration for weighted voting system
export enum VoteWeight {
	FIRST = 'first',
	SECOND = 'second',
	THIRD = 'third'
}

// Event status enumeration
export enum EventStatus {
	DRAFT = 'draft',
	ACTIVE = 'active',
	PAUSED = 'paused',
	COMPLETED = 'completed'
}

// Topic status enumeration
export enum TopicStatus {
	DRAFT = 'draft',
	ACTIVE = 'active',
	FROZEN = 'frozen',
	ARCHIVED = 'archived'
}

// Activity state enumeration for real-time orchestration
export enum ActivityState {
	IDLE = 'idle',
	PREPARING = 'preparing',
	ACTIVE = 'active',
	PAUSED = 'paused',
	COMPLETED = 'completed',
	ERROR = 'error'
}

// Connection status for WebSocket monitoring
export enum ConnectionStatus {
	CONNECTING = 'connecting',
	CONNECTED = 'connected',
	DISCONNECTED = 'disconnected',
	RECONNECTING = 'reconnecting',
	ERROR = 'error'
}

// Audit action types for logging
export enum AuditAction {
	CREATE = 'create',
	UPDATE = 'update',
	DELETE = 'delete',
	LOGIN = 'login',
	LOGOUT = 'logout',
	VOTE = 'vote',
	ACTIVITY_CHANGE = 'activity_change',
	JOIN_EVENT = 'join_event',
	LEAVE_EVENT = 'leave_event',
	ROLE_CHANGED = 'role_changed'
}

// Entity types for audit logging
export enum EntityType {
	EVENT = 'event',
	USER = 'user',
	TOPIC = 'topic',
	VOTE = 'vote',
	ROUND = 'round',
	ROOM = 'room',
	TEAM = 'team'
}

// WebSocket event types
export enum WebSocketEventType {
	ACTIVITY_STATE_CHANGE = 'activity_state_change',
	VOTE_UPDATE = 'vote_update',
	TOPIC_UPDATE = 'topic_update',
	USER_JOIN = 'user_join',
	USER_LEAVE = 'user_leave',
	TIMER_UPDATE = 'timer_update',
	TEAM_ASSIGNMENT = 'team_assignment',
	ERROR = 'error',
	HEARTBEAT = 'heartbeat'
}

// Constants for vote calculations
export const VOTE_WEIGHTS: Record<VoteWeight, number> = {
	[VoteWeight.FIRST]: 3,
	[VoteWeight.SECOND]: 2,
	[VoteWeight.THIRD]: 1
};

// Role hierarchy for permission checking
export const ROLE_HIERARCHY: Record<UserRole, number> = {
	[UserRole.GUEST]: 0,
	[UserRole.PARTICIPANT]: 1,
	[UserRole.ORGANIZER]: 2,
	[UserRole.ADMIN]: 3
};

// Default settings constants
export const DEFAULT_SETTINGS = {
	MAX_PARTICIPANTS: 200,
	DEFAULT_VOTING_TIME_LIMIT: 300, // 5 minutes
	MAX_VOTES_PER_TOPIC: 3,
	MAX_TOPICS_PER_USER: 5,
	HEARTBEAT_INTERVAL: 30000, // 30 seconds
	RECONNECT_TIMEOUT: 5000, // 5 seconds
	MAX_RECONNECT_ATTEMPTS: 5
} as const;

// Type guards for runtime validation
export function isValidUserRole(role: string): role is UserRole {
	return Object.values(UserRole).includes(role as UserRole);
}

export function isValidActivityType(activity: string): activity is ActivityType {
	return Object.values(ActivityType).includes(activity as ActivityType);
}

export function isValidVoteWeight(weight: string): weight is VoteWeight {
	return Object.values(VoteWeight).includes(weight as VoteWeight);
}

export function isValidEventStatus(status: string): status is EventStatus {
	return Object.values(EventStatus).includes(status as EventStatus);
}

export function isValidTopicStatus(status: string): status is TopicStatus {
	return Object.values(TopicStatus).includes(status as TopicStatus);
}

export function isValidActivityState(state: string): state is ActivityState {
	return Object.values(ActivityState).includes(state as ActivityState);
}

export function isValidConnectionStatus(status: string): status is ConnectionStatus {
	return Object.values(ConnectionStatus).includes(status as ConnectionStatus);
}

export function isValidAuditAction(action: string): action is AuditAction {
	return Object.values(AuditAction).includes(action as AuditAction);
}

export function isValidEntityType(type: string): type is EntityType {
	return Object.values(EntityType).includes(type as EntityType);
}

export function isValidWebSocketEventType(type: string): type is WebSocketEventType {
	return Object.values(WebSocketEventType).includes(type as WebSocketEventType);
}

// Team and session management enums
export enum TeamStatus {
	FORMING = 'forming',
	ACTIVE = 'active',
	PAUSED = 'paused',
	COMPLETED = 'completed',
	DISBANDED = 'disbanded'
}

export enum TeamMemberRole {
	MEMBER = 'member',
	LEADER = 'leader',
	CO_LEADER = 'co_leader',
	FACILITATOR = 'facilitator'
}

export enum FormationStrategy {
	RANDOM = 'random',
	BALANCED = 'balanced',
	SKILL_BASED = 'skill_based',
	PREFERENCE_BASED = 'preference_based',
	MANUAL = 'manual',
	HYBRID = 'hybrid'
}

// Discussion room status enumeration
export enum DiscussionRoomStatus {
	DRAFT = 'draft',
	ACTIVE = 'active',
	FULL = 'full',
	PAUSED = 'paused',
	COMPLETED = 'completed',
	ARCHIVED = 'archived'
}

// Assignment method enumeration
export enum AssignmentMethod {
	AUTOMATIC = 'automatic',
	MANUAL = 'manual',
	OVERFLOW = 'overflow',
	REBALANCE = 'rebalance'
}

// Assignment status enumeration
export enum AssignmentStatus {
	PENDING = 'pending',
	ASSIGNED = 'assigned',
	CONFIRMED = 'confirmed',
	MOVED = 'moved',
	CANCELLED = 'cancelled'
}

// Assignment round status enumeration
export enum AssignmentRoundStatus {
	PLANNING = 'planning',
	IN_PROGRESS = 'in_progress',
	COMPLETED = 'completed',
	FAILED = 'failed',
	CANCELLED = 'cancelled'
}

// Event template permission types
export enum TemplatePermissionType {
	VIEW = 'view',
	USE = 'use',
	EDIT = 'edit',
	SHARE = 'share',
	ADMIN = 'admin'
}

// Event template categories
export enum TemplateCategory {
	CONFERENCE = 'conference',
	WORKSHOP = 'workshop',
	MEETING = 'meeting',
	HACKATHON = 'hackathon',
	NETWORKING = 'networking',
	TRAINING = 'training',
	CUSTOM = 'custom'
}

// Type guards for templates
export function isValidTemplatePermission(permission: string): permission is TemplatePermissionType {
	return Object.values(TemplatePermissionType).includes(permission as TemplatePermissionType);
}

export function isValidTemplateCategory(category: string): category is TemplateCategory {
	return Object.values(TemplateCategory).includes(category as TemplateCategory);
}

// Utility function to check role permissions
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
	return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}