<script lang="ts">
	/**
	 * Offline Manager - Integrates network monitoring and action queue
	 */
	import { onMount, onDestroy } from 'svelte';
	import { startNetworkMonitoring, stopNetworkMonitoring, networkState } from '../offline/network-monitor';
	import { startActionSync, stopActionSync, actionQueue } from '../offline/action-queue';
	import OfflineIndicator from './OfflineIndicator.svelte';
	import ActionQueueViewer from './ActionQueueViewer.svelte';

	interface OfflineManagerProps {
		showIndicator?: boolean;
		showQueueViewer?: boolean;
		indicatorVariant?: 'banner' | 'badge' | 'minimal';
		autoSync?: boolean;
		syncInterval?: number; // in milliseconds
		class?: string;
	}

	let {
		showIndicator = true,
		showQueueViewer = false,
		indicatorVariant = 'banner',
		autoSync = true,
		syncInterval = 60000,
		class: className = ''
	}: OfflineManagerProps = $props();

	let showQueueDetails = $state(false);

	$: isOffline = $networkState.status === 'offline';
	$: hasPendingActions = $actionQueue.actions.some((a) => a.status === 'pending');

	onMount(() => {
		// Start monitoring
		startNetworkMonitoring();

		// Start auto-sync if enabled
		if (autoSync) {
			startActionSync(syncInterval);
		}

		// Listen for network events
		setupEventListeners();
	});

	onDestroy(() => {
		// Stop monitoring
		stopNetworkMonitoring();
		stopActionSync();

		// Clean up event listeners
		cleanupEventListeners();
	});

	function setupEventListeners() {
		if (typeof window !== 'undefined') {
			window.addEventListener('network-online', handleOnline);
			window.addEventListener('network-offline', handleOffline);
			window.addEventListener('network-unstable', handleUnstable);
		}
	}

	function cleanupEventListeners() {
		if (typeof window !== 'undefined') {
			window.removeEventListener('network-online', handleOnline);
			window.removeEventListener('network-offline', handleOffline);
			window.removeEventListener('network-unstable', handleUnstable);
		}
	}

	function handleOnline() {
		console.log('Network is back online');

		// Show user notification
		if (typeof window !== 'undefined' && 'Notification' in window) {
			if (Notification.permission === 'granted') {
				new Notification('Back Online', {
					body: 'Connection restored. Syncing pending actions...',
					icon: '/icon-192.png'
				});
			}
		}
	}

	function handleOffline() {
		console.log('Network is offline');

		// Show user notification
		if (typeof window !== 'undefined' && 'Notification' in window) {
			if (Notification.permission === 'granted') {
				new Notification('Offline', {
					body: 'You are currently offline. Actions will be saved and synced when you reconnect.',
					icon: '/icon-192.png'
				});
			}
		}
	}

	function handleUnstable() {
		console.log('Network connection is unstable');
	}

	function toggleQueueViewer() {
		showQueueDetails = !showQueueDetails;
	}
</script>

<div class="offline-manager {className}">
	{#if showIndicator}
		<OfflineIndicator
			variant={indicatorVariant}
			showQueueInfo={true}
		/>
	{/if}

	{#if showQueueViewer || (showQueueDetails && hasPendingActions)}
		<div class="queue-viewer-container">
			<ActionQueueViewer showCompleted={false} />
		</div>
	{/if}

	<!-- Debug info in development -->
	{#if import.meta.env.DEV}
		<div class="debug-info">
			<details>
				<summary>Offline Manager Debug</summary>
				<div class="debug-content">
					<p><strong>Network Status:</strong> {$networkState.status}</p>
					<p><strong>Is Online:</strong> {$networkState.isOnline ? 'Yes' : 'No'}</p>
					{#if $networkState.effectiveType}
						<p><strong>Connection Type:</strong> {$networkState.effectiveType}</p>
					{/if}
					{#if $networkState.rtt}
						<p><strong>RTT:</strong> {$networkState.rtt}ms</p>
					{/if}
					{#if $networkState.downlink}
						<p><strong>Downlink:</strong> {$networkState.downlink} Mbps</p>
					{/if}
					<p><strong>Pending Actions:</strong> {$actionQueue.actions.filter(a => a.status === 'pending').length}</p>
					<p><strong>Failed Actions:</strong> {$actionQueue.actions.filter(a => a.status === 'failed').length}</p>
					<p><strong>Auto Sync:</strong> {autoSync ? 'Enabled' : 'Disabled'}</p>
					{#if $actionQueue.lastSyncAt}
						<p><strong>Last Sync:</strong> {new Date($actionQueue.lastSyncAt).toLocaleTimeString()}</p>
					{/if}
				</div>
			</details>
		</div>
	{/if}
</div>

<style>
	.offline-manager {
		position: relative;
	}

	.queue-viewer-container {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		z-index: 9997;
		max-width: 400px;
		animation: slideUp 0.3s ease-out;
	}

	.debug-info {
		position: fixed;
		bottom: 1rem;
		left: 1rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		font-size: 0.75rem;
		max-width: 300px;
		z-index: 9996;
	}

	.debug-info summary {
		padding: 0.5rem;
		cursor: pointer;
		font-weight: 600;
		background: #f3f4f6;
		border-radius: 0.5rem 0.5rem 0 0;
	}

	.debug-content {
		padding: 0.5rem;
	}

	.debug-content p {
		margin: 0.25rem 0;
		font-family: monospace;
		color: #4b5563;
	}

	.debug-content strong {
		color: #1f2937;
	}

	@keyframes slideUp {
		from {
			transform: translateY(100%);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@media (max-width: 640px) {
		.queue-viewer-container {
			right: 0.5rem;
			left: 0.5rem;
			bottom: 0.5rem;
			max-width: none;
		}

		.debug-info {
			left: 0.5rem;
			right: 0.5rem;
			max-width: none;
		}
	}
</style>
