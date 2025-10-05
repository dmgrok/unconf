<script lang="ts">
	interface SkeletonProps {
		variant?: 'text' | 'circular' | 'rectangular';
		width?: string;
		height?: string;
		class?: string;
	}

	let {
		variant = 'text',
		width,
		height,
		class: className = ''
	}: SkeletonProps = $props();
</script>

<div
	class="skeleton skeleton-{variant} {className}"
	style:width
	style:height
	aria-busy="true"
	aria-live="polite"
></div>

<style>
	.skeleton {
		background: linear-gradient(
			90deg,
			var(--color-surface-secondary) 0%,
			var(--color-surface-tertiary) 50%,
			var(--color-surface-secondary) 100%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
		border-radius: var(--radius-base);
	}

	.skeleton-text {
		height: 1em;
		margin-bottom: var(--spacing-2);
		border-radius: var(--radius-sm);
	}

	.skeleton-circular {
		border-radius: 50%;
	}

	.skeleton-rectangular {
		width: 100%;
		height: 100%;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton {
			animation: none;
			background: var(--color-surface-secondary);
		}
	}
</style>
