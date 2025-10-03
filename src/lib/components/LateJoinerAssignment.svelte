<script lang="ts">
	/**
	 * Late Joiner Assignment Interface
	 * Shows assignment suggestions for participants joining after distribution
	 */
	import { Users, TrendingUp, CheckCircle, AlertCircle, Info } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import type { Team, Participant } from '../utils/team-distribution';
	import {
		suggestTeamAssignment,
		assignLateJoiner,
		getTeamCapacityStatus,
		type LateJoinerSuggestion,
		type LateJoinerAssignmentOptions
	} from '../utils/late-joiner-handler';

	interface LateJoinerAssignmentProps {
		participant: Participant;
		teams: Team[];
		options?: LateJoinerAssignmentOptions;
		autoAssign?: boolean;
		class?: string;
	}

	let {
		participant,
		teams = $bindable([]),
		options = {},
		autoAssign = false,
		class: className = ''
	}: LateJoinerAssignmentProps = $props();

	const dispatch = createEventDispatcher<{
		assign: { participant: Participant; team: Team; suggestion: LateJoinerSuggestion };
		cancel: void;
	}>();

	// Get suggestions
	const suggestions = $derived(suggestTeamAssignment(participant, teams, options));
	const capacityStatuses = $derived(getTeamCapacityStatus(teams));

	// Auto-assign if enabled
	$effect(() => {
		if (autoAssign && suggestions.length > 0) {
			handleAssign(suggestions[0]);
		}
	});

	function handleAssign(suggestion: LateJoinerSuggestion) {
		dispatch('assign', {
			participant,
			team: suggestion.team,
			suggestion
		});
	}

	function getScoreColor(score: number): string {
		if (score >= 50) return '#10b981';
		if (score >= 20) return '#f59e0b';
		return '#ef4444';
	}

	function getScoreLabel(score: number): string {
		if (score >= 50) return 'Excellent Fit';
		if (score >= 20) return 'Good Fit';
		if (score >= 0) return 'Acceptable';
		return 'Poor Fit';
	}
</script>

