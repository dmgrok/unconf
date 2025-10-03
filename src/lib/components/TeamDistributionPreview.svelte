<script lang="ts">
	/**
	 * Team Distribution Preview
	 * Shows preview with validation warnings before finalizing distribution
	 */
	import {
		AlertTriangle,
		CheckCircle,
		Users,
		TrendingUp,
		TrendingDown,
		Info
	} from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import type { Team, DistributionResult } from '../utils/team-distribution';

	interface TeamDistributionPreviewProps {
		result: DistributionResult;
		showDetails?: boolean;
		class?: string;
	}

	let {
		result,
		showDetails = true,
		class: className = ''
	}: TeamDistributionPreviewProps = $props();

	const dispatch = createEventDispatcher<{
		confirm: { result: DistributionResult };
		edit: void;
		cancel: void;
	}>();

	interface ValidationIssue {
		type: 'error' | 'warning' | 'info';
		message: string;
		teamId?: string;
	}

	// Validation logic
	const validationIssues = $derived<ValidationIssue[]>(() => {
		const issues: ValidationIssue[] = [];

		// Check for unassigned participants
		if (result.unassigned.length > 0) {
			issues.push({
				type: 'warning',
				message: `${result.unassigned.length} participant(s) remain unassigned`
			});
		}

		// Check each team
		for (const team of result.teams) {
			const minSize = team.minSize || team.constraints?.minParticipants || 3;
			const maxSize = team.maxSize || team.constraints?.maxParticipants || 50;

			// Team size issues
			if (team.members.length < minSize) {
				issues.push({
					type: 'warning',
					message: `${team.name} has only ${team.members.length} member(s) (minimum: ${minSize})`,
					teamId: team.id
				});
			}

			if (team.members.length > maxSize) {
				issues.push({
					type: 'error',
					message: `${team.name} has ${team.members.length} member(s) (maximum: ${maxSize})`,
					teamId: team.id
				});
			}

			// Check category balance if constraints exist
			if (team.constraints?.requiredCategories) {
				const teamCategories = new Set(
					team.members.map((m) => m.category).filter(Boolean)
				);
				const missing = team.constraints.requiredCategories.filter(
					(cat) => !teamCategories.has(cat)
				);

				if (missing.length > 0) {
					issues.push({
						type: 'warning',
						message: `${team.name} is missing required categories: ${missing.join(', ')}`,
						teamId: team.id
					});
				}
			}

			// Check for excluded categories
			if (team.constraints?.excludeCategories) {
				const violations = team.members.filter(
					(m) => m.category && team.constraints!.excludeCategories!.includes(m.category)
				);

				if (violations.length > 0) {
					issues.push({
						type: 'error',
						message: `${team.name} contains excluded category members: ${violations.map((v) => v.name).join(', ')}`,
						teamId: team.id
					});
				}
			}
		}

		// Add result warnings
		for (const warning of result.warnings) {
			issues.push({
				type: 'warning',
				message: warning
			});
		}

		// Balance score info
		if (result.metadata.balanceScore !== undefined) {
			if (result.metadata.balanceScore < 50) {
				issues.push({
					type: 'warning',
					message: `Low balance score (${result.metadata.balanceScore}/100). Consider rebalancing.`
				});
			} else if (result.metadata.balanceScore >= 80) {
				issues.push({
					type: 'info',
					message: `Good balance score (${result.metadata.balanceScore}/100)`
				});
			}
		}

		return issues;
	});

	const hasErrors = $derived(validationIssues().some((i) => i.type === 'error'));
	const hasWarnings = $derived(validationIssues().some((i) => i.type === 'warning'));

	// Statistics
	const stats = $derived(() => {
		const sizes = result.teams.map((t) => t.members.length);
		const minTeamSize = Math.min(...sizes);
		const maxTeamSize = Math.max(...sizes);
		const variance =
			sizes.reduce((sum, size) => sum + Math.pow(size - result.metadata.averageTeamSize, 2), 0) /
			sizes.length;
		const standardDeviation = Math.sqrt(variance);

		// Category distribution
		const categoryCount = new Map<string, number>();
		result.teams.forEach((team) =>
			team.members.forEach((m) => {
				if (m.category) {
					categoryCount.set(m.category, (categoryCount.get(m.category) || 0) + 1);
				}
			})
		);

		return {
			minTeamSize,
			maxTeamSize,
			standardDeviation,
			categoryDistribution: Array.from(categoryCount.entries()).sort((a, b) => b[1] - a[1])
		};
	});

	function getTeamSizeVariance(team: Team): number {
		const diff = team.members.length - result.metadata.averageTeamSize;
		return (diff / result.metadata.averageTeamSize) * 100;
	}

	function getCategoryDistribution(team: Team): Map<string, number> {
		const dist = new Map<string, number>();
		team.members.forEach((m) => {
			if (m.category) {
				dist.set(m.category, (dist.get(m.category) || 0) + 1);
			}
		});
		return dist;
	}
