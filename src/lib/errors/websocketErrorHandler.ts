/**
 * WebSocket-specific error handling and connection management
 */

import { WebSocketError, NetworkError, AppError, ErrorCategory, ErrorSeverity } from './index.js';
import { handleWebSocketError } from './handler.js';

export interface WebSocketConnectionState {
  isConnected: boolean;
  reconnectAttempts: number;
  lastConnected?: Date;
  lastError?: AppError;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

export interface ReconnectionOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class WebSocketErrorHandler {
  private connectionState: WebSocketConnectionState = {
    isConnected: false,
    reconnectAttempts: 0,
    connectionQuality: 'disconnected'
  };

  private reconnectionOptions: ReconnectionOptions = {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  };

  private reconnectionTimer?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private readonly listeners = new Set<(state: WebSocketConnectionState) => void>();

  constructor(options?: Partial<ReconnectionOptions>) {
    if (options) {
      this.reconnectionOptions = { ...this.reconnectionOptions, ...options };
    }
  }

  /**
   * Handle WebSocket connection errors
   */
  handleConnectionError(error: unknown, context: Record<string, unknown> = {}): AppError {
    const appError = error instanceof AppError
      ? error
      : new WebSocketError('WebSocket connection failed', context);

    this.connectionState.lastError = appError;
    this.connectionState.isConnected = false;
    this.connectionState.connectionQuality = 'disconnected';

    this.notifyStateChange();

    // Start reconnection process if not already running
    if (!this.reconnectionTimer) {
      this.scheduleReconnection();
    }

    return appError;
  }

  /**
   * Handle successful connection
   */
  handleConnectionSuccess(): void {
    this.connectionState.isConnected = true;
    this.connectionState.reconnectAttempts = 0;
    this.connectionState.lastConnected = new Date();
    this.connectionState.lastError = undefined;
    this.connectionState.connectionQuality = 'excellent';

    this.clearReconnectionTimer();
    this.startHealthCheck();
    this.notifyStateChange();
  }

  /**
   * Handle WebSocket message errors
   */
  handleMessageError(error: unknown, messageType: string, context: Record<string, unknown> = {}): AppError {
    const appError = new WebSocketError(
      `Failed to process ${messageType} message`,
      { ...context, messageType }
    );

    // Don't disconnect for message errors, but log them
    const errorResponse = handleWebSocketError(appError, context);
    return appError;
  }

  /**
   * Handle graceful disconnection
   */
  handleDisconnection(reason: string, context: Record<string, unknown> = {}): void {
    this.connectionState.isConnected = false;
    this.connectionState.connectionQuality = 'disconnected';

    // Only attempt reconnection for unexpected disconnects
    if (reason !== 'client disconnect' && reason !== 'server shutting down') {
      this.scheduleReconnection();
    }

    this.clearHealthCheck();
    this.notifyStateChange();
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnection(): void {
    if (this.connectionState.reconnectAttempts >= this.reconnectionOptions.maxAttempts) {
      this.connectionState.connectionQuality = 'disconnected';
      this.notifyStateChange();
      return;
    }

    const delay = Math.min(
      this.reconnectionOptions.baseDelay * Math.pow(
        this.reconnectionOptions.backoffMultiplier,
        this.connectionState.reconnectAttempts
      ),
      this.reconnectionOptions.maxDelay
    );

    this.reconnectionTimer = setTimeout(() => {
      this.connectionState.reconnectAttempts++;
      this.attemptReconnection();
    }, delay);
  }

  /**
   * Attempt to reconnect (to be implemented by specific WebSocket manager)
   */
  private attemptReconnection(): void {
    // This should be overridden or called back to the actual WebSocket manager
    this.reconnectionTimer = undefined;

    // Emit event for reconnection attempt
    this.notifyStateChange();
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    // This would send a ping/heartbeat message
    // Implementation depends on the specific WebSocket setup
    if (!this.connectionState.isConnected) {
      this.clearHealthCheck();
      return;
    }

    // Update connection quality based on response time
    // This is a simplified version - real implementation would measure actual latency
    const timeSinceLastConnect = this.connectionState.lastConnected
      ? Date.now() - this.connectionState.lastConnected.getTime()
      : Infinity;

    if (timeSinceLastConnect < 60000) { // Less than 1 minute
      this.connectionState.connectionQuality = 'excellent';
    } else if (timeSinceLastConnect < 300000) { // Less than 5 minutes
      this.connectionState.connectionQuality = 'good';
    } else {
      this.connectionState.connectionQuality = 'poor';
    }

    this.notifyStateChange();
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectionTimer(): void {
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = undefined;
    }
  }

  /**
   * Clear health check interval
   */
  private clearHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyStateChange(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.connectionState });
      } catch (error) {
        console.error('Error in WebSocket state listener:', error);
      }
    });
  }

  /**
   * Subscribe to connection state changes
   */
  onStateChange(listener: (state: WebSocketConnectionState) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current connection state
   */
  getState(): WebSocketConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Force reconnection
   */
  forceReconnection(): void {
    this.connectionState.reconnectAttempts = 0;
    this.clearReconnectionTimer();
    this.scheduleReconnection();
  }

  /**
   * Set reconnection callback
   */
  setReconnectionCallback(callback: () => Promise<void>): void {
    this.attemptReconnection = async () => {
      this.reconnectionTimer = undefined;
      try {
        await callback();
      } catch (error) {
        this.handleConnectionError(error);
      }
    };
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.clearReconnectionTimer();
    this.clearHealthCheck();
    this.listeners.clear();
  }
}