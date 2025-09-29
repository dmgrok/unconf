import { writable, derived, type Readable, get } from 'svelte/store';
import { page } from '$app/stores';
import { browser } from '$app/environment';
import type { Session } from '@auth/sveltekit';
import { sessionManager as authSessionManager } from '$lib/auth/session';

// Types for our authentication state
export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  sessionId?: string;
  isGuest: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGuest: boolean;
  role: string | null;
}

// Create the main auth store
const createAuthStore = () => {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isGuest: false,
    role: null
  });

  return {
    subscribe,

    // Initialize auth state from session data
    initialize: (session: Session | null) => {
      if (session?.user) {
        const user: AuthUser = {
          id: session.user.id!,
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          image: session.user.image ?? null,
          role: session.user.role ?? 'user',
          sessionId: session.user.sessionId ?? undefined,
          isGuest: session.user.isGuest ?? false
        };

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          isGuest: user.isGuest,
          role: user.role
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isGuest: false,
          role: null
        });
      }
    },

    // Update loading state
    setLoading: (loading: boolean) => {
      update(state => ({ ...state, isLoading: loading }));
    },

    // Clear auth state (on logout)
    clear: () => {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isGuest: false,
        role: null
      });
    },

    // Update user data
    updateUser: (userData: Partial<AuthUser>) => {
      update(state => {
        if (state.user) {
          const updatedUser = { ...state.user, ...userData };
          return {
            ...state,
            user: updatedUser,
            isGuest: updatedUser.isGuest,
            role: updatedUser.role
          };
        }
        return state;
      });
    }
  };
};

export const auth = createAuthStore();

// Derived stores for common use cases
export const user: Readable<AuthUser | null> = derived(
  auth,
  $auth => $auth.user
);

export const isAuthenticated: Readable<boolean> = derived(
  auth,
  $auth => $auth.isAuthenticated
);

export const isGuest: Readable<boolean> = derived(
  auth,
  $auth => $auth.isGuest
);

export const userRole: Readable<string | null> = derived(
  auth,
  $auth => $auth.role
);

export const isLoading: Readable<boolean> = derived(
  auth,
  $auth => $auth.isLoading
);

// Permission checking utilities
export const hasRole = derived(
  [auth],
  ([$auth]) => (role: string) => $auth.role === role
);

export const hasAnyRole = derived(
  [auth],
  ([$auth]) => (roles: string[]) => $auth.role ? roles.includes($auth.role) : false
);

export const canAccess = derived(
  [auth],
  ([$auth]) => (requiredRole: string) => {
    if (!$auth.isAuthenticated) return false;

    // Role hierarchy: guest < user < organizer < admin
    const roleHierarchy = {
      'guest': 1,
      'user': 2,
      'participant': 2, // Same as user
      'organizer': 3,
      'admin': 4
    };

    const userLevel = roleHierarchy[$auth.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userLevel >= requiredLevel;
  }
);

let legacyInitialized = false;
let cachedUser: AuthUser | null = null;

export const authStore = {
  async initialize(): Promise<void> {
    if (legacyInitialized) {
      return;
    }

    try {
      if (browser) {
  const session = authSessionManager.loadSession();
        if (session?.user) {
          const sessionUser = session.user as Partial<AuthUser> & { id: string };
          cachedUser = {
            id: sessionUser.id,
            name: sessionUser.name ?? null,
            email: sessionUser.email ?? null,
            image: sessionUser.image ?? null,
            role: (sessionUser.role as string) || 'guest',
            sessionId: sessionUser.sessionId,
            isGuest: Boolean(sessionUser.isGuest)
          };
        } else {
          cachedUser = null;
        }
      } else {
        cachedUser = get(auth).user;
      }
    } catch (error) {
      console.error('authStore.initialize failed:', error);
      cachedUser = get(auth).user ?? null;
    } finally {
      legacyInitialized = true;
    }
  },
  getUser(): AuthUser | null {
    if (!cachedUser) {
      cachedUser = get(auth).user ?? null;
    }
    return cachedUser;
  },
  getState(): AuthState {
    return get(auth);
  },
  isAuthenticated(): boolean {
    return !!this.getUser();
  },
  reset(): void {
    cachedUser = null;
    legacyInitialized = false;
    auth.clear();
  }
};

// Session persistence utilities (for browser only)
if (browser) {
  // Auto-initialize from page data when available
  page.subscribe(($page) => {
    if ($page.data && 'session' in $page.data) {
      auth.initialize(($page.data.session as Session | null) ?? null);
    }
  });
}

// Helper functions for session management
export const sessionManager = {
  // Check if user session is valid
  isSessionValid: (user: AuthUser | null): boolean => {
    if (!user) return false;
    if (user.isGuest && user.sessionId) {
      // For guests, we could add more sophisticated validation here
      return true;
    }
    return true; // For OAuth users, Auth.js handles validation
  },

  // Get session metadata
  getSessionInfo: (user: AuthUser | null) => {
    if (!user) return null;

    return {
      userId: user.id,
      userType: user.isGuest ? 'guest' : 'authenticated',
      role: user.role,
      sessionId: user.sessionId,
      canCreateContent: user.role !== 'guest',
      canVote: true, // All users can vote
      canManageEvents: ['organizer', 'admin'].includes(user.role)
    };
  },

  // Refresh session (for guests)
  refreshGuestSession: async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          auth.updateUser(data.user);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to refresh guest session:', error);
      return false;
    }
  }
};