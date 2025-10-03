/**
 * Admin Authentication and Authorization Middleware
 * Provides security validation for admin operations
 */

import type { User } from '../../types/entities';
import { UserRepository } from '../storage/UserRepository';
import { AuditLogRepository } from '../storage/AuditLogRepository';
import { AuditAction, EntityType, UserRole } from '../../types/enums';

const userRepo = new UserRepository({ dataDir: './data' });
const auditRepo = new AuditLogRepository({ dataDir: './data' });

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Suspicious activity tracking
const suspiciousActivityStore = new Map<
	string,
	{
		failedAttempts: number;
		lastAttempt: number;
		blockedUntil?: number;
	}
>();

export interface AdminAuthResult {
	authorized: boolean;
	user?: User;
	error?: string;
	errorCode?: string;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetTime: number;
	error?: string;
}

export interface AdminSecurityContext {
	userId?: string;
	ipAddress: string;
	userAgent: string;
	action: string;
	resource: string;
}

/**
 * Validate admin permissions for a user
 */
export async function validateAdminPermissions(userId: string | undefined): Promise<AdminAuthResult> {
	if (!userId) {
		return {
			authorized: false,
			error: 'Unauthorized: Authentication required',
			errorCode: 'AUTH_REQUIRED'
		};
	}

	const userResult = await userRepo.findById(userId);

	if (!userResult.success || !userResult.data) {
		return {
			authorized: false,
			error: 'Unauthorized: User not found',
			errorCode: 'USER_NOT_FOUND'
		};
	}

	const user = userResult.data;

	if (user.role !== UserRole.ADMIN) {
		// Log unauthorized access attempt
		await auditRepo.create({
			userId,
			action: AuditAction.UPDATE,
			entityType: EntityType.USER,
			entityId: userId,
			success: false,
			error: 'Forbidden: Admin access required',
			metadata: {
				attemptedAction: 'admin_access',
				userRole: user.role
			}
		});

		return {
			authorized: false,
			error: 'Forbidden: Admin access required',
			errorCode: 'INSUFFICIENT_PERMISSIONS'
		};
	}

	return {
		authorized: true,
		user
	};
}

/**
 * Check rate limiting for admin operations
 */
export function checkRateLimit(
	identifier: string,
	maxRequests: number = 100,
	windowMs: number = 60000 // 1 minute
): RateLimitResult {
	const now = Date.now();
	const record = rateLimitStore.get(identifier);

	if (!record || now > record.resetTime) {
		// New window
		rateLimitStore.set(identifier, {
			count: 1,
			resetTime: now + windowMs
		});

		return {
			allowed: true,
			remaining: maxRequests - 1,
			resetTime: now + windowMs
		};
	}

	if (record.count >= maxRequests) {
		return {
			allowed: false,
			remaining: 0,
			resetTime: record.resetTime,
			error: 'Rate limit exceeded'
		};
	}

	record.count++;
	rateLimitStore.set(identifier, record);

	return {
		allowed: true,
		remaining: maxRequests - record.count,
		resetTime: record.resetTime
	};
}

/**
 * Track and detect suspicious admin activity
 */
export async function trackSuspiciousActivity(
	context: AdminSecurityContext,
	success: boolean
): Promise<{ blocked: boolean; reason?: string }> {
	const identifier = `${context.userId || 'anonymous'}_${context.ipAddress}`;
	const now = Date.now();
	const record = suspiciousActivityStore.get(identifier);

	// Check if currently blocked
	if (record?.blockedUntil && now < record.blockedUntil) {
		return {
			blocked: true,
			reason: `Blocked until ${new Date(record.blockedUntil).toISOString()}`
		};
	}

	if (!success) {
		// Track failed attempt
		const failedAttempts = (record?.failedAttempts || 0) + 1;
		const blockDuration = calculateBlockDuration(failedAttempts);

		suspiciousActivityStore.set(identifier, {
			failedAttempts,
			lastAttempt: now,
			blockedUntil: blockDuration > 0 ? now + blockDuration : undefined
		});

		// Log suspicious activity
		await auditRepo.create({
			userId: context.userId,
			action: AuditAction.UPDATE,
			entityType: EntityType.USER,
			entityId: context.userId || 'unknown',
			success: false,
			ipAddress: context.ipAddress,
			userAgent: context.userAgent,
			metadata: {
				suspiciousActivity: true,
				failedAttempts,
				action: context.action,
				resource: context.resource,
				blockedUntil: blockDuration > 0 ? now + blockDuration : undefined
			}
		});

		if (blockDuration > 0) {
			return {
				blocked: true,
				reason: `Temporarily blocked due to ${failedAttempts} failed attempts`
			};
		}
	} else if (record) {
		// Reset on success
		suspiciousActivityStore.delete(identifier);
	}

	return { blocked: false };
}

