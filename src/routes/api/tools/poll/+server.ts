/**
 * Standalone Poll API
 * 
 * Allows creating and managing polls without an event.
 * 
 * STORAGE: Uses in-memory storage for serverless compatibility.
 * Polls persist while the serverless function is warm (typically ~5-15 min).
 * For persistent cross-device polls, users should use Event Mode.
 * 
 * Note: This is intentionally simple. If persistence is needed, 
 * consider Vercel KV, Redis, or a database.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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

// In-memory storage - works across requests while serverless function is warm
// This is a module-level variable that persists between requests
const pollsStore = new Map<string, StandalonePoll>();

// Clean up old polls (older than 1 hour) to prevent memory leaks
function cleanupOldPolls() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, poll] of pollsStore.entries()) {
    const createdAt = new Date(poll.createdAt).getTime();
    if (createdAt < oneHourAgo) {
      pollsStore.delete(id);
    }
  }
}

function getPolls(): StandalonePoll[] {
  cleanupOldPolls();
  return Array.from(pollsStore.values());
}

function getPoll(id: string): StandalonePoll | undefined {
  cleanupOldPolls();
  return pollsStore.get(id);
}

function savePoll(poll: StandalonePoll): void {
  pollsStore.set(poll.id, poll);
}

// GET /api/tools/poll?id=xxx - Get a poll by ID
export const GET: RequestHandler = async ({ url }) => {
  const pollId = url.searchParams.get('id');
  
  if (!pollId) {
    return json({ error: 'Poll ID required' }, { status: 400 });
  }
  
  try {
    const poll = getPoll(pollId);
    
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
    
    savePoll(poll);
    
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
    const poll = getPoll(pollId);
    
    if (!poll) {
      return json({ error: 'Poll not found' }, { status: 404 });
    }
    
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
    
    savePoll(poll);
    
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
