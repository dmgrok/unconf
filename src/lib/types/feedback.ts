/**
 * Feedback System Types
 * 
 * Handles user feedback collection for Ideas Lab concepts and beta tools.
 * Feedback can be converted to GitHub issues after moderation.
 */

// =============================================================================
// FEEDBACK TYPES
// =============================================================================

/**
 * Type of feedback being submitted
 */
export type FeedbackType = 
  | 'concept_vote'      // Vote on wireframe concept (build it / don't build it)
  | 'feature_request'   // Request a new feature
  | 'bug_report'        // Report a bug (beta/standard tools only)
  | 'general'           // General feedback
  | 'improvement';      // Suggestion to improve existing feature

/**
 * Sentiment for concept voting
 */
export type ConceptVote = 'build_it' | 'not_interested' | 'needs_changes';

/**
 * Feedback submission from user
 */
export interface FeedbackSubmission {
  /** Type of feedback */
  type: FeedbackType;
  /** Tool or concept this feedback is about */
  toolId: string;
  /** Feature within tool (optional) */
  featureId?: string;
  /** For concept votes */
  vote?: ConceptVote;
  /** User's message/description */
  message?: string;
  /** User's email (optional, for follow-up) */
  email?: string;
  /** User's name (optional) */
  name?: string;
  /** Session ID for anonymous users */
  sessionId: string;
}

/**
 * Stored feedback record
 */
export interface FeedbackRecord extends FeedbackSubmission {
  /** Unique ID */
  id: string;
  /** When submitted */
  createdAt: string;
  /** Moderation status */
  moderationStatus: ModerationStatus;
  /** Moderation details */
  moderation?: ModerationResult;
  /** GitHub issue (if created) */
  githubIssue?: {
    number: number;
    url: string;
    createdAt: string;
  };
}

// =============================================================================
// MODERATION
// =============================================================================

/**
 * Moderation status for feedback
 */
export type ModerationStatus = 
  | 'pending'     // Awaiting moderation
  | 'approved'    // Safe to create GitHub issue
  | 'rejected'    // Contains inappropriate content
  | 'flagged';    // Needs manual review

/**
 * Result from content moderation check
 */
export interface ModerationResult {
  /** Overall status */
  status: ModerationStatus;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reason for rejection/flagging */
  reason?: string;
  /** Categories flagged */
  categories?: ModerationCategory[];
  /** When moderated */
  moderatedAt: string;
  /** Whether it was auto-moderated or manual */
  method: 'auto' | 'manual';
}

/**
 * Content categories to check for
 */
export type ModerationCategory = 
  | 'hate'            // Hate speech
  | 'harassment'      // Harassment or bullying
  | 'violence'        // Violence or threats
  | 'sexual'          // Sexual content
  | 'spam'            // Spam or promotional
  | 'personal_info'   // Contains PII (emails, phones, etc.)
  | 'profanity';      // Strong profanity

/**
 * Configuration for content moderation
 */
export interface ModerationConfig {
  /** Minimum confidence to auto-approve */
  autoApproveThreshold: number;
  /** Minimum confidence to auto-reject */
  autoRejectThreshold: number;
  /** Categories that cause instant rejection */
  criticalCategories: ModerationCategory[];
  /** Rate limit per session (per hour) */
  rateLimitPerHour: number;
}

/**
 * Default moderation configuration
 */
export const DEFAULT_MODERATION_CONFIG: ModerationConfig = {
  autoApproveThreshold: 0.9,   // 90% confidence it's safe
  autoRejectThreshold: 0.8,    // 80% confidence it's bad
  criticalCategories: ['hate', 'harassment', 'violence'],
  rateLimitPerHour: 10,
};

// =============================================================================
// AGGREGATED FEEDBACK
// =============================================================================

/**
 * Aggregated feedback stats for a tool/concept
 */
export interface FeedbackStats {
  toolId: string;
  /** Total feedback count */
  totalCount: number;
  /** Breakdown by type */
  byType: Record<FeedbackType, number>;
  /** For concept tools: vote breakdown */
  conceptVotes?: {
    buildIt: number;
    notInterested: number;
    needsChanges: number;
    /** Percentage who want it built */
    buildItPercentage: number;
  };
  /** Recent feedback (last 7 days) */
  recentCount: number;
  /** Unique sessions that provided feedback */
  uniqueSessions: number;
}

