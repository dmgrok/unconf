import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addVote } from '$lib/storage/tools-storage';

// POST /api/tools/events/[eventId]/poll/vote - Cast a vote
export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { eventId } = params;
    const { option, participantId } = await request.json();
    
    if (!option || !participantId) {
      return json({ error: 'Option and participantId required' }, { status: 400 });
    }
    
    const poll = await addVote(eventId, option, participantId);
    if (!poll) {
      return json({ error: 'No active poll found' }, { status: 404 });
    }
    
    return json({ poll });
  } catch (error) {
    console.error('Error voting:', error);
    return json({ error: 'Failed to cast vote' }, { status: 500 });
  }
};
