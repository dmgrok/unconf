/**
 * Standalone Poll API
 * 
 * Allows creating and managing polls without an event.
 * Polls are stored server-side for cross-device access.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Type for standalone poll
interface StandalonePoll {
  id: string;
  question: string;
  pollType: 'options' | 'open';
  options: string[];
  votes: Record<string, number>; // option -> count (anonymous voting)
  openResponses: Array<{ id: string; text: string; votes: number }>;
  allowMultiple: boolean;
  maxWords: number;
  maxVotesPerPerson: number;
  status: 'open' | 'closed';
  createdAt: string;
  closedAt?: string;
  voterIds: string[]; // Track who voted (by anonymous session ID)
}

const DATA_DIR = path.join(process.cwd(), 'data', 'tools');
const POLLS_FILE = path.join(DATA_DIR, 'standalone-polls.json');

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function getPolls(): Promise<StandalonePoll[]> {
  await ensureDataDir();
  try {
    if (!existsSync(POLLS_FILE)) {
      return [];
    }
    const content = await readFile(POLLS_FILE, 'utf-8');
    return JSON.parse(content) as StandalonePoll[];
  } catch {
    return [];
  }
}

async function savePolls(polls: StandalonePoll[]): Promise<void> {
  await ensureDataDir();
  await writeFile(POLLS_FILE, JSON.stringify(polls, null, 2));
}

// GET /api/tools/poll?id=xxx - Get a poll by ID
export const GET: RequestHandler = async ({ url }) => {
  const pollId = url.searchParams.get('id');
  
  if (!pollId) {
    return json({ error: 'Poll ID required' }, { status: 400 });
  }
  
  try {
    const polls = await getPolls();
    const poll = polls.find(p => p.id === pollId);
    
    if (!poll) {
      return json({ error: 'Poll not found', pollId }, { status: 404 });
    }
    
    // Return poll without voterIds for privacy
    const { voterIds, ...publicPoll } = poll;
    return json({ poll: publicPoll });
  } catch (error) {
    console.error('Error getting poll:', error);
    return json({ error: 'Failed to get poll' }, { status: 500 });
  }
};

// POST /api/tools/poll - Create a new poll
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    const poll: StandalonePoll = {
      id: body.id || generateId(),
      question: body.question,
      pollType: body.pollType || 'options',
      options: body.options || [],
      votes: {},
      openResponses: [],
      allowMultiple: body.allowMultiple || false,
      maxWords: body.maxWords || 10,
      maxVotesPerPerson: body.maxVotesPerPerson || 3,
      status: 'open',
      createdAt: new Date().toISOString(),
      voterIds: []
    };
    
    // Initialize vote counts
    for (const option of poll.options) {
      poll.votes[option] = 0;
    }
    
    const polls = await getPolls();
    polls.push(poll);
    await savePolls(polls);
    
    const { voterIds, ...publicPoll } = poll;
    return json({ poll: publicPoll });
  } catch (error) {
    console.error('Error creating poll:', error);
    return json({ error: 'Failed to create poll' }, { status: 500 });
  }
};

// PATCH /api/tools/poll - Update poll (vote, add response, close)
export const PATCH: RequestHandler = async ({ request, url }) => {
  const pollId = url.searchParams.get('id');
  
  if (!pollId) {
    return json({ error: 'Poll ID required' }, { status: 400 });
  }
  
  try {
    const body = await request.json();
    const polls = await getPolls();
    const index = polls.findIndex(p => p.id === pollId);
    
    if (index === -1) {
      return json({ error: 'Poll not found' }, { status: 404 });
    }
    
    const poll = polls[index];
    
    // Handle vote
    if (body.action === 'vote' && body.option) {
      const voterId = body.voterId || 'anonymous';
      
      // Check if already voted (for single-choice)
      if (!poll.allowMultiple && poll.voterIds.includes(voterId)) {
        return json({ error: 'Already voted' }, { status: 400 });
      }
      
      if (poll.votes[body.option] !== undefined) {
        poll.votes[body.option]++;
        if (!poll.voterIds.includes(voterId)) {
          poll.voterIds.push(voterId);
        }
      }
    }
    
    // Handle open response submission
    if (body.action === 'addResponse' && body.text) {
      const responseId = generateId();
      poll.openResponses.push({
        id: responseId,
        text: body.text,
        votes: 0
      });
    }
    
    // Handle upvote on open response
    if (body.action === 'upvoteResponse' && body.responseId) {
      const response = poll.openResponses.find(r => r.id === body.responseId);
      if (response) {
        response.votes++;
      }
    }
    
    // Handle close poll
    if (body.action === 'close') {
      poll.status = 'closed';
      poll.closedAt = new Date().toISOString();
    }
    
    await savePolls(polls);
    
    const { voterIds, ...publicPoll } = poll;
    return json({ poll: publicPoll });
  } catch (error) {
    console.error('Error updating poll:', error);
    return json({ error: 'Failed to update poll' }, { status: 500 });
  }
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}
