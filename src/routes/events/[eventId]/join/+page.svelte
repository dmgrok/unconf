<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { locale } from '$lib/i18n';
	import { LogIn, AlertCircle, CheckCircle, Sparkles } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import type { PageData } from './$types';
	import type { Event } from '../../../../types/entities';
	import { generateGuestName, type Language } from '$lib/utils/name-generator';

	let { data }: { data: PageData } = $props();

	let guestName = $state('');
	let isJoining = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);

	// Map site locale to name generator language
	function mapLocaleToLanguage(siteLocale: string): Language {
		const langCode = siteLocale.split('-')[0].toLowerCase();
		const supportedLanguages: Language[] = ['en', 'fr', 'es', 'de', 'it'];
		return supportedLanguages.includes(langCode as Language) ? (langCode as Language) : 'en';
	}

	// Get current language from global locale store
	let currentLanguage = $derived(mapLocaleToLanguage($locale || 'en-US'));

	// Track previous language to detect changes
	let previousLanguage = $state<Language>('en');

	// Auto-regenerate name when language changes
	$effect(() => {
		if (currentLanguage !== previousLanguage && guestName && !isJoining) {
			generateRandomName();
			previousLanguage = currentLanguage;
		}
	});

	const event = data.event as Event | null;
	const eventId = $page.params.eventId;

	function generateRandomName() {
		guestName = generateGuestName(currentLanguage);
	}

	async function handleJoinAsGuest() {
		if (!event) {
			error = 'Event not found';
			return;
		}

		// Validate that name is provided
		if (!guestName.trim()) {
			error = 'Please enter a name or generate a random one';
			return;
		}

		isJoining = true;
		error = null;

		try {
			// Generate a guest user ID
			const guestUserId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			const userName = guestName.trim();

			// Join the event using the API
			const response = await fetch('/api/events/join', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					eventId: event.id,
					userId: guestUserId,
					accessCode: event.accessCode
				})
			});

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Failed to join event');
			}

			// Store guest user info in sessionStorage
			sessionStorage.setItem(
				'guestUser',
				JSON.stringify({
					id: guestUserId,
					name: userName,
					eventId: event.id,
					role: 'guest'
				})
			);

			success = true;

			// Redirect after a short delay
			setTimeout(() => {
				goto(`/events/${event.id}`);
			}, 1500);
		} catch (err) {
			console.error('Failed to join event:', err);
			error = err instanceof Error ? err.message : 'Failed to join event';
		} finally {
			isJoining = false;
		}
	}

	onMount(() => {
		// Generate initial random name based on site language
		generateRandomName();
		previousLanguage = currentLanguage;
		
		// Check if user is already a guest for this event
		const storedGuest = sessionStorage.getItem('guestUser');
		if (storedGuest) {
			const guest = JSON.parse(storedGuest);
			if (guest.eventId === eventId) {
				// Already joined, redirect to event
				goto(`/events/${eventId}`);
			}
		}
	});
</script>

<svelte:head>
	<title>Join {event?.title || 'Event'} | UnConf</title>
	<meta name="description" content="Join event as a guest" />
</svelte:head>

