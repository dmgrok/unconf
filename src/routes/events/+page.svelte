<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { Event } from '../../types/entities';
	import { EventStatus } from '../../types/entities';
	import { BarChart3, Circle, FileText, CheckCircle, Search, AlertTriangle } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EventCard from '$lib/components/events/EventCard.svelte';
	import EmptyState from '$lib/components/events/EmptyState.svelte';

	let { data }: { data: PageData } = $props();

	let events = $state<Event[]>(data.events || []);
	let searchQuery = $state('');
	let filterStatus = $state<string>('all');
	let isLoading = $state(false);
	let error = $state<string | null>(data.error || null);

	// Computed filtered events
	const filteredEvents = $derived.by(() => {
		let filtered = events;

		// Filter by status
		if (filterStatus !== 'all') {
			filtered = filtered.filter((event) => event.status === filterStatus);
		}

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(event) =>
					event.title.toLowerCase().includes(query) ||
					event.description.toLowerCase().includes(query) ||
					event.accessCode.toLowerCase().includes(query)
			);
		}

		// Sort by creation date (newest first)
		return filtered.sort((a, b) => {
			const dateA = new Date(a.createdAt).getTime();
			const dateB = new Date(b.createdAt).getTime();
			return dateB - dateA;
		});
	});

	const eventStats = $derived({
		total: events.length,
		active: events.filter((e) => e.status === EventStatus.ACTIVE).length,
		draft: events.filter((e) => e.status === EventStatus.DRAFT).length,
		completed: events.filter((e) => e.status === EventStatus.COMPLETED).length
	});

	function handleCreateEvent() {
		goto('/events/create');
	}

	async function handleDeleteEvent(eventId: string) {
		try {
			isLoading = true;
			const response = await fetch(`/api/events/${eventId}`, {
				method: 'DELETE'
			});

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Failed to delete event');
			}

			// Remove from local state
			events = events.filter((e) => e.id !== eventId);
		} catch (err) {
			console.error('Failed to delete event:', err);
			error = err instanceof Error ? err.message : 'Failed to delete event';
		} finally {
			isLoading = false;
		}
	}

	function clearFilters() {
		searchQuery = '';
		filterStatus = 'all';
	}

	onMount(() => {
		// Refresh events data if needed
		if (data.events) {
			events = data.events;
		}
	});
</script>

<svelte:head>
	<title>My Events | UnConf</title>
	<meta name="description" content="Manage your unconference events" />
</svelte:head>

