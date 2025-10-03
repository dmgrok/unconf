/**
 * Dictionary validation service for word-chain game
 * Uses Free Dictionary API with local caching and fallback
 */

interface DictionaryAPIResponse {
	word: string;
	phonetics?: Array<{ text?: string; audio?: string }>;
	meanings?: Array<{
		partOfSpeech: string;
		definitions: Array<{ definition: string }>;
	}>;
}

interface ValidationCache {
	[word: string]: {
		isValid: boolean;
		timestamp: number;
		definition?: string;
	};
}

// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// In-memory cache
let validationCache: ValidationCache = {};

// Load cache from localStorage if available
function loadCache(): void {
	if (typeof window === 'undefined' || !window.localStorage) return;

	try {
		const cached = localStorage.getItem('word-chain-dictionary-cache');
		if (cached) {
			validationCache = JSON.parse(cached);
			// Clean up expired entries
			const now = Date.now();
			Object.keys(validationCache).forEach((word) => {
				if (now - validationCache[word].timestamp > CACHE_DURATION) {
					delete validationCache[word];
				}
			});
		}
	} catch (error) {
		console.warn('Failed to load dictionary cache:', error);
	}
}

// Save cache to localStorage
function saveCache(): void {
	if (typeof window === 'undefined' || !window.localStorage) return;

	try {
		localStorage.setItem('word-chain-dictionary-cache', JSON.stringify(validationCache));
	} catch (error) {
		console.warn('Failed to save dictionary cache:', error);
	}
}

/**
 * Validate a word using the Free Dictionary API
 */
async function validateWithAPI(word: string): Promise<{
	isValid: boolean;
	definition?: string;
	error?: string;
}> {
	const normalizedWord = word.toLowerCase().trim();

	try {
		const response = await fetch(
			`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`,
			{
				signal: AbortSignal.timeout(5000) // 5 second timeout
			}
		);

		if (response.ok) {
			const data: DictionaryAPIResponse[] = await response.json();
			if (data.length > 0 && data[0].meanings && data[0].meanings.length > 0) {
				const firstDefinition = data[0].meanings[0].definitions[0]?.definition;
				return {
					isValid: true,
					definition: firstDefinition
				};
			}
		}

		// 404 means word not found
		if (response.status === 404) {
			return { isValid: false };
		}

		// Other errors
		return {
			isValid: false,
			error: `API error: ${response.status}`
		};
	} catch (error) {
		return {
			isValid: false,
			error: error instanceof Error ? error.message : 'Network error'
		};
	}
}

/**
 * Basic local validation using simple heuristics
 * This is a fallback when API is unavailable
 */
function validateLocally(word: string): boolean {
	const normalizedWord = word.toLowerCase().trim();

	// Reject very short words (except common ones)
	if (normalizedWord.length < 2) {
		return false;
	}

	// Reject words with non-letter characters
	if (!/^[a-z]+$/.test(normalizedWord)) {
		return false;
	}

	// Reject words with unusual letter patterns
	// Too many consonants in a row (6+ is definitely invalid)
	if (/[bcdfghjklmnpqrstvwxyz]{6,}/.test(normalizedWord)) {
		return false;
	}

	// Too many vowels in a row (5+ is definitely invalid)
	if (/[aeiou]{5,}/.test(normalizedWord)) {
		return false;
	}

	// Reject obvious nonsense patterns
	// Words that are just repetition of same letter
	if (/^(.)\1+$/.test(normalizedWord) && normalizedWord.length > 2) {
		return false;
	}

	// Common valid short words
	const commonShortWords = new Set([
		'a',
		'i',
		'am',
		'an',
		'as',
		'at',
		'be',
		'by',
		'do',
		'go',
		'he',
		'hi',
		'if',
		'in',
		'is',
		'it',
		'me',
		'my',
		'no',
		'of',
		'on',
		'or',
		'ox',
		'so',
		'to',
		'up',
		'us',
		'we'
	]);

	if (normalizedWord.length <= 2 && commonShortWords.has(normalizedWord)) {
		return true;
	}

	// If it passes basic checks and is 3+ letters, assume valid
	// This is permissive to avoid false negatives
	return normalizedWord.length >= 3;
}

