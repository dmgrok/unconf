# Testing Guide

This guide describes the tests and checks that exist in the repository today, and the gaps that are still open. If a command is not listed here, it is not part of the current toolchain.

## Current State

| Check | Command | Runs in CI | Status |
|-------|---------|-----------|--------|
| Unit tests (Vitest, jsdom) | `npm run test:unit -- --run` | Yes, every push and PR to `main` (`ci.yml`) | Passing. Three test files today: slug utilities, the HTML and URL sanitizer, and server rendering of the docs code block. |
| Production build | `npm run build` | Yes, every push and PR to `main` (`ci.yml`) | Passing |
| Type check (`svelte-check`) | `npm run check` | PRs that change `src/` (`feature-flag-validation.yml`) | Failing on pre-existing type errors |
| Lint (ESLint) | `npm run lint` | No, local pre-commit script only (warning mode) | Pre-existing errors remain |
| Coverage, 80% thresholds | `npm run test:coverage` | Advisory report on PRs (`agent-pr-validation.yml`) | Enforced locally and failing: coverage is far below target |
| Test-presence check | n/a | Every PR (`agent-pr-validation.yml`) | Requires unit test changes when `src/` changes. It also asks for E2E tests on larger or critical-path PRs, but no E2E suite exists. |
| Accessibility | n/a | No | Manual review against WCAG AA. No automated accessibility tests yet. |
| Dependency audit | `npm run security:audit` | No (Dependabot alerts cover this on GitHub) | Known advisories remain open |

Branch protection is not enabled, so failing checks report status but do not block a merge.

## Requirements

- Node.js 22.13 or later. `.npmrc` sets `engine-strict=true`, and some dev tools (Artillery) need Node 22.13+.
- `npm ci` to install dependencies.

## Unit Tests

Vitest is configured in `vitest.config.ts`. Tests live next to the code they test and match `src/**/*.{test,spec}.{js,ts}`. Shared setup is in `src/test/setup.ts`.

```bash
npm run test:unit -- --run          # single run, as in CI
npm run test:unit                   # watch mode
npm run test:unit -- --ui           # browser UI (@vitest/ui)
npm run test:unit -- src/lib/utils/slug.test.ts
```

Example:

```typescript
import { describe, it, expect } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
	it('converts a title to lowercase', () => {
		expect(slugify('Hello World')).toBe('hello-world');
	});
});
```

## Coverage

Coverage uses the V8 provider and measures files under `src/`. Reports are written to `coverage/` (text, JSON, JSON summary, HTML).

```bash
npm run test:coverage               # runs tests with coverage, fails below 80%
npm run test:coverage:validate      # extra report from coverage/coverage-summary.json
npm run test:coverage:full          # both of the above
```

The thresholds are 80% for lines, functions, branches, and statements. They are the target, not the current level, so `npm run test:coverage` currently exits with an error. Raise coverage with new tests rather than lowering the thresholds.

## Load Tests

Artillery scenarios live in `load-tests/` and target `http://localhost:5173`, so start the dev server first.

```bash
npm run dev
npm run test:load                   # all scenarios
npm run test:load:http              # HTTP scenarios
npm run test:load:websocket         # WebSocket scenarios
```

See `load-tests/README.md` for scenario details.

## Security Checks

```bash
npm run security:audit              # npm audit, moderate and above
npm run test:security:manual        # HTTP security checks against TEST_URL (default http://localhost:5173)
```

`npm run test:security` and `npm run test:security:full` run `src/lib/security/security-audit.ts` through `ts-node`, which is not installed. They do not work until that dependency is added or the script is ported.

## Local Pre-commit Script

```bash
npm run pre-commit
```

This runs `scripts/pre-commit-ci.sh`. Type check and lint are reported as warnings because of the existing debt. The build must pass. To run it on every commit, install the hook:

```bash
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Known Gaps

- Only three unit test files exist, so coverage is far below the 80% target.
- `npm run check` and `npm run lint` report pre-existing errors.
- There is no E2E or automated accessibility suite. The PR test-presence check still asks for E2E tests on some PRs.
- `test:security` needs `ts-node`.
