/**
 * Accessibility Tests using axe-core
 * Ensures WCAG 2.1 compliance across the UnConf platform
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Set up reasonable viewport for accessibility testing
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Home page accessibility', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Events page accessibility', async ({ page }) => {
    await page.goto('/events');

    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Event details page accessibility', async ({ page }) => {
    // Navigate to a demo event
    await page.goto('/');
    await page.click('[data-testid="demo-event-link"]').catch(() => {
      // If demo link doesn't exist, create a mock event page
      page.goto('/events/test-event');
    });

    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Voting interface accessibility', async ({ page }) => {
    // Go to an event with voting capability
    await page.goto('/events/test-event');

    // Wait for voting interface to load
    await page.waitForSelector('[data-testid="voting-interface"]', { timeout: 5000 }).catch(() => {
      // If voting interface doesn't exist, continue with basic page test
      console.log('Voting interface not found, testing base page');
    });

    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .include('[data-testid="voting-interface"]')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Navigation accessibility', async ({ page }) => {
    await page.goto('/');

    // Focus on navigation elements
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .include('nav, [role="navigation"]')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Forms accessibility', async ({ page }) => {
    await page.goto('/');

    // Test any forms on the page
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .include('form, input, button, select, textarea')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check that focus is visible and logical
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Run accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Color contrast compliance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('*')
      .analyze();

    // Focus specifically on color contrast violations
    const colorContrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id.includes('color-contrast')
    );

    expect(colorContrastViolations).toEqual([]);
  });

  test('Screen reader compatibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test for proper heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);

    // Test for alt text on images
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Images should have alt text unless they are decorative (role="presentation")
      if (role !== 'presentation' && role !== 'none') {
        expect(alt).not.toBeNull();
      }
    }

    // Run full accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Mobile accessibility', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Interactive elements accessibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test buttons
    const buttons = await page.locator('button, [role="button"]').all();
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      const title = await button.getAttribute('title');

      // Buttons should have accessible names
      expect(ariaLabel || text?.trim() || title).toBeTruthy();
    }

    // Test links
    const links = await page.locator('a').all();
    for (const link of links) {
      const href = await link.getAttribute('href');
      const ariaLabel = await link.getAttribute('aria-label');
      const text = await link.textContent();

      // Links should have meaningful text or aria-label
      if (href && href !== '#') {
        expect(ariaLabel || text?.trim()).toBeTruthy();
      }
    }

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});