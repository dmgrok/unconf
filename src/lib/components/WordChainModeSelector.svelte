<script lang="ts">
	import type { WordChainGameMode } from '$lib/games/word-chain';

	export let selectedMode: WordChainGameMode = 'turn-based';
	export let disabled = false;

	const modes: { value: WordChainGameMode; label: string; description: string }[] = [
		{
			value: 'turn-based',
			label: 'Turn-Based',
			description: 'Players take turns submitting words in rotation'
		},
		{
			value: 'simultaneous',
			label: 'Simultaneous',
			description: 'All players can submit words at any time'
		}
	];
</script>

<div class="mode-selector">
	<label class="label">Game Mode</label>
	<div class="modes">
		{#each modes as mode}
			<button
				type="button"
				class="mode-option"
				class:selected={selectedMode === mode.value}
				{disabled}
				on:click={() => (selectedMode = mode.value)}
			>
				<div class="mode-header">
					<input
						type="radio"
						name="game-mode"
						value={mode.value}
						checked={selectedMode === mode.value}
						{disabled}
						on:change={() => (selectedMode = mode.value)}
					/>
					<span class="mode-label">{mode.label}</span>
				</div>
				<p class="mode-description">{mode.description}</p>
			</button>
		{/each}
	</div>
</div>

<style>
	.mode-selector {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.label {
		font-weight: 500;
		font-size: 0.875rem;
		color: var(--color-text-primary, #1f2937);
	}

	.modes {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.mode-option {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 1rem;
		border: 2px solid var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		background: var(--color-background, #ffffff);
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		width: 100%;
	}

	.mode-option:hover:not(:disabled) {
		border-color: var(--color-primary, #3b82f6);
		background: var(--color-background-hover, #f9fafb);
	}

	.mode-option.selected {
		border-color: var(--color-primary, #3b82f6);
		background: var(--color-primary-light, #eff6ff);
	}

	.mode-option:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.mode-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.mode-label {
		font-weight: 500;
		font-size: 0.95rem;
		color: var(--color-text-primary, #1f2937);
	}

	.mode-description {
		margin: 0;
		margin-left: 1.5rem;
		font-size: 0.875rem;
		color: var(--color-text-secondary, #6b7280);
		line-height: 1.4;
	}

	input[type='radio'] {
		cursor: pointer;
	}

	input[type='radio']:disabled {
		cursor: not-allowed;
	}
</style>
