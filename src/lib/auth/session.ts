import { browser } from '$app/environment';
import type { AuthUser } from '$lib/stores/auth';
import { secureSessionManager, type SecureSessionData, SECURITY_CONFIG } from './security';

// Session storage keys
const SESSION_STORAGE_KEY = 'unconf_session';
const SESSION_EXPIRY_KEY = 'unconf_session_expiry';

// Session configuration
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const REFRESH_THRESHOLD = 60 * 60 * 1000; // Refresh when < 1 hour remains

export type StoredSession = SecureSessionData;

export class SessionManager {
  private static instance: SessionManager;

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // Save session to browser storage
  saveSession(user: AuthUser): void {
    if (!browser) return;

    try {
      const session = secureSessionManager.createSession(user);

      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      localStorage.setItem(SESSION_EXPIRY_KEY, session.expiresAt.toString());
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  // Load session from browser storage
  loadSession(): StoredSession | null {
    if (!browser) return null;

    try {
      const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionData) return null;

      const session: StoredSession = JSON.parse(sessionData);

      // Check if session is expired
      if (this.isExpired(session)) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to load session:', error);
      this.clearSession();
      return null;
    }
  }

  // Check if session is expired
  isExpired(session: StoredSession): boolean {
    return Date.now() > session.expiresAt;
  }

  // Check if session needs refresh
  needsRefresh(session: StoredSession): boolean {
    const timeRemaining = session.expiresAt - Date.now();
    return timeRemaining < REFRESH_THRESHOLD;
  }

  // Refresh session expiration
  refreshSession(session: StoredSession): void {
    if (!browser) return;

    try {
      const refreshedSession = secureSessionManager.refreshSession(session);

      if (refreshedSession) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(refreshedSession));
        localStorage.setItem(SESSION_EXPIRY_KEY, refreshedSession.expiresAt.toString());
      } else {
        this.clearSession(); // Clear invalid session
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
    }
  }

  // Clear session from browser storage
  clearSession(): void {
    if (!browser) return;

    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(SESSION_EXPIRY_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  // Get session time remaining (in milliseconds)
  getTimeRemaining(session: StoredSession): number {
    return Math.max(0, session.expiresAt - Date.now());
  }

  // Get human-readable time remaining
  getTimeRemainingText(session: StoredSession): string {
    const remaining = this.getTimeRemaining(session);

    if (remaining === 0) return 'Expired';

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Validate session integrity
  validateSession(session: StoredSession): boolean {
    if (!session || !session.user) return false;
    if (this.isExpired(session)) return false;
    if (!session.user.id || !session.user.role) return false;

    // Additional validation for guest sessions
    if (session.user.isGuest && !session.user.sessionId) {
      return false;
    }

    return true;
  }

  // Get session metadata for debugging/monitoring
  getSessionMetadata(session: StoredSession | null): any {
    if (!session) return null;

    return {
      userId: session.user.id,
      userRole: session.user.role,
      isGuest: session.user.isGuest,
      sessionId: session.user.sessionId,
      createdAt: new Date(session.createdAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
      lastRefreshed: new Date(session.lastRefreshed).toISOString(),
      timeRemaining: this.getTimeRemainingText(session),
      needsRefresh: this.needsRefresh(session),
      isValid: this.validateSession(session)
    };
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();

// Utility functions
export const sessionUtils = {
  // Auto-refresh session if needed
  autoRefresh: async (session: StoredSession): Promise<boolean> => {
    if (!sessionManager.needsRefresh(session)) return true;

    try {
      if (session.user.isGuest) {
        // Refresh guest session via API
        const response = await fetch('/api/auth/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'refresh' })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            sessionManager.refreshSession(session);
            return true;
          }
        }
      } else {
        // For OAuth sessions, just extend the local session
        sessionManager.refreshSession(session);
        return true;
      }
    } catch (error) {
      console.error('Auto-refresh failed:', error);
    }

    return false;
  },

  // Monitor session and auto-refresh
  startSessionMonitoring: (callback?: (session: StoredSession | null) => void) => {
    if (!browser) return null;

    const checkInterval = 5 * 60 * 1000; // Check every 5 minutes

    const intervalId = setInterval(() => {
      const session = sessionManager.loadSession();

      if (session && sessionManager.validateSession(session)) {
        sessionUtils.autoRefresh(session);
        callback?.(session);
      } else {
        sessionManager.clearSession();
        callback?.(null);
      }
    }, checkInterval);

    return intervalId;
  },

  // Stop session monitoring
  stopSessionMonitoring: (intervalId: number) => {
    clearInterval(intervalId);
  }
};