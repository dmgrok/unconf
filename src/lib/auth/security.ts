import { browser } from '$app/environment';
import type { AuthUser } from '$lib/stores/auth';

// Security configuration
export const SECURITY_CONFIG = {
  maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
  sessionWarningThreshold: 5 * 60 * 1000, // Warn 5 minutes before expiry
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  csrfTokenLength: 32,
  sessionIdLength: 32,
  inactivityTimeout: 30 * 60 * 1000, // 30 minutes
  enableDeviceTracking: true,
  enableGeoLocation: false, // Disabled for privacy
};

// Device fingerprinting for additional security
export class DeviceFingerprinter {
  private static instance: DeviceFingerprinter;

  static getInstance(): DeviceFingerprinter {
    if (!DeviceFingerprinter.instance) {
      DeviceFingerprinter.instance = new DeviceFingerprinter();
    }
    return DeviceFingerprinter.instance;
  }

  // Generate a device fingerprint
  generateFingerprint(): string {
    if (!browser) return 'server-side';

    const components = [
      navigator.userAgent || '',
      navigator.language || '',
      screen.width + 'x' + screen.height || '',
      new Date().getTimezoneOffset().toString() || '',
      navigator.platform || '',
      navigator.cookieEnabled ? '1' : '0',
      navigator.doNotTrack || '',
    ];

    // Simple hash function (for fingerprinting, not cryptographic security)
    let hash = 0;
    const combined = components.join('|');

    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(36);
  }

  // Check if device fingerprint matches
  verifyFingerprint(stored: string): boolean {
    if (!browser || !stored) return true; // Skip verification on server or if no stored fingerprint

    const current = this.generateFingerprint();
    return current === stored;
  }
}

// Session security manager
export class SessionSecurity {
  private static instance: SessionSecurity;
  private inactivityTimer: number | null = null;
  private lastActivity: number = Date.now();

  static getInstance(): SessionSecurity {
    if (!SessionSecurity.instance) {
      SessionSecurity.instance = new SessionSecurity();
    }
    return SessionSecurity.instance;
  }

  // Generate a secure random string
  generateSecureToken(length: number = 32): string {
    if (!browser) {
      // Server-side fallback
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }

    // Browser crypto API
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(36).padStart(2, '0')).join('').substring(0, length);
  }

  // Generate CSRF token
  generateCSRFToken(): string {
    const token = this.generateSecureToken(SECURITY_CONFIG.csrfTokenLength);
    if (browser) {
      localStorage.setItem('csrf_token', token);
    }
    return token;
  }

  // Verify CSRF token
  verifyCSRFToken(token: string): boolean {
    if (!browser) return true; // Skip CSRF verification on server

    const stored = localStorage.getItem('csrf_token');
    return stored === token;
  }

  // Track user activity for session timeout
  updateActivity(): void {
    this.lastActivity = Date.now();

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    // Set inactivity timer
    this.inactivityTimer = window.setTimeout(() => {
      this.handleInactivityTimeout();
    }, SECURITY_CONFIG.inactivityTimeout);
  }

  // Handle inactivity timeout
  private handleInactivityTimeout(): void {
    // Dispatch custom event for inactivity
    if (browser) {
      window.dispatchEvent(new CustomEvent('session-inactive', {
        detail: { lastActivity: this.lastActivity }
      }));
    }
  }

  // Get time until inactivity timeout
  getTimeUntilTimeout(): number {
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, SECURITY_CONFIG.inactivityTimeout - elapsed);
  }

  // Check if session is about to expire
  isSessionExpiring(expiresAt: number): boolean {
    const timeRemaining = expiresAt - Date.now();
    return timeRemaining <= SECURITY_CONFIG.sessionWarningThreshold;
  }

  // Validate session integrity
  validateSession(sessionData: any): { valid: boolean; reason?: string } {
    if (!sessionData) {
      return { valid: false, reason: 'no_session' };
    }

    // Check expiration
    if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
      return { valid: false, reason: 'expired' };
    }

    // Check device fingerprint if enabled
    if (SECURITY_CONFIG.enableDeviceTracking && sessionData.deviceFingerprint) {
      const fingerprinter = DeviceFingerprinter.getInstance();
      if (!fingerprinter.verifyFingerprint(sessionData.deviceFingerprint)) {
        return { valid: false, reason: 'device_mismatch' };
      }
    }

    // Check for required fields
    if (!sessionData.user || !sessionData.user.id) {
      return { valid: false, reason: 'invalid_user' };
    }

    return { valid: true };
  }

  // Clean up on logout
  cleanup(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    if (browser) {
      localStorage.removeItem('csrf_token');
    }
  }
}

// Rate limiting for authentication attempts
export class RateLimiter {
  private static instance: RateLimiter;
  private attempts: Map<string, { count: number; lastAttempt: number; lockedUntil?: number }> = new Map();

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  // Check if IP/user is rate limited
  isRateLimited(identifier: string): boolean {
    const record = this.attempts.get(identifier);

    if (!record) return false;

    // Check if still locked out
    if (record.lockedUntil && Date.now() < record.lockedUntil) {
      return true;
    }

    // Reset if lockout period has passed
    if (record.lockedUntil && Date.now() >= record.lockedUntil) {
      this.attempts.delete(identifier);
      return false;
    }

    return false;
  }

