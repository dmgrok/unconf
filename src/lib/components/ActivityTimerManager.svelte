<script lang="ts">
	/**
	 * Activity Timer Manager
	 * Customizable countdown timers with auto-expire functionality
	 */
	import { Play, Pause, RotateCcw, Plus, X, Clock, Bell, Zap } from 'lucide-svelte';
	import { createEventDispatcher, onDestroy } from 'svelte';

	interface Timer {
		id: string;
		label: string;
		duration: number; // in seconds
		remaining: number; // in seconds
		isActive: boolean;
		autoExpire: boolean;
		onExpireAction?: 'notify' | 'next-activity' | 'end-activity';
	}

	interface ActivityTimerManagerProps {
		activityType?: string;
		class?: string;
	}

	let { activityType, class: className = '' }: ActivityTimerManagerProps = $props();

	const dispatch = createEventDispatcher<{
		timerExpired: { timer: Timer };
		timerStarted: { timer: Timer };
		timerPaused: { timer: Timer };
		timerReset: { timer: Timer };
	}>();

	// State
	let timers = $state<Timer[]>([]);
	let showAddTimer = $state(false);
	let newTimerLabel = $state('');
	let newTimerMinutes = $state(5);
	let newTimerAutoExpire = $state(true);
	let newTimerAction = $state<Timer['onExpireAction']>('notify');

	// Timer intervals
	let timerIntervals = new Map<string, number>();

	// Cleanup on destroy
	onDestroy(() => {
		timerIntervals.forEach((interval) => clearInterval(interval));
		timerIntervals.clear();
	});

	// Preset timers
	const presetTimers = [
		{ label: 'Quick Round', minutes: 2 },
		{ label: 'Short Activity', minutes: 5 },
		{ label: 'Standard Activity', minutes: 10 },
		{ label: 'Extended Discussion', minutes: 15 },
		{ label: 'Long Session', minutes: 30 }
	];

	function addTimer(label: string, minutes: number, autoExpire = true, action: Timer['onExpireAction'] = 'notify') {
		const duration = minutes * 60;
		const timer: Timer = {
			id: `timer-${Date.now()}-${Math.random()}`,
			label,
			duration,
			remaining: duration,
			isActive: false,
			autoExpire,
			onExpireAction: action
		};

		timers.push(timer);
		showAddTimer = false;
		resetNewTimerForm();
	}

	function addPresetTimer(preset: { label: string; minutes: number }) {
		addTimer(preset.label, preset.minutes);
	}

	function startTimer(timer: Timer) {
		timer.isActive = true;
		dispatch('timerStarted', { timer });

		const interval = setInterval(() => {
			if (timer.remaining > 0) {
				timer.remaining--;
			} else {
				handleTimerExpired(timer);
			}
		}, 1000);

		timerIntervals.set(timer.id, interval);
	}

	function pauseTimer(timer: Timer) {
		timer.isActive = false;
		dispatch('timerPaused', { timer });

		const interval = timerIntervals.get(timer.id);
		if (interval) {
			clearInterval(interval);
			timerIntervals.delete(timer.id);
		}
	}

	function resetTimer(timer: Timer) {
		pauseTimer(timer);
		timer.remaining = timer.duration;
		dispatch('timerReset', { timer });
	}

	function deleteTimer(timer: Timer) {
		pauseTimer(timer);
		timers = timers.filter((t) => t.id !== timer.id);
	}

	function handleTimerExpired(timer: Timer) {
		pauseTimer(timer);
		dispatch('timerExpired', { timer });

		// Play sound notification
		playNotificationSound();

		// Show browser notification
		if ('Notification' in window && Notification.permission === 'granted') {
			new Notification('Timer Expired', {
				body: `${timer.label} has ended`,
				icon: '/icon-192.png'
			});
		}

		// Handle auto-expire action
		if (timer.autoExpire && timer.onExpireAction) {
			handleExpireAction(timer.onExpireAction);
		}
	}

	function handleExpireAction(action: Timer['onExpireAction']) {
		switch (action) {
			case 'notify':
				// Already handled by notification
				break;
			case 'next-activity':
				// Dispatch event to parent
				console.log('Auto-advancing to next activity');
				break;
			case 'end-activity':
				// Dispatch event to parent
				console.log('Auto-ending current activity');
				break;
		}
	}

	function playNotificationSound() {
		try {
			const audio = new Audio('/sounds/timer-complete.mp3');
			audio.play().catch(() => {
				// Fallback to system beep
				const oscillator = new AudioContext().createOscillator();
				const gainNode = new AudioContext().createGain();
				oscillator.connect(gainNode);
				gainNode.connect(new AudioContext().destination);
				gainNode.gain.value = 0.3;
				oscillator.frequency.value = 800;
				oscillator.start();
				setTimeout(() => oscillator.stop(), 200);
			});
		} catch (error) {
			console.error('Failed to play notification sound:', error);
		}
	}

	function resetNewTimerForm() {
		newTimerLabel = '';
		newTimerMinutes = 5;
		newTimerAutoExpire = true;
		newTimerAction = 'notify';
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function getProgressPercentage(timer: Timer): number {
		return ((timer.duration - timer.remaining) / timer.duration) * 100;
	}

	function getTimerColor(timer: Timer): string {
		const percentage = (timer.remaining / timer.duration) * 100;
		if (percentage > 50) return '#10b981';
		if (percentage > 25) return '#f59e0b';
		return '#ef4444';
	}
</script>

<div class="activity-timer-manager {className}">
	<div class="manager-header">
		<div>
			<h3>Activity Timers</h3>
			{#if activityType}
				<p class="activity-type">{activityType}</p>
			{/if}
		</div>

		<button class="button primary" onclick={() => (showAddTimer = !showAddTimer)}>
			<Plus size={18} />
			Add Timer
		</button>
	</div>

	<!-- Add Timer Form -->
	{#if showAddTimer}
		<div class="add-timer-form">
			<div class="form-header">
				<h4>Create Timer</h4>
				<button class="close-button" onclick={() => (showAddTimer = false)}>
					<X size={20} />
				</button>
			</div>

			<!-- Preset Timers -->
			<div class="preset-section">
				<label>Quick Presets</label>
				<div class="preset-buttons">
					{#each presetTimers as preset}
						<button
							class="preset-button"
							onclick={() => addPresetTimer(preset)}
						>
							<Clock size={16} />
							{preset.label} ({preset.minutes}m)
						</button>
					{/each}
				</div>
			</div>

			<div class="form-divider">
				<span>or customize</span>
			</div>

			<!-- Custom Timer Form -->
			<div class="form-fields">
				<div class="form-field">
					<label>Timer Label</label>
					<input
						type="text"
						bind:value={newTimerLabel}
						placeholder="e.g., Voting Period"
					/>
				</div>

				<div class="form-field">
					<label>Duration (minutes)</label>
					<input type="number" bind:value={newTimerMinutes} min="1" max="120" />
				</div>

				<div class="form-field">
					<label class="checkbox-label">
						<input type="checkbox" bind:checked={newTimerAutoExpire} />
						<span>Auto-expire when timer ends</span>
					</label>

					{#if newTimerAutoExpire}
						<select bind:value={newTimerAction} class="action-select">
							<option value="notify">Notify Only</option>
							<option value="next-activity">Advance to Next Activity</option>
							<option value="end-activity">End Current Activity</option>
						</select>
					{/if}
				</div>
			</div>

			<div class="form-actions">
				<button class="button secondary" onclick={() => (showAddTimer = false)}>
					Cancel
				</button>
				<button
					class="button primary"
					onclick={() => addTimer(newTimerLabel || 'Custom Timer', newTimerMinutes, newTimerAutoExpire, newTimerAction)}
					disabled={!newTimerLabel || newTimerMinutes < 1}
				>
					Create Timer
				</button>
			</div>
		</div>
	{/if}

	<!-- Active Timers -->
	{#if timers.length === 0}
		<div class="empty-state">
			<Clock size={48} />
			<h4>No Active Timers</h4>
			<p>Create a timer to track activity duration</p>
		</div>
	{:else}
		<div class="timers-grid">
			{#each timers as timer (timer.id)}
				{@const color = getTimerColor(timer)}
				{@const progress = getProgressPercentage(timer)}

				<div class="timer-card" class:active={timer.isActive}>
					<div class="timer-header">
						<div class="timer-label">
							<span class="timer-name">{timer.label}</span>
							{#if timer.autoExpire}
								<span class="auto-expire-badge" title="Auto-expire enabled">
									<Zap size={12} />
								</span>
							{/if}
						</div>

						<button class="delete-button" onclick={() => deleteTimer(timer)}>
							<X size={16} />
						</button>
					</div>

					<div class="timer-display">
						<div class="time-remaining" style="color: {color}">
							{formatTime(timer.remaining)}
						</div>
						<div class="time-total">
							/ {formatTime(timer.duration)}
						</div>
					</div>

					<div class="timer-progress">
						<div
							class="progress-fill"
							style="width: {progress}%; background: {color}"
						></div>
					</div>

					<div class="timer-controls">
						{#if !timer.isActive}
							<button
								class="control-button play"
								onclick={() => startTimer(timer)}
								disabled={timer.remaining === 0}
							>
								<Play size={18} />
								Start
							</button>
						{:else}
							<button class="control-button pause" onclick={() => pauseTimer(timer)}>
								<Pause size={18} />
								Pause
							</button>
						{/if}

						<button
							class="control-button reset"
							onclick={() => resetTimer(timer)}
							disabled={timer.remaining === timer.duration}
						>
							<RotateCcw size={18} />
							Reset
						</button>
					</div>

					{#if timer.autoExpire}
						<div class="expire-action">
							<Bell size={14} />
							<span>On expire: {timer.onExpireAction?.replace('-', ' ')}</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.activity-timer-manager {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 2rem;
	}

	.manager-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
	}

	.manager-header h3 {
		margin: 0 0 0.25rem 0;
		font-size: 1.25rem;
		color: #1f2937;
	}

	.activity-type {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
	}

	/* Add Timer Form */
	.add-timer-form {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.form-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.form-header h4 {
		margin: 0;
		font-size: 1rem;
		color: #1f2937;
	}

	.close-button {
		background: none;
		border: none;
		padding: 0.25rem;
		cursor: pointer;
		color: #6b7280;
		border-radius: 4px;
		transition: all 0.2s;
	}

	.close-button:hover {
		background: #e5e7eb;
		color: #1f2937;
	}

	.preset-section label {
		display: block;
		margin-bottom: 0.75rem;
		font-weight: 500;
		color: #374151;
		font-size: 0.875rem;
	}

	.preset-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.preset-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.875rem;
		color: #374151;
	}

	.preset-button:hover {
		border-color: #6366f1;
		color: #6366f1;
	}

	.form-divider {
		display: flex;
		align-items: center;
		margin: 1.5rem 0;
		color: #9ca3af;
		font-size: 0.875rem;
	}

	.form-divider::before,
	.form-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: #e5e7eb;
	}

	.form-divider span {
		padding: 0 1rem;
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-field label {
		font-weight: 500;
		color: #374151;
		font-size: 0.875rem;
	}

	.form-field input[type='text'],
	.form-field input[type='number'],
	.action-select {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.875rem;
		background: white;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
	}

	.checkbox-label input[type='checkbox'] {
		width: 18px;
		height: 18px;
		cursor: pointer;
	}

	.action-select {
		margin-top: 0.5rem;
		margin-left: 2rem;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3rem 2rem;
		text-align: center;
		color: #9ca3af;
	}

	.empty-state h4 {
		margin: 0;
		color: #374151;
	}

	.empty-state p {
		margin: 0;
		color: #6b7280;
	}

	/* Timers Grid */
	.timers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.timer-card {
		padding: 1.5rem;
		background: #fafafa;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		transition: all 0.2s;
	}

	.timer-card.active {
		border-color: #6366f1;
		background: white;
	}

	.timer-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.timer-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.timer-name {
		font-weight: 600;
		color: #1f2937;
	}

	.auto-expire-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.25rem;
		background: #fef3c7;
		color: #f59e0b;
		border-radius: 4px;
	}

	.delete-button {
		background: none;
		border: none;
		padding: 0.25rem;
		cursor: pointer;
		color: #9ca3af;
		border-radius: 4px;
		transition: all 0.2s;
	}

	.delete-button:hover {
		background: #fee2e2;
		color: #ef4444;
	}

	.timer-display {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.time-remaining {
		font-size: 2.5rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.time-total {
		font-size: 1rem;
		color: #9ca3af;
		font-variant-numeric: tabular-nums;
	}

	.timer-progress {
		height: 8px;
		background: #e5e7eb;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 1rem;
	}

	.progress-fill {
		height: 100%;
		transition: width 0.3s, background 0.3s;
	}

	.timer-controls {
		display: flex;
		gap: 0.5rem;
	}

	.control-button {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.control-button.play {
		background: #dcfce7;
		color: #10b981;
	}

	.control-button.play:hover:not(:disabled) {
		background: #bbf7d0;
	}

	.control-button.pause {
		background: #fef3c7;
		color: #f59e0b;
	}

	.control-button.pause:hover {
		background: #fde68a;
	}

	.control-button.reset {
		background: #f3f4f6;
		color: #6b7280;
	}

	.control-button.reset:hover:not(:disabled) {
		background: #e5e7eb;
	}

	.control-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.expire-action {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 0.5rem;
		background: #fffbeb;
		border-radius: 6px;
		font-size: 0.75rem;
		color: #92400e;
	}

	/* Buttons */
	.button {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 500;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.button.primary {
		background: #6366f1;
		color: white;
	}

	.button.primary:hover:not(:disabled) {
		background: #4f46e5;
	}

	.button.primary:disabled {
		background: #d1d5db;
		cursor: not-allowed;
	}

	.button.secondary {
		background: white;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.button.secondary:hover {
		background: #f9fafb;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.manager-header {
			flex-direction: column;
			gap: 1rem;
		}

		.button.primary {
			width: 100%;
		}

		.timers-grid {
			grid-template-columns: 1fr;
		}

		.preset-buttons {
			flex-direction: column;
		}

		.preset-button {
			width: 100%;
		}
	}
</style>
