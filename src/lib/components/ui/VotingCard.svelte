<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Check, ThumbsUp, Heart, Star, TrendingUp } from 'lucide-svelte';
	import Button from './Button.svelte';
	import Card from './Card.svelte';

	interface VotingOption {
		id: string;
		label: string;
		description?: string;
		votes?: number;
		icon?: 'thumbsup' | 'heart' | 'star' | 'trending';
	}

	interface VotingCardProps {
		title: string;
		description?: string;
		options: VotingOption[];
		selectedOption?: string;
		multiSelect?: boolean;
		showResults?: boolean;
		showVoteCounts?: boolean;
		disabled?: boolean;
		variant?: 'default' | 'compact';
		class?: string;
	}

	let {
		title,
		description,
		options,
		selectedOption = $bindable(),
		multiSelect = false,
		showResults = false,
		showVoteCounts = false,
		disabled = false,
		variant = 'default',
		class: className = ''
	}: VotingCardProps = $props();

	const dispatch = createEventDispatcher<{
		vote: { optionId: string; option: VotingOption };
		change: { selectedOption: string | string[] | undefined };
	}>();

	// For multi-select, track selected options as an array
	let selectedOptions = $state<string[]>([]);

	// Total votes for percentage calculation
	$: totalVotes = options.reduce((sum, option) => sum + (option.votes || 0), 0);

	// Get icon component for option
	function getOptionIcon(iconType?: string) {
		switch (iconType) {
			case 'heart': return Heart;
			case 'star': return Star;
			case 'trending': return TrendingUp;
			case 'thumbsup':
			default: return ThumbsUp;
		}
	}

	// Handle single select voting
	function handleSingleVote(optionId: string) {
		if (disabled) return;

		const option = options.find(o => o.id === optionId);
		if (!option) return;

		selectedOption = selectedOption === optionId ? undefined : optionId;
		dispatch('vote', { optionId, option });
		dispatch('change', { selectedOption });
	}

	// Handle multi-select voting
	function handleMultiVote(optionId: string) {
		if (disabled) return;

		const option = options.find(o => o.id === optionId);
		if (!option) return;

		const currentIndex = selectedOptions.indexOf(optionId);
		if (currentIndex >= 0) {
			selectedOptions = selectedOptions.filter(id => id !== optionId);
		} else {
			selectedOptions = [...selectedOptions, optionId];
		}

		dispatch('vote', { optionId, option });
		dispatch('change', { selectedOption: selectedOptions });
	}

	// Check if option is selected
	function isSelected(optionId: string): boolean {
		if (multiSelect) {
			return selectedOptions.includes(optionId);
		}
		return selectedOption === optionId;
	}

	// Get vote percentage for results display
	function getVotePercentage(votes: number): number {
		return totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
	}
</script>

<Card
	variant="outlined"
	padding={variant === 'compact' ? 'sm' : 'md'}
	class="voting-card {className}"
