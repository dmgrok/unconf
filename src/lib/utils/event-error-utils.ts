/**
 * Utility functions for handling event errors and validation
 */

import type { ValidationError } from '../validation/event-validation';
import { EventErrorCode, getErrorMessage } from '../validation/event-validation';

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
	showToast?: boolean;
	logToConsole?: boolean;
	trackAnalytics?: boolean;
	notifyUser?: boolean;
}

const defaultConfig: ErrorHandlerConfig = {
	showToast: true,
	logToConsole: true,
	trackAnalytics: false,
	notifyUser: true
};

/**
 * Handle validation error with optional configuration
 */
export function handleValidationError(
	error: ValidationError,
	config: ErrorHandlerConfig = defaultConfig
): void {
	// Log to console in development
	if (config.logToConsole && import.meta.env.DEV) {
		console.error('Validation Error:', {
			code: error.code,
			message: error instanceof Error ? error.message : String(error),
			details: error.details,
			recovery: error.recoverySuggestion
		});
	}

	// Track analytics if enabled
	if (config.trackAnalytics) {
		trackErrorEvent(error);
	}

	// Show user notification
	if (config.notifyUser) {
		notifyUser(error);
	}
}

/**
 * Track error event for analytics
 */
function trackErrorEvent(error: ValidationError): void {
	// Placeholder for analytics tracking
	// Could integrate with services like Google Analytics, Mixpanel, etc.
	if (typeof window !== 'undefined' && (window as any).gtag) {
		(window as any).gtag('event', 'validation_error', {
			error_code: error.code,
			error_message: error instanceof Error ? error.message : String(error)
		});
	}
}

/**
 * Notify user of error
 */
function notifyUser(error: ValidationError): void {
	// Dispatch custom event that components can listen to
	if (typeof window !== 'undefined') {
		window.dispatchEvent(
			new CustomEvent('validation-error', {
				detail: error
			})
		);
	}
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(errorCode: string): boolean {
	const recoverableErrors = [
		EventErrorCode.INVALID_ACCESS_CODE,
		EventErrorCode.SESSION_EXPIRED,
		EventErrorCode.VOTING_LIMIT_REACHED,
		EventErrorCode.TOPIC_LIMIT_REACHED
	];

	return recoverableErrors.includes(errorCode as EventErrorCode);
}

/**
 * Check if error requires immediate action
 */
export function requiresImmediateAction(errorCode: string): boolean {
	const criticalErrors = [
		EventErrorCode.SESSION_EXPIRED,
		EventErrorCode.ACCESS_DENIED,
		EventErrorCode.EVENT_ENDED
	];

	return criticalErrors.includes(errorCode as EventErrorCode);
}

/**
 * Get suggested action for error code
 */
export function getSuggestedAction(errorCode: string): string {
	switch (errorCode) {
		case EventErrorCode.EVENT_NOT_FOUND:
			return 'verify-code';
		case EventErrorCode.INVALID_ACCESS_CODE:
			return 'retry-code';
		case EventErrorCode.EVENT_FULL:
			return 'contact-organizer';
		case EventErrorCode.EVENT_ENDED:
			return 'go-home';
		case EventErrorCode.SESSION_EXPIRED:
			return 'refresh-page';
		case EventErrorCode.GUEST_ACCESS_DISABLED:
			return 'create-account';
		case EventErrorCode.REGISTRATION_REQUIRED:
			return 'complete-registration';
		case EventErrorCode.VOTING_LIMIT_REACHED:
			return 'remove-vote';
		case EventErrorCode.TOPIC_LIMIT_REACHED:
			return 'delete-topic';
		default:
			return 'retry';
	}
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(error: ValidationError): {
	title: string;
	message: string;
	suggestion?: string;
} {
	return {
		title: getErrorTitle(error.code),
		message: error instanceof Error ? error.message : String(error),
		suggestion: error.recoverySuggestion
	};
}

/**
 * Get user-friendly error title
 */
function getErrorTitle(code: string): string {
	switch (code) {
		case EventErrorCode.EVENT_NOT_FOUND:
			return 'Event Not Found';
		case EventErrorCode.INVALID_ACCESS_CODE:
			return 'Invalid Access Code';
		case EventErrorCode.EVENT_FULL:
			return 'Event Full';
		case EventErrorCode.EVENT_ENDED:
			return 'Event Has Ended';
		case EventErrorCode.ACCESS_DENIED:
			return 'Access Denied';
		case EventErrorCode.GUEST_ACCESS_DISABLED:
			return 'Guest Access Disabled';
		case EventErrorCode.REGISTRATION_REQUIRED:
			return 'Registration Required';
		case EventErrorCode.SESSION_EXPIRED:
			return 'Session Expired';
		case EventErrorCode.INVALID_PERMISSIONS:
			return 'Insufficient Permissions';
		case EventErrorCode.ACTIVITY_NOT_AVAILABLE:
			return 'Activity Not Available';
		case EventErrorCode.VOTING_LIMIT_REACHED:
			return 'Voting Limit Reached';
		case EventErrorCode.TOPIC_LIMIT_REACHED:
			return 'Topic Limit Reached';
		default:
			return 'Error';
	}
}

/**
 * Create error from exception
 */
export function createErrorFromException(
	exception: Error | unknown,
	context?: Record<string, unknown>
): ValidationError {
	const message =
		exception instanceof Error ? exception.message : 'An unexpected error occurred';

	return {
		code: 'UNKNOWN_ERROR',
		message,
		details: {
			...context,
			stack: exception instanceof Error ? exception.stack : undefined
		},
		recoverySuggestion: 'Please try again or contact support if the problem persists'
	};
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxAttempts: number = 3,
	delayMs: number = 1000
): Promise<T> {
	let lastError: Error | unknown;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			if (attempt < maxAttempts - 1) {
				// Wait with exponential backoff
				await new Promise((resolve) =>
					setTimeout(resolve, delayMs * Math.pow(2, attempt))
				);
			}
		}
	}

	throw lastError;
}

