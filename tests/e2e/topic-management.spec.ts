import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { generateTestData, MultiUserHelpers } from '../utils/test-helpers';

test.describe('Topic Submission and Management', () => {
	let homePage: HomePage;
	let multiUser: MultiUserHelpers;

	test.beforeAll(async ({ browser }) => {
		multiUser = new MultiUserHelpers();
	});

	test.afterAll(async () => {
		await multiUser.cleanupUsers();
	});

	test.beforeEach(async ({ page }) => {
		homePage = new HomePage(page);
		await page.goto('/');
		await page.waitForSelector('[data-testid="topic-submission-form"]');
	});

	test.describe('Topic Submission', () => {
		test('should submit a new topic with title and description', async ({ page }) => {
			const topic = generateTestData.proposal();

			// Fill out the topic submission form
			await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
			await page.locator('[data-testid="topic-description-input"]').fill(topic.description);

			// Submit the topic
			await page.locator('[data-testid="submit-topic-button"]').click();

			// Verify success message
			await expect(page.locator('[data-testid="topic-success-message"]')).toBeVisible();

			// Verify topic appears in the list
			await page.waitForSelector(`[data-testid*="topic-card-${topic.title}"]`);
			const topicCard = page.locator(`[data-testid*="topic-card-${topic.title}"]`);
			await expect(topicCard.locator('[data-testid="topic-title"]')).toContainText(topic.title);
			await expect(topicCard.locator('[data-testid="topic-description"]')).toContainText(topic.description);
		});

		test('should require title for topic submission', async ({ page }) => {
			// Try to submit without title
			await page.locator('[data-testid="topic-description-input"]').fill('Description only');
			await page.locator('[data-testid="submit-topic-button"]').click();

			// Should show validation error
			await expect(page.locator('[data-testid="title-required-error"]')).toBeVisible();

			// Topic should not be submitted
			await expect(page.locator('[data-testid="topic-success-message"]')).not.toBeVisible();
		});

		test('should handle topic submission with tags', async ({ page }) => {
			const topic = generateTestData.proposal();
			const tags = ['ai', 'ethics', 'product'];

			await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
			await page.locator('[data-testid="topic-description-input"]').fill(topic.description);

			// Add tags
			for (const tag of tags) {
				await page.locator('[data-testid="topic-tags-input"]').fill(tag);
				await page.locator('[data-testid="add-tag-button"]').click();
			}

			// Verify tags are displayed
			for (const tag of tags) {
				await expect(page.locator(`[data-testid="tag-${tag}"]`)).toBeVisible();
			}

			await page.locator('[data-testid="submit-topic-button"]').click();

			// Verify topic is submitted with tags
			await page.waitForSelector(`[data-testid*="topic-card-${topic.title}"]`);
			const topicCard = page.locator(`[data-testid*="topic-card-${topic.title}"]`);

			for (const tag of tags) {
				await expect(topicCard.locator(`[data-testid="topic-tag-${tag}"]`)).toBeVisible();
			}
		});

		test('should clear form after successful submission', async ({ page }) => {
			const topic = generateTestData.proposal();

			await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
			await page.locator('[data-testid="topic-description-input"]').fill(topic.description);
			await page.locator('[data-testid="submit-topic-button"]').click();

			// Wait for successful submission
			await expect(page.locator('[data-testid="topic-success-message"]')).toBeVisible();

			// Form should be cleared
			await expect(page.locator('[data-testid="topic-title-input"]')).toHaveValue('');
			await expect(page.locator('[data-testid="topic-description-input"]')).toHaveValue('');
		});

		test('should validate topic title length limits', async ({ page }) => {
			// Test maximum length
			const longTitle = 'A'.repeat(201); // Assuming 200 char limit
			await page.locator('[data-testid="topic-title-input"]').fill(longTitle);
			await page.locator('[data-testid="submit-topic-button"]').click();

			await expect(page.locator('[data-testid="title-too-long-error"]')).toBeVisible();

			// Test minimum length
			await page.locator('[data-testid="topic-title-input"]').fill('A');
			await page.locator('[data-testid="submit-topic-button"]').click();

			await expect(page.locator('[data-testid="title-too-short-error"]')).toBeVisible();
		});

		test('should prevent duplicate topic titles', async ({ page }) => {
			const topic = generateTestData.proposal();

			// Submit first topic
			await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
			await page.locator('[data-testid="topic-description-input"]').fill(topic.description);
			await page.locator('[data-testid="submit-topic-button"]').click();

			await expect(page.locator('[data-testid="topic-success-message"]')).toBeVisible();

			// Try to submit duplicate title
			await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
			await page.locator('[data-testid="topic-description-input"]').fill('Different description');
			await page.locator('[data-testid="submit-topic-button"]').click();

			// Should show duplicate error
			await expect(page.locator('[data-testid="duplicate-title-error"]')).toBeVisible();
		});
	});

	test.describe('Topic Display and Management', () => {
		test('should display topics in order of submission', async ({ page }) => {
			const topics = [
				generateTestData.proposal(),
				generateTestData.proposal(),
				generateTestData.proposal()
			];

			// Submit topics in order
			for (const topic of topics) {
				await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
				await page.locator('[data-testid="topic-description-input"]').fill(topic.description);
				await page.locator('[data-testid="submit-topic-button"]').click();
				await expect(page.locator('[data-testid="topic-success-message"]')).toBeVisible();
				await page.waitForTimeout(500); // Small delay to ensure order
			}

			// Verify order in topic list
			const topicCards = page.locator('[data-testid*="topic-card-"]');
			await expect(topicCards).toHaveCount(topics.length);

			for (let i = 0; i < topics.length; i++) {
				const topicCard = topicCards.nth(i);
				await expect(topicCard.locator('[data-testid="topic-title"]')).toContainText(topics[i].title);
			}
		});

		test('should show topic metadata (author, timestamp)', async ({ page }) => {
			const topic = generateTestData.proposal();

			await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
			await page.locator('[data-testid="topic-description-input"]').fill(topic.description);
			await page.locator('[data-testid="submit-topic-button"]').click();

			await page.waitForSelector(`[data-testid*="topic-card-${topic.title}"]`);
			const topicCard = page.locator(`[data-testid*="topic-card-${topic.title}"]`);

			// Verify author is shown
			await expect(topicCard.locator('[data-testid="topic-author"]')).toContainText('Demo User');

			// Verify timestamp is shown
			await expect(topicCard.locator('[data-testid="topic-timestamp"]')).toBeVisible();
		});

		test('should allow topic editing by original author', async ({ page }) => {
			const topic = generateTestData.proposal();
			const updatedTitle = topic.title + ' (Updated)';

			// Submit original topic
			await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
			await page.locator('[data-testid="topic-description-input"]').fill(topic.description);
			await page.locator('[data-testid="submit-topic-button"]').click();

			await page.waitForSelector(`[data-testid*="topic-card-${topic.title}"]`);
			const topicCard = page.locator(`[data-testid*="topic-card-${topic.title}"]`);

			// Click edit button
			await topicCard.locator('[data-testid="edit-topic-button"]').click();

			// Verify edit form is shown
			await expect(topicCard.locator('[data-testid="edit-topic-form"]')).toBeVisible();

			// Update title
			await topicCard.locator('[data-testid="edit-title-input"]').fill(updatedTitle);
			await topicCard.locator('[data-testid="save-topic-button"]').click();

			// Verify topic is updated
			await expect(topicCard.locator('[data-testid="topic-title"]')).toContainText(updatedTitle);
			await expect(topicCard.locator('[data-testid="edit-topic-form"]')).not.toBeVisible();
		});

		test('should allow topic deletion by original author', async ({ page }) => {
			const topic = generateTestData.proposal();

			// Submit topic
			await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
			await page.locator('[data-testid="topic-description-input"]').fill(topic.description);
			await page.locator('[data-testid="submit-topic-button"]').click();

			await page.waitForSelector(`[data-testid*="topic-card-${topic.title}"]`);
			const topicCard = page.locator(`[data-testid*="topic-card-${topic.title}"]`);

			// Delete topic
			await topicCard.locator('[data-testid="delete-topic-button"]').click();

			// Confirm deletion
			await page.locator('[data-testid="confirm-delete-button"]').click();

			// Verify topic is removed
			await expect(topicCard).not.toBeVisible();
		});

		test('should search/filter topics by title', async ({ page }) => {
			const topics = [
				{ title: 'AI Ethics Discussion', description: 'About AI ethics' },
				{ title: 'Remote Work Tips', description: 'About remote work' },
				{ title: 'AI Development Tools', description: 'About AI tools' }
			];

			// Submit topics
			for (const topic of topics) {
				await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
				await page.locator('[data-testid="topic-description-input"]').fill(topic.description);
				await page.locator('[data-testid="submit-topic-button"]').click();
				await expect(page.locator('[data-testid="topic-success-message"]')).toBeVisible();
			}

			// Search for "AI" topics
			await page.locator('[data-testid="topic-search-input"]').fill('AI');

			// Should show only AI-related topics
			await expect(page.locator('[data-testid*="topic-card-AI Ethics Discussion"]')).toBeVisible();
			await expect(page.locator('[data-testid*="topic-card-AI Development Tools"]')).toBeVisible();
			await expect(page.locator('[data-testid*="topic-card-Remote Work Tips"]')).not.toBeVisible();
		});

		test('should filter topics by tags', async ({ page }) => {
			const topics = [
				{ title: 'Topic 1', description: 'Desc 1', tags: ['ai', 'ethics'] },
				{ title: 'Topic 2', description: 'Desc 2', tags: ['remote', 'work'] },
				{ title: 'Topic 3', description: 'Desc 3', tags: ['ai', 'tools'] }
			];

			// Submit topics with tags
			for (const topic of topics) {
				await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
				await page.locator('[data-testid="topic-description-input"]').fill(topic.description);

				// Add tags
				for (const tag of topic.tags) {
					await page.locator('[data-testid="topic-tags-input"]').fill(tag);
					await page.locator('[data-testid="add-tag-button"]').click();
				}

				await page.locator('[data-testid="submit-topic-button"]').click();
				await expect(page.locator('[data-testid="topic-success-message"]')).toBeVisible();
			}

			// Filter by 'ai' tag
			await page.locator('[data-testid="tag-filter-ai"]').click();

			// Should show only topics with 'ai' tag
			await expect(page.locator('[data-testid*="topic-card-Topic 1"]')).toBeVisible();
			await expect(page.locator('[data-testid*="topic-card-Topic 3"]')).toBeVisible();
			await expect(page.locator('[data-testid*="topic-card-Topic 2"]')).not.toBeVisible();
		});
	});

	test.describe('Real-time Topic Updates', () => {
		test('should sync new topics across multiple users in real-time', async ({ browser }) => {
			const pages = await multiUser.createUsers(2, browser);
			const [user1Page, user2Page] = pages;

			// Both users navigate to the page
			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="topic-submission-form"]');
			}

			const topic = generateTestData.proposal();

			// User 1 submits a topic
			await user1Page.locator('[data-testid="topic-title-input"]').fill(topic.title);
			await user1Page.locator('[data-testid="topic-description-input"]').fill(topic.description);
			await user1Page.locator('[data-testid="submit-topic-button"]').click();

			// User 2 should see the new topic appear in real-time
			await user2Page.waitForSelector(`[data-testid*="topic-card-${topic.title}"]`, { timeout: 10000 });
			const topicCard = user2Page.locator(`[data-testid*="topic-card-${topic.title}"]`);
			await expect(topicCard.locator('[data-testid="topic-title"]')).toContainText(topic.title);
		});

		test('should sync topic updates across multiple users', async ({ browser }) => {
			const pages = await multiUser.createUsers(2, browser);
			const [user1Page, user2Page] = pages;

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="topic-submission-form"]');
			}

			const topic = generateTestData.proposal();
			const updatedTitle = topic.title + ' (Updated)';

			// User 1 submits a topic
			await user1Page.locator('[data-testid="topic-title-input"]').fill(topic.title);
			await user1Page.locator('[data-testid="topic-description-input"]').fill(topic.description);
			await user1Page.locator('[data-testid="submit-topic-button"]').click();

			// Wait for topic to appear on both pages
			await user2Page.waitForSelector(`[data-testid*="topic-card-${topic.title}"]`);

			// User 1 edits the topic
			const user1TopicCard = user1Page.locator(`[data-testid*="topic-card-${topic.title}"]`);
			await user1TopicCard.locator('[data-testid="edit-topic-button"]').click();
			await user1TopicCard.locator('[data-testid="edit-title-input"]').fill(updatedTitle);
			await user1TopicCard.locator('[data-testid="save-topic-button"]').click();

			// User 2 should see the updated title
			await user2Page.waitForFunction(
				(title) => {
					const element = document.querySelector('[data-testid*="topic-card-"] [data-testid="topic-title"]');
					return element && element.textContent?.includes(title);
				},
				updatedTitle,
				{ timeout: 10000 }
			);
		});

		test('should sync topic deletions across multiple users', async ({ browser }) => {
			const pages = await multiUser.createUsers(2, browser);
			const [user1Page, user2Page] = pages;

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="topic-submission-form"]');
			}

			const topic = generateTestData.proposal();

			// User 1 submits a topic
			await user1Page.locator('[data-testid="topic-title-input"]').fill(topic.title);
			await user1Page.locator('[data-testid="topic-description-input"]').fill(topic.description);
			await user1Page.locator('[data-testid="submit-topic-button"]').click();

			// Wait for topic to appear on both pages
			await user2Page.waitForSelector(`[data-testid*="topic-card-${topic.title}"]`);

			// User 1 deletes the topic
			const user1TopicCard = user1Page.locator(`[data-testid*="topic-card-${topic.title}"]`);
			await user1TopicCard.locator('[data-testid="delete-topic-button"]').click();
			await user1Page.locator('[data-testid="confirm-delete-button"]').click();

			// User 2 should see the topic disappear
			await user2Page.waitForFunction(
				(title) => {
					const element = document.querySelector(`[data-testid*="topic-card-${title}"]`);
					return !element;
				},
				topic.title,
				{ timeout: 10000 }
			);
		});
	});

	test.describe('Topic Management Error Handling', () => {
		test('should handle topic submission failures gracefully', async ({ page }) => {
			// Simulate network failure
			await page.route('**/api/topics**', route => route.abort());

			const topic = generateTestData.proposal();
			await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
			await page.locator('[data-testid="topic-description-input"]').fill(topic.description);
			await page.locator('[data-testid="submit-topic-button"]').click();

			// Should show error message
			await expect(page.locator('[data-testid="topic-error-message"]')).toBeVisible();

			// Form should retain values for retry
			await expect(page.locator('[data-testid="topic-title-input"]')).toHaveValue(topic.title);
			await expect(page.locator('[data-testid="topic-description-input"]')).toHaveValue(topic.description);
		});

		test('should retry topic submission when connection is restored', async ({ page }) => {
			const topic = generateTestData.proposal();

			// Simulate initial network failure
			let networkFailed = true;
			await page.route('**/api/topics**', route => {
				if (networkFailed) {
					route.abort();
				} else {
					route.continue();
				}
			});

			await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
			await page.locator('[data-testid="topic-description-input"]').fill(topic.description);
			await page.locator('[data-testid="submit-topic-button"]').click();

			// Should show error
			await expect(page.locator('[data-testid="topic-error-message"]')).toBeVisible();

			// Restore network
			networkFailed = false;

			// Retry should work
			await page.locator('[data-testid="retry-submit-button"]').click();

			// Should now succeed
			await expect(page.locator('[data-testid="topic-success-message"]')).toBeVisible();
			await page.waitForSelector(`[data-testid*="topic-card-${topic.title}"]`);
		});

		test('should handle concurrent topic submissions', async ({ browser }) => {
			const pages = await multiUser.createUsers(5, browser);

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="topic-submission-form"]');
			}

			// All users submit topics simultaneously
			const submitPromises = pages.map(async (page, index) => {
				const topic = generateTestData.proposal();
				topic.title = `Concurrent Topic ${index + 1}`;

				await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
				await page.locator('[data-testid="topic-description-input"]').fill(topic.description);
				await page.locator('[data-testid="submit-topic-button"]').click();

				return topic.title;
			});

			const submittedTitles = await Promise.all(submitPromises);

			// Wait for all topics to appear on first page
			for (const title of submittedTitles) {
				await pages[0].waitForSelector(`[data-testid*="topic-card-${title}"]`, { timeout: 15000 });
			}

			// Verify all topics appear on all pages
			for (const page of pages) {
				const topicCards = page.locator('[data-testid*="topic-card-"]');
				await expect(topicCards).toHaveCount(submittedTitles.length);
			}
		});
	});
});