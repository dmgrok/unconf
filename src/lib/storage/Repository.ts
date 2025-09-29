import type { BaseEntity } from '../../types/entities';

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

export interface RepositoryError extends Error {
	code: string;
	context?: Record<string, unknown>;
}

export interface QueryOptions {
	limit?: number;
	offset?: number;
	sortBy?: string;
	sortOrder?: 'asc' | 'desc';
	filters?: Record<string, unknown>;
}

export interface RepositoryOperationResult<T> {
	success: boolean;
	data?: T;
	error?: RepositoryError;
}

export abstract class Repository<T extends BaseEntity> {
	protected readonly entityName: string;

	constructor(entityName: string) {
		this.entityName = entityName;
	}

	abstract create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<RepositoryOperationResult<T>>;

	abstract findById(id: string): Promise<RepositoryOperationResult<T>>;

	abstract findAll(options?: QueryOptions): Promise<RepositoryOperationResult<T[]>>;

	abstract update(id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<RepositoryOperationResult<T>>;

	abstract delete(id: string): Promise<RepositoryOperationResult<boolean>>;

	abstract findBy(criteria: Partial<T>, options?: QueryOptions): Promise<RepositoryOperationResult<T[]>>;

	abstract count(criteria?: Partial<T>): Promise<RepositoryOperationResult<number>>;

	abstract exists(id: string): Promise<RepositoryOperationResult<boolean>>;

	abstract validate(entity: Partial<T>): ValidationResult;

	protected generateId(): string {
		return `${this.entityName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	protected createTimestamps(): { createdAt: Date; updatedAt: Date } {
		const now = new Date();
		return { createdAt: now, updatedAt: now };
	}

	protected updateTimestamp(): { updatedAt: Date } {
		return { updatedAt: new Date() };
	}

	protected createError(code: string, message: string, context?: Record<string, unknown>): RepositoryError {
		const error = new Error(message) as RepositoryError;
		error.code = code;
		error.context = context;
		return error;
	}

	protected validateRequired(entity: Partial<T>, requiredFields: (keyof T)[]): ValidationResult {
		const errors: string[] = [];

		for (const field of requiredFields) {
			if (!entity[field]) {
				errors.push(`${String(field)} is required`);
			}
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}
}