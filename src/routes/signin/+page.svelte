<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let loading = false;
	let eventCode = '';
	let showEventCodeInput = false;
	let eventCodeError = '';

	// Email/Password login state
	let email = '';
	let password = '';
	let loginError = '';

	const handleEmailPasswordSignIn = async () => {
		if (!email.trim() || !password.trim()) {
			loginError = 'Please enter both email and password';
			return;
		}

		loading = true;
		loginError = '';

		try {
			// Use redirect: false to get the result and handle redirect manually
			const result = await signIn('credentials', {
				email: email.trim(),
				password,
				redirect: false,
				callbackUrl: $page.url.searchParams.get('callbackUrl') || '/'
			});

			console.log('SignIn result:', result);

			// Check if signin was successful
			if (result?.error) {
				console.error('SignIn error:', result.error);
				loginError = 'Invalid email or password. Please try again.';
				loading = false;
			} else {
				// Signin successful, manually redirect
				const redirectUrl = $page.url.searchParams.get('callbackUrl') || '/';
				console.log('Redirecting to:', redirectUrl);
				goto(redirectUrl);
			}
		} catch (error) {
			console.error('Sign in exception:', error);
			loginError = 'An error occurred. Please try again.';
			loading = false;
		}
	};

	const handleGoogleSignIn = async () => {
		loading = true;
		try {
			await signIn('google', {
				callbackUrl: $page.url.searchParams.get('callbackUrl') || '/'
			});
		} catch (error) {
			console.error('Sign in error:', error);
			loading = false;
		}
	};

	const handleGuestSignIn = () => {
		showEventCodeInput = true;
	};

	const handleJoinEvent = async () => {
		if (!eventCode.trim()) {
			eventCodeError = 'Please enter an event code';
			return;
		}

		loading = true;
		eventCodeError = '';

		try {
			// Fetch event by access code
			const response = await fetch(`/api/events?accessCode=${encodeURIComponent(eventCode.trim())}`);
			const data = await response.json();

			if (!data.success || !data.event) {
				eventCodeError = 'Invalid event code. Please check and try again.';
				loading = false;
				return;
			}

			// Redirect to event page using slug
			const eventSlug = data.event.slug || data.event.id;
			goto(`/events/${eventSlug}/join?guest=true`);
		} catch (error) {
			console.error('Event lookup error:', error);
			eventCodeError = 'Failed to join event. Please try again.';
			loading = false;
		}
	};
</script>

<svelte:head>
	<title>Sign In - UnConf</title>
</svelte:head>