<div class="late-joiner-assignment {className}">
	<div class="participant-header">
		<div class="participant-info">
			<h3>Assign Late Joiner</h3>
			<div class="participant-details">
				<strong>{participant.name}</strong>
				{#if participant.category}
					<span class="category-badge">{participant.category}</span>
				{/if}
				{#if participant.preference}
					<span class="preference-text">Prefers: {participant.preference}</span>
				{/if}
			</div>
		</div>
	</div>

	{#if suggestions.length === 0}
		<div class="no-suggestions">
			<AlertCircle size={48} />
			<h4>No Available Teams</h4>
			<p>All teams are at capacity or exclude this participant's category.</p>
			<button class="button secondary" onclick={() => dispatch('cancel')}>
				Cancel
			</button>
		</div>
	{:else}
		<div class="suggestions-section">
			<div class="section-header">
				<h4>Suggested Teams</h4>
				<p>Teams ranked by fit quality</p>
			</div>

			<div class="suggestions-list">
				{#each suggestions as suggestion, index}
					{@const capacity = capacityStatuses.find((s) => s.team.id === suggestion.team.id)}

					<div class="suggestion-card" class:best={index === 0}>
						<div class="suggestion-header">
							<div class="team-info">
								<div class="team-name-row">
									<h5>{suggestion.team.name}</h5>
									{#if index === 0}
										<span class="best-badge">Best Match</span>
									{/if}
								</div>
								{#if suggestion.team.topic}
									<span class="team-topic">{suggestion.team.topic}</span>
								{/if}
							</div>

							<div class="score-badge" style="background: {getScoreColor(suggestion.score)}">
								<span class="score-value">{suggestion.score}</span>
								<span class="score-label">{getScoreLabel(suggestion.score)}</span>
							</div>
						</div>

						<div class="suggestion-reason">
							<Info size={16} />
							<span>{suggestion.reason}</span>
						</div>

						{#if capacity}
							<div class="capacity-info">
								<Users size={16} />
								<div class="capacity-bar">
									<div
										class="capacity-fill"
										style="width: {capacity.capacityPercentage}%"
									></div>
								</div>
								<span class="capacity-text">
									{capacity.currentSize} / {capacity.maxSize}
									({capacity.availableSlots} slots)
								</span>
							</div>
						{/if}

						<div class="impact-details">
							<h6>Impact</h6>
							<div class="impact-grid">
								<div class="impact-item">
									<span class="impact-label">Size Balance</span>
									<span
										class="impact-value"
										class:positive={suggestion.impact.sizeChange > 0}
										class:negative={suggestion.impact.sizeChange < 0}
									>
										{suggestion.impact.sizeChange > 0 ? '+' : ''}{suggestion.impact.sizeChange.toFixed(1)}
									</span>
								</div>

								<div class="impact-item">
									<span class="impact-label">Category Balance</span>
									<span
										class="impact-value"
										class:positive={suggestion.impact.balanceChange > 0}
										class:negative={suggestion.impact.balanceChange < 0}
									>
										{suggestion.impact.balanceChange > 0 ? '+' : ''}{suggestion.impact.balanceChange.toFixed(1)}%
									</span>
								</div>

								<div class="impact-item">
									<span class="impact-label">Category Fit</span>
									<span
										class="impact-value"
										class:positive={suggestion.impact.categoryFit > 0}
										class:negative={suggestion.impact.categoryFit < 0}
									>
										{suggestion.impact.categoryFit > 0 ? '+' : ''}{suggestion.impact.categoryFit}
									</span>
								</div>
							</div>
						</div>

						<div class="current-members">
							<h6>Current Members ({suggestion.team.members.length})</h6>
							<div class="members-grid">
								{#each suggestion.team.members.slice(0, 6) as member}
									<div class="member-chip">
										<span class="member-name">{member.name}</span>
										{#if member.category}
											<span class="member-category">{member.category}</span>
										{/if}
									</div>
								{/each}
								{#if suggestion.team.members.length > 6}
									<div class="member-chip more">
										+{suggestion.team.members.length - 6} more
									</div>
								{/if}
							</div>
						</div>

						<button
							class="assign-button"
							class:primary={index === 0}
							onclick={() => handleAssign(suggestion)}
						>
							<CheckCircle size={18} />
							Assign to {suggestion.team.name}
						</button>
					</div>
				{/each}
			</div>
		</div>

		<div class="actions">
			<button class="button secondary" onclick={() => dispatch('cancel')}>
				Cancel
			</button>
		</div>
	{/if}
</div>

<style>
	.late-joiner-assignment {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		max-width: 800px;
		margin: 0 auto;
	}

	.participant-header {
		margin-bottom: 2rem;
	}

	.participant-info h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1.5rem;
		color: #1f2937;
	}

	.participant-details {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		font-size: 1rem;
		color: #6b7280;
	}

	.category-badge {
		padding: 0.25rem 0.75rem;
		background: #eef2ff;
		color: #6366f1;
		border-radius: 12px;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.preference-text {
		font-size: 0.875rem;
		font-style: italic;
	}

	/* No Suggestions */
	.no-suggestions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3rem 2rem;
		text-align: center;
		color: #9ca3af;
	}

	.no-suggestions h4 {
		margin: 0;
		color: #374151;
	}

	.no-suggestions p {
		margin: 0;
		color: #6b7280;
	}

	/* Suggestions Section */
	.suggestions-section {
		margin-bottom: 1.5rem;
	}

	.section-header {
		margin-bottom: 1.5rem;
	}

	.section-header h4 {
		margin: 0 0 0.25rem 0;
		font-size: 1.125rem;
		color: #1f2937;
	}

	.section-header p {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.suggestions-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.suggestion-card {
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		transition: all 0.2s;
	}

	.suggestion-card.best {
		border-color: #6366f1;
		background: #fafafa;
	}

	.suggestion-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.team-name-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.25rem;
	}

	.team-name-row h5 {
		margin: 0;
		font-size: 1.125rem;
		color: #1f2937;
	}

	.best-badge {
		padding: 0.25rem 0.5rem;
		background: #6366f1;
		color: white;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.team-topic {
		display: block;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.score-badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		color: white;
		min-width: 100px;
	}

	.score-value {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.score-label {
		font-size: 0.75rem;
		opacity: 0.9;
	}

	.suggestion-reason {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.75rem;
		background: #f9fafb;
		border-radius: 6px;
		margin-bottom: 1rem;
		font-size: 0.875rem;
		color: #374151;
	}

	.capacity-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		padding: 0.75rem;
		background: #f9fafb;
		border-radius: 6px;
	}

	.capacity-bar {
		flex: 1;
		height: 8px;
		background: #e5e7eb;
		border-radius: 4px;
		overflow: hidden;
	}

	.capacity-fill {
		height: 100%;
		background: #6366f1;
		transition: width 0.3s;
	}

	.capacity-text {
		font-size: 0.875rem;
		color: #6b7280;
		white-space: nowrap;
	}

	.impact-details {
		margin-bottom: 1rem;
	}

	.impact-details h6 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		color: #374151;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.impact-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}

	.impact-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.75rem;
		background: #f9fafb;
		border-radius: 6px;
	}

	.impact-label {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.impact-value {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
	}

	.impact-value.positive {
		color: #10b981;
	}

	.impact-value.negative {
		color: #ef4444;
	}

	.current-members h6 {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		color: #374151;
	}

	.members-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.member-chip {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: 0.5rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.member-chip.more {
		justify-content: center;
		align-items: center;
		color: #9ca3af;
		font-style: italic;
	}

	.member-name {
		color: #1f2937;
		font-weight: 500;
	}

	.member-category {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.assign-button {
		width: 100%;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 500;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
		border: 2px solid #d1d5db;
		background: white;
		color: #374151;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.assign-button:hover {
		background: #f9fafb;
		border-color: #9ca3af;
	}

	.assign-button.primary {
		background: #6366f1;
		color: white;
		border-color: #6366f1;
	}

	.assign-button.primary:hover {
		background: #4f46e5;
		border-color: #4f46e5;
	}

	/* Actions */
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.button {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 500;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.button.secondary {
		background: white;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.button.secondary:hover {
		background: #f9fafb;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.late-joiner-assignment {
			padding: 1rem;
		}

		.suggestion-header {
			flex-direction: column;
			gap: 1rem;
		}

		.score-badge {
			width: 100%;
		}

		.impact-grid {
			grid-template-columns: 1fr;
		}

		.members-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
