/**
 * Accessibility utilities for WCAG 2.1 AA compliance
 */

// ARIA live region types
export type LiveRegionPoliteness = 'off' | 'polite' | 'assertive';

// Color contrast ratios for WCAG 2.1 AA compliance
export const CONTRAST_RATIOS = {
	NORMAL_TEXT: 4.5,
	LARGE_TEXT: 3.0,
	UI_COMPONENTS: 3.0
} as const;

/**
 * Generate a unique ID for accessibility purposes
 */
export function generateId(prefix = 'id'): string {
	return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Announce content to screen readers using live regions
 */
export function announce(message: string, politeness: LiveRegionPoliteness = 'polite'): void {
	if (typeof window === 'undefined') return;

	const announcer = getOrCreateAnnouncer(politeness);
	announcer.textContent = message;

	// Clear after a brief moment to allow for re-announcements of the same message
	setTimeout(() => {
		if (announcer.textContent === message) {
			announcer.textContent = '';
		}
	}, 1000);
}

/**
 * Get or create a screen reader announcer element
 */
function getOrCreateAnnouncer(politeness: LiveRegionPoliteness): HTMLElement {
	const id = `sr-announcer-${politeness}`;
	let announcer = document.getElementById(id);

	if (!announcer) {
		announcer = document.createElement('div');
		announcer.id = id;
		announcer.setAttribute('aria-live', politeness);
		announcer.setAttribute('aria-atomic', 'true');
		announcer.className = 'sr-only';
		announcer.style.cssText = `
			position: absolute !important;
			width: 1px !important;
			height: 1px !important;
			padding: 0 !important;
			margin: -1px !important;
			overflow: hidden !important;
			clip: rect(0, 0, 0, 0) !important;
			white-space: nowrap !important;
			border: 0 !important;
		`;
		document.body.appendChild(announcer);
	}

	return announcer;
}

/**
 * Check if an element is focusable
 */
export function isFocusable(element: Element): boolean {
	if (!(element instanceof HTMLElement)) return false;

	// Disabled elements are not focusable
	if ('disabled' in element && element.disabled) return false;

	// Hidden elements are not focusable
	if (element.hidden || element.style.display === 'none') return false;

	// Check if element has a tabindex
	const tabindex = element.getAttribute('tabindex');
	if (tabindex !== null) {
		return parseInt(tabindex, 10) >= 0;
	}

	// Check for naturally focusable elements
	const focusableSelectors = [
		'a[href]',
		'button:not([disabled])',
		'input:not([disabled])',
		'select:not([disabled])',
		'textarea:not([disabled])',
		'[contenteditable="true"]',
		'details summary',
		'iframe'
	];

	return focusableSelectors.some(selector => element.matches(selector));
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: Element): HTMLElement[] {
	const focusableSelectors = [
		'a[href]',
		'button:not([disabled])',
		'input:not([disabled])',
		'select:not([disabled])',
		'textarea:not([disabled])',
		'[contenteditable="true"]',
		'[tabindex]:not([tabindex="-1"])',
		'details summary',
		'iframe'
	].join(', ');

	const elements = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
	return elements.filter(element => isFocusable(element));
}

/**
 * Trap focus within a container (useful for modals, dropdowns)
 */
export function trapFocus(container: Element, event: KeyboardEvent): void {
	if (event.key !== 'Tab') return;

	const focusableElements = getFocusableElements(container);
	if (focusableElements.length === 0) return;

	const firstElement = focusableElements[0];
	const lastElement = focusableElements[focusableElements.length - 1];

	if (event.shiftKey) {
		// Shift + Tab: moving backwards
		if (document.activeElement === firstElement) {
			event.preventDefault();
			lastElement.focus();
		}
	} else {
		// Tab: moving forwards
		if (document.activeElement === lastElement) {
			event.preventDefault();
			firstElement.focus();
		}
	}
}

/**
 * Calculate relative luminance of a color (for contrast calculations)
 */
function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
	const { r, g, b } = rgb;

	// Convert RGB to sRGB
	const rsRGB = r / 255;
	const gsRGB = g / 255;
	const bsRGB = b / 255;

	// Apply gamma correction
	const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
	const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
	const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

	// Calculate relative luminance
	return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Parse hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	} : null;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
	const rgb1 = hexToRgb(color1);
	const rgb2 = hexToRgb(color2);

	if (!rgb1 || !rgb2) {
		throw new Error('Invalid color format. Please use hex colors.');
	}

	const lum1 = getRelativeLuminance(rgb1);
	const lum2 = getRelativeLuminance(rgb2);

	const lighter = Math.max(lum1, lum2);
	const darker = Math.min(lum1, lum2);

	return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG contrast requirements
 */
