/**
 * Core entity interfaces for the UnConf platform
 */

import type {
	DiscussionRoomStatus,
	AssignmentMethod,
	AssignmentStatus,
	AssignmentRoundStatus,
	TemplatePermissionType
} from './enums';

// Base interface for all entities
export interface BaseEntity {
	id: string;
	createdAt: Date;
	updatedAt: Date;
}

// Event-related interfaces
export interface Event extends BaseEntity {
	title: string;
	description: string;
	status: 'draft' | 'active' | 'paused' | 'completed';
	organizerId: string;
	maxParticipants?: number;
	accessCode: string;
	qrCode?: string;
	startTime?: Date;
	endTime?: Date;
	currentActivity?: ActivityType;
	settings: EventSettings;
	metadata?: Record<string, unknown>;
}

export interface EventSettings {
	allowGuestAccess: boolean;
	requireRegistration: boolean;
	enableVoting: boolean;
	enableGroupIntelligence: boolean;
	enableDiscussionGroups: boolean;
	enableTeamDistribution: boolean;
	votingTimeLimit?: number; // in seconds
	maxVotesPerTopic: number;
	maxTopicsPerUser?: number;
	autoAdvanceActivities: boolean;
}

// User-related interfaces
export interface User extends BaseEntity {
	name: string;
	email?: string;
	role: UserRole;
	isGuest: boolean;
	avatar?: string;
	currentEventId?: string;
	lastActiveAt: Date;
	preferences?: UserPreferences;
	metadata?: Record<string, unknown>;
}

export interface UserPreferences {
	language: string;
	notifications: boolean;
	theme: 'light' | 'dark' | 'auto';
	soundEnabled: boolean;
}

// Topic-related interfaces
export interface Topic extends BaseEntity {
	title: string;
	description?: string;
	eventId: string;
	submittedBy: string; // User ID
	status: 'draft' | 'active' | 'frozen' | 'archived';
	tags?: string[];
	voteCount: number;
	totalVoteWeight: number;
	averageWeight: number;
	lastVotedAt?: Date;
	metadata?: Record<string, unknown>;
}

// Vote-related interfaces
export interface Vote extends BaseEntity {
	userId: string;
	topicId: string;
	eventId: string;
	weight: VoteWeight;
	timestamp: Date;
	isActive: boolean;
	metadata?: Record<string, unknown>;
}

// Enums for type safety
export enum UserRole {
	GUEST = 'guest',
	PARTICIPANT = 'participant',
	ORGANIZER = 'organizer',
	ADMIN = 'admin'
}

export enum ActivityType {
	VOTING = 'voting',
	GROUP_INTELLIGENCE = 'intelligence',
	DISCUSSION_GROUPS = 'discussion',
	TEAM_DISTRIBUTION = 'teams'
}

// Discussion Group interfaces
export interface DiscussionRoom extends BaseEntity {
	eventId: string;
	topicId: string;
	name: string;
	description?: string;
	capacity: number;
	currentOccupancy: number;
	status: DiscussionRoomStatus;
	location?: string;
	amenities?: string[];
	facilitator?: string; // User ID
	assignedParticipants: string[]; // User IDs
	metadata?: Record<string, unknown>;
}

export interface RoomAssignment extends BaseEntity {
	eventId: string;
	userId: string;
	roomId: string;
	topicId: string;
	assignmentRound: number;
	assignmentMethod: AssignmentMethod;
	preferenceRank?: number; // 1st, 2nd, 3rd choice
	assignedAt: Date;
	status: AssignmentStatus;
	metadata?: Record<string, unknown>;
}

export interface AssignmentRound extends BaseEntity {
	eventId: string;
	roundNumber: number;
	status: AssignmentRoundStatus;
	startedAt: Date;
	completedAt?: Date;
	totalParticipants: number;
	assignedParticipants: number;
	settings: AssignmentSettings;
	results?: AssignmentResults;
	metadata?: Record<string, unknown>;
}

export interface AssignmentSettings {
	maxRoomCapacity: number;
	minRoomSize: number;
	allowOverflow: boolean;
	preferenceWeights: {
		first: number;
		second: number;
		third: number;
	};
	fairnessEnabled: boolean;
	manualOverrideEnabled: boolean;
}

export interface AssignmentResults {
	totalSatisfactionScore: number;
	averageSatisfactionScore: number;
	preferenceDistribution: {
		firstChoice: number;
		secondChoice: number;
		thirdChoice: number;
		unassigned: number;
	};
	roomUtilization: {
		roomId: string;
		capacity: number;
		assigned: number;
		utilizationRate: number;
	}[];
}

export enum VoteWeight {
	FIRST = 'first',
	SECOND = 'second',
	THIRD = 'third'
}

export enum EventStatus {
	DRAFT = 'draft',
	ACTIVE = 'active',
	PAUSED = 'paused',
	COMPLETED = 'completed'
}

export enum TopicStatus {
	DRAFT = 'draft',
	ACTIVE = 'active',
	FROZEN = 'frozen',
	ARCHIVED = 'archived'
}

// Weight values for vote calculations
export const VOTE_WEIGHTS: Record<VoteWeight, number> = {
	[VoteWeight.FIRST]: 3,
	[VoteWeight.SECOND]: 2,
	[VoteWeight.THIRD]: 1
};

// Type guards for runtime type checking
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

// Event Template interfaces
export interface EventTemplate extends BaseEntity {
	name: string;
	description?: string;
	category: string;
	createdBy: string; // User ID
	isPublic: boolean;
	sharedWith: string[]; // User IDs with access
	usageCount: number;
	lastUsedAt?: Date;
	templateData: EventTemplateData;
	tags?: string[];
	metadata?: Record<string, unknown>;
}

export interface EventTemplateData {
	eventSettings: EventSettings;
	topics?: TemplateTopicData[];
	rooms?: TemplateRoomData[];
	assignmentSettings?: AssignmentSettings;
	generalSettings?: {
		defaultCapacity?: number;
		defaultDuration?: number;
		defaultTitle?: string;
		defaultDescription?: string;
	};
}

export interface TemplateTopicData {
	title: string;
	description?: string;
	tags?: string[];
	priority?: 'high' | 'medium' | 'low';
}

export interface TemplateRoomData {
	name: string;
	description?: string;
	capacity: number;
	location?: string;
	amenities?: string[];
	isVirtual?: boolean;
}

export interface EventTemplatePermission extends BaseEntity {
	templateId: string;
	userId: string;
	permission: TemplatePermissionType;
	grantedBy: string; // User ID who granted permission
	grantedAt: Date;
}

