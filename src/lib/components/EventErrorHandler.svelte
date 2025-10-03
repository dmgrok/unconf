<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		AlertCircle,
		XCircle,
		AlertTriangle,
		Info,
		RefreshCw,
		Home,
		Mail
	} from 'lucide-svelte';
	import type { ValidationError } from '../validation/event-validation';
	import { EventErrorCode } from '../validation/event-validation';
	import Button from './ui/Button.svelte';
	import Card from './ui/Card.svelte';

	interface EventErrorHandlerProps {
		error: ValidationError | null;
		variant?: 'inline' | 'card' | 'modal';
		showRecovery?: boolean;
		onRetry?: () => void;
		onDismiss?: () => void;
		class?: string;
	}

	let {
		error,
		variant = 'card',
		showRecovery = true,
		onRetry,
		onDismiss,
		class: className = ''
	}: EventErrorHandlerProps = $props();

	const dispatch = createEventDispatcher<{
		retry: void;
		dismiss: void;
		contact: void;
		home: void;
	}>();

	$: errorConfig = error ? getErrorConfig(error.code) : null;

	function getErrorConfig(code: string) {
		switch (code) {
			case EventErrorCode.EVENT_NOT_FOUND:
				return {
					icon: XCircle,
					color: '#ef4444',
					severity: 'error' as const,
					actions: ['retry', 'home']
				};
			case EventErrorCode.EVENT_FULL:
				return {
					icon: AlertCircle,
					color: '#f59e0b',
					severity: 'warning' as const,
					actions: ['contact', 'home']
				};
			case EventErrorCode.EVENT_ENDED:
				return {
					icon: Info,
					color: '#6b7280',
					severity: 'info' as const,
					actions: ['home']
				};
			case EventErrorCode.INVALID_ACCESS_CODE:
				return {
					icon: XCircle,
					color: '#ef4444',
					severity: 'error' as const,
					actions: ['retry']
				};
			case EventErrorCode.ACCESS_DENIED:
			case EventErrorCode.INVALID_PERMISSIONS:
				return {
					icon: XCircle,
					color: '#ef4444',
					severity: 'error' as const,
					actions: ['contact', 'home']
				};
			case EventErrorCode.GUEST_ACCESS_DISABLED:
			case EventErrorCode.REGISTRATION_REQUIRED:
				return {
					icon: AlertTriangle,
					color: '#f59e0b',
					severity: 'warning' as const,
					actions: ['home']
				};
			case EventErrorCode.SESSION_EXPIRED:
				return {
					icon: RefreshCw,
					color: '#3b82f6',
					severity: 'warning' as const,
					actions: ['retry']
				};
			case EventErrorCode.VOTING_LIMIT_REACHED:
			case EventErrorCode.TOPIC_LIMIT_REACHED:
				return {
					icon: AlertCircle,
					color: '#f59e0b',
					severity: 'warning' as const,
					actions: ['dismiss']
				};
			case EventErrorCode.ACTIVITY_NOT_AVAILABLE:
				return {
					icon: Info,
					color: '#6b7280',
					severity: 'info' as const,
					actions: ['contact']
				};
			default:
				return {
					icon: AlertCircle,
					color: '#ef4444',
					severity: 'error' as const,
					actions: ['retry', 'home']
				};
		}
	}

	function handleRetry() {
		if (onRetry) {
			onRetry();
		}
		dispatch('retry');
	}

	function handleDismiss() {
		if (onDismiss) {
			onDismiss();
		}
		dispatch('dismiss');
	}

	function handleContact() {
		dispatch('contact');
	}

	function handleHome() {
		dispatch('home');
	}

	function shouldShowAction(action: string): boolean {
		if (!errorConfig) return false;
		return errorConfig.actions.includes(action);
	}
</script>

