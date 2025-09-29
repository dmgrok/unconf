/**
 * Error Recovery Mechanisms for System Failures
 * Provides automated and manual error recovery capabilities
 */

import { logger } from '../logging/index.js';
import { gracefulDegradation } from './graceful-degradation.js';

export enum RecoveryStrategy {
  RETRY = 'retry',
  RESTART = 'restart',
  FALLBACK = 'fallback',
  MANUAL = 'manual',
  CIRCUIT_BREAKER = 'circuit_breaker'
}

export enum RecoveryResult {
  SUCCESS = 'success',
  FAILED = 'failed',
  PARTIAL = 'partial',
  SKIPPED = 'skipped'
}

export interface RecoveryAction {
  id: string;
  name: string;
  description: string;
  strategy: RecoveryStrategy;
  execute: () => Promise<RecoveryResult>;
  canExecute?: () => boolean;
  priority: number; // Lower number = higher priority
  maxAttempts?: number;
  cooldownMs?: number; // Minimum time between attempts
}

export interface RecoveryRule {
  id: string;
  name: string;
  description: string;
  pattern: string | RegExp;
  actions: string[]; // RecoveryAction IDs
  enabled: boolean;
  automatic: boolean; // If true, execute automatically
  maxAutoAttempts: number;
  escalateAfterFailures: number;
}

export interface RecoveryAttempt {
  id: string;
  ruleId: string;
  actionId: string;
  timestamp: Date;
  result: RecoveryResult;
  error?: string;
  duration: number; // milliseconds
  automatic: boolean;
}

export interface CircuitBreakerState {
  name: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  failureThreshold: number;
  timeout: number; // milliseconds
  lastFailureTime?: Date;
  successCount?: number; // For half-open state
}

export class ErrorRecoveryManager {
  private recoveryActions = new Map<string, RecoveryAction>();
  private recoveryRules = new Map<string, RecoveryRule>();
  private recoveryHistory: RecoveryAttempt[] = [];
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private actionCooldowns = new Map<string, Date>();
  private autoRecoveryEnabled = true;

  constructor() {
    this.initializeDefaultActions();
    this.initializeDefaultRules();
    this.initializeDefaultCircuitBreakers();
    
    logger.info('Error recovery manager initialized', { component: 'error-recovery' });
  }

  /**
   * Initialize default recovery actions
   */
  private initializeDefaultActions(): void {
    // WebSocket reconnection
    this.registerAction({
      id: 'websocket-reconnect',
      name: 'WebSocket Reconnection',
      description: 'Force WebSocket reconnection',
      strategy: RecoveryStrategy.RESTART,
      priority: 1,
      maxAttempts: 5,
      cooldownMs: 5000,
      execute: async () => {
        try {
          gracefulDegradation.forceReconnection();
          // Wait a moment to see if connection succeeds
          await new Promise(resolve => setTimeout(resolve, 2000));
          const status = gracefulDegradation.getStatus();
          return status.state === 'connected' ? RecoveryResult.SUCCESS : RecoveryResult.FAILED;
        } catch (error) {
          logger.error('WebSocket reconnection failed', { component: 'error-recovery' }, {
            error: error instanceof Error ? error.message : String(error)
          });
          return RecoveryResult.FAILED;
        }
      }
    });

    // Clear operation queue
    this.registerAction({
      id: 'clear-operation-queue',
      name: 'Clear Operation Queue',
      description: 'Clear queued operations to prevent memory leaks',
      strategy: RecoveryStrategy.FALLBACK,
      priority: 3,
      maxAttempts: 1,
      cooldownMs: 10000,
      execute: async () => {
        try {
          gracefulDegradation.clearQueue();
          logger.info('Operation queue cleared successfully', { component: 'error-recovery' });
          return RecoveryResult.SUCCESS;
        } catch (error) {
          logger.error('Failed to clear operation queue', { component: 'error-recovery' }, {
            error: error instanceof Error ? error.message : String(error)
          });
          return RecoveryResult.FAILED;
        }
      }
    });

    // System refresh
    this.registerAction({
      id: 'system-refresh',
      name: 'System Refresh',
      description: 'Refresh system state and clear caches',
      strategy: RecoveryStrategy.RESTART,
      priority: 4,
      maxAttempts: 1,
      cooldownMs: 30000,
      execute: async () => {
        try {
          // Clear various caches and reset states
          gracefulDegradation.reset();
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
          
          logger.info('System refresh completed', { component: 'error-recovery' });
          return RecoveryResult.SUCCESS;
        } catch (error) {
          logger.error('System refresh failed', { component: 'error-recovery' }, {
            error: error instanceof Error ? error.message : String(error)
          });
          return RecoveryResult.FAILED;
        }
      }
    });

    // Page reload (client-side only)
    this.registerAction({
      id: 'page-reload',
      name: 'Page Reload',
      description: 'Reload the current page (last resort)',
      strategy: RecoveryStrategy.RESTART,
      priority: 10,
      maxAttempts: 1,
      cooldownMs: 60000,
      canExecute: () => typeof window !== 'undefined',
      execute: async () => {
        try {
          if (typeof window !== 'undefined') {
            logger.warn('Initiating page reload for error recovery', { component: 'error-recovery' });
            window.location.reload();
            return RecoveryResult.SUCCESS;
          }
          return RecoveryResult.SKIPPED;
        } catch (error) {
          logger.error('Page reload failed', { component: 'error-recovery' }, {
            error: error instanceof Error ? error.message : String(error)
          });
          return RecoveryResult.FAILED;
        }
      }
    });
  }

