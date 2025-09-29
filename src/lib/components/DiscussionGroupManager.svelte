<script lang="ts">
	import { onMount } from 'svelte';
	import { discussionGroupStore } from '../stores/discussionGroupStore';
	import { votingStore } from '../stores/votingStore';
	import type { Topic, User } from '../../types/entities';
	import { DiscussionRoomStatus } from '../../types/enums';
	import RoomCard from './RoomCard.svelte';
	import AssignmentPreview from './AssignmentPreview.svelte';
	import { Users, Settings, Play, RefreshCw, AlertTriangle } from 'lucide-svelte';

	export let eventId: string;
	export let currentUser: User;
	export let topics: Topic[] = [];
	export let isOrganizer: boolean = false;

	let showCreateRooms = false;
	let showAssignmentPreview = false;
	let selectedTopics: string[] = [];
	let roomCapacity = 10;
	let assignmentSettings = {
		maxRoomCapacity: 10,
		minRoomSize: 3,
		allowOverflow: true,
		fairnessEnabled: true
	};

	$: discussionGroups = $discussionGroupStore;
	$: currentUserAssignment = discussionGroups.currentUserAssignment;
	$: userAssignedRoom = discussionGroups.rooms.find(room =>
		room.assignedParticipants.includes(currentUser.id)
	);

	onMount(async () => {
		await discussionGroupStore.loadDiscussionGroups(eventId);
		await discussionGroupStore.loadUserAssignment(currentUser.id, eventId);
	});

	async function handleCreateRooms() {
		if (selectedTopics.length === 0) {
			discussionGroupStore.clearError();
			return;
		}

		try {
			await discussionGroupStore.createRooms(eventId, selectedTopics, roomCapacity);
			showCreateRooms = false;
			selectedTopics = [];
		} catch (error) {
			console.error('Failed to create rooms:', error);
		}
	}

	async function handleGenerateAssignments() {
		try {
			const result = await discussionGroupStore.generateAssignments(eventId, assignmentSettings);
			console.log('Assignment results:', result);
			showAssignmentPreview = false;
		} catch (error) {
			console.error('Failed to generate assignments:', error);
		}
	}

	async function handleManualAssign(userId: string, roomId: string, topicId: string) {
		try {
			await discussionGroupStore.assignUser(userId, roomId, topicId, eventId);
		} catch (error) {
			console.error('Failed to assign user:', error);
		}
	}

	async function handleMoveUser(userId: string, newRoomId: string, newTopicId: string) {
		try {
			await discussionGroupStore.moveUser(userId, newRoomId, newTopicId, eventId);
		} catch (error) {
			console.error('Failed to move user:', error);
		}
	}

	function toggleTopicSelection(topicId: string) {
		if (selectedTopics.includes(topicId)) {
			selectedTopics = selectedTopics.filter(id => id !== topicId);
		} else {
			selectedTopics = [...selectedTopics, topicId];
		}
	}

	function getRoomForTopic(topicId: string) {
		return discussionGroups.rooms.find(room => room.topicId === topicId);
	}

	function getParticipantCount(roomId: string) {
		return discussionGroups.assignments.filter(a => a.roomId === roomId).length;
	}

	function getTopicTitle(topicId: string) {
		return topics.find(t => t.id === topicId)?.title || 'Unknown Topic';
	}
</script>

