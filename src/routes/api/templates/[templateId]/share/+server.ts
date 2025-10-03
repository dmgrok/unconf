import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStorage } from '../../../../../lib/storage/index.js';
import { TemplatePermissionType } from '../../../../../types/enums.js';

export const POST: RequestHandler = async ({ params, request, url }) => {
	try {
		const storage = getStorage();
		const { templateId } = params;
		const userId = url.searchParams.get('userId');
		const body = await request.json();

		if (!userId) {
			return json({ success: false, error: 'User ID required' }, { status: 400 });
		}

		const { userIds, permission = TemplatePermissionType.USE } = body;

		if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
			return json({ success: false, error: 'User IDs array required' }, { status: 400 });
		}

		// Check if template exists and user has share permission
		const templateResult = await storage.eventTemplates.findById(templateId);
		if (!templateResult.success || !templateResult.data) {
			return json({ success: false, error: 'Template not found' }, { status: 404 });
		}

		const template = templateResult.data;

		// Check if user has permission to share this template
		const canShare = template.createdBy === userId;

		if (!canShare) {
			// Check if user has SHARE permission
			const sharePermissionCheck = await storage.eventTemplatePermissions.hasPermission(
				templateId,
				userId,
				TemplatePermissionType.SHARE
			);

			if (!sharePermissionCheck.success || !sharePermissionCheck.data) {
				return json({
					success: false,
					error: 'Insufficient permissions to share this template'
				}, { status: 403 });
			}
		}

		// Validate permission level - only creators can grant ADMIN permissions
		if (template.createdBy !== userId && permission === TemplatePermissionType.ADMIN) {
			return json({
				success: false,
				error: 'Only template creator can grant admin permissions'
			}, { status: 403 });
		}

		// Grant permissions to users
		const permissionResults = await storage.eventTemplatePermissions.bulkGrantPermissions(
			templateId,
			userIds.map(uid => ({ userId: uid, permission })),
			userId
		);

		if (!permissionResults.success) {
			return json(
				{ success: false, error: permissionResults.error.message },
				{ status: 500 }
			);
		}

		// Also add users to template's sharedWith array
		const shareResult = await storage.eventTemplates.shareTemplate(templateId, userIds);
		if (!shareResult.success) {
			return json(
				{ success: false, error: 'Failed to update template sharing' },
				{ status: 500 }
			);
		}

		return json({
			success: true,
			permissions: permissionResults.data,
			message: `Template shared with ${userIds.length} user(s)`
		});

	} catch (error) {
		console.error('Error sharing template:', error);
		return json(
			{ success: false, error: 'Failed to share template' },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params, request, url }) => {
	try {
		const storage = getStorage();
		const { templateId } = params;
		const userId = url.searchParams.get('userId');
		const body = await request.json();

		if (!userId) {
			return json({ success: false, error: 'User ID required' }, { status: 400 });
		}

		const { userIds } = body;

		if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
			return json({ success: false, error: 'User IDs array required' }, { status: 400 });
		}

		// Check if template exists and user has permission to unshare
		const templateResult = await storage.eventTemplates.findById(templateId);
		if (!templateResult.success || !templateResult.data) {
			return json({ success: false, error: 'Template not found' }, { status: 404 });
		}

		const template = templateResult.data;

		// Check if user has permission to unshare this template
		const canUnshare = template.createdBy === userId;

		if (!canUnshare) {
			// Check if user has SHARE permission
			const sharePermissionCheck = await storage.eventTemplatePermissions.hasPermission(
				templateId,
				userId,
				TemplatePermissionType.SHARE
			);

			if (!sharePermissionCheck.success || !sharePermissionCheck.data) {
				return json({
					success: false,
					error: 'Insufficient permissions to modify template sharing'
				}, { status: 403 });
			}
		}

		// Remove permissions
		const permissionResult = await storage.eventTemplatePermissions.bulkRevokePermissions(
			templateId,
			userIds
		);

		if (!permissionResult.success) {
			return json(
				{ success: false, error: permissionResult.error.message },
				{ status: 500 }
			);
		}

		// Remove users from template's sharedWith array
		const unshareResult = await storage.eventTemplates.unshareTemplate(templateId, userIds);
		if (!unshareResult.success) {
			return json(
				{ success: false, error: 'Failed to update template sharing' },
				{ status: 500 }
			);
		}

		return json({
			success: true,
			message: `Template unshared from ${userIds.length} user(s)`
		});

	} catch (error) {
		console.error('Error unsharing template:', error);
		return json(
			{ success: false, error: 'Failed to unshare template' },
			{ status: 500 }
		);
	}
};

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const storage = getStorage();
		const { templateId } = params;
		const userId = url.searchParams.get('userId');

		if (!userId) {
			return json({ success: false, error: 'User ID required' }, { status: 400 });
		}

		// Check if template exists and user has access
		const templateResult = await storage.eventTemplates.findById(templateId);
		if (!templateResult.success || !templateResult.data) {
			return json({ success: false, error: 'Template not found' }, { status: 404 });
		}

		const template = templateResult.data;

		// Check if user has permission to view sharing details
		const canViewDetails = template.createdBy === userId;

		if (!canViewDetails) {
			// Check if user has at least VIEW permission
			const viewPermissionCheck = await storage.eventTemplatePermissions.hasPermission(
				templateId,
				userId,
				TemplatePermissionType.VIEW
			);

			if (!viewPermissionCheck.success || !viewPermissionCheck.data) {
				return json({
					success: false,
					error: 'Insufficient permissions to view sharing details'
				}, { status: 403 });
			}
		}

		// Get all permissions for this template
		const permissionsResult = await storage.eventTemplatePermissions.getTemplatePermissions(templateId);
		if (!permissionsResult.success) {
			return json(
				{ success: false, error: 'Failed to fetch permissions' },
				{ status: 500 }
			);
		}

		return json({
			success: true,
			permissions: permissionsResult.data,
			sharedWith: template.sharedWith,
			isPublic: template.isPublic
		});

	} catch (error) {
		console.error('Error fetching template sharing info:', error);
		return json(
			{ success: false, error: 'Failed to fetch sharing information' },
			{ status: 500 }
		);
	}
};