>
	{#snippet header()}
		<div class="voting-header">
			<h3 class="voting-title">{title}</h3>
			{#if description}
				<p class="voting-description">{description}</p>
			{/if}
			{#if showVoteCounts && totalVotes > 0}
				<div class="voting-stats">
					Total votes: {totalVotes}
				</div>
			{/if}
		</div>
	{/snippet}

	<div class="voting-options" role="group" aria-labelledby="voting-title">
		{#each options as option (option.id)}
			{@const isOptionSelected = isSelected(option.id)}
			{@const votePercentage = getVotePercentage(option.votes || 0)}
			{@const IconComponent = getOptionIcon(option.icon)}

			<button
				class="voting-option"
				class:selected={isOptionSelected}
				class:compact={variant === 'compact'}
				class:show-results={showResults}
				onclick={() => multiSelect ? handleMultiVote(option.id) : handleSingleVote(option.id)}
				disabled={disabled}
				aria-pressed={isOptionSelected}
				aria-describedby={option.description ? `${option.id}-desc` : undefined}
			>
				<div class="option-content">
					<div class="option-main">
						<div class="option-icon">
							{#if isOptionSelected}
								<Check size={16} />
							{:else}
								<IconComponent size={16} />
							{/if}
						</div>

						<div class="option-text">
							<span class="option-label">{option.label}</span>
							{#if option.description}
								<span id="{option.id}-desc" class="option-description">
									{option.description}
								</span>
							{/if}
						</div>
					</div>

					{#if showVoteCounts && (option.votes !== undefined)}
						<div class="option-votes">
							{option.votes}
						</div>
					{/if}
				</div>

				{#if showResults && totalVotes > 0}
					<div class="option-results">
						<div class="results-bar">
							<div
								class="results-fill"
								style="width: {votePercentage}%"
								aria-hidden="true"
							></div>
						</div>
						<span class="results-percentage" aria-label="{votePercentage.toFixed(1)} percent">
							{votePercentage.toFixed(1)}%
						</span>
					</div>
				{/if}
			</button>
		{/each}
	</div>

	{#if multiSelect && selectedOptions.length > 0}
		{#snippet footer()}
			<div class="voting-summary">
				Selected: {selectedOptions.length} option{selectedOptions.length !== 1 ? 's' : ''}
			</div>
		{/snippet}
	{/if}
</Card>

<style>
	.voting-card {
		max-width: 100%;
	}

	.voting-header {
		text-align: center;
	}

	.voting-title {
		margin: 0 0 0.5rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
	}

	.voting-description {
		margin: 0 0 0.75rem;
		color: #6b7280;
		font-size: 0.875rem;
		line-height: 1.4;
	}

	.voting-stats {
		font-size: 0.75rem;
		color: #9ca3af;
		font-weight: 500;
	}

	.voting-options {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.voting-option {
		width: 100%;
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		position: relative;
		overflow: hidden;
	}

	.voting-option.compact {
		padding: 0.75rem;
	}

	.voting-option:hover:not(:disabled) {
		border-color: #d1d5db;
		background-color: #f9fafb;
	}

	.voting-option:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.voting-option.selected {
		border-color: #3b82f6;
		background-color: #eff6ff;
	}

	.voting-option:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.option-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		position: relative;
		z-index: 1;
	}

	.option-main {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		flex: 1;
	}

	.option-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 0.375rem;
		background-color: #f3f4f6;
		color: #6b7280;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.voting-option.selected .option-icon {
		background-color: #3b82f6;
		color: white;
	}

	.option-text {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
		flex: 1;
	}

	.option-label {
		font-weight: 500;
		color: #1f2937;
		line-height: 1.4;
	}

	.option-description {
		font-size: 0.75rem;
		color: #6b7280;
		line-height: 1.3;
	}

	.option-votes {
		font-size: 0.875rem;
		font-weight: 600;
		color: #4b5563;
		background-color: #f3f4f6;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		flex-shrink: 0;
	}

	.voting-option.selected .option-votes {
		background-color: #dbeafe;
		color: #1d4ed8;
	}

	.option-results {
		margin-top: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.results-bar {
		flex: 1;
		height: 0.5rem;
		background-color: #e5e7eb;
		border-radius: 0.25rem;
		overflow: hidden;
	}

	.results-fill {
		height: 100%;
		background-color: #3b82f6;
		border-radius: 0.25rem;
		transition: width 0.5s ease;
	}

	.results-percentage {
		font-size: 0.75rem;
		font-weight: 600;
		color: #4b5563;
		min-width: 2.5rem;
		text-align: right;
	}

	.voting-summary {
		text-align: center;
		color: #6b7280;
		font-size: 0.875rem;
		font-weight: 500;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.voting-option {
			padding: 0.75rem;
		}

		.option-content {
			gap: 0.75rem;
		}

		.option-main {
			gap: 0.5rem;
		}

		.option-icon {
			width: 1.75rem;
			height: 1.75rem;
		}
	}
</style>