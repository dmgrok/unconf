# Claude Code Instructions

## Quick Start

**Before making changes**, read:
- `AGENTS.md` - Documentation requirements for all AI agents
- `.github/copilot-instructions.md` - Project context and patterns

## Documentation Rules (MANDATORY)

When modifying TypeScript files in `src/`, you MUST also update:

```markdown
□ CHANGELOG.md        - Add entry under [Unreleased] for user-facing changes
□ JSDoc comments      - Document all exported types/functions
□ README.md           - Update if features/tools change
```

### CHANGELOG Entry Format
```markdown
## [Unreleased]

### Added/Changed/Fixed/Removed
- Brief description of change
```

## Task Master AI Instructions

**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Key Project Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | AI agent instructions & doc requirements |
| `CHANGELOG.md` | Version history |
| `README.md` | Project overview |
| `.github/copilot-instructions.md` | Copilot context |
| `docs/CONTRIBUTING.md` | Contribution guidelines |

## Pre-Commit Checklist

Before finishing any task:
```bash
npm run check           # TypeScript + Svelte checks
npm run test:unit       # Unit tests
```

Then verify:
- [ ] CHANGELOG.md updated (if user-facing)
- [ ] JSDoc added for new exports
- [ ] README.md updated (if features changed)
