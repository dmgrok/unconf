# UnConf Platform Testing Guide

This document provides comprehensive information about the testing infrastructure and procedures for the UnConf platform.

## Overview

The UnConf platform implements a multi-layered testing strategy:

- **Unit Tests**: Component and function-level testing with Vitest
- **Integration Tests**: API and service integration testing
- **End-to-End Tests**: Full user journey testing with Playwright
- **Load Tests**: Performance testing with Artillery (200 concurrent users)
- **Accessibility Tests**: WCAG compliance testing with axe-core
- **Coverage Validation**: Quality gates and reporting

## Test Structure

```
tests/
├── a11y/                    # Accessibility tests
│   ├── accessibility.spec.ts
│   ├── accessibility-config.ts
│   ├── accessibility-runner.ts
│   └── comprehensive-a11y.spec.ts
├── e2e/                     # End-to-end tests
│   ├── authentication.spec.ts
│   ├── voting-system.spec.ts
│   ├── real-time.spec.ts
│   └── ...
├── pages/                   # Page object models
├── utils/                   # Test utilities
└── global-*.ts             # Global setup/teardown

src/test/                    # Unit test utilities
├── setup.ts                # Test environment setup
├── mocks/                  # Mock implementations
└── fixtures/               # Test data fixtures

load-tests/                  # Load testing
├── artillery-config.yml    # WebSocket load tests
├── http-load-test.yml      # HTTP load tests
├── run-load-tests.js       # Load test orchestrator
└── results/                # Load test reports

coverage-reports/            # Coverage validation reports
scripts/validate-coverage.js # Coverage validation script
```

## Running Tests

### Quick Start

```bash
# Install dependencies
npm install

# Run all test types
npm run test           # E2E tests (Playwright)
npm run test:unit      # Unit tests (Vitest)
npm run test:a11y      # Accessibility tests
npm run test:load      # Load tests (requires running server)

# Run with coverage
npm run test:coverage  # Unit tests with coverage
npm run test:coverage:full  # Coverage + validation
```

### Detailed Commands

#### Unit Tests
```bash
# Basic unit tests
npm run test:unit

# With coverage
npm run test:coverage

# With UI (browser-based test runner)
npm run test:unit -- --ui

# Watch mode
npm run test:unit -- --watch

# Specific test file
npm run test:unit src/lib/components/Button.test.ts
```

#### End-to-End Tests
```bash
# All E2E tests
npm run test

# Specific browser
npx playwright test --project=chromium

# Debug mode (opens browser)
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed

# Specific test file
npx playwright test tests/e2e/voting-system.spec.ts
```

#### Accessibility Tests
```bash
# All accessibility tests
npm run test:a11y

# With detailed HTML report
npm run test:a11y:full

# CI-friendly JSON output
npm run test:a11y:ci
```

#### Load Tests
```bash
# Ensure server is running first
npm run dev  # In one terminal

# Run all load tests
npm run test:load

# Individual load test types
npm run test:load:websocket  # WebSocket-only
npm run test:load:http       # HTTP-only
```

#### Coverage Validation
```bash
# Generate and validate coverage
npm run test:coverage:full

# Just validate existing coverage
npm run test:coverage:validate
```

## Test Configuration

### Unit Tests (Vitest)

Configuration in `vitest.config.ts`:
- **Environment**: jsdom for DOM testing
- **Coverage**: 80% minimum threshold for all metrics
- **Setup**: Global test utilities and mocks
- **Reporters**: Text, JSON, HTML

### E2E Tests (Playwright)

Configuration in `playwright.config.ts`:
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome/Safari
- **Retries**: 2 retries on CI, 0 locally
- **Timeouts**: 30s test timeout, 5s expect timeout
- **Reports**: HTML, JSON, JUnit
- **Screenshots/Videos**: On failure only

### Accessibility Tests (axe-core)

Configuration in `tests/a11y/accessibility-config.ts`:
- **WCAG Level**: AA compliance
- **Viewports**: Desktop, tablet, mobile
- **Rules**: Comprehensive accessibility checks
- **Custom Rules**: UnConf-specific patterns

### Load Tests (Artillery)

Configuration in `load-tests/`:
- **Peak Load**: 200 concurrent users
- **Scenarios**: Heavy voters, casual participants, organizers
- **Protocols**: WebSocket and HTTP testing
- **Duration**: ~8 minutes total test time

## Quality Gates

### Coverage Thresholds

**Global Minimum (80%)**:
- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

**Critical Files (Enhanced)**:
- Lines: 90%
- Functions: 90%
- Branches: 85%
- Statements: 90%

Critical paths include:
- `src/lib/websocket/` - Real-time functionality
- `src/lib/storage/` - Data persistence
- `src/lib/auth/` - Authentication/authorization
- `src/routes/api/` - API endpoints

### Accessibility Standards

- **WCAG 2.1 AA** compliance required
- **Keyboard navigation** must work
- **Screen reader compatibility** required
- **Color contrast** minimum AA ratios
- **Focus management** properly implemented

### Performance Baselines

- **Response time**: < 2 seconds
- **Concurrent users**: 200 users supported
- **Success rate**: > 95%
- **Error rate**: < 5%

## CI/CD Integration

The testing pipeline runs on:
- **Pull Requests**: Lint, unit tests, E2E tests, accessibility tests
- **Main Branch**: All tests + load tests + security scans
- **Deployment**: Quality gates must pass

