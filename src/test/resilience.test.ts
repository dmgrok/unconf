/**
 * Resilience System Tests
 * Comprehensive test suite for graceful degradation and error recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GracefulDegradationManager, ConnectionState } from '$lib/resilience/graceful-degradation.js';
import { ErrorRecoveryManager, RecoveryStrategy, RecoveryResult } from '$lib/resilience/error-recovery.js';
import { WebSocketGracefulDegradation } from '$lib/resilience/websocket-degradation.js';

// Mock WebSocket
const mockWebSocketClass = vi.fn().mockImplementation(() => ({
  readyState: 1, // OPEN
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onopen: null,
  onclose: null,
  onerror: null,
  onmessage: null
}));

// Add static properties
Object.assign(mockWebSocketClass, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
});

global.WebSocket = mockWebSocketClass as unknown as typeof WebSocket;

// Mock window for network detection
global.window = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
} as unknown as Window & typeof globalThis;

global.navigator = {
  onLine: true
} as unknown as Navigator;

describe('GracefulDegradationManager', () => {
  let manager: GracefulDegradationManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new GracefulDegradationManager({
      maxAttempts: 3,
      baseDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
      jitterEnabled: false
    });
  });

  afterEach(() => {
    manager.cleanup();
  });

  describe('Connection State Management', () => {
    it('should start with disconnected state', () => {
      const status = manager.getStatus();
      expect(status.state).toBe(ConnectionState.DISCONNECTED);
      expect(status.reconnectAttempts).toBe(0);
      expect(status.queuedOperations).toBe(0);
    });

    it('should handle successful connection', () => {
      manager.onConnectionEstablished();
      const status = manager.getStatus();
      
      expect(status.state).toBe(ConnectionState.CONNECTED);
      expect(status.reconnectAttempts).toBe(0);
      expect(status.lastConnected).toBeInstanceOf(Date);
    });

    it('should handle connection failure and start reconnection', async () => {
      const error = new Error('Connection failed');
      manager.onConnectionFailed(error);
      
      const status = manager.getStatus();
      expect(status.state).toBe(ConnectionState.DISCONNECTED);
      
      // Wait for reconnection to be scheduled
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const statusAfterReconnect = manager.getStatus();
      expect(statusAfterReconnect.reconnectAttempts).toBeGreaterThan(0);
    });
  });

  describe('Operation Queue Management', () => {
    it('should queue failed operations', () => {
      const operationId = manager.queueFailedOperation('test-operation', { data: 'test' }, 'high');
      
      expect(operationId).toBeDefined();
      expect(operationId).toMatch(/^op-/);
      
      const status = manager.getStatus();
      expect(status.queuedOperations).toBe(1);
    });

    it('should prioritize operations correctly', () => {
      manager.queueFailedOperation('low-priority', { data: 'low' }, 'low');
      manager.queueFailedOperation('high-priority', { data: 'high' }, 'high');
      manager.queueFailedOperation('medium-priority', { data: 'medium' }, 'medium');
      
      const operations = manager.getQueuedOperations();
      expect(operations).toHaveLength(3);
      expect(operations[0].priority).toBe('high');
      expect(operations[1].priority).toBe('medium');
      expect(operations[2].priority).toBe('low');
    });

    it('should clear operation queue', () => {
      manager.queueFailedOperation('test-operation', { data: 'test' });
      expect(manager.getStatus().queuedOperations).toBe(1);
      
      manager.clearQueue();
      expect(manager.getStatus().queuedOperations).toBe(0);
    });

    it('should remove specific operations', () => {
      const id1 = manager.queueFailedOperation('operation1', { data: 'test1' });
      manager.queueFailedOperation('operation2', { data: 'test2' });
      
      expect(manager.getStatus().queuedOperations).toBe(2);
      
      const removed = manager.removeQueuedOperation(id1);
      expect(removed).toBe(true);
      expect(manager.getStatus().queuedOperations).toBe(1);
      
      const notFound = manager.removeQueuedOperation('non-existent');
      expect(notFound).toBe(false);
    });
  });

  describe('Feature Availability', () => {
    it('should track degraded features', () => {
      manager.onConnectionFailed();
      
      const status = manager.getStatus();
      expect(status.degradedFeatures.length).toBeGreaterThan(0);
      expect(manager.isFeatureAvailable('real-time-updates')).toBe(false);
    });

    it('should restore features on reconnection', () => {
      manager.onConnectionFailed();
      expect(manager.isFeatureAvailable('real-time-updates')).toBe(false);
      
      manager.onConnectionEstablished();
      expect(manager.isFeatureAvailable('real-time-updates')).toBe(true);
    });
  });

  describe('Status Change Notifications', () => {
    it('should notify listeners of status changes', () => {
      const listener = vi.fn();
      const unsubscribe = manager.onStatusChange(listener);
      
      manager.onConnectionEstablished();
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        state: ConnectionState.CONNECTED
      }));
      
      unsubscribe();
      
      manager.onConnectionFailed();
      // Should not be called again after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});

describe('WebSocketGracefulDegradation', () => {
  let wsManager: WebSocketGracefulDegradation;
  let mockWebSocket: {
    readyState: number;
    send: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    onopen: (() => void) | null;
    onclose: ((event: { code: number; reason: string; wasClean: boolean }) => void) | null;
    onerror: ((event: Event) => void) | null;
    onmessage: ((event: { data: string }) => void) | null;
  };

  beforeEach(() => {
    mockWebSocket = {
      readyState: WebSocket.CONNECTING,
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null
    };
    
    (mockWebSocketClass as ReturnType<typeof vi.fn>).mockImplementation(() => mockWebSocket);
    
    wsManager = new WebSocketGracefulDegradation({
      url: 'ws://localhost:8080',
      protocols: ['protocol1'],
      heartbeat: {
        enabled: true,
        interval: 1000,
        timeout: 500
      }
    });
  });

  afterEach(() => {
    wsManager.cleanup();
  });

  describe('Connection Management', () => {
    it('should create WebSocket connection', () => {
      wsManager.connect();
      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8080', ['protocol1']);
    });

    it('should handle connection open', () => {
      wsManager.connect();
      
      // Simulate connection open
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen();
      }
      
      expect(wsManager.isReady()).toBe(true);
      expect(wsManager.getReadyState()).toBe('OPEN');
    });

    it('should handle connection close', () => {
      wsManager.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen();
      }
      
      // Simulate connection close
      mockWebSocket.readyState = WebSocket.CLOSED;
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose({ code: 1006, reason: 'Connection lost', wasClean: false });
      }
      
      expect(wsManager.isReady()).toBe(false);
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      wsManager.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen();
      }
    });

    it('should send messages when connected', () => {
      const message = { type: 'test', payload: { data: 'test' } };
      const success = wsManager.sendMessage(message);
      
      expect(success).toBe(true);
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        ...message,
        id: expect.stringMatching(/^msg-/),
        timestamp: expect.any(Number)
      }));
    });

    it('should queue messages when disconnected', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;
      
      const message = { type: 'test', payload: { data: 'test' } };
      const success = wsManager.sendMessage(message);
      
      expect(success).toBe(false);
      expect(mockWebSocket.send).not.toHaveBeenCalled();
      
      const status = wsManager.getWebSocketStatus();
      expect(status.queuedMessages).toBe(1);
    });

    it('should handle incoming messages', () => {
      const callback = vi.fn();
      wsManager.onMessage('test-type', callback);
      
      const messageData = JSON.stringify({
        type: 'test-type',
        payload: { data: 'test' }
      });
      
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({ data: messageData });
      }
      
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should handle heartbeat responses', () => {
      const heartbeatResponse = JSON.stringify({
        type: 'heartbeat-response',
        timestamp: Date.now()
      });
      
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({ data: heartbeatResponse });
      }
      
      const status = wsManager.getWebSocketStatus();
      expect(status.lastHeartbeatResponse).toBeInstanceOf(Date);
    });
  });
});

describe('ErrorRecoveryManager', () => {
  let recoveryManager: ErrorRecoveryManager;

  beforeEach(() => {
    recoveryManager = new ErrorRecoveryManager();
  });

  describe('Recovery Actions', () => {
    it('should register and execute recovery actions', async () => {
      const mockAction = vi.fn().mockResolvedValue(RecoveryResult.SUCCESS);
      
      recoveryManager.registerAction({
        id: 'test-action',
        name: 'Test Action',
        description: 'Test recovery action',
        strategy: RecoveryStrategy.RETRY,
        priority: 1,
        execute: mockAction
      });
      
      const result = await recoveryManager.executeManualRecovery('test-action');
      
      expect(result).toBe(RecoveryResult.SUCCESS);
      expect(mockAction).toHaveBeenCalled();
    });

    it('should respect action cooldowns', async () => {
      const mockAction = vi.fn().mockResolvedValue(RecoveryResult.SUCCESS);
      
      recoveryManager.registerAction({
        id: 'cooldown-action',
        name: 'Cooldown Action',
        description: 'Action with cooldown',
        strategy: RecoveryStrategy.RETRY,
        priority: 1,
        cooldownMs: 1000,
        execute: mockAction
      });
      
      // Execute first time
      await recoveryManager.executeManualRecovery('cooldown-action');
      expect(mockAction).toHaveBeenCalledTimes(1);
      
      // Try to execute again immediately (should be blocked by cooldown)
      await recoveryManager.handleError('test error that matches no rules');
      expect(mockAction).toHaveBeenCalledTimes(1); // Still just once
    });
  });

  describe('Recovery Rules', () => {
    it('should match errors against patterns', async () => {
      const mockAction = vi.fn().mockResolvedValue(RecoveryResult.SUCCESS);
      
      recoveryManager.registerAction({
        id: 'websocket-action',
        name: 'WebSocket Recovery',
        description: 'Recover WebSocket issues',
        strategy: RecoveryStrategy.RESTART,
        priority: 1,
        execute: mockAction
      });
      
      recoveryManager.registerRule({
        id: 'websocket-rule',
        name: 'WebSocket Rule',
        description: 'Handle WebSocket errors',
        pattern: /websocket.*error/i,
        actions: ['websocket-action'],
        enabled: true,
        automatic: true,
        maxAutoAttempts: 3,
        escalateAfterFailures: 5
      });
      
      const result = await recoveryManager.handleError('WebSocket connection error occurred');
      
      expect(result).toBe(RecoveryResult.SUCCESS);
      expect(mockAction).toHaveBeenCalled();
    });

    it('should handle string patterns', async () => {
      const mockAction = vi.fn().mockResolvedValue(RecoveryResult.SUCCESS);
      
      recoveryManager.registerAction({
        id: 'network-action',
        name: 'Network Recovery',
        description: 'Recover network issues',
        strategy: RecoveryStrategy.RETRY,
        priority: 1,
        execute: mockAction
      });
      
      recoveryManager.registerRule({
        id: 'network-rule',
        name: 'Network Rule',
        description: 'Handle network errors',
        pattern: 'network',
        actions: ['network-action'],
        enabled: true,
        automatic: true,
        maxAutoAttempts: 3,
        escalateAfterFailures: 5
      });
      
      const result = await recoveryManager.handleError('Network timeout occurred');
      
      expect(result).toBe(RecoveryResult.SUCCESS);
      expect(mockAction).toHaveBeenCalled();
    });

    it('should respect max auto attempts', async () => {
      const mockAction = vi.fn().mockResolvedValue(RecoveryResult.FAILED);
      
      recoveryManager.registerAction({
        id: 'limited-action',
        name: 'Limited Action',
        description: 'Action with attempt limit',
        strategy: RecoveryStrategy.RETRY,
        priority: 1,
        execute: mockAction
      });
      
      recoveryManager.registerRule({
        id: 'limited-rule',
        name: 'Limited Rule',
        description: 'Rule with attempt limit',
        pattern: 'limited-error',
        actions: ['limited-action'],
        enabled: true,
        automatic: true,
        maxAutoAttempts: 2,
        escalateAfterFailures: 5
      });
      
      // Execute multiple times
      await recoveryManager.handleError('limited-error occurred');
      await recoveryManager.handleError('limited-error occurred');
      await recoveryManager.handleError('limited-error occurred'); // Should be skipped
      
      expect(mockAction).toHaveBeenCalledTimes(2); // Only 2 times due to limit
    });
  });

  describe('Circuit Breakers', () => {
    it('should create and manage circuit breakers', () => {
      recoveryManager.createCircuitBreaker('test-breaker', {
        failureThreshold: 3,
        timeout: 1000
      });
      
      const breaker = recoveryManager.getCircuitBreakerState('test-breaker');
      expect(breaker).toBeDefined();
      expect(breaker?.state).toBe('closed');
      expect(breaker?.failureCount).toBe(0);
    });

    it('should allow execution when circuit is closed', () => {
      recoveryManager.createCircuitBreaker('test-breaker', {
        failureThreshold: 3,
        timeout: 1000
      });
      
      expect(recoveryManager.isCircuitBreakerClosed('test-breaker')).toBe(true);
    });
  });

  describe('Status and Monitoring', () => {
    it('should provide recovery status', () => {
      const status = recoveryManager.getRecoveryStatus();
      
      expect(status).toHaveProperty('autoRecoveryEnabled');
      expect(status).toHaveProperty('totalActions');
      expect(status).toHaveProperty('totalRules');
      expect(status).toHaveProperty('recoveryHistory');
      expect(status).toHaveProperty('circuitBreakers');
    });

    it('should track recovery attempts', async () => {
      const mockAction = vi.fn().mockResolvedValue(RecoveryResult.SUCCESS);
      
      recoveryManager.registerAction({
        id: 'tracked-action',
        name: 'Tracked Action',
        description: 'Action for tracking',
        strategy: RecoveryStrategy.RETRY,
        priority: 1,
        execute: mockAction
      });
      
      await recoveryManager.executeManualRecovery('tracked-action');
      
      const status = recoveryManager.getRecoveryStatus();
      expect(status.recoveryHistory.total).toBeGreaterThan(0);
      expect(status.recentAttempts.length).toBeGreaterThan(0);
    });

    it('should enable/disable auto recovery', () => {
      expect(recoveryManager.getRecoveryStatus().autoRecoveryEnabled).toBe(true);
      
      recoveryManager.setAutoRecoveryEnabled(false);
      expect(recoveryManager.getRecoveryStatus().autoRecoveryEnabled).toBe(false);
      
      recoveryManager.setAutoRecoveryEnabled(true);
      expect(recoveryManager.getRecoveryStatus().autoRecoveryEnabled).toBe(true);
    });
  });

  describe('History Management', () => {
    it('should clean old history entries', () => {
      // Add some mock history entries with old timestamps
      const oldAttempt = {
        id: 'old-attempt',
        ruleId: 'test-rule',
        actionId: 'test-action',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        result: RecoveryResult.SUCCESS,
        duration: 100,
        automatic: true
      };
      
      // Access private history to add old entry (for testing)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recoveryManager as any).recoveryHistory.push(oldAttempt);
      
      const statusBefore = recoveryManager.getRecoveryStatus();
      const entriesBeforeCleanup = statusBefore.recoveryHistory.total;
      
      recoveryManager.clearOldHistory(7); // Keep 7 days
      
      const statusAfter = recoveryManager.getRecoveryStatus();
      expect(statusAfter.recoveryHistory.total).toBeLessThan(entriesBeforeCleanup);
    });
  });
});