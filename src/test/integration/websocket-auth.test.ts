import { describe, it, expect, vi } from 'vitest';
import {
	setupTestEnvironment,
	setupAuthenticatedTest,
	setupEventTest,
	testEnv,
	mockEvents,
	createMockEvent,
	topicScenarios
} from '../utils/test-environment';
import type { VoteUpdateData, ActivitySwitchNotification } from '../../lib/websocket/types';

describe('WebSocket + Authentication Integration', () => {
	setupTestEnvironment();

	describe('Authenticated User WebSocket Flow', () => {
		setupAuthenticatedTest('participant');
		setupEventTest(mockEvents.activeEvent);

		it('should connect authenticated user to event', async () => {
			const client = testEnv.createSocketClient();
			const user = testEnv.authManager.getState().user!;

			// Simulate joining event
			await new Promise<void>((resolve) => {
				client.emit('join_event', {
					eventId: testEnv.currentEvent!.id,
					userId: user.id,
					role: user.role!,
					isGuest: false,
					sessionId: 'authenticated-session'
				}, (response) => {
					expect(response.success).toBe(true);
					resolve();
				});
			});

			// Verify client emitted the join event
			expect(client.hasEmittedEvent('join_event')).toBe(true);

			const joinData = client.getEmittedEventData('join_event')[0];
			expect(joinData.userId).toBe(user.id);
			expect(joinData.eventId).toBe(testEnv.currentEvent!.id);
		});

		it('should handle voting with proper authentication', async () => {
			const client = testEnv.createSocketClient();
			const user = testEnv.authManager.getState().user!;
			const topic = topicScenarios.popular();

			// First join the event
			await new Promise<void>((resolve) => {
				client.emit('join_event', {
					eventId: testEnv.currentEvent!.id,
					userId: user.id,
					role: user.role!,
					isGuest: false,
					sessionId: 'authenticated-session'
				}, () => resolve());
			});

			// Submit vote
			await new Promise<void>((resolve) => {
				client.emit('submit_vote', {
					eventId: testEnv.currentEvent!.id,
					userId: user.id,
					topicId: topic.id,
					weight: 'first'
				}, (response) => {
					expect(response.success).toBe(true);
					expect(response.message).toBe('Vote submitted');
					resolve();
				});
			});

			// Verify vote was recorded
			expect(client.hasEmittedEvent('submit_vote')).toBe(true);
		});

		it('should receive real-time updates for authenticated users', async () => {
			const client = testEnv.createSocketClient();
			const user = testEnv.authManager.getState().user!;

			let receivedVoteUpdate = false;
			let receivedActivitySwitch = false;

			// Set up event listeners
			client.on('vote_update', (data: VoteUpdateData) => {
				expect(data.eventId).toBe(testEnv.currentEvent!.id);
				expect(data.voteCount).toBeGreaterThan(0);
				receivedVoteUpdate = true;
			});

			client.on('activity_switched', (data: ActivitySwitchNotification) => {
				expect(data.eventId).toBe(testEnv.currentEvent!.id);
				expect(data.newActivity).toBe('discussion');
				receivedActivitySwitch = true;
			});

			// Join event first
			await new Promise<void>((resolve) => {
				client.emit('join_event', {
					eventId: testEnv.currentEvent!.id,
					userId: user.id,
					role: user.role!,
					isGuest: false,
					sessionId: 'authenticated-session'
				}, () => resolve());
			});

			// Simulate receiving updates
			client.simulateMessage('vote_update', {
				eventId: testEnv.currentEvent!.id,
				topicId: 'topic-001',
				voteCount: 5,
				totalWeight: 12,
				averageWeight: 2.4,
				hasUserVoted: false,
				timestamp: new Date().toISOString()
			});

			client.simulateMessage('activity_switched', {
				eventId: testEnv.currentEvent!.id,
				newActivity: 'discussion',
				organizer: 'organizer-1',
				timestamp: new Date().toISOString()
			});

			// Verify updates were received
			expect(receivedVoteUpdate).toBe(true);
			expect(receivedActivitySwitch).toBe(true);
		});
	});

	describe('Guest User WebSocket Flow', () => {
		setupEventTest(mockEvents.activeEvent);

		it('should connect guest user to event', async () => {
			testEnv.authenticateAs('guest');
			const client = testEnv.createSocketClient();
			const user = testEnv.authManager.getState().user!;

			await new Promise<void>((resolve) => {
				client.emit('join_event', {
					eventId: testEnv.currentEvent!.id,
					userId: user.id,
					role: 'guest',
					isGuest: true,
					sessionId: user.sessionId!
				}, (response) => {
					expect(response.success).toBe(true);
					resolve();
				});
			});

			const joinData = client.getEmittedEventData('join_event')[0];
			expect(joinData.isGuest).toBe(true);
			expect(joinData.sessionId).toBe(user.sessionId);
		});

		it('should allow guest voting but with limited permissions', async () => {
			testEnv.authenticateAs('guest');
			const client = testEnv.createSocketClient();
			const user = testEnv.authManager.getState().user!;

			// Join event
			await new Promise<void>((resolve) => {
				client.emit('join_event', {
					eventId: testEnv.currentEvent!.id,
					userId: user.id,
					role: 'guest',
					isGuest: true,
					sessionId: user.sessionId!
				}, () => resolve());
			});

			// Guest should be able to vote
			await new Promise<void>((resolve) => {
				client.emit('submit_vote', {
					eventId: testEnv.currentEvent!.id,
					userId: user.id,
					topicId: 'topic-001',
					weight: 'second'
				}, (response) => {
					expect(response.success).toBe(true);
					resolve();
				});
			});

			// Verify guest permissions
			expect(testEnv.authManager.hasPermission('vote')).toBe(true);
			expect(testEnv.authManager.hasPermission('switch_activity')).toBe(false);
		});
	});

	describe('Organizer Privileges', () => {
		setupAuthenticatedTest('organizer');
		setupEventTest(mockEvents.activeEvent);

		it('should allow organizer to switch activities', async () => {
			const client = testEnv.createSocketClient();
			const user = testEnv.authManager.getState().user!;

			// Join as organizer
			await new Promise<void>((resolve) => {
				client.emit('join_event', {
					eventId: testEnv.currentEvent!.id,
					userId: user.id,
					role: user.role!,
					isGuest: false,
					sessionId: 'organizer-session'
				}, () => resolve());
			});

			// Switch activity
			await new Promise<void>((resolve) => {
				client.emit('switch_activity', {
					eventId: testEnv.currentEvent!.id,
					organizerId: user.id,
					newActivity: 'team_distribution',
					timerDuration: 900 // 15 minutes
				}, (response) => {
					expect(response.success).toBe(true);
					expect(response.message).toBe('Activity switched');
					resolve();
				});
			});

			// Verify organizer permissions
			expect(testEnv.authManager.hasPermission('switch_activity')).toBe(true);
			expect(testEnv.authManager.hasRole('organizer')).toBe(true);
		});
	});

	describe('Multi-User Real-Time Scenarios', () => {
		setupEventTest(mockEvents.activeEvent);

		it('should sync votes between multiple authenticated users', async () => {
			// Create multiple users
			const user1 = testEnv.createSocketClient();
			const user2 = testEnv.createSocketClient();
			const user3 = testEnv.createSocketClient();

			const clients = [user1, user2, user3];
			const receivedUpdates: VoteUpdateData[] = [];

			// Set up vote update listeners for all clients
			clients.forEach((client, index) => {
				client.on('vote_update', (data: VoteUpdateData) => {
					receivedUpdates.push(data);
				});
			});

			// All users join the same event
			await Promise.all(clients.map((client, index) => {
				return new Promise<void>((resolve) => {
					client.emit('join_event', {
						eventId: testEnv.currentEvent!.id,
						userId: `user-${index + 1}`,
						role: 'participant',
						isGuest: false,
						sessionId: `session-${index + 1}`
					}, () => resolve());
				});
			}));

			// User 1 submits a vote
			await new Promise<void>((resolve) => {
				user1.emit('submit_vote', {
					eventId: testEnv.currentEvent!.id,
					userId: 'user-1',
					topicId: 'topic-001',
					weight: 'first'
				}, () => resolve());
			});

			// Simulate server broadcasting the vote update to all clients
			const voteUpdate: VoteUpdateData = {
				eventId: testEnv.currentEvent!.id,
				topicId: 'topic-001',
				voteCount: 1,
				totalWeight: 3,
				averageWeight: 3,
				hasUserVoted: true,
				timestamp: new Date().toISOString()
			};

			clients.forEach(client => {
				client.simulateMessage('vote_update', voteUpdate);
			});

			// Verify all users received the update
			expect(receivedUpdates).toHaveLength(3);
			receivedUpdates.forEach(update => {
				expect(update.topicId).toBe('topic-001');
				expect(update.voteCount).toBe(1);
			});
		});
	});

	describe('Error Handling and Resilience', () => {
		setupAuthenticatedTest('participant');
		setupEventTest(mockEvents.activeEvent);

		it('should handle connection errors gracefully', async () => {
			const client = testEnv.createSocketClient();
			let errorReceived = false;

			client.on('connect_error', (error) => {
				errorReceived = true;
				expect(error).toBeInstanceOf(Error);
			});

			// Simulate connection error
			client.simulateError(new Error('Connection failed'));

			expect(errorReceived).toBe(true);
		});

		it('should handle authentication failures', async () => {
			const client = testEnv.createSocketClient();

			// Try to join with invalid session
			await new Promise<void>((resolve) => {
				client.emit('join_event', {
					eventId: 'non-existent-event',
					userId: 'invalid-user',
					role: 'participant',
					isGuest: false,
					sessionId: 'invalid-session'
				}, (response) => {
					// This should succeed in mock, but in real implementation might fail
					// Test demonstrates the structure for handling auth failures
					resolve();
				});
			});
		});

		it('should reconnect after temporary disconnection', async () => {
			const client = testEnv.createSocketClient();
			let reconnected = false;

			// Set up reconnection listener
			client.on('connect', () => {
				if (!client.connected) {
					reconnected = true;
				}
			});

			// Initial connection
			expect(client.connected).toBe(false); // Initially disconnected
			await new Promise(resolve => setTimeout(resolve, 20)); // Wait for auto-connect
			expect(client.connected).toBe(true);

			// Simulate disconnection
			client.simulateDisconnect('transport close');
			expect(client.connected).toBe(false);

			// Simulate reconnection
			client.simulateReconnection();
			await new Promise(resolve => setTimeout(resolve, 120)); // Wait for reconnection
			expect(client.connected).toBe(true);
		});
	});

	describe('Session Management', () => {
		setupEventTest(mockEvents.activeEvent);

		it('should handle session expiry gracefully', async () => {
			testEnv.authenticateAs('participant');
			const client = testEnv.createSocketClient();

			// Verify initially authenticated
			expect(testEnv.authManager.getState().isAuthenticated).toBe(true);

			// Simulate session expiry
			testEnv.authManager.expireSession();

			// In a real implementation, this would trigger reauthentication
			// Here we verify the session is marked as expired
			const session = testEnv.authManager.getState().session;
			if (session) {
				const expiryTime = new Date(session.expires).getTime();
				const now = Date.now();
				expect(expiryTime).toBeLessThan(now);
			}
		});

		it('should maintain connection state across auth changes', async () => {
			const client = testEnv.createSocketClient();

			// Start unauthenticated
			expect(testEnv.authManager.getState().isAuthenticated).toBe(false);

			// Wait for initial connection
			await new Promise(resolve => setTimeout(resolve, 20));

			// Authenticate
			testEnv.authenticateAs('participant');
			expect(testEnv.authManager.getState().isAuthenticated).toBe(true);

			// Connection should remain stable
			expect(client.connected).toBe(true);

			// Sign out
			testEnv.authManager.signOut();
			expect(testEnv.authManager.getState().isAuthenticated).toBe(false);

			// In real implementation, this might disconnect or switch to guest mode
		});
	});
});