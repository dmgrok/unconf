<script lang="ts">
	import type { LayoutData } from './$types';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { signIn, signOut } from '@auth/sveltekit/client';
	import { auth, user, isAuthenticated, isGuest } from '$lib/stores/auth';
	import { sessionManager, sessionUtils } from '$lib/auth/session';
	import { dev, browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { waitLocale } from '$lib/i18n';
	import { initializeLocale } from '$lib/utils/locale-persistence';
	import { initGrowthBook, loadFeatures, updateUserAttributes, destroyGrowthBook } from '$lib/feature-flags';
	import { inject } from '@vercel/analytics';
	import { injectSpeedInsights } from '@vercel/speed-insights';
	import '$lib/i18n'; // Initialize i18n
	import '$lib/styles/app.css'; // Global design system
	import '$lib/styles/responsive.css'; // Mobile-responsive styles
	import '$lib/styles/touch.css'; // Touch-optimized interactions
	import Toast from '$lib/components/ui/Toast.svelte';

	// Initialize Vercel Analytics & Speed Insights (production only)
	if (browser && !dev) {
		inject({ mode: 'production' });
		injectSpeedInsights();
	}

	// Dynamic imports for non-critical components
	let SecurityMonitor = $state<any>(null);
	let DeveloperBanner = $state<any>(null);
	let LanguageSwitcher = $state<any>(null);
	let WebVitalsMonitor = $state<any>(null);

	let { children, data }: { children: any; data: LayoutData } = $props();
	let signingIn = $state(false);

	// Initialize auth state when session data changes
	$effect(() => {
		auth.initialize(data.session);

		// Save session to browser storage if authenticated
		if ($user) {
			sessionManager.saveSession($user);
		}
	});

	async function handleGuestSignIn() {
		signingIn = true;
		try {
			const fallbackSlug = data.demoEvent?.slug ?? data.demoEvent?.id ?? 'tech-innovation-unconference-2024';

			if (dev && fallbackSlug) {
				if (browser) {
					sessionStorage.removeItem('guestUser');
				}

				await goto(`/events/${fallbackSlug}`);
				return;
			}

			await signIn('guest');
		} catch (error) {
			console.warn('Guest sign in unavailable, enabling fallback:', error);
			const fallbackSlug = data.demoEvent?.slug ?? data.demoEvent?.id ?? 'tech-innovation-unconference-2024';
			if (fallbackSlug) {
				if (browser) {
					sessionStorage.removeItem('guestUser');
				}
				await goto(`/events/${fallbackSlug}`);
			}
		} finally {
			signingIn = false;
		}
	}

	async function handleGoogleSignIn() {
		signingIn = true;
		try {
			await signIn('google');
		} catch (error) {
			console.error('Google sign in error:', error);
			alert('Failed to sign in with Google. Please try again.');
			signingIn = false;
		}
	}

	async function handleSignOut() {
		try {
			await signOut();
		} catch (error) {
			console.error('Sign out error:', error);
			alert('Failed to sign out. Please try again.');
		}
	}

	// Auto-refresh session monitoring and i18n initialization
	onMount(() => {
		// Initialize and load components asynchronously
		(async () => {
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
		})();

		const intervalId = sessionUtils.startSessionMonitoring((session) => {
			if (!session) {
				// Session expired, clear auth state
				auth.clear();
			}
		});

		return () => {
			if (intervalId !== undefined) {
				sessionUtils.stopSessionMonitoring(intervalId);
			}
			// Cleanup GrowthBook
			destroyGrowthBook();
		};
	});

	// Initialize GrowthBook feature flags
	$effect(() => {
		if (browser) {
			// Initialize with current user
			initGrowthBook({
				id: $user?.id || 'anonymous',
				role: $user?.role as 'organizer' | 'participant' | 'guest' || 'guest',
				isGuest: $isGuest,
			});
			
			// Load features from GrowthBook
			loadFeatures().catch(console.error);
		}
	});

	// Update GrowthBook when user changes
	$effect(() => {
		if (browser && $user) {
			updateUserAttributes({
				id: $user.id,
				role: $user.role as 'organizer' | 'participant' | 'guest',
				isGuest: $isGuest,
			});
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Developer Banner (only shown in development) -->
{#if dev && data.demoEvent && DeveloperBanner}
	<DeveloperBanner demoEvent={data.demoEvent} />
{/if}

<nav class="navbar" class:with-dev-banner={dev && data.demoEvent}>
	<div class="nav-container">
		<a href="/" class="nav-brand">UnConf</a>

		<div class="nav-links">
			<a href="/" class="nav-link" class:active={$page.url.pathname === '/'}>
				Home
			</a>
			<a href="/create" class="nav-link" class:active={$page.url.pathname === '/create'}>
				Create Event
			</a>
			{#if $isAuthenticated}
				<a href="/events" class="nav-link" class:active={$page.url.pathname.startsWith('/events')}>
					My Events
				</a>
			{/if}
		</div>

		<div class="nav-auth">
			{#if LanguageSwitcher}
				<LanguageSwitcher />
			{/if}
			{#if $isAuthenticated && $user}
				<span class="user-info">
					{$user.name || $user.email || 'User'}
					{#if $isGuest}
						<span class="guest-badge">Guest</span>
					{/if}
				</span>
				<button onclick={handleSignOut} class="auth-button">
					Sign Out
				</button>
			{:else}
				<button onclick={handleGoogleSignIn} class="auth-button" disabled={signingIn}>
					{signingIn ? 'Signing in...' : 'Sign In'}
				</button>
				<button onclick={handleGuestSignIn} class="auth-button guest" disabled={signingIn}>
					{signingIn ? 'Wait...' : 'Guest'}
				</button>
			{/if}
		</div>
	</div>
</nav>

<main>
	{@render children?.()}
</main>

<!-- Toast notifications -->
<Toast />

<!-- Security monitoring component (lazy loaded) -->
{#if SecurityMonitor}
	<SecurityMonitor showWarnings={true} autoLogout={false} warningThreshold={5} />
{/if}

<!-- Web Vitals monitoring (lazy loaded) -->
{#if WebVitalsMonitor}
	<WebVitalsMonitor showInProduction={false} sendToAnalytics={true} />
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
		flex-shrink: 0;
	}

	/* Mobile: Smaller brand */
	@media (max-width: 767px) {
		.nav-brand {
			font-size: 1.25rem;
		}
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		justify-content: center;
	}

	.nav-link {
		padding: 0.5rem 1rem;
		text-decoration: none;
		color: #666;
		border-radius: 6px;
		transition: all 0.2s;
		font-weight: 500;
		white-space: nowrap;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.nav-link:hover {
		background: #e9ecef;
		color: #333;
	}

	.nav-link.active {
		background: #007bff;
		color: white;
	}

	/* Mobile: Hide text, show icons or minimal text */
	@media (max-width: 767px) {
		.nav-links {
			gap: 0.25rem;
		}

		.nav-link {
			padding: 0.5rem 0.75rem;
			font-size: 0.85rem;
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
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 150px;
	}

	/* Mobile: Hide user info text, keep badge */
	@media (max-width: 767px) {
		.user-info {
			display: none;
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
		min-height: calc(100vh - 200px);
	}

	/* Default content container - applied via .page-container class */
	main:not(:has(.full-width)) {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	/* Mobile: Reduced padding for default pages */
	@media (max-width: 767px) {
		main:not(:has(.full-width)) {
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
