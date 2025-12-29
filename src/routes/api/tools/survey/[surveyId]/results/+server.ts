import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSurvey, getSurveyResults } from '$lib/storage/tools-storage';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const survey = await getSurvey(params.surveyId);
    if (!survey) {
      return json({ error: 'Survey not found' }, { status: 404 });
    }
    
    const results = await getSurveyResults(params.surveyId);
    
    return json({ survey, results });
  } catch (err) {
    console.error('Error fetching results:', err);
    return json({ error: 'Failed to fetch results' }, { status: 500 });
  }
};
