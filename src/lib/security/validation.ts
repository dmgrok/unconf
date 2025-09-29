/**
 * Enhanced Request Validation and SQL Injection Protection
 *
 * This module provides comprehensive input validation and SQL injection protection by:
 * 1. Extending existing Zod schemas with security-focused validation
 * 2. Implementing SQL injection detection and prevention
 * 3. Adding NoSQL injection protection
 * 4. Providing sanitization utilities for database queries
 * 5. Creating validation middleware for API endpoints
 */

import { z } from 'zod';
import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { sanitizeText, sanitizeHtml, sanitizeUrl } from './xss';

// Security-focused validation schemas
const SAFE_STRING_PATTERN = /^[a-zA-Z0-9\s\-_.@]+$/;
const SQL_INJECTION_PATTERNS = [
  /('|(\\')|(;|\\x3b)|(\\x27)|(\\x3d))/i,
  /(exec(\s|\+)+(s|x)p\w+|execute(\s|\+)+(s|x)p\w+)/i,
  /(\s|\+)+(sp_|xp_)/i,
  /(select|insert|update|delete|drop|create|alter|exec|execute)\s+/i,
  /(union|group\s+by|order\s+by|having)\s+/i,
  /(\-\-|\#|\*|\/\*|\*\/)/,
  /(script|javascript|vbscript|data:|mailto:|ftp:|javascript:)/i,
  /(onload|onerror|onclick|onmouseover|onfocus|onblur)=/i
];

const NOSQL_INJECTION_PATTERNS = [
  /\$where/i,
  /\$ne(\s+)?:/i,
  /\$gt(\s+)?:/i,
  /\$lt(\s+)?:/i,
  /\$regex(\s+)?:/i,
  /\$in(\s+)?:/i,
  /\$nin(\s+)?:/i,
  /\$or(\s+)?:/i,
  /\$and(\s+)?:/i,
  /\$nor(\s+)?:/i,
  /\$not(\s+)?:/i,
  /\$exists(\s+)?:/i,
  /\$size(\s+)?:/i,
  /\$all(\s+)?:/i,
  /\$elemMatch(\s+)?:/i
];

/**
 * Enhanced string validation with SQL injection protection
 */
export const SafeStringSchema = z.string()
  .min(1)
  .max(1000)
  .refine((value) => {
    // Check for SQL injection patterns
    return !SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
  }, { message: 'Input contains potentially dangerous characters' })
  .refine((value) => {
    // Check for NoSQL injection patterns
    return !NOSQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
  }, { message: 'Input contains potentially dangerous query operators' })
  .transform((value) => sanitizeText(value));

/**
 * Safe ID validation (UUIDs, alphanumeric IDs)
 */
export const SafeIdSchema = z.string()
  .min(1)
  .max(255)
  .regex(/^[a-zA-Z0-9\-_]+$/, 'ID contains invalid characters')
  .transform((value) => value.trim());

/**
 * Safe email validation
 */
export const SafeEmailSchema = z.string()
  .email('Invalid email format')
  .max(255)
  .toLowerCase()
  .refine((value) => {
    // Additional security checks for email
    return !value.includes('<script') && !value.includes('javascript:');
  }, { message: 'Email contains dangerous content' });

/**
 * Safe URL validation
 */
export const SafeUrlSchema = z.string()
  .url('Invalid URL format')
  .max(2048)
  .refine((value) => {
    // Check for dangerous protocols
    return !value.match(/^(javascript|data|vbscript):/i);
  }, { message: 'URL uses dangerous protocol' })
  .transform((value) => sanitizeUrl(value));

/**
 * Safe HTML content validation
 */
export const SafeHtmlSchema = z.string()
  .max(10000)
  .transform((value) => sanitizeHtml(value, 'moderate'));

/**
 * Safe search query validation
 */
export const SafeSearchSchema = z.string()
  .min(1)
  .max(200)
  .refine((value) => {
    // Block common injection attempts in search
    const dangerousPatterns = [
      /[<>]/,
      /script/i,
      /javascript:/i,
      /onload/i,
      /onerror/i
    ];
    return !dangerousPatterns.some(pattern => pattern.test(value));
  }, { message: 'Search query contains invalid characters' })
  .transform((value) => sanitizeText(value));

/**
 * Pagination validation schema
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

/**
 * File upload validation
 */
export const FileUploadSchema = z.object({
  name: z.string().min(1).max(255).regex(/^[a-zA-Z0-9\-_.() ]+$/),
  size: z.number().int().min(1).max(10 * 1024 * 1024), // 10MB max
  type: z.string().regex(/^[a-zA-Z0-9\/\-+.]+$/),
  lastModified: z.number().optional()
});

/**
 * API request validation schemas
 */
export const CreateEventRequestSchema = z.object({
  title: SafeStringSchema,
  description: SafeHtmlSchema.optional(),
  maxParticipants: z.number().int().min(1).max(1000).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  settings: z.object({
    allowGuestAccess: z.boolean().default(true),
    requireRegistration: z.boolean().default(false),
    enableVoting: z.boolean().default(true),
    maxVotesPerTopic: z.number().int().min(1).max(10).default(1)
  }).default({})
});

export const UpdateEventRequestSchema = CreateEventRequestSchema.partial();

export const CreateTopicRequestSchema = z.object({
  title: SafeStringSchema,
  description: SafeHtmlSchema.optional(),
  eventId: SafeIdSchema,
  tags: z.array(SafeStringSchema).max(10).optional()
});

