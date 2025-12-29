/**
 * Event Tools Lab - Simplified Type Definitions
 * 
 * Core types for the community-driven event tools platform.
 * Kept intentionally minimal - add complexity only when needed.
 */

// =============================================================================
// EVENTS
// =============================================================================

export interface Event {
  id: string;
  code: string;           // Short code for joining (e.g., "CONF2025")
  name: string;
  description?: string;
  createdAt: string;      // ISO date string
  createdBy: string;      // Organizer ID
  tools: EnabledTools;
  status: EventStatus;
}

export type EventStatus = 'active' | 'archived';

export interface EnabledTools {
  shuffler: boolean;
  timer: boolean;
  poll: boolean;
  checkin: boolean;
}

export const DEFAULT_TOOLS: EnabledTools = {
  shuffler: true,
  timer: true,
  poll: true,
  checkin: false,
};

// =============================================================================
// PARTICIPANTS
// =============================================================================

export interface Participant {
  id: string;
  eventId: string;
  name: string;
  email?: string;         // Optional - no complex auth
  role: ParticipantRole;
  checkedIn: boolean;
  joinedAt: string;       // ISO date string
}

export type ParticipantRole = 'organizer' | 'participant';

// =============================================================================
// TEAM SHUFFLER
// =============================================================================

export interface ShuffleResult {
  id: string;
  eventId: string;
  teams: Team[];
  teamSize: number;
  createdAt: string;
}

export interface Team {
  name: string;
  members: string[];      // Participant names
}

// =============================================================================
// SESSION TIMER
// =============================================================================

export interface TimerSession {
  id: string;
  eventId: string;
  label: string;
  durationMinutes: number;
  remainingSeconds: number;
  status: TimerStatus;
  startedAt?: string;
  createdAt: string;
}

export type TimerStatus = 'ready' | 'running' | 'paused' | 'done';

// =============================================================================
// QUICK POLL
// =============================================================================

export interface Poll {
  id: string;
  eventId: string;
  question: string;
  options: string[];
  votes: Record<string, string[]>;  // option -> participantIds who voted
  status: PollStatus;
  createdAt: string;
  closedAt?: string;
}

export type PollStatus = 'open' | 'closed';

export interface PollVote {
  participantId: string;
  option: string;
  votedAt: string;
}

// =============================================================================
// SURVEY (Multi-question polls with various question types)
// =============================================================================

export type QuestionType = 
  | 'single-choice'    // Radio buttons - pick one
  | 'multiple-choice'  // Checkboxes - pick many
  | 'rating'           // 1-5 stars or scale
  | 'text'             // Free text response
  | 'yes-no';          // Simple yes/no

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  question: string;
  required: boolean;
  options?: string[];           // For single/multiple choice
  ratingMax?: number;           // For rating (default 5)
  ratingLabels?: [string, string]; // e.g., ["Poor", "Excellent"]
  placeholder?: string;         // For text questions
}

export interface Survey {
  id: string;
  eventId?: string;             // Optional - can be standalone
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  status: SurveyStatus;
  shareCode: string;            // Short code for sharing
  allowAnonymous: boolean;
  createdBy: string;
  createdAt: string;
  closedAt?: string;
}

export type SurveyStatus = 'draft' | 'open' | 'closed';

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId?: string;        // Optional if anonymous
  respondentName?: string;
  answers: Record<string, SurveyAnswer>; // questionId -> answer
  submittedAt: string;
}

export type SurveyAnswer = 
  | string                      // For text, yes-no
  | string[]                    // For multiple-choice
  | number;                     // For rating

export interface SurveyResults {
  surveyId: string;
  totalResponses: number;
  questionResults: Record<string, QuestionResult>;
}

export interface QuestionResult {
  questionId: string;
  questionType: QuestionType;
  responseCount: number;
  // For choice questions
  choiceCounts?: Record<string, number>;
  // For rating questions
  averageRating?: number;
  ratingDistribution?: Record<number, number>;
  // For text questions
  textResponses?: string[];
}

/**
 * Generate a short survey share code (8 chars)
 */
export function generateSurveyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// =============================================================================
// API RESPONSES
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface EventWithParticipants extends Event {
  participants: Participant[];
  participantCount: number;
}

// =============================================================================
// FORM DATA
// =============================================================================

export interface CreateEventForm {
  name: string;
  description?: string;
  organizerName: string;
  organizerEmail?: string;
}

export interface JoinEventForm {
  code: string;
  name: string;
  email?: string;
}

export interface CreatePollForm {
  question: string;
  options: string[];
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type ToolId = keyof EnabledTools | 'survey';

export const TOOL_INFO: Record<ToolId, { name: string; emoji: string; description: string }> = {
  shuffler: {
    name: 'Team Shuffler',
    emoji: '🎲',
    description: 'Randomly assign participants to groups',
  },
  timer: {
    name: 'Session Timer',
    emoji: '⏱️',
    description: 'Full-screen countdown for talks',
  },
  poll: {
    name: 'Quick Poll',
    emoji: '🗳️',
    description: 'Single-question live voting',
  },
  survey: {
    name: 'Survey Builder',
    emoji: '📋',
    description: 'Multi-question forms with various types',
  },
  checkin: {
    name: 'QR Check-In',
    emoji: '📱',
    description: 'Scan to join events',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a random event code (6 uppercase letters)
 */
export function generateEventCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // No I, O to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Generate a simple UUID v4
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Shuffle an array (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Split array into chunks of given size
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
