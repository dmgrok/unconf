/**
 * GitHub Feedback Sync Service
 * 
 * Creates and updates GitHub issues to track concept votes and feedback.
 * Each concept gets ONE issue that shows:
 * - Vote counts (👍 Build it, 👎 Not interested, 🤔 Needs changes)
 * - Approved comments from community
 * 
 * This makes feedback visible and countable on GitHub without requiring
 * users to have GitHub accounts.
 */

import { 
  type FeedbackStats,
  type FeedbackRecord 
} from '$lib/types/feedback';
import { 
  getToolConfig,
  type GraduatedToolConfig 
} from '$lib/types/graduation';
import {
  getFeedbackStats,
  getGitHubIssueInfo,
  setGitHubIssueInfo,
  getUnsyncedComments,
  markFeedbackSynced,
  updateLastSynced,
} from './feedback-storage';

// =============================================================================
// CONFIGURATION
// =============================================================================

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = import.meta.env.VITE_GITHUB_OWNER || 'dmgrok';
const REPO_NAME = import.meta.env.VITE_GITHUB_REPO || 'unconf';

function getGitHubToken(): string | undefined {
  return import.meta.env.VITE_GITHUB_TOKEN;
}

// =============================================================================
// ISSUE BODY GENERATION
// =============================================================================

/**
 * Generate the issue body with current vote counts
 */
function generateIssueBody(tool: GraduatedToolConfig, stats: FeedbackStats): string {
  const voteCounts = stats.conceptVotes;
  
  return `## ${tool.emoji} ${tool.name}

> ${tool.description}

${tool.longDescription ? `### About this concept\n${tool.longDescription}\n` : ''}

---

## 📊 Community Votes

| Vote | Count |
|------|-------|
| 👍 **Build it!** | ${voteCounts?.buildIt || 0} |
| 🤔 Needs changes | ${voteCounts?.needsChanges || 0} |
| 👎 Not interested | ${voteCounts?.notInterested || 0} |

**Total votes:** ${(voteCounts?.buildIt || 0) + (voteCounts?.needsChanges || 0) + (voteCounts?.notInterested || 0)}
${voteCounts && voteCounts.buildIt + voteCounts.needsChanges + voteCounts.notInterested > 0 
  ? `**Interest level:** ${voteCounts.buildItPercentage}% want this built`
  : ''}

---

## 💬 Community Comments

Comments from the community are posted below. All comments are moderated before appearing.

---

### How to vote

Visit [Ideas Lab](${import.meta.env.VITE_APP_URL || 'https://event-tools-lab.vercel.app'}/ideas-lab) to vote on this concept!

*Last updated: ${new Date().toISOString()}*

---
<sub>🤖 This issue is automatically managed by the Ideas Lab feedback system. Vote counts and comments are synced from user submissions.</sub>
`;
}

/**
 * Generate a comment for approved feedback
 */
function generateComment(feedback: FeedbackRecord): string {
  const voteEmoji = {
    'build_it': '👍',
    'not_interested': '👎',
    'needs_changes': '🤔',
  }[feedback.vote || 'build_it'] || '💬';
  
  let comment = `### ${voteEmoji} Community Feedback\n\n`;
  
  if (feedback.message) {
    comment += `> ${feedback.message.replace(/\n/g, '\n> ')}\n\n`;
  }
  
  if (feedback.name) {
    comment += `— *${feedback.name}*\n`;
  }
  
  comment += `\n<sub>Submitted: ${new Date(feedback.createdAt).toLocaleDateString()}</sub>`;
  
  return comment;
}

// =============================================================================
// GITHUB API OPERATIONS
// =============================================================================

interface GitHubIssue {
  number: number;
  html_url: string;
  created_at: string;
  state: string;
}

interface GitHubComment {
  id: number;
  html_url: string;
  created_at: string;
}

/**
 * Create a new GitHub issue for a concept
 */
