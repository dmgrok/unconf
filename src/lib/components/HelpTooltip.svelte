<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	interface HelpTooltipProps {
		content: string;
		title?: string;
		position?: 'top' | 'bottom' | 'left' | 'right';
		trigger?: 'hover' | 'click';
	}

	let { content, title, position = 'top', trigger = 'hover' }: HelpTooltipProps = $props();

	let isVisible = $state(false);
	let buttonRef: HTMLButtonElement | null = $state(null);

	function show() {
		isVisible = true;
	}

	function hide() {
		isVisible = false;
	}

	function toggle() {
		isVisible = !isVisible;
	}

	function handleClick() {
		if (trigger === 'click') {
			toggle();
		}
	}

	function handleMouseEnter() {
		if (trigger === 'hover') {
			show();
		}
	}

	function handleMouseLeave() {
		if (trigger === 'hover') {
			hide();
		}
	}

	// Close on Escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isVisible) {
			hide();
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});
</script>

<div class="help-tooltip-container">
	<button
		bind:this={buttonRef}
		class="help-button"
		onclick={handleClick}
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
		aria-label="Help information"
		aria-expanded={isVisible}
		type="button"
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
			<circle cx="12" cy="12" r="10" stroke-width="2" />
			<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke-width="2" stroke-linecap="round" />
			<circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
		</svg>
	</button>

	{#if isVisible}
		<div class="tooltip tooltip-{position}" transition:fly={{ y: -10, duration: 200 }}>
			{#if title}
				<div class="tooltip-title">{title}</div>
			{/if}
			<div class="tooltip-content">{content}</div>
			<div class="tooltip-arrow"></div>
		</div>
	{/if}
</div>

<style>
	.help-tooltip-container {
		position: relative;
		display: inline-block;
	}

	.help-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		color: #6b7280;
		transition: all 0.2s ease;
	}

	.help-button:hover {
		color: #3b82f6;
		background: #eff6ff;
	}

	.help-button:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.tooltip {
		position: absolute;
		z-index: 1000;
		background: #1f2937;
		color: white;
		padding: 0.75rem;
		border-radius: 8px;
		font-size: 0.875rem;
		line-height: 1.4;
		max-width: 280px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
		pointer-events: none;
	}

	.tooltip-title {
		font-weight: 600;
		margin-bottom: 0.25rem;
		font-size: 0.9375rem;
	}

	.tooltip-content {
		color: #e5e7eb;
	}

	.tooltip-arrow {
		position: absolute;
		width: 0;
		height: 0;
		border-style: solid;
	}

	/* Position: top */
	.tooltip-top {
		bottom: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip-top .tooltip-arrow {
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border-width: 6px 6px 0 6px;
		border-color: #1f2937 transparent transparent transparent;
	}

	/* Position: bottom */
	.tooltip-bottom {
		top: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip-bottom .tooltip-arrow {
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		border-width: 0 6px 6px 6px;
		border-color: transparent transparent #1f2937 transparent;
	}

	/* Position: left */
	.tooltip-left {
		right: calc(100% + 8px);
		top: 50%;
		transform: translateY(-50%);
	}

	.tooltip-left .tooltip-arrow {
		left: 100%;
		top: 50%;
		transform: translateY(-50%);
		border-width: 6px 0 6px 6px;
		border-color: transparent transparent transparent #1f2937;
	}

	/* Position: right */
	.tooltip-right {
		left: calc(100% + 8px);
		top: 50%;
		transform: translateY(-50%);
	}

	.tooltip-right .tooltip-arrow {
		right: 100%;
		top: 50%;
		transform: translateY(-50%);
		border-width: 6px 6px 6px 0;
		border-color: transparent #1f2937 transparent transparent;
	}

	/* Mobile adjustments */
	@media (max-width: 768px) {
		.tooltip {
			max-width: 240px;
			font-size: 0.8125rem;
		}
	}
</style>
