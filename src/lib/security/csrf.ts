import { browser } from '$app/environment';
import { randomBytes, createHmac } from 'crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

/**
 * CSRF Protection Implementation using SvelteKit's built-in CSRF + custom validation
 *
 * This module provides enhanced CSRF protection by:
 * 1. Leveraging SvelteKit's built-in CSRF protection
 * 2. Adding custom token validation for API endpoints
 * 3. Providing utilities for form token generation and validation
 */

export const CSRF_CONFIG = {
  tokenLength: 32,
  tokenHeader: 'x-csrf-token',
  cookieName: '__csrf-token',
  tokenLifetime: 60 * 60 * 1000, // 1 hour
  secret: process.env.CSRF_SECRET || 'unconf-csrf-secret-key'
};

export interface CSRFToken {
  value: string;
  timestamp: number;
  signature: string;
}

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): CSRFToken {
  const value = randomBytes(CSRF_CONFIG.tokenLength).toString('hex');
  const timestamp = Date.now();

  // Create HMAC signature to prevent token tampering
  const signature = createHmac('sha256', CSRF_CONFIG.secret)
    .update(`${value}:${timestamp}`)
    .digest('hex');

  return {
    value,
    timestamp,
    signature
  };
}

/**
 * Validate CSRF token signature and timestamp
 */
export function validateCSRFToken(token: CSRFToken): boolean {
  // Check if token is expired
  if (Date.now() - token.timestamp > CSRF_CONFIG.tokenLifetime) {
    return false;
  }

  // Verify signature
  const expectedSignature = createHmac('sha256', CSRF_CONFIG.secret)
    .update(`${token.value}:${token.timestamp}`)
    .digest('hex');

  return token.signature === expectedSignature;
}

/**
 * Extract CSRF token from request headers or body
 */
export function extractCSRFToken(event: RequestEvent): string | null {
  // Try header first
  let token = event.request.headers.get(CSRF_CONFIG.tokenHeader);

  if (!token) {
    // Try form data
    const url = new URL(event.request.url);
    token = url.searchParams.get('csrf_token');
  }

  return token;
}

/**
 * CSRF validation middleware for API endpoints
 */
export async function validateCSRF(event: RequestEvent): Promise<void> {
  const { request, url } = event;

  // Only validate non-GET requests
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return;
  }

  // Skip validation for certain endpoints (like health checks, CSP reports, auth)
  // Also skip for public/anonymous endpoints that don't require session protection
  const skipPaths = [
    '/api/health', 
    '/api/websocket', 
    '/api/csp-report', 
    '/auth',
    '/api/tools/poll'  // Standalone poll is public/anonymous, no session to protect
  ];

  // Development mode: Skip CSRF for all /api endpoints
  if (process.env.NODE_ENV === 'development' && url.pathname.startsWith('/api')) {
    return;
  }

  if (skipPaths.some(path => url.pathname.startsWith(path))) {
    return;
  }

  const tokenString = extractCSRFToken(event);

  if (!tokenString) {
    throw error(403, 'CSRF token missing');
  }

  try {
    const token: CSRFToken = JSON.parse(tokenString);

    if (!validateCSRFToken(token)) {
      throw error(403, 'Invalid or expired CSRF token');
    }
  } catch (e) {
    throw error(403, 'Malformed CSRF token');
  }
}

/**
 * Client-side CSRF token management
 */
export class CSRFManager {
  private static instance: CSRFManager;
  private currentToken: CSRFToken | null = null;

  static getInstance(): CSRFManager {
    if (!CSRFManager.instance) {
      CSRFManager.instance = new CSRFManager();
    }
    return CSRFManager.instance;
  }

  /**
   * Get current CSRF token, generating new one if needed
   */
  async getToken(): Promise<string> {
    if (!browser) {
      return ''; // Server-side, token will be added by server
    }

    // Check if current token is still valid
    if (this.currentToken && this.isTokenValid(this.currentToken)) {
      return JSON.stringify(this.currentToken);
    }

    // Fetch new token from server
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      this.currentToken = await response.json();
      return JSON.stringify(this.currentToken);
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      throw error;
    }
  }

  /**
   * Add CSRF token to form data
   */
  async addToFormData(formData: FormData): Promise<void> {
    const token = await this.getToken();
    formData.append('csrf_token', token);
  }

  /**
   * Add CSRF token to request headers
   */
  async addToHeaders(headers: Record<string, string>): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      ...headers,
      [CSRF_CONFIG.tokenHeader]: token
    };
  }

  /**
   * Create fetch wrapper with automatic CSRF token inclusion
   */
  async secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const method = options.method || 'GET';

    // Only add CSRF token for state-changing requests
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
      const token = await this.getToken();

      options.headers = {
        ...options.headers,
        [CSRF_CONFIG.tokenHeader]: token
      };
    }

    options.credentials = options.credentials || 'same-origin';

    return fetch(url, options);
  }

  private isTokenValid(token: CSRFToken): boolean {
    return Date.now() - token.timestamp < CSRF_CONFIG.tokenLifetime;
  }
}

/**
 * Form action helper for CSRF protection
 */
export function createSecureFormAction(action: string): string {
  if (!browser) return action;

  // For client-side, we'll add token via JavaScript
  return action;
}

/**
 * Svelte action for automatic CSRF token injection in forms
 */
export function csrfProtected(node: HTMLFormElement) {
  const csrfManager = CSRFManager.getInstance();

  async function addTokenToForm() {
    // Remove existing token if any
    const existingToken = node.querySelector('input[name="csrf_token"]');
    if (existingToken) {
      existingToken.remove();
    }

    // Add new token
    const token = await csrfManager.getToken();
    const tokenInput = document.createElement('input');
    tokenInput.type = 'hidden';
    tokenInput.name = 'csrf_token';
    tokenInput.value = token;
    node.appendChild(tokenInput);
  }

  async function handleSubmit(event: SubmitEvent) {
    try {
      await addTokenToForm();
    } catch (error) {
      console.error('Failed to add CSRF token:', error);
      event.preventDefault();
      alert('Security error: Please try again');
    }
  }

  // Add token when form is created
  addTokenToForm().catch(console.error);

  // Add token before each submission
  node.addEventListener('submit', handleSubmit);

  return {
    destroy() {
      node.removeEventListener('submit', handleSubmit);
    }
  };
}

// Export singleton instance
export const csrfManager = CSRFManager.getInstance();