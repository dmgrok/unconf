# AGENTS.md - AI Agent Instructions

> Instructions for AI coding agents working on unconf tools Lab.

## Quick Reference

| Agent Type | Primary File | Purpose |
|------------|--------------|---------|
| GitHub Copilot | `.github/copilot-instructions.md` | VS Code inline assistance |
| Claude Code | `CLAUDE.md` | Claude Code sessions |
| Any AI Agent | `AGENTS.md` (this file) | Universal agent guidelines |

---

## 🔍 Understanding Existing Functionality

**CRITICAL:** Before implementing features or triaging issues, AI agents MUST consult the **Functionality Manifest**.

### Functionality Manifest

Location: `.github/FUNCTIONALITY_MANIFEST.json`

This machine-readable document contains:
- **All existing tools** and their capabilities
- **Current limitations** (what we intentionally don't support)
- **Out-of-scope categories** (what we never build)
- **Evaluation criteria** for new requests

### When to Consult the Manifest

| Scenario | Action |
|----------|--------|
| Triaging new issue | Check if request duplicates existing capability |
| Implementing feature | Understand related tools and types |
| Suggesting improvement | Know current limitations |
| Evaluating PR | Verify manifest is updated if capabilities change |

### Reading the Manifest

```javascript
// In GitHub Actions or scripts
const manifest = require('./.github/FUNCTIONALITY_MANIFEST.json');

// Check existing capabilities
const allCapabilities = Object.values(manifest.tools)
  .flatMap(tool => tool.capabilities);

// Check if something is out of scope
const outOfScopeExamples = manifest.outOfScope.categories
  .flatMap(cat => cat.examples);

// Get tool info
const shufflerInfo = manifest.tools.shuffler;
console.log(shufflerInfo.capabilities); // What it can do
console.log(shufflerInfo.limitations);  // What it can't do
```

### Updating the Manifest

When you add/change functionality:
1. Update `.github/FUNCTIONALITY_MANIFEST.json`
2. Add new capabilities or update existing ones
3. Update limitations if scope changes
4. Bump `lastUpdated` date

See `docs/FUNCTIONALITY_MANIFEST.md` for detailed guidance.

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
- **Add or modify GitHub Actions workflows** (`.github/workflows/*.yml`)
- **Add new top-level pages** (update navigation in `src/routes/+layout.svelte`)

### Navigation Header Updates

**Location**: `src/routes/+layout.svelte` (~line 184)

**AI agents MUST update the navigation header when:**
- ✅ Adding a new top-level page (e.g., `/tools`, `/ideas-lab`, `/docs`)
- ✅ Renaming or removing an existing top-level route
- ✅ Changing the status of a feature

**Current navigation links:**
- `/` - Home
- `/tools` - Tools listing
- `/ideas-lab` - Ideas Lab (highlighted)
- `/create` - Create Event
- `/events` - My Events (authenticated only)

**How to add a link:**
```svelte
<a href="/new-page" class="nav-link" class:active={$page.url.pathname === '/new-page'}>
  New Page
</a>
```

### Documentation Checklist

When making code changes, verify these are updated:

```markdown
□ CHANGELOG.md              - Add entry for user-facing changes AND CI/CD workflow changes
□ README.md                 - Update if features/tools change
□ FUNCTIONALITY_MANIFEST    - Update if tool capabilities change (.github/FUNCTIONALITY_MANIFEST.json)
□ Type definitions          - Update JSDoc comments in .ts files
□ API docs                  - Update if endpoints change
□ Component docs            - Update if props/events change
□ Workflow changes          - Document new/modified GitHub Actions in CHANGELOG
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

## Temporary File Management

### Creating Temporary Files

When creating temporary files (test scripts, reports, analysis docs), **ALWAYS** register them in `.cleanup-tracker.json`:

```json
{
  "temporaryFiles": {
    "docs/YOUR_FILE.md": {
      "created": "2024-12-30",
      "purpose": "Brief description",
      "task": "Related task/issue",
      "status": "temporary|completed",
      "keepUntil": "2025-01-06"
    }
  }
}
```

### Cleanup Rules

**Automatically cleaned up:**
- Files matching patterns in `.cleanup-tracker.json`
- Files older than 7 days (configurable)
- Completed task documentation after expiry date

**Permanent files (never auto-deleted):**
- Core documentation: `README.md`, `CHANGELOG.md`, `TESTING.md`, etc.
- Design system docs: `docs/DESIGN_SYSTEM.md`, `docs/ICON_*.md`
- Security docs: `docs/security/**`
- Essential scripts: `scripts/validate-coverage.js`, `scripts/pre-commit-ci.sh`

### Manual Cleanup

```bash
# Dry run - see what would be deleted
node scripts/cleanup-temp-files.mjs --dry-run

# Actual cleanup
node scripts/cleanup-temp-files.mjs

# Verbose output
node scripts/cleanup-temp-files.mjs --verbose
```

### Automated Cleanup

- Runs **weekly on Mondays at 2 AM UTC**
- GitHub Action: `.github/workflows/weekly-cleanup.yml`
- Can be triggered manually from Actions tab
- Commits changes automatically if files are deleted

### Best Practices

1. **Register immediately** - When creating temp files, add to tracker
2. **Set expiry dates** - Use `keepUntil` date (typically +7 days)
3. **Mark status** - Use `temporary` for WIP, `completed` when done
4. **Clean as you go** - Delete temp files manually when task is complete
5. **Check before commit** - Run cleanup script before major commits

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
□ Temporary files registered in .cleanup-tracker.json
□ Run cleanup script: node scripts/cleanup-temp-files.mjs --dry-run
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
