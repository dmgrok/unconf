/**
 * Integration tests for event validation and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	validateEventJoin,
	validateAccessCode,
	validateEventCapacity,
	validateGuestAccess,
	validateVotingLimits,
	validateUserPermissions,
	EventErrorCode
} from '../../lib/validation/event-validation';
import { UserRole, EventStatus } from '../../types/enums';
import type { Event, User } from '../../types/entities';

describe('Event Validation Integration', () => {
	let mockEvent: Event;
	let mockUser: User;

	beforeEach(() => {
		mockEvent = {
			id: 'event-1',
			title: 'Test Event',
			description: 'Test Description',
			status: EventStatus.ACTIVE,
			organizerId: 'org-1',
			accessCode: 'TEST123',
			maxParticipants: 50,
			settings: {
				allowGuestAccess: true,
				requireRegistration: false,
				enableVoting: true,
				enableGroupIntelligence: true,
				enableDiscussionGroups: true,
				enableTeamDistribution: true,
				maxVotesPerTopic: 3,
				autoAdvanceActivities: false
			},
			createdAt: new Date(),
			updatedAt: new Date()
		} as Event;

		mockUser = {
			id: 'user-1',
			name: 'Test User',
			email: 'test@example.com',
			role: UserRole.PARTICIPANT,
			isGuest: false,
			lastActiveAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date()
		} as User;
	});

	describe('Access Code Validation', () => {
		it('should accept correct access code', () => {
			const result = validateAccessCode(mockEvent, 'TEST123');
			expect(result.valid).toBe(true);
		});

		it('should reject incorrect access code', () => {
			const result = validateAccessCode(mockEvent, 'WRONG');
			expect(result.valid).toBe(false);
			expect(result.error?.code).toBe(EventErrorCode.INVALID_ACCESS_CODE);
		});

		it('should reject empty access code', () => {
			const result = validateAccessCode(mockEvent, '');
			expect(result.valid).toBe(false);
			expect(result.error?.code).toBe(EventErrorCode.INVALID_ACCESS_CODE);
		});

		it('should trim whitespace from access codes', () => {
			const result = validateAccessCode(mockEvent, '  TEST123  ');
			expect(result.valid).toBe(true);
		});

		it('should provide recovery suggestion on failure', () => {
			const result = validateAccessCode(mockEvent, 'WRONG');
			expect(result.error?.recoverySuggestion).toBeTruthy();
		});
	});

	describe('Event Capacity Validation', () => {
		it('should allow join when under capacity', () => {
			const result = validateEventCapacity(mockEvent, 25);
			expect(result.valid).toBe(true);
		});

		it('should reject when at capacity', () => {
			const result = validateEventCapacity(mockEvent, 50);
			expect(result.valid).toBe(false);
			expect(result.error?.code).toBe(EventErrorCode.EVENT_FULL);
		});

		it('should reject when over capacity', () => {
			const result = validateEventCapacity(mockEvent, 51);
			expect(result.valid).toBe(false);
		});

		it('should allow unlimited participants when maxParticipants is undefined', () => {
			mockEvent.maxParticipants = undefined;
			const result = validateEventCapacity(mockEvent, 1000);
			expect(result.valid).toBe(true);
		});

		it('should include capacity details in error', () => {
			const result = validateEventCapacity(mockEvent, 50);
			expect(result.error?.details).toBeTruthy();
			expect(result.error?.details?.capacity).toBe(50);
			expect(result.error?.details?.current).toBe(50);
		});
	});

	describe('Guest Access Validation', () => {
		it('should allow guest when guest access is enabled', () => {
			mockEvent.settings.allowGuestAccess = true;
			const result = validateGuestAccess(mockEvent, true);
			expect(result.valid).toBe(true);
		});

		it('should reject guest when guest access is disabled', () => {
			mockEvent.settings.allowGuestAccess = false;
			const result = validateGuestAccess(mockEvent, true);
			expect(result.valid).toBe(false);
			expect(result.error?.code).toBe(EventErrorCode.GUEST_ACCESS_DISABLED);
		});

		it('should allow registered user regardless of guest access setting', () => {
			mockEvent.settings.allowGuestAccess = false;
			const result = validateGuestAccess(mockEvent, false);
			expect(result.valid).toBe(true);
		});
	});

	describe('Voting Limits Validation', () => {
		it('should allow voting under limit', () => {
			const result = validateVotingLimits(mockEvent, 2);
			expect(result.valid).toBe(true);
		});

		it('should reject voting at limit', () => {
			const result = validateVotingLimits(mockEvent, 3);
			expect(result.valid).toBe(false);
			expect(result.error?.code).toBe(EventErrorCode.VOTING_LIMIT_REACHED);
		});

		it('should provide vote counts in error details', () => {
			const result = validateVotingLimits(mockEvent, 3);
			expect(result.error?.details?.maxVotes).toBe(3);
			expect(result.error?.details?.currentVotes).toBe(3);
		});

		it('should suggest removing a vote in recovery suggestion', () => {
			const result = validateVotingLimits(mockEvent, 3);
			expect(result.error?.recoverySuggestion).toContain('Remove');
		});
	});

	describe('User Permissions Validation', () => {
		it('should allow user with sufficient role', () => {
			const result = validateUserPermissions(UserRole.PARTICIPANT, UserRole.PARTICIPANT);
			expect(result.valid).toBe(true);
		});

		it('should allow higher role to access lower requirement', () => {
			const result = validateUserPermissions(UserRole.PARTICIPANT, UserRole.ORGANIZER);
			expect(result.valid).toBe(true);
		});

		it('should reject user with insufficient role', () => {
			const result = validateUserPermissions(UserRole.ORGANIZER, UserRole.GUEST);
			expect(result.valid).toBe(false);
			expect(result.error?.code).toBe(EventErrorCode.INVALID_PERMISSIONS);
		});

		it('should include role details in error', () => {
			const result = validateUserPermissions(UserRole.ORGANIZER, UserRole.GUEST);
			expect(result.error?.details?.required).toBe(UserRole.ORGANIZER);
			expect(result.error?.details?.current).toBe(UserRole.GUEST);
		});
	});

	describe('Comprehensive Event Join Validation', () => {
		it('should pass all validations for valid join request', () => {
			const result = validateEventJoin({
				event: mockEvent,
				accessCode: 'TEST123',
				user: mockUser,
				currentParticipants: 25,
				isAlreadyJoined: false
			});

			expect(result.valid).toBe(true);
		});

		it('should reject if event is null', () => {
			const result = validateEventJoin({
				event: null,
				accessCode: 'TEST123',
				user: mockUser,
				currentParticipants: 25,
				isAlreadyJoined: false
			});

			expect(result.valid).toBe(false);
			expect(result.error?.code).toBe(EventErrorCode.EVENT_NOT_FOUND);
		});

		it('should reject if already joined', () => {
			const result = validateEventJoin({
				event: mockEvent,
				accessCode: 'TEST123',
				user: mockUser,
				currentParticipants: 25,
				isAlreadyJoined: true
			});

			expect(result.valid).toBe(false);
			expect(result.error?.code).toBe(EventErrorCode.ALREADY_JOINED);
		});

		it('should reject if event is completed', () => {
			mockEvent.status = EventStatus.COMPLETED;

			const result = validateEventJoin({
				event: mockEvent,
				accessCode: 'TEST123',
				user: mockUser,
				currentParticipants: 25,
				isAlreadyJoined: false
			});

			expect(result.valid).toBe(false);
			expect(result.error?.code).toBe(EventErrorCode.EVENT_ENDED);
		});

		it('should reject if event is at capacity', () => {
			const result = validateEventJoin({
				event: mockEvent,
				accessCode: 'TEST123',
				user: mockUser,
				currentParticipants: 50,
				isAlreadyJoined: false
			});

			expect(result.valid).toBe(false);
			expect(result.error?.code).toBe(EventErrorCode.EVENT_FULL);
		});

		it('should reject guest when guest access is disabled', () => {
			mockEvent.settings.allowGuestAccess = false;
			mockUser.isGuest = true;

			const result = validateEventJoin({
				event: mockEvent,
				accessCode: 'TEST123',
				user: mockUser,
				currentParticipants: 25,
				isAlreadyJoined: false
			});

			expect(result.valid).toBe(false);
			expect(result.error?.code).toBe(EventErrorCode.GUEST_ACCESS_DISABLED);
		});

		it('should reject when registration required but user has no email', () => {
			mockEvent.settings.requireRegistration = true;
			mockUser.email = undefined;

			const result = validateEventJoin({
				event: mockEvent,
				accessCode: 'TEST123',
				user: mockUser,
				currentParticipants: 25,
				isAlreadyJoined: false
			});

			expect(result.valid).toBe(false);
			expect(result.error?.code).toBe(EventErrorCode.REGISTRATION_REQUIRED);
		});

		it('should perform validations in correct order', () => {
			// Set up multiple failing conditions
			mockEvent.status = EventStatus.COMPLETED;
			mockEvent.settings.allowGuestAccess = false;
			mockUser.isGuest = true;

			const result = validateEventJoin({
				event: mockEvent,
				accessCode: 'WRONG',
				user: mockUser,
				currentParticipants: 55,
				isAlreadyJoined: false
			});

			// Should fail on first check (access code)
			expect(result.valid).toBe(false);
			expect(result.error?.code).toBe(EventErrorCode.INVALID_ACCESS_CODE);
		});
	});

	describe('Error Messages and Recovery', () => {
		it('should provide user-friendly error messages', () => {
			const result = validateAccessCode(mockEvent, 'WRONG');
			expect(result.error?.message).toBeTruthy();
			expect(result.error?.message.length).toBeGreaterThan(0);
		});

		it('should provide recovery suggestions for all errors', () => {
			const validations = [
				validateAccessCode(mockEvent, ''),
				validateEventCapacity(mockEvent, 50),
				validateGuestAccess({ ...mockEvent, settings: { ...mockEvent.settings, allowGuestAccess: false } }, true),
				validateVotingLimits(mockEvent, 3)
			];

			validations.forEach((result) => {
				if (!result.valid) {
					expect(result.error?.recoverySuggestion).toBeTruthy();
				}
			});
		});

		it('should include contextual details for debugging', () => {
			const result = validateEventCapacity(mockEvent, 50);
			expect(result.error?.details).toBeTruthy();
		});
	});
});
