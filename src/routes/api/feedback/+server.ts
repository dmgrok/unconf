/**
 * Feedback API Endpoint
 * 
 * POST /api/feedback - Submit feedback for tools/concepts
 * GET /api/feedback?toolId=xxx - Get feedback stats for a tool
 * POST /api/feedback/sync - Sync feedback to GitHub (admin only)
 * 
 * Feedback is:
 * 1. Moderated for inappropriate content
 * 2. Stored in data/feedback.json
 * 3. Synced to GitHub issues (one issue per concept with vote counts)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
  type FeedbackSubmission, 
  type SubmitFeedbackResponse,
} from '$lib/types/feedback';
import { checkContent } from '$lib/services/moderation';
import { 
  addFeedback, 
  getFeedbackStats, 
  hasSessionVoted 
} from '$lib/services/feedback-storage';
import { syncToolFeedback } from '$lib/services/github-feedback-sync';
import { generateId } from '$lib/types/tools';

// =============================================================================
// POST - Submit Feedback
// =============================================================================

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const feedback = body.feedback as FeedbackSubmission;
    
    // Validate required fields
    if (!feedback || !feedback.toolId || !feedback.type) {
      const response: SubmitFeedbackResponse = {
        success: false,
        error: 'Missing required fields: toolId and type',
      };
      return json(response, { status: 400 });
    }
    
    // Get or create session ID
    let sessionId = feedback.sessionId || cookies.get('session_id');
    if (!sessionId) {
      sessionId = generateId();
      cookies.set('session_id', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        httpOnly: true,
        sameSite: 'strict',
      });
    }
    
    // Check if session already voted on this concept
    if (feedback.type === 'concept_vote') {
      const alreadyVoted = await hasSessionVoted(sessionId, feedback.toolId);
      if (alreadyVoted) {
        const response: SubmitFeedbackResponse = {
          success: false,
          error: 'You have already voted on this concept',
        };
        return json(response, { status: 400 });
      }
    }
    
    // Moderate content (if message provided)
    const textToModerate = [
      feedback.message,
      feedback.name,
    ].filter(Boolean).join(' ');
    
    let moderationResult = null;
    
    if (textToModerate.length > 0) {
      moderationResult = await checkContent(textToModerate, sessionId);
      
      // Reject if content is inappropriate
      if (moderationResult.status === 'rejected') {
        const response: SubmitFeedbackResponse = {
          success: false,
          moderationStatus: 'rejected',
          error: moderationResult.reason || 'Content was flagged as inappropriate',
        };
        return json(response, { status: 400 });
      }
    }
    
    // Create and store feedback record
    const record = await addFeedback({
      ...feedback,
      sessionId,
      moderationStatus: moderationResult?.status || 'approved',
      moderation: moderationResult || undefined,
    });
    
    // Trigger GitHub sync in background (don't await)
    // This updates the issue with new vote counts and adds approved comments
    syncToolFeedback(feedback.toolId).catch(err => {
      console.error('[Feedback] GitHub sync failed:', err);
    });
    
    const response: SubmitFeedbackResponse = {
      success: true,
      feedbackId: record.id,
      moderationStatus: record.moderationStatus,
      message: record.moderationStatus === 'flagged' 
        ? 'Thank you! Your feedback is being reviewed.'
        : 'Thank you for your feedback!',
    };
    return json(response);
    
  } catch (err) {
    console.error('[Feedback] Error:', err);
    const response: SubmitFeedbackResponse = {
      success: false,
      error: 'Failed to submit feedback',
    };
    return json(response, { status: 500 });
  }
};

// =============================================================================
// GET - Feedback Stats
// =============================================================================

export const GET: RequestHandler = async ({ url }) => {
  const toolId = url.searchParams.get('toolId');
  
  if (!toolId) {
    return json({ success: false, error: 'toolId required' }, { status: 400 });
  }
  
  try {
    const stats = await getFeedbackStats(toolId);
    return json({ success: true, stats });
  } catch (err) {
    console.error('[Feedback] Error getting stats:', err);
    return json({ success: false, error: 'Failed to get feedback stats' }, { status: 500 });
  }
};
