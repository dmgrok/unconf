<script lang="ts">
	interface CardProps {
		variant?: 'default' | 'outlined' | 'elevated';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		hover?: boolean;
		class?: string;
		children?: any;
		header?: any;
		footer?: any;
	}

	let {
		variant = 'default',
		padding = 'md',
		hover = false,
		class: className = '',
		children,
		header,
		footer
	}: CardProps = $props();
</script>

<div
	class="card card-{variant} card-padding-{padding} {className}"
	class:card-hover={hover}
	role="region"
>
	{#if header}
		<div class="card-header">
			{@render header()}
		</div>
	{/if}

	{#if children}
		<div class="card-body">
			{@render children()}
		</div>
	{/if}

	{#if footer}
		<div class="card-footer">
			{@render footer()}
		</div>
	{/if}
</div>

<style>
	.card {
		background: white;
		border-radius: 0.5rem;
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
	}

	/* Variants */
	.card-default {
		border: 1px solid #e5e7eb;
	}

	.card-outlined {
		border: 2px solid #e5e7eb;
	}

	.card-elevated {
		border: 1px solid #e5e7eb;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	/* Hover effects */
	.card-hover {
		cursor: pointer;
	}

	.card-hover:hover {
		transform: translateY(-1px);
	}

	.card-default.card-hover:hover {
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.card-outlined.card-hover:hover {
		border-color: #d1d5db;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.card-elevated.card-hover:hover {
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
	}

	/* Padding variants */
	.card-padding-none {
		padding: 0;
	}

	.card-padding-sm {
		padding: 0.75rem;
	}

	.card-padding-md {
		padding: 1.5rem;
	}

	.card-padding-lg {
		padding: 2rem;
	}

	/* Header, body, footer */
	.card-header {
		border-bottom: 1px solid #e5e7eb;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
	}

	.card-body {
		flex: 1;
	}

	.card-footer {
		border-top: 1px solid #e5e7eb;
		margin-top: 1rem;
		padding-top: 1rem;
	}

	/* Handle padding when using header/footer with padding-none cards */
	.card-padding-none .card-header {
		padding: 1rem 1rem 0;
		margin-bottom: 0;
	}

	.card-padding-none .card-body {
		padding: 1rem;
	}

	.card-padding-none .card-footer {
		padding: 0 1rem 1rem;
		margin-top: 0;
	}

	/* Remove margins for first/last children in body */
	.card-body :global(:first-child) {
		margin-top: 0;
	}

	.card-body :global(:last-child) {
		margin-bottom: 0;
	}

	/* Focus styles for interactive cards */
	.card-hover:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.card-padding-lg {
			padding: 1rem;
		}

		.card-padding-md {
			padding: 1rem;
		}
	}
</style>