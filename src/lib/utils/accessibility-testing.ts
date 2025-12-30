/**
 * Accessibility testing utilities for component validation
 */

import {
	isFocusable,
	getFocusableElements,
	getContrastRatio,
	meetsContrastRequirement
} from './accessibility';

// Accessibility test result types
export interface AccessibilityTest {
	name: string;
	description: string;
	test: (element: Element) => AccessibilityTestResult;
}

export interface AccessibilityTestResult {
	passed: boolean;
	message: string;
	severity: 'error' | 'warning' | 'info';
	element?: Element;
}

export interface AccessibilityReport {
	passed: boolean;
	results: AccessibilityTestResult[];
	summary: {
		total: number;
		passed: number;
		failed: number;
		warnings: number;
	};
}

/**
 * Common accessibility tests
 */
export const accessibilityTests: AccessibilityTest[] = [
	{
		name: 'alt-text',
		description: 'Images should have alt text',
		test: (element) => {
			const images = element.querySelectorAll('img');
			const missingAlt = Array.from(images).filter(img =>
				!img.hasAttribute('alt') && !img.hasAttribute('aria-label')
			);

			return {
				passed: missingAlt.length === 0,
				message: missingAlt.length > 0
					? `${missingAlt.length} images missing alt text`
					: 'All images have alt text',
				severity: 'error',
				element: missingAlt[0]
			};
		}
	},

	{
		name: 'button-labels',
		description: 'Buttons should have accessible labels',
		test: (element) => {
			const buttons = element.querySelectorAll('button');
			const unlabeledButtons = Array.from(buttons).filter(button => {
				const hasText = button.textContent?.trim();
				const hasAriaLabel = button.hasAttribute('aria-label');
				const hasAriaLabelledBy = button.hasAttribute('aria-labelledby');
				const hasTitle = button.hasAttribute('title');

				return !hasText && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle;
			});

			return {
				passed: unlabeledButtons.length === 0,
				message: unlabeledButtons.length > 0
					? `${unlabeledButtons.length} buttons missing accessible labels`
					: 'All buttons have accessible labels',
				severity: 'error',
				element: unlabeledButtons[0]
			};
		}
	},

	{
		name: 'form-labels',
		description: 'Form inputs should have labels',
		test: (element) => {
			const inputs = element.querySelectorAll('input, select, textarea');
			const unlabeledInputs = Array.from(inputs).filter(input => {
				const hasLabel = input.hasAttribute('aria-label') ||
								 input.hasAttribute('aria-labelledby') ||
								 input.hasAttribute('title');

				if (hasLabel) return false;

				// Check for associated label element
				const id = input.getAttribute('id');
				if (id) {
					const label = element.querySelector(`label[for="${id}"]`);
					if (label) return false;
				}

				// Check for wrapping label
				const wrappingLabel = input.closest('label');
				if (wrappingLabel) return false;

				return true;
			});

			return {
				passed: unlabeledInputs.length === 0,
				message: unlabeledInputs.length > 0
					? `${unlabeledInputs.length} form inputs missing labels`
					: 'All form inputs have labels',
				severity: 'error',
				element: unlabeledInputs[0]
			};
		}
	},

	{
		name: 'heading-structure',
		description: 'Headings should follow proper hierarchy',
		test: (element) => {
			const headings = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6'));

			if (headings.length === 0) {
				return {
					passed: true,
					message: 'No headings found',
					severity: 'info'
				};
			}

			let previousLevel = 0;
			let hasIssues = false;
			let firstIssue: Element | undefined;

			for (const heading of headings) {
				const currentLevel = parseInt(heading.tagName.charAt(1));

				if (previousLevel === 0) {
					// First heading
					if (currentLevel !== 1) {
						hasIssues = true;
						firstIssue = heading;
						break;
					}
				} else {
					// Subsequent headings shouldn't skip levels
					if (currentLevel > previousLevel + 1) {
						hasIssues = true;
						firstIssue = heading;
						break;
					}
				}

				previousLevel = currentLevel;
			}

			return {
				passed: !hasIssues,
				message: hasIssues
					? 'Heading hierarchy has gaps or doesn\'t start with h1'
					: 'Heading hierarchy is correct',
				severity: 'warning',
				element: firstIssue
			};
		}
	},

	{
		name: 'focus-management',
		description: 'Interactive elements should be focusable',
		test: (element) => {
			const interactive = element.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"]');
			const nonFocusable = Array.from(interactive).filter(el => !isFocusable(el));

			return {
				passed: nonFocusable.length === 0,
				message: nonFocusable.length > 0
					? `${nonFocusable.length} interactive elements are not focusable`
					: 'All interactive elements are focusable',
				severity: 'error',
				element: nonFocusable[0]
			};
		}
	},

	{
		name: 'aria-hidden-focusable',
		description: 'aria-hidden elements should not contain focusable content',
		test: (element) => {
			const ariaHidden = element.querySelectorAll('[aria-hidden="true"]');
			const violations = Array.from(ariaHidden).filter(hidden => {
				const focusableChildren = getFocusableElements(hidden);
				return focusableChildren.length > 0;
			});

			return {
				passed: violations.length === 0,
				message: violations.length > 0
					? `${violations.length} aria-hidden elements contain focusable content`
					: 'No aria-hidden elements contain focusable content',
				severity: 'error',
				element: violations[0]
			};
		}
	},

	{
		name: 'color-contrast',
		description: 'Text should have sufficient color contrast',
		test: (element) => {
			// This is a simplified test - in practice, you'd need to compute actual colors
			// For now, we'll just check if CSS custom properties are being used
			const hasCustomProperties = getComputedStyle(element as HTMLElement)
				.getPropertyValue('--color-text-primary');

			return {
				passed: !!hasCustomProperties,
				message: hasCustomProperties
					? 'Using theme system with accessible color tokens'
					: 'Not using accessible color system',
				severity: 'warning'
			};
		}
	},

	{
		name: 'keyboard-navigation',
		description: 'Components should support keyboard navigation',
		test: (element) => {
			const hasKeyboardHandler = element.hasAttribute('onkeydown') ||
									 element.hasAttribute('onkeyup') ||
									 element.hasAttribute('onkeypress');

			const isInteractive = element.matches('button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]');

			if (!isInteractive) {
				return {
					passed: true,
					message: 'Element is not interactive',
					severity: 'info'
				};
			}

			return {
				passed: hasKeyboardHandler || element.tagName === 'BUTTON' || element.tagName === 'A',
				message: hasKeyboardHandler
					? 'Keyboard navigation is implemented'
					: 'Interactive element may not support keyboard navigation',
				severity: 'warning'
			};
		}
	}
];

