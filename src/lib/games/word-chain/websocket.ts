/**
 * WebSocket integration for word-chain game
 * Handles real-time word submissions and game state synchronization
 */

import type { Socket } from 'socket.io';
import type { Server as SocketIOServer } from 'socket.io';
import type { WordChainGameState, WordSubmission } from './types';
import { validateWordSubmissionAsync, canPlayerSubmit, addSubmission } from './game-logic';
import { createGameState } from './game-state';
import { get } from 'svelte/store';

// Server-side game state storage (in production, use Redis or database)
const gameStates = new Map<string, WordChainGameState>();

/**
 * Get or create game state for an event
 */
function getOrCreateGameState(eventId: string, mode: 'turn-based' | 'simultaneous' = 'turn-based'): WordChainGameState {
	if (!gameStates.has(eventId)) {
		const state = createGameState(eventId, mode);
		gameStates.set(eventId, state);
	}
	return gameStates.get(eventId)!;
}

/**
 * Update game state
 */
function updateGameState(eventId: string, state: WordChainGameState): void {
	gameStates.set(eventId, state);
}

// Event names for word-chain game
export const WORD_CHAIN_EVENTS = {
	// Client -> Server
	JOIN_GAME: 'word-chain:join',
	LEAVE_GAME: 'word-chain:leave',
	SUBMIT_WORD: 'word-chain:submit',
	REQUEST_STATE: 'word-chain:request-state',

	// Server -> Client
	GAME_STATE: 'word-chain:state',
	WORD_SUBMITTED: 'word-chain:word-submitted',
	WORD_REJECTED: 'word-chain:word-rejected',
	PLAYER_JOINED: 'word-chain:player-joined',
	PLAYER_LEFT: 'word-chain:player-left',
	GAME_STARTED: 'word-chain:game-started',
	GAME_ENDED: 'word-chain:game-ended',
	TURN_CHANGED: 'word-chain:turn-changed',
	ERROR: 'word-chain:error'
} as const;

/**
 * Get the room name for a word-chain game
 */
function getGameRoom(eventId: string): string {
	return `word-chain:${eventId}`;
}

/**
 * Setup word-chain WebSocket handlers on the server
 */
