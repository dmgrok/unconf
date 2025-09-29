<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { user, isAuthenticated } from '$lib/stores/auth';
	import { sessionManager } from '$lib/auth/session';
	import { secureSessionManager, sessionSecurity } from '$lib/auth/security';
	import { signOut } from '@auth/sveltekit/client';

	interface Props {
		showWarnings?: boolean;
		autoLogout?: boolean;
		warningThreshold?: number; // minutes
	}

	let {
		showWarnings = true,
		autoLogout = false,
		warningThreshold = 5
	}: Props = $props();

	let sessionStatus = $state({
		isValid: true,
		timeRemaining: 0,
		inactivityTimeRemaining: 0,
		isExpiring: false,
		needsRefresh: false
	});

	let showExpiryWarning = $state(false);
	let showInactivityWarning = $state(false);
	let intervalId: number | null = null;

	// Check session status periodically
	const checkSessionStatus = () => {
		if (!$isAuthenticated || !$user) {
			sessionStatus = {
				isValid: false,
				timeRemaining: 0,
				inactivityTimeRemaining: 0,
				isExpiring: false,
				needsRefresh: false
			};
			return;
		}

		const session = sessionManager.loadSession();
		if (!session) {
			sessionStatus.isValid = false;
			return;
		}

		const status = secureSessionManager.getSecurityStatus(session);
		sessionStatus = status;

		// Show warnings based on thresholds
		const warningThresholdMs = warningThreshold * 60 * 1000;
		showExpiryWarning = showWarnings && status.timeRemaining <= warningThresholdMs && status.timeRemaining > 0;
		showInactivityWarning = showWarnings && status.inactivityTimeRemaining <= warningThresholdMs && status.inactivityTimeRemaining > 0;

		// Auto-refresh if needed
		if (status.needsRefresh && session) {
			sessionManager.refreshSession(session);
		}

		// Auto-logout if expired and enabled
		if (autoLogout && (!status.isValid || status.timeRemaining === 0)) {
			handleAutoLogout();
		}
	};

	const handleAutoLogout = () => {
		console.warn('Session expired - auto logout triggered');
		signOut();
	};

	const handleExtendSession = () => {
		const session = sessionManager.loadSession();
		if (session) {
			sessionManager.refreshSession(session);
			showExpiryWarning = false;
		}
	};

	const handleDismissWarning = (type: 'expiry' | 'inactivity') => {
		if (type === 'expiry') {
			showExpiryWarning = false;
		} else {
			showInactivityWarning = false;
		}
	};

	// Format time remaining as human readable
	const formatTime = (milliseconds: number): string => {
		if (milliseconds <= 0) return '0m';

		const minutes = Math.floor(milliseconds / (60 * 1000));
		const seconds = Math.floor((milliseconds % (60 * 1000)) / 1000);

		if (minutes > 0) {
			return `${minutes}m ${seconds}s`;
		} else {
			return `${seconds}s`;
		}
	};

	onMount(() => {
		// Initial check
		checkSessionStatus();

		// Set up periodic checking
		intervalId = setInterval(checkSessionStatus, 30000); // Check every 30 seconds

		// Listen for session events
		const handleSessionInactive = () => {
			if (showWarnings) {
				showInactivityWarning = true;
			}
		};

		window.addEventListener('session-inactive', handleSessionInactive);

		return () => {
			window.removeEventListener('session-inactive', handleSessionInactive);
		};
	});

	onDestroy(() => {
		if (intervalId) {
			clearInterval(intervalId);
		}
	});
</script>

