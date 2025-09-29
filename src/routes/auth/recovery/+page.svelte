<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let loading = $state(false);
	let step: 'input' | 'success' | 'error' = $state('input');
	let message = $state('');
	let email = $state('');

	// Check if we have any URL parameters that might indicate the recovery type
	let recoveryType = $derived($page.url.searchParams.get('type') || 'auto');
	let sessionId = $derived($page.url.searchParams.get('session') || '');

	const handleRecovery = async () => {
		if (!email && !sessionId) {
			step = 'error';
			message = 'Please provide an email address.';
			return;
		}

		loading = true;
		try {
			const response = await fetch('/api/auth/recovery', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: email || undefined,
					sessionId: sessionId || undefined,
					accountType: recoveryType === 'auto' ? undefined : recoveryType
				})
			});

			const data = await response.json();

			if (data.success) {
				step = 'success';
				message = data.message;
			} else {
				step = 'error';
				message = data.message || 'Account recovery failed. Please try again.';
			}
		} catch (error) {
			console.error('Recovery error:', error);
			step = 'error';
			message = 'An unexpected error occurred. Please try again.';
		} finally {
			loading = false;
		}
	};

	const handleBack = () => {
		step = 'input';
		message = '';
	};

	const goToSignIn = () => {
		goto('/auth/signin');
	};
</script>

<svelte:head>
	<title>Account Recovery - UnConf</title>
</svelte:head>

<div class="recovery-container">
	<div class="recovery-card">
		{#if step === 'input'}
			<h1>Account Recovery</h1>
			<p class="subtitle">Need help accessing your account?</p>

			<form onsubmit={handleRecovery}>
				<div class="form-group">
					<label for="email">Email Address</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						placeholder="Enter your email address"
						required={!sessionId}
						disabled={loading || !!sessionId}
					/>
					{#if sessionId}
						<p class="session-info">
							Recovering guest session: <code>{sessionId}</code>
						</p>
					{/if}
				</div>

				<button type="submit" disabled={loading || (!email && !sessionId)} class="recovery-button">
					{#if loading}
						Sending Recovery Instructions...
					{:else}
						Send Recovery Instructions
					{/if}
				</button>
			</form>

			<div class="recovery-info">
				<h3>Recovery Options by Account Type:</h3>
				<ul>
					<li><strong>Google Accounts:</strong> Use Google's account recovery at accounts.google.com</li>
					<li><strong>Guest Accounts:</strong> Cannot be recovered (temporary sessions only)</li>
					<li><strong>Email Accounts:</strong> Recovery instructions will be sent to your email</li>
				</ul>
			</div>

		{:else if step === 'success'}
			<div class="success-state">
				<div class="success-icon">✅</div>
				<h2>Recovery Instructions Sent</h2>
				<p class="message">{message}</p>

				<div class="recovery-actions">
					<button onclick={goToSignIn} class="signin-button">
						Go to Sign In
					</button>
					<button onclick={handleBack} class="back-button">
						Try Different Email
					</button>
				</div>
			</div>

		{:else if step === 'error'}
			<div class="error-state">
				<div class="error-icon">⚠️</div>
				<h2>Recovery Information</h2>
				<p class="message">{message}</p>

				<div class="recovery-actions">
					<button onclick={handleBack} class="retry-button">
						Try Again
					</button>
					<button onclick={goToSignIn} class="signin-button">
						Back to Sign In
					</button>
				</div>
			</div>
		{/if}

		<div class="footer-links">
			<a href="/auth/signin">Back to Sign In</a>
			<span>•</span>
			<a href="/">Home</a>
		</div>
	</div>
</div>

<style>
	.recovery-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 80vh;
		padding: 2rem;
	}

	.recovery-card {
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		padding: 3rem;
		width: 100%;
		max-width: 500px;
		text-align: center;
	}

	h1, h2 {
		margin: 0 0 1rem 0;
		color: #333;
	}

	.subtitle {
		color: #666;
		margin: 0 0 2rem 0;
	}

	.form-group {
		margin-bottom: 1.5rem;
		text-align: left;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
	}

	input {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #ddd;
		border-radius: 6px;
		font-size: 1rem;
	}

	input:focus {
		outline: none;
		border-color: #007bff;
	}

	input:disabled {
		background: #f8f9fa;
		color: #6c757d;
	}

	.session-info {
		margin: 0.5rem 0 0 0;
		font-size: 0.9rem;
		color: #666;
	}

	.session-info code {
		background: #f8f9fa;
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		font-family: monospace;
		font-size: 0.8rem;
	}

	.recovery-button {
		width: 100%;
		padding: 0.75rem;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		cursor: pointer;
		transition: background-color 0.2s;
		margin-bottom: 2rem;
	}

	.recovery-button:hover:not(:disabled) {
		background: #0056b3;
	}

	.recovery-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.recovery-info {
		text-align: left;
		background: #f8f9fa;
		padding: 1.5rem;
		border-radius: 6px;
		border: 1px solid #dee2e6;
	}

	.recovery-info h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		color: #495057;
	}

	.recovery-info ul {
		margin: 0;
		padding-left: 1.2rem;
	}

	.recovery-info li {
		margin-bottom: 0.5rem;
		line-height: 1.4;
		font-size: 0.9rem;
		color: #6c757d;
	}

	.success-state, .error-state {
		text-align: center;
	}

	.success-icon, .error-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.message {
		color: #666;
		line-height: 1.5;
		margin: 0 0 2rem 0;
	}

	.recovery-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
		margin-bottom: 2rem;
	}

	.signin-button, .retry-button, .back-button {
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		text-decoration: none;
		font-weight: 500;
		transition: all 0.2s;
		border: none;
		cursor: pointer;
		font-size: 0.9rem;
	}

	.signin-button {
		background: #007bff;
		color: white;
	}

	.signin-button:hover {
		background: #0056b3;
	}

	.retry-button {
		background: #28a745;
		color: white;
	}

	.retry-button:hover {
		background: #1e7e34;
	}

	.back-button {
		background: #6c757d;
		color: white;
	}

	.back-button:hover {
		background: #545b62;
	}

	.footer-links {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid #dee2e6;
	}

	.footer-links a {
		color: #007bff;
		text-decoration: none;
		font-size: 0.9rem;
	}

	.footer-links a:hover {
		text-decoration: underline;
	}

	.footer-links span {
		color: #dee2e6;
	}
</style>