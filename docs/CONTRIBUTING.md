# Contributing to Event Tools Lab

> Guidelines for contributing code and documentation to Event Tools Lab.

## Table of Contents
- [Getting Started](#getting-started)
- [Documentation Requirements](#documentation-requirements)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Setup
```bash
git clone https://github.com/dmgrok/unconf.git
cd unconf
npm install
npm run dev
```

### Development Commands
```bash
npm run dev              # Start dev server
npm run check            # TypeScript + Svelte checks
npm run test:unit        # Vitest unit tests
npm run test             # Playwright E2E tests
npm run test:a11y        # Accessibility tests
npm run test:coverage:full  # Coverage validation (80% min)
```

---

## Documentation Requirements

### When Code Changes, Docs Must Follow

This project enforces documentation updates alongside code changes. When you modify TypeScript files in `src/`, you must also update relevant documentation.

### Required Documentation Updates

| Change Type | Update Required |
|-------------|-----------------|
| New feature/tool | CHANGELOG.md, README.md |
| Bug fix | CHANGELOG.md |
| New API endpoint | JSDoc in file, API docs |
| New component | JSDoc props/events |
| WebSocket event | Event documentation |
| Config change | README.md if user-facing |

### CHANGELOG.md

Every user-facing change needs a changelog entry:

```markdown
## [Unreleased]

### Added
- New timer sound options for session timer (#42)

### Fixed
- Poll results not updating in real-time (#38)
```

### JSDoc Standards

All exported types, functions, and components must have JSDoc comments:

```typescript
/**
 * Shuffles participants into random teams.
 * 
 * @param participants - Array of participant objects
 * @param teamCount - Number of teams to create
 * @returns Array of teams with assigned participants
 * 
 * @example
 * ```ts
 * const teams = shuffleTeams(participants, 4);
 * // Returns: [{ name: 'Team 1', members: [...] }, ...]
 * ```
 */
export function shuffleTeams(
  participants: Participant[],
  teamCount: number
): Team[] {
  // ...
}
```

### Route Documentation

Each route should have a header comment:

```svelte
<!--
  Route: /events/[eventId]/tools/shuffler
  Access: Organizers only
  Purpose: Randomly assign participants to teams
  
  Query params:
    - teams: number (optional, default: 4)
-->
<script lang="ts">
  // ...
</script>
```

---

## Code Standards

### Svelte 5 Runes (Required)

Always use Svelte 5 runes, never legacy stores:

```typescript
// ✅ Correct - Svelte 5 runes
let count = $state(0);
let doubled = $derived(count * 2);

$effect(() => {
  console.log('Count changed:', count);
});

// ❌ Wrong - Legacy stores
import { writable } from 'svelte/store';
const count = writable(0);
```

### TypeScript Strict Mode

This project uses strict TypeScript. All types must be explicit:

```typescript
// ✅ Correct
interface Props {
  eventId: string;
  onComplete: (result: ShuffleResult) => void;
}

// ❌ Wrong - implicit any
function handleClick(event) { ... }
```

### Component Props

Use the Svelte 5 `$props()` pattern:

```svelte
<script lang="ts">
  interface Props {
    /** Event identifier */
    eventId: string;
    /** Optional title override */
    title?: string;
  }
  
  let { eventId, title = 'Default Title' }: Props = $props();
</script>
```

### API Endpoints

Follow the REST pattern with proper error handling:

```typescript
// src/routes/api/events/[eventId]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/events/[eventId]
 * Retrieves event details.
 * @requires Authentication
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  const session = await locals.auth();
  if (!session) {
    throw error(401, 'Unauthorized');
  }
  
  // ... implementation
  return json({ success: true, data: event });
};
```

---

## Pull Request Process

### Before Opening a PR

1. **Run all checks:**
   ```bash
   npm run check
   npm run test:unit
   npm run test
   ```

2. **Update documentation:**
   - [ ] CHANGELOG.md (if user-facing change)
   - [ ] README.md (if features changed)
   - [ ] JSDoc comments (for new/changed code)

3. **Follow commit conventions:**
   ```
   feat(tool): add new feature
   fix(poll): resolve issue
   docs: update documentation
   ```

### PR Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactor

## Documentation Updated
- [ ] CHANGELOG.md
- [ ] README.md (if needed)
- [ ] JSDoc comments
- [ ] Other: ___

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Accessibility tests pass

## Screenshots (if UI change)
[Attach screenshots]
```

### Review Criteria

PRs will be reviewed for:
- Code quality and patterns
- Documentation completeness
- Test coverage
- Accessibility compliance
- Security considerations

---

## Questions?

- Open an [issue](../../issues/new) for questions
- Check existing [discussions](../../discussions) 
- Review [AGENTS.md](/AGENTS.md) for AI-assisted development guidelines
