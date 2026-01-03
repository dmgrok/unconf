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
import { put, list, del } from '@vercel/blob';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

// Get the token from environment - use dynamic import for runtime availability
function getBlobToken(): string {
  const token = env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN environment variable is not configured');
  }
  return token;
}

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

// In-memory cache disabled for now to ensure fresh data in live polls
// const pollCache = new Map<string, { poll: StoredPoll; cachedAt: number }>();
// const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper to get blob path for a poll
function getBlobPath(pollId: string): string {
  return `polls/${pollId}.json`;
}

// Get poll by ID (always fresh from blob storage)
async function getPollById(id: string): Promise<StoredPoll | null> {
  const blobPath = getBlobPath(id);
  const token = getBlobToken();
  console.log('Looking for poll at:', blobPath);
  console.log('Token available:', !!token, 'starts with:', token?.substring(0, 20));
  
  try {
    // Use list() with prefix to find the blob - pass token explicitly
    const { blobs } = await list({ prefix: blobPath, limit: 1, token });
    
    if (blobs.length === 0) {
      console.log('Poll not found (no blobs with prefix):', id);
      return null;
    }
    
    const blob = blobs[0];
    console.log('Found blob:', blob.url);
    
    // Fetch the poll data (cache-busting query param)
    const response = await fetch(blob.url + '?t=' + Date.now());
    if (!response.ok) {
      console.error('Failed to fetch blob content:', response.status);
      return null;
    }
    
    const poll = await response.json() as StoredPoll;
    return poll;
  } catch (error) {
    console.error('getPollById error:', error);
    return null;
  }
}

// Save a poll to blob storage
async function savePoll(poll: StoredPoll): Promise<void> {
  const blobPath = getBlobPath(poll.id);
  const pollJson = JSON.stringify(poll);
  const token = getBlobToken();
  
  console.log('Saving poll to blob:', blobPath);
  
  const result = await put(blobPath, pollJson, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    token
  });
  
  console.log('Poll saved, URL:', result.url);
}

// Delete a poll from blob storage (unused but kept for future)
async function deletePoll(pollId: string): Promise<void> {
  try {
    await del(getBlobPath(pollId), { token: getBlobToken() });
  } catch {
    // Ignore errors if blob doesn't exist
  }
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
  try {
    const pollId = url.searchParams.get('id');
    const legacyConfig = url.searchParams.get('c');
    
    console.log('GET /api/tools/poll - pollId:', pollId, 'hasLegacyConfig:', !!legacyConfig);
    
    // Try to find poll by ID first
    if (pollId) {
      let poll = await getPollById(pollId);
      
      // If not found but legacy config provided, create from legacy config
      if (!poll && legacyConfig) {
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
      await savePoll(poll);
      
      return json({ poll });
    }
    
    return json({ error: 'Poll ID required. Use ?id=<poll_id>' }, { status: 400 });
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
