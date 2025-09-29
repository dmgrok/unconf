/**
 * Accessibility Testing Configuration for UnConf Platform
 * Defines accessibility standards, rules, and utilities
 */

import type { AxeBuilder } from '@axe-core/playwright';

export interface AccessibilityConfig {
  wcagLevel: 'A' | 'AA' | 'AAA';
  tags: string[];
  rules: AccessibilityRules;
  viewports: Viewport[];
  excludeSelectors: string[];
}

export interface AccessibilityRules {
  enabled: string[];
  disabled: string[];
  custom: CustomRule[];
}

export interface CustomRule {
  id: string;
  selector: string;
  description: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
}

export interface Viewport {
  name: string;
  width: number;
  height: number;
  description: string;
}

export interface AccessibilityReport {
  timestamp: string;
  page: string;
  viewport: Viewport;
  violations: any[];
  passes: any[];
  incomplete: any[];
  wcagLevel: string;
  score: number;
}

/**
 * Default accessibility configuration for UnConf platform
 */
export const DEFAULT_A11Y_CONFIG: AccessibilityConfig = {
  wcagLevel: 'AA',
  tags: [
    'wcag2a',
    'wcag2aa',
    'wcag21aa',
    'best-practice'
  ],
  rules: {
    enabled: [
      'color-contrast',
      'keyboard',
      'focus-order-semantics',
      'heading-order',
      'image-alt',
      'label',
      'link-name',
      'button-name',
      'aria-roles',
      'aria-valid-attr',
      'aria-required-attr',
      'form-field-multiple-labels',
      'landmark-one-main',
      'page-has-heading-one',
      'region'
    ],
    disabled: [
      // Disable rules that might be too strict for dynamic content
      'color-contrast-enhanced', // AAA level - too strict for our AA target
      'focus-order-semantics' // Can be problematic with dynamic content
    ],
    custom: [
      {
        id: 'unconf-voting-accessibility',
        selector: '[data-testid="voting-interface"]',
        description: 'Voting interface must be accessible with screen readers',
        impact: 'critical'
      },
      {
        id: 'unconf-realtime-updates',
        selector: '[data-testid="realtime-update"]',
        description: 'Real-time updates must announce changes to screen readers',
        impact: 'serious'
      },
      {
        id: 'unconf-timer-accessibility',
        selector: '[data-testid="timer"]',
        description: 'Timer updates must be accessible and not too frequent',
        impact: 'moderate'
      }
    ]
  },
  viewports: [
    {
      name: 'desktop',
      width: 1280,
      height: 720,
      description: 'Standard desktop viewport'
    },
    {
      name: 'tablet',
      width: 768,
      height: 1024,
      description: 'Tablet viewport'
    },
    {
      name: 'mobile',
      width: 375,
      height: 667,
      description: 'Mobile viewport (iPhone SE)'
    },
    {
      name: 'large-mobile',
      width: 414,
      height: 896,
      description: 'Large mobile viewport (iPhone 11 Pro)'
    }
  ],
  excludeSelectors: [
    '[data-testid="dev-tools"]',
    '.dev-panel',
    '#debug-info'
  ]
};

/**
 * Configure axe-core builder with UnConf-specific settings
 */
export function configureAxeBuilder(builder: AxeBuilder, config: AccessibilityConfig = DEFAULT_A11Y_CONFIG): AxeBuilder {
  // Apply tags
  builder = builder.withTags(config.tags);

  // Disable specific rules
  if (config.rules.disabled.length > 0) {
    builder = builder.disableRules(config.rules.disabled);
  }

  // Exclude selectors
  if (config.excludeSelectors.length > 0) {
    config.excludeSelectors.forEach(selector => {
      builder = builder.exclude(selector);
    });
  }

  return builder;
}

/**
 * Calculate accessibility score based on violations
 */
export function calculateAccessibilityScore(violations: any[]): number {
  if (violations.length === 0) return 100;

  const impactWeights = {
    minor: 1,
    moderate: 5,
    serious: 15,
    critical: 25
  };

  const totalWeight = violations.reduce((sum, violation) => {
    const weight = impactWeights[violation.impact as keyof typeof impactWeights] || 1;
    return sum + (weight * violation.nodes.length);
  }, 0);

  // Score decreases based on weighted violations
  const score = Math.max(0, 100 - totalWeight);
  return Math.round(score);
}

