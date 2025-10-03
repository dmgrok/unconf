/**
 * Action queue for offline support
 * Queues actions when offline and syncs when connection is restored
 */

import { writable, derived, get } from 'svelte/store';
import { isOnline } from './network-monitor';

export interface QueuedAction {
	id: string;
	type: string;
	payload: unknown;
	timestamp: Date;
	retryCount: number;
	maxRetries: number;
	status: 'pending' | 'processing' | 'failed' | 'completed';
	error?: string;
}

export interface QueueState {
	actions: QueuedAction[];
	isProcessing: boolean;
	lastSyncAt: Date | null;
}

const initialState: QueueState = {
	actions: [],
	isProcessing: false,
	lastSyncAt: null
};

// Load persisted queue from localStorage
function loadPersistedQueue(): QueuedAction[] {
	if (typeof localStorage === 'undefined') return [];

	try {
		const stored = localStorage.getItem('offline-action-queue');
		if (stored) {
			const parsed = JSON.parse(stored);
			return parsed.map((action: any) => ({
				...action,
				timestamp: new Date(action.timestamp)
			}));
		}
	} catch (error) {
		console.error('Failed to load persisted queue:', error);
	}

	return [];
}

// Initialize with persisted data
const persistedActions = loadPersistedQueue();
export const actionQueue = writable<QueueState>({
	...initialState,
	actions: persistedActions
});

// Derived stores
export const pendingActions = derived(actionQueue, ($queue) =>
	$queue.actions.filter((a) => a.status === 'pending')
);

export const failedActions = derived(actionQueue, ($queue) =>
	$queue.actions.filter((a) => a.status === 'failed')
);

export const hasPendingActions = derived(
	pendingActions,
	($pending) => $pending.length > 0
);

// Persist queue to localStorage whenever it changes
actionQueue.subscribe(($queue) => {
	if (typeof localStorage !== 'undefined') {
		try {
			localStorage.setItem('offline-action-queue', JSON.stringify($queue.actions));
		} catch (error) {
			console.error('Failed to persist queue:', error);
		}
	}
});

class ActionQueueManager {
	private syncInterval: NodeJS.Timeout | null = null;

	/**
	 * Add action to queue
	 */
	enqueue(type: string, payload: unknown, maxRetries: number = 3): string {
		const action: QueuedAction = {
			id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			type,
			payload,
			timestamp: new Date(),
			retryCount: 0,
			maxRetries,
			status: 'pending'
		};

		actionQueue.update((state) => ({
			...state,
			actions: [...state.actions, action]
		}));

		// Try to process immediately if online
		if (get(isOnline)) {
			this.processQueue();
		}

		return action.id;
	}

	/**
	 * Process all pending actions
	 */
	async processQueue(): Promise<void> {
		const state = get(actionQueue);

		if (state.isProcessing || !get(isOnline)) {
			return;
		}

		const pending = state.actions.filter((a) => a.status === 'pending');

		if (pending.length === 0) {
			return;
		}

		actionQueue.update((s) => ({ ...s, isProcessing: true }));

		for (const action of pending) {
			await this.processAction(action);
		}

		actionQueue.update((s) => ({
			...s,
			isProcessing: false,
			lastSyncAt: new Date()
		}));
	}

	/**
	 * Process a single action
	 */
	private async processAction(action: QueuedAction): Promise<void> {
		// Mark as processing
		this.updateActionStatus(action.id, 'processing');

		try {
			// Execute the action based on type
			await this.executeAction(action);

			// Mark as completed
			this.updateActionStatus(action.id, 'completed');

			// Remove completed action after a delay
			setTimeout(() => {
				this.removeAction(action.id);
			}, 5000);
		} catch (error) {
			console.error(`Failed to process action ${action.id}:`, error);

			// Increment retry count
			action.retryCount++;

			if (action.retryCount >= action.maxRetries) {
				// Max retries reached, mark as failed
				this.updateActionStatus(action.id, 'failed', error instanceof Error ? error.message : 'Unknown error'
				);
			} else {
				// Retry later
				this.updateActionStatus(action.id, 'pending');
			}
		}
	}

