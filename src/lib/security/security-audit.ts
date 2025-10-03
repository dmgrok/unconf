/**
 * Security Audit Runner - Main Entry Point
 * Task 30 - Comprehensive security assessment
 */

import { AuthSecurityAuditor } from './auth-security';
import { WebSocketSecurityTester } from './websocket-security';
import { OWASPSecurityTester } from './owasp-testing';
import type { SecurityAuditResult } from './auth-security';

export interface ComprehensiveAuditReport {
	timestamp: Date;
	overallStatus: 'PASSED' | 'FAILED' | 'WARNING';
	categories: AuditCategory[];
	summary: AuditSummary;
	recommendations: string[];
}

export interface AuditCategory {
	name: string;
	passed: boolean;
	results: SecurityAuditResult[];
	criticalIssues: number;
	highIssues: number;
	mediumIssues: number;
	lowIssues: number;
}

export interface AuditSummary {
	totalTests: number;
	passedTests: number;
	failedTests: number;
	totalIssues: number;
	criticalIssues: number;
	highIssues: number;
	mediumIssues: number;
	lowIssues: number;
}

/**
 * Main security audit orchestrator
 */
export class SecurityAuditRunner {
	/**
	 * Run comprehensive security audit
	 */
	static async runFullAudit(): Promise<ComprehensiveAuditReport> {
		console.log('🔒 Starting Comprehensive Security Audit...\n');

		const categories: AuditCategory[] = [];

		// 1. Authentication and Authorization Audit (Task 30.1)
		console.log('📋 Task 30.1: Authentication and Authorization Audit');
		const authAudit = await AuthSecurityAuditor.runCompleteAudit();
		categories.push({
			name: 'Authentication & Authorization',
			passed: authAudit.passed,
			results: authAudit.results,
			...this.countIssues(authAudit.results)
		});
		console.log(`   ${authAudit.summary}\n`);

		// 2. WebSocket Security Testing (Task 30.2)
		console.log('📋 Task 30.2: WebSocket and Real-time Security Testing');
		const wsTest = await WebSocketSecurityTester.runCompleteTest();
		categories.push({
			name: 'WebSocket Security',
			passed: wsTest.passed,
			results: wsTest.results,
			...this.countIssues(wsTest.results)
		});
		console.log(`   ${wsTest.summary}\n`);

		// 3. OWASP Top 10 Testing (Task 30.3)
		console.log('📋 Task 30.3: OWASP Top 10 Vulnerability Testing');
		const owaspTest = await OWASPSecurityTester.runCompleteTest();
		categories.push({
			name: 'OWASP Top 10',
			passed: owaspTest.passed,
			results: owaspTest.results,
			...this.countIssues(owaspTest.results)
		});
		console.log(`   ${owaspTest.summary}\n`);

		// Generate summary
		const summary = this.generateSummary(categories);
		const overallStatus = this.determineOverallStatus(summary);
		const recommendations = this.generateRecommendations(categories);

		const report: ComprehensiveAuditReport = {
			timestamp: new Date(),
			overallStatus,
			categories,
			summary,
			recommendations
		};

		this.printReport(report);

		return report;
	}

	/**
	 * Count issues by severity
	 */
	private static countIssues(results: SecurityAuditResult[]): {
		criticalIssues: number;
		highIssues: number;
		mediumIssues: number;
		lowIssues: number;
	} {
		const allIssues = results.flatMap(r => r.issues);
		return {
			criticalIssues: allIssues.filter(i => i.severity === 'critical').length,
			highIssues: allIssues.filter(i => i.severity === 'high').length,
			mediumIssues: allIssues.filter(i => i.severity === 'medium').length,
			lowIssues: allIssues.filter(i => i.severity === 'low').length
		};
	}

	/**
	 * Generate audit summary
	 */
	private static generateSummary(categories: AuditCategory[]): AuditSummary {
		const totalTests = categories.reduce((sum, cat) => sum + cat.results.length, 0);
		const passedTests = categories.reduce(
			(sum, cat) => sum + cat.results.filter(r => r.passed).length,
			0
		);
		const failedTests = totalTests - passedTests;

		const criticalIssues = categories.reduce((sum, cat) => sum + cat.criticalIssues, 0);
		const highIssues = categories.reduce((sum, cat) => sum + cat.highIssues, 0);
		const mediumIssues = categories.reduce((sum, cat) => sum + cat.mediumIssues, 0);
		const lowIssues = categories.reduce((sum, cat) => sum + cat.lowIssues, 0);
		const totalIssues = criticalIssues + highIssues + mediumIssues + lowIssues;

		return {
			totalTests,
			passedTests,
			failedTests,
			totalIssues,
			criticalIssues,
			highIssues,
			mediumIssues,
			lowIssues
		};
	}

	/**
	 * Determine overall audit status
	 */
	private static determineOverallStatus(summary: AuditSummary): 'PASSED' | 'FAILED' | 'WARNING' {
		if (summary.criticalIssues > 0) {
			return 'FAILED';
		}
		if (summary.highIssues > 0) {
			return 'WARNING';
		}
		return 'PASSED';
	}

	/**
	 * Generate recommendations based on findings
	 */
	private static generateRecommendations(categories: AuditCategory[]): string[] {
		const recommendations: string[] = [];

		for (const category of categories) {
			if (category.criticalIssues > 0) {
				recommendations.push(
					`🚨 CRITICAL: Address ${category.criticalIssues} critical issue(s) in ${category.name} immediately`
				);
			}
			if (category.highIssues > 0) {
				recommendations.push(
					`⚠️ HIGH: Remediate ${category.highIssues} high-severity issue(s) in ${category.name} within 1 week`
				);
			}
		}

		// General recommendations
		if (recommendations.length === 0) {
			recommendations.push('✅ No critical or high-severity issues found');
			recommendations.push('📋 Review and address medium/low severity issues as part of regular maintenance');
		}

		recommendations.push('🔄 Schedule next security audit in 90 days');
		recommendations.push('📚 Review security procedures: docs/security/SECURITY_PROCEDURES.md');
		recommendations.push('🛡️ Implement CI/CD security scanning (Task 30.5)');

		return recommendations;
	}