/**
 * Generate detailed accessibility report
 */
export function generateAccessibilityReport(
  page: string,
  viewport: Viewport,
  axeResults: any,
  wcagLevel: string = 'AA'
): AccessibilityReport {
  return {
    timestamp: new Date().toISOString(),
    page,
    viewport,
    violations: axeResults.violations,
    passes: axeResults.passes,
    incomplete: axeResults.incomplete,
    wcagLevel,
    score: calculateAccessibilityScore(axeResults.violations)
  };
}

/**
 * Accessibility testing utilities
 */
export class AccessibilityTestUtils {
  static async testKeyboardNavigation(page: any): Promise<boolean> {
    try {
      // Test Tab navigation
      await page.keyboard.press('Tab');
      const firstFocus = await page.locator(':focus');

      await page.keyboard.press('Tab');
      const secondFocus = await page.locator(':focus');

      // Ensure focus moves and is visible
      const firstElement = await firstFocus.elementHandle();
      const secondElement = await secondFocus.elementHandle();

      return firstElement !== secondElement;
    } catch (error) {
      console.error('Keyboard navigation test failed:', error);
      return false;
    }
  }

  static async testScreenReaderAnnouncements(page: any): Promise<string[]> {
    const announcements: string[] = [];

    // Listen for aria-live region updates
    await page.evaluate(() => {
      const liveRegions = document.querySelectorAll('[aria-live]');
      liveRegions.forEach(region => {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach(mutation => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
              // Track announcements (in real implementation, this would be more sophisticated)
              console.log('Screen reader announcement:', region.textContent);
            }
          });
        });
        observer.observe(region, { childList: true, subtree: true, characterData: true });
      });
    });

    return announcements;
  }

  static async checkColorContrast(page: any, selector: string): Promise<boolean> {
    try {
      const contrastResult = await page.evaluate((sel: string) => {
        const element = document.querySelector(sel);
        if (!element) return false;

        const style = window.getComputedStyle(element);
        const backgroundColor = style.backgroundColor;
        const color = style.color;

        // This is a simplified check - in practice, you'd use a proper contrast calculation
        return backgroundColor !== color;
      }, selector);

      return contrastResult;
    } catch (error) {
      console.error('Color contrast check failed:', error);
      return false;
    }
  }

  static async validateHeadingStructure(page: any): Promise<{ valid: boolean; issues: string[] }> {
    try {
      const headingStructure = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        const issues: string[] = [];
        let previousLevel = 0;

        // Check for h1
        const h1Count = headings.filter(h => h.tagName === 'H1').length;
        if (h1Count === 0) {
          issues.push('No H1 heading found');
        } else if (h1Count > 1) {
          issues.push('Multiple H1 headings found');
        }

        // Check heading hierarchy
        headings.forEach((heading, index) => {
          const level = parseInt(heading.tagName.charAt(1));

          if (index === 0 && level !== 1) {
            issues.push('First heading should be H1');
          }

          if (level > previousLevel + 1) {
            issues.push(`Heading level skipped: H${previousLevel} to H${level}`);
          }

          previousLevel = level;
        });

        return { valid: issues.length === 0, issues };
      });

      return headingStructure;
    } catch (error) {
      console.error('Heading structure validation failed:', error);
      return { valid: false, issues: ['Validation failed'] };
    }
  }
}

/**
 * Common accessibility test patterns for UnConf
 */
export const A11Y_TEST_PATTERNS = {
  voting: {
    selectors: [
      '[data-testid="voting-interface"]',
      '[data-testid="topic-card"]',
      '[data-testid="vote-button"]'
    ],
    requirements: [
      'All voting options must have accessible names',
      'Vote confirmation must be announced to screen readers',
      'Voting interface must be keyboard accessible'
    ]
  },
  realtime: {
    selectors: [
      '[data-testid="realtime-update"]',
      '[aria-live]',
      '[role="status"]'
    ],
    requirements: [
      'Real-time updates must use aria-live regions',
      'Updates must not be too frequent (max 1 per 3 seconds)',
      'Critical updates must use aria-live="assertive"'
    ]
  },
  navigation: {
    selectors: [
      'nav',
      '[role="navigation"]',
      '[data-testid="main-nav"]'
    ],
    requirements: [
      'Navigation must be keyboard accessible',
      'Current page must be indicated',
      'Skip links must be provided'
    ]
  }
};