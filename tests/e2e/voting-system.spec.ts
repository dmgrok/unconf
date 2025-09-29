import { test, expect } from '@playwright/test';
import { EventPage } from '../pages/event.page';
import { generateTestData, MultiUserHelpers } from '../utils/test-helpers';

test.describe('Weighted Voting System', () => {
	let eventPage: EventPage;
	let multiUser: MultiUserHelpers;

	test.beforeAll(async ({ browser }) => {
		multiUser = new MultiUserHelpers();
	});

	test.afterAll(async () => {
		await multiUser.cleanupUsers();
	});

	test.beforeEach(async ({ page }) => {
		eventPage = new EventPage(page);
		await page.goto('/');
		await eventPage.waitForEventLoad();
	});

	test.describe('Single User Voting', () => {
		test('should allow user to cast 1st choice vote (3 points)', async ({ page }) => {
			// Find a topic to vote on
			const firstTopic = page.locator('[data-testid*="topic-card-"]').first();
			await firstTopic.waitFor({ state: 'visible' });

			// Cast 1st choice vote
			const firstChoiceButton = firstTopic.locator('[data-testid="vote-first-choice"]');
			await firstChoiceButton.click();

			// Verify vote is recorded
			await expect(firstTopic.locator('[data-testid="user-vote-indicator"]')).toContainText('🥇');

			// Verify points are added correctly
			const scoreElement = firstTopic.locator('[data-testid="topic-score"]');
			await expect(scoreElement).toContainText('3');
		});

		test('should allow user to cast 2nd choice vote (2 points)', async ({ page }) => {
			const topic = page.locator('[data-testid*="topic-card-"]').nth(1);
			await topic.waitFor({ state: 'visible' });

			const secondChoiceButton = topic.locator('[data-testid="vote-second-choice"]');
			await secondChoiceButton.click();

			await expect(topic.locator('[data-testid="user-vote-indicator"]')).toContainText('🥈');

			const scoreElement = topic.locator('[data-testid="topic-score"]');
			await expect(scoreElement).toContainText('2');
		});

		test('should allow user to cast 3rd choice vote (1 point)', async ({ page }) => {
			const topic = page.locator('[data-testid*="topic-card-"]').nth(2);
			await topic.waitFor({ state: 'visible' });

			const thirdChoiceButton = topic.locator('[data-testid="vote-third-choice"]');
			await thirdChoiceButton.click();

			await expect(topic.locator('[data-testid="user-vote-indicator"]')).toContainText('🥉');

			const scoreElement = topic.locator('[data-testid="topic-score"]');
			await expect(scoreElement).toContainText('1');
		});

		test('should allow user to change vote from one choice to another', async ({ page }) => {
			const topic = page.locator('[data-testid*="topic-card-"]').first();
			await topic.waitFor({ state: 'visible' });

			// Cast initial 1st choice vote
			await topic.locator('[data-testid="vote-first-choice"]').click();
			await expect(topic.locator('[data-testid="user-vote-indicator"]')).toContainText('🥇');

			// Change to 2nd choice vote
			await topic.locator('[data-testid="vote-second-choice"]').click();
			await expect(topic.locator('[data-testid="user-vote-indicator"]')).toContainText('🥈');

			// Verify score updated correctly (should be 2, not 5)
			const scoreElement = topic.locator('[data-testid="topic-score"]');
			await expect(scoreElement).toContainText('2');
		});

		test('should allow user to remove vote completely', async ({ page }) => {
			const topic = page.locator('[data-testid*="topic-card-"]').first();
			await topic.waitFor({ state: 'visible' });

			// Cast a vote first
			await topic.locator('[data-testid="vote-first-choice"]').click();
			await expect(topic.locator('[data-testid="user-vote-indicator"]')).toContainText('🥇');

			// Remove the vote
			await topic.locator('[data-testid="remove-vote"]').click();

			// Verify vote is removed
			await expect(topic.locator('[data-testid="user-vote-indicator"]')).not.toBeVisible();

			// Verify score is reduced
			const scoreElement = topic.locator('[data-testid="topic-score"]');
			const scoreText = await scoreElement.textContent();
			expect(parseInt(scoreText || '0')).toBeLessThan(3);
		});

		test('should enforce one vote per choice level across all topics', async ({ page }) => {
			const topics = page.locator('[data-testid*="topic-card-"]');
			await topics.first().waitFor({ state: 'visible' });

			// Cast 1st choice vote on first topic
			await topics.nth(0).locator('[data-testid="vote-first-choice"]').click();
			await expect(topics.nth(0).locator('[data-testid="user-vote-indicator"]')).toContainText('🥇');

			// Try to cast 1st choice vote on second topic
			await topics.nth(1).locator('[data-testid="vote-first-choice"]').click();

			// Verify first topic no longer has 1st choice vote
			await expect(topics.nth(0).locator('[data-testid="user-vote-indicator"]')).not.toContainText('🥇');

			// Verify second topic now has 1st choice vote
			await expect(topics.nth(1).locator('[data-testid="user-vote-indicator"]')).toContainText('🥇');
		});
	});

	test.describe('Multi-User Voting Synchronization', () => {
		test('should sync vote counts in real-time across multiple users', async ({ browser }) => {
			const pages = await multiUser.createUsers(3, browser);
			const [user1Page, user2Page, user3Page] = pages;

			// All users navigate to voting page
			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid*="topic-card-"]');
			}

			const topicSelector = '[data-testid*="topic-card-"]:first-child';

			// User 1 casts 1st choice vote (3 points)
			await user1Page.locator(topicSelector).locator('[data-testid="vote-first-choice"]').click();

			// User 2 casts 2nd choice vote (2 points)
			await user2Page.locator(topicSelector).locator('[data-testid="vote-second-choice"]').click();

			// User 3 casts 3rd choice vote (1 point)
			await user3Page.locator(topicSelector).locator('[data-testid="vote-third-choice"]').click();

			// Wait for real-time updates and verify total score
			const expectedTotal = 3 + 2 + 1; // 6 points total

			for (const page of pages) {
				await page.waitForFunction(
					(total) => {
						const scoreElement = document.querySelector('[data-testid*="topic-card-"]:first-child [data-testid="topic-score"]');
						return scoreElement && parseInt(scoreElement.textContent || '0') >= total;
					},
					expectedTotal,
					{ timeout: 10000 }
				);
			}
		});

		test('should sync vote changes in real-time', async ({ browser }) => {
			const pages = await multiUser.createUsers(2, browser);
			const [user1Page, user2Page] = pages;

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid*="topic-card-"]');
			}

			const topicSelector = '[data-testid*="topic-card-"]:first-child';

			// User 1 casts 1st choice vote
			await user1Page.locator(topicSelector).locator('[data-testid="vote-first-choice"]').click();

			// Verify User 2 sees the vote
			await user2Page.waitForFunction(
				() => {
					const scoreElement = document.querySelector('[data-testid*="topic-card-"]:first-child [data-testid="topic-score"]');
					return scoreElement && parseInt(scoreElement.textContent || '0') >= 3;
				},
				undefined,
				{ timeout: 5000 }
			);

			// User 1 changes to 2nd choice vote
			await user1Page.locator(topicSelector).locator('[data-testid="vote-second-choice"]').click();

			// Verify User 2 sees the updated score
			await user2Page.waitForFunction(
				() => {
					const scoreElement = document.querySelector('[data-testid*="topic-card-"]:first-child [data-testid="topic-score"]');
					return scoreElement && parseInt(scoreElement.textContent || '0') === 2;
				},
				undefined,
				{ timeout: 5000 }
			);
		});
	});

	test.describe('Vote Persistence and Loading', () => {
		test('should persist votes across page reloads', async ({ page }) => {
			const topic = page.locator('[data-testid*="topic-card-"]').first();
			await topic.waitFor({ state: 'visible' });

			// Cast a vote
			await topic.locator('[data-testid="vote-first-choice"]').click();
			await expect(topic.locator('[data-testid="user-vote-indicator"]')).toContainText('🥇');

			// Reload the page
			await page.reload();
			await page.waitForSelector('[data-testid*="topic-card-"]');

			// Verify vote is still there
			const reloadedTopic = page.locator('[data-testid*="topic-card-"]').first();
			await expect(reloadedTopic.locator('[data-testid="user-vote-indicator"]')).toContainText('🥇');
		});

		test('should load existing vote totals correctly on page load', async ({ browser }) => {
			// Setup: Create votes with one user
			const setupContext = await browser.newContext();
			const setupPage = await setupContext.newPage();
			await setupPage.goto('/');
			await setupPage.waitForSelector('[data-testid*="topic-card-"]');

			const firstTopic = setupPage.locator('[data-testid*="topic-card-"]').first();
			await firstTopic.locator('[data-testid="vote-first-choice"]').click();
			await setupContext.close();

			// Test: Load page with new user and verify totals
			await page.goto('/');
			await page.waitForSelector('[data-testid*="topic-card-"]');

			const topic = page.locator('[data-testid*="topic-card-"]').first();
			const scoreElement = topic.locator('[data-testid="topic-score"]');

			// Should show the existing vote total
			await expect(scoreElement).toContainText('3');
		});
	});

	test.describe('Voting System Constraints', () => {
		test('should prevent voting on own submitted topics when configured', async ({ page }) => {
			// Submit a new topic first
			const submitForm = page.locator('[data-testid="topic-submission-form"]');
			await submitForm.locator('[data-testid="topic-title-input"]').fill('My Own Topic');
			await submitForm.locator('[data-testid="topic-description-input"]').fill('A topic I submitted');
			await submitForm.locator('[data-testid="submit-topic-button"]').click();

			// Wait for topic to appear
			await page.waitForSelector('[data-testid*="topic-card-My Own Topic"]');

			// Try to vote on own topic - should be disabled or show warning
			const ownTopic = page.locator('[data-testid*="topic-card-My Own Topic"]');
			const voteButtons = ownTopic.locator('[data-testid*="vote-"]');

			// Check if voting is disabled (implementation dependent)
			const firstVoteButton = voteButtons.first();
			const isDisabled = await firstVoteButton.isDisabled();

			if (!isDisabled) {
				// If not disabled, clicking should show an error message
				await firstVoteButton.click();
				await expect(page.locator('[data-testid="vote-error-message"]')).toBeVisible();
			}
		});

		test('should handle maximum vote limits per user', async ({ page }) => {
			const topics = page.locator('[data-testid*="topic-card-"]');
			await topics.first().waitFor({ state: 'visible' });

			const topicCount = await topics.count();

			// Cast all three vote types (1st, 2nd, 3rd choice)
			if (topicCount >= 3) {
				await topics.nth(0).locator('[data-testid="vote-first-choice"]').click();
				await topics.nth(1).locator('[data-testid="vote-second-choice"]').click();
				await topics.nth(2).locator('[data-testid="vote-third-choice"]').click();

				// Try to cast a 4th vote - should either be prevented or replace existing vote
				if (topicCount >= 4) {
					await topics.nth(3).locator('[data-testid="vote-first-choice"]').click();

					// Verify that the original 1st choice vote was moved
					await expect(topics.nth(0).locator('[data-testid="user-vote-indicator"]')).not.toContainText('🥇');
					await expect(topics.nth(3).locator('[data-testid="user-vote-indicator"]')).toContainText('🥇');
				}
			}
		});
	});

	test.describe('Vote Result Display', () => {
		test('should correctly calculate and display weighted totals', async ({ browser }) => {
			const pages = await multiUser.createUsers(5, browser);

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid*="topic-card-"]');
			}

			const topicSelector = '[data-testid*="topic-card-"]:first-child';

			// Create a specific voting pattern
			await pages[0].locator(topicSelector).locator('[data-testid="vote-first-choice"]').click(); // 3 points
			await pages[1].locator(topicSelector).locator('[data-testid="vote-first-choice"]').click(); // 3 points
			await pages[2].locator(topicSelector).locator('[data-testid="vote-second-choice"]').click(); // 2 points
			await pages[3].locator(topicSelector).locator('[data-testid="vote-third-choice"]').click(); // 1 point
			await pages[4].locator(topicSelector).locator('[data-testid="vote-third-choice"]').click(); // 1 point

			// Expected total: 3 + 3 + 2 + 1 + 1 = 10 points

			// Wait for all votes to be processed
			await pages[0].waitForFunction(
				() => {
					const scoreElement = document.querySelector('[data-testid*="topic-card-"]:first-child [data-testid="topic-score"]');
					return scoreElement && parseInt(scoreElement.textContent || '0') >= 10;
				},
				undefined,
				{ timeout: 10000 }
			);

			// Verify the final total on all pages
			for (const page of pages) {
				const scoreElement = page.locator(topicSelector).locator('[data-testid="topic-score"]');
				await expect(scoreElement).toContainText('10');
			}
		});

		test('should show vote breakdown when requested', async ({ page }) => {
			const topic = page.locator('[data-testid*="topic-card-"]').first();
			await topic.waitFor({ state: 'visible' });

			// Cast a vote first
			await topic.locator('[data-testid="vote-first-choice"]').click();

			// Click to show vote breakdown
			const showBreakdownButton = topic.locator('[data-testid="show-vote-breakdown"]');
			if (await showBreakdownButton.isVisible()) {
				await showBreakdownButton.click();

				// Verify breakdown is shown
				await expect(topic.locator('[data-testid="vote-breakdown"]')).toBeVisible();
				await expect(topic.locator('[data-testid="first-choice-count"]')).toContainText('1');
			}
		});
	});

	test.describe('Error Handling', () => {
		test('should handle network errors during voting gracefully', async ({ page }) => {
			const topic = page.locator('[data-testid*="topic-card-"]').first();
			await topic.waitFor({ state: 'visible' });

			// Simulate network failure
			await page.route('**/api/votes**', route => route.abort());

			// Try to vote
			await topic.locator('[data-testid="vote-first-choice"]').click();

			// Should show error message
			await expect(page.locator('[data-testid="vote-error-message"]')).toBeVisible();

			// Vote indicator should not show success state
			await expect(topic.locator('[data-testid="user-vote-indicator"]')).not.toContainText('🥇');
		});

		test('should retry failed votes when connection is restored', async ({ page }) => {
			const topic = page.locator('[data-testid*="topic-card-"]').first();
			await topic.waitFor({ state: 'visible' });

			// Simulate network failure
			let networkFailed = true;
			await page.route('**/api/votes**', route => {
				if (networkFailed) {
					route.abort();
				} else {
					route.continue();
				}
			});

			// Try to vote (should fail)
			await topic.locator('[data-testid="vote-first-choice"]').click();
			await expect(page.locator('[data-testid="vote-error-message"]')).toBeVisible();

			// Restore network
			networkFailed = false;

			// Retry button should be available
			const retryButton = page.locator('[data-testid="retry-vote-button"]');
			if (await retryButton.isVisible()) {
				await retryButton.click();

				// Vote should now succeed
				await expect(topic.locator('[data-testid="user-vote-indicator"]')).toContainText('🥇');
				await expect(page.locator('[data-testid="vote-error-message"]')).not.toBeVisible();
			}
		});
	});
});