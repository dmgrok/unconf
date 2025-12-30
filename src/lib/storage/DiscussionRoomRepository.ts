import type { DiscussionRoom } from '../../types/entities';
import { DiscussionRoomStatus } from '../../types/enums';
import { JSONRepository, type JSONRepositoryConfig } from './JSONRepository';
import type { RepositoryOperationResult, QueryOptions, ValidationResult } from './Repository';

export class DiscussionRoomRepository extends JSONRepository<DiscussionRoom> {
	constructor(config: Omit<JSONRepositoryConfig, 'filename'>) {
		super('discussion_room', {
			...config,
			filename: 'discussion_rooms.json'
		});
	}

	validate(entity: Partial<DiscussionRoom>): ValidationResult {
		const baseValidation = this.validateRequired(entity, [
			'eventId',
			'topicId',
			'name',
			'capacity',
			'status'
		]);
		if (!baseValidation.isValid) {
			return baseValidation;
		}

		const errors: string[] = [];

		// Validate capacity
		if (entity.capacity !== undefined && entity.capacity < 1) {
			errors.push('Room capacity must be at least 1');
		}

		// Validate current occupancy
		if (entity.currentOccupancy !== undefined && entity.currentOccupancy < 0) {
			errors.push('Current occupancy cannot be negative');
		}

		if (
			entity.capacity !== undefined &&
			entity.currentOccupancy !== undefined &&
			entity.currentOccupancy > entity.capacity
		) {
			errors.push('Current occupancy cannot exceed capacity');
		}

		// Validate status
		if (entity.status && !Object.values(DiscussionRoomStatus).includes(entity.status)) {
			errors.push('Invalid room status');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	async findByEvent(eventId: string, options?: QueryOptions): Promise<RepositoryOperationResult<DiscussionRoom[]>> {
		return this.findBy({ eventId }, options);
	}

	async findByTopic(topicId: string, options?: QueryOptions): Promise<RepositoryOperationResult<DiscussionRoom[]>> {
		return this.findBy({ topicId }, options);
	}

	async findByEventAndTopic(eventId: string, topicId: string): Promise<RepositoryOperationResult<DiscussionRoom[]>> {
		return this.findBy({ eventId, topicId });
	}

	async findAvailableRooms(eventId: string): Promise<RepositoryOperationResult<DiscussionRoom[]>> {
		try {
			const result = await this.findByEvent(eventId);
			if (!result.success || !result.data) {
				return result;
			}

			const availableRooms = result.data.filter(room =>
				room.status === DiscussionRoomStatus.ACTIVE &&
				room.currentOccupancy < room.capacity
			);

			return {
				success: true,
				data: availableRooms
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('QUERY_ERROR', `Failed to find available rooms: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async updateOccupancy(roomId: string, newOccupancy: number): Promise<RepositoryOperationResult<DiscussionRoom>> {
		try {
			const roomResult = await this.findById(roomId);
			if (!roomResult.success || !roomResult.data) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', 'Room not found')
				};
			}

			const room = roomResult.data;

			// Validate new occupancy
			if (newOccupancy < 0) {
				return {
					success: false,
					error: this.createError('VALIDATION_ERROR', 'Occupancy cannot be negative')
				};
			}

			if (newOccupancy > room.capacity) {
				return {
					success: false,
					error: this.createError('CAPACITY_EXCEEDED', `Occupancy ${newOccupancy} exceeds capacity ${room.capacity}`)
				};
			}

			// Update room status based on occupancy
			let newStatus = room.status;
			if (newOccupancy >= room.capacity && room.status === DiscussionRoomStatus.ACTIVE) {
				newStatus = DiscussionRoomStatus.FULL;
			} else if (newOccupancy < room.capacity && room.status === DiscussionRoomStatus.FULL) {
				newStatus = DiscussionRoomStatus.ACTIVE;
			}

			return this.update(roomId, {
				currentOccupancy: newOccupancy,
				status: newStatus
			});
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to update room occupancy: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async incrementOccupancy(roomId: string): Promise<RepositoryOperationResult<DiscussionRoom>> {
		try {
			const roomResult = await this.findById(roomId);
			if (!roomResult.success || !roomResult.data) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', 'Room not found')
				};
			}

			const room = roomResult.data;
			return this.updateOccupancy(roomId, room.currentOccupancy + 1);
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to increment room occupancy: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async decrementOccupancy(roomId: string): Promise<RepositoryOperationResult<DiscussionRoom>> {
		try {
			const roomResult = await this.findById(roomId);
			if (!roomResult.success || !roomResult.data) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', 'Room not found')
				};
			}

			const room = roomResult.data;
			return this.updateOccupancy(roomId, Math.max(0, room.currentOccupancy - 1));
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to decrement room occupancy: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async addParticipant(roomId: string, userId: string): Promise<RepositoryOperationResult<DiscussionRoom>> {
		try {
			const roomResult = await this.findById(roomId);
			if (!roomResult.success || !roomResult.data) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', 'Room not found')
				};
			}

			const room = roomResult.data;

			// Check if participant already assigned
			if (room.assignedParticipants.includes(userId)) {
				return {
					success: false,
					error: this.createError('ALREADY_ASSIGNED', 'Participant already assigned to this room')
				};
			}

			// Check capacity
			if (room.assignedParticipants.length >= room.capacity) {
				return {
					success: false,
					error: this.createError('CAPACITY_EXCEEDED', 'Room is at full capacity')
				};
			}

			const updatedParticipants = [...room.assignedParticipants, userId];
			const newOccupancy = updatedParticipants.length;

			// Update status based on new occupancy
			let newStatus = room.status;
			if (newOccupancy >= room.capacity && room.status === DiscussionRoomStatus.ACTIVE) {
				newStatus = DiscussionRoomStatus.FULL;
			}

			return this.update(roomId, {
				assignedParticipants: updatedParticipants,
				currentOccupancy: newOccupancy,
				status: newStatus
			});
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to add participant to room: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async removeParticipant(roomId: string, userId: string): Promise<RepositoryOperationResult<DiscussionRoom>> {
		try {
			const roomResult = await this.findById(roomId);
			if (!roomResult.success || !roomResult.data) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', 'Room not found')
				};
			}

			const room = roomResult.data;

			// Check if participant is assigned
			if (!room.assignedParticipants.includes(userId)) {
				return {
					success: false,
					error: this.createError('NOT_ASSIGNED', 'Participant not assigned to this room')
				};
			}

			const updatedParticipants = room.assignedParticipants.filter(id => id !== userId);
			const newOccupancy = updatedParticipants.length;

			// Update status based on new occupancy
			let newStatus = room.status;
			if (newOccupancy < room.capacity && room.status === DiscussionRoomStatus.FULL) {
				newStatus = DiscussionRoomStatus.ACTIVE;
			}

			return this.update(roomId, {
				assignedParticipants: updatedParticipants,
				currentOccupancy: newOccupancy,
				status: newStatus
			});
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to remove participant from room: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async getRoomStats(eventId: string): Promise<RepositoryOperationResult<{
		totalRooms: number;
		activeRooms: number;
		fullRooms: number;
		totalCapacity: number;
		totalOccupancy: number;
		utilizationRate: number;
		averageRoomSize: number;
	}>> {
		try {
			const roomsResult = await this.findByEvent(eventId);
			if (!roomsResult.success || !roomsResult.data) {
				return roomsResult as any;
			}

			const rooms = roomsResult.data;
			const totalRooms = rooms.length;
			const activeRooms = rooms.filter(r => r.status === DiscussionRoomStatus.ACTIVE).length;
			const fullRooms = rooms.filter(r => r.status === DiscussionRoomStatus.FULL).length;
			const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
			const totalOccupancy = rooms.reduce((sum, r) => sum + r.currentOccupancy, 0);
			const utilizationRate = totalCapacity > 0 ? totalOccupancy / totalCapacity : 0;
			const averageRoomSize = totalRooms > 0 ? totalCapacity / totalRooms : 0;

			return {
				success: true,
				data: {
					totalRooms,
					activeRooms,
					fullRooms,
					totalCapacity,
					totalOccupancy,
					utilizationRate,
					averageRoomSize
				}
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('STATS_ERROR', `Failed to get room stats: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async createRoomsForTopics(
		eventId: string,
		topicIds: string[],
		defaultCapacity: number = 10
	): Promise<RepositoryOperationResult<DiscussionRoom[]>> {
		try {
			const rooms: DiscussionRoom[] = [];

			for (const topicId of topicIds) {
				const room: Partial<DiscussionRoom> = {
					eventId,
					topicId,
					name: `Discussion Room for Topic ${topicId}`,
					capacity: defaultCapacity,
					currentOccupancy: 0,
					status: DiscussionRoomStatus.ACTIVE,
					assignedParticipants: []
				};

				const result = await this.create(room);
				if (result.success && result.data) {
					rooms.push(result.data);
				} else {
					return {
						success: false,
						error: result.error || this.createError('CREATE_ERROR', `Failed to create room for topic ${topicId}`)
					};
				}
			}

			return {
				success: true,
				data: rooms
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('BULK_CREATE_ERROR', `Failed to create rooms for topics: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}
}