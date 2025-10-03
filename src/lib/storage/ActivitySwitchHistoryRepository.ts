import type { BaseEntity } from '../../types/entities';
import type { ActivityType } from '../../types/enums';
import { JSONRepository, type JSONRepositoryConfig } from './JSONRepository';
import type { RepositoryOperationResult, ValidationResult } from './Repository';

export interface ActivitySwitchHistory extends BaseEntity {
	eventId: string;
	fromActivity?: ActivityType;
	toActivity: ActivityType;
	switchLatency: number; // milliseconds
	organizerId?: string;
	organizerName?: string;
	reason?: string;
	metadata?: Record<string, unknown>;
}

export class ActivitySwitchHistoryRepository extends JSONRepository<ActivitySwitchHistory> {
	constructor(config: Omit<JSONRepositoryConfig, 'filename'>) {
		super('activityswitchhistory', {
			...config,
			filename: 'activity-switch-history.json'
		});
	}

	validate(entity: Partial<ActivitySwitchHistory>): ValidationResult {
		const baseValidation = this.validateRequired(entity, ['eventId', 'toActivity', 'switchLatency']);
		if (!baseValidation.isValid) {
			return baseValidation;
		}

		const errors: string[] = [];

		// Validate eventId
		if (entity.eventId && typeof entity.eventId !== 'string') {
			errors.push('Event ID must be a string');
		}

		// Validate toActivity
		if (entity.toActivity && typeof entity.toActivity !== 'string') {
			errors.push('To activity must be a string');
		}

		// Validate switchLatency
		if (entity.switchLatency !== undefined && typeof entity.switchLatency !== 'number') {
			errors.push('Switch latency must be a number');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	/**
	 * Find activity switch history by event ID
	 */
	async findByEventId(eventId: string): Promise<RepositoryOperationResult<ActivitySwitchHistory[]>> {
		return this.findBy({ eventId });
	}

	/**
	 * Find activity switches by organizer ID
	 */
	async findByOrganizerId(organizerId: string): Promise<RepositoryOperationResult<ActivitySwitchHistory[]>> {
		return this.findBy({ organizerId });
	}

	/**
	 * Find activity switches within a date range
	 */
	async findByDateRange(
		eventId: string,
		startDate: Date,
		endDate: Date
	): Promise<RepositoryOperationResult<ActivitySwitchHistory[]>> {
		const allSwitches = await this.findByEventId(eventId);
		if (!allSwitches.success || !allSwitches.data) {
			return allSwitches;
		}

		const filtered = allSwitches.data.filter((switchHistory) => {
			const switchDate = new Date(switchHistory.createdAt);
			return switchDate >= startDate && switchDate <= endDate;
		});

		return {
			success: true,
			data: filtered
		};
	}

	/**
	 * Get activity switches with high latency
	 */
	async findHighLatencySwitches(
		eventId: string,
		latencyThreshold: number = 2000
	): Promise<RepositoryOperationResult<ActivitySwitchHistory[]>> {
		const allSwitches = await this.findByEventId(eventId);
		if (!allSwitches.success || !allSwitches.data) {
			return allSwitches;
		}

		const filtered = allSwitches.data.filter(
			(switchHistory) => switchHistory.switchLatency >= latencyThreshold
		);

		return {
			success: true,
			data: filtered
		};
	}

	/**
	 * Get average switch latency for an event
	 */
	async getAverageSwitchLatency(eventId: string): Promise<RepositoryOperationResult<number>> {
		const switches = await this.findByEventId(eventId);
		if (!switches.success || !switches.data || switches.data.length === 0) {
			return {
				success: true,
				data: 0
			};
		}

		const totalLatency = switches.data.reduce((sum, s) => sum + s.switchLatency, 0);
		const average = totalLatency / switches.data.length;

		return {
			success: true,
			data: average
		};
	}

	/**
	 * Get activity flow (sequence of activities)
	 */
	async getActivityFlow(eventId: string): Promise<RepositoryOperationResult<ActivityType[]>> {
		const switches = await this.findByEventId(eventId);
		if (!switches.success || !switches.data) {
			return {
				success: false,
				error: switches.error
			};
		}

		// Sort by creation date
		const sorted = switches.data.sort(
			(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
		);

		// Extract activity flow
		const flow: ActivityType[] = [];
		if (sorted.length > 0 && sorted[0].fromActivity) {
			flow.push(sorted[0].fromActivity);
		}
		for (const switchHistory of sorted) {
			flow.push(switchHistory.toActivity);
		}

		return {
			success: true,
			data: flow
		};
	}

	/**
	 * Get organizer attribution statistics
	 */
	async getOrganizerStats(eventId: string): Promise<RepositoryOperationResult<Record<string, number>>> {
		const switches = await this.findByEventId(eventId);
		if (!switches.success || !switches.data) {
			return {
				success: false,
				error: switches.error
			};
		}

		const stats: Record<string, number> = {};
		for (const switchHistory of switches.data) {
			if (switchHistory.organizerId) {
				const key = switchHistory.organizerName || switchHistory.organizerId;
				stats[key] = (stats[key] || 0) + 1;
			}
		}

		return {
			success: true,
			data: stats
		};
	}

	/**
	 * Create activity switch record
	 */
	async create(
		data: Omit<ActivitySwitchHistory, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<RepositoryOperationResult<ActivitySwitchHistory>> {
		const switchHistory: Partial<ActivitySwitchHistory> = {
			...data,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		return super.create(switchHistory as Omit<ActivitySwitchHistory, 'id'>);
	}
}
