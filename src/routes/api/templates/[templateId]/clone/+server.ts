import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStorage } from '../../../../../lib/storage/index.js';
import type { Event, Topic } from '../../../../../types/entities.js';
import { EventStatus } from '../../../../../types/enums.js';

export const POST: RequestHandler = async ({ params, request, url }) => {
	try {
		const storage = getStorage();
		const { templateId } = params;
		const userId = url.searchParams.get('userId');
		const body = await request.json();

		if (!userId) {
			return json({ success: false, error: 'User ID required' }, { status: 400 });
		}

		const {
			eventTitle,
			eventDescription,
			organizerName,
			cloneOptions = {
				includeSettings: true,
				includeTopics: true,
				includeRooms: false
			}
		} = body;

		// Get the template
		const templateResult = await storage.eventTemplates.findById(templateId);
		if (!templateResult.success || !templateResult.data) {
			return json({ success: false, error: 'Template not found' }, { status: 404 });
		}

		const template = templateResult.data;

		// Check if user has access to this template
		const hasAccess = template.isPublic ||
						 template.createdBy === userId ||
						 template.sharedWith.includes(userId);

		if (!hasAccess) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		// Generate unique access code for new event
		const accessCode = await storage.events.generateUniqueAccessCode();

		// Create event from template
		const eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> = {
			title: eventTitle || template.templateData.generalSettings?.defaultTitle || template.name,
			description: eventDescription || template.templateData.generalSettings?.defaultDescription || template.description || '',
			status: EventStatus.DRAFT,
			organizerId: userId,
			maxParticipants: template.templateData.generalSettings?.defaultCapacity,
			accessCode,
			settings: cloneOptions.includeSettings ? template.templateData.eventSettings : {
				allowGuestAccess: true,
				requireRegistration: false,
				enableVoting: true,
				enableGroupIntelligence: false,
				enableDiscussionGroups: false,
				enableTeamDistribution: false,
				maxVotesPerTopic: 3,
				autoAdvanceActivities: false
			},
			metadata: {
				clonedFromTemplate: templateId,
				clonedAt: new Date().toISOString(),
				cloneOptions
			}
		};

		// Create the event
		const eventResult = await storage.events.create(eventData);
		if (!eventResult.success) {
			return json(
				{ success: false, error: 'Failed to create event from template' },
				{ status: 500 }
			);
		}

		const newEvent = eventResult.data;
		const clonedTopics: Topic[] = [];

		// Clone topics if requested
		if (cloneOptions.includeTopics && template.templateData.topics) {
			for (const templateTopic of template.templateData.topics) {
				const topicData: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'> = {
					title: templateTopic.title,
					description: templateTopic.description,
					eventId: newEvent.id,
					submittedBy: userId,
					status: 'draft',
					tags: templateTopic.tags,
					voteCount: 0,
					totalVoteWeight: 0,
					averageWeight: 0,
					metadata: {
						clonedFromTemplate: true,
						templatePriority: templateTopic.priority
					}
				};

				const topicResult = await storage.topics.create(topicData);
				if (topicResult.success) {
					clonedTopics.push(topicResult.data);
				}
			}
		}

		// TODO: Clone rooms when discussion room functionality is available
		// if (cloneOptions.includeRooms && template.templateData.rooms) {
		//   // Implementation for cloning rooms
		// }

		// Increment template usage count
		await storage.eventTemplates.incrementUsageCount(templateId);

		return json({
			success: true,
			event: newEvent,
			clonedTopics,
			cloneOptions,
			message: 'Event created successfully from template'
		}, { status: 201 });

	} catch (error) {
		console.error('Error cloning event from template:', error);
		return json(
			{ success: false, error: 'Failed to clone event from template' },
			{ status: 500 }
		);
	}
};