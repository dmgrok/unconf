import { redirect, type Handle } from '@sveltejs/kit';

// Role hierarchy for permission checking
export const ROLE_HIERARCHY = {
  'guest': 1,
  'user': 2,
  'participant': 2, // Same as user
  'organizer': 3,
  'admin': 4
} as const;

export type UserRole = keyof typeof ROLE_HIERARCHY;

// Route protection configuration
export interface RouteProtection {
  requireAuth?: boolean;
  requiredRole?: UserRole;
  allowGuests?: boolean;
  redirectTo?: string;
}

// Protected routes configuration
export const PROTECTED_ROUTES: Record<string, RouteProtection> = {
  // Admin routes
  '/admin': {
    requireAuth: true,
    requiredRole: 'admin',
    redirectTo: '/auth/signin'
  },
  '/admin/*': {
    requireAuth: true,
    requiredRole: 'admin',
    redirectTo: '/auth/signin'
  },

  // Organizer routes
  '/events/create': {
    requireAuth: true,
    requiredRole: 'organizer',
    redirectTo: '/auth/signin'
  },
  '/events/*/manage': {
    requireAuth: true,
    requiredRole: 'organizer',
    redirectTo: '/auth/signin'
  },

  // User routes (participants can access)
  '/profile': {
    requireAuth: true,
    requiredRole: 'user',
    allowGuests: false,
    redirectTo: '/auth/signin'
  },
  '/events/*/join': {
    requireAuth: false, // Changed from true - allow guests to join
    allowGuests: true, // Guests can join events
  },

  // Public routes (no protection needed)
  '/': {},
  '/about': {},
  '/join': {}, // Guest join page
  '/events': {},
  '/events/*': { allowGuests: true },
  '/auth/*': {}, // Auth pages (error, recovery)
  '/signin': {}, // Custom signin page
  '/docs': {},
  '/docs/*': {},
};

// Check if user has required role
export function hasRequiredRole(userRole: UserRole | null, requiredRole: UserRole): boolean {
  if (!userRole || !requiredRole) return false;

  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

// Check if route is protected
export function isRouteProtected(pathname: string): RouteProtection | null {
  // Direct match first
  if (PROTECTED_ROUTES[pathname]) {
    return PROTECTED_ROUTES[pathname];
  }

  // Check wildcard matches
  for (const [route, protection] of Object.entries(PROTECTED_ROUTES)) {
    if (route.endsWith('/*')) {
      const baseRoute = route.slice(0, -2);
      if (pathname.startsWith(baseRoute)) {
        return protection;
      }
    }

    // Handle dynamic segments like /events/*/manage
    if (route.includes('*')) {
      const routeRegex = new RegExp('^' + route.replace(/\*/g, '[^/]+') + '$');
      if (routeRegex.test(pathname)) {
        return protection;
      }
    }
  }

  return null;
}

// Main authorization middleware
export const authMiddleware: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  // Get session from locals (set by SvelteKitAuth)
  const session = await event.locals.getSession?.();
  const user = session?.user;

  // Check if route is protected
  const protection = isRouteProtected(pathname);

  if (protection) {
    const {
      requireAuth = false,
      requiredRole,
      allowGuests = false,
      redirectTo = '/auth/signin'
    } = protection;

    // Check authentication requirement
    if (requireAuth && !user) {
      throw redirect(302, `${redirectTo}?callbackUrl=${encodeURIComponent(pathname)}`);
    }

    // Check role requirement
    if (requiredRole && user) {
      const userRole = user.role as UserRole;

      // Special case for guests
      if (user.isGuest && !allowGuests) {
        throw redirect(302, `${redirectTo}?callbackUrl=${encodeURIComponent(pathname)}&error=insufficient_permissions`);
      }

      // Check role hierarchy
      if (!hasRequiredRole(userRole, requiredRole)) {
        throw redirect(302, `${redirectTo}?callbackUrl=${encodeURIComponent(pathname)}&error=insufficient_permissions`);
      }
    }
  }

  // Add user info to locals for easy access in load functions
  event.locals.user = user ? {
    id: user.id!,
    name: user.name ?? null,
    email: user.email ?? null,
    role: (user.role as UserRole) || 'user',
    isGuest: user.isGuest || false,
    sessionId: user.sessionId
  } : null;

  return resolve(event);
};

// Utility functions for use in load functions and components
export const authUtils = {
  // Check if user can access a specific action
  canUserPerformAction: (userRole: UserRole | null, action: string): boolean => {
    if (!userRole) return false;

    const actionRequirements: Record<string, UserRole> = {
      'create_event': 'organizer',
      'manage_event': 'organizer',
      'delete_event': 'admin',
      'manage_users': 'admin',
      'create_topic': 'user',
      'vote': 'user',
      'join_event': 'guest', // Even guests can join
      'comment': 'user',
      'moderate': 'organizer'
    };

    const requiredRole = actionRequirements[action];
    if (!requiredRole) return false;

    return hasRequiredRole(userRole, requiredRole);
  },

  // Get user permissions based on role
  getUserPermissions: (userRole: UserRole | null) => {
    if (!userRole) return {};

    const basePermissions = {
      canView: true,
      canJoinEvents: true
    };

    const rolePermissions = {
      guest: {
        ...basePermissions,
        canVote: true,
        canComment: false,
        canCreateContent: false
      },
      user: {
        ...basePermissions,
        canVote: true,
        canComment: true,
        canCreateContent: true,
        canCreateTopics: true
      },
      participant: {
        ...basePermissions,
        canVote: true,
        canComment: true,
        canCreateContent: true,
        canCreateTopics: true
      },
      organizer: {
        ...basePermissions,
        canVote: true,
        canComment: true,
        canCreateContent: true,
        canCreateTopics: true,
        canCreateEvents: true,
        canManageEvents: true,
        canModerate: true
      },
      admin: {
        ...basePermissions,
        canVote: true,
        canComment: true,
        canCreateContent: true,
        canCreateTopics: true,
        canCreateEvents: true,
        canManageEvents: true,
        canModerate: true,
        canManageUsers: true,
        canDeleteContent: true,
        canAccessAdmin: true
      }
    };

    return rolePermissions[userRole] || basePermissions;
  },

  // Validate route access for a user
  validateRouteAccess: (pathname: string, userRole: UserRole | null, isGuest: boolean = false) => {
    const protection = isRouteProtected(pathname);

    if (!protection) return { allowed: true };

    const {
      requireAuth = false,
      requiredRole,
      allowGuests = false
    } = protection;

    // Check authentication
    if (requireAuth && !userRole) {
      return { allowed: false, reason: 'authentication_required' };
    }

    // Check guest access
    if (isGuest && !allowGuests && requiredRole && ROLE_HIERARCHY[requiredRole] > ROLE_HIERARCHY.guest) {
      return { allowed: false, reason: 'guest_access_denied' };
    }

    // Check role requirement
    if (requiredRole && userRole && !hasRequiredRole(userRole, requiredRole)) {
      return { allowed: false, reason: 'insufficient_role', requiredRole };
    }

    return { allowed: true };
  }
};