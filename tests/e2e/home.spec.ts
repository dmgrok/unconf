import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/home.page';

test.describe('Home Page', () => {
	let homePage: HomePage;

	test.beforeEach(async ({ page }) => {
		homePage = new HomePage(page);
		await homePage.visitHomePage();
	});

	test('should display welcome message', async () => {
		await homePage.assertWelcomeMessageVisible();
	});

	test('should display join event form', async () => {
		await homePage.assertJoinEventFormVisible();
	});

	test('should allow joining an event with valid code', async ({ page }) => {
		// This test assumes there's a test event available
		const testEventCode = 'TEST123';

		await homePage.joinEvent(testEventCode);

		// Should redirect to event page or show success message
		// This will need to be updated based on actual behavior
		await expect(page).toHaveURL(/.*event.*/);
	});

	test('should show error for invalid event code', async () => {
		const invalidCode = 'INVALID';

		await homePage.joinEvent(invalidCode);

		// Should show error message (assuming error handling exists)
		// This will need to be updated based on actual error handling
		await expect(homePage.page.locator('[data-testid="error-message"]')).toBeVisible();
	});

	test('should navigate to create event page', async ({ page }) => {
		await homePage.createNewEvent();

		// Should redirect to create event page
		await expect(page).toHaveURL(/.*create.*/);
	});

	test('should be responsive on mobile', async ({ page }) => {
		await homePage.setMobileViewport();
		await homePage.assertWelcomeMessageVisible();
		await homePage.assertJoinEventFormVisible();
	});
});