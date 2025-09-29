import { type Page, type Locator, expect } from '@playwright/test';

export class BasePage {
	protected page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	// Common navigation methods
	async goto(path: string = '/') {
		await this.page.goto(path);
	}

	async waitForUrl(url: string | RegExp) {
		await this.page.waitForURL(url);
	}

	// Common element interactions
	async clickElement(selector: string) {
		await this.page.click(selector);
	}

	async fillInput(selector: string, value: string) {
		await this.page.fill(selector, value);
	}

	async getText(selector: string): Promise<string> {
		return await this.page.textContent(selector) || '';
	}

	async isVisible(selector: string): Promise<boolean> {
		return await this.page.isVisible(selector);
	}

	async waitForSelector(selector: string) {
		await this.page.waitForSelector(selector);
	}

	// Common assertions
	async assertPageTitle(title: string) {
		await expect(this.page).toHaveTitle(title);
	}

	async assertElementVisible(selector: string) {
		await expect(this.page.locator(selector)).toBeVisible();
	}

	async assertElementHidden(selector: string) {
		await expect(this.page.locator(selector)).toBeHidden();
	}

	async assertElementText(selector: string, text: string) {
		await expect(this.page.locator(selector)).toHaveText(text);
	}

	// WebSocket related helpers
	async waitForWebSocketConnection() {
		// Wait for WebSocket connection to be established
		await this.page.waitForFunction(
			() => window.WebSocket && window.WebSocket.CONNECTING !== undefined
		);
	}

	// Accessibility helpers
	async checkAccessibility() {
		// This would integrate with axe-core when implemented
		// For now, basic keyboard navigation check
		await this.page.keyboard.press('Tab');
	}

	// Mobile/responsive helpers
	async setMobileViewport() {
		await this.page.setViewportSize({ width: 375, height: 667 });
	}

	async setDesktopViewport() {
		await this.page.setViewportSize({ width: 1280, height: 720 });
	}
}