/**
 * Core Web Vitals monitoring
 * Tracks LCP, FID, CLS, FCP, and TTFB
 */

export interface WebVitalsMetric {
	name: string;
	value: number;
	rating: 'good' | 'needs-improvement' | 'poor';
	delta: number;
	id: string;
}

export interface WebVitalsReport {
	lcp?: WebVitalsMetric; // Largest Contentful Paint
	fid?: WebVitalsMetric; // First Input Delay
	cls?: WebVitalsMetric; // Cumulative Layout Shift
	fcp?: WebVitalsMetric; // First Contentful Paint
	ttfb?: WebVitalsMetric; // Time to First Byte
	inp?: WebVitalsMetric; // Interaction to Next Paint (new metric replacing FID)
}

type MetricCallback = (metric: WebVitalsMetric) => void;

/**
 * Get rating for a metric based on thresholds
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
	const thresholds = {
		LCP: { good: 2500, poor: 4000 },
		FID: { good: 100, poor: 300 },
		CLS: { good: 0.1, poor: 0.25 },
		FCP: { good: 1800, poor: 3000 },
		TTFB: { good: 800, poor: 1800 },
		INP: { good: 200, poor: 500 }
	};

	const threshold = thresholds[name as keyof typeof thresholds];
	if (!threshold) return 'good';

	if (value <= threshold.good) return 'good';
	if (value <= threshold.poor) return 'needs-improvement';
	return 'poor';
}

/**
 * Monitor Largest Contentful Paint (LCP)
 * Target: < 2.5s
 */
export function onLCP(callback: MetricCallback): void {
	if (typeof window === 'undefined') return;

	try {
		const observer = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
				renderTime: number;
				loadTime: number;
			};

			const value = lastEntry.renderTime || lastEntry.loadTime;

			callback({
				name: 'LCP',
				value,
				rating: getRating('LCP', value),
				delta: value,
				id: `lcp-${Date.now()}`
			});
		});

		observer.observe({ type: 'largest-contentful-paint', buffered: true });
	} catch (e) {
		console.error('LCP monitoring failed:', e);
	}
}

/**
 * Monitor First Input Delay (FID)
 * Target: < 100ms
 */
export function onFID(callback: MetricCallback): void {
	if (typeof window === 'undefined') return;

	try {
		const observer = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			entries.forEach((entry: any) => {
				const value = entry.processingStart - entry.startTime;

				callback({
					name: 'FID',
					value,
					rating: getRating('FID', value),
					delta: value,
					id: `fid-${Date.now()}`
				});
			});
		});

		observer.observe({ type: 'first-input', buffered: true });
	} catch (e) {
		console.error('FID monitoring failed:', e);
	}
}

/**
 * Monitor Cumulative Layout Shift (CLS)
 * Target: < 0.1
 */
export function onCLS(callback: MetricCallback): void {
	if (typeof window === 'undefined') return;

	try {
		let clsValue = 0;
		let clsEntries: any[] = [];

		const observer = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			entries.forEach((entry: any) => {
				if (!entry.hadRecentInput) {
					clsValue += entry.value;
					clsEntries.push(entry);
				}
			});

			callback({
				name: 'CLS',
				value: clsValue,
				rating: getRating('CLS', clsValue),
				delta: clsValue,
				id: `cls-${Date.now()}`
			});
		});

		observer.observe({ type: 'layout-shift', buffered: true });
	} catch (e) {
		console.error('CLS monitoring failed:', e);
	}
}

/**
 * Monitor First Contentful Paint (FCP)
 * Target: < 1.8s
 */
export function onFCP(callback: MetricCallback): void {
	if (typeof window === 'undefined') return;

	try {
		const observer = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			const entry = entries[0];
			const value = entry.startTime;

			callback({
				name: 'FCP',
				value,
				rating: getRating('FCP', value),
				delta: value,
				id: `fcp-${Date.now()}`
			});
		});

		observer.observe({ type: 'paint', buffered: true });
	} catch (e) {
		console.error('FCP monitoring failed:', e);
	}
}

/**
 * Monitor Time to First Byte (TTFB)
 * Target: < 800ms
 */
export function onTTFB(callback: MetricCallback): void {
	if (typeof window === 'undefined') return;

	try {
		const observer = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			entries.forEach((entry: any) => {
				const value = entry.responseStart - entry.requestStart;

				callback({
					name: 'TTFB',
					value,
					rating: getRating('TTFB', value),
					delta: value,
					id: `ttfb-${Date.now()}`
				});
			});
		});

		observer.observe({ type: 'navigation', buffered: true });
	} catch (e) {
		console.error('TTFB monitoring failed:', e);
	}
}

/**
 * Initialize all Core Web Vitals monitoring
 */
export function initWebVitals(callback: (report: WebVitalsReport) => void): () => void {
	const report: WebVitalsReport = {};

	const updateReport = (metric: WebVitalsMetric) => {
		report[metric.name.toLowerCase() as keyof WebVitalsReport] = metric;
		callback({ ...report });
	};

	onLCP(updateReport);
	onFID(updateReport);
	onCLS(updateReport);
	onFCP(updateReport);
	onTTFB(updateReport);

	// Return cleanup function
	return () => {
		// Observers are automatically cleaned up when disconnected
	};
}

/**
 * Send web vitals to analytics endpoint
 */
export async function sendWebVitalsToAnalytics(report: WebVitalsReport): Promise<void> {
	try {
		await fetch('/api/analytics/web-vitals', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...report,
				timestamp: Date.now(),
				url: window.location.href,
				userAgent: navigator.userAgent
			})
		});
	} catch (error) {
		console.error('Failed to send web vitals:', error);
	}
}

/**
 * Log web vitals to console (development only)
 */
export function logWebVitals(report: WebVitalsReport): void {
	console.group('📊 Core Web Vitals');
	Object.entries(report).forEach(([name, metric]) => {
		if (metric) {
			const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
			console.log(`${emoji} ${name.toUpperCase()}: ${metric.value.toFixed(2)}ms (${metric.rating})`);
		}
	});
	console.groupEnd();
}
