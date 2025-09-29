/**
 * Graceful Degradation Manager for Connection Failures
 * Handles WebSocket and network connection failures with fallback mechanisms
 */

import { logger } from '../logging/index.js';
import { websocketAlerting } from '../alerting/index.js';

export enum ConnectionState {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
  DEGRADED = 'degraded',
  OFFLINE = 'offline'
}

export enum OfflineCapability {
  FULL = 'full',
  LIMITED = 'limited',
  NONE = 'none'
}

export interface ConnectionStatus {
  state: ConnectionState;
  lastConnected: Date | null;
  reconnectAttempts: number;
  offlineCapability: OfflineCapability;
  degradedFeatures: string[];
  queuedOperations: number;
}

export interface FailedOperation {
  id: string;
  type: string;
  data: unknown;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
}

export interface ReconnectionConfig {
  maxAttempts: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  backoffMultiplier: number;
  jitterEnabled: boolean;
}

export class GracefulDegradationManager {
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private lastConnected: Date | null = null;
  private reconnectAttempts = 0;
  private operationQueue: FailedOperation[] = [];
  private reconnectTimer?: NodeJS.Timeout;
  private connectionStatusCallbacks = new Set<(status: ConnectionStatus) => void>();
  private degradedFeatures = new Set<string>();

  private readonly config: ReconnectionConfig = {
    maxAttempts: 10,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 1.5,
    jitterEnabled: true
  };

  constructor(config?: Partial<ReconnectionConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.initializeOfflineDetection();
    logger.info('Graceful degradation manager initialized', { component: 'degradation' });
  }

