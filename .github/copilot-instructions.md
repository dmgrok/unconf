# Event Tools Lab - AI Coding Agent Instructions

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

### Request Evaluation Criteria
**Good requests:**
- ✅ Solves a real problem event organizers face
- ✅ Doesn't duplicate free existing tools
- ✅ Can fit on one screen
- ✅ Works without complex setup

**Will likely reject:**
- ❌ Duplicates free/cheap existing tools
- ❌ Requires significant infrastructure
- ❌ Complex enterprise features
- ❌ Doesn't fit "simple event tools" scope

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
