import { test, expect } from '@playwright/test';
import { generateTestData, MultiUserHelpers } from '../utils/test-helpers';

test.describe('Real-time Integration and Synchronization', () => {
	let multiUser: MultiUserHelpers;

	test.beforeAll(async ({ browser }) => {
		multiUser = new MultiUserHelpers();
	});

	test.afterAll(async () => {
		await multiUser.cleanupUsers();
	});

	test.describe('Cross-Component Synchronization', () => {
		test('should synchronize data changes across all real-time components', async ({ browser }) => {
			const pages = await multiUser.createUsers(4, browser);

			// All users connect and verify initial state
			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="connection-status"]');
				await page.waitForFunction(
					() => document.querySelector('[data-testid="connection-status"]')?.textContent?.includes('Connected')
				);
			}

			// User 1 submits a topic
			const topic = generateTestData.proposal();
			await pages[0].locator('[data-testid="topic-title-input"]').fill(topic.title);
			await pages[0].locator('[data-testid="topic-description-input"]').fill(topic.description);
			await pages[0].locator('[data-testid="submit-topic-button"]').click();

			// All users should see the new topic in real-time
			for (let i = 1; i < pages.length; i++) {
				await pages[i].waitForSelector(`[data-testid*="topic-card-${topic.title}"]`, { timeout: 10000 });
			}

			// User 2 votes on the topic
			await pages[1].locator(`[data-testid*="topic-card-${topic.title}"] [data-testid="vote-first-choice"]`).click();

			// All users should see vote count update in real-time
			for (const page of pages) {
				await page.waitForFunction(
					(title) => {
						const scoreElement = document.querySelector(`[data-testid*="topic-card-${title}"] [data-testid="topic-score"]`);
						return scoreElement && parseInt(scoreElement.textContent || '0') >= 3;
					},
					topic.title,
					{ timeout: 8000 }
				);
			}

			// User 3 changes activity to teams
			await pages[2].locator('[data-testid="activity-selector"]').selectOption('teams');

			// All users should see activity change
			for (const page of pages) {
				await page.waitForFunction(
					() => document.querySelector('[data-testid="current-activity"]')?.textContent?.includes('teams'),
					undefined,
					{ timeout: 8000 }
				);
			}

			// Verify participant count is synchronized
			for (const page of pages) {
				await page.waitForFunction(
					() => {
						const countElement = document.querySelector('[data-testid="participant-count"]');
						return countElement && parseInt(countElement.textContent || '0') === 4;
					},
					undefined,
					{ timeout: 5000 }
				);
			}
		});

		test('should maintain synchronization during rapid state changes', async ({ browser }) => {
			const pages = await multiUser.createUsers(5, browser);

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="connection-status"]');
			}

			// Rapid topic submissions from multiple users
			const submitPromises = pages.map(async (page, index) => {
				for (let i = 0; i < 3; i++) {
					const topic = generateTestData.proposal();
					topic.title = `Rapid Topic ${index}-${i}`;

					await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
					await page.locator('[data-testid="submit-topic-button"]').click();
					await page.waitForTimeout(Math.random() * 500); // Random delay
				}
			});

			await Promise.all(submitPromises);

			// Wait for all updates to propagate
			await pages[0].waitForTimeout(3000);

			// All users should see the same number of topics
			let topicCounts = [];
			for (const page of pages) {
				const count = await page.locator('[data-testid*="topic-card-"]').count();
				topicCounts.push(count);
			}

			// All counts should be equal
			const expectedCount = topicCounts[0];
			for (const count of topicCounts) {
				expect(count).toBe(expectedCount);
			}

			// Verify no duplicate topics exist
			const topicTitles = new Set();
			const allTopics = await pages[0].locator('[data-testid*="topic-card-"] [data-testid="topic-title"]').all();
			for (const topic of allTopics) {
				const title = await topic.textContent();
				expect(topicTitles.has(title)).toBe(false);
				topicTitles.add(title);
			}
		});

		test('should handle out-of-order message delivery gracefully', async ({ browser }) => {
			const pages = await multiUser.createUsers(3, browser);

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="connection-status"]');
			}

			// Simulate out-of-order messages by intercepting WebSocket
			await pages[1].route('**/socket.io/**', async route => {
				const response = await route.fetch();
				const body = await response.text();

				// Introduce small delays to simulate network reordering
				if (body.includes('topic_update')) {
					await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
				}

				route.fulfill({
					status: response.status(),
					headers: response.headers(),
					body: body
				});
			});

			// Rapid sequence of related operations
			const topic = generateTestData.proposal();

			// User 1: Submit topic
			await pages[0].locator('[data-testid="topic-title-input"]').fill(topic.title);
			await pages[0].locator('[data-testid="submit-topic-button"]').click();

			// User 2: Vote immediately
			await pages[1].waitForSelector(`[data-testid*="topic-card-${topic.title}"]`, { timeout: 10000 });
			await pages[1].locator(`[data-testid*="topic-card-${topic.title}"] [data-testid="vote-first-choice"]`).click();

			// User 1: Edit topic immediately
			await pages[0].locator(`[data-testid*="topic-card-${topic.title}"] [data-testid="edit-topic-button"]`).click();
			await pages[0].locator('[data-testid="edit-title-input"]').fill(topic.title + ' (Edited)');
			await pages[0].locator('[data-testid="save-topic-button"]').click();

			// Wait for all operations to settle
			await pages[0].waitForTimeout(5000);

			// Verify final state is consistent across all clients
			for (const page of pages) {
				await expect(page.locator(`[data-testid*="topic-card-${topic.title} (Edited)"]`)).toBeVisible();
				const voteScore = await page.locator(`[data-testid*="topic-card-"] [data-testid="topic-score"]`).first().textContent();
				expect(parseInt(voteScore || '0')).toBe(3);
			}
		});
	});

	test.describe('State Consistency Under Load', () => {
		test('should maintain consistency with many concurrent users', async ({ browser }) => {
			const userCount = 15;
			const pages = await multiUser.createUsers(userCount, browser);

			// Stagger user connections to simulate real-world scenario
			for (let i = 0; i < pages.length; i++) {
				await pages[i].goto('/');
				await pages[i].waitForSelector('[data-testid="connection-status"]');
				if (i % 3 === 0) await pages[i].waitForTimeout(500); // Brief pause every 3rd user
			}

			// Verify all users see the same participant count
			for (const page of pages) {
				await page.waitForFunction(
					(expected) => {
						const countElement = document.querySelector('[data-testid="participant-count"]');
						return countElement && parseInt(countElement.textContent || '0') >= expected;
					},
					userCount,
					{ timeout: 15000 }
				);
			}

			// Mixed operations from different users
			const operations = [
				// Topic submissions
				...Array.from({ length: 5 }, (_, i) => ({
					type: 'submit',
					user: i % pages.length,
					data: { title: `Load Test Topic ${i}`, description: `Topic ${i} description` }
				})),
				// Voting operations
				...Array.from({ length: 10 }, (_, i) => ({
					type: 'vote',
					user: (i + 5) % pages.length,
					data: { topicIndex: i % 5, choice: ['first', 'second', 'third'][i % 3] }
				})),
				// Activity changes
				...Array.from({ length: 3 }, (_, i) => ({
					type: 'activity',
					user: (i + 10) % pages.length,
					data: { activity: ['voting', 'teams', 'discussion'][i] }
				}))
			];

			// Execute operations concurrently with random delays
			const operationPromises = operations.map(async (op, index) => {
				await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));

				const page = pages[op.user];

				switch (op.type) {
					case 'submit':
						await page.locator('[data-testid="topic-title-input"]').fill(op.data.title);
						await page.locator('[data-testid="topic-description-input"]').fill(op.data.description);
						await page.locator('[data-testid="submit-topic-button"]').click();
						break;

					case 'vote':
						const topicSelector = `[data-testid*="topic-card-"]:nth-child(${op.data.topicIndex + 1})`;
						await page.waitForSelector(topicSelector, { timeout: 10000 });
						await page.locator(`${topicSelector} [data-testid="vote-${op.data.choice}-choice"]`).click();
						break;

					case 'activity':
						await page.locator('[data-testid="activity-selector"]').selectOption(op.data.activity);
						break;
				}
			});

			await Promise.all(operationPromises);

			// Wait for all operations to settle
			await pages[0].waitForTimeout(5000);

			// Verify consistency across all clients
			const firstPageState = {
				topicCount: await pages[0].locator('[data-testid*="topic-card-"]').count(),
				currentActivity: await pages[0].locator('[data-testid="current-activity"]').textContent(),
				participantCount: await pages[0].locator('[data-testid="participant-count"]').textContent()
			};

			for (let i = 1; i < pages.length; i++) {
				const pageState = {
					topicCount: await pages[i].locator('[data-testid*="topic-card-"]').count(),
					currentActivity: await pages[i].locator('[data-testid="current-activity"]').textContent(),
					participantCount: await pages[i].locator('[data-testid="participant-count"]').textContent()
				};

				expect(pageState.topicCount).toBe(firstPageState.topicCount);
				expect(pageState.currentActivity).toBe(firstPageState.currentActivity);
				expect(pageState.participantCount).toBe(firstPageState.participantCount);
			}
		});

		test('should handle burst traffic without data loss', async ({ browser }) => {
			const pages = await multiUser.createUsers(8, browser);

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="connection-status"]');
			}

			// Create burst of simultaneous operations
			const burstSize = 20;
			const burstPromises = Array.from({ length: burstSize }, async (_, i) => {
				const page = pages[i % pages.length];
				const topic = generateTestData.proposal();
				topic.title = `Burst Topic ${i}`;

				await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
				await page.locator('[data-testid="submit-topic-button"]').click();

				return topic.title;
			});

			const submittedTitles = await Promise.all(burstPromises);

			// Wait for all operations to complete
			await pages[0].waitForTimeout(10000);

			// Verify no data was lost
			const allTopics = await pages[0].locator('[data-testid*="topic-card-"] [data-testid="topic-title"]').all();
			const displayedTitles = new Set();

			for (const topic of allTopics) {
				const title = await topic.textContent();
				displayedTitles.add(title);
			}

			// All submitted topics should be present
			for (const title of submittedTitles) {
				expect(displayedTitles.has(title)).toBe(true);
			}

			// No duplicates should exist
			expect(displayedTitles.size).toBe(submittedTitles.length);
		});
	});

	test.describe('Recovery and Resilience', () => {
		test('should recover synchronization after network interruption', async ({ browser }) => {
			const pages = await multiUser.createUsers(3, browser);

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="connection-status"]');
			}

			// Submit initial topics
			const initialTopics = ['Topic A', 'Topic B'];
			for (const topic of initialTopics) {
				await pages[0].locator('[data-testid="topic-title-input"]').fill(topic);
				await pages[0].locator('[data-testid="submit-topic-button"]').click();
				await pages[1].waitForSelector(`[data-testid*="topic-card-${topic}"]`);
			}

			// Simulate network interruption for one user
			await pages[1].context().setOffline(true);

			// User 1 and 3 continue working while User 2 is offline
			await pages[0].locator('[data-testid="topic-title-input"]').fill('Offline Topic 1');
			await pages[0].locator('[data-testid="submit-topic-button"]').click();

			await pages[2].locator(`[data-testid*="topic-card-Topic A"] [data-testid="vote-first-choice"]`).click();

			// Restore User 2's connection
			await pages[1].context().setOffline(false);

			// User 2 should catch up with all changes
			await pages[1].waitForSelector('[data-testid*="topic-card-Offline Topic 1"]', { timeout: 15000 });

			// Verify vote state is synchronized
			await pages[1].waitForFunction(
				() => {
					const scoreElement = document.querySelector('[data-testid*="topic-card-Topic A"] [data-testid="topic-score"]');
					return scoreElement && parseInt(scoreElement.textContent || '0') >= 3;
				},
				undefined,
				{ timeout: 10000 }
			);

			// All users should now have consistent state
			for (const page of pages) {
				const topicCount = await page.locator('[data-testid*="topic-card-"]').count();
				expect(topicCount).toBe(3); // Initial 2 + 1 added while offline
			}
		});

		test('should handle partial sync failures and retry', async ({ browser }) => {
			const pages = await multiUser.createUsers(3, browser);

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="connection-status"]');
			}

			// Simulate intermittent sync failures
			let failureCount = 0;
			await pages[1].route('**/socket.io/**', route => {
				failureCount++;
				if (failureCount % 3 === 0) {
					// Fail every 3rd sync request
					route.abort();
				} else {
					route.continue();
				}
			});

			// Generate multiple state changes
			const topics = ['Sync Test 1', 'Sync Test 2', 'Sync Test 3', 'Sync Test 4'];
			for (const topic of topics) {
				await pages[0].locator('[data-testid="topic-title-input"]').fill(topic);
				await pages[0].locator('[data-testid="submit-topic-button"]').click();
				await pages[0].waitForTimeout(1000);
			}

			// Despite failures, User 2 should eventually see all topics
			await pages[1].waitForFunction(
				(expectedCount) => {
					const topicElements = document.querySelectorAll('[data-testid*="topic-card-"]');
					return topicElements.length >= expectedCount;
				},
				topics.length,
				{ timeout: 20000 }
			);

			// Verify all topics are present
			for (const topic of topics) {
				await expect(pages[1].locator(`[data-testid*="topic-card-${topic}"]`)).toBeVisible();
			}
		});

		test('should handle conflicting concurrent edits', async ({ browser }) => {
			const pages = await multiUser.createUsers(3, browser);

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="connection-status"]');
			}

			// Create a topic
			const topic = generateTestData.proposal();
			await pages[0].locator('[data-testid="topic-title-input"]').fill(topic.title);
			await pages[0].locator('[data-testid="submit-topic-button"]').click();

			// Wait for topic to appear on all clients
			for (const page of pages.slice(1)) {
				await page.waitForSelector(`[data-testid*="topic-card-${topic.title}"]`);
			}

			// Two users try to edit simultaneously
			const editPromises = [
				(async () => {
					await pages[0].locator(`[data-testid*="topic-card-${topic.title}"] [data-testid="edit-topic-button"]`).click();
					await pages[0].locator('[data-testid="edit-title-input"]').fill(topic.title + ' - Edit 1');
					await pages[0].locator('[data-testid="save-topic-button"]').click();
				})(),
				(async () => {
					await pages[1].locator(`[data-testid*="topic-card-${topic.title}"] [data-testid="edit-topic-button"]`).click();
					await pages[1].locator('[data-testid="edit-title-input"]').fill(topic.title + ' - Edit 2');
					await pages[1].locator('[data-testid="save-topic-button"]').click();
				})()
			];

			await Promise.all(editPromises);

			// Wait for conflict resolution
			await pages[0].waitForTimeout(3000);

			// System should handle conflict - either:
			// 1. Last write wins
			// 2. Show conflict resolution UI
			// 3. Merge changes intelligently

			const conflictNotice = pages[0].locator('[data-testid="edit-conflict-notice"]');
			const hasConflictUI = await conflictNotice.isVisible();

			if (hasConflictUI) {
				// If conflict UI is shown, resolve it
				await pages[0].locator('[data-testid="resolve-conflict-button"]').click();
			}

			// All users should see consistent final state
			await pages[0].waitForTimeout(2000);

			const finalTitles = [];
			for (const page of pages) {
				const titleElement = await page.locator('[data-testid*="topic-card-"] [data-testid="topic-title"]').first().textContent();
				finalTitles.push(titleElement);
			}

			// All titles should be the same
			for (let i = 1; i < finalTitles.length; i++) {
				expect(finalTitles[i]).toBe(finalTitles[0]);
			}
		});
	});

	test.describe('Performance Under Real-time Load', () => {
		test('should maintain low latency with high message frequency', async ({ browser }) => {
			const pages = await multiUser.createUsers(6, browser);

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="connection-status"]');
			}

			// Enable latency tracking
			await pages[0].locator('[data-testid="enable-latency-tracking"]').check();

			// Generate high frequency of updates
			const updatePromises = Array.from({ length: 50 }, async (_, i) => {
				const page = pages[i % pages.length];
				const topic = generateTestData.proposal();
				topic.title = `Latency Test ${i}`;

				const startTime = Date.now();
				await page.locator('[data-testid="topic-title-input"]').fill(topic.title);
				await page.locator('[data-testid="submit-topic-button"]').click();

				// Wait for update to appear on a different client
				const otherPage = pages[(i + 1) % pages.length];
				await otherPage.waitForSelector(`[data-testid*="topic-card-${topic.title}"]`, { timeout: 10000 });

				return Date.now() - startTime;
			});

			const latencies = await Promise.all(updatePromises);

			// Average latency should be reasonable (< 2 seconds)
			const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
			expect(avgLatency).toBeLessThan(2000);

			// 95% of updates should be under 3 seconds
			const sortedLatencies = latencies.sort((a, b) => a - b);
			const p95Index = Math.floor(sortedLatencies.length * 0.95);
			expect(sortedLatencies[p95Index]).toBeLessThan(3000);
		});

		test('should handle memory efficiently during long sessions', async ({ browser }) => {
			const pages = await multiUser.createUsers(4, browser);

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="connection-status"]');
			}

			// Enable memory monitoring
			await pages[0].locator('[data-testid="enable-memory-monitoring"]').check();

			// Simulate long session with many operations
			for (let round = 0; round < 10; round++) {
				// Submit multiple topics
				for (let i = 0; i < 5; i++) {
					const topic = `Round ${round} Topic ${i}`;
					await pages[i % pages.length].locator('[data-testid="topic-title-input"]').fill(topic);
					await pages[i % pages.length].locator('[data-testid="submit-topic-button"]').click();
				}

				// Vote on topics
				const topicCards = pages[0].locator('[data-testid*="topic-card-"]');
				const count = await topicCards.count();
				if (count > 0) {
					const randomTopicIndex = Math.floor(Math.random() * Math.min(count, 5));
					const choices = ['first', 'second', 'third'];
					const randomChoice = choices[Math.floor(Math.random() * choices.length)];

					await pages[round % pages.length]
						.locator(`[data-testid*="topic-card-"]:nth-child(${randomTopicIndex + 1}) [data-testid="vote-${randomChoice}-choice"]`)
						.click();
				}

				// Check memory usage periodically
				if (round % 3 === 0) {
					const memoryUsage = await pages[0].locator('[data-testid="memory-usage"]').textContent();
					const memoryMB = parseFloat(memoryUsage?.replace('MB', '') || '0');

					// Memory should not grow excessively
					expect(memoryMB).toBeLessThan(150);
				}

				await pages[0].waitForTimeout(1000);
			}
		});

		test('should scale WebSocket connections efficiently', async ({ browser }) => {
			// Test with increasing number of connections
			const connectionBatches = [3, 6, 10];

			for (const batchSize of connectionBatches) {
				const pages = await multiUser.createUsers(batchSize, browser);

				const connectionTimes = [];
				for (const page of pages) {
					const startTime = Date.now();
					await page.goto('/');
					await page.waitForSelector('[data-testid="connection-status"]');
					await page.waitForFunction(
						() => document.querySelector('[data-testid="connection-status"]')?.textContent?.includes('Connected'),
						undefined,
						{ timeout: 15000 }
					);
					connectionTimes.push(Date.now() - startTime);
				}

				// Connection time should not increase dramatically with more users
				const avgConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
				expect(avgConnectionTime).toBeLessThan(5000); // 5 seconds max

				// Test message broadcasting performance
				const broadcastStartTime = Date.now();
				const topic = `Scale Test ${batchSize} Users`;
				await pages[0].locator('[data-testid="topic-title-input"]').fill(topic);
				await pages[0].locator('[data-testid="submit-topic-button"]').click();

				// Wait for all users to receive the update
				await Promise.all(
					pages.slice(1).map(page =>
						page.waitForSelector(`[data-testid*="topic-card-${topic}"]`, { timeout: 10000 })
					)
				);

				const broadcastTime = Date.now() - broadcastStartTime;
				expect(broadcastTime).toBeLessThan(3000); // Should scale well

				// Clean up this batch
				await multiUser.cleanupUsers();
			}
		});
	});

	test.describe('Cross-Browser Synchronization', () => {
		test('should synchronize across different browser contexts', async ({ browser }) => {
			// Create contexts simulating different browsers/devices
			const contexts = await Promise.all([
				browser.newContext({ userAgent: 'Desktop Chrome' }),
				browser.newContext({ userAgent: 'Mobile Safari' }),
				browser.newContext({ userAgent: 'Desktop Firefox' })
			]);

			const pages = await Promise.all(contexts.map(context => context.newPage()));

			try {
				// All "browsers" connect
				for (const page of pages) {
					await page.goto('/');
					await page.waitForSelector('[data-testid="connection-status"]');
				}

				// Cross-browser topic submission
				const topics = ['Chrome Topic', 'Safari Topic', 'Firefox Topic'];
				for (let i = 0; i < topics.length; i++) {
					await pages[i].locator('[data-testid="topic-title-input"]').fill(topics[i]);
					await pages[i].locator('[data-testid="submit-topic-button"]').click();
				}

				// All browsers should see all topics
				for (const page of pages) {
					for (const topic of topics) {
						await page.waitForSelector(`[data-testid*="topic-card-${topic}"]`, { timeout: 10000 });
					}
				}

				// Cross-browser voting
				await pages[0].locator('[data-testid*="topic-card-Safari Topic"] [data-testid="vote-first-choice"]').click();
				await pages[1].locator('[data-testid*="topic-card-Firefox Topic"] [data-testid="vote-second-choice"]').click();
				await pages[2].locator('[data-testid*="topic-card-Chrome Topic"] [data-testid="vote-third-choice"]').click();

				// Verify vote synchronization across all browsers
				for (const page of pages) {
					await page.waitForFunction(
						() => {
							const safariScore = document.querySelector('[data-testid*="topic-card-Safari Topic"] [data-testid="topic-score"]');
							const firefoxScore = document.querySelector('[data-testid*="topic-card-Firefox Topic"] [data-testid="topic-score"]');
							const chromeScore = document.querySelector('[data-testid*="topic-card-Chrome Topic"] [data-testid="topic-score"]');

							return safariScore?.textContent === '3' &&
								firefoxScore?.textContent === '2' &&
								chromeScore?.textContent === '1';
						},
						undefined,
						{ timeout: 10000 }
					);
				}

			} finally {
				// Clean up contexts
				for (const context of contexts) {
					await context.close();
				}
			}
		});

		test('should handle browser-specific WebSocket implementations', async ({ browser }) => {
			const pages = await multiUser.createUsers(2, browser);

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="connection-status"]');
			}

			// Test different WebSocket features/edge cases
			// Simulate connection with different protocols
			await pages[0].evaluate(() => {
				// @ts-ignore
				if (window.socketClient) {
					window.socketClient.io.opts.transports = ['websocket'];
				}
			});

			await pages[1].evaluate(() => {
				// @ts-ignore
				if (window.socketClient) {
					window.socketClient.io.opts.transports = ['polling', 'websocket'];
				}
			});

			// Both should maintain sync despite different transport methods
			const topic = generateTestData.proposal();
			await pages[0].locator('[data-testid="topic-title-input"]').fill(topic.title);
			await pages[0].locator('[data-testid="submit-topic-button"]').click();

			await pages[1].waitForSelector(`[data-testid*="topic-card-${topic.title}"]`, { timeout: 10000 });

			// Verify both connections remain stable
			for (const page of pages) {
				await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
			}
		});
	});
});