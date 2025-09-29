<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { DiscussionRoom, Topic, User, RoomAssignment } from '../../types/entities';
	import { DiscussionRoomStatus } from '../../types/enums';
	import { Users, MapPin, Settings, AlertCircle, CheckCircle } from 'lucide-svelte';

	const dispatch = createEventDispatcher();

	export let room: DiscussionRoom;
	export let topic: Topic | undefined;
	export let participantCount: number;
	export let assignments: RoomAssignment[] = [];
	export let isOrganizer: boolean = false;
	export let currentUser: User;

	$: utilizationRate = room.capacity > 0 ? (participantCount / room.capacity) * 100 : 0;
	$: isUserAssigned = assignments.some(a => a.userId === currentUser.id);
	$: roomStatusClass = {
		[DiscussionRoomStatus.ACTIVE]: 'active',
		[DiscussionRoomStatus.FULL]: 'full',
		[DiscussionRoomStatus.PAUSED]: 'paused',
		[DiscussionRoomStatus.COMPLETED]: 'completed',
		[DiscussionRoomStatus.DRAFT]: 'draft',
		[DiscussionRoomStatus.ARCHIVED]: 'archived'
	}[room.status];

	function handleJoinRoom() {
		if (!isUserAssigned && room.currentOccupancy < room.capacity) {
			dispatch('assignUser', { userId: currentUser.id });
		}
	}

	function getPreferenceRankColor(rank: number | undefined) {
		if (!rank) return '';
		switch (rank) {
			case 1: return 'first-choice';
			case 2: return 'second-choice';
			case 3: return 'third-choice';
			default: return '';
		}
	}

	function getPreferenceLabel(rank: number | undefined) {
		if (!rank) return '';
		switch (rank) {
			case 1: return '1st Choice';
			case 2: return '2nd Choice';
			case 3: return '3rd Choice';
			default: return '';
		}
	}
</script>