<div class="signin-container">
	<div class="signin-card">
		<h1>Sign In to UnConf</h1>
		<p class="subtitle">Join the unconference experience</p>

		<div class="signin-options">
			{#if !showEventCodeInput}
				<!-- Email/Password Login Form -->
				<form onsubmit={(e) => { e.preventDefault(); handleEmailPasswordSignIn(); }} class="email-password-form">
					<input
						type="email"
						name="email"
						bind:value={email}
						placeholder="Email"
						class="form-input"
						class:error={loginError}
						disabled={loading}
						required
					/>

					<input
						type="password"
						name="password"
						bind:value={password}
						placeholder="Password"
						class="form-input"
						class:error={loginError}
						disabled={loading}
						required
					/>

					{#if loginError}
						<p class="error-message">{loginError}</p>
					{/if}

					<button
						type="submit"
						disabled={loading || !email.trim() || !password.trim()}
						class="signin-button primary full-width"
					>
						{loading ? 'Signing in...' : 'Sign In'}
					</button>
				</form>

				<div class="divider">
					<span>or</span>
				</div>

				<button
					onclick={handleGoogleSignIn}
					disabled={loading}
					class="signin-button google"
				>
					{#if loading}
						Signing in...
					{:else}
						<svg width="20" height="20" viewBox="0 0 24 24" class="google-icon">
							<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
							<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
							<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
							<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
						</svg>
						Continue with Google
					{/if}
				</button>

				<div class="divider">
					<span>or</span>
				</div>

				<button
					onclick={handleGuestSignIn}
					disabled={loading}
					class="signin-button guest"
				>
					Join Event as Guest
				</button>
			{:else}
				<div class="event-code-form">
					<h3>Join Event Anonymously</h3>
					<p class="form-description">Enter the event code provided by your organizer</p>

					<input
						type="text"
						bind:value={eventCode}
						placeholder="Enter event code (e.g., ABC-123)"
						class="event-code-input"
						class:error={eventCodeError}
						disabled={loading}
					/>

					{#if eventCodeError}
						<p class="error-message">{eventCodeError}</p>
					{/if}

					<div class="form-actions">
						<button
							onclick={handleJoinEvent}
							disabled={loading || !eventCode.trim()}
							class="signin-button primary"
						>
							{loading ? 'Joining...' : 'Join Event'}
						</button>

						<button
							onclick={() => { showEventCodeInput = false; eventCodeError = ''; }}
							disabled={loading}
							class="signin-button secondary"
						>
							Back
						</button>
					</div>
				</div>
			{/if}
		</div>

		<p class="terms">
			By signing in, you agree to our Terms of Service and Privacy Policy.
		</p>

		<div class="help-links">
			<a href="/auth/recovery" class="recovery-link">
				Need help accessing your account?
			</a>
		</div>
	</div>
</div>

<style>
	.signin-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 70vh;
		padding: 2rem;
	}

	.signin-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		padding: 3rem;
		width: 100%;
		max-width: 400px;
		text-align: center;
	}

	h1 {
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
		color: #e4e4e7;
	}

	.subtitle {
		color: #a1a1aa;
		margin: 0 0 2rem 0;
	}

	.signin-options {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.signin-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.05);
		color: #e4e4e7;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
	}

	.signin-button:hover:not(:disabled) {
		border-color: rgba(255, 255, 255, 0.25);
		background: rgba(255, 255, 255, 0.1);
	}

	.signin-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.signin-button.google {
		border-color: rgba(66, 133, 244, 0.5);
		color: #60a5fa;
	}

	.signin-button.google:hover:not(:disabled) {
		background: rgba(66, 133, 244, 0.15);
		border-color: #4285F4;
	}

	.signin-button.guest {
		border-color: rgba(255, 255, 255, 0.15);
		color: #a1a1aa;
	}

	.signin-button.guest:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		color: #e4e4e7;
	}

	.google-icon {
		flex-shrink: 0;
	}

	.divider {
		display: flex;
		align-items: center;
		margin: 0.5rem 0;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: rgba(255, 255, 255, 0.1);
	}

	.divider span {
		padding: 0 1rem;
		color: #71717a;
		font-size: 0.9rem;
	}

	.terms {
		font-size: 0.8rem;
		color: #71717a;
		margin: 0;
	}

	.help-links {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.recovery-link {
		color: #60a5fa;
		text-decoration: none;
		font-size: 0.9rem;
	}

	.recovery-link:hover {
		text-decoration: underline;
	}

	.event-code-form {
		text-align: center;
	}

	.event-code-form h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		color: #e4e4e7;
	}

	.form-description {
		color: #a1a1aa;
		font-size: 0.9rem;
		margin: 0 0 1.5rem 0;
	}

	.event-code-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 6px;
		font-size: 1rem;
		text-align: center;
		text-transform: uppercase;
		margin-bottom: 1rem;
		background: rgba(255, 255, 255, 0.05);
		color: #e4e4e7;
	}

	.event-code-input::placeholder {
		color: #71717a;
	}

	.event-code-input:focus {
		outline: none;
		border-color: #6366f1;
		background: rgba(99, 102, 241, 0.1);
	}

	.event-code-input.error {
		border-color: #f87171;
	}

	.error-message {
		color: #fca5a5;
		font-size: 0.875rem;
		margin: 0 0 1rem 0;
	}

	.form-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.signin-button.primary {
		background: #6366f1;
		color: white;
		border-color: #6366f1;
	}

	.signin-button.primary:hover:not(:disabled) {
		background: #4f46e5;
		border-color: #4f46e5;
	}

	.signin-button.primary:disabled {
		background: rgba(99, 102, 241, 0.4);
		border-color: rgba(99, 102, 241, 0.4);
	}

	.signin-button.secondary {
		background: rgba(255, 255, 255, 0.05);
		color: #a1a1aa;
		border-color: rgba(255, 255, 255, 0.15);
	}

	.signin-button.secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		color: #e4e4e7;
	}

	.email-password-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.form-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 6px;
		font-size: 1rem;
		box-sizing: border-box;
		background: rgba(255, 255, 255, 0.05);
		color: #e4e4e7;
	}

	.form-input::placeholder {
		color: #71717a;
	}

	.form-input:focus {
		outline: none;
		border-color: #6366f1;
		background: rgba(99, 102, 241, 0.1);
	}

	.form-input.error {
		border-color: #f87171;
	}

	.signin-button.full-width {
		width: 100%;
	}
</style>