<script lang="ts">
	import { goto } from '$app/navigation';
	import { Vote, MessageSquare, Gamepad2, BarChart3, Target } from 'lucide-svelte';
	import Button from './ui/Button.svelte';

	function handleGetStarted() {
		console.log('handleGetStarted called!');
		goto('/create');
	}

	function handleLearnMore() {
		console.log('handleLearnMore called!');
		goto('/docs');
	}
</script>

<section class="hero">
	<div class="hero-container">
		<div class="hero-content">
			<h1 class="hero-title">
				Run Events Where
				<span class="hero-title-highlight">Attendees Build the Agenda</span>
			</h1>
			<p class="hero-description">
				The all-in-one platform for unconferences and participatory events. Your attendees vote on topics, form discussion groups, and engage in real-time—all automated. <strong>No signup required for participants.</strong>
			</p>
			<div class="hero-actions">
				<a href="/create" class="btn btn-primary btn-lg">Create an Event Now</a>
			</div>
			<p class="hero-subtext">Free for small events • Anonymous participation option • No data collection hassles</p>

			<!-- Features -->
			<div class="hero-features">
				<div class="feature">
					<span class="feature-icon">
						<Vote size={20} />
					</span>
					<span>Weighted Voting</span>
				</div>
				<div class="feature">
					<span class="feature-icon">
						<MessageSquare size={20} />
					</span>
					<span>Discussion Groups</span>
				</div>
				<div class="feature">
					<span class="feature-icon">
						<Gamepad2 size={20} />
					</span>
					<span>Interactive Games</span>
				</div>
				<div class="feature">
					<span class="feature-icon">
						<BarChart3 size={20} />
					</span>
					<span>Real-time Analytics</span>
				</div>
			</div>
		</div>

		<!-- Visual Element -->
		<div class="hero-visual">
			<div class="visual-card card-1">
				<div class="card-icon">
					<Target size={32} />
				</div>
				<div class="card-content">
					<div class="card-title">Create Events</div>
					<div class="card-desc">In seconds</div>
				</div>
			</div>
			<div class="visual-card card-2">
				<div class="card-icon">👥</div>
				<div class="card-content">
					<div class="card-title">Collaborate</div>
					<div class="card-desc">In real-time</div>
				</div>
			</div>
			<div class="visual-card card-3">
				<div class="card-icon">📈</div>
				<div class="card-content">
					<div class="card-title">Track Results</div>
					<div class="card-desc">Instantly</div>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.hero {
		background: linear-gradient(
			135deg,
			var(--color-primary-50) 0%,
			var(--color-secondary-50) 100%
		);
		padding: var(--spacing-20) var(--spacing-6);
		min-height: 600px;
		display: flex;
		align-items: center;
	}

	.hero-container {
		max-width: 1280px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--spacing-12);
		align-items: center;
	}

	@media (min-width: 1024px) {
		.hero-container {
			grid-template-columns: 1fr 1fr;
		}
	}

	.hero-content {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-6);
	}

	.hero-title {
		font-size: clamp(2.5rem, 5vw, 4rem);
		font-weight: var(--font-weight-bold);
		line-height: 1.1;
		color: var(--color-text-primary);
		margin: 0;
	}

	.hero-title-highlight {
		background: linear-gradient(
			135deg,
			var(--color-primary) 0%,
			var(--color-primary-600) 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.hero-description {
		font-size: var(--font-size-xl);
		color: var(--color-text-secondary);
		line-height: var(--line-height-relaxed);
		max-width: 600px;
		margin: 0;
	}

	.hero-actions {
		display: flex;
		gap: var(--spacing-4);
		flex-wrap: wrap;
	}

	.hero-subtext {
		font-size: var(--font-size-sm);
		color: var(--color-text-tertiary);
		margin: 0;
	}

	.hero-features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: var(--spacing-4);
		margin-top: var(--spacing-4);
	}

	.feature {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-weight: var(--font-weight-medium);
	}

	.feature-icon {
		font-size: 1.5rem;
	}

	.hero-visual {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--spacing-4);
		position: relative;
	}

	.visual-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: var(--spacing-6);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
		box-shadow: var(--shadow-lg);
		transition: transform var(--transition-base);
	}

	.visual-card:hover {
		transform: translateY(-4px);
	}

	.visual-card.card-3 {
		grid-column: 1 / -1;
	}

	.card-icon {
		font-size: 2.5rem;
	}

	.card-title {
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		font-size: var(--font-size-lg);
	}

	.card-desc {
		color: var(--color-text-tertiary);
		font-size: var(--font-size-sm);
	}

	@media (max-width: 768px) {
		.hero {
			padding: var(--spacing-12) var(--spacing-4);
			text-align: center;
		}

		.hero-actions {
			justify-content: center;
		}

		.hero-features {
			grid-template-columns: 1fr 1fr;
		}

		.feature {
			flex-direction: column;
			text-align: center;
		}
	}
</style>