{#if $isAuthenticated && sessionStatus}
	<!-- Session Expiry Warning -->
	{#if showExpiryWarning}
		<div class="security-warning expiry-warning">
			<div class="warning-content">
				<span class="warning-icon">⏰</span>
				<div class="warning-message">
					<strong>Session Expiring</strong>
					<p>Your session will expire in {formatTime(sessionStatus.timeRemaining)}</p>
				</div>
				<div class="warning-actions">
					<button onclick={handleExtendSession} class="extend-button">
						Extend Session
					</button>
					<button onclick={() => handleDismissWarning('expiry')} class="dismiss-button">
						Dismiss
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Inactivity Warning -->
	{#if showInactivityWarning}
		<div class="security-warning inactivity-warning">
			<div class="warning-content">
				<span class="warning-icon">😴</span>
				<div class="warning-message">
					<strong>Inactive Session</strong>
					<p>Your session will timeout due to inactivity in {formatTime(sessionStatus.inactivityTimeRemaining)}</p>
				</div>
				<div class="warning-actions">
					<button onclick={() => sessionSecurity.updateActivity()} class="stay-active-button">
						Stay Active
					</button>
					<button onclick={() => handleDismissWarning('inactivity')} class="dismiss-button">
						Dismiss
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Session Status (Debug/Development) -->
	{#if import.meta.env.DEV}
		<div class="session-debug">
			<details>
				<summary>Session Status (Debug)</summary>
				<div class="debug-content">
					<p><strong>Valid:</strong> {sessionStatus.isValid ? 'Yes' : 'No'}</p>
					<p><strong>Time Remaining:</strong> {formatTime(sessionStatus.timeRemaining)}</p>
					<p><strong>Inactivity Timeout:</strong> {formatTime(sessionStatus.inactivityTimeRemaining)}</p>
					<p><strong>Expiring:</strong> {sessionStatus.isExpiring ? 'Yes' : 'No'}</p>
					<p><strong>Needs Refresh:</strong> {sessionStatus.needsRefresh ? 'Yes' : 'No'}</p>
				</div>
			</details>
		</div>
	{/if}
{/if}

<style>
	.security-warning {
		position: fixed;
		top: 70px; /* Below navbar */
		right: 1rem;
		z-index: 1000;
		background: white;
		border: 2px solid;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		max-width: 400px;
		animation: slideIn 0.3s ease-out;
	}

	.expiry-warning {
		border-color: #ffc107;
		background: #fff3cd;
	}

	.inactivity-warning {
		border-color: #fd7e14;
		background: #fff3cd;
	}

	.warning-content {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
	}

	.warning-icon {
		font-size: 2rem;
		flex-shrink: 0;
	}

	.warning-message {
		flex: 1;
	}

	.warning-message strong {
		display: block;
		margin-bottom: 0.5rem;
		color: #856404;
	}

	.warning-message p {
		margin: 0;
		color: #664d03;
		font-size: 0.9rem;
	}

	.warning-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.extend-button, .stay-active-button {
		padding: 0.5rem 1rem;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.extend-button:hover, .stay-active-button:hover {
		background: #0056b3;
	}

	.dismiss-button {
		padding: 0.5rem 1rem;
		background: transparent;
		color: #856404;
		border: 1px solid #856404;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.dismiss-button:hover {
		background: #856404;
		color: white;
	}

	.session-debug {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		background: #f8f9fa;
		border: 1px solid #dee2e6;
		border-radius: 4px;
		font-size: 0.8rem;
		max-width: 300px;
		z-index: 1000;
	}

	.session-debug summary {
		padding: 0.5rem;
		cursor: pointer;
		background: #e9ecef;
		border-radius: 4px 4px 0 0;
	}

	.debug-content {
		padding: 0.5rem;
	}

	.debug-content p {
		margin: 0.25rem 0;
		font-family: monospace;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.security-warning {
			right: 0.5rem;
			left: 0.5rem;
			max-width: none;
		}

		.warning-content {
			flex-direction: column;
			text-align: center;
		}

		.warning-actions {
			flex-direction: row;
			justify-content: center;
		}

		.session-debug {
			bottom: 0.5rem;
			right: 0.5rem;
			left: 0.5rem;
			max-width: none;
		}
	}
</style>