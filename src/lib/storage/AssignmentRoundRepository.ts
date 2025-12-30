import type { AssignmentRound } from '../../types/entities';
import { AssignmentRoundStatus } from '../../types/enums';
import { JSONRepository, type JSONRepositoryConfig } from './JSONRepository';
import type { RepositoryOperationResult, QueryOptions, ValidationResult } from './Repository';

export class AssignmentRoundRepository extends JSONRepository<AssignmentRound> {
	constructor(config: Omit<JSONRepositoryConfig, 'filename'>) {
		super('assignment_round', {
			...config,
			filename: 'assignment_rounds.json'
		});
	}

	validate(entity: Partial<AssignmentRound>): ValidationResult {
		const baseValidation = this.validateRequired(entity, [
			'eventId',
			'roundNumber',
			'status',
			'startedAt',
			'totalParticipants',
			'assignedParticipants',
			'settings'
		]);
		if (!baseValidation.isValid) {
			return baseValidation;
		}

		const errors: string[] = [];

		// Validate round number
		if (entity.roundNumber !== undefined && entity.roundNumber < 1) {
			errors.push('Round number must be at least 1');
		}

		// Validate participant counts
		if (entity.totalParticipants !== undefined && entity.totalParticipants < 0) {
			errors.push('Total participants cannot be negative');
		}

		if (entity.assignedParticipants !== undefined && entity.assignedParticipants < 0) {
			errors.push('Assigned participants cannot be negative');
		}

		if (
			entity.totalParticipants !== undefined &&
			entity.assignedParticipants !== undefined &&
			entity.assignedParticipants > entity.totalParticipants
		) {
			errors.push('Assigned participants cannot exceed total participants');
		}

		// Validate status
		if (entity.status && !Object.values(AssignmentRoundStatus).includes(entity.status)) {
			errors.push('Invalid round status');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	async findByEvent(eventId: string, options?: QueryOptions): Promise<RepositoryOperationResult<AssignmentRound[]>> {
		const result = await this.findBy({ eventId }, options);
		if (result.success && result.data) {
			// Sort by round number ascending
			result.data.sort((a, b) => a.roundNumber - b.roundNumber);
		}
		return result;
	}

	async findCurrentRound(eventId: string): Promise<RepositoryOperationResult<AssignmentRound>> {
		try {
			const result = await this.findBy({
				eventId,
				status: AssignmentRoundStatus.IN_PROGRESS
			});

			if (!result.success || !result.data || result.data.length === 0) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', 'No active round found')
				};
			}

			// Return the most recent in-progress round
			const rounds = result.data.sort((a, b) => b.roundNumber - a.roundNumber);

			return {
				success: true,
				data: rounds[0]
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('QUERY_ERROR', `Failed to find current round: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async findLatestRound(eventId: string): Promise<RepositoryOperationResult<AssignmentRound>> {
		try {
			const result = await this.findByEvent(eventId);
			if (!result.success || !result.data || result.data.length === 0) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', 'No rounds found for event')
				};
			}

			// Return the round with the highest round number
			const latestRound = result.data[result.data.length - 1];

			return {
				success: true,
				data: latestRound
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('QUERY_ERROR', `Failed to find latest round: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async startNewRound(
		eventId: string,
		totalParticipants: number,
		settings: any
	): Promise<RepositoryOperationResult<AssignmentRound>> {
		try {
			// Get the latest round to determine the next round number
			const latestRoundResult = await this.findLatestRound(eventId);
			const nextRoundNumber = latestRoundResult.success
				? latestRoundResult.data.roundNumber + 1
				: 1;

			// Check if there's already an active round
			const currentRoundResult = await this.findCurrentRound(eventId);
			if (currentRoundResult.success) {
				return {
					success: false,
					error: this.createError('ROUND_ALREADY_ACTIVE', 'A round is already in progress')
				};
			}

			const round: Partial<AssignmentRound> = {
				eventId,
				roundNumber: nextRoundNumber,
				status: AssignmentRoundStatus.IN_PROGRESS,
				startedAt: new Date(),
				totalParticipants,
				assignedParticipants: 0,
				settings
			};

			return this.create(round);
		} catch (error) {
			return {
				success: false,
				error: this.createError('CREATE_ERROR', `Failed to start new round: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async completeRound(
		roundId: string,
		assignedParticipants: number,
		results: any
	): Promise<RepositoryOperationResult<AssignmentRound>> {
		try {
			const updateData = {
				status: AssignmentRoundStatus.COMPLETED,
				completedAt: new Date(),
				assignedParticipants,
				results
			};

			return this.update(roundId, updateData);
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to complete round: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async failRound(roundId: string, reason: string): Promise<RepositoryOperationResult<AssignmentRound>> {
		try {
			const updateData = {
				status: AssignmentRoundStatus.FAILED,
				completedAt: new Date(),
				metadata: {
					failureReason: reason
				}
			};

			return this.update(roundId, updateData);
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to mark round as failed: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async cancelRound(roundId: string): Promise<RepositoryOperationResult<AssignmentRound>> {
		try {
			const updateData = {
				status: AssignmentRoundStatus.CANCELLED,
				completedAt: new Date()
			};

			return this.update(roundId, updateData);
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to cancel round: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async updateRoundProgress(
		roundId: string,
		assignedParticipants: number
	): Promise<RepositoryOperationResult<AssignmentRound>> {
		try {
			return this.update(roundId, {
				assignedParticipants
			});
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to update round progress: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async getRoundStats(eventId: string): Promise<RepositoryOperationResult<{
		totalRounds: number;
		completedRounds: number;
		failedRounds: number;
		cancelledRounds: number;
		currentRound?: AssignmentRound;
		latestRound?: AssignmentRound;
		averageAssignmentRate: number;
	}>> {
		try {
			const roundsResult = await this.findByEvent(eventId);
			if (!roundsResult.success || !roundsResult.data) {
				return roundsResult as any;
			}

			const rounds = roundsResult.data;
			const totalRounds = rounds.length;
			const completedRounds = rounds.filter(r => r.status === AssignmentRoundStatus.COMPLETED).length;
			const failedRounds = rounds.filter(r => r.status === AssignmentRoundStatus.FAILED).length;
			const cancelledRounds = rounds.filter(r => r.status === AssignmentRoundStatus.CANCELLED).length;

			// Calculate average assignment rate for completed rounds
			const completedRoundsData = rounds.filter(r => r.status === AssignmentRoundStatus.COMPLETED);
			const averageAssignmentRate = completedRoundsData.length > 0
				? completedRoundsData.reduce((sum, round) => {
					return sum + (round.totalParticipants > 0 ? round.assignedParticipants / round.totalParticipants : 0);
				}, 0) / completedRoundsData.length
				: 0;

			// Get current and latest round
			const currentRoundResult = await this.findCurrentRound(eventId);
			const latestRoundResult = await this.findLatestRound(eventId);

			return {
				success: true,
				data: {
					totalRounds,
					completedRounds,
					failedRounds,
					cancelledRounds,
					currentRound: currentRoundResult.success ? currentRoundResult.data : undefined,
					latestRound: latestRoundResult.success ? latestRoundResult.data : undefined,
					averageAssignmentRate
				}
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('STATS_ERROR', `Failed to get round stats: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async getAllRoundHistory(eventId: string): Promise<RepositoryOperationResult<{
		rounds: AssignmentRound[];
		timeline: {
			roundNumber: number;
			status: AssignmentRoundStatus;
			startedAt: Date;
			completedAt?: Date;
			assignedParticipants: number;
			totalParticipants: number;
			assignmentRate: number;
		}[];
	}>> {
		try {
			const roundsResult = await this.findByEvent(eventId);
			if (!roundsResult.success || !roundsResult.data) {
				return roundsResult as any;
			}

			const rounds = roundsResult.data;
			const timeline = rounds.map(round => ({
				roundNumber: round.roundNumber,
				status: round.status,
				startedAt: round.startedAt,
				completedAt: round.completedAt,
				assignedParticipants: round.assignedParticipants,
				totalParticipants: round.totalParticipants,
				assignmentRate: round.totalParticipants > 0 ? round.assignedParticipants / round.totalParticipants : 0
			}));

			return {
				success: true,
				data: {
					rounds,
					timeline
				}
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('QUERY_ERROR', `Failed to get round history: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	protected serializeEntity(entity: AssignmentRound): any {
		return {
			...super.serializeEntity(entity),
			startedAt: entity.startedAt.toISOString(),
			completedAt: entity.completedAt?.toISOString()
		};
	}

	protected deserializeEntity(data: any): AssignmentRound {
		const baseEntity = super.deserializeEntity(data);
		return {
			...baseEntity,
			startedAt: new Date(data.startedAt),
			completedAt: data.completedAt ? new Date(data.completedAt) : undefined
		} as AssignmentRound;
	}
}