import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class AuthPage extends BasePage {
	// Selectors
	private readonly emailInput: Locator;
	private readonly passwordInput: Locator;
	private readonly signInButton: Locator;
	private readonly signUpButton: Locator;
	private readonly signOutButton: Locator;
	private readonly authError: Locator;
	private readonly userProfile: Locator;

	constructor(page: Page) {
		super(page);
		this.emailInput = page.locator('[data-testid="email-input"]');
		this.passwordInput = page.locator('[data-testid="password-input"]');
		this.signInButton = page.locator('[data-testid="signin-button"]');
		this.signUpButton = page.locator('[data-testid="signup-button"]');
		this.signOutButton = page.locator('[data-testid="signout-button"]');
		this.authError = page.locator('[data-testid="auth-error"]');
		this.userProfile = page.locator('[data-testid="user-profile"]');
	}

	// Authentication actions
	async signIn(email: string, password: string) {
		await this.goto('/auth/signin');
		await this.emailInput.fill(email);
		await this.passwordInput.fill(password);
		await this.signInButton.click();
	}

	async signUp(email: string, password: string) {
		await this.goto('/auth/signup');
		await this.emailInput.fill(email);
		await this.passwordInput.fill(password);
		await this.signUpButton.click();
	}

	async signOut() {
		await this.signOutButton.click();
	}

	async visitSignInPage() {
		await this.goto('/auth/signin');
		await this.waitForAuthPageLoad();
	}

	async visitSignUpPage() {
		await this.goto('/auth/signup');
		await this.waitForAuthPageLoad();
	}

	async waitForAuthPageLoad() {
		await this.emailInput.waitFor({ state: 'visible' });
		await this.passwordInput.waitFor({ state: 'visible' });
	}

	// Authentication state helpers
	async waitForSignInComplete() {
		await this.userProfile.waitFor({ state: 'visible' });
	}

	async waitForSignOutComplete() {
		await this.signInButton.waitFor({ state: 'visible' });
	}

	// Assertions
	async assertSignedIn(userEmail: string) {
		await this.assertElementVisible('[data-testid="user-profile"]');
		await this.assertElementText('[data-testid="user-email"]', userEmail);
	}

	async assertSignedOut() {
		await this.assertElementVisible('[data-testid="signin-button"]');
		await this.assertElementHidden('[data-testid="user-profile"]');
	}

	async assertAuthError(errorMessage: string) {
		await this.assertElementVisible('[data-testid="auth-error"]');
		await this.assertElementText('[data-testid="auth-error"]', errorMessage);
	}
}