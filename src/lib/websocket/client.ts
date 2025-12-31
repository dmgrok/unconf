/**
 * Client-side WebSocket Store for UnConf Platform
 * Manages WebSocket connection, reconnection, and real-time state
 */

import { writable, derived, get } from 'svelte/store';
import { io, type Socket } from 'socket.io-client';
import type { ActivityType } from '../../types/enums.js';
import { UserRole, VoteWeight } from '../../types/enums.js';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  ConnectionStatusData,
  ActivitySwitchNotification,
  VoteUpdateData,
  VoteBatchUpdateData,
  UserCountData,
  TimerUpdateNotification,
  AckResponse
} from './types.js';

// Connection states
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// Socket store state
interface SocketState {
  status: ConnectionStatus;
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  eventId: string | null;
  userId: string | null;
  userCount: number;
  lastError: string | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

// Activity state
interface ActivityState {
  currentActivity: string | null;
  timerRemaining: number | null;
  isTimerActive: boolean;
  lastActivitySwitch: string | null;
}

// Vote state
interface VoteState {
  votes: Map<string, VoteUpdateData>;
  hasUserVoted: boolean;
}

// Create stores
const initialSocketState: SocketState = {
  status: 'disconnected',
  socket: null,
  eventId: null,
  userId: null,
  userCount: 0,
  lastError: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5
};

const initialActivityState: ActivityState = {
  currentActivity: null,
  timerRemaining: null,
  isTimerActive: false,
  lastActivitySwitch: null
};

const initialVoteState: VoteState = {
  votes: new Map(),
  hasUserVoted: false
};

export const socketStore = writable<SocketState>(initialSocketState);
export const activityStore = writable<ActivityState>(initialActivityState);
export const voteStore = writable<VoteState>(initialVoteState);

// Derived stores
export const isConnected = derived(socketStore, ($socket) => $socket.status === 'connected');
export const isReconnecting = derived(socketStore, ($socket) => $socket.status === 'reconnecting');
export const connectionHealth = derived(socketStore, ($socket) => ({
  status: $socket.status,
  userCount: $socket.userCount,
  reconnectAttempts: $socket.reconnectAttempts,
  hasError: !!$socket.lastError
}));

// Socket management class
class WebSocketManager {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private usePollingFallback = false;
  private config = {
    // Use environment variable for WebSocket URL, fallback to localhost for development
    url: typeof window !== 'undefined' 
      ? (window as any).__WEBSOCKET_URL__ || import.meta.env?.VITE_WEBSOCKET_URL || 'http://localhost:3001'
      : 'http://localhost:3001',
    heartbeatInterval: 30000,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    acknowledgmentTimeout: 5000,
    pollingInterval: 3000 // Fallback polling interval
  };

  async connect(eventId: string, userId: string, role: string, isGuest: boolean, sessionId: string): Promise<boolean> {
    try {
      // Update status
      socketStore.update(state => ({ ...state, status: 'connecting', lastError: null }));

      // Check if WebSocket URL is configured (not localhost in production)
      const isProduction = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
      const wsUrlConfigured = this.config.url && !this.config.url.includes('localhost:3001');
      
      if (isProduction && !wsUrlConfigured) {
        console.warn('WebSocket server not configured for production, using polling fallback');
        this.usePollingFallback = true;
        this.startPollingFallback(eventId, userId);
        socketStore.update(state => ({
          ...state,
          status: 'connected',
          eventId,
          userId,
          lastError: 'Using polling fallback (WebSocket not configured)'
        }));
        return true;
      }

      // Create socket connection
      this.socket = io(this.config.url, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      // Set up event listeners
      this.setupEventListeners();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
        
        this.socket!.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        this.socket!.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Join event
      const joinResult = await this.joinEvent(eventId, userId, role, isGuest, sessionId);
      if (!joinResult) {
        throw new Error('Failed to join event');
      }

      // Update store
      socketStore.update(state => ({
        ...state,
        status: 'connected',
        socket: this.socket,
        eventId,
        userId,
        reconnectAttempts: 0
      }));

      // Start heartbeat
      this.startHeartbeat();

      return true;
    } catch (error) {
      console.error('WebSocket connection failed, falling back to polling:', error);
      
      // Fallback to polling when WebSocket fails
      this.usePollingFallback = true;
      this.startPollingFallback(eventId, userId);
      
      socketStore.update(state => ({
        ...state,
        status: 'connected',
        eventId,
        userId,
        lastError: 'WebSocket unavailable, using polling fallback'
      }));
      return true;
    }
  }

  private startPollingFallback(eventId: string, userId: string): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    console.log('Starting polling fallback for real-time updates');
    
    // Initial poll
    this.pollForUpdates(eventId);
    
    // Set up regular polling
    this.pollingInterval = setInterval(() => {
      this.pollForUpdates(eventId);
    }, this.config.pollingInterval);
  }

