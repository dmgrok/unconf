/**
 * WebSocket Graceful Degradation Implementation
 * Extends the base graceful degradation manager for WebSocket connections
 */

import { GracefulDegradationManager, type FailedOperation } from './graceful-degradation.js';
import { logger } from '../logging/index.js';

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  id?: string;
  timestamp?: number;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectConfig?: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitterEnabled: boolean;
  };
  heartbeat?: {
    enabled: boolean;
    interval: number; // milliseconds
    timeout: number; // milliseconds
  };
}

export class WebSocketGracefulDegradation extends GracefulDegradationManager {
  private websocket?: WebSocket;
  private messageQueue: WebSocketMessage[] = [];
  private heartbeatInterval?: NodeJS.Timeout;
  private heartbeatTimeout?: NodeJS.Timeout;
  private messageCallbacks = new Map<string, (data: unknown) => void>();
  private lastHeartbeatResponse?: Date;

  constructor(private readonly wsConfig: WebSocketConfig) {
    super(wsConfig.reconnectConfig);
    logger.info('WebSocket graceful degradation initialized', { component: 'websocket-degradation' }, {
      url: wsConfig.url,
      heartbeatEnabled: wsConfig.heartbeat?.enabled ?? false
    });
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.websocket?.readyState === WebSocket.CONNECTING) {
      logger.debug('WebSocket connection already in progress', { component: 'websocket-degradation' });
      return;
    }

    if (this.websocket?.readyState === WebSocket.OPEN) {
      logger.debug('WebSocket already connected', { component: 'websocket-degradation' });
      return;
    }

    logger.info('Initiating WebSocket connection', { component: 'websocket-degradation' }, {
      url: this.wsConfig.url
    });

