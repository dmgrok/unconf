<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { locale } from '$lib/i18n';
	import { LogIn, Search, AlertCircle, Sparkles } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { generateGuestName, type Language } from '$lib/utils/name-generator';

	let accessCode = $state('');
	let isJoining = $state(false);
	let error = $state<string | null>(null);
	let guestName = $state('');

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

	function generateRandomName() {
		guestName = generateGuestName(currentLanguage);
	}

	async function handleJoin() {
		if (!guestName.trim()) {
			error = 'Please enter a name or generate a random one';
			return;
		}

		if (!accessCode.trim()) {
			error = 'Please enter an access code';
			return;
		}

		isJoining = true;
		error = null;

		try {
			// Generate a guest user ID
			const guestUserId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			const userName = guestName.trim();

			// First, find the event by access code
			const eventsResponse = await fetch('/api/events');
			const eventsData = await eventsResponse.json();

			if (!eventsData.success) {
				throw new Error('Failed to fetch events');
			}

			const event = eventsData.events.find(
				(e: any) => e.accessCode === accessCode.trim().toUpperCase()
			);

			if (!event) {
				throw new Error('Invalid access code. Please check and try again.');
			}

			// Join the event
			const response = await fetch('/api/events/join', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					eventId: event.id,
					userId: guestUserId,
					accessCode: accessCode.trim().toUpperCase()
				})
			});

			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || 'Failed to join event');
			}

			// Store guest user info in sessionStorage
			sessionStorage.setItem(
				'guestUser',
				JSON.stringify({
					id: guestUserId,
					name: userName,
					eventId: event.id
				})
			);

			// Redirect to the event page or a participant view
			// For now, redirect to the homepage with a success message
			goto(`/?joined=${event.id}`);
		} catch (err) {
			console.error('Failed to join event:', err);
			error = err instanceof Error ? err.message : 'Failed to join event';
		} finally {
			isJoining = false;
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter' && accessCode.trim()) {
			handleJoin();
		}
	}

	onMount(() => {
		// Generate initial name based on site language
		generateRandomName();
		previousLanguage = currentLanguage;
		
		// Auto-focus the access code input
		const input = document.getElementById('access-code-input') as HTMLInputElement;
		if (input) {
			input.focus();
		}
	});
</script>

<svelte:head>
	<title>Join Event | UnConf</title>
	<meta name="description" content="Join an unconference event as a guest" />
</svelte:head>

<div class="join-page">
	<div class="join-container">
		<div class="join-header">
			<h1>Join Event</h1>
			<p>Enter your access code to join as a guest</p>
		</div>

		<Card variant="elevated" padding="lg">
			{#snippet children()}
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
						<Button
							variant="outline"
							onclick={generateRandomName}
							disabled={isJoining}
							class="generate-name-btn"
							title="Generate random name"
						>
							<Sparkles size={18} />
							Generate
						</Button>
					</div>
					<p class="help-text">Choose your own name or generate a random one. Names are generated based on your selected site language.</p>
				</div>

				<div class="form-group">
					<label for="access-code-input">Event Access Code</label>
					<Input
						id="access-code-input"
						bind:value={accessCode}
						placeholder="Enter 6-digit code"
						disabled={isJoining}
						autocomplete="off"
						onkeypress={handleKeyPress}
					/>
					<p class="help-text">Get this code from your event organizer</p>
				</div>

				<div class="form-actions">
					<Button variant="outline" onclick={() => goto('/')} disabled={isJoining}>
						Cancel
					</Button>
					<Button
						variant="primary"
						size="lg"
						onclick={handleJoin}
						disabled={!accessCode.trim() || !guestName.trim() || isJoining}
					>
						{#if isJoining}
							<span class="loading-spinner"></span>
							Joining...
						{:else}
							<LogIn size={20} />
							Join Event
						{/if}
					</Button>
				</div>

				<div class="join-help">
					<Search size={16} />
					<span>Don't have a code? Contact your event organizer</span>
				</div>
			</div>
			{/snippet}
		</Card>
	</div>
</div>

<style>
	.join-page {
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
		max-width: 500px;
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
		margin-top: var(--spacing-4);
	}

	.form-actions :global(button:last-child) {
		flex: 1;
	}

	.join-help {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-2);
		padding-top: var(--spacing-4);
		border-top: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
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
