/**
 * Zod validation schemas for runtime type checking
 */

import { z } from 'zod';
import {
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
	TemplatePermissionType,
	TemplateCategory
} from './enums';

// Base entity schema
export const BaseEntitySchema = z.object({
	id: z.string().min(1),
	createdAt: z.date(),
	updatedAt: z.date()
});

// Event schemas
export const EventSettingsSchema = z.object({
	allowGuestAccess: z.boolean(),
	requireRegistration: z.boolean(),
	enableVoting: z.boolean(),
	enableGroupIntelligence: z.boolean(),
	enableDiscussionGroups: z.boolean(),
	enableTeamDistribution: z.boolean(),
	votingTimeLimit: z.number().optional(),
	maxVotesPerTopic: z.number().min(1),
	maxTopicsPerUser: z.number().optional(),
	autoAdvanceActivities: z.boolean()
});

export const EventSchema = BaseEntitySchema.extend({
	title: z.string().min(1).max(200),
	description: z.string().max(1000),
	status: z.nativeEnum(EventStatus),
	organizerId: z.string().min(1),
	maxParticipants: z.number().min(1).max(1000).optional(),
	accessCode: z.string().min(1),
	qrCode: z.string().optional(),
	startTime: z.date().optional(),
	endTime: z.date().optional(),
	currentActivity: z.nativeEnum(ActivityType).optional(),
	settings: EventSettingsSchema,
	metadata: z.record(z.string(), z.unknown()).optional()
});

// User schemas
export const UserPreferencesSchema = z.object({
	language: z.string().min(2).max(10),
	notifications: z.boolean(),
	theme: z.enum(['light', 'dark', 'auto']),
	soundEnabled: z.boolean()
});

export const UserSchema = BaseEntitySchema.extend({
	name: z.string().min(1).max(100),
	email: z.string().email().optional(),
	role: z.nativeEnum(UserRole),
	isGuest: z.boolean(),
	avatar: z.string().url().optional(),
	currentEventId: z.string().optional(),
	lastActiveAt: z.date(),
	preferences: UserPreferencesSchema.optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
});

// Topic schema
export const TopicSchema = BaseEntitySchema.extend({
	title: z.string().min(1).max(200),
	description: z.string().max(1000).optional(),
	eventId: z.string().min(1),
	submittedBy: z.string().min(1),
	status: z.nativeEnum(TopicStatus),
	tags: z.array(z.string()).optional(),
	voteCount: z.number().min(0),
	totalVoteWeight: z.number().min(0),
	averageWeight: z.number().min(0),
	lastVotedAt: z.date().optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
});

// Vote schema
export const VoteSchema = BaseEntitySchema.extend({
	userId: z.string().min(1),
	topicId: z.string().min(1),
	eventId: z.string().min(1),
	weight: z.nativeEnum(VoteWeight),
	timestamp: z.date(),
	isActive: z.boolean(),
	metadata: z.record(z.string(), z.unknown()).optional()
});

// Session management schemas
export const RoundSettingsSchema = z.object({
	timerEnabled: z.boolean(),
	timerDuration: z.number().min(0).optional(),
	autoAdvance: z.boolean(),
	allowLateJoin: z.boolean(),
	maxParticipants: z.number().min(1).optional(),
	shuffleParticipants: z.boolean(),
	activitySpecificSettings: z.record(z.string(), z.unknown()).optional()
});

export const RoundResultsSchema = z.object({
	participantCount: z.number().min(0),
	completionRate: z.number().min(0).max(1),
	averageEngagement: z.number().min(0).max(1),
	topPerformers: z.array(z.string()).optional(),
	metrics: z.record(z.string(), z.number()),
	summary: z.string().optional()
});

export const RoundSchema = BaseEntitySchema.extend({
	eventId: z.string().min(1),
	roundNumber: z.number().min(1),
	activityType: z.nativeEnum(ActivityType),
	title: z.string().min(1).max(200),
	description: z.string().max(1000).optional(),
	startTime: z.date().optional(),
	endTime: z.date().optional(),
	duration: z.number().min(0).optional(),
	state: z.nativeEnum(ActivityState),
	settings: RoundSettingsSchema,
	results: RoundResultsSchema.optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
});

// Room schemas
export const RoomParticipantSchema = z.object({
	userId: z.string().min(1),
	joinedAt: z.date(),
	role: z.nativeEnum(UserRole),
	isActive: z.boolean(),
	lastActiveAt: z.date()
});

