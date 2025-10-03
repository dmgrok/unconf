import type {
	WordChainGameState,
	WordChainGameSettings,
	WordSubmission,
	WordValidationResult,
	WordChainPlayer
} from './types';
import { validateWord } from './dictionary';
import { checkProfanityAdvanced } from './profanity-filter';

/**
 * Get the last letter of a word
 */
function getLastLetter(word: string): string {
	return word.charAt(word.length - 1).toLowerCase();
}

/**
 * Get the first letter of a word
 */
function getFirstLetter(word: string): string {
	return word.charAt(0).toLowerCase();
}

/**
 * Validate that a word follows the chain rule
 * @param word - The word to validate
 * @param previousWord - The previous word in the chain
 * @param settings - Game settings
 * @returns Validation result
 */
export function validateChainRule(
	word: string,
	previousWord: string | null,
	settings: WordChainGameSettings
): WordValidationResult {
	const normalizedWord = settings.caseSensitive ? word : word.toLowerCase();

	// Check word length
	if (normalizedWord.length < settings.minWordLength) {
		return {
			isValid: false,
			reason: `Word must be at least ${settings.minWordLength} characters long`
		};
	}

	if (normalizedWord.length > settings.maxWordLength) {
		return {
			isValid: false,
			reason: `Word must be no more than ${settings.maxWordLength} characters long`
		};
	}

	// Check if word contains only letters
	if (!/^[a-zA-Z]+$/.test(normalizedWord)) {
		return {
			isValid: false,
			reason: 'Word must contain only letters'
		};
	}

	// If there's a previous word, check the chain rule
	if (previousWord) {
		const lastLetter = getLastLetter(previousWord);
		const firstLetter = getFirstLetter(normalizedWord);

		if (firstLetter !== lastLetter) {
			return {
				isValid: false,
				reason: `Word must start with "${lastLetter.toUpperCase()}" (last letter of "${previousWord}")`
			};
		}
	}

	return { isValid: true };
}

/**
 * Check if a word has already been used in the chain
 */
export function isDuplicateWord(
	word: string,
	chain: WordSubmission[],
	settings: WordChainGameSettings
): boolean {
	const normalizedWord = settings.caseSensitive ? word : word.toLowerCase();
	return chain.some((submission) => {
		const submittedWord = settings.caseSensitive
			? submission.word
			: submission.word.toLowerCase();
		return submittedWord === normalizedWord && submission.isValid;
	});
}

/**
 * Validate a word submission (synchronous - does not check dictionary)
 * For dictionary validation, use validateWordSubmissionAsync
 */
export function validateWordSubmission(
	word: string,
	gameState: WordChainGameState
): WordValidationResult {
	const { chain, settings } = gameState;

	// Check for profanity if enabled (default: true)
	if (settings.enableProfanityFilter !== false) {
		const profanityCheck = checkProfanityAdvanced(word);
		if (profanityCheck.isProfane) {
			return {
				isValid: false,
				reason: 'Inappropriate language detected'
			};
		}
	}

	// Get the last valid word in the chain
	const validSubmissions = chain.filter((s) => s.isValid);
	const previousWord = validSubmissions.length > 0 ? validSubmissions[validSubmissions.length - 1].word : null;

	// Validate chain rule
	const chainValidation = validateChainRule(word, previousWord, settings);
	if (!chainValidation.isValid) {
		return chainValidation;
	}

	// Check for duplicates if not allowed
	if (!settings.allowDuplicates && isDuplicateWord(word, chain, settings)) {
		return {
			isValid: false,
			reason: 'This word has already been used'
		};
	}

	return { isValid: true };
}

/**
 * Validate a word submission with dictionary check (async)
 */
export async function validateWordSubmissionAsync(
	word: string,
	gameState: WordChainGameState
): Promise<WordValidationResult> {
	// First run synchronous validation
	const basicValidation = validateWordSubmission(word, gameState);
	if (!basicValidation.isValid) {
		return basicValidation;
	}

	// If dictionary validation is required, check the word
	if (gameState.settings.requireValidWords) {
		const dictionaryResult = await validateWord(word, true);

		if (!dictionaryResult.isValid) {
			return {
				isValid: false,
				reason: 'Word not found in dictionary'
			};
		}

		return {
			isValid: true,
			suggestedWord: dictionaryResult.definition
		};
	}

	return { isValid: true };
}

/**
 * Get the next player in turn-based mode
 */
