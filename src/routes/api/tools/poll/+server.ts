/**
 * Standalone Poll API
 * 
 * Allows creating and managing polls without an event.
 * 
 * STORAGE STRATEGY:
 * - Poll CONFIGURATION (question, options, type) is encoded in the URL itself
 *   using base64, making it truly stateless and shareable across any device
 * - Poll VOTES are stored in-memory and will reset when serverless function
 *   restarts (this is acceptable for quick, ephemeral polls)
 * 
 * The URL contains everything needed to reconstruct the poll, so even if
 * votes are lost, participants can still see and vote on the poll.
 * 
 * For persistent polls with vote history, users should use Event Mode.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Type for poll configuration (encoded in URL)
interface PollConfig {
  q: string;        // question
  t: 'o' | 'r';     // type: 'o' = options, 'r' = open responses
  opts?: string[];  // options (for fixed options type)
  m?: boolean;      // allowMultiple (legacy)
  mo?: number;      // maxOptionsVotes (number of options each person can vote for)
  mw?: number;      // maxWords (for open responses)
  mv?: number;      // maxVotesPerPerson (for suggestions)
  ao?: boolean;     // allowOpenResponses
}

// Type for runtime poll state (in-memory only)
interface PollState {
  votes: Record<string, number>; // option -> count
  openResponses: Array<{ id: string; text: string; votes: number }>;
  voterIds: string[];
  status: 'open' | 'closed';
  createdAt: string;
}

// In-memory storage for votes only - will be lost on cold start
// This is acceptable for quick polls; the poll config is always in the URL
const pollStates = new Map<string, PollState>();

// Clean up old poll states (older than 2 hours) to prevent memory leaks
function cleanupOldStates() {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, state] of pollStates.entries()) {
    const createdAt = new Date(state.createdAt).getTime();
    if (createdAt < twoHoursAgo) {
      pollStates.delete(id);
    }
  }
}

// Encode poll config to URL-safe base64
function encodePollConfig(config: PollConfig): string {
  const jsonStr = JSON.stringify(config);
  // Use base64url encoding (URL-safe)
  return Buffer.from(jsonStr).toString('base64url');
}

// Decode poll config from base64 (supports both base64url and standard base64)
function decodePollConfig(encoded: string): PollConfig | null {
  try {
    // First try base64url encoding
    const jsonStr = Buffer.from(encoded, 'base64url').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    // Fall back to standard base64 encoding for backwards compatibility
    try {
      const jsonStr = Buffer.from(encoded, 'base64').toString('utf-8');
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }
}

// Get or create poll state for a given poll ID
function getPollState(pollId: string): PollState {
  cleanupOldStates();
  let state = pollStates.get(pollId);
  if (!state) {
    state = {
      votes: {},
      openResponses: [],
      voterIds: [],
      status: 'open',
      createdAt: new Date().toISOString()
    };
    pollStates.set(pollId, state);
  }
  return state;
}

function savePollState(pollId: string, state: PollState): void {
  pollStates.set(pollId, state);
}

// GET /api/tools/poll?c=xxx - Get poll from config in URL
// The 'c' param contains the base64-encoded poll configuration
export const GET: RequestHandler = async ({ url }) => {
  const configEncoded = url.searchParams.get('c');
  const pollId = url.searchParams.get('id');
  
  if (!configEncoded) {
    return json({ error: 'Poll config required. Use ?c=<encoded_config>' }, { status: 400 });
  }
  
  const config = decodePollConfig(configEncoded);
  if (!config) {
    return json({ error: 'Invalid poll configuration' }, { status: 400 });
  }
  
  // Generate a poll ID from the config hash if not provided
  const effectivePollId = pollId || configEncoded.substring(0, 16);
  
  // Get or create state for this poll
  const state = getPollState(effectivePollId);
  
  // Initialize vote counts for options if needed
  if (config.t === 'o' && config.opts) {
    for (const opt of config.opts) {
      if (state.votes[opt] === undefined) {
        state.votes[opt] = 0;
      }
    }
  }
  
  // Reconstruct full poll object from config + state
  const poll = {
    id: effectivePollId,
    question: config.q,
    pollType: config.t === 'o' ? 'options' : 'open',
    options: config.opts || [],
    votes: state.votes,
    openResponses: state.openResponses,
    maxOptionsVotes: config.mo || (config.m ? 99 : 1), // Legacy: m=true means unlimited
    maxWords: config.mw || 10,
    maxVotesPerPerson: config.mv || 3,
    allowOpenResponses: config.ao || false,
    status: state.status
  };
  
  return json({ poll, config: configEncoded });
};

// POST /api/tools/poll - Create a new poll (returns encoded config)
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Create compact config for URL encoding
    const config: PollConfig = {
      q: body.question,
      t: body.pollType === 'options' ? 'o' : 'r'
    };
    
    if (body.pollType === 'options' && body.options?.length) {
      config.opts = body.options.filter((o: string) => o.trim());
    }
    
    // maxOptionsVotes: how many options each person can select
    if (body.maxOptionsVotes && body.maxOptionsVotes > 1) config.mo = body.maxOptionsVotes;
    if (body.maxWords && body.maxWords !== 10) config.mw = body.maxWords;
    if (body.maxVotesPerPerson && body.maxVotesPerPerson !== 3) config.mv = body.maxVotesPerPerson;
    if (body.allowOpenResponses) config.ao = true;
    
    // Encode config
    const configEncoded = encodePollConfig(config);
    const pollId = body.id || configEncoded.substring(0, 16);
    
    // Initialize state
    const state = getPollState(pollId);
    
    // Initialize vote counts for options
    if (config.opts) {
      for (const opt of config.opts) {
        state.votes[opt] = 0;
      }
    }
    
    savePollState(pollId, state);
    
    // Return full poll object
    const poll = {
      id: pollId,
      question: config.q,
      pollType: config.t === 'o' ? 'options' : 'open',
      options: config.opts || [],
      votes: state.votes,
      openResponses: state.openResponses,
      maxOptionsVotes: config.mo || 1,
      maxWords: config.mw || 10,
      maxVotesPerPerson: config.mv || 3,
      allowOpenResponses: config.ao || false,
      status: state.status
    };
    
    return json({ poll, config: configEncoded });
  } catch (error) {
    console.error('Error creating poll:', error);
    return json({ error: 'Failed to create poll' }, { status: 500 });
  }
};

// PATCH /api/tools/poll?c=xxx - Update poll state (vote, add response, close)
export const PATCH: RequestHandler = async ({ request, url }) => {
  const configEncoded = url.searchParams.get('c');
  const pollId = url.searchParams.get('id');
  
  if (!configEncoded) {
    return json({ error: 'Poll config required' }, { status: 400 });
  }
  
  const config = decodePollConfig(configEncoded);
  if (!config) {
    return json({ error: 'Invalid poll configuration' }, { status: 400 });
  }
  
  const effectivePollId = pollId || configEncoded.substring(0, 16);
  
  try {
    const body = await request.json();
    const state = getPollState(effectivePollId);
    
    // Initialize vote counts for options if needed
    if (config.t === 'o' && config.opts) {
      for (const opt of config.opts) {
        if (state.votes[opt] === undefined) {
          state.votes[opt] = 0;
        }
      }
    }
    
    // Handle vote
    if (body.action === 'vote' && body.option) {
      const voterId = body.voterId || 'anonymous';
      
      // Check if already voted (for single-choice)
      const maxOptionsVotes = config.mo || (config.m ? 99 : 1);
      if (maxOptionsVotes === 1 && state.voterIds.includes(voterId)) {
        return json({ error: 'Already voted' }, { status: 400 });
      }
      
      if (state.votes[body.option] !== undefined) {
        state.votes[body.option]++;
        if (!state.voterIds.includes(voterId)) {
          state.voterIds.push(voterId);
        }
      }
    }
    
    // Handle open response submission
    if (body.action === 'addResponse' && body.text) {
      const responseId = generateId();
      state.openResponses.push({
        id: responseId,
        text: body.text,
        votes: 0
      });
    }
    
    // Handle upvote on open response
    if (body.action === 'upvoteResponse' && body.responseId) {
      const response = state.openResponses.find(r => r.id === body.responseId);
      if (response) {
        response.votes++;
      }
    }
    
    // Handle close poll
    if (body.action === 'close') {
      state.status = 'closed';
    }
    
    savePollState(effectivePollId, state);
    
    // Reconstruct full poll object
    const poll = {
      id: effectivePollId,
      question: config.q,
      pollType: config.t === 'o' ? 'options' : 'open',
      options: config.opts || [],
      votes: state.votes,
      openResponses: state.openResponses,
      maxOptionsVotes: config.mo || (config.m ? 99 : 1),
      maxWords: config.mw || 10,
      maxVotesPerPerson: config.mv || 3,
      allowOpenResponses: config.ao || false,
      status: state.status
    };
    
    return json({ poll, config: configEncoded });
  } catch (error) {
    console.error('Error updating poll:', error);
    return json({ error: 'Failed to update poll' }, { status: 500 });
  }
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}
