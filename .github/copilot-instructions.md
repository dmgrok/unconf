# unconf tools Lab - AI Coding Agent Instructions

> **Community-driven micro-tools for professional events.** Built entirely from community requests using AI-assisted development.

## Project Philosophy

**What we are:**
- ✅ Community-driven product development
- ✅ Simple, focused tools that solve real problems
- ✅ AI-assisted development with proper guardrails
- ✅ Deploy first, validate, then iterate

**What we are NOT:**
- ❌ Competing with Sessionize, Eventbrite, or established tools
- ❌ Building enterprise features before they're needed
- ❌ Perfecting architecture before user validation
- ❌ Adding complexity without validation

**Core Principle**: One tool = one problem. No feature creep.

## Available Tools

| Tool | Description | Route | Status |
|------|-------------|-------|--------|
| 🎲 Team Shuffler | Randomly assign participants to groups | `/events/[id]/tools/shuffler` | ✅ Live |
| ⏱️ Session Timer | Full-screen countdown (shareable) | `/events/[id]/tools/timer` | ✅ Live |
| 🗳️ Quick Poll | Live voting for participants | `/events/[id]/tools/poll` | ✅ Live |
| 📱 QR Check-In | Scan to join events | `/events/[id]/checkin` | 🚧 Roadmap |

## Architecture Overview

**Stack**: SvelteKit 2 + Svelte 5 (runes) + TypeScript + Vercel  
**Data**: JSON file-based storage in `data/` (no database)  
**Auth**: Auth.js with guest sessions + OAuth providers  
**Real-time**: Socket.io for live updates (polls, voting)

### Key Directories
```
src/routes/           # SvelteKit file-based routing
src/routes/api/       # REST API endpoints (+server.ts files)
src/routes/create/    # Create event flow
src/routes/join/      # Join event flow
src/routes/events/[eventId]/   # Event hub and management
src/routes/events/[eventId]/tools/  # Event-connected tools (shuffler, poll, timer)
src/lib/types/tools.ts    # Core type definitions for all tools
src/lib/stores/auth.ts    # Authentication state management
src/lib/security/     # Rate limiting, CSRF, CSP
src/lib/websocket/    # WebSocket client & server for real-time features
src/lib/feature-flags/    # GrowthBook feature flags for trunk-based development
```

### User Flow
1. **Organizers**: Create Event → Get event code → Share with participants → Enable tools
2. **Participants**: Join Event → Enter code → Use tools
3. **Tools**: Connected to events, share participant context

### Data Flow Pattern
All tools are **event-connected** and share participant context via event codes:
```typescript
// Tools are ActivityType: 'shuffler' | 'poll' | 'timer'
// Each tool operates within an event context with shared participants
```

## Trunk-Based Development

This project uses **trunk-based development** with feature flags for safe production deployments.

### Tool Status Lifecycle
```
preview → beta → standard → deprecated
```

### Feature Flags (GrowthBook)
```typescript
// Check if a feature is enabled
import { isFeatureEnabled, getToolConfig } from '$lib/feature-flags';

if (isFeatureEnabled('preview_tools_enabled')) {
  // Show preview tools
}

// Get tool configuration
const config = getToolConfig('shuffler');
// { status: 'standard', enabled: true, rolloutPercentage: 100 }
```

### Graduation Criteria
Preview tools graduate to standard when they meet:
- ✅ 100+ uses
- ✅ 20+ unique users  
- ✅ <1% error rate
- ✅ >70% positive feedback
- ✅ 7+ days in preview

### Tracking Tool Usage
```typescript
import { trackToolUsage, trackToolFeedback } from '$lib/feature-flags';

// Track when tool is opened
trackToolUsage('tool_open', 'shuffler', userId, eventId);

// Track user feedback
trackToolFeedback('shuffler', userId, 'like');
```

### Current Tool Status
| Tool | Status | Feedback |
|------|--------|----------|
| 🎲 Team Shuffler | ✅ Standard | Enabled |
| ⏱️ Session Timer | ✅ Standard | Enabled |
| 🗳️ Quick Poll | ✅ Standard | Enabled |
| 📱 QR Check-In | 🧪 Preview | Enabled |
| 📋 Survey Builder | 🧪 Preview | Enabled |