/**
 * Check if a word is in the cache
 */
function getCachedValidation(word: string): { isValid: boolean; definition?: string } | null {
	const normalizedWord = word.toLowerCase().trim();
	const cached = validationCache[normalizedWord];

	if (!cached) return null;

	// Check if cache entry is still valid
	if (Date.now() - cached.timestamp > CACHE_DURATION) {
		delete validationCache[normalizedWord];
		return null;
	}

	return {
		isValid: cached.isValid,
		definition: cached.definition
	};
}

/**
 * Add a word validation result to the cache
 */
function cacheValidation(word: string, isValid: boolean, definition?: string): void {
	const normalizedWord = word.toLowerCase().trim();
	validationCache[normalizedWord] = {
		isValid,
		definition,
		timestamp: Date.now()
	};
	saveCache();
}

/**
 * Validate a word using dictionary API with caching and fallback
 * @param word - The word to validate
 * @param useAPI - Whether to use the API (default: true)
 * @returns Validation result with definition if available
 */
export async function validateWord(
	word: string,
	useAPI: boolean = true
): Promise<{ isValid: boolean; definition?: string; source: 'cache' | 'api' | 'local' }> {
	const normalizedWord = word.toLowerCase().trim();

	// Initialize cache if needed
	if (Object.keys(validationCache).length === 0) {
		loadCache();
	}

	// Check cache first
	const cached = getCachedValidation(normalizedWord);
	if (cached !== null) {
		return { ...cached, source: 'cache' };
	}

	// Try API if enabled
	if (useAPI) {
		const apiResult = await validateWithAPI(normalizedWord);

		// Cache the result
		cacheValidation(normalizedWord, apiResult.isValid, apiResult.definition);

		// If API succeeded, return result
		if (!apiResult.error) {
			return { ...apiResult, source: 'api' };
		}

		// API failed, fall through to local validation
		console.warn(`Dictionary API failed for "${normalizedWord}": ${apiResult.error}`);
	}

	// Fallback to local validation
	const isValid = validateLocally(normalizedWord);
	cacheValidation(normalizedWord, isValid);

	return { isValid, source: 'local' };
}

/**
 * Validate multiple words in parallel
 */
export async function validateWords(
	words: string[],
	useAPI: boolean = true
): Promise<Map<string, { isValid: boolean; definition?: string; source: string }>> {
	const results = await Promise.all(words.map((word) => validateWord(word, useAPI)));

	const resultMap = new Map<
		string,
		{ isValid: boolean; definition?: string; source: string }
	>();

	words.forEach((word, index) => {
		resultMap.set(word.toLowerCase().trim(), results[index]);
	});

	return resultMap;
}

/**
 * Pre-cache common words to improve performance
 */
export async function preCacheCommonWords(): Promise<void> {
	const commonWords = [
		'apple',
		'elephant',
		'tiger',
		'rabbit',
		'tree',
		'eagle',
		'snake',
		'dog',
		'cat',
		'bird',
		'fish',
		'horse',
		'lion',
		'bear',
		'wolf',
		'deer',
		'fox',
		'goat',
		'duck',
		'frog',
		'mouse',
		'owl',
		'pig',
		'rat',
		'seal'
	];

	// Validate in small batches to avoid rate limiting
	const batchSize = 5;
	for (let i = 0; i < commonWords.length; i += batchSize) {
		const batch = commonWords.slice(i, i + batchSize);
		await validateWords(batch, true);
		// Small delay between batches
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
}

/**
 * Clear the validation cache
 */
export function clearDictionaryCache(): void {
	validationCache = {};
	if (typeof window !== 'undefined' && window.localStorage) {
		localStorage.removeItem('word-chain-dictionary-cache');
	}
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
	totalEntries: number;
	validWords: number;
	invalidWords: number;
} {
	const entries = Object.values(validationCache);
	return {
		totalEntries: entries.length,
		validWords: entries.filter((e) => e.isValid).length,
		invalidWords: entries.filter((e) => !e.isValid).length
	};
}
