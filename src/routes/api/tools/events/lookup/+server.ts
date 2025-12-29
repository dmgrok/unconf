import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEventByCode } from '$lib/storage/tools-storage';

// GET /api/tools/events/lookup?code=XXXXX - Lookup event by code
export const GET: RequestHandler = async ({ url }) => {
  try {
    const code = url.searchParams.get('code');
    
    if (!code) {
      return json({ error: 'Code parameter required' }, { status: 400 });
    }
    
    const event = await getEventByCode(code);
    
    if (!event) {
      return json({ event: null }, { status: 200 });
    }
    
    return json({ event });
  } catch (error) {
    console.error('Error looking up event:', error);
    return json({ error: 'Failed to lookup event' }, { status: 500 });
  }
};
