<script lang="ts">
	import { dev } from '$app/environment';
	import { onMount } from 'svelte';
	import type { Event } from '../types/entities';

	export let demoEvent: Event | null = null;
	export let showQRCode = false;

	let isVisible = true;
	let copied = false;

	function dismissBanner() {
		isVisible = false;
		// Store dismissal in sessionStorage so it persists for the session
		sessionStorage.setItem('dev-banner-dismissed', 'true');
	}

	function copyAccessCode() {
		if (demoEvent?.accessCode) {
			navigator.clipboard.writeText(demoEvent.accessCode);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		}
	}

	onMount(() => {
		// Check if banner was dismissed in this session
		const dismissed = sessionStorage.getItem('dev-banner-dismissed');
		if (dismissed) {
			isVisible = false;
		}
	});

	// Generate QR code URL (using qr-server.com for simplicity in development)
	$: qrCodeUrl = demoEvent?.accessCode && typeof window !== 'undefined'
		? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(window.location.origin + '/join/' + demoEvent.accessCode)}`
		: null;
</script>

{#if dev && isVisible && demoEvent}
	<div
		class="dev-banner"
		role="banner"
		aria-label="Development information banner"
	>
		<div class="banner-content">
			<div class="banner-header">
				<div class="dev-indicator">
					<span class="dev-badge">DEV</span>
					<h3>Development Demo Event</h3>
				</div>
				<button
					class="dismiss-btn"
					on:click={dismissBanner}
					aria-label="Dismiss development banner"
				>
					×
				</button>
			</div>

			<div class="event-info">
				<div class="event-details">
					<h4>{demoEvent.title}</h4>
					<p class="event-description">{demoEvent.description}</p>

					<div class="access-info">
						<div class="access-code-section">
							<label for="access-code">Event Access Code:</label>
							<div class="code-display">
								<code id="access-code" class="access-code">{demoEvent.accessCode}</code>
								<button
									class="copy-btn"
									class:copied
									on:click={copyAccessCode}
									aria-label="Copy access code to clipboard"
								>
									{copied ? '✓' : '📋'}
								</button>
							</div>
						</div>

						{#if showQRCode && qrCodeUrl}
							<div class="qr-section">
								<label>Quick Join QR Code:</label>
								<img
									src={qrCodeUrl}
									alt="QR code to join event"
									class="qr-code"
									loading="lazy"
								/>
							</div>
						{/if}
					</div>

					<div class="dev-stats">
						<span class="stat">
							<strong>Event ID:</strong> {demoEvent.id}
						</span>
						<span class="stat">
							<strong>Status:</strong> {demoEvent.status}
						</span>
						<span class="stat">
							<strong>Activity:</strong> {demoEvent.currentActivity || 'None'}
						</span>
					</div>
				</div>

				<div class="dev-actions">
					<a
						href="/join/{demoEvent.accessCode}"
						class="join-btn"
						target="_blank"
						rel="noopener noreferrer"
					>
						Join Event (New Tab)
					</a>
					<a
						href="/organizer/events/{demoEvent.id}"
						class="organizer-btn"
					>
						Organizer Panel
					</a>
					<button
						class="qr-toggle"
						on:click={() => showQRCode = !showQRCode}
					>
						{showQRCode ? 'Hide' : 'Show'} QR Code
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.dev-banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 9999;
		background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
		border-bottom: 3px solid #0ea5e9;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		animation: slideDown 0.3s ease-out;
	}

	@keyframes slideDown {
		from {
			transform: translateY(-100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.banner-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
		color: white;
	}

	.banner-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.dev-indicator {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.dev-badge {
		background: #ef4444;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: bold;
		letter-spacing: 0.05em;
	}

	.dev-indicator h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.dismiss-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: white;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 1.25rem;
		transition: all 0.2s ease;
	}

	.dismiss-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		transform: scale(1.1);
	}

	.event-info {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 2rem;
		align-items: start;
	}

	.event-details h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		color: #0ea5e9;
	}

	.event-description {
		margin: 0 0 1rem 0;
		color: #cbd5e1;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.access-info {
		display: flex;
		gap: 2rem;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.access-code-section label,
	.qr-section label {
		display: block;
		font-size: 0.875rem;
		color: #94a3b8;
		margin-bottom: 0.5rem;
		font-weight: 500;
	}

	.code-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.access-code {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 0.5rem 0.75rem;
		border-radius: 0.375rem;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 1.1rem;
		color: #0ea5e9;
		font-weight: bold;
		letter-spacing: 0.1em;
	}

	.copy-btn {
		background: rgba(59, 130, 246, 0.2);
		border: 1px solid rgba(59, 130, 246, 0.3);
		color: #3b82f6;
		padding: 0.5rem;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.875rem;
	}

	.copy-btn:hover {
		background: rgba(59, 130, 246, 0.3);
		transform: scale(1.05);
	}

	.copy-btn.copied {
		background: rgba(34, 197, 94, 0.2);
		border-color: rgba(34, 197, 94, 0.3);
		color: #22c55e;
	}

	.qr-code {
		border-radius: 0.5rem;
		border: 2px solid rgba(255, 255, 255, 0.1);
	}

	.dev-stats {
		display: flex;
		gap: 1.5rem;
		font-size: 0.875rem;
	}

	.stat {
		color: #94a3b8;
	}

	.stat strong {
		color: white;
	}

	.dev-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 200px;
	}

	.join-btn,
	.organizer-btn,
	.qr-toggle {
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		text-decoration: none;
		text-align: center;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
		border: none;
		cursor: pointer;
	}

	.join-btn {
		background: #0ea5e9;
		color: white;
	}

	.join-btn:hover {
		background: #0284c7;
		transform: translateY(-1px);
	}

	.organizer-btn {
		background: rgba(168, 85, 247, 0.2);
		color: #a855f7;
		border: 1px solid rgba(168, 85, 247, 0.3);
	}

	.organizer-btn:hover {
		background: rgba(168, 85, 247, 0.3);
		color: white;
	}

	.qr-toggle {
		background: rgba(255, 255, 255, 0.1);
		color: #cbd5e1;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.qr-toggle:hover {
		background: rgba(255, 255, 255, 0.2);
		color: white;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.banner-content {
			padding: 0.75rem;
		}

		.event-info {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.access-info {
			flex-direction: column;
			gap: 1rem;
		}

		.dev-stats {
			flex-direction: column;
			gap: 0.5rem;
		}

		.dev-actions {
			min-width: auto;
		}
	}
</style>