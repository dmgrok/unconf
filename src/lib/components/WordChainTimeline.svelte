<script lang="ts">
	import type { WordSubmission } from '$lib/games/word-chain';
	import { onMount } from 'svelte';

	export let chain: WordSubmission[] = [];
	export let currentUserId: string;

	let timelineContainer: HTMLDivElement;

	// Auto-scroll to bottom when new words are added
	$: if (chain.length && timelineContainer) {
		setTimeout(() => {
			timelineContainer.scrollTop = timelineContainer.scrollHeight;
		}, 100);
	}

	function formatTime(timestamp: number): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	}
</script>

<div class="timeline-container" bind:this={timelineContainer}>
	{#if chain.length === 0}
		<div class="empty-state">
			<p>No words yet!</p>
			<p class="hint">Be the first to start the chain</p>
		</div>
	{:else}
		<div class="timeline">
			{#each chain as submission, index (submission.id)}
				<div class="timeline-item" class:own={submission.submittedBy === currentUserId}>
					<div class="item-connector">
						{#if index > 0}
							<div class="connector-line"></div>
						{/if}
						<div class="item-number">{index + 1}</div>
					</div>

					<div class="item-content">
						<div class="item-header">
							<span class="player-name" class:own={submission.submittedBy === currentUserId}>
								{submission.submittedByName}
								{#if submission.submittedBy === currentUserId}
									<span class="you-badge">(you)</span>
								{/if}
							</span>
							<span class="timestamp">{formatTime(submission.timestamp)}</span>
						</div>

						<div class="word-display">
							{submission.word}
						</div>

						{#if submission.validationMessage}
							<div class="validation-message">
								{submission.validationMessage}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.timeline-container {
		max-height: 500px;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.timeline-container::-webkit-scrollbar {
		width: 6px;
	}

	.timeline-container::-webkit-scrollbar-track {
		background: var(--color-gray-100, #f3f4f6);
		border-radius: 3px;
	}

	.timeline-container::-webkit-scrollbar-thumb {
		background: var(--color-gray-300, #d1d5db);
		border-radius: 3px;
	}

	.timeline-container::-webkit-scrollbar-thumb:hover {
		background: var(--color-gray-400, #9ca3af);
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--color-text-secondary, #6b7280);
	}

	.empty-state p {
		margin: 0.5rem 0;
	}

	.empty-state .hint {
		font-size: 0.875rem;
		font-style: italic;
	}

	.timeline {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.timeline-item {
		display: flex;
		gap: 0.75rem;
		animation: slideIn 0.3s ease-out;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.item-connector {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex-shrink: 0;
	}

	.connector-line {
		width: 2px;
		height: 1rem;
		background: var(--color-primary-light, #dbeafe);
	}

	.item-number {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-primary, #3b82f6);
		color: white;
		border-radius: 50%;
		font-size: 0.75rem;
		font-weight: 600;
		flex-shrink: 0;
	}

	.timeline-item.own .item-number {
		background: var(--color-success, #059669);
	}

	.item-content {
		flex: 1;
		background: var(--color-gray-50, #f9fafb);
		border-radius: 0.5rem;
		padding: 0.75rem;
		border: 1px solid var(--color-border, #e5e7eb);
	}

	.timeline-item.own .item-content {
		background: var(--color-success-light, #d1fae5);
		border-color: var(--color-success, #059669);
	}

	.item-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.player-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary, #1f2937);
	}

	.player-name.own {
		color: var(--color-success-dark, #065f46);
	}

	.you-badge {
		font-weight: 400;
		color: var(--color-success, #059669);
		font-size: 0.75rem;
	}

	.timestamp {
		font-size: 0.75rem;
		color: var(--color-text-secondary, #6b7280);
	}

	.word-display {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary, #1f2937);
		padding: 0.5rem 0;
		letter-spacing: 0.05em;
	}

	.validation-message {
		margin-top: 0.5rem;
		padding: 0.5rem;
		background: var(--color-error-light, #fee2e2);
		color: var(--color-error-dark, #991b1b);
		border-radius: 0.25rem;
		font-size: 0.75rem;
	}
</style>
