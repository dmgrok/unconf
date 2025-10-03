<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Wifi, WifiOff, RefreshCw, AlertCircle, Check } from 'lucide-svelte';
	import type { ConnectionStatus } from '../websocket/client';

	interface ConnectionStatusIndicatorProps {
		status: ConnectionStatus;
		reconnectAttempts?: number;
		maxReconnectAttempts?: number;
		userCount?: number;
		lastError?: string | null;
		variant?: 'inline' | 'badge' | 'full';
		showUserCount?: boolean;
		class?: string;
	}

	let {
		status,
		reconnectAttempts = 0,
		maxReconnectAttempts = 5,
		userCount = 0,
		lastError = null,
		variant = 'badge',
		showUserCount = true,
		class: className = ''
	}: ConnectionStatusIndicatorProps = $props();

	const dispatch = createEventDispatcher<{
		retry: void;
		dismiss: void;
	}>();

	$: statusConfig = getStatusConfig(status);
	$: showReconnectAttempts = status === 'reconnecting' && reconnectAttempts > 0;

	function getStatusConfig(status: ConnectionStatus) {
		switch (status) {
			case 'connected':
				return {
					icon: Wifi,
					label: 'Connected',
					color: '#10b981',
					bgColor: '#d1fae5',
					textColor: '#065f46',
					pulse: false
				};
			case 'connecting':
				return {
					icon: RefreshCw,
					label: 'Connecting...',
					color: '#3b82f6',
					bgColor: '#dbeafe',
					textColor: '#1e40af',
					pulse: true
				};
			case 'reconnecting':
				return {
					icon: RefreshCw,
					label: 'Reconnecting...',
					color: '#f59e0b',
					bgColor: '#fef3c7',
					textColor: '#92400e',
					pulse: true
				};
			case 'disconnected':
				return {
					icon: WifiOff,
					label: 'Disconnected',
					color: '#ef4444',
					bgColor: '#fee2e2',
					textColor: '#991b1b',
					pulse: false
				};
		}
	}

	function handleRetry() {
		dispatch('retry');
	}

	function handleDismiss() {
		dispatch('dismiss');
	}
</script>

{#if variant === 'inline'}
	<!-- Inline indicator - minimal, just icon + text -->
	<div class="connection-inline {className}" style="color: {statusConfig.color}">
		<svelte:component
			this={statusConfig.icon}
			size={16}
			class={statusConfig.pulse ? 'pulse' : ''}
		/>
		<span class="status-text">{statusConfig.label}</span>
		{#if showUserCount && status === 'connected'}
			<span class="user-count">• {userCount} online</span>
		{/if}
	</div>
{:else if variant === 'badge'}
	<!-- Badge indicator - compact with background -->
	<div
		class="connection-badge {className}"
		class:pulse={statusConfig.pulse}
		style="background-color: {statusConfig.bgColor}; color: {statusConfig.textColor}"
	>
		<svelte:component
			this={statusConfig.icon}
			size={14}
			class={statusConfig.pulse ? 'spin' : ''}
		/>
		<span class="status-text">{statusConfig.label}</span>
		{#if showReconnectAttempts}
			<span class="attempt-count">({reconnectAttempts}/{maxReconnectAttempts})</span>
		{/if}
		{#if showUserCount && status === 'connected'}
			<span class="separator">•</span>
			<span class="user-count">{userCount}</span>
		{/if}
	</div>
{:else}
	<!-- Full indicator - detailed with error message and actions -->
	<div class="connection-full {className}" style="border-color: {statusConfig.color}">
		<div class="status-header">
			<div class="status-info">
				<svelte:component
					this={statusConfig.icon}
					size={20}
					class={statusConfig.pulse ? 'spin' : ''}
					style="color: {statusConfig.color}"
				/>
				<div class="status-details">
					<span class="status-label" style="color: {statusConfig.textColor}">
						{statusConfig.label}
					</span>
					{#if showReconnectAttempts}
						<span class="attempt-text">
							Attempt {reconnectAttempts} of {maxReconnectAttempts}
						</span>
					{/if}
				</div>
			</div>

			{#if showUserCount && status === 'connected'}
				<div class="user-info">
					<Check size={16} style="color: {statusConfig.color}" />
					<span>{userCount} users online</span>
				</div>
			{/if}
		</div>

		{#if lastError}
			<div class="error-message">
				<AlertCircle size={14} />
				<span>{lastError}</span>
			</div>
		{/if}

		{#if status === 'disconnected' || (status === 'reconnecting' && reconnectAttempts >= maxReconnectAttempts)}
			<div class="status-actions">
				<button class="retry-button" onclick={handleRetry}>
					<RefreshCw size={16} />
					Retry Connection
				</button>
				<button class="dismiss-button" onclick={handleDismiss}>
					Dismiss
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Inline variant */
	.connection-inline {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.connection-inline .status-text {
		font-weight: 500;
	}

	.connection-inline .user-count {
		opacity: 0.7;
		font-size: 0.75rem;
	}

	/* Badge variant */
	.connection-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.025em;
		text-transform: uppercase;
		transition: all 0.2s ease;
	}

	.connection-badge .separator {
		opacity: 0.5;
		margin: 0 0.125rem;
	}

	.connection-badge .attempt-count {
		opacity: 0.8;
		font-size: 0.7rem;
	}

	.connection-badge.pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	/* Full variant */
	.connection-full {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		background: white;
		border: 2px solid;
		border-radius: 0.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.status-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.status-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.status-details {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.status-label {
		font-weight: 600;
		font-size: 0.875rem;
	}

	.attempt-text {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.375rem;
		color: #991b1b;
		font-size: 0.75rem;
	}

	.status-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.retry-button,
	.dismiss-button {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.retry-button {
		background-color: #3b82f6;
		color: white;
		flex: 1;
	}

	.retry-button:hover {
		background-color: #2563eb;
	}

	.retry-button:active {
		transform: scale(0.98);
	}

	.dismiss-button {
		background-color: transparent;
		color: #6b7280;
		border: 1px solid #d1d5db;
	}

	.dismiss-button:hover {
		background-color: #f9fafb;
		border-color: #9ca3af;
	}

	/* Animations */
	.spin {
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

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	/* Responsive */
	@media (max-width: 640px) {
		.connection-full {
			padding: 0.75rem;
		}

		.status-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.status-actions {
			flex-direction: column;
			width: 100%;
		}

		.retry-button,
		.dismiss-button {
			width: 100%;
			justify-content: center;
		}
	}
</style>
