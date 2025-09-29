import { test, expect } from '@playwright/test';
import { MultiUserHelpers } from '../utils/test-helpers';

test.describe('Platform Health Monitoring', () => {
	let multiUser: MultiUserHelpers;

	test.beforeAll(async ({ browser }) => {
		multiUser = new MultiUserHelpers();
	});

	test.afterAll(async () => {
		await multiUser.cleanupUsers();
	});

	test.describe('Connection Health', () => {
		test('should monitor WebSocket connection status', async ({ page }) => {
			await page.goto('/');

			// Verify connection status indicator is visible
			await expect(page.locator('[data-testid="connection-status"]')).toBeVisible();

			// Should show connected state initially
			await page.waitForFunction(
				() => document.querySelector('[data-testid="connection-status"]')?.textContent?.includes('Connected'),
				undefined,
				{ timeout: 10000 }
			);

			// Verify connection health details
			await page.locator('[data-testid="connection-details"]').click();
			await expect(page.locator('[data-testid="connection-latency"]')).toBeVisible();
			await expect(page.locator('[data-testid="connection-uptime"]')).toBeVisible();
		});

		test('should detect and report connection issues', async ({ page }) => {
			await page.goto('/');

			// Wait for initial connection
			await page.waitForSelector('[data-testid="connection-status"]');

			// Simulate network interruption
			await page.context().setOffline(true);

			// Should detect disconnection
			await page.waitForFunction(
				() => document.querySelector('[data-testid="connection-status"]')?.textContent?.includes('Disconnected'),
				undefined,
				{ timeout: 10000 }
			);

			// Should show connection health warning
			await expect(page.locator('[data-testid="connection-warning"]')).toBeVisible();

			// Restore connection
			await page.context().setOffline(false);

			// Should auto-reconnect
			await page.waitForFunction(
				() => document.querySelector('[data-testid="connection-status"]')?.textContent?.includes('Connected'),
				undefined,
				{ timeout: 15000 }
			);
		});

		test('should track connection quality metrics', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('[data-testid="connection-status"]');

			// Open connection metrics dashboard
			await page.locator('[data-testid="health-dashboard"]').click();

			// Verify metrics are being tracked
			await expect(page.locator('[data-testid="metrics-latency"]')).toBeVisible();
			await expect(page.locator('[data-testid="metrics-packet-loss"]')).toBeVisible();
			await expect(page.locator('[data-testid="metrics-reconnections"]')).toBeVisible();

			// Latency should be reasonable (< 1000ms)
			const latencyText = await page.locator('[data-testid="metrics-latency-value"]').textContent();
			const latency = parseInt(latencyText?.replace('ms', '') || '0');
			expect(latency).toBeLessThan(1000);
		});

		test('should handle multiple reconnection attempts', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('[data-testid="connection-status"]');

			// Simulate repeated connection failures
			let reconnectAttempts = 0;
			await page.route('**/socket.io/**', route => {
				reconnectAttempts++;
				if (reconnectAttempts < 3) {
					route.abort();
				} else {
					route.continue();
				}
			});

			// Force reconnection
			await page.evaluate(() => {
				// @ts-ignore
				if (window.socketClient) window.socketClient.disconnect();
			});

			// Should show reconnecting status
			await expect(page.locator('[data-testid="connection-status"]')).toContainText('Reconnecting');

			// Should eventually succeed
			await page.waitForFunction(
				() => document.querySelector('[data-testid="connection-status"]')?.textContent?.includes('Connected'),
				undefined,
				{ timeout: 20000 }
			);

			// Should track reconnection attempts
			await page.locator('[data-testid="health-dashboard"]').click();
			const reconnectCount = await page.locator('[data-testid="metrics-reconnections"]').textContent();
			expect(parseInt(reconnectCount || '0')).toBeGreaterThan(0);
		});
	});

	test.describe('Performance Monitoring', () => {
		test('should monitor page load performance', async ({ page }) => {
			const startTime = Date.now();
			await page.goto('/');

			// Wait for page to be fully loaded
			await page.waitForSelector('[data-testid="topic-submission-form"]');
			const loadTime = Date.now() - startTime;

			// Page should load within 5 seconds
			expect(loadTime).toBeLessThan(5000);

			// Check performance metrics
			await page.locator('[data-testid="performance-metrics"]').click();
			await expect(page.locator('[data-testid="load-time"]')).toBeVisible();

			const performanceLoadTime = await page.locator('[data-testid="load-time-value"]').textContent();
			expect(parseInt(performanceLoadTime?.replace('ms', '') || '0')).toBeLessThan(5000);
		});

		test('should track real-time update performance', async ({ browser }) => {
			const pages = await multiUser.createUsers(2, browser);
			const [user1, user2] = pages;

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="connection-status"]');
			}

			// Enable performance tracking
			await user2.locator('[data-testid="enable-performance-tracking"]').check();

			// User 1 submits a topic
			const startTime = Date.now();
			await user1.locator('[data-testid="topic-title-input"]').fill('Performance Test Topic');
			await user1.locator('[data-testid="submit-topic-button"]').click();

			// Wait for real-time update on user 2
			await user2.waitForSelector('[data-testid*="topic-card-Performance Test Topic"]');
			const updateTime = Date.now() - startTime;

			// Real-time update should be fast (< 2 seconds)
			expect(updateTime).toBeLessThan(2000);

			// Check update latency in metrics
			await user2.locator('[data-testid="performance-metrics"]').click();
			const updateLatency = await user2.locator('[data-testid="update-latency"]').textContent();
			expect(parseInt(updateLatency?.replace('ms', '') || '0')).toBeLessThan(1000);
		});

		test('should monitor memory usage over time', async ({ page }) => {
			await page.goto('/');

			// Enable memory monitoring
			await page.locator('[data-testid="health-dashboard"]').click();
			await page.locator('[data-testid="enable-memory-monitoring"]').check();

			// Simulate memory-intensive operations
			for (let i = 0; i < 10; i++) {
				await page.locator('[data-testid="topic-title-input"]').fill(`Test Topic ${i}`);
				await page.locator('[data-testid="submit-topic-button"]').click();
				await page.waitForTimeout(100);
			}

			// Check memory metrics
			const memoryUsage = await page.locator('[data-testid="memory-usage"]').textContent();
			const memoryMB = parseFloat(memoryUsage?.replace('MB', '') || '0');

			// Memory usage should be reasonable (< 100MB for test)
			expect(memoryMB).toBeLessThan(100);

			// Should show memory trend
			await expect(page.locator('[data-testid="memory-chart"]')).toBeVisible();
		});

		test('should detect performance degradation', async ({ page }) => {
			await page.goto('/');

			// Enable performance alerts
			await page.locator('[data-testid="health-dashboard"]').click();
			await page.locator('[data-testid="enable-performance-alerts"]').check();
			await page.locator('[data-testid="performance-threshold"]').fill('2000'); // 2 second threshold

			// Simulate slow operation
			await page.route('**/api/topics**', async route => {
				await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
				await route.continue();
			});

			await page.locator('[data-testid="topic-title-input"]').fill('Slow Topic');
			await page.locator('[data-testid="submit-topic-button"]').click();

			// Should trigger performance alert
			await expect(page.locator('[data-testid="performance-alert"]')).toBeVisible();
			await expect(page.locator('[data-testid="alert-message"]')).toContainText('Performance degradation detected');
		});
	});

	test.describe('User Activity Monitoring', () => {
		test('should track active user count', async ({ browser }) => {
			const pages = await multiUser.createUsers(5, browser);

			// Users join gradually
			for (let i = 0; i < pages.length; i++) {
				await pages[i].goto('/');
				await pages[i].waitForSelector('[data-testid="connection-status"]');

				// Check user count on first page
				if (i === 0) {
					await pages[0].locator('[data-testid="health-dashboard"]').click();
				}

				// Wait for user count to update
				await pages[0].waitForFunction(
					(expectedCount) => {
						const countElement = document.querySelector('[data-testid="active-user-count"]');
						return countElement && parseInt(countElement.textContent || '0') >= expectedCount;
					},
					i + 1,
					{ timeout: 5000 }
				);
			}

			// Final count should be 5
			const finalCount = await pages[0].locator('[data-testid="active-user-count"]').textContent();
			expect(parseInt(finalCount || '0')).toBe(5);
		});

		test('should monitor user engagement metrics', async ({ browser }) => {
			const pages = await multiUser.createUsers(3, browser);

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="connection-status"]');
			}

			// Simulate user activities
			await pages[0].locator('[data-testid="topic-title-input"]').fill('Engagement Test');
			await pages[0].locator('[data-testid="submit-topic-button"]').click();

			await pages[1].waitForSelector('[data-testid*="topic-card-Engagement Test"]');
			await pages[1].locator('[data-testid*="topic-card-Engagement Test"] [data-testid="vote-first-choice"]').click();

			// Check engagement metrics
			await pages[0].locator('[data-testid="health-dashboard"]').click();
			await expect(pages[0].locator('[data-testid="topics-submitted"]')).toContainText('1');
			await expect(pages[0].locator('[data-testid="votes-cast"]')).toContainText('1');

			// Should show engagement rate
			await expect(pages[0].locator('[data-testid="engagement-rate"]')).toBeVisible();
		});

		test('should detect inactive users', async ({ browser }) => {
			const pages = await multiUser.createUsers(3, browser);

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="connection-status"]');
			}

			// Enable inactivity detection
			await pages[0].locator('[data-testid="health-dashboard"]').click();
			await pages[0].locator('[data-testid="enable-inactivity-detection"]').check();
			await pages[0].locator('[data-testid="inactivity-threshold"]').fill('5'); // 5 seconds

			// Simulate user inactivity
			await pages[1].waitForTimeout(6000);

			// Should detect inactive user
			await pages[0].waitForFunction(
				() => {
					const inactiveCount = document.querySelector('[data-testid="inactive-user-count"]');
					return inactiveCount && parseInt(inactiveCount.textContent || '0') > 0;
				},
				undefined,
				{ timeout: 10000 }
			);
		});

		test('should track user session duration', async ({ page }) => {
			const sessionStart = Date.now();
			await page.goto('/');
			await page.waitForSelector('[data-testid="connection-status"]');

			// Simulate some activity
			await page.locator('[data-testid="topic-title-input"]').fill('Session Test');
			await page.locator('[data-testid="submit-topic-button"]').click();

			// Wait a bit
			await page.waitForTimeout(3000);

			// Check session duration
			await page.locator('[data-testid="health-dashboard"]').click();
			const sessionDuration = await page.locator('[data-testid="session-duration"]').textContent();
			const durationSeconds = parseInt(sessionDuration?.replace('s', '') || '0');

			const actualDuration = (Date.now() - sessionStart) / 1000;
			expect(durationSeconds).toBeGreaterThan(2);
			expect(durationSeconds).toBeLessThan(actualDuration + 2); // Allow for small variance
		});
	});

	test.describe('System Resource Monitoring', () => {
		test('should monitor API response times', async ({ page }) => {
			await page.goto('/');

			// Enable API monitoring
			await page.locator('[data-testid="health-dashboard"]').click();
			await page.locator('[data-testid="enable-api-monitoring"]').check();

			// Make some API calls
			await page.locator('[data-testid="topic-title-input"]').fill('API Test Topic');
			await page.locator('[data-testid="submit-topic-button"]').click();

			await page.waitForSelector('[data-testid*="topic-card-API Test Topic"]');

			// Check API metrics
			await expect(page.locator('[data-testid="api-response-times"]')).toBeVisible();

			const avgResponseTime = await page.locator('[data-testid="avg-response-time"]').textContent();
			expect(parseInt(avgResponseTime?.replace('ms', '') || '0')).toBeLessThan(5000);
		});

		test('should detect API failures', async ({ page }) => {
			await page.goto('/');

			// Enable API monitoring with alerts
			await page.locator('[data-testid="health-dashboard"]').click();
			await page.locator('[data-testid="enable-api-alerts"]').check();

			// Simulate API failure
			await page.route('**/api/topics**', route => route.abort());

			await page.locator('[data-testid="topic-title-input"]').fill('Failed Topic');
			await page.locator('[data-testid="submit-topic-button"]').click();

			// Should show API failure alert
			await expect(page.locator('[data-testid="api-failure-alert"]')).toBeVisible();
			await expect(page.locator('[data-testid="failed-requests-count"]')).toContainText('1');
		});

		test('should monitor WebSocket message throughput', async ({ browser }) => {
			const pages = await multiUser.createUsers(4, browser);

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="connection-status"]');
			}

			// Enable message monitoring
			await pages[0].locator('[data-testid="health-dashboard"]').click();
			await pages[0].locator('[data-testid="enable-message-monitoring"]').check();

			// Generate message traffic
			for (let i = 0; i < 10; i++) {
				const userIndex = i % pages.length;
				await pages[userIndex].locator('[data-testid="topic-title-input"]').fill(`Message Test ${i}`);
				await pages[userIndex].locator('[data-testid="submit-topic-button"]').click();
				await pages[userIndex].waitForTimeout(100);
			}

			// Check message throughput
			await pages[0].waitForFunction(
				() => {
					const throughput = document.querySelector('[data-testid="message-throughput"]');
					return throughput && parseInt(throughput.textContent || '0') > 0;
				},
				undefined,
				{ timeout: 10000 }
			);

			const messagesPerSecond = await pages[0].locator('[data-testid="messages-per-second"]').textContent();
			expect(parseInt(messagesPerSecond || '0')).toBeGreaterThan(0);
		});
	});

	test.describe('Health Dashboard and Alerts', () => {
		test('should display comprehensive health dashboard', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('[data-testid="connection-status"]');

			// Open health dashboard
			await page.locator('[data-testid="health-dashboard"]').click();

			// Verify all health sections are present
			await expect(page.locator('[data-testid="connection-health"]')).toBeVisible();
			await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
			await expect(page.locator('[data-testid="user-activity"]')).toBeVisible();
			await expect(page.locator('[data-testid="system-resources"]')).toBeVisible();

			// Verify overall health status
			await expect(page.locator('[data-testid="overall-health-status"]')).toBeVisible();
			await expect(page.locator('[data-testid="health-score"]')).toBeVisible();
		});

		test('should configure health alert thresholds', async ({ page }) => {
			await page.goto('/');

			await page.locator('[data-testid="health-dashboard"]').click();
			await page.locator('[data-testid="configure-alerts"]').click();

			// Configure various thresholds
			await page.locator('[data-testid="latency-threshold"]').fill('1000');
			await page.locator('[data-testid="user-count-threshold"]').fill('50');
			await page.locator('[data-testid="error-rate-threshold"]').fill('5');

			await page.locator('[data-testid="save-alert-config"]').click();

			// Verify configuration saved
			await expect(page.locator('[data-testid="config-saved-message"]')).toBeVisible();
		});

		test('should export health metrics for analysis', async ({ page }) => {
			await page.goto('/');

			// Enable monitoring and generate some data
			await page.locator('[data-testid="health-dashboard"]').click();
			await page.locator('[data-testid="enable-all-monitoring"]').check();

			// Generate activity
			await page.locator('[data-testid="topic-title-input"]').fill('Export Test');
			await page.locator('[data-testid="submit-topic-button"]').click();

			// Export metrics
			const downloadPromise = page.waitForEvent('download');
			await page.locator('[data-testid="export-metrics"]').click();
			const download = await downloadPromise;

			// Verify download
			expect(download.suggestedFilename()).toContain('health-metrics');
			expect(download.suggestedFilename()).toContain('.json');
		});

		test('should provide real-time health status updates', async ({ browser }) => {
			const pages = await multiUser.createUsers(2, browser);
			const [adminPage, userPage] = pages;

			// Admin opens health dashboard
			await adminPage.goto('/');
			await adminPage.locator('[data-testid="health-dashboard"]').click();
			await adminPage.locator('[data-testid="enable-realtime-updates"]').check();

			// User joins and creates activity
			await userPage.goto('/');
			await userPage.waitForSelector('[data-testid="connection-status"]');

			// Admin should see user count increase in real-time
			await adminPage.waitForFunction(
				() => {
					const count = document.querySelector('[data-testid="active-user-count"]');
					return count && parseInt(count.textContent || '0') >= 2;
				},
				undefined,
				{ timeout: 10000 }
			);

			// User creates activity
			await userPage.locator('[data-testid="topic-title-input"]').fill('Real-time Test');
			await userPage.locator('[data-testid="submit-topic-button"]').click();

			// Admin should see activity metrics update
			await adminPage.waitForFunction(
				() => {
					const activity = document.querySelector('[data-testid="recent-activity-count"]');
					return activity && parseInt(activity.textContent || '0') > 0;
				},
				undefined,
				{ timeout: 5000 }
			);
		});
	});

	test.describe('Error Reporting and Recovery', () => {
		test('should capture and report JavaScript errors', async ({ page }) => {
			await page.goto('/');

			// Enable error reporting
			await page.locator('[data-testid="health-dashboard"]').click();
			await page.locator('[data-testid="enable-error-reporting"]').check();

			// Simulate a JavaScript error
			await page.evaluate(() => {
				// @ts-ignore - Intentional error for testing
				nonExistentFunction();
			});

			// Error should be captured
			await expect(page.locator('[data-testid="js-error-count"]')).toContainText('1');
			await expect(page.locator('[data-testid="latest-error"]')).toContainText('nonExistentFunction is not defined');
		});

		test('should provide system recovery suggestions', async ({ page }) => {
			await page.goto('/');

			// Simulate various issues
			await page.context().setOffline(true);
			await page.waitForTimeout(2000);
			await page.context().setOffline(false);

			await page.locator('[data-testid="health-dashboard"]').click();

			// Should show recovery suggestions
			await expect(page.locator('[data-testid="recovery-suggestions"]')).toBeVisible();
			await expect(page.locator('[data-testid="suggestion-reconnect"]')).toBeVisible();
		});

		test('should track error patterns over time', async ({ page }) => {
			await page.goto('/');

			await page.locator('[data-testid="health-dashboard"]').click();
			await page.locator('[data-testid="enable-error-tracking"]').check();

			// Generate multiple errors
			for (let i = 0; i < 3; i++) {
				await page.route('**/api/topics**', route => route.abort());
				await page.locator('[data-testid="topic-title-input"]').fill(`Error Test ${i}`);
				await page.locator('[data-testid="submit-topic-button"]').click();
				await page.waitForTimeout(500);
			}

			// Should show error pattern analysis
			await expect(page.locator('[data-testid="error-pattern-analysis"]')).toBeVisible();
			await expect(page.locator('[data-testid="error-frequency"]')).toBeVisible();
		});
	});
});