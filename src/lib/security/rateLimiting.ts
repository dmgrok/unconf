/**
 * Rate Limiting Implementation
 *
 * This module provides comprehensive rate limiting by:
 * 1. Implementing different rate limits per endpoint type and user role
 * 2. Using both IP-based and user-based rate limiting
 * 3. Providing sliding window rate limiting for accurate limits
 * 4. Adding rate limit headers and proper error responses
 * 5. Configuring different limits for auth, WebSocket, voting, and API endpoints
 */

import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import type { UserRole } from '$lib/auth/middleware';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (event: RequestEvent) => string; // Custom key generator
  skipIf?: (event: RequestEvent) => boolean; // Skip rate limiting conditionally
  message?: string; // Custom error message
  headers?: boolean; // Include rate limit headers
}

export interface RateLimitResult {
  allowed: boolean;
  totalHits: number;
  remaining: number;
  resetTime: number;
  limit: number;
}

// Rate limit configurations for different endpoint types
export const RATE_LIMIT_CONFIGS: Record<string, Record<UserRole | 'default', RateLimitConfig>> = {
  // Authentication endpoints
  auth: {
    default: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 login attempts per 15 minutes
      message: 'Too many authentication attempts, please try again later'
    },
    guest: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 3, // Stricter for guests
      message: 'Too many authentication attempts, please try again later'
    },
    user: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 10, // More lenient for authenticated users
      message: 'Too many authentication attempts, please try again later'
    },
    participant: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 10,
      message: 'Too many authentication attempts, please try again later'
    },
    organizer: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 20, // Higher limit for organizers
      message: 'Too many authentication attempts, please try again later'
    },
    admin: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 50, // Highest limit for admins
      message: 'Too many authentication attempts, please try again later'
    }
  },

  // API endpoints (general)
  api: {
    default: {
      windowMs: 1 * 60 * 1000, // 1 minute
      maxRequests: 60, // 60 requests per minute
      message: 'Too many API requests, please try again later'
    },
    guest: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 30, // Stricter for guests
      message: 'Too many API requests, please try again later'
    },
    user: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 100,
      message: 'Too many API requests, please try again later'
    },
    participant: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 100,
      message: 'Too many API requests, please try again later'
    },
    organizer: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 200,
      message: 'Too many API requests, please try again later'
    },
    admin: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 500,
      message: 'Too many API requests, please try again later'
    }
  },

  // Voting endpoints
  voting: {
    default: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 20, // 20 votes per 5 minutes
      message: 'Too many voting requests, please slow down'
    },
    guest: {
      windowMs: 5 * 60 * 1000,
      maxRequests: 10,
      message: 'Too many voting requests, please slow down'
    },
    user: {
      windowMs: 5 * 60 * 1000,
      maxRequests: 30,
      message: 'Too many voting requests, please slow down'
    },
    participant: {
      windowMs: 5 * 60 * 1000,
      maxRequests: 30,
      message: 'Too many voting requests, please slow down'
    },
    organizer: {
      windowMs: 5 * 60 * 1000,
      maxRequests: 50,
      message: 'Too many voting requests, please slow down'
    },
    admin: {
      windowMs: 5 * 60 * 1000,
      maxRequests: 100,
      message: 'Too many voting requests, please slow down'
    }
  },

  // WebSocket connections
  websocket: {
    default: {
      windowMs: 1 * 60 * 1000, // 1 minute
      maxRequests: 5, // 5 connection attempts per minute
      message: 'Too many WebSocket connection attempts'
    },
    guest: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 3,
      message: 'Too many WebSocket connection attempts'
    },
    user: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 10,
      message: 'Too many WebSocket connection attempts'
    },
    participant: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 10,
      message: 'Too many WebSocket connection attempts'
    },
    organizer: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 20,
      message: 'Too many WebSocket connection attempts'
    },
    admin: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 50,
      message: 'Too many WebSocket connection attempts'
    }
  },

  // Topic creation
  topics: {
    default: {
      windowMs: 10 * 60 * 1000, // 10 minutes
      maxRequests: 5, // 5 topics per 10 minutes
      message: 'Too many topic creation requests'
    },
    guest: {
      windowMs: 10 * 60 * 1000,
      maxRequests: 0, // Guests cannot create topics
      message: 'Guests cannot create topics'
    },
    user: {
      windowMs: 10 * 60 * 1000,
      maxRequests: 10,
      message: 'Too many topic creation requests'
    },
    participant: {
      windowMs: 10 * 60 * 1000,
      maxRequests: 10,
      message: 'Too many topic creation requests'
    },
    organizer: {
      windowMs: 10 * 60 * 1000,
      maxRequests: 20,
      message: 'Too many topic creation requests'
    },
    admin: {
      windowMs: 10 * 60 * 1000,
      maxRequests: 50,
      message: 'Too many topic creation requests'
    }
  }
};

// In-memory store for rate limiting (in production, use Redis)
interface RateLimitRecord {
  requests: number[];
  resetTime: number;
}

