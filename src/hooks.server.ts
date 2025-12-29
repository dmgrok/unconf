import { handle as authHandle } from './auth';
import { authMiddleware } from '$lib/auth/middleware';
import { validateCSRF } from '$lib/security/csrf';
// CSP disabled for development - TODO: Re-enable for production
// import { addCSPHeaders, cspNonceStore } from '$lib/security/csp';
import { cspNonceStore } from '$lib/security/csp';
import { rateLimitMiddleware } from '$lib/security/rateLimiting';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

// Rate limiting middleware
const rateLimitingMiddleware: Handle = async ({ event, resolve }) => {
  try {
    await rateLimitMiddleware(event);
  } catch (error) {
    // Rate limit errors are thrown as HTTP errors by rateLimitMiddleware
    throw error;
  }
  return resolve(event);
};

// CSRF protection middleware
const csrfMiddleware: Handle = async ({ event, resolve }) => {
  try {
    await validateCSRF(event);
  } catch (error) {
    // CSRF validation errors are thrown as HTTP errors by validateCSRF
    throw error;
  }
  return resolve(event);
};

// Security headers middleware
const securityMiddleware: Handle = async ({ event, resolve }) => {
  // Generate CSP nonce for this request
  const requestId = `${Date.now()}-${Math.random()}`;
  const nonce = cspNonceStore.generateNonce(requestId);

  // Add nonce to event locals for use in app.html
  event.locals.cspNonce = nonce;

  // Add CSP headers
  // DISABLED FOR DEVELOPMENT - TODO: Re-enable for production
  // addCSPHeaders(event, nonce);

  const response = await resolve(event);

  // Add comprehensive security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');

  // Add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Clean up nonce after response
  cspNonceStore.removeNonce(requestId);

  return response;
};

// Combine all middleware: auth, rate limiting, CSRF, authorization, and security headers
export const handle: Handle = sequence(authHandle, rateLimitingMiddleware, csrfMiddleware, authMiddleware, securityMiddleware);