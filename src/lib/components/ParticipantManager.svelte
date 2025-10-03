<script lang="ts">
	/**
	 * Participant Manager
	 * Manage participants with role assignment and search/filter capabilities
	 */
	import {
		Users,
		Search,
		Filter,
		UserPlus,
		UserMinus,
		Shield,
		Mail,
		MoreVertical,
		Download,
		Ban
	} from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import { UserRole } from '../../types/enums';
	import type { User } from '../../types/entities';

	interface ParticipantManagerProps {
		participants?: User[];
		eventId: string;
		organizerId: string;
		class?: string;
	}

	let {
		participants = $bindable([]),
		eventId,
		organizerId,
		class: className = ''
	}: ParticipantManagerProps = $props();

	const dispatch = createEventDispatcher<{
		updateRole: { participantId: string; newRole: UserRole };
		removeParticipant: { participantId: string };
		inviteParticipant: { email: string };
		exportList: void;
	}>();

	// State
	let searchQuery = $state('');
	let roleFilter = $state<UserRole | 'all'>('all');
	let selectedParticipant = $state<User | null>(null);
	let showRoleMenu = $state(false);
	let showInviteForm = $state(false);
	let inviteEmail = $state('');

	// Computed
	const filteredParticipants = $derived(() => {
		return participants.filter((p) => {
			// Search filter
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				const matchesName = p.name.toLowerCase().includes(query);
				const matchesEmail = p.email?.toLowerCase().includes(query);
				if (!matchesName && !matchesEmail) return false;
			}

			// Role filter
			if (roleFilter !== 'all' && p.role !== roleFilter) {
				return false;
			}

			return true;
		});
	});

	const participantStats = $derived(() => {
		const total = participants.length;
		const byRole = participants.reduce(
			(acc, p) => {
				acc[p.role] = (acc[p.role] || 0) + 1;
				return acc;
			},
			{} as Record<UserRole, number>
		);
		const guests = participants.filter((p) => p.isGuest).length;

		return { total, byRole, guests };
	});

	function handleUpdateRole(participant: User, newRole: UserRole) {
		dispatch('updateRole', { participantId: participant.id, newRole });
		showRoleMenu = false;
		selectedParticipant = null;
	}

	function handleRemoveParticipant(participant: User) {
		if (confirm(`Remove ${participant.name} from the event?`)) {
			dispatch('removeParticipant', { participantId: participant.id });
		}
	}

	function handleInvite() {
		if (inviteEmail) {
			dispatch('inviteParticipant', { email: inviteEmail });
			inviteEmail = '';
			showInviteForm = false;
		}
	}

	function handleExport() {
		dispatch('exportList');
	}

	function getRoleBadgeColor(role: UserRole): string {
		switch (role) {
			case UserRole.ORGANIZER:
				return '#8b5cf6';
			case UserRole.FACILITATOR:
				return '#6366f1';
			case UserRole.PARTICIPANT:
				return '#10b981';
			case UserRole.GUEST:
				return '#6b7280';
			default:
				return '#9ca3af';
		}
	}

	function canModifyRole(participant: User): boolean {
		// Can't modify organizer role
		if (participant.id === organizerId) return false;
		// Can't modify your own role
		return true;
	}
</script>

