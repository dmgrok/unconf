/**
 * Profanity filter for word-chain game
 * Uses a configurable word list to filter inappropriate content
 */

// Basic profanity list (can be extended or loaded from external source)
const PROFANITY_LIST = new Set([
	// Common profanity (keeping this minimal and family-friendly for demonstration)
	'damn',
	'hell',
	'crap',
	// Add more as needed - in production, use a comprehensive list
	// or integrate with a third-party service
]);

// Leetspeak and common substitutions to catch
const SUBSTITUTIONS: Record<string, string> = {
	'@': 'a',
	'4': 'a',
	'3': 'e',
	'1': 'i',
	'!': 'i',
	'0': 'o',
	'$': 's',
	'5': 's',
	'7': 't',
	'+': 't'
};

export interface ProfanityCheckResult {
	isProfane: boolean;
	matched?: string[];
	severity?: 'mild' | 'moderate' | 'severe';
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize text to catch leetspeak and variations
 */
function normalizeText(text: string): string {
	let normalized = text.toLowerCase();

	// Replace common substitutions
	for (const [from, to] of Object.entries(SUBSTITUTIONS)) {
		normalized = normalized.replace(new RegExp(escapeRegex(from), 'g'), to);
	}

	// Remove non-letter characters except spaces
	normalized = normalized.replace(/[^a-z\s]/g, '');

	// Remove extra spaces
	normalized = normalized.replace(/\s+/g, ' ').trim();

	return normalized;
}

/**
 * Check if a word contains profanity
 */
export function checkProfanity(word: string): ProfanityCheckResult {
	const normalized = normalizeText(word);
	const matched: string[] = [];

	// Check against profanity list
	for (const profaneWord of PROFANITY_LIST) {
		if (normalized.includes(profaneWord)) {
			matched.push(profaneWord);
		}
	}

	if (matched.length > 0) {
		return {
			isProfane: true,
			matched,
			severity: 'mild' // Can be enhanced to categorize severity
		};
	}

	return {
		isProfane: false
	};
}

/**
 * Filter profanity from text
 * Replaces profane words with asterisks
 */
export function filterProfanity(text: string, replacement: string = '****'): string {
	const normalized = normalizeText(text);
	let filtered = text;

	for (const profaneWord of PROFANITY_LIST) {
		if (normalized.includes(profaneWord)) {
			// Create case-insensitive regex
			const regex = new RegExp(profaneWord, 'gi');
			filtered = filtered.replace(regex, replacement);
		}
	}

	return filtered;
}

/**
 * Add custom words to profanity list
 * Useful for game-specific or community-specific moderation
 */
export function addToProfanityList(words: string[]): void {
	for (const word of words) {
		PROFANITY_LIST.add(word.toLowerCase());
	}
}

/**
 * Remove words from profanity list
 */
export function removeFromProfanityList(words: string[]): void {
	for (const word of words) {
		PROFANITY_LIST.delete(word.toLowerCase());
	}
}

/**
 * Get the current profanity list size (for monitoring)
 */
export function getProfanityListSize(): number {
	return PROFANITY_LIST.size;
}

/**
 * Check if profanity filtering is enabled
 */
export function isProfanityFilterEnabled(): boolean {
	return PROFANITY_LIST.size > 0;
}

/**
 * Advanced check that catches variations and partial matches
 */
export function checkProfanityAdvanced(word: string): ProfanityCheckResult {
	const result = checkProfanity(word);

	// If basic check passes, do additional checks
	if (!result.isProfane) {
		const normalized = normalizeText(word);

		// Check for repeated characters (e.g., "heeell" -> "hell")
		const deduplicated = normalized.replace(/(.)\1+/g, '$1');

		for (const profaneWord of PROFANITY_LIST) {
			if (deduplicated.includes(profaneWord)) {
				return {
					isProfane: true,
					matched: [profaneWord],
					severity: 'mild'
				};
			}
		}

		// Check for spaced-out profanity (e.g., "h e l l")
		const noSpaces = normalized.replace(/\s/g, '');
		for (const profaneWord of PROFANITY_LIST) {
			if (noSpaces.includes(profaneWord.replace(/\s/g, ''))) {
				return {
					isProfane: true,
					matched: [profaneWord],
					severity: 'mild'
				};
			}
		}
	}

	return result;
}
