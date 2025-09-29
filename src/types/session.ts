/**
 * Session management interfaces for rounds, rooms, and teams
 */

import type { BaseEntity } from './entities';
import type { ActivityType, ActivityState, UserRole } from './enums';
import { TeamStatus, TeamMemberRole, FormationStrategy } from './enums';

// Round management for activity sessions
export interface Round extends BaseEntity {
	eventId: string;
	roundNumber: number;
	activityType: ActivityType;
	title: string;
	description?: string;
	startTime?: Date;
	endTime?: Date;
	duration?: number; // in seconds
	state: ActivityState;
	settings: RoundSettings;
	results?: RoundResults;
	metadata?: Record<string, unknown>;
}

export interface RoundSettings {
	timerEnabled: boolean;
	timerDuration?: number; // in seconds
	autoAdvance: boolean;
	allowLateJoin: boolean;
	maxParticipants?: number;
	shuffleParticipants: boolean;
	activitySpecificSettings?: Record<string, unknown>;
}

export interface RoundResults {
	participantCount: number;
	completionRate: number;
	averageEngagement: number;
	topPerformers?: string[]; // User IDs
	metrics: Record<string, number>;
	summary?: string;
}

// Room management for discussion groups
export interface Room extends BaseEntity {
	eventId: string;
	roundId?: string;
	name: string;
	description?: string;
	capacity: number;
	currentOccupancy: number;
	location?: string;
	amenities?: string[];
	isVirtual: boolean;
	virtualUrl?: string;
	participants: RoomParticipant[];
	currentActivity?: ActivityType;
	state: RoomState;
	facilitatorId?: string;
	topicId?: string; // For discussion rounds
	metadata?: Record<string, unknown>;
}

export interface RoomParticipant {
	userId: string;
	joinedAt: Date;
	role: UserRole;
	isActive: boolean;
	lastActiveAt: Date;
}

export interface RoomState {
	isActive: boolean;
	currentPhase?: string;
	timeRemaining?: number; // in seconds
	messages?: RoomMessage[];
	activityData?: Record<string, unknown>;
}

export interface RoomMessage {
	id: string;
	userId: string;
	content: string;
	timestamp: Date;
	type: 'chat' | 'system' | 'announcement';
}

// Team management for distribution and collaboration
export interface Team extends BaseEntity {
	eventId: string;
	roundId?: string;
	name: string;
	description?: string;
	color?: string;
	members: TeamMember[];
	maxSize: number;
	leaderId?: string;
	roomId?: string;
	score?: number;
	status: TeamStatus;
	formation: TeamFormation;
	metadata?: Record<string, unknown>;
}

export interface TeamMember {
	userId: string;
	joinedAt: Date;
	role: TeamMemberRole;
	contribution?: number;
	isActive: boolean;
	skills?: string[];
	preferences?: Record<string, unknown>;
}

export interface TeamFormation {
	strategy: FormationStrategy;
	criteria: FormationCriteria[];
	balanceFactors?: BalanceFactor[];
	constraints?: TeamConstraint[];
}

export interface FormationCriteria {
	field: string;
	weight: number;
	type: 'balance' | 'cluster' | 'random';
	target?: string | number;
}

export interface BalanceFactor {
	attribute: string;
	importance: number;
	distribution: 'even' | 'mixed' | 'weighted';
}

export interface TeamConstraint {
	type: 'size' | 'skill' | 'preference' | 'exclusion';
	value: string | number;
	strict: boolean;
}

// Activity orchestration state
export interface ActivityOrchestration extends BaseEntity {
	eventId: string;
	currentRoundId?: string;
	currentActivity: ActivityType;
	state: ActivityState;
	timer?: ActivityTimer;
	participants: ParticipantState[];
	rooms?: Room[];
	teams?: Team[];
	settings: OrchestrationSettings;
	history: ActivityTransition[];
	metadata?: Record<string, unknown>;
}

export interface ActivityTimer {
	startTime: Date;
	duration: number; // in seconds
	remainingTime: number;
	isActive: boolean;
	isPaused: boolean;
	warnings?: TimerWarning[];
}

export interface TimerWarning {
	threshold: number; // seconds remaining
	message: string;
	triggered: boolean;
}

export interface ParticipantState {
	userId: string;
	currentActivity: ActivityType;
	isActive: boolean;
	lastHeartbeat: Date;
	connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
	currentRoomId?: string;
	currentTeamId?: string;
	progress?: Record<string, unknown>;
}

export interface OrchestrationSettings {
	maxConcurrentActivities: number;
	heartbeatInterval: number; // in milliseconds
	timeoutThreshold: number; // in milliseconds
	autoAdvance: boolean;
	requireAcknowledgment: boolean;
	broadcastLatencyLimit: number; // in milliseconds
}

export interface ActivityTransition {
	id: string;
	fromActivity?: ActivityType;
	toActivity: ActivityType;
	timestamp: Date;
	triggeredBy: string; // User ID
	duration: number; // milliseconds
	participantCount: number;
	acknowledgments: number;
	latency: number; // milliseconds
	success: boolean;
	error?: string;
}


// Type guards for session management
export function isValidTeamStatus(status: string): status is TeamStatus {
	return Object.values(TeamStatus).includes(status as TeamStatus);
}

export function isValidTeamMemberRole(role: string): role is TeamMemberRole {
	return Object.values(TeamMemberRole).includes(role as TeamMemberRole);
}

export function isValidFormationStrategy(strategy: string): strategy is FormationStrategy {
	return Object.values(FormationStrategy).includes(strategy as FormationStrategy);
}

// Utility functions for session management
export function calculateTeamBalance(team: Team, criteria: FormationCriteria[]): number {
	// Implementation would calculate balance score based on criteria
	return 0; // Placeholder
}

export function isRoomAvailable(room: Room): boolean {
	return room.currentOccupancy < room.capacity && room.state.isActive;
}

export function getTeamCapacity(team: Team): { current: number; max: number; available: number } {
	return {
		current: team.members.length,
		max: team.maxSize,
		available: team.maxSize - team.members.length
	};
}