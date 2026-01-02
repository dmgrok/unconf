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
import { put, head, del } from '@vercel/blob';
import type { RequestHandler } from './$types';

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

// In-memory cache to reduce blob reads (5 minute TTL)
const pollCache = new Map<string, { poll: StoredPoll; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper to get blob path for a poll
function getBlobPath(pollId: string): string {
  return `polls/${pollId}.json`;
}

// Get poll by ID (from cache or blob storage)
// skipCache: true for write operations to avoid race conditions
async function getPollById(id: string, skipCache = false): Promise<StoredPoll | null> {
  // Check cache first (unless skipping for write operations)
  if (!skipCache) {
    const cached = pollCache.get(id);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      return cached.poll;
    }
  }
  
  try {
    // Check if blob exists
    const blobInfo = await head(getBlobPath(id));
    if (!blobInfo) return null;
    
    // Fetch the poll data (add cache-busting for fresh reads)
    const response = await fetch(blobInfo.url + '?t=' + Date.now());
    if (!response.ok) return null;
    
    const poll = await response.json() as StoredPoll;
    
    // Update cache
    pollCache.set(id, { poll, cachedAt: Date.now() });
    
    return poll;
  } catch {
    // Blob doesn't exist or fetch failed
    return null;
  }
}

// Save a poll to blob storage
async function savePoll(poll: StoredPoll): Promise<void> {
  const blobPath = getBlobPath(poll.id);
  const pollJson = JSON.stringify(poll);
  
  await put(blobPath, pollJson, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false
  });
  
  // Update cache
  pollCache.set(poll.id, { poll, cachedAt: Date.now() });
}

// Delete a poll from blob storage
async function deletePoll(pollId: string): Promise<void> {
  try {
    await del(getBlobPath(pollId));
    pollCache.delete(pollId);
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
  const pollId = url.searchParams.get('id');
  const legacyConfig = url.searchParams.get('c');
  
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
  
  // Skip cache to get fresh data - prevents race conditions in live voting
  const poll = await getPollById(pollId, true);
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
