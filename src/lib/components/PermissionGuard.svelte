<script lang="ts">
	import { user } from '$lib/stores/auth';
	import { authUtils } from '$lib/auth/middleware';
	import type { UserRole } from '$lib/auth/middleware';

	interface Props {
		children?: any;
		action: string;
		fallback?: any;
		showMessage?: boolean;
	}

	let {
		children,
		action,
		fallback,
		showMessage = false
	}: Props = $props();

	let canPerformAction = $derived(() => {
		if (!$user) return false;
		return authUtils.canUserPerformAction($user.role as UserRole, action);
	});

	let permissionMessage = $derived(() => {
		const actionMessages: Record<string, string> = {
			'create_event': 'You need organizer privileges to create events.',
			'manage_event': 'You need organizer privileges to manage events.',
			'delete_event': 'You need admin privileges to delete events.',
			'manage_users': 'You need admin privileges to manage users.',
			'create_topic': 'You need user privileges to create topics.',
			'vote': 'You need user privileges to vote.',
			'comment': 'You need user privileges to comment.',
			'moderate': 'You need organizer privileges to moderate content.'
		};

		return actionMessages[action] || `You don't have permission to ${action.replace('_', ' ')}.`;
	});
</script>

{#if canPerformAction()}
	{@render children?.()}
{:else if fallback}
	{@render fallback()}
{:else if showMessage}
	<div class="permission-message">
		<p>{permissionMessage()}</p>
		{#if !$user}
			<a href="/auth/signin" class="signin-link">Sign In</a>
		{:else}
			<p class="role-info">Your current role: <strong>{$user.role}</strong></p>
		{/if}
	</div>
{/if}

<style>
	.permission-message {
		padding: 1rem;
		background: #fff3cd;
		border: 1px solid #ffeaa7;
		border-radius: 4px;
		margin: 1rem 0;
		text-align: center;
	}

	.permission-message p {
		margin: 0 0 1rem 0;
		color: #856404;
	}

	.signin-link {
		color: #007bff;
		text-decoration: none;
		font-weight: 500;
	}

	.signin-link:hover {
		text-decoration: underline;
	}

	.role-info {
		font-size: 0.9rem;
		color: #6c757d;
		margin: 0.5rem 0 0 0;
	}

	.role-info strong {
		color: #495057;
	}
</style>