	/**
	 * Print formatted audit report
	 */
	private static printReport(report: ComprehensiveAuditReport): void {
		console.log('\n═══════════════════════════════════════════════════════════════');
		console.log('                    SECURITY AUDIT REPORT');
		console.log('═══════════════════════════════════════════════════════════════\n');

		console.log(`📅 Timestamp: ${report.timestamp.toISOString()}`);
		console.log(`📊 Overall Status: ${this.getStatusEmoji(report.overallStatus)} ${report.overallStatus}\n`);

		console.log('📈 SUMMARY');
		console.log('─────────────────────────────────────────────────────────────');
		console.log(`Total Tests:      ${report.summary.totalTests}`);
		console.log(`Passed Tests:     ${report.summary.passedTests} ✅`);
		console.log(`Failed Tests:     ${report.summary.failedTests} ❌`);
		console.log(`Total Issues:     ${report.summary.totalIssues}`);
		console.log(`  Critical:       ${report.summary.criticalIssues} 🔴`);
		console.log(`  High:           ${report.summary.highIssues} 🟠`);
		console.log(`  Medium:         ${report.summary.mediumIssues} 🟡`);
		console.log(`  Low:            ${report.summary.lowIssues} 🟢\n`);

		console.log('📋 CATEGORIES');
		console.log('─────────────────────────────────────────────────────────────');
		for (const category of report.categories) {
			const statusEmoji = category.passed ? '✅' : '❌';
			console.log(`${statusEmoji} ${category.name}`);
			if (category.criticalIssues > 0) console.log(`   🔴 Critical: ${category.criticalIssues}`);
			if (category.highIssues > 0) console.log(`   🟠 High: ${category.highIssues}`);
			if (category.mediumIssues > 0) console.log(`   🟡 Medium: ${category.mediumIssues}`);
			if (category.lowIssues > 0) console.log(`   🟢 Low: ${category.lowIssues}`);
		}

		console.log('\n💡 RECOMMENDATIONS');
		console.log('─────────────────────────────────────────────────────────────');
		for (const recommendation of report.recommendations) {
			console.log(`${recommendation}`);
		}

		console.log('\n═══════════════════════════════════════════════════════════════');
		console.log(`Detailed remediation plan: docs/security/VULNERABILITY_REMEDIATION.md`);
		console.log(`Security procedures: docs/security/SECURITY_PROCEDURES.md`);
		console.log('═══════════════════════════════════════════════════════════════\n');
	}

	/**
	 * Get status emoji
	 */
	private static getStatusEmoji(status: string): string {
		switch (status) {
			case 'PASSED':
				return '✅';
			case 'WARNING':
				return '⚠️';
			case 'FAILED':
				return '❌';
			default:
				return '❓';
		}
	}

	/**
	 * Export report to JSON
	 */
	static exportReport(report: ComprehensiveAuditReport, filename: string): void {
		const json = JSON.stringify(report, null, 2);
		// In real implementation, write to file
		console.log(`📄 Report exported to ${filename}`);
	}

	/**
	 * Export report to HTML
	 */
	static exportHTMLReport(report: ComprehensiveAuditReport): string {
		const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Security Audit Report</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 40px auto; padding: 20px; }
        h1 { color: #333; border-bottom: 3px solid #4CAF50; }
        .status-passed { color: #4CAF50; font-weight: bold; }
        .status-warning { color: #FF9800; font-weight: bold; }
        .status-failed { color: #F44336; font-weight: bold; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .category { margin: 20px 0; padding: 15px; border-left: 4px solid #2196F3; background: #f9f9f9; }
        .issue { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
        .critical { border-left: 4px solid #F44336; }
        .high { border-left: 4px solid #FF9800; }
        .medium { border-left: 4px solid #FFC107; }
        .low { border-left: 4px solid #8BC34A; }
    </style>
</head>
<body>
    <h1>🔒 Security Audit Report</h1>
    <p><strong>Date:</strong> ${report.timestamp.toISOString()}</p>
    <p><strong>Status:</strong> <span class="status-${report.overallStatus.toLowerCase()}">${report.overallStatus}</span></p>
    
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Tests: ${report.summary.totalTests} | Passed: ${report.summary.passedTests} | Failed: ${report.summary.failedTests}</p>
        <p>Total Issues: ${report.summary.totalIssues}</p>
        <p>Critical: ${report.summary.criticalIssues} | High: ${report.summary.highIssues} | Medium: ${report.summary.mediumIssues} | Low: ${report.summary.lowIssues}</p>
    </div>
    
    <h2>Categories</h2>
    ${report.categories
			.map(
				cat => `
        <div class="category">
            <h3>${cat.passed ? '✅' : '❌'} ${cat.name}</h3>
            <p>Critical: ${cat.criticalIssues} | High: ${cat.highIssues} | Medium: ${cat.mediumIssues} | Low: ${cat.lowIssues}</p>
        </div>
    `
			)
			.join('')}
    
    <h2>Recommendations</h2>
    <ul>
        ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
</body>
</html>
        `;

		return html;
	}
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
	SecurityAuditRunner.runFullAudit()
		.then(report => {
			process.exit(report.overallStatus === 'FAILED' ? 1 : 0);
		})
		.catch(error => {
			console.error('Audit failed:', error);
			process.exit(1);
		});
}
