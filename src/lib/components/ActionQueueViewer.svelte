<script lang="ts">
	import { actionQueue, retryFailedAction, clearCompletedActions } from '../offline/action-queue';
	import { RefreshCw, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-svelte';
	import Button from './ui/Button.svelte';
	import Card from './ui/Card.svelte';

	interface ActionQueueViewerProps {
		showCompleted?: boolean;
		class?: string;
	}

	let {
		showCompleted = false,
		class: className = ''
	}: ActionQueueViewerProps = $props();

	$: actions = showCompleted
		? $actionQueue.actions
		: $actionQueue.actions.filter((a) => a.status !== 'completed');

	$: pending = actions.filter((a) => a.status === 'pending');
	$: processing = actions.filter((a) => a.status === 'processing');
	$: failed = actions.filter((a) => a.status === 'failed');
	$: completed = actions.filter((a) => a.status === 'completed');

	function getActionIcon(status: string) {
		switch (status) {
			case 'pending':
				return Clock;
			case 'processing':
				return RefreshCw;
			case 'failed':
				return XCircle;
			case 'completed':
				return CheckCircle;
			default:
				return Clock;
		}
	}

	function getActionColor(status: string) {
		switch (status) {
			case 'pending':
				return '#f59e0b';
			case 'processing':
				return '#3b82f6';
			case 'failed':
				return '#ef4444';
			case 'completed':
				return '#10b981';
			default:
				return '#6b7280';
		}
	}

	function formatActionType(type: string): string {
		return type
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	function formatTimestamp(date: Date): string {
		const now = new Date();
		const diff = now.getTime() - new Date(date).getTime();
		const seconds = Math.floor(diff / 1000);

		if (seconds < 60) return `${seconds}s ago`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		return `${Math.floor(seconds / 86400)}d ago`;
	}

	function handleRetry(id: string) {
		retryFailedAction(id);
	}

	function handleClearCompleted() {
		clearCompletedActions();
	}
</script>

<Card variant="outlined" padding="md" class="action-queue-viewer {className}">
	{#snippet header()}
		<div class="queue-header">
			<h3>Action Queue</h3>
			<div class="queue-stats">
				{#if pending.length > 0}
					<span class="stat pending">{pending.length} pending</span>
				{/if}
				{#if processing.length > 0}
					<span class="stat processing">{processing.length} syncing</span>
				{/if}
				{#if failed.length > 0}
					<span class="stat failed">{failed.length} failed</span>
				{/if}
			</div>
		</div>
	{/snippet}

	{#if actions.length === 0}
		<div class="empty-state">
			<CheckCircle size={48} style="color: #10b981" />
			<p>All actions synced!</p>
		</div>
	{:else}
		<div class="action-list">
			{#each actions as action (action.id)}
				{@const Icon = getActionIcon(action.status)}
				{@const color = getActionColor(action.status)}

				<div class="action-item" class:failed={action.status === 'failed'}>
					<div class="action-icon" style="color: {color}">
						<Icon size={20} class={action.status === 'processing' ? 'spin' : ''} />
					</div>

					<div class="action-content">
						<div class="action-header">
							<span class="action-type">{formatActionType(action.type)}</span>
							<span class="action-timestamp">{formatTimestamp(action.timestamp)}</span>
						</div>

						{#if action.status === 'failed' && action.error}
							<p class="action-error">{action.error}</p>
						{/if}

						{#if action.retryCount > 0}
							<p class="action-retry">
								Retry {action.retryCount}/{action.maxRetries}
							</p>
						{/if}
					</div>

					{#if action.status === 'failed'}
						<Button variant="outline" size="sm" onclick={() => handleRetry(action.id)}>
							<RefreshCw size={14} />
							Retry
						</Button>
					{/if}
				</div>
			{/each}
		</div}

		{#if completed.length > 0}
			{#snippet footer()}
				<Button variant="outline" size="sm" onclick={handleClearCompleted}>
					<Trash2 size={14} />
					Clear Completed
				</Button>
			{/snippet}
		{/if}
	{/if}
</Card>

<style>
	.action-queue-viewer {
		max-width: 600px;
	}

	.queue-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.queue-header h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
	}

	.queue-stats {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.stat {
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.stat.pending {
		background-color: #fef3c7;
		color: #92400e;
	}

	.stat.processing {
		background-color: #dbeafe;
		color: #1e40af;
	}

	.stat.failed {
		background-color: #fee2e2;
		color: #991b1b;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: #6b7280;
	}

	.empty-state p {
		margin: 1rem 0 0;
		font-size: 0.875rem;
	}

	.action-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.action-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		background-color: #f9fafb;
		border-radius: 0.5rem;
		border: 1px solid #e5e7eb;
		transition: all 0.2s;
	}

	.action-item.failed {
		background-color: #fef2f2;
		border-color: #fecaca;
	}

	.action-icon {
		flex-shrink: 0;
		padding: 0.25rem;
	}

	.action-content {
		flex: 1;
		min-width: 0;
	}

	.action-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.action-type {
		font-weight: 600;
		color: #1f2937;
		font-size: 0.875rem;
	}

	.action-timestamp {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.action-error {
		margin: 0.25rem 0 0;
		color: #991b1b;
		font-size: 0.75rem;
		line-height: 1.4;
	}

	.action-retry {
		margin: 0.25rem 0 0;
		color: #6b7280;
		font-size: 0.75rem;
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

	@media (max-width: 640px) {
		.queue-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.action-item {
			flex-direction: column;
		}

		.action-item :global(button) {
			width: 100%;
		}
	}
</style>
