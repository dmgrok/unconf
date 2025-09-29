/**
 * Activity State Manager for UnConf Platform
 * Manages activity orchestration, state transitions, and configurations
 */

import type { ActivityType, ActivityState } from '../../types/enums';
import { EventEmitter } from 'events';

export interface ActivityConfiguration {
  type: ActivityType;
  title: string;
  description: string;
  estimatedDuration?: number; // in minutes
  timerEnabled: boolean;
  defaultTimerDuration?: number; // in seconds
  allowManualStart: boolean;
  allowManualStop: boolean;
  requiresParticipants: boolean;
  minParticipants?: number;
  maxParticipants?: number;
  settings?: Record<string, any>;
}

export interface ActivityStateData {
  eventId: string;
  currentActivity: ActivityType | null;
  activityState: ActivityState;
  startedAt?: Date;
  endedAt?: Date;
  timerStartedAt?: Date;
  timerDuration?: number; // in seconds
  timerRemaining?: number; // in seconds
  isPaused: boolean;
  pausedAt?: Date;
  participants: Set<string>; // userIds
  configuration?: ActivityConfiguration;
  metadata?: Record<string, any>;
  previousActivity?: ActivityType;
  transitionHistory: ActivityTransition[];
}

export interface ActivityTransition {
  from: ActivityType | null;
  to: ActivityType;
  timestamp: Date;
  organizerId: string;
  reason?: string;
  latencyMs?: number;
}

export interface ActivityTimer {
  eventId: string;
  duration: number; // in seconds
  remaining: number;
  startedAt: Date;
  isActive: boolean;
  isPaused: boolean;
  pausedAt?: Date;
  onComplete?: () => void;
  onTick?: (remaining: number) => void;
}

// Activity configuration templates
export const ACTIVITY_CONFIGS: Record<ActivityType, ActivityConfiguration> = {
  [ActivityType.VOTING]: {
    type: ActivityType.VOTING,
    title: 'Topic Voting',
    description: 'Participants vote on discussion topics using weighted preferences',
    estimatedDuration: 10,
    timerEnabled: true,
    defaultTimerDuration: 600, // 10 minutes
    allowManualStart: true,
    allowManualStop: true,
    requiresParticipants: true,
    minParticipants: 3,
    settings: {
      allowTopicSubmission: true,
      maxVotesPerUser: 3,
      showRealTimeResults: true
    }
  },
  [ActivityType.GROUP_INTELLIGENCE]: {
    type: ActivityType.GROUP_INTELLIGENCE,
    title: 'Word Chain Game',
    description: 'Collaborative word-chain game for group engagement',
    estimatedDuration: 15,
    timerEnabled: true,
    defaultTimerDuration: 900, // 15 minutes
    allowManualStart: true,
    allowManualStop: true,
    requiresParticipants: true,
    minParticipants: 5,
    settings: {
      wordValidation: true,
      allowConcurrentSubmissions: true,
      profanityFilter: true
    }
  },
  [ActivityType.DISCUSSION_GROUPS]: {
    type: ActivityType.DISCUSSION_GROUPS,
    title: 'Discussion Rounds',
    description: 'Participants join discussion groups based on their voting preferences',
    estimatedDuration: 45,
    timerEnabled: true,
    defaultTimerDuration: 2700, // 45 minutes
    allowManualStart: true,
    allowManualStop: true,
    requiresParticipants: true,
    minParticipants: 6,
    settings: {
      autoAssignBasedOnVotes: true,
      allowManualAssignment: true,
      maxRoomCapacity: 8
    }
  },
  [ActivityType.TEAM_DISTRIBUTION]: {
    type: ActivityType.TEAM_DISTRIBUTION,
    title: 'Team Formation',
    description: 'Distribute participants into teams for collaborative work',
    estimatedDuration: 5,
    timerEnabled: false,
    allowManualStart: true,
    allowManualStop: true,
    requiresParticipants: true,
    minParticipants: 4,
    settings: {
      distributionStrategy: 'random',
      teamSize: 4,
      allowSelfSelection: false
    }
  }
};

