<script lang="ts">
	import Button from './Button.svelte';

	interface EmptyStateProps {
		variant?: 'no-results' | 'no-content' | 'error' | 'permission' | 'coming-soon';
		title: string;
		description?: string;
		icon?: string;
		actionLabel?: string;
		onAction?: () => void;
		illustration?: 'search' | 'create' | 'error' | 'lock' | 'rocket' | 'empty';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	}

	let {
		variant = 'no-content',
		title,
		description,
		icon,
		actionLabel,
		onAction,
		illustration,
		size = 'md',
		class: className = ''
	}: EmptyStateProps = $props();

	// Default icons based on variant if not provided
	const defaultIcons = {
		'no-results': '🔍',
		'no-content': '📝',
		'error': '⚠️',
		'permission': '🔒',
		'coming-soon': '🚀'
	};

	const displayIcon = $derived(icon || defaultIcons[variant]);

	// Default illustration if specified
	const illustrationPaths = {
		search: `M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm1-13h-2v6h6v-2h-4V7z`,
		create: `M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z`,
		error: `M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z`,
		lock: `M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z`,
		rocket: `M12 2L4 8v8c0 5.5 3.8 9.7 8 11 4.2-1.3 8-5.5 8-11V8l-8-6z`,
		empty: `M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z`
	};
</script>

<div class="empty-state empty-state-{size} {className}" role="status" aria-live="polite">
	<div class="empty-state-content">
		<!-- Illustration -->
		{#if illustration && illustrationPaths[illustration]}
			<div class="empty-state-illustration" aria-hidden="true">
				<svg
					width="120"
					height="120"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path d={illustrationPaths[illustration]} fill="currentColor" opacity="0.2" />
				</svg>
			</div>
		{/if}

		<!-- Icon -->
		{#if displayIcon}
			<div class="empty-state-icon" aria-hidden="true">
				{displayIcon}
			</div>
		{/if}

		<!-- Title -->
		<h3 class="empty-state-title">
			{title}
		</h3>

		<!-- Description -->
		{#if description}
			<p class="empty-state-description">
				{description}
			</p>
		{/if}

		<!-- Action Button -->
		{#if actionLabel && onAction}
			<div class="empty-state-action">
				<Button
					variant={variant === 'error' ? 'danger' : 'primary'}
					size={size === 'lg' ? 'lg' : 'md'}
					onclick={onAction}
				>
					{actionLabel}
				</Button>
			</div>
		{/if}
	</div>
</div>

<style>
	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-height: 300px;
		padding: 3rem 1rem;
		background-color: var(--color-surface);
		border-radius: 0.75rem;
		border: 1px solid var(--color-border);
	}

	.empty-state-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		max-width: 400px;
		gap: 1rem;
	}

	/* Illustration */
	.empty-state-illustration {
		color: var(--color-text-tertiary);
		margin-bottom: 0.5rem;
		opacity: 0.5;
	}

	.empty-state-illustration svg {
		width: 120px;
		height: 120px;
	}

	/* Icon */
	.empty-state-icon {
		font-size: 3rem;
		line-height: 1;
		margin-bottom: 0.5rem;
		filter: grayscale(0.2);
	}

	/* Title */
	.empty-state-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
		line-height: 1.4;
	}

	/* Description */
	.empty-state-description {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.6;
		max-width: 320px;
	}

	/* Action */
	.empty-state-action {
		margin-top: 0.5rem;
	}

	/* Size Variants */
	.empty-state-sm {
		min-height: 200px;
		padding: 2rem 1rem;
	}

	.empty-state-sm .empty-state-content {
		max-width: 320px;
		gap: 0.75rem;
	}

	.empty-state-sm .empty-state-icon {
		font-size: 2rem;
		margin-bottom: 0.25rem;
	}

	.empty-state-sm .empty-state-illustration svg {
		width: 80px;
		height: 80px;
	}

	.empty-state-sm .empty-state-title {
		font-size: 1rem;
	}

	.empty-state-sm .empty-state-description {
		font-size: 0.875rem;
		max-width: 280px;
	}

	.empty-state-lg {
		min-height: 400px;
		padding: 4rem 1.5rem;
	}

	.empty-state-lg .empty-state-content {
		max-width: 500px;
		gap: 1.5rem;
	}

	.empty-state-lg .empty-state-icon {
		font-size: 4rem;
		margin-bottom: 0.75rem;
	}

	.empty-state-lg .empty-state-illustration svg {
		width: 160px;
		height: 160px;
	}

	.empty-state-lg .empty-state-title {
		font-size: 1.5rem;
	}

	.empty-state-lg .empty-state-description {
		font-size: 1rem;
		max-width: 400px;
	}

	.empty-state-lg .empty-state-action {
		margin-top: 1rem;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.empty-state {
			padding: 2rem 1rem;
			min-height: 250px;
		}

		.empty-state-illustration svg {
			width: 100px;
			height: 100px;
		}

		.empty-state-icon {
			font-size: 2.5rem;
		}

		.empty-state-title {
			font-size: 1.125rem;
		}

		.empty-state-description {
			font-size: 0.875rem;
		}

		.empty-state-lg {
			min-height: 300px;
			padding: 2.5rem 1rem;
		}

		.empty-state-lg .empty-state-illustration svg {
			width: 120px;
			height: 120px;
		}

		.empty-state-lg .empty-state-icon {
			font-size: 3rem;
		}
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.empty-state * {
			animation: none;
			transition: none;
		}
	}

	/* Dark mode considerations */
	@media (prefers-color-scheme: dark) {
		.empty-state {
			background-color: var(--color-surface-secondary);
		}

		.empty-state-illustration {
			opacity: 0.3;
		}
	}
</style>
