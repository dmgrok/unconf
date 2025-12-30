/**
 * WebSocket event types and interfaces for real-time communication
 */

import type { ActivityType, EventStatus, UserRole, TopicStatus, VoteWeight } from '../../types/enums';
import type { Topic } from '../../types/entities';

// Client-to-Server Events
export interface ClientToServerEvents {
  // Connection management
  join_event: (data: JoinEventData, callback: (response: AckResponse) => void) => void;
  leave_event: (data: LeaveEventData, callback: (response: AckResponse) => void) => void;
  heartbeat: (callback: (response: HeartbeatResponse) => void) => void;
  
  // Activity participation
  submit_vote: (data: VoteData, callback: (response: AckResponse) => void) => void;
  remove_vote: (data: { eventId: string; userId: string; topicId: string }, callback: (response: AckResponse) => void) => void;
  submit_word: (data: WordSubmissionData, callback: (response: AckResponse) => void) => void;
  join_discussion_room: (data: JoinRoomData, callback: (response: AckResponse) => void) => void;
  
  // Topic management
  topic_create: (data: TopicCreateData) => void;
  topic_update: (data: TopicUpdateData) => void;
  topic_status_change: (data: TopicStatusChangeData) => void;
  topic_delete: (data: TopicDeleteData) => void;
  
  // Organizer actions
  switch_activity: (data: ActivitySwitchData, callback: (response: AckResponse) => void) => void;
  update_timer: (data: TimerUpdateData, callback: (response: AckResponse) => void) => void;
  manual_assignment: (data: ManualAssignmentData, callback: (response: AckResponse) => void) => void;
}

// Server-to-Client Events
export interface ServerToClientEvents {
  // Connection status
  connection_status: (data: ConnectionStatusData) => void;
  user_count_update: (data: UserCountData) => void;
  
  // Activity updates
  activity_switched: (data: ActivitySwitchNotification) => void;
  activity_completed: (data: ActivityCompletedData) => void;
  timer_updated: (data: TimerUpdateNotification) => void;
  activity_state_changed: (data: ActivityStateData) => void;
  
  // Voting updates
  vote_update: (data: VoteUpdateData) => void;
  vote_batch_update: (data: VoteBatchUpdateData) => void;
  vote_removed: (data: VoteRemovedData) => void;
  voting_closed: (data: VotingClosedData) => void;
  
  // Game updates
  word_added: (data: WordAddedData) => void;
  game_state_update: (data: GameStateData) => void;
  
  // Discussion updates
  room_assignment: (data: RoomAssignmentData) => void;
  room_update: (data: RoomUpdateData) => void;
  
  // Team updates
  team_assignment: (data: TeamAssignmentData) => void;
  
  // Topic updates
  topic_created: (data: TopicCreatedData) => void;
  topic_updated: (data: TopicUpdatedData) => void;
  topic_status_changed: (data: TopicStatusChangedData) => void;
  topic_deleted: (data: TopicDeletedData) => void;
  
  // Error and system notifications
  error: (data: ErrorData) => void;
  system_message: (data: SystemMessageData) => void;
}

// Inter-server Events (for scaling)
export interface InterServerEvents {
  ping: () => void;
}

// Socket Data
export interface SocketData {
  userId: string;
  eventId: string;
  role: UserRole;
  isGuest: boolean;
  sessionId: string;
  joinedAt: Date;
  lastActivity: Date;
}

// Event Data Interfaces
export interface JoinEventData {
  eventId: string;
  userId: string;
  role: UserRole;
  isGuest: boolean;
  sessionId: string;
}

export interface LeaveEventData {
  eventId: string;
  userId: string;
}

export interface VoteData {
  eventId: string;
  userId: string;
  topicId: string;
  weight: VoteWeight;
  voteId?: string; // For vote updates
}

export interface WordSubmissionData {
  eventId: string;
  userId: string;
  word: string;
  gameId: string;
}

export interface JoinRoomData {
  eventId: string;
  userId: string;
  roomId: string;
}

export interface ActivitySwitchData {
  eventId: string;
  organizerId: string;
  newActivity: ActivityType;
  timerDuration?: number; // seconds
  settings?: Record<string, unknown>;
}

export interface TimerUpdateData {
  eventId: string;
  organizerId: string;
  duration: number; // seconds
  action: 'start' | 'pause' | 'resume' | 'stop' | 'reset' | 'extend';
}

export interface ManualAssignmentData {
  eventId: string;
  organizerId: string;
  assignments: {
    userId: string;
    roomId?: string;
    teamId?: string;
  }[];
}

