/**
 * unconf tools Lab - Simplified Type Definitions
 * 
 * Core types for the community-driven unconf tools platform.
 * Kept intentionally minimal - add complexity only when needed.
 */

// =============================================================================
// SAVED ACTIVITIES
// =============================================================================

export type ActivityType = 'shuffler' | 'poll' | 'timer' | 'survey';

export interface SavedActivity {
  id: string;
  type: ActivityType;
  name: string;
  description?: string;
  eventId?: string;         // Optional - can be standalone or attached to event
  createdBy: string;        // User ID
  createdAt: string;        // ISO date string
  updatedAt: string;
  shareCode: string;        // Short code for sharing
  data: ActivityData;       // Type-specific data
}

export type ActivityData = 
  | ShufflerActivityData 
  | PollActivityData 
  | TimerActivityData 
  | SurveyActivityData;

export interface ShufflerActivityData {
  type: 'shuffler';
  gridData: string[][];     // The participant data grid
  config: {
    hasHeader: boolean;
    nameColumn: number;
    emailColumn: number | null;
    criteriaColumn1: number | null;
    criteriaColumn2: number | null;
    criteriaName1: string;
    criteriaName2: string;
    groupSize: number;
  };
  results?: DistributionGroup[];
}

export interface PollActivityData {
  type: 'poll';
  question: string;
  options: string[];
  allowMultiple: boolean;
  votes: Record<string, number>;
  status: 'open' | 'closed';
}

export interface TimerActivityData {
  type: 'timer';
  label: string;
  durationMinutes: number;
  status: 'ready' | 'running' | 'paused' | 'done';
}

export interface SurveyActivityData {
  type: 'survey';
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  status: SurveyStatus;
  allowAnonymous: boolean;
}

/**
 * Generate a short activity share code (8 chars)
 */
export function generateActivityCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

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
// TEAM SHUFFLER / GROUP DISTRIBUTION
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

/**
 * Enhanced Group Distribution - supports Excel paste with configurable columns
 */
export interface GroupDistributionConfig {
  groupSize: number;                    // Target number of people per group
  nameColumn: number;                   // Column index for name (0-based)
  emailColumn?: number;                 // Column index for email (optional)
  criteriaColumns: number[];            // Up to 2 columns for diversity criteria
  criteriaNames: string[];              // Names for the criteria (e.g., "Department", "Location")
}

export interface DistributionPerson {
  name: string;
  email?: string;
  criteria: Record<string, string>;     // criteriaName -> value
  rawRow: string[];                     // Original row data
}

export interface DistributionGroup {
  id: number;
  name: string;
  members: DistributionPerson[];
}

export interface DistributionResult {
  id: string;
  groups: DistributionGroup[];
  config: GroupDistributionConfig;
  totalPeople: number;
  createdAt: string;
}

/**
 * Parse tab-separated values (Excel paste)
 * Handles different line endings (Windows \r\n, Mac \r, Unix \n)
 * Also handles CSV if tabs not detected
 */
export function parseTSV(text: string): string[][] {
  if (!text || !text.trim()) return [];
  
  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.trim().split('\n');
  
  if (lines.length === 0) return [];
  
  // Detect delimiter: tab or comma or semicolon
  const firstLine = lines[0];
  let delimiter = '\t';
  
  if (!firstLine.includes('\t')) {
    // No tabs, check for comma or semicolon
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    
    if (semicolonCount > commaCount) {
      delimiter = ';';
    } else if (commaCount > 0) {
      delimiter = ',';
    }
  }
  
  return lines.map(line => 
    line.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''))
  );
}

/**
 * Distribute people into groups while maximizing diversity
 * Uses a greedy algorithm that tries to avoid putting people with 
 * the same criteria values in the same group
 */
export function distributeWithDiversity(
  people: DistributionPerson[],
  groupSize: number,
  criteriaNames: string[]
): DistributionGroup[] {
  if (people.length === 0) return [];
  
  const numGroups = Math.ceil(people.length / groupSize);
  const groups: DistributionGroup[] = Array.from({ length: numGroups }, (_, i) => ({
    id: i + 1,
    name: `Group ${i + 1}`,
    members: [],
  }));
  
  // Shuffle people first for randomness
  const shuffled = shuffleArray([...people]);
  
  // For each person, find the best group (one that minimizes criteria overlap)
  for (const person of shuffled) {
    let bestGroup = 0;
    let bestScore = Infinity;
    
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      
      // Skip if group is full
      if (group.members.length >= groupSize) continue;
      
      // Calculate overlap score - lower is better
      let score = 0;
      for (const criteriaName of criteriaNames) {
        const personValue = person.criteria[criteriaName];
        if (personValue) {
          const sameValueCount = group.members.filter(
            m => m.criteria[criteriaName] === personValue
          ).length;
          score += sameValueCount;
        }
      }
      
      // Prefer less full groups as tiebreaker
      score += group.members.length * 0.1;
      
      if (score < bestScore) {
        bestScore = score;
        bestGroup = i;
      }
    }
    
    groups[bestGroup].members.push(person);
  }
  
  return groups;
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
