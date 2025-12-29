# AGENTS.md - AI Agent Instructions

> Instructions for AI coding agents working on Event Tools Lab.

## Quick Reference

| Agent Type | Primary File | Purpose |
|------------|--------------|---------|
| GitHub Copilot | `.github/copilot-instructions.md` | VS Code inline assistance |
| Claude Code | `CLAUDE.md` | Claude Code sessions |
| Any AI Agent | `AGENTS.md` (this file) | Universal agent guidelines |

---

## Documentation Requirements

### When to Update Documentation

**ALWAYS update docs when you:**
- Add, modify, or remove TypeScript files in `src/`
- Add new routes or API endpoints
- Change component interfaces or props
- Modify WebSocket events or data flow
- Add or remove dependencies
- Change configuration files

### Documentation Checklist

When making code changes, verify these are updated:

```markdown
□ CHANGELOG.md        - Add entry for user-facing changes
□ README.md           - Update if features/tools change
□ Type definitions    - Update JSDoc comments in .ts files
□ API docs            - Update if endpoints change
□ Component docs      - Update if props/events change
```

### CHANGELOG.md Format

```markdown
## [Unreleased]

### Added
- New feature description (#issue-number)

### Changed
- What changed and why

### Fixed
- Bug that was fixed (#issue-number)

### Removed
- What was removed and why
```

---

## Code Change Documentation Rules

### TypeScript Files (`src/**/*.ts`)

When modifying TypeScript files:

1. **Type exports** - Document with JSDoc:
   ```typescript
   /**
    * Configuration for the Team Shuffler tool.
    * @see /events/[eventId]/tools/shuffler
    */
   export interface ShufflerConfig {
     /** Number of teams to create */
     teamCount: number;
     /** Whether to balance team sizes */
     balanced: boolean;
   }
   ```

2. **API endpoints** - Include route and method:
   ```typescript
   /**
    * POST /api/events/[eventId]/shuffle
    * Shuffles participants into random teams.
    * @requires Organizer role
    */
   export async function POST({ params, locals }) { ... }
   ```

3. **WebSocket events** - Document payload shape:
   ```typescript
   /**
    * Event: 'vote_update'
    * Sent when a participant submits or changes their vote.
    * @payload { odId: string, rank: 'first' | 'second' | 'third', odId: string }
    */
   ```

### Svelte Components (`src/**/*.svelte`)

Document props and events:
```svelte
<script lang="ts">
  /**
   * Countdown timer display component.
   * @fires tick - Every second with remaining time
   * @fires complete - When timer reaches zero
   */
  interface Props {
    /** Duration in seconds */
    duration: number;
    /** Whether timer is running */
    running?: boolean;
  }
  let { duration, running = false }: Props = $props();
</script>
```

### Route Files (`src/routes/**/+page.svelte`)

Include route metadata in a comment:
```svelte
<!--
  Route: /events/[eventId]/tools/timer
  Access: Participants + Organizers
  Features: Full-screen countdown, shareable URL
-->
```

---

## File Organization

### Where Documentation Lives

```
/
├── AGENTS.md                    # This file - AI agent instructions
├── CHANGELOG.md                 # Version history (user-facing)
├── README.md                    # Project overview & quick start
├── CLAUDE.md                    # Claude Code specific instructions
├── TESTING.md                   # Testing guidelines
│
├── .github/
│   ├── copilot-instructions.md  # GitHub Copilot instructions
│   └── ISSUE_TEMPLATE/          # Issue templates
│
├── docs/
│   ├── CONTRIBUTING.md          # How to contribute
│   ├── DESIGN_SYSTEM.md         # UI/UX guidelines
│   └── security/                # Security documentation
│
└── src/
    └── lib/
        └── types/
            └── *.ts             # Type definitions with JSDoc
```

---

## Commit Message Guidelines

Use conventional commits for automatic changelog generation:

```
feat(shuffler): add team size balancing option
fix(poll): resolve vote count sync issue
docs(readme): update available tools table
chore(deps): update SvelteKit to 2.x
refactor(websocket): simplify connection handling
test(timer): add countdown accuracy tests
```

### Commit Types
- `feat` - New feature (updates CHANGELOG)
- `fix` - Bug fix (updates CHANGELOG)
- `docs` - Documentation only
- `chore` - Maintenance tasks
- `refactor` - Code restructuring
- `test` - Test additions/changes
- `style` - Formatting only

---

## Pre-Commit Checklist

Before committing TypeScript changes:

```markdown
□ Code compiles: `npm run check`
□ Tests pass: `npm run test:unit`
□ Types documented with JSDoc
□ CHANGELOG.md updated (if user-facing)
□ README.md updated (if features changed)
□ API changes documented
```

---

## Context for AI Agents

### Project Stack
- **Framework**: SvelteKit 2 + Svelte 5 (runes)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Real-time**: Socket.io WebSocket
- **Auth**: Auth.js with guest sessions
- **Storage**: JSON files in `data/`
- **Deployment**: Vercel

### Key Patterns
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Tools are event-connected, not standalone
- All tools share participant context via event codes
- Dark UI theme with indigo accent (#6366f1)

### What NOT to Do
- ❌ Don't use legacy Svelte stores
- ❌ Don't add databases
- ❌ Don't create enterprise features without validation
- ❌ Don't skip documentation updates

---

## Related Files

- [GitHub Copilot Instructions](/.github/copilot-instructions.md)
- [Design System](/docs/DESIGN_SYSTEM.md)
- [Testing Guide](/TESTING.md)
- [Security Procedures](/docs/security/SECURITY_PROCEDURES.md)
