import { json } from '@sveltejs/kit';
import { EventRepository } from '$lib/storage';
import { EventStatus } from '../../../../types/enums';
import { z } from 'zod';

// Initialize repository
const eventRepository = new EventRepository({
	dataDir: './data',
	enableBackups: true,
	backupRetention: 10
});

// Join event schema
const JoinEventSchema = z.object({
	eventId: z.string().min(1),
	userId: z.string().min(1),
	accessCode: z.string().min(1).max(50)
});

export async function POST({ request }) {
	try {
		const body = await request.json();
		const validatedData = JoinEventSchema.parse(body);

		// Fetch the event
		const eventResult = await eventRepository.findById(validatedData.eventId);
		if (!eventResult.success || !eventResult.data) {
			return json(
				{
					success: false,
					error: 'Event not found'
				},
				{ status: 404 }
			);
		}

		const event = eventResult.data;

		// Check if event is active
		if (event.status !== EventStatus.ACTIVE && event.status !== EventStatus.DRAFT) {
			return json(
				{
					success: false,
					error: 'Event is not accepting participants'
				},
				{ status: 400 }
			);
		}

		// Verify access code
		if (event.accessCode !== validatedData.accessCode) {
			return json(
				{
					success: false,
					error: 'Invalid access code'
				},
				{ status: 403 }
			);
		}

		// Check capacity if set
		if (event.maxParticipants && event.maxParticipants > 0) {
			// Note: In a real implementation, you'd track actual participant count
			// This is a simplified version - for now we just allow joins
			// TODO: Track participants and enforce capacity limit
		}

		// Check guest access if needed
		if (!event.settings.allowGuestAccess && validatedData.userId.startsWith('guest-')) {
			return json(
				{
					success: false,
					error: 'Guest access is not allowed for this event'
				},
				{ status: 403 }
			);
		}

		// Success - in a real implementation, you'd add the user to the event's participants
		return json({
			success: true,
			event: event,
			message: 'Successfully joined event'
		});
	} catch (error) {
		console.error('Event join error:', error);

		if (error instanceof z.ZodError) {
			return json(
				{
					success: false,
					error: 'Invalid request data',
					details: error.issues
				},
				{ status: 400 }
			);
		}

		return json(
			{
				success: false,
				error: 'Failed to join event'
			},
			{ status: 500 }
		);
	}
}
