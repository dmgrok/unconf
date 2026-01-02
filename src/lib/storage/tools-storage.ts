/**
 * unconf tools Lab - Simple Storage Layer
 * 
 * File-based JSON storage for events, participants, and tool data.
 * Intentionally simple - can be replaced with a database later if needed.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { Event, Participant, ShuffleResult, Poll, Survey, SurveyResponse, SurveyResults, QuestionResult } from '$lib/types/tools';

const DATA_DIR = path.join(process.cwd(), 'data', 'tools');

// Ensure data directory exists
async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

// Generic file operations
async function readJsonFile<T>(filename: string, defaultValue: T): Promise<T> {
  await ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  try {
    if (!existsSync(filepath)) {
      return defaultValue;
    }
    const content = await readFile(filepath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  await ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  await writeFile(filepath, JSON.stringify(data, null, 2));
}

// =============================================================================
// EVENTS
// =============================================================================

export async function getEvents(): Promise<Event[]> {
  return readJsonFile<Event[]>('events.json', []);
}

export async function getEvent(id: string): Promise<Event | null> {
  const events = await getEvents();
  return events.find(e => e.id === id) || null;
}

export async function getEventByCode(code: string): Promise<Event | null> {
  const events = await getEvents();
  return events.find(e => e.code.toUpperCase() === code.toUpperCase()) || null;
}

export async function createEvent(event: Event): Promise<Event> {
  const events = await getEvents();
  events.push(event);
  await writeJsonFile('events.json', events);
  return event;
}

export async function updateEvent(id: string, updates: Partial<Event>): Promise<Event | null> {
  const events = await getEvents();
  const index = events.findIndex(e => e.id === id);
  if (index === -1) return null;
  
  events[index] = { ...events[index], ...updates };
  await writeJsonFile('events.json', events);
  return events[index];
}

// =============================================================================
// PARTICIPANTS
// =============================================================================

export async function getParticipants(eventId: string): Promise<Participant[]> {
  const all = await readJsonFile<Participant[]>('participants.json', []);
  return all.filter(p => p.eventId === eventId);
}

export async function getParticipant(eventId: string, participantId: string): Promise<Participant | null> {
  const participants = await getParticipants(eventId);
  return participants.find(p => p.id === participantId) || null;
}

export async function addParticipant(participant: Participant): Promise<Participant> {
  const all = await readJsonFile<Participant[]>('participants.json', []);
  all.push(participant);
  await writeJsonFile('participants.json', all);
  return participant;
}

export async function updateParticipant(eventId: string, participantId: string, updates: Partial<Participant>): Promise<Participant | null> {
  const all = await readJsonFile<Participant[]>('participants.json', []);
  const index = all.findIndex(p => p.eventId === eventId && p.id === participantId);
  if (index === -1) return null;
  
  all[index] = { ...all[index], ...updates };
  await writeJsonFile('participants.json', all);
  return all[index];
}

// =============================================================================
// SHUFFLER
// =============================================================================

export async function getShuffleResult(eventId: string): Promise<ShuffleResult | null> {
  const all = await readJsonFile<ShuffleResult[]>('shuffles.json', []);
  // Return the most recent shuffle for the event
  const eventShuffles = all.filter(s => s.eventId === eventId);
  return eventShuffles.length > 0 ? eventShuffles[eventShuffles.length - 1] : null;
}

export async function saveShuffleResult(result: ShuffleResult): Promise<ShuffleResult> {
  const all = await readJsonFile<ShuffleResult[]>('shuffles.json', []);
  all.push(result);
  await writeJsonFile('shuffles.json', all);
  return result;
}

// =============================================================================
// POLLS
// =============================================================================

export async function getActivePoll(eventId: string): Promise<Poll | null> {
  const all = await readJsonFile<Poll[]>('polls.json', []);
  return all.find(p => p.eventId === eventId && p.status === 'open') || null;
}

export async function createPoll(poll: Poll): Promise<Poll> {
  const all = await readJsonFile<Poll[]>('polls.json', []);
  // Close any existing open polls for this event
  all.forEach(p => {
    if (p.eventId === poll.eventId && p.status === 'open') {
      p.status = 'closed';
      p.closedAt = new Date().toISOString();
    }
  });
  all.push(poll);
  await writeJsonFile('polls.json', all);
  return poll;
}

export async function updatePoll(eventId: string, updates: Partial<Poll>): Promise<Poll | null> {
  const all = await readJsonFile<Poll[]>('polls.json', []);
  const index = all.findIndex(p => p.eventId === eventId && p.status === 'open');
  if (index === -1) return null;
  
  all[index] = { ...all[index], ...updates };
  await writeJsonFile('polls.json', all);
  return all[index];
}

export async function addVote(eventId: string, option: string, participantId: string): Promise<Poll | null> {
  const all = await readJsonFile<Poll[]>('polls.json', []);
  const index = all.findIndex(p => p.eventId === eventId && p.status === 'open');
  if (index === -1) return null;
  
  const poll = all[index];
  if (!poll.votes[option]) {
    poll.votes[option] = [];
  }
  
  // Check if already voted
  const alreadyVoted = Object.values(poll.votes).some(voters => 
    (voters as string[]).includes(participantId)
  );
  
  if (!alreadyVoted) {
    (poll.votes[option] as string[]).push(participantId);
    await writeJsonFile('polls.json', all);
  }
  
  return poll;
}

// =============================================================================
// SURVEYS
// =============================================================================

export async function getSurveys(): Promise<Survey[]> {
  return readJsonFile<Survey[]>('surveys.json', []);
}

export async function getSurvey(id: string): Promise<Survey | null> {
  const surveys = await getSurveys();
  return surveys.find(s => s.id === id) || null;
}

export async function getSurveyByCode(code: string): Promise<Survey | null> {
  const surveys = await getSurveys();
  return surveys.find(s => s.shareCode.toUpperCase() === code.toUpperCase()) || null;
}

export async function createSurvey(survey: Survey): Promise<Survey> {
  const surveys = await getSurveys();
  surveys.push(survey);
  await writeJsonFile('surveys.json', surveys);
  return survey;
}

export async function updateSurvey(id: string, updates: Partial<Survey>): Promise<Survey | null> {
  const surveys = await getSurveys();
  const index = surveys.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  surveys[index] = { ...surveys[index], ...updates };
  await writeJsonFile('surveys.json', surveys);
  return surveys[index];
}

// =============================================================================
// SURVEY RESPONSES
// =============================================================================

export async function getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
  const all = await readJsonFile<SurveyResponse[]>('survey-responses.json', []);
  return all.filter(r => r.surveyId === surveyId);
}

export async function addSurveyResponse(response: SurveyResponse): Promise<SurveyResponse> {
  const all = await readJsonFile<SurveyResponse[]>('survey-responses.json', []);
  all.push(response);
  await writeJsonFile('survey-responses.json', all);
  return response;
}

export async function getSurveyResults(surveyId: string): Promise<SurveyResults | null> {
  const survey = await getSurvey(surveyId);
  if (!survey) return null;
  
  const responses = await getSurveyResponses(surveyId);
  
  const questionResults: Record<string, QuestionResult> = {};
  
  for (const question of survey.questions) {
    const result: QuestionResult = {
      questionId: question.id,
      questionType: question.type,
      responseCount: 0,
    };
    
    // Count responses for this question
    const answersForQuestion = responses
      .map(r => r.answers[question.id])
      .filter(a => a !== undefined && a !== '' && a !== 0 && !(Array.isArray(a) && a.length === 0));
    
    result.responseCount = answersForQuestion.length;
    
    if (question.type === 'single-choice' || question.type === 'multiple-choice') {
      result.choiceCounts = {};
      for (const option of question.options || []) {
        result.choiceCounts[option] = 0;
      }
      
      for (const answer of answersForQuestion) {
        if (question.type === 'single-choice') {
          if (result.choiceCounts[answer as string] !== undefined) {
            result.choiceCounts[answer as string]++;
          }
        } else {
          for (const selected of answer as string[]) {
            if (result.choiceCounts[selected] !== undefined) {
              result.choiceCounts[selected]++;
            }
          }
        }
      }
    }
    
    if (question.type === 'yes-no') {
      result.choiceCounts = { 'yes': 0, 'no': 0 };
      for (const answer of answersForQuestion) {
        if (answer === 'yes' || answer === 'no') {
          result.choiceCounts[answer]++;
        }
      }
    }
    
    if (question.type === 'rating') {
      result.ratingDistribution = {};
      let sum = 0;
      for (const answer of answersForQuestion) {
        const rating = answer as number;
        result.ratingDistribution[rating] = (result.ratingDistribution[rating] || 0) + 1;
        sum += rating;
      }
      result.averageRating = answersForQuestion.length > 0 
        ? sum / answersForQuestion.length 
        : 0;
    }
    
    if (question.type === 'text') {
      result.textResponses = answersForQuestion
        .filter(a => typeof a === 'string' && a.trim())
        .map(a => a as string);
    }
    
    questionResults[question.id] = result;
  }
  
  return {
    surveyId,
    totalResponses: responses.length,
    questionResults,
  };
}
