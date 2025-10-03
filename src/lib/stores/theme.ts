import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'high-contrast' | 'auto';

// Theme store with persistence
function createThemeStore() {
	// Get initial theme from localStorage or default to 'auto'
	const getInitialTheme = (): Theme => {
		if (!browser) return 'auto';

		try {
			const stored = localStorage.getItem('theme') as Theme;
			if (stored && ['light', 'dark', 'high-contrast', 'auto'].includes(stored)) {
				return stored;
			}
		} catch (error) {
			console.warn('Failed to read theme from localStorage:', error);
		}

		return 'auto';
	};

	const { subscribe, set, update } = writable<Theme>(getInitialTheme());

	return {
		subscribe,
		set: (theme: Theme) => {
			if (browser) {
				try {
					localStorage.setItem('theme', theme);
				} catch (error) {
					console.warn('Failed to save theme to localStorage:', error);
				}
			}
			set(theme);
			applyTheme(theme);
		},
		update,
		// Method to get current theme without subscribing
		get: () => {
			let currentTheme: Theme = 'auto';
			subscribe(value => currentTheme = value)();
			return currentTheme;
		}
	};
}

export const theme = createThemeStore();

// Get the effective theme (resolves 'auto' to actual theme)
export function getEffectiveTheme(selectedTheme: Theme): 'light' | 'dark' | 'high-contrast' {
	if (selectedTheme === 'auto') {
		if (!browser) return 'light';

		// Check for high contrast preference first
		if (window.matchMedia('(prefers-contrast: high)').matches) {
			return 'high-contrast';
		}

		// Fall back to color scheme preference
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	return selectedTheme;
}

// Apply theme to document
export function applyTheme(selectedTheme: Theme) {
	if (!browser) return;

	const effectiveTheme = getEffectiveTheme(selectedTheme);
	const root = document.documentElement;

	// Remove existing theme attributes
	root.removeAttribute('data-theme');

	// Apply new theme
	if (effectiveTheme !== 'light') {
		root.setAttribute('data-theme', effectiveTheme);
	}

	// Update meta theme-color for mobile browsers
	updateMetaThemeColor(effectiveTheme);
}

// Update meta theme-color for mobile browsers
function updateMetaThemeColor(effectiveTheme: 'light' | 'dark' | 'high-contrast') {
	if (!browser) return;

	let metaThemeColor = document.querySelector('meta[name="theme-color"]');

	if (!metaThemeColor) {
		metaThemeColor = document.createElement('meta');
		metaThemeColor.setAttribute('name', 'theme-color');
		document.head.appendChild(metaThemeColor);
	}

	const themeColors = {
		light: '#f9fafb',
		dark: '#111827',
		'high-contrast': '#ffffff'
	};

	metaThemeColor.setAttribute('content', themeColors[effectiveTheme]);
}

// Initialize theme system
export function initializeTheme() {
	if (!browser) return;

	// Apply initial theme
	const currentTheme = theme.get();
	applyTheme(currentTheme);

	// Listen for system theme changes
	const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
	const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

	const handleSystemThemeChange = () => {
		const currentTheme = theme.get();
		if (currentTheme === 'auto') {
			applyTheme('auto');
		}
	};

	darkModeQuery.addEventListener('change', handleSystemThemeChange);
	highContrastQuery.addEventListener('change', handleSystemThemeChange);

	// Cleanup function
	return () => {
		darkModeQuery.removeEventListener('change', handleSystemThemeChange);
		highContrastQuery.removeEventListener('change', handleSystemThemeChange);
	};
}

// Theme utilities
export const themes: { value: Theme; label: string; description: string }[] = [
	{
		value: 'auto',
		label: 'Auto',
		description: 'Follows system preference'
	},
	{
		value: 'light',
		label: 'Light',
		description: 'Light theme'
	},
	{
		value: 'dark',
		label: 'Dark',
		description: 'Dark theme'
	},
	{
		value: 'high-contrast',
		label: 'High Contrast',
		description: 'High contrast for accessibility'
	}
];

// Toggle between light and dark (skipping auto and high-contrast)
export function toggleTheme() {
	const currentTheme = theme.get();
	const effectiveTheme = getEffectiveTheme(currentTheme);

	theme.set(effectiveTheme === 'dark' ? 'light' : 'dark');
}

// Check if current theme is dark
export function isDarkTheme(selectedTheme: Theme): boolean {
	return getEffectiveTheme(selectedTheme) === 'dark';
}

// Check if current theme is high contrast
export function isHighContrastTheme(selectedTheme: Theme): boolean {
	return getEffectiveTheme(selectedTheme) === 'high-contrast';
}