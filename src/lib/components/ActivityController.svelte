<script lang="ts">
	/**
	 * Activity Controller
	 * Organizer controls for switching activities with real-time monitoring
	 */
	import {
		Play,
		Pause,
		Square,
		SkipForward,
		CheckSquare,
		Gamepad2,
		MessageSquare,
		Users,
		Eye,
		Activity as ActivityIcon,
		AlertCircle
	} from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import { ActivityType } from '../../types/enums';
	import type { Event } from '../../types/entities';

	interface ActivityControllerProps {
		event: Event;
		participantCount?: number;
		activeParticipants?: number;
		class?: string;
	}

	let {
		event = $bindable(),
		participantCount = 0,
		activeParticipants = 0,
		class: className = ''
	}: ActivityControllerProps = $props();

	const dispatch = createEventDispatcher<{
		switchActivity: { activityType: ActivityType };
		pauseActivity: void;
		resumeActivity: void;
		endActivity: void;
	}>();

	interface ActivityOption {
		type: ActivityType;
		label: string;
		description: string;
		icon: any;
		color: string;
		enabled: boolean;
	}

	const activityOptions: ActivityOption[] = [
		{
			type: ActivityType.VOTING,
			label: 'Topic Voting',
			description: 'Participants vote on discussion topics',
			icon: CheckSquare,
			color: '#6366f1',
			enabled: event.settings.enableVoting
		},
		{
			type: ActivityType.GROUP_INTELLIGENCE,
			label: 'Group Intelligence',
			description: 'Collaborative games and challenges',
			icon: Gamepad2,
			color: '#8b5cf6',
			enabled: event.settings.enableGroupIntelligence
		},
		{
			type: ActivityType.DISCUSSION_GROUPS,
			label: 'Discussion Groups',
			description: 'Small group discussions on selected topics',
			icon: MessageSquare,
			color: '#10b981',
			enabled: event.settings.enableDiscussionGroups
		},
		{
			type: ActivityType.TEAM_DISTRIBUTION,
			label: 'Team Distribution',
			description: 'Assign participants to discussion teams',
			icon: Users,
			color: '#f59e0b',
			enabled: event.settings.enableTeamDistribution
		}
	];

	// State
	let isPaused = $state(false);
	let selectedActivity = $state<ActivityType | null>(event.currentActivity || null);
	let showConfirmSwitch = $state(false);
	let pendingActivity = $state<ActivityType | null>(null);

	// Computed
	const enabledActivities = $derived(activityOptions.filter((a) => a.enabled));

	const participationRate = $derived(() => {
		if (participantCount === 0) return 0;
		return Math.round((activeParticipants / participantCount) * 100);
	});

	const currentActivityInfo = $derived(() => {
		if (!event.currentActivity) return null;
		return activityOptions.find((a) => a.type === event.currentActivity);
	});

	function requestActivitySwitch(activityType: ActivityType) {
		if (event.currentActivity && event.currentActivity !== activityType) {
			pendingActivity = activityType;
			showConfirmSwitch = true;
		} else {
			switchActivity(activityType);
		}
	}

	function confirmSwitch() {
		if (pendingActivity) {
			switchActivity(pendingActivity);
		}
		showConfirmSwitch = false;
		pendingActivity = null;
	}

	function cancelSwitch() {
		showConfirmSwitch = false;
		pendingActivity = null;
	}

	function switchActivity(activityType: ActivityType) {
		selectedActivity = activityType;
		event.currentActivity = activityType;
		dispatch('switchActivity', { activityType });
	}

	function handlePause() {
		isPaused = true;
		dispatch('pauseActivity');
	}

	function handleResume() {
		isPaused = false;
		dispatch('resumeActivity');
	}

	function handleEnd() {
		selectedActivity = null;
		event.currentActivity = undefined;
		dispatch('endActivity');
	}
</script>