export function meetsContrastRequirement(
	foreground: string,
	background: string,
	level: 'AA' | 'AAA' = 'AA',
	size: 'normal' | 'large' = 'normal'
): boolean {
	const ratio = getContrastRatio(foreground, background);

	const requirements = {
		AA: {
			normal: CONTRAST_RATIOS.NORMAL_TEXT,
			large: CONTRAST_RATIOS.LARGE_TEXT
		},
		AAA: {
			normal: 7.0,
			large: 4.5
		}
	};

	return ratio >= requirements[level][size];
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout>;

	return function executedFunction(...args: Parameters<T>) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};

		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Skip link utilities for keyboard navigation
 */
export function createSkipLink(targetId: string, label: string): HTMLAnchorElement {
	const skipLink = document.createElement('a');
	skipLink.href = `#${targetId}`;
	skipLink.textContent = label;
	skipLink.className = 'skip-link';
	skipLink.style.cssText = `
		position: absolute;
		top: -40px;
		left: 6px;
		background: var(--color-primary);
		color: var(--color-primary-text);
		padding: 8px 16px;
		text-decoration: none;
		border-radius: 4px;
		z-index: 10000;
		transition: top 0.2s;
	`;

	// Show on focus
	skipLink.addEventListener('focus', () => {
		skipLink.style.top = '6px';
	});

	skipLink.addEventListener('blur', () => {
		skipLink.style.top = '-40px';
	});

	return skipLink;
}

/**
 * Keyboard navigation utilities
 */
export const KEYS = {
	ENTER: 'Enter',
	SPACE: ' ',
	ESCAPE: 'Escape',
	ARROW_UP: 'ArrowUp',
	ARROW_DOWN: 'ArrowDown',
	ARROW_LEFT: 'ArrowLeft',
	ARROW_RIGHT: 'ArrowRight',
	HOME: 'Home',
	END: 'End',
	PAGE_UP: 'PageUp',
	PAGE_DOWN: 'PageDown',
	TAB: 'Tab'
} as const;

/**
 * Handle keyboard navigation for menu/list items
 */
export function handleMenuNavigation(
	event: KeyboardEvent,
	items: HTMLElement[],
	currentIndex: number,
	options: {
		orientation?: 'vertical' | 'horizontal';
		loop?: boolean;
		onSelect?: (index: number) => void;
		onEscape?: () => void;
	} = {}
): number {
	const { orientation = 'vertical', loop = true, onSelect, onEscape } = options;

	let newIndex = currentIndex;

	switch (event.key) {
		case KEYS.ARROW_UP:
			if (orientation === 'vertical') {
				event.preventDefault();
				newIndex = currentIndex > 0 ? currentIndex - 1 : (loop ? items.length - 1 : 0);
			}
			break;

		case KEYS.ARROW_DOWN:
			if (orientation === 'vertical') {
				event.preventDefault();
				newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : (loop ? 0 : items.length - 1);
			}
			break;

		case KEYS.ARROW_LEFT:
			if (orientation === 'horizontal') {
				event.preventDefault();
				newIndex = currentIndex > 0 ? currentIndex - 1 : (loop ? items.length - 1 : 0);
			}
			break;

		case KEYS.ARROW_RIGHT:
			if (orientation === 'horizontal') {
				event.preventDefault();
				newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : (loop ? 0 : items.length - 1);
			}
			break;

		case KEYS.HOME:
			event.preventDefault();
			newIndex = 0;
			break;

		case KEYS.END:
			event.preventDefault();
			newIndex = items.length - 1;
			break;

		case KEYS.ENTER:
		case KEYS.SPACE:
			event.preventDefault();
			onSelect?.(currentIndex);
			return currentIndex;

		case KEYS.ESCAPE:
			event.preventDefault();
			onEscape?.();
			return currentIndex;

		default:
			return currentIndex;
	}

	// Focus the new item
	if (newIndex !== currentIndex && items[newIndex]) {
		items[newIndex].focus();
	}

	return newIndex;
}