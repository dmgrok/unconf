<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Event, User, Topic, DiscussionRoom, RoomAssignment } from '../../types/entities';
	import { DiscussionRoomStatus } from '../../types/enums';
	import RoomCard from './RoomCard.svelte';
	import Card from './ui/Card.svelte';
	import Button from './ui/Button.svelte';
	import { MessageSquare, Users, MapPin, Clock, Info } from 'lucide-svelte';

	interface DiscussionInterfaceProps {
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
	}: DiscussionInterfaceProps = $props();

	const dispatch = createEventDispatcher<{
		roomjoin: { roomId: string; userId: string };
		roomleave: { roomId: string; userId: string };
		preferencesave: { preferences: string[] };
	}>();

	let rooms = $state<DiscussionRoom[]>([]);
	let userAssignment = $state<RoomAssignment | null>(null);
	let userPreferences = $state<string[]>([]);
	let isLoading = $state(false);
	let showPreferences = $state(false);

	$: assignedRoom = userAssignment
		? rooms.find(r => r.id === userAssignment.roomId)
		: null;

	$: availableRooms = rooms.filter(r =>
		r.status === DiscussionRoomStatus.ACTIVE &&
		r.currentOccupancy < r.capacity
	);

	onMount(() => {
		loadRooms();
		loadUserAssignment();
	});

	async function loadRooms() {
		isLoading = true;
		try {
			const response = await fetch(`/api/rooms?eventId=${event.id}`);
			const result = await response.json();

			if (result.success && result.data) {
				rooms = result.data;
			}
		} catch (error) {
			console.error('Failed to load rooms:', error);
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

	async function handleJoinRoom(roomId: string) {
		try {
			const room = rooms.find(r => r.id === roomId);
			if (!room) return;

			const response = await fetch('/api/assignments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					eventId: event.id,
					userId: currentUser.id,
					roomId,
					topicId: room.topicId
				})
			});

			const result = await response.json();
			if (result.success) {
				dispatch('roomjoin', { roomId, userId: currentUser.id });
				await loadUserAssignment();
				await loadRooms();
			}
		} catch (error) {
			console.error('Failed to join room:', error);
		}
	}

	async function handleLeaveRoom() {
		if (!userAssignment) return;

		try {
			const response = await fetch('/api/assignments', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					assignmentId: userAssignment.id
				})
			});

			const result = await response.json();
			if (result.success) {
				dispatch('roomleave', {
					roomId: userAssignment.roomId,
					userId: currentUser.id
				});
				userAssignment = null;
				await loadRooms();
			}
		} catch (error) {
			console.error('Failed to leave room:', error);
		}
	}

	async function handleSavePreferences() {
		try {
			const response = await fetch('/api/preferences', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					eventId: event.id,
					userId: currentUser.id,
					preferences: userPreferences
				})
			});

			const result = await response.json();
			if (result.success) {
				dispatch('preferencesave', { preferences: userPreferences });
				showPreferences = false;
			}
		} catch (error) {
			console.error('Failed to save preferences:', error);
		}
	}

	function togglePreference(topicId: string) {
		if (userPreferences.includes(topicId)) {
			userPreferences = userPreferences.filter(id => id !== topicId);
		} else if (userPreferences.length < 3) {
			userPreferences = [...userPreferences, topicId];
		}
	}

	function getTopicTitle(topicId: string): string {
		return topics.find(t => t.id === topicId)?.title || 'Unknown Topic';
	}

	function getRoomTopic(room: DiscussionRoom): Topic | undefined {
		return topics.find(t => t.id === room.topicId);
	}
</script>

