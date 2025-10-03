import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStorage } from '../../../../../lib/storage/index.js';
import { TemplatePermissionType } from '../../../../../types/enums.js';

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const storage = getStorage();
		const { templateId } = params;
		const userId = url.searchParams.get('userId');
		const requiredPermission = url.searchParams.get('permission') as TemplatePermissionType;

		if (!userId) {
			return json({ success: false, error: 'User ID required' }, { status: 400 });
		}

		// Check if template exists
		const templateResult = await storage.eventTemplates.findById(templateId);
		if (!templateResult.success || !templateResult.data) {
			return json({ success: false, error: 'Template not found' }, { status: 404 });
		}

		const template = templateResult.data;

		// Check if user is the creator (always has full permissions)
		if (template.createdBy === userId) {
			return json({
				success: true,
				hasPermission: true,
				permission: TemplatePermissionType.ADMIN,
				isCreator: true,
				reason: 'Template creator has full access'
			});
		}

		// Check if template is public and user only needs view/use permission
		if (template.isPublic && (!requiredPermission ||
			[TemplatePermissionType.VIEW, TemplatePermissionType.USE].includes(requiredPermission))) {
			return json({
				success: true,
				hasPermission: true,
				permission: TemplatePermissionType.USE,
				isCreator: false,
				reason: 'Public template access'
			});
		}

		// Check explicit permissions
		const permissionResult = await storage.eventTemplatePermissions.findByTemplateAndUser(templateId, userId);

		if (!permissionResult.success) {
			return json({
				success: true,
				hasPermission: false,
				permission: null,
				isCreator: false,
				reason: 'No explicit permission granted'
			});
		}

		const userPermission = permissionResult.data.permission;

		// If no specific permission is required, return the user's permission level
		if (!requiredPermission) {
			return json({
				success: true,
				hasPermission: true,
				permission: userPermission,
				isCreator: false,
				reason: 'Explicit permission granted'
			});
		}

		// Check if user has the required permission level
		const hasRequiredPermission = await storage.eventTemplatePermissions.hasPermission(
			templateId,
			userId,
			requiredPermission
		);

		if (!hasRequiredPermission.success) {
			return json(
				{ success: false, error: 'Failed to check permission' },
				{ status: 500 }
			);
		}

		return json({
			success: true,
			hasPermission: hasRequiredPermission.data,
			permission: userPermission,
			isCreator: false,
			reason: hasRequiredPermission.data
				? `User has ${userPermission} permission which satisfies ${requiredPermission}`
				: `User permission ${userPermission} insufficient for ${requiredPermission}`
		});

	} catch (error) {
		console.error('Error checking template permission:', error);
		return json(
			{ success: false, error: 'Failed to check permission' },
			{ status: 500 }
		);
	}
};

// Update user permissions (only for creators or users with SHARE permission)
export const PATCH: RequestHandler = async ({ params, request, url }) => {
	try {
		const storage = getStorage();
		const { templateId } = params;
		const userId = url.searchParams.get('userId');
		const body = await request.json();

		if (!userId) {
			return json({ success: false, error: 'User ID required' }, { status: 400 });
		}

		const { targetUserId, newPermission } = body;

		if (!targetUserId || !newPermission) {
			return json({
				success: false,
				error: 'Target user ID and new permission required'
			}, { status: 400 });
		}

		// Validate permission type
		if (!Object.values(TemplatePermissionType).includes(newPermission)) {
			return json({ success: false, error: 'Invalid permission type' }, { status: 400 });
		}

		// Check if template exists
		const templateResult = await storage.eventTemplates.findById(templateId);
		if (!templateResult.success || !templateResult.data) {
			return json({ success: false, error: 'Template not found' }, { status: 404 });
		}

		const template = templateResult.data;

		// Check if user has permission to modify permissions
		const canModify = template.createdBy === userId;

		if (!canModify) {
			// Check if user has SHARE permission
			const sharePermissionCheck = await storage.eventTemplatePermissions.hasPermission(
				templateId,
				userId,
				TemplatePermissionType.SHARE
			);

			if (!sharePermissionCheck.success || !sharePermissionCheck.data) {
				return json({
					success: false,
					error: 'Insufficient permissions to modify template access'
				}, { status: 403 });
			}
		}

		// Prevent non-creators from granting ADMIN permission
		if (template.createdBy !== userId && newPermission === TemplatePermissionType.ADMIN) {
			return json({
				success: false,
				error: 'Only template creator can grant admin permissions'
			}, { status: 403 });
		}

		// Grant the new permission
		const grantResult = await storage.eventTemplatePermissions.grantPermission(
			templateId,
			targetUserId,
			newPermission,
			userId
		);

		if (!grantResult.success) {
			return json(
				{ success: false, error: grantResult.error.message },
				{ status: 500 }
			);
		}

		return json({
			success: true,
			permission: grantResult.data,
			message: `Permission updated to ${newPermission} for user ${targetUserId}`
		});

	} catch (error) {
		console.error('Error updating template permission:', error);
		return json(
			{ success: false, error: 'Failed to update permission' },
			{ status: 500 }
		);
	}
};