<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	interface ButtonProps {
		variant?: 'primary' | 'secondary' | 'outline' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		loading?: boolean;
		icon?: boolean;
		disabled?: boolean;
		children?: Snippet;
		class?: string;
		onclick?: (event: MouseEvent) => void;
		type?: 'button' | 'submit' | 'reset';
	}

	let {
		variant = 'primary',
		size = 'md',
		loading = false,
		icon = false,
		disabled = false,
		children,
		class: className = '',
		onclick,
		type = 'button'
	}: ButtonProps = $props();

	let isDisabled = $derived(disabled || loading);
	let buttonElement: HTMLButtonElement;

	onMount(() => {
		console.log('[Button] onMount - onclick:', !!onclick, 'buttonElement:', !!buttonElement);
		if (onclick && buttonElement) {
			console.log('[Button] Adding click listener');
			buttonElement.addEventListener('click', (e) => {
				console.log('[Button] Click event fired!');
				if (!isDisabled) {
					console.log('[Button] Calling onclick handler');
					onclick(e);
				} else {
					console.log('[Button] Button is disabled, not calling onclick');
				}
			});
		} else {
			console.log('[Button] Not adding listener - onclick:', !!onclick, 'buttonElement:', !!buttonElement);
		}
	});
</script>

<button
	bind:this={buttonElement}
	type={type}
	class="btn btn-{variant} btn-{size} {className}"
	class:btn-loading={loading}
	class:btn-icon={icon}
	disabled={isDisabled}
>
	{#if loading}
		<span class="btn-spinner" aria-hidden="true"></span>
	{/if}
	{@render children?.()}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		border: none;
		border-radius: 0.375rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		text-decoration: none;
		font-family: inherit;
		line-height: 1;
		white-space: nowrap;
		position: relative;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}

	.btn:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	/* Sizes */
	.btn-sm {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
	}

	.btn-md {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	.btn-lg {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
	}

	.btn-icon {
		padding: 0.5rem;
		aspect-ratio: 1;
	}

	.btn-icon.btn-sm {
		padding: 0.375rem;
	}

	.btn-icon.btn-lg {
		padding: 0.75rem;
	}

	/* Variants */
	.btn-primary {
		background-color: var(--color-primary);
		color: var(--color-primary-text);
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--color-primary-hover);
	}

	.btn-primary:active:not(:disabled) {
		background-color: var(--color-primary-active);
	}

	.btn-secondary {
		background-color: var(--color-secondary);
		color: var(--color-secondary-text);
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: var(--color-secondary-hover);
	}

	.btn-secondary:active:not(:disabled) {
		background-color: var(--color-secondary-active);
	}

	.btn-outline {
		background-color: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-primary);
	}

	.btn-outline:hover:not(:disabled) {
		background-color: var(--color-surface-secondary);
		border-color: var(--color-border-secondary);
	}

	.btn-outline:active:not(:disabled) {
		background-color: var(--color-surface-tertiary);
	}

	.btn-danger {
		background-color: var(--color-danger);
		color: var(--color-danger-text);
	}

	.btn-danger:hover:not(:disabled) {
		background-color: var(--color-danger-hover);
	}

	.btn-danger:active:not(:disabled) {
		background-color: var(--color-danger-active);
	}

	/* Loading state */
	.btn-loading {
		color: transparent;
	}

	.btn-spinner {
		position: absolute;
		width: 1rem;
		height: 1rem;
		border: 2px solid currentColor;
		border-top: 2px solid transparent;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.btn-loading .btn-spinner {
		color: currentColor;
	}

	.btn-primary.btn-loading .btn-spinner {
		color: white;
	}

	.btn-secondary.btn-loading .btn-spinner {
		color: white;
	}

	.btn-danger.btn-loading .btn-spinner {
		color: white;
	}

	.btn-outline.btn-loading .btn-spinner {
		color: #374151;
	}
</style>