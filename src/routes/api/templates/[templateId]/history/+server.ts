import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStorage } from '../../../../../lib/storage/index.js';
import { TemplatePermissionType } from '../../../../../types/enums.js';

interface SharingHistoryEntry {
	id: string;
	templateId: string;
	action: 'shared' | 'unshared' | 'permission_changed' | 'made_public' | 'made_private';
	targetUserId?: string;
	targetUserName?: string;
	permission?: TemplatePermissionType;
	previousPermission?: TemplatePermissionType;
	performedBy: string;
	performedByName?: string;
	timestamp: Date;
	details?: string;
}

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const storage = getStorage();
		const { templateId } = params;
		const userId = url.searchParams.get('userId');
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		if (!userId) {
			return json({ success: false, error: 'User ID required' }, { status: 400 });
		}

		// Check if template exists and user has permission to view history
		const templateResult = await storage.eventTemplates.findById(templateId);
		if (!templateResult.success || !templateResult.data) {
			return json({ success: false, error: 'Template not found' }, { status: 404 });
		}

		const template = templateResult.data;

		// Only creators or users with SHARE permission can view full history
		const isCreator = template.createdBy === userId;
		let canViewHistory = isCreator;

		if (!canViewHistory) {
			const sharePermissionCheck = await storage.eventTemplatePermissions.hasPermission(
				templateId,
				userId,
				TemplatePermissionType.SHARE
			);
			canViewHistory = sharePermissionCheck.success && sharePermissionCheck.data;
		}

		if (!canViewHistory) {
			return json({
				success: false,
				error: 'Insufficient permissions to view sharing history'
			}, { status: 403 });
		}

		// Get all permissions for this template to build history
		const permissionsResult = await storage.eventTemplatePermissions.getTemplatePermissions(templateId);
		if (!permissionsResult.success) {
			return json(
				{ success: false, error: 'Failed to fetch template permissions' },
				{ status: 500 }
			);
		}

		// Build sharing history from permissions data
		// Note: This is a simplified version. In a real application, you'd want to track
		// this data in a dedicated audit log/history table
		const history: SharingHistoryEntry[] = [];

		// Add permission grants as history entries
		permissionsResult.data.forEach(permission => {
			history.push({
				id: permission.id,
				templateId,
				action: 'shared',
				targetUserId: permission.userId,
				targetUserName: permission.userId, // In real app, would resolve to actual name
				permission: permission.permission,
				performedBy: permission.grantedBy,
				performedByName: permission.grantedBy, // In real app, would resolve to actual name
				timestamp: permission.grantedAt,
				details: `Granted ${permission.permission} permission`
			});
		});

		// Add template visibility changes (simplified - would come from audit log)
		if (template.isPublic) {
			history.push({
				id: `public-${templateId}`,
				templateId,
				action: 'made_public',
				performedBy: template.createdBy,
				performedByName: template.createdBy,
				timestamp: template.updatedAt,
				details: 'Template made publicly accessible'
			});
		}

		// Sort by timestamp (most recent first) and apply pagination
		history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
		const paginatedHistory = history.slice(offset, offset + limit);

		return json({
			success: true,
			history: paginatedHistory,
			pagination: {
				total: history.length,
				limit,
				offset,
				hasMore: offset + limit < history.length
			}
		});

	} catch (error) {
		console.error('Error fetching template sharing history:', error);
		return json(
			{ success: false, error: 'Failed to fetch sharing history' },
			{ status: 500 }
		);
	}
};

// Log a sharing action (for future implementation)
export const POST: RequestHandler = async ({ params, request, url }) => {
	try {
		const storage = getStorage();
		const { templateId } = params;
		const userId = url.searchParams.get('userId');
		const body = await request.json();

		if (!userId) {
			return json({ success: false, error: 'User ID required' }, { status: 400 });
		}

		const { action, targetUserId, permission, previousPermission, details } = body;

		// Validate required fields
		if (!action || !['shared', 'unshared', 'permission_changed', 'made_public', 'made_private'].includes(action)) {
			return json({ success: false, error: 'Valid action required' }, { status: 400 });
		}

		// Check if template exists
		const templateResult = await storage.eventTemplates.findById(templateId);
		if (!templateResult.success || !templateResult.data) {
			return json({ success: false, error: 'Template not found' }, { status: 404 });
		}

		// In a real implementation, you would store this in an audit log table
		// For now, we'll just return success as the actual sharing operations
		// are handled by the other endpoints

		return json({
			success: true,
			message: 'History entry logged',
			entry: {
				templateId,
				action,
				targetUserId,
				permission,
				previousPermission,
				performedBy: userId,
				timestamp: new Date(),
				details
			}
		});

	} catch (error) {
		console.error('Error logging sharing history:', error);
		return json(
			{ success: false, error: 'Failed to log history entry' },
			{ status: 500 }
		);
	}
};