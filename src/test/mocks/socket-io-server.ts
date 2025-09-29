import { vi } from 'vitest';
import type {
	ServerToClientEvents,
	ClientToServerEvents,
	AckResponse,
	VoteUpdateData,
	ActivitySwitchNotification,
	UserCountData,
	ConnectionStatusData,
	JoinEventData,
	VoteData,
	ActivitySwitchData,
	TimerUpdateData
} from '../../lib/websocket/types';

export interface MockSocket {
	id: string;
	userId?: string;
	eventId?: string;
	role?: string;
	isGuest?: boolean;
	connected: boolean;
	join: (room: string) => void;
	leave: (room: string) => void;
	emit: (event: keyof ServerToClientEvents, data: any) => void;
	on: (event: keyof ClientToServerEvents, handler: (...args: any[]) => void) => void;
	disconnect: () => void;
	rooms: Set<string>;
}

export class MockSocketIOServer {
	private sockets: Map<string, MockSocket> = new Map();
	private rooms: Map<string, Set<string>> = new Map(); // roomId -> socketIds
	private eventHandlers: Map<string, Function[]> = new Map();
	private userSockets: Map<string, string> = new Map(); // userId -> socketId
	private voteData: Map<string, Map<string, VoteUpdateData>> = new Map(); // eventId -> topicId -> voteData
	private currentActivity: Map<string, string> = new Map(); // eventId -> activity

	// Create a new mock socket connection
	createSocket(socketId: string = `socket_${Date.now()}_${Math.random()}`): MockSocket {
		const socket: MockSocket = {
			id: socketId,
			connected: true,
			rooms: new Set(),
			join: (room: string) => {
				socket.rooms.add(room);
				if (!this.rooms.has(room)) {
					this.rooms.set(room, new Set());
				}
				this.rooms.get(room)!.add(socketId);
			},
			leave: (room: string) => {
				socket.rooms.delete(room);
				this.rooms.get(room)?.delete(socketId);
			},
			emit: vi.fn((event: keyof ServerToClientEvents, data: any) => {
				// Simulate emitting to this socket
				console.log(`Mock socket ${socketId} emitting ${event}:`, data);
			}),
			on: (event: keyof ClientToServerEvents, handler: (...args: any[]) => void) => {
				if (!this.eventHandlers.has(event)) {
					this.eventHandlers.set(event, []);
				}
				this.eventHandlers.get(event)!.push(handler.bind(socket));
			},
			disconnect: () => {
				socket.connected = false;
				this.handleDisconnect(socketId);
			}
		};

		this.sockets.set(socketId, socket);
		this.setupDefaultHandlers(socket);
		return socket;
	}

	private setupDefaultHandlers(socket: MockSocket): void {
		// Join event handler
		socket.on('join_event', (data: JoinEventData, callback: (response: AckResponse) => void) => {
			try {
				const { eventId, userId, role, isGuest, sessionId } = data;

				// Update socket data
				socket.userId = userId;
				socket.eventId = eventId;
				socket.role = role;
				socket.isGuest = isGuest;

				// Join socket to event room
				socket.join(eventId);

				// Track user socket
				this.userSockets.set(userId, socket.id);

				const userCount = this.getEventParticipantCount(eventId);

				// Emit user count update to all participants
				this.emitToRoom(eventId, 'user_count_update', {
					eventId,
					totalUsers: userCount,
					activeUsers: userCount,
					guestUsers: isGuest ? 1 : 0
				});

				callback({ success: true, message: 'Joined successfully' });
			} catch (error) {
				callback({
					success: false,
					error: error instanceof Error ? error.message : 'Failed to join event'
				});
			}
		});

		// Vote submission handler
		socket.on('submit_vote', (data: VoteData, callback: (response: AckResponse) => void) => {
			try {
				const { eventId, topicId, weight, userId } = data;

				if (!this.voteData.has(eventId)) {
					this.voteData.set(eventId, new Map());
				}

				const eventVotes = this.voteData.get(eventId)!;
				const existingVote = eventVotes.get(topicId);

				const voteCount = (existingVote?.voteCount || 0) + 1;
				const totalWeight = (existingVote?.totalWeight || 0) + this.getWeightValue(weight);
				const averageWeight = totalWeight / voteCount;

				const voteUpdate: VoteUpdateData = {
					eventId,
					topicId,
					voteCount,
					totalWeight,
					averageWeight,
					hasUserVoted: true,
					timestamp: new Date().toISOString()
				};

				eventVotes.set(topicId, voteUpdate);

				// Broadcast vote update to all participants
				this.emitToRoom(eventId, 'vote_update', voteUpdate);

				callback({ success: true, message: 'Vote submitted' });
			} catch (error) {
				callback({
					success: false,
					error: error instanceof Error ? error.message : 'Failed to submit vote'
				});
			}
		});

		// Activity switch handler
		socket.on('switch_activity', (data: ActivitySwitchData, callback: (response: AckResponse) => void) => {
			try {
				const { eventId, newActivity, timerDuration, organizerId } = data;

				this.currentActivity.set(eventId, newActivity);

				const notification: ActivitySwitchNotification = {
					eventId,
					newActivity,
					previousActivity: this.currentActivity.get(eventId),
					organizer: organizerId,
					timerDuration,
					timestamp: new Date().toISOString()
				};

				// Broadcast activity switch to all participants
				this.emitToRoom(eventId, 'activity_switched', notification);

				callback({ success: true, message: 'Activity switched' });
			} catch (error) {
				callback({
					success: false,
					error: error instanceof Error ? error.message : 'Failed to switch activity'
				});
			}
		});

		// Heartbeat handler
		socket.on('heartbeat', (callback: (response: any) => void) => {
			callback({
				serverTime: new Date().toISOString(),
				eventStatus: 'active'
			});
		});
	}

