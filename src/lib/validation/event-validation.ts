/**
 * Event validation utilities for join requests and participation
 */

import type { Event, User } from '../../types/entities';
import { EventStatus, UserRole } from '../../types/enums';

export interface ValidationResult {
	valid: boolean;
	error?: ValidationError;
}

export interface ValidationError {
	code: string;
	message: string;
	details?: Record<string, unknown>;
	recoverySuggestion?: string;
}

export enum EventErrorCode {
	EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',
	EVENT_INVALID = 'EVENT_INVALID',
	EVENT_FULL = 'EVENT_FULL',
	EVENT_ENDED = 'EVENT_ENDED',
	EVENT_NOT_STARTED = 'EVENT_NOT_STARTED',
	INVALID_ACCESS_CODE = 'INVALID_ACCESS_CODE',
	ACCESS_DENIED = 'ACCESS_DENIED',
	GUEST_ACCESS_DISABLED = 'GUEST_ACCESS_DISABLED',
	REGISTRATION_REQUIRED = 'REGISTRATION_REQUIRED',
	SESSION_EXPIRED = 'SESSION_EXPIRED',
	INVALID_PERMISSIONS = 'INVALID_PERMISSIONS',
	ACTIVITY_NOT_AVAILABLE = 'ACTIVITY_NOT_AVAILABLE',
	VOTING_LIMIT_REACHED = 'VOTING_LIMIT_REACHED',
	TOPIC_LIMIT_REACHED = 'TOPIC_LIMIT_REACHED',
	ALREADY_JOINED = 'ALREADY_JOINED',
	INVALID_EVENT_STATE = 'INVALID_EVENT_STATE'
}

/**
 * Validate event access code
 */
export function validateAccessCode(
	event: Event,
	providedCode: string
): ValidationResult {
	if (!providedCode) {
		return {
			valid: false,
			error: {
				code: EventErrorCode.INVALID_ACCESS_CODE,
				message: 'Access code is required to join this event',
				recoverySuggestion: 'Please enter the event access code provided by the organizer'
			}
		};
	}

	if (providedCode.trim() !== event.accessCode.trim()) {
		return {
			valid: false,
			error: {
				code: EventErrorCode.INVALID_ACCESS_CODE,
				message: 'Invalid access code',
				recoverySuggestion: 'Please check the access code and try again'
			}
		};
	}

	return { valid: true };
}

/**
 * Validate event exists and is valid
 */
export function validateEventExists(event: Event | null): ValidationResult {
	if (!event) {
		return {
			valid: false,
			error: {
				code: EventErrorCode.EVENT_NOT_FOUND,
				message: 'Event not found',
				recoverySuggestion: 'Please check the event code and try again'
			}
		};
	}

	return { valid: true };
}

/**
 * Validate event status allows joining
 */
export function validateEventStatus(event: Event): ValidationResult {
	if (event.status === EventStatus.COMPLETED) {
		return {
			valid: false,
			error: {
				code: EventErrorCode.EVENT_ENDED,
				message: 'This event has already ended',
				recoverySuggestion: 'Contact the organizer for information about future events'
			}
		};
	}

	if (event.status === EventStatus.DRAFT) {
		return {
			valid: false,
			error: {
				code: EventErrorCode.EVENT_NOT_STARTED,
				message: 'This event has not started yet',
				recoverySuggestion: 'Please wait for the organizer to start the event'
			}
		};
	}

	if (event.status === EventStatus.PAUSED) {
		return {
			valid: false,
			error: {
				code: EventErrorCode.INVALID_EVENT_STATE,
				message: 'This event is currently paused',
				recoverySuggestion: 'Please wait for the organizer to resume the event'
			}
		};
	}

	return { valid: true };
}

/**
 * Validate event capacity
 */
export function validateEventCapacity(
	event: Event,
	currentParticipants: number
): ValidationResult {
	if (event.maxParticipants && currentParticipants >= event.maxParticipants) {
		return {
			valid: false,
			error: {
				code: EventErrorCode.EVENT_FULL,
				message: `This event is full (${currentParticipants}/${event.maxParticipants} participants)`,
				details: {
					capacity: event.maxParticipants,
					current: currentParticipants
				},
				recoverySuggestion: 'Contact the organizer to request additional capacity'
			}
		};
	}

	return { valid: true };
}

/**
 * Validate guest access permissions
 */
export function validateGuestAccess(event: Event, isGuest: boolean): ValidationResult {
	if (isGuest && !event.settings.allowGuestAccess) {
		return {
			valid: false,
			error: {
				code: EventErrorCode.GUEST_ACCESS_DISABLED,
				message: 'Guest access is not allowed for this event',
				recoverySuggestion: 'Please create an account or contact the organizer'
			}
		};
	}

	return { valid: true };
}

/**
 * Validate user registration requirements
 */
export function validateRegistrationRequirement(
	event: Event,
	user: User
): ValidationResult {
	if (event.settings.requireRegistration && !user.email) {
		return {
			valid: false,
			error: {
				code: EventErrorCode.REGISTRATION_REQUIRED,
				message: 'Registration is required to join this event',
				recoverySuggestion: 'Please complete your registration with a valid email address'
			}
		};
	}

	return { valid: true };
}