  private async pollForUpdates(eventId: string): Promise<void> {
    try {
      // Poll for event updates
      const response = await fetch(`/api/tools/events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        // Update stores with polled data
        if (data.event) {
          socketStore.update(state => ({
            ...state,
            userCount: data.event.participants?.length || 0
          }));
        }
      }
      
      // Poll for poll updates
      const pollResponse = await fetch(`/api/tools/events/${eventId}/poll`);
      if (pollResponse.ok) {
        const pollData = await pollResponse.json();
        if (pollData.poll) {
          // Emit a synthetic vote update for compatibility
          voteStore.update(state => ({
            ...state,
            votes: new Map(Object.entries(pollData.poll.votes || {}))
          }));
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      socketStore.update(state => ({
        ...state,
        status: 'connected',
        reconnectAttempts: 0,
        lastError: null
      }));
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      socketStore.update(state => ({ ...state, status: 'disconnected' }));
      
      if (reason === 'io server disconnect') {
        // Server disconnected, don't try to reconnect
        return;
      }
      
      this.attemptReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      socketStore.update(state => ({
        ...state,
        status: 'disconnected',
        lastError: error instanceof Error ? error.message : String(error)
      }));
    });

    // Real-time event handlers
    this.socket.on('connection_status', (data: ConnectionStatusData) => {
      socketStore.update(state => ({
        ...state,
        userCount: data.userCount
      }));
    });

    this.socket.on('user_count_update', (data: UserCountData) => {
      socketStore.update(state => ({
        ...state,
        userCount: data.totalUsers
      }));
    });

    this.socket.on('activity_switched', (data: ActivitySwitchNotification) => {
      activityStore.update(state => ({
        ...state,
        currentActivity: data.newActivity,
        timerRemaining: data.timerDuration || null,
        isTimerActive: !!data.timerDuration,
        lastActivitySwitch: data.timestamp
      }));
    });

    this.socket.on('timer_updated', (data: TimerUpdateNotification) => {
      activityStore.update(state => ({
        ...state,
        timerRemaining: data.remainingTime,
        isTimerActive: data.action === 'started'
      }));
    });

    this.socket.on('vote_update', (data: VoteUpdateData) => {
      voteStore.update(state => {
        const newVotes = new Map(state.votes);
        newVotes.set(data.topicId, data);
        return {
          ...state,
          votes: newVotes,
          hasUserVoted: data.hasUserVoted || state.hasUserVoted
        };
      });
    });

    this.socket.on('vote_batch_update', (data: VoteBatchUpdateData) => {
      voteStore.update(state => {
        const newVotes = new Map(state.votes);
        let hasUserVotedUpdate = state.hasUserVoted;

        // Apply all vote updates in the batch
        data.updates.forEach(update => {
          newVotes.set(update.topicId, update);
          if (update.hasUserVoted) {
            hasUserVotedUpdate = true;
          }
        });

        return {
          ...state,
          votes: newVotes,
          hasUserVoted: hasUserVotedUpdate
        };
      });
    });

    this.socket.on('error', (data) => {
      console.error('WebSocket error:', data);
      socketStore.update(state => ({
        ...state,
        lastError: data.message
      }));
    });
  }

  private async joinEvent(eventId: string, userId: string, role: string, isGuest: boolean, sessionId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve(false);
        return;
      }

      this.socket.emit('join_event', {
        eventId,
        userId,
        role: role as UserRole,
        isGuest,
        sessionId
      }, (response: AckResponse) => {
        resolve(response.success);
      });
    });
  }

  async submitVote(topicId: string, weight: VoteWeight): Promise<boolean> {
    return new Promise((resolve) => {
      const state = get(socketStore);
      if (!this.socket || !state.eventId || !state.userId) {
        resolve(false);
        return;
      }

      this.socket.emit('submit_vote', {
        eventId: state.eventId,
        userId: state.userId,
        topicId,
        weight
      }, (response: AckResponse) => {
        resolve(response.success);
      });
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('heartbeat', () => {
          // Update last activity
          socketStore.update(state => ({ ...state, lastError: null }));
        });
      }
    }, this.config.heartbeatInterval);
  }

  private attemptReconnect(): void {
    const state = get(socketStore);
    
    if (state.reconnectAttempts >= state.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    socketStore.update(s => ({
      ...s,
      status: 'reconnecting',
      reconnectAttempts: s.reconnectAttempts + 1
    }));

    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, state.reconnectAttempts),
      this.config.maxReconnectDelay
    );

    this.reconnectTimeout = setTimeout(() => {
      if (state.eventId && state.userId) {
        this.connect(state.eventId, state.userId, 'participant', true, 'session_' + Date.now());
      }
    }, delay);
  }

  disconnect(): void {
    // Clear timers
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Clear polling interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.usePollingFallback = false;

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Reset stores
    socketStore.set(initialSocketState);
    activityStore.set(initialActivityState);
    voteStore.set(initialVoteState);
  }

  // Public methods for organizers
  async switchActivity(newActivity: string, timerDuration?: number): Promise<boolean> {
    return new Promise((resolve) => {
      const state = get(socketStore);
      if (!this.socket || !state.eventId || !state.userId) {
        resolve(false);
        return;
      }

      this.socket.emit('switch_activity', {
        eventId: state.eventId,
        organizerId: state.userId,
        newActivity: newActivity as ActivityType,
        timerDuration
      }, (response: AckResponse) => {
        resolve(response.success);
      });
    });
  }

  async updateTimer(duration: number, action: 'start' | 'pause' | 'reset' | 'extend'): Promise<boolean> {
    return new Promise((resolve) => {
      const state = get(socketStore);
      if (!this.socket || !state.eventId || !state.userId) {
        resolve(false);
        return;
      }

      this.socket.emit('update_timer', {
        eventId: state.eventId,
        organizerId: state.userId,
        duration,
        action
      }, (response: AckResponse) => {
        resolve(response.success);
      });
    });
  }
}

// Create singleton instance
export const webSocketManager = new WebSocketManager();

// Export convenient methods
export const connectToEvent = webSocketManager.connect.bind(webSocketManager);
export const disconnectFromEvent = webSocketManager.disconnect.bind(webSocketManager);
export const submitVote = webSocketManager.submitVote.bind(webSocketManager);
export const switchActivity = webSocketManager.switchActivity.bind(webSocketManager);
export const updateTimer = webSocketManager.updateTimer.bind(webSocketManager);