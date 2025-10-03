<script lang="ts">
	/**
	 * Team Assignment Broadcast Interface
	 * Manages broadcasting team assignments and tracking confirmations
	 */
	import {
		Send,
		Mail,
		Bell,
		Smartphone,
		CheckCircle,
		Clock,
		XCircle,
		AlertTriangle,
		Download,
		RefreshCw
	} from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import type { Team } from '../utils/team-distribution';
	import {
		broadcastTeamAssignments,
		getConfirmationStatus,
		sendConfirmationReminders,
		exportAssignmentsToCSV,
		type BroadcastOptions,
		type BroadcastResult,
		type TeamAssignment
	} from '../utils/team-assignment-broadcast';

	interface TeamAssignmentBroadcastProps {
		teams: Team[];
		eventId: string;
		class?: string;
	}

	let { teams, eventId, class: className = '' }: TeamAssignmentBroadcastProps = $props();

	const dispatch = createEventDispatcher<{
		broadcast: { result: BroadcastResult };
		complete: void;
	}>();

	// State
	let step = $state<'configure' | 'broadcasting' | 'tracking'>('configure');
	let broadcastOptions = $state<BroadcastOptions>({
		method: 'email',
		includeTeamDetails: true,
		requireConfirmation: true,
		customMessage: ''
	});
	let broadcastResult = $state<BroadcastResult | null>(null);
	let assignments = $state<TeamAssignment[]>([]);
	let isProcessing = $state(false);
	let error = $state<string | null>(null);

	// Computed
	const totalParticipants = $derived(
		teams.reduce((sum, team) => sum + team.members.length, 0)
	);

	const confirmationStatus = $derived(() => {
		if (assignments.length === 0) return null;
		return getConfirmationStatus(assignments);
	});

	const notificationMethodOptions = [
		{ value: 'email', label: 'Email', icon: Mail },
		{ value: 'push', label: 'Push Notification', icon: Bell },
		{ value: 'sms', label: 'SMS', icon: Smartphone },
		{ value: 'all', label: 'All Methods', icon: Send }
	];

	async function handleBroadcast() {
		error = null;
		isProcessing = true;

		try {
			const result = await broadcastTeamAssignments(teams, eventId, broadcastOptions);
			broadcastResult = result;
			assignments = result.assignments;

			dispatch('broadcast', { result });

			if (broadcastOptions.requireConfirmation) {
				step = 'tracking';
			} else {
				dispatch('complete');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to broadcast assignments';
		} finally {
			isProcessing = false;
		}
	}

	async function handleSendReminders() {
		isProcessing = true;

		try {
			await sendConfirmationReminders(assignments, teams);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to send reminders';
		} finally {
			isProcessing = false;
		}
	}

	function handleExport() {
		const csv = exportAssignmentsToCSV(assignments, teams);
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = `team-assignments-${eventId}.csv`;
		a.click();

		URL.revokeObjectURL(url);
	}
</script>

<div class="team-assignment-broadcast {className}">
	<!-- Configure Step -->
	{#if step === 'configure'}
		<div class="configure-step">
			<h3>Broadcast Team Assignments</h3>
			<p class="description">
				Send team assignments to {totalParticipants} participants across {teams.length} teams
			</p>

			<div class="form-section">
				<label class="form-label">Notification Method</label>
				<div class="method-options">
					{#each notificationMethodOptions as option}
						{@const Icon = option.icon}
						<button
							class="method-option"
							class:selected={broadcastOptions.method === option.value}
							onclick={() => (broadcastOptions.method = option.value as any)}
						>
							<Icon size={24} />
							<span>{option.label}</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="form-section">
				<label class="checkbox-label">
					<input
						type="checkbox"
						bind:checked={broadcastOptions.includeTeamDetails}
					/>
					<span>Include team member details in notifications</span>
				</label>
			</div>

			<div class="form-section">
				<label class="checkbox-label">
					<input
						type="checkbox"
						bind:checked={broadcastOptions.requireConfirmation}
					/>
					<span>Require participant confirmation</span>
				</label>

				{#if broadcastOptions.requireConfirmation}
					<div class="deadline-input">
						<label class="form-label">Confirmation Deadline (optional)</label>
						<input
							type="datetime-local"
							onchange={(e) => {
								const value = (e.target as HTMLInputElement).value;
								broadcastOptions.confirmationDeadline = value
									? new Date(value)
									: undefined;
							}}
						/>
					</div>
				{/if}
			</div>

			<div class="form-section">
				<label class="form-label">Custom Message (optional)</label>
				<textarea
					bind:value={broadcastOptions.customMessage}
					placeholder="Add a personal message to include in the notification..."
					rows="4"
				></textarea>
			</div>

			{#if error}
				<div class="error-message">
					<AlertTriangle size={20} />
					<span>{error}</span>
				</div>
			{/if}

			<div class="actions">
				<button class="button primary" onclick={handleBroadcast} disabled={isProcessing}>
					<Send size={18} />
					{isProcessing ? 'Broadcasting...' : 'Send Assignments'}
				</button>
			</div>
		</div>
	{/if}

	<!-- Broadcasting Step -->
	{#if step === 'broadcasting'}
		<div class="broadcasting-step">
			<div class="spinner"></div>
			<h4>Broadcasting Assignments...</h4>
			<p>Sending notifications to participants</p>
		</div>
	{/if}

	<!-- Tracking Step -->
	{#if step === 'tracking' && broadcastResult && confirmationStatus()}
		<div class="tracking-step">
			<h3>Confirmation Tracking</h3>

			<!-- Summary Cards -->
			<div class="status-cards">
				<div class="status-card confirmed">
					<CheckCircle size={32} />
					<div class="card-content">
						<span class="card-value">{confirmationStatus()!.confirmed}</span>
						<span class="card-label">Confirmed</span>
					</div>
				</div>

				<div class="status-card pending">
					<Clock size={32} />
					<div class="card-content">
						<span class="card-value">{confirmationStatus()!.pending}</span>
						<span class="card-label">Pending</span>
					</div>
				</div>

				<div class="status-card declined">
					<XCircle size={32} />
					<div class="card-content">
						<span class="card-value">{confirmationStatus()!.declined}</span>
						<span class="card-label">Declined</span>
					</div>
				</div>

				<div class="status-card expired">
					<AlertTriangle size={32} />
					<div class="card-content">
						<span class="card-value">{confirmationStatus()!.expired}</span>
						<span class="card-label">Expired</span>
					</div>
				</div>
			</div>

			<!-- Progress Bar -->
			<div class="progress-section">
				<div class="progress-header">
					<span>Confirmation Progress</span>
					<span class="progress-percentage">
						{confirmationStatus()!.confirmationRate}%
					</span>
				</div>
				<div class="progress-bar">
					<div
						class="progress-fill"
						style="width: {confirmationStatus()!.confirmationRate}%"
					></div>
				</div>
			</div>

			<!-- Broadcast Result Details -->
			{#if broadcastResult.errors.length > 0}
				<div class="errors-section">
					<h4>
						<AlertTriangle size={20} />
						Failed Notifications ({broadcastResult.errors.length})
					</h4>
					<div class="errors-list">
						{#each broadcastResult.errors as error}
							<div class="error-item">
								<span class="error-participant">Participant ID: {error.participantId}</span>
								<span class="error-message">{error.error}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Assignment Details Table -->
			<div class="assignments-table-section">
				<div class="table-header">
					<h4>Assignment Details</h4>
					<div class="table-actions">
						<button
							class="button secondary small"
							onclick={handleSendReminders}
							disabled={isProcessing || confirmationStatus()!.pending === 0}
						>
							<RefreshCw size={16} />
							Send Reminders
						</button>
						<button class="button secondary small" onclick={handleExport}>
							<Download size={16} />
							Export CSV
						</button>
					</div>
				</div>

				<div class="table-container">
					<table class="assignments-table">
						<thead>
							<tr>
								<th>Participant</th>
								<th>Team</th>
								<th>Status</th>
								<th>Assigned</th>
								<th>Confirmed</th>
								<th>Notification</th>
							</tr>
						</thead>
						<tbody>
							{#each assignments as assignment}
								{@const team = teams.find((t) => t.id === assignment.teamId)}
								{@const participant = team?.members.find(
									(p) => p.id === assignment.participantId
								)}

								{#if team && participant}
									<tr>
										<td>
											<div class="participant-cell">
												<span class="participant-name">{participant.name}</span>
												{#if participant.email}
													<span class="participant-email">{participant.email}</span>
												{/if}
											</div>
										</td>
										<td>
											<div class="team-cell">
												<span class="team-name">{team.name}</span>
												{#if team.topic}
													<span class="team-topic">{team.topic}</span>
												{/if}
											</div>
										</td>
										<td>
											<span
												class="status-badge"
												class:confirmed={assignment.status === 'confirmed'}
												class:pending={assignment.status === 'pending'}
												class:declined={assignment.status === 'declined'}
												class:expired={assignment.status === 'expired'}
											>
												{assignment.status}
											</span>
										</td>
										<td>{assignment.assignedAt.toLocaleDateString()}</td>
										<td>
											{assignment.confirmedAt
												? assignment.confirmedAt.toLocaleDateString()
												: '—'}
										</td>
										<td>
											<span
												class="notification-badge"
												class:sent={assignment.notificationSent}
											>
												{assignment.notificationSent ? 'Sent' : 'Failed'}
											</span>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<div class="actions">
				<button class="button primary" onclick={() => dispatch('complete')}>
					<CheckCircle size={18} />
					Complete
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.team-assignment-broadcast {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		max-width: 1000px;
		margin: 0 auto;
	}

	h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
		color: #1f2937;
	}

	.description {
		color: #6b7280;
		margin: 0 0 2rem 0;
	}

	/* Configure Step */
	.form-section {
		margin-bottom: 1.5rem;
	}

	.form-label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #374151;
		font-size: 0.875rem;
	}

	.method-options {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
	}

	.method-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem 1rem;
		background: #f9fafb;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		color: #6b7280;
	}

	.method-option:hover {
		background: #f3f4f6;
	}

	.method-option.selected {
		background: #eef2ff;
		border-color: #6366f1;
		color: #6366f1;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		font-size: 0.875rem;
		color: #374151;
	}

	.checkbox-label input[type='checkbox'] {
		width: 18px;
		height: 18px;
		cursor: pointer;
	}

	.deadline-input {
		margin-top: 1rem;
		padding-left: 2rem;
	}

	.deadline-input input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.875rem;
		font-family: inherit;
		resize: vertical;
	}

	/* Broadcasting Step */
	.broadcasting-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3rem 2rem;
		text-align: center;
	}

	.spinner {
		width: 48px;
		height: 48px;
		border: 4px solid #e5e7eb;
		border-top-color: #6366f1;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Tracking Step */
	.status-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.status-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		border-radius: 12px;
	}

	.status-card.confirmed {
		background: #dcfce7;
		color: #16a34a;
	}

	.status-card.pending {
		background: #fef3c7;
		color: #d97706;
	}

	.status-card.declined {
		background: #fee2e2;
		color: #dc2626;
	}

	.status-card.expired {
		background: #f3f4f6;
		color: #6b7280;
	}

	.card-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.card-value {
		font-size: 2rem;
		font-weight: 700;
	}

	.card-label {
		font-size: 0.875rem;
		opacity: 0.9;
	}

	/* Progress Section */
	.progress-section {
		margin-bottom: 2rem;
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		color: #374151;
	}

	.progress-percentage {
		font-weight: 600;
		color: #6366f1;
	}

	.progress-bar {
		height: 12px;
		background: #e5e7eb;
		border-radius: 6px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: #6366f1;
		transition: width 0.5s;
	}

	/* Errors Section */
	.errors-section {
		margin-bottom: 2rem;
		padding: 1rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
	}

	.errors-section h4 {
		margin: 0 0 1rem 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #991b1b;
		font-size: 1rem;
	}

	.errors-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.error-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.75rem;
		background: white;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.error-participant {
		font-weight: 500;
		color: #1f2937;
	}

	.error-message {
		color: #6b7280;
	}

	/* Assignments Table */
	.assignments-table-section {
		margin-bottom: 2rem;
	}

	.table-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.table-header h4 {
		margin: 0;
		font-size: 1.125rem;
		color: #1f2937;
	}

	.table-actions {
		display: flex;
		gap: 0.5rem;
	}

	.table-container {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: auto;
	}

	.assignments-table {
		width: 100%;
		border-collapse: collapse;
	}

	.assignments-table th,
	.assignments-table td {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid #f3f4f6;
	}

	.assignments-table th {
		background: #f9fafb;
		font-weight: 600;
		font-size: 0.875rem;
		color: #374151;
		position: sticky;
		top: 0;
	}

	.assignments-table td {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.assignments-table tbody tr:hover {
		background: #fafafa;
	}

	.participant-cell,
	.team-cell {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.participant-name,
	.team-name {
		color: #1f2937;
		font-weight: 500;
	}

	.participant-email,
	.team-topic {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
	}

	.status-badge.confirmed {
		background: #dcfce7;
		color: #16a34a;
	}

	.status-badge.pending {
		background: #fef3c7;
		color: #d97706;
	}

	.status-badge.declined {
		background: #fee2e2;
		color: #dc2626;
	}

	.status-badge.expired {
		background: #f3f4f6;
		color: #6b7280;
	}

	.notification-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.notification-badge.sent {
		background: #dcfce7;
		color: #16a34a;
	}

	.notification-badge:not(.sent) {
		background: #fee2e2;
		color: #dc2626;
	}

	/* Actions */
	.actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
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

	.button.small {
		padding: 0.5rem 1rem;
		font-size: 0.8125rem;
	}

	/* Error Message */
	.error-message {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		color: #991b1b;
		margin-bottom: 1rem;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.team-assignment-broadcast {
			padding: 1rem;
		}

		.method-options {
			grid-template-columns: 1fr;
		}

		.status-cards {
			grid-template-columns: repeat(2, 1fr);
		}

		.table-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.table-actions {
			width: 100%;
			flex-direction: column;
		}

		.button.small {
			width: 100%;
		}
	}
</style>
