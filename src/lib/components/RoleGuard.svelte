<script lang="ts">
	import { user, canAccess } from '$lib/stores/auth';
	import type { UserRole } from '$lib/auth/middleware';

	interface Props {
		children?: any;
		role?: UserRole;
		roles?: UserRole[];
		allowGuests?: boolean;
		fallback?: any;
		exact?: boolean;
	}

	let {
		children,
		role,
		roles = [],
		allowGuests = false,
		fallback,
		exact = false
	}: Props = $props();

	// Combine single role with roles array
	let requiredRoles = $derived(() => {
		if (role && !roles.includes(role)) {
			return [role, ...roles];
		}
		return roles;
	});

	let hasAccess = $derived(() => {
		if (!$user) return false;

		// Check guest access
		if ($user.isGuest && !allowGuests) {
			return false;
		}

		// If no roles specified, just check if user exists
		if (requiredRoles().length === 0) {
			return true;
		}

		// Check if user has any of the required roles
		if (exact) {
			// Exact match - user must have exactly one of the specified roles
			return requiredRoles().includes($user.role as UserRole);
		} else {
			// Hierarchy check - user must have at least the required level
			return requiredRoles().some(requiredRole => $canAccess(requiredRole));
		}
	});
</script>

{#if hasAccess()}
	{@render children?.()}
{:else if fallback}
	{@render fallback()}
{/if}