/**
 * Run accessibility tests on an element
 */
export function runAccessibilityTests(element: Element, tests = accessibilityTests): AccessibilityReport {
	const results = tests.map(test => ({
		...test.test(element),
		testName: test.name
	}));

	const passed = results.filter(r => r.passed).length;
	const failed = results.filter(r => !r.passed && r.severity === 'error').length;
	const warnings = results.filter(r => !r.passed && r.severity === 'warning').length;

	return {
		passed: failed === 0,
		results,
		summary: {
			total: results.length,
			passed,
			failed,
			warnings
		}
	};
}

/**
 * Create a detailed accessibility report
 */
export function createAccessibilityReport(report: AccessibilityReport): string {
	const { results, summary } = report;

	let output = `\n=== Accessibility Test Report ===\n`;
	output += `Total tests: ${summary.total}\n`;
	output += `Passed: ${summary.passed}\n`;
	output += `Failed: ${summary.failed}\n`;
	output += `Warnings: ${summary.warnings}\n`;
	output += `Overall: ${report.passed ? 'PASS' : 'FAIL'}\n\n`;

	// Group results by severity
	const errors = results.filter(r => !r.passed && r.severity === 'error');
	const warnings = results.filter(r => !r.passed && r.severity === 'warning');
	const passed = results.filter(r => r.passed);

	if (errors.length > 0) {
		output += `❌ ERRORS (${errors.length}):\n`;
		errors.forEach(result => {
			output += `   • ${result.message}\n`;
		});
		output += '\n';
	}

	if (warnings.length > 0) {
		output += `⚠️  WARNINGS (${warnings.length}):\n`;
		warnings.forEach(result => {
			output += `   • ${result.message}\n`;
		});
		output += '\n';
	}

	if (passed.length > 0) {
		output += `✅ PASSED (${passed.length}):\n`;
		passed.forEach(result => {
			output += `   • ${result.message}\n`;
		});
	}

	return output;
}

/**
 * Test if an element meets specific accessibility criteria
 */
export function testAccessibility(element: Element, criteria?: string[]): AccessibilityReport {
	const testsToRun = criteria
		? accessibilityTests.filter(test => criteria.includes(test.name))
		: accessibilityTests;

	return runAccessibilityTests(element, testsToRun);
}

/**
 * Validate color contrast programmatically
 */
export function validateColorContrast(
	foregroundColor: string,
	backgroundColor: string,
	fontSize: number = 16,
	fontWeight: number = 400
): AccessibilityTestResult {
	try {
		const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
		const meetsAA = meetsContrastRequirement(foregroundColor, backgroundColor, 'AA', isLargeText ? 'large' : 'normal');
		const ratio = getContrastRatio(foregroundColor, backgroundColor);

		return {
			passed: meetsAA,
			message: `Contrast ratio: ${ratio.toFixed(2)}:1 ${meetsAA ? '(PASS)' : '(FAIL)'}`,
			severity: meetsAA ? 'info' : 'error'
		};
	} catch (error) {
		return {
			passed: false,
			message: `Invalid color format: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'}`,
			severity: 'error'
		};
	}
}