async function createIssue(
  tool: GraduatedToolConfig, 
  stats: FeedbackStats
): Promise<GitHubIssue | null> {
  const token = getGitHubToken();
  if (!token) {
    console.log('[GitHub] No token configured - skipping issue creation');
    return null;
  }
  
  try {
    const response = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `[Concept] ${tool.emoji} ${tool.name}`,
        body: generateIssueBody(tool, stats),
        labels: ['concept', 'community-feedback', 'ideas-lab', tool.toolId],
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[GitHub] Failed to create issue:', error);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('[GitHub] Error creating issue:', error);
    return null;
  }
}

/**
 * Update an existing issue with new vote counts
 */
async function updateIssue(
  issueNumber: number,
  tool: GraduatedToolConfig,
  stats: FeedbackStats
): Promise<boolean> {
  const token = getGitHubToken();
  if (!token) return false;
  
  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: generateIssueBody(tool, stats),
        }),
      }
    );
    
    return response.ok;
  } catch (error) {
    console.error('[GitHub] Error updating issue:', error);
    return false;
  }
}

/**
 * Add a comment to an issue
 */
async function addComment(
  issueNumber: number,
  comment: string
): Promise<GitHubComment | null> {
  const token = getGitHubToken();
  if (!token) return null;
  
  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: comment }),
      }
    );
    
    if (!response.ok) return null;
    
    return await response.json();
  } catch (error) {
    console.error('[GitHub] Error adding comment:', error);
    return null;
  }
}

// =============================================================================
// SYNC OPERATIONS
// =============================================================================

/**
 * Sync feedback for a tool to GitHub
 * - Creates issue if it doesn't exist
 * - Updates issue body with current vote counts
 * - Adds approved comments
 */
export async function syncToolFeedback(toolId: string): Promise<{
  success: boolean;
  issueUrl?: string;
  commentsAdded?: number;
  error?: string;
}> {
  const tool = getToolConfig(toolId);
  if (!tool) {
    return { success: false, error: 'Tool not found' };
  }
  
  const stats = await getFeedbackStats(toolId);
  let issueInfo = await getGitHubIssueInfo(toolId);
  
  // Create issue if it doesn't exist
  if (!issueInfo) {
    const issue = await createIssue(tool, stats);
    if (!issue) {
      return { success: false, error: 'Failed to create GitHub issue' };
    }
    
    issueInfo = {
      number: issue.number,
      url: issue.html_url,
      createdAt: issue.created_at,
      lastSyncedAt: new Date().toISOString(),
    };
    
    await setGitHubIssueInfo(toolId, issueInfo);
  } else {
    // Update existing issue with new vote counts
    await updateIssue(issueInfo.number, tool, stats);
  }
  
  // Add unsynced comments
  const unsyncedComments = await getUnsyncedComments(toolId);
  let commentsAdded = 0;
  
  for (const feedback of unsyncedComments) {
    const comment = generateComment(feedback);
    const result = await addComment(issueInfo.number, comment);
    
    if (result) {
      await markFeedbackSynced(feedback.id, {
        number: issueInfo.number,
        url: result.html_url,
        createdAt: result.created_at,
      });
      commentsAdded++;
    }
  }
  
  await updateLastSynced(toolId);
  
  return {
    success: true,
    issueUrl: issueInfo.url,
    commentsAdded,
  };
}

/**
 * Sync all tools with pending feedback
 */
export async function syncAllFeedback(): Promise<{
  synced: string[];
  failed: string[];
}> {
  const { TOOL_REGISTRY } = await import('$lib/types/graduation');
  
  const results = {
    synced: [] as string[],
    failed: [] as string[],
  };
  
  // Only sync wireframe concepts (they're the ones in Ideas Lab)
  const concepts = TOOL_REGISTRY.filter(t => t.status === 'wireframe' && t.enabled);
  
  for (const tool of concepts) {
    const result = await syncToolFeedback(tool.toolId);
    if (result.success) {
      results.synced.push(tool.toolId);
    } else {
      results.failed.push(tool.toolId);
    }
  }
  
  return results;
}
