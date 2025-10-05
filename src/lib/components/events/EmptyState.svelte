<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '../ui/Button.svelte';

	interface EmptyStateProps {
		variant?: 'first-time' | 'no-results' | 'loading';
		filterText?: string;
	}

	let { variant = 'first-time', filterText = '' }: EmptyStateProps = $props();

	function handleCreateEvent() {
		goto('/events/create');
	}

	const config = {
		'first-time': {
			icon: '🎯',
			title: 'Create Your First Event',
			description: 'Get started by creating an unconference event. Set up voting, discussion groups, and interactive activities in minutes.',
			showButton: true
		},
		'no-results': {
			icon: '🔍',
			title: 'No Events Found',
			description: filterText
				? `No events match "${filterText}". Try adjusting your filters or create a new event.`
				: 'No events match your current filters. Try adjusting your search criteria.',
			showButton: true
		},
		loading: {
			icon: '⏳',
			title: 'Loading Events...',
			description: 'Please wait while we fetch your events.',
			showButton: false
		}
	};

	const currentConfig = $derived(config[variant]);
</script>

<div class="empty-state">
	<div class="empty-state-content">
		<div class="empty-icon">{currentConfig.icon}</div>
		<h2 class="empty-title">{currentConfig.title}</h2>
		<p class="empty-description">{currentConfig.description}</p>
		{#if currentConfig.showButton}
			<Button variant="primary" size="lg" onclick={handleCreateEvent}>
				Create New Event
			</Button>
		{/if}
	</div>
</div>

<style>
	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		padding: var(--spacing-12) var(--spacing-6);
	}

	.empty-state-content {
		max-width: 500px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-4);
	}

	.empty-icon {
		font-size: 5rem;
		line-height: 1;
		opacity: 0.8;
	}

	.empty-title {
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		margin: 0;
	}

	.empty-description {
		font-size: var(--font-size-lg);
		color: var(--color-text-secondary);
		line-height: var(--line-height-relaxed);
		margin: 0;
	}

	@media (max-width: 768px) {
		.empty-state {
			min-height: 300px;
			padding: var(--spacing-8) var(--spacing-4);
		}

		.empty-icon {
			font-size: 4rem;
		}

		.empty-title {
			font-size: var(--font-size-2xl);
		}

		.empty-description {
			font-size: var(--font-size-base);
		}
	}
</style>
