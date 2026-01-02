import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Dark mode only - simplified theme type
export type Theme = 'dark';

// Theme store - always dark
function createThemeStore() {
	const { subscribe, set, update } = writable<Theme>('dark');

	return {
		subscribe,
		set: (_theme: Theme) => {
			// Always dark mode
			set('dark');
		},
		update,
		get: () => 'dark' as Theme
	};
}

export const theme = createThemeStore();

// Get the effective theme - always dark
export function getEffectiveTheme(_selectedTheme: Theme): 'dark' {
	return 'dark';
}

// Apply theme to document - always dark
export function applyTheme(_selectedTheme: Theme) {
	if (!browser) return;
	// No need to set data-theme attribute since dark is the default
	updateMetaThemeColor();
}

// Update meta theme-color for mobile browsers
function updateMetaThemeColor() {
	if (!browser) return;

	let metaThemeColor = document.querySelector('meta[name="theme-color"]');

	if (!metaThemeColor) {
		metaThemeColor = document.createElement('meta');
		metaThemeColor.setAttribute('name', 'theme-color');
		document.head.appendChild(metaThemeColor);
	}

	metaThemeColor.setAttribute('content', '#0a0a0f');
}

// Initialize theme system
export function initializeTheme() {
	if (!browser) return;

	// Apply dark theme
	applyTheme('dark');

	// No cleanup needed since we don't listen to system changes
	return () => {};
}

// Theme utilities - kept for backward compatibility
export const themes: { value: Theme; label: string; description: string }[] = [
	{
		value: 'dark',
		label: 'Dark',
		description: 'Dark theme'
	}
];

// Toggle theme - no-op since we only have dark mode
export function toggleTheme() {
	// No-op - always dark
}

// Check if current theme is dark - always true
export function isDarkTheme(_selectedTheme: Theme): boolean {
	return true;
}

// Check if current theme is high contrast - always false
export function isHighContrastTheme(_selectedTheme: Theme): boolean {
	return false;
}