export class ActivityStateManager extends EventEmitter {
  private states: Map<string, ActivityStateData> = new Map();
  private timers: Map<string, ActivityTimer> = new Map();
  private timerIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100); // Allow many event listeners
  }

  /**
   * Initialize activity state for an event
   */
  initializeEvent(eventId: string): ActivityStateData {
    const initialState: ActivityStateData = {
      eventId,
      currentActivity: null,
      activityState: ActivityState.IDLE,
      isPaused: false,
      participants: new Set(),
      transitionHistory: []
    };

    this.states.set(eventId, initialState);
    this.emit('event_initialized', { eventId, state: initialState });

    return initialState;
  }

  /**
   * Get current activity state for an event
   */
  getActivityState(eventId: string): ActivityStateData | null {
    return this.states.get(eventId) || null;
  }

  /**
   * Switch to a new activity
   */
  async switchActivity(
    eventId: string,
    newActivity: ActivityType,
    organizerId: string,
    timerDuration?: number
  ): Promise<{ success: boolean; error?: string; latencyMs?: number }> {
    const startTime = Date.now();

    try {
      const currentState = this.states.get(eventId);
      if (!currentState) {
        return { success: false, error: 'Event not found' };
      }

      const previousActivity = currentState.currentActivity;

      // Validate transition
      const validation = this.validateActivityTransition(currentState, newActivity);
      if (!validation.valid) {
        return { success: false, error: validation.reason };
      }

      // Stop current timer if running
      if (currentState.currentActivity) {
        this.stopTimer(eventId);
      }

      // Create transition record
      const transition: ActivityTransition = {
        from: previousActivity,
        to: newActivity,
        timestamp: new Date(),
        organizerId
      };

      // Update state
      const newState: ActivityStateData = {
        ...currentState,
        currentActivity: newActivity,
        activityState: ActivityState.PREPARING,
        previousActivity,
        configuration: ACTIVITY_CONFIGS[newActivity],
        startedAt: new Date(),
        endedAt: undefined,
        transitionHistory: [...currentState.transitionHistory, transition]
      };

      this.states.set(eventId, newState);

      // Start timer if configured
      const config = ACTIVITY_CONFIGS[newActivity];
      if (config.timerEnabled) {
        const duration = timerDuration || config.defaultTimerDuration || 600;
        this.startTimer(eventId, duration);
      }

      // Update to active state
      setTimeout(() => {
        const state = this.states.get(eventId);
        if (state && state.currentActivity === newActivity) {
          state.activityState = ActivityState.ACTIVE;
          this.states.set(eventId, state);
          this.emit('activity_activated', { eventId, activity: newActivity, state });
        }
      }, 100);

      const latencyMs = Date.now() - startTime;
      transition.latencyMs = latencyMs;

      // Emit activity switched event
      this.emit('activity_switched', {
        eventId,
        from: previousActivity,
        to: newActivity,
        organizerId,
        latencyMs,
        state: newState
      });

      return { success: true, latencyMs };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime
      };
    }
  }

  /**
   * Validate if activity transition is allowed
   */
  private validateActivityTransition(
    currentState: ActivityStateData,
    newActivity: ActivityType
  ): { valid: boolean; reason?: string } {
    // Check if participants meet minimum requirements
    const config = ACTIVITY_CONFIGS[newActivity];
    if (config.requiresParticipants && config.minParticipants) {
      if (currentState.participants.size < config.minParticipants) {
        return {
          valid: false,
          reason: `Activity requires at least ${config.minParticipants} participants, but only ${currentState.participants.size} are connected`
        };
      }
    }

    // Don't allow switching to the same activity
    if (currentState.currentActivity === newActivity) {
      return {
        valid: false,
        reason: 'Already in the requested activity'
      };
    }

    // Check if current activity can be stopped
    if (currentState.currentActivity && currentState.activityState === ActivityState.ACTIVE) {
      const currentConfig = ACTIVITY_CONFIGS[currentState.currentActivity];
      if (!currentConfig.allowManualStop) {
        return {
          valid: false,
          reason: 'Current activity cannot be manually stopped'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Start a timer for the current activity
   */
  startTimer(eventId: string, duration: number): boolean {
    try {
      // Clear existing timer
      this.stopTimer(eventId);

      const timer: ActivityTimer = {
        eventId,
        duration,
        remaining: duration,
        startedAt: new Date(),
        isActive: true,
        isPaused: false
      };

      this.timers.set(eventId, timer);

      // Start countdown interval
      const interval = setInterval(() => {
        const currentTimer = this.timers.get(eventId);
        if (!currentTimer || !currentTimer.isActive || currentTimer.isPaused) {
          return;
        }

        currentTimer.remaining = Math.max(0, currentTimer.remaining - 1);

        // Update activity state
        const state = this.states.get(eventId);
        if (state) {
          state.timerRemaining = currentTimer.remaining;
          state.timerStartedAt = currentTimer.startedAt;
          state.timerDuration = currentTimer.duration;
          this.states.set(eventId, state);
        }

        // Emit timer tick
        this.emit('timer_tick', {
          eventId,
          remaining: currentTimer.remaining,
          duration: currentTimer.duration
        });

        if (currentTimer.onTick) {
          currentTimer.onTick(currentTimer.remaining);
        }

        // Handle timer completion
        if (currentTimer.remaining <= 0) {
          this.handleTimerComplete(eventId);
        }
      }, 1000);

      this.timerIntervals.set(eventId, interval);

      this.emit('timer_started', { eventId, duration, timer });
      return true;

    } catch (error) {
      console.error('Failed to start timer:', error);
      return false;
    }
  }

  /**
   * Stop the timer for an event
   */
  stopTimer(eventId: string): void {
    const interval = this.timerIntervals.get(eventId);
    if (interval) {
      clearInterval(interval);
      this.timerIntervals.delete(eventId);
    }

    const timer = this.timers.get(eventId);
    if (timer) {
      timer.isActive = false;
      this.emit('timer_stopped', { eventId, timer });
    }
  }

  /**
   * Pause the timer for an event
   */
  pauseTimer(eventId: string): boolean {
    const timer = this.timers.get(eventId);
    if (!timer || !timer.isActive) {
      return false;
    }

    timer.isPaused = true;
    timer.pausedAt = new Date();

    const state = this.states.get(eventId);
    if (state) {
      state.isPaused = true;
      state.pausedAt = timer.pausedAt;
      this.states.set(eventId, state);
    }

    this.emit('timer_paused', { eventId, timer });
    return true;
  }

  /**
   * Resume the timer for an event
   */
  resumeTimer(eventId: string): boolean {
    const timer = this.timers.get(eventId);
    if (!timer || !timer.isPaused) {
      return false;
    }

    timer.isPaused = false;
    timer.pausedAt = undefined;

    const state = this.states.get(eventId);
    if (state) {
      state.isPaused = false;
      state.pausedAt = undefined;
      this.states.set(eventId, state);
    }

    this.emit('timer_resumed', { eventId, timer });
    return true;
  }

  /**
   * Handle timer completion
   */
  private handleTimerComplete(eventId: string): void {
    const timer = this.timers.get(eventId);
    const state = this.states.get(eventId);

    if (timer && timer.onComplete) {
      timer.onComplete();
    }

    if (state) {
      state.activityState = ActivityState.COMPLETED;
      state.endedAt = new Date();
      this.states.set(eventId, state);
    }

    this.stopTimer(eventId);
    this.emit('timer_completed', { eventId, timer, state });
  }

  /**
   * Add participant to event
   */
  addParticipant(eventId: string, userId: string): boolean {
    const state = this.states.get(eventId);
    if (!state) {
      return false;
    }

    state.participants.add(userId);
    this.states.set(eventId, state);

    this.emit('participant_added', { eventId, userId, participantCount: state.participants.size });
    return true;
  }

  /**
   * Remove participant from event
   */
  removeParticipant(eventId: string, userId: string): boolean {
    const state = this.states.get(eventId);
    if (!state) {
      return false;
    }

    const removed = state.participants.delete(userId);
    if (removed) {
      this.states.set(eventId, state);
      this.emit('participant_removed', { eventId, userId, participantCount: state.participants.size });
    }

    return removed;
  }

  /**
   * Get all active events
   */
  getActiveEvents(): string[] {
    return Array.from(this.states.keys());
  }

  /**
   * Clean up resources for an event
   */
  cleanup(eventId: string): void {
    this.stopTimer(eventId);
    this.states.delete(eventId);
    this.timers.delete(eventId);
    this.timerIntervals.delete(eventId);

    this.emit('event_cleaned_up', { eventId });
  }

  /**
   * Get activity configuration
   */
  getActivityConfig(activityType: ActivityType): ActivityConfiguration {
    return ACTIVITY_CONFIGS[activityType];
  }

  /**
   * Update activity configuration for an event
   */
  updateActivityConfig(
    eventId: string,
    activityType: ActivityType,
    configUpdates: Partial<ActivityConfiguration>
  ): boolean {
    const state = this.states.get(eventId);
    if (!state || state.currentActivity !== activityType) {
      return false;
    }

    const currentConfig = state.configuration || ACTIVITY_CONFIGS[activityType];
    const updatedConfig = { ...currentConfig, ...configUpdates };

    state.configuration = updatedConfig;
    this.states.set(eventId, state);

    this.emit('activity_config_updated', { eventId, activityType, config: updatedConfig });
    return true;
  }

  /**
   * Get timer state for an event
   */
  getTimerState(eventId: string): ActivityTimer | null {
    return this.timers.get(eventId) || null;
  }
}

// Singleton instance
export const activityStateManager = new ActivityStateManager();
export default activityStateManager;