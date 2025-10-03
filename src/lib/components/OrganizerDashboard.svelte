<script lang="ts">
	/**
	 * Organizer Dashboard
	 * Comprehensive control panel for event management and orchestration
	 */
	import {
		Settings,
		Users,
		Activity,
		BarChart3,
		Clock,
		Shield,
		ChevronRight,
		Edit,
		Save,
		X
	} from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import type { Event } from '../../types/entities';
	import { EventStatus } from '../../types/enums';

	interface OrganizerDashboardProps {
		event: Event;
		currentUser: any;
		class?: string;
	}

	let {
		event = $bindable(),
		currentUser,
		class: className = ''
	}: OrganizerDashboardProps = $props();

	const dispatch = createEventDispatcher<{
		updateEvent: { event: Event };
		switchActivity: { activityType: string };
		navigateToSection: { section: string };
	}>();

	// State
	let activeTab = $state<'overview' | 'configuration' | 'participants' | 'analytics'>('overview');
	let isEditingConfig = $state(false);
	let editableEvent = $state<Event>({ ...event });

	// Computed
	const eventStatusColor = $derived(() => {
		switch (event.status) {
			case EventStatus.DRAFT:
				return '#9ca3af';
			case EventStatus.SCHEDULED:
				return '#3b82f6';
			case EventStatus.ACTIVE:
				return '#10b981';
			case EventStatus.PAUSED:
				return '#f59e0b';
			case EventStatus.COMPLETED:
				return '#6b7280';
			case EventStatus.CANCELLED:
				return '#ef4444';
			default:
				return '#6b7280';
		}
	});

	const canEdit = $derived(
		currentUser?.id === event.organizerId || currentUser?.role === 'admin'
	);

	function startEditing() {
		editableEvent = { ...event };
		isEditingConfig = true;
	}

	function cancelEditing() {
		editableEvent = { ...event };
		isEditingConfig = false;
	}

	function saveConfiguration() {
		event = { ...editableEvent };
		dispatch('updateEvent', { event });
		isEditingConfig = false;
	}

	function navigateToSection(section: string) {
		dispatch('navigateToSection', { section });
	}
</script>

