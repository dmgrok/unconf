<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Event, User, Topic, RoomAssignment, AssignmentRound } from '../../types/entities';
	import { AssignmentStatus } from '../../types/enums';
	import Card from './ui/Card.svelte';
	import Button from './ui/Button.svelte';
	import { Users, CheckCircle, Clock, AlertCircle, ArrowRight } from 'lucide-svelte';

	interface TeamAssignmentInterfaceProps {
		event: Event;
		currentUser: User;
		topics: Topic[];
		class?: string;
	}

	let {
		event,
		currentUser,
		topics = [],
		class: className = ''
	}: TeamAssignmentInterfaceProps = $props();

	const dispatch = createEventDispatcher<{
		assignmentupdate: { assignment: RoomAssignment };
		confirmassignment: { assignmentId: string };
	}>();

	let currentRound = $state<AssignmentRound | null>(null);
	let userAssignment = $state<RoomAssignment | null>(null);
	let allAssignments = $state<RoomAssignment[]>([]);
	let isLoading = $state(false);

	$: isConfirmed = userAssignment?.status === AssignmentStatus.CONFIRMED;
	$: assignmentStatus = getAssignmentStatusInfo();
	$: teamMembers = userAssignment
		? allAssignments.filter(a => a.roomId === userAssignment.roomId && a.id !== userAssignment.id)
		: [];

	onMount(() => {
		loadCurrentRound();
		loadUserAssignment();
		loadAllAssignments();
	});

	async function loadCurrentRound() {
		isLoading = true;
		try {
			const response = await fetch(`/api/assignment-rounds?eventId=${event.id}&current=true`);
			const result = await response.json();

			if (result.success && result.data) {
				currentRound = result.data;
			}
		} catch (error) {
			console.error('Failed to load current round:', error);
		} finally {
			isLoading = false;
		}
	}

	async function loadUserAssignment() {
		try {
			const response = await fetch(
				`/api/assignments?eventId=${event.id}&userId=${currentUser.id}`
			);
			const result = await response.json();

			if (result.success && result.data) {
				userAssignment = result.data;
			}
		} catch (error) {
			console.error('Failed to load user assignment:', error);
		}
	}

	async function loadAllAssignments() {
		try {
			const response = await fetch(`/api/assignments?eventId=${event.id}`);
			const result = await response.json();

			if (result.success && result.data) {
				allAssignments = result.data;
			}
		} catch (error) {
			console.error('Failed to load assignments:', error);
		}
	}

	async function handleConfirmAssignment() {
		if (!userAssignment) return;

		try {
			const response = await fetch('/api/assignments/confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					assignmentId: userAssignment.id
				})
			});

			const result = await response.json();
			if (result.success) {
				userAssignment.status = AssignmentStatus.CONFIRMED;
				dispatch('confirmassignment', { assignmentId: userAssignment.id });
			}
		} catch (error) {
			console.error('Failed to confirm assignment:', error);
		}
	}

	function getAssignmentStatusInfo() {
		if (!userAssignment) {
			return {
				icon: Clock,
				label: 'Waiting for Assignment',
				color: '#6b7280',
				description: 'Your team assignment is being processed'
			};
		}

		switch (userAssignment.status) {
			case AssignmentStatus.PENDING:
				return {
					icon: Clock,
					label: 'Pending',
					color: '#f59e0b',
					description: 'Assignment created, waiting for confirmation'
				};
			case AssignmentStatus.ASSIGNED:
				return {
					icon: AlertCircle,
					label: 'Assigned',
					color: '#3b82f6',
					description: 'Please confirm your team assignment'
				};
			case AssignmentStatus.CONFIRMED:
				return {
					icon: CheckCircle,
					label: 'Confirmed',
					color: '#10b981',
					description: 'You have confirmed your assignment'
				};
			case AssignmentStatus.MOVED:
				return {
					icon: ArrowRight,
					label: 'Moved',
					color: '#8b5cf6',
					description: 'You were moved to a different team'
				};
			default:
				return {
					icon: AlertCircle,
					label: 'Unknown',
					color: '#6b7280',
					description: 'Unknown assignment status'
				};
		}
	}

	function getTopicTitle(topicId: string): string {
		return topics.find(t => t.id === topicId)?.title || 'Unknown Topic';
	}

	function getPreferenceLabel(rank?: number): string {
		if (!rank) return '';
		return rank === 1 ? '1st Choice ⭐' : rank === 2 ? '2nd Choice' : '3rd Choice';
	}

	function getPreferenceColor(rank?: number): string {
		if (!rank) return '#6b7280';
		return rank === 1 ? '#f59e0b' : rank === 2 ? '#10b981' : '#3b82f6';
	}