export function setupWordChainHandlers(io: SocketIOServer): void {
	io.on('connection', (socket: Socket) => {
		let currentGameRoom: string | null = null;
		let currentUserId: string | null = null;

		/**
		 * Handle player joining the game
		 */
		socket.on(
			WORD_CHAIN_EVENTS.JOIN_GAME,
			async (
				data: { eventId: string; userId: string; userName: string; mode?: 'turn-based' | 'simultaneous' },
				callback?: (response: any) => void
			) => {
				try {
					const { eventId, userId, userName, mode = 'turn-based' } = data;

					if (!eventId || !userId || !userName) {
						throw new Error('Missing required fields: eventId, userId, userName');
					}

					const gameRoom = getGameRoom(eventId);

					// Join the socket room
					await socket.join(gameRoom);
					currentGameRoom = gameRoom;
					currentUserId = userId;

					// Get or create game state
					const gameState = getOrCreateGameState(eventId, mode);

					// Add player to server-side game state if not already present
					const existingPlayer = gameState.players.find(p => p.id === userId);
					if (!existingPlayer) {
						const isFirstPlayer = gameState.players.length === 0;
						gameState.players.push({
							id: userId,
							name: userName,
							score: 0,
							isCurrentTurn: isFirstPlayer && mode === 'turn-based',
							lastSubmissionTime: undefined
						});

						// Set first player as current turn in turn-based mode
						if (isFirstPlayer && mode === 'turn-based') {
							gameState.currentTurnPlayerId = userId;
						}

						// Update server state
						updateGameState(eventId, gameState);

						// Broadcast player joined to other players
						socket.to(gameRoom).emit(WORD_CHAIN_EVENTS.PLAYER_JOINED, {
							userId,
							userName,
							timestamp: Date.now(),
							playerCount: gameState.players.length
						});
					}

					// Send current game state to the joining player
					callback?.({
						success: true,
						message: 'Joined game successfully',
						gameState
					});
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					socket.emit(WORD_CHAIN_EVENTS.ERROR, {
						message: errorMessage,
						code: 'JOIN_FAILED'
					});
					callback?.({
						success: false,
						error: errorMessage
					});
				}
			}
		);

		/**
		 * Handle word submission with conflict resolution
		 * Implements "first valid wins" strategy using timestamps
		 */
		socket.on(
			WORD_CHAIN_EVENTS.SUBMIT_WORD,
			async (
				data: { word: string; userId: string; userName: string; eventId: string },
				callback?: (response: any) => void
			) => {
				const submissionTimestamp = Date.now();

				try {
					if (!currentGameRoom) {
						throw new Error('Not in a game');
					}

					const { word, userId, userName, eventId } = data;

					if (!word || !userId || !userName || !eventId) {
						throw new Error('Missing required fields: word, userId, userName, eventId');
					}

					// Get current game state from server
					const gameState = getOrCreateGameState(eventId);

					// Check if player can submit (turn-based or rate limiting)
					const canSubmit = canPlayerSubmit(userId, gameState);
					if (!canSubmit.canSubmit) {
						throw new Error(canSubmit.reason || 'Cannot submit at this time');
					}

					// Validate word submission with dictionary check
					const validation = await validateWordSubmissionAsync(word, gameState);

					if (!validation.isValid) {
						throw new Error(validation.reason || 'Invalid word');
					}

					// Add submission to game state (this is atomic on the server)
					const { updatedState, submission } = addSubmission(
						gameState,
						word,
						userId,
						userName
					);

					// Check if submission was marked as valid
					if (!submission.isValid) {
						// This can happen if the word became invalid between validation and submission
						// (e.g., another player submitted the same word first in simultaneous mode)
						throw new Error(submission.validationMessage || 'Word rejected');
					}

					// Update server-side game state
					updateGameState(eventId, updatedState);

					// Broadcast successful submission to all players
					io.to(currentGameRoom).emit(WORD_CHAIN_EVENTS.WORD_SUBMITTED, {
						submission,
						gameState: updatedState
					});

					// If turn changed, broadcast turn change
					if (gameState.mode === 'turn-based' &&
					    gameState.currentTurnPlayerId !== updatedState.currentTurnPlayerId) {
						const nextPlayer = updatedState.players.find(
							p => p.id === updatedState.currentTurnPlayerId
						);
						if (nextPlayer) {
							io.to(currentGameRoom).emit(WORD_CHAIN_EVENTS.TURN_CHANGED, {
								currentPlayerId: nextPlayer.id,
								currentPlayerName: nextPlayer.name,
								timestamp: Date.now()
							});
						}
					}

					callback?.({
						success: true,
						submission,
						gameState: updatedState
					});
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';

					// Broadcast rejection to all players for transparency
					if (currentGameRoom) {
						io.to(currentGameRoom).emit(WORD_CHAIN_EVENTS.WORD_REJECTED, {
							word: data.word,
							userId: data.userId,
							userName: data.userName,
							reason: errorMessage,
							timestamp: submissionTimestamp
						});
					}

					callback?.({
						success: false,
						error: errorMessage,
						timestamp: submissionTimestamp
					});
				}
			}
		);

		/**
		 * Handle game state request
		 */
		socket.on(WORD_CHAIN_EVENTS.REQUEST_STATE, (
			data: { eventId: string },
			callback?: (response: any) => void
		) => {
			try {
				if (!currentGameRoom) {
					throw new Error('Not in a game');
				}

				const { eventId } = data;
				if (!eventId) {
					throw new Error('Missing eventId');
				}

				// Get game state from server storage
				const gameState = getOrCreateGameState(eventId);

				callback?.({
					success: true,
					state: gameState
				});
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				callback?.({
					success: false,
					error: errorMessage
				});
			}
		});

		/**
		 * Handle player leaving
		 */
		socket.on(WORD_CHAIN_EVENTS.LEAVE_GAME, () => {
			if (currentGameRoom && currentUserId) {
				socket.to(currentGameRoom).emit(WORD_CHAIN_EVENTS.PLAYER_LEFT, {
					userId: currentUserId,
					timestamp: Date.now()
				});

				socket.leave(currentGameRoom);
				currentGameRoom = null;
				currentUserId = null;
			}
		});

		/**
		 * Handle disconnect
		 */
		socket.on('disconnect', () => {
			if (currentGameRoom && currentUserId) {
				socket.to(currentGameRoom).emit(WORD_CHAIN_EVENTS.PLAYER_LEFT, {
					userId: currentUserId,
					timestamp: Date.now()
				});
			}
		});
	});
}

/**
 * Broadcast game state update to all players
 */
export function broadcastGameState(io: SocketIOServer, eventId: string, state: WordChainGameState): void {
	const gameRoom = getGameRoom(eventId);
	io.to(gameRoom).emit(WORD_CHAIN_EVENTS.GAME_STATE, state);
}

/**
 * Broadcast turn change to all players
 */
export function broadcastTurnChange(
	io: SocketIOServer,
	eventId: string,
	currentPlayerId: string,
	currentPlayerName: string
): void {
	const gameRoom = getGameRoom(eventId);
	io.to(gameRoom).emit(WORD_CHAIN_EVENTS.TURN_CHANGED, {
		currentPlayerId,
		currentPlayerName,
		timestamp: Date.now()
	});
}

/**
 * Broadcast game start to all players
 */
export function broadcastGameStart(io: SocketIOServer, eventId: string): void {
	const gameRoom = getGameRoom(eventId);
	io.to(gameRoom).emit(WORD_CHAIN_EVENTS.GAME_STARTED, {
		timestamp: Date.now()
	});
}

/**
 * Broadcast game end to all players
 */
export function broadcastGameEnd(io: SocketIOServer, eventId: string, stats: any): void {
	const gameRoom = getGameRoom(eventId);
	io.to(gameRoom).emit(WORD_CHAIN_EVENTS.GAME_ENDED, {
		stats,
		timestamp: Date.now()
	});
}