export function getNextPlayer(gameState: WordChainGameState): WordChainPlayer | null {
	if (gameState.mode !== 'turn-based' || gameState.players.length === 0) {
		return null;
	}

	const currentPlayerIndex = gameState.players.findIndex(
		(p) => p.id === gameState.currentTurnPlayerId
	);

	if (currentPlayerIndex === -1) {
		// No current player, return first player
		return gameState.players[0];
	}

	// Get next player in rotation
	const nextIndex = (currentPlayerIndex + 1) % gameState.players.length;
	return gameState.players[nextIndex];
}

/**
 * Check if a player can submit a word
 */
export function canPlayerSubmit(
	playerId: string,
	gameState: WordChainGameState
): { canSubmit: boolean; reason?: string } {
	// Check if game is active
	if (gameState.status !== 'active') {
		return { canSubmit: false, reason: 'Game is not active' };
	}

	// In turn-based mode, only current player can submit
	if (gameState.mode === 'turn-based') {
		if (gameState.currentTurnPlayerId !== playerId) {
			return { canSubmit: false, reason: 'Not your turn' };
		}
	}

	// Check rate limiting (if last submission was too recent)
	const player = gameState.players.find((p) => p.id === playerId);
	if (player?.lastSubmissionTime) {
		const timeSinceLastSubmission = Date.now() - player.lastSubmissionTime;
		const minTimeBetweenSubmissions = gameState.settings.submissionRateLimit ?? 1000;

		// Only apply rate limiting if value is greater than 0
		if (minTimeBetweenSubmissions > 0 && timeSinceLastSubmission < minTimeBetweenSubmissions) {
			const waitTime = Math.ceil((minTimeBetweenSubmissions - timeSinceLastSubmission) / 1000);
			return {
				canSubmit: false,
				reason: `Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before submitting another word`
			};
		}
	}

	// Check max submissions per player
	if (gameState.settings.maxSubmissionsPerPlayer) {
		const playerSubmissions = gameState.chain.filter(
			(s) => s.submittedBy === playerId && s.isValid
		).length;

		if (playerSubmissions >= gameState.settings.maxSubmissionsPerPlayer) {
			return {
				canSubmit: false,
				reason: 'Maximum submissions reached'
			};
		}
	}

	return { canSubmit: true };
}

/**
 * Add a word submission to the game state
 */
export function addSubmission(
	gameState: WordChainGameState,
	word: string,
	playerId: string,
	playerName: string
): { updatedState: WordChainGameState; submission: WordSubmission } {
	// Validate submission
	const validation = validateWordSubmission(word, gameState);

	// Create submission
	const submission: WordSubmission = {
		id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		word: word.trim(),
		submittedBy: playerId,
		submittedByName: playerName,
		timestamp: Date.now(),
		isValid: validation.isValid,
		validationMessage: validation.reason
	};

	// Update game state
	const updatedState: WordChainGameState = {
		...gameState,
		chain: [...gameState.chain, submission]
	};

	// Update player stats
	const playerIndex = updatedState.players.findIndex((p) => p.id === playerId);
	if (playerIndex !== -1) {
		updatedState.players[playerIndex] = {
			...updatedState.players[playerIndex],
			lastSubmissionTime: Date.now(),
			score: submission.isValid
				? updatedState.players[playerIndex].score + 1
				: updatedState.players[playerIndex].score
		};
	}

	// Advance turn in turn-based mode if submission was valid
	if (gameState.mode === 'turn-based' && submission.isValid) {
		const nextPlayer = getNextPlayer(updatedState);
		if (nextPlayer) {
			updatedState.currentTurnPlayerId = nextPlayer.id;

			// Update isCurrentTurn flag for all players
			updatedState.players = updatedState.players.map((p) => ({
				...p,
				isCurrentTurn: p.id === nextPlayer.id
			}));
		}
	}

	return { updatedState, submission };
}

/**
 * Calculate game statistics
 */
export function getGameStats(gameState: WordChainGameState) {
	const validWords = gameState.chain.filter((s) => s.isValid);
	const totalSubmissions = gameState.chain.length;
	const validSubmissions = validWords.length;
	const rejectedSubmissions = totalSubmissions - validSubmissions;

	// Calculate chain length
	const chainLength = validWords.length;

	// Get top players
	const topPlayers = [...gameState.players]
		.sort((a, b) => b.score - a.score)
		.slice(0, 5);

	return {
		totalSubmissions,
		validSubmissions,
		rejectedSubmissions,
		chainLength,
		topPlayers,
		averageWordLength:
			validWords.length > 0
				? validWords.reduce((sum, s) => sum + s.word.length, 0) / validWords.length
				: 0
	};
}
