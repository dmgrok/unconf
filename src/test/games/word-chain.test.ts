import { describe, it, expect, beforeEach } from 'vitest';
import {
	validateChainRule,
	isDuplicateWord,
	validateWordSubmission,
	canPlayerSubmit,
	addSubmission,
	getNextPlayer,
	getGameStats,
	createGameState
} from '$lib/games/word-chain';
import type { WordChainGameState, WordSubmission } from '$lib/games/word-chain';

describe('Word Chain Game Logic', () => {
	let gameState: WordChainGameState;

	beforeEach(() => {
		gameState = createGameState('event-123', 'turn-based');
		gameState.status = 'active';
		gameState.players = [
			{ id: 'player1', name: 'Alice', score: 0, isCurrentTurn: true },
			{ id: 'player2', name: 'Bob', score: 0, isCurrentTurn: false }
		];
		gameState.currentTurnPlayerId = 'player1';
	});

	describe('validateChainRule', () => {
		it('accepts valid word at start of chain', () => {
			const result = validateChainRule('apple', null, gameState.settings);
			expect(result.isValid).toBe(true);
		});

		it('accepts word that starts with last letter of previous word', () => {
			const result = validateChainRule('elephant', 'apple', gameState.settings);
			expect(result.isValid).toBe(true);
		});

		it('rejects word that does not start with last letter', () => {
			const result = validateChainRule('banana', 'apple', gameState.settings);
			expect(result.isValid).toBe(false);
			expect(result.reason).toContain('must start with');
		});

		it('rejects word that is too short', () => {
			const result = validateChainRule('a', null, gameState.settings);
			expect(result.isValid).toBe(false);
			expect(result.reason).toContain('at least');
		});

		it('rejects word that is too long', () => {
			const longWord = 'a'.repeat(21);
			const result = validateChainRule(longWord, null, gameState.settings);
			expect(result.isValid).toBe(false);
			expect(result.reason).toContain('no more than');
		});

		it('rejects word with non-letter characters', () => {
			const result = validateChainRule('test123', null, gameState.settings);
			expect(result.isValid).toBe(false);
			expect(result.reason).toContain('only letters');
		});

		it('handles case insensitivity by default', () => {
			const result = validateChainRule('Elephant', 'apple', {
				...gameState.settings,
				caseSensitive: false
			});
			expect(result.isValid).toBe(true);
		});

		it('handles case sensitivity when enabled', () => {
			// When case sensitive, 'Elephant' starts with 'E' not 'e'
			const result = validateChainRule('Elephant', 'applE', {
				...gameState.settings,
				caseSensitive: true
			});
			expect(result.isValid).toBe(true);
		});
	});

	describe('isDuplicateWord', () => {
		it('returns false when word has not been used', () => {
			gameState.chain = [
				{
					id: '1',
					word: 'apple',
					submittedBy: 'player1',
					submittedByName: 'Alice',
					timestamp: Date.now(),
					isValid: true
				}
			];

			const isDuplicate = isDuplicateWord('banana', gameState.chain, gameState.settings);
			expect(isDuplicate).toBe(false);
		});

		it('returns true when word has been used', () => {
			gameState.chain = [
				{
					id: '1',
					word: 'apple',
					submittedBy: 'player1',
					submittedByName: 'Alice',
					timestamp: Date.now(),
					isValid: true
				}
			];

			const isDuplicate = isDuplicateWord('apple', gameState.chain, gameState.settings);
			expect(isDuplicate).toBe(true);
		});

		it('handles case insensitivity', () => {
			gameState.chain = [
				{
					id: '1',
					word: 'apple',
					submittedBy: 'player1',
					submittedByName: 'Alice',
					timestamp: Date.now(),
					isValid: true
				}
			];

			const isDuplicate = isDuplicateWord('APPLE', gameState.chain, {
				...gameState.settings,
				caseSensitive: false
			});
			expect(isDuplicate).toBe(true);
		});

		it('ignores invalid submissions', () => {
			gameState.chain = [
				{
					id: '1',
					word: 'apple',
					submittedBy: 'player1',
					submittedByName: 'Alice',
					timestamp: Date.now(),
					isValid: false
				}
			];

			const isDuplicate = isDuplicateWord('apple', gameState.chain, gameState.settings);
			expect(isDuplicate).toBe(false);
		});
	});

	describe('validateWordSubmission', () => {
		it('validates first word in chain', () => {
			const result = validateWordSubmission('apple', gameState);
			expect(result.isValid).toBe(true);
		});

		it('validates word following chain rule', () => {
			gameState.chain = [
				{
					id: '1',
					word: 'apple',
					submittedBy: 'player1',
					submittedByName: 'Alice',
					timestamp: Date.now(),
					isValid: true
				}
			];

			const result = validateWordSubmission('elephant', gameState);
			expect(result.isValid).toBe(true);
		});

		it('rejects duplicate when duplicates not allowed', () => {
			gameState.settings.allowDuplicates = false;
			gameState.chain = [
				{
					id: '1',
					word: 'apple',
					submittedBy: 'player1',
					submittedByName: 'Alice',
					timestamp: Date.now(),
					isValid: true
				},
				{
					id: '2',
					word: 'elephant',
					submittedBy: 'player2',
					submittedByName: 'Bob',
					timestamp: Date.now(),
					isValid: true
				},
				{
					id: '3',
					word: 'tree',
					submittedBy: 'player1',
					submittedByName: 'Alice',
					timestamp: Date.now(),
					isValid: true
				}
			];

			// Try to submit 'elephant' again which follows chain (e->e) but is duplicate
			const result = validateWordSubmission('elephant', gameState);
			expect(result.isValid).toBe(false);
			expect(result.reason).toContain('already been used');
		});

		it('allows duplicate when duplicates allowed', () => {
			gameState.settings.allowDuplicates = true;
			gameState.chain = [
				{
					id: '1',
					word: 'apple',
					submittedBy: 'player1',
					submittedByName: 'Alice',
					timestamp: Date.now(),
					isValid: true
				},
				{
					id: '2',
					word: 'elephant',
					submittedBy: 'player2',
					submittedByName: 'Bob',
					timestamp: Date.now(),
					isValid: true
				},
				{
					id: '3',
					word: 'tiger',
					submittedBy: 'player1',
					submittedByName: 'Alice',
					timestamp: Date.now(),
					isValid: true
				}
			];

			// Submit 'rabbit' which starts with 'r' (last letter of 'tiger') and is valid
			const result = validateWordSubmission('rabbit', gameState);
			expect(result.isValid).toBe(true);
		});
	});

	describe('canPlayerSubmit', () => {
		it('allows current player to submit in turn-based mode', () => {
			const result = canPlayerSubmit('player1', gameState);
			expect(result.canSubmit).toBe(true);
		});

		it('rejects non-current player in turn-based mode', () => {
			const result = canPlayerSubmit('player2', gameState);
			expect(result.canSubmit).toBe(false);
			expect(result.reason).toContain('Not your turn');
		});

		it('allows any player in simultaneous mode', () => {
			gameState.mode = 'simultaneous';
			const result1 = canPlayerSubmit('player1', gameState);
			const result2 = canPlayerSubmit('player2', gameState);
			expect(result1.canSubmit).toBe(true);
			expect(result2.canSubmit).toBe(true);
		});

		it('rejects when game is not active', () => {
			gameState.status = 'paused';
			const result = canPlayerSubmit('player1', gameState);
			expect(result.canSubmit).toBe(false);
			expect(result.reason).toContain('not active');
		});

		it('enforces rate limiting', () => {
			gameState.players[0].lastSubmissionTime = Date.now();
			const result = canPlayerSubmit('player1', gameState);
			expect(result.canSubmit).toBe(false);
			expect(result.reason).toContain('wait');
		});

		it('enforces max submissions per player', () => {
			gameState.settings.maxSubmissionsPerPlayer = 2;
			gameState.chain = [
				{
					id: '1',
					word: 'apple',
					submittedBy: 'player1',
					submittedByName: 'Alice',
					timestamp: Date.now(),
					isValid: true
				},
				{
					id: '2',
					word: 'elephant',
					submittedBy: 'player1',
					submittedByName: 'Alice',
					timestamp: Date.now(),
					isValid: true
				}
			];

			const result = canPlayerSubmit('player1', gameState);
			expect(result.canSubmit).toBe(false);
			expect(result.reason).toContain('Maximum submissions');
		});
	});

	describe('addSubmission', () => {
		it('adds valid submission to chain', () => {
			const { updatedState, submission } = addSubmission(gameState, 'apple', 'player1', 'Alice');

			expect(updatedState.chain).toHaveLength(1);
			expect(submission.word).toBe('apple');
			expect(submission.isValid).toBe(true);
			expect(submission.submittedBy).toBe('player1');
		});

		it('adds invalid submission to chain', () => {
			gameState.chain = [
				{
					id: '1',
					word: 'apple',
					submittedBy: 'player1',
					submittedByName: 'Alice',
					timestamp: Date.now(),
					isValid: true
				}
			];

			const { updatedState, submission } = addSubmission(gameState, 'banana', 'player2', 'Bob');

			expect(updatedState.chain).toHaveLength(2);
			expect(submission.isValid).toBe(false);
			expect(submission.validationMessage).toBeTruthy();
		});

		it('increments player score for valid submission', () => {
			const { updatedState } = addSubmission(gameState, 'apple', 'player1', 'Alice');

			const player = updatedState.players.find((p) => p.id === 'player1');
			expect(player?.score).toBe(1);
		});

		it('does not increment score for invalid submission', () => {
			gameState.chain = [
				{
					id: '1',
					word: 'apple',
					submittedBy: 'player1',
					submittedByName: 'Alice',
					timestamp: Date.now(),
					isValid: true
				}
			];

			const { updatedState } = addSubmission(gameState, 'banana', 'player2', 'Bob');

			const player = updatedState.players.find((p) => p.id === 'player2');
			expect(player?.score).toBe(0);
		});

		it('advances turn in turn-based mode after valid submission', () => {
			const { updatedState } = addSubmission(gameState, 'apple', 'player1', 'Alice');

			expect(updatedState.currentTurnPlayerId).toBe('player2');
			expect(updatedState.players[1].isCurrentTurn).toBe(true);
		});

		it('does not advance turn after invalid submission', () => {
			gameState.chain = [
				{
					id: '1',
					word: 'apple',
					submittedBy: 'player1',
					submittedByName: 'Alice',
					timestamp: Date.now(),
					isValid: true
				}
			];

			const { updatedState } = addSubmission(gameState, 'banana', 'player1', 'Alice');

			expect(updatedState.currentTurnPlayerId).toBe('player1');
		});
	});

	describe('getNextPlayer', () => {
		it('returns next player in rotation', () => {
			const nextPlayer = getNextPlayer(gameState);
			expect(nextPlayer?.id).toBe('player2');
		});

		it('wraps around to first player', () => {
			gameState.currentTurnPlayerId = 'player2';
			const nextPlayer = getNextPlayer(gameState);
			expect(nextPlayer?.id).toBe('player1');
		});

		it('returns null for simultaneous mode', () => {
			gameState.mode = 'simultaneous';
			const nextPlayer = getNextPlayer(gameState);
			expect(nextPlayer).toBeNull();
		});

		it('returns first player when no current player', () => {
			gameState.currentTurnPlayerId = undefined;
			const nextPlayer = getNextPlayer(gameState);
			expect(nextPlayer?.id).toBe('player1');
		});
	});

	describe('getGameStats', () => {
		beforeEach(() => {
			gameState.chain = [
				{
					id: '1',
					word: 'apple',
					submittedBy: 'player1',
					submittedByName: 'Alice',
					timestamp: Date.now(),
					isValid: true
				},
				{
					id: '2',
					word: 'banana',
					submittedBy: 'player2',
					submittedByName: 'Bob',
					timestamp: Date.now(),
					isValid: false
				},
				{
					id: '3',
					word: 'elephant',
					submittedBy: 'player2',
					submittedByName: 'Bob',
					timestamp: Date.now(),
					isValid: true
				}
			];

			gameState.players[0].score = 1;
			gameState.players[1].score = 1;
		});

		it('calculates total submissions', () => {
			const stats = getGameStats(gameState);
			expect(stats.totalSubmissions).toBe(3);
		});

		it('calculates valid and rejected submissions', () => {
			const stats = getGameStats(gameState);
			expect(stats.validSubmissions).toBe(2);
			expect(stats.rejectedSubmissions).toBe(1);
		});

		it('calculates chain length', () => {
			const stats = getGameStats(gameState);
			expect(stats.chainLength).toBe(2);
		});

		it('calculates average word length', () => {
			const stats = getGameStats(gameState);
			// (5 + 8) / 2 = 6.5
			expect(stats.averageWordLength).toBe(6.5);
		});

		it('ranks top players', () => {
			const stats = getGameStats(gameState);
			expect(stats.topPlayers).toHaveLength(2);
			expect(stats.topPlayers[0].score).toBeGreaterThanOrEqual(stats.topPlayers[1].score);
		});
	});
});
