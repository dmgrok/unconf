<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	interface NavSection {
		title: string;
		items: NavItem[];
	}

	interface NavItem {
		title: string;
		href: string;
		icon?: string;
	}

	interface TableOfContentsItem {
		id: string;
		title: string;
		level: number;
	}

	let {
		title = '',
		description = '',
		sections = [] as NavSection[],
		showTableOfContents = true,
		showBreadcrumbs = true,
		showPrevNext = true,
		children
	}: {
		title?: string;
		description?: string;
		sections?: NavSection[];
		showTableOfContents?: boolean;
		showBreadcrumbs?: boolean;
		showPrevNext?: boolean;
		children: any;
	} = $props();

	let tocItems = $state<TableOfContentsItem[]>([]);
	let activeSection = $state('');
	let isMobileMenuOpen = $state(false);
	let contentEl: HTMLElement;

	// Generate table of contents from headings
	onMount(() => {
		if (showTableOfContents && contentEl) {
			const headings = contentEl.querySelectorAll('h2, h3');
			tocItems = Array.from(headings).map((heading) => ({
				id: heading.id || heading.textContent?.toLowerCase().replace(/\s+/g, '-') || '',
				title: heading.textContent || '',
				level: parseInt(heading.tagName[1])
			}));

			// Set up intersection observer for active section highlighting
			const observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							activeSection = entry.target.id;
						}
					});
				},
				{ rootMargin: '-100px 0px -66%' }
			);

			headings.forEach((heading) => {
				if (heading.id) observer.observe(heading);
			});

			return () => observer.disconnect();
		}
	});

	// Get current path for active nav highlighting
	const currentPath = $derived($page.url.pathname);

	// Generate breadcrumbs from current path
	const breadcrumbs = $derived(() => {
		const paths = currentPath.split('/').filter(Boolean);
		return paths.map((path, index) => ({
			label: path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' '),
			href: '/' + paths.slice(0, index + 1).join('/')
		}));
	});

	// Get previous and next pages
	const allPages = $derived(() => {
		const pages: NavItem[] = [];
		sections.forEach((section) => {
			pages.push(...section.items);
		});
		return pages;
	});

	const currentIndex = $derived(allPages().findIndex((p) => p.href === currentPath));
	const previousPage = $derived(currentIndex > 0 ? allPages()[currentIndex - 1] : null);
	const nextPage = $derived(
		currentIndex < allPages().length - 1 ? allPages()[currentIndex + 1] : null
	);

	function scrollToSection(id: string) {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}
</script>

