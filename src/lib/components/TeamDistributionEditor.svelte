<script lang="ts">
	/**
	 * Team Distribution Editor
	 * Manual override interface for team assignments
	 */
	import { Users, MoveRight, AlertCircle, RefreshCw, Check, X } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import type { Team, Participant } from '../utils/team-distribution';
	import { assignParticipantToTeam } from '../utils/team-distribution';

	interface TeamDistributionEditorProps {
		teams: Team[];
		unassigned?: Participant[];
		allowRebalance?: boolean;
		showStatistics?: boolean;
		class?: string;
	}

	let {
		teams = $bindable([]),
		unassigned = $bindable([]),
		allowRebalance = true,
		showStatistics = true,
		class: className = ''
	}: TeamDistributionEditorProps = $props();

	const dispatch = createEventDispatcher<{
		update: { teams: Team[]; unassigned: Participant[] };
		rebalance: void;
	}>();

	// State
	let selectedParticipant = $state<Participant | null>(null);
	let selectedSourceTeam = $state<Team | null>(null);
	let highlightedTeam = $state<Team | null>(null);
	let draggedParticipant = $state<{ participant: Participant; sourceTeam: Team | null } | null>(
		null
	);

	// Search and filter
	let searchQuery = $state('');
	let filterCategory = $state<string | null>(null);

	// Computed
	const totalParticipants = $derived(
		teams.reduce((sum, team) => sum + team.members.length, 0) + (unassigned?.length || 0)
	);

	const averageTeamSize = $derived(
		teams.length > 0 ? totalParticipants / teams.length : 0
	);

	const categories = $derived(() => {
		const cats = new Set<string>();
		teams.forEach((team) =>
			team.members.forEach((m) => {
				if (m.category) cats.add(m.category);
			})
		);
		unassigned?.forEach((p) => {
			if (p.category) cats.add(p.category);
		});
		return Array.from(cats).sort();
	});

	const filteredUnassigned = $derived(() => {
		if (!unassigned) return [];

		return unassigned.filter((p) => {
			if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
				return false;
			}
			if (filterCategory && p.category !== filterCategory) {
				return false;
			}
			return true;
		});
	});

	function handleDragStart(participant: Participant, sourceTeam: Team | null) {
		draggedParticipant = { participant, sourceTeam };
	}

	function handleDragOver(event: DragEvent, team: Team) {
		event.preventDefault();
		highlightedTeam = team;
	}

	function handleDragLeave() {
		highlightedTeam = null;
	}

	function handleDrop(event: DragEvent, targetTeam: Team) {
		event.preventDefault();
		highlightedTeam = null;

		if (!draggedParticipant) return;

		const { participant, sourceTeam } = draggedParticipant;

		// Check team capacity
		const maxSize = targetTeam.maxSize || targetTeam.constraints?.maxParticipants || 50;
		if (targetTeam.members.length >= maxSize) {
			alert(`${targetTeam.name} is at maximum capacity`);
			draggedParticipant = null;
			return;
		}

		// Check category constraints
		if (targetTeam.constraints?.excludeCategories && participant.category) {
			if (targetTeam.constraints.excludeCategories.includes(participant.category)) {
				alert(`${targetTeam.name} excludes ${participant.category} category`);
				draggedParticipant = null;
				return;
			}
		}

		// Remove from source
		if (sourceTeam) {
			const index = sourceTeam.members.indexOf(participant);
			if (index > -1) {
				sourceTeam.members.splice(index, 1);
			}
		} else if (unassigned) {
			const index = unassigned.indexOf(participant);
			if (index > -1) {
				unassigned.splice(index, 1);
			}
		}

		// Add to target
		targetTeam.members.push(participant);

		draggedParticipant = null;
		notifyUpdate();
	}

	function moveParticipant(participant: Participant, sourceTeam: Team | null, targetTeam: Team) {
		// Check team capacity
		const maxSize = targetTeam.maxSize || targetTeam.constraints?.maxParticipants || 50;
		if (targetTeam.members.length >= maxSize) {
			alert(`${targetTeam.name} is at maximum capacity`);
			return;
		}

		// Remove from source
		if (sourceTeam) {
			const index = sourceTeam.members.indexOf(participant);
			if (index > -1) {
				sourceTeam.members.splice(index, 1);
			}
		} else if (unassigned) {
			const index = unassigned.indexOf(participant);
			if (index > -1) {
				unassigned.splice(index, 1);
			}
		}

		// Add to target
		targetTeam.members.push(participant);

		selectedParticipant = null;
		selectedSourceTeam = null;
		notifyUpdate();
	}

	function removeFromTeam(participant: Participant, team: Team) {
		const index = team.members.indexOf(participant);
		if (index > -1) {
			team.members.splice(index, 1);
			if (unassigned) {
				unassigned.push(participant);
			}
			notifyUpdate();
		}
	}

	function swapParticipants(p1: Participant, team1: Team, p2: Participant, team2: Team) {
		const index1 = team1.members.indexOf(p1);
		const index2 = team2.members.indexOf(p2);

		if (index1 > -1 && index2 > -1) {
			team1.members[index1] = p2;
			team2.members[index2] = p1;
			notifyUpdate();
		}
	}

	function notifyUpdate() {
		dispatch('update', { teams, unassigned: unassigned || [] });
	}

	function handleRebalance() {
		dispatch('rebalance');
	}

	function getTeamFillPercentage(team: Team): number {
		const maxSize = team.maxSize || team.constraints?.maxParticipants || averageTeamSize * 1.5;
		return (team.members.length / maxSize) * 100;
	}

	function getTeamStatus(team: Team): 'under' | 'good' | 'over' {
		const minSize = team.minSize || team.constraints?.minParticipants || 3;
		const maxSize = team.maxSize || team.constraints?.maxParticipants || 50;

		if (team.members.length < minSize) return 'under';
		if (team.members.length > maxSize) return 'over';
		return 'good';
	}
