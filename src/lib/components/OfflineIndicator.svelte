<script lang="ts">
	import { WifiOff, Cloud, CloudOff, AlertTriangle, RefreshCw } from 'lucide-svelte';
	import { networkState, type NetworkStatus } from '../offline/network-monitor';
	import { pendingActions, failedActions, hasPendingActions } from '../offline/action-queue';
	import { queueManager } from '../offline/action-queue';
	import Button from './ui/Button.svelte';

	interface OfflineIndicatorProps {
		variant?: 'banner' | 'badge' | 'minimal';
		showQueueInfo?: boolean;
		class?: string;
	}

	let {
		variant = 'banner',
		showQueueInfo = true,
		class: className = ''
	}: OfflineIndicatorProps = $props();

	$: status = $networkState.status;
	$: pending = $pendingActions.length;
	$: failed = $failedActions.length;
	$: hasPending = $hasPendingActions;

	$: statusConfig = getStatusConfig(status);

	function getStatusConfig(status: NetworkStatus) {
		switch (status) {
			case 'offline':
				return {
					icon: WifiOff,
					label: 'Offline',
					color: '#ef4444',
					bgColor: '#fef2f2',
					textColor: '#991b1b'
				};
			case 'unstable':
				return {
					icon: AlertTriangle,
					label: 'Unstable Connection',
					color: '#f59e0b',
					bgColor: '#fffbeb',
					textColor: '#92400e'
				};
			case 'online':
				return {
					icon: Cloud,
					label: 'Online',
					color: '#10b981',
					bgColor: '#d1fae5',
					textColor: '#065f46'
				};
		}
	}

	function handleSync() {
		queueManager.processQueue();
	}
</script>

{#if status === 'offline' || status === 'unstable' || (status === 'online' && hasPending)}
	{#if variant === 'banner'}
		<div
			class="offline-banner {className}"
			style="background-color: {statusConfig.bgColor}; border-color: {statusConfig.color}"
			role="alert"
		>
			<div class="banner-content">
				<div class="banner-icon" style="color: {statusConfig.color}">
					<svelte:component this={statusConfig.icon} size={24} />
				</div>

				<div class="banner-text">
					<strong style="color: {statusConfig.textColor}">{statusConfig.label}</strong>
					{#if status === 'offline'}
						<p>You're currently offline. Actions will be saved and synced when you reconnect.</p>
					{:else if status === 'unstable'}
						<p>Connection is unstable. Some features may not work properly.</p>
					{:else if hasPending}
						<p>Syncing pending actions...</p>
					{/if}
				</div>

				{#if showQueueInfo && (pending > 0 || failed > 0)}
					<div class="queue-info">
						{#if pending > 0}
							<span class="queue-badge pending">
								<RefreshCw size={14} class="spin" />
								{pending} pending
							</span>
						{/if}
						{#if failed > 0}
							<span class="queue-badge failed">
								<AlertTriangle size={14} />
								{failed} failed
							</span>
						{/if}
					</div>
				{/if}

				{#if status === 'online' && hasPending}
					<Button variant="outline" size="sm" onclick={handleSync}>
						<RefreshCw size={16} />
						Sync Now
					</Button>
				{/if}
			</div>
		</div>
	{:else if variant === 'badge'}
		<div
			class="offline-badge {className}"
			style="background-color: {statusConfig.bgColor}; color: {statusConfig.textColor}"
		>
			<svelte:component this={statusConfig.icon} size={16} />
			<span>{statusConfig.label}</span>
			{#if showQueueInfo && pending > 0}
				<span class="badge-count">{pending}</span>
			{/if}
		</div>
	{:else}
		<div class="offline-minimal {className}" style="color: {statusConfig.color}">
			<svelte:component this={statusConfig.icon} size={18} />
		</div>
	{/if}
{/if}

<style>
	/* Banner variant */
	.offline-banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 9998;
		border-bottom: 2px solid;
		animation: slideDown 0.3s ease-out;
	}

	.banner-content {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.banner-icon {
		flex-shrink: 0;
	}

	.banner-text {
		flex: 1;
		min-width: 0;
	}

	.banner-text strong {
		display: block;
		font-weight: 600;
		font-size: 0.875rem;
		margin-bottom: 0.125rem;
	}

	.banner-text p {
		margin: 0;
		font-size: 0.75rem;
		opacity: 0.9;
	}

	.queue-info {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.queue-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.queue-badge.pending {
		background-color: #dbeafe;
		color: #1e40af;
	}

	.queue-badge.failed {
		background-color: #fee2e2;
		color: #991b1b;
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Badge variant */
	.offline-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.badge-count {
		background-color: rgba(255, 255, 255, 0.3);
		padding: 0.125rem 0.375rem;
		border-radius: 9999px;
		font-size: 0.7rem;
	}

	/* Minimal variant */
	.offline-minimal {
		display: inline-flex;
		align-items: center;
	}

	/* Animations */
	@keyframes slideDown {
		from {
			transform: translateY(-100%);
		}
		to {
			transform: translateY(0);
		}
	}

	/* Responsive */
	@media (max-width: 640px) {
		.banner-content {
			flex-wrap: wrap;
			gap: 0.75rem;
		}

		.queue-info {
			width: 100%;
			order: 3;
		}

		.banner-text p {
			font-size: 0.7rem;
		}
	}
</style>
