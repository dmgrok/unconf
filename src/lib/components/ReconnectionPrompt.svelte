<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { WifiOff, RefreshCw, X, AlertTriangle } from 'lucide-svelte';
	import Button from './ui/Button.svelte';
	import Modal from './ui/Modal.svelte';

	interface ReconnectionPromptProps {
		show: boolean;
		reconnectAttempts: number;
		maxReconnectAttempts: number;
		lastError?: string | null;
		autoRetry?: boolean;
		retryDelay?: number; // in seconds
		variant?: 'modal' | 'banner' | 'toast';
		class?: string;
	}

	let {
		show = $bindable(),
		reconnectAttempts,
		maxReconnectAttempts,
		lastError = null,
		autoRetry = true,
		retryDelay = 5,
		variant = 'modal',
		class: className = ''
	}: ReconnectionPromptProps = $props();

	const dispatch = createEventDispatcher<{
		retry: void;
		cancel: void;
		close: void;
	}>();

	let countdown = $state(retryDelay);
	let countdownInterval: NodeJS.Timeout | null = null;

	$: if (show && autoRetry) {
		startCountdown();
	} else {
		stopCountdown();
	}

	$: isMaxAttemptsReached = reconnectAttempts >= maxReconnectAttempts;
	$: canRetry = !isMaxAttemptsReached;

	function startCountdown() {
		stopCountdown();
		countdown = retryDelay;

		countdownInterval = setInterval(() => {
			countdown--;
			if (countdown <= 0) {
				stopCountdown();
				handleRetry();
			}
		}, 1000);
	}

	function stopCountdown() {
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}
	}

	function handleRetry() {
		stopCountdown();
		dispatch('retry');
	}

	function handleCancel() {
		stopCountdown();
		show = false;
		dispatch('cancel');
	}

	function handleClose() {
		stopCountdown();
		show = false;
		dispatch('close');
	}

	$effect(() => {
		return () => stopCountdown();
	});
</script>

