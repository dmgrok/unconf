<script lang="ts">
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { Play, Pause, RotateCcw, Clock } from 'lucide-svelte';
	import Button from './Button.svelte';

	interface TimerProps {
		initialTime?: number; // in seconds
		autoStart?: boolean;
		showControls?: boolean;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'default' | 'accent' | 'warning' | 'danger';
		class?: string;
	}

	let {
		initialTime = 300, // 5 minutes default
		autoStart = false,
		showControls = true,
		size = 'md',
		variant = 'default',
		class: className = ''
	}: TimerProps = $props();

	const dispatch = createEventDispatcher<{
		start: void;
		pause: void;
		reset: void;
		tick: { remaining: number };
		complete: void;
	}>();

	let timeRemaining = $state(initialTime);
	let isRunning = $state(autoStart);
	let intervalId: number | null = null;

	// Computed values
	$: minutes = Math.floor(timeRemaining / 60);
	$: seconds = timeRemaining % 60;
	$: progress = initialTime > 0 ? ((initialTime - timeRemaining) / initialTime) * 100 : 0;
	$: isExpired = timeRemaining <= 0;
	$: displayTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

	// Determine visual state based on time remaining
	$: currentVariant = (() => {
		if (variant !== 'default') return variant;
		if (isExpired) return 'danger';
		if (timeRemaining <= initialTime * 0.1) return 'warning'; // Last 10%
		if (timeRemaining <= initialTime * 0.25) return 'accent'; // Last 25%
		return 'default';
	})();

	// Start the timer
	function start() {
		if (!isRunning && timeRemaining > 0) {
			isRunning = true;
			intervalId = setInterval(() => {
				timeRemaining--;
				dispatch('tick', { remaining: timeRemaining });

				if (timeRemaining <= 0) {
					pause();
					dispatch('complete');
				}
			}, 1000);
			dispatch('start');
		}
	}

	// Pause the timer
	function pause() {
		if (isRunning) {
			isRunning = false;
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
			dispatch('pause');
		}
	}

	// Reset the timer
	function reset() {
		pause();
		timeRemaining = initialTime;
		dispatch('reset');
	}

	// Toggle play/pause
	function toggle() {
		if (isRunning) {
			pause();
		} else {
			start();
		}
	}

	// Auto-start if enabled
	$effect(() => {
		if (autoStart && timeRemaining > 0) {
			start();
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (intervalId) {
			clearInterval(intervalId);
		}
	});
</script>

<div class="timer timer-{size} timer-{currentVariant} {className}" role="timer" aria-live="polite">
	<div class="timer-display">
		<div class="timer-icon">
			<Clock size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
		</div>

		<div class="timer-time" aria-label="Time remaining: {displayTime}">
			{displayTime}
		</div>

		{#if initialTime > 0}
			<div class="timer-progress" aria-hidden="true">
				<div
					class="timer-progress-fill"
					style="width: {progress}%"
				></div>
			</div>
		{/if}
	</div>

	{#if showControls}
		<div class="timer-controls">
			<Button
				variant="outline"
				size={size}
				icon
				onclick={toggle}
				disabled={isExpired}
				aria-label={isRunning ? 'Pause timer' : 'Start timer'}
			>
				{#if isRunning}
					<Pause size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
				{:else}
					<Play size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
				{/if}
			</Button>

			<Button
				variant="outline"
				size={size}
				icon
				onclick={reset}
				aria-label="Reset timer"
			>
				<RotateCcw size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
			</Button>
		</div>
	{/if}

	{#if isExpired}
		<div class="timer-expired" role="alert">
			Time's up!
		</div>
	{/if}
</div>

<style>
	.timer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		border-radius: 0.5rem;
		border: 2px solid transparent;
		padding: 1rem;
		transition: all 0.2s ease;
		background: white;
	}

	/* Sizes */
	.timer-sm {
		padding: 0.75rem;
		gap: 0.75rem;
	}

	.timer-md {
		padding: 1rem;
		gap: 1rem;
	}

	.timer-lg {
		padding: 1.5rem;
		gap: 1.5rem;
	}

	/* Variants */
	.timer-default {
		border-color: #e5e7eb;
		background: #f9fafb;
	}

	.timer-accent {
		border-color: #f59e0b;
		background: #fffbeb;
	}

	.timer-warning {
		border-color: #ef4444;
		background: #fef2f2;
	}

	.timer-danger {
		border-color: #dc2626;
		background: #fef2f2;
		animation: pulse-danger 1s ease-in-out infinite;
	}

	@keyframes pulse-danger {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.02);
		}
	}

	.timer-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
	}

	.timer-icon {
		color: #6b7280;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.timer-accent .timer-icon {
		color: #d97706;
	}

	.timer-warning .timer-icon {
		color: #dc2626;
	}

	.timer-danger .timer-icon {
		color: #dc2626;
	}

	.timer-time {
		font-size: 2rem;
		font-weight: 700;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		color: #1f2937;
		text-align: center;
		min-width: 4.5rem;
	}

	.timer-sm .timer-time {
		font-size: 1.5rem;
	}

	.timer-lg .timer-time {
		font-size: 3rem;
	}

	.timer-accent .timer-time {
		color: #d97706;
	}

	.timer-warning .timer-time {
		color: #dc2626;
	}

	.timer-danger .timer-time {
		color: #dc2626;
	}

	.timer-progress {
		width: 100%;
		height: 4px;
		background-color: #e5e7eb;
		border-radius: 2px;
		overflow: hidden;
	}

	.timer-progress-fill {
		height: 100%;
		background-color: #10b981;
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	.timer-accent .timer-progress-fill {
		background-color: #f59e0b;
	}

	.timer-warning .timer-progress-fill {
		background-color: #ef4444;
	}

	.timer-danger .timer-progress-fill {
		background-color: #dc2626;
	}

	.timer-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.timer-expired {
		font-weight: 600;
		color: #dc2626;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		animation: pulse 1s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.timer-lg .timer-time {
			font-size: 2.5rem;
		}

		.timer-md .timer-time {
			font-size: 1.75rem;
		}
	}
</style>