{#if error && errorConfig}
	{#if variant === 'inline'}
		<!-- Inline variant - minimal banner -->
		<div
			class="error-inline {className}"
			class:error={errorConfig.severity === 'error'}
			class:warning={errorConfig.severity === 'warning'}
			class:info={errorConfig.severity === 'info'}
			role="alert"
		>
			<svelte:component this={errorConfig.icon} size={20} />
			<div class="error-content">
				<span class="error-message">{error.message}</span>
				{#if error.recoverySuggestion}
					<span class="recovery-suggestion">{error.recoverySuggestion}</span>
				{/if}
			</div>
			{#if shouldShowAction('dismiss')}
				<button class="dismiss-btn" onclick={handleDismiss} aria-label="Dismiss">
					×
				</button>
			{/if}
		</div>
	{:else if variant === 'card'}
		<!-- Card variant - detailed error display -->
		<Card variant="outlined" padding="lg" class="error-card {className}">
			<div class="error-header">
				<svelte:component
					this={errorConfig.icon}
					size={48}
					style="color: {errorConfig.color}"
				/>
				<h3 class="error-title">{error.message}</h3>
			</div>

			{#if error.recoverySuggestion && showRecovery}
				<div class="recovery-section">
					<p class="recovery-text">{error.recoverySuggestion}</p>
				</div>
			{/if}

			{#if error.details}
				<details class="error-details">
					<summary>Technical Details</summary>
					<pre>{JSON.stringify(error.details, null, 2)}</pre>
				</details>
			{/if}

			<div class="error-actions">
				{#if shouldShowAction('retry')}
					<Button variant="primary" onclick={handleRetry}>
						<RefreshCw size={16} />
						Try Again
					</Button>
				{/if}

				{#if shouldShowAction('contact')}
					<Button variant="outline" onclick={handleContact}>
						<Mail size={16} />
						Contact Organizer
					</Button>
				{/if}

				{#if shouldShowAction('home')}
					<Button variant="outline" onclick={handleHome}>
						<Home size={16} />
						Go Home
					</Button>
				{/if}

				{#if shouldShowAction('dismiss')}
					<Button variant="outline" onclick={handleDismiss}>
						Dismiss
					</Button>
				{/if}
			</div>
		</Card>
	{:else}
		<!-- Modal variant - full screen overlay -->
		<div class="error-modal-overlay {className}">
			<div class="error-modal">
				<div class="modal-icon" style="color: {errorConfig.color}">
					<svelte:component this={errorConfig.icon} size={64} />
				</div>

				<h2 class="modal-title">{error.message}</h2>

				{#if error.recoverySuggestion && showRecovery}
					<p class="modal-recovery">{error.recoverySuggestion}</p>
				{/if}

				<div class="modal-actions">
					{#if shouldShowAction('retry')}
						<Button variant="primary" size="lg" onclick={handleRetry}>
							<RefreshCw size={20} />
							Try Again
						</Button>
					{/if}

					{#if shouldShowAction('contact')}
						<Button variant="outline" size="lg" onclick={handleContact}>
							<Mail size={20} />
							Contact Organizer
						</Button>
					{/if}

					{#if shouldShowAction('home')}
						<Button variant="outline" size="lg" onclick={handleHome}>
							<Home size={20} />
							Return Home
						</Button>
					{/if}

					{#if shouldShowAction('dismiss')}
						<Button variant="outline" size="lg" onclick={handleDismiss}>
							Dismiss
						</Button>
					{/if}
				</div>

				{#if error.details}
					<details class="modal-details">
						<summary>Show technical details</summary>
						<pre>{JSON.stringify(error.details, null, 2)}</pre>
					</details>
				{/if}
			</div>
		</div>
	{/if}
{/if}

<style>
	/* Inline variant */
	.error-inline {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 0.5rem;
		border: 1px solid;
		animation: slideDown 0.3s ease-out;
	}

	.error-inline.error {
		background-color: #fef2f2;
		border-color: #fecaca;
		color: #991b1b;
	}

	.error-inline.warning {
		background-color: #fffbeb;
		border-color: #fde68a;
		color: #92400e;
	}

	.error-inline.info {
		background-color: #f0f9ff;
		border-color: #bae6fd;
		color: #075985;
	}

	.error-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.error-message {
		font-weight: 600;
		font-size: 0.875rem;
	}

	.recovery-suggestion {
		font-size: 0.75rem;
		opacity: 0.8;
	}

	.dismiss-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.25rem;
		line-height: 1;
		opacity: 0.6;
		transition: opacity 0.2s;
	}

	.dismiss-btn:hover {
		opacity: 1;
	}

	/* Card variant */
	.error-card {
		text-align: center;
		max-width: 600px;
		margin: 2rem auto;
	}

	.error-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.error-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
	}

	.recovery-section {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background-color: #f9fafb;
		border-radius: 0.5rem;
	}

	.recovery-text {
		margin: 0;
		color: #4b5563;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.error-details {
		margin-top: 1rem;
		text-align: left;
	}

	.error-details summary {
		cursor: pointer;
		font-size: 0.75rem;
		color: #6b7280;
		padding: 0.5rem;
	}

	.error-details pre {
		margin: 0.5rem 0 0;
		padding: 0.75rem;
		background-color: #f3f4f6;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		overflow-x: auto;
	}

	.error-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	/* Modal variant */
	.error-modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		animation: fadeIn 0.3s ease-out;
	}

	.error-modal {
		background: white;
		border-radius: 1rem;
		padding: 2rem;
		max-width: 500px;
		width: 90vw;
		text-align: center;
		animation: scaleIn 0.3s ease-out;
	}

	.modal-icon {
		margin-bottom: 1rem;
	}

	.modal-title {
		margin: 0 0 1rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.modal-recovery {
		margin: 0 0 2rem;
		color: #6b7280;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.modal-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.modal-details {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.modal-details summary {
		cursor: pointer;
		font-size: 0.75rem;
		color: #9ca3af;
		margin-bottom: 0.5rem;
	}

	.modal-details pre {
		margin: 0;
		padding: 0.75rem;
		background-color: #f9fafb;
		border-radius: 0.375rem;
		font-size: 0.7rem;
		overflow-x: auto;
		text-align: left;
	}

	/* Animations */
	@keyframes slideDown {
		from {
			transform: translateY(-1rem);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes scaleIn {
		from {
			transform: scale(0.9);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	/* Responsive */
	@media (max-width: 640px) {
		.error-inline {
			flex-direction: column;
			align-items: flex-start;
		}

		.error-card {
			margin: 1rem;
		}

		.error-modal {
			padding: 1.5rem;
			width: 95vw;
		}

		.modal-title {
			font-size: 1.25rem;
		}
	}
</style>