<div class="organizer-dashboard {className}">
	<!-- Header -->
	<div class="dashboard-header">
		<div class="header-content">
			<div class="event-info">
				<h1>{event.title}</h1>
				<div class="event-meta">
					<span class="event-status" style="background: {eventStatusColor()}">
						{event.status}
					</span>
					<span class="event-code">Access Code: {event.accessCode}</span>
					{#if event.createdAt}
						<span class="event-date">
							Created {event.createdAt.toLocaleDateString()}
						</span>
					{/if}
				</div>
			</div>

			{#if canEdit}
				<div class="header-actions">
					<button class="button secondary" onclick={() => navigateToSection('settings')}>
						<Settings size={18} />
						Settings
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Navigation Tabs -->
	<div class="dashboard-tabs">
		<button
			class="tab"
			class:active={activeTab === 'overview'}
			onclick={() => (activeTab = 'overview')}
		>
			<Activity size={18} />
			<span>Overview</span>
		</button>

		<button
			class="tab"
			class:active={activeTab === 'configuration'}
			onclick={() => (activeTab = 'configuration')}
		>
			<Settings size={18} />
			<span>Configuration</span>
		</button>

		<button
			class="tab"
			class:active={activeTab === 'participants'}
			onclick={() => (activeTab = 'participants')}
		>
			<Users size={18} />
			<span>Participants</span>
		</button>

		<button
			class="tab"
			class:active={activeTab === 'analytics'}
			onclick={() => (activeTab = 'analytics')}
		>
			<BarChart3 size={18} />
			<span>Analytics</span>
		</button>
	</div>

	<!-- Tab Content -->
	<div class="dashboard-content">
		{#if activeTab === 'overview'}
			<div class="overview-tab">
				<div class="quick-stats">
					<div class="stat-card">
						<Users size={32} />
						<div class="stat-content">
							<span class="stat-value">0</span>
							<span class="stat-label">Participants</span>
						</div>
					</div>

					<div class="stat-card">
						<Activity size={32} />
						<div class="stat-content">
							<span class="stat-value">
								{event.currentActivity || 'None'}
							</span>
							<span class="stat-label">Current Activity</span>
						</div>
					</div>

					<div class="stat-card">
						<Clock size={32} />
						<div class="stat-content">
							<span class="stat-value">
								{event.updatedAt ? new Date().getTime() - event.updatedAt.getTime() : 0}ms
							</span>
							<span class="stat-label">Last Update</span>
						</div>
					</div>

					<div class="stat-card">
						<Shield size={32} />
						<div class="stat-content">
							<span class="stat-value">{event.settings.allowGuestAccess ? 'Open' : 'Closed'}</span>
							<span class="stat-label">Guest Access</span>
						</div>
					</div>
				</div>

				<!-- Quick Actions -->
				<div class="quick-actions-section">
					<h3>Quick Actions</h3>
					<div class="action-grid">
						<button
							class="action-card"
							onclick={() => navigateToSection('activity-control')}
						>
							<Activity size={24} />
							<div class="action-content">
								<span class="action-title">Control Activities</span>
								<span class="action-description">Switch between activities and manage timers</span>
							</div>
							<ChevronRight size={20} />
						</button>

						<button
							class="action-card"
							onclick={() => navigateToSection('participants')}
						>
							<Users size={24} />
							<div class="action-content">
								<span class="action-title">Manage Participants</span>
								<span class="action-description">View and manage participant list</span>
							</div>
							<ChevronRight size={20} />
						</button>

						<button
							class="action-card"
							onclick={() => navigateToSection('teams')}
						>
							<Users size={24} />
							<div class="action-content">
								<span class="action-title">Team Distribution</span>
								<span class="action-description">Create and manage discussion teams</span>
							</div>
							<ChevronRight size={20} />
						</button>

						<button
							class="action-card"
							onclick={() => navigateToSection('analytics')}
						>
							<BarChart3 size={24} />
							<div class="action-content">
								<span class="action-title">View Analytics</span>
								<span class="action-description">See participation metrics and insights</span>
							</div>
							<ChevronRight size={20} />
						</button>
					</div>
				</div>
			</div>
		{/if}

		{#if activeTab === 'configuration'}
			<div class="configuration-tab">
				<div class="section-header">
					<h3>Event Configuration</h3>
					{#if !isEditingConfig && canEdit}
						<button class="button secondary" onclick={startEditing}>
							<Edit size={16} />
							Edit
						</button>
					{/if}
				</div>

				<div class="config-sections">
					<!-- Basic Information -->
					<div class="config-section">
						<h4>Basic Information</h4>
						<div class="config-grid">
							<div class="config-field">
								<label>Event Title</label>
								{#if isEditingConfig}
									<input type="text" bind:value={editableEvent.title} />
								{:else}
									<p>{event.title}</p>
								{/if}
							</div>

							<div class="config-field">
								<label>Description</label>
								{#if isEditingConfig}
									<textarea bind:value={editableEvent.description} rows="3"></textarea>
								{:else}
									<p>{event.description || 'No description'}</p>
								{/if}
							</div>

							<div class="config-field">
								<label>Access Code</label>
								{#if isEditingConfig}
									<input type="text" bind:value={editableEvent.accessCode} />
								{:else}
									<p class="access-code">{event.accessCode}</p>
								{/if}
							</div>

							<div class="config-field">
								<label>Max Participants</label>
								{#if isEditingConfig}
									<input
										type="number"
										bind:value={editableEvent.maxParticipants}
										min="0"
									/>
								{:else}
									<p>{event.maxParticipants || 'Unlimited'}</p>
								{/if}
							</div>
						</div>
					</div>

					<!-- Features -->
					<div class="config-section">
						<h4>Features</h4>
						<div class="config-checkboxes">
							<label class="checkbox-label">
								<input
									type="checkbox"
									bind:checked={editableEvent.settings.allowGuestAccess}
									disabled={!isEditingConfig}
								/>
								<span>Allow Guest Access</span>
							</label>

							<label class="checkbox-label">
								<input
									type="checkbox"
									bind:checked={editableEvent.settings.requireRegistration}
									disabled={!isEditingConfig}
								/>
								<span>Require Registration</span>
							</label>

							<label class="checkbox-label">
								<input
									type="checkbox"
									bind:checked={editableEvent.settings.enableVoting}
									disabled={!isEditingConfig}
								/>
								<span>Enable Voting</span>
							</label>

							<label class="checkbox-label">
								<input
									type="checkbox"
									bind:checked={editableEvent.settings.enableGroupIntelligence}
									disabled={!isEditingConfig}
								/>
								<span>Enable Group Intelligence Games</span>
							</label>

							<label class="checkbox-label">
								<input
									type="checkbox"
									bind:checked={editableEvent.settings.enableDiscussionGroups}
									disabled={!isEditingConfig}
								/>
								<span>Enable Discussion Groups</span>
							</label>

							<label class="checkbox-label">
								<input
									type="checkbox"
									bind:checked={editableEvent.settings.enableTeamDistribution}
									disabled={!isEditingConfig}
								/>
								<span>Enable Team Distribution</span>
							</label>

							<label class="checkbox-label">
								<input
									type="checkbox"
									bind:checked={editableEvent.settings.autoAdvanceActivities}
									disabled={!isEditingConfig}
								/>
								<span>Auto-Advance Activities</span>
							</label>
						</div>
					</div>

					<!-- Voting Settings -->
					{#if event.settings.enableVoting}
						<div class="config-section">
							<h4>Voting Settings</h4>
							<div class="config-grid">
								<div class="config-field">
									<label>Max Votes Per Topic</label>
									{#if isEditingConfig}
										<input
											type="number"
											bind:value={editableEvent.settings.maxVotesPerTopic}
											min="1"
											max="10"
										/>
									{:else}
										<p>{event.settings.maxVotesPerTopic || 3}</p>
									{/if}
								</div>
							</div>
						</div>
					{/if}
				</div>

				{#if isEditingConfig}
					<div class="config-actions">
						<button class="button secondary" onclick={cancelEditing}>
							<X size={16} />
							Cancel
						</button>
						<button class="button primary" onclick={saveConfiguration}>
							<Save size={16} />
							Save Changes
						</button>
					</div>
				{/if}
			</div>
		{/if}

		{#if activeTab === 'participants'}
			<div class="participants-tab">
				<div class="section-header">
					<h3>Participants</h3>
					<button class="button secondary">
						<Users size={16} />
						Export List
					</button>
				</div>

				<div class="empty-state">
					<Users size={48} />
					<h4>No Participants Yet</h4>
					<p>Participants will appear here once they join the event</p>
				</div>
			</div>
		{/if}

		{#if activeTab === 'analytics'}
			<div class="analytics-tab">
				<div class="section-header">
					<h3>Analytics</h3>
					<button class="button secondary">
						<BarChart3 size={16} />
						Export Report
					</button>
				</div>

				<div class="empty-state">
					<BarChart3 size={48} />
					<h4>No Data Available</h4>
					<p>Analytics will be available once the event has activity</p>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.organizer-dashboard {
		min-height: 100vh;
		background: #f9fafb;
	}

	/* Header */
	.dashboard-header {
		background: white;
		border-bottom: 1px solid #e5e7eb;
		padding: 2rem;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		max-width: 1400px;
		margin: 0 auto;
	}

	.event-info h1 {
		margin: 0 0 0.75rem 0;
		font-size: 2rem;
		color: #1f2937;
	}

	.event-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.event-status {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		color: white;
		font-weight: 600;
		text-transform: uppercase;
		font-size: 0.75rem;
		letter-spacing: 0.05em;
	}

	.event-code {
		padding: 0.25rem 0.75rem;
		background: #f3f4f6;
		border-radius: 6px;
		font-family: monospace;
		font-weight: 600;
		color: #374151;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	/* Tabs */
	.dashboard-tabs {
		background: white;
		border-bottom: 1px solid #e5e7eb;
		padding: 0 2rem;
		display: flex;
		gap: 1rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 1.5rem;
		background: none;
		border: none;
		border-bottom: 3px solid transparent;
		cursor: pointer;
		color: #6b7280;
		font-weight: 500;
		transition: all 0.2s;
	}

	.tab:hover {
		color: #374151;
		background: #f9fafb;
	}

	.tab.active {
		color: #6366f1;
		border-bottom-color: #6366f1;
	}

	/* Content */
	.dashboard-content {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
	}

	/* Overview Tab */
	.quick-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 2rem;
		background: white;
		border-radius: 12px;
		border: 1px solid #e5e7eb;
		color: #6366f1;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: #1f2937;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.quick-actions-section h3 {
		margin: 0 0 1.5rem 0;
		font-size: 1.25rem;
		color: #1f2937;
	}

	.action-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
	}

	.action-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
		color: #6366f1;
	}

	.action-card:hover {
		border-color: #6366f1;
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
	}

	.action-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.action-title {
		font-weight: 600;
		color: #1f2937;
		font-size: 1rem;
	}

	.action-description {
		font-size: 0.875rem;
		color: #6b7280;
	}

	/* Configuration Tab */
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.section-header h3 {
		margin: 0;
		font-size: 1.5rem;
		color: #1f2937;
	}

	.config-sections {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		margin-bottom: 2rem;
	}

	.config-section {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 2rem;
	}

	.config-section h4 {
		margin: 0 0 1.5rem 0;
		font-size: 1.125rem;
		color: #1f2937;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.config-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.config-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.config-field label {
		font-weight: 500;
		color: #374151;
		font-size: 0.875rem;
	}

	.config-field input,
	.config-field textarea {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.875rem;
		font-family: inherit;
	}

	.config-field p {
		margin: 0;
		padding: 0.75rem;
		background: #f9fafb;
		border-radius: 8px;
		color: #374151;
	}

	.config-field .access-code {
		font-family: monospace;
		font-weight: 600;
		background: #f3f4f6;
	}

	.config-checkboxes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		font-size: 0.875rem;
		color: #374151;
		padding: 0.5rem;
		border-radius: 6px;
		transition: background 0.2s;
	}

	.checkbox-label:hover {
		background: #f9fafb;
	}

	.checkbox-label input[type='checkbox'] {
		width: 18px;
		height: 18px;
		cursor: pointer;
	}

	.checkbox-label input[type='checkbox']:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.config-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding-top: 2rem;
		border-top: 1px solid #e5e7eb;
	}

	/* Empty States */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 4rem 2rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
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

	.button.primary:hover {
		background: #4f46e5;
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
		.dashboard-header,
		.dashboard-tabs,
		.dashboard-content {
			padding-left: 1rem;
			padding-right: 1rem;
		}

		.quick-stats {
			grid-template-columns: repeat(2, 1fr);
		}

		.action-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.event-info h1 {
			font-size: 1.5rem;
		}

		.header-content {
			flex-direction: column;
			gap: 1rem;
		}

		.dashboard-tabs {
			overflow-x: auto;
		}

		.quick-stats {
			grid-template-columns: 1fr;
		}

		.config-grid {
			grid-template-columns: 1fr;
		}

		.config-checkboxes {
			grid-template-columns: 1fr;
		}
	}
</style>
