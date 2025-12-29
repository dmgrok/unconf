# Changelog

All notable changes to Event Tools Lab will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Issue templates for bug reports and improvements
- AGENTS.md for AI agent instructions
- CHANGELOG.md for version tracking
- Documentation guidelines in CONTRIBUTING.md
- **Lakera Guard integration** for prompt injection detection in GitHub workflows
  - `scan-injection.yml` - Scans issues, comments, and PRs for prompt injection attacks
  - Updated `issue-triage.yml` with Lakera Guard as first-pass security filter before AI screening
  - Uses Lakera Guard v2 API with ML-based detection (language-agnostic)
- **Automated implementation setup** in `issue-triage.yml`
  - Automatically creates feature branches for high-value issues
  - Moves accepted issues to `implementation` status
  - Assigns issues to repository owner
  - Branch naming: `issue-{number}-{title-slug}`
- **Preview deployment workflow** (`preview-deploy.yml`)
  - Triggers on PR creation for issue branches
  - Links PRs back to related issues
  - Integrates with Vercel automatic preview deployments
- **Pre-commit CI testing** (`scripts/pre-commit-ci.sh`)
  - Local CI validation before commits
  - Git hook template in `.github/hooks/pre-commit`
  - npm scripts: `npm run pre-commit:quick` and `npm run pre-commit`
  - Documentation in `docs/PRE_COMMIT_TESTING.md`
- **Automated cleanup system** for temporary files
  - `.cleanup-tracker.json` - Tracks temporary files with metadata (created, purpose, task, status, keepUntil)
  - `scripts/cleanup-temp-files.mjs` - Node.js cleanup script with pattern matching, dry-run mode, and safeguards
  - `.github/workflows/weekly-cleanup.yml` - GitHub Action for weekly automated cleanup (Mondays 2 AM UTC)
  - `docs/CLEANUP_SYSTEM.md` - Comprehensive documentation with usage, configuration, examples, and troubleshooting
  - AI agent instructions updated in `AGENTS.md` and `.github/copilot-instructions.md`
- **Poll Tool Improvements**
  - Vote limit system (maxVotesPerPerson) - configurable from 1-10 votes per person
  - Heart-based voting UI (🤍 empty, 💙 voted, 🚫 disabled when limit reached)
  - Pulsing "LIVE RESULTS" indicator with red gradient border
  - Always-visible vote counts for real-time feedback
  - Vote limit selector in setup form with live preview

### Changed
- Updated project focus to community-driven micro-tools
- Tools are now event-connected (removed standalone mode)
- Updated copilot-instructions.md with new project philosophy
- **Rebranded to UnConference.io** - Updated README.md and documentation from "Event Tools Lab" to "unconference.io"

### Fixed
- Poll tool `backToSetup()` function - Removed duplicate viewMode assignment that caused blank page
- Poll tool UI - Removed "Common Use Cases" section for cleaner interface

### Removed
- Poll tool "Common Use Cases" section HTML and CSS (~100 lines)

---

## [0.1.0] - 2024-12-29

### Added
- 🎲 **Team Shuffler** - Randomly assign participants to groups
- ⏱️ **Session Timer** - Full-screen countdown for talks (shareable)
- 🗳️ **Quick Poll** - Live voting for participants
- Event creation and management system
- Participant join flow with event codes
- WebSocket real-time updates for polls and voting
- Guest authentication with session persistence
- OAuth authentication (GitHub, Google)
- Dark mode UI with indigo accent theme
- Accessibility compliance (WCAG AA)
- Rate limiting and CSRF protection

### Technical
- SvelteKit 2 + Svelte 5 (runes) architecture
- JSON file-based storage
- Socket.io WebSocket server
- Auth.js integration
- Vercel deployment configuration

---

## Version History Format

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing features

### Deprecated
- Features to be removed in future

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements
```
