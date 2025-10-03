<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Play, Pause, Users, Clock, Trophy, Target, RotateCcw, Settings } from 'lucide-svelte';
	import Button from './Button.svelte';
	import Card from './Card.svelte';

	interface GameCardProps {
		id: string;
		title: string;
		description?: string;
		gameType: 'puzzle' | 'trivia' | 'word' | 'strategy' | 'creative' | 'icebreaker';
		status?: 'waiting' | 'active' | 'paused' | 'completed';
		playerCount?: number;
		maxPlayers?: number;
		duration?: number; // in minutes
		timeRemaining?: number; // in seconds
		difficulty?: 'easy' | 'medium' | 'hard';
		progress?: number; // 0-100
		score?: number;
		isHost?: boolean;
		canJoin?: boolean;
		variant?: 'default' | 'compact' | 'featured';
		class?: string;
	}

	let {
		id,
		title,
		description,
		gameType,
		status = 'waiting',
		playerCount = 0,
		maxPlayers,
		duration,
		timeRemaining,
		difficulty = 'medium',
		progress = 0,
		score,
		isHost = false,
		canJoin = true,
		variant = 'default',
		class: className = ''
	}: GameCardProps = $props();

	const dispatch = createEventDispatcher<{
		start: { id: string };
		pause: { id: string };
		resume: { id: string };
		reset: { id: string };
		join: { id: string };
		leave: { id: string };
		settings: { id: string };
		click: { id: string };
	}>();

	// Game type configurations
	$: gameTypeConfig = {
		puzzle: { icon: Target, color: '#8b5cf6', label: 'Puzzle' },
		trivia: { icon: Trophy, color: '#f59e0b', label: 'Trivia' },
		word: { icon: Target, color: '#10b981', label: 'Word Game' },
		strategy: { icon: Target, color: '#ef4444', label: 'Strategy' },
		creative: { icon: Target, color: '#ec4899', label: 'Creative' },
		icebreaker: { icon: Users, color: '#3b82f6', label: 'Icebreaker' }
	}[gameType];

	// Status configurations
	$: statusConfig = {
		waiting: { label: 'Waiting to Start', class: 'status-waiting' },
		active: { label: 'In Progress', class: 'status-active' },
		paused: { label: 'Paused', class: 'status-paused' },
		completed: { label: 'Completed', class: 'status-completed' }
	}[status];

	// Difficulty configurations
	$: difficultyConfig = {
		easy: { label: 'Easy', class: 'difficulty-easy' },
		medium: { label: 'Medium', class: 'difficulty-medium' },
		hard: { label: 'Hard', class: 'difficulty-hard' }
	}[difficulty];

	// Format time remaining
	$: formattedTime = timeRemaining ?
		`${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}` :
		null;

	function handleStart() {
		dispatch('start', { id });
	}

	function handlePause() {
		dispatch('pause', { id });
	}

	function handleResume() {
		dispatch('resume', { id });
	}

	function handleReset() {
		dispatch('reset', { id });
	}

	function handleJoin() {
		dispatch('join', { id });
	}

	function handleLeave() {
		dispatch('leave', { id });
	}

	function handleSettings() {
		dispatch('settings', { id });
	}

	function handleCardClick() {
		dispatch('click', { id });
	}
</script>

<Card
	variant={variant === 'featured' ? 'elevated' : 'outlined'}
	padding={variant === 'compact' ? 'sm' : 'md'}
	hover
	class="game-card {statusConfig.class} {className}"
	onclick={handleCardClick}
