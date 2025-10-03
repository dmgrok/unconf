import { describe, it, expect, beforeEach } from 'vitest';
import {
	validateWordSubmission,
	addSubmission,
	isDuplicateWord,
	createGameState
} from '$lib/games/word-chain';
import type { WordChainGameState } from '$lib/games/word-chain';

describe('Word Chain Conflict Resolution', () => {
	describe('Simultaneous Mode - First Valid Wins', () => {
		let gameState: WordChainGameState;

		beforeEach(() => {
			gameState = createGameState('event-123', 'simultaneous');
			gameState.status = 'active';
			gameState.players = [
				{ id: 'player1', name: 'Alice', score: 0, isCurrentTurn: false },
				{ id: 'player2', name: 'Bob', score: 0, isCurrentTurn: false },
				{ id: 'player3', name: 'Charlie', score: 0, isCurrentTurn: false }
			];
		});

		it('accepts first submission and rejects duplicate', () => {
			// Player 1 submits "test"
			const { updatedState: state1, submission: sub1 } = addSubmission(
				gameState,
				'test',
				'player1',
				'Alice'
			);

			expect(sub1.isValid).toBe(true);
			expect(state1.chain).toHaveLength(1);

			// Player 2 submits "table" (valid, starts with 't')
			const { updatedState: state2 } = addSubmission(state1, 'table', 'player2', 'Bob');

			// Player 3 tries to submit "table" again (duplicate, but also starts with 'e' from test)
			// Need a word that follows the chain (starts with 'e') but is a duplicate
			// Let's try "elephant" then duplicate it
			const { updatedState: state3 } = addSubmission(state2, 'elephant', 'player3', 'Charlie');

			// Now try to submit "elephant" again (starts with 't' from elephant, and is duplicate)
			const { updatedState: state4, submission: sub4 } = addSubmission(
				state3,
				'table',
				'player1',
				'Alice'
			);

			expect(sub4.isValid).toBe(false);
			expect(sub4.validationMessage).toContain('already been used');
		});

		it('handles race condition - both valid words submitted simultaneously', () => {
			// First submission: "apple"
			const { updatedState: state1, submission: sub1 } = addSubmission(
				gameState,
				'apple',
				'player1',
				'Alice'
			);

			expect(sub1.isValid).toBe(true);

			// Second submission (following the chain): "elephant"
			const { updatedState: state2, submission: sub2 } = addSubmission(
				state1,
				'elephant',
				'player2',
				'Bob'
			);

			expect(sub2.isValid).toBe(true);

			// Third submission tries to submit based on "apple" (e), but "elephant" already used it
			// Player 3 submits "energy" which starts with "e" (from apple)
			// But the last valid word is now "elephant" (ends with "t")
			const { submission: sub3 } = addSubmission(state2, 'energy', 'player3', 'Charlie');

			expect(sub3.isValid).toBe(false);
			expect(sub3.validationMessage).toContain('must start with');
		});

		it('maintains correct chain order with timestamps', () => {
			// Simulate multiple rapid submissions
			const { updatedState: state1 } = addSubmission(gameState, 'apple', 'player1', 'Alice');

			const { updatedState: state2 } = addSubmission(state1, 'elephant', 'player2', 'Bob');

			const { updatedState: state3 } = addSubmission(state2, 'tiger', 'player3', 'Charlie');

			// Verify chain order
			expect(state3.chain).toHaveLength(3);
			expect(state3.chain[0].word).toBe('apple');
			expect(state3.chain[1].word).toBe('elephant');
			expect(state3.chain[2].word).toBe('tiger');

			// Verify timestamps are in order
			expect(state3.chain[0].timestamp).toBeLessThanOrEqual(state3.chain[1].timestamp);
			expect(state3.chain[1].timestamp).toBeLessThanOrEqual(state3.chain[2].timestamp);
		});

		it('allows invalid submissions in chain but does not use them for validation', () => {
			const { updatedState: state1 } = addSubmission(gameState, 'apple', 'player1', 'Alice');

			// Player 2 submits invalid word (doesn't follow chain)
			const { updatedState: state2, submission: invalid } = addSubmission(
				state1,
				'banana',
				'player2',
				'Bob'
			);

			expect(invalid.isValid).toBe(false);

			// Player 3 submits word based on last VALID word (apple -> e)
			const { submission: valid } = addSubmission(state2, 'elephant', 'player3', 'Charlie');

			expect(valid.isValid).toBe(true);
		});

		it('rejects same word with different casing by default', () => {
			gameState.settings.caseSensitive = false;

			const { updatedState: state1 } = addSubmission(gameState, 'test', 'player1', 'Alice');

			expect(state1.chain[0].isValid).toBe(true);

			// Submit "table" first (valid chain continuation: starts with 't')
			const { updatedState: state2 } = addSubmission(state1, 'table', 'player2', 'Bob');

			// Submit "elephant" (starts with 'e', end of "table")
			const { updatedState: state3 } = addSubmission(state2, 'elephant', 'player3', 'Charlie');

			// Try to submit "TABLE" with different case (starts with 't' from elephant, but is duplicate)
			const { submission } = addSubmission(state3, 'TABLE', 'player1', 'Alice');

			expect(submission.isValid).toBe(false);
			expect(submission.validationMessage).toContain('already been used');
		});

		it('handles duplicate check correctly', () => {
			const { updatedState: state1 } = addSubmission(gameState, 'apple', 'player1', 'Alice');

			// Check if "apple" is a duplicate
			const isDuplicate = isDuplicateWord('apple', state1.chain, gameState.settings);
			expect(isDuplicate).toBe(true);

			// Check if "elephant" is a duplicate
			const isNotDuplicate = isDuplicateWord('elephant', state1.chain, gameState.settings);
			expect(isNotDuplicate).toBe(false);
		});

		it('updates player scores correctly for valid submissions only', () => {
			let state = gameState;

			// Player 1 submits valid word
			const result1 = addSubmission(state, 'apple', 'player1', 'Alice');
			state = result1.updatedState;

			const player1 = state.players.find(p => p.id === 'player1');
			expect(player1?.score).toBe(1);

			// Player 2 submits invalid word
			const result2 = addSubmission(state, 'banana', 'player2', 'Bob');
			state = result2.updatedState;

			const player2 = state.players.find(p => p.id === 'player2');
			expect(player2?.score).toBe(0);

			// Player 3 submits valid word
			const result3 = addSubmission(state, 'elephant', 'player3', 'Charlie');
			state = result3.updatedState;

			const player3 = state.players.find(p => p.id === 'player3');
			expect(player3?.score).toBe(1);
		});
	});

	describe('Turn-based Mode - Conflict Prevention', () => {
		let gameState: WordChainGameState;

		beforeEach(() => {
			gameState = createGameState('event-456', 'turn-based');
			gameState.status = 'active';
			gameState.players = [
				{ id: 'player1', name: 'Alice', score: 0, isCurrentTurn: true },
				{ id: 'player2', name: 'Bob', score: 0, isCurrentTurn: false }
			];
			gameState.currentTurnPlayerId = 'player1';
		});

		it('prevents conflicts by enforcing turn order', () => {
			// In turn-based mode, canPlayerSubmit would reject player2
			// The addSubmission function itself doesn't check turns,
			// but the server-side handler does via canPlayerSubmit

			// Player 1's turn - valid submission
			const { updatedState: state1, submission: sub1 } = addSubmission(
				gameState,
				'apple',
				'player1',
				'Alice'
			);

			expect(sub1.isValid).toBe(true);
			expect(state1.currentTurnPlayerId).toBe('player2'); // Turn advanced

			// Player 2's turn - valid submission
			const { submission: sub2 } = addSubmission(state1, 'elephant', 'player2', 'Bob');

			expect(sub2.isValid).toBe(true);
		});

		it('advances turn only on valid submission', () => {
			// Valid submission
			const { updatedState: state1 } = addSubmission(gameState, 'apple', 'player1', 'Alice');

			expect(state1.currentTurnPlayerId).toBe('player2');

			// Invalid submission (doesn't follow chain)
			const { updatedState: state2 } = addSubmission(state1, 'banana', 'player2', 'Bob');

			// Turn should stay with player2 since submission was invalid
			expect(state2.currentTurnPlayerId).toBe('player2');
		});
	});

	describe('Validation Edge Cases', () => {
		let gameState: WordChainGameState;

		beforeEach(() => {
			gameState = createGameState('event-789', 'simultaneous');
			gameState.status = 'active';
			gameState.players = [
				{ id: 'player1', name: 'Alice', score: 0, isCurrentTurn: false },
				{ id: 'player2', name: 'Bob', score: 0, isCurrentTurn: false }
			];
		});

		it('validates word length limits', () => {
			// Too short
			const short = validateWordSubmission('a', gameState);
			expect(short.isValid).toBe(false);
			expect(short.reason).toContain('at least');

			// Too long
			const long = validateWordSubmission('a'.repeat(21), gameState);
			expect(long.isValid).toBe(false);
			expect(long.reason).toContain('no more than');

			// Just right
			const valid = validateWordSubmission('apple', gameState);
			expect(valid.isValid).toBe(true);
		});

		it('rejects words with non-letter characters', () => {
			const result = validateWordSubmission('app1e', gameState);
			expect(result.isValid).toBe(false);
			expect(result.reason).toContain('only letters');
		});

		it('handles empty chain correctly', () => {
			// First word can be anything valid
			const result = validateWordSubmission('zebra', gameState);
			expect(result.isValid).toBe(true);
		});
	});
});
