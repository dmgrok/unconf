/**
 * Feedback Storage Service
 * 
 * Persists feedback to JSON file and syncs aggregated stats to GitHub issues.
 * Each concept gets ONE GitHub issue that displays vote counts and collects comments.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { 
  type FeedbackRecord, 
  type FeedbackStats,
  type FeedbackType
} from '$lib/types/feedback';
import { generateId } from '$lib/types/tools';

// =============================================================================
// TYPES
// =============================================================================

interface FeedbackStore {
  version: number;
  lastUpdated: string;
  feedback: FeedbackRecord[];
  /** Maps toolId -> GitHub issue number */
  githubIssues: Record<string, GitHubIssueInfo>;
}

interface GitHubIssueInfo {
  number: number;
  url: string;
  createdAt: string;
  lastSyncedAt: string;
}

// =============================================================================
// STORAGE
// =============================================================================

const DATA_DIR = path.join(process.cwd(), 'data');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');

/**
 * Initialize empty feedback store
 */
function createEmptyStore(): FeedbackStore {
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    feedback: [],
    githubIssues: {},
  };
}

/**
 * Load feedback store from file
 */
export async function loadFeedbackStore(): Promise<FeedbackStore> {
  try {
    const data = await fs.readFile(FEEDBACK_FILE, 'utf-8');
    return JSON.parse(data) as FeedbackStore;
  } catch {
    // File doesn't exist or is invalid - create new store
    const store = createEmptyStore();
    await saveFeedbackStore(store);
    return store;
  }
}

/**
 * Save feedback store to file
 */
export async function saveFeedbackStore(store: FeedbackStore): Promise<void> {
  store.lastUpdated = new Date().toISOString();
  
  // Ensure data directory exists
  await fs.mkdir(DATA_DIR, { recursive: true });
  
  await fs.writeFile(
    FEEDBACK_FILE,
    JSON.stringify(store, null, 2),
    'utf-8'
  );
}

// =============================================================================
// FEEDBACK OPERATIONS
// =============================================================================

/**
 * Add feedback to store
 */
export async function addFeedback(feedback: Omit<FeedbackRecord, 'id' | 'createdAt'>): Promise<FeedbackRecord> {
  const store = await loadFeedbackStore();
  
  const record: FeedbackRecord = {
    ...feedback,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  
  store.feedback.push(record);
  await saveFeedbackStore(store);
  
  return record;
}

/**
 * Check if session already voted on a concept
 */
export async function hasSessionVoted(sessionId: string, toolId: string): Promise<boolean> {
  const store = await loadFeedbackStore();
  
  return store.feedback.some(
    f => f.sessionId === sessionId && 
         f.toolId === toolId && 
         f.type === 'concept_vote'
  );
}

/**
 * Get feedback stats for a tool
 */
export async function getFeedbackStats(toolId: string): Promise<FeedbackStats> {
  const store = await loadFeedbackStore();
  
  const toolFeedback = store.feedback.filter(f => f.toolId === toolId);
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  
  // Calculate concept votes
  const conceptVotes = toolFeedback.filter(f => f.type === 'concept_vote');
  const buildItVotes = conceptVotes.filter(f => f.vote === 'build_it').length;
  const notInterestedVotes = conceptVotes.filter(f => f.vote === 'not_interested').length;
  const needsChangesVotes = conceptVotes.filter(f => f.vote === 'needs_changes').length;
  const totalVotes = buildItVotes + notInterestedVotes + needsChangesVotes;
  
  // Count by type
  const byType: Record<FeedbackType, number> = {
    concept_vote: conceptVotes.length,
    feature_request: toolFeedback.filter(f => f.type === 'feature_request').length,
    bug_report: toolFeedback.filter(f => f.type === 'bug_report').length,
    general: toolFeedback.filter(f => f.type === 'general').length,
    improvement: toolFeedback.filter(f => f.type === 'improvement').length,
  };
  
  return {
    toolId,
    totalCount: toolFeedback.length,
    byType,
    conceptVotes: totalVotes > 0 ? {
      buildIt: buildItVotes,
      notInterested: notInterestedVotes,
      needsChanges: needsChangesVotes,
      buildItPercentage: Math.round((buildItVotes / totalVotes) * 100),
    } : undefined,
    recentCount: toolFeedback.filter(f => new Date(f.createdAt).getTime() > weekAgo).length,
    uniqueSessions: new Set(toolFeedback.map(f => f.sessionId)).size,
  };
}

/**
 * Get all feedback for a tool (with pagination)
 */
export async function getToolFeedback(
  toolId: string, 
  options?: { limit?: number; offset?: number; type?: FeedbackType }
): Promise<{ feedback: FeedbackRecord[]; total: number }> {
  const store = await loadFeedbackStore();
  
  let filtered = store.feedback.filter(f => f.toolId === toolId);
  
  if (options?.type) {
    filtered = filtered.filter(f => f.type === options.type);
  }
  
  // Sort by newest first
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const total = filtered.length;
  const offset = options?.offset || 0;
  const limit = options?.limit || 50;
  
  return {
    feedback: filtered.slice(offset, offset + limit),
    total,
  };
}

/**
 * Get comments that have been approved and not yet synced to GitHub
 */
export async function getUnsyncedComments(toolId: string): Promise<FeedbackRecord[]> {
  const store = await loadFeedbackStore();
  
  return store.feedback.filter(f => 
    f.toolId === toolId &&
    f.message &&
    f.moderationStatus === 'approved' &&
    !f.githubIssue
  );
}

/**
 * Mark feedback as synced to GitHub
 */
export async function markFeedbackSynced(
  feedbackId: string, 
  githubInfo: { number: number; url: string; createdAt: string }
): Promise<void> {
  const store = await loadFeedbackStore();
  
  const feedback = store.feedback.find(f => f.id === feedbackId);
  if (feedback) {
    feedback.githubIssue = githubInfo;
    await saveFeedbackStore(store);
  }
}

// =============================================================================
// GITHUB ISSUE MANAGEMENT
// =============================================================================

/**
 * Get or store GitHub issue info for a tool
 */
export async function getGitHubIssueInfo(toolId: string): Promise<GitHubIssueInfo | undefined> {
  const store = await loadFeedbackStore();
  return store.githubIssues[toolId];
}

/**
 * Store GitHub issue info for a tool
 */
export async function setGitHubIssueInfo(toolId: string, info: GitHubIssueInfo): Promise<void> {
  const store = await loadFeedbackStore();
  store.githubIssues[toolId] = info;
  await saveFeedbackStore(store);
}

/**
 * Update last synced timestamp
 */
export async function updateLastSynced(toolId: string): Promise<void> {
  const store = await loadFeedbackStore();
  if (store.githubIssues[toolId]) {
    store.githubIssues[toolId].lastSyncedAt = new Date().toISOString();
    await saveFeedbackStore(store);
  }
}
