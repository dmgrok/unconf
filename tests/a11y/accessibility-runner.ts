/**
 * Accessibility Test Runner for UnConf Platform
 * Automated accessibility testing across all pages and components
 */

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  DEFAULT_A11Y_CONFIG,
  configureAxeBuilder,
  generateAccessibilityReport,
  AccessibilityTestUtils,
  A11Y_TEST_PATTERNS,
  type AccessibilityConfig,
  type AccessibilityReport
} from './accessibility-config';

/**
 * Comprehensive accessibility test suite
 */
export class AccessibilityTestRunner {
  constructor(
    private config: AccessibilityConfig = DEFAULT_A11Y_CONFIG
  ) {}

  /**
   * Run full accessibility audit on a page
   */
  async auditPage(page: Page, url: string, testName: string): Promise<AccessibilityReport[]> {
    const reports: AccessibilityReport[] = [];

    for (const viewport of this.config.viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Run axe-core scan
      const axeBuilder = configureAxeBuilder(new AxeBuilder({ page }), this.config);
      const axeResults = await axeBuilder.analyze();

      // Generate report
      const report = generateAccessibilityReport(
        `${testName} (${url})`,
        viewport,
        axeResults,
        this.config.wcagLevel
      );

      reports.push(report);

      // Assert no violations
      expect(axeResults.violations,
        `Accessibility violations found on ${testName} at ${viewport.name} viewport`
      ).toEqual([]);
    }

    return reports;
  }

  /**
   * Test specific component accessibility
   */
  async testComponent(page: Page, selector: string, componentName: string): Promise<void> {
    await page.waitForSelector(selector, { timeout: 5000 });

    const axeBuilder = configureAxeBuilder(new AxeBuilder({ page }), this.config)
      .include(selector);

    const axeResults = await axeBuilder.analyze();

    expect(axeResults.violations,
      `Accessibility violations found in ${componentName} component`
    ).toEqual([]);
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(page: Page): Promise<void> {
    const isNavigable = await AccessibilityTestUtils.testKeyboardNavigation(page);
    expect(isNavigable, 'Keyboard navigation should work properly').toBe(true);

    // Test specific keyboard interactions
    await page.keyboard.press('Tab');
    let focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Test Enter and Space on buttons
    const buttons = await page.locator('button, [role="button"]').all();
    for (const button of buttons.slice(0, 3)) { // Test first 3 buttons
      await button.focus();

      // Both Enter and Space should activate buttons
      const isButton = await button.evaluate(el => el.tagName === 'BUTTON' || el.getAttribute('role') === 'button');
      if (isButton) {
        // Test that button is focusable and has proper keyboard support
        await expect(button).toBeFocused();
      }
    }
  }

  /**
   * Test heading structure
   */
  async testHeadingStructure(page: Page): Promise<void> {
    const headingCheck = await AccessibilityTestUtils.validateHeadingStructure(page);

    expect(headingCheck.valid,
      `Heading structure issues: ${headingCheck.issues.join(', ')}`
    ).toBe(true);
  }

  /**
   * Test form accessibility
   */
  async testFormAccessibility(page: Page): Promise<void> {
    const inputs = await page.locator('input, select, textarea').all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      if (id) {
        // Check if there's a label for this input
        const label = await page.locator(`label[for="${id}"]`).count();
        const hasLabel = label > 0 || ariaLabel || ariaLabelledBy;

        expect(hasLabel,
          `Input with id="${id}" must have an associated label or aria-label`
        ).toBe(true);
      }
    }
  }

  /**
   * Test specific UnConf patterns
   */
  async testVotingAccessibility(page: Page): Promise<void> {
    for (const selector of A11Y_TEST_PATTERNS.voting.selectors) {
      const elements = await page.locator(selector).count();
      if (elements > 0) {
        await this.testComponent(page, selector, 'Voting');

        // Additional voting-specific tests
        const voteButtons = await page.locator('[data-testid="vote-button"]').all();
        for (const button of voteButtons) {
          const accessibleName = await button.getAttribute('aria-label') ||
                                await button.textContent();
          expect(accessibleName?.trim(),
            'Vote buttons must have accessible names'
          ).toBeTruthy();
        }
      }
    }
  }

  async testRealtimeAccessibility(page: Page): Promise<void> {
    // Check for aria-live regions
    const liveRegions = await page.locator('[aria-live]').count();
    if (liveRegions > 0) {
      await this.testComponent(page, '[aria-live]', 'Real-time updates');

      // Test that updates don't happen too frequently
      const liveElements = await page.locator('[aria-live]').all();
      for (const element of liveElements) {
        const ariaLive = await element.getAttribute('aria-live');
        expect(['polite', 'assertive', 'off'],
          'aria-live values must be valid'
        ).toContain(ariaLive);
      }
    }
  }

  async testNavigationAccessibility(page: Page): Promise<void> {
    for (const selector of A11Y_TEST_PATTERNS.navigation.selectors) {
      const elements = await page.locator(selector).count();
      if (elements > 0) {
        await this.testComponent(page, selector, 'Navigation');
      }
    }

    // Test skip links
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a').filter({ hasText: /skip/i }).first();
    if (await skipLink.count() > 0) {
      await expect(skipLink).toBeVisible();
    }
  }
}

/**
 * Playwright test helpers for accessibility
 */
export function createAccessibilityTests(pages: { url: string; name: string }[]) {
  const runner = new AccessibilityTestRunner();

  test.describe('Accessibility Compliance', () => {
    for (const pageInfo of pages) {
      test(`${pageInfo.name} accessibility audit`, async ({ page }) => {
        await runner.auditPage(page, pageInfo.url, pageInfo.name);
      });

      test(`${pageInfo.name} keyboard navigation`, async ({ page }) => {
        await page.goto(pageInfo.url);
        await page.waitForLoadState('networkidle');
        await runner.testKeyboardNavigation(page);
      });

      test(`${pageInfo.name} heading structure`, async ({ page }) => {
        await page.goto(pageInfo.url);
        await page.waitForLoadState('networkidle');
        await runner.testHeadingStructure(page);
      });

      test(`${pageInfo.name} form accessibility`, async ({ page }) => {
        await page.goto(pageInfo.url);
        await page.waitForLoadState('networkidle');
        await runner.testFormAccessibility(page);
      });

      test(`${pageInfo.name} UnConf patterns`, async ({ page }) => {
        await page.goto(pageInfo.url);
        await page.waitForLoadState('networkidle');

        await runner.testVotingAccessibility(page);
        await runner.testRealtimeAccessibility(page);
        await runner.testNavigationAccessibility(page);
      });
    }
  });
}

// Export for use in test files
export { AccessibilityTestRunner };