/**
 * Validate user permissions for action
 */
export function validateUserPermissions(
	requiredRole: UserRole,
	userRole: UserRole
): ValidationResult {
	const roleHierarchy: Record<UserRole, number> = {
		[UserRole.GUEST]: 0,
		[UserRole.PARTICIPANT]: 1,
		[UserRole.ORGANIZER]: 2,
		[UserRole.ADMIN]: 3
	};

	if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
		return {
			valid: false,
			error: {
				code: EventErrorCode.INVALID_PERMISSIONS,
				message: 'You do not have permission to perform this action',
				details: {
					required: requiredRole,
					current: userRole
				},
				recoverySuggestion: 'Contact the event organizer if you believe this is an error'
			}
		};
	}

	return { valid: true };
}

/**
 * Validate activity availability
 */
export function validateActivityAvailable(
	event: Event,
	activitySetting: keyof typeof event.settings
): ValidationResult {
	if (!event.settings[activitySetting]) {
		return {
			valid: false,
			error: {
				code: EventErrorCode.ACTIVITY_NOT_AVAILABLE,
				message: 'This activity is not enabled for this event',
				recoverySuggestion: 'Contact the organizer to enable this feature'
			}
		};
	}

	return { valid: true };
}

/**
 * Validate voting limits
 */
export function validateVotingLimits(
	event: Event,
	currentVotes: number
): ValidationResult {
	const maxVotes = event.settings.maxVotesPerTopic;

	if (currentVotes >= maxVotes) {
		return {
			valid: false,
			error: {
				code: EventErrorCode.VOTING_LIMIT_REACHED,
				message: `You have reached the maximum number of votes (${maxVotes})`,
				details: {
					maxVotes,
					currentVotes
				},
				recoverySuggestion: 'Remove an existing vote to vote for a different topic'
			}
		};
	}

	return { valid: true };
}

/**
 * Validate topic submission limits
 */
export function validateTopicLimits(
	event: Event,
	currentTopics: number
): ValidationResult {
	const maxTopics = event.settings.maxTopicsPerUser;

	if (maxTopics !== undefined && currentTopics >= maxTopics) {
		return {
			valid: false,
			error: {
				code: EventErrorCode.TOPIC_LIMIT_REACHED,
				message: `You have reached the maximum number of topics (${maxTopics})`,
				details: {
					maxTopics,
					currentTopics
				},
				recoverySuggestion: 'Delete an existing topic to submit a new one'
			}
		};
	}

	return { valid: true };
}

/**
 * Validate session is active
 */
export function validateSession(sessionData: {
	expiresAt: Date;
	isActive: boolean;
}): ValidationResult {
	if (!sessionData.isActive) {
		return {
			valid: false,
			error: {
				code: EventErrorCode.SESSION_EXPIRED,
				message: 'Your session has expired',
				recoverySuggestion: 'Please refresh the page and rejoin the event'
			}
		};
	}

	if (new Date() > sessionData.expiresAt) {
		return {
			valid: false,
			error: {
				code: EventErrorCode.SESSION_EXPIRED,
				message: 'Your session has expired',
				recoverySuggestion: 'Please refresh the page and rejoin the event'
			}
		};
	}

	return { valid: true };
}

/**
 * Comprehensive event join validation
 */
export function validateEventJoin(params: {
	event: Event | null;
	accessCode: string;
	user: User;
	currentParticipants: number;
	isAlreadyJoined?: boolean;
}): ValidationResult {
	const { event, accessCode, user, currentParticipants, isAlreadyJoined } = params;

	// Check if already joined
	if (isAlreadyJoined) {
		return {
			valid: false,
			error: {
				code: EventErrorCode.ALREADY_JOINED,
				message: 'You have already joined this event',
				recoverySuggestion: 'Refresh the page to see the event dashboard'
			}
		};
	}

	// Validate event exists
	let result = validateEventExists(event);
	if (!result.valid) return result;

	// From this point, event is guaranteed to be non-null
	const validEvent = event!;

	// Validate access code
	result = validateAccessCode(validEvent, accessCode);
	if (!result.valid) return result;

	// Validate event status
	result = validateEventStatus(validEvent);
	if (!result.valid) return result;

	// Validate capacity
	result = validateEventCapacity(validEvent, currentParticipants);
	if (!result.valid) return result;

	// Validate guest access
	result = validateGuestAccess(validEvent, user.isGuest);
	if (!result.valid) return result;

	// Validate registration requirements
	result = validateRegistrationRequirement(validEvent, user);
	if (!result.valid) return result;

	return { valid: true };
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: ValidationError): string {
	let message = error.message;

	if (error.recoverySuggestion) {
		message += `\n\n${error.recoverySuggestion}`;
	}

	return message;
}

/**
 * Create validation error
 */
export function createValidationError(
	code: EventErrorCode,
	message: string,
	details?: Record<string, unknown>,
	recoverySuggestion?: string
): ValidationError {
	return {
		code,
		message,
		details,
		recoverySuggestion
	};
}
