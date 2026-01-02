/**
 * Content Moderation Service
 * 
 * Uses AI-based content moderation (not keyword matching) to filter
 * inappropriate content before creating GitHub issues.
 * 
 * Options:
 * 1. OpenAI Moderation API (free, recommended)
 * 2. Perspective API (Google, free for low volume)
 * 3. Azure Content Safety
 * 
 * This implementation uses OpenAI's free moderation endpoint.
 */

import { 
  type ModerationResult, 
  type ModerationCategory, 
  type ModerationConfig,
  DEFAULT_MODERATION_CONFIG 
} from '$lib/types/feedback';

// =============================================================================
// TYPES
// =============================================================================

interface OpenAIModerationResponse {
  id: string;
  model: string;
  results: Array<{
    flagged: boolean;
    categories: Record<string, boolean>;
    category_scores: Record<string, number>;
  }>;
}

// Map OpenAI categories to our categories
const CATEGORY_MAP: Record<string, ModerationCategory> = {
  'hate': 'hate',
  'hate/threatening': 'hate',
  'harassment': 'harassment',
  'harassment/threatening': 'harassment',
  'self-harm': 'violence',
  'self-harm/intent': 'violence',
  'self-harm/instructions': 'violence',
  'sexual': 'sexual',
  'sexual/minors': 'sexual',
  'violence': 'violence',
  'violence/graphic': 'violence',
};

// =============================================================================
// RATE LIMITING
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Check if session is rate limited
 */
export function isRateLimited(sessionId: string, config: ModerationConfig = DEFAULT_MODERATION_CONFIG): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(sessionId);
  
  if (!entry) {
    return false;
  }
  
  // Reset if hour has passed
  if (now > entry.resetAt) {
    rateLimitMap.delete(sessionId);
    return false;
  }
  
  return entry.count >= config.rateLimitPerHour;
}

/**
 * Increment rate limit counter
 */
export function incrementRateLimit(sessionId: string): void {
  const now = Date.now();
  const hourFromNow = now + 60 * 60 * 1000;
  const entry = rateLimitMap.get(sessionId);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(sessionId, { count: 1, resetAt: hourFromNow });
  } else {
    entry.count++;
  }
}

// =============================================================================
// PII DETECTION
// =============================================================================

/**
 * Check for personal information (emails, phone numbers, etc.)
 * This is a simple regex-based check for obvious PII
 */
export function detectPII(text: string): { hasPII: boolean; types: string[] } {
  const types: string[] = [];
  
  // Email pattern
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  if (emailPattern.test(text)) {
    types.push('email');
  }
  
  // Phone number patterns (various formats)
  const phonePattern = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  if (phonePattern.test(text)) {
    types.push('phone');
  }
  
  // Social security number pattern (US)
  const ssnPattern = /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g;
  if (ssnPattern.test(text)) {
    types.push('ssn');
  }
  
  // Credit card pattern (basic)
  const ccPattern = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
  if (ccPattern.test(text)) {
    types.push('credit_card');
  }
  
  return {
    hasPII: types.length > 0,
    types,
  };
}

// =============================================================================
// CONTENT MODERATION
// =============================================================================

/**
 * Moderate content using OpenAI's free moderation API
 * Falls back to basic checks if API is unavailable
 */
export async function moderateContent(
  text: string,
  config: ModerationConfig = DEFAULT_MODERATION_CONFIG
): Promise<ModerationResult> {
  // Check for PII first
  const piiCheck = detectPII(text);
  if (piiCheck.hasPII) {
    return {
      status: 'flagged',
      confidence: 1.0,
      reason: `Contains personal information: ${piiCheck.types.join(', ')}`,
      categories: ['personal_info'],
      moderatedAt: new Date().toISOString(),
      method: 'auto',
    };
  }
  
  // Empty or very short text is suspicious
  if (!text || text.trim().length < 3) {
    return {
      status: 'rejected',
      confidence: 1.0,
      reason: 'Content too short',
      moderatedAt: new Date().toISOString(),
      method: 'auto',
    };
  }
  
  // Very long text should be flagged for review
  if (text.length > 5000) {
    return {
      status: 'flagged',
      confidence: 0.7,
      reason: 'Content unusually long - needs manual review',
      moderatedAt: new Date().toISOString(),
      method: 'auto',
    };
  }
  
  // Try OpenAI moderation API
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (openaiKey) {
    try {
      const result = await callOpenAIModeration(text, openaiKey);
      return processOpenAIResult(result, config);
    } catch (error) {
      console.error('[Moderation] OpenAI API error:', error);
      // Fall through to basic moderation
    }
  }
  
  // Fallback: basic moderation (approve with lower confidence)
  return {
    status: 'flagged', // Flag for manual review when API unavailable
    confidence: 0.5,
    reason: 'Automated moderation unavailable - flagged for manual review',
    moderatedAt: new Date().toISOString(),
    method: 'auto',
  };
}

