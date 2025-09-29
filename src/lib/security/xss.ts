import DOMPurify from 'dompurify';
import { browser } from '$app/environment';

/**
 * XSS Protection Implementation using DOMPurify
 *
 * This module provides comprehensive XSS protection by:
 * 1. Sanitizing user input on both client and server side
 * 2. Configuring DOMPurify with secure defaults
 * 3. Providing utilities for different content types
 * 4. Adding custom sanitization rules for the application
 */

// Server-side DOM implementation for server-side sanitization
let serverDOMPurify: typeof DOMPurify | null = null;

if (!browser) {
  // Import JSDOM for server-side sanitization
  import('jsdom').then(({ JSDOM }) => {
    const window = new JSDOM('').window;
    const purify = DOMPurify(window as any);
    serverDOMPurify = purify;
  }).catch(error => {
    console.error('Failed to setup server-side DOMPurify:', error);
  });
}

export const XSS_CONFIG = {
  // Default configuration for different content types
  strict: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: false,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit']
  },

  moderate: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'title', 'class'],
    KEEP_CONTENT: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'iframe'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit']
  },

  permissive: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    ALLOWED_ATTR: ['href', 'title', 'class', 'id', 'style'],
    KEEP_CONTENT: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit']
  }
};

export type SanitizationLevel = keyof typeof XSS_CONFIG;

/**
 * Get DOMPurify instance based on environment
 */
function getDOMPurify(): typeof DOMPurify | null {
  if (browser) {
    return DOMPurify;
  }
  return serverDOMPurify;
}

/**
 * Configure DOMPurify with custom hooks and settings
 */
function configureDOMPurify(purify: typeof DOMPurify, config: any) {
  // Add custom hook to remove dangerous protocols
  purify.addHook('afterSanitizeAttributes', function (node) {
    // Remove dangerous href protocols
    if (node.hasAttribute('href')) {
      const href = node.getAttribute('href') || '';
      if (href.match(/^(javascript|data|vbscript):/i)) {
        node.removeAttribute('href');
      }
    }

    // Remove dangerous src protocols
    if (node.hasAttribute('src')) {
      const src = node.getAttribute('src') || '';
      if (src.match(/^(javascript|data|vbscript):/i)) {
        node.removeAttribute('src');
      }
    }
  });

  return purify;
}

/**
 * Sanitize HTML content with specified level
 */
export function sanitizeHtml(
  input: string,
  level: SanitizationLevel = 'moderate',
  customConfig?: Partial<typeof XSS_CONFIG.moderate>
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const purify = getDOMPurify();
  if (!purify) {
    // Fallback: strip all HTML tags if DOMPurify not available
    console.warn('DOMPurify not available, stripping all HTML tags');
    return input.replace(/<[^>]*>/g, '');
  }

  const config = { ...XSS_CONFIG[level], ...customConfig };
  const configuredPurify = configureDOMPurify(purify, config);

  try {
    return configuredPurify.sanitize(input, config);
  } catch (error) {
    console.error('Sanitization failed:', error);
    // Fallback: strip all HTML tags
    return input.replace(/<[^>]*>/g, '');
  }
}

/**
 * Sanitize text content (removes all HTML)
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove all HTML tags and decode HTML entities
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Decode common HTML entities
  const entityMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '='
  };

  for (const [entity, char] of Object.entries(entityMap)) {
    sanitized = sanitized.replace(new RegExp(entity, 'g'), char);
  }

  return sanitized;
}

/**
 * Sanitize URL to prevent XSS in href attributes
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Check for dangerous protocols
  if (url.match(/^(javascript|data|vbscript):/i)) {
    return '';
  }

  // Ensure relative URLs start with / or are complete URLs
  if (!url.match(/^(https?:\/\/|\/)/)) {
    return `/${url}`;
  }

  return url;
}

/**
 * Sanitize CSS to prevent CSS-based XSS
 */
export function sanitizeCSS(css: string): string {
  if (!css || typeof css !== 'string') {
    return '';
  }

  // Remove potentially dangerous CSS
  const dangerousPatterns = [
    /javascript:/gi,
    /expression\s*\(/gi,
    /url\s*\(\s*["']?\s*javascript:/gi,
    /url\s*\(\s*["']?\s*data:/gi,
    /@import/gi,
    /behavior\s*:/gi
  ];

  let sanitized = css;
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }

  return sanitized;
}

/**
 * Input sanitization utility class
 */
export class InputSanitizer {
  private static instance: InputSanitizer;

  static getInstance(): InputSanitizer {
    if (!InputSanitizer.instance) {
      InputSanitizer.instance = new InputSanitizer();
    }
    return InputSanitizer.instance;
  }

  /**
   * Sanitize form data recursively
   */
  sanitizeFormData(data: Record<string, any>, options: {
    textFields?: string[];
    htmlFields?: string[];
    urlFields?: string[];
    level?: SanitizationLevel;
  } = {}): Record<string, any> {
    const {
      textFields = [],
      htmlFields = [],
      urlFields = [],
      level = 'moderate'
    } = options;

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        sanitized[key] = value;
        continue;
      }

      if (typeof value === 'object' && !Array.isArray(value)) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeFormData(value, options);
      } else if (Array.isArray(value)) {
        // Sanitize array elements
        sanitized[key] = value.map(item =>
          typeof item === 'string' ? this.sanitizeString(item, key, options) : item
        );
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value, key, options);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private sanitizeString(value: string, fieldName: string, options: any): string {
    const { textFields, htmlFields, urlFields, level } = options;

    if (htmlFields.includes(fieldName)) {
      return sanitizeHtml(value, level);
    } else if (urlFields.includes(fieldName)) {
      return sanitizeUrl(value);
    } else if (textFields.includes(fieldName) || textFields.length === 0) {
      return sanitizeText(value);
    }

    return sanitizeText(value); // Default to text sanitization
  }

  /**
   * Sanitize user-generated content for storage
   */
  sanitizeUserContent(content: {
    title?: string;
    description?: string;
    body?: string;
    url?: string;
    tags?: string[];
  }): typeof content {
    return {
      title: content.title ? sanitizeText(content.title) : content.title,
      description: content.description ? sanitizeHtml(content.description, 'moderate') : content.description,
      body: content.body ? sanitizeHtml(content.body, 'permissive') : content.body,
      url: content.url ? sanitizeUrl(content.url) : content.url,
      tags: content.tags ? content.tags.map(tag => sanitizeText(tag)) : content.tags
    };
  }

  /**
   * Sanitize search query to prevent XSS in search results
   */
  sanitizeSearchQuery(query: string): string {
    return sanitizeText(query).trim();
  }
}

/**
 * Svelte action for automatic input sanitization
 */
export function sanitizeInput(node: HTMLInputElement | HTMLTextAreaElement, options: {
  level?: SanitizationLevel;
  realtime?: boolean;
} = {}) {
  const { level = 'strict', realtime = false } = options;

  function handleInput() {
    if (realtime) {
      const sanitized = sanitizeText(node.value);
      if (sanitized !== node.value) {
        node.value = sanitized;
        node.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  function handleBlur() {
    const sanitized = sanitizeText(node.value);
    if (sanitized !== node.value) {
      node.value = sanitized;
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  if (realtime) {
    node.addEventListener('input', handleInput);
  }
  node.addEventListener('blur', handleBlur);

  return {
    destroy() {
      node.removeEventListener('input', handleInput);
      node.removeEventListener('blur', handleBlur);
    }
  };
}

// Export singleton instance
export const inputSanitizer = InputSanitizer.getInstance();