<div class="docs-layout">
	<!-- Mobile menu toggle -->
	<button
		class="mobile-menu-toggle"
		onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
		aria-label="Toggle navigation menu"
	>
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
			{#if isMobileMenuOpen}
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			{:else}
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			{/if}
		</svg>
	</button>

	<!-- Sidebar Navigation -->
	<aside class="docs-sidebar" class:mobile-open={isMobileMenuOpen}>
		<nav class="sidebar-nav">
			<a href="/docs" class="sidebar-logo">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
				</svg>
				<span>Documentation</span>
			</a>

			{#each sections as section}
				<div class="nav-section">
					<h3 class="section-title">{section.title}</h3>
					<ul class="nav-list">
						{#each section.items as item}
							<li>
								<a
									href={item.href}
									class="nav-link"
									class:active={currentPath === item.href}
								>
									{#if item.icon}
										<span class="nav-icon">{item.icon}</span>
									{/if}
									{item.title}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</nav>
	</aside>

	<!-- Main Content -->
	<main class="docs-main">
		<div class="docs-content-wrapper">
			<!-- Breadcrumbs -->
			{#if showBreadcrumbs && breadcrumbs().length > 0}
				<nav class="breadcrumbs" aria-label="Breadcrumb">
					<ol>
						<li><a href="/">Home</a></li>
						{#each breadcrumbs() as crumb, index}
							<li>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
								{#if index === breadcrumbs().length - 1}
									<span aria-current="page">{crumb.label}</span>
								{:else}
									<a href={crumb.href}>{crumb.label}</a>
								{/if}
							</li>
						{/each}
					</ol>
				</nav>
			{/if}

			<!-- Page Header -->
			{#if title}
				<header class="docs-header">
					<h1>{title}</h1>
					{#if description}
						<p class="lead">{description}</p>
					{/if}
				</header>
			{/if}

			<!-- Main content -->
			<article class="docs-content" bind:this={contentEl}>
				{@render children()}
			</article>

			<!-- Previous/Next Navigation -->
			{#if showPrevNext && (previousPage || nextPage)}
				<nav class="page-navigation">
					{#if previousPage}
						<a href={previousPage.href} class="page-nav-link prev">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
							<div>
								<div class="nav-label">Previous</div>
								<div class="nav-title">{previousPage.title}</div>
							</div>
						</a>
					{:else}
						<div></div>
					{/if}

					{#if nextPage}
						<a href={nextPage.href} class="page-nav-link next">
							<div>
								<div class="nav-label">Next</div>
								<div class="nav-title">{nextPage.title}</div>
							</div>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</a>
					{/if}
				</nav>
			{/if}

			<!-- Footer Help -->
			<div class="docs-footer">
				<p>Was this page helpful?</p>
				<div class="feedback-buttons">
					<button class="feedback-btn">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
						</svg>
						Yes
					</button>
					<button class="feedback-btn">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
						</svg>
						No
					</button>
				</div>
				<a href="https://github.com/yourusername/unconf/edit/main/src/routes/docs/{currentPath.split('/').pop()}/+page.svelte" class="edit-link">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
					</svg>
					Edit this page on GitHub
				</a>
			</div>
		</div>
	</main>

	<!-- Table of Contents (Right Sidebar) -->
	{#if showTableOfContents && tocItems.length > 0}
		<aside class="docs-toc">
			<nav>
				<h4>On this page</h4>
				<ul>
					{#each tocItems as item}
						<li class="toc-level-{item.level}">
							<a
								href="#{item.id}"
								class:active={activeSection === item.id}
								onclick={(e) => {
									e.preventDefault();
									scrollToSection(item.id);
								}}
							>
								{item.title}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
		</aside>
	{/if}
</div>

<style>
	.docs-layout {
		display: grid;
		grid-template-columns: 280px 1fr 240px;
		max-width: 1600px;
		margin: 0 auto;
		min-height: calc(100vh - 64px);
		position: relative;
	}

	/* Mobile Menu Toggle */
	.mobile-menu-toggle {
		display: none;
		position: fixed;
		top: 80px;
		left: 1rem;
		z-index: 100;
		padding: 0.5rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.mobile-menu-toggle svg {
		color: #374151;
	}

	/* Sidebar */
	.docs-sidebar {
		position: sticky;
		top: 80px;
		height: calc(100vh - 80px);
		overflow-y: auto;
		border-right: 1px solid #e5e7eb;
		padding: 2rem 1rem;
		background: white;
	}

	.sidebar-logo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		margin-bottom: 1.5rem;
		font-weight: 600;
		font-size: 1.125rem;
		color: #111827;
		border-radius: 8px;
		transition: background 0.2s ease;
	}

	.sidebar-logo:hover {
		background: #f9fafb;
		text-decoration: none;
	}

	.sidebar-logo svg {
		color: #3b82f6;
	}

	.nav-section {
		margin-bottom: 1.5rem;
	}

	.section-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
		margin: 0 0 0.75rem 0.75rem;
	}

	.nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		color: #4b5563;
		font-size: 0.9375rem;
		border-radius: 6px;
		transition: all 0.2s ease;
	}

	.nav-link:hover {
		background: #f3f4f6;
		color: #111827;
		text-decoration: none;
	}

	.nav-link.active {
		background: #eff6ff;
		color: #2563eb;
		font-weight: 500;
	}

	/* Main Content */
	.docs-main {
		padding: 2rem;
		max-width: 900px;
	}

	.docs-content-wrapper {
		max-width: 65ch;
	}

	/* Breadcrumbs */
	.breadcrumbs {
		margin-bottom: 2rem;
	}

	.breadcrumbs ol {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: 0.875rem;
	}

	.breadcrumbs li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
	}

	.breadcrumbs a {
		color: #6b7280;
	}

	.breadcrumbs a:hover {
		color: #111827;
	}

	.breadcrumbs span {
		color: #111827;
		font-weight: 500;
	}

	.breadcrumbs svg {
		color: #9ca3af;
	}

	/* Page Header */
	.docs-header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.docs-header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 0.75rem 0;
		color: #111827;
	}

	.lead {
		font-size: 1.25rem;
		line-height: 1.75;
		color: #6b7280;
		margin: 0;
	}

	/* Content */
	.docs-content {
		line-height: 1.7;
	}

	/* Page Navigation */
	.page-navigation {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid #e5e7eb;
	}

	.page-nav-link {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		transition: all 0.2s ease;
	}

	.page-nav-link:hover {
		background: white;
		border-color: #3b82f6;
		text-decoration: none;
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
	}

	.page-nav-link.next {
		justify-content: flex-end;
		text-align: right;
	}

	.page-nav-link svg {
		color: #9ca3af;
		flex-shrink: 0;
	}

	.nav-label {
		font-size: 0.8125rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
		margin-bottom: 0.25rem;
	}

	.nav-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: #111827;
	}

	/* Footer */
	.docs-footer {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid #e5e7eb;
		text-align: center;
	}

	.docs-footer p {
		font-weight: 500;
		color: #374151;
		margin-bottom: 1rem;
	}

	.feedback-buttons {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.feedback-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		font-size: 0.9375rem;
		font-weight: 500;
		color: #374151;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.feedback-btn:hover {
		border-color: #3b82f6;
		color: #3b82f6;
	}

	.edit-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.edit-link:hover {
		color: #3b82f6;
	}

	/* Table of Contents */
	.docs-toc {
		position: sticky;
		top: 80px;
		height: calc(100vh - 80px);
		overflow-y: auto;
		padding: 2rem 1rem;
		border-left: 1px solid #e5e7eb;
	}

	.docs-toc h4 {
		font-size: 0.875rem;
		font-weight: 600;
		color: #111827;
		margin: 0 0 1rem 0;
	}

	.docs-toc ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.docs-toc li {
		margin: 0;
	}

	.docs-toc a {
		display: block;
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		color: #6b7280;
		border-left: 2px solid transparent;
		transition: all 0.2s ease;
	}

	.docs-toc a:hover {
		color: #111827;
		text-decoration: none;
	}

	.docs-toc a.active {
		color: #2563eb;
		border-left-color: #2563eb;
		font-weight: 500;
	}

	.toc-level-3 a {
		padding-left: 1.5rem;
		font-size: 0.75rem;
	}

	/* Responsive */
	@media (max-width: 1280px) {
		.docs-layout {
			grid-template-columns: 280px 1fr;
		}

		.docs-toc {
			display: none;
		}
	}

	@media (max-width: 1024px) {
		.mobile-menu-toggle {
			display: block;
		}

		.docs-layout {
			grid-template-columns: 1fr;
		}

		.docs-sidebar {
			position: fixed;
			top: 0;
			left: 0;
			width: 280px;
			height: 100vh;
			transform: translateX(-100%);
			transition: transform 0.3s ease;
			z-index: 99;
			box-shadow: 2px 0 12px rgba(0, 0, 0, 0.1);
		}

		.docs-sidebar.mobile-open {
			transform: translateX(0);
		}

		.docs-main {
			padding: 2rem 1rem;
		}
	}

	@media (max-width: 640px) {
		.docs-header h1 {
			font-size: 2rem;
		}

		.lead {
			font-size: 1.125rem;
		}

		.page-navigation {
			grid-template-columns: 1fr;
		}
	}

	/* Smooth scrolling for anchor links */
	:global(html) {
		scroll-behavior: smooth;
	}
</style>
