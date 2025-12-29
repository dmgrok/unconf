import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getActivePoll, createPoll, updatePoll } from '$lib/storage/tools-storage';
import type { Poll } from '$lib/types/tools';

// GET /api/tools/events/[eventId]/poll - Get active poll
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { eventId } = params;
    const poll = await getActivePoll(eventId);
    return json({ poll });
  } catch (error) {
    console.error('Error getting poll:', error);
    return json({ error: 'Failed to get poll' }, { status: 500 });
  }
};

// POST /api/tools/events/[eventId]/poll - Create new poll
export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { eventId } = params;
    const body = await request.json() as Poll;
    
    // Ensure eventId matches
    body.eventId = eventId;
    
    const created = await createPoll(body);
    return json({ poll: created });
  } catch (error) {
    console.error('Error creating poll:', error);
    return json({ error: 'Failed to create poll' }, { status: 500 });
  }
};

// PATCH /api/tools/events/[eventId]/poll - Update poll (close it)
export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    const { eventId } = params;
    const updates = await request.json();
    
    const poll = await updatePoll(eventId, updates);
    if (!poll) {
      return json({ error: 'No active poll found' }, { status: 404 });
    }
    
    return json({ poll });
  } catch (error) {
    console.error('Error updating poll:', error);
    return json({ error: 'Failed to update poll' }, { status: 500 });
  }
};
