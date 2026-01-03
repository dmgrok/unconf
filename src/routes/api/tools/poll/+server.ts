/**
 * Standalone Poll API
 * 
 * Allows creating and managing polls without an event.
 * 
 * STORAGE STRATEGY:
 * - Polls are stored in Vercel Blob storage with friendly IDs (e.g., happy-tiger-42)
 * - URLs only need the poll ID: ?id=happy-tiger-42
 * - Votes persist across serverless cold starts
 * - Polls auto-expire after 24 hours (configurable)
 */

import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

// Vercel Blob storage configuration
const BLOB_BASE_URL = 'https://nspbwyiutuovvkcx.public.blob.vercel-storage.com';
const BLOB_API_URL = 'https://blob.vercel-storage.com';

// Get the token from environment
function getBlobToken(): string {
  const token = env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN environment variable is not configured');
  }
  return token;
}

// Get the public URL for a poll blob
function getBlobUrl(pollId: string): string {
  return `${BLOB_BASE_URL}/polls/${pollId}.json`;
}
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

// In-memory cache disabled for now to ensure fresh data in live polls
// const pollCache = new Map<string, { poll: StoredPoll; cachedAt: number }>();
// const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get poll by ID - fetch directly from public blob URL
async function getPollById(id: string): Promise<StoredPoll | null> {
  const blobUrl = getBlobUrl(id);
  console.log('Fetching poll from:', blobUrl);
  
  try {
    // Fetch directly from public blob URL (cache-busting query param)
    const response = await fetch(blobUrl + '?t=' + Date.now());
    
    if (response.status === 404) {
      console.log('Poll not found:', id);
      return null;
    }
    
    if (!response.ok) {
      console.error('Failed to fetch poll:', response.status, response.statusText);
      return null;
    }
    
    const poll = await response.json() as StoredPoll;
    console.log('Found poll:', poll.id);
    return poll;
  } catch (error) {
    console.error('getPollById error:', error);
    return null;
  }
}

// Save a poll to blob storage using native fetch
async function savePoll(poll: StoredPoll): Promise<void> {
  const pathname = `polls/${poll.id}.json`;
  const pollJson = JSON.stringify(poll);
  const token = getBlobToken();
  
  console.log('Saving poll to blob:', pathname);
  
  // Use Vercel Blob REST API directly
  const uploadUrl = `${BLOB_API_URL}/${pathname}`;
  
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-api-version': '7',
      'x-content-type': 'application/json',
      'x-add-random-suffix': 'false'
    },
    body: pollJson
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to save poll:', response.status, errorText);
    throw new Error(`Failed to save poll: ${response.status}`);
  }
  
  const result = await response.json();
  console.log('Poll saved, URL:', result.url);
}

// Delete a poll from blob storage using native fetch
async function deletePoll(pollId: string): Promise<void> {
  try {
    const pathname = `polls/${pollId}.json`;
    const token = getBlobToken();
    
    // Use Vercel Blob REST API directly
    const deleteUrl = `${BLOB_API_URL}/${pathname}`;
    
    await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-version': '7'
      }
    });
  } catch {
    // Ignore errors if blob doesn't exist
  }
}

// Decode legacy poll config from base64 using Web APIs (Node.js Buffer may not be available in serverless)
function decodeLegacyConfig(encoded: string): LegacyPollConfig | null {
  try {
    // First try base64url decoding using Web APIs
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const jsonStr = atob(padded);
    return JSON.parse(jsonStr);
  } catch {
    try {
      // Try standard base64
      const jsonStr = atob(encoded);
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
  try {
    const pollId = url.searchParams.get('id');
    const legacyConfig = url.searchParams.get('c');
    
    console.log('GET /api/tools/poll - START - pollId:', pollId, 'hasLegacyConfig:', !!legacyConfig);
    
    // Temporary: Just return a debug response to test if handler is reached
    if (!pollId) {
      return json({ error: 'Poll ID required. Use ?id=<poll_id>', debug: true }, { status: 400 });
    }
    
    console.log('About to fetch poll:', pollId);
    
    // Try to find poll by ID first
    let poll = await getPollById(pollId);
    
    console.log('Fetch result:', poll ? 'found' : 'not found');
    
    // If not found but legacy config provided, create from legacy config
    if (!poll && legacyConfig) {
      console.log('Trying legacy config');
      const config = decodeLegacyConfig(legacyConfig);
      if (config) {
        poll = legacyConfigToPoll(config, pollId);
        await savePoll(poll);
      }
    }
    
    if (poll) {
      return json({ poll });
    }
    
    return json({ error: 'Poll not found' }, { status: 404 });
  } catch (error) {
    console.error('GET /api/tools/poll error:', error);
    return json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
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
    
    await savePoll(poll);
    
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
  
  const poll = await getPollById(pollId);
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
    
    await savePoll(poll);
    
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