export const RoomMessageSchema = z.object({
	id: z.string().min(1),
	userId: z.string().min(1),
	content: z.string().min(1).max(1000),
	timestamp: z.date(),
	type: z.enum(['chat', 'system', 'announcement'])
});

export const RoomStateSchema = z.object({
	isActive: z.boolean(),
	currentPhase: z.string().optional(),
	timeRemaining: z.number().min(0).optional(),
	messages: z.array(RoomMessageSchema).optional(),
	activityData: z.record(z.string(), z.unknown()).optional()
});

export const RoomSchema = BaseEntitySchema.extend({
	eventId: z.string().min(1),
	roundId: z.string().optional(),
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	capacity: z.number().min(1).max(100),
	currentOccupancy: z.number().min(0),
	location: z.string().optional(),
	amenities: z.array(z.string()).optional(),
	isVirtual: z.boolean(),
	virtualUrl: z.string().url().optional(),
	participants: z.array(RoomParticipantSchema),
	currentActivity: z.nativeEnum(ActivityType).optional(),
	state: RoomStateSchema,
	facilitatorId: z.string().optional(),
	topicId: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
});

// Team schemas
export const TeamMemberSchema = z.object({
	userId: z.string().min(1),
	joinedAt: z.date(),
	role: z.nativeEnum(TeamMemberRole),
	contribution: z.number().min(0).optional(),
	isActive: z.boolean(),
	skills: z.array(z.string()).optional(),
	preferences: z.record(z.string(), z.unknown()).optional()
});

export const FormationCriteriaSchema = z.object({
	field: z.string().min(1),
	weight: z.number().min(0).max(1),
	type: z.enum(['balance', 'cluster', 'random']),
	target: z.union([z.string(), z.number()]).optional()
});

export const BalanceFactorSchema = z.object({
	attribute: z.string().min(1),
	importance: z.number().min(0).max(1),
	distribution: z.enum(['even', 'mixed', 'weighted'])
});

export const TeamConstraintSchema = z.object({
	type: z.enum(['size', 'skill', 'preference', 'exclusion']),
	value: z.union([z.string(), z.number()]),
	strict: z.boolean()
});

export const TeamFormationSchema = z.object({
	strategy: z.nativeEnum(FormationStrategy),
	criteria: z.array(FormationCriteriaSchema),
	balanceFactors: z.array(BalanceFactorSchema).optional(),
	constraints: z.array(TeamConstraintSchema).optional()
});

export const TeamSchema = BaseEntitySchema.extend({
	eventId: z.string().min(1),
	roundId: z.string().optional(),
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	color: z.string().optional(),
	members: z.array(TeamMemberSchema),
	maxSize: z.number().min(1).max(20),
	leaderId: z.string().optional(),
	roomId: z.string().optional(),
	score: z.number().min(0).optional(),
	status: z.nativeEnum(TeamStatus),
	formation: TeamFormationSchema,
	metadata: z.record(z.string(), z.unknown()).optional()
});

// Analytics schemas
export const AuditLogSchema = BaseEntitySchema.extend({
	userId: z.string().optional(),
	eventId: z.string().optional(),
	action: z.nativeEnum(AuditAction),
	entityType: z.nativeEnum(EntityType),
	entityId: z.string().min(1),
	oldValues: z.record(z.string(), z.unknown()).optional(),
	newValues: z.record(z.string(), z.unknown()).optional(),
	ipAddress: z.string().optional(),
	userAgent: z.string().optional(),
	sessionId: z.string().optional(),
	success: z.boolean(),
	error: z.string().optional(),
	duration: z.number().min(0).optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
});

// WebSocket event schemas
export const WebSocketEventSchema = z.object({
	type: z.nativeEnum(WebSocketEventType),
	eventId: z.string().min(1),
	userId: z.string().optional(),
	timestamp: z.date(),
	data: z.record(z.string(), z.unknown()),
	acknowledgmentId: z.string().optional()
});

// Validation utility functions
export function validateEvent(data: unknown): z.ZodSafeParseResult<z.infer<typeof EventSchema>> {
	return EventSchema.safeParse(data);
}

export function validateUser(data: unknown): z.ZodSafeParseResult<z.infer<typeof UserSchema>> {
	return UserSchema.safeParse(data);
}

export function validateTopic(data: unknown): z.ZodSafeParseResult<z.infer<typeof TopicSchema>> {
	return TopicSchema.safeParse(data);
}

export function validateVote(data: unknown): z.ZodSafeParseResult<z.infer<typeof VoteSchema>> {
	return VoteSchema.safeParse(data);
}

export function validateRoom(data: unknown): z.ZodSafeParseResult<z.infer<typeof RoomSchema>> {
	return RoomSchema.safeParse(data);
}