  /**
   * Initialize default recovery rules
   */
  private initializeDefaultRules(): void {
    // WebSocket connection failures
    this.registerRule({
      id: 'websocket-connection-failure',
      name: 'WebSocket Connection Failure',
      description: 'Handle WebSocket connection failures',
      pattern: /websocket.*(?:connection|failed|error|closed)/i,
      actions: ['websocket-reconnect'],
      enabled: true,
      automatic: true,
      maxAutoAttempts: 3,
      escalateAfterFailures: 5
    });

    // Memory pressure
    this.registerRule({
      id: 'memory-pressure',
      name: 'Memory Pressure',
      description: 'Handle memory pressure and potential leaks',
      pattern: /(?:memory|heap|out of memory|allocation)/i,
      actions: ['clear-operation-queue', 'system-refresh'],
      enabled: true,
      automatic: true,
      maxAutoAttempts: 2,
      escalateAfterFailures: 3
    });

    // Network errors
    this.registerRule({
      id: 'network-errors',
      name: 'Network Errors',
      description: 'Handle various network-related errors',
      pattern: /(?:network|timeout|dns|connection refused|unreachable)/i,
      actions: ['websocket-reconnect', 'clear-operation-queue'],
      enabled: true,
      automatic: true,
      maxAutoAttempts: 5,
      escalateAfterFailures: 10
    });

    // Critical system errors
    this.registerRule({
      id: 'critical-system-errors',
      name: 'Critical System Errors',
      description: 'Handle critical system errors requiring manual intervention',
      pattern: /(?:critical|fatal|segmentation fault|internal error|corrupt)/i,
      actions: ['system-refresh', 'page-reload'],
      enabled: true,
      automatic: false, // Require manual approval
      maxAutoAttempts: 0,
      escalateAfterFailures: 1
    });
  }

  /**
   * Initialize default circuit breakers
   */
  private initializeDefaultCircuitBreakers(): void {
    this.createCircuitBreaker('websocket-connection', {
      failureThreshold: 5,
      timeout: 30000 // 30 seconds
    });

    this.createCircuitBreaker('api-calls', {
      failureThreshold: 10,
      timeout: 60000 // 1 minute
    });

    this.createCircuitBreaker('database-operations', {
      failureThreshold: 3,
      timeout: 120000 // 2 minutes
    });
  }

  /**
   * Register a recovery action
   */
  registerAction(action: RecoveryAction): void {
    this.recoveryActions.set(action.id, action);
    logger.debug('Recovery action registered', { component: 'error-recovery' }, {
      actionId: action.id,
      name: action.name,
      strategy: action.strategy
    });
  }

  /**
   * Register a recovery rule
   */
  registerRule(rule: RecoveryRule): void {
    this.recoveryRules.set(rule.id, rule);
    logger.debug('Recovery rule registered', { component: 'error-recovery' }, {
      ruleId: rule.id,
      name: rule.name,
      automatic: rule.automatic
    });
  }

  /**
   * Handle an error and attempt recovery
   */
  async handleError(error: Error | string, context?: Record<string, unknown>): Promise<RecoveryResult> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('Error reported to recovery manager', { component: 'error-recovery' }, {
      error: errorMessage,
      context
    });

    // Find matching recovery rules
    const matchingRules = this.findMatchingRules(errorMessage);
    
