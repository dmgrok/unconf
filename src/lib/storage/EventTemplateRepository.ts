import type { EventTemplate } from '../../types/entities';
import { TemplateCategory, TemplatePermissionType, isValidTemplateCategory, isValidTemplatePermission } from '../../types/enums';
import { JSONRepository, type JSONRepositoryConfig } from './JSONRepository';
import type { RepositoryOperationResult, QueryOptions, ValidationResult } from './Repository';

export class EventTemplateRepository extends JSONRepository<EventTemplate> {
	constructor(config: Omit<JSONRepositoryConfig, 'filename'>) {
		super('eventTemplate', {
			...config,
			filename: 'event-templates.json'
		});
	}

	validate(entity: Partial<EventTemplate>): ValidationResult {
		const baseValidation = this.validateRequired(entity, ['name', 'category', 'createdBy', 'templateData']);
		if (!baseValidation.isValid) {
			return baseValidation;
		}

		const errors: string[] = [];

		// Validate name
		if (entity.name && (entity.name.length < 3 || entity.name.length > 200)) {
			errors.push('Template name must be between 3 and 200 characters');
		}

		// Validate description
		if (entity.description && entity.description.length > 1000) {
			errors.push('Description must be less than 1000 characters');
		}

		// Validate category
		if (entity.category && !isValidTemplateCategory(entity.category)) {
			errors.push('Invalid template category');
		}

		// Validate usage count
		if (entity.usageCount !== undefined && entity.usageCount < 0) {
			errors.push('Usage count cannot be negative');
		}

		// Validate template data structure
		if (entity.templateData) {
			if (!entity.templateData.eventSettings) {
				errors.push('Template must include event settings');
			}

			// Validate topics if present
			if (entity.templateData.topics) {
				entity.templateData.topics.forEach((topic, index) => {
					if (!topic.title || topic.title.length < 1 || topic.title.length > 200) {
						errors.push(`Topic ${index + 1}: Title must be between 1 and 200 characters`);
					}
					if (topic.description && topic.description.length > 1000) {
						errors.push(`Topic ${index + 1}: Description must be less than 1000 characters`);
					}
				});
			}

			// Validate rooms if present
			if (entity.templateData.rooms) {
				entity.templateData.rooms.forEach((room, index) => {
					if (!room.name || room.name.length < 1 || room.name.length > 100) {
						errors.push(`Room ${index + 1}: Name must be between 1 and 100 characters`);
					}
					if (room.capacity < 1 || room.capacity > 100) {
						errors.push(`Room ${index + 1}: Capacity must be between 1 and 100`);
					}
					if (room.description && room.description.length > 500) {
						errors.push(`Room ${index + 1}: Description must be less than 500 characters`);
					}
				});
			}
		}

		// Validate shared with array
		if (entity.sharedWith && !Array.isArray(entity.sharedWith)) {
			errors.push('SharedWith must be an array of user IDs');
		}

		// Validate tags
		if (entity.tags && !Array.isArray(entity.tags)) {
			errors.push('Tags must be an array of strings');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	async findByCreator(createdBy: string, options?: QueryOptions): Promise<RepositoryOperationResult<EventTemplate[]>> {
		return this.findBy({ createdBy }, options);
	}

	async findByCategory(category: TemplateCategory, options?: QueryOptions): Promise<RepositoryOperationResult<EventTemplate[]>> {
		return this.findBy({ category }, options);
	}

	async findPublicTemplates(options?: QueryOptions): Promise<RepositoryOperationResult<EventTemplate[]>> {
		return this.findBy({ isPublic: true }, options);
	}

	async findSharedWithUser(userId: string, options?: QueryOptions): Promise<RepositoryOperationResult<EventTemplate[]>> {
		try {
			const data = await this.readData();

			let filteredTemplates = data.filter(template =>
				template.isPublic ||
				template.createdBy === userId ||
				template.sharedWith.includes(userId)
			);

			if (options?.sortBy) {
				filteredTemplates = this.applySorting(filteredTemplates, options.sortBy, options.sortOrder || 'asc');
			} else {
				// Default sort by usage count and last used
				filteredTemplates = filteredTemplates.sort((a, b) => {
					// Sort by usage count first (descending)
					if (a.usageCount !== b.usageCount) {
						return b.usageCount - a.usageCount;
					}
					// Then by last used date (most recent first)
					if (a.lastUsedAt && b.lastUsedAt) {
						return b.lastUsedAt.getTime() - a.lastUsedAt.getTime();
					}
					if (a.lastUsedAt && !b.lastUsedAt) return -1;
					if (!a.lastUsedAt && b.lastUsedAt) return 1;
					// Finally by creation date (newest first)
					return b.createdAt.getTime() - a.createdAt.getTime();
				});
			}

			if (options?.offset || options?.limit) {
				filteredTemplates = this.applyPagination(filteredTemplates, options.offset || 0, options.limit);
			}

			return {
				success: true,
				data: filteredTemplates
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				error: this.createError('read_ERROR', `Failed to find templates shared with user: ${message}`)
			};
		}
	}

	async searchTemplates(query: string, userId: string, options?: QueryOptions): Promise<RepositoryOperationResult<EventTemplate[]>> {
		try {
			const data = await this.readData();
			const searchTerm = query.toLowerCase();

			let filteredTemplates = data.filter(template => {
				// Only include templates user has access to
				const hasAccess = template.isPublic ||
								 template.createdBy === userId ||
								 template.sharedWith.includes(userId);

				if (!hasAccess) return false;

				// Search in name, description, category, and tags
				const searchFields = [
					template.name.toLowerCase(),
					template.description?.toLowerCase() || '',
					template.category.toLowerCase(),
					...(template.tags?.map(tag => tag.toLowerCase()) || [])
				];

				return searchFields.some(field => field.includes(searchTerm));
			});

			if (options?.sortBy) {
				filteredTemplates = this.applySorting(filteredTemplates, options.sortBy, options.sortOrder || 'asc');
			} else {
				// Default sort by relevance (usage count and match quality)
				filteredTemplates = filteredTemplates.sort((a, b) => {
					const aNameMatch = a.name.toLowerCase().includes(searchTerm);
					const bNameMatch = b.name.toLowerCase().includes(searchTerm);

					// Prioritize name matches
					if (aNameMatch && !bNameMatch) return -1;
					if (!aNameMatch && bNameMatch) return 1;

					// Then by usage count
					return b.usageCount - a.usageCount;
				});
			}

			if (options?.offset || options?.limit) {
				filteredTemplates = this.applyPagination(filteredTemplates, options.offset || 0, options.limit);
			}

			return {
				success: true,
				data: filteredTemplates
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				error: this.createError('read_ERROR', `Failed to search templates: ${message}`)
			};
		}
	}

	async incrementUsageCount(id: string): Promise<RepositoryOperationResult<EventTemplate>> {
		try {
			const templateResult = await this.findById(id);
			if (!templateResult.success || !templateResult.data) {
				return templateResult;
			}

			const template = templateResult.data;
			return this.update(id, {
				usageCount: template.usageCount + 1,
				lastUsedAt: new Date()
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to increment usage count: ${message}`)
			};
		}
	}

	async shareTemplate(templateId: string, userIds: string[]): Promise<RepositoryOperationResult<EventTemplate>> {
		try {
			const templateResult = await this.findById(templateId);
			if (!templateResult.success || !templateResult.data) {
				return templateResult;
			}

			const template = templateResult.data;
			const uniqueUserIds = Array.from(new Set([...template.sharedWith, ...userIds]));

			return this.update(templateId, {
				sharedWith: uniqueUserIds
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to share template: ${message}`)
			};
		}
	}

	async unshareTemplate(templateId: string, userIds: string[]): Promise<RepositoryOperationResult<EventTemplate>> {
		try {
			const templateResult = await this.findById(templateId);
			if (!templateResult.success || !templateResult.data) {
				return templateResult;
			}

			const template = templateResult.data;
			const updatedSharedWith = template.sharedWith.filter(userId => !userIds.includes(userId));

			return this.update(templateId, {
				sharedWith: updatedSharedWith
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to unshare template: ${message}`)
			};
		}
	}

	async updateVisibility(templateId: string, isPublic: boolean): Promise<RepositoryOperationResult<EventTemplate>> {
		return this.update(templateId, { isPublic });
	}

	async getPopularTemplates(limit: number = 10, options?: QueryOptions): Promise<RepositoryOperationResult<EventTemplate[]>> {
		const updatedOptions = {
			...options,
			sortBy: 'usageCount',
			sortOrder: 'desc' as const,
			limit
		};
		return this.findPublicTemplates(updatedOptions);
	}

	async getRecentTemplates(limit: number = 10, options?: QueryOptions): Promise<RepositoryOperationResult<EventTemplate[]>> {
		const updatedOptions = {
			...options,
			sortBy: 'createdAt',
			sortOrder: 'desc' as const,
			limit
		};
		return this.findPublicTemplates(updatedOptions);
	}

	protected serializeEntity(entity: EventTemplate): Record<string, unknown> {
		return {
			...super.serializeEntity(entity),
			lastUsedAt: entity.lastUsedAt?.toISOString()
		};
	}

	protected deserializeEntity(data: unknown): EventTemplate {
		const record = data as Record<string, unknown>;
		const baseEntity = super.deserializeEntity(data);
		return {
			...baseEntity,
			lastUsedAt: typeof record.lastUsedAt === 'string' ? new Date(record.lastUsedAt) : undefined
		} as EventTemplate;
	}
}