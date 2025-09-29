/**
 * Resilience Library - Main Entry Point
 * Provides comprehensive error handling, graceful degradation, and recovery mechanisms
 */

export { 
  GracefulDegradationManager,
  ConnectionState,
  OfflineCapability,
  gracefulDegradation,
  type ConnectionStatus,
  type FailedOperation,
  type ReconnectionConfig
} from './graceful-degradation.js';

export {
  WebSocketGracefulDegradation,
  type WebSocketMessage,
  type WebSocketConfig
} from './websocket-degradation.js';

export {
  ErrorRecoveryManager,
  RecoveryStrategy,
  RecoveryResult,
  errorRecovery,
  type RecoveryAction,
  type RecoveryRule,
  type RecoveryAttempt,
  type CircuitBreakerState
} from './error-recovery.js';

// Convenience functions for common operations

/**
 * Initialize resilience systems with error handling
 */
export async function initializeResilience(): Promise<void> {
  try {
    // The managers are already initialized as singletons
    // This function can be used for any additional setup
    console.log('Resilience systems initialized successfully');
  } catch (error) {
    console.error('Failed to initialize resilience systems:', error);
    throw error;
  }
}

/**
 * Handle errors with automatic recovery
 */
export async function handleError(error: Error | string, context?: Record<string, unknown>) {
  const { errorRecovery } = await import('./error-recovery.js');
  return errorRecovery.handleError(error, context);
}

/**
 * Get overall system health status
 */
export function getSystemHealth() {
  // Import the singletons dynamically to avoid circular dependencies
  return import('./graceful-degradation.js').then(({ gracefulDegradation }) => 
    import('./error-recovery.js').then(({ errorRecovery }) => {
      const connectionStatus = gracefulDegradation.getStatus();
      const recoveryStatus = errorRecovery.getRecoveryStatus();
      
      return {
        connection: connectionStatus,
        recovery: recoveryStatus,
        timestamp: new Date(),
        healthy: connectionStatus.state === 'connected' && recoveryStatus.autoRecoveryEnabled
      };
    })
  );
}