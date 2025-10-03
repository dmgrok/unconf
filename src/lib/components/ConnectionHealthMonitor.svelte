<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import {
		socketStore,
		isConnected,
		isReconnecting,
		connectionHealth
	} from '../websocket/client';
	import type { ConnectionStatus } from '../websocket/client';
	import ConnectionStatusIndicator from './ConnectionStatusIndicator.svelte';
	import ReconnectionPrompt from './ReconnectionPrompt.svelte';

	interface ConnectionHealthMonitorProps {
		showIndicator?: boolean;
		showReconnectPrompt?: boolean;
		indicatorVariant?: 'inline' | 'badge' | 'full';
		reconnectPromptVariant?: 'modal' | 'banner' | 'toast';
		indicatorPosition?: 'header' | 'footer' | 'custom';
		autoReconnect?: boolean;
		reconnectDelay?: number;
		class?: string;
	}

	let {
		showIndicator = true,
		showReconnectPrompt = true,
		indicatorVariant = 'badge',
		reconnectPromptVariant = 'toast',
		indicatorPosition = 'header',
		autoReconnect = true,
		reconnectDelay = 5,
		class: className = ''
	}: ConnectionHealthMonitorProps = $props();

	const dispatch = createEventDispatcher<{
		statusChange: { status: ConnectionStatus };
		reconnectAttempt: { attempt: number };
		reconnectSuccess: void;
		reconnectFailed: void;
		maxAttemptsReached: void;
	}>();

	let showPrompt = $state(false);
	let previousStatus: ConnectionStatus = 'disconnected';
	let healthCheckInterval: NodeJS.Timeout | null = null;
	let reconnectManager: ReconnectManager | null = null;

	$: currentStatus = $socketStore.status;
	$: health = $connectionHealth;
	$: userCount = $socketStore.userCount;
	$: lastError = $socketStore.lastError;
	$: reconnectAttempts = $socketStore.reconnectAttempts;
	$: maxReconnectAttempts = $socketStore.maxReconnectAttempts;

	// Monitor status changes
	$: if (currentStatus !== previousStatus) {
		handleStatusChange(currentStatus, previousStatus);
		previousStatus = currentStatus;
	}

	// Show/hide reconnect prompt based on connection status
	$: {
		if (currentStatus === 'disconnected' || currentStatus === 'reconnecting') {
			if (showReconnectPrompt && !showPrompt) {
				showPrompt = true;
			}
		} else if (currentStatus === 'connected') {
			showPrompt = false;
		}
	}

	class ReconnectManager {
		private attemptCount = 0;
		private maxAttempts: number;
		private delayMs: number;
		private timeoutId: NodeJS.Timeout | null = null;

		constructor(maxAttempts: number, delaySeconds: number) {
			this.maxAttempts = maxAttempts;
			this.delayMs = delaySeconds * 1000;
		}

		async attemptReconnect(callback: () => Promise<void>): Promise<void> {
			if (this.attemptCount >= this.maxAttempts) {
				dispatch('maxAttemptsReached');
				return;
			}

			this.attemptCount++;
			dispatch('reconnectAttempt', { attempt: this.attemptCount });

			try {
				await callback();
				this.reset();
				dispatch('reconnectSuccess');
			} catch (error) {
				console.error('Reconnect attempt failed:', error);
				dispatch('reconnectFailed');

				if (this.attemptCount < this.maxAttempts) {
					this.scheduleNextAttempt(callback);
				}
			}
		}

		scheduleNextAttempt(callback: () => Promise<void>): void {
			this.timeoutId = setTimeout(() => {
				this.attemptReconnect(callback);
			}, this.delayMs);
		}

		reset(): void {
			this.attemptCount = 0;
			if (this.timeoutId) {
				clearTimeout(this.timeoutId);
				this.timeoutId = null;
			}
		}

		cancel(): void {
			if (this.timeoutId) {
				clearTimeout(this.timeoutId);
				this.timeoutId = null;
			}
		}
	}

	function handleStatusChange(newStatus: ConnectionStatus, oldStatus: ConnectionStatus) {
		dispatch('statusChange', { status: newStatus });

		// Log status changes in development
		if (import.meta.env.DEV) {
			console.log(`Connection status: ${oldStatus} → ${newStatus}`);
		}

		// Handle reconnection logic
		if (newStatus === 'disconnected' && oldStatus === 'connected') {
			if (autoReconnect) {
				startReconnectionProcess();
			}
		}

		// Show user notifications
		if (newStatus === 'connected' && oldStatus !== 'connecting') {
			showConnectionRestored();
		}
	}

	function startReconnectionProcess() {
		if (!reconnectManager) {
			reconnectManager = new ReconnectManager(maxReconnectAttempts, reconnectDelay);
		}

		reconnectManager.attemptReconnect(async () => {
			// Attempt to reconnect using the socket manager
			// This would call the actual reconnection method
			const socket = $socketStore.socket;
			if (socket) {
				return new Promise<void>((resolve, reject) => {
					socket.connect();
					socket.once('connect', () => resolve());
					socket.once('connect_error', (err) => reject(err));
				});
			}
		});
	}

	function showConnectionRestored() {
		// Could show a brief success notification
		if (import.meta.env.DEV) {
			console.log('Connection restored successfully');
		}
	}

	function handleRetry() {
		if (reconnectManager) {
			reconnectManager.reset();
		}
		startReconnectionProcess();
	}

	function handleCancelReconnect() {
		if (reconnectManager) {
			reconnectManager.cancel();
		}
		showPrompt = false;
	}

	function handleDismissIndicator() {
		// Could hide the indicator temporarily
		console.log('Indicator dismissed');
	}

	onMount(() => {
		// Start periodic health checks
		healthCheckInterval = setInterval(() => {
			if ($socketStore.socket && currentStatus === 'connected') {
				// Perform a lightweight health check
				const timeSinceLastActivity = Date.now() - ($socketStore.socket as any).lastActivity;
				if (timeSinceLastActivity > 60000) {
					// More than 1 minute since last activity, send heartbeat
					$socketStore.socket.emit('heartbeat', (response) => {
						if (!response) {
							console.warn('Heartbeat failed');
						}
					});
				}
			}
		}, 30000); // Check every 30 seconds
	});

	onDestroy(() => {
		if (healthCheckInterval) {
			clearInterval(healthCheckInterval);
		}
		if (reconnectManager) {
			reconnectManager.cancel();
		}
	});
