/**
 * Tool Graduation System Types
 * 
 * Defines the lifecycle stages for tools and features:
 * wireframe → beta → standard → deprecated
 * 
 * - wireframe: Concept only, NO functionality - purely for feedback
 * - beta: Working feature collecting feedback before full release
 * - standard: Production-ready, graduated feature
 * - deprecated: Being phased out
 */

// =============================================================================
// GRADUATION STATUS
// =============================================================================

/**
 * Tool lifecycle status
 * 
 * @example
 * wireframe - Just an idea, UI mockup only, no functionality
 * beta - Working but collecting feedback before graduation
 * standard - Fully graduated, production feature
 * deprecated - Being phased out
 */
export type GraduationStatus = 'wireframe' | 'beta' | 'standard' | 'deprecated';

/**
 * Configuration for how each status is displayed
 */
export interface StatusDisplayConfig {
  /** Display label */
  label: string;
  /** Longer description for users */
  description: string;
  /** Badge text (empty = no badge) */
  badge: string;
  /** Theme color (tailwind class or hex) */
  color: string;
  /** Background color for badges */
  bgColor: string;
  /** Whether to show in main tools list or separate section */
  showInMainList: boolean;
  /** Whether the tool has actual functionality */
  hasFunctionality: boolean;
  /** How important is feedback collection */
  feedbackPriority: 'required' | 'encouraged' | 'optional';
}

/**
 * Display configuration for each graduation status
 */
export const STATUS_DISPLAY: Record<GraduationStatus, StatusDisplayConfig> = {
  wireframe: {
    label: 'Concept',
    description: 'This is just an idea - no functionality yet! We want your feedback to decide if we should build it.',
    badge: '💡 CONCEPT',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    showInMainList: false,  // Separate "Ideas Lab" section
    hasFunctionality: false,
    feedbackPriority: 'required',
  },
  beta: {
    label: 'Beta',
    description: 'This tool works but is still being refined. Your feedback shapes the final version.',
    badge: 'BETA',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    showInMainList: true,
    hasFunctionality: true,
    feedbackPriority: 'encouraged',
  },
  standard: {
    label: 'Available',
    description: 'Production-ready tool.',
    badge: '',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    showInMainList: true,
    hasFunctionality: true,
    feedbackPriority: 'optional',
  },
  deprecated: {
    label: 'Sunset',
    description: 'This tool is being phased out and will be removed in a future update.',
    badge: 'SUNSET',
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    showInMainList: false,
    hasFunctionality: true,
    feedbackPriority: 'optional',
  },
};

// =============================================================================
// TOOL CONFIGURATION
// =============================================================================

/**
 * Feature within a tool that can have its own graduation status
 */
export interface ToolFeature {
  /** Unique ID for this feature */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Current graduation status */
  status: GraduationStatus;
  /** When this feature was added to the current status */
  statusSince?: string;
}

/**
 * Complete tool configuration with graduation info
 */
export interface GraduatedToolConfig {
  /** Tool ID (matches ToolId type) */
  toolId: string;
  /** Display name */
  name: string;
  /** Emoji icon */
  emoji: string;
  /** Short description */
  description: string;
  /** Long description for Ideas Lab concepts */
  longDescription?: string;
  /** Current graduation status */
  status: GraduationStatus;
  /** When tool entered current status */
  statusSince: string;
  /** Whether the tool is enabled */
  enabled: boolean;
  /** URL path (null for wireframes with no page) */
  path: string | null;
  /** Who suggested this idea (for community attribution) */
  suggestedBy?: {
    name: string;
    role?: string;
    github?: string;
  };
  /** Individual features within the tool */
  features?: ToolFeature[];
  /** Graduation metrics (for non-wireframe tools) */
  metrics?: {
    usageCount: number;
    uniqueUsers: number;
    feedbackScore: number;
    errorRate: number;
  };
}

// =============================================================================
// TOOL REGISTRY
// =============================================================================

/**
 * All tools in the system with their graduation status
 * This is the source of truth for tool availability
 */