<div class="join-event-page">
	<div class="join-container">
		{#if !event}
			<Card variant="elevated" padding="lg">
				{#snippet children()}
					<div class="error-state">
						<AlertCircle size={48} />
						<h2>Event Not Found</h2>
						<p>The event you're trying to join doesn't exist or has been removed.</p>
						<Button variant="primary" onclick={() => goto('/')}>
							Go Home
						</Button>
					</div>
				{/snippet}
			</Card>
		{:else if success}
			<Card variant="elevated" padding="lg">
				{#snippet children()}
					<div class="success-state">
						<CheckCircle size={48} />
						<h2>Successfully Joined!</h2>
						<p>Redirecting you to the event...</p>
					</div>
				{/snippet}
			</Card>
		{:else}
			<div class="join-header">
				<h1>Join Event</h1>
				<p>Join "{event.title}" as a guest</p>
			</div>

			<Card variant="elevated" padding="lg">
				{#snippet children()}
					<div class="event-info">
						<h3>{event.title}</h3>
						{#if event.description}
							<p class="event-description">{event.description}</p>
						{/if}
						<div class="event-details">
							<div class="detail-item">
								<span class="label">Status:</span>
								<span class="value status-{event.status}">{event.status}</span>
							</div>
							{#if event.maxParticipants}
								<div class="detail-item">
									<span class="label">Max Participants:</span>
									<span class="value">{event.maxParticipants}</span>
								</div>
							{/if}
						</div>
					</div>

					<div class="join-form">
						{#if error}
							<div class="error-banner">
								<AlertCircle size={20} />
								<span>{error}</span>
							</div>
						{/if}

						<div class="form-group">
							<label for="guest-name-input">
								Your Display Name <span class="required-indicator">*</span>
							</label>
							<div class="name-input-group">
								<Input
									id="guest-name-input"
									bind:value={guestName}
									placeholder="Enter your name"
									disabled={isJoining}
									autocomplete="off"
									required
								/>
								<button
									type="button"
									class="generate-name-btn outline"
									onclick={generateRandomName}
									disabled={isJoining}
									title="Generate random name"
								>
									<Sparkles size={18} />
									Generate
								</button>
							</div>
							<p class="help-text">
								Choose your own name or generate a random one. Names are generated based on your selected site language.
							</p>
						</div>

						<div class="form-actions">
							<Button variant="outline" onclick={() => goto('/join')} disabled={isJoining}>
								Use Access Code
							</Button>
							<Button
								variant="primary"
								size="lg"
								onclick={handleJoinAsGuest}
								disabled={isJoining || !guestName.trim()}
							>
								{#if isJoining}
									<span class="loading-spinner"></span>
									Joining...
								{:else}
									<LogIn size={20} />
									Join as Guest
								{/if}
							</Button>
						</div>
					</div>
				{/snippet}
			</Card>
		{/if}
	</div>
</div>

<style>
	.join-event-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-6);
		background: linear-gradient(
			135deg,
			var(--color-primary-50) 0%,
			var(--color-surface) 100%
		);
	}

	.join-container {
		width: 100%;
		max-width: 600px;
	}

	.join-header {
		text-align: center;
		margin-bottom: var(--spacing-8);
	}

	.join-header h1 {
		font-size: var(--font-size-4xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		margin-bottom: var(--spacing-2);
	}

	.join-header p {
		font-size: var(--font-size-lg);
		color: var(--color-text-secondary);
	}

	.event-info {
		padding-bottom: var(--spacing-6);
		border-bottom: 1px solid var(--color-border);
		margin-bottom: var(--spacing-6);
	}

	.event-info h3 {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		margin-bottom: var(--spacing-3);
	}

	.event-description {
		color: var(--color-text-secondary);
		line-height: var(--line-height-relaxed);
		margin-bottom: var(--spacing-4);
	}

	.event-details {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-4);
	}

	.detail-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
	}

	.detail-item .label {
		font-size: var(--font-size-sm);
		color: var(--color-text-tertiary);
	}

	.detail-item .value {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
	}

	.status-active {
		color: var(--color-success);
	}

	.status-draft {
		color: var(--color-warning);
	}

	.status-completed {
		color: var(--color-text-tertiary);
	}

	.join-form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-6);
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		padding: var(--spacing-4);
		background: var(--color-error-50);
		color: var(--color-error-700);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-error-200);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
	}

	.form-group label {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
	}

	.required-indicator {
		color: var(--color-error);
		margin-left: var(--spacing-1);
	}

	.name-input-group {
		display: flex;
		gap: var(--spacing-2);
	}

	.name-input-group :global(.input-group) {
		flex: 1;
	}

	.name-input-group :global(.generate-name-btn) {
		flex-shrink: 0;
		white-space: nowrap;
	}

	.help-text {
		font-size: var(--font-size-sm);
		color: var(--color-text-tertiary);
		margin: 0;
	}

	.form-actions {
		display: flex;
		gap: var(--spacing-3);
	}

	.form-actions :global(button:last-child) {
		flex: 1;
	}

	.error-state,
	.success-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: var(--spacing-4);
		padding: var(--spacing-8);
	}

	.error-state {
		color: var(--color-error-600);
	}

	.success-state {
		color: var(--color-success-600);
	}

	.error-state h2,
	.success-state h2 {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-bold);
		margin: 0;
	}

	.error-state p,
	.success-state p {
		color: var(--color-text-secondary);
		margin: 0;
	}

	.loading-spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: white;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 640px) {
		.join-header h1 {
			font-size: var(--font-size-3xl);
		}

		.form-actions {
			flex-direction: column;
		}

		.form-actions :global(button) {
			width: 100%;
		}
	}
</style>
