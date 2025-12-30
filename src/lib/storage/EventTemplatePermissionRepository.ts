import type { EventTemplatePermission } from '../../types/entities';
import { TemplatePermissionType, isValidTemplatePermission } from '../../types/enums';
import { JSONRepository, type JSONRepositoryConfig } from './JSONRepository';
import type { RepositoryOperationResult, QueryOptions, ValidationResult } from './Repository';

export class EventTemplatePermissionRepository extends JSONRepository<EventTemplatePermission> {
	constructor(config: Omit<JSONRepositoryConfig, 'filename'>) {
		super('eventTemplatePermission', {
			...config,
			filename: 'event-template-permissions.json'
		});
	}

	validate(entity: Partial<EventTemplatePermission>): ValidationResult {
		const baseValidation = this.validateRequired(entity, ['templateId', 'userId', 'permission', 'grantedBy']);
		if (!baseValidation.isValid) {
			return baseValidation;
		}

		const errors: string[] = [];

		// Validate permission type
		if (entity.permission && !isValidTemplatePermission(entity.permission)) {
			errors.push('Invalid permission type');
		}

		// Validate template ID
		if (entity.templateId && entity.templateId.length < 1) {
			errors.push('Template ID is required');
		}

		// Validate user ID
		if (entity.userId && entity.userId.length < 1) {
			errors.push('User ID is required');
		}

		// Validate grantedBy
		if (entity.grantedBy && entity.grantedBy.length < 1) {
			errors.push('GrantedBy user ID is required');
		}

		// Validate granted date
		if (entity.grantedAt && entity.grantedAt > new Date()) {
			errors.push('Granted date cannot be in the future');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	async findByTemplate(templateId: string, options?: QueryOptions): Promise<RepositoryOperationResult<EventTemplatePermission[]>> {
		return this.findBy({ templateId }, options);
	}

	async findByUser(userId: string, options?: QueryOptions): Promise<RepositoryOperationResult<EventTemplatePermission[]>> {
		return this.findBy({ userId }, options);
	}

	async findByTemplateAndUser(templateId: string, userId: string): Promise<RepositoryOperationResult<EventTemplatePermission>> {
		try {
			const result = await this.findBy({ templateId, userId });
			if (!result.success || !result.data || result.data.length === 0) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', `Permission not found for template ${templateId} and user ${userId}`)
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
				error: this.createError('read_ERROR', `Failed to find permission: ${message}`)
			};
		}
	}

	async hasPermission(templateId: string, userId: string, requiredPermission: TemplatePermissionType): Promise<RepositoryOperationResult<boolean>> {
		try {
			const permissionResult = await this.findByTemplateAndUser(templateId, userId);

			if (!permissionResult.success) {
				return {
					success: true,
					data: false
				};
			}

			const permission = permissionResult.data;
			const hasRequiredPermission = this.checkPermissionLevel(permission.permission, requiredPermission);

			return {
				success: true,
				data: hasRequiredPermission
			};
		} catch (error) {
			const message = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
			return {
				success: false,
				error: this.createError('read_ERROR', `Failed to check permission: ${message}`)
			};
		}
	}

	async grantPermission(
		templateId: string,
		userId: string,
		permission: TemplatePermissionType,
		grantedBy: string
	): Promise<RepositoryOperationResult<EventTemplatePermission>> {
		try {
			// Check if permission already exists
			const existingResult = await this.findByTemplateAndUser(templateId, userId);

			if (existingResult.success) {
				// Update existing permission
				return this.update(existingResult.data.id, {
					permission,
					grantedBy,
					grantedAt: new Date()
				});
			} else {
				// Create new permission
				return this.create({
					templateId,
					userId,
					permission,
					grantedBy,
					grantedAt: new Date()
				});
			}
		} catch (error) {
			const message = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to grant permission: ${message}`)
			};
		}
	}

	async revokePermission(templateId: string, userId: string): Promise<RepositoryOperationResult<boolean>> {
		try {
			const permissionResult = await this.findByTemplateAndUser(templateId, userId);

			if (!permissionResult.success) {
				return {
					success: true,
					data: true // Already revoked
				};
			}

			return this.delete(permissionResult.data.id);
		} catch (error) {
			const message = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
			return {
				success: false,
				error: this.createError('DELETE_ERROR', `Failed to revoke permission: ${message}`)
			};
		}
	}

	async getTemplatePermissions(templateId: string): Promise<RepositoryOperationResult<EventTemplatePermission[]>> {
		return this.findByTemplate(templateId, {
			sortBy: 'grantedAt',
			sortOrder: 'desc'
		});
	}

	async getUserPermissions(userId: string): Promise<RepositoryOperationResult<EventTemplatePermission[]>> {
		return this.findByUser(userId, {
			sortBy: 'grantedAt',
			sortOrder: 'desc'
		});
	}

	async bulkGrantPermissions(
		templateId: string,
		userPermissions: { userId: string; permission: TemplatePermissionType }[],
		grantedBy: string
	): Promise<RepositoryOperationResult<EventTemplatePermission[]>> {
		try {
			const results: EventTemplatePermission[] = [];
			const errors: string[] = [];

			for (const { userId, permission } of userPermissions) {
				const result = await this.grantPermission(templateId, userId, permission, grantedBy);
				if (result.success) {
					results.push(result.data);
				} else {
					errors.push(`Failed to grant ${permission} to user ${userId}: ${result.error?.message}`);
				}
			}

			if (errors.length > 0 && results.length === 0) {
				return {
					success: false,
					error: this.createError('BULK_OPERATION_ERROR', `All permissions failed: ${errors.join('; ')}`)
				};
			}

			return {
				success: true,
				data: results
			};
		} catch (error) {
			const message = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
			return {
				success: false,
				error: this.createError('BULK_OPERATION_ERROR', `Failed to bulk grant permissions: ${message}`)
			};
		}
	}

	async bulkRevokePermissions(templateId: string, userIds: string[]): Promise<RepositoryOperationResult<boolean>> {
		try {
			const errors: string[] = [];
			let successCount = 0;

			for (const userId of userIds) {
				const result = await this.revokePermission(templateId, userId);
				if (result.success) {
					successCount++;
				} else {
					errors.push(`Failed to revoke permission for user ${userId}: ${result.error?.message}`);
				}
			}

			if (errors.length > 0 && successCount === 0) {
				return {
					success: false,
					error: this.createError('BULK_OPERATION_ERROR', `All revocations failed: ${errors.join('; ')}`)
				};
			}

			return {
				success: true,
				data: true
			};
		} catch (error) {
			const message = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
			return {
				success: false,
				error: this.createError('BULK_OPERATION_ERROR', `Failed to bulk revoke permissions: ${message}`)
			};
		}
	}

	private checkPermissionLevel(userPermission: TemplatePermissionType, requiredPermission: TemplatePermissionType): boolean {
		const permissionHierarchy: Record<TemplatePermissionType, number> = {
			[TemplatePermissionType.VIEW]: 1,
			[TemplatePermissionType.USE]: 2,
			[TemplatePermissionType.EDIT]: 3,
			[TemplatePermissionType.SHARE]: 4,
			[TemplatePermissionType.ADMIN]: 5
		};

		return permissionHierarchy[userPermission] >= permissionHierarchy[requiredPermission];
	}

	protected serializeEntity(entity: EventTemplatePermission): Record<string, unknown> {
		return {
			...super.serializeEntity(entity),
			grantedAt: entity.grantedAt.toISOString()
		};
	}

	protected deserializeEntity(data: unknown): EventTemplatePermission {
		const record = data as Record<string, unknown>;
		const baseEntity = super.deserializeEntity(data);
		return {
			...baseEntity,
			grantedAt: new Date(record.grantedAt as string)
		} as EventTemplatePermission;
	}
}