<div class="participant-manager {className}">
	<!-- Header with Stats -->
	<div class="manager-header">
		<div>
			<h3>Participants</h3>
			<div class="stats-row">
				<span class="stat">Total: {participantStats().total}</span>
				<span class="stat">Guests: {participantStats().guests}</span>
				{#each Object.entries(participantStats().byRole) as [role, count]}
					<span class="stat">
						{role}: {count}
					</span>
				{/each}
			</div>
		</div>

		<div class="header-actions">
			<button class="button secondary" onclick={() => (showInviteForm = !showInviteForm)}>
				<UserPlus size={16} />
				Invite
			</button>
			<button class="button secondary" onclick={handleExport}>
				<Download size={16} />
				Export
			</button>
		</div>
	</div>

	<!-- Invite Form -->
	{#if showInviteForm}
		<div class="invite-form">
			<div class="invite-input-group">
				<Mail size={20} />
				<input
					type="email"
					bind:value={inviteEmail}
					placeholder="Enter email address to invite..."
					onkeydown={(e) => e.key === 'Enter' && handleInvite()}
				/>
				<button class="button primary" onclick={handleInvite} disabled={!inviteEmail}>
					Send Invite
				</button>
			</div>
		</div>
	{/if}

	<!-- Search and Filter -->
	<div class="search-filter-bar">
		<div class="search-box">
			<Search size={20} />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by name or email..."
			/>
		</div>

		<div class="filter-group">
			<Filter size={16} />
			<select bind:value={roleFilter}>
				<option value="all">All Roles</option>
				<option value={UserRole.ORGANIZER}>Organizer</option>
				<option value={UserRole.FACILITATOR}>Facilitator</option>
				<option value={UserRole.PARTICIPANT}>Participant</option>
				<option value={UserRole.GUEST}>Guest</option>
			</select>
		</div>
	</div>

	<!-- Participants List -->
	{#if filteredParticipants().length === 0}
		<div class="empty-state">
			<Users size={48} />
			<h4>
				{searchQuery || roleFilter !== 'all' ? 'No Matching Participants' : 'No Participants Yet'}
			</h4>
			<p>
				{searchQuery || roleFilter !== 'all'
					? 'Try adjusting your search or filter'
					: 'Participants will appear here once they join'}
			</p>
		</div>
	{:else}
		<div class="participants-table-container">
			<table class="participants-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Email</th>
						<th>Role</th>
						<th>Status</th>
						<th>Joined</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredParticipants() as participant}
						<tr>
							<td>
								<div class="participant-name-cell">
									<div class="avatar">
										{participant.name.charAt(0).toUpperCase()}
									</div>
									<span>{participant.name}</span>
									{#if participant.isGuest}
										<span class="guest-badge">Guest</span>
									{/if}
								</div>
							</td>

							<td>
								<span class="email">{participant.email || '—'}</span>
							</td>

							<td>
								<button
									class="role-badge"
									style="background: {getRoleBadgeColor(participant.role)}20; color: {getRoleBadgeColor(participant.role)}"
									onclick={() => {
										if (canModifyRole(participant)) {
											selectedParticipant = participant;
											showRoleMenu = true;
										}
									}}
									disabled={!canModifyRole(participant)}
								>
									<Shield size={14} />
									{participant.role}
								</button>
							</td>

							<td>
								<span class="status-indicator" class:active={participant.lastActiveAt}>
									{participant.lastActiveAt ? 'Active' : 'Inactive'}
								</span>
							</td>

							<td>
								{participant.createdAt
									? new Date(participant.createdAt).toLocaleDateString()
									: '—'}
							</td>

							<td>
								<div class="action-buttons">
									<button
										class="action-button"
										onclick={() => handleRemoveParticipant(participant)}
										disabled={participant.id === organizerId}
										title="Remove participant"
									>
										<UserMinus size={16} />
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Role Change Menu -->
	{#if showRoleMenu && selectedParticipant}
		<div class="modal-overlay" onclick={() => (showRoleMenu = false)}>
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h4>Change Role: {selectedParticipant.name}</h4>
				</div>

				<div class="modal-body">
					<p>Select a new role for this participant:</p>

					<div class="role-options">
						{#each [UserRole.FACILITATOR, UserRole.PARTICIPANT, UserRole.GUEST] as role}
							<button
								class="role-option"
								class:selected={selectedParticipant.role === role}
								onclick={() => handleUpdateRole(selectedParticipant!, role)}
							>
								<Shield size={20} />
								<div class="role-info">
									<span class="role-name">{role}</span>
									<span class="role-description">
										{#if role === UserRole.FACILITATOR}
											Can assist with managing the event
										{:else if role === UserRole.PARTICIPANT}
											Standard participant access
										{:else}
											Limited guest access
										{/if}
									</span>
								</div>
							</button>
						{/each}
					</div>
				</div>

				<div class="modal-actions">
					<button class="button secondary" onclick={() => (showRoleMenu = false)}>
						Cancel
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.participant-manager {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 2rem;
	}

	/* Header */
	.manager-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
	}

	.manager-header h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		color: #1f2937;
	}

	.stats-row {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.stat {
		padding: 0.25rem 0.75rem;
		background: #f3f4f6;
		border-radius: 6px;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	/* Invite Form */
	.invite-form {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
	}

	.invite-input-group {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: #9ca3af;
	}

	.invite-input-group input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.875rem;
	}

	/* Search and Filter */
	.search-filter-bar {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.search-box {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		color: #9ca3af;
	}

	.search-box input {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		font-size: 0.875rem;
		color: #1f2937;
	}

	.filter-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		color: #9ca3af;
	}

	.filter-group select {
		background: none;
		border: none;
		outline: none;
		cursor: pointer;
		font-size: 0.875rem;
		color: #1f2937;
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3rem 2rem;
		text-align: center;
		color: #9ca3af;
	}

	.empty-state h4 {
		margin: 0;
		color: #374151;
	}

	.empty-state p {
		margin: 0;
		color: #6b7280;
	}

	/* Table */
	.participants-table-container {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: auto;
	}

	.participants-table {
		width: 100%;
		border-collapse: collapse;
	}

	.participants-table th,
	.participants-table td {
		padding: 1rem;
		text-align: left;
		border-bottom: 1px solid #f3f4f6;
	}

	.participants-table th {
		background: #f9fafb;
		font-weight: 600;
		font-size: 0.875rem;
		color: #374151;
		position: sticky;
		top: 0;
	}

	.participants-table td {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.participants-table tbody tr:hover {
		background: #fafafa;
	}

	.participant-name-cell {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: #6366f1;
		color: white;
		border-radius: 50%;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.guest-badge {
		padding: 0.125rem 0.5rem;
		background: #f3f4f6;
		color: #6b7280;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.email {
		color: #1f2937;
	}

	.role-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
		border: none;
		cursor: pointer;
		transition: all 0.2s;
	}

	.role-badge:not(:disabled):hover {
		opacity: 0.8;
	}

	.role-badge:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.status-indicator {
		padding: 0.25rem 0.75rem;
		background: #f3f4f6;
		color: #6b7280;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.status-indicator.active {
		background: #dcfce7;
		color: #16a34a;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background: none;
		border: none;
		color: #9ca3af;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-button:hover:not(:disabled) {
		background: #fee2e2;
		color: #ef4444;
	}

	.action-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
		overflow: hidden;
	}

	.modal-header {
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h4 {
		margin: 0;
		font-size: 1.125rem;
		color: #1f2937;
	}

	.modal-body {
		padding: 1.5rem;
	}

	.modal-body p {
		margin: 0 0 1rem 0;
		color: #6b7280;
	}

	.role-options {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.role-option {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: #f9fafb;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
	}

	.role-option:hover {
		border-color: #6366f1;
		background: #eef2ff;
	}

	.role-option.selected {
		border-color: #6366f1;
		background: #eef2ff;
	}

	.role-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.role-name {
		font-weight: 600;
		color: #1f2937;
		text-transform: capitalize;
	}

	.role-description {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	/* Buttons */
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
	@media (max-width: 1024px) {
		.search-filter-bar {
			flex-direction: column;
		}

		.filter-group {
			width: 100%;
		}
	}

	@media (max-width: 768px) {
		.manager-header {
			flex-direction: column;
			gap: 1rem;
		}

		.header-actions {
			width: 100%;
		}

		.button {
			flex: 1;
		}

		.participants-table-container {
			overflow-x: auto;
		}

		.participants-table {
			min-width: 600px;
		}
	}
</style>
