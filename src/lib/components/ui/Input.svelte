<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface InputProps extends Omit<HTMLInputAttributes, 'size'> {
		label?: string;
		error?: string;
		hint?: string;
		required?: boolean;
		variant?: 'default' | 'error' | 'success';
		size?: 'sm' | 'md' | 'lg';
	}

	let {
		label,
		error,
		hint,
		required = false,
		variant = 'default',
		size = 'md',
		id,
		class: className = '',
		value = $bindable(),
		...restProps
	}: InputProps = $props();

	// Generate unique ID if not provided
	const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

	// Determine variant based on error state
	const computedVariant = $derived(error ? 'error' : variant);
</script>

<div class="input-group {className}">
	{#if label}
		<label for={inputId} class="input-label" class:required>
			{label}
			{#if required}
				<span class="required-indicator" aria-label="required">*</span>
			{/if}
		</label>
	{/if}

	<input
		{id}
		class="input input-{computedVariant} input-{size}"
		bind:value
		aria-invalid={error ? 'true' : 'false'}
		aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
		{...restProps}
	/>

	{#if error}
		<div id="{inputId}-error" class="input-error" role="alert">
			{error}
		</div>
	{:else if hint}
		<div id="{inputId}-hint" class="input-hint">
			{hint}
		</div>
	{/if}
</div>

<style>
	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.input-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.input-label.required {
		color: #374151;
	}

	.required-indicator {
		color: #ef4444;
		font-weight: 600;
	}

	.input {
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background-color: white;
		font-size: 0.875rem;
		transition: all 0.2s ease;
		font-family: inherit;
	}

	.input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.input:disabled {
		background-color: #f9fafb;
		color: #6b7280;
		cursor: not-allowed;
	}

	.input::placeholder {
		color: #9ca3af;
	}

	/* Sizes */
	.input-sm {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
	}

	.input-md {
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
	}

	.input-lg {
		padding: 0.75rem 1rem;
		font-size: 1rem;
	}

	/* Variants */
	.input-default {
		border-color: #d1d5db;
	}

	.input-error {
		border-color: #ef4444;
	}

	.input-error:focus {
		border-color: #ef4444;
		box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
	}

	.input-success {
		border-color: #10b981;
	}

	.input-success:focus {
		border-color: #10b981;
		box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
	}

	.input-error {
		font-size: 0.75rem;
		color: #ef4444;
		margin-top: 0.25rem;
	}

	.input-hint {
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}

	/* High contrast focus for accessibility */
	.input:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 1px;
	}
</style>