#!/usr/bin/env node

/**
 * Security Testing Script
 *
 * This script performs practical security tests against the running application
 * to validate that all security measures are working correctly.
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class SecurityTester {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  async test(name, testFunction) {
    this.log(`\n${colors.blue}Testing: ${name}${colors.reset}`);
    const start = performance.now();

    try {
      const result = await testFunction();
      const duration = (performance.now() - start).toFixed(2);

      if (result.success) {
        this.log(`  ✅ ${result.message} (${duration}ms)`, colors.green);
      } else {
        this.log(`  ❌ ${result.message} (${duration}ms)`, colors.red);
      }

      this.results.push({
        name,
        success: result.success,
        message: result.message,
        duration: parseFloat(duration),
        details: result.details
      });

      return result;
    } catch (error) {
      const duration = (performance.now() - start).toFixed(2);
      this.log(`  💥 Error: ${error.message} (${duration}ms)`, colors.red);

      this.results.push({
        name,
        success: false,
        message: error.message,
        duration: parseFloat(duration),
        error: error.stack
      });

      return { success: false, message: error.message };
    }
  }

  async testSecurityHeaders() {
    return this.test('Security Headers', async () => {
      const response = await fetch(`${this.baseUrl}/`);
      const headers = response.headers;

      const requiredHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'referrer-policy',
        'permissions-policy'
      ];

      const missingHeaders = requiredHeaders.filter(header => !headers.get(header));

      if (missingHeaders.length > 0) {
        return {
          success: false,
          message: `Missing security headers: ${missingHeaders.join(', ')}`,
          details: { missingHeaders }
        };
      }

      return {
        success: true,
        message: 'All required security headers are present',
        details: {
          'X-Frame-Options': headers.get('x-frame-options'),
          'X-Content-Type-Options': headers.get('x-content-type-options'),
          'X-XSS-Protection': headers.get('x-xss-protection'),
          'Referrer-Policy': headers.get('referrer-policy'),
          'Permissions-Policy': headers.get('permissions-policy')
        }
      };
    });
  }

  async testCSPHeaders() {
    return this.test('Content Security Policy', async () => {
      const response = await fetch(`${this.baseUrl}/`);
      const cspHeader = response.headers.get('content-security-policy');

      if (!cspHeader) {
        return {
          success: false,
          message: 'Content-Security-Policy header is missing'
        };
      }

      const requiredDirectives = ['default-src', 'script-src', 'style-src', 'object-src'];
      const missingDirectives = requiredDirectives.filter(directive =>
        !cspHeader.includes(directive)
      );

      if (missingDirectives.length > 0) {
        return {
          success: false,
          message: `CSP missing required directives: ${missingDirectives.join(', ')}`,
          details: { cspHeader, missingDirectives }
        };
      }

      return {
        success: true,
        message: 'CSP header contains required directives',
        details: { cspHeader }
      };
    });
  }

  async testRateLimiting() {
    return this.test('Rate Limiting', async () => {
      const endpoint = `${this.baseUrl}/api/health`;
      const requests = [];

      // Send multiple rapid requests
      for (let i = 0; i < 100; i++) {
        requests.push(fetch(endpoint));
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      if (rateLimitedResponses.length === 0) {
        return {
          success: false,
          message: 'Rate limiting not working - no 429 responses received',
          details: { totalRequests: requests.length, rateLimitedCount: 0 }
        };
      }

      // Check for rate limit headers
      const rateLimitedResponse = rateLimitedResponses[0];
      const headers = {
        limit: rateLimitedResponse.headers.get('x-ratelimit-limit'),
        remaining: rateLimitedResponse.headers.get('x-ratelimit-remaining'),
        reset: rateLimitedResponse.headers.get('x-ratelimit-reset'),
        retryAfter: rateLimitedResponse.headers.get('retry-after')
      };

      const hasRateLimitHeaders = Object.values(headers).some(h => h !== null);

      return {
        success: true,
        message: `Rate limiting working - ${rateLimitedResponses.length} requests blocked`,
        details: {
          totalRequests: requests.length,
          rateLimitedCount: rateLimitedResponses.length,
          headers,
          hasRateLimitHeaders
        }
      };
    });
  }

  async testCSRFProtection() {
    return this.test('CSRF Protection', async () => {
      try {
        // Try to make a POST request without CSRF token
        const response = await fetch(`${this.baseUrl}/api/topics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: 'Test Topic',
            description: 'Test Description',
            eventId: 'test-event'
          })
        });

        if (response.status === 403) {
          return {
            success: true,
            message: 'CSRF protection working - request blocked without token',
            details: { status: response.status }
          };
        } else {
          return {
            success: false,
            message: `Expected 403 for missing CSRF token, got ${response.status}`,
            details: { status: response.status }
          };
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          return {
            success: false,
            message: 'Cannot connect to server - is it running?'
          };
        }
        throw error;
      }
    });
  }

  async testXSSProtection() {
    return this.test('XSS Protection', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">'
      ];

      for (const payload of xssPayloads) {
        try {
          const response = await fetch(`${this.baseUrl}/api/topics`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: payload,
              description: 'Test Description',
              eventId: 'test-event'
            })
          });

          // If the request succeeds, check if the payload was sanitized
          if (response.ok) {
            const data = await response.json();
            if (data.title && data.title.includes('<script>')) {
              return {
                success: false,
                message: 'XSS payload not sanitized',
                details: { payload, response: data }
              };
            }
          }
        } catch (error) {
          // Errors are expected for malicious payloads
        }
      }

      return {
        success: true,
        message: 'XSS protection appears to be working',
        details: { testedPayloads: xssPayloads.length }
      };
    });
  }

  async testSQLInjection() {
    return this.test('SQL Injection Protection', async () => {
      const sqlPayloads = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin' UNION SELECT * FROM users --",
        "1; EXEC xp_cmdshell('dir')"
      ];

      for (const payload of sqlPayloads) {
        try {
          const response = await fetch(`${this.baseUrl}/api/events?search=${encodeURIComponent(payload)}`);

          // If the request returns 400 (Bad Request), it's likely being blocked
          if (response.status === 400) {
            const data = await response.json();
            if (data.message && data.message.includes('Invalid input')) {
              continue; // This is expected for SQL injection attempts
            }
          }

          // If we get here and the request succeeded, it might be a problem
          if (response.ok) {
            return {
              success: false,
              message: 'SQL injection payload not blocked',
              details: { payload, status: response.status }
            };
          }
        } catch (error) {
          // Network errors are fine for this test
        }
      }

      return {
        success: true,
        message: 'SQL injection protection appears to be working',
        details: { testedPayloads: sqlPayloads.length }
      };
    });
  }

  async testAuthenticationSecurity() {
    return this.test('Authentication Security', async () => {
      const attempts = [];

      // Try multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        try {
          const response = await fetch(`${this.baseUrl}/api/auth/guest`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: 'nonexistent@example.com',
              password: 'wrongpassword'
            })
          });
          attempts.push(response.status);
        } catch (error) {
          // Expected for malicious attempts
        }
      }

      // Check if we got rate limited (429) or authentication errors
      const rateLimited = attempts.some(status => status === 429);
      const authErrors = attempts.some(status => status === 401 || status === 403);

      if (rateLimited || authErrors) {
        return {
          success: true,
          message: 'Authentication security working - failed attempts handled',
          details: { attempts, rateLimited, authErrors }
        };
      }

      return {
        success: false,
        message: 'Authentication security may have issues',
        details: { attempts }
      };
    });
  }

  async testHTTPS() {
    return this.test('HTTPS Enforcement', async () => {
      if (this.baseUrl.startsWith('https://')) {
        return {
          success: true,
          message: 'Using HTTPS',
          details: { protocol: 'https' }
        };
      }

      if (this.baseUrl.startsWith('http://localhost') || this.baseUrl.startsWith('http://127.0.0.1')) {
        return {
          success: true,
          message: 'HTTP on localhost is acceptable for development',
          details: { protocol: 'http', environment: 'development' }
        };
      }

      return {
        success: false,
        message: 'Should use HTTPS in production',
        details: { protocol: 'http', recommendation: 'Enable HTTPS' }
      };
    });
  }

  async runAllTests() {
    this.log(`${colors.bold}🔒 Security Testing Suite${colors.reset}`);
    this.log(`Testing: ${this.baseUrl}\n`);

    await this.testHTTPS();
    await this.testSecurityHeaders();
    await this.testCSPHeaders();
    await this.testRateLimiting();
    await this.testCSRFProtection();
    await this.testXSSProtection();
    await this.testSQLInjection();
    await this.testAuthenticationSecurity();

    this.generateReport();
  }

  generateReport() {
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.length - passed;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    this.log(`\n${colors.bold}📊 Security Test Report${colors.reset}`);
    this.log(`${'='.repeat(50)}`);
    this.log(`Total Tests: ${this.results.length}`);
    this.log(`Passed: ${passed}`, passed === this.results.length ? colors.green : colors.yellow);
    this.log(`Failed: ${failed}`, failed === 0 ? colors.green : colors.red);
    this.log(`Total Time: ${totalTime.toFixed(2)}ms`);
    this.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
      this.log(`\n${colors.red}❌ Failed Tests:${colors.reset}`);
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          this.log(`  • ${r.name}: ${r.message}`, colors.red);
        });
    }

    this.log(`\n${colors.bold}🔍 Detailed Results:${colors.reset}`);
    this.results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      const color = result.success ? colors.green : colors.red;
      this.log(`  ${icon} ${result.name} (${result.duration}ms)`, color);
      if (result.details) {
        this.log(`     Details: ${JSON.stringify(result.details, null, 2)}`, colors.blue);
      }
    });

    // Security recommendations
    this.log(`\n${colors.bold}🛡️  Security Recommendations:${colors.reset}`);
    if (failed === 0) {
      this.log(`  ✅ All security tests passed! Your application appears well-protected.`, colors.green);
    } else {
      this.log(`  ⚠️  Address the failed tests above to improve security.`, colors.yellow);
    }

    this.log(`  💡 Regular security testing is recommended.`);
    this.log(`  💡 Consider setting up automated security scans.`);
    this.log(`  💡 Keep all dependencies updated.`);
    this.log(`  💡 Monitor security logs regularly.`);

    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run the security tests
async function main() {
  const tester = new SecurityTester(BASE_URL);
  await tester.runAllTests();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(`${colors.red}💥 Test runner error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

export { SecurityTester };