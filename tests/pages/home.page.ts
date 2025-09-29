import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class HomePage extends BasePage {
	// Selectors
	private readonly joinEventButton: Locator;
	private readonly createEventButton: Locator;
	private readonly eventCodeInput: Locator;
	private readonly welcomeMessage: Locator;

	constructor(page: Page) {
		super(page);
		this.joinEventButton = page.locator('[data-testid="join-event-button"]');
		this.createEventButton = page.locator('[data-testid="create-event-button"]');
		this.eventCodeInput = page.locator('[data-testid="event-code-input"]');
		this.welcomeMessage = page.locator('[data-testid="welcome-message"]');
	}

	// Page actions
	async visitHomePage() {
		await this.goto('/');
		await this.waitForPageLoad();
	}

	async joinEvent(eventCode: string) {
		await this.eventCodeInput.fill(eventCode);
		await this.joinEventButton.click();
	}

	async createNewEvent() {
		await this.createEventButton.click();
	}

	async waitForPageLoad() {
		await this.welcomeMessage.waitFor({ state: 'visible' });
	}

	// Assertions specific to home page
	async assertWelcomeMessageVisible() {
		await this.assertElementVisible('[data-testid="welcome-message"]');
	}

	async assertJoinEventFormVisible() {
		await this.assertElementVisible('[data-testid="event-code-input"]');
		await this.assertElementVisible('[data-testid="join-event-button"]');
	}
}