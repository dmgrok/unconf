/**
 * Organizer Access Management API
 * Provides role assignment, revocation, and history tracking for organizers
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { apiRoute } from '$lib/errors/handler.js';
import { adminService } from '$lib/services/admin.js';
import { UserRepository } from '$lib/storage/UserRepository.js';
import { EventRepository } from '$lib/storage/EventRepository.js';
import { AuditLogRepository } from '$lib/storage/AuditLogRepository.js';
import { UserRole, AuditAction, EntityType } from '../../../../types/enums.js';

// Initialize repositories
const userRepo = new UserRepository({ dataDir: './data' });
const eventRepo = new EventRepository({ dataDir: './data' });
const auditRepo = new AuditLogRepository({ dataDir: './data' });

interface OrganizerInfo {
	id: string;
	name: string;
	email?: string;
	role: string;
	isGuest: boolean;
	eventCount: number;
	lastActiveAt: string;
}

interface RoleHistoryEntry {
	userId: string;
	userName: string;
	action: 'assigned' | 'revoked';
	fromRole: string;
	toRole: string;
	performedBy: string;
	performedAt: string;
	reason?: string;
}

/**
 * GET endpoint - fetch organizer data
 */
export const GET: RequestHandler = apiRoute(async (event) => {
	// TODO: Add proper authentication check
	const isDevelopment = process.env.NODE_ENV !== 'production';

	if (!isDevelopment) {
		const userId = event.locals.user?.id;
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

	// Get all users
	const usersResult = await userRepo.findAll();
	if (!usersResult.success) {
		return json(
			{
				success: false,
				error: 'Failed to fetch users'
			},
			{ status: 500 }
		);
	}

	const users = usersResult.data || [];

	// Get all events to count organizer events
	const eventsResult = await eventRepo.findAll();
	const events = eventsResult.success ? eventsResult.data || [] : [];

	// Filter organizers and add event count
	const organizers: OrganizerInfo[] = users
		.filter((user) => user.role === UserRole.ORGANIZER || user.role === UserRole.ADMIN)
		.map((user) => {
			const eventCount = events.filter((e) => e.organizerId === user.id).length;
			return {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				isGuest: user.isGuest,
				eventCount,
				lastActiveAt: user.lastActiveAt.toISOString()
			};
		});

	// Get role change history from audit logs
	const auditResult = await auditRepo.findByAction(AuditAction.ROLE_CHANGED);
	const roleHistory: RoleHistoryEntry[] = [];

	if (auditResult.success && auditResult.data) {
		for (const log of auditResult.data.slice(0, 100)) {
			// Last 100 entries
			const targetUser = users.find((u) => u.id === log.entityId);
			const performingUser = users.find((u) => u.id === log.userId);

			if (targetUser && performingUser) {
				const metadata = log.metadata as any;
				roleHistory.push({
					userId: log.entityId || '',
					userName: targetUser.name,
					action: metadata?.action || 'assigned',
					fromRole: metadata?.fromRole || 'participant',
					toRole: metadata?.toRole || 'organizer',
					performedBy: performingUser.name,
					performedAt: log.createdAt.toISOString(),
					reason: metadata?.reason
				});
			}
		}
	}

	return json({
		success: true,
		data: {
			organizers,
			allUsers: users.map((u) => ({
				id: u.id,
				name: u.name,
				email: u.email,
				role: u.role,
				isGuest: u.isGuest,
				lastActiveAt: u.lastActiveAt.toISOString()
			})),
			roleHistory
		}
	});
});

/**
 * POST endpoint - role assignment/revocation actions
 */
export const POST: RequestHandler = apiRoute(async (event) => {
	const body = await event.request.json();
	const { action, userId, role, reason } = body;

	// TODO: Add proper authentication check
	const isDevelopment = process.env.NODE_ENV !== 'production';
	let adminUserId = 'system-admin';
	let adminUser = null;

	if (!isDevelopment) {
		adminUserId = event.locals.user?.id;
		if (!adminUserId) {
			return json(
				{
					success: false,
					error: 'Unauthorized: Authentication required'
				},
				{ status: 401 }
			);
		}

		const userResult = await userRepo.findById(adminUserId);
		if (!userResult.success || !adminService.isAdmin(userResult.data || null)) {
			return json(
				{
					success: false,
					error: 'Forbidden: Admin access required'
				},
				{ status: 403 }
			);
		}
		adminUser = userResult.data;
	}

	switch (action) {
		case 'assign_role': {
			if (!userId || !role) {
				return json(
					{
						success: false,
						error: 'User ID and role are required'
					},
					{ status: 400 }
				);
			}

			// Validate role
			if (!['organizer', 'participant', 'guest'].includes(role)) {
				return json(
					{
						success: false,
						error: 'Invalid role. Must be organizer, participant, or guest'
					},
					{ status: 400 }
				);
			}

			// Get target user
			const targetUserResult = await userRepo.findById(userId);
			if (!targetUserResult.success || !targetUserResult.data) {
				return json(
					{
						success: false,
						error: 'User not found'
					},
					{ status: 404 }
				);
			}

			const targetUser = targetUserResult.data;
			const oldRole = targetUser.role;

			// Update user role
			const updateResult = await userRepo.update(userId, { role: role as UserRole });
			if (!updateResult.success) {
				return json(
					{
						success: false,
						error: 'Failed to assign role'
					},
					{ status: 500 }
				);
			}

			// Create audit log
			await auditRepo.create({
				userId: adminUserId,
				action: AuditAction.ROLE_CHANGED,
				entityType: EntityType.USER,
				entityId: userId,
				success: true,
				ipAddress: event.request.headers.get('x-forwarded-for') || 'unknown',
				userAgent: event.request.headers.get('user-agent') || 'unknown',
				metadata: {
					action: 'assigned',
					fromRole: oldRole,
					toRole: role,
					reason: reason || 'No reason provided'
				}
			});

			return json({
				success: true,
				message: `Role ${role} assigned successfully`,
				data: updateResult.data
			});
		}

		case 'revoke_role': {
			if (!userId) {
				return json(
					{
						success: false,
						error: 'User ID is required'
					},
					{ status: 400 }
				);
			}

			if (!reason || reason.trim().length === 0) {
				return json(
					{
						success: false,
						error: 'Reason is required for role revocation'
					},
					{ status: 400 }
				);
			}

			// Get target user
			const targetUserResult = await userRepo.findById(userId);
			if (!targetUserResult.success || !targetUserResult.data) {
				return json(
					{
						success: false,
						error: 'User not found'
					},
					{ status: 404 }
				);
			}

			const targetUser = targetUserResult.data;

			// Don't allow revoking admin role
			if (targetUser.role === UserRole.ADMIN) {
				return json(
					{
						success: false,
						error: 'Cannot revoke admin role'
					},
					{ status: 403 }
				);
			}

			const oldRole = targetUser.role;

			// Revoke by setting to participant
			const updateResult = await userRepo.update(userId, { role: UserRole.PARTICIPANT });
			if (!updateResult.success) {
				return json(
					{
						success: false,
						error: 'Failed to revoke role'
					},
					{ status: 500 }
				);
			}

			// Create audit log
			await auditRepo.create({
				userId: adminUserId,
				action: AuditAction.ROLE_CHANGED,
				entityType: EntityType.USER,
				entityId: userId,
				success: true,
				ipAddress: event.request.headers.get('x-forwarded-for') || 'unknown',
				userAgent: event.request.headers.get('user-agent') || 'unknown',
				metadata: {
					action: 'revoked',
					fromRole: oldRole,
					toRole: UserRole.PARTICIPANT,
					reason: reason
				}
			});

			return json({
				success: true,
				message: 'Role revoked successfully',
				data: updateResult.data
			});
		}

		default:
			return json(
				{
					success: false,
					error: 'Invalid action. Available actions: assign_role, revoke_role'
				},
				{ status: 400 }
			);
	}
});
