import type { RoomAssignment } from '../../types/entities';
import { AssignmentMethod, AssignmentStatus } from '../../types/enums';
import { JSONRepository, type JSONRepositoryConfig } from './JSONRepository';
import type { RepositoryOperationResult, QueryOptions, ValidationResult } from './Repository';

export class RoomAssignmentRepository extends JSONRepository<RoomAssignment> {
	constructor(config: Omit<JSONRepositoryConfig, 'filename'>) {
		super('room_assignment', {
			...config,
			filename: 'room_assignments.json'
		});
	}

	validate(entity: Partial<RoomAssignment>): ValidationResult {
		const baseValidation = this.validateRequired(entity, [
			'eventId',
			'userId',
			'roomId',
			'topicId',
			'assignmentRound',
			'assignmentMethod',
			'status'
		]);
		if (!baseValidation.isValid) {
			return baseValidation;
		}

		const errors: string[] = [];

		// Validate assignment round
		if (entity.assignmentRound !== undefined && entity.assignmentRound < 1) {
			errors.push('Assignment round must be at least 1');
		}

		// Validate preference rank
		if (entity.preferenceRank !== undefined &&
			(entity.preferenceRank < 1 || entity.preferenceRank > 3)) {
			errors.push('Preference rank must be between 1 and 3');
		}

		// Validate assignment method
		if (entity.assignmentMethod &&
			!Object.values(AssignmentMethod).includes(entity.assignmentMethod)) {
			errors.push('Invalid assignment method');
		}

		// Validate status
		if (entity.status && !Object.values(AssignmentStatus).includes(entity.status)) {
			errors.push('Invalid assignment status');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	async findByEvent(eventId: string, options?: QueryOptions): Promise<RepositoryOperationResult<RoomAssignment[]>> {
		return this.findBy({ eventId }, options);
	}

	async findByUser(userId: string, options?: QueryOptions): Promise<RepositoryOperationResult<RoomAssignment[]>> {
		return this.findBy({ userId }, options);
	}

	async findByRoom(roomId: string, options?: QueryOptions): Promise<RepositoryOperationResult<RoomAssignment[]>> {
		return this.findBy({ roomId }, options);
	}

	async findByTopic(topicId: string, options?: QueryOptions): Promise<RepositoryOperationResult<RoomAssignment[]>> {
		return this.findBy({ topicId }, options);
	}

	async findByRound(eventId: string, roundNumber: number): Promise<RepositoryOperationResult<RoomAssignment[]>> {
		return this.findBy({ eventId, assignmentRound: roundNumber });
	}

	async findActiveAssignments(eventId: string): Promise<RepositoryOperationResult<RoomAssignment[]>> {
		return this.findBy({
			eventId,
			status: AssignmentStatus.ASSIGNED
		});
	}

	async findUserCurrentAssignment(userId: string, eventId: string): Promise<RepositoryOperationResult<RoomAssignment>> {
		try {
			const result = await this.findBy({
				userId,
				eventId,
				status: AssignmentStatus.ASSIGNED
			});

			if (!result.success || !result.data || result.data.length === 0) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', `No active assignment found for user ${userId}`)
				};
			}

			// Return the most recent assignment
			const assignments = result.data.sort((a, b) =>
				new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
			);

			return {
				success: true,
				data: assignments[0]
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('QUERY_ERROR', `Failed to find user assignment: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async assignUserToRoom(
		userId: string,
		roomId: string,
		topicId: string,
		eventId: string,
		roundNumber: number,
		method: AssignmentMethod = AssignmentMethod.AUTOMATIC,
		preferenceRank?: number
	): Promise<RepositoryOperationResult<RoomAssignment>> {
		try {
			// Check if user already has an active assignment
			const existingAssignment = await this.findUserCurrentAssignment(userId, eventId);
			if (existingAssignment.success) {
				return {
					success: false,
					error: this.createError('ALREADY_ASSIGNED', 'User already has an active assignment')
				};
			}

			const assignment: Partial<RoomAssignment> = {
				eventId,
				userId,
				roomId,
				topicId,
				assignmentRound: roundNumber,
				assignmentMethod: method,
				preferenceRank,
				assignedAt: new Date(),
				status: AssignmentStatus.ASSIGNED
			};

			return this.create(assignment);
		} catch (error) {
			return {
				success: false,
				error: this.createError('ASSIGNMENT_ERROR', `Failed to assign user to room: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async moveUserToRoom(
		userId: string,
		newRoomId: string,
		newTopicId: string,
		eventId: string,
		method: AssignmentMethod = AssignmentMethod.MANUAL
	): Promise<RepositoryOperationResult<RoomAssignment>> {
		try {
			// Find current assignment
			const currentAssignmentResult = await this.findUserCurrentAssignment(userId, eventId);
			if (!currentAssignmentResult.success || !currentAssignmentResult.data) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', 'No current assignment found to move')
				};
			}

			const currentAssignment = currentAssignmentResult.data;

			// Mark current assignment as moved
			const updateResult = await this.update(currentAssignment.id, {
				status: AssignmentStatus.MOVED
			});

			if (!updateResult.success) {
				return updateResult;
			}

			// Create new assignment
			const newAssignment: Partial<RoomAssignment> = {
				eventId,
				userId,
				roomId: newRoomId,
				topicId: newTopicId,
				assignmentRound: currentAssignment.assignmentRound,
				assignmentMethod: method,
				assignedAt: new Date(),
				status: AssignmentStatus.ASSIGNED,
				metadata: {
					previousRoomId: currentAssignment.roomId,
					movedFrom: currentAssignment.id
				}
			};

			return this.create(newAssignment);
		} catch (error) {
			return {
				success: false,
				error: this.createError('MOVE_ERROR', `Failed to move user to new room: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async cancelAssignment(assignmentId: string): Promise<RepositoryOperationResult<RoomAssignment>> {
		return this.update(assignmentId, {
			status: AssignmentStatus.CANCELLED
		});
	}

	async confirmAssignment(assignmentId: string): Promise<RepositoryOperationResult<RoomAssignment>> {
		return this.update(assignmentId, {
			status: AssignmentStatus.CONFIRMED
		});
	}

	async bulkAssign(assignments: Partial<RoomAssignment>[]): Promise<RepositoryOperationResult<RoomAssignment[]>> {
		try {
			const results: RoomAssignment[] = [];

			for (const assignment of assignments) {
				const result = await this.create(assignment);
				if (result.success && result.data) {
					results.push(result.data);
				} else {
					return {
						success: false,
						error: result.error || this.createError('BULK_ASSIGN_ERROR', 'Failed to create assignment')
					};
				}
			}

			return {
				success: true,
				data: results
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('BULK_ASSIGN_ERROR', `Failed to perform bulk assignment: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async getAssignmentStats(eventId: string): Promise<RepositoryOperationResult<{
		totalAssignments: number;
		activeAssignments: number;
		confirmedAssignments: number;
		cancelledAssignments: number;
		movedAssignments: number;
		assignmentsByMethod: Record<AssignmentMethod, number>;
		assignmentsByPreference: Record<number, number>;
		averagePreferenceRank: number;
	}>> {
		try {
			const assignmentsResult = await this.findByEvent(eventId);
			if (!assignmentsResult.success || !assignmentsResult.data) {
				return assignmentsResult as any;
			}

			const assignments = assignmentsResult.data;
			const totalAssignments = assignments.length;
			const activeAssignments = assignments.filter(a => a.status === AssignmentStatus.ASSIGNED).length;
			const confirmedAssignments = assignments.filter(a => a.status === AssignmentStatus.CONFIRMED).length;
			const cancelledAssignments = assignments.filter(a => a.status === AssignmentStatus.CANCELLED).length;
			const movedAssignments = assignments.filter(a => a.status === AssignmentStatus.MOVED).length;

			// Assignment by method
			const assignmentsByMethod: Record<AssignmentMethod, number> = {
				[AssignmentMethod.AUTOMATIC]: 0,
				[AssignmentMethod.MANUAL]: 0,
				[AssignmentMethod.OVERFLOW]: 0,
				[AssignmentMethod.REBALANCE]: 0
			};

			assignments.forEach(assignment => {
				assignmentsByMethod[assignment.assignmentMethod]++;
			});

			// Assignment by preference
			const assignmentsByPreference: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
			let totalPreferenceRanks = 0;
			let preferenceCount = 0;

			assignments.forEach(assignment => {
				if (assignment.preferenceRank) {
					assignmentsByPreference[assignment.preferenceRank]++;
					totalPreferenceRanks += assignment.preferenceRank;
					preferenceCount++;
				}
			});

			const averagePreferenceRank = preferenceCount > 0 ? totalPreferenceRanks / preferenceCount : 0;

			return {
				success: true,
				data: {
					totalAssignments,
					activeAssignments,
					confirmedAssignments,
					cancelledAssignments,
					movedAssignments,
					assignmentsByMethod,
					assignmentsByPreference,
					averagePreferenceRank
				}
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('STATS_ERROR', `Failed to get assignment stats: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async validateAssignmentCapacity(roomId: string): Promise<RepositoryOperationResult<{
		isValid: boolean;
		currentCount: number;
		capacity?: number;
		violations: string[];
	}>> {
		try {
			const assignmentsResult = await this.findBy({
				roomId,
				status: AssignmentStatus.ASSIGNED
			});

			if (!assignmentsResult.success) {
				return assignmentsResult as any;
			}

			const currentCount = assignmentsResult.data?.length || 0;

			// Note: We'd need to fetch room capacity from DiscussionRoomRepository
			// For now, return current count
			return {
				success: true,
				data: {
					isValid: true, // Can't validate without room data
					currentCount,
					violations: []
				}
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('VALIDATION_ERROR', `Failed to validate assignment capacity: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	protected serializeEntity(entity: RoomAssignment): any {
		return {
			...super.serializeEntity(entity),
			assignedAt: entity.assignedAt.toISOString()
		};
	}

	protected deserializeEntity(data: any): RoomAssignment {
		const baseEntity = super.deserializeEntity(data);
		return {
			...baseEntity,
			assignedAt: new Date(data.assignedAt)
		} as RoomAssignment;
	}
}