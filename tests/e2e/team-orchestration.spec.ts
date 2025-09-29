import { test, expect } from '@playwright/test';
import { generateTestData, MultiUserHelpers } from '../utils/test-helpers';

test.describe('Team Distribution and Activity Orchestration', () => {
	let multiUser: MultiUserHelpers;

	test.beforeAll(async ({ browser }) => {
		multiUser = new MultiUserHelpers();
	});

	test.afterAll(async () => {
		await multiUser.cleanupUsers();
	});

	test.describe('Activity State Management', () => {
		test('should transition between activity states correctly', async ({ page }) => {
			// Navigate to organizer dashboard
			await page.goto('/');

			// Verify initial state is VOTING
			await expect(page.locator('[data-testid="current-activity"]')).toContainText('voting');
			await expect(page.locator('[data-testid="activity-state"]')).toContainText('active');

			// Change to team distribution activity
			const activitySelector = page.locator('[data-testid="activity-selector"]');
			await activitySelector.selectOption('teams');

			// Verify activity changed
			await expect(page.locator('[data-testid="current-activity"]')).toContainText('teams');
			await expect(page.locator('[data-testid="activity-state"]')).toContainText('preparing');
		});

		test('should sync activity changes across all participants', async ({ browser }) => {
			const pages = await multiUser.createUsers(4, browser);
			const [organizerPage, ...participantPages] = pages;

			// All users join the same event
			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="current-activity"]');
			}

			// Organizer changes activity to team distribution
			await organizerPage.locator('[data-testid="activity-selector"]').selectOption('teams');

			// All participants should see the activity change
			for (const page of participantPages) {
				await page.waitForFunction(
					() => document.querySelector('[data-testid="current-activity"]')?.textContent?.includes('teams'),
					undefined,
					{ timeout: 10000 }
				);
			}
		});

		test('should handle activity state transitions with timers', async ({ page }) => {
			await page.goto('/');

			// Start a timed voting activity
			await page.locator('[data-testid="activity-selector"]').selectOption('voting');
			await page.locator('[data-testid="set-timer-button"]').click();
			await page.locator('[data-testid="timer-minutes"]').fill('1');
			await page.locator('[data-testid="start-timer-button"]').click();

			// Verify timer is running
			await expect(page.locator('[data-testid="activity-timer"]')).toBeVisible();
			await expect(page.locator('[data-testid="timer-display"]')).toContainText('01:00');

			// Activity state should be active
			await expect(page.locator('[data-testid="activity-state"]')).toContainText('active');
		});

		test('should pause and resume activities correctly', async ({ page }) => {
			await page.goto('/');

			// Start an activity
			await page.locator('[data-testid="activity-selector"]').selectOption('discussion');
			await page.locator('[data-testid="start-activity-button"]').click();

			await expect(page.locator('[data-testid="activity-state"]')).toContainText('active');

			// Pause the activity
			await page.locator('[data-testid="pause-activity-button"]').click();
			await expect(page.locator('[data-testid="activity-state"]')).toContainText('paused');

			// Resume the activity
			await page.locator('[data-testid="resume-activity-button"]').click();
			await expect(page.locator('[data-testid="activity-state"]')).toContainText('active');
		});
	});

	test.describe('Team Formation', () => {
		test('should create teams using random distribution strategy', async ({ browser }) => {
			const pages = await multiUser.createUsers(8, browser); // 8 users for team formation
			const [organizerPage, ...participantPages] = pages;

			// All users join the event
			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="current-activity"]');
			}

			// Organizer initiates team formation
			await organizerPage.locator('[data-testid="activity-selector"]').selectOption('teams');
			await organizerPage.locator('[data-testid="team-formation-strategy"]').selectOption('random');
			await organizerPage.locator('[data-testid="teams-count"]').fill('2'); // Create 2 teams
			await organizerPage.locator('[data-testid="start-team-formation"]').click();

			// Wait for team assignments
			await organizerPage.waitForSelector('[data-testid="team-formation-complete"]');

			// Verify teams were created
			await expect(organizerPage.locator('[data-testid="team-1"]')).toBeVisible();
			await expect(organizerPage.locator('[data-testid="team-2"]')).toBeVisible();

			// Verify all participants received team assignments
			for (const page of participantPages) {
				await page.waitForFunction(
					() => document.querySelector('[data-testid="my-team-assignment"]') !== null,
					undefined,
					{ timeout: 10000 }
				);

				// Each participant should see their team assignment
				await expect(page.locator('[data-testid="my-team-assignment"]')).toBeVisible();
			}
		});

		test('should create balanced teams based on user preferences', async ({ browser }) => {
			const pages = await multiUser.createUsers(6, browser);
			const [organizerPage, ...participantPages] = pages;

			// Users set their preferences
			for (let i = 0; i < participantPages.length; i++) {
				const page = participantPages[i];
				await page.goto('/');

				// Set skills/preferences
				await page.locator('[data-testid="user-preferences"]').click();
				await page.locator('[data-testid="skill-frontend"]').check();
				if (i % 2 === 0) {
					await page.locator('[data-testid="skill-backend"]').check();
				}
				await page.locator('[data-testid="save-preferences"]').click();
			}

			// Organizer creates balanced teams
			await organizerPage.goto('/');
			await organizerPage.locator('[data-testid="activity-selector"]').selectOption('teams');
			await organizerPage.locator('[data-testid="team-formation-strategy"]').selectOption('balanced');
			await organizerPage.locator('[data-testid="teams-count"]').fill('2');
			await organizerPage.locator('[data-testid="start-team-formation"]').click();

			// Wait for team formation
			await organizerPage.waitForSelector('[data-testid="team-formation-complete"]');

			// Verify teams have balanced skill distribution
			const team1Skills = await organizerPage.locator('[data-testid="team-1-skills"]').textContent();
			const team2Skills = await organizerPage.locator('[data-testid="team-2-skills"]').textContent();

			// Both teams should have frontend and backend skills
			expect(team1Skills).toContain('frontend');
			expect(team2Skills).toContain('frontend');
		});

		test('should allow manual team assignments', async ({ browser }) => {
			const pages = await multiUser.createUsers(4, browser);
			const [organizerPage, ...participantPages] = pages;

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="current-activity"]');
			}

			// Switch to manual team formation
			await organizerPage.locator('[data-testid="activity-selector"]').selectOption('teams');
			await organizerPage.locator('[data-testid="team-formation-strategy"]').selectOption('manual');
			await organizerPage.locator('[data-testid="teams-count"]').fill('2');
			await organizerPage.locator('[data-testid="create-empty-teams"]').click();

			// Manually assign users to teams
			await organizerPage.locator('[data-testid="participant-User-1"]').dragTo(
				organizerPage.locator('[data-testid="team-1-dropzone"]')
			);
			await organizerPage.locator('[data-testid="participant-User-2"]').dragTo(
				organizerPage.locator('[data-testid="team-1-dropzone"]')
			);
			await organizerPage.locator('[data-testid="participant-User-3"]').dragTo(
				organizerPage.locator('[data-testid="team-2-dropzone"]')
			);

			// Finalize team assignments
			await organizerPage.locator('[data-testid="finalize-teams"]').click();

			// Verify manual assignments were applied
			await expect(organizerPage.locator('[data-testid="team-1"] [data-testid="member-count"]')).toContainText('2');
			await expect(organizerPage.locator('[data-testid="team-2"] [data-testid="member-count"]')).toContainText('1');
		});

		test('should handle team size constraints', async ({ browser }) => {
			const pages = await multiUser.createUsers(10, browser);
			const [organizerPage] = pages;

			for (const page of pages) {
				await page.goto('/');
			}

			// Try to create teams with size constraints
			await organizerPage.locator('[data-testid="activity-selector"]').selectOption('teams');
			await organizerPage.locator('[data-testid="team-formation-strategy"]').selectOption('balanced');
			await organizerPage.locator('[data-testid="min-team-size"]').fill('3');
			await organizerPage.locator('[data-testid="max-team-size"]').fill('4');
			await organizerPage.locator('[data-testid="start-team-formation"]').click();

			// Wait for formation
			await organizerPage.waitForSelector('[data-testid="team-formation-complete"]');

			// Verify all teams meet size constraints
			const teamCards = organizerPage.locator('[data-testid*="team-"]');
			const teamCount = await teamCards.count();

			for (let i = 0; i < teamCount; i++) {
				const team = teamCards.nth(i);
				const memberCountText = await team.locator('[data-testid="member-count"]').textContent();
				const memberCount = parseInt(memberCountText || '0');

				expect(memberCount).toBeGreaterThanOrEqual(3);
				expect(memberCount).toBeLessThanOrEqual(4);
			}
		});
	});

	test.describe('Team Communication and Collaboration', () => {
		test('should enable team-specific chat during team activities', async ({ browser }) => {
			const pages = await multiUser.createUsers(4, browser);
			const [organizerPage, user1, user2, user3] = pages;

			// Form teams first
			for (const page of pages) {
				await page.goto('/');
			}

			await organizerPage.locator('[data-testid="activity-selector"]').selectOption('teams');
			await organizerPage.locator('[data-testid="team-formation-strategy"]').selectOption('manual');
			await organizerPage.locator('[data-testid="teams-count"]').fill('2');
			await organizerPage.locator('[data-testid="create-empty-teams"]').click();

			// Assign users to teams
			await organizerPage.locator('[data-testid="participant-User-1"]').dragTo(
				organizerPage.locator('[data-testid="team-1-dropzone"]')
			);
			await organizerPage.locator('[data-testid="participant-User-2"]').dragTo(
				organizerPage.locator('[data-testid="team-1-dropzone"]')
			);
			await organizerPage.locator('[data-testid="participant-User-3"]').dragTo(
				organizerPage.locator('[data-testid="team-2-dropzone"]')
			);

			await organizerPage.locator('[data-testid="finalize-teams"]').click();

			// Wait for team assignments to propagate
			await user1.waitForSelector('[data-testid="team-chat"]');
			await user2.waitForSelector('[data-testid="team-chat"]');

			// User 1 sends message in team chat
			await user1.locator('[data-testid="team-chat-input"]').fill('Hello team!');
			await user1.locator('[data-testid="send-team-message"]').click();

			// User 2 (same team) should see the message
			await expect(user2.locator('[data-testid="team-chat-messages"]')).toContainText('Hello team!');

			// User 3 (different team) should not see the message
			await expect(user3.locator('[data-testid="team-chat-messages"]')).not.toContainText('Hello team!');
		});

		test('should show team progress and status updates', async ({ browser }) => {
			const pages = await multiUser.createUsers(6, browser);
			const [organizerPage, ...participantPages] = pages;

			// Form teams and start a discussion activity
			for (const page of pages) {
				await page.goto('/');
			}

			await organizerPage.locator('[data-testid="activity-selector"]').selectOption('teams');
			await organizerPage.locator('[data-testid="start-team-formation"]').click();
			await organizerPage.waitForSelector('[data-testid="team-formation-complete"]');

			// Start team discussion activity
			await organizerPage.locator('[data-testid="activity-selector"]').selectOption('discussion');
			await organizerPage.locator('[data-testid="start-activity-button"]').click();

			// Team members mark progress
			const team1Members = participantPages.slice(0, 3);
			for (const page of team1Members) {
				await page.waitForSelector('[data-testid="team-progress"]');
				await page.locator('[data-testid="mark-progress"]').click();
			}

			// Organizer should see team progress updates
			await organizerPage.waitForFunction(
				() => {
					const progress = document.querySelector('[data-testid="team-1-progress"]');
					return progress && progress.textContent?.includes('100%');
				},
				undefined,
				{ timeout: 10000 }
			);
		});

		test('should handle team leader assignment and permissions', async ({ browser }) => {
			const pages = await multiUser.createUsers(4, browser);
			const [organizerPage, ...participantPages] = pages;

			for (const page of pages) {
				await page.goto('/');
			}

			// Form teams
			await organizerPage.locator('[data-testid="activity-selector"]').selectOption('teams');
			await organizerPage.locator('[data-testid="start-team-formation"]').click();
			await organizerPage.waitForSelector('[data-testid="team-formation-complete"]');

			// Assign team leader
			await organizerPage.locator('[data-testid="team-1"] [data-testid="assign-leader"]').click();
			await organizerPage.locator('[data-testid="select-leader-User-1"]').click();
			await organizerPage.locator('[data-testid="confirm-leader-assignment"]').click();

			// User 1 should have leader permissions
			await participantPages[0].waitForSelector('[data-testid="team-leader-badge"]');
			await expect(participantPages[0].locator('[data-testid="leader-controls"]')).toBeVisible();

			// Other team members should see the leader
			await expect(participantPages[1].locator('[data-testid="team-leader-User-1"]')).toBeVisible();
		});
	});

	test.describe('Activity Orchestration', () => {
		test('should orchestrate multi-phase activities with transitions', async ({ page }) => {
			await page.goto('/');

			// Create a multi-phase activity sequence
			await page.locator('[data-testid="create-activity-sequence"]').click();

			// Phase 1: Voting
			await page.locator('[data-testid="add-phase"]').click();
			await page.locator('[data-testid="phase-1-activity"]').selectOption('voting');
			await page.locator('[data-testid="phase-1-duration"]').fill('5');

			// Phase 2: Team Formation
			await page.locator('[data-testid="add-phase"]').click();
			await page.locator('[data-testid="phase-2-activity"]').selectOption('teams');
			await page.locator('[data-testid="phase-2-duration"]').fill('3');

			// Phase 3: Discussion
			await page.locator('[data-testid="add-phase"]').click();
			await page.locator('[data-testid="phase-3-activity"]').selectOption('discussion');
			await page.locator('[data-testid="phase-3-duration"]').fill('10');

			// Start the sequence
			await page.locator('[data-testid="start-activity-sequence"]').click();

			// Verify first phase starts
			await expect(page.locator('[data-testid="current-activity"]')).toContainText('voting');
			await expect(page.locator('[data-testid="current-phase"]')).toContainText('1 of 3');
		});

		test('should handle automatic phase transitions', async ({ page }) => {
			await page.goto('/');

			// Set up auto-advancing sequence
			await page.locator('[data-testid="activity-selector"]').selectOption('voting');
			await page.locator('[data-testid="enable-auto-advance"]').check();
			await page.locator('[data-testid="set-timer-button"]').click();
			await page.locator('[data-testid="timer-seconds"]').fill('5'); // 5 second timer for testing
			await page.locator('[data-testid="next-activity"]').selectOption('teams');
			await page.locator('[data-testid="start-timer-button"]').click();

			// Wait for auto-transition
			await page.waitForFunction(
				() => {
					const activity = document.querySelector('[data-testid="current-activity"]');
					return activity && activity.textContent?.includes('teams');
				},
				undefined,
				{ timeout: 10000 }
			);

			// Verify transition occurred
			await expect(page.locator('[data-testid="current-activity"]')).toContainText('teams');
		});

		test('should allow manual intervention in automated sequences', async ({ page }) => {
			await page.goto('/');

			// Start automated sequence
			await page.locator('[data-testid="activity-selector"]').selectOption('voting');
			await page.locator('[data-testid="enable-auto-advance"]').check();
			await page.locator('[data-testid="set-timer-button"]').click();
			await page.locator('[data-testid="timer-minutes"]').fill('10');
			await page.locator('[data-testid="start-timer-button"]').click();

			// Manually intervene and skip to next phase
			await page.locator('[data-testid="manual-advance"]').click();
			await page.locator('[data-testid="confirm-skip-phase"]').click();

			// Should advance despite timer
			await expect(page.locator('[data-testid="activity-state"]')).toContainText('completed');
		});

		test('should maintain state during activity transitions', async ({ browser }) => {
			const pages = await multiUser.createUsers(3, browser);
			const [organizerPage, user1, user2] = pages;

			for (const page of pages) {
				await page.goto('/');
			}

			// Users submit topics during voting phase
			const topic1 = generateTestData.proposal();
			await user1.locator('[data-testid="topic-title-input"]').fill(topic1.title);
			await user1.locator('[data-testid="submit-topic-button"]').click();

			// Users cast votes
			await user2.waitForSelector(`[data-testid*="topic-card-${topic1.title}"]`);
			await user2.locator(`[data-testid*="topic-card-${topic1.title}"] [data-testid="vote-first-choice"]`).click();

			// Organizer transitions to team formation
			await organizerPage.locator('[data-testid="activity-selector"]').selectOption('teams');
			await organizerPage.locator('[data-testid="start-team-formation"]').click();

			// Transition back to voting - state should be preserved
			await organizerPage.locator('[data-testid="activity-selector"]').selectOption('voting');

			// Verify topics and votes are still there
			await expect(user1.locator(`[data-testid*="topic-card-${topic1.title}"]`)).toBeVisible();
			await expect(user2.locator(`[data-testid*="topic-card-${topic1.title}"] [data-testid="user-vote-indicator"]`)).toContainText('🥇');
		});
	});

	test.describe('Real-time Orchestration Updates', () => {
		test('should broadcast activity changes to all connected users', async ({ browser }) => {
			const pages = await multiUser.createUsers(5, browser);
			const [organizerPage, ...participantPages] = pages;

			for (const page of pages) {
				await page.goto('/');
				await page.waitForSelector('[data-testid="connection-status"]');
			}

			// Organizer changes activity
			await organizerPage.locator('[data-testid="activity-selector"]').selectOption('intelligence');

			// All participants should see the change
			for (const page of participantPages) {
				await page.waitForFunction(
					() => document.querySelector('[data-testid="current-activity"]')?.textContent?.includes('intelligence'),
					undefined,
					{ timeout: 8000 }
				);
			}
		});

		test('should handle late-joining users correctly', async ({ browser }) => {
			const earlyPages = await multiUser.createUsers(2, browser);
			const [organizerPage, earlyUser] = earlyPages;

			// Early users join and organizer sets up teams
			for (const page of earlyPages) {
				await page.goto('/');
			}

			await organizerPage.locator('[data-testid="activity-selector"]').selectOption('teams');
			await organizerPage.locator('[data-testid="start-team-formation"]').click();
			await organizerPage.waitForSelector('[data-testid="team-formation-complete"]');

			// Late user joins
			const lateUserContext = await browser.newContext();
			const lateUser = await lateUserContext.newPage();
			await lateUser.goto('/');

			// Late user should see current activity state
			await lateUser.waitForSelector('[data-testid="current-activity"]');
			await expect(lateUser.locator('[data-testid="current-activity"]')).toContainText('teams');

			// Late user should be automatically assigned to a team or put in waiting
			await expect(lateUser.locator('[data-testid="team-assignment-status"]')).toBeVisible();
		});

		test('should sync timer states across all clients', async ({ browser }) => {
			const pages = await multiUser.createUsers(3, browser);
			const [organizerPage, user1, user2] = pages;

			for (const page of pages) {
				await page.goto('/');
			}

			// Organizer starts a timed activity
			await organizerPage.locator('[data-testid="activity-selector"]').selectOption('voting');
			await organizerPage.locator('[data-testid="set-timer-button"]').click();
			await organizerPage.locator('[data-testid="timer-minutes"]').fill('2');
			await organizerPage.locator('[data-testid="start-timer-button"]').click();

			// All users should see the timer
			for (const page of [user1, user2]) {
				await page.waitForSelector('[data-testid="activity-timer"]');
				await expect(page.locator('[data-testid="timer-display"]')).toContainText('02:00');
			}

			// Wait for timer to count down
			await organizerPage.waitForTimeout(2000);

			// Timer should be synchronized across clients (allowing for small variance)
			for (const page of [user1, user2]) {
				const timerText = await page.locator('[data-testid="timer-display"]').textContent();
				const seconds = parseInt(timerText?.split(':')[1] || '0');
				expect(seconds).toBeLessThan(60);
				expect(seconds).toBeGreaterThan(55); // Allow for 5 second variance
			}
		});

		test('should handle organizer disconnection gracefully', async ({ browser }) => {
			const pages = await multiUser.createUsers(4, browser);
			const [organizerPage, ...participantPages] = pages;

			for (const page of pages) {
				await page.goto('/');
			}

			// Start an activity
			await organizerPage.locator('[data-testid="activity-selector"]').selectOption('discussion');
			await organizerPage.locator('[data-testid="start-activity-button"]').click();

			// Participants should see active discussion
			for (const page of participantPages) {
				await expect(page.locator('[data-testid="current-activity"]')).toContainText('discussion');
			}

			// Simulate organizer disconnection
			await organizerPage.context().close();

			// Activity should continue for participants
			for (const page of participantPages) {
				await expect(page.locator('[data-testid="current-activity"]')).toContainText('discussion');
				await expect(page.locator('[data-testid="organizer-disconnected-notice"]')).toBeVisible();
			}

			// Participants should still be able to interact within the activity
			await participantPages[0].locator('[data-testid="participant-action"]').click();
			await expect(participantPages[0].locator('[data-testid="action-success"]')).toBeVisible();
		});
	});

	test.describe('Error Handling and Recovery', () => {
		test('should handle team formation failures gracefully', async ({ browser }) => {
			const pages = await multiUser.createUsers(3, browser);
			const [organizerPage] = pages;

			for (const page of pages) {
				await page.goto('/');
			}

			// Simulate server error during team formation
			await organizerPage.route('**/api/teams/formation**', route => route.abort());

			await organizerPage.locator('[data-testid="activity-selector"]').selectOption('teams');
			await organizerPage.locator('[data-testid="start-team-formation"]').click();

			// Should show error message
			await expect(organizerPage.locator('[data-testid="team-formation-error"]')).toBeVisible();

			// Should allow retry
			await expect(organizerPage.locator('[data-testid="retry-team-formation"]')).toBeVisible();
		});

		test('should recover from activity state corruption', async ({ page }) => {
			await page.goto('/');

			// Simulate corrupted state by manually setting invalid activity
			await page.evaluate(() => {
				// @ts-ignore - Simulating corruption
				window.__activityState = { activity: 'invalid', state: 'corrupted' };
			});

			// System should detect and recover
			await page.locator('[data-testid="refresh-activity-state"]').click();

			// Should reset to safe state
			await expect(page.locator('[data-testid="current-activity"]')).toContainText('voting');
			await expect(page.locator('[data-testid="activity-state"]')).toContainText('active');
		});

		test('should handle concurrent state changes safely', async ({ browser }) => {
			const pages = await multiUser.createUsers(2, browser);
			const [organizer1, organizer2] = pages;

			// Both have organizer privileges
			for (const page of pages) {
				await page.goto('/');
			}

			// Both try to change activity simultaneously
			const changePromises = [
				organizer1.locator('[data-testid="activity-selector"]').selectOption('teams'),
				organizer2.locator('[data-testid="activity-selector"]').selectOption('discussion')
			];

			await Promise.all(changePromises);

			// System should handle conflict and show consistent state
			await organizer1.waitForTimeout(1000);

			const activity1 = await organizer1.locator('[data-testid="current-activity"]').textContent();
			const activity2 = await organizer2.locator('[data-testid="current-activity"]').textContent();

			// Both should show the same activity (conflict resolved)
			expect(activity1).toBe(activity2);
		});
	});
});