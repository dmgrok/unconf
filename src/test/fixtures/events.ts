import type { ActivityType, EventStatus } from '../../types/enums';

export interface MockEvent {
	id: string;
	title: string;
	description: string;
	code: string;
	status: EventStatus;
	organizerId: string;
	currentActivity?: ActivityType;
	participantCount: number;
	maxParticipants?: number;
	createdAt: string;
	startTime?: string;
	endTime?: string;
	settings?: Record<string, unknown>;
}

export const mockEvents: Record<string, MockEvent> = {
	activeEvent: {
		id: 'event-active-001',
		title: 'Tech Unconference 2024',
		description: 'A dynamic tech unconference focused on emerging technologies and collaborative learning',
		code: 'TECH2024',
		status: 'active' as EventStatus,
		organizerId: 'organizer-1',
		currentActivity: 'voting' as ActivityType,
		participantCount: 25,
		maxParticipants: 100,
		createdAt: new Date('2024-01-15T10:00:00Z').toISOString(),
		startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Started 2 hours ago
		endTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // Ends in 6 hours
		settings: {
			allowGuestParticipation: true,
			maxVotesPerUser: 3,
			activityTimers: true
		}
	},

	pendingEvent: {
		id: 'event-pending-002',
		title: 'Design Workshop',
		description: 'Collaborative design thinking workshop for UX professionals',
		code: 'UX2024',
		status: 'pending' as EventStatus,
		organizerId: 'organizer-2',
		participantCount: 8,
		maxParticipants: 20,
		createdAt: new Date('2024-01-10T14:30:00Z').toISOString(),
		startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Starts tomorrow
		endTime: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
		settings: {
			allowGuestParticipation: false,
			maxVotesPerUser: 5,
			activityTimers: true
		}
	},

	completedEvent: {
		id: 'event-completed-003',
		title: 'Startup Meetup',
		description: 'Networking and idea sharing for startup founders and entrepreneurs',
		code: 'STARTUP',
		status: 'completed' as EventStatus,
		organizerId: 'organizer-1',
		currentActivity: 'discussion' as ActivityType,
		participantCount: 42,
		maxParticipants: 50,
		createdAt: new Date('2024-01-05T09:00:00Z').toISOString(),
		startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
		endTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
		settings: {
			allowGuestParticipation: true,
			maxVotesPerUser: 3,
			activityTimers: false
		}
	},

	smallEvent: {
		id: 'event-small-004',
		title: 'Team Retrospective',
		description: 'Internal team retrospective and planning session',
		code: 'RETRO24',
		status: 'active' as EventStatus,
		organizerId: 'facilitator-1',
		currentActivity: 'discussion' as ActivityType,
		participantCount: 6,
		maxParticipants: 10,
		createdAt: new Date().toISOString(),
		startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // Started 30 min ago
		endTime: new Date(Date.now() + 90 * 60 * 1000).toISOString(), // Ends in 90 min
		settings: {
			allowGuestParticipation: false,
			maxVotesPerUser: 5,
			activityTimers: true
		}
	},

	largeEvent: {
		id: 'event-large-005',
		title: 'Global Innovation Summit',
		description: 'Large-scale innovation conference with multiple tracks and activities',
		code: 'INNOVATE',
		status: 'active' as EventStatus,
		organizerId: 'organizer-1',
		currentActivity: 'team_distribution' as ActivityType,
		participantCount: 180,
		maxParticipants: 200,
		createdAt: new Date('2024-01-12T08:00:00Z').toISOString(),
		startTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // Started 4 hours ago
		endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // Ends in 4 hours
		settings: {
			allowGuestParticipation: true,
			maxVotesPerUser: 5,
			activityTimers: true,
			enableBreakoutRooms: true,
			maxBreakoutRooms: 15
		}
	}
};

// Event factory functions
export function createMockEvent(overrides: Partial<MockEvent> = {}): MockEvent {
	const baseEvent = mockEvents.activeEvent;
	return {
		...baseEvent,
		id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		code: `TEST${Date.now().toString().slice(-6)}`,
		createdAt: new Date().toISOString(),
		...overrides
	};
}

export function createActiveEvent(participantCount: number = 10): MockEvent {
	return createMockEvent({
		status: 'active' as EventStatus,
		participantCount,
		startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
		endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
	});
}

export function createPendingEvent(): MockEvent {
	return createMockEvent({
		status: 'pending' as EventStatus,
		participantCount: 0,
		startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
		endTime: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString()
	});
}

export function createGuestFriendlyEvent(): MockEvent {
	return createMockEvent({
		settings: {
			allowGuestParticipation: true,
			maxVotesPerUser: 3,
			activityTimers: true
		}
	});
}

export function createPrivateEvent(): MockEvent {
	return createMockEvent({
		settings: {
			allowGuestParticipation: false,
			maxVotesPerUser: 5,
			activityTimers: false
		}
	});
}

// Event data generators for testing different scenarios
export const eventScenarios = {
	// Standard unconference with mixed participation
	typical: () => createActiveEvent(25),

	// Small team meeting
	intimate: () => createMockEvent({
		participantCount: 5,
		maxParticipants: 8,
		title: 'Team Sync',
		currentActivity: 'discussion' as ActivityType
	}),

	// Large conference
	scale: () => createMockEvent({
		participantCount: 150,
		maxParticipants: 200,
		title: 'Annual Conference',
		currentActivity: 'team_distribution' as ActivityType,
		settings: {
			allowGuestParticipation: true,
			maxVotesPerUser: 5,
			activityTimers: true,
			enableBreakoutRooms: true,
			maxBreakoutRooms: 20
		}
	}),

	// Event starting soon
	upcoming: () => createMockEvent({
		status: 'pending' as EventStatus,
		startTime: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes from now
	}),

	// Event ending soon
	ending: () => createMockEvent({
		endTime: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes from now
	}),

	// Event with no activity set
	inactive: () => createMockEvent({
		currentActivity: undefined
	}),

	// Event with voting activity
	voting: () => createMockEvent({
		currentActivity: 'voting' as ActivityType
	}),

	// Event with group intelligence activity
	groupIntelligence: () => createMockEvent({
		currentActivity: 'group_intelligence' as ActivityType
	}),

	// Event with discussion groups
	discussion: () => createMockEvent({
		currentActivity: 'discussion' as ActivityType
	}),

	// Event with team distribution
	teamDistribution: () => createMockEvent({
		currentActivity: 'team_distribution' as ActivityType
	})
};

// Helper to get event by code
export function getEventByCode(code: string): MockEvent | undefined {
	return Object.values(mockEvents).find(event => event.code === code);
}

// Helper to get events by status
export function getEventsByStatus(status: EventStatus): MockEvent[] {
	return Object.values(mockEvents).filter(event => event.status === status);
}

// Helper to get events by organizer
export function getEventsByOrganizer(organizerId: string): MockEvent[] {
	return Object.values(mockEvents).filter(event => event.organizerId === organizerId);
}