<div class="events-page">
	<!-- Hero Section -->
	<section class="page-hero">
		<div class="hero-content">
			<h1 class="page-title">
				My <span class="title-highlight">Events</span>
			</h1>
			<p class="page-description">
				Create and manage your unconference events. Track participation, monitor voting, and
				engage your community.
			</p>
			<Button variant="primary" size="lg" onclick={handleCreateEvent}>
				Create New Event
			</Button>
		</div>

		<!-- Stats Cards -->
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-icon">
					<BarChart3 size={24} />
				</div>
				<div class="stat-content">
					<div class="stat-value">{eventStats.total}</div>
					<div class="stat-label">Total Events</div>
				</div>
			</div>
			<div class="stat-card stat-active">
				<div class="stat-icon">
					<Circle size={24} fill="currentColor" />
				</div>
				<div class="stat-content">
					<div class="stat-value">{eventStats.active}</div>
					<div class="stat-label">Active</div>
				</div>
			</div>
			<div class="stat-card stat-draft">
				<div class="stat-icon">
					<FileText size={24} />
				</div>
				<div class="stat-content">
					<div class="stat-value">{eventStats.draft}</div>
					<div class="stat-label">Drafts</div>
				</div>
			</div>
			<div class="stat-card stat-completed">
				<div class="stat-icon">
					<CheckCircle size={24} />
				</div>
				<div class="stat-content">
					<div class="stat-value">{eventStats.completed}</div>
					<div class="stat-label">Completed</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Controls Section -->
	<section class="events-controls">
		<div class="controls-wrapper">
			<!-- Search Bar -->
			<div class="search-bar">
				<span class="search-icon">
					<Search size={20} />
				</span>
				<input
					type="text"
					placeholder="Search events by name, description, or code..."
					bind:value={searchQuery}
					class="search-input"
				/>
				{#if searchQuery}
					<button class="clear-search" onclick={() => (searchQuery = '')} aria-label="Clear search">
						×
					</button>
				{/if}
			</div>

			<!-- Filter Buttons -->
			<div class="filter-controls">
				<button
					class="filter-btn"
					class:active={filterStatus === 'all'}
					onclick={() => (filterStatus = 'all')}
				>
					All Events
				</button>
				<button
					class="filter-btn"
					class:active={filterStatus === EventStatus.ACTIVE}
					onclick={() => (filterStatus = EventStatus.ACTIVE)}
				>
					Active
				</button>
				<button
					class="filter-btn"
					class:active={filterStatus === EventStatus.DRAFT}
					onclick={() => (filterStatus = EventStatus.DRAFT)}
				>
					Drafts
				</button>
				<button
					class="filter-btn"
					class:active={filterStatus === EventStatus.COMPLETED}
					onclick={() => (filterStatus = EventStatus.COMPLETED)}
				>
					Completed
				</button>
			</div>

			{#if searchQuery || filterStatus !== 'all'}
				<button class="clear-filters" onclick={clearFilters}>Clear All Filters</button>
			{/if}
		</div>
	</section>

	<!-- Events Grid -->
	<section class="events-content">
		{#if error}
			<div class="error-message">
				<span class="error-icon">
					<AlertTriangle size={20} />
				</span>
				<p>{error}</p>
			</div>
		{:else if isLoading}
			<EmptyState variant="loading" />
		{:else if filteredEvents.length === 0}
			{#if events.length === 0}
				<EmptyState variant="first-time" />
			{:else}
				<EmptyState variant="no-results" filterText={searchQuery} />
			{/if}
		{:else}
			<div class="events-grid">
				{#each filteredEvents as event (event.id)}
					<EventCard {event} onDelete={handleDeleteEvent} />
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.events-page {
		min-height: 100vh;
		background: linear-gradient(
			180deg,
			var(--color-primary-50) 0%,
			var(--color-surface) 300px
		);
	}

	/* Hero Section */
	.page-hero {
		background: linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-secondary-50) 100%);
		padding: var(--spacing-12) var(--spacing-6);
		border-bottom: 1px solid var(--color-border);
	}

	.hero-content {
		max-width: 1280px;
		margin: 0 auto;
		text-align: center;
		margin-bottom: var(--spacing-8);
	}

	.page-title {
		font-size: clamp(2.5rem, 5vw, 3.5rem);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		margin: 0 0 var(--spacing-4) 0;
		line-height: 1.1;
	}

	.title-highlight {
		background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-600) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.page-description {
		font-size: var(--font-size-xl);
		color: var(--color-text-secondary);
		max-width: 700px;
		margin: 0 auto var(--spacing-6) auto;
		line-height: var(--line-height-relaxed);
	}

	/* Stats Grid */
	.stats-grid {
		max-width: 1280px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--spacing-4);
	}

	.stat-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: var(--spacing-5);
		display: flex;
		align-items: center;
		gap: var(--spacing-4);
		box-shadow: var(--shadow-base);
		transition: transform var(--transition-base);
	}

	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.stat-card.stat-active {
		border-color: var(--color-success-300);
	}

	.stat-card.stat-draft {
		border-color: var(--color-warning-300);
	}

	.stat-card.stat-completed {
		border-color: var(--color-secondary-300);
	}

	.stat-icon {
		font-size: 2rem;
		line-height: 1;
	}

	.stat-content {
		flex: 1;
	}

	.stat-value {
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		line-height: 1;
	}

	.stat-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-tertiary);
		margin-top: var(--spacing-1);
	}

	/* Controls Section */
	.events-controls {
		max-width: 1280px;
		margin: 0 auto;
		padding: var(--spacing-8) var(--spacing-6);
	}

	.controls-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-4);
	}

	/* Search Bar */
	.search-bar {
		position: relative;
		display: flex;
		align-items: center;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-3) var(--spacing-4);
		box-shadow: var(--shadow-sm);
		transition: all var(--transition-base);
	}

	.search-bar:focus-within {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px var(--color-primary-light);
	}

	.search-icon {
		font-size: 1.25rem;
		margin-right: var(--spacing-2);
		opacity: 0.5;
	}

	.search-input {
		flex: 1;
		border: none;
		background: transparent;
		font-size: var(--font-size-base);
		color: var(--color-text-primary);
		outline: none;
		font-family: inherit;
	}

	.search-input::placeholder {
		color: var(--color-text-tertiary);
	}

	.clear-search {
		background: transparent;
		border: none;
		font-size: 1.5rem;
		color: var(--color-text-tertiary);
		cursor: pointer;
		padding: 0 var(--spacing-2);
		line-height: 1;
		transition: color var(--transition-fast);
	}

	.clear-search:hover {
		color: var(--color-text-primary);
	}

	/* Filter Controls */
	.filter-controls {
		display: flex;
		gap: var(--spacing-2);
		flex-wrap: wrap;
	}

	.filter-btn {
		padding: var(--spacing-2) var(--spacing-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all var(--transition-base);
		font-family: inherit;
	}

	.filter-btn:hover {
		background: var(--color-surface-secondary);
		border-color: var(--color-border-secondary);
		color: var(--color-text-primary);
	}

	.filter-btn.active {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-primary-text);
	}

	.clear-filters {
		padding: var(--spacing-2) var(--spacing-4);
		background: transparent;
		border: none;
		color: var(--color-primary);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		text-decoration: underline;
		transition: color var(--transition-fast);
		font-family: inherit;
	}

	.clear-filters:hover {
		color: var(--color-primary-hover);
	}

	/* Events Grid */
	.events-content {
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 var(--spacing-6) var(--spacing-12) var(--spacing-6);
	}

	.events-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--spacing-6);
	}

	/* Error Message */
	.error-message {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-3);
		padding: var(--spacing-6);
		background: var(--color-danger-light);
		border: 1px solid var(--color-danger-300);
		border-radius: var(--radius-lg);
		color: var(--color-danger-700);
		margin-bottom: var(--spacing-6);
	}

	.error-icon {
		font-size: 1.5rem;
	}

	/* Mobile Responsive */
	@media (max-width: 768px) {
		.page-hero {
			padding: var(--spacing-8) var(--spacing-4);
		}

		.page-title {
			font-size: 2rem;
		}

		.page-description {
			font-size: var(--font-size-base);
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: var(--spacing-3);
		}

		.stat-card {
			padding: var(--spacing-4);
			flex-direction: column;
			text-align: center;
			gap: var(--spacing-2);
		}

		.events-controls {
			padding: var(--spacing-6) var(--spacing-4);
		}

		.filter-controls {
			justify-content: center;
		}

		.events-grid {
			grid-template-columns: 1fr;
			gap: var(--spacing-4);
		}
	}

	@media (max-width: 480px) {
		.search-input {
			font-size: var(--font-size-sm);
		}

		.filter-btn {
			flex: 1;
			min-width: calc(50% - var(--spacing-1));
			text-align: center;
		}
	}
</style>
