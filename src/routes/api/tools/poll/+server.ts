/**
 * Standalone Poll API
 * 
 * Allows creating and managing polls without an event.
 * 
 * STORAGE STRATEGY:
 * - Polls are stored persistently in JSON file with friendly IDs
 * - URL only needs the poll ID (e.g., ?id=happy-tiger-42)
 * - Supports legacy base64-encoded config URLs for backwards compatibility
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const POLLS_FILE = join(process.cwd(), 'data/tools/standalone-polls.json');

// Type for stored poll
interface StoredPoll {
  id: string;
  question: string;
  pollType: 'options' | 'open';
  options: string[];
  votes: Record<string, number>;
  openResponses: Array<{ id: string; text: string; votes: number }>;
  voterIds: string[];
  maxOptionsVotes: number;
  maxWords: number;
  maxVotesPerPerson: number;
  allowOpenResponses: boolean;
  status: 'open' | 'closed';
  createdAt: string;
}

// Type for legacy poll configuration (encoded in URL)
interface LegacyPollConfig {
  q: string;        // question
  t: 'o' | 'r';     // type: 'o' = options, 'r' = open responses
  opts?: string[];  // options (for fixed options type)
  m?: boolean;      // allowMultiple (legacy)
  mo?: number;      // maxOptionsVotes (number of options each person can vote for)
  mw?: number;      // maxWords (for open responses)
  mv?: number;      // maxVotesPerPerson (for suggestions)
  ao?: boolean;     // allowOpenResponses
}

// Load polls from JSON file
function loadPolls(): StoredPoll[] {
  try {
    if (existsSync(POLLS_FILE)) {
      const data = readFileSync(POLLS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading polls:', error);
  }
  return [];
}

// Save polls to JSON file
function savePolls(polls: StoredPoll[]): void {
  try {
    writeFileSync(POLLS_FILE, JSON.stringify(polls, null, 2));
  } catch (error) {
    console.error('Error saving polls:', error);
  }
}

// Get poll by ID
function getPollById(id: string): StoredPoll | null {
  const polls = loadPolls();
  return polls.find(p => p.id === id) || null;
}

// Save or update a poll
function savePoll(poll: StoredPoll): void {
  const polls = loadPolls();
  const existingIndex = polls.findIndex(p => p.id === poll.id);
  if (existingIndex >= 0) {
    polls[existingIndex] = poll;
  } else {
    polls.push(poll);
  }
  // Keep only last 1000 polls to prevent file bloat
  if (polls.length > 1000) {
    polls.splice(0, polls.length - 1000);
  }
  savePolls(polls);
}

// Decode legacy poll config from base64
function decodeLegacyConfig(encoded: string): LegacyPollConfig | null {
  try {
    const jsonStr = Buffer.from(encoded, 'base64url').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    try {
      const jsonStr = Buffer.from(encoded, 'base64').toString('utf-8');
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }
}

// Convert legacy config to StoredPoll
function legacyConfigToPoll(config: LegacyPollConfig, pollId: string): StoredPoll {
  const votes: Record<string, number> = {};
  if (config.opts) {
    for (const opt of config.opts) {
      votes[opt] = 0;
    }
  }
  
  return {
    id: pollId,
    question: config.q,
    pollType: config.t === 'o' ? 'options' : 'open',
    options: config.opts || [],
    votes,
    openResponses: [],
    voterIds: [],
    maxOptionsVotes: config.mo || (config.m ? 99 : 1),
    maxWords: config.mw || 10,
    maxVotesPerPerson: config.mv || 3,
    allowOpenResponses: config.ao || false,
    status: 'open',
    createdAt: new Date().toISOString()
  };
}

// GET /api/tools/poll?id=xxx - Get poll by ID (or legacy ?c=xxx)
export const GET: RequestHandler = async ({ url }) => {
  const pollId = url.searchParams.get('id');
  const legacyConfig = url.searchParams.get('c');
  
  // Try to find poll by ID first
  if (pollId) {
    let poll = getPollById(pollId);
    
    // If not found but legacy config provided, create from legacy config
    if (!poll && legacyConfig) {
      const config = decodeLegacyConfig(legacyConfig);
      if (config) {
        poll = legacyConfigToPoll(config, pollId);
        savePoll(poll);
      }
    }
    
    if (poll) {
      return json({ poll });
    }
    
    return json({ error: 'Poll not found' }, { status: 404 });
  }
  
  // Legacy: config-only URL (no ID)
  if (legacyConfig) {
    const config = decodeLegacyConfig(legacyConfig);
    if (!config) {
      return json({ error: 'Invalid poll configuration' }, { status: 400 });
    }
    
    // Generate ID and create poll
    const newPollId = generateFriendlyId();
    const poll = legacyConfigToPoll(config, newPollId);
    savePoll(poll);
    
    return json({ poll });
  }
  
  return json({ error: 'Poll ID required. Use ?id=<poll_id>' }, { status: 400 });
};

// POST /api/tools/poll - Create a new poll
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Generate friendly ID
    const pollId = body.id || generateFriendlyId();
    
    // Initialize vote counts for options
    const votes: Record<string, number> = {};
    const options = body.options?.filter((o: string) => o.trim()) || [];
    for (const opt of options) {
      votes[opt] = 0;
    }
    
    // Create poll
    const poll: StoredPoll = {
      id: pollId,
      question: body.question,
      pollType: body.pollType === 'options' ? 'options' : 'open',
      options,
      votes,
      openResponses: [],
      voterIds: [],
      maxOptionsVotes: body.maxOptionsVotes || 1,
      maxWords: body.maxWords || 10,
      maxVotesPerPerson: body.maxVotesPerPerson || 3,
      allowOpenResponses: body.allowOpenResponses || false,
      status: 'open',
      createdAt: new Date().toISOString()
    };
    
    savePoll(poll);
    
    return json({ poll });
  } catch (error) {
    console.error('Error creating poll:', error);
    return json({ error: 'Failed to create poll' }, { status: 500 });
  }
};

// PATCH /api/tools/poll?id=xxx - Update poll state (vote, add response, close)
export const PATCH: RequestHandler = async ({ request, url }) => {
  const pollId = url.searchParams.get('id');
  
  if (!pollId) {
    return json({ error: 'Poll ID required' }, { status: 400 });
  }
  
  const poll = getPollById(pollId);
  if (!poll) {
    return json({ error: 'Poll not found' }, { status: 404 });
  }
  
  try {
    const body = await request.json();
    
    // Handle vote
    if (body.action === 'vote' && body.option) {
      const voterId = body.voterId || 'anonymous';
      
      // Check if already voted (for single-choice)
      if (poll.maxOptionsVotes === 1 && poll.voterIds.includes(voterId)) {
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
    }
    
    savePoll(poll);
    
    return json({ poll });
  } catch (error) {
    console.error('Error updating poll:', error);
    return json({ error: 'Failed to update poll' }, { status: 500 });
  }
};

// Generate friendly ID like "happy-tiger-42"
function generateFriendlyId(): string {
  const adjectives = ['happy', 'swift', 'bright', 'calm', 'bold', 'cool', 'wild', 'warm', 'keen', 'fair'];
  const animals = ['tiger', 'eagle', 'shark', 'wolf', 'bear', 'lion', 'hawk', 'fox', 'deer', 'owl'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}-${animal}-${num}`;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}
