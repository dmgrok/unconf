/**
 * Mobile Performance Optimization Utilities
 * Provides performance enhancements for mobile devices
 */

/**
 * Debounce function for scroll/resize events
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return function executedFunction(...args: Parameters<T>) {
		const later = () => {
			timeout = null;
			func(...args);
		};

		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(later, wait);
	};
}

/**
 * Throttle function for high-frequency events
 */
export function throttle<T extends (...args: any[]) => any>(
	func: T,
	limit: number
): (...args: Parameters<T>) => void {
	let inThrottle: boolean;

	return function executedFunction(...args: Parameters<T>) {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

/**
 * Lazy load images with Intersection Observer
 */
export function lazyLoadImage(img: HTMLImageElement): () => void {
	if (!('IntersectionObserver' in window)) {
		// Fallback: load immediately
		if (img.dataset.src) {
			img.src = img.dataset.src;
		}
		return () => {};
	}

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					const image = entry.target as HTMLImageElement;
					if (image.dataset.src) {
						image.src = image.dataset.src;
						image.removeAttribute('data-src');
					}
					observer.unobserve(image);
				}
			});
		},
		{
			rootMargin: '50px'
		}
	);

	observer.observe(img);

	return () => observer.unobserve(img);
}

/**
 * Optimize animations for mobile (use transform/opacity only)
 */
export function optimizeAnimation(element: HTMLElement, properties: string[]): void {
	// Force GPU acceleration for smooth animations
	const gpuProperties = ['transform', 'opacity'];
	const needsGPU = properties.some((prop) => gpuProperties.includes(prop));

	if (needsGPU) {
		element.style.willChange = properties.join(', ');
		element.style.transform = 'translateZ(0)'; // Force GPU layer

		// Clean up after animation
		const cleanup = () => {
			element.style.willChange = 'auto';
			element.removeEventListener('transitionend', cleanup);
			element.removeEventListener('animationend', cleanup);
		};

		element.addEventListener('transitionend', cleanup);
		element.addEventListener('animationend', cleanup);
	}
}

/**
 * Detect if device is mobile
 */
export function isMobileDevice(): boolean {
	if (typeof window === 'undefined') return false;

	return (
		/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
		(window.matchMedia && window.matchMedia('(max-width: 768px)').matches)
	);
}

/**
 * Detect if device has touch capability
 */
export function isTouchDevice(): boolean {
	if (typeof window === 'undefined') return false;

	return (
		'ontouchstart' in window ||
		navigator.maxTouchPoints > 0 ||
		(navigator as any).msMaxTouchPoints > 0
	);
}

/**
 * Get device pixel ratio for responsive images
 */
export function getDevicePixelRatio(): number {
	if (typeof window === 'undefined') return 1;
	return window.devicePixelRatio || 1;
}

/**
 * Prefetch critical resources
 */
export function prefetchResource(url: string, as: 'image' | 'script' | 'style' | 'fetch'): void {
	if (typeof document === 'undefined') return;

	const link = document.createElement('link');
	link.rel = 'prefetch';
	link.as = as;
	link.href = url;
	document.head.appendChild(link);
}

/**
 * Request idle callback with fallback
 */
export function requestIdleCallback(callback: () => void, options?: { timeout?: number }): number {
	if (typeof window === 'undefined') return 0;

	if ('requestIdleCallback' in window) {
		return window.requestIdleCallback(callback, options);
	}

	// Fallback to setTimeout
	return setTimeout(callback, 1) as unknown as number;
}

/**
 * Cancel idle callback with fallback
 */
export function cancelIdleCallback(id: number): void {
	if (typeof window === 'undefined') return;

	if ('cancelIdleCallback' in window) {
		window.cancelIdleCallback(id);
	} else {
		clearTimeout(id);
	}
}

/**
 * Optimize long lists with virtual scrolling helper
 */
export interface VirtualScrollOptions {
	itemHeight: number;
	containerHeight: number;
	buffer?: number;
}

export function calculateVisibleRange(
	scrollTop: number,
	options: VirtualScrollOptions
): { start: number; end: number } {
	const { itemHeight, containerHeight, buffer = 5 } = options;

	const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
	const visibleItems = Math.ceil(containerHeight / itemHeight);
	const end = start + visibleItems + buffer * 2;

	return { start, end };
}

/**
 * Reduce motion for accessibility
 */
export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return false;

	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Battery optimization: detect low battery and reduce animations
 */
export async function isLowBattery(): Promise<boolean> {
	if (typeof navigator === 'undefined' || !('getBattery' in navigator)) {
		return false;
	}

	try {
		const battery = await (navigator as any).getBattery();
		return battery.level < 0.2 && !battery.charging;
	} catch {
		return false;
	}
}

/**
 * Reduce animations based on battery and motion preferences
 */
export async function shouldReduceAnimations(): Promise<boolean> {
	if (prefersReducedMotion()) {
		return true;
	}

	return await isLowBattery();
}

/**
 * Network-aware loading: check connection quality
 */
export function getConnectionQuality(): 'slow' | 'medium' | 'fast' {
	if (typeof navigator === 'undefined' || !('connection' in navigator)) {
		return 'medium';
	}

	const connection = (navigator as any).connection;
	const effectiveType = connection?.effectiveType;

	if (effectiveType === 'slow-2g' || effectiveType === '2g') {
		return 'slow';
	}

	if (effectiveType === '3g') {
		return 'medium';
	}

	return 'fast';
}

/**
 * Adaptive loading: load appropriate asset quality based on connection
 */
export function getImageQuality(baseUrl: string): string {
	const quality = getConnectionQuality();
	const dpr = getDevicePixelRatio();

	if (quality === 'slow') {
		return `${baseUrl}?q=60&w=800`; // Low quality, small size
	}

	if (quality === 'medium' || dpr <= 1) {
		return `${baseUrl}?q=75&w=1200`; // Medium quality
	}

	return `${baseUrl}?q=85&w=1920`; // High quality for fast connections and high DPR
}

/**
 * Memory optimization: clean up large objects
 */
export function releaseMemory(): void {
	if (typeof window === 'undefined') return;

	// Clear any cached data
	try {
		// Force garbage collection in supported browsers (dev only)
		if ((window as any).gc) {
			(window as any).gc();
		}
	} catch {
		// Ignore errors
	}
}

/**
 * Passive event listeners for better scroll performance
 */
export function addPassiveEventListener(
	element: HTMLElement | Window,
	event: string,
	handler: EventListener
): () => void {
	const options: AddEventListenerOptions = {
		passive: true,
		capture: false
	};

	element.addEventListener(event, handler, options);

	return () => element.removeEventListener(event, handler, options);
}