/**
 * Call OpenAI's moderation endpoint
 */
async function callOpenAIModeration(text: string, apiKey: string): Promise<OpenAIModerationResponse> {
  const response = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: text }),
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Process OpenAI moderation result into our format
 */
function processOpenAIResult(
  response: OpenAIModerationResponse,
  config: ModerationConfig
): ModerationResult {
  const result = response.results[0];
  
  if (!result) {
    return {
      status: 'flagged',
      confidence: 0.5,
      reason: 'Invalid moderation response',
      moderatedAt: new Date().toISOString(),
      method: 'auto',
    };
  }
  
  // Map flagged categories
  const flaggedCategories: ModerationCategory[] = [];
  let maxScore = 0;
  
  for (const [category, isFlagged] of Object.entries(result.categories)) {
    if (isFlagged && CATEGORY_MAP[category]) {
      const mappedCategory = CATEGORY_MAP[category];
      if (!flaggedCategories.includes(mappedCategory)) {
        flaggedCategories.push(mappedCategory);
      }
    }
    
    const score = result.category_scores[category] || 0;
    if (score > maxScore) {
      maxScore = score;
    }
  }
  
  // Check for critical categories (instant rejection)
  const hasCriticalCategory = flaggedCategories.some(
    cat => config.criticalCategories.includes(cat)
  );
  
  if (hasCriticalCategory) {
    return {
      status: 'rejected',
      confidence: maxScore,
      reason: `Content flagged for: ${flaggedCategories.join(', ')}`,
      categories: flaggedCategories,
      moderatedAt: new Date().toISOString(),
      method: 'auto',
    };
  }
  
  // Not flagged at all
  if (!result.flagged && flaggedCategories.length === 0) {
    const confidence = 1 - maxScore; // Higher confidence when scores are low
    
    if (confidence >= config.autoApproveThreshold) {
      return {
        status: 'approved',
        confidence,
        moderatedAt: new Date().toISOString(),
        method: 'auto',
      };
    }
  }
  
  // Flagged but not critical - needs review
  return {
    status: 'flagged',
    confidence: maxScore,
    reason: flaggedCategories.length > 0 
      ? `Potential issues: ${flaggedCategories.join(', ')}`
      : 'Borderline content - needs manual review',
    categories: flaggedCategories.length > 0 ? flaggedCategories : undefined,
    moderatedAt: new Date().toISOString(),
    method: 'auto',
  };
}

// =============================================================================
// SPAM DETECTION
// =============================================================================

/**
 * Basic spam detection heuristics
 */
export function detectSpam(text: string): { isSpam: boolean; reason?: string } {
  // All caps
  const uppercaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (uppercaseRatio > 0.7 && text.length > 20) {
    return { isSpam: true, reason: 'Excessive capitalization' };
  }
  
  // Repeated characters
  if (/(.)\1{5,}/i.test(text)) {
    return { isSpam: true, reason: 'Repeated characters' };
  }
  
  // Too many URLs
  const urlCount = (text.match(/https?:\/\//g) || []).length;
  if (urlCount > 3) {
    return { isSpam: true, reason: 'Too many URLs' };
  }
  
  // Excessive punctuation
  const punctuationRatio = (text.match(/[!?]/g) || []).length / text.length;
  if (punctuationRatio > 0.2 && text.length > 10) {
    return { isSpam: true, reason: 'Excessive punctuation' };
  }
  
  return { isSpam: false };
}

/**
 * Full content check combining all methods
 */
export async function checkContent(
  text: string,
  sessionId: string,
  config: ModerationConfig = DEFAULT_MODERATION_CONFIG
): Promise<ModerationResult> {
  // Rate limit check
  if (isRateLimited(sessionId, config)) {
    return {
      status: 'rejected',
      confidence: 1.0,
      reason: 'Rate limit exceeded. Please try again later.',
      moderatedAt: new Date().toISOString(),
      method: 'auto',
    };
  }
  
  // Spam check
  const spamCheck = detectSpam(text);
  if (spamCheck.isSpam) {
    return {
      status: 'rejected',
      confidence: 0.9,
      reason: spamCheck.reason,
      categories: ['spam'],
      moderatedAt: new Date().toISOString(),
      method: 'auto',
    };
  }
  
  // Full moderation
  const result = await moderateContent(text, config);
  
  // Increment rate limit counter
  incrementRateLimit(sessionId);
  
  return result;
}
