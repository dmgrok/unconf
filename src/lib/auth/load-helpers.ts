import { redirect, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { authUtils, type UserRole } from './middleware';
import { UserRole as UserRoleEnum } from '../../types/enums';

// Helper for requiring authentication in load functions
export function requireAuth(event: RequestEvent, redirectTo: string = '/auth/signin') {
  if (!event.locals.user) {
    const callbackUrl = encodeURIComponent(event.url.pathname + event.url.search);
    throw redirect(302, `${redirectTo}?callbackUrl=${callbackUrl}`);
  }
  return event.locals.user;
}

// Helper for requiring specific role in load functions
export function requireRole(
  event: RequestEvent,
  requiredRole: UserRole,
  options: {
    allowGuests?: boolean;
    redirectTo?: string;
    errorMessage?: string;
  } = {}
) {
  const user = requireAuth(event, options.redirectTo);

  const {
    allowGuests = false,
    redirectTo = '/auth/signin',
    errorMessage = 'Insufficient permissions'
  } = options;

  // Check guest access
  if (user.isGuest && !allowGuests) {
    throw error(403, errorMessage);
  }

  // Check role hierarchy
  const roleHierarchy = {
    'guest': 1,
    'user': 2,
    'participant': 2,
    'organizer': 3,
    'admin': 4
  };

  const userLevel = roleHierarchy[user.role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  if (userLevel < requiredLevel) {
    throw error(403, errorMessage);
  }

  return user;
}

// Helper for checking action permissions in load functions
export function requireAction(
  event: RequestEvent,
  action: string,
  options: {
    redirectTo?: string;
    errorMessage?: string;
  } = {}
) {
  const user = requireAuth(event, options.redirectTo);

  const {
    errorMessage = `You don't have permission to ${action.replace('_', ' ')}`
  } = options;

  if (!authUtils.canUserPerformAction(user.role, action)) {
    throw error(403, errorMessage);
  }

  return user;
}

// Helper to get user permissions for use in load functions
export function getUserPermissions(event: RequestEvent) {
  const user = event.locals.user;
  if (!user) {
    return authUtils.getUserPermissions(null);
  }

  return {
    user,
    permissions: authUtils.getUserPermissions(user.role),
    canPerformAction: (action: string) => authUtils.canUserPerformAction(user.role, action)
  };
}

// Helper for optional auth (doesn't redirect if not authenticated)
export function getOptionalUser(event: RequestEvent) {
  return {
    user: event.locals.user,
    isAuthenticated: !!event.locals.user,
    permissions: event.locals.user ? authUtils.getUserPermissions(event.locals.user.role) : null
  };
}

// Helper to check if user owns a resource
export function requireOwnership(
  event: RequestEvent,
  resourceUserId: string,
  options: {
    allowAdmins?: boolean;
    allowOrganizers?: boolean;
    errorMessage?: string;
  } = {}
) {
  const user = requireAuth(event);

  const {
    allowAdmins = true,
    allowOrganizers = false,
    errorMessage = 'You can only access your own resources'
  } = options;

  // Check if user owns the resource
  if (user.id === resourceUserId) {
    return user;
  }

  // Check admin override
  if (allowAdmins && user.role === UserRoleEnum.ADMIN) {
    return user;
  }

  // Check organizer override
  if (allowOrganizers && user.role === UserRoleEnum.ORGANIZER) {
    return user;
  }

  throw error(403, errorMessage);
}

// Utility to create protected load functions
export function createProtectedLoad<T = any>(
  protection: {
    requireAuth?: boolean;
    requiredRole?: UserRole;
    requiredAction?: string;
    allowGuests?: boolean;
  },
  loadFn?: (event: RequestEvent & { user: NonNullable<RequestEvent['locals']['user']> }) => T
) {
  return async (event: RequestEvent) => {
    let user: NonNullable<RequestEvent['locals']['user']> | null = null;

    if (protection.requireAuth) {
      user = requireAuth(event);
    }

    if (protection.requiredRole) {
      user = requireRole(event, protection.requiredRole, {
        allowGuests: protection.allowGuests
      });
    }

    if (protection.requiredAction) {
      user = requireAction(event, protection.requiredAction);
    }

    if (loadFn) {
      return loadFn({ ...event, user: user || event.locals.user! });
    }

    return {
      user: user || event.locals.user,
      permissions: authUtils.getUserPermissions(user?.role || null)
    };
  };
}

// Example usage patterns:
/*
// In a +page.server.ts or +layout.server.ts file:

// Require authentication
export const load = createProtectedLoad({ requireAuth: true });

// Require specific role
export const load = createProtectedLoad({
  requiredRole: 'organizer',
  allowGuests: false
});

// Require specific action permission
export const load = createProtectedLoad({
  requiredAction: 'create_event'
});

// Custom load function with protection
export const load = createProtectedLoad(
  { requireAuth: true },
  async ({ user, params }) => {
    // Your protected load logic here
    return {
      user,
      data: await fetchUserData(user.id)
    };
  }
);

// Manual protection in load functions
export const load: PageServerLoad = async (event) => {
  const user = requireRole(event, 'admin');

  return {
    user,
    adminData: await fetchAdminData()
  };
};
*/