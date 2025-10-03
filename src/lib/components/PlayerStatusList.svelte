<script lang="ts">
	import type { WordChainPlayer } from '$lib/games/word-chain';

	export let players: WordChainPlayer[] = [];
	export let currentTurnPlayerId: string | undefined = undefined;
	export let currentUserId: string;

	// Sort players by score (highest first)
	$: sortedPlayers = [...players].sort((a, b) => b.score - a.score);
</script>

<div class="player-list">
	{#if players.length === 0}
		<div class="empty-state">
			<p>No players yet</p>
		</div>
	{:else}
		{#each sortedPlayers as player, index (player.id)}
			<div
				class="player-item"
				class:current-turn={player.id === currentTurnPlayerId}
				class:current-user={player.id === currentUserId}
			>
				<!-- Rank badge -->
				{#if index < 3 && player.score > 0}
					<div class="rank-badge" class:gold={index === 0} class:silver={index === 1} class:bronze={index === 2}>
						{index + 1}
					</div>
				{/if}

				<!-- Player info -->
				<div class="player-info">
					<div class="player-name">
						{player.name}
						{#if player.id === currentUserId}
							<span class="you-badge">(you)</span>
						{/if}
					</div>

					{#if player.id === currentTurnPlayerId}
						<div class="turn-indicator">
							<span class="turn-dot"></span>
							Current turn
						</div>
					{/if}
				</div>

				<!-- Score -->
				<div class="player-score">
					{player.score}
					<span class="score-label">
						{player.score === 1 ? 'word' : 'words'}
					</span>
				</div>
			</div>
		{/each}
	{/if}
</div>

<style>
	.player-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.empty-state {
		text-align: center;
		padding: 2rem 1rem;
		color: var(--color-text-secondary, #6b7280);
	}

	.empty-state p {
		margin: 0;
		font-size: 0.875rem;
	}

	.player-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--color-gray-50, #f9fafb);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		transition: all 0.2s;
		position: relative;
	}

	.player-item.current-turn {
		background: var(--color-primary-light, #dbeafe);
		border-color: var(--color-primary, #3b82f6);
		box-shadow: 0 0 0 2px var(--color-primary-light, #dbeafe);
	}

	.player-item.current-user {
		background: var(--color-success-light, #d1fae5);
		border-color: var(--color-success, #059669);
	}

	.player-item.current-turn.current-user {
		background: linear-gradient(135deg, var(--color-success-light, #d1fae5) 0%, var(--color-primary-light, #dbeafe) 100%);
		border-color: var(--color-primary, #3b82f6);
	}

	.rank-badge {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		font-size: 0.875rem;
		font-weight: 700;
		flex-shrink: 0;
		background: var(--color-gray-300, #d1d5db);
		color: white;
	}

	.rank-badge.gold {
		background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
		color: #92400e;
		box-shadow: 0 2px 4px rgba(255, 215, 0, 0.3);
	}

	.rank-badge.silver {
		background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%);
		color: #374151;
		box-shadow: 0 2px 4px rgba(192, 192, 192, 0.3);
	}

	.rank-badge.bronze {
		background: linear-gradient(135deg, #cd7f32 0%, #e6a55c 100%);
		color: white;
		box-shadow: 0 2px 4px rgba(205, 127, 50, 0.3);
	}

	.player-info {
		flex: 1;
		min-width: 0;
	}

	.player-name {
		font-weight: 600;
		color: var(--color-text-primary, #1f2937);
		font-size: 0.875rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.you-badge {
		font-weight: 400;
		color: var(--color-success, #059669);
		font-size: 0.75rem;
	}

	.turn-indicator {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: var(--color-primary-dark, #1e40af);
		font-weight: 500;
	}

	.turn-dot {
		width: 0.5rem;
		height: 0.5rem;
		background: var(--color-primary, #3b82f6);
		border-radius: 50%;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.5;
			transform: scale(1.2);
		}
	}

	.player-score {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary, #1f2937);
		flex-shrink: 0;
	}

	.score-label {
		font-size: 0.625rem;
		font-weight: 400;
		color: var(--color-text-secondary, #6b7280);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
</style>
