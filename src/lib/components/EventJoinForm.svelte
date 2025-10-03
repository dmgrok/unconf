<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import QRScanner from './QRScanner.svelte';

	const dispatch = createEventDispatcher<{
		join: { code: string };
	}>();

	let accessCode = '';
	let showScanner = false;
	let isValidating = false;
	let error: string | null = null;

	// Validation pattern: alphanumeric, 6-12 characters
	const CODE_PATTERN = /^[A-Z0-9]{6,12}$/i;

	function validateCode(code: string): boolean {
		return CODE_PATTERN.test(code.trim());
	}

	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		// Auto-capitalize and filter non-alphanumeric
		accessCode = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
		error = null;
	}

	function handleSubmit(event: Event) {
		event.preventDefault();

		const trimmedCode = accessCode.trim();

		if (!trimmedCode) {
			error = 'Please enter an access code';
			return;
		}

		if (!validateCode(trimmedCode)) {
			error = 'Access code must be 6-12 alphanumeric characters';
			return;
		}

		isValidating = true;
		error = null;

		dispatch('join', { code: trimmedCode });

		// Reset validating state after a timeout (parent should handle success/failure)
		setTimeout(() => {
			isValidating = false;
		}, 3000);
	}

	function handleQRDetected(event: CustomEvent<{ code: string }>) {
		accessCode = event.detail.code;
		showScanner = false;
		error = null;

		// Auto-submit if code is valid
		if (validateCode(accessCode)) {
			dispatch('join', { code: accessCode });
		}
	}

	function toggleScanner() {
		showScanner = !showScanner;
		error = null;
	}

	function handleScanError(event: CustomEvent<{ error: string }>) {
		error = event.detail.error;
		showScanner = false;
	}

	function handleScanClose() {
		showScanner = false;
	}
</script>

<div class="event-join-form">
	<div class="form-header">
		<h2>Join an Event</h2>
		<p class="subtitle">Enter your access code or scan a QR code to join</p>
	</div>

	{#if error}
		<div class="error-message">
			⚠️ {error}
		</div>
	{/if}

	{#if !showScanner}
		<form on:submit={handleSubmit}>
			<div class="input-group">
				<label for="access-code">Access Code</label>
				<input
					id="access-code"
					type="text"
					class="code-input"
					bind:value={accessCode}
					on:input={handleInput}
					placeholder="ABCD1234"
					maxlength="12"
					disabled={isValidating}
					autocomplete="off"
					spellcheck="false"
					aria-label="Event access code"
				/>
				<div class="input-hint">
					Enter the 6-12 character code provided by your event organizer
				</div>
			</div>

			<div class="button-group">
				<button
					type="submit"
					class="btn btn-primary"
					disabled={!accessCode.trim() || isValidating}
				>
					{#if isValidating}
						<span class="spinner"></span>
						Joining...
					{:else}
						Join Event
					{/if}
				</button>

				<button
					type="button"
					class="btn btn-secondary"
					on:click={toggleScanner}
					disabled={isValidating}
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
						<rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
						<rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
						<rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
					</svg>
					Scan QR Code
				</button>
			</div>
		</form>
	{:else}
		<QRScanner
			on:detected={handleQRDetected}
			on:error={handleScanError}
			on:close={handleScanClose}
		/>
	{/if}
</div>

<style>
	.event-join-form {
		width: 100%;
		max-width: 500px;
		margin: 0 auto;
		padding: 2rem;
		background: var(--color-background, #ffffff);
		border-radius: 0.75rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.form-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.form-header h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.875rem;
		font-weight: 700;
		color: var(--color-text-primary, #1f2937);
	}

	.subtitle {
		margin: 0;
		color: var(--color-text-secondary, #6b7280);
		font-size: 0.875rem;
	}

	.error-message {
		margin-bottom: 1.5rem;
		padding: 0.75rem 1rem;
		background: var(--color-error-light, #fee2e2);
		color: var(--color-error-dark, #991b1b);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		animation: slideIn 0.3s ease-out;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.input-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary, #1f2937);
	}

	.code-input {
		width: 100%;
		padding: 0.875rem 1rem;
		font-size: 1.125rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-align: center;
		text-transform: uppercase;
		border: 2px solid var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		background: var(--color-background, #ffffff);
		color: var(--color-text-primary, #1f2937);
		transition: all 0.2s;
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Consolas', monospace;
	}

	.code-input:focus {
		outline: none;
		border-color: var(--color-primary, #3b82f6);
		box-shadow: 0 0 0 3px var(--color-primary-light, #dbeafe);
	}

	.code-input:disabled {
		background: var(--color-gray-100, #f3f4f6);
		color: var(--color-text-secondary, #6b7280);
		cursor: not-allowed;
	}

	.input-hint {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: var(--color-text-secondary, #6b7280);
		text-align: center;
	}

	.button-group {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.btn-primary {
		color: white;
		background: var(--color-primary, #3b82f6);
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-primary-dark, #2563eb);
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.btn-primary:active:not(:disabled) {
		transform: translateY(0);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.btn-secondary {
		color: var(--color-primary, #3b82f6);
		background: var(--color-primary-light, #dbeafe);
		border: 1px solid var(--color-primary, #3b82f6);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--color-primary, #3b82f6);
		color: white;
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.btn-secondary:active:not(:disabled) {
		transform: translateY(0);
	}

	.spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: white;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 640px) {
		.event-join-form {
			padding: 1.5rem;
			border-radius: 0.5rem;
		}

		.form-header h2 {
			font-size: 1.5rem;
		}

		.code-input {
			font-size: 1rem;
		}
	}
</style>
