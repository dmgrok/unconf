/**
 * Discussion Group Notification Service
 *
 * Handles real-time notifications for discussion group assignments using WebSocket
 */

import type { Server as SocketIOServer } from 'socket.io';
import type { RoomAssignment, DiscussionRoom, AssignmentRound } from '../../types/entities';
import { AssignmentRoundStatus } from '../../types/enums';

export interface DiscussionGroupNotification {
	type: 'assignment' | 'room_update' | 'round_start' | 'round_complete' | 'assignment_change';
	eventId: string;
	timestamp: string;
	data: any;
}

export interface AssignmentNotificationData {
	assignment: RoomAssignment;
	room: DiscussionRoom;
	topicTitle: string;
	message: string;
}

export interface RoomUpdateNotificationData {
	room: DiscussionRoom;
	occupancyChange: number;
	participants: string[];
}

export interface RoundNotificationData {
	round: AssignmentRound;
	message: string;
	stats?: {
		totalParticipants: number;
		assignedParticipants: number;
		assignmentRate: number;
	};
}

export class DiscussionGroupNotificationService {
	private io: SocketIOServer | null = null;

	constructor(io?: SocketIOServer) {
		this.io = io || null;
	}

	setSocketServer(io: SocketIOServer) {
		this.io = io;
	}

	/**
	 * Notify user about their room assignment
	 */
	async notifyUserAssignment(
		userId: string,
		assignment: RoomAssignment,
		room: DiscussionRoom,
		topicTitle: string
	) {
		if (!this.io) return;

		const notification: DiscussionGroupNotification = {
			type: 'assignment',
			eventId: assignment.eventId,
			timestamp: new Date().toISOString(),
			data: {
				assignment,
				room,
				topicTitle,
				message: `You've been assigned to "${room.name}" for the topic "${topicTitle}"`
			} as AssignmentNotificationData
		};

		// Send to specific user
		this.io.to(`event:${assignment.eventId}:user:${userId}`).emit('discussion_group_notification', notification);

		console.log(`Notification sent to user ${userId} for assignment to room ${room.id}`);
	}

	/**
	 * Notify all event participants about assignment changes
	 */
	async notifyAssignmentChange(
		eventId: string,
		userId: string,
		oldRoomId: string,
		newRoomId: string,
		roomName: string,
		topicTitle: string,
		isManual: boolean = false
	) {
		if (!this.io) return;

		const notification: DiscussionGroupNotification = {
			type: 'assignment_change',
			eventId,
			timestamp: new Date().toISOString(),
			data: {
				userId,
				oldRoomId,
				newRoomId,
				roomName,
				topicTitle,
				isManual,
				message: isManual
					? `A participant was manually moved to "${roomName}"`
					: `A participant was reassigned to "${roomName}"`
			}
		};

		// Send to all event participants
		this.io.to(`event:${eventId}`).emit('discussion_group_notification', notification);

		// Send specific notification to the moved user
		const userNotification: DiscussionGroupNotification = {
			type: 'assignment_change',
			eventId,
			timestamp: new Date().toISOString(),
			data: {
				userId,
				oldRoomId,
				newRoomId,
				roomName,
				topicTitle,
				isManual,
				message: `You've been moved to "${roomName}" for the topic "${topicTitle}"`
			}
		};

		this.io.to(`event:${eventId}:user:${userId}`).emit('discussion_group_notification', userNotification);
	}

	/**
	 * Notify about room capacity updates
	 */
	async notifyRoomUpdate(
		eventId: string,
		room: DiscussionRoom,
		occupancyChange: number,
		participants: string[]
	) {
		if (!this.io) return;

		const notification: DiscussionGroupNotification = {
			type: 'room_update',
			eventId,
			timestamp: new Date().toISOString(),
			data: {
				room,
				occupancyChange,
				participants
			} as RoomUpdateNotificationData
		};

		// Send to all event participants
		this.io.to(`event:${eventId}`).emit('discussion_group_notification', notification);
	}

	/**
	 * Notify about assignment round start
	 */
	async notifyRoundStart(
		eventId: string,
		round: AssignmentRound,
		estimatedDuration?: number
	) {
		if (!this.io) return;

		const notification: DiscussionGroupNotification = {
			type: 'round_start',
			eventId,
			timestamp: new Date().toISOString(),
			data: {
				round,
				message: `Assignment Round ${round.roundNumber} has started`,
				estimatedDuration,
				stats: {
					totalParticipants: round.totalParticipants,
					assignedParticipants: round.assignedParticipants,
					assignmentRate: round.totalParticipants > 0 ? round.assignedParticipants / round.totalParticipants : 0
				}
			} as RoundNotificationData
		};

		// Send to all event participants
		this.io.to(`event:${eventId}`).emit('discussion_group_notification', notification);

		console.log(`Round ${round.roundNumber} start notification sent for event ${eventId}`);
	}

	/**
	 * Notify about assignment round completion
	 */
	async notifyRoundComplete(
		eventId: string,
		round: AssignmentRound,
		results: any
	) {
		if (!this.io) return;

		const assignmentRate = round.totalParticipants > 0 ? round.assignedParticipants / round.totalParticipants : 0;
		const successMessage = round.status === AssignmentRoundStatus.COMPLETED
			? `Assignment Round ${round.roundNumber} completed successfully! ${round.assignedParticipants}/${round.totalParticipants} participants assigned (${Math.round(assignmentRate * 100)}%)`
			: `Assignment Round ${round.roundNumber} ${round.status}`;

		const notification: DiscussionGroupNotification = {
			type: 'round_complete',
			eventId,
			timestamp: new Date().toISOString(),
			data: {
				round,
				message: successMessage,
				results,
				stats: {
					totalParticipants: round.totalParticipants,
					assignedParticipants: round.assignedParticipants,
					assignmentRate
				}
			} as RoundNotificationData
		};

		// Send to all event participants
		this.io.to(`event:${eventId}`).emit('discussion_group_notification', notification);

		console.log(`Round ${round.roundNumber} completion notification sent for event ${eventId}`);
	}

