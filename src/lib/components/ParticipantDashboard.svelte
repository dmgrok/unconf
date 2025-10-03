<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { writable, derived } from 'svelte/store';
	import { ConnectionStatus, ActivityType, ActivityState } from '$types/enums';
	import type { Event } from '$types/entities';

	export let eventId: string;
	export let userId: string;
	export let userName: string;

	// Connection state management
	const connectionStatus = writable<ConnectionStatus>(ConnectionStatus.CONNECTING);
	const lastHeartbeat = writable<number>(Date.now());
	const reconnectAttempts = writable<number>(0);

	// Event and activity state
	const currentEvent = writable<Event | null>(null);
	const currentActivity = writable<ActivityType | null>(null);
	const activityState = writable<ActivityState>(ActivityState.IDLE);
	const participants = writable<number>(0);
	const error = writable<string | null>(null);

	// Derived stores
	const isConnected = derived(connectionStatus, $status =>
		$status === ConnectionStatus.CONNECTED
	);

	const isReconnecting = derived(connectionStatus, $status =>
		$status === ConnectionStatus.RECONNECTING
	);

	const canParticipate = derived(
		[isConnected, activityState],
		([$connected, $state]) => $connected && $state === ActivityState.ACTIVE
	);

	let ws: WebSocket | null = null;
	let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
	let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

	function connectWebSocket() {
		try {
			connectionStatus.set(ConnectionStatus.CONNECTING);

			// Determine WebSocket URL
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const host = window.location.host;
			const wsUrl = `${protocol}//${host}/ws`;

			ws = new WebSocket(wsUrl);

			ws.onopen = () => {
				console.log('WebSocket connected');
				connectionStatus.set(ConnectionStatus.CONNECTED);
				reconnectAttempts.set(0);
				error.set(null);

				// Join event
				sendMessage({
					type: 'JOIN_EVENT',
					eventId,
					userId,
					userName
				});

				// Start heartbeat
				startHeartbeat();
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					handleMessage(data);
				} catch (err) {
					console.error('Failed to parse WebSocket message:', err);
				}
			};

			ws.onerror = (event) => {
				console.error('WebSocket error:', event);
				connectionStatus.set(ConnectionStatus.ERROR);
				error.set('Connection error occurred');
			};

			ws.onclose = () => {
				console.log('WebSocket disconnected');
				connectionStatus.set(ConnectionStatus.DISCONNECTED);
				stopHeartbeat();

				// Attempt reconnection
				if ($reconnectAttempts < 5) {
					scheduleReconnect();
				} else {
					error.set('Maximum reconnection attempts reached');
				}
			};
		} catch (err) {
			console.error('Failed to connect WebSocket:', err);
			connectionStatus.set(ConnectionStatus.ERROR);
			error.set('Failed to establish connection');
		}
	}

	function sendMessage(message: Record<string, unknown>) {
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(message));
		}
	}

	function handleMessage(data: any) {
		lastHeartbeat.set(Date.now());

		switch (data.type) {
			case 'EVENT_STATE':
				currentEvent.set(data.event);
				currentActivity.set(data.event.currentActivity || null);
				participants.set(data.participantCount || 0);
				break;

			case 'ACTIVITY_STATE_CHANGE':
				currentActivity.set(data.activity);
				activityState.set(data.state);
				break;

			case 'HEARTBEAT':
				// Update last heartbeat timestamp
				break;

			case 'USER_JOIN':
				participants.update(count => count + 1);
				break;

			case 'USER_LEAVE':
				participants.update(count => Math.max(0, count - 1));
				break;

			case 'ERROR':
				error.set(data.message);
				setTimeout(() => error.set(null), 5000);
				break;

			default:
				console.log('Unknown message type:', data.type);
		}
	}

	function startHeartbeat() {
		heartbeatInterval = setInterval(() => {
			sendMessage({ type: 'HEARTBEAT', userId, eventId });

			// Check for stale connection (no heartbeat response in 60s)
			const timeSinceLastHeartbeat = Date.now() - $lastHeartbeat;
			if (timeSinceLastHeartbeat > 60000) {
				console.warn('Connection appears stale, reconnecting...');
				disconnect();
				scheduleReconnect();
			}
		}, 30000); // Send heartbeat every 30 seconds
	}

	function stopHeartbeat() {
		if (heartbeatInterval) {
			clearInterval(heartbeatInterval);
			heartbeatInterval = null;
		}
	}

	function scheduleReconnect() {
		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
		}

		reconnectAttempts.update(n => n + 1);
		connectionStatus.set(ConnectionStatus.RECONNECTING);

		const delay = Math.min(1000 * Math.pow(2, $reconnectAttempts), 30000);

		reconnectTimeout = setTimeout(() => {
			console.log(`Reconnecting (attempt ${$reconnectAttempts})...`);
			connectWebSocket();
		}, delay);
	}

	function disconnect() {
		if (ws) {
			ws.close();
			ws = null;
		}
		stopHeartbeat();
		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
			reconnectTimeout = null;
		}
	}

	function handleReconnect() {
		reconnectAttempts.set(0);
		connectWebSocket();
	}

	onMount(() => {
		connectWebSocket();
	});

	onDestroy(() => {
		disconnect();
	});
