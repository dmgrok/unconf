import type { Vote, VoteWeight } from '../../types/entities';
import { isValidVoteWeight, VOTE_WEIGHTS } from '../../types/entities';
import { JSONRepository, type JSONRepositoryConfig } from './JSONRepository';
import type { RepositoryOperationResult, QueryOptions, ValidationResult } from './Repository';

export class VoteRepository extends JSONRepository<Vote> {
	constructor(config: Omit<JSONRepositoryConfig, 'filename'>) {
		super('vote', {
			...config,
			filename: 'votes.json'
		});
	}

	validate(entity: Partial<Vote>): ValidationResult {
		const baseValidation = this.validateRequired(entity, ['userId', 'topicId', 'eventId', 'weight']);
		if (!baseValidation.isValid) {
			return baseValidation;
		}

		const errors: string[] = [];

		// Validate weight
		if (entity.weight && !isValidVoteWeight(entity.weight)) {
			errors.push('Invalid vote weight');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	async findByUser(userId: string, options?: QueryOptions): Promise<RepositoryOperationResult<Vote[]>> {
		return this.findBy({ userId, isActive: true }, options);
	}

	async findByTopic(topicId: string, options?: QueryOptions): Promise<RepositoryOperationResult<Vote[]>> {
		return this.findBy({ topicId, isActive: true }, options);
	}

	async findByEvent(eventId: string, options?: QueryOptions): Promise<RepositoryOperationResult<Vote[]>> {
		return this.findBy({ eventId, isActive: true }, options);
	}

	async findUserVoteForTopic(userId: string, topicId: string): Promise<RepositoryOperationResult<Vote>> {
		try {
			const result = await this.findBy({ userId, topicId, isActive: true });
			if (!result.success || !result.data || result.data.length === 0) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', `No active vote found for user ${userId} on topic ${topicId}`)
				};
			}

			return {
				success: true,
				data: result.data[0]
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('READ_ERROR', `Failed to find user vote: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async findUserVotesInEvent(userId: string, eventId: string, options?: QueryOptions): Promise<RepositoryOperationResult<Vote[]>> {
		return this.findBy({ userId, eventId, isActive: true }, options);
	}

	async validateWeightedVoting(userId: string, eventId: string, weight: VoteWeight): Promise<RepositoryOperationResult<boolean>> {
		try {
			// Get all user's votes in this event
			const userVotesResult = await this.findUserVotesInEvent(userId, eventId);
			if (!userVotesResult.success) {
				return userVotesResult as any;
			}

			const userVotes = userVotesResult.data || [];

			// Check if user already has a vote with this weight
			const hasVoteWithWeight = userVotes.some(vote => vote.weight === weight);
			if (hasVoteWithWeight) {
				return {
					success: false,
					error: this.createError('WEIGHT_ALREADY_USED', `User has already cast a ${weight} choice vote in this event`)
				};
			}

			return {
				success: true,
				data: true
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('VALIDATION_ERROR', `Failed to validate weighted voting: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async validateWeightedVotingForUpdate(userId: string, eventId: string, newWeight: VoteWeight, currentWeight: VoteWeight): Promise<RepositoryOperationResult<boolean>> {
		try {
			// Get all user's votes in this event
			const userVotesResult = await this.findUserVotesInEvent(userId, eventId);
			if (!userVotesResult.success) {
				return userVotesResult as any;
			}

			const userVotes = userVotesResult.data || [];

			// Check if user already has a vote with the new weight (excluding the current vote being updated)
			const hasVoteWithNewWeight = userVotes.some(vote => vote.weight === newWeight && vote.weight !== currentWeight);
			if (hasVoteWithNewWeight) {
				return {
					success: false,
					error: this.createError('WEIGHT_ALREADY_USED', `User has already cast a ${newWeight} choice vote in this event`)
				};
			}

			return {
				success: true,
				data: true
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('VALIDATION_ERROR', `Failed to validate weighted voting for update: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async castVote(userId: string, topicId: string, eventId: string, weight: VoteWeight): Promise<RepositoryOperationResult<Vote>> {
		try {
			// Check if user already voted for this topic
			const existingVote = await this.findUserVoteForTopic(userId, topicId);
			if (existingVote.success) {
				return {
					success: false,
					error: this.createError('DUPLICATE_VOTE', 'User has already voted for this topic')
				};
			}

			// Check if user has already used this vote weight in this event
			const weightValidation = await this.validateWeightedVoting(userId, eventId, weight);
			if (!weightValidation.success) {
				return weightValidation as any;
			}

			const vote = {
				userId,
				topicId,
				eventId,
				weight,
				timestamp: new Date(),
				isActive: true
			};

			return this.create(vote);
		} catch (error) {
			return {
				success: false,
				error: this.createError('VOTE_ERROR', `Failed to cast vote: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async updateVote(userId: string, topicId: string, newWeight: VoteWeight): Promise<RepositoryOperationResult<Vote>> {
		try {
			const existingVoteResult = await this.findUserVoteForTopic(userId, topicId);
			if (!existingVoteResult.success || !existingVoteResult.data) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', 'No existing vote found to update')
				};
			}

			const existingVote = existingVoteResult.data;

			// If weight is changing, validate weighted voting constraints
			if (existingVote.weight !== newWeight) {
				const weightValidation = await this.validateWeightedVotingForUpdate(userId, existingVote.eventId, newWeight, existingVote.weight);
				if (!weightValidation.success) {
					return weightValidation as any;
				}
			}

			return this.update(existingVote.id, {
				weight: newWeight,
				timestamp: new Date()
			});
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to update vote: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async removeVote(userId: string, topicId: string): Promise<RepositoryOperationResult<boolean>> {
		try {
			const existingVoteResult = await this.findUserVoteForTopic(userId, topicId);
			if (!existingVoteResult.success || !existingVoteResult.data) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', 'No existing vote found to remove')
				};
			}

			return this.update(existingVoteResult.data.id, { isActive: false });
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to remove vote: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async getTopicVoteStats(topicId: string): Promise<RepositoryOperationResult<{
		totalVotes: number;
		totalWeight: number;
		averageWeight: number;
		weightDistribution: Record<VoteWeight, number>;
	}>> {
		try {
			const votesResult = await this.findByTopic(topicId);
			if (!votesResult.success) {
				return votesResult as any;
			}

			const votes = votesResult.data || [];
			const totalVotes = votes.length;
			const totalWeight = votes.reduce((sum, vote) => sum + VOTE_WEIGHTS[vote.weight], 0);
			const averageWeight = totalVotes > 0 ? totalWeight / totalVotes : 0;

			const weightDistribution: Record<VoteWeight, number> = {
				[VoteWeight.FIRST]: 0,
				[VoteWeight.SECOND]: 0,
				[VoteWeight.THIRD]: 0
			};

			votes.forEach(vote => {
				weightDistribution[vote.weight]++;
			});

			return {
				success: true,
				data: {
					totalVotes,
					totalWeight,
					averageWeight,
					weightDistribution
				}
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('STATS_ERROR', `Failed to get topic vote stats: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async getUserVoteCount(userId: string, eventId: string): Promise<RepositoryOperationResult<number>> {
		try {
			const votesResult = await this.findUserVotesInEvent(userId, eventId);
			if (!votesResult.success) {
				return votesResult as any;
			}

			return {
				success: true,
				data: votesResult.data?.length || 0
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('COUNT_ERROR', `Failed to get user vote count: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async getUserVoteStatus(userId: string, eventId: string): Promise<RepositoryOperationResult<{
		hasVoted: boolean;
		voteCount: number;
		usedWeights: VoteWeight[];
		availableWeights: VoteWeight[];
		votes: { topicId: string; weight: VoteWeight; timestamp: Date }[];
	}>> {
		try {
			const votesResult = await this.findUserVotesInEvent(userId, eventId);
			if (!votesResult.success) {
				return votesResult as any;
			}

			const votes = votesResult.data || [];
			const usedWeights = votes.map(vote => vote.weight);
			const allWeights = [VoteWeight.FIRST, VoteWeight.SECOND, VoteWeight.THIRD];
			const availableWeights = allWeights.filter(weight => !usedWeights.includes(weight));

			return {
				success: true,
				data: {
					hasVoted: votes.length > 0,
					voteCount: votes.length,
					usedWeights,
					availableWeights,
					votes: votes.map(vote => ({
						topicId: vote.topicId,
						weight: vote.weight,
						timestamp: vote.timestamp
					}))
				}
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('STATUS_ERROR', `Failed to get user vote status: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async getEventVoteStats(eventId: string): Promise<RepositoryOperationResult<{
		totalVotes: number;
		uniqueVoters: number;
		averageVotesPerUser: number;
		weightDistribution: Record<VoteWeight, number>;
	}>> {
		try {
			const votesResult = await this.findByEvent(eventId);
			if (!votesResult.success) {
				return votesResult as any;
			}

			const votes = votesResult.data || [];
			const totalVotes = votes.length;
			const uniqueVoters = new Set(votes.map(vote => vote.userId)).size;
			const averageVotesPerUser = uniqueVoters > 0 ? totalVotes / uniqueVoters : 0;

			const weightDistribution: Record<VoteWeight, number> = {
				[VoteWeight.FIRST]: 0,
				[VoteWeight.SECOND]: 0,
				[VoteWeight.THIRD]: 0
			};

			votes.forEach(vote => {
				weightDistribution[vote.weight]++;
			});

			return {
				success: true,
				data: {
					totalVotes,
					uniqueVoters,
					averageVotesPerUser,
					weightDistribution
				}
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('STATS_ERROR', `Failed to get event vote stats: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async invalidateEventVotes(eventId: string): Promise<RepositoryOperationResult<number>> {
		try {
			const data = await this.readData();
			let updateCount = 0;

			for (let i = 0; i < data.length; i++) {
				if (data[i].eventId === eventId && data[i].isActive) {
					data[i] = {
						...data[i],
						isActive: false,
						...this.updateTimestamp()
					};
					updateCount++;
				}
			}

			if (updateCount > 0) {
				await this.writeData(data);
			}

			return {
				success: true,
				data: updateCount
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to invalidate event votes: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async invalidateTopicVotes(topicId: string): Promise<RepositoryOperationResult<number>> {
		try {
			const data = await this.readData();
			let updateCount = 0;

			for (let i = 0; i < data.length; i++) {
				if (data[i].topicId === topicId && data[i].isActive) {
					data[i] = {
						...data[i],
						isActive: false,
						...this.updateTimestamp()
					};
					updateCount++;
				}
			}

			if (updateCount > 0) {
				await this.writeData(data);
			}

			return {
				success: true,
				data: updateCount
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to invalidate topic votes: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	protected serializeEntity(entity: Vote): any {
		return {
			...super.serializeEntity(entity),
			timestamp: entity.timestamp.toISOString()
		};
	}

	protected deserializeEntity(data: any): Vote {
		const baseEntity = super.deserializeEntity(data);
		return {
			...baseEntity,
			timestamp: new Date(data.timestamp)
		} as Vote;
	}
}