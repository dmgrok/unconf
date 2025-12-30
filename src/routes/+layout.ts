import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url, data }) => {
	// Preload route-specific resources based on current path
	if (url.pathname.startsWith('/admin')) {
		// Preload admin-specific modules
		const adminModules = import.meta.glob('./admin/**/*.svelte');
		// Modules will be loaded on-demand when needed
	}

	if (url.pathname.startsWith('/events')) {
		// Preload event-specific modules
		const eventModules = import.meta.glob('./events/**/*.svelte');
	}

	// Pass through the server data (session, demoEvent)
	return data;
};

// Enable prerendering for static pages
export const prerender = false;

// Enable trailing slashes
export const trailingSlash = 'ignore';
