/**
 * WebSocket Server Implementation for UnConf Platform
 * Handles real-time communication for events, voting, games, and activities
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  WebSocketConfig,
  Room,
  ConnectionPool,
  AckResponse,
  JoinEventData,
  LeaveEventData,
  VoteData,
  ActivitySwitchData,
  TimerUpdateData,
  HeartbeatResponse,
  WordSubmissionData,
  JoinRoomData,
  ManualAssignmentData,
  TopicCreateData,
  TopicUpdateData,
  TopicStatusChangeData,
  TopicDeleteData
} from './types.js';
import type { ActivityType } from '../../types/enums.js';
import { activityStateManager } from '../activity/ActivityStateManager.js';

export class UnConfWebSocketServer {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  private rooms: Map<string, Room> = new Map();
  private connectionPool: ConnectionPool = {};
  private heartbeatInterval: NodeJS.Timer | null = null;
  private config: WebSocketConfig;

  // Vote update throttling (2 updates per second maximum)
  private voteUpdateQueue: Map<string, any[]> = new Map(); // eventId -> pending vote updates
  private voteUpdateTimers: Map<string, NodeJS.Timer> = new Map(); // eventId -> timer
  private readonly VOTE_UPDATE_THROTTLE_MS = 500; // 500ms = 2 updates per second

  constructor(httpServer: HTTPServer, config: Partial<WebSocketConfig> = {}) {
    this.config = {
      port: config.port || 3001,
      cors: config.cors || {
        origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: config.pingTimeout || 60000,
      pingInterval: config.pingInterval || 25000,
      maxRetries: config.maxRetries || 3,
      reconnectDelay: config.reconnectDelay || 1000,
      heartbeatInterval: config.heartbeatInterval || 30000,
      acknowledgmentTimeout: config.acknowledgmentTimeout || 5000
    };

    this.io = new SocketIOServer(httpServer, {
      cors: this.config.cors,
      pingTimeout: this.config.pingTimeout,
      pingInterval: this.config.pingInterval
    });

    this.setupEventHandlers();
    this.setupActivityStateListeners();
    this.startHeartbeatMonitoring();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Connection management
      socket.on('join_event', (data, callback) => this.handleJoinEvent(socket, data, callback));
      socket.on('leave_event', (data, callback) => this.handleLeaveEvent(socket, data, callback));
      socket.on('heartbeat', (callback) => this.handleHeartbeat(socket, callback));

      // Activity participation
      socket.on('submit_vote', (data, callback) => this.handleSubmitVote(socket, data, callback));
      socket.on('remove_vote', (data, callback) => this.handleRemoveVote(socket, data, callback));
      socket.on('submit_word', (data, callback) => this.handleSubmitWord(socket, data, callback));
      socket.on('join_discussion_room', (data, callback) => this.handleJoinDiscussionRoom(socket, data, callback));

      // Topic management
      socket.on('topic_create', (data) => this.handleTopicCreate(socket, data));
      socket.on('topic_update', (data) => this.handleTopicUpdate(socket, data));
      socket.on('topic_status_change', (data) => this.handleTopicStatusChange(socket, data));
      socket.on('topic_delete', (data) => this.handleTopicDelete(socket, data));

      // Organizer actions
      socket.on('switch_activity', (data, callback) => this.handleSwitchActivity(socket, data, callback));
      socket.on('update_timer', (data, callback) => this.handleUpdateTimer(socket, data, callback));
      socket.on('manual_assignment', (data, callback) => this.handleManualAssignment(socket, data, callback));

      // Disconnection
      socket.on('disconnect', (reason) => this.handleDisconnect(socket, reason));
    });
  }

  private setupActivityStateListeners(): void {
    // Listen for activity state manager events and broadcast them via WebSocket

    activityStateManager.on('activity_switched', (data) => {
      const { eventId, from, to, organizerId, latencyMs, state } = data;
      this.io.to(eventId).emit('activity_switched', {
        eventId,
        newActivity: to,
        previousActivity: from,
        organizer: organizerId,
        timerDuration: state?.timerDuration,
        settings: state?.configuration?.settings,
        timestamp: new Date().toISOString(),
        latencyMs
      });
    });

    activityStateManager.on('timer_tick', (data) => {
      const { eventId, remaining, duration } = data;
      this.io.to(eventId).emit('timer_updated', {
        eventId,
        remainingTime: remaining,
        action: 'tick',
        duration,
        timestamp: new Date().toISOString()
      });
    });

    activityStateManager.on('timer_completed', (data) => {
      const { eventId } = data;
      this.io.to(eventId).emit('timer_updated', {
        eventId,
        remainingTime: 0,
        action: 'completed',
        timestamp: new Date().toISOString()
      });

      // Emit activity completed event
      this.io.to(eventId).emit('activity_completed', {
        eventId,
        timestamp: new Date().toISOString()
      });
    });

    activityStateManager.on('participant_added', (data) => {
      const { eventId, userId, participantCount } = data;
      console.log(`Participant ${userId} added to event ${eventId} (total: ${participantCount})`);
    });

    activityStateManager.on('participant_removed', (data) => {
      const { eventId, userId, participantCount } = data;
      console.log(`Participant ${userId} removed from event ${eventId} (total: ${participantCount})`);
    });
  }

  private async handleJoinEvent(
    socket: SocketIOServer['socket'], 
    data: JoinEventData, 
    callback: (response: AckResponse) => void
  ): Promise<void> {
    try {
      const { eventId, userId, role, isGuest, sessionId } = data;
      
      // Validate event exists and is active
      // TODO: Add event validation from repository
      
      // Store socket data
      socket.data = {
        userId,
        eventId,
        role,
        isGuest,
        sessionId,
        joinedAt: new Date(),
        lastActivity: new Date()
      };

      // Join event room
      await socket.join(eventId);

      // Update connection pool
      if (!this.connectionPool[eventId]) {
        this.connectionPool[eventId] = {};
      }
      this.connectionPool[eventId][userId] = {
        socketId: socket.id,
        joinedAt: new Date(),
        lastPing: new Date(),
        isActive: true
      };

      // Create or update room
      if (!this.rooms.has(eventId)) {
        this.rooms.set(eventId, {
          eventId,
          participants: new Set(),
          activity: 'voting', // Default activity
          createdAt: new Date(),
          lastActivity: new Date()
        });
      }

      const room = this.rooms.get(eventId)!;
      room.participants.add(userId);
      room.lastActivity = new Date();

      // Initialize or update activity state
      let activityState = activityStateManager.getActivityState(eventId);
      if (!activityState) {
        activityState = activityStateManager.initializeEvent(eventId);
      }

      // Add participant to activity state
      activityStateManager.addParticipant(eventId, userId);

      // Notify others about new participant
      socket.to(eventId).emit('user_count_update', {
        eventId,
        totalUsers: room.participants.size,
        activeUsers: this.getActiveUserCount(eventId),
        guestUsers: this.getGuestUserCount(eventId)
      });

      // Send confirmation to joining user
      callback({
        success: true,
        message: 'Successfully joined event',
        data: {
          eventId,
          userCount: room.participants.size,
          currentActivity: room.activity
        }
      });

      // Send connection status
      socket.emit('connection_status', {
        status: 'connected',
        eventId,
        userCount: room.participants.size,
        timestamp: new Date().toISOString()
      });

      console.log(`User ${userId} joined event ${eventId}`);

    } catch (error) {
      console.error('Error handling join event:', error);
      callback({
        success: false,
        error: 'Failed to join event'
      });
    }
  }

  private async handleLeaveEvent(
    socket: SocketIOServer['socket'],
    data: LeaveEventData,
    callback: (response: AckResponse) => void
  ): Promise<void> {
    try {
      const { eventId, userId } = data;
      
      await socket.leave(eventId);
      
      // Update connection pool
      if (this.connectionPool[eventId] && this.connectionPool[eventId][userId]) {
        this.connectionPool[eventId][userId].isActive = false;
      }

      // Update room
      const room = this.rooms.get(eventId);
      if (room) {
        room.participants.delete(userId);
        room.lastActivity = new Date();

        // Remove participant from activity state
        activityStateManager.removeParticipant(eventId, userId);

        // Notify others about user leaving
        socket.to(eventId).emit('user_count_update', {
          eventId,
          totalUsers: room.participants.size,
          activeUsers: this.getActiveUserCount(eventId),
          guestUsers: this.getGuestUserCount(eventId)
        });
      }

      callback({
        success: true,
        message: 'Successfully left event'
      });

      console.log(`User ${userId} left event ${eventId}`);

    } catch (error) {
      console.error('Error handling leave event:', error);
      callback({
        success: false,
        error: 'Failed to leave event'
      });
    }
  }

  private handleHeartbeat(
    socket: SocketIOServer['socket'],
    callback: (response: any) => void
  ): void {
    const eventId = socket.data?.eventId;
    const userId = socket.data?.userId;

    if (eventId && userId && this.connectionPool[eventId] && this.connectionPool[eventId][userId]) {
      this.connectionPool[eventId][userId].lastPing = new Date();
      this.connectionPool[eventId][userId].isActive = true;
    }

    if (socket.data) {
      socket.data.lastActivity = new Date();
    }

    callback({
      serverTime: new Date().toISOString(),
      eventStatus: 'active', // TODO: Get from event repository
      currentActivity: this.rooms.get(eventId || '')?.activity
    });
  }

  private async handleSubmitVote(
    socket: SocketIOServer['socket'],
    data: VoteData,
    callback: (response: AckResponse) => void
  ): Promise<void> {
    try {
      const { eventId, userId, topicId, weight } = data;

      // Import repositories dynamically to avoid circular dependencies
      const { VoteRepository, TopicRepository } = await import('../storage');
      
      const voteRepo = new VoteRepository({
        dataDir: './data',
        enableBackups: true,
        backupRetention: 10
      });
      
      const topicRepo = new TopicRepository({
        dataDir: './data',
        enableBackups: true,
        backupRetention: 10
      });

      // Check if user already has a vote for this topic
      const existingVote = await voteRepo.findUserVoteForTopic(userId, topicId);
      
      let voteResult;
      if (existingVote.success) {
        // Update existing vote
        voteResult = await voteRepo.updateVote(userId, topicId, weight);
      } else {
        // Cast new vote
        voteResult = await voteRepo.castVote(userId, topicId, eventId, weight);
      }
      
      if (!voteResult.success) {
        throw new Error(voteResult.error?.message || 'Failed to process vote');
      }

      // Get updated topic statistics
      const statsResult = await voteRepo.getTopicVoteStats(topicId);
      if (statsResult.success && statsResult.data) {
        const stats = statsResult.data;
        
        // Update topic with new statistics
        await topicRepo.update(topicId, {
          voteCount: stats.totalVotes,
          totalVoteWeight: stats.totalWeight,
          averageWeight: stats.averageWeight,
          lastVotedAt: new Date()
        });
        
        // Use throttled vote update to limit broadcasts to 2 per second
        this.throttledVoteUpdate(eventId, {
          eventId,
          topicId,
          voteCount: stats.totalVotes,
          totalWeight: stats.totalWeight,
          averageWeight: stats.averageWeight,
          weightDistribution: stats.weightDistribution,
          hasUserVoted: true,
          userVote: weight,
          timestamp: new Date().toISOString()
        });
      }

      callback({
        success: true,
        message: existingVote.success ? 'Vote updated successfully' : 'Vote submitted successfully',
        data: voteResult.data
      });

      console.log(`Vote ${existingVote.success ? 'updated' : 'submitted'}: ${userId} -> ${topicId} (${weight})`);

    } catch (error) {
      console.error('Error handling vote submission:', error);
      callback({
        success: false,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to submit vote'
      });
    }
  }

  private async handleRemoveVote(
    socket: SocketIOServer['socket'],
    data: { eventId: string; userId: string; topicId: string },
    callback: (response: AckResponse) => void
  ): Promise<void> {
    try {
      const { eventId, userId, topicId } = data;

      // Import repositories dynamically to avoid circular dependencies
      const { VoteRepository, TopicRepository } = await import('../storage');
      
      const voteRepo = new VoteRepository({
        dataDir: './data',
        enableBackups: true,
        backupRetention: 10
      });
      
      const topicRepo = new TopicRepository({
        dataDir: './data',
        enableBackups: true,
        backupRetention: 10
      });

      // Remove the vote
      const removeResult = await voteRepo.removeVote(userId, topicId);
      
      if (!removeResult.success) {
        throw new Error(removeResult.error?.message || 'Failed to remove vote');
      }

      // Get updated topic statistics
      const statsResult = await voteRepo.getTopicVoteStats(topicId);
      if (statsResult.success && statsResult.data) {
        const stats = statsResult.data;
        
        // Update topic with new statistics
        await topicRepo.update(topicId, {
          voteCount: stats.totalVotes,
          totalVoteWeight: stats.totalWeight,
          averageWeight: stats.averageWeight,
          lastVotedAt: stats.totalVotes > 0 ? new Date() : undefined
        });
        
        // Use throttled vote update for vote removal
        this.throttledVoteUpdate(eventId, {
          eventId,
          topicId,
          userId,
          voteCount: stats.totalVotes,
          totalWeight: stats.totalWeight,
          averageWeight: stats.averageWeight,
          weightDistribution: stats.weightDistribution,
          voteRemoved: true,
          timestamp: new Date().toISOString()
        });
      }

      callback({
        success: true,
        message: 'Vote removed successfully'
      });

      console.log(`Vote removed: ${userId} -> ${topicId}`);

    } catch (error) {
      console.error('Error handling vote removal:', error);
      callback({
        success: false,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to remove vote'
      });
    }
  }

  private async handleSubmitWord(
    socket: SocketIOServer['socket'],
    data: any,
    callback: (response: AckResponse) => void
  ): Promise<void> {
    // TODO: Implement word submission for group intelligence game
    callback({ success: false, error: 'Word submission not implemented yet' });
  }

  private async handleJoinDiscussionRoom(
    socket: SocketIOServer['socket'],
    data: any,
    callback: (response: AckResponse) => void
  ): Promise<void> {
    // TODO: Implement discussion room joining
    callback({ success: false, error: 'Discussion room joining not implemented yet' });
  }

  private async handleSwitchActivity(
    socket: SocketIOServer['socket'],
    data: ActivitySwitchData,
    callback: (response: AckResponse) => void
  ): Promise<void> {
    try {
      const { eventId, organizerId, newActivity, timerDuration, settings } = data;

      // TODO: Validate organizer permissions

      // Switch activity using ActivityStateManager
      const result = await activityStateManager.switchActivity(
        eventId,
        newActivity as ActivityType,
        organizerId,
        timerDuration
      );

      if (!result.success) {
        callback({
          success: false,
          error: result.error || 'Failed to switch activity'
        });
        return;
      }

      // Update room activity (legacy compatibility)
      const room = this.rooms.get(eventId);
      if (room) {
        const previousActivity = room.activity;
        room.activity = newActivity;
        room.lastActivity = new Date();
      }

      // Get current activity state
      const activityState = activityStateManager.getActivityState(eventId);

      // Broadcast activity switch to all participants with latency info
      this.io.to(eventId).emit('activity_switched', {
        eventId,
        newActivity,
        previousActivity: activityState?.previousActivity,
        organizer: organizerId,
        timerDuration: activityState?.timerDuration,
        settings: activityState?.configuration?.settings || settings,
        timestamp: new Date().toISOString(),
        latencyMs: result.latencyMs
      });

      callback({
        success: true,
        message: 'Activity switched successfully',
        data: {
          newActivity,
          previousActivity: activityState?.previousActivity,
          latencyMs: result.latencyMs,
          state: activityState
        }
      });

      console.log(`Activity switched in ${eventId}: ${activityState?.previousActivity} -> ${newActivity} (${result.latencyMs}ms)`);

    } catch (error) {
      console.error('Error handling activity switch:', error);
      callback({
        success: false,
        error: 'Failed to switch activity'
      });
    }
  }

  private async handleUpdateTimer(
    socket: SocketIOServer['socket'],
    data: TimerUpdateData,
    callback: (response: AckResponse) => void
  ): Promise<void> {
    try {
      const { eventId, organizerId, duration, action } = data;

      // TODO: Validate organizer permissions

      let success = false;
      let remainingTime = 0;

      switch (action) {
        case 'start':
          success = activityStateManager.startTimer(eventId, duration || 600);
          break;
        case 'pause':
          success = activityStateManager.pauseTimer(eventId);
          break;
        case 'resume':
          success = activityStateManager.resumeTimer(eventId);
          break;
        case 'stop':
          activityStateManager.stopTimer(eventId);
          success = true;
          break;
        case 'reset':
          activityStateManager.stopTimer(eventId);
          if (duration) {
            success = activityStateManager.startTimer(eventId, duration);
          } else {
            success = true;
          }
          break;
        default:
          callback({
            success: false,
            error: 'Invalid timer action'
          });
          return;
      }

      if (!success) {
        callback({
          success: false,
          error: `Failed to ${action} timer`
        });
        return;
      }

      // Get current timer state
      const timerState = activityStateManager.getTimerState(eventId);
      remainingTime = timerState?.remaining || 0;

      // Broadcast timer update to all participants
      this.io.to(eventId).emit('timer_updated', {
        eventId,
        remainingTime,
        action: action === 'start' ? 'started' : action === 'pause' ? 'paused' : action === 'reset' ? 'reset' : action === 'resume' ? 'resumed' : 'stopped',
        duration: timerState?.duration || duration,
        timestamp: new Date().toISOString()
      });

      callback({
        success: true,
        message: 'Timer updated successfully',
        data: {
          action,
          remainingTime,
          duration: timerState?.duration
        }
      });

    } catch (error) {
      console.error('Error handling timer update:', error);
      callback({
        success: false,
        error: 'Failed to update timer'
      });
    }
  }

  private async handleManualAssignment(
    socket: SocketIOServer['socket'],
    data: any,
    callback: (response: AckResponse) => void
  ): Promise<void> {
    // TODO: Implement manual assignment for teams/rooms
    callback({ success: false, error: 'Manual assignment not implemented yet' });
  }

  private handleDisconnect(socket: SocketIOServer['socket'], reason: string): void {
    const { eventId, userId } = socket.data || {};
    
    if (eventId && userId) {
      // Update connection pool
      if (this.connectionPool[eventId] && this.connectionPool[eventId][userId]) {
        this.connectionPool[eventId][userId].isActive = false;
      }

      // Update room
      const room = this.rooms.get(eventId);
      if (room) {
        room.participants.delete(userId);
        room.lastActivity = new Date();

        // Remove participant from activity state
        activityStateManager.removeParticipant(eventId, userId);

        // Notify others about disconnection
        socket.to(eventId).emit('user_count_update', {
          eventId,
          totalUsers: room.participants.size,
          activeUsers: this.getActiveUserCount(eventId),
          guestUsers: this.getGuestUserCount(eventId)
        });
      }
    }

    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  }

  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = this.config.pingTimeout;

      // Check for inactive connections
      Object.entries(this.connectionPool).forEach(([eventId, users]) => {
        Object.entries(users).forEach(([userId, connection]) => {
          const timeSinceLastPing = now.getTime() - connection.lastPing.getTime();
          
          if (timeSinceLastPing > timeout && connection.isActive) {
            connection.isActive = false;
            console.log(`Connection timeout for user ${userId} in event ${eventId}`);
            
            // Update room participant count
            const room = this.rooms.get(eventId);
            if (room) {
              room.participants.delete(userId);
              
              // Notify active users about user count change
              this.io.to(eventId).emit('user_count_update', {
                eventId,
                totalUsers: room.participants.size,
                activeUsers: this.getActiveUserCount(eventId),
                guestUsers: this.getGuestUserCount(eventId)
              });
            }
          }
        });
      });
    }, this.config.heartbeatInterval);
  }

  // Topic Management Handlers
  private handleTopicCreate(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, data: TopicCreateData): void {
    try {
      const { eventId, userId } = socket.data;
      if (!eventId || !userId) {
        console.error('Topic create: Missing event ID or user ID');
        return;
      }

      // Broadcast the topic creation to all participants in the event
      this.io.to(eventId).emit('topic_created', {
        topic: data.topic,
        eventId,
        userId
      });

      console.log(`Topic created in event ${eventId} by user ${userId}`);
    } catch (error) {
      console.error('Topic create error:', error);
      socket.emit('error', { 
        code: 'TOPIC_CREATE_FAILED',
        message: 'Failed to broadcast topic creation',
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleTopicUpdate(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, data: TopicUpdateData): void {
    try {
      const { eventId, userId } = socket.data;
      if (!eventId || !userId) {
        console.error('Topic update: Missing event ID or user ID');
        return;
      }

      // Broadcast the topic update to all participants in the event
      this.io.to(eventId).emit('topic_updated', {
        topic: data.topic,
        eventId,
        userId
      });

      console.log(`Topic updated in event ${eventId} by user ${userId}`);
    } catch (error) {
      console.error('Topic update error:', error);
      socket.emit('error', { 
        code: 'TOPIC_UPDATE_FAILED',
        message: 'Failed to broadcast topic update',
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleTopicStatusChange(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, data: TopicStatusChangeData): void {
    try {
      const { eventId, userId } = socket.data;
      if (!eventId || !userId) {
        console.error('Topic status change: Missing event ID or user ID');
        return;
      }

      // Broadcast the topic status change to all participants in the event
      this.io.to(eventId).emit('topic_status_changed', {
        topicId: data.topicId,
        status: data.status,
        updatedAt: data.updatedAt,
        eventId,
        userId
      });

      console.log(`Topic status changed in event ${eventId} by user ${userId}`);
    } catch (error) {
      console.error('Topic status change error:', error);
      socket.emit('error', { 
        code: 'TOPIC_STATUS_CHANGE_FAILED',
        message: 'Failed to broadcast topic status change',
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleTopicDelete(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, data: TopicDeleteData): void {
    try {
      const { eventId, userId } = socket.data;
      if (!eventId || !userId) {
        console.error('Topic delete: Missing event ID or user ID');
        return;
      }

      // Broadcast the topic deletion to all participants in the event
      this.io.to(eventId).emit('topic_deleted', {
        topicId: data.topicId,
        eventId,
        userId
      });

      console.log(`Topic deleted in event ${eventId} by user ${userId}`);
    } catch (error) {
      console.error('Topic delete error:', error);
      socket.emit('error', { 
        code: 'TOPIC_DELETE_FAILED',
        message: 'Failed to broadcast topic deletion',
        timestamp: new Date().toISOString()
      });
    }
  }

  private getActiveUserCount(eventId: string): number {
    const users = this.connectionPool[eventId] || {};
    return Object.values(users).filter(user => user.isActive).length;
  }

  private getGuestUserCount(eventId: string): number {
    // TODO: Implement guest user counting
    return 0;
  }

  private getWeightValue(weight: 'first' | 'second' | 'third'): number {
    switch (weight) {
      case 'first': return 3;
      case 'second': return 2;
      case 'third': return 1;
      default: return 0;
    }
  }

  // Vote update throttling methods
  private throttledVoteUpdate(eventId: string, voteUpdate: any): void {
    // Add vote update to queue
    if (!this.voteUpdateQueue.has(eventId)) {
      this.voteUpdateQueue.set(eventId, []);
    }

    const queue = this.voteUpdateQueue.get(eventId)!;

    // Remove any existing update for the same topic to avoid duplicate updates
    const existingIndex = queue.findIndex(update => update.topicId === voteUpdate.topicId);
    if (existingIndex !== -1) {
      queue[existingIndex] = voteUpdate; // Replace with latest update
    } else {
      queue.push(voteUpdate);
    }

    // If no timer is running for this event, start one
    if (!this.voteUpdateTimers.has(eventId)) {
      const timer = setTimeout(() => {
        this.processVoteUpdateQueue(eventId);
      }, this.VOTE_UPDATE_THROTTLE_MS);

      this.voteUpdateTimers.set(eventId, timer);
    }
  }

  private processVoteUpdateQueue(eventId: string): void {
    const queue = this.voteUpdateQueue.get(eventId);
    if (!queue || queue.length === 0) {
      this.voteUpdateTimers.delete(eventId);
      return;
    }

    // Process all updates in the queue
    const updates = [...queue];
    this.voteUpdateQueue.set(eventId, []); // Clear the queue

    // Send batch update if multiple updates exist
    if (updates.length === 1) {
      this.io.to(eventId).emit('vote_update', updates[0]);
    } else {
      // Send batch update for multiple vote changes
      this.io.to(eventId).emit('vote_batch_update', {
        eventId,
        updates,
        timestamp: new Date().toISOString()
      });
    }

    // Clear the timer
    this.voteUpdateTimers.delete(eventId);

    // If there are more updates in the queue (added while processing), schedule another batch
    if (this.voteUpdateQueue.get(eventId)?.length > 0) {
      const timer = setTimeout(() => {
        this.processVoteUpdateQueue(eventId);
      }, this.VOTE_UPDATE_THROTTLE_MS);

      this.voteUpdateTimers.set(eventId, timer);
    }
  }

  // Public methods for server management
  public getEventParticipantCount(eventId: string): number {
    return this.rooms.get(eventId)?.participants.size || 0;
  }

  public getConnectedEvents(): string[] {
    return Array.from(this.rooms.keys());
  }

  public broadcastToEvent(eventId: string, event: string, data: any): void {
    this.io.to(eventId).emit(event as any, data);
  }

  public stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Clear all vote update timers
    for (const timer of this.voteUpdateTimers.values()) {
      clearTimeout(timer);
    }
    this.voteUpdateTimers.clear();
    this.voteUpdateQueue.clear();

    // Cleanup activity state for all events
    const activeEvents = activityStateManager.getActiveEvents();
    activeEvents.forEach(eventId => {
      activityStateManager.cleanup(eventId);
    });

    this.io.close();
  }
}

export default UnConfWebSocketServer;