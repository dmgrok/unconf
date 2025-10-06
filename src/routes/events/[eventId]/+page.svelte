<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import {
		CalendarDays,
		Users,
		Sparkles,
		BarChart3,
		Compass,
		AlertCircle,
		TrendingUp
	} from 'lucide-svelte';

	type GuestSession = {
		id: string;
		name: string;
		eventId: string;
		role?: string;
	};

	type Section = 'overview' | 'topics' | 'insights' | 'resources';

	let { data }: { data: PageData } = $props();

	const event = data.event;
	const topicStats = data.topicStats;
	const featuredTopics = data.featuredTopics;

	let guestSession = $state<GuestSession | null>(null);
	let resolvedGuest = $derived(guestSession);
	let sessionMismatch = $state(false);
	let activeSection = $state<Section>('overview');

	let TopicSubmissionForm = $state<any>(null);
	let TopicListWithVoting = $state<any>(null);
	let loadingInteractive = $state(false);
	let interactiveError = $state<string | null>(null);

	const participantEstimate = (event.metadata?.participantCount as number | undefined) ?? 0;

	const enableVoting = event.settings?.enableVoting ?? true;
	const maxVotesPerTopic = event.settings?.maxVotesPerTopic ?? 3;

	function formatDateRange(start?: Date | string, end?: Date | string) {
		if (!start && !end) {
			return 'Schedule to be announced';
		}

		const startDate = start ? new Date(start) : null;
		const endDate = end ? new Date(end) : null;

		if (startDate && endDate) {
			const sameDay = startDate.toDateString() === endDate.toDateString();
			return sameDay
				? `${startDate.toLocaleDateString()} · ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
				: `${startDate.toLocaleString()} → ${endDate.toLocaleString()}`;
		}

		if (startDate) {
			return startDate.toLocaleString();
		}

		return endDate ? endDate.toLocaleString() : 'Schedule to be announced';
	}

	async function loadInteractiveComponents() {
		if (TopicSubmissionForm && TopicListWithVoting) {
			return;
		}

		loadingInteractive = true;

		try {
			const [submissionModule, listModule] = await Promise.all([
				import('$lib/components/TopicSubmissionForm.svelte'),
				import('$lib/components/TopicListWithVoting.svelte')
			]);

			TopicSubmissionForm = submissionModule.default;
			TopicListWithVoting = listModule.default;
			interactiveError = null;
		} catch (error) {
			console.error('Failed to load interactive topic components', error);
			interactiveError = 'We could not load the interactive demo right now. Please reload the page to try again.';
		} finally {
			loadingInteractive = false;
		}
	}

	$effect(() => {
		if (activeSection === 'topics') {
			loadInteractiveComponents();
		}
	});

	onMount(() => {
		if (!browser) return;

		const stored = sessionStorage.getItem('guestUser');

		if (stored) {
			try {
				const parsed = JSON.parse(stored) as GuestSession;
				guestSession = parsed;
				sessionMismatch = parsed.eventId !== event.id;
			} catch (error) {
				console.warn('Failed to parse stored guest session', error);
			}
		}

		if (!guestSession) {
			const generated: GuestSession = {
				id: `guest-${Date.now().toString(36)}`,
				name: 'Guest Explorer',
				eventId: event.id,
				role: 'guest'
			};

			guestSession = generated;
			sessionStorage.setItem('guestUser', JSON.stringify(generated));
		}
	});

	function handleJoinRedirect() {
		goto(`/events/${event.id}/join`);
	}

	function isSectionActive(section: Section) {
		return activeSection === section;
	}
</script>

<svelte:head>
	<title>{event.title} | UnConf Demo</title>
	<meta name="description" content={`Explore the ${event.title} demo event`} />
</svelte:head>

<div class="event-page">
	<section class="event-hero">
		<div class="hero-content">
			<h1>{event.title}</h1>
			<p>{event.description ?? 'Experience the full participant journey of our guided unconference platform.'}</p>

			<div class="hero-stats">
				<div class="stat">
					<CalendarDays size={20} />
					<div>
						<span class="label">Schedule</span>
						<strong>{formatDateRange(event.startTime, event.endTime)}</strong>
					</div>
				</div>
				<div class="stat">
					<Users size={20} />
					<div>
						<span class="label">Participants</span>
						<strong>{participantEstimate > 0 ? `${participantEstimate}+ confirmed` : 'Open enrollment'}</strong>
					</div>
				</div>
				<div class="stat">
					<Sparkles size={20} />
					<div>
						<span class="label">Current Activity</span>
						<strong>{event.currentActivity ?? 'Voting & Collaboration'}</strong>
					</div>
				</div>
				<div class="stat">
					<BarChart3 size={20} />
					<div>
						<span class="label">Topics</span>
						<strong>{topicStats.total} submitted</strong>
					</div>
				</div>
			</div>

			<div class="hero-actions">
				<Button variant="primary" size="lg" onclick={handleJoinRedirect}>
					Join This Event
				</Button>
				<Button variant="outline" size="lg" onclick={() => (activeSection = 'topics')}>
					Preview Voting Experience
				</Button>
			</div>

			{#if sessionMismatch}
				<div class="session-warning">
					<AlertCircle size={18} />
					<span>
						You're currently joined to a different event. Joining here will refresh your guest session.
					</span>
				</div>
			{/if}
		</div>
	</section>

	<nav class="event-nav">
		<button
			type="button"
			class:active={isSectionActive('overview')}
			onclick={() => (activeSection = 'overview')}
		>
			Overview
		</button>
		<button
			type="button"
			class:active={isSectionActive('topics')}
			onclick={() => (activeSection = 'topics')}
		>
			Topics & Voting
		</button>
		<button
			type="button"
			class:active={isSectionActive('insights')}
			onclick={() => (activeSection = 'insights')}
		>
			Insights
		</button>
		<button
			type="button"
			class:active={isSectionActive('resources')}
			onclick={() => (activeSection = 'resources')}
		>
			Resources
		</button>
	</nav>

	<section class="event-section" aria-live="polite">
		{#if isSectionActive('overview')}
			<div class="section-grid">
				<Card variant="elevated" class="info-card">
					{#snippet children()}
						<h2>What to Expect</h2>
						<p>
							This unconference runs on collaborative energy. Submit topics, vote on what matters most,
								and break into dynamic discussion groups—all in real time.
						</p>

						<ul class="feature-list">
							<li>
								<Compass size={18} />
								<span>Guided flow through voting, collaboration, and wrap-up sessions.</span>
							</li>
							<li>
								<TrendingUp size={18} />
								<span>Realtime analytics to see momentum build as ideas gain traction.</span>
							</li>
							<li>
								<Sparkles size={18} />
								<span>Facilitator tools to keep the crowd energized and engaged.</span>
							</li>
						</ul>
				{/snippet}
				</Card>

				<Card variant="elevated" class="info-card">
					{#snippet children()}
						<h2>Featured Topics</h2>
						{#if featuredTopics.length === 0}
							<p>No topics yet—switch to the Topics tab to add the first one!</p>
						{:else}
							<ul class="topics-preview">
								{#each featuredTopics as topic}
									<li>
										<h3>{topic.title}</h3>
										{#if topic.description}
											<p>{topic.description}</p>
										{/if}
										<div class="meta">
											<span>{topic.voteCount} votes</span>
											<span>{topic.status}</span>
										</div>
									</li>
								{/each}
							</ul>
						{/if}
				{/snippet}
				</Card>
			</div>
		{:else if isSectionActive('topics')}
			<div class="interactive-area">
				{#if loadingInteractive}
					<p class="loading-state">Loading interactive demo…</p>
				{:else if interactiveError}
					<p class="error-state">{interactiveError}</p>
				{:else if TopicSubmissionForm && TopicListWithVoting && resolvedGuest}
					<div class="topics-layout">
						<Card variant="elevated" padding="lg">
							{#snippet children()}
								<h2>Suggest a Discussion Topic</h2>
								<p class="helper-text">
									Try submitting a topic as <strong>{resolvedGuest.name}</strong>—everything happens instantly.
								</p>
								<TopicSubmissionForm
									eventId={event.id}
									userId={resolvedGuest.id}
									userName={resolvedGuest.name}
									on:error={(evt: CustomEvent<{ message: string }>) => (interactiveError = evt.detail.message)}
								/>
							{/snippet}
						</Card>

						<Card variant="elevated" padding="lg">
							{#snippet children()}
								<h2>Vote on What Matters</h2>
								<TopicListWithVoting
									eventId={event.id}
									userId={resolvedGuest.id}
									userRole="guest"
									enableVoting={enableVoting}
									showActions={false}
									on:error={(evt: CustomEvent<{ message: string }>) => (interactiveError = evt.detail.message)}
								/>
							{/snippet}
						</Card>
					</div>
				{:else}
					<p class="error-state">We could not detect your guest session. Join the event again to continue.</p>
				{/if}
			</div>
		{:else if isSectionActive('insights')}
				<div class="insight-grid" data-testid="event-insights">
				<Card variant="elevated" class="info-card">
					{#snippet children()}
						<h2>Engagement Snapshot</h2>
						<ul class="metrics">
							<li>
								<strong>{topicStats.total}</strong>
								<span>Total topics submitted</span>
							</li>
							<li>
								<strong>{topicStats.active}</strong>
								<span>Currently active voting topics</span>
							</li>
							<li>
								<strong>{topicStats.totalVotes}</strong>
								<span>Weighted votes cast so far</span>
							</li>
							<li>
								<strong>{maxVotesPerTopic}</strong>
								<span>Votes each participant can allocate</span>
							</li>
						</ul>
					{/snippet}
					</Card>

					<Card variant="elevated" class="info-card">
						{#snippet children()}
							<h2>Flow Highlights</h2>
							<ol class="flow-list">
								<li><strong>1.</strong> Join as a guest—no sign-up required.</li>
								<li><strong>2.</strong> Submit ideas and vote in real time.</li>
								<li><strong>3.</strong> Form groups using built-in facilitators.</li>
								<li><strong>4.</strong> Track momentum with live analytics.</li>
							</ol>
					{/snippet}
					</Card>
				</div>
		{:else}
			<div class="resources">
				<h2>Run Your Own Unconference</h2>
				<p>
					Clone this demo in seconds, customize the agenda, and invite your team. Need a quick start?
					Use the organizer dashboard to duplicate the DEMO2024 configuration.
				</p>

				<ul class="resource-list">
					<li>
						<strong>Organizer Tips:</strong>
						Balance live sessions with async collaboration, and enable auto-advance when you want the platform to guide transitions.
					</li>
					<li>
						<strong>Privacy Controls:</strong>
						Toggle guest access, require registration, or keep your event invite-only with access codes.
					</li>
					<li>
						<strong>Need Analytics?</strong>
						Export participation metrics and topic outcomes to share with stakeholders after the session.
					</li>
				</ul>
			</div>
		{/if}
	</section>
</div>

<style>
	.event-page {
		min-height: 100vh;
		background: linear-gradient(180deg, var(--color-primary-50) 0%, var(--color-surface) 320px);
	}

	.event-hero {
		max-width: 1100px;
		margin: 0 auto;
		padding: var(--spacing-12) var(--spacing-6) var(--spacing-8);
	}

	.hero-content {
		background: white;
		border-radius: var(--radius-2xl);
		padding: var(--spacing-9);
		box-shadow: var(--shadow-xl);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-8);
	}

	.hero-content h1 {
		font-size: clamp(2.5rem, 6vw, 3.25rem);
		margin: 0;
	}

	.hero-content p {
		font-size: var(--font-size-lg);
		color: var(--color-text-secondary);
		margin: 0;
		line-height: var(--line-height-relaxed);
	}

	.hero-stats {
		display: grid;
		gap: var(--spacing-4);
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	}

	.stat {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
		padding: var(--spacing-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		background: var(--color-surface-100);
	}

	.stat .label {
		display: block;
		font-size: var(--font-size-sm);
		color: var(--color-text-tertiary);
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-4);
	}

	.session-warning {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		padding: var(--spacing-3);
		border-radius: var(--radius-lg);
		background: var(--color-warning-50);
		color: var(--color-warning-700);
		font-size: var(--font-size-sm);
	}

	.event-nav {
		max-width: 1100px;
		margin: 0 auto;
		display: flex;
		gap: var(--spacing-2);
		padding: 0 var(--spacing-6) var(--spacing-6);
	}

	.event-nav button {
		flex: 1;
		padding: var(--spacing-3) var(--spacing-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: white;
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: all var(--transition-base);
	}

	.event-nav button.active {
		background: var(--color-primary);
		color: white;
		border-color: transparent;
		box-shadow: var(--shadow-md);
	}

	.event-section {
		max-width: 1100px;
		margin: 0 auto var(--spacing-12);
		padding: 0 var(--spacing-6);
	}

	.section-grid {
		display: grid;
		gap: var(--spacing-6);
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
	}

	:global(.info-card h2) {
		margin-top: 0;
		margin-bottom: var(--spacing-3);
	}

	.feature-list {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.feature-list li {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
		color: var(--color-text-secondary);
	}

	.topics-preview {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-4);
	}

	.topics-preview h3 {
		margin: 0 0 var(--spacing-1) 0;
	}

	.topics-preview .meta {
		display: flex;
		gap: var(--spacing-3);
		font-size: var(--font-size-sm);
		color: var(--color-text-tertiary);
	}

	.interactive-area {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-6);
	}

	.loading-state,
	.error-state {
		padding: var(--spacing-6);
		border-radius: var(--radius-xl);
		background: white;
		border: 1px solid var(--color-border);
		text-align: center;
	}

	.topics-layout {
		display: grid;
		gap: var(--spacing-6);
		grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
	}

	.helper-text {
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-4);
	}

	.insight-grid {
		display: grid;
		gap: var(--spacing-6);
		grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
	}

	.metrics {
		list-style: none;
		padding: 0;
		display: grid;
		gap: var(--spacing-4);
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
	}

	.metrics li {
		padding: var(--spacing-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		background: var(--color-surface-100);
		text-align: center;
	}

	.metrics strong {
		display: block;
		font-size: var(--font-size-2xl);
	}

	.flow-list {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.resources {
		background: white;
		padding: var(--spacing-8);
		border-radius: var(--radius-2xl);
		box-shadow: var(--shadow-lg);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-4);
	}

	.resource-list {
		list-style: disc;
		padding-left: var(--spacing-6);
		color: var(--color-text-secondary);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	@media (max-width: 720px) {
		.hero-content {
			padding: var(--spacing-6);
		}

		.hero-stats {
			grid-template-columns: 1fr;
		}

		.hero-actions {
			flex-direction: column;
		}

		.event-nav {
			flex-direction: column;
		}

		.topics-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
