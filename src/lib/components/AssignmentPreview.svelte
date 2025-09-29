<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Topic, DiscussionRoom, RoomAssignment, AssignmentSettings } from '../../types/entities';
	import { Play, Settings, BarChart3, Users, Target, X } from 'lucide-svelte';

	const dispatch = createEventDispatcher();

	export let eventId: string;
	export let topics: Topic[] = [];
	export let rooms: DiscussionRoom[] = [];
	export let assignments: RoomAssignment[] = [];
	export let assignmentSettings: AssignmentSettings;

	let showSettings = false;
	let localSettings = { ...assignmentSettings };

	$: totalParticipants = assignments.length;
	$: roomUtilization = rooms.map(room => ({
		room,
		topic: topics.find(t => t.id === room.topicId),
		assignedCount: assignments.filter(a => a.roomId === room.id).length,
		utilizationRate: room.capacity > 0 ? (assignments.filter(a => a.roomId === room.id).length / room.capacity) * 100 : 0
	}));

	$: preferenceStats = {
		firstChoice: assignments.filter(a => a.preferenceRank === 1).length,
		secondChoice: assignments.filter(a => a.preferenceRank === 2).length,
		thirdChoice: assignments.filter(a => a.preferenceRank === 3).length,
		noPreference: assignments.filter(a => !a.preferenceRank).length
	};

	$: satisfactionScore = assignments.reduce((total, assignment) => {
		const score = assignment.preferenceRank === 1 ? 3 :
					  assignment.preferenceRank === 2 ? 2 :
					  assignment.preferenceRank === 3 ? 1 : 0;
		return total + score;
	}, 0);

	$: averageSatisfaction = totalParticipants > 0 ? satisfactionScore / totalParticipants : 0;

	function handleClose() {
		dispatch('close');
	}

	function handleGenerate() {
		dispatch('generate');
	}

	function handleSettingsChange() {
		assignmentSettings = { ...localSettings };
		dispatch('settingsChange', localSettings);
		showSettings = false;
	}

	function getTopicTitle(topicId: string) {
		return topics.find(t => t.id === topicId)?.title || 'Unknown Topic';
	}
</script>

