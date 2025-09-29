import { writable } from 'svelte/store';
import type { DiscussionRoom, RoomAssignment } from '../../types/entities';
import type { DiscussionRoomStatus, AssignmentStatus } from '../../types/enums';

interface DiscussionGroupState {
	rooms: DiscussionRoom[];
	assignments: RoomAssignment[];
	currentUserAssignment: RoomAssignment | null;
	loading: boolean;
	error: string | null;
}

function createDiscussionGroupStore() {
	const { subscribe, set, update } = writable<DiscussionGroupState>({
		rooms: [],
		assignments: [],
		currentUserAssignment: null,
		loading: false,
		error: null
	});

	return {
		subscribe,

		async loadDiscussionGroups(eventId: string) {
			update(state => ({ ...state, loading: true, error: null }));

			try {
				const response = await fetch(`/api/discussion-groups?eventId=${eventId}`);
				const result = await response.json();

				if (!result.success) {
					throw new Error(result.error || 'Failed to load discussion groups');
				}

				update(state => ({
					...state,
					rooms: result.data.rooms,
					assignments: result.data.assignments,
					loading: false
				}));
			} catch (error) {
				update(state => ({
					...state,
					loading: false,
					error: error instanceof Error ? error.message : 'Failed to load discussion groups'
				}));
			}
		},

		async loadUserAssignment(userId: string, eventId: string) {
			try {
				const response = await fetch(`/api/discussion-groups/assignments?eventId=${eventId}&userId=${userId}`);
				const result = await response.json();

				if (result.success) {
					update(state => ({
						...state,
						currentUserAssignment: result.data
					}));
				} else {
					// User has no assignment yet
					update(state => ({
						...state,
						currentUserAssignment: null
					}));
				}
			} catch (error) {
				console.error('Error loading user assignment:', error);
			}
		},

		async createRooms(eventId: string, topicIds: string[], defaultCapacity: number = 10) {
			update(state => ({ ...state, loading: true, error: null }));

			try {
				const response = await fetch('/api/discussion-groups', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						eventId,
						action: 'create_rooms',
						topicIds,
						defaultCapacity
					})
				});

				const result = await response.json();

				if (!result.success) {
					throw new Error(result.error || 'Failed to create rooms');
				}

				update(state => ({
					...state,
					rooms: [...state.rooms, ...result.data],
					loading: false
				}));

				return result.data;
			} catch (error) {
				update(state => ({
					...state,
					loading: false,
					error: error instanceof Error ? error.message : 'Failed to create rooms'
				}));
				throw error;
			}
		},

		async generateAssignments(eventId: string, settings?: any) {
			update(state => ({ ...state, loading: true, error: null }));

			try {
				const response = await fetch('/api/discussion-groups', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						eventId,
						action: 'generate_assignments',
						settings
					})
				});

				const result = await response.json();

				if (!result.success) {
					throw new Error(result.error || 'Failed to generate assignments');
				}

				update(state => ({
					...state,
					assignments: result.data.assignments,
					loading: false
				}));

				return result.data;
			} catch (error) {
				update(state => ({
					...state,
					loading: false,
					error: error instanceof Error ? error.message : 'Failed to generate assignments'
				}));
				throw error;
			}
		},

		async assignUser(userId: string, roomId: string, topicId: string, eventId: string, preferenceRank?: number) {
			update(state => ({ ...state, loading: true, error: null }));

			try {
				const response = await fetch('/api/discussion-groups/assignments', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						action: 'assign',
						userId,
						roomId,
						topicId,
						eventId,
						preferenceRank
					})
				});

				const result = await response.json();

				if (!result.success) {
					throw new Error(result.error || 'Failed to assign user');
				}

				update(state => ({
					...state,
					assignments: [...state.assignments, result.data],
					loading: false
				}));

				return result.data;
			} catch (error) {
				update(state => ({
					...state,
					loading: false,
					error: error instanceof Error ? error.message : 'Failed to assign user'
				}));
				throw error;
			}
		},

		async moveUser(userId: string, newRoomId: string, newTopicId: string, eventId: string) {
			update(state => ({ ...state, loading: true, error: null }));

			try {
				const response = await fetch('/api/discussion-groups/assignments', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						action: 'move',
						userId,
						newRoomId,
						newTopicId,
						eventId
					})
				});

				const result = await response.json();

				if (!result.success) {
					throw new Error(result.error || 'Failed to move user');
				}

				update(state => {
					// Remove old assignment and add new one
					const newAssignments = state.assignments.filter(a => a.userId !== userId);
					newAssignments.push(result.data);

					return {
						...state,
						assignments: newAssignments,
						currentUserAssignment: result.data,
						loading: false
					};
				});

				return result.data;
			} catch (error) {
				update(state => ({
					...state,
					loading: false,
					error: error instanceof Error ? error.message : 'Failed to move user'
				}));
				throw error;
			}
		},

		async confirmAssignment(assignmentId: string) {
			try {
				const response = await fetch('/api/discussion-groups/assignments', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						action: 'confirm',
						assignmentId
					})
				});

				const result = await response.json();

				if (!result.success) {
					throw new Error(result.error || 'Failed to confirm assignment');
				}

				update(state => ({
					...state,
					assignments: state.assignments.map(a =>
						a.id === assignmentId ? result.data : a
					)
				}));

				return result.data;
			} catch (error) {
				update(state => ({
					...state,
					error: error instanceof Error ? error.message : 'Failed to confirm assignment'
				}));
				throw error;
			}
		},

		async cancelAssignment(assignmentId: string, userId: string) {
			try {
				const response = await fetch('/api/discussion-groups/assignments', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						action: 'cancel',
						assignmentId,
						userId
					})
				});

				const result = await response.json();

				if (!result.success) {
					throw new Error(result.error || 'Failed to cancel assignment');
				}

				update(state => ({
					...state,
					assignments: state.assignments.filter(a => a.id !== assignmentId),
					currentUserAssignment: state.currentUserAssignment?.id === assignmentId ? null : state.currentUserAssignment
				}));

				return result.data;
			} catch (error) {
				update(state => ({
					...state,
					error: error instanceof Error ? error.message : 'Failed to cancel assignment'
				}));
				throw error;
			}
		},

		updateRoom(roomId: string, updates: Partial<DiscussionRoom>) {
			update(state => ({
				...state,
				rooms: state.rooms.map(room =>
					room.id === roomId ? { ...room, ...updates } : room
				)
			}));
		},

		clearError() {
			update(state => ({ ...state, error: null }));
		},

		reset() {
			set({
				rooms: [],
				assignments: [],
				currentUserAssignment: null,
				loading: false,
				error: null
			});
		}
	};
}

export const discussionGroupStore = createDiscussionGroupStore();