<div class="activity-controller {className}">
	<!-- Current Activity Status -->
	<div class="current-activity-status">
		<div class="status-header">
			<h3>Current Activity</h3>
			<div class="participant-stats">
				<Eye size={16} />
				<span>
					{activeParticipants} / {participantCount} active ({participationRate()}%)
				</span>
			</div>
		</div>

		{#if currentActivityInfo}
			{@const Icon = currentActivityInfo.icon}
			<div class="active-activity-card" style="border-color: {currentActivityInfo.color}">
				<div class="activity-icon" style="background: {currentActivityInfo.color}20; color: {currentActivityInfo.color}">
					<Icon size={32} />
				</div>
				<div class="activity-details">
					<h4>{currentActivityInfo.label}</h4>
					<p>{currentActivityInfo.description}</p>
					<div class="activity-status-badge">
						{isPaused ? 'Paused' : 'Active'}
					</div>
				</div>

				<div class="activity-controls">
					{#if !isPaused}
						<button class="control-button pause" onclick={handlePause} title="Pause">
							<Pause size={20} />
						</button>
					{:else}
						<button class="control-button play" onclick={handleResume} title="Resume">
							<Play size={20} />
						</button>
					{/if}

					<button class="control-button stop" onclick={handleEnd} title="End Activity">
						<Square size={20} />
					</button>
				</div>
			</div>
		{:else}
			<div class="no-activity-card">
				<ActivityIcon size={48} />
				<h4>No Active Activity</h4>
				<p>Select an activity below to begin</p>
			</div>
		{/if}
	</div>

	<!-- Activity Selection -->
	<div class="activity-selection">
		<h3>Available Activities</h3>

		{#if enabledActivities.length === 0}
			<div class="no-activities">
				<AlertCircle size={48} />
				<h4>No Activities Enabled</h4>
				<p>Enable activities in event configuration to get started</p>
			</div>
		{:else}
			<div class="activity-grid">
				{#each enabledActivities as activity}
					{@const Icon = activity.icon}
					<button
						class="activity-option"
						class:selected={selectedActivity === activity.type}
						class:active={event.currentActivity === activity.type}
						onclick={() => requestActivitySwitch(activity.type)}
						disabled={event.currentActivity === activity.type}
					>
						<div class="option-icon" style="background: {activity.color}20; color: {activity.color}">
							<Icon size={28} />
						</div>
						<div class="option-content">
							<h5>{activity.label}</h5>
							<p>{activity.description}</p>
						</div>
						{#if event.currentActivity === activity.type}
							<div class="active-indicator" style="background: {activity.color}">
								Active
							</div>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Quick Actions -->
	{#if event.currentActivity}
		<div class="quick-actions">
			<h3>Quick Actions</h3>
			<div class="actions-row">
				<button class="action-button">
					<SkipForward size={18} />
					<span>Skip to Next Phase</span>
				</button>
			</div>
		</div>
	{/if}

	<!-- Confirmation Modal -->
	{#if showConfirmSwitch}
		<div class="modal-overlay" onclick={cancelSwitch}>
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h4>Switch Activity?</h4>
				</div>

				<div class="modal-body">
					<p>
						Switching from <strong>{currentActivityInfo?.label}</strong> to
						<strong>{activityOptions.find((a) => a.type === pendingActivity)?.label}</strong>
						will end the current activity.
					</p>
					<p>Are you sure you want to continue?</p>
				</div>

				<div class="modal-actions">
					<button class="button secondary" onclick={cancelSwitch}>Cancel</button>
					<button class="button primary" onclick={confirmSwitch}>Switch Activity</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.activity-controller {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	h3 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		color: #1f2937;
	}

	/* Current Activity Status */
	.current-activity-status {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 2rem;
	}

	.status-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.participant-stats {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.active-activity-card {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 1.5rem;
		border: 2px solid;
		border-radius: 12px;
		background: #fafafa;
	}

	.activity-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		border-radius: 12px;
	}

	.activity-details {
		flex: 1;
	}

	.activity-details h4 {
		margin: 0 0 0.25rem 0;
		font-size: 1.125rem;
		color: #1f2937;
	}

	.activity-details p {
		margin: 0 0 0.5rem 0;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.activity-status-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		background: #10b981;
		color: white;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.activity-controls {
		display: flex;
		gap: 0.5rem;
	}

	.control-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.control-button.pause {
		background: #fef3c7;
		color: #f59e0b;
	}

	.control-button.pause:hover {
		background: #fde68a;
	}

	.control-button.play {
		background: #dcfce7;
		color: #10b981;
	}

	.control-button.play:hover {
		background: #bbf7d0;
	}

	.control-button.stop {
		background: #fee2e2;
		color: #ef4444;
	}

	.control-button.stop:hover {
		background: #fecaca;
	}

	.no-activity-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3rem 2rem;
		text-align: center;
		color: #9ca3af;
	}

	.no-activity-card h4 {
		margin: 0;
		color: #374151;
	}

	.no-activity-card p {
		margin: 0;
		color: #6b7280;
	}

	/* Activity Selection */
	.activity-selection {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 2rem;
	}

	.activity-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
	}

	.activity-option {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background: #fafafa;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
		position: relative;
	}

	.activity-option:hover:not(:disabled) {
		border-color: #d1d5db;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	}

	.activity-option.active {
		background: white;
		border-color: currentColor;
		cursor: default;
	}

	.activity-option:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.option-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		border-radius: 12px;
	}

	.option-content {
		flex: 1;
	}

	.option-content h5 {
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
		color: #1f2937;
	}

	.option-content p {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.active-indicator {
		padding: 0.25rem 0.75rem;
		color: white;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.no-activities {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3rem 2rem;
		text-align: center;
		color: #9ca3af;
	}

	.no-activities h4 {
		margin: 0;
		color: #374151;
	}

	.no-activities p {
		margin: 0;
		color: #6b7280;
	}

	/* Quick Actions */
	.quick-actions {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 2rem;
	}

	.actions-row {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.action-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: #f9fafb;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		font-weight: 500;
		color: #374151;
	}

	.action-button:hover {
		background: #f3f4f6;
		border-color: #9ca3af;
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

	.modal-body p:last-child {
		margin-bottom: 0;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding: 1.5rem;
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
	@media (max-width: 768px) {
		.status-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.active-activity-card {
			flex-direction: column;
			text-align: center;
		}

		.activity-controls {
			width: 100%;
			justify-content: center;
		}

		.activity-grid {
			grid-template-columns: 1fr;
		}

		.modal-actions {
			flex-direction: column;
		}

		.button {
			width: 100%;
		}
	}
</style>
