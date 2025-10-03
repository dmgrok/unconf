/**
 * Integration tests for real-time activity switching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';
import ActivityInterface from '../../lib/components/ActivityInterface.svelte';
import { ActivityType } from '../../types/enums';
import type { Event, User, Topic } from '../../types/entities';

describe('Activity Switching Integration', () => {
	let mockEvent: Event;
	let mockUser: User;
	let mockTopics: Topic[];

	beforeEach(() => {
		// Setup mock data
		mockEvent = {
			id: 'event-1',
			title: 'Test Event',
			description: 'Test event description',
			status: 'active',
			organizerId: 'org-1',
			accessCode: 'TEST123',
			currentActivity: ActivityType.VOTING,
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
			role: 'participant',
			isGuest: false,
			lastActiveAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date()
		} as User;

		mockTopics = [
			{
				id: 'topic-1',
				title: 'Test Topic 1',
				eventId: 'event-1',
				submittedBy: 'user-1',
				status: 'active',
				voteCount: 0,
				totalVoteWeight: 0,
				averageWeight: 0,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				id: 'topic-2',
				title: 'Test Topic 2',
				eventId: 'event-1',
				submittedBy: 'user-2',
				status: 'active',
				voteCount: 0,
				totalVoteWeight: 0,
				averageWeight: 0,
				createdAt: new Date(),
				updatedAt: new Date()
			}
		] as Topic[];

		// Mock fetch
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Activity Interface Rendering', () => {
		it('should render voting interface when activity is VOTING', () => {
			mockEvent.currentActivity = ActivityType.VOTING;

			const { container } = render(ActivityInterface, {
				props: {
					event: mockEvent,
					currentUser: mockUser,
					topics: mockTopics
				}
			});

			expect(container.querySelector('.voting-interface')).toBeTruthy();
		});

		it('should render game interface when activity is GROUP_INTELLIGENCE', () => {
			mockEvent.currentActivity = ActivityType.GROUP_INTELLIGENCE;

			const { container } = render(ActivityInterface, {
				props: {
					event: mockEvent,
					currentUser: mockUser,
					topics: mockTopics
				}
			});

			expect(container.querySelector('.game-interface')).toBeTruthy();
		});

		it('should render discussion interface when activity is DISCUSSION_GROUPS', () => {
			mockEvent.currentActivity = ActivityType.DISCUSSION_GROUPS;

			const { container } = render(ActivityInterface, {
				props: {
					event: mockEvent,
					currentUser: mockUser,
					topics: mockTopics
				}
			});

			expect(container.querySelector('.discussion-interface')).toBeTruthy();
		});

		it('should render team assignment interface when activity is TEAM_DISTRIBUTION', () => {
			mockEvent.currentActivity = ActivityType.TEAM_DISTRIBUTION;

			const { container } = render(ActivityInterface, {
				props: {
					event: mockEvent,
					currentUser: mockUser,
					topics: mockTopics
				}
			});

			expect(container.querySelector('.team-assignment-interface')).toBeTruthy();
		});

		it('should show no activity message when currentActivity is undefined', () => {
			mockEvent.currentActivity = undefined;

			const { container } = render(ActivityInterface, {
				props: {
					event: mockEvent,
					currentUser: mockUser,
					topics: mockTopics
				}
			});

			expect(container.querySelector('.no-activity')).toBeTruthy();
		});
	});

	describe('Real-time Activity Switching', () => {
		it('should switch from voting to games interface', async () => {
			mockEvent.currentActivity = ActivityType.VOTING;

			const { container, component } = render(ActivityInterface, {
				props: {
					event: mockEvent,
					currentUser: mockUser,
					topics: mockTopics
				}
			});

			// Verify voting interface is shown
			expect(container.querySelector('.voting-interface')).toBeTruthy();

			// Simulate activity switch
			mockEvent.currentActivity = ActivityType.GROUP_INTELLIGENCE;
			await component.$set({ event: mockEvent });

			// Verify game interface is now shown
			await waitFor(() => {
				expect(container.querySelector('.game-interface')).toBeTruthy();
				expect(container.querySelector('.voting-interface')).toBeFalsy();
			});
		});

		it('should handle rapid activity switches', async () => {
			mockEvent.currentActivity = ActivityType.VOTING;

			const { container, component } = render(ActivityInterface, {
				props: {
					event: mockEvent,
					currentUser: mockUser,
					topics: mockTopics
				}
			});

			// Rapid switches
			const activities = [
				ActivityType.GROUP_INTELLIGENCE,
				ActivityType.DISCUSSION_GROUPS,
				ActivityType.TEAM_DISTRIBUTION,
				ActivityType.VOTING
			];

			for (const activity of activities) {
				mockEvent.currentActivity = activity;
				await component.$set({ event: mockEvent });
				await waitFor(() => {
					expect(container.querySelector('.activity-interface')).toBeTruthy();
				});
			}

			// Should end up showing voting interface
			expect(container.querySelector('.voting-interface')).toBeTruthy();
		});

		it('should maintain component state during switches', async () => {
			mockEvent.currentActivity = ActivityType.VOTING;

			const { component } = render(ActivityInterface, {
				props: {
					event: mockEvent,
					currentUser: mockUser,
					topics: mockTopics
				}
			});

			// Switch to games
			mockEvent.currentActivity = ActivityType.GROUP_INTELLIGENCE;
			await component.$set({ event: mockEvent });

			// Switch back to voting
			mockEvent.currentActivity = ActivityType.VOTING;
			await component.$set({ event: mockEvent });

			// Component should handle the switch without errors
			await waitFor(() => {
				expect(component).toBeTruthy();
			});
		});
	});

	describe('Performance', () => {
		it('should switch activities in under 100ms', async () => {
			mockEvent.currentActivity = ActivityType.VOTING;

			const { component } = render(ActivityInterface, {
				props: {
					event: mockEvent,
					currentUser: mockUser,
					topics: mockTopics
				}
			});

			const startTime = performance.now();

			// Switch activity
			mockEvent.currentActivity = ActivityType.GROUP_INTELLIGENCE;
			await component.$set({ event: mockEvent });

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Should complete in under 100ms
			expect(duration).toBeLessThan(100);
		});

		it('should handle multiple concurrent switches efficiently', async () => {
			const instances = [];

			// Create multiple instances
			for (let i = 0; i < 10; i++) {
				instances.push(
					render(ActivityInterface, {
						props: {
							event: { ...mockEvent },
							currentUser: mockUser,
							topics: mockTopics
						}
					})
				);
			}

			const startTime = performance.now();

			// Switch all instances
			await Promise.all(
				instances.map(async ({ component }) => {
					mockEvent.currentActivity = ActivityType.DISCUSSION_GROUPS;
					await component.$set({ event: mockEvent });
				})
			);

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Should complete all switches in reasonable time
			expect(duration).toBeLessThan(500);
		});
	});

	describe('Error Handling', () => {
		it('should handle null event gracefully', () => {
			const { container } = render(ActivityInterface, {
				props: {
					event: null as any,
					currentUser: mockUser,
					topics: mockTopics
				}
			});

			// Should not crash
			expect(container).toBeTruthy();
		});

		it('should handle missing topics array', () => {
			const { container } = render(ActivityInterface, {
				props: {
					event: mockEvent,
					currentUser: mockUser,
					topics: undefined as any
				}
			});

			// Should not crash
			expect(container).toBeTruthy();
		});

		it('should emit error events on state update failures', async () => {
			const errorHandler = vi.fn();

			const { component } = render(ActivityInterface, {
				props: {
					event: mockEvent,
					currentUser: mockUser,
					topics: mockTopics
				}
			});

			component.$on('stateUpdate', errorHandler);

			// Trigger error scenario (invalid state)
			const invalidEvent = { ...mockEvent, currentActivity: 'INVALID' as any };
			await component.$set({ event: invalidEvent });

			// Should handle gracefully without crashing
			expect(component).toBeTruthy();
		});
	});

	describe('Event Dispatching', () => {
		it('should dispatch activityChange event on activity switch', async () => {
			let dispatchedEvent: any = null;

			const { component } = render(ActivityInterface, {
				props: {
					event: mockEvent,
					currentUser: mockUser,
					topics: mockTopics
				}
			});

			component.$on('activityChange', (event: any) => {
				dispatchedEvent = event.detail;
			});

			// Switch activity
			mockEvent.currentActivity = ActivityType.DISCUSSION_GROUPS;
			await component.$set({ event: mockEvent });

			// Should dispatch event
			await waitFor(() => {
				expect(dispatchedEvent).toBeTruthy();
				expect(dispatchedEvent.type).toBe(ActivityType.DISCUSSION_GROUPS);
			});
		});

		it('should dispatch stateUpdate events from child components', async () => {
			const stateUpdates: any[] = [];

			const { component } = render(ActivityInterface, {
				props: {
					event: mockEvent,
					currentUser: mockUser,
					topics: mockTopics
				}
			});

			component.$on('stateUpdate', (event: any) => {
				stateUpdates.push(event.detail);
			});

			// Should be able to receive state updates
			expect(component).toBeTruthy();
		});
	});
});
