import type { AuditLog } from '../../types/analytics';
import { AuditAction, EntityType } from '../../types/enums';
import { JSONRepository, type JSONRepositoryConfig } from './JSONRepository';
import type { RepositoryOperationResult, ValidationResult } from './Repository';

export class AuditLogRepository extends JSONRepository<AuditLog> {
	constructor(config: Omit<JSONRepositoryConfig, 'filename'>) {
		super('auditlog', {
			...config,
			filename: 'audit-logs.json'
		});
	}

	validate(entity: Partial<AuditLog>): ValidationResult {
		const baseValidation = this.validateRequired(entity, ['action', 'entityType', 'entityId']);
		if (!baseValidation.isValid) {
			return baseValidation;
		}

		const errors: string[] = [];

		// Validate action is a valid AuditAction
		if (entity.action && typeof entity.action !== 'string') {
			errors.push('Action must be a string');
		}

		// Validate entityType is a valid EntityType
		if (entity.entityType && typeof entity.entityType !== 'string') {
			errors.push('Entity type must be a string');
		}

		// Validate entityId
		if (entity.entityId && typeof entity.entityId !== 'string') {
			errors.push('Entity ID must be a string');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	/**
	 * Find audit logs by action type
	 */
	async findByAction(action: AuditAction): Promise<RepositoryOperationResult<AuditLog[]>> {
		return this.findBy({ action } as Partial<AuditLog>);
	}

	/**
	 * Find audit logs by entity type
	 */
	async findByEntityType(
		entityType: EntityType
	): Promise<RepositoryOperationResult<AuditLog[]>> {
		return this.findBy({ entityType } as Partial<AuditLog>);
	}

	/**
	 * Find audit logs by user ID
	 */
	async findByUserId(userId: string): Promise<RepositoryOperationResult<AuditLog[]>> {
		return this.findBy({ userId } as Partial<AuditLog>);
	}

	/**
	 * Find audit logs by target entity ID
	 */
	async findByTargetId(targetId: string): Promise<RepositoryOperationResult<AuditLog[]>> {
		const allLogs = await this.findAll();
		if (!allLogs.success || !allLogs.data) {
			return allLogs;
		}

		const filtered = allLogs.data.filter((log) => {
			// Check if targetId is in metadata or matches entityId
			return (
				log.entityId === targetId ||
				(log.metadata && (log.metadata as any).targetId === targetId)
			);
		});

		return {
			success: true,
			data: filtered
		};
	}

	/**
	 * Find audit logs by event ID
	 */
	async findByEventId(eventId: string): Promise<RepositoryOperationResult<AuditLog[]>> {
		return this.findBy({ eventId } as Partial<AuditLog>);
	}

	/**
	 * Find audit logs within a date range
	 */
	async findByDateRange(
		startDate: Date,
		endDate: Date
	): Promise<RepositoryOperationResult<AuditLog[]>> {
		const allLogs = await this.findAll();
		if (!allLogs.success || !allLogs.data) {
			return allLogs;
		}

		const filtered = allLogs.data.filter((log) => {
			const logDate = new Date(log.createdAt);
			return logDate >= startDate && logDate <= endDate;
		});

		return {
			success: true,
			data: filtered
		};
	}

	/**
	 * Create an audit log entry
	 */
	async create(
		data: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<RepositoryOperationResult<AuditLog>> {
		const auditLog: Partial<AuditLog> = {
			...data,
			success: data.success !== undefined ? data.success : true,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		return super.create(auditLog as Omit<AuditLog, 'id'>);
	}
}
