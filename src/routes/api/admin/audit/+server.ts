/**
 * Audit Trail API
 * Provides audit log viewing, filtering, and export capabilities
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { apiRoute } from '$lib/errors/handler.js';
import { adminService } from '$lib/services/admin.js';
import { UserRepository } from '$lib/storage/UserRepository.js';
import { AuditLogRepository } from '$lib/storage/AuditLogRepository.js';
import { EventRepository } from '$lib/storage/EventRepository.js';

// Initialize repositories
const userRepo = new UserRepository({ dataDir: './data' });
const auditRepo = new AuditLogRepository({ dataDir: './data' });
const eventRepo = new EventRepository({ dataDir: './data' });

/**
 * GET endpoint - fetch audit logs with filtering and pagination
 */
export const GET: RequestHandler = apiRoute(async (event) => {
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

	// Get query parameters
	const url = new URL(event.request.url);
	const page = parseInt(url.searchParams.get('page') || '1');
	const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
	const action = url.searchParams.get('action');
	const entityType = url.searchParams.get('entityType');
	const userId = url.searchParams.get('userId');
	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');
	const search = url.searchParams.get('search');
	const exportCsv = url.searchParams.get('export') === 'true';

	// Fetch all audit logs
	const allLogsResult = await auditRepo.findAll();
	if (!allLogsResult.success) {
		return json(
			{
				success: false,
				error: 'Failed to fetch audit logs'
			},
			{ status: 500 }
		);
	}

	let logs = allLogsResult.data || [];

	// Apply filters
	if (action) {
		logs = logs.filter((log) => log.action === action);
	}

	if (entityType) {
		logs = logs.filter((log) => log.entityType === entityType);
	}

	if (userId) {
		logs = logs.filter((log) => log.userId === userId);
	}

	if (dateFrom) {
		const fromDate = new Date(dateFrom);
		logs = logs.filter((log) => new Date(log.createdAt) >= fromDate);
	}

	if (dateTo) {
		const toDate = new Date(dateTo);
		logs = logs.filter((log) => new Date(log.createdAt) <= toDate);
	}

	if (search) {
		const searchLower = search.toLowerCase();
		logs = logs.filter(
			(log) =>
				log.action.toLowerCase().includes(searchLower) ||
				log.entityType.toLowerCase().includes(searchLower) ||
				log.entityId.toLowerCase().includes(searchLower) ||
				(log.userId && log.userId.toLowerCase().includes(searchLower)) ||
				(log.ipAddress && log.ipAddress.toLowerCase().includes(searchLower))
		);
	}

	// Sort by date (newest first)
	logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

	const total = logs.length;

	// Get all users for enrichment
	const usersResult = await userRepo.findAll();
	const users = usersResult.success ? usersResult.data || [] : [];
	const userMap = new Map(users.map((u) => [u.id, u]));

	// Get all events for enrichment
	const eventsResult = await eventRepo.findAll();
	const events = eventsResult.success ? eventsResult.data || [] : [];
	const eventMap = new Map(events.map((e) => [e.id, e]));

	// Enrich logs with user and event names
	const enrichedLogs = logs.map((log) => ({
		...log,
		userName: log.userId ? userMap.get(log.userId)?.name : undefined,
		eventName: log.eventId ? eventMap.get(log.eventId)?.title : undefined
	}));

	// Handle CSV export
	if (exportCsv) {
		const csvHeader =
			'Timestamp,User,Action,Entity Type,Entity ID,Success,IP Address,User Agent\n';
		const csvRows = enrichedLogs
			.map(
				(log) =>
					`"${formatDateTime(log.createdAt)}","${log.userName || log.userId || 'System'}","${log.action}","${log.entityType}","${log.entityId}","${log.success ? 'Success' : 'Failed'}","${log.ipAddress || 'N/A'}","${(log.userAgent || '').replace(/"/g, '""')}"`
			)
			.join('\n');

		return new Response(csvHeader + csvRows, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString()}.csv"`
			}
		});
	}

	// Apply pagination
	const startIndex = (page - 1) * pageSize;
	const paginatedLogs = enrichedLogs.slice(startIndex, startIndex + pageSize);

	return json({
		success: true,
		data: {
			logs: paginatedLogs,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize)
		}
	});
});

function formatDateTime(date: Date | string): string {
	const d = new Date(date);
	return d.toISOString();
}