{#if show}
	{#if variant === 'modal'}
		<!-- Modal variant - blocking overlay -->
		<Modal bind:open={show} dismissable={false} class="reconnection-modal {className}">
			{#snippet header()}
				<div class="modal-header">
					<WifiOff size={24} class="header-icon" />
					<h2>Connection Lost</h2>
				</div>
			{/snippet}

			<div class="modal-content">
				<p class="message">
					{#if isMaxAttemptsReached}
						Unable to reconnect after {maxReconnectAttempts} attempts.
						Please check your internet connection and try again.
					{:else}
						Lost connection to the server. {autoRetry
							? `Automatically retrying in ${countdown}s...`
							: 'Click retry to reconnect.'}
					{/if}
				</p>

				{#if !isMaxAttemptsReached}
					<div class="attempt-info">
						<span>Attempt {reconnectAttempts} of {maxReconnectAttempts}</span>
						<div class="progress-bar">
							<div
								class="progress-fill"
								style="width: {(reconnectAttempts / maxReconnectAttempts) * 100}%"
							></div>
						</div>
					</div>
				{/if}

				{#if lastError}
					<div class="error-details">
						<AlertTriangle size={16} />
						<span>{lastError}</span>
					</div>
				{/if}
			</div>

			{#snippet footer()}
				<div class="modal-actions">
					{#if canRetry}
						<Button variant="primary" size="lg" onclick={handleRetry}>
							<RefreshCw size={18} />
							Retry Now {autoRetry ? `(${countdown}s)` : ''}
						</Button>
					{:else}
						<Button variant="primary" size="lg" onclick={handleRetry}>
							<RefreshCw size={18} />
							Try Again
						</Button>
					{/if}
					<Button variant="outline" size="lg" onclick={handleCancel}>
						Cancel
					</Button>
				</div>
			{/snippet}
		</Modal>
	{:else if variant === 'banner'}
		<!-- Banner variant - top of screen -->
		<div class="reconnection-banner {className}" role="alert">
			<div class="banner-content">
				<div class="banner-info">
					<WifiOff size={20} />
					<div class="banner-text">
						<strong>Connection Lost</strong>
						<span class="banner-message">
							{#if isMaxAttemptsReached}
								Unable to reconnect. Please check your connection.
							{:else if autoRetry}
								Retrying in {countdown}s... (Attempt {reconnectAttempts}/{maxReconnectAttempts})
							{:else}
								Click retry to reconnect.
							{/if}
						</span>
					</div>
				</div>

				<div class="banner-actions">
					{#if canRetry}
						<button class="retry-btn" onclick={handleRetry}>
							<RefreshCw size={16} />
							Retry
						</button>
					{/if}
					<button class="close-btn" onclick={handleClose} aria-label="Close">
						<X size={16} />
					</button>
				</div>
			</div>

			{#if !isMaxAttemptsReached}
				<div class="banner-progress">
					<div
						class="progress-fill"
						style="width: {(reconnectAttempts / maxReconnectAttempts) * 100}%"
					></div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Toast variant - bottom right -->
		<div class="reconnection-toast {className}" role="alert">
			<div class="toast-header">
				<WifiOff size={20} class="toast-icon" />
				<span class="toast-title">Connection Lost</span>
				<button class="toast-close" onclick={handleClose} aria-label="Close">
					<X size={16} />
				</button>
			</div>

			<p class="toast-message">
				{#if isMaxAttemptsReached}
					Unable to reconnect after {maxReconnectAttempts} attempts.
				{:else if autoRetry}
					Retrying in {countdown}s...
				{:else}
					Connection to server lost.
				{/if}
			</p>

			{#if canRetry}
				<div class="toast-actions">
					<button class="toast-retry" onclick={handleRetry}>
						<RefreshCw size={14} />
						Retry Now
					</button>
				</div>
			{/if}
		</div>
	{/if}
{/if}

<style>
	/* Modal variant styles */
	.modal-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.modal-header .header-icon {
		color: #ef4444;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
	}

	.modal-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.message {
		margin: 0;
		color: #4b5563;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.attempt-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.progress-bar {
		width: 100%;
		height: 0.5rem;
		background-color: #e5e7eb;
		border-radius: 0.25rem;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background-color: #3b82f6;
		border-radius: 0.25rem;
		transition: width 0.3s ease;
	}

	.error-details {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.375rem;
		color: #991b1b;
		font-size: 0.75rem;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		width: 100%;
	}

	.modal-actions :global(button) {
		flex: 1;
	}

	/* Banner variant styles */
	.reconnection-banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		background-color: #fef2f2;
		border-bottom: 2px solid #ef4444;
		z-index: 9999;
		animation: slideDown 0.3s ease-out;
	}

	.banner-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		gap: 1rem;
	}

	.banner-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: #991b1b;
	}

	.banner-text {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.banner-text strong {
		font-weight: 600;
		font-size: 0.875rem;
	}

	.banner-message {
		font-size: 0.75rem;
		color: #7f1d1d;
	}

	.banner-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.retry-btn,
	.close-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.retry-btn {
		background-color: #ef4444;
		color: white;
	}

	.retry-btn:hover {
		background-color: #dc2626;
	}

	.close-btn {
		background-color: transparent;
		color: #991b1b;
	}

	.close-btn:hover {
		background-color: #fee2e2;
	}

	.banner-progress {
		height: 0.25rem;
		background-color: #fecaca;
	}

	.banner-progress .progress-fill {
		background-color: #ef4444;
	}

	/* Toast variant styles */
	.reconnection-toast {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		background: white;
		border: 2px solid #ef4444;
		border-radius: 0.5rem;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
		max-width: 360px;
		z-index: 9999;
		animation: slideUp 0.3s ease-out;
	}

	.toast-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #fecaca;
	}

	.toast-icon {
		color: #ef4444;
		flex-shrink: 0;
	}

	.toast-title {
		flex: 1;
		font-weight: 600;
		font-size: 0.875rem;
		color: #1f2937;
	}

	.toast-close {
		background: none;
		border: none;
		color: #6b7280;
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		border-radius: 0.25rem;
	}

	.toast-close:hover {
		background-color: #f3f4f6;
	}

	.toast-message {
		margin: 0;
		padding: 0.75rem 1rem;
		color: #4b5563;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.toast-actions {
		padding: 0 1rem 0.75rem;
	}

	.toast-retry {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 1rem;
		background-color: #3b82f6;
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.toast-retry:hover {
		background-color: #2563eb;
	}

	/* Animations */
	@keyframes slideDown {
		from {
			transform: translateY(-100%);
		}
		to {
			transform: translateY(0);
		}
	}

	@keyframes slideUp {
		from {
			transform: translateY(100%);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	/* Responsive */
	@media (max-width: 640px) {
		.reconnection-toast {
			right: 0.5rem;
			left: 0.5rem;
			bottom: 0.5rem;
			max-width: none;
		}

		.banner-content {
			flex-direction: column;
			align-items: flex-start;
		}

		.banner-actions {
			width: 100%;
			justify-content: flex-end;
		}

		.modal-actions {
			flex-direction: column;
		}
	}
</style>