</script>

<div class="team-distribution-editor {className}">
	{#if showStatistics}
		<div class="statistics">
			<div class="stat">
				<span class="label">Total Participants</span>
				<span class="value">{totalParticipants}</span>
			</div>
			<div class="stat">
				<span class="label">Teams</span>
				<span class="value">{teams.length}</span>
			</div>
			<div class="stat">
				<span class="label">Average Team Size</span>
				<span class="value">{averageTeamSize.toFixed(1)}</span>
			</div>
			<div class="stat">
				<span class="label">Unassigned</span>
				<span class="value" class:warning={unassigned && unassigned.length > 0}>
					{unassigned?.length || 0}
				</span>
			</div>
		</div>
	{/if}

	<div class="editor-layout">
		<!-- Teams Grid -->
		<div class="teams-grid">
			{#each teams as team}
				{@const status = getTeamStatus(team)}
				{@const fillPercentage = getTeamFillPercentage(team)}

				<div
					class="team-card"
					class:highlighted={highlightedTeam === team}
					class:status-under={status === 'under'}
					class:status-over={status === 'over'}
					ondragover={(e) => handleDragOver(e, team)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, team)}
				>
					<div class="team-header">
						<div class="team-info">
							<h4>{team.name}</h4>
							{#if team.topic}
								<span class="team-topic">{team.topic}</span>
							{/if}
						</div>

						<div class="team-size">
							<Users size={16} />
							<span>{team.members.length}</span>
							{#if team.maxSize}
								<span class="max-size">/ {team.maxSize}</span>
							{/if}
						</div>
					</div>

					<div class="fill-bar">
						<div class="fill-progress" style="width: {Math.min(fillPercentage, 100)}%"></div>
					</div>

					{#if status === 'under'}
						<div class="status-warning">
							<AlertCircle size={14} />
							<span>Below minimum size</span>
						</div>
					{:else if status === 'over'}
						<div class="status-warning over">
							<AlertCircle size={14} />
							<span>Over capacity</span>
						</div>
					{/if}

					<div class="members-list">
						{#each team.members as member}
							<div
								class="member-item"
								draggable="true"
								ondragstart={() => handleDragStart(member, team)}
							>
								<div class="member-info">
									<span class="member-name">{member.name}</span>
									{#if member.category}
										<span class="member-category">{member.category}</span>
									{/if}
								</div>

								<div class="member-actions">
									<button
										class="action-button"
										onclick={() => removeFromTeam(member, team)}
										title="Remove from team"
									>
										<X size={14} />
									</button>
								</div>
							</div>
						{/each}

						{#if team.members.length === 0}
							<div class="empty-team">
								<Users size={24} />
								<p>No members assigned</p>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Unassigned Panel -->
		{#if unassigned && unassigned.length > 0}
			<div class="unassigned-panel">
				<div class="panel-header">
					<h4>
						Unassigned Participants
						<span class="count">{unassigned.length}</span>
					</h4>

					<div class="filters">
						<input
							type="text"
							placeholder="Search..."
							bind:value={searchQuery}
							class="search-input"
						/>

						{#if categories().length > 0}
							<select bind:value={filterCategory} class="category-filter">
								<option value={null}>All Categories</option>
								{#each categories() as category}
									<option value={category}>{category}</option>
								{/each}
							</select>
						{/if}
					</div>
				</div>

				<div class="unassigned-list">
					{#each filteredUnassigned() as participant}
						<div
							class="unassigned-item"
							draggable="true"
							ondragstart={() => handleDragStart(participant, null)}
						>
							<div class="participant-info">
								<span class="participant-name">{participant.name}</span>
								{#if participant.category}
									<span class="participant-category">{participant.category}</span>
								{/if}
								{#if participant.preference}
									<span class="participant-preference">
										Prefers: {participant.preference}
									</span>
								{/if}
							</div>

							<button
								class="quick-assign-button"
								onclick={() => {
									selectedParticipant = participant;
									selectedSourceTeam = null;
								}}
								title="Assign to team"
							>
								<MoveRight size={16} />
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	{#if allowRebalance}
		<div class="footer-actions">
			<button class="button secondary" onclick={handleRebalance}>
				<RefreshCw size={16} />
				Auto-Rebalance Teams
			</button>
		</div>
	{/if}

	<!-- Assignment Modal -->
	{#if selectedParticipant}
		<div class="modal-overlay" onclick={() => (selectedParticipant = null)}>
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h4>Assign {selectedParticipant.name}</h4>
					<button class="close-button" onclick={() => (selectedParticipant = null)}>
						<X size={20} />
					</button>
				</div>

				<div class="modal-body">
					<p>Select a team to assign this participant to:</p>

					<div class="team-options">
						{#each teams as team}
							{@const maxSize = team.maxSize || team.constraints?.maxParticipants || 50}
							{@const isFull = team.members.length >= maxSize}
							{@const isExcluded =
								team.constraints?.excludeCategories &&
								selectedParticipant.category &&
								team.constraints.excludeCategories.includes(selectedParticipant.category)}

							<button
								class="team-option"
								disabled={isFull || isExcluded}
								onclick={() =>
									selectedParticipant &&
									moveParticipant(selectedParticipant, selectedSourceTeam, team)}
							>
								<div class="option-info">
									<span class="option-name">{team.name}</span>
									<span class="option-size">
										{team.members.length} / {maxSize} members
									</span>
								</div>

								{#if isFull}
									<span class="option-status">Full</span>
								{:else if isExcluded}
									<span class="option-status">Excluded</span>
								{:else}
									<Check size={20} />
								{/if}
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.team-distribution-editor {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Statistics */
	.statistics {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 8px;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat .label {
		font-size: 0.75rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat .value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.stat .value.warning {
		color: #dc2626;
	}

	/* Editor Layout */
	.editor-layout {
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: 1.5rem;
	}

	/* Teams Grid */
	.teams-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.team-card {
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		padding: 1rem;
		transition: all 0.2s;
	}

	.team-card.highlighted {
		border-color: #6366f1;
		background: #eef2ff;
	}

	.team-card.status-under {
		border-color: #fbbf24;
	}

	.team-card.status-over {
		border-color: #ef4444;
	}

	.team-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
	}

	.team-info h4 {
		margin: 0;
		font-size: 1rem;
		color: #1f2937;
	}

	.team-topic {
		font-size: 0.75rem;
		color: #6b7280;
		display: block;
		margin-top: 0.25rem;
	}

	.team-size {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.max-size {
		color: #9ca3af;
	}

	.fill-bar {
		height: 4px;
		background: #e5e7eb;
		border-radius: 2px;
		overflow: hidden;
		margin-bottom: 0.75rem;
	}

	.fill-progress {
		height: 100%;
		background: #6366f1;
		transition: width 0.3s;
	}

	.team-card.status-under .fill-progress {
		background: #fbbf24;
	}

	.team-card.status-over .fill-progress {
		background: #ef4444;
	}

	.status-warning {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: #fffbeb;
		border: 1px solid #fde68a;
		border-radius: 6px;
		font-size: 0.75rem;
		color: #92400e;
		margin-bottom: 0.75rem;
	}

	.status-warning.over {
		background: #fef2f2;
		border-color: #fecaca;
		color: #991b1b;
	}

	.members-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 300px;
		overflow-y: auto;
	}

	.member-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		background: #f9fafb;
		border-radius: 6px;
		cursor: move;
		transition: all 0.2s;
	}

	.member-item:hover {
		background: #f3f4f6;
	}

	.member-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		flex: 1;
	}

	.member-name {
		font-size: 0.875rem;
		color: #1f2937;
		font-weight: 500;
	}

	.member-category {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.member-actions {
		display: flex;
		gap: 0.25rem;
	}

	.action-button {
		background: none;
		border: none;
		padding: 0.25rem;
		cursor: pointer;
		color: #9ca3af;
		border-radius: 4px;
		transition: all 0.2s;
	}

	.action-button:hover {
		background: #e5e7eb;
		color: #1f2937;
	}

	.empty-team {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 2rem 1rem;
		color: #9ca3af;
		text-align: center;
	}

	/* Unassigned Panel */
	.unassigned-panel {
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		padding: 1rem;
		height: fit-content;
		position: sticky;
		top: 1rem;
	}

	.panel-header {
		margin-bottom: 1rem;
	}

	.panel-header h4 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		color: #1f2937;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.5rem;
		padding: 0.125rem 0.5rem;
		background: #dc2626;
		color: white;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.filters {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.search-input,
	.category-filter {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.unassigned-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 500px;
		overflow-y: auto;
	}

	.unassigned-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		cursor: move;
		transition: all 0.2s;
	}

	.unassigned-item:hover {
		background: #f3f4f6;
		border-color: #d1d5db;
	}

	.participant-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
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

	.quick-assign-button {
		background: none;
		border: none;
		padding: 0.5rem;
		cursor: pointer;
		color: #6366f1;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.quick-assign-button:hover {
		background: #eef2ff;
	}

	/* Footer Actions */
	.footer-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
	}

	.button {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 500;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.button.secondary {
		background: white;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.button.secondary:hover {
		background: #f9fafb;
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: white;
		border-radius: 12px;
		max-width: 500px;
		width: 100%;
		max-height: 80vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h4 {
		margin: 0;
		font-size: 1.125rem;
		color: #1f2937;
	}

	.close-button {
		background: none;
		border: none;
		padding: 0.5rem;
		cursor: pointer;
		color: #6b7280;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.close-button:hover {
		background: #f3f4f6;
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
	}

	.modal-body p {
		margin: 0 0 1rem 0;
		color: #6b7280;
	}

	.team-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.team-option {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #f9fafb;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		width: 100%;
		text-align: left;
	}

	.team-option:hover:not(:disabled) {
		background: #eef2ff;
		border-color: #6366f1;
	}

	.team-option:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.option-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.option-name {
		font-weight: 500;
		color: #1f2937;
	}

	.option-size {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.option-status {
		font-size: 0.75rem;
		color: #9ca3af;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.editor-layout {
			grid-template-columns: 1fr;
		}

		.unassigned-panel {
			position: static;
		}

		.teams-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.statistics {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
