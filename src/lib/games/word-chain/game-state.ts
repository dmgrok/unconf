import { writable, derived, get } from 'svelte/store';
import type { WordChainGameState, WordChainPlayer, WordChainGameMode } from './types';
import { DEFAULT_WORD_CHAIN_SETTINGS } from './types';
import { addSubmission, canPlayerSubmit, getGameStats, validateWordSubmissionAsync } from './game-logic';

/**
 * Create a new word-chain game state
 */
export function createGameState(
	eventId: string,
	mode: WordChainGameMode = 'turn-based'
): WordChainGameState {
	return {
		id: `game-${Date.now()}`,
		eventId,
		mode,
		status: 'waiting',
		chain: [],
		players: [],
		settings: { ...DEFAULT_WORD_CHAIN_SETTINGS }
	};
}

/**
 * Word-chain game store
 */
function createWordChainStore() {
	const { subscribe, set, update } = writable<WordChainGameState | null>(null);

	return {
		subscribe,

		/**
		 * Initialize a new game
		 */
		init: (eventId: string, mode: WordChainGameMode = 'turn-based') => {
			set(createGameState(eventId, mode));
		},

		/**
		 * Start the game
		 */
		start: () => {
			update((state) => {
				if (!state) return state;
				return {
					...state,
					status: 'active',
					startTime: Date.now()
				};
			});
		},

		/**
		 * Pause the game
		 */
		pause: () => {
			update((state) => {
				if (!state) return state;
				return { ...state, status: 'paused' };
			});
		},

		/**
		 * Resume the game
		 */
		resume: () => {
			update((state) => {
				if (!state) return state;
				return { ...state, status: 'active' };
			});
		},

		/**
		 * End the game
		 */
		end: () => {
			update((state) => {
				if (!state) return state;
				return {
					...state,
					status: 'completed',
					endTime: Date.now()
				};
			});
		},

		/**
		 * Add a player to the game
		 */
		addPlayer: (playerId: string, playerName: string) => {
			update((state) => {
				if (!state) return state;

				// Check if player already exists
				if (state.players.some((p) => p.id === playerId)) {
					return state;
				}

				const newPlayer: WordChainPlayer = {
					id: playerId,
					name: playerName,
					score: 0,
					isCurrentTurn: state.players.length === 0 // First player gets first turn
				};

				const updatedPlayers = [...state.players, newPlayer];

				return {
					...state,
					players: updatedPlayers,
					currentTurnPlayerId:
						state.currentTurnPlayerId || (state.mode === 'turn-based' ? playerId : undefined)
				};
			});
		},

		/**
		 * Remove a player from the game
		 */
		removePlayer: (playerId: string) => {
			update((state) => {
				if (!state) return state;

				const updatedPlayers = state.players.filter((p) => p.id !== playerId);

				// If removed player had the turn, move to next player
				let newCurrentTurnPlayerId = state.currentTurnPlayerId;
				if (state.currentTurnPlayerId === playerId && state.mode === 'turn-based') {
					newCurrentTurnPlayerId = updatedPlayers.length > 0 ? updatedPlayers[0].id : undefined;
				}

				return {
					...state,
					players: updatedPlayers,
					currentTurnPlayerId: newCurrentTurnPlayerId
				};
			});
		},

		/**
		 * Submit a word (synchronous - no dictionary validation)
		 */
		submitWord: (word: string, playerId: string, playerName: string) => {
			const state = get({ subscribe });
			if (!state) {
				return { success: false, reason: 'Game not initialized' };
			}

			// Check if player can submit
			const canSubmit = canPlayerSubmit(playerId, state);
			if (!canSubmit.canSubmit) {
				return { success: false, reason: canSubmit.reason };
			}

			// Add submission
			const { updatedState, submission } = addSubmission(state, word, playerId, playerName);

			// Update store
			set(updatedState);

			return {
				success: submission.isValid,
				reason: submission.validationMessage,
				submission
			};
		},

		/**
		 * Submit a word with async dictionary validation
		 */
		submitWordAsync: async (word: string, playerId: string, playerName: string) => {
			const state = get({ subscribe });
			if (!state) {
				return { success: false, reason: 'Game not initialized' };
			}

			// Check if player can submit
			const canSubmit = canPlayerSubmit(playerId, state);
			if (!canSubmit.canSubmit) {
				return { success: false, reason: canSubmit.reason };
			}

			// Validate word with dictionary if required
			const validation = await validateWordSubmissionAsync(word, state);

			if (!validation.isValid) {
				return {
					success: false,
					reason: validation.reason
				};
			}

			// Add submission
			const { updatedState, submission } = addSubmission(state, word, playerId, playerName);

			// Update store
			set(updatedState);

			return {
				success: submission.isValid,
				reason: submission.validationMessage,
				submission,
				definition: validation.suggestedWord
			};
		},

		/**
		 * Update game settings
		 */
		updateSettings: (settings: Partial<WordChainGameState['settings']>) => {
			update((state) => {
				if (!state) return state;
				return {
					...state,
					settings: { ...state.settings, ...settings }
				};
			});
		},

		/**
		 * Set the entire game state (for synchronization)
		 */
		setState: (newState: WordChainGameState) => {
			set(newState);
		},

		/**
		 * Reset the game
		 */
		reset: () => {
			set(null);
		}
	};
}

// Export singleton instance
export const wordChainGame = createWordChainStore();

// Derived stores for common queries
export const currentPlayer = derived(wordChainGame, ($game) => {
	if (!$game || !$game.currentTurnPlayerId) return null;
	return $game.players.find((p) => p.id === $game.currentTurnPlayerId) || null;
});

export const validChain = derived(wordChainGame, ($game) => {
	if (!$game) return [];
	return $game.chain.filter((s) => s.isValid);
});

export const gameStats = derived(wordChainGame, ($game) => {
	if (!$game) return null;
	return getGameStats($game);
});

export const isGameActive = derived(wordChainGame, ($game) => {
	return $game?.status === 'active';
});
