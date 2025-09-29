import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
	console.log('🚀 Starting E2E test global setup...');

	// Launch browser for setup
	const browser = await chromium.launch();
	const page = await browser.newPage();

	// Perform any global setup tasks here
	// e.g., seed database, create test users, etc.

	// You can store auth state for reuse across tests
	// await page.goto('http://localhost:5173/auth/signin');
	// await page.fill('[data-testid="email"]', 'test@example.com');
	// await page.fill('[data-testid="password"]', 'password');
	// await page.click('[data-testid="signin-button"]');
	// await page.context().storageState({ path: 'tests/fixtures/auth.json' });

	await browser.close();
	console.log('✅ E2E test global setup completed');
}

export default globalSetup;