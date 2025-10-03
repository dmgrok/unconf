<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Event, User, Topic, Vote } from '../../types/entities';
	import { VoteWeight } from '../../types/enums';
	import TopicListWithVoting from './TopicListWithVoting.svelte';
	import TopicSubmissionForm from './TopicSubmissionForm.svelte';
	import Timer from './ui/Timer.svelte';
	import Card from './ui/Card.svelte';
	import Button from './ui/Button.svelte';
	import { Plus, Vote as VoteIcon, Info } from 'lucide-svelte';

	interface VotingInterfaceProps {
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
	}: VotingInterfaceProps = $props();

	const dispatch = createEventDispatcher<{
		votecast: { vote: Vote };
		voteremoved: { topicId: string; userId: string };
		topicsubmitted: { topic: Topic };
	}>();

	let showSubmitForm = $state(false);
	let userVotes = $state<Record<string, VoteWeight>>({});
	let votingTimeRemaining = $state<number | undefined>(undefined);

	$: canSubmitTopics = event.settings.maxTopicsPerUser === undefined ||
		topics.filter(t => t.submittedBy === currentUser.id).length < (event.settings.maxTopicsPerUser || 0);

	$: totalVotesCast = Object.keys(userVotes).length;
	$: maxVotes = event.settings.maxVotesPerTopic || 3;
	$: canVote = totalVotesCast < maxVotes;

	onMount(() => {
		// Load user's existing votes
		loadUserVotes();

		// Set up timer if voting has a time limit
		if (event.settings.votingTimeLimit) {
			votingTimeRemaining = event.settings.votingTimeLimit;
		}
	});

	async function loadUserVotes() {
		try {
			const response = await fetch(`/api/votes?eventId=${event.id}&userId=${currentUser.id}`);
			const result = await response.json();

			if (result.success && result.data) {
				userVotes = result.data.reduce((acc: Record<string, VoteWeight>, vote: Vote) => {
					acc[vote.topicId] = vote.weight;
					return acc;
				}, {});
			}
		} catch (error) {
			console.error('Failed to load user votes:', error);
		}
	}

	function handleVoteCast(event: CustomEvent<{ vote: Vote }>) {
		const { vote } = event.detail;
		userVotes[vote.topicId] = vote.weight;
		dispatch('votecast', { vote });
	}

	function handleVoteRemoved(event: CustomEvent<{ topicId: string; userId: string }>) {
		const { topicId, userId } = event.detail;
		delete userVotes[topicId];
		dispatch('voteremoved', { topicId, userId });
	}

	function handleTopicSubmitted(event: CustomEvent<{ topic: Topic }>) {
		showSubmitForm = false;
		dispatch('topicsubmitted', event.detail);
	}

	function handleTimerEnd() {
		// Optionally handle when voting time expires
		console.log('Voting time has ended');
	}
</script>

<div class="voting-interface {className}">
	<div class="voting-header">
		<Card variant="outlined" padding="md">
			{#snippet header()}
				<div class="header-content">
					<div class="header-info">
						<VoteIcon size={24} />
						<div>
							<h2>Vote for Topics</h2>
							<p class="header-description">
								Cast up to {maxVotes} weighted votes for your favorite topics
							</p>
						</div>
					</div>

					{#if votingTimeRemaining}
						<Timer
							duration={votingTimeRemaining}
							autoStart
							showProgress
							size="md"
							variant="primary"
							on:end={handleTimerEnd}
						/>
					{/if}
				</div>
			{/snippet}

			<div class="voting-stats">
				<div class="stat">
					<span class="stat-label">Your Votes</span>
					<span class="stat-value">{totalVotesCast}/{maxVotes}</span>
				</div>
				<div class="stat">
					<span class="stat-label">Total Topics</span>
					<span class="stat-value">{topics.length}</span>
				</div>
				{#if event.settings.maxTopicsPerUser}
					<div class="stat">
						<span class="stat-label">Your Topics</span>
						<span class="stat-value">
							{topics.filter(t => t.submittedBy === currentUser.id).length}/{event.settings.maxTopicsPerUser}
						</span>
					</div>
				{/if}
			</div>

			{#if !canVote}
				<div class="info-message">
					<Info size={16} />
					<span>You've used all your votes. Remove a vote to vote for another topic.</span>
				</div>
			{/if}
		</Card>
	</div>

	<div class="voting-content">
		{#if event.settings.maxTopicsPerUser && canSubmitTopics}
			<div class="submit-section">
				{#if showSubmitForm}
					<TopicSubmissionForm
						{event}
						{currentUser}
						on:submit={handleTopicSubmitted}
						on:cancel={() => showSubmitForm = false}
					/>
				{:else}
					<Button
						variant="outline"
						size="lg"
						onclick={() => showSubmitForm = true}
					>
						<Plus size={20} />
						Submit a Topic
					</Button>
				{/if}
			</div>
		{/if}

		<TopicListWithVoting
			{topics}
			{event}
			{currentUser}
			userVotes={userVotes}
			disabled={!canVote && totalVotesCast >= maxVotes}
			on:votecast={handleVoteCast}
			on:voteremoved={handleVoteRemoved}
		/>
	</div>
</div>

<style>
	.voting-interface {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
	}

	.voting-header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: white;
		padding-bottom: 1rem;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.header-info {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		flex: 1;
		min-width: 0;
	}

	.header-info h2 {
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

	.voting-stats {
		display: flex;
		gap: 2rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
		flex-wrap: wrap;
	}

	.stat {
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
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.info-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 0.5rem;
		color: #1e40af;
		font-size: 0.875rem;
		margin-top: 1rem;
	}

	.voting-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.submit-section {
		display: flex;
		justify-content: center;
		padding: 1rem;
		background-color: #f9fafb;
		border: 2px dashed #d1d5db;
		border-radius: 0.5rem;
	}

	@media (max-width: 768px) {
		.voting-interface {
			padding: 0.75rem;
		}

		.header-content {
			flex-direction: column;
		}

		.voting-stats {
			gap: 1rem;
		}

		.stat-value {
			font-size: 1.25rem;
		}
	}
</style>