	/**
	 * Notify organizers about assignment progress
	 */
	async notifyOrganizerProgress(
		eventId: string,
		organizerId: string,
		progress: {
			assignedCount: number;
			totalParticipants: number;
			roomUtilization: { roomId: string; utilization: number }[];
			unassignedParticipants: string[];
		}
	) {
		if (!this.io) return;

		const notification = {
			type: 'assignment_progress',
			eventId,
			timestamp: new Date().toISOString(),
			data: {
				progress,
				assignmentRate: progress.totalParticipants > 0 ? progress.assignedCount / progress.totalParticipants : 0,
				message: `Assignment progress: ${progress.assignedCount}/${progress.totalParticipants} participants assigned`
			}
		};

		// Send to organizer
		this.io.to(`event:${eventId}:user:${organizerId}`).emit('discussion_group_notification', notification);
	}

	/**
	 * Broadcast real-time assignment updates during assignment generation
	 */
	async broadcastAssignmentUpdate(
		eventId: string,
		update: {
			type: 'progress' | 'complete' | 'error';
			message: string;
			progress?: number;
			assignments?: RoomAssignment[];
			errors?: string[];
		}
	) {
		if (!this.io) return;

		const notification = {
			type: 'assignment_update',
			eventId,
			timestamp: new Date().toISOString(),
			data: update
		};

		// Send to all event participants
		this.io.to(`event:${eventId}`).emit('discussion_group_notification', notification);
	}

	/**
	 * Notify about room availability changes
	 */
	async notifyRoomAvailability(
		eventId: string,
		roomUpdates: {
			roomId: string;
			name: string;
			topicTitle: string;
			previousCapacity: number;
			newCapacity: number;
			currentOccupancy: number;
		}[]
	) {
		if (!this.io) return;

		for (const update of roomUpdates) {
			const notification: DiscussionGroupNotification = {
				type: 'room_update',
				eventId,
				timestamp: new Date().toISOString(),
				data: {
					roomUpdate: update,
					message: update.newCapacity > update.previousCapacity
						? `Room "${update.name}" capacity increased to ${update.newCapacity}`
						: `Room "${update.name}" capacity reduced to ${update.newCapacity}`
				}
			};

			this.io.to(`event:${eventId}`).emit('discussion_group_notification', notification);
		}
	}

	/**
	 * Send system-wide announcements about discussion groups
	 */
	async announceDiscussionGroupUpdate(
		eventId: string,
		announcement: {
			title: string;
			message: string;
			type: 'info' | 'warning' | 'success' | 'error';
			actionRequired?: boolean;
			expiresAt?: Date;
		}
	) {
		if (!this.io) return;

		const notification = {
			type: 'system_announcement',
			eventId,
			timestamp: new Date().toISOString(),
			data: announcement
		};

		// Send to all event participants
		this.io.to(`event:${eventId}`).emit('discussion_group_notification', notification);

		console.log(`System announcement sent for event ${eventId}: ${announcement.title}`);
	}

	/**
	 * Notify participants about their discussion group starting
	 */
	async notifyDiscussionStart(
		eventId: string,
		roomId: string,
		participants: string[],
		room: DiscussionRoom,
		topicTitle: string,
		facilitator?: string
	) {
		if (!this.io) return;

		const notification: DiscussionGroupNotification = {
			type: 'round_start',
			eventId,
			timestamp: new Date().toISOString(),
			data: {
				room,
				topicTitle,
				facilitator,
				participants,
				message: `Your discussion group for "${topicTitle}" is starting now!`,
				instructions: room.location ? `Please head to ${room.location}` : 'Check your room assignment for location details'
			}
		};

		// Send to all participants in the room
		for (const userId of participants) {
			this.io.to(`event:${eventId}:user:${userId}`).emit('discussion_group_notification', notification);
		}

		console.log(`Discussion start notification sent to ${participants.length} participants in room ${roomId}`);
	}

	/**
	 * Helper method to join users to event-specific rooms for targeted notifications
	 */
	async subscribeUserToEventNotifications(socketId: string, eventId: string, userId: string) {
		if (!this.io) return;

		const socket = this.io.sockets.sockets.get(socketId);
		if (socket) {
			await socket.join(`event:${eventId}`);
			await socket.join(`event:${eventId}:user:${userId}`);
			console.log(`User ${userId} subscribed to discussion group notifications for event ${eventId}`);
		}
	}

	/**
	 * Helper method to remove users from event-specific rooms
	 */
	async unsubscribeUserFromEventNotifications(socketId: string, eventId: string, userId: string) {
		if (!this.io) return;

		const socket = this.io.sockets.sockets.get(socketId);
		if (socket) {
			await socket.leave(`event:${eventId}`);
			await socket.leave(`event:${eventId}:user:${userId}`);
			console.log(`User ${userId} unsubscribed from discussion group notifications for event ${eventId}`);
		}
	}
}

export const discussionGroupNotificationService = new DiscussionGroupNotificationService();