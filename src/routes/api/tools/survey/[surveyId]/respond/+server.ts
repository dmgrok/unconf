import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSurvey, addSurveyResponse } from '$lib/storage/tools-storage';
import type { SurveyResponse } from '$lib/types/tools';

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const response: SurveyResponse = await request.json();
    
    // Validate survey exists and is open
    const survey = await getSurvey(params.surveyId);
    if (!survey) {
      return json({ error: 'Survey not found' }, { status: 404 });
    }
    if (survey.status === 'closed') {
      return json({ error: 'Survey is closed' }, { status: 400 });
    }
    
    // Ensure surveyId matches
    response.surveyId = params.surveyId;
    
    const saved = await addSurveyResponse(response);
    return json({ response: saved });
  } catch (err) {
    console.error('Error submitting response:', err);
    return json({ error: 'Failed to submit response' }, { status: 500 });
  }
};