</script>

<div class="team-distribution-preview {className}">
	<div class="preview-header">
		<div>
			<h3>Distribution Preview</h3>
			<p class="algorithm-info">
				Algorithm: <strong>{result.metadata.algorithm}</strong> •
				Generated: {result.metadata.timestamp.toLocaleTimeString()}
			</p>
		</div>
	</div>

	<!-- Summary Statistics -->
	<div class="summary-stats">
		<div class="stat-card">
			<div class="stat-icon">
				<Users size={24} />
			</div>
			<div class="stat-content">
				<span class="stat-label">Total Participants</span>
				<span class="stat-value">{result.metadata.participantCount}</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">
				<Users size={24} />
			</div>
			<div class="stat-content">
				<span class="stat-label">Teams Created</span>
				<span class="stat-value">{result.metadata.teamCount}</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">
				<Users size={24} />
			</div>
			<div class="stat-content">
				<span class="stat-label">Avg Team Size</span>
				<span class="stat-value">{result.metadata.averageTeamSize.toFixed(1)}</span>
			</div>
		</div>

		{#if result.metadata.balanceScore !== undefined}
			<div class="stat-card">
				<div class="stat-icon" class:success={result.metadata.balanceScore >= 80}>
					<CheckCircle size={24} />
				</div>
				<div class="stat-content">
					<span class="stat-label">Balance Score</span>
					<span class="stat-value">{result.metadata.balanceScore}/100</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- Validation Issues -->
	{#if validationIssues().length > 0}
		<div class="validation-section">
			<h4>Validation Results</h4>

			<div class="issues-list">
				{#each validationIssues() as issue}
					<div class="issue-item" class:error={issue.type === 'error'} class:warning={issue.type === 'warning'} class:info={issue.type === 'info'}>
						{#if issue.type === 'error'}
							<AlertTriangle size={18} />
						{:else if issue.type === 'warning'}
							<AlertTriangle size={18} />
						{:else}
							<Info size={18} />
						{/if}
						<span>{issue.message}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Team Details -->
	{#if showDetails}
		<div class="teams-section">
			<h4>Team Details</h4>

			<div class="teams-grid">
				{#each result.teams as team}
					{@const variance = getTeamSizeVariance(team)}
					{@const categoryDist = getCategoryDistribution(team)}

					<div class="team-preview-card">
						<div class="team-preview-header">
							<div>
								<h5>{team.name}</h5>
								{#if team.topic}
									<span class="team-topic">{team.topic}</span>
								{/if}
							</div>

							<div class="team-size-badge">
								<Users size={16} />
								<span>{team.members.length}</span>

								{#if Math.abs(variance) > 20}
									{#if variance > 0}
										<TrendingUp size={14} class="variance-indicator up" />
									{:else}
										<TrendingDown size={14} class="variance-indicator down" />
									{/if}
								{/if}
							</div>
						</div>

						{#if categoryDist.size > 0}
							<div class="category-distribution">
								<span class="dist-label">Categories:</span>
								<div class="category-chips">
									{#each Array.from(categoryDist.entries()) as [category, count]}
										<span class="category-chip">
											{category} ({count})
										</span>
									{/each}
								</div>
							</div>
						{/if}

						<div class="members-preview">
							{#each team.members.slice(0, 5) as member}
								<div class="member-preview">
									<span class="member-name">{member.name}</span>
									{#if member.category}
										<span class="member-category">{member.category}</span>
									{/if}
								</div>
							{/each}

							{#if team.members.length > 5}
								<div class="more-members">
									+{team.members.length - 5} more
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Unassigned Participants -->
	{#if result.unassigned.length > 0}
		<div class="unassigned-section">
			<h4>
				<AlertTriangle size={20} />
				Unassigned Participants ({result.unassigned.length})
			</h4>

			<div class="unassigned-list">
				{#each result.unassigned as participant}
					<div class="unassigned-participant">
						<span class="participant-name">{participant.name}</span>
						{#if participant.category}
							<span class="participant-category">{participant.category}</span>
						{/if}
						{#if participant.preference}
							<span class="participant-preference">Prefers: {participant.preference}</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Additional Statistics -->
	{#if showDetails}
		<div class="additional-stats">
			<div class="stat-section">
				<h5>Team Size Distribution</h5>
				<div class="stat-details">
					<div class="stat-row">
						<span>Smallest Team:</span>
						<span class="stat-value">{stats().minTeamSize} members</span>
					</div>
					<div class="stat-row">
						<span>Largest Team:</span>
						<span class="stat-value">{stats().maxTeamSize} members</span>
					</div>
					<div class="stat-row">
						<span>Standard Deviation:</span>
						<span class="stat-value">{stats().standardDeviation.toFixed(2)}</span>
					</div>
				</div>
			</div>

			{#if stats().categoryDistribution.length > 0}
				<div class="stat-section">
					<h5>Overall Category Distribution</h5>
					<div class="stat-details">
						{#each stats().categoryDistribution as [category, count]}
							<div class="stat-row">
								<span>{category}:</span>
								<span class="stat-value">{count} participants</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Actions -->
	<div class="preview-actions">
		<button class="button secondary" onclick={() => dispatch('cancel')}>Cancel</button>
		<button class="button secondary" onclick={() => dispatch('edit')}>Edit Manually</button>
		<button
			class="button primary"
			onclick={() => dispatch('confirm', { result })}
			disabled={hasErrors}
		>
			{#if hasErrors}
				Fix Errors First
			{:else if hasWarnings}
				Confirm (with warnings)
			{:else}
				Confirm Distribution
			{/if}
		</button>
	</div>
</div>

<style>
	.team-distribution-preview {
		background: white;
		border-radius: 12px;
		padding: 2rem;
	}

	.preview-header h3 {
		margin: 0 0 0.25rem 0;
		font-size: 1.5rem;
		color: #1f2937;
	}

	.algorithm-info {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
	}

	/* Summary Statistics */
	.summary-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
		margin: 1.5rem 0;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 8px;
	}

	.stat-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: #eef2ff;
		color: #6366f1;
		border-radius: 8px;
	}

	.stat-icon.success {
		background: #dcfce7;
		color: #16a34a;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	/* Validation Section */
	.validation-section {
		margin: 1.5rem 0;
	}

	.validation-section h4 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		color: #1f2937;
	}

	.issues-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.issue-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: 8px;
		font-size: 0.875rem;
	}

	.issue-item.error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
	}

	.issue-item.warning {
		background: #fffbeb;
		border: 1px solid #fde68a;
		color: #92400e;
	}

	.issue-item.info {
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		color: #1e40af;
	}

	/* Teams Section */
	.teams-section {
		margin: 1.5rem 0;
	}

	.teams-section h4 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		color: #1f2937;
	}

	.teams-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.team-preview-card {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
		background: #fafafa;
	}

	.team-preview-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
	}

	.team-preview-header h5 {
		margin: 0;
		font-size: 1rem;
		color: #1f2937;
	}

	.team-topic {
		display: block;
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}

	.team-size-badge {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.variance-indicator {
		color: #9ca3af;
	}

	.variance-indicator.up {
		color: #10b981;
	}

	.variance-indicator.down {
		color: #ef4444;
	}

	.category-distribution {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.dist-label {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
	}

	.category-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.category-chip {
		padding: 0.25rem 0.5rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		font-size: 0.75rem;
		color: #374151;
	}

	.members-preview {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.member-preview {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		background: white;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.member-name {
		color: #1f2937;
		font-weight: 500;
	}

	.member-category {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.more-members {
		padding: 0.5rem;
		text-align: center;
		font-size: 0.75rem;
		color: #9ca3af;
		font-style: italic;
	}

	/* Unassigned Section */
	.unassigned-section {
		margin: 1.5rem 0;
		padding: 1rem;
		background: #fffbeb;
		border: 1px solid #fde68a;
		border-radius: 8px;
	}

	.unassigned-section h4 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		color: #92400e;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.unassigned-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.5rem;
	}

	.unassigned-participant {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.5rem;
		background: white;
		border-radius: 6px;
	}

	.participant-name {
		font-size: 0.875rem;
		color: #1f2937;
		font-weight: 500;
	}

	.participant-category,
	.participant-preference {
		font-size: 0.75rem;
		color: #6b7280;
	}

	/* Additional Statistics */
	.additional-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin: 1.5rem 0;
		padding: 1.5rem;
		background: #f9fafb;
		border-radius: 8px;
	}

	.stat-section h5 {
		margin: 0 0 1rem 0;
		font-size: 0.875rem;
		color: #374151;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.stat-row .stat-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: #1f2937;
	}

	/* Actions */
	.preview-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
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

	.button.primary {
		background: #6366f1;
		color: white;
	}

	.button.primary:hover:not(:disabled) {
		background: #4f46e5;
	}

	.button.primary:disabled {
		background: #d1d5db;
		cursor: not-allowed;
		opacity: 0.6;
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
		.team-distribution-preview {
			padding: 1rem;
		}

		.summary-stats {
			grid-template-columns: repeat(2, 1fr);
		}

		.teams-grid {
			grid-template-columns: 1fr;
		}

		.additional-stats {
			grid-template-columns: 1fr;
		}

		.preview-actions {
			flex-direction: column;
		}

		.button {
			width: 100%;
		}
	}
</style>
