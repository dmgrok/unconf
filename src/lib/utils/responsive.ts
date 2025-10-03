/**
 * Responsive design utilities and testing helpers
 */

// Breakpoint definitions (matching CSS custom properties if needed)
export const BREAKPOINTS = {
	xs: 320,
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
	'2xl': 1536
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

// Viewport sizes for testing
export const VIEWPORT_SIZES = {
	'mobile-portrait': { width: 375, height: 667, label: 'Mobile Portrait (iPhone)' },
	'mobile-landscape': { width: 667, height: 375, label: 'Mobile Landscape (iPhone)' },
	'tablet-portrait': { width: 768, height: 1024, label: 'Tablet Portrait (iPad)' },
	'tablet-landscape': { width: 1024, height: 768, label: 'Tablet Landscape (iPad)' },
	'desktop-small': { width: 1280, height: 720, label: 'Desktop Small' },
	'desktop-medium': { width: 1440, height: 900, label: 'Desktop Medium' },
	'desktop-large': { width: 1920, height: 1080, label: 'Desktop Large' }
} as const;

export type ViewportKey = keyof typeof VIEWPORT_SIZES;

/**
 * Get current breakpoint based on window width
 */
export function getCurrentBreakpoint(): BreakpointKey | null {
	if (typeof window === 'undefined') return null;

	const width = window.innerWidth;
	const breakpointEntries = Object.entries(BREAKPOINTS) as [BreakpointKey, number][];

	// Find the largest breakpoint that the current width meets
	for (let i = breakpointEntries.length - 1; i >= 0; i--) {
		const [key, minWidth] = breakpointEntries[i];
		if (width >= minWidth) {
			return key;
		}
	}

	return 'xs'; // Fallback to smallest breakpoint
}

/**
 * Check if current viewport matches a specific breakpoint
 */
export function isBreakpoint(breakpoint: BreakpointKey): boolean {
	if (typeof window === 'undefined') return false;
	return window.innerWidth >= BREAKPOINTS[breakpoint];
}

/**
 * Check if current viewport is between two breakpoints
 */
export function isBreakpointBetween(min: BreakpointKey, max: BreakpointKey): boolean {
	if (typeof window === 'undefined') return false;
	const width = window.innerWidth;
	return width >= BREAKPOINTS[min] && width < BREAKPOINTS[max];
}

/**
 * Media query utilities
 */
export function createMediaQuery(breakpoint: BreakpointKey, type: 'min' | 'max' = 'min'): string {
	const width = BREAKPOINTS[breakpoint];
	return `(${type}-width: ${width}px)`;
}

/**
 * Listen to breakpoint changes
 */
export function watchBreakpoint(
	breakpoint: BreakpointKey,
	callback: (matches: boolean) => void,
	type: 'min' | 'max' = 'min'
): () => void {
	if (typeof window === 'undefined') return () => {};

	const mediaQuery = window.matchMedia(createMediaQuery(breakpoint, type));

	// Initial call
	callback(mediaQuery.matches);

	// Listen for changes
	const handler = (e: MediaQueryListEvent) => callback(e.matches);
	mediaQuery.addEventListener('change', handler);

	// Return cleanup function
	return () => mediaQuery.removeEventListener('change', handler);
}

/**
 * Responsive testing utilities
 */
export interface ResponsiveTestResult {
	viewport: ViewportKey;
	passed: boolean;
	issues: string[];
	warnings: string[];
}

/**
 * Test element visibility at different viewport sizes
 */
export function testElementVisibility(
	element: Element,
	viewports: ViewportKey[] = Object.keys(VIEWPORT_SIZES) as ViewportKey[]
): ResponsiveTestResult[] {
	const results: ResponsiveTestResult[] = [];

	for (const viewport of viewports) {
		const { width, height } = VIEWPORT_SIZES[viewport];
		const issues: string[] = [];
		const warnings: string[] = [];

		// Simulate viewport size (this is a simplified test)
		const rect = element.getBoundingClientRect();

		// Check if element fits within viewport
		if (rect.width > width) {
			issues.push(`Element width (${rect.width}px) exceeds viewport width (${width}px)`);
		}

		// Check for common responsive issues
		const computedStyle = getComputedStyle(element as HTMLElement);

		// Check for fixed widths that might cause issues
		if (computedStyle.width && computedStyle.width.includes('px') && !computedStyle.width.includes('100%')) {
			const fixedWidth = parseInt(computedStyle.width);
			if (fixedWidth > width * 0.9) {
				warnings.push(`Fixed width (${fixedWidth}px) might cause horizontal scrolling on ${viewport}`);
			}
		}

		// Check for small touch targets on mobile
		if (viewport.includes('mobile')) {
			const minTouchTarget = 44; // 44px minimum for accessibility
			if (rect.width < minTouchTarget || rect.height < minTouchTarget) {
				const tagName = element.tagName.toLowerCase();
				if (['button', 'a', 'input'].includes(tagName)) {
					warnings.push(`Touch target too small (${rect.width}x${rect.height}px) - minimum 44x44px recommended`);
				}
			}
		}

		results.push({
			viewport,
			passed: issues.length === 0,
			issues,
			warnings
		});
	}

	return results;
}

/**
 * Test text readability at different viewport sizes
 */
export function testTextReadability(element: Element): ResponsiveTestResult[] {
	const results: ResponsiveTestResult[] = [];
	const viewports = Object.keys(VIEWPORT_SIZES) as ViewportKey[];

	for (const viewport of viewports) {
		const issues: string[] = [];
		const warnings: string[] = [];

		const computedStyle = getComputedStyle(element as HTMLElement);
		const fontSize = parseInt(computedStyle.fontSize);
		const lineHeight = parseFloat(computedStyle.lineHeight);

		// Check minimum font sizes for different devices
		const minFontSizes = {
			'mobile-portrait': 16,
			'mobile-landscape': 16,
			'tablet-portrait': 14,
			'tablet-landscape': 14,
			'desktop-small': 14,
			'desktop-medium': 14,
			'desktop-large': 14
		};

		const minFontSize = minFontSizes[viewport];
		if (fontSize < minFontSize) {
			warnings.push(`Font size (${fontSize}px) below recommended minimum (${minFontSize}px) for ${viewport}`);
		}

		// Check line height
		if (lineHeight < 1.4) {
			warnings.push(`Line height (${lineHeight}) below recommended minimum (1.4) for readability`);
		}

		// Check line length (for text blocks)
		const charWidth = fontSize * 0.6; // Approximate character width
		const maxChars = element.getBoundingClientRect().width / charWidth;
		if (maxChars > 75) {
			warnings.push(`Line length might be too long (≈${Math.round(maxChars)} characters) - optimal is 45-75 characters`);
		}

		results.push({
			viewport,
			passed: issues.length === 0,
			issues,
			warnings
		});
	}

	return results;
}

/**
 * Test component spacing and layout at different viewport sizes
 */
export function testComponentSpacing(element: Element): ResponsiveTestResult[] {
	const results: ResponsiveTestResult[] = [];
	const viewports = Object.keys(VIEWPORT_SIZES) as ViewportKey[];

	for (const viewport of viewports) {
		const issues: string[] = [];
		const warnings: string[] = [];

		const computedStyle = getComputedStyle(element as HTMLElement);
		const isMobile = viewport.includes('mobile');

		// Check margins and padding
		const margin = parseInt(computedStyle.margin) || 0;
		const padding = parseInt(computedStyle.padding) || 0;

		if (isMobile) {
			// On mobile, ensure adequate spacing but not excessive
			if (padding < 8) {
				warnings.push(`Padding (${padding}px) might be too small for touch devices`);
			}
			if (margin < 4) {
				warnings.push(`Margin (${margin}px) might be too small for mobile layout`);
			}
		}

		// Check for overflow
		if (computedStyle.overflow === 'visible') {
			const rect = element.getBoundingClientRect();
			const parent = element.parentElement;
			if (parent) {
				const parentRect = parent.getBoundingClientRect();
				if (rect.width > parentRect.width || rect.height > parentRect.height) {
					issues.push(`Element overflows parent container on ${viewport}`);
				}
			}
		}

		results.push({
			viewport,
			passed: issues.length === 0,
			issues,
			warnings
		});
	}

	return results;
}

/**
 * Generate a comprehensive responsive design report
 */
export function generateResponsiveReport(element: Element): {
	visibility: ResponsiveTestResult[];
	readability: ResponsiveTestResult[];
	spacing: ResponsiveTestResult[];
	summary: {
		totalTests: number;
		passed: number;
		failed: number;
		warnings: number;
	};
} {
	const visibility = testElementVisibility(element);
	const readability = testTextReadability(element);
	const spacing = testComponentSpacing(element);

	const allResults = [...visibility, ...readability, ...spacing];
	const totalTests = allResults.length;
	const passed = allResults.filter(r => r.passed).length;
	const failed = allResults.filter(r => !r.passed).length;
	const warnings = allResults.reduce((sum, r) => sum + r.warnings.length, 0);

	return {
		visibility,
		readability,
		spacing,
		summary: {
			totalTests,
			passed,
			failed,
			warnings
		}
	};
}

/**
 * CSS helper functions for responsive design
 */
export function generateResponsiveCSS(property: string, values: Partial<Record<BreakpointKey, string>>): string {
	let css = '';

	Object.entries(values).forEach(([breakpoint, value]) => {
		if (breakpoint === 'xs') {
			css += `${property}: ${value};\n`;
		} else {
			const minWidth = BREAKPOINTS[breakpoint as BreakpointKey];
			css += `@media (min-width: ${minWidth}px) {\n  ${property}: ${value};\n}\n`;
		}
	});

	return css;
}

/**
 * Utility to simulate viewport size changes for testing
 */
export function simulateViewport(viewport: ViewportKey): void {
	if (typeof window === 'undefined') return;

	const { width, height } = VIEWPORT_SIZES[viewport];

	// This is a development/testing utility
	if (process.env.NODE_ENV === 'development') {
		console.log(`Simulating ${viewport}: ${width}x${height}`);
		// In a real implementation, you might resize the window or use dev tools
		window.dispatchEvent(new Event('resize'));
	}
}

/**
 * Detect if device is likely a touch device
 */
export function isTouchDevice(): boolean {
	if (typeof window === 'undefined') return false;
	return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get device pixel ratio for high-DPI displays
 */
export function getDevicePixelRatio(): number {
	if (typeof window === 'undefined') return 1;
	return window.devicePixelRatio || 1;
}

/**
 * Check if device is in landscape orientation
 */
export function isLandscape(): boolean {
	if (typeof window === 'undefined') return false;
	return window.innerWidth > window.innerHeight;
}

/**
 * Listen for orientation changes
 */
export function watchOrientation(callback: (isLandscape: boolean) => void): () => void {
	if (typeof window === 'undefined') return () => {};

	const handler = () => callback(isLandscape());

	window.addEventListener('orientationchange', handler);
	window.addEventListener('resize', handler);

	// Initial call
	handler();

	return () => {
		window.removeEventListener('orientationchange', handler);
		window.removeEventListener('resize', handler);
	};
}