class RateLimitStore {
  private store = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired records every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (record.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  get(key: string): RateLimitRecord | undefined {
    return this.store.get(key);
  }

  set(key: string, record: RateLimitRecord): void {
    this.store.set(key, record);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

const store = new RateLimitStore();

/**
 * Generate rate limit key based on IP and user
 */
function generateKey(event: RequestEvent, prefix: string): string {
  const clientIP = event.getClientAddress();
  const userId = event.locals.user?.id;

  // Use both IP and user ID if available for more accurate rate limiting
  if (userId) {
    return `${prefix}:user:${userId}:${clientIP}`;
  }

  return `${prefix}:ip:${clientIP}`;
}

/**
 * Get user role for rate limiting
 */
function getUserRole(event: RequestEvent): UserRole | 'default' {
  const user = event.locals.user;
  if (!user) return 'default';

  if (user.isGuest) return 'guest';
  return user.role || 'default';
}

/**
 * Determine endpoint type from URL
 */
function getEndpointType(pathname: string): string {
  if (pathname.startsWith('/api/auth/')) return 'auth';
  if (pathname.startsWith('/api/votes')) return 'voting';
  if (pathname.startsWith('/api/topics')) return 'topics';
  if (pathname.startsWith('/api/websocket')) return 'websocket';
  if (pathname.startsWith('/api/')) return 'api';

  return 'api'; // Default to api type
}

/**
 * Apply rate limiting using sliding window algorithm
 */
export function applyRateLimit(
  event: RequestEvent,
  endpointType?: string,
  customConfig?: RateLimitConfig
): RateLimitResult {
  const pathname = event.url.pathname;
  const type = endpointType || getEndpointType(pathname);
  const userRole = getUserRole(event);

  // Get configuration for this endpoint type and user role
  const configs = RATE_LIMIT_CONFIGS[type];
  const config = customConfig || configs?.[userRole] || configs?.['default'];

  if (!config) {
    // No rate limiting configured
    return {
      allowed: true,
      totalHits: 0,
      remaining: Number.MAX_SAFE_INTEGER,
      resetTime: Date.now() + 60000,
      limit: Number.MAX_SAFE_INTEGER
    };
  }

  // Generate unique key for this request
  const key = config.keyGenerator ? config.keyGenerator(event) : generateKey(event, type);

  // Check if rate limiting should be skipped
  if (config.skipIf && config.skipIf(event)) {
    return {
      allowed: true,
      totalHits: 0,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs,
      limit: config.maxRequests
    };
  }

  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get or create record for this key
  let record = store.get(key);
  if (!record) {
    record = {
      requests: [],
      resetTime: now + config.windowMs
    };
  }

  // Remove requests outside the current window (sliding window)
  record.requests = record.requests.filter(timestamp => timestamp > windowStart);

  // Count current requests in window
  const currentRequests = record.requests.length;

  // Check if limit exceeded
  if (currentRequests >= config.maxRequests) {
    // Update store
    store.set(key, record);

    return {
      allowed: false,
      totalHits: currentRequests,
      remaining: 0,
      resetTime: record.resetTime,
      limit: config.maxRequests
    };
  }

  // Add current request
  record.requests.push(now);
  record.resetTime = Math.max(record.resetTime, now + config.windowMs);

  // Update store
  store.set(key, record);

  return {
    allowed: true,
    totalHits: record.requests.length,
    remaining: config.maxRequests - record.requests.length,
    resetTime: record.resetTime,
    limit: config.maxRequests
  };
}

/**
 * Rate limiting middleware
 */
export async function rateLimitMiddleware(
  event: RequestEvent,
  endpointType?: string,
  customConfig?: RateLimitConfig
): Promise<void> {
  const result = applyRateLimit(event, endpointType, customConfig);

  // Add rate limit headers
  if (!customConfig || customConfig.headers !== false) {
    event.setHeaders({
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
    });
  }

  // Check if rate limit exceeded
  if (!result.allowed) {
    const type = endpointType || getEndpointType(event.url.pathname);
    const userRole = getUserRole(event);
    const configs = RATE_LIMIT_CONFIGS[type];
    const config = customConfig || configs?.[userRole] || configs?.['default'];

    throw error(429, {
      message: config?.message || 'Too many requests',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      limit: result.limit,
      remaining: result.remaining
    });
  }
}

/**
 * Rate limiting decorator for API endpoints
 */
export function withRateLimit(
  endpointType?: string,
  customConfig?: RateLimitConfig
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (event: RequestEvent) {
      await rateLimitMiddleware(event, endpointType, customConfig);
      return originalMethod.call(this, event);
    };

    return descriptor;
  };
}

/**
 * Create rate limit configuration
 */
export function createRateLimitConfig(
  windowMs: number,
  maxRequests: number,
  options: Partial<RateLimitConfig> = {}
): RateLimitConfig {
  return {
    windowMs,
    maxRequests,
    headers: true,
    ...options
  };
}

/**
 * IP-based rate limiting (stricter)
 */
export function ipRateLimit(config: RateLimitConfig): RateLimitConfig {
  return {
    ...config,
    keyGenerator: (event: RequestEvent) => `ip:${event.getClientAddress()}`
  };
}

/**
 * User-based rate limiting (more lenient)
 */
export function userRateLimit(config: RateLimitConfig): RateLimitConfig {
  return {
    ...config,
    keyGenerator: (event: RequestEvent) => {
      const userId = event.locals.user?.id;
      return userId ? `user:${userId}` : `ip:${event.getClientAddress()}`;
    }
  };
}

// Export store for testing/debugging
export const rateLimitStore = store;