<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let disabled = false;
	export let placeholder = 'Enter a word...';
	export let nextLetter: string | null = null;

	const dispatch = createEventDispatcher<{ submit: { word: string } }>();

	let inputValue = '';
	let validationMessage = '';
	let isValid = true;

	// Validate input as user types
	$: {
		if (inputValue.trim().length === 0) {
			validationMessage = '';
			isValid = true;
		} else {
			validateInput(inputValue);
		}
	}

	function validateInput(word: string) {
		const trimmed = word.trim();

		// Check if word contains only letters
		if (!/^[a-zA-Z]+$/.test(trimmed)) {
			validationMessage = 'Only letters allowed';
			isValid = false;
			return;
		}

		// Check minimum length
		if (trimmed.length < 2) {
			validationMessage = 'Word must be at least 2 letters';
			isValid = false;
			return;
		}

		// Check maximum length
		if (trimmed.length > 20) {
			validationMessage = 'Word must be 20 letters or less';
			isValid = false;
			return;
		}

		// Check if starts with correct letter
		if (nextLetter && trimmed.charAt(0).toUpperCase() !== nextLetter) {
			validationMessage = `Must start with "${nextLetter}"`;
			isValid = false;
			return;
		}

		// All checks passed
		validationMessage = '';
		isValid = true;
	}

	function handleSubmit(event: Event) {
		event.preventDefault();

		const trimmed = inputValue.trim();

		if (!trimmed || !isValid || disabled) {
			return;
		}

		dispatch('submit', { word: trimmed });
		inputValue = '';
		validationMessage = '';
		isValid = true;
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter' && !disabled && isValid && inputValue.trim()) {
			handleSubmit(event);
		}
	}
</script>

<form class="submission-form" on:submit={handleSubmit}>
	<div class="input-wrapper">
		<input
			type="text"
			class="word-input"
			class:invalid={!isValid && inputValue.length > 0}
			class:valid={isValid && inputValue.length > 0}
			bind:value={inputValue}
			{disabled}
			{placeholder}
			on:keypress={handleKeyPress}
			autocomplete="off"
			spellcheck="false"
		/>

		<button
			type="submit"
			class="submit-btn"
			disabled={disabled || !isValid || !inputValue.trim()}
		>
			Submit
		</button>
	</div>

	{#if validationMessage}
		<div class="validation-feedback" class:error={!isValid}>
			{validationMessage}
		</div>
	{:else if inputValue.length > 0 && isValid}
		<div class="validation-feedback success">
			✓ Looks good!
		</div>
	{/if}
</form>

<style>
	.submission-form {
		width: 100%;
	}

	.input-wrapper {
		display: flex;
		gap: 0.5rem;
	}

	.word-input {
		flex: 1;
		padding: 0.75rem 1rem;
		font-size: 1.125rem;
		border: 2px solid var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		background: var(--color-background, #ffffff);
		color: var(--color-text-primary, #1f2937);
		transition: all 0.2s;
		font-weight: 600;
		letter-spacing: 0.025em;
		text-transform: lowercase;
	}

	.word-input:focus {
		outline: none;
		border-color: var(--color-primary, #3b82f6);
		box-shadow: 0 0 0 3px var(--color-primary-light, #dbeafe);
	}

	.word-input.invalid {
		border-color: var(--color-error, #dc2626);
	}

	.word-input.invalid:focus {
		box-shadow: 0 0 0 3px var(--color-error-light, #fee2e2);
	}

	.word-input.valid {
		border-color: var(--color-success, #059669);
	}

	.word-input.valid:focus {
		box-shadow: 0 0 0 3px var(--color-success-light, #d1fae5);
	}

	.word-input:disabled {
		background: var(--color-gray-100, #f3f4f6);
		color: var(--color-text-secondary, #6b7280);
		cursor: not-allowed;
	}

	.submit-btn {
		padding: 0.75rem 2rem;
		font-size: 1rem;
		font-weight: 600;
		color: white;
		background: var(--color-primary, #3b82f6);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.submit-btn:hover:not(:disabled) {
		background: var(--color-primary-dark, #2563eb);
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.submit-btn:active:not(:disabled) {
		transform: translateY(0);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.submit-btn:disabled {
		background: var(--color-gray-300, #d1d5db);
		cursor: not-allowed;
		opacity: 0.6;
	}

	.validation-feedback {
		margin-top: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-5px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.validation-feedback.error {
		background: var(--color-error-light, #fee2e2);
		color: var(--color-error-dark, #991b1b);
	}

	.validation-feedback.success {
		background: var(--color-success-light, #d1fae5);
		color: var(--color-success-dark, #065f46);
	}

	@media (max-width: 640px) {
		.input-wrapper {
			flex-direction: column;
		}

		.submit-btn {
			width: 100%;
		}
	}
</style>