</script>

<div class="participant-dashboard">
	<!-- Connection Status Header -->
	<div class="connection-header" class:connected={$isConnected} class:disconnected={!$isConnected} class:reconnecting={$isReconnecting}>
		<div class="connection-indicator">
			<div class="status-dot" class:pulse={$isReconnecting}></div>
			<span class="status-text">
				{#if $connectionStatus === ConnectionStatus.CONNECTED}
					Connected
				{:else if $connectionStatus === ConnectionStatus.CONNECTING}
					Connecting...
				{:else if $connectionStatus === ConnectionStatus.RECONNECTING}
					Reconnecting... (Attempt {$reconnectAttempts}/5)
				{:else if $connectionStatus === ConnectionStatus.DISCONNECTED}
					Disconnected
				{:else}
					Connection Error
				{/if}
			</span>
		</div>

		{#if $currentEvent}
			<div class="event-info">
				<h1>{$currentEvent.title}</h1>
				<div class="participant-count">
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8Z" fill="currentColor"/>
						<path d="M12 10C12 9.44772 11.5523 9 11 9H5C4.44772 9 4 9.44772 4 10V14H12V10Z" fill="currentColor"/>
					</svg>
					{$participants} participants
				</div>
			</div>
		{/if}
	</div>

	<!-- Error Message -->
	{#if $error}
		<div class="error-banner">
			⚠️ {$error}
		</div>
	{/if}

	<!-- Disconnected State with Reconnect Option -->
	{#if !$isConnected && !$isReconnecting}
		<div class="disconnected-state">
			<div class="disconnected-icon">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
				</svg>
			</div>
			<h2>Connection Lost</h2>
			<p>Unable to connect to the event. Please check your internet connection.</p>
			{#if $reconnectAttempts >= 5}
				<button class="reconnect-btn" on:click={handleReconnect}>
					Try Again
				</button>
			{/if}
		</div>
	{/if}

	<!-- Activity Content Area -->
	{#if $isConnected}
		<div class="activity-content">
			{#if $currentActivity === ActivityType.VOTING}
				<div class="activity-placeholder voting">
					<h2>Voting Session</h2>
					<p>Vote on discussion topics</p>
					<!-- Voting interface will be integrated here -->
				</div>
			{:else if $currentActivity === ActivityType.GROUP_INTELLIGENCE}
				<div class="activity-placeholder intelligence">
					<h2>Group Intelligence</h2>
					<p>Collaborative decision making</p>
					<!-- Group intelligence interface will be integrated here -->
				</div>
			{:else if $currentActivity === ActivityType.DISCUSSION_GROUPS}
				<div class="activity-placeholder discussion">
					<h2>Discussion Groups</h2>
					<p>Join a discussion room</p>
					<!-- Discussion room interface will be integrated here -->
				</div>
			{:else if $currentActivity === ActivityType.TEAM_DISTRIBUTION}
				<div class="activity-placeholder teams">
					<h2>Team Assignments</h2>
					<p>View your team assignment</p>
					<!-- Team distribution interface will be integrated here -->
				</div>
			{:else}
				<div class="idle-state">
					<div class="idle-icon">
						<svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor" opacity="0.3"/>
							<path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
						</svg>
					</div>
					<h2>Waiting for Activity</h2>
					<p>The organizer will start an activity soon.</p>
					<p class="hint">You'll see the activity interface here when it begins.</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.participant-dashboard {
		min-height: 100vh;
		background: var(--color-gray-50, #f9fafb);
		display: flex;
		flex-direction: column;
	}

	.connection-header {
		background: var(--color-background, #ffffff);
		padding: 1rem 1.5rem;
		border-bottom: 2px solid var(--color-border, #e5e7eb);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		transition: border-color 0.3s;
	}

	.connection-header.connected {
		border-bottom-color: var(--color-success, #059669);
	}

	.connection-header.disconnected,
	.connection-header.reconnecting {
		border-bottom-color: var(--color-error, #dc2626);
	}

	.connection-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-dot {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		background: var(--color-gray-400, #9ca3af);
	}

	.connection-header.connected .status-dot {
		background: var(--color-success, #059669);
	}

	.connection-header.disconnected .status-dot {
		background: var(--color-error, #dc2626);
	}

	.connection-header.reconnecting .status-dot {
		background: var(--color-warning, #f59e0b);
	}

	.status-dot.pulse {
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

	.status-text {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary, #6b7280);
	}

	.connection-header.connected .status-text {
		color: var(--color-success, #059669);
	}

	.event-info {
		flex: 1;
		min-width: 200px;
	}

	.event-info h1 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary, #1f2937);
	}

	.participant-count {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0.25rem;
		font-size: 0.875rem;
		color: var(--color-text-secondary, #6b7280);
	}

	.error-banner {
		background: var(--color-error-light, #fee2e2);
		color: var(--color-error-dark, #991b1b);
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid var(--color-error, #dc2626);
		font-size: 0.875rem;
		animation: slideDown 0.3s ease-out;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.disconnected-state,
	.idle-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		text-align: center;
	}

	.disconnected-icon,
	.idle-icon {
		color: var(--color-text-secondary, #6b7280);
		margin-bottom: 1.5rem;
		opacity: 0.5;
	}

	.disconnected-state h2,
	.idle-state h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text-primary, #1f2937);
	}

	.disconnected-state p,
	.idle-state p {
		margin: 0.5rem 0;
		color: var(--color-text-secondary, #6b7280);
		font-size: 1rem;
		max-width: 400px;
	}

	.idle-state .hint {
		font-size: 0.875rem;
		font-style: italic;
		margin-top: 1rem;
	}

	.reconnect-btn {
		margin-top: 1.5rem;
		padding: 0.75rem 2rem;
		font-size: 1rem;
		font-weight: 600;
		color: white;
		background: var(--color-primary, #3b82f6);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.reconnect-btn:hover {
		background: var(--color-primary-dark, #2563eb);
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.activity-content {
		flex: 1;
		padding: 1.5rem;
	}

	.activity-placeholder {
		background: var(--color-background, #ffffff);
		border-radius: 0.5rem;
		padding: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		text-align: center;
	}

	.activity-placeholder h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text-primary, #1f2937);
	}

	.activity-placeholder p {
		margin: 0;
		color: var(--color-text-secondary, #6b7280);
		font-size: 1rem;
	}

	.activity-placeholder.voting {
		border-left: 4px solid var(--color-primary, #3b82f6);
	}

	.activity-placeholder.intelligence {
		border-left: 4px solid var(--color-success, #059669);
	}

	.activity-placeholder.discussion {
		border-left: 4px solid var(--color-warning, #f59e0b);
	}

	.activity-placeholder.teams {
		border-left: 4px solid var(--color-purple, #8b5cf6);
	}

	@media (max-width: 640px) {
		.connection-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.event-info h1 {
			font-size: 1.125rem;
		}

		.activity-content {
			padding: 1rem;
		}
	}
</style>
