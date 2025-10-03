import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
	formatDate,
	formatTime,
	formatDateTime,
	formatNumber,
	formatCurrency,
	formatPercentage,
	formatCompactNumber,
	formatList
} from '$lib/utils/formatters';
import {
	initializeLocale,
	setAndSaveLocale,
	clearSavedLocale,
	getSupportedLocales,
	isLocaleSupported
} from '$lib/utils/locale-persistence';
import { locale } from '$lib/i18n';

describe('I18n Formatting Utilities', () => {
	const testDate = new Date('2024-01-15T14:30:00Z');

	beforeEach(() => {
		// Reset locale to English before each test
		locale.set('en-US');
	});

	describe('formatDate', () => {
		it('formats dates in English locale', async () => {
			await locale.set('en-US');
			const formatted = formatDate(testDate);
			expect(formatted).toContain('January');
			expect(formatted).toContain('15');
			expect(formatted).toContain('2024');
		});

		it('formats dates in French locale', async () => {
			await locale.set('fr-FR');
			// Small delay to ensure locale is updated
			await new Promise((resolve) => setTimeout(resolve, 10));
			const formatted = formatDate(testDate);
			expect(formatted).toContain('janvier');
			expect(formatted).toContain('15');
			expect(formatted).toContain('2024');
		});

		it('accepts custom formatting options', () => {
			locale.set('en-US');
			const formatted = formatDate(testDate, { month: 'short', day: 'numeric' });
			expect(formatted).toContain('Jan');
		});
	});

	describe('formatTime', () => {
		it('formats time in 24-hour format for French', () => {
			locale.set('fr-FR');
			const formatted = formatTime(testDate);
			expect(formatted).toMatch(/\d{2}:\d{2}/);
		});

		it('formats time with custom options', () => {
			locale.set('en-US');
			const formatted = formatTime(testDate, { hour12: true });
			expect(formatted).toBeTruthy();
		});
	});

	describe('formatDateTime', () => {
		it('formats date and time together', () => {
			locale.set('en-US');
			const formatted = formatDateTime(testDate);
			expect(formatted).toContain('January');
			expect(formatted).toMatch(/\d{1,2}:\d{2}/);
		});
	});

	describe('formatNumber', () => {
		it('formats numbers with locale-specific separators', () => {
			locale.set('en-US');
			const formatted = formatNumber(1234567.89);
			expect(formatted).toContain('1,234,567');
		});

		it('formats numbers with French locale separators', () => {
			locale.set('fr-FR');
			const formatted = formatNumber(1234567.89);
			// French uses spaces or thin spaces as thousand separators
			expect(formatted).toMatch(/1[\s\u202F]234[\s\u202F]567/);
		});
	});

	describe('formatCurrency', () => {
		it('formats USD currency in English', () => {
			locale.set('en-US');
			const formatted = formatCurrency(1234.56, 'USD');
			expect(formatted).toContain('$');
			expect(formatted).toContain('1,234.56');
		});

		it('formats EUR currency in French', () => {
			locale.set('fr-FR');
			const formatted = formatCurrency(1234.56, 'EUR');
			expect(formatted).toContain('€');
		});
	});

	describe('formatPercentage', () => {
		it('formats percentages correctly', () => {
			locale.set('en-US');
			const formatted = formatPercentage(0.75);
			expect(formatted).toContain('75');
			expect(formatted).toContain('%');
		});

		it('formats with custom decimal places', () => {
			locale.set('en-US');
			const formatted = formatPercentage(0.7567, { minimumFractionDigits: 2 });
			expect(formatted).toMatch(/75\.6[67]%/);
		});
	});

	describe('formatCompactNumber', () => {
		it('formats large numbers compactly in English', () => {
			locale.set('en-US');
			expect(formatCompactNumber(1200)).toContain('1');
			expect(formatCompactNumber(1200)).toContain('K');
		});

		it('formats large numbers compactly in French', () => {
			locale.set('fr-FR');
			const formatted = formatCompactNumber(1200000);
			expect(formatted).toMatch(/[1-9]/);
			expect(formatted).toMatch(/M/);
		});
	});

	describe('formatList', () => {
		it('formats lists with "and" in English', () => {
			locale.set('en-US');
			const formatted = formatList(['apples', 'oranges', 'bananas']);
			expect(formatted).toContain('and');
			expect(formatted).toContain('apples');
		});

		it('formats lists with "et" in French', () => {
			locale.set('fr-FR');
			const formatted = formatList(['pommes', 'oranges', 'bananes']);
			expect(formatted).toContain('et');
		});
	});
});

describe('Locale Persistence', () => {
	beforeEach(() => {
		// Clear localStorage before each test
		clearSavedLocale();
	});

	describe('getSupportedLocales', () => {
		it('returns array of supported locales', () => {
			const locales = getSupportedLocales();
			expect(locales).toContain('en-US');
			expect(locales).toContain('fr-FR');
		});
	});

	describe('isLocaleSupported', () => {
		it('returns true for supported locales', () => {
			expect(isLocaleSupported('en-US')).toBe(true);
			expect(isLocaleSupported('fr-FR')).toBe(true);
		});

		it('returns false for unsupported locales', () => {
			expect(isLocaleSupported('de-DE')).toBe(false);
			expect(isLocaleSupported('es-ES')).toBe(false);
		});
	});

	describe('setAndSaveLocale', () => {
		it('sets locale in store', () => {
			setAndSaveLocale('fr-FR');
			expect(get(locale)).toBe('fr-FR');
		});

		it('does not set unsupported locale', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			setAndSaveLocale('de-DE');
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});
});

describe('Translation Completeness', () => {
	it('has matching keys in English and French', async () => {
		const enTranslations = await import('$lib/i18n/locales/en-US.json');
		const frTranslations = await import('$lib/i18n/locales/fr-FR.json');

		const enKeys = getAllKeys(enTranslations.default);
		const frKeys = getAllKeys(frTranslations.default);

		// Check all English keys exist in French
		enKeys.forEach((key) => {
			expect(frKeys).toContain(key);
		});

		// Check all French keys exist in English
		frKeys.forEach((key) => {
			expect(enKeys).toContain(key);
		});
	});

	it('has no empty translation values', async () => {
		const enTranslations = await import('$lib/i18n/locales/en-US.json');
		const frTranslations = await import('$lib/i18n/locales/fr-FR.json');

		const enValues = getAllValues(enTranslations.default);
		const frValues = getAllValues(frTranslations.default);

		enValues.forEach((value) => {
			expect(value.trim()).not.toBe('');
		});

		frValues.forEach((value) => {
			expect(value.trim()).not.toBe('');
		});
	});
});

// Helper function to get all keys from nested object
function getAllKeys(obj: any, prefix = ''): string[] {
	let keys: string[] = [];

	for (const key in obj) {
		const fullKey = prefix ? `${prefix}.${key}` : key;

		if (typeof obj[key] === 'object' && obj[key] !== null) {
			keys = keys.concat(getAllKeys(obj[key], fullKey));
		} else {
			keys.push(fullKey);
		}
	}

	return keys;
}

// Helper function to get all values from nested object
function getAllValues(obj: any): string[] {
	let values: string[] = [];

	for (const key in obj) {
		if (typeof obj[key] === 'object' && obj[key] !== null) {
			values = values.concat(getAllValues(obj[key]));
		} else if (typeof obj[key] === 'string') {
			values.push(obj[key]);
		}
	}

	return values;
}