export function validateTeam(data: unknown): z.ZodSafeParseResult<z.infer<typeof TeamSchema>> {
	return TeamSchema.safeParse(data);
}

export function validateAuditLog(data: unknown): z.ZodSafeParseResult<z.infer<typeof AuditLogSchema>> {
	return AuditLogSchema.safeParse(data);
}

export function validateWebSocketEvent(data: unknown): z.ZodSafeParseResult<z.infer<typeof WebSocketEventSchema>> {
	return WebSocketEventSchema.safeParse(data);
}

// Generic validation helper
export function createValidationResult<T>(
	result: z.ZodSafeParseResult<T>
): { success: boolean; data?: T; errors?: string[] } {
	if (result.success) {
		return { success: true, data: result.data };
	} else {
		return {
			success: false,
			errors: result.error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`)
		};
	}
}

// Partial validation for updates
export const PartialEventSchema = EventSchema.partial();
export const PartialUserSchema = UserSchema.partial();
export const PartialTopicSchema = TopicSchema.partial();
export const PartialVoteSchema = VoteSchema.partial();
export const PartialRoomSchema = RoomSchema.partial();
export const PartialTeamSchema = TeamSchema.partial();

// Event Template schemas
export const TemplateTopicDataSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().max(1000).optional(),
	tags: z.array(z.string()).optional(),
	priority: z.enum(['high', 'medium', 'low']).optional()
});

export const TemplateRoomDataSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	capacity: z.number().min(1).max(100),
	location: z.string().optional(),
	amenities: z.array(z.string()).optional(),
	isVirtual: z.boolean().optional()
});

export const EventTemplateDataSchema = z.object({
	eventSettings: EventSettingsSchema,
	topics: z.array(TemplateTopicDataSchema).optional(),
	rooms: z.array(TemplateRoomDataSchema).optional(),
	assignmentSettings: z.object({
		maxRoomCapacity: z.number().min(1),
		minRoomSize: z.number().min(1),
		allowOverflow: z.boolean(),
		preferenceWeights: z.object({
			first: z.number(),
			second: z.number(),
			third: z.number()
		}),
		fairnessEnabled: z.boolean(),
		manualOverrideEnabled: z.boolean()
	}).optional(),
	generalSettings: z.object({
		defaultCapacity: z.number().min(1).optional(),
		defaultDuration: z.number().min(1).optional(),
		defaultTitle: z.string().optional(),
		defaultDescription: z.string().optional()
	}).optional()
});

export const EventTemplateSchema = BaseEntitySchema.extend({
	name: z.string().min(1).max(200),
	description: z.string().max(1000).optional(),
	category: z.nativeEnum(TemplateCategory),
	createdBy: z.string().min(1),
	isPublic: z.boolean(),
	sharedWith: z.array(z.string()),
	usageCount: z.number().min(0),
	lastUsedAt: z.date().optional(),
	templateData: EventTemplateDataSchema,
	tags: z.array(z.string()).optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
});

export const EventTemplatePermissionSchema = BaseEntitySchema.extend({
	templateId: z.string().min(1),
	userId: z.string().min(1),
	permission: z.nativeEnum(TemplatePermissionType),
	grantedBy: z.string().min(1),
	grantedAt: z.date()
});

// Template validation functions
export function validateEventTemplate(data: unknown): z.ZodSafeParseResult<z.infer<typeof EventTemplateSchema>> {
	return EventTemplateSchema.safeParse(data);
}

export function validateEventTemplatePermission(data: unknown): z.ZodSafeParseResult<z.infer<typeof EventTemplatePermissionSchema>> {
	return EventTemplatePermissionSchema.safeParse(data);
}

// Partial validation for updates
export const PartialEventTemplateSchema = EventTemplateSchema.partial();
export const PartialEventTemplatePermissionSchema = EventTemplatePermissionSchema.partial();

// Type inference from schemas
export type EventData = z.infer<typeof EventSchema>;
export type UserData = z.infer<typeof UserSchema>;
export type TopicData = z.infer<typeof TopicSchema>;
export type VoteData = z.infer<typeof VoteSchema>;
export type RoomData = z.infer<typeof RoomSchema>;
export type TeamData = z.infer<typeof TeamSchema>;
export type AuditLogData = z.infer<typeof AuditLogSchema>;
export type WebSocketEventData = z.infer<typeof WebSocketEventSchema>;
export type EventTemplateData = z.infer<typeof EventTemplateSchema>;
export type EventTemplatePermissionData = z.infer<typeof EventTemplatePermissionSchema>;