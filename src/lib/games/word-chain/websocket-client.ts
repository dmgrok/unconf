/**
 * Client-side WebSocket integration for word-chain game
 */

import { writable, derived, get } from 'svelte/store';
import { io, type Socket } from 'socket.io-client';
import type { WordChainGameState, WordSubmission } from './types';
import { WORD_CHAIN_EVENTS } from './websocket';
import { wordChainGame } from './game-state';

interface ConnectionState {
	isConnected: boolean;
	isConnecting: boolean;
	error: string | null;
	eventId: string | null;
}

/**
 * Connection state store
 */
export const connectionState = writable<ConnectionState>({
	isConnected: false,
	isConnecting: false,
	error: null,
	eventId: null
});

/**
 * WebSocket client instance
 */
let socket: Socket | null = null;

/**
 * Recent submissions store (for optimistic updates)
 */
export const recentSubmissions = writable<WordSubmission[]>([]);

/**
 * Connect to word-chain game
 */
export async function connectToWordChainGame(
	eventId: string,
	userId: string,
	userName: string
): Promise<boolean> {
	// Update connecting state
	connectionState.update((state) => ({
		...state,
		isConnecting: true,
		error: null
	}));

	try {
		// Create socket connection if not exists
		if (!socket) {
			socket = io({
				transports: ['websocket', 'polling']
			});

			setupSocketListeners();
		}

		// Join the game
		return new Promise((resolve) => {
			socket!.emit(
				WORD_CHAIN_EVENTS.JOIN_GAME,
				{ eventId, userId, userName },
				(response: any) => {
					if (response.success) {
						connectionState.update((state) => ({
							...state,
							isConnected: true,
							isConnecting: false,
							eventId
						}));
						resolve(true);
					} else {
						connectionState.update((state) => ({
							...state,
							isConnected: false,
							isConnecting: false,
							error: response.error || 'Failed to join game'
						}));
						resolve(false);
					}
				}
			);
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Connection failed';
		connectionState.update((state) => ({
			...state,
			isConnecting: false,
			error: errorMessage
		}));
		return false;
	}
}

/**
 * Disconnect from word-chain game
 */
export function disconnectFromWordChainGame(): void {
	if (socket) {
		socket.emit(WORD_CHAIN_EVENTS.LEAVE_GAME);
		socket.disconnect();
		socket = null;
	}

	connectionState.set({
		isConnected: false,
		isConnecting: false,
		error: null,
		eventId: null
	});

	recentSubmissions.set([]);
}

/**
 * Submit a word
 */
export async function submitWordToGame(
	word: string,
	userId: string,
	userName: string
): Promise<{ success: boolean; error?: string; submission?: WordSubmission }> {
	if (!socket) {
		return { success: false, error: 'Not connected to game' };
	}

	const state = get(connectionState);
	if (!state.isConnected) {
		return { success: false, error: 'Not connected to game' };
	}

	return new Promise((resolve) => {
		socket!.emit(
			WORD_CHAIN_EVENTS.SUBMIT_WORD,
			{ word, userId, userName },
			(response: any) => {
				if (response.success) {
					resolve({
						success: true,
						submission: response.submission
					});
				} else {
					resolve({
						success: false,
						error: response.error || 'Submission failed'
					});
				}
			}
		);
	});
}

/**
 * Request current game state
 */
export async function requestGameState(): Promise<WordChainGameState | null> {
	if (!socket) return null;

	return new Promise((resolve) => {
		socket!.emit(WORD_CHAIN_EVENTS.REQUEST_STATE, (response: any) => {
			if (response.success) {
				resolve(response.state);
			} else {
				resolve(null);
			}
		});
	});
}

/**
 * Setup socket event listeners
 */
function setupSocketListeners(): void {
	if (!socket) return;

	// Handle word submitted
	socket.on(WORD_CHAIN_EVENTS.WORD_SUBMITTED, (submission: WordSubmission) => {
		// Add to recent submissions
		recentSubmissions.update((submissions) => {
			const updated = [...submissions, submission];
			// Keep only last 50 submissions
			return updated.slice(-50);
		});

		// Update game state (if using the game store)
		const gameState = get(wordChainGame);
		if (gameState) {
			wordChainGame.setState({
				...gameState,
				chain: [...gameState.chain, submission]
			});
		}
	});

	// Handle word rejected
	socket.on(
		WORD_CHAIN_EVENTS.WORD_REJECTED,
		(data: { word: string; userId: string; reason: string; timestamp: number }) => {
			console.warn('Word rejected:', data);
			// Could emit a custom event or update a rejection store
		}
	);

	// Handle player joined
	socket.on(
		WORD_CHAIN_EVENTS.PLAYER_JOINED,
		(data: { userId: string; userName: string; timestamp: number }) => {
			console.log('Player joined:', data);
			// Update game state with new player
			const gameState = get(wordChainGame);
			if (gameState) {
				wordChainGame.addPlayer(data.userId, data.userName);
			}
		}
	);

	// Handle player left
	socket.on(WORD_CHAIN_EVENTS.PLAYER_LEFT, (data: { userId: string; timestamp: number }) => {
		console.log('Player left:', data);
		// Update game state
		const gameState = get(wordChainGame);
		if (gameState) {
			wordChainGame.removePlayer(data.userId);
		}
	});

	// Handle game state update
	socket.on(WORD_CHAIN_EVENTS.GAME_STATE, (state: WordChainGameState) => {
		wordChainGame.setState(state);
	});

	// Handle turn change
	socket.on(
		WORD_CHAIN_EVENTS.TURN_CHANGED,
		(data: { currentPlayerId: string; currentPlayerName: string; timestamp: number }) => {
			console.log('Turn changed:', data);
		}
	);

	// Handle game started
	socket.on(WORD_CHAIN_EVENTS.GAME_STARTED, (data: { timestamp: number }) => {
		console.log('Game started:', data);
		wordChainGame.start();
	});

	// Handle game ended
	socket.on(WORD_CHAIN_EVENTS.GAME_ENDED, (data: { stats: any; timestamp: number }) => {
		console.log('Game ended:', data);
		wordChainGame.end();
	});

	// Handle errors
	socket.on(WORD_CHAIN_EVENTS.ERROR, (data: { message: string; code: string }) => {
		console.error('Word-chain game error:', data);
		connectionState.update((state) => ({
			...state,
			error: data.message
		}));
	});

	// Handle connection events
	socket.on('connect', () => {
		console.log('Socket connected');
	});

	socket.on('disconnect', (reason) => {
		console.log('Socket disconnected:', reason);
		connectionState.update((state) => ({
			...state,
			isConnected: false,
			error: 'Disconnected from server'
		}));
	});

	socket.on('connect_error', (error) => {
		console.error('Connection error:', error);
		connectionState.update((state) => ({
			...state,
			isConnected: false,
			isConnecting: false,
			error: error.message
		}));
	});
}

/**
 * Derived store for connection status
 */
export const isConnectedToGame = derived(
	connectionState,
	($state) => $state.isConnected
);

/**
 * Derived store for connection errors
 */
export const connectionError = derived(
	connectionState,
	($state) => $state.error
);
