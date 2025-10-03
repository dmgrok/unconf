/**
 * Game mode for word-chain
 */
export type WordChainGameMode = 'turn-based' | 'simultaneous';

/**
 * Game status
 */
export type WordChainGameStatus = 'waiting' | 'active' | 'paused' | 'completed';

/**
 * A single word submission in the chain
 */
export interface WordSubmission {
	id: string;
	word: string;
	submittedBy: string;
	submittedByName: string;
	timestamp: number;
	isValid: boolean;
	validationMessage?: string;
}

/**
 * Player state in the game
 */
export interface WordChainPlayer {
	id: string;
	name: string;
	score: number;
	isCurrentTurn: boolean;
	lastSubmissionTime?: number;
}

/**
 * Complete word-chain game state
 */
export interface WordChainGameState {
	id: string;
	eventId: string;
	mode: WordChainGameMode;
	status: WordChainGameStatus;
	chain: WordSubmission[];
	players: WordChainPlayer[];
	currentTurnPlayerId?: string;
	startTime?: number;
	endTime?: number;
	settings: WordChainGameSettings;
}

/**
 * Game configuration settings
 */
export interface WordChainGameSettings {
	timeLimit?: number; // Game duration in seconds
	turnTimeLimit?: number; // Time limit per turn in seconds
	minWordLength: number;
	maxWordLength: number;
	allowDuplicates: boolean;
	caseSensitive: boolean;
	requireValidWords: boolean; // Require dictionary validation
	maxSubmissionsPerPlayer?: number;
	enableProfanityFilter?: boolean; // Enable profanity filtering (default: true)
	submissionRateLimit?: number; // Minimum time between submissions in ms (default: 1000)
}

/**
 * Validation result for a word submission
 */
export interface WordValidationResult {
	isValid: boolean;
	reason?: string;
	suggestedWord?: string;
}

/**
 * Default game settings
 */
export const DEFAULT_WORD_CHAIN_SETTINGS: WordChainGameSettings = {
	minWordLength: 2,
	maxWordLength: 20,
	allowDuplicates: false,
	caseSensitive: false,
	requireValidWords: true,
	turnTimeLimit: 30,
	enableProfanityFilter: true,
	submissionRateLimit: 1000 // 1 second between submissions
};
