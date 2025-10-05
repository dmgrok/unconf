<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Event } from '../../../types/entities';
	import { EventStatus } from '../../../types/entities';
	import Button from '../ui/Button.svelte';

	interface EventCardProps {
		event: Event;
		onDelete?: (eventId: string) => void;
	}

	let { event, onDelete }: EventCardProps = $props();

	const statusConfig = {
		[EventStatus.DRAFT]: {
			label: 'Draft',
			color: 'var(--color-neutral-500)',
			bg: 'var(--color-neutral-100)'
		},
		[EventStatus.ACTIVE]: {
			label: 'Active',
			color: 'var(--color-success-600)',
			bg: 'var(--color-success-100)'
		},
		[EventStatus.PAUSED]: {
			label: 'Paused',
			color: 'var(--color-warning-600)',
			bg: 'var(--color-warning-100)'
		},
		[EventStatus.COMPLETED]: {
			label: 'Completed',
			color: 'var(--color-secondary-600)',
			bg: 'var(--color-secondary-100)'
		}
	};

	const participantCount = $derived((event.metadata?.participantCount as number) || 0);
	const topicCount = $derived((event.metadata?.topicCount as number) || 0);
	const status = $derived(statusConfig[event.status as EventStatus] || statusConfig.draft);
	const eventDate = $derived(
		event.startTime ? new Date(event.startTime).toLocaleDateString() : 'Not scheduled'
	);

	function handleView() {
		goto(`/events/${event.id}`);
	}

	function handleEdit() {
		goto(`/events/${event.id}/edit`);
	}

	function handleShare() {
		const shareUrl = `${window.location.origin}/join?code=${event.accessCode}`;
		navigator.clipboard.writeText(shareUrl);
		alert('Event link copied to clipboard!');
	}

	function handleDelete() {
		if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
			onDelete?.(event.id);
		}
	}
</script>

<article class="event-card">
	<button class="card-main" onclick={handleView} aria-label="View event details">
		<div class="card-header">
			<div class="event-icon">
				{#if event.status === EventStatus.ACTIVE}
					📍
				{:else if event.status === EventStatus.COMPLETED}
					✓
				{:else if event.status === EventStatus.PAUSED}
					⏸
				{:else}
					📝
				{/if}
			</div>
			<span class="status-badge" style="color: {status.color}; background: {status.bg}">
				{status.label}
			</span>
		</div>

		<div class="card-body">
			<h3 class="event-title">{event.title}</h3>
			{#if event.description}
				<p class="event-description">{event.description}</p>
			{/if}

			<div class="event-meta">
				<div class="meta-item">
					<span class="meta-icon">📅</span>
					<span class="meta-text">{eventDate}</span>
				</div>
				<div class="meta-item">
					<span class="meta-icon">👥</span>
					<span class="meta-text">{participantCount} participants</span>
				</div>
				<div class="meta-item">
					<span class="meta-icon">💡</span>
					<span class="meta-text">{topicCount} topics</span>
				</div>
			</div>

			<div class="event-code">
				<span class="code-label">Access Code:</span>
				<code class="access-code">{event.accessCode}</code>
			</div>
		</div>
	</button>

	<div class="card-actions">
		<Button variant="primary" size="sm" onclick={handleView}>View</Button>
		<Button variant="outline" size="sm" onclick={handleEdit}>Edit</Button>
		<Button variant="outline" size="sm" onclick={handleShare}>Share</Button>
		<Button variant="danger" size="sm" onclick={handleDelete}>Delete</Button>
	</div>
</article>

<style>
	.event-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		overflow: hidden;
		transition: all var(--transition-base);
		box-shadow: var(--shadow-base);
		display: flex;
		flex-direction: column;
	}

	.event-card:hover {
		transform: translateY(-4px);
		box-shadow: var(--shadow-lg);
		border-color: var(--color-primary-300);
	}

	.card-main {
		flex: 1;
		padding: var(--spacing-6);
		background: transparent;
		border: none;
		text-align: left;
		cursor: pointer;
		width: 100%;
		font: inherit;
	}

	.card-main:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: -2px;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--spacing-4);
	}

	.event-icon {
		font-size: 2rem;
		line-height: 1;
	}

	.status-badge {
		padding: var(--spacing-1) var(--spacing-3);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.event-title {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		margin: 0;
		line-height: var(--line-height-tight);
	}

	.event-description {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		margin: 0;
		line-height: var(--line-height-normal);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.event-meta {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
		margin-top: var(--spacing-2);
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.meta-icon {
		font-size: 1rem;
		line-height: 1;
	}

	.meta-text {
		line-height: 1;
	}

	.event-code {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		padding: var(--spacing-2) var(--spacing-3);
		background: var(--color-surface-secondary);
		border-radius: var(--radius-md);
		margin-top: var(--spacing-2);
	}

	.code-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
		font-weight: var(--font-weight-medium);
	}

	.access-code {
		font-family: var(--font-family-mono);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-primary);
		background: transparent;
		padding: 0;
	}

	.card-actions {
		display: flex;
		gap: var(--spacing-2);
		padding: var(--spacing-4) var(--spacing-6);
		background: var(--color-surface-secondary);
		border-top: 1px solid var(--color-border);
	}

	@media (max-width: 768px) {
		.card-actions {
			flex-wrap: wrap;
		}

		.card-actions :global(button) {
			flex: 1;
			min-width: calc(50% - var(--spacing-1));
		}

		.event-meta {
			gap: var(--spacing-1);
		}

		.meta-item {
			font-size: var(--font-size-xs);
		}
	}
</style>
