import { test, expect } from '@playwright/test';
import { generateTestData, MultiUserHelpers } from '../utils/test-helpers';

test.describe('Error Handling and Edge Cases', () => {
	let multiUser: MultiUserHelpers;

	test.beforeAll(async ({ browser }) => {
		multiUser = new MultiUserHelpers();
	});

	test.afterAll(async () => {
		await multiUser.cleanupUsers();
	});

	test.describe('Network Failure Scenarios', () => {
		test('should handle complete network disconnection gracefully', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('[data-testid="connection-status"]');

			// Verify initial connected state
			await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

			// Simulate complete network failure
			await page.context().setOffline(true);

			// Should detect disconnection
			await page.waitForFunction(
				() => document.querySelector('[data-testid="connection-status"]')?.textContent?.includes('Disconnected'),
				undefined,
				{ timeout: 10000 }
			);

			// Should show offline mode
			await expect(page.locator('[data-testid="offline-mode-banner"]')).toBeVisible();

			// User should still be able to interact locally
			await page.locator('[data-testid="topic-title-input"]').fill('Offline Topic');
			await page.locator('[data-testid="topic-description-input"]').fill('Created while offline');

			// Should queue the action
			await page.locator('[data-testid="submit-topic-button"]').click();
			await expect(page.locator('[data-testid="queued-actions"]')).toContainText('1 action queued');

			// Restore connection
			await page.context().setOffline(false);

			// Should auto-reconnect and sync queued actions
			await page.waitForFunction(
				() => document.querySelector('[data-testid="connection-status"]')?.textContent?.includes('Connected'),
				undefined,
				{ timeout: 15000 }
			);

			// Queued topic should be submitted
			await expect(page.locator('[data-testid*="topic-card-Offline Topic"]')).toBeVisible();
			await expect(page.locator('[data-testid="queued-actions"]')).toContainText('0 actions queued');
		});

		test('should handle intermittent connectivity issues', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('[data-testid="connection-status"]');

			// Simulate flaky connection
			let requestCount = 0;
			await page.route('**/socket.io/**', route => {
				requestCount++;
				if (requestCount % 3 === 0) {
					// Fail every 3rd request
					route.abort();
				} else {
					route.continue();
				}
			});

			// Try to submit multiple topics
			for (let i = 1; i <= 5; i++) {
				await page.locator('[data-testid="topic-title-input"]').fill(`Flaky Connection Topic ${i}`);
				await page.locator('[data-testid="submit-topic-button"]').click();
				await page.waitForTimeout(1000);

				// Should either succeed or show retry option
				const success = await page.locator('[data-testid="topic-success-message"]').isVisible();
				const retry = await page.locator('[data-testid="retry-submit-button"]').isVisible();

				expect(success || retry).toBe(true);

				if (retry) {
					await page.locator('[data-testid="retry-submit-button"]').click();
				}
			}

			// All topics should eventually be submitted
			await expect(page.locator('[data-testid*="topic-card-"]')).toHaveCount(5);
		});

		test('should handle API server downtime', async ({ page }) => {
			await page.goto('/');

			// Simulate API server being down
			await page.route('**/api/**', route => route.abort());

			const topic = generateTestData.proposal();
			await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
			await page.locator('[data-testid="submit-topic-button"]').click();

			// Should show appropriate error message
			await expect(page.locator('[data-testid="api-error-message"]')).toBeVisible();
			await expect(page.locator('[data-testid="api-error-message"]')).toContainText('Server temporarily unavailable');

			// Should offer retry mechanism
			await expect(page.locator('[data-testid="retry-submit-button"]')).toBeVisible();

			// Should maintain user input for retry
			await expect(page.locator('[data-testid="topic-title-input"]')).toHaveValue(topic.title);
		});

		test('should handle partial API failures', async ({ page }) => {
			await page.goto('/');

			// Topics API works, but votes API fails
			await page.route('**/api/votes/**', route => route.abort());

			// Submit a topic (should work)
			const topic = generateTestData.proposal();
			await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
			await page.locator('[data-testid="submit-topic-button"]').click();

			await expect(page.locator('[data-testid="topic-success-message"]')).toBeVisible();
			await page.waitForSelector(`[data-testid*="topic-card-${topic.title}"]`);

			// Try to vote (should fail gracefully)
			const topicCard = page.locator(`[data-testid*="topic-card-${topic.title}"]`);
			await topicCard.locator('[data-testid="vote-first-choice"]').click();

			// Should show voting-specific error
			await expect(page.locator('[data-testid="voting-error-message"]')).toBeVisible();
			await expect(page.locator('[data-testid="voting-error-message"]')).toContainText('Voting temporarily unavailable');

			// Topic should still be visible
			await expect(topicCard).toBeVisible();
		});
	});

	test.describe('Data Validation and Input Edge Cases', () => {
		test('should handle extremely long topic titles and descriptions', async ({ page }) => {
			await page.goto('/');

			// Test very long title
			const longTitle = 'A'.repeat(1000);
			await page.locator('[data-testid="topic-title-input"]').fill(longTitle);

			// Should show character count and warning
			await expect(page.locator('[data-testid="title-character-count"]')).toBeVisible();
			await expect(page.locator('[data-testid="title-too-long-warning"]')).toBeVisible();

			// Submit button should be disabled or show error
			await page.locator('[data-testid="submit-topic-button"]').click();
			await expect(page.locator('[data-testid="title-length-error"]')).toBeVisible();

			// Test very long description
			const longDescription = 'B'.repeat(5000);
			await page.locator('[data-testid="topic-title-input"]').fill('Normal Title');
			await page.locator('[data-testid="topic-description-input"]').fill(longDescription);

			await expect(page.locator('[data-testid="description-character-count"]')).toBeVisible();
			await page.locator('[data-testid="submit-topic-button"]').click();
			await expect(page.locator('[data-testid="description-length-error"]')).toBeVisible();
		});

		test('should sanitize malicious input attempts', async ({ page }) => {
			await page.goto('/');

			// Test XSS attempts
			const xssAttempts = [
				'<script>alert("xss")</script>',
				'<img src="x" onerror="alert(1)">',
				'javascript:alert(1)',
				'<svg onload="alert(1)">',
				'"><script>alert(1)</script>'
			];

			for (const xssInput of xssAttempts) {
				await page.locator('[data-testid="topic-title-input"]').fill(xssInput);
				await page.locator('[data-testid="topic-description-input"]').fill('Normal description');
				await page.locator('[data-testid="submit-topic-button"]').click();

				// Should either reject the input or sanitize it
				const errorVisible = await page.locator('[data-testid="invalid-input-error"]').isVisible();
				const successVisible = await page.locator('[data-testid="topic-success-message"]').isVisible();

				if (successVisible) {
					// If accepted, verify it was sanitized
					await page.waitForSelector(`[data-testid*="topic-card-"]`);
					const topicTitle = await page.locator('[data-testid*="topic-card-"] [data-testid="topic-title"]').first().textContent();
					expect(topicTitle).not.toContain('<script>');
					expect(topicTitle).not.toContain('javascript:');
				} else {
					expect(errorVisible).toBe(true);
				}

				// Clear for next attempt
				await page.locator('[data-testid="topic-title-input"]').fill('');
				await page.waitForTimeout(500);
			}
		});

		test('should handle special characters and unicode correctly', async ({ page }) => {
			await page.goto('/');

			// Test various unicode and special characters
			const specialInputs = [
				'Topic with émojis 🚀🎉🔥',
				'Тест на кириллице',
				'测试中文字符',
				'عربي',
				'🌟💫✨ Full emoji title ⭐🎭🎪',
				'Mixed: English + 中文 + עברית + 🌍',
				'Special chars: !@#$%^&*()[]{}|;:,.<>?',
				'Math symbols: ∑∆∞≠≤≥±√∫'
			];

			for (const input of specialInputs) {
				await page.locator('[data-testid="topic-title-input"]').fill(input);
				await page.locator('[data-testid="topic-description-input"]').fill(`Description for: ${input}`);
				await page.locator('[data-testid="submit-topic-button"]').click();

				// Should handle gracefully
				const successMessage = page.locator('[data-testid="topic-success-message"]');
				const errorMessage = page.locator('[data-testid="topic-error-message"]');

				// Wait for either success or error
				await Promise.race([
					successMessage.waitFor({ state: 'visible', timeout: 5000 }),
					errorMessage.waitFor({ state: 'visible', timeout: 5000 })
				]);

				const isSuccess = await successMessage.isVisible();
				const isError = await errorMessage.isVisible();

				if (isSuccess) {
					// Verify the text is preserved correctly
					await page.waitForSelector(`[data-testid*="topic-card-"]`);
					const displayedTitle = await page.locator('[data-testid*="topic-card-"] [data-testid="topic-title"]').first().textContent();
					expect(displayedTitle).toContain(input.slice(0, 20)); // Check at least first part
				}

				// Clear for next test
				await page.locator('[data-testid="topic-title-input"]').fill('');
				await page.waitForTimeout(500);
			}
		});

		test('should handle empty and whitespace-only inputs', async ({ page }) => {
			await page.goto('/');

			// Test completely empty input
			await page.locator('[data-testid="submit-topic-button"]').click();
			await expect(page.locator('[data-testid="title-required-error"]')).toBeVisible();

			// Test whitespace-only title
			await page.locator('[data-testid="topic-title-input"]').fill('   \t\n   ');
			await page.locator('[data-testid="submit-topic-button"]').click();
			await expect(page.locator('[data-testid="title-empty-error"]')).toBeVisible();

			// Test with valid title but whitespace-only description
			await page.locator('[data-testid="topic-title-input"]').fill('Valid Title');
			await page.locator('[data-testid="topic-description-input"]').fill('   \t\n   ');
			await page.locator('[data-testid="submit-topic-button"]').click();

			// Should either accept (trimming whitespace) or show appropriate error
			const successVisible = await page.locator('[data-testid="topic-success-message"]').isVisible();
			const errorVisible = await page.locator('[data-testid="description-empty-error"]').isVisible();

			expect(successVisible || errorVisible).toBe(true);
		});
	});

	test.describe('Concurrent User Edge Cases', () => {
		test('should handle rapid concurrent topic submissions', async ({ browser }) => {
			const pages = await multiUser.createUsers(10, browser);

			// All users submit topics simultaneously
			const submitPromises = pages.map(async (page, index) => {
				await page.goto('/');
				await page.waitForSelector('[data-testid="topic-submission-form"]');

				const topic = generateTestData.proposal();
				topic.title = `Concurrent Topic ${index + 1} - ${Date.now()}`;

				await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
				await page.locator('[data-testid="topic-description-input"]').fill(topic.description);

				// Random delay to simulate real user behavior
				await page.waitForTimeout(Math.random() * 1000);

				await page.locator('[data-testid="submit-topic-button"]').click();
				return topic.title;
			});

			const submittedTitles = await Promise.all(submitPromises);

			// Wait for all submissions to complete
			await pages[0].waitForTimeout(5000);

			// Verify all topics were created (no race conditions)
			const topicCards = pages[0].locator('[data-testid*="topic-card-"]');
			await expect(topicCards).toHaveCount(submittedTitles.length);

			// Verify each topic appears exactly once
			for (const title of submittedTitles) {
				const matchingCards = pages[0].locator(`[data-testid*="topic-card-${title}"]`);
				await expect(matchingCards).toHaveCount(1);
			}
		});

		test('should handle conflicting vote changes', async ({ browser }) => {
			const pages = await multiUser.createUsers(3, browser);

			// All users navigate to voting
			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid*="topic-card-"]');
			}

			const firstTopic = '[data-testid*="topic-card-"]:first-child';

			// User 1 votes first choice, User 2 votes second choice simultaneously
			await Promise.all([
				pages[0].locator(`${firstTopic} [data-testid="vote-first-choice"]`).click(),
				pages[1].locator(`${firstTopic} [data-testid="vote-second-choice"]`).click()
			]);

			// User 1 quickly changes to second choice while User 2 changes to first choice
			await Promise.all([
				pages[0].locator(`${firstTopic} [data-testid="vote-second-choice"]`).click(),
				pages[1].locator(`${firstTopic} [data-testid="vote-first-choice"]`).click()
			]);

			// Wait for resolution
			await pages[0].waitForTimeout(2000);

			// Verify final state is consistent across all clients
			const user1Vote = await pages[0].locator(`${firstTopic} [data-testid="user-vote-indicator"]`).textContent();
			const user2Vote = await pages[1].locator(`${firstTopic} [data-testid="user-vote-indicator"]`).textContent();

			// Each user should only have one active vote
			expect(user1Vote).toMatch(/^(🥇|🥈|🥉)$/);
			expect(user2Vote).toMatch(/^(🥇|🥈|🥉)$/);

			// Vote counts should be consistent
			const score1 = await pages[0].locator(`${firstTopic} [data-testid="topic-score"]`).textContent();
			const score2 = await pages[1].locator(`${firstTopic} [data-testid="topic-score"]`).textContent();
			expect(score1).toBe(score2);
		});

		test('should handle maximum participant limits', async ({ browser }) => {
			// Simulate reaching maximum participants
			const maxParticipants = 5; // Lower for testing
			const pages = await multiUser.createUsers(maxParticipants + 2, browser);

			// First N users should connect successfully
			for (let i = 0; i < maxParticipants; i++) {
				await pages[i].goto('/');
				await pages[i].waitForSelector('[data-testid="connection-status"]');
			}

			// Additional users should be handled gracefully
			await pages[maxParticipants].goto('/');

			// Should show appropriate message
			await expect(pages[maxParticipants].locator('[data-testid="event-full-message"]')).toBeVisible();
			await expect(pages[maxParticipants].locator('[data-testid="waiting-list-option"]')).toBeVisible();

			// User can join waiting list
			await pages[maxParticipants].locator('[data-testid="join-waiting-list"]').click();
			await expect(pages[maxParticipants].locator('[data-testid="waiting-list-confirmation"]')).toBeVisible();
		});

		test('should handle session conflicts and duplicate logins', async ({ browser }) => {
			// User logs in from one browser
			const context1 = await browser.newContext();
			const page1 = await context1.newPage();
			await page1.goto('/');
			await page1.waitForSelector('[data-testid="connection-status"]');

			const userId = await page1.evaluate(() => {
				// @ts-ignore
				return window.currentUser?.id || 'demo-user-001';
			});

			// Same user tries to log in from another browser
			const context2 = await browser.newContext();
			const page2 = await context2.newPage();

			// Simulate same user login
			await page2.goto('/');
			await page2.evaluate((id) => {
				// @ts-ignore
				localStorage.setItem('userId', id);
			}, userId);
			await page2.reload();

			// Should handle duplicate session appropriately
			const duplicateWarning = page1.locator('[data-testid="duplicate-session-warning"]');
			const sessionConflict = page2.locator('[data-testid="session-conflict-message"]');

			// Either warn existing session or new session
			const hasWarning = await duplicateWarning.isVisible();
			const hasConflict = await sessionConflict.isVisible();

			expect(hasWarning || hasConflict).toBe(true);

			await context1.close();
			await context2.close();
		});
	});

	test.describe('Resource Exhaustion and Limits', () => {
		test('should handle memory pressure gracefully', async ({ page }) => {
			await page.goto('/');

			// Create many topics to test memory handling
			for (let i = 0; i < 100; i++) {
				const topic = generateTestData.proposal();
				topic.title = `Memory Test Topic ${i}`;

				await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
				await page.locator('[data-testid="submit-topic-button"]').click();

				// Don't wait for each one to complete to simulate rapid creation
				if (i % 10 === 0) {
					await page.waitForTimeout(100); // Brief pause every 10 items
				}
			}

			// Should implement some form of pagination or limiting
			const visibleTopics = page.locator('[data-testid*="topic-card-"]');
			const topicCount = await visibleTopics.count();

			// Should not render all 100 at once (memory optimization)
			expect(topicCount).toBeLessThanOrEqual(50);

			// Should have pagination or load more functionality
			const loadMore = page.locator('[data-testid="load-more-topics"]');
			const pagination = page.locator('[data-testid="topic-pagination"]');

			expect(await loadMore.isVisible() || await pagination.isVisible()).toBe(true);
		});

		test('should enforce rate limiting on API calls', async ({ page }) => {
			await page.goto('/');

			// Rapidly submit many requests
			const rapidSubmissions = Array.from({ length: 20 }, (_, i) => {
				return async () => {
					await page.locator('[data-testid="topic-title-input"]').fill(`Rapid Topic ${i}`);
					await page.locator('[data-testid="submit-topic-button"]').click();
				};
			});

			// Execute all submissions rapidly
			await Promise.all(rapidSubmissions.map(fn => fn()));

			// Should show rate limiting message
			await expect(page.locator('[data-testid="rate-limit-warning"]')).toBeVisible();

			// Some submissions should be queued or rejected
			const queuedCount = await page.locator('[data-testid="queued-submissions"]').textContent();
			expect(parseInt(queuedCount || '0')).toBeGreaterThan(0);
		});

		test('should handle storage quota exceeded', async ({ page }) => {
			await page.goto('/');

			// Simulate localStorage quota exceeded
			await page.evaluate(() => {
				try {
					// Fill localStorage to capacity
					let data = 'x'.repeat(1024 * 1024); // 1MB string
					for (let i = 0; i < 10; i++) {
						localStorage.setItem(`large_data_${i}`, data);
					}
				} catch (e) {
					console.log('Storage quota exceeded (expected)');
				}
			});

			// Try to save user preferences
			await page.locator('[data-testid="user-preferences"]').click();
			await page.locator('[data-testid="save-preferences"]').click();

			// Should handle storage error gracefully
			await expect(page.locator('[data-testid="storage-error-message"]')).toBeVisible();
			await expect(page.locator('[data-testid="clear-cache-option"]')).toBeVisible();
		});
	});

	test.describe('Browser Compatibility Edge Cases', () => {
		test('should handle browser tab visibility changes', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('[data-testid="connection-status"]');

			// Simulate tab becoming hidden
			await page.evaluate(() => {
				Object.defineProperty(document, 'visibilityState', {
					writable: true,
					value: 'hidden'
				});
				document.dispatchEvent(new Event('visibilitychange'));
			});

			// Should reduce activity or pause updates
			await page.waitForTimeout(1000);

			// Simulate tab becoming visible again
			await page.evaluate(() => {
				Object.defineProperty(document, 'visibilityState', {
					writable: true,
					value: 'visible'
				});
				document.dispatchEvent(new Event('visibilitychange'));
			});

			// Should resume full functionality
			await page.waitForTimeout(1000);

			// Connection should still be active
			await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
		});

		test('should handle page refresh during operations', async ({ page }) => {
			await page.goto('/');

			// Start submitting a topic
			await page.locator('[data-testid="topic-title-input"]').fill('Topic Before Refresh');
			await page.locator('[data-testid="topic-description-input"]').fill('This will be refreshed');

			// Refresh page mid-operation
			await page.reload();
			await page.waitForSelector('[data-testid="topic-submission-form"]');

			// Should handle gracefully - either save draft or clear form
			const titleValue = await page.locator('[data-testid="topic-title-input"]').inputValue();
			const hasDraftNotice = await page.locator('[data-testid="draft-restored-notice"]').isVisible();

			// Either form is cleared or draft is restored
			expect(titleValue === '' || hasDraftNotice).toBe(true);
		});

		test('should handle browser back/forward navigation', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('[data-testid="current-activity"]');

			// Change activity state
			await page.locator('[data-testid="activity-selector"]').selectOption('teams');
			await page.waitForTimeout(500);

			// Use browser back button
			await page.goBack();

			// Should handle state changes appropriately
			await page.waitForTimeout(1000);

			// Forward button
			await page.goForward();

			// Should maintain consistent state
			await expect(page.locator('[data-testid="current-activity"]')).toBeVisible();
		});
	});

	test.describe('Error Recovery and Resilience', () => {
		test('should recover from WebSocket connection drops', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('[data-testid="connection-status"]');

			// Verify initial connection
			await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

			// Simulate WebSocket disconnect
			await page.evaluate(() => {
				// @ts-ignore
				if (window.socketClient) {
					window.socketClient.disconnect();
				}
			});

			// Should detect disconnection
			await page.waitForFunction(
				() => document.querySelector('[data-testid="connection-status"]')?.textContent?.includes('Disconnected'),
				undefined,
				{ timeout: 10000 }
			);

			// Should attempt reconnection
			await page.waitForFunction(
				() => document.querySelector('[data-testid="connection-status"]')?.textContent?.includes('Reconnecting'),
				undefined,
				{ timeout: 5000 }
			);

			// Should eventually reconnect
			await page.waitForFunction(
				() => document.querySelector('[data-testid="connection-status"]')?.textContent?.includes('Connected'),
				undefined,
				{ timeout: 20000 }
			);
		});

		test('should provide meaningful error messages for different failure types', async ({ page }) => {
			await page.goto('/');

			// Test authentication errors
			await page.route('**/api/auth/**', route =>
				route.fulfill({ status: 401, body: 'Unauthorized' })
			);

			await page.locator('[data-testid="topic-title-input"]').fill('Auth Test Topic');
			await page.locator('[data-testid="submit-topic-button"]').click();

			await expect(page.locator('[data-testid="auth-error-message"]')).toBeVisible();
			await expect(page.locator('[data-testid="auth-error-message"]')).toContainText('authentication');

			// Test validation errors
			await page.unroute('**/api/auth/**');
			await page.route('**/api/topics**', route =>
				route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'Title too short' })
				})
			);

			await page.locator('[data-testid="submit-topic-button"]').click();

			await expect(page.locator('[data-testid="validation-error-message"]')).toBeVisible();
			await expect(page.locator('[data-testid="validation-error-message"]')).toContainText('Title too short');

			// Test server errors
			await page.route('**/api/topics**', route =>
				route.fulfill({ status: 500, body: 'Internal Server Error' })
			);

			await page.locator('[data-testid="submit-topic-button"]').click();

			await expect(page.locator('[data-testid="server-error-message"]')).toBeVisible();
			await expect(page.locator('[data-testid="server-error-message"]')).toContainText('server error');
		});

		test('should maintain application state during error conditions', async ({ page }) => {
			await page.goto('/');

			// Submit some topics first
			const topics = ['Topic 1', 'Topic 2', 'Topic 3'];
			for (const topic of topics) {
				await page.locator('[data-testid="topic-title-input"]').fill(topic);
				await page.locator('[data-testid="submit-topic-button"]').click();
				await page.waitForSelector(`[data-testid*="topic-card-${topic}"]`);
			}

			// Cause a network error
			await page.route('**/api/**', route => route.abort());

			// Try to submit another topic (should fail)
			await page.locator('[data-testid="topic-title-input"]').fill('Failed Topic');
			await page.locator('[data-testid="submit-topic-button"]').click();

			// Should show error but maintain existing topics
			await expect(page.locator('[data-testid*="topic-card-"]')).toHaveCount(3);

			// Restore network
			await page.unroute('**/api/**');

			// Should be able to continue normally
			await page.locator('[data-testid="topic-title-input"]').fill('Recovery Topic');
			await page.locator('[data-testid="submit-topic-button"]').click();

			await expect(page.locator('[data-testid*="topic-card-"]')).toHaveCount(4);
		});
	});
});