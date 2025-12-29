import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSurveyByCode } from '$lib/storage/tools-storage';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const code = params.code;
    const survey = await getSurveyByCode(code);
    
    if (!survey) {
      return json({ error: 'Survey not found' }, { status: 404 });
    }
    
    return json({ survey });
  } catch (err) {
    console.error('Error fetching survey by code:', err);
    return json({ error: 'Failed to fetch survey' }, { status: 500 });
  }
};
