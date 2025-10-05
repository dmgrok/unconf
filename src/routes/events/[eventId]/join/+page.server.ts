import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { EventRepository } from '$lib/storage';

const eventRepository = new EventRepository({
	dataDir: './data',
	enableBackups: true,
	backupRetention: 10
});

export const load: PageServerLoad = async ({ params }) => {
	const { eventId } = params;

	try {
		const result = await eventRepository.findById(eventId);

		if (!result.success || !result.data) {
			throw error(404, 'Event not found');
		}

		return {
			event: result.data
		};
	} catch (err) {
		console.error('Error loading event:', err);
		throw error(404, 'Event not found');
	}
};
