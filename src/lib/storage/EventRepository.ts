import type { Event } from '../../types/entities';
import { EventStatus, isValidEventStatus } from '../../types/enums';
import { EVENT_RULE_LIMITS } from '../validation/eventRules';
import { JSONRepository, type JSONRepositoryConfig } from './JSONRepository';
import type { RepositoryOperationResult, QueryOptions, ValidationResult } from './Repository';

export class EventRepository extends JSONRepository<Event> {
	constructor(config: Omit<JSONRepositoryConfig, 'filename'>) {
		super('event', {
			...config,
			filename: 'events.json'
		});
	}

	validate(entity: Partial<Event>): ValidationResult {
		const baseValidation = this.validateRequired(entity, ['title', 'description', 'organizerId', 'accessCode']);
		if (!baseValidation.isValid) {
			return baseValidation;
		}

		const errors: string[] = [];

		// Validate title
		if (entity.title && (entity.title.length < 3 || entity.title.length > 200)) {
			errors.push('Title must be between 3 and 200 characters');
		}

		// Validate description
		if (entity.description && entity.description.length > 2000) {
			errors.push('Description must be less than 2000 characters');
		}

		// Validate status
		if (entity.status && !isValidEventStatus(entity.status)) {
			errors.push('Invalid event status');
		}

		// Validate access code
		if (entity.accessCode && (entity.accessCode.length < 4 || entity.accessCode.length > 20)) {
			errors.push('Access code must be between 4 and 20 characters');
		}

		// Validate max participants
			if (entity.maxParticipants !== undefined) {
				if (!Number.isInteger(entity.maxParticipants)) {
					errors.push('Max participants must be a whole number');
				} else if (entity.maxParticipants < EVENT_RULE_LIMITS.MIN_CAPACITY || entity.maxParticipants > EVENT_RULE_LIMITS.MAX_CAPACITY) {
					errors.push(`Max participants must be between ${EVENT_RULE_LIMITS.MIN_CAPACITY} and ${EVENT_RULE_LIMITS.MAX_CAPACITY}`);
				}
		}

		// Validate time constraints
		if (entity.startTime && entity.endTime && entity.startTime >= entity.endTime) {
			errors.push('Start time must be before end time');
		}

		// Validate settings
		if (entity.settings) {
				if (entity.settings.votingTimeLimit !== undefined) {
					if (entity.settings.votingTimeLimit < EVENT_RULE_LIMITS.MIN_VOTING_TIME_SECONDS) {
						errors.push(`Voting time limit must be at least ${EVENT_RULE_LIMITS.MIN_VOTING_TIME_SECONDS} seconds`);
					}
					if (entity.settings.votingTimeLimit > EVENT_RULE_LIMITS.MAX_VOTING_TIME_SECONDS) {
						errors.push(`Voting time limit cannot exceed ${EVENT_RULE_LIMITS.MAX_VOTING_TIME_SECONDS} seconds`);
					}
			}
			if (entity.settings.maxVotesPerTopic < 1) {
				errors.push('Max votes per topic must be at least 1');
			}
				if (entity.settings.maxTopicsPerUser !== undefined) {
					if (entity.settings.maxTopicsPerUser < EVENT_RULE_LIMITS.MIN_TOPICS_PER_USER) {
						errors.push(`Max topics per user must be at least ${EVENT_RULE_LIMITS.MIN_TOPICS_PER_USER}`);
					}
					if (entity.settings.maxTopicsPerUser > EVENT_RULE_LIMITS.MAX_TOPICS_PER_USER) {
						errors.push(`Max topics per user cannot exceed ${EVENT_RULE_LIMITS.MAX_TOPICS_PER_USER}`);
					}
			}
		}

			if (entity.metadata) {
				const durationMs = entity.metadata.durationMs as number | undefined;
				if (durationMs !== undefined) {
					if (durationMs < EVENT_RULE_LIMITS.MIN_DURATION_MS) {
						errors.push('Event duration metadata must be at least 1 day');
					}
					if (durationMs > EVENT_RULE_LIMITS.MAX_DURATION_MS) {
						errors.push('Event duration metadata cannot exceed 7 days');
					}
				}

				const votingRounds = entity.metadata.votingRounds as number | undefined;
				if (votingRounds !== undefined) {
					if (votingRounds < EVENT_RULE_LIMITS.MIN_VOTING_ROUNDS) {
						errors.push(`Voting rounds metadata must be at least ${EVENT_RULE_LIMITS.MIN_VOTING_ROUNDS}`);
					}
					if (votingRounds > EVENT_RULE_LIMITS.MAX_VOTING_ROUNDS) {
						errors.push(`Voting rounds metadata cannot exceed ${EVENT_RULE_LIMITS.MAX_VOTING_ROUNDS}`);
					}
				}
			}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	async findByStatus(status: EventStatus, options?: QueryOptions): Promise<RepositoryOperationResult<Event[]>> {
		return this.findBy({ status }, options);
	}

	async findByOrganizer(organizerId: string, options?: QueryOptions): Promise<RepositoryOperationResult<Event[]>> {
		return this.findBy({ organizerId }, options);
	}

	async findBySlug(slug: string): Promise<RepositoryOperationResult<Event>> {
		try {
			const result = await this.findBy({ slug });
			if (!result.success || !result.data || result.data.length === 0) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', `Event with slug ${slug} not found`)
				};
			}

			return {
				success: true,
				data: result.data[0]
			};
		} catch (error) {
			const message = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
			return {
				success: false,
				error: this.createError('REPOSITORY_ERROR', `Failed to find event by slug: ${message}`)
			};
		}
	}

	async findByAccessCode(accessCode: string): Promise<RepositoryOperationResult<Event>> {
		try {
			const result = await this.findBy({ accessCode });
			if (!result.success || !result.data || result.data.length === 0) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', `Event with access code ${accessCode} not found`)
				};
			}

			return {
				success: true,
				data: result.data[0]
			};
			} catch (error) {
				const message = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
			return {
					success: false,
					error: this.createError('READ_ERROR', `Failed to find event by access code: ${message}`)
			};
		}
	}

	async findActiveEvents(options?: QueryOptions): Promise<RepositoryOperationResult<Event[]>> {
			return this.findByStatus(EventStatus.ACTIVE, options);
	}

	async findUpcomingEvents(options?: QueryOptions): Promise<RepositoryOperationResult<Event[]>> {
		try {
			const now = new Date();
			const data = await this.readData();

			let filteredEvents = data.filter(event => {
				return event.status === 'active' &&
					   (!event.startTime || event.startTime > now);
			});

			if (options?.sortBy) {
				filteredEvents = this.applySorting(filteredEvents, options.sortBy, options.sortOrder || 'asc');
			} else {
				// Default sort by start time for upcoming events
				filteredEvents = filteredEvents.sort((a, b) => {
					if (!a.startTime && !b.startTime) return 0;
					if (!a.startTime) return 1;
					if (!b.startTime) return -1;
					return a.startTime.getTime() - b.startTime.getTime();
				});
			}

			if (options?.offset || options?.limit) {
				filteredEvents = this.applyPagination(filteredEvents, options.offset || 0, options.limit);
			}

			return {
				success: true,
				data: filteredEvents
			};
			} catch (error) {
				const message = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
			return {
					success: false,
					error: this.createError('READ_ERROR', `Failed to find upcoming events: ${message}`)
			};
		}
	}

	async updateStatus(id: string, status: EventStatus): Promise<RepositoryOperationResult<Event>> {
		if (!isValidEventStatus(status)) {
			return {
				success: false,
				error: this.createError('VALIDATION_ERROR', 'Invalid event status')
			};
		}

		return this.update(id, { status });
	}

	async updateCurrentActivity(id: string, activity: Event['currentActivity']): Promise<RepositoryOperationResult<Event>> {
		return this.update(id, { currentActivity: activity });
	}

	async incrementParticipantCount(id: string): Promise<RepositoryOperationResult<Event>> {
		try {
			const eventResult = await this.findById(id);
			if (!eventResult.success || !eventResult.data) {
				return eventResult;
			}

			const event = eventResult.data;
			const currentCount = event.metadata?.participantCount as number || 0;

			if (event.maxParticipants && currentCount >= event.maxParticipants) {
				return {
					success: false,
					error: this.createError('LIMIT_EXCEEDED', 'Maximum participants reached')
				};
			}

			return this.update(id, {
				metadata: {
					...event.metadata,
					participantCount: currentCount + 1
				}
			});
			} catch (error) {
				const message = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
			return {
					success: false,
					error: this.createError('UPDATE_ERROR', `Failed to increment participant count: ${message}`)
			};
		}
	}

	async decrementParticipantCount(id: string): Promise<RepositoryOperationResult<Event>> {
		try {
			const eventResult = await this.findById(id);
			if (!eventResult.success || !eventResult.data) {
				return eventResult;
			}

			const event = eventResult.data;
			const currentCount = event.metadata?.participantCount as number || 0;

			return this.update(id, {
				metadata: {
					...event.metadata,
					participantCount: Math.max(0, currentCount - 1)
				}
			});
			} catch (error) {
				const message = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
			return {
					success: false,
					error: this.createError('UPDATE_ERROR', `Failed to decrement participant count: ${message}`)
			};
		}
	}

	async generateUniqueAccessCode(): Promise<string> {
		let attempts = 0;
		const maxAttempts = 10;

		while (attempts < maxAttempts) {
			const code = this.generateAccessCode();
			const existsResult = await this.findByAccessCode(code);

			if (!existsResult.success) {
				return code;
			}

			attempts++;
		}

		throw this.createError('GENERATION_ERROR', 'Failed to generate unique access code after maximum attempts');
	}

	async findAll(): Promise<RepositoryOperationResult<Event[]>> {
		try {
			const data = await this.readData();
			return {
				success: true,
				data: data
			};
		} catch (error) {
			const message = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
			return {
				success: false,
				error: this.createError('QUERY_ERROR', `Failed to find all events: ${message}`)
			};
		}
	}

	private generateAccessCode(): string {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		let result = '';
		for (let i = 0; i < 8; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	}

	protected serializeEntity(entity: Event): Record<string, unknown> {
		return {
			...super.serializeEntity(entity),
			startTime: entity.startTime?.toISOString(),
			endTime: entity.endTime?.toISOString()
		};
	}

	protected deserializeEntity(data: unknown): Event {
		const record = data as Record<string, unknown>;
		const baseEntity = super.deserializeEntity(data);
		return {
			...baseEntity,
			startTime: typeof record.startTime === 'string' ? new Date(record.startTime) : undefined,
			endTime: typeof record.endTime === 'string' ? new Date(record.endTime) : undefined
		} as Event;
	}
}