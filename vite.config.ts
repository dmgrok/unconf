import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5173,
		strictPort: false,
		host: true
	},
	preview: {
		port: 4173,
		strictPort: false,
		host: true
	},
	build: {
		target: 'es2022',
		sourcemap: true,
		rollupOptions: {
			output: {
				// Manual chunk splitting for better caching
				manualChunks: (id) => {
					// Vendor chunks
					if (id.includes('node_modules')) {
						// Split large vendor libraries into separate chunks
						if (id.includes('socket.io-client')) {
							return 'vendor-socket';
						}
						if (id.includes('@auth')) {
							return 'vendor-auth';
						}
						if (id.includes('svelte')) {
							return 'vendor-svelte';
						}
						// All other vendor dependencies
						return 'vendor';
					}

					// Admin components in separate chunk
					if (id.includes('/routes/admin/')) {
						return 'admin';
					}

					// Event management components
					if (id.includes('/routes/events/')) {
						return 'events';
					}

					// Large component groups
					if (id.includes('/components/ui/')) {
						return 'ui-components';
					}
					if (id.includes('AnalyticsDashboard') || id.includes('MonitoringDashboard')) {
						return 'analytics';
					}
					if (id.includes('WordChain') || id.includes('GameInterface')) {
						return 'games';
					}
				},
				// Optimize chunk size
				chunkFileNames: 'chunks/[name]-[hash].js',
				assetFileNames: 'assets/[name]-[hash][extname]'
			}
		},
		// Increase chunk size warning limit (500kb)
		chunkSizeWarningLimit: 500
	},
	optimizeDeps: {
		include: ['socket.io-client']
	}
});
