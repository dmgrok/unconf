/**
 * Enhanced WebSocket Manager for UnConf
 * Manages WebSocket connections and real-time events with comprehensive error handling
 */

import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { WebSocketErrorHandler } from '../errors/websocketErrorHandler.js';
import { handleWebSocketError } from '../errors/handler.js';
import { WebSocketError, ValidationError, type ErrorContext } from '../errors/index.js';
import { logger } from '../logging/index.js';
import { metricsCollector } from '../monitoring/index.js';

export class WebSocketManager {
  private io: Server | null = null;
  private rooms: Map<string, Set<string>> = new Map(); // eventId -> Set of userIds
  private userSockets: Map<string, string> = new Map(); // userId -> socketId
  private errorHandler: WebSocketErrorHandler;
  private connectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    failedConnections: 0,
    messagesReceived: 0,
    messagesFailed: 0,
    lastConnectionTime: null as Date | null,
    averageResponseTime: 0
  };

  constructor() {
    this.errorHandler = new WebSocketErrorHandler({
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2
    });
  }

  initialize(httpServer: HTTPServer): void {
    try {
      this.io = new Server(httpServer, {
        cors: {
          origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177'],
          methods: ['GET', 'POST'],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
      });

      this.setupEventHandlers();
      this.errorHandler.handleConnectionSuccess();
      logger.info('WebSocket server initialized successfully', { component: 'websocket-server' });

    } catch (error) {
      const appError = this.errorHandler.handleConnectionError(error, { component: 'websocket-server' });
      throw appError;
    }
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      this.connectionMetrics.totalConnections++;
      this.connectionMetrics.activeConnections++;
      this.connectionMetrics.lastConnectionTime = new Date();

      // Update monitoring metrics
      metricsCollector.updateWebSocketMetrics({
        totalConnections: this.connectionMetrics.totalConnections,
        activeConnections: this.connectionMetrics.activeConnections
      });

      logger.logWebSocket('client_connected', { socketId: socket.id });

      // Handle joining events
      socket.on('join_event', (data, callback) => {
        const startTime = Date.now();
        this.connectionMetrics.messagesReceived++;

        try {
          // Validate input data
          if (!data || !data.eventId || !data.userId) {
            throw new ValidationError('Missing required fields: eventId and userId', {
              eventId: data?.eventId,
              userId: data?.userId,
              socketId: socket.id
            });
          }

          const { eventId, userId } = data;

          // Join socket to event room
          socket.join(eventId);

          // Track user socket
          this.userSockets.set(userId, socket.id);

          // Add to room participants
          if (!this.rooms.has(eventId)) {
            this.rooms.set(eventId, new Set());
          }
          this.rooms.get(eventId)!.add(userId);

          const userCount = this.rooms.get(eventId)!.size;

          // Notify all participants in the event
          this.io!.to(eventId).emit('user_count_update', {
            eventId,
            totalUsers: userCount,
            activeUsers: userCount,
            guestUsers: 0
          });

          // Update response time metrics
          const responseTime = Date.now() - startTime;
          this.updateResponseTime(responseTime);

          // Update room metrics in monitoring system
          metricsCollector.updateRoomMetrics(eventId, {
            activeUsers: userCount,
            lastActivity: new Date()
          });

          // Record message metrics
          metricsCollector.recordMetric('websocket.join_event.duration', 'websocket', responseTime, 'ms', {
            eventId,
            userId,
            userCount
          });

          callback({ success: true, message: 'Joined successfully' });
          logger.logWebSocket('user_joined_event', {
            userId,
            eventId,
            socketId: socket.id,
            userCount
          });

        } catch (error) {
          this.connectionMetrics.messagesFailed++;

          // Update error metrics
          metricsCollector.updateWebSocketMetrics({
            messageFailures: this.connectionMetrics.messagesFailed
          });

          metricsCollector.recordError('websocket', 'medium');

          const appError = this.errorHandler.handleMessageError(error, 'join_event', {
            eventId: data?.eventId,
            userId: data?.userId,
            socketId: socket.id
          });

          const errorResponse = handleWebSocketError(appError);
          callback(errorResponse);
        }
      });

      // Handle voting
      socket.on('submit_vote', (data, callback) => {
        const startTime = Date.now();
        this.connectionMetrics.messagesReceived++;

        try {
          if (!data || !data.eventId || !data.topicId || !data.weight) {
            throw new ValidationError('Missing required fields for vote submission', {
              eventId: data?.eventId,
              topicId: data?.topicId,
              weight: data?.weight,
              socketId: socket.id
            });
          }

          const { eventId, topicId, weight } = data;

          // Broadcast vote update to all participants
          this.io!.to(eventId).emit('vote_update', {
            eventId,
            topicId,
            voteCount: 1,
            totalWeight: this.getWeightValue(weight),
            averageWeight: this.getWeightValue(weight),
            hasUserVoted: true,
            timestamp: new Date().toISOString()
          });

          this.updateResponseTime(Date.now() - startTime);
          callback({ success: true, message: 'Vote submitted' });

        } catch (error) {
          this.connectionMetrics.messagesFailed++;
          const appError = this.errorHandler.handleMessageError(error, 'submit_vote', {
            eventId: data?.eventId,
            topicId: data?.topicId,
            socketId: socket.id
          });

          const errorResponse = handleWebSocketError(appError);
          callback(errorResponse);
        }
      });

      // Handle activity switching
      socket.on('switch_activity', (data, callback) => {
        try {
          const { eventId, newActivity, timerDuration } = data;
          
          // Broadcast activity switch to all participants
          this.io!.to(eventId).emit('activity_switched', {
            eventId,
            newActivity,
            organizer: data.organizerId,
            timerDuration,
            timestamp: new Date().toISOString()
          });
          
          callback({ success: true, message: 'Activity switched' });
          
        } catch (error) {
          console.error('Error switching activity:', error);
          callback({ success: false, error: 'Failed to switch activity' });
        }
      });

      // Handle heartbeat
      socket.on('heartbeat', (callback) => {
        callback({
          serverTime: new Date().toISOString(),
          eventStatus: 'active'
        });
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        this.connectionMetrics.activeConnections--;

        // Update monitoring metrics
        metricsCollector.updateWebSocketMetrics({
          activeConnections: this.connectionMetrics.activeConnections
        });

        logger.logWebSocket('client_disconnected', {
          socketId: socket.id,
          reason
        });

        try {
          // Clean up user tracking
          for (const [userId, socketId] of this.userSockets.entries()) {
            if (socketId === socket.id) {
              this.userSockets.delete(userId);

              // Remove from rooms
              for (const [eventId, users] of this.rooms.entries()) {
                if (users.has(userId)) {
                  users.delete(userId);

                  // Notify remaining users
                  this.io!.to(eventId).emit('user_count_update', {
                    eventId,
                    totalUsers: users.size,
                    activeUsers: users.size,
                    guestUsers: 0
                  });
                }
              }
              break;
            }
          }

          this.errorHandler.handleDisconnection(reason, { socketId: socket.id });

        } catch (error) {
          this.errorHandler.handleMessageError(error, 'disconnect', { socketId: socket.id });
        }
      });

      // Handle connection errors
      socket.on('error', (error) => {
        this.connectionMetrics.failedConnections++;
        this.errorHandler.handleConnectionError(error, { socketId: socket.id });
      });
    });
  }

  private getWeightValue(weight: string): number {
    switch (weight) {
      case 'first': return 3;
      case 'second': return 2;
      case 'third': return 1;
      default: return 0;
    }
  }

  // Utility methods
  getEventParticipantCount(eventId: string): number {
    return this.rooms.get(eventId)?.size || 0;
  }

  broadcastToEvent(eventId: string, event: string, data: unknown): void {
    if (this.io) {
      this.io.to(eventId).emit(event, data);
    }
  }

  shutdown(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    this.rooms.clear();
    this.userSockets.clear();
    this.errorHandler.cleanup();
  }

  /**
   * Update response time metrics
   */
  private updateResponseTime(responseTime: number): void {
    // Simple exponential moving average
    const alpha = 0.1;
    this.connectionMetrics.averageResponseTime =
      this.connectionMetrics.averageResponseTime * (1 - alpha) + responseTime * alpha;
  }

  /**
   * Get connection metrics for monitoring
   */
  getMetrics() {
    return {
      ...this.connectionMetrics,
      errorHandlerState: this.errorHandler.getState(),
      roomCount: this.rooms.size,
      activeUsers: this.userSockets.size
    };
  }

  /**
   * Get error handler for external access
   */
  getErrorHandler(): WebSocketErrorHandler {
    return this.errorHandler;
  }

  /**
   * Subscribe to connection state changes
   */
  onStateChange(listener: (state: any) => void): () => void {
    return this.errorHandler.onStateChange(listener);
  }

  /**
   * Force reconnection attempt
   */
  forceReconnection(): void {
    this.errorHandler.forceReconnection();
  }
}