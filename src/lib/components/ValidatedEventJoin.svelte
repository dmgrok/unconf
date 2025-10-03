<script lang="ts">
	/**
	 * Example component showing how to use event validation
	 */
	import { createEventDispatcher } from 'svelte';
	import type { Event, User } from '../../types/entities';
	import {
		validateEventJoin,
		type ValidationError
	} from '../validation/event-validation';
	import { handleValidationError, sanitizeInput } from '../utils/event-error-utils';
	import EventErrorHandler from './EventErrorHandler.svelte';
	import Button from './ui/Button.svelte';
	import Input from './ui/Input.svelte';
	import Card from './ui/Card.svelte';
	import { LogIn, Loader2 } from 'lucide-svelte';

	interface ValidatedEventJoinProps {
		event: Event | null;
		user: User;
		currentParticipants?: number;
		onJoinSuccess?: (event: Event) => void;
		class?: string;
	}

	let {
		event,
		user,
		currentParticipants = 0,
		onJoinSuccess,
		class: className = ''
	}: ValidatedEventJoinProps = $props();

	const dispatch = createEventDispatcher<{
		join: { event: Event; user: User };
		error: { error: ValidationError };
		cancel: void;
	}>();

	let accessCode = $state('');
	let validationError = $state<ValidationError | null>(null);
	let isJoining = $state(false);
	let isAlreadyJoined = $state(false);

	async function handleJoin() {
		// Clear previous errors
		validationError = null;

		// Sanitize input
		const sanitizedCode = sanitizeInput(accessCode, 50);

		// Validate join request
		const result = validateEventJoin({
			event,
			accessCode: sanitizedCode,
			user,
			currentParticipants,
			isAlreadyJoined
		});

		if (!result.valid && result.error) {
			validationError = result.error;
			handleValidationError(result.error);
			dispatch('error', { error: result.error });
			return;
		}

		// Proceed with join
		isJoining = true;

		try {
			// Make API request to join event
			const response = await fetch('/api/events/join', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					eventId: event!.id,
					userId: user.id,
					accessCode: sanitizedCode
				})
			});

			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || 'Failed to join event');
			}

			// Success
			isAlreadyJoined = true;
			dispatch('join', { event: event!, user });

			if (onJoinSuccess) {
				onJoinSuccess(event!);
			}
		} catch (error) {
			// Handle API errors
			validationError = {
				code: 'JOIN_FAILED',
				message: error instanceof Error ? error.message : 'Failed to join event',
				recoverySuggestion: 'Please try again or contact the organizer'
			};
			dispatch('error', { error: validationError });
		} finally {
			isJoining = false;
		}
	}

	function handleRetry() {
		validationError = null;
		accessCode = '';
	}

	function handleCancel() {
		dispatch('cancel');
	}
</script>

<div class="validated-event-join {className}">
	{#if validationError}
		<EventErrorHandler
			error={validationError}
			variant="card"
			showRecovery={true}
			onRetry={handleRetry}
			onDismiss={() => (validationError = null)}
			on:home={handleCancel}
		/>
	{:else}
		<Card variant="outlined" padding="lg">
			{#snippet header()}
				<h2>Join Event</h2>
				{#if event}
					<p class="event-title">{event.title}</p>
				{/if}
			{/snippet}

			<div class="join-form">
				<div class="form-group">
					<label for="access-code">Event Access Code</label>
					<Input
						id="access-code"
						bind:value={accessCode}
						placeholder="Enter access code"
						disabled={isJoining || isAlreadyJoined}
						autocomplete="off"
					/>
					<p class="help-text">
						Enter the access code provided by the event organizer
					</p>
				</div>

				{#if event}
					<div class="event-info">
						<div class="info-item">
							<span class="label">Status:</span>
							<span class="value">{event.status}</span>
						</div>
						{#if event.maxParticipants}
							<div class="info-item">
								<span class="label">Capacity:</span>
								<span class="value">
									{currentParticipants}/{event.maxParticipants}
								</span>
							</div>
						{/if}
						<div class="info-item">
							<span class="label">Guest Access:</span>
							<span class="value">
								{event.settings.allowGuestAccess ? 'Allowed' : 'Not Allowed'}
							</span>
						</div>
					</div>
				{/if}
			</div>

			{#snippet footer()}
				<div class="form-actions">
					<Button variant="outline" onclick={handleCancel} disabled={isJoining}>
						Cancel
					</Button>
					<Button
						variant="primary"
						onclick={handleJoin}
						disabled={!accessCode.trim() || isJoining || isAlreadyJoined}
					>
						{#if isJoining}
							<Loader2 size={18} class="spin" />
							Joining...
						{:else if isAlreadyJoined}
							<LogIn size={18} />
							Already Joined
						{:else}
							<LogIn size={18} />
							Join Event
						{/if}
					</Button>
				</div>
			{/snippet}
		</Card>
	{/if}
</div>

<style>
	.validated-event-join {
		max-width: 500px;
		margin: 2rem auto;
	}

	.event-title {
		margin: 0.5rem 0 0;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.join-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-weight: 500;
		color: #374151;
		font-size: 0.875rem;
	}

	.help-text {
		margin: 0;
		color: #6b7280;
		font-size: 0.75rem;
	}

	.event-info {
		padding: 1rem;
		background-color: #f9fafb;
		border-radius: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.info-item {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
	}

	.info-item .label {
		color: #6b7280;
	}

	.info-item .value {
		color: #1f2937;
		font-weight: 500;
	}

	.form-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 640px) {
		.validated-event-join {
			margin: 1rem;
		}

		.form-actions {
			flex-direction: column-reverse;
		}

		.form-actions :global(button) {
			width: 100%;
		}
	}
</style>
