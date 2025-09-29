import type { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
	console.log('🧹 Starting E2E test global teardown...');

	// Perform any global cleanup tasks here
	// e.g., cleanup test data, stop test servers, etc.

	console.log('✅ E2E test global teardown completed');
}

export default globalTeardown;