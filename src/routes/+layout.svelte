<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { signIn, signOut } from '@auth/sveltekit/client';
	import { auth, user, isAuthenticated, isGuest } from '$lib/stores/auth';
	import { sessionManager, sessionUtils } from '$lib/auth/session';
	import { dev } from '$app/environment';
	import { onMount } from 'svelte';
	import { waitLocale } from '$lib/i18n';
	import { initializeLocale } from '$lib/utils/locale-persistence';
	import '$lib/i18n'; // Initialize i18n
	import '$lib/styles/responsive.css'; // Mobile-responsive styles
	import '$lib/styles/touch.css'; // Touch-optimized interactions

	// Dynamic imports for non-critical components
	let SecurityMonitor: any;
	let DeveloperBanner: any;
	let LanguageSwitcher: any;
	let WebVitalsMonitor: any;

	let { children, data } = $props();

	// Initialize auth state when session data changes
	$effect(() => {
		auth.initialize(data.session);

		// Save session to browser storage if authenticated
		if ($user) {
			sessionManager.saveSession($user);
		}
	});

	// Auto-refresh session monitoring and i18n initialization
	onMount(async () => {
		// Initialize locale from saved preference or browser settings
		initializeLocale();

		// Wait for locale to be loaded
		await waitLocale();

		// Dynamically import non-critical components
		const [securityMonitorModule, languageSwitcherModule, developerBannerModule, webVitalsModule] = await Promise.all([
			import('$lib/components/SecurityMonitor.svelte'),
			import('$lib/components/LanguageSwitcher.svelte'),
			dev ? import('../components/DeveloperBanner.svelte') : Promise.resolve({ default: null }),
			import('$lib/components/WebVitalsMonitor.svelte')
		]);

		SecurityMonitor = securityMonitorModule.default;
		LanguageSwitcher = languageSwitcherModule.default;
		WebVitalsMonitor = webVitalsModule.default;
		if (dev) {
			DeveloperBanner = developerBannerModule.default;
		}

		const intervalId = sessionUtils.startSessionMonitoring((session) => {
			if (!session) {
				// Session expired, clear auth state
				auth.clear();
			}
		});

		return () => {
			if (intervalId) {
				sessionUtils.stopSessionMonitoring(intervalId);
			}
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Developer Banner (only shown in development) -->
{#if dev && data.demoEvent && DeveloperBanner}
	<svelte:component this={DeveloperBanner} demoEvent={data.demoEvent} />
{/if}

<nav class="navbar" class:with-dev-banner={dev && data.demoEvent}>
	<div class="nav-container">
		<a href="/" class="nav-brand">UnConf</a>

		<div class="nav-auth">
			{#if LanguageSwitcher}
				<svelte:component this={LanguageSwitcher} />
			{/if}
			{#if $isAuthenticated && $user}
				<span class="user-info">
					Hello, {$user.name || $user.email || 'User'}!
					{#if $isGuest}
						<span class="guest-badge">Guest</span>
					{/if}
				</span>
				<button onclick={() => signOut()} class="auth-button">
					Sign Out
				</button>
			{:else}
				<button onclick={() => signIn('google')} class="auth-button">
					Sign In with Google
				</button>
				<button onclick={() => signIn('guest')} class="auth-button guest">
					Continue as Guest
				</button>
			{/if}
		</div>
	</div>
</nav>

<main>
	{@render children?.()}
</main>

<!-- Security monitoring component (lazy loaded) -->
{#if SecurityMonitor}
	<svelte:component this={SecurityMonitor} showWarnings={true} autoLogout={false} warningThreshold={5} />
{/if}

<!-- Web Vitals monitoring (lazy loaded) -->
{#if WebVitalsMonitor}
	<svelte:component this={WebVitalsMonitor} showInProduction={false} sendToAnalytics={true} />
{/if}

<style>
	.navbar {
		background: #f8f9fa;
		border-bottom: 1px solid #dee2e6;
		padding: 0.5rem 0;
		position: sticky;
		top: 0;
		z-index: 50;
	}

	.navbar.with-dev-banner {
		margin-top: 0; /* Developer banner will push navbar down naturally */
	}

	.nav-container {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 1rem;
		gap: 1rem;
	}

	.nav-brand {
		font-size: 1.5rem;
		font-weight: bold;
		text-decoration: none;
		color: #333;
		white-space: nowrap;
	}

	/* Mobile: Smaller brand */
	@media (max-width: 767px) {
		.nav-brand {
			font-size: 1.25rem;
		}
	}

	.nav-auth {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	/* Mobile: Stack auth buttons vertically when needed */
	@media (max-width: 640px) {
		.nav-auth {
			gap: 0.25rem;
		}
	}

	.user-info {
		color: #666;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
	}

	/* Mobile: Hide user info text, keep badge */
	@media (max-width: 640px) {
		.user-info {
			font-size: 0;
		}

		.guest-badge {
			font-size: 0.7rem;
		}
	}

	.guest-badge {
		background: #ffc107;
		color: #212529;
		padding: 0.2rem 0.5rem;
		border-radius: 12px;
		font-size: 0.7rem;
		font-weight: bold;
		text-transform: uppercase;
	}

	.auth-button {
		padding: 0.5rem 1rem;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		text-decoration: none;
		font-size: 0.9rem;
		white-space: nowrap;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s ease, transform 0.1s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.auth-button:hover {
		background: #0056b3;
	}

	.auth-button:active {
		transform: scale(0.97);
	}

	/* Mobile: Smaller buttons */
	@media (max-width: 640px) {
		.auth-button {
			padding: 0.5rem 0.75rem;
			font-size: 0.85rem;
		}
	}

	.auth-button.guest {
		background: #6c757d;
	}

	.auth-button.guest:hover {
		background: #545b62;
	}

	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
		min-height: calc(100vh - 200px);
	}

	/* Mobile: Reduced padding */
	@media (max-width: 767px) {
		main {
			padding: 1rem 0.75rem;
		}
	}

	/* Ensure content is visible above bottom nav on mobile */
	@media (max-width: 767px) {
		main {
			padding-bottom: calc(80px + env(safe-area-inset-bottom));
		}
	}
</style>
