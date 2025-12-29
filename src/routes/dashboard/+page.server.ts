import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { EventRepository } from '$lib/storage/EventRepository';
import { TopicRepository } from '$lib/storage/TopicRepository';
import { UserRepository } from '$lib/storage/UserRepository';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();

	// Require authentication
	if (!session?.user) {
		throw redirect(303, '/signin?redirect=/dashboard');
	}

	const userId = session.user.id;

	// Initialize repositories
	const eventRepo = new EventRepository({ dataDir: './data' });
	const topicRepo = new TopicRepository({ dataDir: './data' });
	const userRepo = new UserRepository({ dataDir: './data' });

	// Fetch organizer's events
	const eventsResult = await eventRepo.findByOrganizer(userId);
	const events = eventsResult.success ? eventsResult.data : [];

	// Calculate statistics
	const totalEvents = events.length;
	const activeEvents = events.filter(e => e.status === 'active').length;
	const draftEvents = events.filter(e => e.status === 'draft').length;
	const completedEvents = events.filter(e => e.status === 'completed').length;

	// Calculate total participants across all events
	let totalParticipants = 0;
	let totalTopics = 0;

	for (const event of events) {
		// Count users in this event
		const usersResult = await userRepo.findByCurrentEvent(event.id);
		if (usersResult.success) {
			totalParticipants += usersResult.data.length;
		}

		// Count topics in this event
		const topicsResult = await topicRepo.findByEvent(event.id);
		if (topicsResult.success) {
			totalTopics += topicsResult.data.length;
		}
	}

	// Get recent events (sorted by updatedAt)
	const recentEvents = events
		.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
		.slice(0, 5);

	// Get user data
	const userResult = await userRepo.findById(userId);
	const user = userResult.success ? userResult.data : null;

	return {
		user: {
			id: userId,
			name: session.user.name || 'Organizer',
			email: session.user.email
		},
		stats: {
			totalEvents,
			activeEvents,
			draftEvents,
			completedEvents,
			totalParticipants,
			totalTopics,
			averageRating: 4.5 // Placeholder - implement rating system later
		},
		recentEvents: recentEvents.map(event => ({
			id: event.id,
			title: event.title,
			status: event.status,
			updatedAt: event.updatedAt,
			participantCount: 0 // Will be populated by client if needed
		})),
		hasEvents: events.length > 0
	};
};