// Notification Interfaces
export interface ConnectionStatusData {
  status: 'connected' | 'reconnecting' | 'disconnected';
  eventId: string;
  userCount: number;
  timestamp: string;
}

export interface UserCountData {
  eventId: string;
  totalUsers: number;
  activeUsers: number;
  guestUsers: number;
}

export interface ActivitySwitchNotification {
  eventId: string;
  newActivity: ActivityType;
  previousActivity?: ActivityType;
  organizer: string;
  timerDuration?: number;
  settings?: Record<string, unknown>;
  timestamp: string;
  latencyMs?: number;
}

export interface ActivityCompletedData {
  eventId: string;
  timestamp: string;
}

export interface TimerUpdateNotification {
  eventId: string;
  remainingTime: number; // seconds
  action: 'started' | 'paused' | 'reset' | 'extended' | 'expired' | 'tick' | 'completed' | 'resumed' | 'stopped';
  duration?: number;
  timestamp: string;
}

export interface ActivityStateData {
  eventId: string;
  activity: ActivityType;
  state: Record<string, unknown>;
  timestamp: string;
}

export interface VoteUpdateData {
  eventId: string;
  topicId: string;
  voteCount: number;
  totalWeight: number;
  averageWeight: number;
  hasUserVoted: boolean;
  timestamp: string;
}

export interface VoteRemovedData {
  eventId: string;
  topicId: string;
  userId: string;
  voteCount: number;
  totalWeight: number;
  averageWeight: number;
  timestamp: string;
}

export interface VoteBatchUpdateData {
  eventId: string;
  updates: VoteUpdateData[];
  timestamp: string;
}

export interface VotingClosedData {
  eventId: string;
  finalResults: {
    topicId: string;
    title: string;
    voteCount: number;
    totalWeight: number;
    averageWeight: number;
    rank: number;
  }[];
  timestamp: string;
}

export interface WordAddedData {
  eventId: string;
  gameId: string;
  word: string;
  submittedBy: string;
  isValid: boolean;
  chain: string[];
  timestamp: string;
}

export interface GameStateData {
  eventId: string;
  gameId: string;
  state: 'waiting' | 'active' | 'paused' | 'completed';
  currentTurn?: string;
  participants: string[];
  score: Record<string, number>;
  timestamp: string;
}

export interface RoomAssignmentData {
  eventId: string;
  userId: string;
  roomId: string;
  roomName: string;
  topicId: string;
  topicTitle: string;
  participants: {
    userId: string;
    name: string;
    role: UserRole;
  }[];
  timestamp: string;
}

export interface RoomUpdateData {
  eventId: string;
  roomId: string;
  participantCount: number;
  capacity: number;
  status: 'waiting' | 'active' | 'completed';
  timestamp: string;
}

export interface TeamAssignmentData {
  eventId: string;
  userId: string;
  teamId: string;
  teamName: string;
  members: {
    userId: string;
    name: string;
    role: UserRole;
  }[];
  timestamp: string;
}

export interface ErrorData {
  code: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

export interface SystemMessageData {
  type: 'info' | 'warning' | 'success';
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

// Response Interfaces
export interface AckResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

export interface HeartbeatResponse {
  serverTime: string;
  eventStatus?: EventStatus;
  currentActivity?: ActivityType;
}

// WebSocket Configuration
export interface WebSocketConfig {
  port: number;
  cors: {
    origin: string | string[];
    methods: string[];
    credentials: boolean;
  };
  pingTimeout: number;
  pingInterval: number;
  maxRetries: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  acknowledgmentTimeout: number;
}

// Room Management
export interface Room {
  eventId: string;
  participants: Set<string>;
  activity: ActivityType;
  createdAt: Date;
  lastActivity: Date;
}

// Connection Pool
export interface ConnectionPool {
  [eventId: string]: {
    [userId: string]: {
      socketId: string;
      joinedAt: Date;
      lastPing: Date;
      isActive: boolean;
    };
  };
}

// Topic Management Data Types
export interface TopicCreateData {
  topic: Topic;
}

export interface TopicUpdateData {
  topic: Topic;
}

export interface TopicStatusChangeData {
  topicId: string;
  status: TopicStatus;
  updatedAt: string;
}

export interface TopicDeleteData {
  topicId: string;
}

export interface TopicCreatedData {
  topic: Topic;
  eventId: string;
  userId: string;
}

export interface TopicUpdatedData {
  topic: Topic;
  eventId: string;
  userId: string;
}

export interface TopicStatusChangedData {
  topicId: string;
  status: TopicStatus;
  updatedAt: string;
  eventId: string;
  userId: string;
}

export interface TopicDeletedData {
  topicId: string;
  eventId: string;
  userId: string;
}