### Pipeline Stages

1. **Lint & Format**: Code quality checks
2. **Unit Tests**: With coverage validation
3. **Build**: Application compilation
4. **E2E Tests**: Core user journeys
5. **Accessibility Tests**: WCAG compliance
6. **Security Scan**: Vulnerability detection
7. **Load Tests**: Performance validation (main branch only)
8. **Deployment Ready**: Quality gate check

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { Button } from './Button.svelte';

describe('Button Component', () => {
  it('renders with correct text', () => {
    const { getByText } = render(Button, {
      props: { text: 'Click me' }
    });

    expect(getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const { getByRole } = render(Button, {
      props: { text: 'Click me', onClick }
    });

    await fireEvent.click(getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('user can vote on topics', async ({ page }) => {
  await page.goto('/events/test-event');

  // Wait for voting interface
  await page.waitForSelector('[data-testid="voting-interface"]');

  // Vote on first topic
  await page.click('[data-testid="vote-button"]');

  // Verify vote was recorded
  await expect(page.locator('[data-testid="vote-confirmation"]'))
    .toBeVisible();
});
```

### Accessibility Test Example

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('voting interface is accessible', async ({ page }) => {
  await page.goto('/events/test-event');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .include('[data-testid="voting-interface"]')
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Test Data Management

### Fixtures

Test data is managed through fixtures:
- `src/test/fixtures/` - Reusable test data
- `data/` - Demo data for development/testing
- Environment-specific test databases

### Mocking

Mock implementations for:
- WebSocket connections
- Authentication services
- External APIs
- Database operations

## Debugging Tests

### Unit Tests
```bash
# Debug specific test
npm run test:unit -- --reporter=verbose Button.test.ts

# Debug with browser
npm run test:unit -- --ui
```

### E2E Tests
```bash
# Debug mode (pauses on failures)
npx playwright test --debug

# Step through test
npx playwright test --step-by-step
```

### Load Tests
```bash
# Verbose output
npm run test:load:websocket -- --verbose
```

## Performance Optimization

### Test Execution Speed

- **Parallel execution**: Tests run in parallel where possible
- **Smart test selection**: Only run affected tests in development
- **Caching**: Dependencies and build artifacts cached
- **Resource management**: Proper cleanup and teardown

### CI/CD Optimization

- **Matrix builds**: Multiple Node.js versions
- **Conditional execution**: Load tests only on main branch
- **Artifact caching**: Test results and coverage cached
- **Parallel jobs**: Different test types run concurrently

## Monitoring and Reporting

### Coverage Reports

Generated in multiple formats:
- **HTML**: Visual coverage report (`coverage/index.html`)
- **JSON**: Machine-readable data (`coverage/coverage-summary.json`)
- **LCOV**: For integration with external tools
- **Custom**: Enhanced reports in `coverage-reports/`

### Test Reports

Available in CI artifacts:
- **Unit test results**: Vitest reports
- **E2E test results**: Playwright HTML reports
- **Accessibility reports**: axe-core violation details
- **Load test results**: Performance metrics and graphs
- **Coverage validation**: Quality gate reports

## Troubleshooting

### Common Issues

**Tests failing locally but passing in CI**:
- Check Node.js version alignment
- Verify environment variables
- Clear `node_modules` and reinstall

**E2E tests timing out**:
- Increase timeouts in `playwright.config.ts`
- Check for race conditions
- Verify test selectors are stable

**Coverage thresholds not met**:
- Run `npm run test:coverage:validate` for detailed report
- Focus on untested files in critical paths
- Review coverage HTML report for visual gaps

**Load tests failing**:
- Ensure server is running and accessible
- Check system resources during test
- Verify WebSocket connections are working

### Getting Help

1. Check the test output for specific error messages
2. Review relevant configuration files
3. Check CI logs for environment-specific issues
4. Run tests with verbose output for more details

## Best Practices

### Test Writing

- **Descriptive names**: Test names should clearly describe what is being tested
- **Arrange-Act-Assert**: Clear test structure
- **Single responsibility**: One concept per test
- **Proper cleanup**: Avoid test pollution

### Performance

- **Selective testing**: Use test patterns to run specific subsets
- **Parallel execution**: Don't use unnecessary `test.serial()`
- **Resource cleanup**: Properly close connections and clear timers

### Maintenance

- **Regular updates**: Keep testing dependencies current
- **Test review**: Include tests in code review process
- **Documentation**: Keep test documentation updated
- **Monitoring**: Watch for flaky tests and address promptly

## Integration Examples

### API Testing

```typescript
test('API returns valid event data', async ({ request }) => {
  const response = await request.get('/api/events/test-event');
  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  expect(data).toMatchObject({
    id: expect.any(String),
    title: expect.any(String),
    status: 'active'
  });
});
```

### WebSocket Testing

```typescript
test('real-time vote updates work', async ({ page }) => {
  // Listen for WebSocket messages
  const messages = [];
  page.on('websocket', ws => {
    ws.on('framereceived', event => {
      messages.push(JSON.parse(event.payload));
    });
  });

  await page.goto('/events/test-event');
  await page.click('[data-testid="vote-button"]');

  // Verify real-time update received
  expect(messages).toContainEqual(
    expect.objectContaining({ type: 'vote_update' })
  );
});
```

This testing infrastructure ensures the UnConf platform maintains high quality, performance, and accessibility standards throughout development and deployment.