/**
 * Content Security Policy (CSP) Configuration
 *
 * This module provides CSP configuration for XSS protection by:
 * 1. Defining strict CSP policies for different environments
 * 2. Providing nonce generation for inline scripts/styles
 * 3. Configuring trusted sources for different resource types
 */

import { randomBytes } from 'crypto';
import type { RequestEvent } from '@sveltejs/kit';

export interface CSPConfig {
  'default-src': string[];
  'script-src': string[];
  'script-src-elem'?: string[];
  'style-src': string[];
  'style-src-elem'?: string[];
  'style-src-attr'?: string[];
  'img-src': string[];
  'font-src': string[];
  'connect-src': string[];
  'media-src': string[];
  'object-src': string[];
  'frame-src': string[];
  'worker-src': string[];
  'frame-ancestors': string[];
  'form-action': string[];
  'base-uri': string[];
  'report-uri'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}

// Development CSP - more permissive for development tools
const developmentCSP: CSPConfig = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Vite HMR
    "'unsafe-eval'", // Required for Vite dev server
    'localhost:*',
    '127.0.0.1:*',
    'ws://localhost:*',
    'ws://127.0.0.1:*'
  ],
  'script-src-elem': [
    "'self'",
    "'unsafe-inline'", // Required for inline scripts
    'localhost:*',
    '127.0.0.1:*'
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Svelte components
    'fonts.googleapis.com'
  ],
  'style-src-elem': [
    "'self'",
    "'unsafe-inline'", // Required for Svelte component <style> tags
    'fonts.googleapis.com'
  ],
  'style-src-attr': [
    "'unsafe-inline'" // Required for inline style attributes
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:',
    'http://localhost:*',
    'http://127.0.0.1:*'
  ],
  'font-src': [
    "'self'",
    'fonts.gstatic.com',
    'data:'
  ],
  'connect-src': [
    "'self'",
    'ws://localhost:*',
    'ws://127.0.0.1:*',
    'http://localhost:*',
    'http://127.0.0.1:*',
    'https://api.github.com',
    'https://fonts.googleapis.com'
  ],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'report-uri': ['/api/csp-report'],
  'upgrade-insecure-requests': false // Allow HTTP in development
};

// Production CSP - strict security
const productionCSP: CSPConfig = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    // Note: nonces will be added dynamically
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Still needed for Svelte component styles
    'fonts.googleapis.com'
  ],
  'style-src-elem': [
    "'self'",
    "'unsafe-inline'", // Required for Svelte component <style> tags
    'fonts.googleapis.com'
  ],
  'style-src-attr': [
    "'unsafe-inline'" // Required for inline style attributes
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:'
  ],
  'font-src': [
    "'self'",
    'fonts.gstatic.com',
    'data:'
  ],
  'connect-src': [
    "'self'",
    'wss:',
    'https:'
  ],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
  'worker-src': ["'self'", 'blob:'],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'report-uri': ['/api/csp-report'],
  'upgrade-insecure-requests': true,
  'block-all-mixed-content': true
};

/**
 * Generate a cryptographically secure nonce for CSP
 */
export function generateNonce(): string {
  return randomBytes(16).toString('base64');
}

/**
 * Build CSP header string from configuration
 */
export function buildCSPHeader(config: CSPConfig, nonce?: string): string {
  const directives: string[] = [];
  const isDevelopment = process.env.NODE_ENV !== 'production';

  for (const [directive, values] of Object.entries(config)) {
    if (typeof values === 'boolean') {
      if (values) {
        directives.push(directive);
      }
    } else if (Array.isArray(values)) {
      let valueList = [...values];

      // Add nonce to script-src, script-src-elem, style-src, and style-src-elem if provided
      // In development, skip nonces for style directives to allow SvelteKit inline styles
      if (nonce && (directive === 'script-src' || directive === 'script-src-elem' ||
                    (!isDevelopment && (directive === 'style-src' || directive === 'style-src-elem')))) {
        valueList.push(`'nonce-${nonce}'`);
      }

      directives.push(`${directive} ${valueList.join(' ')}`);
    }
  }

  return directives.join('; ');
}

/**
 * Get CSP configuration based on environment
 */
export function getCSPConfig(): CSPConfig {
  return process.env.NODE_ENV === 'production' ? productionCSP : developmentCSP;
}

/**
 * CSP middleware for SvelteKit
 */
export function addCSPHeaders(event: RequestEvent, nonce?: string): void {
  const config = getCSPConfig();
  const cspHeader = buildCSPHeader(config, nonce);

  // In development, use report-only mode to allow Svelte event handlers
  // In production, enforce CSP strictly
  if (process.env.NODE_ENV === 'development') {
    event.setHeaders({
      'Content-Security-Policy-Report-Only': cspHeader
    });
  } else {
    event.setHeaders({
      'Content-Security-Policy': cspHeader
    });
  }
}

/**
 * CSP nonce store for server-side rendering
 */
export class CSPNonceStore {
  private static instance: CSPNonceStore;
  private nonceMap = new Map<string, string>();

  static getInstance(): CSPNonceStore {
    if (!CSPNonceStore.instance) {
      CSPNonceStore.instance = new CSPNonceStore();
    }
    return CSPNonceStore.instance;
  }

  /**
   * Generate and store nonce for a request
   */
  generateNonce(requestId: string): string {
    const nonce = generateNonce();
    this.nonceMap.set(requestId, nonce);

    // Clean up old nonces after 5 minutes
    setTimeout(() => {
      this.nonceMap.delete(requestId);
    }, 5 * 60 * 1000);

    return nonce;
  }

  /**
   * Get stored nonce for a request
   */
  getNonce(requestId: string): string | undefined {
    return this.nonceMap.get(requestId);
  }

  /**
   * Remove nonce after request completion
   */
  removeNonce(requestId: string): void {
    this.nonceMap.delete(requestId);
  }
}

/**
 * CSP violation reporting endpoint data structure
 */
export interface CSPViolationReport {
  'document-uri': string;
  referrer: string;
  'violated-directive': string;
  'effective-directive': string;
  'original-policy': string;
  disposition: string;
  'blocked-uri': string;
  'line-number': number;
  'column-number': number;
  'source-file': string;
  'status-code': number;
  'script-sample': string;
}

/**
 * Handle CSP violation reports
 */
export function handleCSPViolation(report: CSPViolationReport): void {
  console.warn('CSP Violation:', {
    directive: report['violated-directive'],
    blockedUri: report['blocked-uri'],
    documentUri: report['document-uri'],
    lineNumber: report['line-number'],
    sourceFile: report['source-file']
  });

  // In production, you might want to send this to a monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to monitoring service
    // monitoringService.reportCSPViolation(report);
  }
}

// Export singleton instance
export const cspNonceStore = CSPNonceStore.getInstance();