<div class="discussion-group-manager">
	<div class="header">
		<h2>Discussion Groups</h2>
		{#if isOrganizer}
			<div class="organizer-controls">
				<button
					class="btn btn-secondary"
					on:click={() => showCreateRooms = true}
					disabled={discussionGroups.loading}
				>
					<Settings size={16} />
					Setup Rooms
				</button>
				<button
					class="btn btn-primary"
					on:click={() => showAssignmentPreview = true}
					disabled={discussionGroups.loading || discussionGroups.rooms.length === 0}
				>
					<Play size={16} />
					Generate Assignments
				</button>
			</div>
		{/if}
	</div>

	{#if discussionGroups.error}
		<div class="error-message">
			<AlertTriangle size={16} />
			{discussionGroups.error}
			<button class="btn-link" on:click={discussionGroupStore.clearError}>Dismiss</button>
		</div>
	{/if}

	{#if discussionGroups.loading}
		<div class="loading">
			<RefreshCw class="spin" size={20} />
			Loading discussion groups...
		</div>
	{:else if discussionGroups.rooms.length === 0}
		<div class="empty-state">
			<Users size={48} />
			<h3>No Discussion Rooms Yet</h3>
			<p>
				{#if isOrganizer}
					Create rooms for topics to get started with discussion groups.
				{:else}
					The organizer hasn't set up discussion rooms yet.
				{/if}
			</p>
		</div>
	{:else}
		<!-- Current User Assignment -->
		{#if currentUserAssignment}
			<div class="user-assignment">
				<h3>Your Assignment</h3>
				<div class="assignment-card">
					<div class="assignment-info">
						<h4>{getTopicTitle(currentUserAssignment.topicId)}</h4>
						<p>Room: {userAssignedRoom?.name || 'Unknown Room'}</p>
						{#if currentUserAssignment.preferenceRank}
							<span class="preference-rank">
								{currentUserAssignment.preferenceRank === 1 ? '1st' :
								 currentUserAssignment.preferenceRank === 2 ? '2nd' : '3rd'} Choice
							</span>
						{/if}
					</div>
					{#if userAssignedRoom}
						<div class="room-details">
							<span class="occupancy">
								{userAssignedRoom.currentOccupancy}/{userAssignedRoom.capacity} participants
							</span>
							{#if userAssignedRoom.location}
								<span class="location">📍 {userAssignedRoom.location}</span>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Room Grid -->
		<div class="rooms-grid">
			{#each discussionGroups.rooms as room (room.id)}
				<RoomCard
					{room}
					topic={topics.find(t => t.id === room.topicId)}
					participantCount={getParticipantCount(room.id)}
					assignments={discussionGroups.assignments.filter(a => a.roomId === room.id)}
					{isOrganizer}
					{currentUser}
					on:assignUser={(e) => handleManualAssign(e.detail.userId, room.id, room.topicId)}
					on:moveUser={(e) => handleMoveUser(e.detail.userId, e.detail.newRoomId, e.detail.newTopicId)}
				/>
			{/each}
		</div>
	{/if}
</div>

<!-- Create Rooms Modal -->
{#if showCreateRooms}
	<div class="modal-overlay" on:click={() => showCreateRooms = false}>
		<div class="modal" on:click|stopPropagation>
			<div class="modal-header">
				<h3>Create Discussion Rooms</h3>
				<button class="btn-close" on:click={() => showCreateRooms = false}>×</button>
			</div>
			<div class="modal-body">
				<div class="form-group">
					<label>Select Topics</label>
					<div class="topic-list">
						{#each topics as topic (topic.id)}
							<label class="topic-option">
								<input
									type="checkbox"
									value={topic.id}
									checked={selectedTopics.includes(topic.id)}
									on:change={() => toggleTopicSelection(topic.id)}
									disabled={getRoomForTopic(topic.id) !== undefined}
								>
								<span class="topic-title">{topic.title}</span>
								{#if getRoomForTopic(topic.id)}
									<span class="already-exists">Room exists</span>
								{/if}
							</label>
						{/each}
					</div>
				</div>
				<div class="form-group">
					<label for="capacity">Room Capacity</label>
					<input
						id="capacity"
						type="number"
						bind:value={roomCapacity}
						min="3"
						max="50"
						class="form-input"
					>
				</div>
			</div>
			<div class="modal-footer">
				<button class="btn btn-secondary" on:click={() => showCreateRooms = false}>
					Cancel
				</button>
				<button
					class="btn btn-primary"
					on:click={handleCreateRooms}
					disabled={selectedTopics.length === 0 || discussionGroups.loading}
				>
					Create Rooms ({selectedTopics.length})
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Assignment Preview Modal -->
{#if showAssignmentPreview}
	<AssignmentPreview
		{eventId}
		{topics}
		rooms={discussionGroups.rooms}
		assignments={discussionGroups.assignments}
		{assignmentSettings}
		on:close={() => showAssignmentPreview = false}
		on:generate={handleGenerateAssignments}
		on:settingsChange={(e) => assignmentSettings = e.detail}
	/>
{/if}

<style>
	.discussion-group-manager {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.header h2 {
		margin: 0;
		color: #1f2937;
	}

	.organizer-controls {
		display: flex;
		gap: 0.75rem;
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

	.btn-link {
		background: none;
		border: none;
		color: #3b82f6;
		text-decoration: underline;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.5rem;
		color: #dc2626;
		margin-bottom: 1rem;
	}

	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 2rem;
		color: #6b7280;
	}

	.spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: #6b7280;
	}

	.empty-state h3 {
		margin: 1rem 0 0.5rem;
		color: #374151;
	}

	.user-assignment {
		margin-bottom: 2rem;
	}

	.user-assignment h3 {
		margin: 0 0 1rem;
		color: #1f2937;
	}

	.assignment-card {
		background: #f3f4f6;
		border: 2px solid #3b82f6;
		border-radius: 0.5rem;
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.assignment-info h4 {
		margin: 0 0 0.25rem;
		color: #1f2937;
	}

	.assignment-info p {
		margin: 0;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.preference-rank {
		background-color: #3b82f6;
		color: white;
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.room-details {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.occupancy {
		font-weight: 500;
	}

	.rooms-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

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

	.modal {
		background: white;
		border-radius: 0.5rem;
		max-width: 500px;
		width: 90vw;
		max-height: 80vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h3 {
		margin: 0;
		color: #1f2937;
	}

	.btn-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #6b7280;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
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
		padding: 1rem 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #374151;
	}

	.form-input {
		width: 100%;
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

	.topic-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 200px;
		overflow-y: auto;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		padding: 0.5rem;
	}

	.topic-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem;
		cursor: pointer;
	}

	.topic-option:hover {
		background-color: #f9fafb;
	}

	.topic-title {
		flex: 1;
		font-size: 0.875rem;
	}

	.already-exists {
		font-size: 0.75rem;
		color: #6b7280;
		font-style: italic;
	}

	@media (max-width: 768px) {
		.header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.organizer-controls {
			justify-content: center;
		}

		.assignment-card {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.room-details {
			align-items: flex-start;
		}

		.rooms-grid {
			grid-template-columns: 1fr;
		}
	}
</style>