import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSurvey, updateSurvey, getSurveyResults } from '$lib/storage/tools-storage';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const survey = await getSurvey(params.surveyId);
    
    if (!survey) {
      return json({ error: 'Survey not found' }, { status: 404 });
    }
    
    return json({ survey });
  } catch (err) {
    console.error('Error fetching survey:', err);
    return json({ error: 'Failed to fetch survey' }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    const updates = await request.json();
    const survey = await updateSurvey(params.surveyId, updates);
    
    if (!survey) {
      return json({ error: 'Survey not found' }, { status: 404 });
    }
    
    return json({ survey });
  } catch (err) {
    console.error('Error updating survey:', err);
    return json({ error: 'Failed to update survey' }, { status: 500 });
  }
};
