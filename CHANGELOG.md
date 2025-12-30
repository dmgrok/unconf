# Changelog

All notable changes to Event Tools Lab will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-12-30

### Added
- **Agent PR Validation Workflow** (`.github/workflows/agent-pr-validation.yml`)
  - Validates that agent implementations include proper tests
  - Requires unit tests for all source file changes
  - Requires E2E tests for changes to critical paths (WebSocket, Storage, Auth, API)
  - Blocks PRs that don't meet testing requirements with helpful guidance
  - Coverage threshold validation (80% minimum)

- **Issue Creator Notifications**
  - Automatic notification when implementation PR is created
  - Notification includes PR link, checklist, and what to expect
  - Completion notification when PR is merged and feature is live
  - Guidance on how to report issues or request improvements

- **Functionality-Based Issue Enforcement for Community**
  - Non-core team issues must focus on user problems, not technology
  - Technology-focused issues from community are closed with helpful guidance
  - Clear explanation of what makes a good functionality-based request
  - Core team can still submit technology-focused issues when needed

- **New Issue Labels for Agent Workflow**
  - `agent-implementation` - PRs from coding agent
  - `implementation-in-progress` - PR is being worked on
  - `implemented` - Feature has been implemented
  - `deployed` - Feature is live in production
  - `needs-tests` - Implementation requires tests
  - `tests-passing` - All tests are passing
  - `community` - Submitted by community member
  - `core-team` - Submitted by core team member
  - `functionality-based` - Properly scoped user-focused request
  - `technology-request` - Technology-focused request (needs clarification)

## [0.1.0] - 2025-12-30

### Changed
- **Issue Triage Messages Now Have Personality** 🎭
  - Decline messages are now humorous but respectful
  - "Insufficient info" → "Hmm, We Need a Bit More to Go On" (crystal ball joke)
  - "Not a differentiator" → "Thanks, But the World Already Rocks at This" (wheel reinvention)
  - "Out of scope" → "Whoa There, Astronaut!" (space station metaphor)
  - "Duplicate" → "Great Minds Think Alike!" (positive spin)
  - "Needs value prop" → "We're Not Quite Feeling the Love (Yet)" (encouraging resubmit)

### Added
- **Functionality Manifest for AI-Powered Issue Triage**
  - `.github/FUNCTIONALITY_MANIFEST.json` - Machine-readable inventory of all tools and capabilities
  - Documents existing tools, their capabilities, limitations, and value propositions
  - Includes out-of-scope categories and evaluation criteria
  - Enables AI agents to detect duplicates and recognize enhancements
- **Enhanced Issue Triage Workflow**
  - Loads functionality manifest at triage time
  - AI-powered duplicate/existing functionality detection using GitHub Models
  - Distinguishes between duplicate requests, enhancement requests, and new features
  - Interest scoring (1-10) for new feature evaluation
  - Automatic labeling for enhancements (`enhancement`, `tool:*`)
- **Documentation**
  - `docs/FUNCTIONALITY_MANIFEST.md` - Guide for maintaining the manifest
  - Updated `AGENTS.md` with manifest consultation requirements
  - Updated `.github/copilot-instructions.md` with manifest reference
- **Feature Flags System (GrowthBook Integration)**
  - Trunk-based development support with feature flags and A/B testing
  - `src/lib/feature-flags/growthbook.ts` - Core GrowthBook SDK integration
  - `src/lib/feature-flags/stores.ts` - Svelte 5 reactive stores for feature flags
  - `src/lib/feature-flags/server.ts` - Server-side feature flag evaluation
  - `src/lib/feature-flags/defaults.ts` - Default tool configurations and status
  - Tool status lifecycle: `preview` → `beta` → `standard` → `deprecated`
  - Automatic graduation criteria (usage, error rate, feedback score)
  - **Feedback on ALL tools by default** - not just preview tools!
- **Feature Flag UI Components**
  - `PreviewBadge.svelte` - Visual indicator for tool status with feedback buttons
  - `ToolCard.svelte` - Tool card with status badge and feedback integration
  - `ToolFeedback.svelte` - Standalone feedback widget with persistence
  - `PreviewToolsToggle.svelte` - User opt-in toggle for preview tools
- **Tool Metrics API**
  - `POST /api/tools/track` - Track tool usage events (use, error, like, dislike)
  - `GET /api/tools/track` - Get metrics for a specific tool (organizers only)
  - `GET /api/tools/graduation` - Get graduation status for all preview tools
- **GitHub Workflows for Feature Flags**
  - `feature-flag-validation.yml` - Enforces feature flags for new tools on PRs
  - `feature-flag-metrics.yml` - Weekly metrics report on tool status and graduation
- **Graduated Tools (Standard Status)**
  - 🎲 Team Shuffler - stable, collecting feedback
  - ⏱️ Session Timer - stable, collecting feedback
  - 🗳️ Quick Poll - stable, collecting feedback
- **Preview Tools (Testing)**
  - 📱 QR Check-In - preview status
  - 📋 Survey Builder - preview status
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
