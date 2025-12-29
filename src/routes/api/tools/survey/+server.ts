import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSurvey, getSurveys } from '$lib/storage/tools-storage';
import type { Survey } from '$lib/types/tools';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const survey: Survey = await request.json();
    
    // Validate
    if (!survey.title?.trim()) {
      return json({ error: 'Title is required' }, { status: 400 });
    }
    if (!survey.questions || survey.questions.length === 0) {
      return json({ error: 'At least one question is required' }, { status: 400 });
    }
    
    const created = await createSurvey(survey);
    return json({ survey: created });
  } catch (err) {
    console.error('Error creating survey:', err);
    return json({ error: 'Failed to create survey' }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    const surveys = await getSurveys();
    return json({ surveys });
  } catch (err) {
    console.error('Error fetching surveys:', err);
    return json({ error: 'Failed to fetch surveys' }, { status: 500 });
  }
};
