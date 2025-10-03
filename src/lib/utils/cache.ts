/**
 * Caching utilities for performance optimization
 * Supports in-memory, localStorage, and HTTP caching
 */

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
	ttl?: number; // Default TTL in milliseconds
	storage?: 'memory' | 'local' | 'session';
	prefix?: string;
}

/**
 * Generic cache manager
 */
export class CacheManager<T = any> {
	private cache: Map<string, CacheEntry<T>> = new Map();
	private options: Required<CacheOptions>;

	constructor(options: CacheOptions = {}) {
		this.options = {
			ttl: options.ttl || 5 * 60 * 1000, // 5 minutes default
			storage: options.storage || 'memory',
			prefix: options.prefix || 'cache_'
		};

		// Load from storage if not memory
		if (this.options.storage !== 'memory' && typeof window !== 'undefined') {
			this.loadFromStorage();
		}
	}

	/**
	 * Get value from cache
	 */
	get(key: string): T | null {
		const fullKey = this.options.prefix + key;

		// Try memory cache first
		const entry = this.cache.get(fullKey);
		if (entry && this.isValid(entry)) {
			return entry.data;
		}

		// Try storage cache
		if (this.options.storage !== 'memory' && typeof window !== 'undefined') {
			const stored = this.getFromStorage(fullKey);
			if (stored && this.isValid(stored)) {
				// Restore to memory cache
				this.cache.set(fullKey, stored);
				return stored.data;
			}
		}

		// Cache miss or expired
		this.delete(key);
		return null;
	}

	/**
	 * Set value in cache
	 */
	set(key: string, data: T, ttl?: number): void {
		const fullKey = this.options.prefix + key;
		const entry: CacheEntry<T> = {
			data,
			timestamp: Date.now(),
			ttl: ttl || this.options.ttl
		};

		this.cache.set(fullKey, entry);

		// Persist to storage if needed
		if (this.options.storage !== 'memory' && typeof window !== 'undefined') {
			this.saveToStorage(fullKey, entry);
		}
	}

	/**
	 * Delete from cache
	 */
	delete(key: string): void {
		const fullKey = this.options.prefix + key;
		this.cache.delete(fullKey);

		if (this.options.storage !== 'memory' && typeof window !== 'undefined') {
			this.deleteFromStorage(fullKey);
		}
	}

	/**
	 * Clear entire cache
	 */
	clear(): void {
		this.cache.clear();

		if (this.options.storage !== 'memory' && typeof window !== 'undefined') {
			const storage = this.getStorage();
			const keys = Object.keys(storage);
			keys.forEach((key) => {
				if (key.startsWith(this.options.prefix)) {
					storage.removeItem(key);
				}
			});
		}
	}

	/**
	 * Check if entry is still valid
	 */
	private isValid(entry: CacheEntry<T>): boolean {
		return Date.now() - entry.timestamp < entry.ttl;
	}

	/**
	 * Get appropriate storage
	 */
	private getStorage(): Storage {
		return this.options.storage === 'local' ? localStorage : sessionStorage;
	}

	/**
	 * Load cache from storage
	 */
	private loadFromStorage(): void {
		try {
			const storage = this.getStorage();
			const keys = Object.keys(storage);

			keys.forEach((key) => {
				if (key.startsWith(this.options.prefix)) {
					const item = storage.getItem(key);
					if (item) {
						const entry = JSON.parse(item) as CacheEntry<T>;
						if (this.isValid(entry)) {
							this.cache.set(key, entry);
						} else {
							storage.removeItem(key);
						}
					}
				}
			});
		} catch (error) {
			console.error('Failed to load cache from storage:', error);
		}
	}

	/**
	 * Get entry from storage
	 */
	private getFromStorage(key: string): CacheEntry<T> | null {
		try {
			const storage = this.getStorage();
			const item = storage.getItem(key);
			if (item) {
				return JSON.parse(item) as CacheEntry<T>;
			}
		} catch (error) {
			console.error('Failed to get from storage:', error);
		}
		return null;
	}

	/**
	 * Save entry to storage
	 */
	private saveToStorage(key: string, entry: CacheEntry<T>): void {
		try {
			const storage = this.getStorage();
			storage.setItem(key, JSON.stringify(entry));
		} catch (error) {
			console.error('Failed to save to storage:', error);
			// Handle quota exceeded
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				this.clearOldestEntries();
			}
		}
	}

	/**
	 * Delete entry from storage
	 */
	private deleteFromStorage(key: string): void {
		try {
			const storage = this.getStorage();
			storage.removeItem(key);
		} catch (error) {
			console.error('Failed to delete from storage:', error);
		}
	}

	/**
	 * Clear oldest cache entries when quota exceeded
	 */
	private clearOldestEntries(): void {
		const entries = Array.from(this.cache.entries());
		entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

		// Remove oldest 25% of entries
		const toRemove = Math.ceil(entries.length * 0.25);
		for (let i = 0; i < toRemove; i++) {
			const [key] = entries[i];
			this.delete(key.replace(this.options.prefix, ''));
		}
	}

	/**
	 * Get cache statistics
	 */
	getStats() {
		const entries = Array.from(this.cache.values());
		const validEntries = entries.filter((e) => this.isValid(e));

		return {
			total: this.cache.size,
			valid: validEntries.length,
			expired: entries.length - validEntries.length,
			storage: this.options.storage
		};
	}
}

/**
 * Create memoization decorator for functions
 */
export function memoize<T extends (...args: any[]) => any>(
	fn: T,
	options: CacheOptions = {}
): T {
	const cache = new CacheManager(options);

	return ((...args: Parameters<T>): ReturnType<T> => {
		const key = JSON.stringify(args);
		const cached = cache.get(key);

		if (cached !== null) {
			return cached;
		}

		const result = fn(...args);
		cache.set(key, result);
		return result;
	}) as T;
}

/**
 * HTTP response caching headers
 */
export function getCacheHeaders(maxAge: number, options: { private?: boolean; immutable?: boolean } = {}) {
	const directives = [
		options.private ? 'private' : 'public',
		`max-age=${maxAge}`,
		options.immutable ? 'immutable' : 's-maxage=' + maxAge
	];

	return {
		'Cache-Control': directives.join(', '),
		'Vary': 'Accept-Encoding'
	};
}

// Pre-configured cache instances
export const apiCache = new CacheManager({
	ttl: 2 * 60 * 1000, // 2 minutes
	storage: 'memory',
	prefix: 'api_'
});

export const staticCache = new CacheManager({
	ttl: 60 * 60 * 1000, // 1 hour
	storage: 'local',
	prefix: 'static_'
});

export const userCache = new CacheManager({
	ttl: 30 * 60 * 1000, // 30 minutes
	storage: 'session',
	prefix: 'user_'
});
