/**
 * Admin Platform Management Service
 * Provides cross-event monitoring and platform management capabilities
 */

import type { Event, User } from '../../types/entities';
import type { ComponentHealth } from '../monitoring';

export interface CrossEventMetrics {
	totalEvents: number;
	activeEvents: number;
	totalUsers: number;
	concurrentUsers: number;
	usersByEvent: Map<string, number>;
	eventStatuses: {
		draft: number;
		active: number;
		paused: number;
		completed: number;
	};
}

export interface EventHealthSnapshot {
	eventId: string;
	eventTitle: string;
	status: string;
	concurrentUsers: number;
	currentActivity?: string;
	errorCount: number;
	lastActivity: Date;
	health: 'healthy' | 'degraded' | 'critical';
}

export interface PlatformMetrics {
	crossEvent: CrossEventMetrics;
	eventSnapshots: EventHealthSnapshot[];
	systemHealth: ComponentHealth[];
	errorRates: {
		overall: number;
		byEvent: Map<string, number>;
	};
	timestamp: Date;
}

/**
 * Admin service class for platform-wide operations
 */
export class AdminService {
	/**
	 * Get cross-event overview metrics
	 */
	async getCrossEventMetrics(
		events: Event[],
		users: User[]
	): Promise<CrossEventMetrics> {
		const now = new Date();
		const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

		// Count active users (active in last 5 minutes)
		const activeUsers = users.filter(
			(user) => user.lastActiveAt && new Date(user.lastActiveAt) > fiveMinutesAgo
		);

		// Group users by event
		const usersByEvent = new Map<string, number>();
		activeUsers.forEach((user) => {
			if (user.currentEventId) {
				const count = usersByEvent.get(user.currentEventId) || 0;
				usersByEvent.set(user.currentEventId, count + 1);
			}
		});

		// Count event statuses
		const eventStatuses = {
			draft: events.filter((e) => e.status === 'draft').length,
			active: events.filter((e) => e.status === 'active').length,
			paused: events.filter((e) => e.status === 'paused').length,
			completed: events.filter((e) => e.status === 'completed').length
		};

		return {
			totalEvents: events.length,
			activeEvents: events.filter((e) => e.status === 'active').length,
			totalUsers: users.length,
			concurrentUsers: activeUsers.length,
			usersByEvent,
			eventStatuses
		};
	}

	/**
	 * Get health snapshot for individual events
	 */
	async getEventHealthSnapshots(
		events: Event[],
		usersByEvent: Map<string, number>,
		errorsByEvent: Map<string, number>
	): Promise<EventHealthSnapshot[]> {
		return events.map((event) => {
			const concurrentUsers = usersByEvent.get(event.id) || 0;
			const errorCount = errorsByEvent.get(event.id) || 0;

			// Determine event health based on metrics
			let health: 'healthy' | 'degraded' | 'critical' = 'healthy';
			if (errorCount > 10) {
				health = 'critical';
			} else if (errorCount > 5 || (event.status === 'active' && concurrentUsers === 0)) {
				health = 'degraded';
			}

			return {
				eventId: event.id,
				eventTitle: event.title,
				status: event.status,
				concurrentUsers,
				currentActivity: event.currentActivity,
				errorCount,
				lastActivity: event.updatedAt,
				health
			};
		});
	}

	/**
	 * Get comprehensive platform metrics
	 */
	async getPlatformMetrics(
		events: Event[],
		users: User[],
		errorsByEvent: Map<string, number> = new Map()
	): Promise<PlatformMetrics> {
		const crossEvent = await this.getCrossEventMetrics(events, users);
		const eventSnapshots = await this.getEventHealthSnapshots(
			events,
			crossEvent.usersByEvent,
			errorsByEvent
		);

		// Calculate error rates
		const totalErrors = Array.from(errorsByEvent.values()).reduce((sum, count) => sum + count, 0);
		const overallErrorRate = events.length > 0 ? totalErrors / events.length : 0;

		return {
			crossEvent,
			eventSnapshots,
			systemHealth: [],
			errorRates: {
				overall: overallErrorRate,
				byEvent: errorsByEvent
			},
			timestamp: new Date()
		};
	}

	/**
	 * Check if user has admin privileges
	 */
	isAdmin(user: User | null): boolean {
		return user?.role === 'admin';
	}

	/**
	 * Check if user has organizer privileges for an event
	 */
	isOrganizer(user: User | null, event: Event): boolean {
		return user?.role === 'admin' || user?.id === event.organizerId;
	}
}

// Export singleton instance
export const adminService = new AdminService();
