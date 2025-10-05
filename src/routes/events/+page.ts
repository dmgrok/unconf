import type { PageLoad } from './$types';
import type { Event } from '../../types/entities';

export const load: PageLoad = async ({ fetch, url }) => {
	try {
		// Get organizerId from URL params or use a default for now
		const organizerId = url.searchParams.get('organizerId') || 'current-user';

		const response = await fetch(`/api/events?organizerId=${organizerId}`);
		const data = await response.json();

		if (!data.success) {
			return {
				events: [],
				error: data.error || 'Failed to load events'
			};
		}

		return {
			events: data.events as Event[],
			organizerId
		};
	} catch (error) {
		console.error('Failed to load events:', error);
		return {
			events: [],
			error: 'Failed to load events'
		};
	}
};
