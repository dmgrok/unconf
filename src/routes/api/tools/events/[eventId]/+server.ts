import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEvent, getParticipants, updateEvent } from '$lib/storage/tools-storage';

// GET /api/tools/events/[eventId] - Get event details with participants
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { eventId } = params;
    
    const event = await getEvent(eventId);
    if (!event) {
      return json({ error: 'Event not found' }, { status: 404 });
    }
    
    const participants = await getParticipants(eventId);
    
    return json({ 
      event,
      participants,
    });
  } catch (error) {
    console.error('Error getting event:', error);
    return json({ error: 'Failed to get event' }, { status: 500 });
  }
};

// PATCH /api/tools/events/[eventId] - Update event settings
export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    const { eventId } = params;
    const updates = await request.json();
    
    const event = await updateEvent(eventId, updates);
    if (!event) {
      return json({ error: 'Event not found' }, { status: 404 });
    }
    
    return json({ event });
  } catch (error) {
    console.error('Error updating event:', error);
    return json({ error: 'Failed to update event' }, { status: 500 });
  }
};
