import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStorage } from '../../../../lib/storage/index.js';
import { validateEventTemplate } from '../../../../types/schemas.js';

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const storage = getStorage();
		const { templateId } = params;
		const userId = url.searchParams.get('userId');

		if (!userId) {
			return json({ success: false, error: 'User ID required' }, { status: 400 });
		}

		const result = await storage.eventTemplates.findById(templateId);

		if (!result.success || !result.data) {
			return json({ success: false, error: 'Template not found' }, { status: 404 });
		}

		const template = result.data;

		// Check if user has access to this template
		const hasAccess = template.isPublic ||
						 template.createdBy === userId ||
						 template.sharedWith.includes(userId);

		if (!hasAccess) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		return json({
			success: true,
			template
		});

	} catch (error) {
		console.error('Error fetching template:', error);
		return json(
			{ success: false, error: 'Failed to fetch template' },
			{ status: 500 }
		);
	}
};

export const PUT: RequestHandler = async ({ params, request, url }) => {
	try {
		const storage = getStorage();
		const { templateId } = params;
		const userId = url.searchParams.get('userId');
		const body = await request.json();

		if (!userId) {
			return json({ success: false, error: 'User ID required' }, { status: 400 });
		}

		// Check if template exists and user has edit permission
		const templateResult = await storage.eventTemplates.findById(templateId);
		if (!templateResult.success || !templateResult.data) {
			return json({ success: false, error: 'Template not found' }, { status: 404 });
		}

		const template = templateResult.data;

		// Only creator can edit for now (could be extended with permissions)
		if (template.createdBy !== userId) {
			return json({ success: false, error: 'Only template creator can edit' }, { status: 403 });
		}

		// Extract updatable fields
		const { name, description, category, isPublic, tags, templateData } = body;
		const updates: Partial<typeof template> = {};

		if (name !== undefined) updates.name = name;
		if (description !== undefined) updates.description = description;
		if (category !== undefined) updates.category = category;
		if (isPublic !== undefined) updates.isPublic = isPublic;
		if (tags !== undefined) updates.tags = tags;
		if (templateData !== undefined) updates.templateData = templateData;

		// Validate updates
		if (Object.keys(updates).length > 0) {
			const updatedTemplate = { ...template, ...updates };
			const validation = validateEventTemplate(updatedTemplate);
			if (!validation.success) {
				return json(
					{
						success: false,
						error: 'Invalid template data',
						details: validation.error.errors
					},
					{ status: 400 }
				);
			}
		}

		const result = await storage.eventTemplates.update(templateId, updates);

		if (!result.success) {
			return json(
				{ success: false, error: result.error.message },
				{ status: 500 }
			);
		}

		return json({
			success: true,
			template: result.data
		});

	} catch (error) {
		console.error('Error updating template:', error);
		return json(
			{ success: false, error: 'Failed to update template' },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params, url }) => {
	try {
		const storage = getStorage();
		const { templateId } = params;
		const userId = url.searchParams.get('userId');

		if (!userId) {
			return json({ success: false, error: 'User ID required' }, { status: 400 });
		}

		// Check if template exists and user has delete permission
		const templateResult = await storage.eventTemplates.findById(templateId);
		if (!templateResult.success || !templateResult.data) {
			return json({ success: false, error: 'Template not found' }, { status: 404 });
		}

		const template = templateResult.data;

		// Only creator can delete
		if (template.createdBy !== userId) {
			return json({ success: false, error: 'Only template creator can delete' }, { status: 403 });
		}

		const result = await storage.eventTemplates.delete(templateId);

		if (!result.success) {
			return json(
				{ success: false, error: result.error.message },
				{ status: 500 }
			);
		}

		// Also remove any permissions associated with this template
		try {
			const permissionsResult = await storage.eventTemplatePermissions.findByTemplate(templateId);
			if (permissionsResult.success && permissionsResult.data.length > 0) {
				for (const permission of permissionsResult.data) {
					await storage.eventTemplatePermissions.delete(permission.id);
				}
			}
		} catch (error) {
			console.warn('Failed to clean up template permissions:', error);
		}

		return json({
			success: true,
			message: 'Template deleted successfully'
		});

	} catch (error) {
		console.error('Error deleting template:', error);
		return json(
			{ success: false, error: 'Failed to delete template' },
			{ status: 500 }
		);
	}
};