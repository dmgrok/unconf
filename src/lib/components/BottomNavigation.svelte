<script lang="ts">
	import { page } from '$app/stores';

	interface BottomNavItem {
		label: string;
		href: string;
		icon: string;
		badge?: number;
	}

	let { items = [] as BottomNavItem[] } = $props();

	let activeRoute = $derived($page.url.pathname);

	function isActive(href: string): boolean {
		return activeRoute === href || activeRoute.startsWith(href + '/');
	}
</script>

<nav class="bottom-nav-container">
	<ul class="bottom-nav-list">
		{#each items as item}
			<li class="bottom-nav-list-item">
				<a href={item.href} class="bottom-nav-item" class:active={isActive(item.href)}>
					<span class="bottom-nav-icon">
						{item.icon}
						{#if item.badge}
							<span class="bottom-nav-badge">{item.badge}</span>
						{/if}
					</span>
					<span class="bottom-nav-label">{item.label}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.bottom-nav-container {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: white;
		border-top: 1px solid #e5e7eb;
		padding-bottom: env(safe-area-inset-bottom);
		z-index: 100;
		box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
	}

	.bottom-nav-list {
		display: flex;
		justify-content: space-around;
		align-items: stretch;
		list-style: none;
		margin: 0;
		padding: 0;
		height: 60px;
	}

	.bottom-nav-list-item {
		flex: 1;
		display: flex;
	}

	.bottom-nav-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		text-decoration: none;
		color: #6b7280;
		transition: all 0.2s ease;
		padding: 0.5rem;
		position: relative;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	.bottom-nav-item:active {
		transform: scale(0.95);
	}

	.bottom-nav-item.active {
		color: #2563eb;
	}

	.bottom-nav-item.active::before {
		content: '';
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 40px;
		height: 3px;
		background: #2563eb;
		border-radius: 0 0 3px 3px;
	}

	.bottom-nav-icon {
		font-size: 1.5rem;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.bottom-nav-badge {
		position: absolute;
		top: -6px;
		right: -8px;
		background: #ef4444;
		color: white;
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		border-radius: 10px;
		min-width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid white;
	}

	.bottom-nav-label {
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	/* Hide on desktop */
	@media (min-width: 768px) {
		.bottom-nav-container {
			display: none;
		}
	}

	/* Add bottom padding to body when bottom nav is visible */
	@media (max-width: 767px) {
		:global(body) {
			padding-bottom: calc(60px + env(safe-area-inset-bottom));
		}
	}
</style>