	/**
	 * Execute action based on type
	 */
	private async executeAction(action: QueuedAction): Promise<void> {
		const handlers: Record<string, (payload: unknown) => Promise<void>> = {
			vote: this.handleVote,
			'submit-topic': this.handleSubmitTopic,
			'join-room': this.handleJoinRoom,
			'submit-word': this.handleSubmitWord,
			// Add more action handlers as needed
		};

		const handler = handlers[action.type];

		if (!handler) {
			throw new Error(`Unknown action type: ${action.type}`);
		}

		await handler(action.payload);
	}

	/**
	 * Action handlers
	 */
	private async handleVote(payload: unknown): Promise<void> {
		const response = await fetch('/api/votes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			throw new Error(`Vote failed: ${response.statusText}`);
		}
	}

	private async handleSubmitTopic(payload: unknown): Promise<void> {
		const response = await fetch('/api/topics', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			throw new Error(`Topic submission failed: ${response.statusText}`);
		}
	}

	private async handleJoinRoom(payload: unknown): Promise<void> {
		const response = await fetch('/api/rooms/join', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			throw new Error(`Room join failed: ${response.statusText}`);
		}
	}

	private async handleSubmitWord(payload: unknown): Promise<void> {
		const response = await fetch('/api/games/word', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			throw new Error(`Word submission failed: ${response.statusText}`);
		}
	}

	/**
	 * Update action status
	 */
	private updateActionStatus(
		id: string,
		status: QueuedAction['status'],
		error?: string
	): void {
		actionQueue.update((state) => ({
			...state,
			actions: state.actions.map((action) =>
				action.id === id ? { ...action, status, error } : action
			)
		}));
	}

	/**
	 * Remove action from queue
	 */
	private removeAction(id: string): void {
		actionQueue.update((state) => ({
			...state,
			actions: state.actions.filter((action) => action.id !== id)
		}));
	}

	/**
	 * Retry failed action
	 */
	retryAction(id: string): void {
		actionQueue.update((state) => ({
			...state,
			actions: state.actions.map((action) =>
				action.id === id
					? { ...action, status: 'pending' as const, retryCount: 0, error: undefined }
					: action
			)
		}));

		if (get(isOnline)) {
			this.processQueue();
		}
	}

	/**
	 * Clear completed and failed actions
	 */
	clearCompleted(): void {
		actionQueue.update((state) => ({
			...state,
			actions: state.actions.filter(
				(action) => action.status !== 'completed' && action.status !== 'failed'
			)
		}));
	}

	/**
	 * Start auto-sync when online
	 */
	startAutoSync(intervalMs: number = 60000): void {
		this.stopAutoSync();

		this.syncInterval = setInterval(() => {
			if (get(isOnline) && get(hasPendingActions)) {
				this.processQueue();
			}
		}, intervalMs);

		// Also process on network status change
		if (typeof window !== 'undefined') {
			window.addEventListener('network-online', () => {
				this.processQueue();
			});
		}
	}

	/**
	 * Stop auto-sync
	 */
	stopAutoSync(): void {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = null;
		}
	}
}

// Singleton instance
export const queueManager = new ActionQueueManager();

// Convenience functions
export function queueAction(type: string, payload: unknown, maxRetries?: number): string {
	return queueManager.enqueue(type, payload, maxRetries);
}

export function retryFailedAction(id: string): void {
	queueManager.retryAction(id);
}

export function clearCompletedActions(): void {
	queueManager.clearCompleted();
}

export function startActionSync(intervalMs?: number): void {
	queueManager.startAutoSync(intervalMs);
}

export function stopActionSync(): void {
	queueManager.stopAutoSync();
}