  /**
   * Initialize offline/online detection
   */
  private initializeOfflineDetection(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        logger.info('Network connectivity restored', { component: 'degradation' });
        this.handleNetworkRestored();
      });

      window.addEventListener('offline', () => {
        logger.warn('Network connectivity lost', { component: 'degradation' });
        this.handleNetworkLost();
      });

      // Check initial network state
      if (!navigator.onLine) {
        this.setConnectionState(ConnectionState.OFFLINE);
      }
    }
  }

  /**
   * Handle successful connection
   */
  onConnectionEstablished(): void {
    this.connectionState = ConnectionState.CONNECTED;
    this.lastConnected = new Date();
    this.reconnectAttempts = 0;
    this.degradedFeatures.clear();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    logger.info('Connection established successfully', { component: 'degradation' });
    
    // Process queued operations
    this.processQueuedOperations();
    this.notifyStatusChange();
  }

  /**
   * Handle connection failure
   */
  onConnectionFailed(error?: Error): void {
    const wasConnected = this.connectionState === ConnectionState.CONNECTED;
    
    this.setConnectionState(ConnectionState.DISCONNECTED);
    
    // Track failure for alerting
    websocketAlerting.trackConnectionFailure(error);
    
    logger.warn('Connection failed', { component: 'degradation' }, {
      error: error?.message,
      reconnectAttempts: this.reconnectAttempts,
      wasConnected
    });

    // Start reconnection process
    this.scheduleReconnection();
    
    // Enable degraded mode if this was an unexpected disconnection
    if (wasConnected) {
      this.enableDegradedMode();
    }
  }

  /**
   * Handle network connectivity loss
   */
  private handleNetworkLost(): void {
    this.setConnectionState(ConnectionState.OFFLINE);
    this.enableOfflineMode();
  }

  /**
   * Handle network connectivity restoration
   */
  private handleNetworkRestored(): void {
    if (this.connectionState === ConnectionState.OFFLINE) {
      this.setConnectionState(ConnectionState.DISCONNECTED);
      this.scheduleReconnection();
    }
  }

  /**
   * Set connection state and notify listeners
   */
  private setConnectionState(state: ConnectionState): void {
    const previousState = this.connectionState;
    this.connectionState = state;
    
    if (previousState !== state) {
      logger.info('Connection state changed', { component: 'degradation' }, {
        from: previousState,
        to: state
      });
      this.notifyStatusChange();
    }
  }

  /**
   * Schedule reconnection attempt with exponential backoff
   */
  private scheduleReconnection(): void {
    if (this.reconnectAttempts >= this.config.maxAttempts) {
      logger.error('Maximum reconnection attempts reached', { component: 'degradation' }, {
        maxAttempts: this.config.maxAttempts
      });
      this.enableOfflineMode();
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.calculateReconnectDelay();
    this.reconnectAttempts++;

    logger.info('Scheduling reconnection attempt', { component: 'degradation' }, {
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxAttempts,
      delay
    });

    this.setConnectionState(ConnectionState.CONNECTING);

    this.reconnectTimer = setTimeout(() => {
      this.attemptReconnection();
    }, delay);
  }

  /**
   * Calculate reconnection delay with exponential backoff and jitter
   */
  private calculateReconnectDelay(): number {
    const exponentialDelay = Math.min(
      this.config.baseDelay * Math.pow(this.config.backoffMultiplier, this.reconnectAttempts - 1),
      this.config.maxDelay
    );

    if (this.config.jitterEnabled) {
      // Add ±25% jitter to prevent thundering herd
      const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
      return Math.max(exponentialDelay + jitter, 0);
    }

    return exponentialDelay;
  }

  /**
   * Attempt to reconnect (to be implemented by specific connection managers)
   */
  private attemptReconnection(): void {
    logger.info('Attempting reconnection', { component: 'degradation' }, {
      attempt: this.reconnectAttempts
    });

    // This should be overridden by specific implementations
    // For now, we'll simulate a reconnection attempt
    this.onReconnectionAttempt();
  }

  /**
   * Called when a reconnection attempt is made (override this in specific implementations)
   */
  protected onReconnectionAttempt(): void {
    // Override this method in specific implementations
    logger.debug('Reconnection attempt hook called', { component: 'degradation' });
  }

  /**
   * Enable degraded mode with limited functionality
   */
  private enableDegradedMode(): void {
    this.setConnectionState(ConnectionState.DEGRADED);
    
    // Define degraded features
    this.degradedFeatures.add('real-time-updates');
    this.degradedFeatures.add('live-collaboration');
    this.degradedFeatures.add('instant-notifications');

    logger.warn('Degraded mode enabled', { component: 'degradation' }, {
      degradedFeatures: Array.from(this.degradedFeatures)
    });
  }

  /**
   * Enable offline mode with cached data
   */
  private enableOfflineMode(): void {
    this.setConnectionState(ConnectionState.OFFLINE);
    
    // Add all features that require connectivity as degraded
    this.degradedFeatures.add('real-time-updates');
    this.degradedFeatures.add('live-collaboration');
    this.degradedFeatures.add('instant-notifications');
    this.degradedFeatures.add('data-sync');
    this.degradedFeatures.add('file-upload');

    logger.warn('Offline mode enabled', { component: 'degradation' }, {
      degradedFeatures: Array.from(this.degradedFeatures)
    });
  }

  /**
   * Queue an operation that failed due to connection issues
   */
  queueFailedOperation(
    type: string,
    data: unknown,
    priority: 'high' | 'medium' | 'low' = 'medium',
    maxRetries = 3
  ): string {
    const operation: FailedOperation = {
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries,
      priority
    };

    this.operationQueue.push(operation);
    
    // Sort queue by priority (high -> medium -> low) and timestamp
    this.operationQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    logger.info('Operation queued for retry', { component: 'degradation' }, {
      operationId: operation.id,
      type: operation.type,
      priority: operation.priority,
      queueSize: this.operationQueue.length
    });

    this.notifyStatusChange();
    return operation.id;
  }

  /**
   * Process queued operations when connection is restored
   */
  private async processQueuedOperations(): Promise<void> {
    if (this.operationQueue.length === 0) return;

    logger.info('Processing queued operations', { component: 'degradation' }, {
      queueSize: this.operationQueue.length
    });

    const operations = [...this.operationQueue];
    this.operationQueue = [];

    for (const operation of operations) {
      try {
        await this.retryOperation(operation);
      } catch (error) {
        logger.error('Failed to retry operation', { component: 'degradation' }, {
          operationId: operation.id,
          error: error instanceof Error ? error.message : String(error)
        });

        // Re-queue if retries remaining
        if (operation.retryCount < operation.maxRetries) {
          operation.retryCount++;
          this.operationQueue.push(operation);
        }
      }
    }

    this.notifyStatusChange();
  }

  /**
   * Retry a specific operation (override this in specific implementations)
   */
  protected async retryOperation(operation: FailedOperation): Promise<void> {
    // Override this method in specific implementations
    logger.debug('Retrying operation', { component: 'degradation' }, {
      operationId: operation.id,
      type: operation.type,
      retryCount: operation.retryCount
    });
  }

  /**
   * Remove an operation from the queue
   */
  removeQueuedOperation(operationId: string): boolean {
    const index = this.operationQueue.findIndex(op => op.id === operationId);
    if (index !== -1) {
      this.operationQueue.splice(index, 1);
      this.notifyStatusChange();
      return true;
    }
    return false;
  }

  /**
   * Clear all queued operations
   */
  clearQueue(): void {
    const queueSize = this.operationQueue.length;
    this.operationQueue = [];
    
    logger.info('Operation queue cleared', { component: 'degradation' }, { queueSize });
    this.notifyStatusChange();
  }

  /**
   * Check if a feature is available in current state
   */
  isFeatureAvailable(feature: string): boolean {
    return !this.degradedFeatures.has(feature);
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return {
      state: this.connectionState,
      lastConnected: this.lastConnected,
      reconnectAttempts: this.reconnectAttempts,
      offlineCapability: this.getOfflineCapability(),
      degradedFeatures: Array.from(this.degradedFeatures),
      queuedOperations: this.operationQueue.length
    };
  }

  /**
   * Determine offline capability based on current state
   */
  private getOfflineCapability(): OfflineCapability {
    switch (this.connectionState) {
      case ConnectionState.CONNECTED:
        return OfflineCapability.FULL;
      case ConnectionState.DEGRADED:
        return OfflineCapability.LIMITED;
      case ConnectionState.OFFLINE:
        return OfflineCapability.LIMITED;
      default:
        return OfflineCapability.NONE;
    }
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.connectionStatusCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.connectionStatusCallbacks.delete(callback);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        logger.error('Error in status change callback', { component: 'degradation' }, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  /**
   * Force a reconnection attempt
   */
  forceReconnection(): void {
    logger.info('Forcing reconnection attempt', { component: 'degradation' });
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    this.reconnectAttempts = 0;
    this.scheduleReconnection();
  }

  /**
   * Get queued operations for debugging/monitoring
   */
  getQueuedOperations(): FailedOperation[] {
    return [...this.operationQueue];
  }

  /**
   * Reset the degradation manager
   */
  reset(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    this.connectionState = ConnectionState.DISCONNECTED;
    this.lastConnected = null;
    this.reconnectAttempts = 0;
    this.operationQueue = [];
    this.degradedFeatures.clear();
    
    logger.info('Graceful degradation manager reset', { component: 'degradation' });
    this.notifyStatusChange();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.connectionStatusCallbacks.clear();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleNetworkRestored);
      window.removeEventListener('offline', this.handleNetworkLost);
    }
    
    logger.info('Graceful degradation manager cleaned up', { component: 'degradation' });
  }
}

// Create singleton instance
export const gracefulDegradation = new GracefulDegradationManager();