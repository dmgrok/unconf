<script lang="ts">
	import { page } from '$app/stores';
	import { fly } from 'svelte/transition';

	interface NavItem {
		label: string;
		href: string;
		icon: string;
		badge?: number;
	}

	let { navItems = [] as NavItem[] } = $props();

	let isOpen = $state(false);
	let activeRoute = $derived($page.url.pathname);

	function toggleMenu() {
		isOpen = !isOpen;
		// Prevent body scroll when menu is open
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
	}

	function closeMenu() {
		isOpen = false;
		document.body.style.overflow = '';
	}

	function isActive(href: string): boolean {
		return activeRoute === href || activeRoute.startsWith(href + '/');
	}
</script>

<!-- Mobile hamburger button -->
<button
	class="hamburger-btn"
	onclick={toggleMenu}
	aria-label="Toggle navigation menu"
	aria-expanded={isOpen}
>
	<span class="hamburger-line" class:open={isOpen}></span>
	<span class="hamburger-line" class:open={isOpen}></span>
	<span class="hamburger-line" class:open={isOpen}></span>
</button>

<!-- Overlay -->
{#if isOpen}
	<div class="overlay" onclick={closeMenu} transition:fly={{ x: -300, duration: 300 }}></div>
{/if}

<!-- Slide-out menu -->
{#if isOpen}
	<nav class="mobile-nav" transition:fly={{ x: -300, duration: 300 }}>
		<div class="mobile-nav-header">
			<h2>Menu</h2>
			<button class="close-btn" onclick={closeMenu} aria-label="Close menu">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<ul class="mobile-nav-list">
			{#each navItems as item}
				<li>
					<a
						href={item.href}
						class="mobile-nav-item"
						class:active={isActive(item.href)}
						onclick={closeMenu}
					>
						<span class="nav-icon">{item.icon}</span>
						<span class="nav-label">{item.label}</span>
						{#if item.badge}
							<span class="nav-badge">{item.badge}</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<style>
	/* Hamburger button */
	.hamburger-btn {
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		width: 44px;
		height: 44px;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 10px;
		z-index: 1001;
		-webkit-tap-highlight-color: transparent;
	}

	.hamburger-line {
		width: 24px;
		height: 2px;
		background: #374151;
		border-radius: 2px;
		transition: all 0.3s ease;
		transform-origin: center;
	}

	.hamburger-line:nth-child(1).open {
		transform: translateY(7px) rotate(45deg);
	}

	.hamburger-line:nth-child(2).open {
		opacity: 0;
	}

	.hamburger-line:nth-child(3).open {
		transform: translateY(-7px) rotate(-45deg);
	}

	/* Overlay */
	.overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 999;
		backdrop-filter: blur(2px);
	}

	/* Mobile navigation drawer */
	.mobile-nav {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		width: 280px;
		max-width: 80vw;
		background: white;
		z-index: 1000;
		box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		padding-bottom: env(safe-area-inset-bottom);
	}

	.mobile-nav-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid #e5e7eb;
		padding-top: calc(1rem + env(safe-area-inset-top));
	}

	.mobile-nav-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
	}

	.close-btn {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		color: #6b7280;
		transition: background 0.2s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.close-btn:hover {
		background: #f3f4f6;
	}

	.close-btn:active {
		background: #e5e7eb;
	}

	/* Navigation list */
	.mobile-nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
		flex: 1;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}

	.mobile-nav-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		color: #374151;
		text-decoration: none;
		transition: background 0.2s ease;
		font-size: 1rem;
		font-weight: 500;
		min-height: 56px;
		border-left: 3px solid transparent;
		-webkit-tap-highlight-color: transparent;
	}

	.mobile-nav-item:hover {
		background: #f9fafb;
	}

	.mobile-nav-item:active {
		background: #f3f4f6;
	}

	.mobile-nav-item.active {
		background: #eff6ff;
		color: #2563eb;
		border-left-color: #2563eb;
	}

	.nav-icon {
		font-size: 1.5rem;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-label {
		flex: 1;
	}

	.nav-badge {
		background: #ef4444;
		color: white;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.125rem 0.5rem;
		border-radius: 12px;
		min-width: 20px;
		text-align: center;
	}

	/* Hide on desktop */
	@media (min-width: 768px) {
		.hamburger-btn {
			display: none;
		}
	}
</style>
