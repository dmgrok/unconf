<script lang="ts">
	import { isAuthenticated, canAccess, user } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	interface Props {
		children?: any;
		requireAuth?: boolean;
		requireRole?: string;
		fallbackPath?: string;
		showMessage?: boolean;
	}

	let {
		children,
		requireAuth = false,
		requireRole,
		fallbackPath = '/auth/signin',
		showMessage = true
	}: Props = $props();

	let authorized = $derived(() => {
		// If no auth required, always show content
		if (!requireAuth && !requireRole) return true;

		// Check authentication requirement
		if (requireAuth && !$isAuthenticated) return false;

		// Check role requirement
		if (requireRole && !$canAccess(requireRole)) return false;

		return true;
	});

	let redirectReason = $derived(() => {
		if (!requireAuth && !requireRole) return null;

		if (requireAuth && !$isAuthenticated) {
			return 'authentication required';
		}

		if (requireRole && !$canAccess(requireRole)) {
			return `${requireRole} role required`;
		}

		return null;
	});

	// Auto-redirect if not authorized
	onMount(() => {
		if (!authorized()) {
			goto(fallbackPath);
		}
	});

	// Watch for changes and redirect if needed
	$effect(() => {
		if (!authorized() && redirectReason()) {
			goto(fallbackPath);
		}
	});
</script>

{#if authorized()}
	{@render children?.()}
{:else if showMessage}
	<div class="auth-guard-message">
		<div class="message-content">
			<h3>Access Restricted</h3>
			<p>
				{redirectReason() === 'authentication required'
					? 'Please sign in to access this content.'
					: `This content requires ${requireRole} privileges.`}
			</p>

			{#if !$isAuthenticated}
				<div class="auth-actions">
					<a href="/auth/signin" class="signin-link">Sign In</a>
				</div>
			{:else if requireRole}
				<div class="auth-actions">
					<p class="role-info">
						Your current role: <strong>{$user?.role || 'unknown'}</strong>
					</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.auth-guard-message {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
		padding: 2rem;
	}

	.message-content {
		text-align: center;
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		padding: 3rem;
		max-width: 500px;
	}

	.message-content h3 {
		margin: 0 0 1rem 0;
		color: #dc3545;
		font-size: 1.5rem;
	}

	.message-content p {
		margin: 0 0 2rem 0;
		color: #666;
		line-height: 1.5;
	}

	.auth-actions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
	}

	.signin-link {
		padding: 0.75rem 1.5rem;
		background: #007bff;
		color: white;
		text-decoration: none;
		border-radius: 6px;
		font-weight: 500;
		transition: background-color 0.2s;
	}

	.signin-link:hover {
		background: #0056b3;
	}

	.role-info {
		font-size: 0.9rem;
		color: #666;
		margin: 0;
	}

	.role-info strong {
		color: #333;
	}
</style>