import { describe, it, expect, beforeEach } from 'vitest';
import {
	validateWord,
	validateWords,
	clearDictionaryCache,
	getCacheStats
} from '$lib/games/word-chain/dictionary';

describe('Word Chain Dictionary Validation', () => {
	beforeEach(() => {
		// Clear cache before each test
		clearDictionaryCache();
	});

	describe('validateWord', () => {
		it('validates common English words', async () => {
			const result = await validateWord('apple');
			expect(result.isValid).toBe(true);
			expect(result.definition).toBeTruthy();
			expect(result.source).toBe('api');
		}, 10000); // Longer timeout for API call

		it('rejects non-existent words', async () => {
			const result = await validateWord('xyzabc');
			expect(result.isValid).toBe(false);
		}, 10000);

		it('handles case insensitivity', async () => {
			const result1 = await validateWord('APPLE');
			const result2 = await validateWord('apple');
			expect(result1.isValid).toBe(result2.isValid);
		}, 10000);

		it('uses cache on second lookup', async () => {
			// First call - should hit API
			const result1 = await validateWord('elephant');
			expect(result1.source).toBe('api');

			// Second call - should use cache
			const result2 = await validateWord('elephant');
			expect(result2.source).toBe('cache');
			expect(result2.isValid).toBe(result1.isValid);
		}, 10000);

		it('falls back to local validation when API disabled', async () => {
			const result = await validateWord('programming', false);
			expect(result.source).toBe('local');
			// Local validation should accept reasonable-looking words
			expect(result.isValid).toBe(true);
		});

		it('accepts short common words locally', async () => {
			const commonWords = ['am', 'an', 'as', 'at', 'be', 'by', 'do', 'go'];

			for (const word of commonWords) {
				const result = await validateWord(word, false);
				expect(result.isValid).toBe(true);
			}
		});

		it('rejects words with non-letters', async () => {
			const result = await validateWord('test123', false);
			expect(result.isValid).toBe(false);
		});

		it('rejects words with too many consonants', async () => {
			const result = await validateWord('bcdfghjkl', false);
			expect(result.isValid).toBe(false);
		});

		it('rejects words with too many vowels', async () => {
			const result = await validateWord('aeiou', false);
			expect(result.isValid).toBe(false);
		});
	});

	describe('validateWords', () => {
		it('validates multiple words in parallel', async () => {
			const words = ['cat', 'dog', 'bird'];
			const results = await validateWords(words);

			expect(results.size).toBe(3);
			expect(results.get('cat')?.isValid).toBe(true);
			expect(results.get('dog')?.isValid).toBe(true);
			expect(results.get('bird')?.isValid).toBe(true);
		}, 15000);

		it('handles mix of valid and invalid words', async () => {
			const words = ['apple', 'bcdfgh', 'banana'];
			const results = await validateWords(words, false);

			expect(results.get('apple')?.isValid).toBe(true);
			// 6 consonants in a row should be rejected
			expect(results.get('bcdfgh')?.isValid).toBe(false);
			expect(results.get('banana')?.isValid).toBe(true);
		});
	});

	describe('Cache Management', () => {
		it('tracks cache statistics', async () => {
			await validateWord('apple', false);
			await validateWord('bcdfgh', false); // 6 consonants - invalid

			const stats = getCacheStats();
			expect(stats.totalEntries).toBe(2);
			expect(stats.validWords).toBe(1); // apple is valid
			expect(stats.invalidWords).toBe(1); // bcdfgh is invalid
		});

		it('clears cache correctly', async () => {
			await validateWord('apple', false);
			let stats = getCacheStats();
			expect(stats.totalEntries).toBeGreaterThan(0);

			clearDictionaryCache();
			stats = getCacheStats();
			expect(stats.totalEntries).toBe(0);
		});
	});
});
