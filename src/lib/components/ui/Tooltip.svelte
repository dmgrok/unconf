<script lang="ts">
	let { content, position = 'top' }: { content: string; position?: 'top' | 'bottom' | 'left' | 'right' } = $props();

	let showTooltip = $state(false);
</script>

<div class="tooltip-wrapper">
	<button
		type="button"
		class="tooltip-trigger"
		aria-label="More information"
		onmouseenter={() => (showTooltip = true)}
		onmouseleave={() => (showTooltip = false)}
		onfocus={() => (showTooltip = true)}
		onblur={() => (showTooltip = false)}
	>
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
			<path
				d="M8 11V8M8 5H8.01"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</button>

	{#if showTooltip}
		<div class="tooltip-content tooltip-{position}" role="tooltip">
			{content}
		</div>
	{/if}
</div>

<style>
	.tooltip-wrapper {
		position: relative;
		display: inline-flex;
	}

	.tooltip-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		background: none;
		border: none;
		color: var(--color-text-tertiary);
		cursor: help;
		transition: color var(--transition-fast);
	}

	.tooltip-trigger:hover,
	.tooltip-trigger:focus {
		color: var(--color-primary);
		outline: none;
	}

	.tooltip-content {
		position: absolute;
		z-index: var(--z-tooltip);
		max-width: 250px;
		padding: var(--spacing-2) var(--spacing-3);
		background: var(--color-neutral-800);
		color: white;
		font-size: var(--font-size-xs);
		line-height: var(--line-height-normal);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		pointer-events: none;
		white-space: normal;
	}

	.tooltip-top {
		bottom: calc(100% + var(--spacing-2));
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip-bottom {
		top: calc(100% + var(--spacing-2));
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip-left {
		right: calc(100% + var(--spacing-2));
		top: 50%;
		transform: translateY(-50%);
	}

	.tooltip-right {
		left: calc(100% + var(--spacing-2));
		top: 50%;
		transform: translateY(-50%);
	}

	@media (max-width: 640px) {
		.tooltip-content {
			max-width: 200px;
			font-size: 0.6875rem;
		}
	}
</style>