<div class="modal-overlay" on:click={handleClose}>
	<div class="modal assignment-preview" on:click|stopPropagation>
		<div class="modal-header">
			<h3>Assignment Preview & Settings</h3>
			<button class="btn-close" on:click={handleClose}>
				<X size={20} />
			</button>
		</div>

		<div class="modal-body">
			{#if assignments.length === 0}
				<!-- Pre-assignment Settings -->
				<div class="pre-assignment">
					<div class="settings-summary">
						<h4>Current Settings</h4>
						<div class="settings-grid">
							<div class="setting-item">
								<span class="label">Max Room Capacity:</span>
								<span class="value">{assignmentSettings.maxRoomCapacity}</span>
							</div>
							<div class="setting-item">
								<span class="label">Min Room Size:</span>
								<span class="value">{assignmentSettings.minRoomSize}</span>
							</div>
							<div class="setting-item">
								<span class="label">Allow Overflow:</span>
								<span class="value">{assignmentSettings.allowOverflow ? 'Yes' : 'No'}</span>
							</div>
							<div class="setting-item">
								<span class="label">Fairness Algorithm:</span>
								<span class="value">{assignmentSettings.fairnessEnabled ? 'Enabled' : 'Disabled'}</span>
							</div>
						</div>
					</div>

					<div class="capacity-overview">
						<h4>Room Capacity Overview</h4>
						<div class="rooms-list">
							{#each rooms as room}
								<div class="room-summary">
									<div class="room-info">
										<strong>{room.name}</strong>
										<span class="topic-name">{getTopicTitle(room.topicId)}</span>
									</div>
									<div class="capacity-info">
										<span class="capacity">{room.capacity} max</span>
										<div class="capacity-bar">
											<div class="capacity-fill" style="width: 0%"></div>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{:else}
				<!-- Post-assignment Results -->
				<div class="assignment-results">
					<div class="stats-grid">
						<div class="stat-card">
							<div class="stat-icon">
								<Users size={24} />
							</div>
							<div class="stat-content">
								<span class="stat-value">{totalParticipants}</span>
								<span class="stat-label">Participants Assigned</span>
							</div>
						</div>

						<div class="stat-card">
							<div class="stat-icon">
								<Target size={24} />
							</div>
							<div class="stat-content">
								<span class="stat-value">{averageSatisfaction.toFixed(1)}</span>
								<span class="stat-label">Avg Satisfaction Score</span>
							</div>
						</div>

						<div class="stat-card">
							<div class="stat-icon">
								<BarChart3 size={24} />
							</div>
							<div class="stat-content">
								<span class="stat-value">{rooms.length}</span>
								<span class="stat-label">Active Rooms</span>
							</div>
						</div>
					</div>

					<div class="preference-breakdown">
						<h4>Preference Distribution</h4>
						<div class="preference-stats">
							<div class="preference-item first-choice">
								<span class="preference-label">1st Choice</span>
								<span class="preference-count">{preferenceStats.firstChoice}</span>
								<div class="preference-bar">
									<div class="preference-fill" style="width: {totalParticipants > 0 ? (preferenceStats.firstChoice / totalParticipants) * 100 : 0}%"></div>
								</div>
							</div>
							<div class="preference-item second-choice">
								<span class="preference-label">2nd Choice</span>
								<span class="preference-count">{preferenceStats.secondChoice}</span>
								<div class="preference-bar">
									<div class="preference-fill" style="width: {totalParticipants > 0 ? (preferenceStats.secondChoice / totalParticipants) * 100 : 0}%"></div>
								</div>
							</div>
							<div class="preference-item third-choice">
								<span class="preference-label">3rd Choice</span>
								<span class="preference-count">{preferenceStats.thirdChoice}</span>
								<div class="preference-bar">
									<div class="preference-fill" style="width: {totalParticipants > 0 ? (preferenceStats.thirdChoice / totalParticipants) * 100 : 0}%"></div>
								</div>
							</div>
							{#if preferenceStats.noPreference > 0}
								<div class="preference-item no-preference">
									<span class="preference-label">No Preference</span>
									<span class="preference-count">{preferenceStats.noPreference}</span>
									<div class="preference-bar">
										<div class="preference-fill" style="width: {totalParticipants > 0 ? (preferenceStats.noPreference / totalParticipants) * 100 : 0}%"></div>
									</div>
								</div>
							{/if}
						</div>
					</div>

					<div class="room-utilization">
						<h4>Room Utilization</h4>
						<div class="room-utilization-list">
							{#each roomUtilization as { room, topic, assignedCount, utilizationRate }}
								<div class="room-util-item">
									<div class="room-util-info">
										<strong>{room.name}</strong>
										<span class="topic-name">{topic?.title || 'Unknown Topic'}</span>
									</div>
									<div class="util-stats">
										<span class="util-count">{assignedCount}/{room.capacity}</span>
										<div class="util-bar">
											<div
												class="util-fill"
												style="width: {Math.min(utilizationRate, 100)}%"
												class:over-capacity={utilizationRate > 100}
											></div>
										</div>
										<span class="util-percentage">{utilizationRate.toFixed(0)}%</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div class="modal-footer">
			<button class="btn btn-secondary" on:click={handleClose}>
				Cancel
			</button>

			<button
				class="btn btn-outline"
				on:click={() => showSettings = true}
			>
				<Settings size={16} />
				Settings
			</button>

			<button
				class="btn btn-primary"
				on:click={handleGenerate}
				disabled={rooms.length === 0}
			>
				<Play size={16} />
				{assignments.length === 0 ? 'Generate Assignments' : 'Regenerate Assignments'}
			</button>
		</div>
	</div>
</div>

<!-- Settings Modal -->
{#if showSettings}
	<div class="modal-overlay settings-modal" on:click={() => showSettings = false}>
		<div class="modal settings-panel" on:click|stopPropagation>
			<div class="modal-header">
				<h3>Assignment Settings</h3>
				<button class="btn-close" on:click={() => showSettings = false}>
					<X size={20} />
				</button>
			</div>

			<div class="modal-body">
				<div class="settings-form">
					<div class="form-group">
						<label for="maxCapacity">Maximum Room Capacity</label>
						<input
							id="maxCapacity"
							type="number"
							bind:value={localSettings.maxRoomCapacity}
							min="5"
							max="50"
							class="form-input"
						>
					</div>

					<div class="form-group">
						<label for="minSize">Minimum Room Size</label>
						<input
							id="minSize"
							type="number"
							bind:value={localSettings.minRoomSize}
							min="2"
							max="10"
							class="form-input"
						>
					</div>

					<div class="form-group checkbox-group">
						<label class="checkbox-label">
							<input
								type="checkbox"
								bind:checked={localSettings.allowOverflow}
							>
							<span class="checkbox-text">Allow overflow assignments</span>
						</label>
						<p class="help-text">Assign participants to available rooms even if not their preference</p>
					</div>

					<div class="form-group checkbox-group">
						<label class="checkbox-label">
							<input
								type="checkbox"
								bind:checked={localSettings.fairnessEnabled}
							>
							<span class="checkbox-text">Enable fairness algorithm</span>
						</label>
						<p class="help-text">Balance assignments to ensure equitable distribution</p>
					</div>

					<div class="form-group checkbox-group">
						<label class="checkbox-label">
							<input
								type="checkbox"
								bind:checked={localSettings.manualOverrideEnabled}
							>
							<span class="checkbox-text">Allow manual overrides</span>
						</label>
						<p class="help-text">Organizers can manually move participants after assignment</p>
					</div>

					<div class="form-group">
						<label>Preference Weights</label>
						<div class="weight-inputs">
							<div class="weight-input">
								<label for="firstWeight">1st Choice</label>
								<input
									id="firstWeight"
									type="number"
									bind:value={localSettings.preferenceWeights.first}
									min="1"
									max="10"
									class="form-input"
								>
							</div>
							<div class="weight-input">
								<label for="secondWeight">2nd Choice</label>
								<input
									id="secondWeight"
									type="number"
									bind:value={localSettings.preferenceWeights.second}
									min="1"
									max="10"
									class="form-input"
								>
							</div>
							<div class="weight-input">
								<label for="thirdWeight">3rd Choice</label>
								<input
									id="thirdWeight"
									type="number"
									bind:value={localSettings.preferenceWeights.third}
									min="1"
									max="10"
									class="form-input"
								>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<button class="btn btn-secondary" on:click={() => showSettings = false}>
					Cancel
				</button>
				<button class="btn btn-primary" on:click={handleSettingsChange}>
					Apply Settings
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.settings-modal {
		z-index: 1001;
	}

	.modal {
		background: white;
		border-radius: 0.5rem;
		max-width: 800px;
		width: 90vw;
		max-height: 90vh;
		overflow-y: auto;
	}

	.settings-panel {
		max-width: 500px;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h3 {
		margin: 0;
		color: #1f2937;
	}

	.btn-close {
		background: none;
		border: none;
		cursor: pointer;
		color: #6b7280;
		padding: 0.25rem;
		border-radius: 0.25rem;
	}

	.btn-close:hover {
		background-color: #f3f4f6;
	}

	.modal-body {
		padding: 1.5rem;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background-color: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #2563eb;
	}

	.btn-secondary {
		background-color: #6b7280;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: #4b5563;
	}

	.btn-outline {
		background-color: transparent;
		border: 1px solid #d1d5db;
		color: #374151;
	}

	.btn-outline:hover:not(:disabled) {
		background-color: #f9fafb;
	}

	/* Pre-assignment styles */
	.pre-assignment {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.settings-summary h4,
	.capacity-overview h4 {
		margin: 0 0 1rem;
		color: #1f2937;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.setting-item {
		display: flex;
		justify-content: space-between;
		padding: 0.75rem;
		background-color: #f9fafb;
		border-radius: 0.375rem;
	}

	.setting-item .label {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.setting-item .value {
		color: #1f2937;
		font-weight: 500;
	}

	.rooms-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.room-summary {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
	}

	.room-info strong {
		display: block;
		color: #1f2937;
	}

	.topic-name {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.capacity-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.capacity {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.capacity-bar {
		width: 100px;
		height: 4px;
		background-color: #e5e7eb;
		border-radius: 2px;
	}

	.capacity-fill {
		height: 100%;
		background-color: #10b981;
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	/* Post-assignment styles */
	.assignment-results {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background-color: #f9fafb;
		border-radius: 0.5rem;
	}

	.stat-icon {
		color: #3b82f6;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.preference-breakdown h4,
	.room-utilization h4 {
		margin: 0 0 1rem;
		color: #1f2937;
	}

	.preference-stats {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.preference-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		border-radius: 0.375rem;
	}

	.preference-item.first-choice {
		background-color: #f0fdf4;
	}

	.preference-item.second-choice {
		background-color: #fffbeb;
	}

	.preference-item.third-choice {
		background-color: #fef3c7;
	}

	.preference-item.no-preference {
		background-color: #f3f4f6;
	}

	.preference-label {
		min-width: 80px;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.preference-count {
		min-width: 30px;
		font-weight: 600;
		color: #1f2937;
	}

	.preference-bar {
		flex: 1;
		height: 6px;
		background-color: #e5e7eb;
		border-radius: 3px;
		overflow: hidden;
	}

	.preference-fill {
		height: 100%;
		transition: width 0.3s ease;
	}

	.first-choice .preference-fill {
		background-color: #16a34a;
	}

	.second-choice .preference-fill {
		background-color: #d97706;
	}

	.third-choice .preference-fill {
		background-color: #a16207;
	}

	.no-preference .preference-fill {
		background-color: #6b7280;
	}

	.room-utilization-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.room-util-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
	}

	.room-util-info strong {
		display: block;
		color: #1f2937;
	}

	.util-stats {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.util-count {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		min-width: 50px;
	}

	.util-bar {
		width: 100px;
		height: 6px;
		background-color: #e5e7eb;
		border-radius: 3px;
		overflow: hidden;
	}

	.util-fill {
		height: 100%;
		background-color: #10b981;
		transition: width 0.3s ease;
	}

	.util-fill.over-capacity {
		background-color: #ef4444;
	}

	.util-percentage {
		font-size: 0.875rem;
		color: #6b7280;
		min-width: 35px;
	}

	/* Settings form styles */
	.settings-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-weight: 500;
		color: #374151;
		font-size: 0.875rem;
	}

	.form-input {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
	}

	.form-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.checkbox-group {
		gap: 0.25rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.checkbox-text {
		font-weight: 500;
		color: #374151;
	}

	.help-text {
		margin: 0;
		font-size: 0.75rem;
		color: #6b7280;
		padding-left: 1.25rem;
	}

	.weight-inputs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	.weight-input {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.weight-input label {
		font-size: 0.75rem;
		color: #6b7280;
	}

	@media (max-width: 768px) {
		.modal {
			width: 95vw;
			max-height: 95vh;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.room-util-item {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.util-stats {
			justify-content: space-between;
		}

		.settings-grid {
			grid-template-columns: 1fr;
		}

		.weight-inputs {
			grid-template-columns: 1fr;
		}
	}
</style>