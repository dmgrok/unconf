/**
 * Admin Dashboard API
 * Provides cross-event monitoring and platform management data
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { apiRoute } from '$lib/errors/handler.js';
import { adminService } from '$lib/services/admin.js';
import { EventRepository } from '$lib/storage/EventRepository.js';
import { UserRepository } from '$lib/storage/UserRepository.js';
import { metricsCollector } from '$lib/monitoring/index.js';

// Initialize repositories
const eventRepo = new EventRepository({ dataDir: './data' });
const userRepo = new UserRepository({ dataDir: './data' });

export const GET: RequestHandler = apiRoute(async (event) => {
	// TODO: Add proper authentication check
	// For now, we'll allow access in development mode
	const isDevelopment = process.env.NODE_ENV !== 'production';

	if (!isDevelopment) {
		// In production, check for admin role
		const userId = event.locals.userId;
		if (!userId) {
			return json(
				{
					success: false,
					error: 'Unauthorized: Authentication required'
				},
				{ status: 401 }
			);
		}

		const userResult = await userRepo.findById(userId);
		if (!userResult.success || !adminService.isAdmin(userResult.data || null)) {
			return json(
				{
					success: false,
					error: 'Forbidden: Admin access required'
				},
				{ status: 403 }
			);
		}
	}

	// Get all events and users
	const eventsResult = await eventRepo.findAll();
	const usersResult = await userRepo.findAll();

	if (!eventsResult.success || !usersResult.success) {
		return json(
			{
				success: false,
				error: 'Failed to fetch platform data'
			},
			{ status: 500 }
		);
	}

	const events = eventsResult.data || [];
	const users = usersResult.data || [];

	// Get error counts by event (from metrics collector)
	const errorsByEvent = new Map<string, number>();
	// This would be populated from actual error tracking
	// For now, we'll use placeholder data

	// Get platform metrics
	const platformMetrics = await adminService.getPlatformMetrics(events, users, errorsByEvent);

	// Get system health from monitoring
	const systemHealth = metricsCollector.performHealthCheck();

	// Combine all data
	const dashboardData = {
		platform: {
			totalEvents: platformMetrics.crossEvent.totalEvents,
			activeEvents: platformMetrics.crossEvent.activeEvents,
			totalUsers: platformMetrics.crossEvent.totalUsers,
			concurrentUsers: platformMetrics.crossEvent.concurrentUsers,
			eventStatuses: platformMetrics.crossEvent.eventStatuses
		},
		events: platformMetrics.eventSnapshots.map((snapshot) => ({
			id: snapshot.eventId,
			title: snapshot.eventTitle,
			status: snapshot.status,
			concurrentUsers: snapshot.concurrentUsers,
			currentActivity: snapshot.currentActivity,
			errorCount: snapshot.errorCount,
			lastActivity: snapshot.lastActivity,
			health: snapshot.health
		})),
		systemHealth: {
			overall: systemHealth.overall,
			components: systemHealth.components
		},
		errorRates: {
			overall: platformMetrics.errorRates.overall,
			byEvent: Object.fromEntries(platformMetrics.errorRates.byEvent)
		},
		timestamp: new Date().toISOString()
	};

	return json({
		success: true,
		data: dashboardData
	});
});

/**
 * POST endpoint for admin actions
 */
export const POST: RequestHandler = apiRoute(async (event) => {
	const body = await event.request.json();
	const { action, eventId, data } = body;

	// TODO: Add proper authentication check
	const isDevelopment = process.env.NODE_ENV !== 'production';

	if (!isDevelopment) {
		const userId = event.locals.userId;
		if (!userId) {
			return json(
				{
					success: false,
					error: 'Unauthorized: Authentication required'
				},
				{ status: 401 }
			);
		}

		const userResult = await userRepo.findById(userId);
		if (!userResult.success || !adminService.isAdmin(userResult.data || null)) {
			return json(
				{
					success: false,
					error: 'Forbidden: Admin access required'
				},
				{ status: 403 }
			);
		}
	}

	switch (action) {
		case 'suspend_event':
			if (!eventId) {
				return json(
					{
						success: false,
						error: 'Event ID is required'
					},
					{ status: 400 }
				);
			}

			// Suspend event by setting status to paused
			const eventResult = await eventRepo.findById(eventId);
			if (!eventResult.success || !eventResult.data) {
				return json(
					{
						success: false,
						error: 'Event not found'
					},
					{ status: 404 }
				);
			}

			const updateResult = await eventRepo.update(eventId, { status: 'paused' });
			if (!updateResult.success) {
				return json(
					{
						success: false,
						error: 'Failed to suspend event'
					},
					{ status: 500 }
				);
			}

			return json({
				success: true,
				message: 'Event suspended successfully',
				data: updateResult.data
			});

		case 'resume_event':
			if (!eventId) {
				return json(
					{
						success: false,
						error: 'Event ID is required'
					},
					{ status: 400 }
				);
			}

			const eventToResume = await eventRepo.findById(eventId);
			if (!eventToResume.success || !eventToResume.data) {
				return json(
					{
						success: false,
						error: 'Event not found'
					},
					{ status: 404 }
				);
			}

			const resumeResult = await eventRepo.update(eventId, { status: 'active' });
			if (!resumeResult.success) {
				return json(
					{
						success: false,
						error: 'Failed to resume event'
					},
					{ status: 500 }
				);
			}

			return json({
				success: true,
				message: 'Event resumed successfully',
				data: resumeResult.data
			});

		default:
			return json(
				{
					success: false,
					error: 'Invalid action. Available actions: suspend_event, resume_event'
				},
				{ status: 400 }
			);
	}
});
