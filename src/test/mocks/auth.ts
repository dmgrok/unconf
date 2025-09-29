import { vi } from 'vitest';
import type { Session } from '@auth/core/types';
import type { UserRole } from '../../types/enums';

export interface MockUser {
	id: string;
	email: string;
	name: string;
	image?: string;
	role?: UserRole;
	isGuest?: boolean;
	sessionId?: string;
	permissions?: string[];
}

export const mockUsers = {
	organizer: {
		id: 'organizer-1',
		email: 'organizer@example.com',
		name: 'Test Organizer',
		image: 'https://example.com/organizer-avatar.jpg',
		role: 'organizer' as UserRole,
		isGuest: false,
		permissions: ['create_event', 'manage_participants', 'switch_activity', 'view_analytics']
	},
	facilitator: {
		id: 'facilitator-1',
		email: 'facilitator@example.com',
		name: 'Test Facilitator',
		image: 'https://example.com/facilitator-avatar.jpg',
		role: 'facilitator' as UserRole,
		isGuest: false,
		permissions: ['manage_activities', 'moderate_discussions', 'assign_teams']
	},
	participant: {
		id: 'participant-1',
		email: 'participant@example.com',
		name: 'Test Participant',
		image: 'https://example.com/participant-avatar.jpg',
		role: 'participant' as UserRole,
		isGuest: false,
		permissions: ['vote', 'submit_proposals', 'join_discussions']
	},
	guest: {
		id: 'guest-1',
		email: 'guest@example.com',
		name: 'Test Guest',
		role: 'guest' as UserRole,
		isGuest: true,
		sessionId: 'guest-session-123',
		permissions: ['vote', 'join_discussions']
	}
};

export const mockUser = mockUsers.participant;

export const mockSession: Session = {
	user: mockUser,
	expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

export const mockAuthHandlers = {
	signIn: vi.fn().mockResolvedValue({ ok: true, error: null }),
	signOut: vi.fn().mockResolvedValue({ ok: true, error: null }),
	getSession: vi.fn().mockResolvedValue(mockSession)
};

// Mock page data for SvelteKit
export const mockPageData = {
	session: mockSession,
	user: mockUser
};

// Mock different auth states
export const createMockSession = (overrides: Partial<Session> = {}): Session => ({
	...mockSession,
	...overrides
});

export const createMockUser = (userType: keyof typeof mockUsers = 'participant', overrides: Partial<MockUser> = {}): MockUser => ({
	...mockUsers[userType],
	...overrides
});

// Helper to mock authenticated state
export function mockAuthenticatedState(userType: keyof typeof mockUsers = 'participant', sessionOverrides?: Partial<Session>) {
	const user = mockUsers[userType];
	const session = createMockSession({
		user,
		...sessionOverrides
	});

	return {
		session,
		user
	};
}

// Helper to mock unauthenticated state
export function mockUnauthenticatedState() {
	return {
		session: null,
		user: null
	};
}

// Advanced auth state management
export class MockAuthStateManager {
	private currentUser: MockUser | null = null;
	private currentSession: Session | null = null;
	private authErrors: string[] = [];

	// Set current authenticated user
	authenticateAs(userType: keyof typeof mockUsers, sessionOverrides?: Partial<Session>): void {
		this.currentUser = mockUsers[userType];
		this.currentSession = createMockSession({
			user: this.currentUser,
			...sessionOverrides
		});
		this.authErrors = [];
	}

	// Sign out current user
	signOut(): void {
		this.currentUser = null;
		this.currentSession = null;
		this.authErrors = [];
	}

	// Add authentication error
	addError(error: string): void {
		this.authErrors.push(error);
	}

	// Get current state
	getState() {
		return {
			user: this.currentUser,
			session: this.currentSession,
			isAuthenticated: !!this.currentUser,
			errors: [...this.authErrors],
			hasErrors: this.authErrors.length > 0
		};
	}

	// Check permissions
	hasPermission(permission: string): boolean {
		return this.currentUser?.permissions?.includes(permission) || false;
	}

	// Check role
	hasRole(role: UserRole): boolean {
		return this.currentUser?.role === role;
	}

	// Simulate session expiry
	expireSession(): void {
		if (this.currentSession) {
			this.currentSession.expires = new Date(Date.now() - 1000).toISOString();
		}
	}

	// Simulate guest user creation
	createGuestUser(): MockUser {
		const guestId = `guest-${Date.now()}`;
		const sessionId = `session-${Date.now()}`;

		return {
			id: guestId,
			email: `${guestId}@guest.local`,
			name: `Guest User ${guestId.split('-')[1]}`,
			role: 'guest' as UserRole,
			isGuest: true,
			sessionId,
			permissions: ['vote', 'join_discussions']
		};
	}

	// Reset to initial state
	reset(): void {
		this.currentUser = null;
		this.currentSession = null;
		this.authErrors = [];
	}
}

// Mock JWT tokens for testing
export const mockJWTTokens = {
	valid: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2MjM5NzU2MDAsImV4cCI6OTk5OTk5OTk5OX0.test-signature',
	expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2MjM5NzU2MDAsImV4cCI6MTYyMzk3NTYwMX0.test-signature',
	invalid: 'invalid.jwt.token',
	guest: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJndWVzdC0xIiwiZW1haWwiOiJndWVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJndWVzdCIsImlhdCI6MTYyMzk3NTYwMCwiZXhwIjo5OTk5OTk5OTk5fQ.guest-signature'
};

// Mock API responses
export const mockAuthAPIResponses = {
	signInSuccess: { ok: true, error: null, url: '/dashboard' },
	signInFailure: { ok: false, error: 'Invalid credentials' },
	signUpSuccess: { ok: true, error: null, url: '/welcome' },
	signUpFailure: { ok: false, error: 'Email already exists' },
	sessionValid: mockSession,
	sessionExpired: null,
	guestTokenSuccess: { token: mockJWTTokens.guest },
	guestTokenFailure: { error: 'Failed to create guest token' }
};

// Global auth state manager instance
export const authStateManager = new MockAuthStateManager();

// Setup comprehensive auth mocks
export function setupAuthMocks() {
	// Mock SvelteKit stores
	vi.mock('$app/stores', () => ({
		page: {
			subscribe: vi.fn((callback) => {
				const state = authStateManager.getState();
				callback({
					data: {
						session: state.session,
						user: state.user
					}
				});
				return () => {};
			})
		}
	}));

	// Mock Auth.js client functions
	vi.mock('@auth/sveltekit/client', () => ({
		signIn: vi.fn().mockImplementation(async (provider, options) => {
			if (options?.email === 'invalid@test.com') {
				return mockAuthAPIResponses.signInFailure;
			}
			authStateManager.authenticateAs('participant');
			return mockAuthAPIResponses.signInSuccess;
		}),
		signOut: vi.fn().mockImplementation(async () => {
			authStateManager.signOut();
			return { ok: true, error: null };
		}),
		getSession: vi.fn().mockImplementation(async () => {
			return authStateManager.getState().session;
		})
	}));

	// Mock guest token API
	global.fetch = vi.fn().mockImplementation((url: string) => {
		if (url.includes('/api/auth/guest-token')) {
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve(mockAuthAPIResponses.guestTokenSuccess)
			});
		}
		return Promise.reject(new Error('Unknown API endpoint'));
	});
}

export function resetAuthMocks() {
	vi.clearAllMocks();
	authStateManager.reset();
}