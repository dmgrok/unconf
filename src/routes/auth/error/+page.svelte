<script lang="ts">
	import { page } from '$app/stores';

	let error = $derived($page.url.searchParams.get('error'));
	let errorMessage = $derived(() => {
		switch (error) {
			case 'Configuration':
				return 'There is a configuration issue with the authentication system.';
			case 'AccessDenied':
				return 'Access was denied. You may not have permission to sign in.';
			case 'Verification':
				return 'The verification token has expired or is invalid.';
			case 'Default':
			default:
				return 'An error occurred during authentication. Please try again.';
		}
	});
</script>

<svelte:head>
	<title>Authentication Error - UnConf</title>
</svelte:head>

<div class="error-container">
	<div class="error-card">
		<div class="error-icon">⚠️</div>
		<h1>Authentication Error</h1>
		<p class="error-message">{errorMessage()}</p>

		<div class="error-actions">
			<a href="/auth/signin" class="retry-button">
				Try Again
			</a>
			<a href="/" class="home-button">
				Go Home
			</a>
		</div>

		{#if error}
			<details class="error-details">
				<summary>Technical Details</summary>
				<p>Error Code: {error}</p>
			</details>
		{/if}
	</div>
</div>

<style>
	.error-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 70vh;
		padding: 2rem;
	}

	.error-card {
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		padding: 3rem;
		width: 100%;
		max-width: 500px;
		text-align: center;
	}

	.error-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	h1 {
		margin: 0 0 1rem 0;
		font-size: 2rem;
		color: #dc3545;
	}

	.error-message {
		color: #666;
		margin: 0 0 2rem 0;
		line-height: 1.5;
	}

	.error-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 2rem;
	}

	.retry-button,
	.home-button {
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		text-decoration: none;
		font-weight: 500;
		transition: all 0.2s;
	}

	.retry-button {
		background: #007bff;
		color: white;
	}

	.retry-button:hover {
		background: #0056b3;
	}

	.home-button {
		background: #6c757d;
		color: white;
	}

	.home-button:hover {
		background: #545b62;
	}

	.error-details {
		text-align: left;
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 4px;
		border: 1px solid #ddd;
	}

	.error-details summary {
		cursor: pointer;
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.error-details p {
		margin: 0;
		font-family: monospace;
		font-size: 0.9rem;
		color: #666;
	}
</style>