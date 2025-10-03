/**
 * Utility functions for lazy loading components and resources
 */

/**
 * Preload a component dynamically
 * Useful for prefetching components that will likely be needed soon
 */
export async function preloadComponent(importFn: () => Promise<any>): Promise<any> {
	try {
		return await importFn();
	} catch (error) {
		console.error('Failed to preload component:', error);
		return null;
	}
}

/**
 * Lazy load multiple components in parallel
 */
export async function lazyLoadComponents(
	importFns: Record<string, () => Promise<any>>
): Promise<Record<string, any>> {
	const entries = Object.entries(importFns);
	const results = await Promise.all(entries.map(([_, fn]) => preloadComponent(fn)));

	return entries.reduce(
		(acc, [key], index) => {
			acc[key] = results[index]?.default || null;
			return acc;
		},
		{} as Record<string, any>
	);
}

/**
 * Preload link on hover for faster navigation
 * Usage: <a href="/page" on:mouseenter={() => preloadRoute('/page')}>
 */
export function preloadRoute(route: string): void {
	const link = document.createElement('link');
	link.rel = 'prefetch';
	link.as = 'document';
	link.href = route;
	document.head.appendChild(link);
}

/**
 * Setup image lazy loading with Intersection Observer
 */
export function setupImageLazyLoading(selector: string = 'img[loading="lazy"]'): () => void {
	const images = document.querySelectorAll(selector);

	const imageObserver = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					const img = entry.target as HTMLImageElement;
					if (img.dataset.src) {
						img.src = img.dataset.src;
						img.removeAttribute('data-src');
					}
					imageObserver.unobserve(img);
				}
			});
		},
		{
			rootMargin: '50px'
		}
	);

	images.forEach((img) => imageObserver.observe(img));

	// Cleanup function
	return () => {
		imageObserver.disconnect();
	};
}

/**
 * Prefetch critical resources
 */
export function prefetchCriticalResources(resources: Array<{ href: string; as: string }>): void {
	resources.forEach(({ href, as }) => {
		const link = document.createElement('link');
		link.rel = 'prefetch';
		link.as = as;
		link.href = href;
		document.head.appendChild(link);
	});
}

/**
 * Setup idle callback for non-critical resource loading
 */
export function loadWhenIdle(callback: () => void): void {
	if ('requestIdleCallback' in window) {
		requestIdleCallback(callback);
	} else {
		// Fallback for browsers that don't support requestIdleCallback
		setTimeout(callback, 1);
	}
}
