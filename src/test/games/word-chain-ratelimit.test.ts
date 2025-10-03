import { describe, it, expect, beforeEach, vi } from 'vitest';
import { canPlayerSubmit, addSubmission, createGameState } from '$lib/games/word-chain';
import type { WordChainGameState } from '$lib/games/word-chain';

describe('Word Chain Rate Limiting', () => {
	let gameState: WordChainGameState;

	beforeEach(() => {
		gameState = createGameState('event-123', 'simultaneous');
		gameState.status = 'active';
		gameState.players = [
			{ id: 'player1', name: 'Alice', score: 0, isCurrentTurn: false },
			{ id: 'player2', name: 'Bob', score: 0, isCurrentTurn: false }
		];
	});

	describe('Default rate limiting (1 second)', () => {
		it('allows first submission', () => {
			const result = canPlayerSubmit('player1', gameState);
			expect(result.canSubmit).toBe(true);
		});

		it('blocks rapid successive submissions', () => {
			// Set last submission time to now
			const player = gameState.players.find((p) => p.id === 'player1');
			if (player) {
				player.lastSubmissionTime = Date.now();
			}

			const result = canPlayerSubmit('player1', gameState);
			expect(result.canSubmit).toBe(false);
			expect(result.reason).toContain('wait');
		});

		it('allows submission after rate limit period', () => {
			// Set last submission time to 2 seconds ago
			const player = gameState.players.find((p) => p.id === 'player1');
			if (player) {
				player.lastSubmissionTime = Date.now() - 2000;
			}

			const result = canPlayerSubmit('player1', gameState);
			expect(result.canSubmit).toBe(true);
		});

		it('provides helpful wait time message', () => {
			const player = gameState.players.find((p) => p.id === 'player1');
			if (player) {
				player.lastSubmissionTime = Date.now() - 500; // 500ms ago
			}

			const result = canPlayerSubmit('player1', gameState);
			expect(result.canSubmit).toBe(false);
			expect(result.reason).toMatch(/wait \d+ second/);
		});
	});

	describe('Custom rate limiting', () => {
		it('respects custom rate limit setting', () => {
			gameState.settings.submissionRateLimit = 3000; // 3 seconds

			// Set last submission 2 seconds ago
			const player = gameState.players.find((p) => p.id === 'player1');
			if (player) {
				player.lastSubmissionTime = Date.now() - 2000;
			}

			// Should be blocked (need to wait 3 seconds)
			const result = canPlayerSubmit('player1', gameState);
			expect(result.canSubmit).toBe(false);
		});

		it('allows submission after custom rate limit', () => {
			gameState.settings.submissionRateLimit = 2000; // 2 seconds

			// Set last submission 2.5 seconds ago
			const player = gameState.players.find((p) => p.id === 'player1');
			if (player) {
				player.lastSubmissionTime = Date.now() - 2500;
			}

			const result = canPlayerSubmit('player1', gameState);
			expect(result.canSubmit).toBe(true);
		});

		it('handles very short rate limit (100ms)', () => {
			gameState.settings.submissionRateLimit = 100;

			const player = gameState.players.find((p) => p.id === 'player1');
			if (player) {
				player.lastSubmissionTime = Date.now() - 150;
			}

			const result = canPlayerSubmit('player1', gameState);
			expect(result.canSubmit).toBe(true);
		});

		it('handles zero rate limit (no limiting)', () => {
			gameState.settings.submissionRateLimit = 0;

			const player = gameState.players.find((p) => p.id === 'player1');
			if (player) {
				player.lastSubmissionTime = Date.now(); // Just now
			}

			const result = canPlayerSubmit('player1', gameState);
			expect(result.canSubmit).toBe(true);
		});
	});

	describe('Rate limiting per player', () => {
		it('applies rate limit independently per player', () => {
			// Player 1 just submitted
			const player1 = gameState.players.find((p) => p.id === 'player1');
			if (player1) {
				player1.lastSubmissionTime = Date.now();
			}

			// Player 1 is blocked
			const result1 = canPlayerSubmit('player1', gameState);
			expect(result1.canSubmit).toBe(false);

			// Player 2 can still submit
			const result2 = canPlayerSubmit('player2', gameState);
			expect(result2.canSubmit).toBe(true);
		});
	});

	describe('Integration with submissions', () => {
		it('updates lastSubmissionTime after submission', () => {
			const { updatedState } = addSubmission(gameState, 'apple', 'player1', 'Alice');

			const player = updatedState.players.find((p) => p.id === 'player1');
			expect(player?.lastSubmissionTime).toBeDefined();
			expect(player?.lastSubmissionTime).toBeGreaterThan(Date.now() - 1000);
		});

		it('blocks rapid submissions after first', () => {
			// First submission
			const { updatedState } = addSubmission(gameState, 'apple', 'player1', 'Alice');

			// Try second submission immediately
			const canSubmit = canPlayerSubmit('player1', updatedState);
			expect(canSubmit.canSubmit).toBe(false);
		});

		it('allows submission after waiting', async () => {
			// Set a very short rate limit for testing
			gameState.settings.submissionRateLimit = 50;

			// First submission
			const { updatedState } = addSubmission(gameState, 'apple', 'player1', 'Alice');

			// Wait for rate limit to pass
			await new Promise((resolve) => setTimeout(resolve, 60));

			// Second submission should be allowed
			const canSubmit = canPlayerSubmit('player1', updatedState);
			expect(canSubmit.canSubmit).toBe(true);
		});
	});

	describe('Max submissions per player', () => {
		it('enforces max submissions limit', () => {
			gameState.settings.maxSubmissionsPerPlayer = 2;
			gameState.settings.submissionRateLimit = 0; // Disable rate limiting for this test

			// Add 2 valid submissions
			let state = gameState;
			const { updatedState: state1 } = addSubmission(state, 'apple', 'player1', 'Alice');
			const { updatedState: state2 } = addSubmission(state1, 'elephant', 'player1', 'Alice');

			// Third submission should be blocked
			const result = canPlayerSubmit('player1', state2);
			expect(result.canSubmit).toBe(false);
			expect(result.reason).toContain('Maximum submissions');
		});

		it('only counts valid submissions', () => {
			gameState.settings.maxSubmissionsPerPlayer = 2;
			gameState.settings.submissionRateLimit = 0; // Disable rate limiting for this test

			// Add 1 valid and 1 invalid submission
			let state = gameState;
			const { updatedState: state1 } = addSubmission(state, 'apple', 'player1', 'Alice');
			// Invalid submission (doesn't follow chain)
			const { updatedState: state2 } = addSubmission(state1, 'zebra', 'player1', 'Alice');

			// Player should still be able to submit (only 1 valid submission)
			const result = canPlayerSubmit('player1', state2);
			expect(result.canSubmit).toBe(true);
		});

		it('applies max submissions per player independently', () => {
			gameState.settings.maxSubmissionsPerPlayer = 1;

			// Player 1 submits
			const { updatedState: state1 } = addSubmission(gameState, 'apple', 'player1', 'Alice');

			// Player 1 is blocked
			const result1 = canPlayerSubmit('player1', state1);
			expect(result1.canSubmit).toBe(false);

			// Player 2 can still submit
			const result2 = canPlayerSubmit('player2', state1);
			expect(result2.canSubmit).toBe(true);
		});
	});

	describe('Combined rate limiting and turn-based', () => {
		beforeEach(() => {
			gameState.mode = 'turn-based';
			gameState.currentTurnPlayerId = 'player1';
			gameState.players[0].isCurrentTurn = true;
			gameState.players[1].isCurrentTurn = false;
		});

		it('enforces both turn and rate limit', () => {
			// Set recent submission time
			const player = gameState.players.find((p) => p.id === 'player1');
			if (player) {
				player.lastSubmissionTime = Date.now();
			}

			const result = canPlayerSubmit('player1', gameState);
			expect(result.canSubmit).toBe(false);
			expect(result.reason).toContain('wait');
		});

		it('rejects wrong player even if rate limit passed', () => {
			const result = canPlayerSubmit('player2', gameState);
			expect(result.canSubmit).toBe(false);
			expect(result.reason).toContain('Not your turn');
		});
	});

	describe('Edge cases', () => {
		it('handles missing lastSubmissionTime gracefully', () => {
			const result = canPlayerSubmit('player1', gameState);
			expect(result.canSubmit).toBe(true);
		});

		it('handles invalid player ID', () => {
			const result = canPlayerSubmit('nonexistent', gameState);
			// Should allow (player doesn't exist yet, might be joining)
			expect(result.canSubmit).toBe(true);
		});

		it('handles game not active', () => {
			gameState.status = 'paused';
			const result = canPlayerSubmit('player1', gameState);
			expect(result.canSubmit).toBe(false);
			expect(result.reason).toContain('not active');
		});
	});
});
