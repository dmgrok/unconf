import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createEvent, addParticipant, getEvents } from '$lib/storage/tools-storage';
import type { Event, Participant } from '$lib/types/tools';

// POST /api/tools/events - Create a new event
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { event, organizer } = body as { event: Event; organizer: Participant };
    
    if (!event || !organizer) {
      return json({ error: 'Event and organizer data required' }, { status: 400 });
    }
    
    // Create the event
    const createdEvent = await createEvent(event);
    
    // Add the organizer as first participant
    await addParticipant(organizer);
    
    return json({ 
      success: true, 
      event: createdEvent 
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return json({ error: 'Failed to create event' }, { status: 500 });
  }
};

// GET /api/tools/events - List all events (for admin/debug)
export const GET: RequestHandler = async () => {
  try {
    const events = await getEvents();
    return json({ events });
  } catch (error) {
    console.error('Error listing events:', error);
    return json({ error: 'Failed to list events' }, { status: 500 });
  }
};