### Feedback on ALL Tools
**Feedback is key!** All tools (including graduated/standard) show feedback buttons by default.
This helps continuously improve the product based on user sentiment.

### CI/CD Workflows
- `feature-flag-validation.yml` - Blocks PRs adding tools without feature flags
- `feature-flag-metrics.yml` - Weekly metrics report on tool graduation status

## Development Commands

```bash
npm run dev              # Start dev server
npm run check            # TypeScript + Svelte checks
npm run test:unit        # Vitest unit tests
npm run test             # Playwright E2E tests
npm run test:a11y        # Accessibility tests (WCAG AA)
npm run test:coverage:full  # Coverage with 80% validation
```

## Code Patterns

### Svelte 5 Runes (REQUIRED)
```typescript
// ✅ Use runes - this is Svelte 5
let count = $state(0);
let doubled = $derived(count * 2);

// ❌ NOT legacy stores
// import { writable } from 'svelte/store';
```

### API Endpoints
```typescript
// src/routes/api/[resource]/+server.ts
export async function POST({ request, locals }) {
  // locals.session has auth data from hooks.server.ts
  const data = await request.json();
  return json({ success: true, data });
}
```

### Tool Page Structure
```svelte
<!-- src/routes/events/[eventId]/tools/[tool]/+page.svelte -->
<script lang="ts">
  import { TOOL_INFO } from '$lib/types/tools';
  // Tools are connected to events and share participant context
  // Require event authentication
</script>
```

## Community Requests

### Issue Templates
- **Tool Request** (`.github/ISSUE_TEMPLATE/tool-request.yml`) - For new tool ideas
- **Bug Report** (`.github/ISSUE_TEMPLATE/bug-report.yml`) - For reporting bugs
- **Improvement** (`.github/ISSUE_TEMPLATE/improvement.yml`) - For enhancing existing features

### Functionality Manifest
The project maintains a **machine-readable functionality manifest** at `.github/FUNCTIONALITY_MANIFEST.json` that documents:
- All existing tools and their capabilities
- Current limitations of each tool
- Out-of-scope features and categories
- Evaluation criteria for new requests

**AI agents MUST consult this manifest** when:
- Triaging new issues (to detect duplicates/overlaps)
- Evaluating feature requests (to check against existing capabilities)
- Implementing new features (to understand current architecture)
- Suggesting improvements (to know what already exists)

```typescript
// Example: Reading the manifest in code
import manifest from '.github/FUNCTIONALITY_MANIFEST.json';

// Check if a capability already exists
const existingCapabilities = Object.values(manifest.tools)
  .flatMap(tool => tool.capabilities);

// Check if something is out of scope
const outOfScope = manifest.outOfScope.categories
  .flatMap(cat => cat.examples);
```

### Request Evaluation Criteria
**Good requests:**
- ✅ Solves a real problem event organizers face
- ✅ Doesn't duplicate free existing tools
- ✅ Can fit on one screen
- ✅ Works without complex setup
- ✅ **Functionality-based** - focuses on user problems, not technology

**Will likely reject:**
- ❌ Duplicates free/cheap existing tools
- ❌ Requires significant infrastructure
- ❌ Complex enterprise features
- ❌ Doesn't fit "simple unconf tools" scope
- ❌ **Technology-focused** - specifies implementation over user need (from non-core team)

## Agent Implementation Requirements

When implementing features from issues, coding agents **MUST**:

### 1. Include Proper Tests
- **Unit tests** for all new/modified source code (`*.test.ts` files)
- **E2E tests** for user-facing features (`tests/e2e/`)
- **Coverage threshold**: 80% minimum (90% for critical paths)

### 2. Critical Paths Require Both Unit + E2E Tests
```
src/lib/websocket/   # Real-time functionality
src/lib/storage/     # Data persistence  
src/lib/auth/        # Authentication
src/routes/api/      # API endpoints
```

