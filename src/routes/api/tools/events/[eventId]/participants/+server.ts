import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getParticipants, addParticipant } from '$lib/storage/tools-storage';
import type { Participant } from '$lib/types/tools';

// GET /api/tools/events/[eventId]/participants
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { eventId } = params;
    const participants = await getParticipants(eventId);
    return json({ participants });
  } catch (error) {
    console.error('Error getting participants:', error);
    return json({ error: 'Failed to get participants' }, { status: 500 });
  }
};

// POST /api/tools/events/[eventId]/participants - Add participant
export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { eventId } = params;
    const body = await request.json();
    
    const participant: Participant = {
      ...body,
      eventId,
      joinedAt: new Date().toISOString(),
    };
    
    const created = await addParticipant(participant);
    return json({ participant: created });
  } catch (error) {
    console.error('Error adding participant:', error);
    return json({ error: 'Failed to add participant' }, { status: 500 });
  }
};
