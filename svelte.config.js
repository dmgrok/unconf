import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-vercel optimizes the app for deployment to Vercel
		adapter: adapter({
			// Enable Edge Runtime for API routes that support it
			runtime: 'nodejs22.x',
			// Single region for Hobby plan (multiple regions require Pro)
			regions: ['iad1'],
			// Memory allocation for serverless functions
			memory: 1024,
			// Disable ISR - it was causing query params to be stripped from API routes
			// isr: {
			// 	expiration: 3600
			// },
			// Disable function splitting for Hobby plan (max 12 functions)
			split: false
		}),

		// Security configuration
		csrf: {
			trustedOrigins: process.env.NODE_ENV === 'production'
				? ['https://unconf.vercel.app'] // Add your production domain here
				: ['http://localhost:5173', 'http://127.0.0.1:5173']
		},

		// Prerender configuration for static routes
		prerender: {
			handleHttpError: ({ message }) => {
				// Allow 404s for dynamic routes
				if (message.includes('404')) {
					return;
				}
				throw new Error(message);
			},
			entries: [
				'/', // Landing page
				'/about', // About page (if exists)
				'/privacy', // Privacy page (if exists)
				'/terms' // Terms page (if exists)
			]
		}
	}
};

export default config;