	private handleDisconnect(socketId: string): void {
		const socket = this.sockets.get(socketId);
		if (!socket) return;

		// Clean up user tracking
		if (socket.userId) {
			this.userSockets.delete(socket.userId);

			// Remove from rooms and notify
			for (const room of socket.rooms) {
				const userCount = this.getEventParticipantCount(room);
				this.emitToRoom(room, 'user_count_update', {
					eventId: room,
					totalUsers: userCount,
					activeUsers: userCount,
					guestUsers: 0
				});
			}
		}

		this.sockets.delete(socketId);
	}

	// Utility methods
	private getWeightValue(weight: string): number {
		switch (weight) {
			case 'first': return 3;
			case 'second': return 2;
			case 'third': return 1;
			default: return 0;
		}
	}

	getEventParticipantCount(eventId: string): number {
		return this.rooms.get(eventId)?.size || 0;
	}

	emitToRoom(room: string, event: keyof ServerToClientEvents, data: any): void {
		const socketIds = this.rooms.get(room);
		if (!socketIds) return;

		for (const socketId of socketIds) {
			const socket = this.sockets.get(socketId);
			if (socket && socket.connected) {
				socket.emit(event, data);
			}
		}
	}

	// Test helper methods
	getSocket(socketId: string): MockSocket | undefined {
		return this.sockets.get(socketId);
	}

	getAllSockets(): MockSocket[] {
		return Array.from(this.sockets.values());
	}

	getSocketsInRoom(room: string): MockSocket[] {
		const socketIds = this.rooms.get(room);
		if (!socketIds) return [];

		return Array.from(socketIds)
			.map(id => this.sockets.get(id))
			.filter((socket): socket is MockSocket => socket !== undefined);
	}

	getRooms(): Map<string, Set<string>> {
		return new Map(this.rooms);
	}

	getVoteData(eventId: string, topicId?: string): VoteUpdateData | Map<string, VoteUpdateData> | undefined {
		const eventVotes = this.voteData.get(eventId);
		if (!eventVotes) return undefined;

		if (topicId) {
			return eventVotes.get(topicId);
		}
		return eventVotes;
	}

	getCurrentActivity(eventId: string): string | undefined {
		return this.currentActivity.get(eventId);
	}

	// Simulate server-initiated events
	simulateUserJoin(eventId: string, userId: string): void {
		const userCount = this.getEventParticipantCount(eventId) + 1;
		this.emitToRoom(eventId, 'user_count_update', {
			eventId,
			totalUsers: userCount,
			activeUsers: userCount,
			guestUsers: 1
		});
	}

	simulateConnectionIssue(socketId: string): void {
		const socket = this.sockets.get(socketId);
		if (socket) {
			socket.emit('error', {
				code: 'CONNECTION_ERROR',
				message: 'Simulated connection issue',
				timestamp: new Date().toISOString()
			});
		}
	}

	simulateServerRestart(): void {
		// Disconnect all sockets
		for (const socket of this.sockets.values()) {
			socket.disconnect();
		}

		// Clear all data
		this.sockets.clear();
		this.rooms.clear();
		this.userSockets.clear();
		this.voteData.clear();
		this.currentActivity.clear();
	}

	// Reset server state for clean tests
	reset(): void {
		this.simulateServerRestart();
	}
}

// Create a singleton mock server instance for tests
export const mockSocketIOServer = new MockSocketIOServer();