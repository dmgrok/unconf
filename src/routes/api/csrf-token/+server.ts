import { json } from '@sveltejs/kit';
import { generateCSRFToken } from '$lib/security/csrf';
import type { RequestHandler } from './$types';

/**
 * CSRF Token endpoint
 *
 * Provides fresh CSRF tokens for client-side requests.
 * These tokens are used in addition to SvelteKit's built-in CSRF protection.
 */
export const GET: RequestHandler = async () => {
  try {
    const token = generateCSRFToken();

    return json(token, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Failed to generate CSRF token:', error);
    return json({ error: 'Failed to generate token' }, { status: 500 });
  }
};