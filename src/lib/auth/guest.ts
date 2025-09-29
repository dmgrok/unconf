import jwt from 'jsonwebtoken';
import { AUTH_SECRET } from '$env/static/private';

export interface GuestToken {
  id: string;
  role: 'guest';
  sessionId: string;
  createdAt: number;
  expiresAt: number;
}

export interface GuestUser {
  id: string;
  name: string;
  role: 'guest';
  sessionId: string;
  isGuest: true;
}

// Generate a unique guest ID
function generateGuestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `guest_${timestamp}_${random}`;
}

// Generate a unique session ID
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `session_${timestamp}_${random}`;
}

// Create a guest token
export function createGuestToken(): { token: string; user: GuestUser } {
  const guestId = generateGuestId();
  const sessionId = generateSessionId();
  const now = Date.now();
  const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

  const tokenPayload: GuestToken = {
    id: guestId,
    role: 'guest',
    sessionId,
    createdAt: now,
    expiresAt
  };

  const token = jwt.sign(tokenPayload, AUTH_SECRET, {
    expiresIn: '24h',
    issuer: 'unconf-app',
    subject: guestId
  });

  const user: GuestUser = {
    id: guestId,
    name: `Guest User`,
    role: 'guest',
    sessionId,
    isGuest: true
  };

  return { token, user };
}

// Verify and decode a guest token
export function verifyGuestToken(token: string): GuestToken | null {
  try {
    const decoded = jwt.verify(token, AUTH_SECRET, {
      issuer: 'unconf-app'
    }) as GuestToken;

    // Check if token is expired
    if (decoded.expiresAt && Date.now() > decoded.expiresAt) {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Guest token verification failed:', error);
    return null;
  }
}

// Create a guest user from a verified token
export function createGuestUserFromToken(tokenData: GuestToken): GuestUser {
  return {
    id: tokenData.id,
    name: `Guest User`,
    role: 'guest',
    sessionId: tokenData.sessionId,
    isGuest: true
  };
}

// Refresh a guest token (extend expiration)
export function refreshGuestToken(currentToken: string): { token: string; user: GuestUser } | null {
  const tokenData = verifyGuestToken(currentToken);
  if (!tokenData) {
    return null;
  }

  // Create new token with extended expiration
  const now = Date.now();
  const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

  const newTokenPayload: GuestToken = {
    ...tokenData,
    expiresAt
  };

  const token = jwt.sign(newTokenPayload, AUTH_SECRET, {
    expiresIn: '24h',
    issuer: 'unconf-app',
    subject: tokenData.id
  });

  const user = createGuestUserFromToken(newTokenPayload);

  return { token, user };
}