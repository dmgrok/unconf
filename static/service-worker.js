/**
 * Service Worker for UnConf
 * Handles caching strategies for improved performance
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `unconf-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `unconf-dynamic-${CACHE_VERSION}`;
const API_CACHE = `unconf-api-${CACHE_VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
	'/',
	'/favicon.svg',
	'/manifest.json'
];

// Maximum cache sizes
const MAX_DYNAMIC_CACHE_SIZE = 50;
const MAX_API_CACHE_SIZE = 30;

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
	console.log('[SW] Installing service worker...');

	event.waitUntil(
		caches.open(STATIC_CACHE).then((cache) => {
			console.log('[SW] Caching static assets');
			return cache.addAll(STATIC_ASSETS);
		})
	);

	// Skip waiting to activate immediately
	self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
	console.log('[SW] Activating service worker...');

	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => {
						return (
							name.startsWith('unconf-') &&
							name !== STATIC_CACHE &&
							name !== DYNAMIC_CACHE &&
							name !== API_CACHE
						);
					})
					.map((name) => {
						console.log('[SW] Deleting old cache:', name);
						return caches.delete(name);
					})
			);
		})
	);

	// Take control of all pages immediately
	return self.clients.claim();
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip non-GET requests
	if (request.method !== 'GET') {
		return;
	}

	// Skip WebSocket connections
	if (url.protocol === 'ws:' || url.protocol === 'wss:') {
		return;
	}

	// API requests - Network First with cache fallback
	if (url.pathname.startsWith('/api/')) {
		event.respondWith(networkFirstStrategy(request, API_CACHE));
		return;
	}

	// Static assets - Cache First
	if (
		url.pathname.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/)
	) {
		event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
		return;
	}

	// HTML pages - Network First with cache fallback
	if (request.headers.get('accept')?.includes('text/html')) {
		event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
		return;
	}

	// Default - Network First
	event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
});

/**
 * Cache First Strategy
 * Tries cache first, falls back to network
 */
async function cacheFirstStrategy(request, cacheName) {
	try {
		const cache = await caches.open(cacheName);
		const cached = await cache.match(request);

		if (cached) {
			// Return cached response
			return cached;
		}

		// Fetch from network
		const response = await fetch(request);

		// Cache successful responses
		if (response.ok) {
			cache.put(request, response.clone());
		}

		return response;
	} catch (error) {
		console.error('[SW] Cache First failed:', error);
		return new Response('Offline', { status: 503 });
	}
}

/**
 * Network First Strategy
 * Tries network first, falls back to cache
 */
async function networkFirstStrategy(request, cacheName) {
	try {
		const cache = await caches.open(cacheName);

		try {
			// Try network first
			const response = await fetch(request);

			// Cache successful responses
			if (response.ok) {
				cache.put(request, response.clone());

				// Limit cache size
				if (cacheName === DYNAMIC_CACHE) {
					limitCacheSize(cacheName, MAX_DYNAMIC_CACHE_SIZE);
				} else if (cacheName === API_CACHE) {
					limitCacheSize(cacheName, MAX_API_CACHE_SIZE);
				}
			}

			return response;
		} catch (networkError) {
			// Network failed, try cache
			const cached = await cache.match(request);

			if (cached) {
				console.log('[SW] Serving from cache after network failure');
				return cached;
			}

			throw networkError;
		}
	} catch (error) {
		console.error('[SW] Network First failed:', error);
		return new Response('Offline', { status: 503 });
	}
}

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cacheName, maxSize) {
	const cache = await caches.open(cacheName);
	const keys = await cache.keys();

	if (keys.length > maxSize) {
		// Remove oldest entries (FIFO)
		const toDelete = keys.length - maxSize;
		for (let i = 0; i < toDelete; i++) {
			await cache.delete(keys[i]);
		}
	}
}

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
	console.log('[SW] Background sync:', event.tag);

	if (event.tag === 'sync-offline-actions') {
		event.waitUntil(syncOfflineActions());
	}
});

/**
 * Sync offline actions when back online
 */
async function syncOfflineActions() {
	try {
		// Retrieve offline actions from IndexedDB or cache
		// Send them to server
		console.log('[SW] Syncing offline actions...');
	} catch (error) {
		console.error('[SW] Failed to sync offline actions:', error);
	}
}

/**
 * Push notification handling
 */
self.addEventListener('push', (event) => {
	if (!event.data) {
		return;
	}

	const data = event.data.json();

	const options = {
		body: data.body || 'You have a new notification',
		icon: '/favicon.svg',
		badge: '/favicon.svg',
		data: data
	};

	event.waitUntil(
		self.registration.showNotification(data.title || 'UnConf', options)
	);
});

/**
 * Notification click handling
 */
self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	event.waitUntil(
		clients.openWindow(event.notification.data.url || '/')
	);
});
