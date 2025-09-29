import { test, expect } from '@playwright/test';
import { EventPage } from '../pages/event.page';
import { MultiUserHelpers, generateTestData } from '../utils/test-helpers';

test.describe('Real-time Features', () => {
	let multiUser: MultiUserHelpers;

	test.beforeAll(async ({ browser }) => {
		multiUser = new MultiUserHelpers();
	});

	test.afterAll(async () => {
		await multiUser.cleanupUsers();
	});

	test('should sync votes between multiple users', async ({ browser }) => {
		// Create two users
		const pages = await multiUser.createUsers(2, browser);
		const [user1Page, user2Page] = pages;

		const eventPage1 = new EventPage(user1Page);
		const eventPage2 = new EventPage(user2Page);

		// Both users join the same event
		const testEventId = 'test-event-123';
		await eventPage1.joinEvent(testEventId);
		await eventPage2.joinEvent(testEventId);

		// Wait for WebSocket connections
		await eventPage1.waitForConnectionEstablished();
		await eventPage2.waitForConnectionEstablished();

		// User 1 submits a proposal
		const proposal = generateTestData.proposal();
		await eventPage1.submitProposal(proposal.title);

		// User 2 should see the new proposal
		await user2Page.waitForSelector(`[data-testid="proposal-${proposal.title}"]`);

		// User 2 votes on the proposal
		await eventPage2.voteOnProposal(proposal.title);

		// User 1 should see the vote count update in real-time
		await eventPage1.assertVoteCountUpdated(proposal.title, 1);
	});

	test('should show participant list updates in real-time', async ({ browser }) => {
		const pages = await multiUser.createUsers(3, browser);
		const [user1Page, user2Page, user3Page] = pages;

		const eventPage1 = new EventPage(user1Page);
		const eventPage2 = new EventPage(user2Page);
		const eventPage3 = new EventPage(user3Page);

		const testEventId = 'test-event-participants';

		// User 1 joins first
		await eventPage1.joinEvent(testEventId);
		await eventPage1.waitForConnectionEstablished();

		// User 2 joins
		await eventPage2.joinEvent(testEventId);
		await eventPage2.waitForConnectionEstablished();

		// User 1 should see User 2 join
		await eventPage1.assertParticipantJoined('User 2');

		// User 3 joins
		await eventPage3.joinEvent(testEventId);
		await eventPage3.waitForConnectionEstablished();

		// Both User 1 and User 2 should see User 3 join
		await eventPage1.assertParticipantJoined('User 3');
		await eventPage2.assertParticipantJoined('User 3');
	});

	test('should handle WebSocket connection interruption gracefully', async ({ page }) => {
		const eventPage = new EventPage(page);
		await eventPage.joinEvent('test-event-resilience');
		await eventPage.waitForConnectionEstablished();

		// Simulate network interruption
		await page.context().setOffline(true);

		// Should show disconnected state
		await expect(page.locator('[data-testid="connection-status"]')).toContainText('Disconnected');

		// Restore connection
		await page.context().setOffline(false);

		// Should reconnect automatically
		await page.waitForFunction(
			() => document.querySelector('[data-testid="connection-status"]')?.textContent?.includes('Connected'),
			undefined,
			{ timeout: 10000 }
		);
	});

	test('should maintain state during reconnection', async ({ page }) => {
		const eventPage = new EventPage(page);
		await eventPage.joinEvent('test-event-state');
		await eventPage.waitForConnectionEstablished();

		// Submit a proposal
		const proposal = generateTestData.proposal();
		await eventPage.submitProposal(proposal.title);

		// Simulate connection drop
		await page.context().setOffline(true);
		await page.context().setOffline(false);

		// Wait for reconnection
		await eventPage.waitForConnectionEstablished();

		// Proposal should still be visible
		await expect(page.locator(`[data-testid="proposal-${proposal.title}"]`)).toBeVisible();
	});
});