<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	interface HelpSection {
		id: string;
		title: string;
		content: string;
		icon?: string;
	}

	let { isOpen = $bindable(false) } = $props();

	let searchQuery = $state('');
	let activeSection = $state<string | null>(null);

	const helpSections: HelpSection[] = [
		{
			id: 'getting-started',
			title: 'Getting Started',
			icon: '🚀',
			content: `
# Getting Started with UnConf

Welcome to UnConf! Here's how to get started:

1. **Join an Event**: Use an access code or QR code to join an unconference
2. **Submit Topics**: Propose discussion topics you'd like to explore
3. **Vote**: Use weighted voting (3, 2, 1 points) to prioritize topics
4. **Participate**: Join discussions and activities as they happen

**Need an access code?** Ask your event organizer or check your invitation email.
			`
		},
		{
			id: 'voting',
			title: 'How Voting Works',
			icon: '🗳️',
			content: `
# Weighted Voting System

UnConf uses a weighted voting system to prioritize topics:

- **First Choice (3 points)**: Your top priority topic
- **Second Choice (2 points)**: Your second favorite
- **Third Choice (1 point)**: Still interested

**Tips:**
- You can change your votes anytime before voting closes
- Your votes are private until results are revealed
- Topics with the highest total scores are prioritized
			`
		},
		{
			id: 'activities',
			title: 'Event Activities',
			icon: '🎯',
			content: `
# Understanding Event Activities

Events progress through different activities:

## 🗳️ Voting Phase
Submit and vote on discussion topics

## 🧠 Group Intelligence Games
Collaborative games to build connections

## 💬 Discussion Groups
Join assigned discussion rooms based on your votes

## 👥 Team Distribution
Organize into teams for collaborative work

**Note:** Your organizer controls which activities are enabled and when they switch.
			`
		},
		{
			id: 'organizer-guide',
			title: 'Organizer Guide',
			icon: '⚙️',
			content: `
# Organizer Dashboard Guide

As an organizer, you can:

## Event Configuration
- Set event name, description, and access code
- Configure maximum participants
- Enable/disable activities

## Activity Management
- Switch between activities in real-time
- Set timers for voting phases
- Monitor participant engagement

## Participant Management
- View all participants
- Assign roles (guest → participant)
- Remove problematic users

## Analytics
- View real-time participation metrics
- Monitor voting progress
- Track activity engagement
			`
		},
		{
			id: 'troubleshooting',
			title: 'Troubleshooting',
			icon: '🔧',
			content: `
# Common Issues and Solutions

## Can't Join Event
- **Check your access code**: Ensure it's correct (case-sensitive)
- **Event may be full**: Check with organizer about capacity
- **Event ended**: Some events close after completion

## Voting Not Working
- **Voting may be closed**: Organizer controls voting phases
- **Already voted**: You can only vote once per topic (but can change votes)
- **Connection issues**: Check your internet connection

## Not Seeing Real-Time Updates
- **Refresh the page**: Sometimes helps reconnect
- **Check connection**: Look for connection indicator
- **Browser issues**: Try a different browser (Chrome recommended)

## Mobile Issues
- **App looks zoomed**: Rotate device or zoom out
- **Buttons too small**: Try landscape mode or larger text settings
- **Slow performance**: Close other apps, clear browser cache

**Still having issues?** Contact your event organizer or report a bug.
			`
		},
		{
			id: 'privacy',
			title: 'Privacy & Security',
			icon: '🔒',
			content: `
# Privacy and Security

## Your Data
- **Votes are private** until organizer reveals results
- **Guest accounts** have limited features
- **Your name and email** are visible to organizers only

## Security Features
- **Access codes** prevent unauthorized access
- **Rate limiting** prevents abuse
- **Secure connections** (HTTPS) protect your data

## What We Don't Do
- ❌ We don't sell your data
- ❌ We don't track you across other websites
- ❌ We don't send marketing emails (unless you opt-in)

## Data Retention
- Event data is deleted 90 days after event ends
- You can request data deletion anytime
- Guest accounts are automatically removed after 7 days of inactivity
			`
		},
		{
			id: 'keyboard-shortcuts',
			title: 'Keyboard Shortcuts',
			icon: '⌨️',
			content: `
# Keyboard Shortcuts

Speed up your workflow with these shortcuts:

## General
- **?** - Show this help panel
- **Esc** - Close dialogs/panels
- **/** - Focus search

## Navigation
- **Tab** - Navigate between elements
- **Shift + Tab** - Navigate backwards
- **Enter** - Activate button/link

## Organizer Only
- **Alt + S** - Switch activity
- **Alt + T** - Toggle timer
- **Alt + P** - Open participant list

**Note:** Some shortcuts may not work on all browsers or mobile devices.
			`
		}
	];

	const filteredSections = $derived(
		searchQuery
			? helpSections.filter(
					(section) =>
						section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
						section.content.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: helpSections
	);

	function closePanel() {
		isOpen = false;
		searchQuery = '';
		activeSection = null;
	}

	function openSection(sectionId: string) {
		activeSection = activeSection === sectionId ? null : sectionId;
	}

	onMount(() => {
		function handleKeydown(event: KeyboardEvent) {
			if (event.key === '?' && !isOpen) {
				event.preventDefault();
				isOpen = true;
			} else if (event.key === 'Escape' && isOpen) {
				closePanel();
			}
		}

		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});
</script>

{#if isOpen}
	<div class="help-overlay" onclick={closePanel} transition:fade={{ duration: 200 }}></div>

	<aside class="help-panel" transition:fly={{ x: 400, duration: 300 }}>
		<!-- Header -->
		<div class="help-header">
			<h2>Help & Documentation</h2>
			<button class="close-button" onclick={closePanel} aria-label="Close help panel">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<!-- Search -->
		<div class="help-search">
			<svg
				class="search-icon"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
			>
				<circle cx="11" cy="11" r="8" stroke-width="2" />
				<path d="m21 21-4.35-4.35" stroke-width="2" stroke-linecap="round" />
			</svg>
			<input
				type="search"
				bind:value={searchQuery}
				placeholder="Search help topics..."
				class="search-input"
			/>
		</div>

		<!-- Help Sections -->
		<div class="help-content">
			{#if filteredSections.length === 0}
				<div class="no-results">
					<p>No help topics found for "{searchQuery}"</p>
					<button onclick={() => (searchQuery = '')} class="clear-search">Clear search</button>
				</div>
			{:else}
				{#each filteredSections as section (section.id)}
					<div class="help-section">
						<button class="section-header" onclick={() => openSection(section.id)}>
							<span class="section-icon">{section.icon}</span>
							<span class="section-title">{section.title}</span>
							<svg
								class="section-arrow"
								class:expanded={activeSection === section.id}
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="m6 9 6 6 6-6"
								/>
							</svg>
						</button>

						{#if activeSection === section.id}
							<div class="section-content" transition:fly={{ y: -10, duration: 200 }}>
								{@html section.content.trim().replace(/\n/g, '<br>')}
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>

		<!-- Footer -->
		<div class="help-footer">
			<p>Press <kbd>?</kbd> to toggle help | <kbd>Esc</kbd> to close</p>
			<a href="/docs" class="docs-link">View full documentation →</a>
		</div>
	</aside>
{/if}

<style>
	.help-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 999;
		backdrop-filter: blur(2px);
	}

	.help-panel {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 480px;
		max-width: 90vw;
		background: white;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
	}

	.help-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.help-header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
	}

	.close-button {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		color: #6b7280;
		transition: all 0.2s ease;
	}

	.close-button:hover {
		background: #f3f4f6;
		color: #111827;
	}

	.help-search {
		position: relative;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.search-icon {
		position: absolute;
		left: 2rem;
		top: 50%;
		transform: translateY(-50%);
		color: #9ca3af;
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.75rem;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		font-size: 0.9375rem;
		transition: border-color 0.2s ease;
	}

	.search-input:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.help-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 0;
	}

	.help-section {
		border-bottom: 1px solid #f3f4f6;
	}

	.section-header {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background 0.2s ease;
	}

	.section-header:hover {
		background: #f9fafb;
	}

	.section-icon {
		font-size: 1.5rem;
		width: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.section-title {
		flex: 1;
		font-weight: 600;
		font-size: 1rem;
		color: #111827;
	}

	.section-arrow {
		color: #9ca3af;
		transition: transform 0.2s ease;
	}

	.section-arrow.expanded {
		transform: rotate(180deg);
	}

	.section-content {
		padding: 0 1.5rem 1.5rem 4.25rem;
		color: #4b5563;
		line-height: 1.6;
		font-size: 0.9375rem;
	}

	.section-content :global(h1) {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0 0 1rem 0;
		color: #111827;
	}

	.section-content :global(h2) {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 1.5rem 0 0.75rem 0;
		color: #111827;
	}

	.section-content :global(ul) {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}

	.section-content :global(li) {
		margin: 0.25rem 0;
	}

	.section-content :global(strong) {
		color: #111827;
		font-weight: 600;
	}

	.no-results {
		padding: 3rem 1.5rem;
		text-align: center;
		color: #6b7280;
	}

	.clear-search {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.9375rem;
		font-weight: 500;
	}

	.clear-search:hover {
		background: #2563eb;
	}

	.help-footer {
		padding: 1rem 1.5rem;
		border-top: 1px solid #e5e7eb;
		background: #f9fafb;
		text-align: center;
	}

	.help-footer p {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.help-footer kbd {
		padding: 0.125rem 0.375rem;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-family: monospace;
		font-size: 0.8125rem;
	}

	.docs-link {
		color: #3b82f6;
		text-decoration: none;
		font-size: 0.9375rem;
		font-weight: 500;
	}

	.docs-link:hover {
		text-decoration: underline;
	}

	@media (max-width: 768px) {
		.help-panel {
			width: 100%;
			max-width: 100%;
		}
	}
</style>
