import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth.page';
import { HomePage } from '../pages/home.page';
import { generateTestData } from '../utils/test-helpers';

test.describe('Authentication', () => {
	let authPage: AuthPage;
	let homePage: HomePage;

	test.beforeEach(async ({ page }) => {
		authPage = new AuthPage(page);
		homePage = new HomePage(page);
	});

	test.describe('Sign In', () => {
		test('should allow valid user to sign in', async () => {
			const testUser = generateTestData.user();

			await authPage.signIn(testUser.email, testUser.password);
			await authPage.waitForSignInComplete();
			await authPage.assertSignedIn(testUser.email);
		});

		test('should show error for invalid credentials', async () => {
			await authPage.signIn('invalid@example.com', 'wrongpassword');
			await authPage.assertAuthError('Invalid email or password');
		});

		test('should redirect to home after successful sign in', async ({ page }) => {
			const testUser = generateTestData.user();

			await authPage.signIn(testUser.email, testUser.password);
			await authPage.waitForSignInComplete();

			await expect(page).toHaveURL('/');
		});
	});

	test.describe('Sign Up', () => {
		test('should allow new user registration', async () => {
			const newUser = generateTestData.user();

			await authPage.signUp(newUser.email, newUser.password);
			await authPage.waitForSignInComplete();
			await authPage.assertSignedIn(newUser.email);
		});

		test('should show error for duplicate email', async () => {
			const existingUser = generateTestData.user();

			// First registration
			await authPage.signUp(existingUser.email, existingUser.password);
			await authPage.waitForSignInComplete();
			await authPage.signOut();

			// Try to register again with same email
			await authPage.signUp(existingUser.email, existingUser.password);
			await authPage.assertAuthError('Email already exists');
		});
	});

	test.describe('Sign Out', () => {
		test('should sign out authenticated user', async () => {
			const testUser = generateTestData.user();

			// Sign in first
			await authPage.signIn(testUser.email, testUser.password);
			await authPage.waitForSignInComplete();

			// Sign out
			await authPage.signOut();
			await authPage.waitForSignOutComplete();
			await authPage.assertSignedOut();
		});
	});

	test.describe('Protected Routes', () => {
		test('should redirect unauthenticated users to sign in', async ({ page }) => {
			// Try to access a protected route
			await page.goto('/dashboard');

			// Should redirect to sign in
			await expect(page).toHaveURL(/.*signin.*/);
		});

		test('should allow authenticated users to access protected routes', async ({ page }) => {
			const testUser = generateTestData.user();

			// Sign in first
			await authPage.signIn(testUser.email, testUser.password);
			await authPage.waitForSignInComplete();

			// Now try to access protected route
			await page.goto('/dashboard');

			// Should stay on dashboard
			await expect(page).toHaveURL(/.*dashboard.*/);
		});
	});

	test.describe('Session Persistence', () => {
		test('should persist session across page reloads', async ({ page }) => {
			const testUser = generateTestData.user();

			// Sign in
			await authPage.signIn(testUser.email, testUser.password);
			await authPage.waitForSignInComplete();

			// Reload page
			await page.reload();

			// Should still be signed in
			await authPage.assertSignedIn(testUser.email);
		});

		test('should handle expired sessions gracefully', async ({ page }) => {
			const testUser = generateTestData.user();

			// Sign in
			await authPage.signIn(testUser.email, testUser.password);
			await authPage.waitForSignInComplete();

			// Manually expire session (this would need backend support)
			await page.evaluate(() => {
				localStorage.removeItem('auth-token');
				sessionStorage.clear();
			});

			// Reload page
			await page.reload();

			// Should redirect to sign in
			await expect(page).toHaveURL(/.*signin.*/);
		});
	});
});