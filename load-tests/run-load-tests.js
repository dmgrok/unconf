#!/usr/bin/env node

/**
 * Load Testing Runner for UnConf Platform
 * Orchestrates WebSocket and HTTP load tests with performance monitoring
 */

import { spawn } from 'child_process';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class LoadTestRunner {
  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.resultsDir = join(__dirname, 'results');
    this.baselineMetrics = {
      maxResponseTime: 2000, // 2 seconds
      maxConcurrentUsers: 200,
      minSuccessRate: 95, // 95%
      maxErrorRate: 5, // 5%
      maxMemoryUsage: 512, // MB
      maxCpuUsage: 80 // %
    };
  }

  async ensureResultsDirectory() {
    try {
      await mkdir(this.resultsDir, { recursive: true });
      console.log(`📁 Results directory ready: ${this.resultsDir}`);
    } catch (error) {
      console.error('Failed to create results directory:', error);
      throw error;
    }
  }

  async runArtilleryTest(configPath, testName) {
    return new Promise((resolve, reject) => {
      console.log(`🚀 Starting ${testName} load test...`);

      const artillery = spawn('npx', ['artillery', 'run', configPath], {
        stdio: 'pipe',
        cwd: dirname(__dirname)
      });

      let stdout = '';
      let stderr = '';

      artillery.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        // Show real-time progress
        if (output.includes('Scenarios launched:') || output.includes('Scenarios completed:')) {
          console.log(`  ${output.trim()}`);
        }
      });

      artillery.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      artillery.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ ${testName} load test completed successfully`);
          resolve({ stdout, stderr, exitCode: code });
        } else {
          console.error(`❌ ${testName} load test failed with exit code ${code}`);
          console.error('Error output:', stderr);
          reject(new Error(`Artillery test failed: ${stderr}`));
        }
      });

      artillery.on('error', (error) => {
        console.error(`❌ Failed to start ${testName} load test:`, error);
        reject(error);
      });
    });
  }

  async generateReport(testResults) {
    const report = {
      timestamp: this.timestamp,
      summary: {
        totalTests: testResults.length,
        passedTests: testResults.filter(t => t.passed).length,
        failedTests: testResults.filter(t => !t.passed).length,
        overallStatus: testResults.every(t => t.passed) ? 'PASSED' : 'FAILED'
      },
      baseline: this.baselineMetrics,
      tests: testResults,
      recommendations: this.generateRecommendations(testResults)
    };

    const reportPath = join(this.resultsDir, `load-test-report-${this.timestamp}.json`);
    await writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable report
    const readableReport = this.generateReadableReport(report);
    const readableReportPath = join(this.resultsDir, `load-test-report-${this.timestamp}.md`);
    await writeFile(readableReportPath, readableReport);

    console.log(`📊 Load test report generated:`);
    console.log(`  - JSON: ${reportPath}`);
    console.log(`  - Markdown: ${readableReportPath}`);

    return report;
  }

  generateRecommendations(testResults) {
    const recommendations = [];

    const failedTests = testResults.filter(t => !t.passed);
    if (failedTests.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Test failures detected',
        description: `${failedTests.length} out of ${testResults.length} tests failed`,
        actions: [
          'Check server logs for errors during peak load',
          'Verify WebSocket connection stability',
          'Review resource utilization metrics',
          'Consider scaling infrastructure'
        ]
      });
    }

    // Add specific recommendations based on metrics
    testResults.forEach(test => {
      if (test.metrics?.responseTime?.max > this.baselineMetrics.maxResponseTime) {
        recommendations.push({
          priority: 'MEDIUM',
          issue: 'High response times detected',
          description: `Maximum response time ${test.metrics.responseTime.max}ms exceeded baseline ${this.baselineMetrics.maxResponseTime}ms`,
          actions: [
            'Optimize database queries',
            'Implement caching layers',
            'Review server-side performance bottlenecks',
            'Consider CDN implementation'
          ]
        });
      }
    });

    return recommendations;
  }

  generateReadableReport(report) {
    return `# UnConf Platform Load Test Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}
**Overall Status:** ${report.summary.overallStatus === 'PASSED' ? '✅ PASSED' : '❌ FAILED'}

## Summary

- **Total Tests:** ${report.summary.totalTests}
- **Passed:** ${report.summary.passedTests}
- **Failed:** ${report.summary.failedTests}

## Performance Baseline

- **Max Response Time:** ${report.baseline.maxResponseTime}ms
- **Max Concurrent Users:** ${report.baseline.maxConcurrentUsers}
- **Min Success Rate:** ${report.baseline.minSuccessRate}%
- **Max Error Rate:** ${report.baseline.maxErrorRate}%

## Test Results

${report.tests.map(test => `
### ${test.name}
- **Status:** ${test.passed ? '✅ PASSED' : '❌ FAILED'}
- **Duration:** ${test.duration}s
- **Concurrent Users:** ${test.concurrentUsers || 'N/A'}
${test.metrics ? `
- **Response Times:**
  - Average: ${test.metrics.responseTime?.avg || 'N/A'}ms
  - Max: ${test.metrics.responseTime?.max || 'N/A'}ms
- **Success Rate:** ${test.metrics.successRate || 'N/A'}%
- **Error Rate:** ${test.metrics.errorRate || 'N/A'}%
` : ''}
`).join('\n')}

## Recommendations

${report.recommendations.length > 0 ?
  report.recommendations.map(rec => `
### ${rec.priority} Priority: ${rec.issue}

**Description:** ${rec.description}

**Recommended Actions:**
${rec.actions.map(action => `- ${action}`).join('\n')}
`).join('\n')
  : 'No specific recommendations. All tests passed baseline requirements.'}

## Notes

This load test simulates real-world usage patterns for the UnConf platform:
- WebSocket connections for real-time features
- HTTP requests for page loads and API calls
- Mixed user behaviors (voters, organizers, casual participants)
- Peak load of 200 concurrent users

For production deployment, ensure infrastructure can handle at least 1.5x the tested load to account for traffic spikes.
`;
  }

  parseArtilleryOutput(output) {
    // Parse Artillery output to extract metrics
    const metrics = {
      responseTime: {},
      successRate: 0,
      errorRate: 0
    };

    // Extract response times
    const responseTimeMatch = output.match(/Response time.*?avg:\s*(\d+\.?\d*).*?max:\s*(\d+\.?\d*)/s);
    if (responseTimeMatch) {
      metrics.responseTime.avg = parseFloat(responseTimeMatch[1]);
      metrics.responseTime.max = parseFloat(responseTimeMatch[2]);
    }

    // Extract success/error rates
    const errorMatch = output.match(/Errors:\s*(\d+)/);
    const totalMatch = output.match(/Scenarios completed:\s*(\d+)/);

    if (errorMatch && totalMatch) {
      const errors = parseInt(errorMatch[1]);
      const total = parseInt(totalMatch[1]);
      metrics.errorRate = (errors / total) * 100;
      metrics.successRate = ((total - errors) / total) * 100;
    }

    return metrics;
  }

  async runAllTests() {
    try {
      console.log('🎯 Starting UnConf Platform Load Testing Suite');
      console.log(`📅 Timestamp: ${this.timestamp}`);

      await this.ensureResultsDirectory();

      const testResults = [];

      // Test 1: WebSocket Load Test
      try {
        const startTime = Date.now();
        const wsResult = await this.runArtilleryTest(
          join(__dirname, 'artillery-config.yml'),
          'WebSocket'
        );
        const duration = (Date.now() - startTime) / 1000;

        const metrics = this.parseArtilleryOutput(wsResult.stdout);

        testResults.push({
          name: 'WebSocket Load Test',
          passed: wsResult.exitCode === 0 && metrics.errorRate <= this.baselineMetrics.maxErrorRate,
          duration,
          concurrentUsers: 200,
          metrics,
          output: wsResult.stdout
        });
      } catch (error) {
        testResults.push({
          name: 'WebSocket Load Test',
          passed: false,
          duration: 0,
          error: error.message
        });
      }

      // Test 2: HTTP Load Test
      try {
        const startTime = Date.now();
        const httpResult = await this.runArtilleryTest(
          join(__dirname, 'http-load-test.yml'),
          'HTTP'
        );
        const duration = (Date.now() - startTime) / 1000;

        const metrics = this.parseArtilleryOutput(httpResult.stdout);

        testResults.push({
          name: 'HTTP Load Test',
          passed: httpResult.exitCode === 0 && metrics.errorRate <= this.baselineMetrics.maxErrorRate,
          duration,
          concurrentUsers: 200,
          metrics,
          output: httpResult.stdout
        });
      } catch (error) {
        testResults.push({
          name: 'HTTP Load Test',
          passed: false,
          duration: 0,
          error: error.message
        });
      }

      // Generate comprehensive report
      const report = await this.generateReport(testResults);

      // Print summary
      console.log('\n📊 Load Test Summary:');
      console.log(`Overall Status: ${report.summary.overallStatus}`);
      console.log(`Tests Passed: ${report.summary.passedTests}/${report.summary.totalTests}`);

      if (report.recommendations.length > 0) {
        console.log('\n⚠️  Recommendations:');
        report.recommendations.forEach(rec => {
          console.log(`- ${rec.priority}: ${rec.issue}`);
        });
      }

      return report.summary.overallStatus === 'PASSED';

    } catch (error) {
      console.error('❌ Load testing suite failed:', error);
      return false;
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new LoadTestRunner();
  runner.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default LoadTestRunner;