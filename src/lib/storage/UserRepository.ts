import type { User } from '../../types/entities';
import { UserRole, isValidUserRole } from '../../types/enums';
import { JSONRepository, type JSONRepositoryConfig } from './JSONRepository';
import type { RepositoryOperationResult, QueryOptions, ValidationResult } from './Repository';

export class UserRepository extends JSONRepository<User> {
	constructor(config: Omit<JSONRepositoryConfig, 'filename'>) {
		super('user', {
			...config,
			filename: 'users.json'
		});
	}

	validate(entity: Partial<User>): ValidationResult {
		const baseValidation = this.validateRequired(entity, ['name', 'role']);
		if (!baseValidation.isValid) {
			return baseValidation;
		}

		const errors: string[] = [];

		// Validate name
		if (entity.name && (entity.name.length < 1 || entity.name.length > 100)) {
			errors.push('Name must be between 1 and 100 characters');
		}

		// Validate email format if provided
		if (entity.email && entity.email.length > 0) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(entity.email)) {
				errors.push('Invalid email format');
			}
		}

		// Validate role
		if (entity.role && !isValidUserRole(entity.role)) {
			errors.push('Invalid user role');
		}

		// Validate preferences if provided
		if (entity.preferences) {
			if (entity.preferences.language && entity.preferences.language.length < 2) {
				errors.push('Language code must be at least 2 characters');
			}
			if (entity.preferences.theme && !['light', 'dark', 'auto'].includes(entity.preferences.theme)) {
				errors.push('Theme must be light, dark, or auto');
			}
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	async findByEmail(email: string): Promise<RepositoryOperationResult<User>> {
		try {
			const result = await this.findBy({ email });
			if (!result.success || !result.data || result.data.length === 0) {
				return {
					success: false,
					error: this.createError('NOT_FOUND', `User with email ${email} not found`)
				};
			}

			return {
				success: true,
				data: result.data[0]
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('READ_ERROR', `Failed to find user by email: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async findByRole(role: UserRole, options?: QueryOptions): Promise<RepositoryOperationResult<User[]>> {
		return this.findBy({ role }, options);
	}

	async findByCurrentEvent(eventId: string, options?: QueryOptions): Promise<RepositoryOperationResult<User[]>> {
		return this.findBy({ currentEventId: eventId }, options);
	}

	async findGuests(options?: QueryOptions): Promise<RepositoryOperationResult<User[]>> {
		return this.findBy({ isGuest: true }, options);
	}

	async findRegisteredUsers(options?: QueryOptions): Promise<RepositoryOperationResult<User[]>> {
		return this.findBy({ isGuest: false }, options);
	}

	async findActiveUsers(options?: QueryOptions): Promise<RepositoryOperationResult<User[]>> {
		try {
			const data = await this.readData();
			const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

			let activeUsers = data.filter(user => user.lastActiveAt >= thirtyMinutesAgo);

			if (options?.sortBy) {
				activeUsers = this.applySorting(activeUsers, options.sortBy, options.sortOrder || 'asc');
			} else {
				// Default sort by last active time
				activeUsers = activeUsers.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
			}

			if (options?.offset || options?.limit) {
				activeUsers = this.applyPagination(activeUsers, options.offset || 0, options.limit);
			}

			return {
				success: true,
				data: activeUsers
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('READ_ERROR', `Failed to find active users: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	async updateLastActive(id: string): Promise<RepositoryOperationResult<User>> {
		return this.update(id, { lastActiveAt: new Date() });
	}

	async updateCurrentEvent(id: string, eventId: string | undefined): Promise<RepositoryOperationResult<User>> {
		return this.update(id, { currentEventId: eventId });
	}

	async updateRole(id: string, role: UserRole): Promise<RepositoryOperationResult<User>> {
		if (!isValidUserRole(role)) {
			return {
				success: false,
				error: this.createError('VALIDATION_ERROR', 'Invalid user role')
			};
		}

		return this.update(id, { role });
	}

	async updatePreferences(id: string, preferences: User['preferences']): Promise<RepositoryOperationResult<User>> {
		return this.update(id, { preferences });
	}

	async createGuestUser(name: string, eventId?: string): Promise<RepositoryOperationResult<User>> {
		const guestUser = {
			name,
			role: 'guest' as UserRole,
			isGuest: true,
			currentEventId: eventId,
			lastActiveAt: new Date(),
			preferences: {
				language: 'en',
				notifications: true,
				theme: 'auto' as const,
				soundEnabled: true
			}
		};

		return this.create(guestUser);
	}

	async createRegisteredUser(
		name: string,
		email: string,
		role: UserRole = UserRole.PARTICIPANT
	): Promise<RepositoryOperationResult<User>> {
		// Check if email already exists
		const existingUser = await this.findByEmail(email);
		if (existingUser.success) {
			return {
				success: false,
				error: this.createError('DUPLICATE_EMAIL', 'User with this email already exists')
			};
		}

		const registeredUser = {
			name,
			email,
			role,
			isGuest: false,
			lastActiveAt: new Date(),
			preferences: {
				language: 'en',
				notifications: true,
				theme: 'auto' as const,
				soundEnabled: true
			}
		};

		return this.create(registeredUser);
	}

	async countByRole(role: UserRole): Promise<RepositoryOperationResult<number>> {
		return this.count({ role });
	}

	async countActiveInEvent(eventId: string): Promise<RepositoryOperationResult<number>> {
		try {
			const data = await this.readData();
			const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

			const activeInEvent = data.filter(user =>
				user.currentEventId === eventId && user.lastActiveAt >= thirtyMinutesAgo
			);

			return {
				success: true,
				data: activeInEvent.length
			};
		} catch (error) {
			return {
				success: false,
				error: this.createError('read_ERROR', `Failed to count active users in event: ${error instanceof Error ? error.message : String(error)}`)
			};
		}
	}

	// Promote a user to organizer role
	async promoteToOrganizer(id: string): Promise<RepositoryOperationResult<User>> {
		return this.updateRole(id, UserRole.ORGANIZER);
	}

	// Demote a user to participant role
	async demoteToParticipant(id: string): Promise<RepositoryOperationResult<User>> {
		return this.updateRole(id, UserRole.PARTICIPANT);
	}

	protected serializeEntity(entity: User): any {
		return {
			...super.serializeEntity(entity),
			lastActiveAt: entity.lastActiveAt.toISOString()
		};
	}

	protected deserializeEntity(data: any): User {
		const baseEntity = super.deserializeEntity(data);
		return {
			...baseEntity,
			lastActiveAt: new Date(data.lastActiveAt)
		} as User;
	}
}