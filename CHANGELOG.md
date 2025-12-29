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

### Changed
- Updated project focus to community-driven micro-tools
- Tools are now event-connected (removed standalone mode)
- Updated copilot-instructions.md with new project philosophy

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
