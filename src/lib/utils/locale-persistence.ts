import { locale } from '$lib/i18n';
import { browser } from '$app/environment';

const LOCALE_STORAGE_KEY = 'locale';
const SUPPORTED_LOCALES = ['en-US', 'fr-FR'];
const DEFAULT_LOCALE = 'en-US';

/**
 * Get the browser's preferred locale
 * @returns The browser's locale or default if not supported
 */
function getBrowserLocale(): string {
	if (!browser) return DEFAULT_LOCALE;

	const browserLang = navigator.language || (navigator as any).userLanguage;

	// Check if exact match exists
	if (SUPPORTED_LOCALES.includes(browserLang)) {
		return browserLang;
	}

	// Check for language match (e.g., 'en' matches 'en-US')
	const langCode = browserLang.split('-')[0];
	const matchingLocale = SUPPORTED_LOCALES.find(loc => loc.startsWith(langCode));

	return matchingLocale || DEFAULT_LOCALE;
}

/**
 * Get saved locale from localStorage
 * @returns The saved locale or null if not found
 */
function getSavedLocale(): string | null {
	if (!browser) return null;

	try {
		const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
		// Validate that saved locale is supported
		if (saved && SUPPORTED_LOCALES.includes(saved)) {
			return saved;
		}
	} catch (error) {
		console.warn('Failed to read locale from localStorage:', error);
	}

	return null;
}

/**
 * Save locale to localStorage
 * @param localeCode - The locale code to save
 */
export function saveLocale(localeCode: string): void {
	if (!browser) return;

	// Validate locale before saving
	if (!SUPPORTED_LOCALES.includes(localeCode)) {
		console.warn(`Attempted to save unsupported locale: ${localeCode}`);
		return;
	}

	try {
		localStorage.setItem(LOCALE_STORAGE_KEY, localeCode);
	} catch (error) {
		console.warn('Failed to save locale to localStorage:', error);
	}
}

/**
 * Initialize locale from saved preference or browser settings
 * @returns The initialized locale code
 */
export function initializeLocale(): string {
	// Priority: saved preference > browser preference > default
	const savedLocale = getSavedLocale();
	if (savedLocale) {
		locale.set(savedLocale);
		return savedLocale;
	}

	const browserLocale = getBrowserLocale();
	locale.set(browserLocale);
	saveLocale(browserLocale); // Save initial browser preference
	return browserLocale;
}

/**
 * Set locale and persist to localStorage
 * @param localeCode - The locale code to set
 */
export function setAndSaveLocale(localeCode: string): void {
	if (!SUPPORTED_LOCALES.includes(localeCode)) {
		console.warn(`Attempted to set unsupported locale: ${localeCode}`);
		return;
	}

	locale.set(localeCode);
	saveLocale(localeCode);
}

/**
 * Clear saved locale preference
 */
export function clearSavedLocale(): void {
	if (!browser) return;

	try {
		localStorage.removeItem(LOCALE_STORAGE_KEY);
	} catch (error) {
		console.warn('Failed to clear saved locale:', error);
	}
}

/**
 * Get list of supported locales
 * @returns Array of supported locale codes
 */
export function getSupportedLocales(): string[] {
	return [...SUPPORTED_LOCALES];
}

/**
 * Check if a locale is supported
 * @param localeCode - The locale code to check
 * @returns True if locale is supported
 */
export function isLocaleSupported(localeCode: string): boolean {
	return SUPPORTED_LOCALES.includes(localeCode);
}