<div class="room-card {roomStatusClass}" class:user-assigned={isUserAssigned}>
	<div class="room-header">
		<div class="room-title">
			<h3>{room.name}</h3>
			{#if room.status === DiscussionRoomStatus.FULL}
				<span class="status-badge full">Full</span>
			{:else if room.status === DiscussionRoomStatus.PAUSED}
				<span class="status-badge paused">Paused</span>
			{:else if room.status === DiscussionRoomStatus.COMPLETED}
				<span class="status-badge completed">Completed</span>
			{/if}
		</div>

		{#if topic}
			<div class="topic-info">
				<h4>{topic.title}</h4>
				{#if topic.description}
					<p class="topic-description">{topic.description}</p>
				{/if}
			</div>
		{/if}
	</div>

	<div class="room-details">
		<div class="capacity-info">
			<Users size={16} />
			<span class="capacity-text">
				{participantCount}/{room.capacity} participants
			</span>
			<div class="capacity-bar">
				<div
					class="capacity-fill"
					style="width: {Math.min(utilizationRate, 100)}%"
					class:over-capacity={utilizationRate > 100}
				></div>
			</div>
		</div>

		{#if room.location}
			<div class="location-info">
				<MapPin size={16} />
				<span>{room.location}</span>
			</div>
		{/if}

		{#if room.amenities && room.amenities.length > 0}
			<div class="amenities">
				<strong>Amenities:</strong>
				<span>{room.amenities.join(', ')}</span>
			</div>
		{/if}

		{#if room.facilitator}
			<div class="facilitator-info">
				<strong>Facilitator:</strong>
				<span>{room.facilitator}</span>
			</div>
		{/if}
	</div>

	{#if assignments.length > 0}
		<div class="participants-section">
			<h5>Participants ({assignments.length})</h5>
			<div class="participants-list">
				{#each assignments.slice(0, 5) as assignment}
					<div class="participant">
						<span class="participant-name">
							{assignment.userId}
							{#if assignment.userId === currentUser.id}
								<span class="you-indicator">(You)</span>
							{/if}
						</span>
						{#if assignment.preferenceRank}
							<span class="preference-rank {getPreferenceRankColor(assignment.preferenceRank)}">
								{getPreferenceLabel(assignment.preferenceRank)}
							</span>
						{/if}
					</div>
				{/each}
				{#if assignments.length > 5}
					<div class="more-participants">
						+{assignments.length - 5} more
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<div class="room-actions">
		{#if isUserAssigned}
			<div class="assigned-indicator">
				<CheckCircle size={16} />
				You're assigned to this room
			</div>
		{:else if room.status === DiscussionRoomStatus.ACTIVE}
			{#if room.currentOccupancy < room.capacity}
				<button
					class="btn btn-primary"
					on:click={handleJoinRoom}
				>
					Join Room
				</button>
			{:else}
				<button class="btn btn-secondary" disabled>
					<AlertCircle size={16} />
					Room Full
				</button>
			{/if}
		{:else}
			<button class="btn btn-secondary" disabled>
				Room {room.status}
			</button>
		{/if}

		{#if isOrganizer}
			<button class="btn btn-outline organizer-settings">
				<Settings size={16} />
				Manage
			</button>
		{/if}
	</div>
</div>

<style>
	.room-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		transition: all 0.2s;
	}

	.room-card:hover {
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.room-card.user-assigned {
		border-color: #3b82f6;
		background: #f8fafc;
	}

	.room-card.full {
		border-color: #ef4444;
	}

	.room-card.paused {
		opacity: 0.7;
		border-color: #f59e0b;
	}

	.room-card.completed {
		opacity: 0.8;
		border-color: #10b981;
	}

	.room-header {
		margin-bottom: 1rem;
	}

	.room-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.room-title h3 {
		margin: 0;
		color: #1f2937;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.status-badge {
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
	}

	.status-badge.full {
		background-color: #fef2f2;
		color: #dc2626;
	}

	.status-badge.paused {
		background-color: #fffbeb;
		color: #d97706;
	}

	.status-badge.completed {
		background-color: #f0fdf4;
		color: #16a34a;
	}

	.topic-info h4 {
		margin: 0 0 0.25rem;
		color: #374151;
		font-size: 1rem;
		font-weight: 500;
	}

	.topic-description {
		margin: 0;
		color: #6b7280;
		font-size: 0.875rem;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.room-details {
		margin-bottom: 1rem;
	}

	.capacity-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.capacity-text {
		font-weight: 500;
	}

	.capacity-bar {
		flex: 1;
		height: 4px;
		background-color: #e5e7eb;
		border-radius: 2px;
		overflow: hidden;
		margin-left: 0.5rem;
	}

	.capacity-fill {
		height: 100%;
		background-color: #10b981;
		transition: width 0.3s ease;
	}

	.capacity-fill.over-capacity {
		background-color: #ef4444;
	}

	.location-info,
	.amenities,
	.facilitator-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.participants-section {
		margin-bottom: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
	}

	.participants-section h5 {
		margin: 0 0 0.75rem;
		color: #374151;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.participants-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.participant {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25rem 0;
		font-size: 0.875rem;
	}

	.participant-name {
		color: #374151;
	}

	.you-indicator {
		color: #3b82f6;
		font-weight: 500;
	}

	.preference-rank {
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.preference-rank.first-choice {
		background-color: #dcfce7;
		color: #166534;
	}

	.preference-rank.second-choice {
		background-color: #fef3c7;
		color: #92400e;
	}

	.preference-rank.third-choice {
		background-color: #fde68a;
		color: #a16207;
	}

	.more-participants {
		color: #6b7280;
		font-size: 0.75rem;
		font-style: italic;
	}

	.room-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.assigned-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #16a34a;
		font-size: 0.875rem;
		font-weight: 500;
		flex: 1;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
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
		border-color: #9ca3af;
	}

	.organizer-settings {
		margin-left: auto;
	}

	@media (max-width: 768px) {
		.room-card {
			padding: 1rem;
		}

		.room-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.organizer-settings {
			margin-left: 0;
		}

		.capacity-info {
			flex-wrap: wrap;
		}

		.capacity-bar {
			margin-left: 0;
			margin-top: 0.25rem;
			width: 100%;
		}
	}
</style>