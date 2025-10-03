<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { WordChainGameStatus } from '$lib/games/word-chain';

	export let gameStatus: WordChainGameStatus;
	export let isOrganizer = false;

	const dispatch = createEventDispatcher<{
		pause: void;
		resume: void;
		end: void;
	}>();

	function handlePause() {
		dispatch('pause');
	}

	function handleResume() {
		dispatch('resume');
	}

	function handleEnd() {
		if (confirm('Are you sure you want to end the game? This cannot be undone.')) {
			dispatch('end');
		}
	}
</script>

{#if isOrganizer}
	<div class="game-controls">
		<div class="controls-label">
			Game Controls
		</div>

		<div class="controls-buttons">
			{#if gameStatus === 'active'}
				<button class="control-btn pause" on:click={handlePause}>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
						<rect x="4" y="3" width="3" height="10" rx="1" fill="currentColor"/>
						<rect x="9" y="3" width="3" height="10" rx="1" fill="currentColor"/>
					</svg>
					Pause Game
				</button>
			{:else if gameStatus === 'paused'}
				<button class="control-btn resume" on:click={handleResume}>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M5 3.5C5 3.22 5.22 3 5.5 3C5.65 3 5.79 3.07 5.88 3.18L12.38 7.68C12.58 7.83 12.63 8.12 12.48 8.32C12.45 8.37 12.41 8.41 12.38 8.44L5.88 12.94C5.68 13.09 5.39 13.04 5.24 12.84C5.13 12.75 5.06 12.61 5.06 12.46L5 3.5Z" fill="currentColor"/>
					</svg>
					Resume Game
				</button>
			{/if}

			<button class="control-btn end" on:click={handleEnd}>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
					<rect x="3" y="3" width="10" height="10" rx="1" fill="currentColor"/>
				</svg>
				End Game
			</button>
		</div>

		{#if gameStatus === 'paused'}
			<div class="paused-notice">
				⏸️ Game is paused
			</div>
		{:else if gameStatus === 'completed'}
			<div class="completed-notice">
				🏁 Game has ended
			</div>
		{/if}
	</div>
{/if}

<style>
	.game-controls {
		background: var(--color-background, #ffffff);
		border-radius: 0.5rem;
		padding: 1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid var(--color-border, #e5e7eb);
	}

	.controls-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-text-secondary, #6b7280);
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}

	.controls-buttons {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.control-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		border: 1px solid;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s;
		background: white;
	}

	.control-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.control-btn:active {
		transform: translateY(0);
	}

	.control-btn.pause {
		color: var(--color-warning-dark, #92400e);
		border-color: var(--color-warning, #f59e0b);
		background: var(--color-warning-light, #fef3c7);
	}

	.control-btn.pause:hover {
		background: var(--color-warning, #f59e0b);
		color: white;
	}

	.control-btn.resume {
		color: var(--color-success-dark, #065f46);
		border-color: var(--color-success, #059669);
		background: var(--color-success-light, #d1fae5);
	}

	.control-btn.resume:hover {
		background: var(--color-success, #059669);
		color: white;
	}

	.control-btn.end {
		color: var(--color-error-dark, #991b1b);
		border-color: var(--color-error, #dc2626);
		background: var(--color-error-light, #fee2e2);
	}

	.control-btn.end:hover {
		background: var(--color-error, #dc2626);
		color: white;
	}

	.paused-notice,
	.completed-notice {
		margin-top: 0.75rem;
		padding: 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		text-align: center;
		font-weight: 500;
	}

	.paused-notice {
		background: var(--color-warning-light, #fef3c7);
		color: var(--color-warning-dark, #92400e);
	}

	.completed-notice {
		background: var(--color-gray-100, #f3f4f6);
		color: var(--color-text-secondary, #6b7280);
	}

	@media (max-width: 640px) {
		.controls-buttons {
			flex-direction: column;
		}

		.control-btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>
