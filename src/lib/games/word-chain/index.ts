// Types
export type {
	WordChainGameMode,
	WordChainGameStatus,
	WordSubmission,
	WordChainPlayer,
	WordChainGameState,
	WordChainGameSettings,
	WordValidationResult
} from './types';

export { DEFAULT_WORD_CHAIN_SETTINGS } from './types';

// Game logic
export {
	validateChainRule,
	isDuplicateWord,
	validateWordSubmission,
	validateWordSubmissionAsync,
	getNextPlayer,
	canPlayerSubmit,
	addSubmission,
	getGameStats
} from './game-logic';

// Dictionary validation
export {
	validateWord,
	validateWords,
	preCacheCommonWords,
	clearDictionaryCache,
	getCacheStats
} from './dictionary';

// Game state management
export {
	createGameState,
	wordChainGame,
	currentPlayer,
	validChain,
	gameStats,
	isGameActive
} from './game-state';

// WebSocket integration (server-side)
export {
	setupWordChainHandlers,
	broadcastGameState,
	broadcastTurnChange,
	broadcastGameStart,
	broadcastGameEnd,
	WORD_CHAIN_EVENTS
} from './websocket';

// WebSocket client
export {
	connectionState,
	recentSubmissions,
	isConnectedToGame,
	connectionError,
	connectToWordChainGame,
	disconnectFromWordChainGame,
	submitWordToGame,
	requestGameState
} from './websocket-client';
