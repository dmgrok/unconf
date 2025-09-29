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
		sourcemap: true
	},
	optimizeDeps: {
		include: ['socket.io-client']
	}
});
