#!/usr/bin/env node

/**
 * Test Coverage Validation Script for UnConf Platform
 * Validates test coverage meets quality gates and generates detailed reports
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class CoverageValidator {
  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.reportsDir = join(dirname(__dirname), 'coverage-reports');
    this.thresholds = {
      global: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      },
      critical: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      }
    };
    this.criticalFiles = [
      'src/lib/websocket/',
      'src/lib/storage/',
      'src/lib/auth/',
      'src/routes/api/'
    ];
  }

  async ensureReportsDirectory() {
    try {
      await mkdir(this.reportsDir, { recursive: true });
      console.log(`📁 Coverage reports directory ready: ${this.reportsDir}`);
    } catch (error) {
      console.error('Failed to create coverage reports directory:', error);
      throw error;
    }
  }

  async loadCoverageData() {
    try {
      const coverageFile = join(dirname(__dirname), 'coverage', 'coverage-summary.json');
      const coverageData = await readFile(coverageFile, 'utf-8');
      return JSON.parse(coverageData);
    } catch (error) {
      console.error('Failed to load coverage data:', error);
      throw new Error('Coverage data not found. Run tests with coverage first: npm run test:unit -- --coverage');
    }
  }

  validateThresholds(coverage, thresholds, context = 'global') {
    const results = {
      passed: true,
      violations: [],
      metrics: {}
    };

    const metrics = coverage.total || coverage;

    ['lines', 'functions', 'branches', 'statements'].forEach(metric => {
      const actual = metrics[metric]?.pct || 0;
      const required = thresholds[metric] || 0;

      results.metrics[metric] = {
        actual,
        required,
        passed: actual >= required
      };

      if (actual < required) {
        results.passed = false;
        results.violations.push({
          metric,
          actual,
          required,
          context,
          severity: actual < (required - 10) ? 'critical' : 'warning'
        });
      }
    });

    return results;
  }

  validateCriticalFiles(coverage) {
    const criticalResults = [];

    this.criticalFiles.forEach(criticalPath => {
      const criticalFiles = Object.keys(coverage).filter(file =>
        file.includes(criticalPath) && file !== 'total'
      );

      criticalFiles.forEach(file => {
        const fileResult = this.validateThresholds(
          coverage[file],
          this.thresholds.critical,
          `critical:${file}`
        );

        if (!fileResult.passed) {
          criticalResults.push({
            file,
            violations: fileResult.violations,
            metrics: fileResult.metrics
          });
        }
      });
    });

    return criticalResults;
  }

  calculateOverallScore(coverage) {
    const metrics = coverage.total;
    const weights = { lines: 0.3, functions: 0.3, branches: 0.2, statements: 0.2 };

    let weightedScore = 0;
    Object.entries(weights).forEach(([metric, weight]) => {
      const pct = metrics[metric]?.pct || 0;
      weightedScore += pct * weight;
    });

    return Math.round(weightedScore * 100) / 100;
  }

  generateTrends(coverage) {
    // In a real implementation, this would compare with historical data
    return {
      trend: 'stable', // 'improving', 'declining', 'stable'
      previousScore: null,
      changePercent: 0
    };
  }

  generateRecommendations(globalResult, criticalResults) {
    const recommendations = [];

    // Global threshold violations
    globalResult.violations.forEach(violation => {
      if (violation.severity === 'critical') {
        recommendations.push({
          priority: 'HIGH',
          category: 'Global Coverage',
          issue: `${violation.metric} coverage is critically low`,
          description: `${violation.metric} coverage is ${violation.actual}%, well below the required ${violation.required}%`,
          actions: [
            `Add comprehensive tests for ${violation.metric}`,
            'Focus on untested edge cases',
            'Review test strategy for effectiveness'
          ]
        });
      } else {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'Global Coverage',
          issue: `${violation.metric} coverage below threshold`,
          description: `${violation.metric} coverage is ${violation.actual}%, below the required ${violation.required}%`,
          actions: [
            `Add tests to improve ${violation.metric} coverage`,
            'Identify gaps in current test suite'
          ]
        });
      }
    });

    // Critical file violations
    criticalResults.forEach(result => {
      recommendations.push({
        priority: 'HIGH',
        category: 'Critical File Coverage',
        issue: `Critical file ${result.file} has insufficient coverage`,
        description: `This critical file has coverage violations that must be addressed`,
        actions: [
          'Add comprehensive unit tests',
          'Include integration tests for key workflows',
          'Test error handling and edge cases'
        ]
      });
    });

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'LOW',
        category: 'Maintenance',
        issue: 'Coverage targets met',
        description: 'All coverage thresholds are met. Focus on test quality and maintenance.',
        actions: [
          'Review tests for flakiness',
          'Optimize test execution time',
          'Add more integration tests',
          'Consider increasing coverage thresholds'
        ]
      });
    }

    return recommendations;
  }

  async generateReport(coverage) {
    const globalResult = this.validateThresholds(coverage, this.thresholds.global);
    const criticalResults = this.validateCriticalFiles(coverage);
    const overallScore = this.calculateOverallScore(coverage);
    const trends = this.generateTrends(coverage);
    const recommendations = this.generateRecommendations(globalResult, criticalResults);

    const report = {
      timestamp: this.timestamp,
      summary: {
        overallScore,
        passed: globalResult.passed && criticalResults.length === 0,
        totalFiles: Object.keys(coverage).length - 1, // exclude 'total'
        criticalViolations: criticalResults.length,
        globalViolations: globalResult.violations.length
      },
      thresholds: this.thresholds,
      global: {
        metrics: globalResult.metrics,
        violations: globalResult.violations,
        passed: globalResult.passed
      },
      critical: criticalResults,
      trends,
      recommendations,
      rawCoverage: coverage
    };

    // Save JSON report
    const jsonReportPath = join(this.reportsDir, `coverage-report-${this.timestamp}.json`);
    await writeFile(jsonReportPath, JSON.stringify(report, null, 2));

    // Generate human-readable report
    const readableReport = this.generateReadableReport(report);
    const mdReportPath = join(this.reportsDir, `coverage-report-${this.timestamp}.md`);
    await writeFile(mdReportPath, readableReport);

    console.log(`📊 Coverage reports generated:`);
    console.log(`  - JSON: ${jsonReportPath}`);
    console.log(`  - Markdown: ${mdReportPath}`);

    return report;
  }

  generateReadableReport(report) {
    const { summary, global, critical, recommendations } = report;

    return `# Test Coverage Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}
**Overall Score:** ${summary.overallScore}%
**Status:** ${summary.passed ? '✅ PASSED' : '❌ FAILED'}

## Summary

- **Total Files:** ${summary.totalFiles}
- **Overall Score:** ${summary.overallScore}%
- **Global Violations:** ${summary.globalViolations}
- **Critical File Violations:** ${summary.criticalViolations}

## Global Coverage Metrics

| Metric | Actual | Required | Status |
|---------|---------|----------|---------|
| Lines | ${global.metrics.lines?.actual || 0}% | ${global.metrics.lines?.required || 0}% | ${global.metrics.lines?.passed ? '✅' : '❌'} |
| Functions | ${global.metrics.functions?.actual || 0}% | ${global.metrics.functions?.required || 0}% | ${global.metrics.functions?.passed ? '✅' : '❌'} |
| Branches | ${global.metrics.branches?.actual || 0}% | ${global.metrics.branches?.required || 0}% | ${global.metrics.branches?.passed ? '✅' : '❌'} |
| Statements | ${global.metrics.statements?.actual || 0}% | ${global.metrics.statements?.required || 0}% | ${global.metrics.statements?.passed ? '✅' : '❌'} |

## Quality Gates

### Global Thresholds: ${global.passed ? '✅ PASSED' : '❌ FAILED'}

${global.violations.length > 0 ?
  global.violations.map(v => `- ❌ **${v.metric}**: ${v.actual}% (required: ${v.required}%)`).join('\n') :
  '- ✅ All global thresholds met'
}

### Critical Files: ${critical.length === 0 ? '✅ PASSED' : '❌ FAILED'}

${critical.length > 0 ?
  critical.map(c => `
**${c.file}**
${c.violations.map(v => `- ❌ ${v.metric}: ${v.actual}% (required: ${v.required}%)`).join('\n')}
`).join('\n') :
  '- ✅ All critical files meet enhanced thresholds'
}

## Recommendations

${recommendations.map(rec => `
### ${rec.priority} Priority: ${rec.issue}

**Category:** ${rec.category}
**Description:** ${rec.description}

**Recommended Actions:**
${rec.actions.map(action => `- ${action}`).join('\n')}
`).join('\n')}

## Notes

- **Global thresholds**: 80% minimum for all metrics
- **Critical file thresholds**: 90% lines/functions, 85% branches, 90% statements
- **Critical paths**: WebSocket, Storage, Auth, API routes

To improve coverage:
1. Run \`npm run test:unit -- --coverage\` to see detailed coverage
2. Use \`npm run test:unit -- --coverage --reporter=html\` for visual coverage report
3. Focus on untested files and functions with low coverage
`;
  }

  async validateAndReport() {
    try {
      console.log('🔍 Starting test coverage validation...');

      await this.ensureReportsDirectory();
      const coverage = await this.loadCoverageData();
      const report = await this.generateReport(coverage);

      // Print summary
      console.log('\n📊 Coverage Validation Summary:');
      console.log(`Overall Score: ${report.summary.overallScore}%`);
      console.log(`Status: ${report.summary.passed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Global Violations: ${report.summary.globalViolations}`);
      console.log(`Critical File Violations: ${report.summary.criticalViolations}`);

      if (report.recommendations.length > 0) {
        console.log('\n⚠️  Recommendations:');
        report.recommendations.forEach(rec => {
          console.log(`- ${rec.priority}: ${rec.issue}`);
        });
      }

      return report.summary.passed;

    } catch (error) {
      console.error('❌ Coverage validation failed:', error);
      return false;
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new CoverageValidator();
  validator.validateAndReport()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default CoverageValidator;