</script>

<div class="team-assignment-interface {className}">
	<div class="assignment-header">
		<Card variant="outlined" padding="md">
			{#snippet header()}
				<div class="header-content">
					<Users size={24} />
					<div>
						<h2>Team Assignments</h2>
						<p class="header-description">
							View your team assignment and collaborate with your group
						</p>
					</div>
				</div>
			{/snippet}

			{#if currentRound}
				<div class="round-info">
					<div class="round-stat">
						<span class="stat-label">Round</span>
						<span class="stat-value">#{currentRound.roundNumber}</span>
					</div>
					<div class="round-stat">
						<span class="stat-label">Assignments</span>
						<span class="stat-value">
							{currentRound.assignedParticipants}/{currentRound.totalParticipants}
						</span>
					</div>
					{#if currentRound.results}
						<div class="round-stat">
							<span class="stat-label">Satisfaction</span>
							<span class="stat-value">
								{(currentRound.results.averageSatisfactionScore * 100).toFixed(0)}%
							</span>
						</div>
					{/if}
				</div>
			{/if}
		</Card>
	</div>

	<div class="assignment-content">
		{#if isLoading}
			<div class="loading">
				<div class="spinner"></div>
				<p>Loading assignment...</p>
			</div>
		{:else if !userAssignment}
			<Card variant="outlined" padding="lg" class="waiting-state">
				<div class="waiting-content">
					<Clock size={48} />
					<h3>Waiting for Assignment</h3>
					<p>
						The organizer is currently creating team assignments.
						You'll be notified once your team is ready!
					</p>
				</div>
			</Card>
		{:else}
			<!-- Assignment Details -->
			<Card variant="elevated" padding="lg" class="assignment-card">
				{#snippet header()}
					<div class="card-header">
						<div class="status-badge" style="background-color: {assignmentStatus.color}">
							<svelte:component this={assignmentStatus.icon} size={16} />
							<span>{assignmentStatus.label}</span>
						</div>

						{#if userAssignment.preferenceRank}
							<div
								class="preference-badge"
								style="background-color: {getPreferenceColor(userAssignment.preferenceRank)}"
							>
								{getPreferenceLabel(userAssignment.preferenceRank)}
							</div>
						{/if}
					</div>
				{/snippet}

				<div class="assignment-details">
					<h3 class="assignment-topic">{getTopicTitle(userAssignment.topicId)}</h3>
					<p class="assignment-description">{assignmentStatus.description}</p>

					<div class="assignment-meta">
						<div class="meta-item">
							<Users size={16} />
							<span>Team Size: {teamMembers.length + 1} members</span>
						</div>
						<div class="meta-item">
							<Clock size={16} />
							<span>
								Assigned {new Date(userAssignment.assignedAt).toLocaleString()}
							</span>
						</div>
					</div>

					{#if !isConfirmed && userAssignment.status === AssignmentStatus.ASSIGNED}
						<div class="confirm-section">
							<p class="confirm-prompt">
								Please confirm that you can join this team discussion.
							</p>
							<Button
								variant="primary"
								size="lg"
								onclick={handleConfirmAssignment}
							>
								<CheckCircle size={20} />
								Confirm Assignment
							</Button>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Team Members -->
			{#if teamMembers.length > 0}
				<Card variant="outlined" padding="lg" class="team-members-card">
					{#snippet header()}
						<h3 class="section-title">Your Team Members</h3>
					{/snippet}

					<div class="members-list">
						<!-- Current user -->
						<div class="member-item current-user">
							<div class="member-avatar">
								{currentUser.name.charAt(0).toUpperCase()}
							</div>
							<div class="member-info">
								<span class="member-name">{currentUser.name} (You)</span>
								{#if isConfirmed}
									<span class="member-status confirmed">
										<CheckCircle size={14} />
										Confirmed
									</span>
								{:else}
									<span class="member-status pending">
										<Clock size={14} />
										Pending
									</span>
								{/if}
							</div>
						</div>

						<!-- Team members -->
						{#each teamMembers as member (member.id)}
							<div class="member-item">
								<div class="member-avatar">
									{member.userId.charAt(0).toUpperCase()}
								</div>
								<div class="member-info">
									<span class="member-name">Team Member</span>
									{#if member.status === AssignmentStatus.CONFIRMED}
										<span class="member-status confirmed">
											<CheckCircle size={14} />
											Confirmed
										</span>
									{:else}
										<span class="member-status pending">
											<Clock size={14} />
											Pending
										</span>
									{/if}
								</div>
								{#if member.preferenceRank}
									<div
										class="member-preference"
										style="background-color: {getPreferenceColor(member.preferenceRank)}"
									>
										{getPreferenceLabel(member.preferenceRank)}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</Card>
			{/if}

			<!-- Assignment Statistics -->
			{#if currentRound?.results}
				<Card variant="outlined" padding="md" class="stats-card">
					{#snippet header()}
						<h3 class="section-title">Assignment Statistics</h3>
					{/snippet}

					<div class="stats-grid">
						<div class="stat-card">
							<span class="stat-label">1st Choice</span>
							<span class="stat-value">
								{currentRound.results.preferenceDistribution.firstChoice}
							</span>
						</div>
						<div class="stat-card">
							<span class="stat-label">2nd Choice</span>
							<span class="stat-value">
								{currentRound.results.preferenceDistribution.secondChoice}
							</span>
						</div>
						<div class="stat-card">
							<span class="stat-label">3rd Choice</span>
							<span class="stat-value">
								{currentRound.results.preferenceDistribution.thirdChoice}
							</span>
						</div>
						<div class="stat-card">
							<span class="stat-label">Overall Satisfaction</span>
							<span class="stat-value highlight">
								{(currentRound.results.averageSatisfactionScore * 100).toFixed(0)}%
							</span>
						</div>
					</div>
				</Card>
			{/if}
		{/if}
	</div>
</div>

<style>
	.team-assignment-interface {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
	}

	.assignment-header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: white;
		padding-bottom: 1rem;
	}

	.header-content {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.header-content h2 {
		margin: 0 0 0.25rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.header-description {
		margin: 0;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.round-info {
		display: flex;
		gap: 2rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
		flex-wrap: wrap;
	}

	.round-stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: #1f2937;
	}

	.assignment-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.loading,
	.waiting-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: #6b7280;
		min-height: 400px;
	}

	.loading .spinner {
		width: 2.5rem;
		height: 2.5rem;
		border: 3px solid #e5e7eb;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.waiting-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.waiting-content h3 {
		margin: 0;
		color: #374151;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.waiting-content p {
		margin: 0;
		max-width: 500px;
		font-size: 0.875rem;
	}

	.assignment-card {
		border-left: 4px solid #3b82f6;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.status-badge,
	.preference-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: white;
	}

	.assignment-details {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.assignment-topic {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.assignment-description {
		margin: 0;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.assignment-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.confirm-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background-color: #eff6ff;
		border-radius: 0.5rem;
		margin-top: 0.5rem;
	}

	.confirm-prompt {
		margin: 0;
		color: #1e40af;
		font-weight: 500;
		text-align: center;
	}

	.section-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
	}

	.members-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.member-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background-color: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
	}

	.member-item.current-user {
		background-color: #eff6ff;
		border-color: #bfdbfe;
	}

	.member-avatar {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #3b82f6;
		color: white;
		border-radius: 50%;
		font-weight: 700;
		font-size: 1.125rem;
		flex-shrink: 0;
	}

	.member-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.member-name {
		font-weight: 600;
		color: #1f2937;
	}

	.member-status {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.member-status.confirmed {
		color: #10b981;
	}

	.member-status.pending {
		color: #f59e0b;
	}

	.member-preference {
		padding: 0.25rem 0.75rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		background-color: #f9fafb;
		border-radius: 0.5rem;
		text-align: center;
	}

	.stat-card .stat-label {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
	}

	.stat-card .stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.stat-card .stat-value.highlight {
		color: #10b981;
	}

	@media (max-width: 768px) {
		.team-assignment-interface {
			padding: 0.75rem;
		}

		.card-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.assignment-meta {
			flex-direction: column;
			gap: 0.75rem;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
