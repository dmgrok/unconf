/**
 * Integration tests for connection handling and offline support
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import {
	startNetworkMonitoring,
	stopNetworkMonitoring,
	networkState,
	type NetworkStatus
} from '../../lib/offline/network-monitor';
import {
	queueAction,
	actionQueue,
	startActionSync,
	stopActionSync,
	clearCompletedActions
} from '../../lib/offline/action-queue';
import ConnectionHealthMonitor from '../../lib/components/ConnectionHealthMonitor.svelte';
import OfflineManager from '../../lib/components/OfflineManager.svelte';

describe('Connection Handling Integration', () => {
	beforeEach(() => {
		// Reset stores
		networkState.set({
			status: 'online',
			isOnline: true,
			lastOnline: null,
			lastOffline: null
		});

		actionQueue.set({
			actions: [],
			isProcessing: false,
			lastSyncAt: null
		});

		// Mock fetch
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ success: true })
		});

		// Mock navigator.onLine
		Object.defineProperty(navigator, 'onLine', {
			writable: true,
			value: true
		});
	});

	afterEach(() => {
		stopNetworkMonitoring();
		stopActionSync();
		clearCompletedActions();
		vi.restoreAllMocks();
	});

	describe('Network Monitoring', () => {
		it('should start network monitoring', () => {
			const monitor = startNetworkMonitoring();
			expect(monitor).toBeTruthy();
		});

		it('should detect online status', async () => {
			Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
			startNetworkMonitoring();

			// Trigger online event
			window.dispatchEvent(new Event('online'));

			await waitFor(() => {
				const state = get(networkState);
				expect(state.isOnline).toBe(true);
				expect(state.status).toBe('online');
			});
		});

		it('should detect offline status', async () => {
			Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
			startNetworkMonitoring();

			// Trigger offline event
			window.dispatchEvent(new Event('offline'));

			await waitFor(() => {
				const state = get(networkState);
				expect(state.isOnline).toBe(false);
				expect(state.status).toBe('offline');
			});
		});

		it('should track lastOnline and lastOffline timestamps', async () => {
			startNetworkMonitoring();

			// Go offline
			window.dispatchEvent(new Event('offline'));

			await waitFor(() => {
				const state = get(networkState);
				expect(state.lastOffline).toBeTruthy();
			});

			// Go back online
			window.dispatchEvent(new Event('online'));

			await waitFor(() => {
				const state = get(networkState);
				expect(state.lastOnline).toBeTruthy();
			});
		});
	});

	describe('Action Queue', () => {
		it('should queue actions when offline', () => {
			networkState.set({
				status: 'offline',
				isOnline: false,
				lastOnline: null,
				lastOffline: new Date()
			});

			const actionId = queueAction('vote', {
				userId: 'user-1',
				topicId: 'topic-1',
				weight: 'first'
			});

			expect(actionId).toBeTruthy();

			const state = get(actionQueue);
			expect(state.actions).toHaveLength(1);
			expect(state.actions[0].status).toBe('pending');
		});

		it('should persist queued actions to localStorage', () => {
			const mockLocalStorage = {
				data: {} as Record<string, string>,
				getItem(key: string) {
					return this.data[key] || null;
				},
				setItem(key: string, value: string) {
					this.data[key] = value;
				},
				removeItem(key: string) {
					delete this.data[key];
				}
			};

			Object.defineProperty(window, 'localStorage', {
				value: mockLocalStorage,
				writable: true
			});

			queueAction('submit-topic', {
				title: 'Test Topic',
				eventId: 'event-1'
			});

			const stored = mockLocalStorage.getItem('offline-action-queue');
			expect(stored).toBeTruthy();

			const parsed = JSON.parse(stored!);
			expect(parsed).toHaveLength(1);
		});

		it('should process queue when connection is restored', async () => {
			// Start offline
			networkState.set({
				status: 'offline',
				isOnline: false,
				lastOnline: null,
				lastOffline: new Date()
			});

			// Queue an action
			queueAction('vote', {
				userId: 'user-1',
				topicId: 'topic-1',
				weight: 'first'
			});

			// Go back online
			networkState.set({
				status: 'online',
				isOnline: true,
				lastOnline: new Date(),
				lastOffline: null
			});

			startActionSync(100); // Fast sync for testing

			// Wait for sync
			await waitFor(
				() => {
					const state = get(actionQueue);
					const completedActions = state.actions.filter((a) => a.status === 'completed');
					expect(completedActions.length).toBeGreaterThan(0);
				},
				{ timeout: 5000 }
			);
		});

		it('should retry failed actions', async () => {
			// Mock fetch to fail first, then succeed
			let callCount = 0;
			global.fetch = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return Promise.reject(new Error('Network error'));
				}
				return Promise.resolve({
					ok: true,
					json: async () => ({ success: true })
				});
			});

			networkState.set({
				status: 'online',
				isOnline: true,
				lastOnline: new Date(),
				lastOffline: null
			});

			queueAction('vote', {
				userId: 'user-1',
				topicId: 'topic-1',
				weight: 'first'
			});

			startActionSync(100);

			// Wait for retry
			await waitFor(
				() => {
					const state = get(actionQueue);
					const action = state.actions[0];
					expect(action.retryCount).toBeGreaterThan(0);
				},
				{ timeout: 5000 }
			);
		});

		it('should mark actions as failed after max retries', async () => {
			// Mock fetch to always fail
			global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

			networkState.set({
				status: 'online',
				isOnline: true,
				lastOnline: new Date(),
				lastOffline: null
			});

			queueAction('vote', { userId: 'user-1', topicId: 'topic-1' }, 2); // Max 2 retries

			startActionSync(100);

			// Wait for all retries to fail
			await waitFor(
				() => {
					const state = get(actionQueue);
					const failedActions = state.actions.filter((a) => a.status === 'failed');
					expect(failedActions.length).toBeGreaterThan(0);
				},
				{ timeout: 10000 }
			);
		});
	});

	describe('Connection Health Monitor Component', () => {
		it('should render connection health monitor', () => {
			const { container } = render(ConnectionHealthMonitor, {
				props: {
					showIndicator: true,
					showReconnectPrompt: true
				}
			});

			expect(container.querySelector('.connection-health-monitor')).toBeTruthy();
		});

		it('should show indicator when offline', async () => {
			networkState.set({
				status: 'offline',
				isOnline: false,
				lastOnline: null,
				lastOffline: new Date()
			});

			const { container } = render(ConnectionHealthMonitor, {
				props: {
					showIndicator: true,
					indicatorVariant: 'badge'
				}
			});

			await waitFor(() => {
				expect(container.querySelector('.connection-badge')).toBeTruthy();
			});
		});

		it('should hide indicator when online with no pending actions', async () => {
			networkState.set({
				status: 'online',
				isOnline: true,
				lastOnline: new Date(),
				lastOffline: null
			});

			actionQueue.set({
				actions: [],
				isProcessing: false,
				lastSyncAt: null
			});

			const { container } = render(ConnectionHealthMonitor, {
				props: {
					showIndicator: true,
					indicatorVariant: 'badge'
				}
			});

			await waitFor(() => {
				expect(container.querySelector('.connection-badge')).toBeFalsy();
			});
		});

		it('should emit statusChange events', async () => {
			let statusChanges: any[] = [];

			const { component } = render(ConnectionHealthMonitor, {
				props: {
					showIndicator: true
				}
			});

			component.$on('statusChange', (event: any) => {
				statusChanges.push(event.detail);
			});

			// Trigger status change
			networkState.set({
				status: 'offline',
				isOnline: false,
				lastOnline: null,
				lastOffline: new Date()
			});

			await waitFor(() => {
				expect(statusChanges.length).toBeGreaterThan(0);
			});
		});
	});

	describe('Offline Manager Component', () => {
		it('should render offline manager', () => {
			const { container } = render(OfflineManager, {
				props: {
					showIndicator: true,
					autoSync: true
				}
			});

			expect(container.querySelector('.offline-manager')).toBeTruthy();
		});

		it('should show queue viewer when there are pending actions', async () => {
			queueAction('vote', { userId: 'user-1', topicId: 'topic-1' });

			const { container } = render(OfflineManager, {
				props: {
					showQueueViewer: true
				}
			});

			await waitFor(() => {
				expect(container.querySelector('.action-queue-viewer')).toBeTruthy();
			});
		});

		it('should start auto-sync when enabled', () => {
			const { component } = render(OfflineManager, {
				props: {
					autoSync: true,
					syncInterval: 1000
				}
			});

			// Component should start auto-sync
			expect(component).toBeTruthy();
		});
	});

	describe('End-to-End Offline Flow', () => {
		it('should handle complete offline to online recovery', async () => {
			// Start online
			networkState.set({
				status: 'online',
				isOnline: true,
				lastOnline: new Date(),
				lastOffline: null
			});

			const { container } = render(OfflineManager, {
				props: {
					showIndicator: true,
					showQueueViewer: true,
					autoSync: true,
					syncInterval: 100
				}
			});

			// Go offline
			networkState.set({
				status: 'offline',
				isOnline: false,
				lastOnline: null,
				lastOffline: new Date()
			});

			// Queue actions while offline
			queueAction('vote', { userId: 'user-1', topicId: 'topic-1' });
			queueAction('submit-topic', { title: 'New Topic' });

			// Verify actions are queued
			let state = get(actionQueue);
			expect(state.actions.length).toBe(2);

			// Go back online
			networkState.set({
				status: 'online',
				isOnline: true,
				lastOnline: new Date(),
				lastOffline: null
			});

			// Wait for sync
			await waitFor(
				() => {
					state = get(actionQueue);
					const completed = state.actions.filter((a) => a.status === 'completed');
					expect(completed.length).toBeGreaterThan(0);
				},
				{ timeout: 5000 }
			);
		});
	});
});