    if (matchingRules.length === 0) {
      logger.warn('No recovery rules match error', { component: 'error-recovery' }, {
        error: errorMessage
      });
      return RecoveryResult.SKIPPED;
    }

    let overallResult = RecoveryResult.FAILED;

    for (const rule of matchingRules) {
      if (!rule.enabled) {
        logger.debug('Recovery rule disabled, skipping', { component: 'error-recovery' }, {
          ruleId: rule.id
        });
        continue;
      }

      const result = await this.executeRecoveryRule(rule, errorMessage);
      
      if (result === RecoveryResult.SUCCESS) {
        overallResult = RecoveryResult.SUCCESS;
        break; // Stop on first successful recovery
      } else if (result === RecoveryResult.PARTIAL) {
        if (overallResult === RecoveryResult.FAILED) {
          overallResult = RecoveryResult.PARTIAL;
        }
      }
    }

    return overallResult;
  }

  /**
   * Find recovery rules that match an error message
   */
  private findMatchingRules(errorMessage: string): RecoveryRule[] {
    const matchingRules: RecoveryRule[] = [];

    for (const rule of this.recoveryRules.values()) {
      let matches = false;

      if (typeof rule.pattern === 'string') {
        matches = errorMessage.toLowerCase().includes(rule.pattern.toLowerCase());
      } else {
        matches = rule.pattern.test(errorMessage);
      }

      if (matches) {
        matchingRules.push(rule);
      }
    }

    // Sort by priority (rules with more failures get higher priority)
    matchingRules.sort((a, b) => {
      const aFailures = this.getRuleFailureCount(a.id);
      const bFailures = this.getRuleFailureCount(b.id);
      return bFailures - aFailures;
    });

    return matchingRules;
  }

  /**
   * Execute a recovery rule
   */
  private async executeRecoveryRule(rule: RecoveryRule, errorMessage: string): Promise<RecoveryResult> {
    const autoAttempts = this.getAutoAttemptCount(rule.id);
    
    // Check if we've exceeded auto attempts
    if (rule.automatic && autoAttempts >= rule.maxAutoAttempts) {
      logger.warn('Maximum auto attempts reached for rule', { component: 'error-recovery' }, {
        ruleId: rule.id,
        autoAttempts,
        maxAutoAttempts: rule.maxAutoAttempts
      });
      
      // Escalate to alerting if needed
      const failures = this.getRuleFailureCount(rule.id);
      if (failures >= rule.escalateAfterFailures) {
        await this.escalateToAlerting(rule, errorMessage);
      }
      
      return RecoveryResult.SKIPPED;
    }

    let overallResult = RecoveryResult.FAILED;
    const successfulActions: string[] = [];

    for (const actionId of rule.actions) {
      const action = this.recoveryActions.get(actionId);
      
      if (!action) {
        logger.warn('Recovery action not found', { component: 'error-recovery' }, {
          actionId,
          ruleId: rule.id
        });
        continue;
      }

      // Check if action can be executed
      if (action.canExecute && !action.canExecute()) {
        logger.debug('Recovery action cannot be executed', { component: 'error-recovery' }, {
          actionId: action.id
        });
        continue;
      }

      // Check cooldown
      if (this.isActionOnCooldown(actionId)) {
        logger.debug('Recovery action on cooldown', { component: 'error-recovery' }, {
          actionId: action.id
        });
        continue;
      }

      const result = await this.executeRecoveryAction(action, rule.id, rule.automatic);
      
      if (result === RecoveryResult.SUCCESS) {
        successfulActions.push(actionId);
        overallResult = RecoveryResult.SUCCESS;
        break; // Stop on first successful action
      } else if (result === RecoveryResult.PARTIAL) {
        if (overallResult === RecoveryResult.FAILED) {
          overallResult = RecoveryResult.PARTIAL;
        }
      }
    }

    // Log rule execution result
    logger.info('Recovery rule executed', { component: 'error-recovery' }, {
      ruleId: rule.id,
      result: overallResult,
      successfulActions,
      automatic: rule.automatic
    });

    return overallResult;
  }

  /**
   * Execute a single recovery action
   */
  private async executeRecoveryAction(
    action: RecoveryAction,
    ruleId: string,
    automatic: boolean
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const attemptId = `attempt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Executing recovery action', { component: 'error-recovery' }, {
      attemptId,
      actionId: action.id,
      actionName: action.name,
      strategy: action.strategy,
      automatic
    });

    try {
      const result = await action.execute();
      const duration = Date.now() - startTime;

      // Record attempt
      const attempt: RecoveryAttempt = {
        id: attemptId,
        ruleId,
        actionId: action.id,
        timestamp: new Date(),
        result,
        duration,
        automatic
      };

      this.recoveryHistory.push(attempt);

      // Apply cooldown
      if (action.cooldownMs) {
        this.actionCooldowns.set(action.id, new Date(Date.now() + action.cooldownMs));
      }

      // Update circuit breaker
      this.updateCircuitBreaker(action.id, result === RecoveryResult.SUCCESS);

      logger.info('Recovery action completed', { component: 'error-recovery' }, {
        attemptId,
        actionId: action.id,
        result,
        duration
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Record failed attempt
      const attempt: RecoveryAttempt = {
        id: attemptId,
        ruleId,
        actionId: action.id,
        timestamp: new Date(),
        result: RecoveryResult.FAILED,
        error: errorMessage,
        duration,
        automatic
      };

      this.recoveryHistory.push(attempt);

      // Update circuit breaker
      this.updateCircuitBreaker(action.id, false);

      logger.error('Recovery action failed', { component: 'error-recovery' }, {
        attemptId,
        actionId: action.id,
        error: errorMessage,
        duration
      });

      return RecoveryResult.FAILED;
    }
  }

  /**
   * Check if an action is on cooldown
   */
  private isActionOnCooldown(actionId: string): boolean {
    const cooldownEnd = this.actionCooldowns.get(actionId);
    if (!cooldownEnd) return false;
    
    const now = new Date();
    if (now >= cooldownEnd) {
      this.actionCooldowns.delete(actionId);
      return false;
    }
    
    return true;
  }

  /**
   * Get the number of automatic attempts for a rule
   */
  private getAutoAttemptCount(ruleId: string): number {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return this.recoveryHistory.filter(attempt => 
      attempt.ruleId === ruleId &&
      attempt.automatic &&
      attempt.timestamp >= oneDayAgo
    ).length;
  }

  /**
   * Get the number of failures for a rule
   */
  private getRuleFailureCount(ruleId: string): number {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return this.recoveryHistory.filter(attempt => 
      attempt.ruleId === ruleId &&
      attempt.result === RecoveryResult.FAILED &&
      attempt.timestamp >= oneDayAgo
    ).length;
  }

  /**
   * Escalate to alerting system
   */
  private async escalateToAlerting(rule: RecoveryRule, errorMessage: string): Promise<void> {
    try {
      // Create an alert entry
      const alertData = {
        type: 'error-recovery-escalation',
        severity: 'critical',
        message: `Recovery rule "${rule.name}" has reached escalation threshold`,
        context: {
          ruleId: rule.id,
          ruleName: rule.name,
          originalError: errorMessage,
          failureCount: this.getRuleFailureCount(rule.id),
          escalationThreshold: rule.escalateAfterFailures
        },
        timestamp: new Date()
      };

      // Log the escalation
      logger.error('Recovery escalated - manual intervention required', { component: 'error-recovery' }, alertData);

      // Here you could integrate with your alerting system
      // For now, we'll just log the escalation

    } catch (error) {
      logger.error('Failed to escalate to alerting', { component: 'error-recovery' }, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Create a circuit breaker
   */
  createCircuitBreaker(name: string, options: {
    failureThreshold: number;
    timeout: number;
  }): void {
    this.circuitBreakers.set(name, {
      name,
      state: 'closed',
      failureCount: 0,
      failureThreshold: options.failureThreshold,
      timeout: options.timeout
    });

    logger.debug('Circuit breaker created', { component: 'error-recovery' }, {
      name,
      failureThreshold: options.failureThreshold,
      timeout: options.timeout
    });
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(name: string, success: boolean): void {
    const breaker = this.circuitBreakers.get(name);
    if (!breaker) return;

    if (success) {
      if (breaker.state === 'half-open') {
        breaker.successCount = (breaker.successCount || 0) + 1;
        if (breaker.successCount >= 3) { // Reset after 3 successes
          breaker.state = 'closed';
          breaker.failureCount = 0;
          breaker.successCount = 0;
          logger.info('Circuit breaker closed after successful recovery', { component: 'error-recovery' }, {
            name: breaker.name
          });
        }
      } else if (breaker.state === 'closed') {
        breaker.failureCount = Math.max(0, breaker.failureCount - 1);
      }
    } else {
      breaker.failureCount++;
      breaker.lastFailureTime = new Date();

      if (breaker.state === 'closed' && breaker.failureCount >= breaker.failureThreshold) {
        breaker.state = 'open';
        logger.warn('Circuit breaker opened due to failure threshold', { component: 'error-recovery' }, {
          name: breaker.name,
          failureCount: breaker.failureCount,
          threshold: breaker.failureThreshold
        });
      } else if (breaker.state === 'half-open') {
        breaker.state = 'open';
        breaker.successCount = 0;
        logger.warn('Circuit breaker reopened after failure in half-open state', { component: 'error-recovery' }, {
          name: breaker.name
        });
      }
    }

    // Check if open circuit breaker should transition to half-open
    if (breaker.state === 'open' && breaker.lastFailureTime) {
      const timeSinceFailure = Date.now() - breaker.lastFailureTime.getTime();
      if (timeSinceFailure >= breaker.timeout) {
        breaker.state = 'half-open';
        breaker.successCount = 0;
        logger.info('Circuit breaker transitioned to half-open', { component: 'error-recovery' }, {
          name: breaker.name
        });
      }
    }
  }

  /**
   * Check if circuit breaker allows execution
   */
  isCircuitBreakerClosed(name: string): boolean {
    const breaker = this.circuitBreakers.get(name);
    if (!breaker) return true; // Allow if no breaker exists
    
    return breaker.state !== 'open';
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(name: string): CircuitBreakerState | undefined {
    return this.circuitBreakers.get(name);
  }

  /**
   * Manually execute a recovery action
   */
  async executeManualRecovery(actionId: string): Promise<RecoveryResult> {
    const action = this.recoveryActions.get(actionId);
    
    if (!action) {
      logger.error('Recovery action not found for manual execution', { component: 'error-recovery' }, {
        actionId
      });
      return RecoveryResult.FAILED;
    }

    logger.info('Manual recovery action requested', { component: 'error-recovery' }, {
      actionId,
      actionName: action.name
    });

    return this.executeRecoveryAction(action, 'manual', false);
  }

  /**
   * Get recovery status and statistics
   */
  getRecoveryStatus() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentHistory = this.recoveryHistory.filter(attempt => attempt.timestamp >= oneDayAgo);
    const hourlyHistory = this.recoveryHistory.filter(attempt => attempt.timestamp >= oneHourAgo);

    return {
      autoRecoveryEnabled: this.autoRecoveryEnabled,
      totalActions: this.recoveryActions.size,
      totalRules: this.recoveryRules.size,
      totalCircuitBreakers: this.circuitBreakers.size,
      recoveryHistory: {
        total: this.recoveryHistory.length,
        last24Hours: recentHistory.length,
        lastHour: hourlyHistory.length,
        successRate24h: recentHistory.length > 0 
          ? (recentHistory.filter(a => a.result === RecoveryResult.SUCCESS).length / recentHistory.length) 
          : 0
      },
      circuitBreakers: Array.from(this.circuitBreakers.values()),
      recentAttempts: this.recoveryHistory.slice(-10) // Last 10 attempts
    };
  }

  /**
   * Enable or disable automatic recovery
   */
  setAutoRecoveryEnabled(enabled: boolean): void {
    this.autoRecoveryEnabled = enabled;
    logger.info('Auto recovery toggled', { component: 'error-recovery' }, { enabled });
  }

  /**
   * Get available recovery actions
   */
  getAvailableActions(): RecoveryAction[] {
    return Array.from(this.recoveryActions.values());
  }

  /**
   * Get recovery rules
   */
  getRecoveryRules(): RecoveryRule[] {
    return Array.from(this.recoveryRules.values());
  }

  /**
   * Clear recovery history (keep only recent entries)
   */
  clearOldHistory(daysToKeep = 7): void {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const originalLength = this.recoveryHistory.length;
    
    this.recoveryHistory = this.recoveryHistory.filter(attempt => attempt.timestamp >= cutoffDate);
    
    const removedCount = originalLength - this.recoveryHistory.length;
    if (removedCount > 0) {
      logger.info('Recovery history cleaned up', { component: 'error-recovery' }, {
        removedEntries: removedCount,
        remainingEntries: this.recoveryHistory.length,
        daysToKeep
      });
    }
  }
}

// Create singleton instance
export const errorRecovery = new ErrorRecoveryManager();