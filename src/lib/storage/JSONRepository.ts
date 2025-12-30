import { promises as fs } from 'fs';
import path from 'path';
import type { BaseEntity } from '../../types/entities';
import { Repository, type RepositoryOperationResult, type QueryOptions, type ValidationResult } from './Repository';

export interface JSONRepositoryConfig {
	dataDir: string;
	filename: string;
	enableBackups?: boolean;
	backupRetention?: number;
}

export abstract class JSONRepository<T extends BaseEntity> extends Repository<T> {
	protected readonly config: JSONRepositoryConfig;
	protected readonly filePath: string;
	protected readonly backupDir: string;

	constructor(entityName: string, config: JSONRepositoryConfig) {
		super(entityName);
		this.config = {
			enableBackups: true,
			backupRetention: 5,
			...config
		};
		this.filePath = path.join(this.config.dataDir, this.config.filename);
		this.backupDir = path.join(this.config.dataDir, 'backups');
		this.ensureDirectories();
	}

	async create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<RepositoryOperationResult<T>> {
		try {
			const validation = this.validate(entity as Partial<T>);
			if (!validation.isValid) {
				return {
					success: false,
					error: this.createError('VALIDATION_ERROR', `Validation failed: ${validation.errors.join(', ')}`)
				};
			}

			const newEntity: T = {
				...entity,
				id: this.generateId(),
				...this.createTimestamps()
			} as T;

			const data = await this.readData();
			data.push(newEntity);

			await this.writeData(data);

			return {
				success: true,
				data: newEntity
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('CREATE_ERROR', `Failed to create ${this.entityName}: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async findById(id: string): Promise<RepositoryOperationResult<T>> {
		try {
			const data = await this.readData();
			const entity = data.find(item => item.id === id);

			if (!entity) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', `${this.entityName} with id ${id} not found`)
				};
			}

			return {
				success: true,
				data: entity
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('READ_ERROR', `Failed to find ${this.entityName}: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async findAll(options?: QueryOptions): Promise<RepositoryOperationResult<T[]>> {
		try {
			let data = await this.readData();

			if (options?.filters) {
				data = this.applyFilters(data, options.filters);
			}

			if (options?.sortBy) {
				data = this.applySorting(data, options.sortBy, options.sortOrder || 'asc');
			}

			if (options?.offset || options?.limit) {
				data = this.applyPagination(data, options.offset || 0, options.limit);
			}

			return {
				success: true,
				data
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('READ_ERROR', `Failed to read ${this.entityName} data: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async update(id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<RepositoryOperationResult<T>> {
		try {
			const data = await this.readData();
			const index = data.findIndex(item => item.id === id);

			if (index === -1) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', `${this.entityName} with id ${id} not found`)
				};
			}

			const updatedEntity: T = {
				...data[index],
				...updates,
				...this.updateTimestamp()
			};

			const validation = this.validate(updatedEntity);
			if (!validation.isValid) {
				return {
					success: false,
					error: this.createError('VALIDATION_ERROR', `Validation failed: ${validation.errors.join(', ')}`)
				};
			}

			data[index] = updatedEntity;
			await this.writeData(data);

			return {
				success: true,
				data: updatedEntity
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('UPDATE_ERROR', `Failed to update ${this.entityName}: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async delete(id: string): Promise<RepositoryOperationResult<boolean>> {
		try {
			const data = await this.readData();
			const index = data.findIndex(item => item.id === id);

			if (index === -1) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', `${this.entityName} with id ${id} not found`)
				};
			}

			data.splice(index, 1);
			await this.writeData(data);

			return {
				success: true,
				data: true
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('DELETE_ERROR', `Failed to delete ${this.entityName}: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async findBy(criteria: Partial<T>, options?: QueryOptions): Promise<RepositoryOperationResult<T[]>> {
		try {
			let data = await this.readData();

			data = data.filter(item => {
				return Object.entries(criteria).every(([key, value]) => {
					return item[key as keyof T] === value;
				});
			});

			if (options?.sortBy) {
				data = this.applySorting(data, options.sortBy, options.sortOrder || 'asc');
			}

			if (options?.offset || options?.limit) {
				data = this.applyPagination(data, options.offset || 0, options.limit);
			}

			return {
				success: true,
				data
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('READ_ERROR', `Failed to find ${this.entityName} by criteria: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async count(criteria?: Partial<T>): Promise<RepositoryOperationResult<number>> {
		try {
			let data = await this.readData();

			if (criteria) {
				data = data.filter(item => {
					return Object.entries(criteria).every(([key, value]) => {
						return item[key as keyof T] === value;
					});
				});
			}

			return {
				success: true,
				data: data.length
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('READ_ERROR', `Failed to count ${this.entityName}: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async exists(id: string): Promise<RepositoryOperationResult<boolean>> {
		try {
			const data = await this.readData();
			const exists = data.some(item => item.id === id);

			return {
				success: true,
				data: exists
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('READ_ERROR', `Failed to check existence of ${this.entityName}: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	protected async readData(): Promise<T[]> {
		try {
			await this.ensureFileExists();
			const fileContent = await fs.readFile(this.filePath, 'utf-8');
			const data = JSON.parse(fileContent);

			return Array.isArray(data) ? data.map(this.deserializeEntity) : [];
		} catch (error) {
			if (error.code === 'ENOENT') {
				return [];
			}
			throw error;
		}
	}

	protected async writeData(data: T[]): Promise<void> {
		try {
			if (this.config.enableBackups) {
				await this.createBackup();
			}

			const serializedData = data.map(this.serializeEntity);
			const jsonData = JSON.stringify(serializedData, null, 2);

			await this.atomicWrite(this.filePath, jsonData);
		} catch (error) {
			throw this.createError('WRITE_ERROR', `Failed to write data: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	protected async atomicWrite(filePath: string, data: string): Promise<void> {
		const tempPath = `${filePath}.tmp.${Date.now()}`;
		try {
			await fs.writeFile(tempPath, data, 'utf-8');
			await fs.rename(tempPath, filePath);
		} catch (error) {
			try {
				await fs.unlink(tempPath);
			} catch {}
			throw error;
		}
	}

	protected async createBackup(): Promise<void> {
		try {
			await this.ensureBackupDirectory();
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const backupPath = path.join(this.backupDir, `${this.config.filename}.${timestamp}.backup`);

			const exists = await this.fileExists(this.filePath);
			if (exists) {
				await fs.copyFile(this.filePath, backupPath);
				await this.cleanupOldBackups();
			}
		} catch (error) {
			console.warn(`Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	protected async cleanupOldBackups(): Promise<void> {
		try {
			const backupFiles = await fs.readdir(this.backupDir);
			const relevantBackups = backupFiles
				.filter(file => file.startsWith(this.config.filename) && file.endsWith('.backup'))
				.map(file => ({
					name: file,
					path: path.join(this.backupDir, file),
					stat: null
				}));

			for (const backup of relevantBackups) {
				backup.stat = await fs.stat(backup.path);
			}

			relevantBackups.sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());

			if (relevantBackups.length > this.config.backupRetention) {
				const toDelete = relevantBackups.slice(this.config.backupRetention);
				for (const backup of toDelete) {
					await fs.unlink(backup.path);
				}
			}
		} catch (error) {
			console.warn(`Failed to cleanup old backups: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	protected serializeEntity(entity: T): any {
		return {
			...entity,
			createdAt: entity.createdAt.toISOString(),
			updatedAt: entity.updatedAt.toISOString()
		};
	}

	protected deserializeEntity(data: any): T {
		return {
			...data,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt)
		} as T;
	}

	protected applyFilters(data: T[], filters: Record<string, unknown>): T[] {
		return data.filter(item => {
			return Object.entries(filters).every(([key, value]) => {
				const itemValue = item[key as keyof T];
				if (Array.isArray(value)) {
					return value.includes(itemValue);
				}
				return itemValue === value;
			});
		});
	}

	protected applySorting(data: T[], sortBy: string, sortOrder: 'asc' | 'desc'): T[] {
		return data.sort((a, b) => {
			const aValue = a[sortBy as keyof T];
			const bValue = b[sortBy as keyof T];

			if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
			if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
			return 0;
		});
	}

	protected applyPagination(data: T[], offset: number, limit?: number): T[] {
		if (limit) {
			return data.slice(offset, offset + limit);
		}
		return data.slice(offset);
	}

	protected async ensureDirectories(): Promise<void> {
		try {
			await fs.mkdir(this.config.dataDir, { recursive: true });
			if (this.config.enableBackups) {
				await this.ensureBackupDirectory();
			}
		} catch (error) {
			console.warn(`Failed to create directories: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	protected async ensureBackupDirectory(): Promise<void> {
		await fs.mkdir(this.backupDir, { recursive: true });
	}

	protected async ensureFileExists(): Promise<void> {
		const exists = await this.fileExists(this.filePath);
		if (!exists) {
			await fs.writeFile(this.filePath, '[]', 'utf-8');
		}
	}

	protected async fileExists(path: string): Promise<boolean> {
		try {
			await fs.access(path);
			return true;
		} catch {
			return false;
		}
	}
}