</script>

<div class="connection-health-monitor {className}">
	{#if showIndicator}
		{#if indicatorPosition === 'header'}
			<div class="indicator-header">
				<ConnectionStatusIndicator
					status={currentStatus}
					{reconnectAttempts}
					{maxReconnectAttempts}
					{userCount}
					{lastError}
					variant={indicatorVariant}
					showUserCount={currentStatus === 'connected'}
					on:retry={handleRetry}
					on:dismiss={handleDismissIndicator}
				/>
			</div>
		{:else if indicatorPosition === 'footer'}
			<div class="indicator-footer">
				<ConnectionStatusIndicator
					status={currentStatus}
					{reconnectAttempts}
					{maxReconnectAttempts}
					{userCount}
					{lastError}
					variant={indicatorVariant}
					showUserCount={currentStatus === 'connected'}
					on:retry={handleRetry}
					on:dismiss={handleDismissIndicator}
				/>
			</div>
		{:else}
			<!-- Custom position - let parent handle placement -->
			<ConnectionStatusIndicator
				status={currentStatus}
				{reconnectAttempts}
				{maxReconnectAttempts}
				{userCount}
				{lastError}
				variant={indicatorVariant}
				showUserCount={currentStatus === 'connected'}
				on:retry={handleRetry}
				on:dismiss={handleDismissIndicator}
			/>
		{/if}
	{/if}

	{#if showReconnectPrompt}
		<ReconnectionPrompt
			bind:show={showPrompt}
			{reconnectAttempts}
			{maxReconnectAttempts}
			{lastError}
			{autoReconnect}
			{reconnectDelay}
			variant={reconnectPromptVariant}
			on:retry={handleRetry}
			on:cancel={handleCancelReconnect}
			on:close={() => (showPrompt = false)}
		/>
	{/if}
</div>

<style>
	.connection-health-monitor {
		position: relative;
	}

	.indicator-header {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 1000;
		animation: slideIn 0.3s ease-out;
	}

	.indicator-footer {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		z-index: 1000;
		animation: slideIn 0.3s ease-out;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	@media (max-width: 640px) {
		.indicator-header {
			top: 0.5rem;
			right: 0.5rem;
			left: 0.5rem;
		}

		.indicator-footer {
			bottom: 0.5rem;
			right: 0.5rem;
			left: 0.5rem;
		}
	}
</style>