export const VoteRequestSchema = z.object({
  topicId: SafeIdSchema,
  eventId: SafeIdSchema,
  weight: z.number().int().min(1).max(5)
});

export const UserUpdateRequestSchema = z.object({
  name: SafeStringSchema.optional(),
  email: SafeEmailSchema.optional(),
  preferences: z.object({
    language: z.string().min(2).max(10).regex(/^[a-zA-Z\-]+$/).optional(),
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    notifications: z.boolean().optional(),
    soundEnabled: z.boolean().optional()
  }).optional()
});

/**
 * SQL injection detection
 */
export function detectSQLInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  const normalizedInput = input.toLowerCase().trim();

  // Check against known SQL injection patterns
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(normalizedInput));
}

/**
 * NoSQL injection detection
 */
export function detectNoSQLInjection(input: any): boolean {
  if (typeof input === 'string') {
    return NOSQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
  }

  if (typeof input === 'object' && input !== null) {
    // Check for MongoDB injection operators
    const jsonString = JSON.stringify(input);
    return NOSQL_INJECTION_PATTERNS.some(pattern => pattern.test(jsonString));
  }

  return false;
}

/**
 * Sanitize SQL query parameters
 */
export function sanitizeSQLParams(params: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      // Basic SQL sanitization
      if (detectSQLInjection(value)) {
        throw new Error(`Potentially dangerous SQL content detected in parameter: ${key}`);
      }
      sanitized[key] = value.replace(/'/g, "''"); // Escape single quotes
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (value === null || value === undefined) {
      sanitized[key] = value;
    } else {
      // For complex objects, stringify and check
      const stringified = JSON.stringify(value);
      if (detectSQLInjection(stringified) || detectNoSQLInjection(value)) {
        throw new Error(`Potentially dangerous content detected in parameter: ${key}`);
      }
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Create validation middleware for API endpoints
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return async (event: RequestEvent): Promise<T> => {
    let data: any;

    // Extract data based on request method
    if (event.request.method === 'GET') {
      // For GET requests, validate query parameters
      const url = new URL(event.request.url);
      data = Object.fromEntries(url.searchParams.entries());
    } else {
      // For POST/PUT/PATCH requests, validate request body
      const contentType = event.request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        try {
          data = await event.request.json();
        } catch (e) {
          throw error(400, 'Invalid JSON in request body');
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await event.request.formData();
        data = Object.fromEntries(formData.entries());
      } else {
        throw error(400, 'Unsupported content type');
      }
    }

    // Check for injection attempts before validation
    if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          if (detectSQLInjection(value) || detectNoSQLInjection(value)) {
            console.warn(`Injection attempt detected in field ${key}:`, value);
            throw error(400, 'Invalid input detected');
          }
        }
      }
    }

    // Validate with Zod schema
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.issues.map(issue =>
        `${issue.path.join('.')}: ${issue.message}`
      );

      console.warn('Validation failed:', errors);
      throw error(400, {
        message: 'Validation failed',
        errors
      });
    }

    return result.data;
  };
}

/**
 * Validate and sanitize form data
 */
export function validateFormData<T>(
  data: FormData,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  const formObject: Record<string, any> = {};

  // Convert FormData to object
  for (const [key, value] of data.entries()) {
    if (typeof value === 'string') {
      // Check for injection attempts
      if (detectSQLInjection(value) || detectNoSQLInjection(value)) {
        return {
          success: false,
          errors: [`Potentially dangerous content detected in field: ${key}`]
        };
      }
      formObject[key] = value;
    } else {
      formObject[key] = value;
    }
  }

  // Validate with schema
  const result = schema.safeParse(formObject);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return {
      success: false,
      errors: result.error.issues.map(issue =>
        `${issue.path.join('.')}: ${issue.message}`
      )
    };
  }
}

/**
 * Create parameterized query builder (pseudo-implementation for JSON storage)
 */
export function createSafeQuery(
  template: string,
  params: Record<string, any>
): { query: string; sanitizedParams: Record<string, any> } {
  // Sanitize parameters
  const sanitizedParams = sanitizeSQLParams(params);

  // For JSON storage, we don't have real SQL, but we can validate the template
  const safeTemplate = template.replace(/[^\w\s.,=?:()]/g, '');

  return {
    query: safeTemplate,
    sanitizedParams
  };
}

/**
 * Validate database entity before storage
 */
export function validateEntityForStorage<T>(
  entity: T,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  // Convert entity to plain object if needed
  const plainEntity = JSON.parse(JSON.stringify(entity));

  // Check for injection attempts in all string fields
  function checkObject(obj: any, path: string = ''): string[] {
    const errors: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string') {
        if (detectSQLInjection(value) || detectNoSQLInjection(value)) {
          errors.push(`Potentially dangerous content in ${currentPath}`);
        }
      } else if (typeof value === 'object' && value !== null) {
        errors.push(...checkObject(value, currentPath));
      }
    }

    return errors;
  }

  const injectionErrors = checkObject(plainEntity);
  if (injectionErrors.length > 0) {
    return {
      success: false,
      errors: injectionErrors
    };
  }

  // Validate with schema
  const result = schema.safeParse(plainEntity);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return {
      success: false,
      errors: result.error.issues.map(issue =>
        `${issue.path.join('.')}: ${issue.message}`
      )
    };
  }
}

// Export commonly used validation functions
export const validation = {
  detectSQLInjection,
  detectNoSQLInjection,
  sanitizeSQLParams,
  validateFormData,
  validateEntityForStorage,
  createValidationMiddleware
};