/**
 * Calculate block duration based on failed attempts
 */
function calculateBlockDuration(failedAttempts: number): number {
	if (failedAttempts >= 10) {
		return 3600000; // 1 hour
	} else if (failedAttempts >= 5) {
		return 900000; // 15 minutes
	} else if (failedAttempts >= 3) {
		return 300000; // 5 minutes
	}
	return 0; // No block
}

/**
 * Validate admin session security
 */
export async function validateAdminSession(
	userId: string,
	sessionId: string
): Promise<{ valid: boolean; error?: string }> {
	// This would integrate with actual session management
	// For now, basic validation
	if (!userId || !sessionId) {
		return {
			valid: false,
			error: 'Invalid session'
		};
	}

	// In production, verify:
	// - Session exists in store
	// - Session hasn't expired
	// - Session hasn't been revoked
	// - User hasn't changed password since session creation

	return { valid: true };
}

/**
 * Check if admin action requires multi-factor authentication
 */
export function requiresMFA(action: string, resource: string): boolean {
	// High-risk actions that should require MFA
	const mfaRequiredActions = [
		'delete_event',
		'suspend_event',
		'terminate_event',
		'revoke_role',
		'assign_admin_role',
		'delete_user',
		'export_data',
		'system_settings_change'
	];

	const actionKey = `${action}_${resource}`;
	return mfaRequiredActions.includes(action) || mfaRequiredActions.includes(actionKey);
}

/**
 * Log admin action for audit trail
 */
export async function logAdminAction(
	context: AdminSecurityContext,
	success: boolean,
	metadata?: Record<string, unknown>
): Promise<void> {
	await auditRepo.create({
		userId: context.userId,
		action: AuditAction.UPDATE,
		entityType: EntityType.USER,
		entityId: context.resource || 'unknown',
		success,
		ipAddress: context.ipAddress,
		userAgent: context.userAgent,
		metadata: {
			...metadata,
			adminAction: context.action,
			resource: context.resource
		}
	});
}

/**
 * Comprehensive admin authorization middleware
 */
export async function authorizeAdmin(
	userId: string | undefined,
	ipAddress: string,
	userAgent: string,
	action: string,
	resource: string = 'admin'
): Promise<{
	authorized: boolean;
	user?: User;
	error?: string;
	errorCode?: string;
}> {
	// Check permissions
	const authResult = await validateAdminPermissions(userId);
	if (!authResult.authorized) {
		return authResult;
	}

	const context: AdminSecurityContext = {
		userId,
		ipAddress,
		userAgent,
		action,
		resource
	};

	// Check rate limiting
	const rateLimitResult = checkRateLimit(`admin_${userId}_${ipAddress}`, 200, 60000);
	if (!rateLimitResult.allowed) {
		await trackSuspiciousActivity(context, false);
		return {
			authorized: false,
			error: 'Rate limit exceeded. Please try again later.',
			errorCode: 'RATE_LIMIT_EXCEEDED'
		};
	}

	// Check for suspicious activity
	const suspiciousCheck = await trackSuspiciousActivity(context, true);
	if (suspiciousCheck.blocked) {
		return {
			authorized: false,
			error: suspiciousCheck.reason || 'Access temporarily blocked',
			errorCode: 'SUSPICIOUS_ACTIVITY'
		};
	}

	// Log the successful authorization
	await logAdminAction(context, true, {
		authorizationType: 'full_admin_access'
	});

	return {
		authorized: true,
		user: authResult.user
	};
}

/**
 * Clean up expired rate limit and suspicious activity records
 */
export function cleanupSecurityStores(): void {
	const now = Date.now();

	// Clean rate limit store
	for (const [key, record] of rateLimitStore.entries()) {
		if (now > record.resetTime) {
			rateLimitStore.delete(key);
		}
	}

	// Clean suspicious activity store
	for (const [key, record] of suspiciousActivityStore.entries()) {
		if (record.blockedUntil && now > record.blockedUntil) {
			suspiciousActivityStore.delete(key);
		} else if (now - record.lastAttempt > 86400000) {
			// Remove records older than 24 hours
			suspiciousActivityStore.delete(key);
		}
	}
}

// Run cleanup every 5 minutes
setInterval(cleanupSecurityStores, 300000);
