<script lang="ts">
	interface SkeletonProps {
		count?: number;
	}

	let { count = 6 }: SkeletonProps = $props();
</script>

{#each Array(count) as _, i (i)}
	<div class="skeleton-card">
		<div class="skeleton-header">
			<div class="skeleton-icon"></div>
			<div class="skeleton-badge"></div>
		</div>

		<div class="skeleton-body">
			<div class="skeleton-title"></div>
			<div class="skeleton-description-1"></div>
			<div class="skeleton-description-2"></div>

			<div class="skeleton-meta">
				<div class="skeleton-meta-item"></div>
				<div class="skeleton-meta-item"></div>
				<div class="skeleton-meta-item"></div>
			</div>

			<div class="skeleton-code"></div>
		</div>

		<div class="skeleton-actions">
			<div class="skeleton-btn"></div>
			<div class="skeleton-btn"></div>
			<div class="skeleton-btn"></div>
			<div class="skeleton-btn"></div>
		</div>
	</div>
{/each}

<style>
	@keyframes shimmer {
		0% {
			background-position: -1000px 0;
		}
		100% {
			background-position: 1000px 0;
		}
	}

	.skeleton-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		overflow: hidden;
		box-shadow: var(--shadow-base);
	}

	.skeleton-header {
		padding: var(--spacing-6);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.skeleton-icon {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: var(--radius-md);
		background: linear-gradient(
			90deg,
			var(--color-surface-secondary) 0px,
			var(--color-surface-tertiary) 40px,
			var(--color-surface-secondary) 80px
		);
		background-size: 1000px 100%;
		animation: shimmer 2s infinite linear;
	}

	.skeleton-badge {
		width: 4rem;
		height: 1.25rem;
		border-radius: var(--radius-full);
		background: linear-gradient(
			90deg,
			var(--color-surface-secondary) 0px,
			var(--color-surface-tertiary) 40px,
			var(--color-surface-secondary) 80px
		);
		background-size: 1000px 100%;
		animation: shimmer 2s infinite linear;
	}

	.skeleton-body {
		padding: 0 var(--spacing-6) var(--spacing-6) var(--spacing-6);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.skeleton-title {
		height: 1.5rem;
		width: 70%;
		border-radius: var(--radius-md);
		background: linear-gradient(
			90deg,
			var(--color-surface-secondary) 0px,
			var(--color-surface-tertiary) 40px,
			var(--color-surface-secondary) 80px
		);
		background-size: 1000px 100%;
		animation: shimmer 2s infinite linear;
	}

	.skeleton-description-1,
	.skeleton-description-2 {
		height: 0.875rem;
		border-radius: var(--radius-md);
		background: linear-gradient(
			90deg,
			var(--color-surface-secondary) 0px,
			var(--color-surface-tertiary) 40px,
			var(--color-surface-secondary) 80px
		);
		background-size: 1000px 100%;
		animation: shimmer 2s infinite linear;
	}

	.skeleton-description-1 {
		width: 100%;
	}

	.skeleton-description-2 {
		width: 80%;
	}

	.skeleton-meta {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
		margin-top: var(--spacing-2);
	}

	.skeleton-meta-item {
		height: 1rem;
		width: 50%;
		border-radius: var(--radius-md);
		background: linear-gradient(
			90deg,
			var(--color-surface-secondary) 0px,
			var(--color-surface-tertiary) 40px,
			var(--color-surface-secondary) 80px
		);
		background-size: 1000px 100%;
		animation: shimmer 2s infinite linear;
	}

	.skeleton-code {
		height: 2rem;
		width: 60%;
		border-radius: var(--radius-md);
		background: linear-gradient(
			90deg,
			var(--color-surface-secondary) 0px,
			var(--color-surface-tertiary) 40px,
			var(--color-surface-secondary) 80px
		);
		background-size: 1000px 100%;
		animation: shimmer 2s infinite linear;
		margin-top: var(--spacing-2);
	}

	.skeleton-actions {
		display: flex;
		gap: var(--spacing-2);
		padding: var(--spacing-4) var(--spacing-6);
		background: var(--color-surface-secondary);
		border-top: 1px solid var(--color-border);
	}

	.skeleton-btn {
		flex: 1;
		height: 2rem;
		border-radius: var(--radius-md);
		background: linear-gradient(
			90deg,
			var(--color-surface-tertiary) 0px,
			var(--color-surface) 40px,
			var(--color-surface-tertiary) 80px
		);
		background-size: 1000px 100%;
		animation: shimmer 2s infinite linear;
	}
</style>