  // Record a failed attempt
  recordFailedAttempt(identifier: string): void {
    const now = Date.now();
    const record = this.attempts.get(identifier) || { count: 0, lastAttempt: 0 };

    // Reset count if last attempt was more than lockout duration ago
    if (now - record.lastAttempt > SECURITY_CONFIG.lockoutDuration) {
      record.count = 0;
    }

    record.count++;
    record.lastAttempt = now;

    // Lock if too many attempts
    if (record.count >= SECURITY_CONFIG.maxFailedAttempts) {
      record.lockedUntil = now + SECURITY_CONFIG.lockoutDuration;
    }

    this.attempts.set(identifier, record);
  }

  // Record a successful attempt (clears the record)
  recordSuccessfulAttempt(identifier: string): void {
    this.attempts.delete(identifier);
  }

  // Get remaining lockout time
  getRemainingLockoutTime(identifier: string): number {
    const record = this.attempts.get(identifier);

    if (!record?.lockedUntil) return 0;

    return Math.max(0, record.lockedUntil - Date.now());
  }
}

// Enhanced session data with security features
export interface SecureSessionData {
  user: AuthUser;
  expiresAt: number;
  createdAt: number;
  lastRefreshed: number;
  deviceFingerprint?: string;
  csrfToken: string;
  sessionId: string;
  lastActivity: number;
  ipAddress?: string;
  userAgent?: string;
}

// Secure session manager
export class SecureSessionManager {
  private static instance: SecureSessionManager;
  private security = SessionSecurity.getInstance();
  private fingerprinter = DeviceFingerprinter.getInstance();

  static getInstance(): SecureSessionManager {
    if (!SecureSessionManager.instance) {
      SecureSessionManager.instance = new SecureSessionManager();
    }
    return SecureSessionManager.instance;
  }

  // Create a secure session
  createSession(user: AuthUser, additionalData?: Partial<SecureSessionData>): SecureSessionData {
    const now = Date.now();

    return {
      user,
      expiresAt: now + SECURITY_CONFIG.maxSessionDuration,
      createdAt: now,
      lastRefreshed: now,
      lastActivity: now,
      deviceFingerprint: SECURITY_CONFIG.enableDeviceTracking ? this.fingerprinter.generateFingerprint() : undefined,
      csrfToken: this.security.generateCSRFToken(),
      sessionId: this.security.generateSecureToken(SECURITY_CONFIG.sessionIdLength),
      ...additionalData
    };
  }

  // Validate and refresh session
  refreshSession(sessionData: SecureSessionData): SecureSessionData | null {
    const validation = this.security.validateSession(sessionData);

    if (!validation.valid) {
      console.warn('Session validation failed:', validation.reason);
      return null;
    }

    const now = Date.now();

    return {
      ...sessionData,
      lastRefreshed: now,
      lastActivity: now,
      expiresAt: now + SECURITY_CONFIG.maxSessionDuration
    };
  }

  // Get session security status
  getSecurityStatus(sessionData: SecureSessionData): {
    isValid: boolean;
    isExpiring: boolean;
    timeRemaining: number;
    inactivityTimeRemaining: number;
    needsRefresh: boolean;
  } {
    const validation = this.security.validateSession(sessionData);
    const timeRemaining = Math.max(0, sessionData.expiresAt - Date.now());
    const isExpiring = this.security.isSessionExpiring(sessionData.expiresAt);
    const inactivityTimeRemaining = this.security.getTimeUntilTimeout();
    const needsRefresh = timeRemaining < SECURITY_CONFIG.sessionWarningThreshold;

    return {
      isValid: validation.valid,
      isExpiring,
      timeRemaining,
      inactivityTimeRemaining,
      needsRefresh
    };
  }

  // Clean up session
  destroySession(): void {
    this.security.cleanup();

    if (browser) {
      localStorage.removeItem('unconf_session');
      localStorage.removeItem('unconf_session_expiry');
      localStorage.removeItem('csrf_token');
    }
  }
}

// Export singleton instances
export const sessionSecurity = SessionSecurity.getInstance();
export const rateLimiter = RateLimiter.getInstance();
export const secureSessionManager = SecureSessionManager.getInstance();
export const deviceFingerprinter = DeviceFingerprinter.getInstance();

// Security event listeners (for browser)
if (browser) {
  // Track user activity
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

  activityEvents.forEach(event => {
    document.addEventListener(event, () => {
      sessionSecurity.updateActivity();
    }, { passive: true });
  });

  // Handle visibility change (tab switching)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      sessionSecurity.updateActivity();
    }
  });

  // Handle session inactivity
  window.addEventListener('session-inactive', (event: any) => {
    console.warn('Session inactive for too long:', event.detail);
    // Could trigger a warning modal or auto-logout here
  });
}