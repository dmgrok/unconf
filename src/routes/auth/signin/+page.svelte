<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import { page } from '$app/stores';

	let loading = false;

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

	const handleGuestSignIn = async () => {
		loading = true;
		try {
			await signIn('guest', {
				callbackUrl: $page.url.searchParams.get('callbackUrl') || '/'
			});
		} catch (error) {
			console.error('Guest sign in error:', error);
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
				Continue as Guest
			</button>
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
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		padding: 3rem;
		width: 100%;
		max-width: 400px;
		text-align: center;
	}

	h1 {
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
		color: #333;
	}

	.subtitle {
		color: #666;
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
		border: 2px solid #ddd;
		border-radius: 6px;
		background: white;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
	}

	.signin-button:hover:not(:disabled) {
		border-color: #bbb;
		background: #f8f9fa;
	}

	.signin-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.signin-button.google {
		border-color: #4285F4;
		color: #4285F4;
	}

	.signin-button.google:hover:not(:disabled) {
		background: #4285F4;
		color: white;
	}

	.signin-button.guest {
		border-color: #6c757d;
		color: #6c757d;
	}

	.signin-button.guest:hover:not(:disabled) {
		background: #6c757d;
		color: white;
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
		background: #ddd;
	}

	.divider span {
		padding: 0 1rem;
		color: #666;
		font-size: 0.9rem;
	}

	.terms {
		font-size: 0.8rem;
		color: #666;
		margin: 0;
	}

	.help-links {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #eee;
	}

	.recovery-link {
		color: #007bff;
		text-decoration: none;
		font-size: 0.9rem;
	}

	.recovery-link:hover {
		text-decoration: underline;
	}
</style>