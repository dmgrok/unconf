import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getShuffleResult, saveShuffleResult } from '$lib/storage/tools-storage';
import { generateId, type ShuffleResult } from '$lib/types/tools';

// GET /api/tools/events/[eventId]/shuffler - Get latest shuffle result
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { eventId } = params;
    const result = await getShuffleResult(eventId);
    return json({ result });
  } catch (error) {
    console.error('Error getting shuffle result:', error);
    return json({ error: 'Failed to get shuffle result' }, { status: 500 });
  }
};

// POST /api/tools/events/[eventId]/shuffler - Save new shuffle result
export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { eventId } = params;
    const body = await request.json();
    
    const result: ShuffleResult = {
      id: generateId(),
      eventId,
      teams: body.teams,
      teamSize: body.teamSize,
      createdAt: new Date().toISOString(),
    };
    
    const saved = await saveShuffleResult(result);
    return json({ result: saved });
  } catch (error) {
    console.error('Error saving shuffle result:', error);
    return json({ error: 'Failed to save shuffle result' }, { status: 500 });
  }
};
