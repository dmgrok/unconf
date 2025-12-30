import type { Topic } from '../../types/entities';
import { TopicStatus, isValidTopicStatus } from '../../types/enums';
import { JSONRepository, type JSONRepositoryConfig } from './JSONRepository';
import type { RepositoryOperationResult, QueryOptions, ValidationResult } from './Repository';

export interface TopicWithVoteInfo extends Topic {
	userVoteWeight?: number;
	hasUserVoted?: boolean;
}

export class TopicRepository extends JSONRepository<Topic> {
	constructor(config: Omit<JSONRepositoryConfig, 'filename'>) {
		super('topic', {
			...config,
			filename: 'topics.json'
		});
	}

	validate(entity: Partial<Topic>): ValidationResult {
		const baseValidation = this.validateRequired(entity, ['title', 'eventId', 'submittedBy']);
		if (!baseValidation.isValid) {
			return baseValidation;
		}

		const errors: string[] = [];

		// Validate title
		if (entity.title && (entity.title.length < 3 || entity.title.length > 200)) {
			errors.push('Title must be between 3 and 200 characters');
		}

		// Validate description
		if (entity.description && entity.description.length > 1000) {
			errors.push('Description must be less than 1000 characters');
		}

		// Validate status
		if (entity.status && !isValidTopicStatus(entity.status)) {
			errors.push('Invalid topic status');
		}

		// Validate vote counts
		if (entity.voteCount !== undefined && entity.voteCount < 0) {
			errors.push('Vote count cannot be negative');
		}

		if (entity.totalVoteWeight !== undefined && entity.totalVoteWeight < 0) {
			errors.push('Total vote weight cannot be negative');
		}

		if (entity.averageWeight !== undefined && (entity.averageWeight < 0 || entity.averageWeight > 3)) {
			errors.push('Average weight must be between 0 and 3');
		}

		// Validate tags
		if (entity.tags && entity.tags.length > 10) {
			errors.push('Maximum 10 tags allowed');
		}

		if (entity.tags) {
			for (const tag of entity.tags) {
				if (tag.length > 50) {
					errors.push('Tag length cannot exceed 50 characters');
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	async findByEvent(eventId: string, options?: QueryOptions): Promise<RepositoryOperationResult<Topic[]>> {
		return this.findBy({ eventId }, options);
	}

	async findByStatus(status: TopicStatus, options?: QueryOptions): Promise<RepositoryOperationResult<Topic[]>> {
		return this.findBy({ status }, options);
	}

	async findByEventAndStatus(eventId: string, status: TopicStatus, options?: QueryOptions): Promise<RepositoryOperationResult<Topic[]>> {
		return this.findBy({ eventId, status }, options);
	}

	async findBySubmitter(submittedBy: string, options?: QueryOptions): Promise<RepositoryOperationResult<Topic[]>> {
		return this.findBy({ submittedBy }, options);
	}

	async findByTags(tags: string[], options?: QueryOptions): Promise<RepositoryOperationResult<Topic[]>> {
		try {
			const data = await this.readData();

			let filteredTopics = data.filter(topic => {
				if (!topic.tags || topic.tags.length === 0) return false;
				return tags.some(tag => topic.tags!.includes(tag));
			});

			if (options?.sortBy) {
				filteredTopics = this.applySorting(filteredTopics, options.sortBy, options.sortOrder || 'asc');
			}

			if (options?.offset || options?.limit) {
				filteredTopics = this.applyPagination(filteredTopics, options.offset || 0, options.limit);
			}

			return {
				success: true,
				data: filteredTopics
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('read_ERROR', `Failed to find topics by tags: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async findTopVotedByEvent(eventId: string, limit: number = 10): Promise<RepositoryOperationResult<Topic[]>> {
		try {
			const data = await this.readData();

			const eventTopics = data
				.filter(topic => topic.eventId === eventId && topic.status === 'active')
				.sort((a, b) => {
					// Primary sort by total vote weight
					if (b.totalVoteWeight !== a.totalVoteWeight) {
						return b.totalVoteWeight - a.totalVoteWeight;
					}
					// Secondary sort by vote count
					if (b.voteCount !== a.voteCount) {
						return b.voteCount - a.voteCount;
					}
					// Tertiary sort by creation time (newer first)
					return b.createdAt.getTime() - a.createdAt.getTime();
				})
				.slice(0, limit);

			return {
				success: true,
				data: eventTopics
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('read_ERROR', `Failed to find top voted topics: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async searchByTitle(query: string, eventId?: string, options?: QueryOptions): Promise<RepositoryOperationResult<Topic[]>> {
		try {
			const data = await this.readData();
			const searchQuery = query.toLowerCase();

			let filteredTopics = data.filter(topic => {
				const matchesTitle = topic.title.toLowerCase().includes(searchQuery);
				const matchesEvent = !eventId || topic.eventId === eventId;
				return matchesTitle && matchesEvent;
			});

			if (options?.sortBy) {
				filteredTopics = this.applySorting(filteredTopics, options.sortBy, options.sortOrder || 'asc');
			} else {
				// Default sort by relevance (exact matches first, then by vote weight)
				filteredTopics = filteredTopics.sort((a, b) => {
					const aExact = a.title.toLowerCase() === searchQuery ? 1 : 0;
					const bExact = b.title.toLowerCase() === searchQuery ? 1 : 0;
					if (aExact !== bExact) return bExact - aExact;
					return b.totalVoteWeight - a.totalVoteWeight;
				});
			}

			if (options?.offset || options?.limit) {
				filteredTopics = this.applyPagination(filteredTopics, options.offset || 0, options.limit);
			}

			return {
				success: true,
				data: filteredTopics
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('read_ERROR', `Failed to search topics: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async updateStatus(id: string, status: TopicStatus): Promise<RepositoryOperationResult<Topic>> {
		if (!isValidTopicStatus(status)) {
			return {
				success: false,
				error: this.createError('VALIDATION_ERROR', 'Invalid topic status')
			};
		}

		return this.update(id, { status });
	}

	async updateVoteStats(id: string, voteCount: number, totalVoteWeight: number): Promise<RepositoryOperationResult<Topic>> {
		const averageWeight = voteCount > 0 ? totalVoteWeight / voteCount : 0;

		return this.update(id, {
			voteCount,
			totalVoteWeight,
			averageWeight,
			lastVotedAt: new Date()
		});
	}

	async incrementVoteStats(id: string, voteWeight: number): Promise<RepositoryOperationResult<Topic>> {
		try {
			const topicResult = await this.findById(id);
			if (!topicResult.success || !topicResult.data) {
				return topicResult;
			}

			const topic = topicResult.data;
			const newVoteCount = topic.voteCount + 1;
			const newTotalWeight = topic.totalVoteWeight + voteWeight;

			return this.updateVoteStats(id, newVoteCount, newTotalWeight);
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to increment vote stats: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async decrementVoteStats(id: string, voteWeight: number): Promise<RepositoryOperationResult<Topic>> {
		try {
			const topicResult = await this.findById(id);
			if (!topicResult.success || !topicResult.data) {
				return topicResult;
			}

			const topic = topicResult.data;
			const newVoteCount = Math.max(0, topic.voteCount - 1);
			const newTotalWeight = Math.max(0, topic.totalVoteWeight - voteWeight);

			return this.updateVoteStats(id, newVoteCount, newTotalWeight);
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to decrement vote stats: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async addTag(id: string, tag: string): Promise<RepositoryOperationResult<Topic>> {
		try {
			const topicResult = await this.findById(id);
			if (!topicResult.success || !topicResult.data) {
				return topicResult;
			}

			const topic = topicResult.data;
			const currentTags = topic.tags || [];

			if (currentTags.includes(tag)) {
				return {
					success: false,
					error: this.createError('DUPLICATE_TAG', 'Tag already exists on this topic')
				};
			}

			if (currentTags.length >= 10) {
				return {
					success: false,
					error: this.createError('TAG_LIMIT_EXCEEDED', 'Maximum 10 tags allowed per topic')
				};
			}

			return this.update(id, {
				tags: [...currentTags, tag]
			});
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to add tag: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async removeTag(id: string, tag: string): Promise<RepositoryOperationResult<Topic>> {
		try {
			const topicResult = await this.findById(id);
			if (!topicResult.success || !topicResult.data) {
				return topicResult;
			}

			const topic = topicResult.data;
			const currentTags = topic.tags || [];

			return this.update(id, {
				tags: currentTags.filter(t => t !== tag)
			});
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to remove tag: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async getAllTags(eventId?: string): Promise<RepositoryOperationResult<string[]>> {
		try {
			const data = await this.readData();
			const filteredTopics = eventId ? data.filter(topic => topic.eventId === eventId) : data;

			const allTags = new Set<string>();
			filteredTopics.forEach(topic => {
				if (topic.tags) {
					topic.tags.forEach(tag => allTags.add(tag));
				}
			});

			return {
				success: true,
				data: Array.from(allTags).sort()
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('read_ERROR', `Failed to get all tags: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async freezeTopics(eventId: string): Promise<RepositoryOperationResult<number>> {
		try {
			const data = await this.readData();
			let updateCount = 0;

			for (let i = 0; i < data.length; i++) {
				if (data[i].eventId === eventId && data[i].status === 'active') {
					data[i] = {
						...data[i],
						status: 'frozen',
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
				error: this.createError('UPDATE_ERROR', `Failed to freeze topics: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async archiveTopics(eventId: string): Promise<RepositoryOperationResult<number>> {
		try {
			const data = await this.readData();
			let updateCount = 0;

			for (let i = 0; i < data.length; i++) {
				if (data[i].eventId === eventId && ['active', 'frozen'].includes(data[i].status)) {
					data[i] = {
						...data[i],
						status: 'archived',
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
				error: this.createError('UPDATE_ERROR', `Failed to archive topics: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	protected serializeEntity(entity: Topic): any {
		return {
			...super.serializeEntity(entity),
			lastVotedAt: entity.lastVotedAt?.toISOString()
		};
	}

	protected deserializeEntity(data: any): Topic {
		const baseEntity = super.deserializeEntity(data);
		return {
			...baseEntity,
			lastVotedAt: data.lastVotedAt ? new Date(data.lastVotedAt) : undefined
		} as Topic;
	}
}