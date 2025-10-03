/**
 * Security CI/CD Pipeline Configuration
 * Task 30.5 - Automated security scanning in CI/CD
 */

export interface SecurityScanConfig {
	enabled: boolean;
	tools: SecurityTool[];
	gates: SecurityGate[];
	notifications: NotificationConfig[];
}

export interface SecurityTool {
	name: string;
	type: 'SAST' | 'DAST' | 'SCA' | 'SECRET';
	command: string;
	failOnSeverity: 'critical' | 'high' | 'medium' | 'low';
	enabled: boolean;
}

export interface SecurityGate {
	name: string;
	condition: string;
	blockDeployment: boolean;
}

export interface NotificationConfig {
	channel: string;
	severity: string[];
	recipients: string[];
}

/**
 * Security scanning configuration for CI/CD pipeline
 */
export const securityScanConfig: SecurityScanConfig = {
	enabled: true,
	tools: [
		{
			name: 'npm-audit',
			type: 'SCA',
			command: 'npm audit --audit-level=moderate',
			failOnSeverity: 'high',
			enabled: true
		},
		{
			name: 'eslint-security',
			type: 'SAST',
			command: 'eslint --ext .ts,.js,.svelte src --plugin security',
			failOnSeverity: 'high',
			enabled: true
		},
		{
			name: 'semgrep',
			type: 'SAST',
			command: 'semgrep --config=auto src/',
			failOnSeverity: 'high',
			enabled: false // Enable when semgrep is installed
		},
		{
			name: 'snyk',
			type: 'SCA',
			command: 'snyk test --severity-threshold=high',
			failOnSeverity: 'high',
			enabled: false // Enable with Snyk token
		},
		{
			name: 'git-secrets',
			type: 'SECRET',
			command: 'git secrets --scan',
			failOnSeverity: 'critical',
			enabled: false // Enable when git-secrets is installed
		}
	],
	gates: [
		{
			name: 'no-critical-vulnerabilities',
			condition: 'criticalVulnerabilities === 0',
			blockDeployment: true
		},
		{
			name: 'no-high-vulnerabilities',
			condition: 'highVulnerabilities === 0',
			blockDeployment: true
		},
		{
			name: 'dependency-scan-passed',
			condition: 'npmAudit.exitCode === 0',
			blockDeployment: true
		},
		{
			name: 'no-hardcoded-secrets',
			condition: 'secretsFound === 0',
			blockDeployment: true
		}
	],
	notifications: [
		{
			channel: 'slack',
			severity: ['critical', 'high'],
			recipients: ['#security-alerts']
		},
		{
			channel: 'email',
			severity: ['critical'],
			recipients: ['security-team@example.com']
		}
	]
};

/**
 * GitHub Actions workflow configuration
 */
export const githubActionsWorkflow = `
name: Security Scanning

on:
  pull_request:
    branches: [ main, develop ]
  push:
    branches: [ main ]
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'

jobs:
  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
        continue-on-error: false
      
      - name: Run ESLint security check
        run: npm run lint
        continue-on-error: false
      
      - name: Run Snyk security scan
        if: \${{ secrets.SNYK_TOKEN }}
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: \${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: auto
      
      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
      
      - name: Upload security scan results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-scan-results
          path: |
            npm-audit.json
            eslint-results.json
            semgrep-results.json
      
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🔒 Security scan completed. Check the workflow run for details.'
            })
`;

/**
 * ESLint security plugin configuration
 */
export const eslintSecurityConfig = {
	extends: ['plugin:security/recommended'],
	plugins: ['security'],
	rules: {
		'security/detect-object-injection': 'warn',
		'security/detect-non-literal-regexp': 'warn',
		'security/detect-unsafe-regex': 'error',
		'security/detect-buffer-noassert': 'error',
		'security/detect-child-process': 'warn',
		'security/detect-disable-mustache-escape': 'error',
		'security/detect-eval-with-expression': 'error',
		'security/detect-no-csrf-before-method-override': 'error',
		'security/detect-non-literal-fs-filename': 'warn',
		'security/detect-non-literal-require': 'warn',
		'security/detect-possible-timing-attacks': 'warn',
		'security/detect-pseudoRandomBytes': 'error'
	}
};

/**
 * Package.json scripts for security scanning
 */
export const packageJsonSecurityScripts = {
	'security:audit': 'npm audit --audit-level=moderate',
	'security:fix': 'npm audit fix',
	'security:check': 'npm run security:audit && npm run lint',
	'security:report': 'npm audit --json > security-report.json',
	'precommit': 'npm run security:check'
};

/**
 * Pre-commit hook configuration
 */
export const preCommitHook = `#!/bin/sh
# Pre-commit hook for security checks

echo "🔒 Running security checks..."

# Run npm audit
npm audit --audit-level=moderate
if [ $? -ne 0 ]; then
  echo "❌ npm audit failed! Please fix vulnerabilities before committing."
  exit 1
fi

# Run linting with security rules
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Security linting failed! Please fix issues before committing."
  exit 1
fi

echo "✅ Security checks passed!"
exit 0
`;

/**
 * Dependabot configuration
 */
export const dependabotConfig = `
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
    open-pull-requests-limit: 10
    reviewers:
      - "security-team"
    labels:
      - "dependencies"
      - "security"
    commit-message:
      prefix: "security"
      include: "scope"
    # Enable security updates
    security-updates-only: false
    versioning-strategy: increase
`;

/**
 * Security scanning orchestrator
 */
export class SecurityScanner {
	/**
	 * Run all enabled security scans
	 */
	static async runAllScans(): Promise<{
		passed: boolean;
		results: any[];
		summary: string;
	}> {
		const results = [];
		let allPassed = true;

		for (const tool of securityScanConfig.tools) {
			if (!tool.enabled) continue;

			console.log(`Running ${tool.name}...`);
			const result = await this.runTool(tool);
			results.push(result);

			if (!result.passed) {
				allPassed = false;
			}
		}

		// Check security gates
		const gatesPassed = this.checkSecurityGates(results);

		return {
			passed: allPassed && gatesPassed,
			results,
			summary: `Security scanning ${allPassed && gatesPassed ? 'PASSED' : 'FAILED'}`
		};
	}

	/**
	 * Run individual security tool
	 */
	private static async runTool(tool: SecurityTool): Promise<any> {
		// In real implementation, this would execute the tool command
		return {
			name: tool.name,
			type: tool.type,
			passed: true,
			vulnerabilities: {
				critical: 0,
				high: 0,
				medium: 0,
				low: 0
			}
		};
	}

	/**
	 * Check security gates
	 */
	private static checkSecurityGates(results: any[]): boolean {
		for (const gate of securityScanConfig.gates) {
			if (gate.blockDeployment) {
				// Evaluate gate condition
				// In real implementation, this would evaluate the condition
				console.log(`Checking gate: ${gate.name}`);
			}
		}
		return true;
	}

	/**
	 * Send security notifications
	 */
	static async sendNotifications(results: any[]): Promise<void> {
		for (const notification of securityScanConfig.notifications) {
			// In real implementation, this would send actual notifications
			console.log(`Sending ${notification.channel} notification to ${notification.recipients.join(', ')}`);
		}
	}
}