    try {
      this.websocket = new WebSocket(this.wsConfig.url, this.wsConfig.protocols);
      this.setupWebSocketEventHandlers();
    } catch (error) {
      logger.error('Failed to create WebSocket', { component: 'websocket-degradation' }, {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      this.onConnectionFailed(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    logger.info('Disconnecting WebSocket', { component: 'websocket-degradation' });
    
    this.stopHeartbeat();
    
    if (this.websocket) {
      this.websocket.close(1000, 'Normal closure');
      this.websocket = undefined;
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketEventHandlers(): void {
    if (!this.websocket) return;

    this.websocket.onopen = () => {
      logger.info('WebSocket connection opened', { component: 'websocket-degradation' });
      this.onConnectionEstablished();
      this.startHeartbeat();
      this.processQueuedMessages();
    };

    this.websocket.onclose = (event) => {
      logger.warn('WebSocket connection closed', { component: 'websocket-degradation' }, {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      this.stopHeartbeat();
      this.onConnectionFailed(new Error(`WebSocket closed: ${event.code} ${event.reason}`));
    };

    this.websocket.onerror = (event) => {
      logger.error('WebSocket error occurred', { component: 'websocket-degradation' }, {
        error: event
      });
      // Note: onerror is always followed by onclose, so we don't need to handle connection failure here
    };

    this.websocket.onmessage = (event) => {
      this.handleIncomingMessage(event.data);
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleIncomingMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      
      // Handle heartbeat responses
      if (message.type === 'heartbeat-response') {
        this.lastHeartbeatResponse = new Date();
        if (this.heartbeatTimeout) {
          clearTimeout(this.heartbeatTimeout);
          this.heartbeatTimeout = undefined;
        }
        return;
      }

      // Handle other messages
      const callback = this.messageCallbacks.get(message.type);
      if (callback) {
        callback(message.payload);
      }

      logger.debug('WebSocket message received', { component: 'websocket-degradation' }, {
        type: message.type,
        hasCallback: !!callback
      });

    } catch (error) {
      logger.error('Failed to parse WebSocket message', { component: 'websocket-degradation' }, {
        data,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
    }
  }

  /**
   * Send a message through WebSocket with graceful degradation
   */
  sendMessage(message: WebSocketMessage): boolean {
    if (!message.id) {
      message.id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!message.timestamp) {
      message.timestamp = Date.now();
    }

    // If connected, send immediately
    if (this.websocket?.readyState === WebSocket.OPEN) {
      try {
        this.websocket.send(JSON.stringify(message));
        logger.debug('WebSocket message sent', { component: 'websocket-degradation' }, {
          type: message.type,
          id: message.id
        });
        return true;
      } catch (error) {
        logger.error('Failed to send WebSocket message', { component: 'websocket-degradation' }, {
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
          messageType: message.type
        });
        this.queueMessage(message);
        return false;
      }
    }

    // Queue message for later sending
    this.queueMessage(message);
    return false;
  }

  /**
   * Queue a message for sending when connection is restored
   */
  private queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push(message);
    
    // Keep queue size reasonable (last 100 messages)
    if (this.messageQueue.length > 100) {
      this.messageQueue = this.messageQueue.slice(-100);
      logger.warn('WebSocket message queue truncated', { component: 'websocket-degradation' });
    }

    logger.info('WebSocket message queued', { component: 'websocket-degradation' }, {
      type: message.type,
      id: message.id,
      queueSize: this.messageQueue.length
    });

    // Also queue as failed operation for tracking
    this.queueFailedOperation('websocket-message', message, 'medium', 3);
  }

  /**
   * Process queued messages when connection is restored
   */
  private processQueuedMessages(): void {
    if (this.messageQueue.length === 0) return;

    logger.info('Processing queued WebSocket messages', { component: 'websocket-degradation' }, {
      queueSize: this.messageQueue.length
    });

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messages) {
      // Check if message is still relevant (not too old)
      const messageAge = Date.now() - (message.timestamp || 0);
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (messageAge > maxAge) {
        logger.debug('Discarding old queued message', { component: 'websocket-degradation' }, {
          type: message.type,
          id: message.id,
          age: messageAge
        });
        continue;
      }

      this.sendMessage(message);
    }
  }

  /**
   * Subscribe to specific message types
   */
  onMessage(messageType: string, callback: (data: unknown) => void): () => void {
    this.messageCallbacks.set(messageType, callback);

    // Return unsubscribe function
    return () => {
      this.messageCallbacks.delete(messageType);
    };
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    if (!this.wsConfig.heartbeat?.enabled) return;

    const interval = this.wsConfig.heartbeat.interval || 30000; // 30 seconds default

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, interval);

    logger.debug('Heartbeat started', { component: 'websocket-degradation' }, { interval });
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = undefined;
    }

    logger.debug('Heartbeat stopped', { component: 'websocket-degradation' });
  }

  /**
   * Send heartbeat ping
   */
  private sendHeartbeat(): void {
    if (this.websocket?.readyState !== WebSocket.OPEN) return;

    const timeout = this.wsConfig.heartbeat?.timeout || 5000; // 5 seconds default

    try {
      this.websocket.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: Date.now()
      }));

      // Set timeout for heartbeat response
      this.heartbeatTimeout = setTimeout(() => {
        logger.warn('Heartbeat timeout - connection may be stale', { component: 'websocket-degradation' });
        this.onConnectionFailed(new Error('Heartbeat timeout'));
      }, timeout);

    } catch (error) {
      logger.error('Failed to send heartbeat', { component: 'websocket-degradation' }, {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
      this.onConnectionFailed(error instanceof Error ? error : new Error('Heartbeat send failed'));
    }
  }

  /**
   * Override reconnection attempt to use WebSocket connect
   */
  protected onReconnectionAttempt(): void {
    this.connect();
  }

  /**
   * Override operation retry for WebSocket messages
   */
  protected async retryOperation(operation: FailedOperation): Promise<void> {
    if (operation.type === 'websocket-message') {
      const message = operation.data as WebSocketMessage;
      if (!this.sendMessage(message)) {
        throw new Error('Failed to retry WebSocket message');
      }
    }
  }

  /**
   * Get WebSocket-specific status
   */
  getWebSocketStatus() {
    return {
      ...this.getStatus(),
      websocketState: this.websocket?.readyState,
      queuedMessages: this.messageQueue.length,
      lastHeartbeatResponse: this.lastHeartbeatResponse,
      heartbeatEnabled: this.wsConfig.heartbeat?.enabled ?? false
    };
  }

  /**
   * Check if WebSocket is ready for sending
   */
  isReady(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }

  /**
   * Get WebSocket ready state string
   */
  getReadyState(): string {
    if (!this.websocket) return 'NOT_CREATED';
    
    switch (this.websocket.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  /**
   * Cleanup WebSocket resources
   */
  cleanup(): void {
    this.disconnect();
    this.messageCallbacks.clear();
    super.cleanup();
  }
}