<script lang="ts">
	import { page } from '$app/stores';

	// Get error details from page store
	$: error = $page.error;
	$: status = $page.status;

	// Determine error message and description
	$: errorTitle = getErrorTitle(status);
	$: errorMessage = error?.message || 'An unexpected error occurred';

	function getErrorTitle(status: number): string {
		switch (status) {
			case 404:
				return 'Page Not Found';
			case 403:
				return 'Access Forbidden';
			case 401:
				return 'Unauthorized';
			case 500:
				return 'Server Error';
			default:
				return 'Error';
		}
	}

	function getErrorDescription(status: number): string {
		switch (status) {
			case 404:
				return 'The page you are looking for does not exist or has been moved.';
			case 403:
				return 'You do not have permission to access this resource.';
			case 401:
				return 'Please sign in to access this page.';
			case 500:
				return 'Something went wrong on our end. Please try again later.';
			default:
				return 'Please try again or contact support if the problem persists.';
		}
	}

	function handleGoHome() {
		window.location.href = '/';
	}

	function handleGoBack() {
		window.history.back();
	}
</script>

<svelte:head>
	<title>{status} - {errorTitle} - UnConf</title>
</svelte:head>

<div class="error-container">
	<div class="error-card">
		<div class="error-icon">
			{#if status === 404}
				<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<path d="M12 8v4M12 16h.01" />
				</svg>
			{:else if status === 403 || status === 401}
				<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
					<path d="M7 11V7a5 5 0 0 1 10 0v4" />
				</svg>
			{:else}
				<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
					<line x1="12" y1="9" x2="12" y2="13" />
					<line x1="12" y1="17" x2="12.01" y2="17" />
				</svg>
			{/if}
		</div>

		<h1 class="error-status">{status}</h1>
		<h2 class="error-title">{errorTitle}</h2>
		<p class="error-description">{getErrorDescription(status)}</p>

		{#if errorMessage && errorMessage !== getErrorDescription(status)}
			<p class="error-message">{errorMessage}</p>
		{/if}

		<div class="error-actions">
			<button onclick={handleGoHome} class="btn btn-primary">
				Go to Homepage
			</button>
			<button onclick={handleGoBack} class="btn btn-secondary">
				Go Back
			</button>
		</div>

		{#if status === 404}
			<div class="helpful-links">
				<p>Looking for something specific?</p>
				<div class="links">
					<a href="/">Home</a>
					<a href="/create">Create Event</a>
					<a href="/auth/signin">Sign In</a>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.error-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 80vh;
		padding: var(--spacing-8);
		background: linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-secondary-50) 100%);
	}

	.error-card {
		background: white;
		border-radius: 12px;
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
		padding: 3rem;
		max-width: 500px;
		width: 100%;
		text-align: center;
	}

	.error-icon {
		color: #ef4444;
		margin-bottom: 1.5rem;
		display: flex;
		justify-content: center;
	}

	.error-status {
		font-size: 4rem;
		font-weight: 800;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
		line-height: 1;
	}

	.error-title {
		font-size: 1.75rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 1rem 0;
	}

	.error-description {
		font-size: 1.125rem;
		color: #6b7280;
		margin: 0 0 1.5rem 0;
		line-height: 1.6;
	}

	.error-message {
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		padding: 1rem;
		margin: 0 0 2rem 0;
		color: #991b1b;
		font-size: 0.9rem;
	}

	.error-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		display: inline-block;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover {
		background: #2563eb;
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
	}

	.btn-secondary {
		background: #e5e7eb;
		color: #374151;
	}

	.btn-secondary:hover {
		background: #d1d5db;
		transform: translateY(-1px);
	}

	.helpful-links {
		padding-top: 2rem;
		border-top: 1px solid #e5e7eb;
	}

	.helpful-links p {
		color: #6b7280;
		margin: 0 0 1rem 0;
		font-size: 0.9rem;
	}

	.links {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.links a {
		color: #3b82f6;
		text-decoration: none;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		transition: background 0.2s;
	}

	.links a:hover {
		background: #eff6ff;
		text-decoration: underline;
	}

	@media (max-width: 640px) {
		.error-card {
			padding: 2rem 1.5rem;
		}

		.error-status {
			font-size: 3rem;
		}

		.error-title {
			font-size: 1.5rem;
		}

		.error-description {
			font-size: 1rem;
		}

		.error-actions {
			flex-direction: column;
		}

		.btn {
			width: 100%;
		}
	}
</style>
