<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { wordChainGame, currentPlayer, validChain, gameStats, isGameActive } from '$lib/games/word-chain';
	import type { WordChainGameMode } from '$lib/games/word-chain';
	import WordChainTimeline from './WordChainTimeline.svelte';
	import WordSubmissionInput from './WordSubmissionInput.svelte';
	import PlayerStatusList from './PlayerStatusList.svelte';
	import GameControls from './GameControls.svelte';
	import WordChainModeSelector from './WordChainModeSelector.svelte';

	export let eventId: string;
	export let userId: string;
	export let userName: string;

	let gameMode: WordChainGameMode = 'turn-based';
	let gameStarted = false;
	let error: string | null = null;

	// Subscribe to game state
	$: game = $wordChainGame;
	$: chain = $validChain;
	$: stats = $gameStats;
	$: active = $isGameActive;
	$: player = $currentPlayer;

	// Check if current user can submit
	$: canSubmit = game?.status === 'active' &&
		(!game.currentTurnPlayerId || game.currentTurnPlayerId === userId);

	// Get last word in chain for hint
	$: lastWord = chain.length > 0 ? chain[chain.length - 1].word : null;
	$: nextLetter = lastWord ? lastWord.charAt(lastWord.length - 1).toUpperCase() : null;

	function handleStartGame() {
		try {
			wordChainGame.init(eventId, gameMode);
			wordChainGame.addPlayer(userId, userName);
			wordChainGame.start();
			gameStarted = true;
			error = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to start game';
		}
	}

	function handleWordSubmit(event: CustomEvent<{ word: string }>) {
		if (!game) return;

		const { word } = event.detail;

		const result = wordChainGame.submitWord(word, userId, userName);

		if (!result.success) {
			error = result.reason || 'Submission failed';
			// Clear error after 3 seconds
			setTimeout(() => {
				error = null;
			}, 3000);
		} else {
			error = null;
		}
	}

	function handlePauseGame() {
		wordChainGame.pause();
	}

	function handleResumeGame() {
		wordChainGame.resume();
	}

	function handleEndGame() {
		wordChainGame.end();
	}

	onDestroy(() => {
		// Clean up if needed
	});
</script>