export const TOOL_REGISTRY: GraduatedToolConfig[] = [
  // === STANDARD TOOLS (Graduated) ===
  {
    toolId: 'shuffler',
    name: 'Team Shuffler',
    emoji: '🎲',
    description: 'Randomly assign participants to groups',
    status: 'standard',
    statusSince: '2025-01-01',
    enabled: true,
    path: '/tools/shuffler',
  },
  {
    toolId: 'timer',
    name: 'Session Timer',
    emoji: '⏱️',
    description: 'Full-screen countdown for talks',
    status: 'standard',
    statusSince: '2025-01-01',
    enabled: true,
    path: '/tools/timer',
  },
  {
    toolId: 'poll',
    name: 'Quick Poll',
    emoji: '🗳️',
    description: 'Single-question live voting',
    status: 'standard',
    statusSince: '2025-01-01',
    enabled: true,
    path: '/tools/poll',
  },
  
  // === BETA TOOLS (Working, collecting feedback) ===
  {
    toolId: 'survey',
    name: 'Survey Builder',
    emoji: '📋',
    description: 'Multi-question forms with various types',
    status: 'beta',
    statusSince: '2025-11-01',
    enabled: true,
    path: '/tools/survey',
  },
  {
    toolId: 'checkin',
    name: 'QR Check-In',
    emoji: '📱',
    description: 'Scan to join events',
    status: 'beta',
    statusSince: '2025-12-01',
    enabled: true,
    path: '/events', // Requires event context
  },
  
  // === WIREFRAME TOOLS (Concepts only - NO FUNCTIONALITY) ===
  {
    toolId: 'icebreaker',
    name: 'Icebreaker Generator',
    emoji: '🎯',
    description: 'Random prompts for team introductions',
    longDescription: 'Generate fun icebreaker questions for your team. Categories include: professional, creative, hypothetical, and silly. Display full-screen for group activities. Save your favorites for reuse.',
    status: 'wireframe',
    statusSince: '2026-01-02',
    enabled: true,
    path: null,
    suggestedBy: { name: 'Community Request', role: 'Facilitators' },
  },
  {
    toolId: 'retro',
    name: 'Quick Retro',
    emoji: '🔄',
    description: 'Simple retrospective board',
    longDescription: 'Three-column board (What went well, What to improve, Actions). Participants add anonymous sticky notes. Vote on items to prioritize. Export results as PDF or share link.',
    status: 'wireframe',
    statusSince: '2026-01-02',
    enabled: true,
    path: null,
    suggestedBy: { name: 'Community Request', role: 'Agile Teams' },
  },
  {
    toolId: 'networking',
    name: 'Speed Networking',
    emoji: '🤝',
    description: 'Automated 1-on-1 matchmaking rounds',
    longDescription: 'Run speed networking sessions with automated pairing. Set round duration, track who has met whom, and ensure everyone meets new people. Optional interest-based matching.',
    status: 'wireframe',
    statusSince: '2026-01-02',
    enabled: true,
    path: null,
    suggestedBy: { name: 'Community Request', role: 'Conference Organizers' },
  },
  {
    toolId: 'qa',
    name: 'Q&A Moderator',
    emoji: '❓',
    description: 'Audience questions with upvoting',
    longDescription: 'Collect questions from the audience in real-time. Participants upvote the best questions. Speakers see prioritized list. Mark questions as answered. Export for follow-up.',
    status: 'wireframe',
    statusSince: '2026-01-02',
    enabled: true,
    path: null,
    suggestedBy: { name: 'Community Request', role: 'Speakers & Moderators' },
  },
  {
    toolId: 'leaderboard',
    name: 'Engagement Leaderboard',
    emoji: '🏆',
    description: 'Gamify participation with points',
    longDescription: 'Award points for participation: submitting topics, voting, asking questions. Show live leaderboard. Optional prizes for top participants. Configurable point values.',
    status: 'wireframe',
    statusSince: '2026-01-02',
    enabled: true,
    path: null,
    suggestedBy: { name: 'Community Request', role: 'Engagement Managers' },
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get tools by graduation status
 */
export function getToolsByStatus(status: GraduationStatus): GraduatedToolConfig[] {
  return TOOL_REGISTRY.filter(t => t.status === status && t.enabled);
}

/**
 * Get all tools that should appear in the main tools list
 */
export function getMainListTools(): GraduatedToolConfig[] {
  return TOOL_REGISTRY.filter(t => 
    t.enabled && STATUS_DISPLAY[t.status].showInMainList
  );
}

/**
 * Get all wireframe/concept tools for Ideas Lab
 */
export function getIdeasLabTools(): GraduatedToolConfig[] {
  return TOOL_REGISTRY.filter(t => 
    t.enabled && t.status === 'wireframe'
  );
}

/**
 * Get a specific tool config
 */
export function getToolConfig(toolId: string): GraduatedToolConfig | undefined {
  return TOOL_REGISTRY.find(t => t.toolId === toolId);
}

/**
 * Check if a tool has actual functionality
 */
export function toolHasFunctionality(toolId: string): boolean {
  const tool = getToolConfig(toolId);
  if (!tool) return false;
  return STATUS_DISPLAY[tool.status].hasFunctionality;
}
