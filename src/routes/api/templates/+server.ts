import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStorage } from '../../../lib/storage/index.js';
import { validateEventTemplate } from '../../../types/schemas.js';
import { TemplateCategory } from '../../../types/enums.js';
import type { EventTemplate, EventTemplateData } from '../../../types/entities.js';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const storage = getStorage();
		const searchParams = url.searchParams;

		const userId = searchParams.get('userId');
		const category = searchParams.get('category') as TemplateCategory | null;
		const search = searchParams.get('search');
		const publicOnly = searchParams.get('publicOnly') === 'true';
		const limit = parseInt(searchParams.get('limit') || '20');
		const offset = parseInt(searchParams.get('offset') || '0');

		if (!userId) {
			return json({ success: false, error: 'User ID required' }, { status: 400 });
		}

		let result;

		if (search) {
			result = await storage.eventTemplates.searchTemplates(search, userId, {
				limit,
				offset
			});
		} else if (publicOnly) {
			result = await storage.eventTemplates.findPublicTemplates({
				limit,
				offset,
				sortBy: 'usageCount',
				sortOrder: 'desc'
			});
		} else if (category) {
			result = await storage.eventTemplates.findByCategory(category, {
				limit,
				offset
			});
		} else {
			result = await storage.eventTemplates.findSharedWithUser(userId, {
				limit,
				offset
			});
		}

		if (!result.success) {
			return json({ success: false, error: result.error.message }, { status: 500 });
		}

		return json({
			success: true,
			templates: result.data,
			total: result.data.length
		});

	} catch (error) {
		console.error('Error fetching templates:', error);
		return json(
			{ success: false, error: 'Failed to fetch templates' },
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const storage = getStorage();
		const body = await request.json();

		const { name, description, category, isPublic, tags, eventId, userId } = body;

		if (!name || !category || !userId) {
			return json(
				{ success: false, error: 'Name, category, and user ID are required' },
				{ status: 400 }
			);
		}

		let templateData: EventTemplateData;

		if (eventId) {
			// Create template from existing event
			const eventResult = await storage.events.findById(eventId);
			if (!eventResult.success || !eventResult.data) {
				return json(
					{ success: false, error: 'Event not found' },
					{ status: 404 }
				);
			}

			const event = eventResult.data;

			// Get topics for this event
			const topicsResult = await storage.topics.findByEvent(eventId);
			const topics = topicsResult.success ? topicsResult.data : [];

			// Get rooms for this event (if any discussion groups were created)
			// This would need to be implemented when discussion rooms are available
			const rooms: any[] = [];

			templateData = {
				eventSettings: event.settings,
				topics: topics.map(topic => ({
					title: topic.title,
					description: topic.description,
					tags: topic.tags,
					priority: 'medium' as const
				})),
				rooms: rooms.map(room => ({
					name: room.name,
					description: room.description,
					capacity: room.capacity,
					location: room.location,
					amenities: room.amenities,
					isVirtual: room.isVirtual
				})),
				generalSettings: {
					defaultCapacity: event.maxParticipants,
					defaultTitle: `${event.title} Template`,
					defaultDescription: event.description
				}
			};
		} else {
			// Create empty template
			templateData = {
				eventSettings: {
					allowGuestAccess: true,
					requireRegistration: false,
					enableVoting: true,
					enableGroupIntelligence: false,
					enableDiscussionGroups: false,
					enableTeamDistribution: false,
					maxVotesPerTopic: 3,
					autoAdvanceActivities: false
				}
			};
		}

		const template: Omit<EventTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
			name,
			description: description || '',
			category,
			createdBy: userId,
			isPublic: isPublic || false,
			sharedWith: [],
			usageCount: 0,
			templateData,
			tags: tags || [],
			metadata: eventId ? { sourceEventId: eventId } : {}
		};

		// Validate template
		const validation = validateEventTemplate(template);
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

		const result = await storage.eventTemplates.create(template);

		if (!result.success) {
			return json(
				{ success: false, error: result.error.message },
				{ status: 500 }
			);
		}

		return json({
			success: true,
			template: result.data
		}, { status: 201 });

	} catch (error) {
		console.error('Error creating template:', error);
		return json(
			{ success: false, error: 'Failed to create template' },
			{ status: 500 }
		);
	}
};