<div class="discussion-interface {className}">
	<div class="discussion-header">
		<Card variant="outlined" padding="md">
			{#snippet header()}
				<div class="header-content">
					<MessageSquare size={24} />
					<div>
						<h2>Discussion Groups</h2>
						<p class="header-description">
							Join a discussion room to collaborate on your favorite topics
						</p>
					</div>
				</div>
			{/snippet}

			<div class="discussion-stats">
				<div class="stat">
					<Users size={20} />
					<span>{rooms.length} rooms available</span>
				</div>
				<div class="stat">
					<MessageSquare size={20} />
					<span>
						{rooms.reduce((sum, r) => sum + r.currentOccupancy, 0)} participants in discussions
					</span>
				</div>
			</div>
		</Card>
	</div>

	<div class="discussion-content">
		{#if assignedRoom && userAssignment}
			<!-- User's current assignment -->
			<Card variant="elevated" padding="lg" class="current-assignment">
				{#snippet header()}
					<div class="assignment-header">
						<h3>Your Current Assignment</h3>
						<Button
							variant="outline"
							size="sm"
							onclick={handleLeaveRoom}
						>
							Leave Room
						</Button>
					</div>
				{/snippet}

				<div class="assignment-details">
					<div class="assignment-info">
						<h4>{getTopicTitle(assignedRoom.topicId)}</h4>
						<p class="room-name">{assignedRoom.name}</p>

						<div class="assignment-meta">
							{#if assignedRoom.location}
								<div class="meta-item">
									<MapPin size={16} />
									<span>{assignedRoom.location}</span>
								</div>
							{/if}

							<div class="meta-item">
								<Users size={16} />
								<span>{assignedRoom.currentOccupancy}/{assignedRoom.capacity} participants</span>
							</div>

							{#if userAssignment.preferenceRank}
								<div class="preference-badge rank-{userAssignment.preferenceRank}">
									{userAssignment.preferenceRank === 1 ? '1st' :
									 userAssignment.preferenceRank === 2 ? '2nd' : '3rd'} Choice ⭐
								</div>
							{/if}
						</div>
					</div>

					{#if assignedRoom.description}
						<p class="room-description">{assignedRoom.description}</p>
					{/if}

					{#if assignedRoom.amenities && assignedRoom.amenities.length > 0}
						<div class="amenities">
							<span class="amenities-label">Available:</span>
							{#each assignedRoom.amenities as amenity}
								<span class="amenity-tag">{amenity}</span>
							{/each}
						</div>
					{/if}
				</div>
			</Card>
		{:else if !showPreferences}
			<!-- Preference selection prompt -->
			<Card variant="outlined" padding="lg" class="preferences-prompt">
				<div class="prompt-content">
					<Info size={48} />
					<h3>Set Your Preferences</h3>
					<p>
						Select your top 3 discussion topics in order of preference.
						This helps us assign you to a room you'll enjoy!
					</p>
					<Button
						variant="primary"
						size="lg"
						onclick={() => showPreferences = true}
					>
						Set Preferences
					</Button>
				</div>
			</Card>
		{/if}

		{#if showPreferences}
			<!-- Preference selection interface -->
			<Card variant="outlined" padding="lg" class="preferences-card">
				{#snippet header()}
					<div class="preferences-header">
						<h3>Select Your Top 3 Preferences</h3>
						<span class="preference-count">{userPreferences.length}/3</span>
					</div>
				{/snippet}

				<div class="preferences-list">
					{#each topics as topic (topic.id)}
						{@const room = rooms.find(r => r.topicId === topic.id)}
						{@const preferenceIndex = userPreferences.indexOf(topic.id)}
						{@const isSelected = preferenceIndex >= 0}

						{#if room}
							<button
								class="preference-option"
								class:selected={isSelected}
								class:disabled={!isSelected && userPreferences.length >= 3}
								onclick={() => togglePreference(topic.id)}
							>
								<div class="option-content">
									<div class="option-header">
										<h4>{topic.title}</h4>
										{#if isSelected}
											<span class="preference-rank">
												{preferenceIndex + 1}
											</span>
										{/if}
									</div>

									{#if topic.description}
										<p class="option-description">{topic.description}</p>
									{/if}

									<div class="option-meta">
										<span>{room.currentOccupancy}/{room.capacity} participants</span>
										{#if room.location}
											<span>📍 {room.location}</span>
										{/if}
									</div>
								</div>
							</button>
						{/if}
					{/each}
				</div>

				{#snippet footer()}
					<div class="preferences-actions">
						<Button
							variant="outline"
							onclick={() => {
								showPreferences = false;
								userPreferences = [];
							}}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							onclick={handleSavePreferences}
							disabled={userPreferences.length === 0}
						>
							Save Preferences ({userPreferences.length})
						</Button>
					</div>
				{/snippet}
			</Card>
		{/if}

		{#if !assignedRoom && !showPreferences}
			<!-- Available rooms grid -->
			<div class="rooms-section">
				<h3 class="section-title">Available Rooms</h3>

				{#if isLoading}
					<div class="loading">
						<div class="spinner"></div>
						<p>Loading rooms...</p>
					</div>
				{:else if availableRooms.length === 0}
					<div class="empty-state">
						<MessageSquare size={48} />
						<h4>No Available Rooms</h4>
						<p>All rooms are currently full or unavailable.</p>
					</div>
				{:else}
					<div class="rooms-grid">
						{#each availableRooms as room (room.id)}
							<RoomCard
								{room}
								topic={getRoomTopic(room)}
								participantCount={room.currentOccupancy}
								isOrganizer={false}
								{currentUser}
								on:join={() => handleJoinRoom(room.id)}
							/>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.discussion-interface {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
	}

	.discussion-header {
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

	.discussion-stats {
		display: flex;
		gap: 2rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
		flex-wrap: wrap;
	}

	.stat {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #6b7280;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.discussion-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.current-assignment {
		border-left: 4px solid #10b981;
	}

	.assignment-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.assignment-header h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
	}

	.assignment-details {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.assignment-info h4 {
		margin: 0 0 0.25rem;
		font-size: 1.25rem;
		font-weight: 700;
		color: #1f2937;
	}

	.room-name {
		margin: 0 0 0.75rem;
		color: #6b7280;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.assignment-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.preference-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
	}

	.preference-badge.rank-1 {
		background-color: #f59e0b;
	}

	.preference-badge.rank-2 {
		background-color: #10b981;
	}

	.preference-badge.rank-3 {
		background-color: #3b82f6;
	}

	.room-description {
		margin: 0;
		color: #4b5563;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.amenities {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.amenities-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
	}

	.amenity-tag {
		padding: 0.25rem 0.5rem;
		background-color: #f3f4f6;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		color: #4b5563;
	}

	.preferences-prompt {
		text-align: center;
		padding: 3rem 1rem;
	}

	.prompt-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		color: #6b7280;
	}

	.prompt-content h3 {
		margin: 0;
		color: #374151;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.prompt-content p {
		margin: 0;
		max-width: 500px;
		font-size: 0.875rem;
	}

	.preferences-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.preferences-header h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
	}

	.preference-count {
		font-size: 0.875rem;
		font-weight: 600;
		color: #3b82f6;
		padding: 0.25rem 0.75rem;
		background-color: #eff6ff;
		border-radius: 0.375rem;
	}

	.preferences-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.preference-option {
		width: 100%;
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
	}

	.preference-option:hover:not(.disabled) {
		border-color: #d1d5db;
		background-color: #f9fafb;
	}

	.preference-option.selected {
		border-color: #3b82f6;
		background-color: #eff6ff;
	}

	.preference-option.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.option-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.option-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.option-header h4 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
	}

	.preference-rank {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #3b82f6;
		color: white;
		border-radius: 50%;
		font-weight: 700;
		font-size: 0.875rem;
	}

	.option-description {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.option-meta {
		display: flex;
		gap: 1rem;
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.preferences-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.section-title {
		margin: 0 0 1rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
	}

	.rooms-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.loading,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: #6b7280;
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

	.empty-state h4 {
		margin: 1rem 0 0.5rem;
		color: #374151;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.empty-state p {
		margin: 0;
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.discussion-interface {
			padding: 0.75rem;
		}

		.assignment-header {
			flex-direction: column;
			gap: 0.75rem;
			align-items: stretch;
		}

		.assignment-meta {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.rooms-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