<div class="word-chain-game">
	{#if !gameStarted}
		<div class="game-setup">
			<h2>Word Chain Game</h2>
			<p class="description">
				Create a chain of words where each word starts with the last letter of the previous word!
			</p>

			<WordChainModeSelector bind:selectedMode={gameMode} />

			<button class="btn-start" on:click={handleStartGame}>
				Start Game
			</button>
		</div>
	{:else if game}
		<div class="game-container">
			<!-- Header with game info -->
			<div class="game-header">
				<h2>Word Chain Game</h2>
				<div class="game-status">
					<span class="status-badge" class:active={game.status === 'active'} class:paused={game.status === 'paused'}>
						{game.status}
					</span>
					<span class="mode-badge">{game.mode}</span>
				</div>
			</div>

			{#if error}
				<div class="error-message">
					⚠️ {error}
				</div>
			{/if}

			<!-- Main game area -->
			<div class="game-main">
				<!-- Left panel: Chain timeline -->
				<div class="chain-panel">
					<div class="panel-header">
						<h3>Word Chain</h3>
						{#if stats}
							<span class="chain-length">{stats.chainLength} words</span>
						{/if}
					</div>
					<WordChainTimeline chain={chain} currentUserId={userId} />
				</div>

				<!-- Right panel: Players and stats -->
				<div class="players-panel">
					<div class="panel-header">
						<h3>Players</h3>
						{#if game.players}
							<span class="player-count">{game.players.length}</span>
						{/if}
					</div>
					<PlayerStatusList
						players={game.players}
						currentTurnPlayerId={game.currentTurnPlayerId}
						currentUserId={userId}
					/>

					{#if stats}
						<div class="game-stats">
							<h4>Statistics</h4>
							<div class="stat-item">
								<span>Total Submissions:</span>
								<span class="stat-value">{stats.totalSubmissions}</span>
							</div>
							<div class="stat-item">
								<span>Valid:</span>
								<span class="stat-value success">{stats.validSubmissions}</span>
							</div>
							<div class="stat-item">
								<span>Rejected:</span>
								<span class="stat-value error">{stats.rejectedSubmissions}</span>
							</div>
							<div class="stat-item">
								<span>Avg. Length:</span>
								<span class="stat-value">{stats.averageWordLength.toFixed(1)}</span>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Input area -->
			<div class="input-area">
				{#if nextLetter}
					<div class="hint">
						Next word must start with: <strong>{nextLetter}</strong>
					</div>
				{/if}

				<WordSubmissionInput
					disabled={!canSubmit || !active}
					placeholder={canSubmit ? `Enter a word${nextLetter ? ` starting with ${nextLetter}` : ''}...` : "Wait for your turn..."}
					nextLetter={nextLetter}
					on:submit={handleWordSubmit}
				/>

				{#if game.mode === 'turn-based' && !canSubmit && active}
					<div class="turn-info">
						{#if player}
							It's {player.name}'s turn
						{:else}
							Waiting for turn...
						{/if}
					</div>
				{/if}
			</div>

			<!-- Game controls -->
			<GameControls
				gameStatus={game.status}
				isOrganizer={true}
				on:pause={handlePauseGame}
				on:resume={handleResumeGame}
				on:end={handleEndGame}
			/>
		</div>
	{/if}
</div>

<style>
	.word-chain-game {
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
	}

	.game-setup {
		text-align: center;
		padding: 2rem;
		background: var(--color-background, #ffffff);
		border-radius: 0.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.game-setup h2 {
		margin-bottom: 1rem;
		color: var(--color-text-primary, #1f2937);
	}

	.description {
		color: var(--color-text-secondary, #6b7280);
		margin-bottom: 2rem;
		font-size: 1rem;
	}

	.btn-start {
		margin-top: 2rem;
		padding: 0.75rem 2rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: white;
		background: var(--color-primary, #3b82f6);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-start:hover {
		background: var(--color-primary-dark, #2563eb);
	}

	.game-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.game-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: var(--color-background, #ffffff);
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.game-header h2 {
		margin: 0;
		color: var(--color-text-primary, #1f2937);
	}

	.game-status {
		display: flex;
		gap: 0.5rem;
	}

	.status-badge,
	.mode-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		text-transform: uppercase;
	}

	.status-badge {
		background: var(--color-gray-200, #e5e7eb);
		color: var(--color-gray-700, #374151);
	}

	.status-badge.active {
		background: var(--color-success-light, #d1fae5);
		color: var(--color-success-dark, #065f46);
	}

	.status-badge.paused {
		background: var(--color-warning-light, #fef3c7);
		color: var(--color-warning-dark, #92400e);
	}

	.mode-badge {
		background: var(--color-primary-light, #dbeafe);
		color: var(--color-primary-dark, #1e40af);
	}

	.error-message {
		padding: 0.75rem 1rem;
		background: var(--color-error-light, #fee2e2);
		color: var(--color-error-dark, #991b1b);
		border-radius: 0.5rem;
		font-size: 0.875rem;
	}

	.game-main {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 1rem;
	}

	@media (max-width: 768px) {
		.game-main {
			grid-template-columns: 1fr;
		}
	}

	.chain-panel,
	.players-panel {
		background: var(--color-background, #ffffff);
		border-radius: 0.5rem;
		padding: 1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-border, #e5e7eb);
	}

	.panel-header h3 {
		margin: 0;
		font-size: 1.125rem;
		color: var(--color-text-primary, #1f2937);
	}

	.chain-length,
	.player-count {
		font-size: 0.875rem;
		color: var(--color-text-secondary, #6b7280);
		font-weight: 500;
	}

	.game-stats {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-border, #e5e7eb);
	}

	.game-stats h4 {
		margin: 0 0 1rem 0;
		font-size: 0.875rem;
		text-transform: uppercase;
		color: var(--color-text-secondary, #6b7280);
		font-weight: 600;
	}

	.stat-item {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0;
		font-size: 0.875rem;
	}

	.stat-value {
		font-weight: 600;
		color: var(--color-text-primary, #1f2937);
	}

	.stat-value.success {
		color: var(--color-success, #059669);
	}

	.stat-value.error {
		color: var(--color-error, #dc2626);
	}

	.input-area {
		background: var(--color-background, #ffffff);
		border-radius: 0.5rem;
		padding: 1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.hint {
		margin-bottom: 0.75rem;
		padding: 0.5rem;
		background: var(--color-info-light, #dbeafe);
		color: var(--color-info-dark, #1e40af);
		border-radius: 0.25rem;
		font-size: 0.875rem;
		text-align: center;
	}

	.hint strong {
		font-size: 1.125rem;
		font-weight: 700;
	}

	.turn-info {
		margin-top: 0.75rem;
		text-align: center;
		color: var(--color-text-secondary, #6b7280);
		font-size: 0.875rem;
	}
</style>
