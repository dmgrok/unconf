import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		conditions: ['browser']
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/test/setup.ts'],
		coverage: {
			reporter: ['text', 'json', 'json-summary', 'html'],
			include: ['src/**/*.{js,ts,svelte}'],
			exclude: [
				'node_modules/**',
				'src/test/**',
				'**/*.d.ts',
				'**/*.config.ts',
				'build/**',
				'.svelte-kit/**'
			],
			thresholds: {
				branches: 80,
				functions: 80,
				lines: 80,
				statements: 80
			}
		},
		pool: 'forks'
	}
});