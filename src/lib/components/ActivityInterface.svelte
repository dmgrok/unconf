<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { ActivityType } from '../../types/enums';
	import type { Event, User, Topic } from '../../types/entities';
	import VotingInterface from './VotingInterface.svelte';
	import GameInterface from './GameInterface.svelte';
	import DiscussionInterface from './DiscussionInterface.svelte';
	import TeamAssignmentInterface from './TeamAssignmentInterface.svelte';
	import { AlertCircle } from 'lucide-svelte';

	interface ActivityInterfaceProps {
		event: Event;
		currentUser: User;
		topics?: Topic[];
		activityType?: ActivityType;
		class?: string;
	}

	let {
		event,
		currentUser,
		topics = [],
		activityType = $bindable(),
		class: className = ''
	}: ActivityInterfaceProps = $props();

	const dispatch = createEventDispatcher<{
		activityChange: { type: ActivityType };
		stateUpdate: { data: unknown };
	}>();

	// Use event's current activity if not explicitly set
	$: currentActivity = activityType || event.currentActivity;

	function handleActivityChange(type: ActivityType) {
		dispatch('activityChange', { type });
	}

	function handleStateUpdate(data: unknown) {
		dispatch('stateUpdate', { data });
	}
</script>

<div class="activity-interface {className}">
	{#if !currentActivity}
		<div class="no-activity">
			<AlertCircle size={48} />
			<h3>No Active Activity</h3>
			<p>The organizer hasn't started an activity yet. Please wait...</p>
		</div>
	{:else if currentActivity === ActivityType.VOTING}
		<VotingInterface
			{event}
			{currentUser}
			{topics}
			on:votecast={handleStateUpdate}
			on:voteremoved={handleStateUpdate}
		/>
	{:else if currentActivity === ActivityType.GROUP_INTELLIGENCE}
		<GameInterface
			{event}
			{currentUser}
			on:gamestart={handleStateUpdate}
			on:gamemove={handleStateUpdate}
			on:gameend={handleStateUpdate}
		/>
	{:else if currentActivity === ActivityType.DISCUSSION_GROUPS}
		<DiscussionInterface
			{event}
			{currentUser}
			{topics}
			on:roomjoin={handleStateUpdate}
			on:roomleave={handleStateUpdate}
		/>
	{:else if currentActivity === ActivityType.TEAM_DISTRIBUTION}
		<TeamAssignmentInterface
			{event}
			{currentUser}
			{topics}
			on:assignmentupdate={handleStateUpdate}
		/>
	{:else}
		<div class="unknown-activity">
			<AlertCircle size={48} />
			<h3>Unknown Activity Type</h3>
			<p>This activity type is not supported yet.</p>
		</div>
	{/if}
</div>

<style>
	.activity-interface {
		width: 100%;
		min-height: 400px;
	}

	.no-activity,
	.unknown-activity {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: #6b7280;
		min-height: 400px;
	}

	.no-activity h3,
	.unknown-activity h3 {
		margin: 1rem 0 0.5rem;
		color: #374151;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.no-activity p,
	.unknown-activity p {
		margin: 0;
		color: #6b7280;
		font-size: 0.875rem;
		max-width: 400px;
	}
</style>
