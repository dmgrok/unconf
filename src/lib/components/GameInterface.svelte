<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Event, User } from '../../types/entities';
	import GameCard from './ui/GameCard.svelte';
	import WordChainGame from './WordChainGame.svelte';
	import Card from './ui/Card.svelte';
	import { Gamepad2, Trophy, Users } from 'lucide-svelte';

	interface GameInterfaceProps {
		event: Event;
		currentUser: User;
		class?: string;
	}

	let {
		event,
		currentUser,
		class: className = ''
	}: GameInterfaceProps = $props();

	const dispatch = createEventDispatcher<{
		gamestart: { gameId: string };
		gamemove: { gameId: string; move: unknown };
		gameend: { gameId: string; results: unknown };
	}>();

	interface GameState {
		id: string;
		type: 'word-chain' | 'trivia' | 'icebreaker';
		status: 'waiting' | 'active' | 'paused' | 'completed';
		players: string[];
		currentPlayer?: string;
		data?: unknown;
	}

	let availableGames = $state<GameState[]>([]);
	let activeGame = $state<GameState | null>(null);
	let isLoading = $state(false);

	$: isHost = currentUser.id === event.organizerId;
	$: hasJoinedGame = availableGames.some(g => g.players.includes(currentUser.id));

	onMount(() => {
		loadAvailableGames();
	});

	async function loadAvailableGames() {
		isLoading = true;
		try {
			const response = await fetch(`/api/games?eventId=${event.id}`);
			const result = await response.json();

			if (result.success && result.data) {
				availableGames = result.data;

				// Find the active game the user is in
				activeGame = availableGames.find(
					g => g.status === 'active' && g.players.includes(currentUser.id)
				) || null;
			}
		} catch (error) {
			console.error('Failed to load games:', error);
		} finally {
			isLoading = false;
		}
	}

	async function handleJoinGame(gameId: string) {
		try {
			const response = await fetch('/api/games/join', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					gameId,
					userId: currentUser.id,
					eventId: event.id
				})
			});

			const result = await response.json();
			if (result.success) {
				await loadAvailableGames();
			}
		} catch (error) {
			console.error('Failed to join game:', error);
		}
	}

	async function handleStartGame(gameId: string) {
		try {
			const response = await fetch('/api/games/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					gameId,
					eventId: event.id
				})
			});

			const result = await response.json();
			if (result.success) {
				dispatch('gamestart', { gameId });
				await loadAvailableGames();
			}
		} catch (error) {
			console.error('Failed to start game:', error);
		}
	}

	function handleGameMove(event: CustomEvent) {
		if (activeGame) {
			dispatch('gamemove', {
				gameId: activeGame.id,
				move: event.detail
			});
		}
	}

	function handleGameEnd(event: CustomEvent) {
		if (activeGame) {
			dispatch('gameend', {
				gameId: activeGame.id,
				results: event.detail
			});
			activeGame = null;
			loadAvailableGames();
		}
	}
</script>

<div class="game-interface {className}">
	<div class="game-header">
		<Card variant="outlined" padding="md">
			{#snippet header()}
				<div class="header-content">
					<Gamepad2 size={24} />
					<div>
						<h2>Group Intelligence Games</h2>
						<p class="header-description">
							Participate in interactive games to build connections and have fun
						</p>
					</div>
				</div>
			{/snippet}

			<div class="game-stats">
				<div class="stat">
					<Users size={20} />
					<span>{availableGames.reduce((sum, g) => sum + g.players.length, 0)} participants</span>
				</div>
				<div class="stat">
					<Trophy size={20} />
					<span>{availableGames.filter(g => g.status === 'completed').length} games completed</span>
				</div>
			</div>
		</Card>
	</div>

	<div class="game-content">
		{#if activeGame}
			<!-- Active game view -->
			<div class="active-game">
				{#if activeGame.type === 'word-chain'}
					<WordChainGame
						gameId={activeGame.id}
						{event}
						{currentUser}
						on:move={handleGameMove}
						on:gameend={handleGameEnd}
					/>
				{:else}
					<Card variant="outlined" padding="lg">
						<div class="game-placeholder">
							<Gamepad2 size={48} />
							<h3>{activeGame.type} Game</h3>
							<p>This game type is coming soon!</p>
						</div>
					</Card>
				{/if}
			</div>
		{:else if isLoading}
			<div class="loading">
				<div class="spinner"></div>
				<p>Loading games...</p>
			</div>
		{:else if availableGames.length === 0}
			<div class="empty-state">
				<Gamepad2 size={48} />
				<h3>No Games Available</h3>
				<p>
					{#if isHost}
						Start a game to engage participants!
					{:else}
						The organizer hasn't started any games yet.
					{/if}
				</p>
			</div>
		{:else}
			<!-- Game selection grid -->
			<div class="games-grid">
				{#each availableGames as game (game.id)}
					<GameCard
						id={game.id}
						title={game.type === 'word-chain' ? 'Word Chain' : game.type}
						description={game.type === 'word-chain'
							? 'Build a chain of words by connecting the last letter to the first'
							: 'Coming soon!'}
						gameType={game.type === 'word-chain' ? 'word' : 'icebreaker'}
						status={game.status}
						playerCount={game.players.length}
						maxPlayers={20}
						{isHost}
						canJoin={!game.players.includes(currentUser.id)}
						on:join={(e) => handleJoinGame(e.detail.id)}
						on:start={(e) => handleStartGame(e.detail.id)}
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.game-interface {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
	}

	.game-header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: white;
		padding-bottom: 1rem;
	}

	.header-content {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.header-content h2 {
		margin: 0 0 0.25rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.header-description {
		margin: 0;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.game-stats {
		display: flex;
		gap: 2rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
		flex-wrap: wrap;
	}

	.stat {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #6b7280;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.game-content {
		min-height: 400px;
	}

	.active-game {
		width: 100%;
	}

	.games-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.loading,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: #6b7280;
		min-height: 400px;
	}

	.loading .spinner {
		width: 2.5rem;
		height: 2.5rem;
		border: 3px solid #e5e7eb;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.empty-state h3,
	.game-placeholder h3 {
		margin: 1rem 0 0.5rem;
		color: #374151;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.empty-state p,
	.game-placeholder p {
		margin: 0;
		color: #6b7280;
		font-size: 0.875rem;
		max-width: 400px;
	}

	.game-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: #6b7280;
		min-height: 300px;
	}

	@media (max-width: 768px) {
		.game-interface {
			padding: 0.75rem;
		}

		.games-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