>
	{#snippet header()}
		<div class="game-header">
			<div class="game-type" style="color: {gameTypeConfig.color}">
				<svelte:component this={gameTypeConfig.icon} size={20} />
				<span>{gameTypeConfig.label}</span>
			</div>

			<div class="game-status {statusConfig.class}">
				{statusConfig.label}
			</div>

			{#if isHost}
				<Button
					variant="outline"
					size="sm"
					icon
					onclick={handleSettings}
					aria-label="Game settings"
				>
					<Settings size={16} />
				</Button>
			{/if}
		</div>
	{/snippet}

	<div class="game-content">
		<h3 class="game-title">{title}</h3>

		{#if description}
			<p class="game-description">{description}</p>
		{/if}

		<div class="game-metadata">
			<div class="metadata-row">
				<div class="metadata-item">
					<Users size={16} />
					<span>
						{playerCount}{maxPlayers ? `/${maxPlayers}` : ''} players
					</span>
				</div>

				{#if duration}
					<div class="metadata-item">
						<Clock size={16} />
						<span>{duration} min</span>
					</div>
				{/if}

				<div class="metadata-item difficulty {difficultyConfig.class}">
					<span>{difficultyConfig.label}</span>
				</div>
			</div>

			{#if timeRemaining && status === 'active'}
				<div class="time-remaining">
					<Clock size={16} />
					<span class="time-display">{formattedTime}</span>
				</div>
			{/if}

			{#if progress > 0 && status !== 'waiting'}
				<div class="progress-section">
					<div class="progress-label">Progress</div>
					<div class="progress-bar">
						<div
							class="progress-fill"
							style="width: {progress}%"
							aria-label="Progress: {progress}%"
						></div>
					</div>
					<span class="progress-text">{progress}%</span>
				</div>
			{/if}

			{#if score !== undefined}
				<div class="score-section">
					<Trophy size={16} />
					<span class="score">Score: {score}</span>
				</div>
			{/if}
		</div>
	</div>

	{#snippet footer()}
		<div class="game-actions">
			{#if isHost}
				{#if status === 'waiting'}
					<Button
						variant="primary"
						onclick={handleStart}
						disabled={playerCount === 0}
					>
						<Play size={16} />
						Start Game
					</Button>
				{:else if status === 'active'}
					<Button variant="outline" onclick={handlePause}>
						<Pause size={16} />
						Pause
					</Button>
				{:else if status === 'paused'}
					<Button variant="primary" onclick={handleResume}>
						<Play size={16} />
						Resume
					</Button>
				{/if}

				{#if status !== 'waiting'}
					<Button variant="outline" onclick={handleReset}>
						<RotateCcw size={16} />
						Reset
					</Button>
				{/if}
			{:else}
				{#if canJoin && (maxPlayers === undefined || playerCount < maxPlayers)}
					<Button variant="primary" onclick={handleJoin}>
						<Users size={16} />
						Join Game
					</Button>
				{:else if !canJoin}
					<Button variant="outline" onclick={handleLeave}>
						Leave Game
					</Button>
				{:else}
					<Button variant="secondary" disabled>
						Game Full
					</Button>
				{/if}
			{/if}
		</div>
	{/snippet}
</Card>

<style>
	.game-card {
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.game-card:hover {
		transform: translateY(-2px);
	}

	/* Status styles */
	.status-waiting {
		border-left: 4px solid #6b7280;
	}

	.status-active {
		border-left: 4px solid #10b981;
	}

	.status-paused {
		border-left: 4px solid #f59e0b;
	}

	.status-completed {
		border-left: 4px solid #8b5cf6;
	}

	.game-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.game-type {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		font-size: 0.875rem;
		flex: 1;
	}

	.game-status {
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.status-waiting {
		background-color: #f3f4f6;
		color: #4b5563;
	}

	.status-active {
		background-color: #d1fae5;
		color: #065f46;
	}

	.status-paused {
		background-color: #fef3c7;
		color: #92400e;
	}

	.status-completed {
		background-color: #ede9fe;
		color: #6b21a8;
	}

	.game-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.game-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		color: #1f2937;
		line-height: 1.3;
	}

	.game-description {
		margin: 0;
		color: #6b7280;
		font-size: 0.875rem;
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.game-metadata {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.metadata-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.metadata-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: #6b7280;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.difficulty {
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		color: white !important;
		font-weight: 600;
	}

	.difficulty-easy {
		background-color: #10b981;
	}

	.difficulty-medium {
		background-color: #f59e0b;
	}

	.difficulty-hard {
		background-color: #ef4444;
	}

	.time-remaining {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #ef4444;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.time-display {
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		background-color: #fef2f2;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}

	.progress-section {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.progress-label {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
		min-width: 4rem;
	}

	.progress-bar {
		flex: 1;
		height: 0.5rem;
		background-color: #e5e7eb;
		border-radius: 0.25rem;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background-color: #3b82f6;
		border-radius: 0.25rem;
		transition: width 0.3s ease;
	}

	.progress-text {
		font-size: 0.75rem;
		color: #4b5563;
		font-weight: 600;
		min-width: 2.5rem;
		text-align: right;
	}

	.score-section {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #f59e0b;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.game-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.game-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.metadata-row {
			gap: 0.75rem;
		}

		.game-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.game-actions :global(button) {
			justify-content: center;
		}

		.progress-section {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}

		.progress-label {
			min-width: auto;
		}

		.progress-text {
			text-align: center;
		}
	}
</style>