/**
 * Validate and sanitize user input
 */
export function sanitizeInput(input: string, maxLength: number = 200): string {
	return input
		.trim()
		.slice(0, maxLength)
		.replace(/[<>]/g, ''); // Remove potential HTML tags
}

/**
 * Check if error should show detailed information
 */
export function shouldShowDetails(errorCode: string): boolean {
	// Don't show details for user-facing errors
	const userFacingErrors = [
		EventErrorCode.INVALID_ACCESS_CODE,
		EventErrorCode.EVENT_FULL,
		EventErrorCode.VOTING_LIMIT_REACHED,
		EventErrorCode.TOPIC_LIMIT_REACHED
	];

	return !userFacingErrors.includes(errorCode as EventErrorCode);
}

/**
 * Get error severity level
 */
export function getErrorSeverity(
	errorCode: string
): 'info' | 'warning' | 'error' | 'critical' {
	switch (errorCode) {
		case EventErrorCode.EVENT_ENDED:
		case EventErrorCode.EVENT_NOT_STARTED:
		case EventErrorCode.ACTIVITY_NOT_AVAILABLE:
			return 'info';

		case EventErrorCode.EVENT_FULL:
		case EventErrorCode.VOTING_LIMIT_REACHED:
		case EventErrorCode.TOPIC_LIMIT_REACHED:
		case EventErrorCode.GUEST_ACCESS_DISABLED:
			return 'warning';

		case EventErrorCode.INVALID_ACCESS_CODE:
		case EventErrorCode.REGISTRATION_REQUIRED:
		case EventErrorCode.INVALID_PERMISSIONS:
			return 'error';

		case EventErrorCode.EVENT_NOT_FOUND:
		case EventErrorCode.ACCESS_DENIED:
		case EventErrorCode.SESSION_EXPIRED:
			return 'critical';

		default:
			return 'error';
	}
}
