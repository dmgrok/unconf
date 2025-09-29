import { type Page, type BrowserContext } from '@playwright/test';

// Test data generators
export const generateTestData = {
	user: () => ({
		email: `test-${Date.now()}@example.com`,
		password: 'test-password-123',
		name: `Test User ${Date.now()}`
	}),

	event: () => ({
		title: `Test Event ${Date.now()}`,
		description: `Test event description for E2E testing`,
		code: `TEST${Date.now().toString().slice(-6)}`
	}),

	proposal: () => ({
		title: `Test Proposal ${Date.now()}`,
		description: `Test proposal for E2E testing created at ${new Date().toISOString()}`
	})
};

// Page utilities
export class PageUtils {
	constructor(private page: Page) {}

	// Wait for real-time updates
	async waitForWebSocketMessage(messageType: string, timeout = 5000) {
		return await this.page.waitForFunction(
			(type) => {
				// Assuming WebSocket messages are stored in a global array for testing
				return window.testWebSocketMessages?.some((msg: any) => msg.type === type);
			},
			messageType,
			{ timeout }
		);
	}

	// Simulate network conditions
	async simulateSlowNetwork() {
		const context = this.page.context();
		await context.route('**/*', async (route) => {
			await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
			await route.continue();
		});
	}

	async simulateOffline() {
		await this.page.context().setOffline(true);
	}

	async restoreOnline() {
		await this.page.context().setOffline(false);
	}

	// Local storage helpers
	async setLocalStorage(key: string, value: any) {
		await this.page.evaluate(
			({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
			{ key, value }
		);
	}

	async getLocalStorage(key: string) {
		return await this.page.evaluate(
			(key) => {
				const item = localStorage.getItem(key);
				return item ? JSON.parse(item) : null;
			},
			key
		);
	}

	// Wait helpers
	async waitForApiCall(urlPattern: string | RegExp) {
		return await this.page.waitForResponse(urlPattern);
	}

	async waitForWebSocketConnection() {
		await this.page.waitForFunction(
			() => window.WebSocket && window.WebSocket.CONNECTING !== undefined
		);
	}
}

// Authentication helpers
export class AuthHelpers {
	constructor(private page: Page) {}

	async loginAsTestUser(email = 'test@example.com', password = 'password') {
		await this.page.goto('/auth/signin');
		await this.page.fill('[data-testid="email-input"]', email);
		await this.page.fill('[data-testid="password-input"]', password);
		await this.page.click('[data-testid="signin-button"]');
		await this.page.waitForSelector('[data-testid="user-profile"]');
	}

	async logout() {
		await this.page.click('[data-testid="signout-button"]');
		await this.page.waitForSelector('[data-testid="signin-button"]');
	}

	async getStoredAuthState() {
		return await this.page.context().storageState();
	}
}

// Multi-user testing helpers
export class MultiUserHelpers {
	private contexts: BrowserContext[] = [];
	private pages: Page[] = [];

	async createUsers(count: number, browser: any) {
		for (let i = 0; i < count; i++) {
			const context = await browser.newContext();
			const page = await context.newPage();
			this.contexts.push(context);
			this.pages.push(page);
		}
		return this.pages;
	}

	async cleanupUsers() {
		for (const context of this.contexts) {
			await context.close();
		}
		this.contexts = [];
		this.pages = [];
	}

	getPage(index: number): Page {
		return this.pages[index];
	}

	getAllPages(): Page[] {
		return [...this.pages];
	}
}