### 3. Link PRs to Issues
- Use branch naming: `issue-{number}-{description}`
- Include in PR body: `Closes #123` or `Fixes #123`

### 4. Notification Flow
The workflow automatically:
1. Notifies issue creator when PR is opened
2. Validates tests are included
3. Blocks merge if tests are missing
4. Notifies issue creator when merged and deployed

### 5. Test Commands
```bash
npm run test:unit        # Unit tests
npm run test             # E2E tests
npm run test:coverage    # Coverage report
npm run test:a11y        # Accessibility tests
```

## WebSocket Real-time System

**Location**: `src/lib/websocket/`

### Client (`client.ts`)
```typescript
import { webSocketManager, socketStore, isConnected, voteStore } from '$lib/websocket/client';

// Connect to event
await webSocketManager.connect(eventId, userId, role, isGuest, sessionId);

// Submit vote (auto-syncs via WebSocket)
await webSocketManager.submitVote(topicId, 'first'); // 'first' | 'second' | 'third'

// Organizer actions
await webSocketManager.switchActivity('voting', 600); // activity + optional timer
await webSocketManager.updateTimer(300, 'start'); // 'start' | 'pause' | 'reset' | 'extend'

// Disconnect
webSocketManager.disconnect();
```

### Server (`server.ts`)
```typescript
// UnConfWebSocketServer class handles:
// - Room management (events as rooms)
// - Vote submission/removal with throttling (2 updates/sec max)
// - Activity switching with ActivityStateManager
// - Timer control (start, pause, resume, stop, reset)
// - Topic CRUD broadcasts
// - Heartbeat monitoring for connection health
```

### WebSocket Events
```typescript
// Client → Server
'join_event' | 'leave_event' | 'heartbeat'
'submit_vote' | 'remove_vote'
'switch_activity' | 'update_timer'
'topic_create' | 'topic_update' | 'topic_delete'

// Server → Client
'connection_status' | 'user_count_update'
'vote_update' | 'vote_batch_update'
'activity_switched' | 'timer_updated' | 'activity_completed'
'topic_created' | 'topic_updated' | 'topic_deleted'
```

## Design System
See `docs/DESIGN_SYSTEM.md` for colors/components. Key theme:
- **Dark UI**: Background `#0a0a0f`, Text `#e4e4e7`
- **Primary accent**: Indigo `#6366f1`
- **Border radius**: 12-14px for cards, 8px for buttons

## Testing Requirements
- Unit tests: 80% coverage minimum, 90% for `src/lib/websocket/`, `src/lib/storage/`, `src/lib/auth/`
- E2E tests: Use Playwright page objects from `tests/pages/`
- Accessibility: All interactive elements must pass axe-core WCAG AA

## Temporary File Management

### When Creating Temporary Files

Always register temporary files (test scripts, reports, analysis docs) in `.cleanup-tracker.json`:

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

### Cleanup Commands

```bash
# Preview what will be deleted
node scripts/cleanup-temp-files.mjs --dry-run

# Run cleanup
node scripts/cleanup-temp-files.mjs

# Verbose output
node scripts/cleanup-temp-files.mjs --verbose
```

### Auto-Cleanup Rules
- **Runs weekly** (Mondays 2 AM UTC) via GitHub Actions
- **Auto-deleted**: Files older than 7 days matching patterns
- **Permanent**: Core docs, design system, security docs, essential scripts
- **Best practice**: Register temp files immediately, set expiry dates, clean as you go

## Task Management
This project uses **Task Master AI** for task tracking:
```bash
task-master next           # Get next available task
task-master show <id>      # View task details (e.g., 1.2)
task-master set-status --id=<id> --status=done
```
See `.taskmaster/CLAUDE.md` for full workflow.

## What NOT to Do
- ❌ Don't add databases - JSON files in `data/` are intentional
- ❌ Don't create complex enterprise features before validation
- ❌ Don't use legacy Svelte stores - use Svelte 5 runes
- ❌ Don't skip security middleware for convenience
- ❌ Don't create temporary files without registering in `.cleanup-tracker.json`
