<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import Tooltip from './Tooltip.svelte';

	interface FormTextareaProps extends HTMLTextareaAttributes {
		label: string;
		error?: string;
		helpText?: string;
		tooltip?: string;
		characterCount?: { current: number; max: number };
		icon?: string;
	}

	let {
		label,
		error = '',
		helpText = '',
		tooltip = '',
		characterCount,
		icon = '',
		id,
		class: className = '',
		...restProps
	}: FormTextareaProps = $props();

	let inputId = $derived(id || `textarea-${label.toLowerCase().replace(/\s+/g, '-')}`);
	let showError = $derived(!!error);
	let isNearLimit = $derived(
		characterCount ? characterCount.current / characterCount.max > 0.8 : false
	);
</script>

<div class="form-textarea-wrapper {className}">
	<div class="form-textarea-header">
		<label for={inputId} class="form-textarea-label">
			{#if icon}
				<span class="label-icon">{icon}</span>
			{/if}
			<span>{label}</span>
			{#if restProps.required}
				<span class="required-indicator">*</span>
			{/if}
		</label>

		<div class="header-controls">
			{#if characterCount}
				<span class="char-count" class:near-limit={isNearLimit} class:error={showError}>
					{characterCount.current}/{characterCount.max}
				</span>
			{/if}
			{#if tooltip}
				<Tooltip content={tooltip} />
			{/if}
		</div>
	</div>

	<textarea
		{id}
		class="form-textarea"
		class:has-icon={!!icon}
		class:has-error={showError}
		{...restProps}
	></textarea>

	{#if helpText && !showError}
		<p class="help-text">{helpText}</p>
	{/if}

	{#if showError}
		<p class="error-text">{error}</p>
	{/if}
</div>

<style>
	.form-textarea-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
	}

	.form-textarea-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-2);
	}

	.form-textarea-label {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
	}

	.label-icon {
		font-size: 1.125rem;
	}

	.required-indicator {
		color: var(--color-danger);
	}

	.header-controls {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
	}

	.char-count {
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}

	.char-count.near-limit {
		color: var(--color-warning);
		font-weight: var(--font-weight-medium);
	}

	.char-count.error {
		color: var(--color-danger);
	}

	.form-textarea {
		width: 100%;
		padding: var(--spacing-3) var(--spacing-4);
		font-size: var(--font-size-base);
		font-family: inherit;
		color: var(--color-text-primary);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		transition: all var(--transition-fast);
		resize: vertical;
		min-height: 120px;
	}

	.form-textarea:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px var(--color-focus-outline);
	}

	.form-textarea:disabled {
		background: var(--color-surface-secondary);
		color: var(--color-text-disabled);
		cursor: not-allowed;
		resize: none;
	}

	.form-textarea.has-error {
		border-color: var(--color-danger);
	}

	.form-textarea.has-error:focus {
		box-shadow: 0 0 0 3px var(--color-danger-light);
	}

	.help-text {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
		line-height: var(--line-height-normal);
	}

	.error-text {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--color-danger);
		font-weight: var(--font-weight-medium);
		display: flex;
		align-items: center;
		gap: var(--spacing-1);
	}

	.error-text::before {
		content: '⚠';
		font-size: var(--font-size-sm);
	}
</style>
