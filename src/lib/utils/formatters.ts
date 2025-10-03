import { locale } from 'svelte-i18n';
import { get } from 'svelte/store';

/**
 * Get the current locale from the i18n store
 */
function getCurrentLocale(): string {
	const currentLocale = get(locale);
	// Handle cases where locale might be null or undefined
	if (!currentLocale) {
		return 'en-US';
	}
	return currentLocale;
}

/**
 * Format a date according to the current locale
 * @param date - The date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
	date: Date | string | number,
	options: Intl.DateTimeFormatOptions = {}
): string {
	const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
	const currentLocale = getCurrentLocale();

	const defaultOptions: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	};

	return new Intl.DateTimeFormat(currentLocale, { ...defaultOptions, ...options }).format(dateObj);
}

/**
 * Format a time according to the current locale
 * @param date - The date/time to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted time string
 */
export function formatTime(
	date: Date | string | number,
	options: Intl.DateTimeFormatOptions = {}
): string {
	const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
	const currentLocale = getCurrentLocale();

	const defaultOptions: Intl.DateTimeFormatOptions = {
		hour: '2-digit',
		minute: '2-digit'
	};

	return new Intl.DateTimeFormat(currentLocale, { ...defaultOptions, ...options }).format(dateObj);
}

/**
 * Format a date and time according to the current locale
 * @param date - The date/time to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date and time string
 */
export function formatDateTime(
	date: Date | string | number,
	options: Intl.DateTimeFormatOptions = {}
): string {
	const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
	const currentLocale = getCurrentLocale();

	const defaultOptions: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	};

	return new Intl.DateTimeFormat(currentLocale, { ...defaultOptions, ...options }).format(dateObj);
}

/**
 * Format a relative time (e.g., "2 hours ago", "in 3 days")
 * @param date - The date to compare with now
 * @returns Formatted relative time string
 */
export function formatRelativeTime(date: Date | string | number): string {
	const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
	const currentLocale = getCurrentLocale();
	const now = new Date();
	const diffInSeconds = Math.floor((dateObj.getTime() - now.getTime()) / 1000);

	const rtf = new Intl.RelativeTimeFormat(currentLocale, { numeric: 'auto' });

	const units: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
		{ unit: 'year', seconds: 31536000 },
		{ unit: 'month', seconds: 2592000 },
		{ unit: 'week', seconds: 604800 },
		{ unit: 'day', seconds: 86400 },
		{ unit: 'hour', seconds: 3600 },
		{ unit: 'minute', seconds: 60 },
		{ unit: 'second', seconds: 1 }
	];

	for (const { unit, seconds } of units) {
		if (Math.abs(diffInSeconds) >= seconds) {
			const value = Math.round(diffInSeconds / seconds);
			return rtf.format(value, unit);
		}
	}

	return rtf.format(0, 'second');
}

/**
 * Format a number according to the current locale
 * @param value - The number to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted number string
 */
export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
	const currentLocale = getCurrentLocale();
	return new Intl.NumberFormat(currentLocale, options).format(value);
}

/**
 * Format a currency amount according to the current locale
 * @param value - The amount to format
 * @param currency - The currency code (e.g., 'USD', 'EUR')
 * @param options - Additional Intl.NumberFormat options
 * @returns Formatted currency string
 */
export function formatCurrency(
	value: number,
	currency: string = 'USD',
	options: Intl.NumberFormatOptions = {}
): string {
	const currentLocale = getCurrentLocale();
	return new Intl.NumberFormat(currentLocale, {
		style: 'currency',
		currency,
		...options
	}).format(value);
}

/**
 * Format a percentage according to the current locale
 * @param value - The value to format (0-1 range, e.g., 0.75 for 75%)
 * @param options - Additional Intl.NumberFormat options
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, options: Intl.NumberFormatOptions = {}): string {
	const currentLocale = getCurrentLocale();
	return new Intl.NumberFormat(currentLocale, {
		style: 'percent',
		...options
	}).format(value);
}

/**
 * Format a compact number (e.g., 1.2K, 3.5M)
 * @param value - The number to format
 * @param options - Additional Intl.NumberFormat options
 * @returns Formatted compact number string
 */
export function formatCompactNumber(
	value: number,
	options: Intl.NumberFormatOptions = {}
): string {
	const currentLocale = getCurrentLocale();
	return new Intl.NumberFormat(currentLocale, {
		notation: 'compact',
		compactDisplay: 'short',
		...options
	}).format(value);
}

/**
 * Format a list according to the current locale
 * @param items - The list items to format
 * @param options - Intl.ListFormat options
 * @returns Formatted list string
 */
export function formatList(items: string[], options: Intl.ListFormatOptions = {}): string {
	const currentLocale = getCurrentLocale();
	const defaultOptions: Intl.ListFormatOptions = {
		style: 'long',
		type: 'conjunction'
	};
	return new Intl.ListFormat(currentLocale, { ...defaultOptions, ...options }).format(items);
}