// =============================================================================
// API TYPES
// =============================================================================

/**
 * Request to submit feedback
 */
export interface SubmitFeedbackRequest {
  feedback: FeedbackSubmission;
}

/**
 * Response from feedback submission
 */
export interface SubmitFeedbackResponse {
  success: boolean;
  feedbackId?: string;
  moderationStatus?: ModerationStatus;
  message?: string;
  error?: string;
}

/**
 * Response for getting feedback stats
 */
export interface FeedbackStatsResponse {
  success: boolean;
  stats?: FeedbackStats;
  error?: string;
}

// =============================================================================
// GITHUB ISSUE TEMPLATES
// =============================================================================

/**
 * Template for creating GitHub issues from feedback
 */
export interface GitHubIssueTemplate {
  title: string;
  body: string;
  labels: string[];
}

/**
 * Generate GitHub issue from feedback
 */
export function generateGitHubIssue(feedback: FeedbackRecord): GitHubIssueTemplate {
  const toolName = feedback.toolId.charAt(0).toUpperCase() + feedback.toolId.slice(1);
  
  switch (feedback.type) {
    case 'concept_vote':
      return {
        title: `[Feedback] ${toolName}: Community interest`,
        body: formatConceptVoteBody(feedback),
        labels: ['community-feedback', 'concept-validation', feedback.toolId],
      };
    
    case 'feature_request':
      return {
        title: `[Feature Request] ${toolName}: ${truncate(feedback.message || 'New feature', 50)}`,
        body: formatFeatureRequestBody(feedback),
        labels: ['enhancement', 'community-feedback', feedback.toolId],
      };
    
    case 'bug_report':
      return {
        title: `[Bug] ${toolName}: ${truncate(feedback.message || 'Bug report', 50)}`,
        body: formatBugReportBody(feedback),
        labels: ['bug', 'community-feedback', feedback.toolId],
      };
    
    case 'improvement':
      return {
        title: `[Improvement] ${toolName}: ${truncate(feedback.message || 'Suggestion', 50)}`,
        body: formatImprovementBody(feedback),
        labels: ['enhancement', 'community-feedback', feedback.toolId],
      };
    
    default:
      return {
        title: `[Feedback] ${toolName}: General feedback`,
        body: formatGeneralBody(feedback),
        labels: ['community-feedback', feedback.toolId],
      };
  }
}

// Helper functions for issue formatting
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function formatConceptVoteBody(feedback: FeedbackRecord): string {
  const voteText = {
    'build_it': '👍 Build it!',
    'not_interested': '👎 Not interested',
    'needs_changes': '🤔 Needs changes',
  }[feedback.vote || 'build_it'];
  
  return `## Community Feedback: Concept Vote

**Tool:** ${feedback.toolId}
**Vote:** ${voteText}

${feedback.message ? `### Additional Comments\n${feedback.message}` : ''}

---
*This issue was auto-generated from community feedback via Ideas Lab.*
*Session: ${feedback.sessionId.substring(0, 8)}...*
`;
}

function formatFeatureRequestBody(feedback: FeedbackRecord): string {
  return `## Feature Request

**Tool:** ${feedback.toolId}
${feedback.featureId ? `**Feature:** ${feedback.featureId}` : ''}

### Description
${feedback.message || 'No description provided.'}

${feedback.email ? `### Contact\nUser provided email for follow-up.` : ''}

---
*This issue was auto-generated from community feedback.*
`;
}

function formatBugReportBody(feedback: FeedbackRecord): string {
  return `## Bug Report

**Tool:** ${feedback.toolId}
${feedback.featureId ? `**Feature:** ${feedback.featureId}` : ''}

### Description
${feedback.message || 'No description provided.'}

---
*This issue was auto-generated from community feedback.*
`;
}

function formatImprovementBody(feedback: FeedbackRecord): string {
  return `## Improvement Suggestion

**Tool:** ${feedback.toolId}
${feedback.featureId ? `**Feature:** ${feedback.featureId}` : ''}

### Suggestion
${feedback.message || 'No description provided.'}

---
*This issue was auto-generated from community feedback.*
`;
}

function formatGeneralBody(feedback: FeedbackRecord): string {
  return `## General Feedback

**Tool:** ${feedback.toolId}

### Feedback
${feedback.message || 'No message provided.'}

---
*This issue was auto-generated from community feedback.*
`;
}
