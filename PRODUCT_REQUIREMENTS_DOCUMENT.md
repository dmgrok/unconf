# Unconference Management Platform - Product Requirements Document

## Executive Summary

The Unconference Management Platform is a modern web application designed to facilitate participant-driven events but also regular events with advanced features for voting, networking, collaboration, and post-event engagement. It focus on interaction and event experience. The platform serves event organizers and participants by streamlining the unconference process from initial topic submission through post-event follow-up.

**Target Market**: Event organizers, corporate teams, educational institutions, and professional communities
**Business Model**: Free for now
**Technology Stack**: SvelteKit

## Product Vision

### Core Value Proposition

Simplify unconference organization by providing an intuitive platform that provides tools for the organization of events.

### Key Success Metrics

- Simple UI optimized for quick understanding and few interactions to setup acitivities

## Personas & User Journeys

### Primary Personas

- **Participant** – joins events as guest or authenticated user, proposes topics, votes, participates in activities, and reviews personal outcomes.
- **Organizer** – configures events, orchestrates activities in real time, manages participants, and tracks analytics.
- **Admin** – oversees platform configuration, manages organizers, and monitors overall system health without intervening in live facilitation.

### Representative User Journeys & Acceptance Criteria

1. **Join Event & Vote (Participant)**
   - Given a valid event code or QR scan, the participant can authenticate as guest or via OAuth.
   - The participant sees the currently active activity within < 2 seconds and receives contextual guidance.
   - Voting flow enforces 1st/2nd/3rd choice limits and warns the participant if connectivity is lost so they can retry.
2. **Orchestrate Activities (Organizer)**
   - Organizer dashboard surfaces all activity modes with status, preview, and “Go Live” actions.
   - Switching activities propagates to all connected clients within 1 second and logs the change with timestamp and user ID.
   - Organizer can set or adjust per-activity timers and countdowns; participants and fellow organizers see the timer state in real time.
   - After each activity, summaries (vote results, game leaderboards, team rosters) appear by default unless the organizer turns them off.
3. **Distribute Teams (Organizer)**
   - Organizer selects distribution strategy (random, skill-based, manual override).
   - System displays preview of team composition with conflicts flagged (e.g., same company, same prior team).
   - Publishing teams notifies participants and provides room/location context.
4. **Monitor Platform Health (Admin)**
   - Admin accesses cross-event dashboards showing concurrent users, activity states, and error rates.
   - Admin can revoke organizer access or temporarily suspend event activity switching during incidents.

Each journey must include success and error scenarios documented in the QA test plan; connectivity loss surfaces retry prompts instead of offline fallbacks.

---

## Core Product Features

### 1. Event Management & Configuration

**Requirements:**

- Organizer of an event can choose, preview, and publish the participants' current activity via a real-time control panel
- Multi-event support with independent configurations
- Event lifecycle management (Draft → Active → Completed → Archived)
- QR code generation for easy participant access
- Event codes for quick joining
- Flexible event settings (duration, voting rules, capacity, current activity)
- Theme customization (light/dark mode)
- Event cloning and template system
- Automated event archival and cleanup

**Business Rules:**

- Maximum event duration: 7 days
- Minimum participant capacity: 5 users
- Event codes expire after 30 days of inactivity

### 2. User Authentication & Authorization

**Requirements:**

- Multi-provider OAuth (Google, email/password)
- Guest access for anonymous participation with full voting parity
- Role-based access control (Admin, Organizer, Participant/Guest)
- Secure session management
- User profile customization with avatars
- Password reset and account recovery
- Two-factor authentication for admin roles

**Business Rules:**

- Guest users can cast 1st/2nd/3rd choice votes exactly like authenticated participants
- Admin/organizer roles require email verification
- Session timeout after 24 hours of inactivity
- Admin is the platform owner and has all rights

### 3. Discussion group Voting System

**Requirements:**

- Real-time topic submission and editing
- Weighted preference voting (1st choice, 2nd choice, 3rd choice)
- Live vote tracking and display
- Vote transparency with participant visibility
- Voting rule flexibility (max votes per topic, etc.)
- Organizer can toggle whether voting is limited to preselected topics or open to participant proposals (default: participant proposals enabled)

### 4. Round Management & Real-time Operations

**Requirements:**

- Organizers can add discussion topics as well
- Automatic participant assignment to discussion rooms based on 1st, 2nd or 3rd choice
- Real-time countdown timer with customizable duration
- Round history tracking
- Activity state changes instantly reflected on participant screens to avoid conflicting instructions
- Organizers can make manual adjustments to assignments before finalizing any round publish

### 5. Activity Orchestration & Engagement Modes

**Requirements:**

- Four core activity types must be supported and organizer-selectable on an ad-hoc basis:
  1.  **Voting** – organizer can surface curated items or allow participant-submitted topics when enabled
  2.  **Group Intelligence** – launch the Collaborative Word-Chain game to keep attendees engaged during waiting periods (future mini-games are out of MVP scope)
  3.  **Create Discussion Groups** – launch or transition into structured discussion rounds already implemented in the platform
  4.  **People Distribution into Teams** – allocate participants into teams for workshops, challenges, or follow-up activities
- Transitions between activities should be seamless, with clear participant-facing status updates
- Activity switching events must use an acknowledgement-based WebSocket broadcast: organizer console waits for server confirmation, emits retries for straggler clients, and logs round-trip latency to maintain the 1-second propagation target
- Organizer permissions must gate who can change the active activity
- Organizer can configure per-activity timers (countdown duration, optional auto-expire) that are visible to participants and other organizers
- For the MVP, post-activity summaries remain suppressed; raw metrics are stored for later analytics without showing participant-facing recap screens
- Activity usage metrics should be logged for post-event review

## Domain Model & Data Architecture

The platform assumes continuous connectivity; clients must reconnect if connection is lost, with no offline caching of interactions.

**MVP Real-time Persistence Strategy**

- A lightweight event-state service (in-memory store with snapshotting to JSON) powers all WebSocket broadcasts so organizer/participant latencies stay under the 1-second target while preserving the no-database MVP constraint.
- The event-state service periodically writes immutable snapshots to JSON files, guaranteeing durability without blocking real-time acknowledgements.
- Once Prisma/PostgreSQL is introduced, the same event-state interface simply swaps its persistence adapter, keeping the runtime behavior identical.

## Activity State Machine & Real-time Behavior

### Failure Handling & Reconnect Behavior

- Client devices subscribe to heartbeat; missing heartbeats for >10 seconds prompt a reconnect prompt.
- If activity switch fails (API error), organizer console shows retry with diagnostics and no broadcast occurs.
- Participants who lose connection receive a blocking reconnect state until the socket/API link is restored.
- All transitions recorded in AuditLog with previous/new state, actor, latency metrics.

## Multiplayer Game Specifications

### Collaborative Word-Chain Game (MVP Focus)

**Concept:** Players cooperatively create a word chain where each new word starts with the last letter of the previous entry.

**Core Mechanics**

- Initial word seeded by organizer or randomly selected.
- Participants submit words that start with the required letter; optional per-turn time limit.
- Validation checks duplicates, profanity, and optionally queries a dictionary API.
- Organizer can enable turn-based rotation or simultaneous submission with conflict resolution.

**Real-time Communication**

- WebSocket channel broadcasts the current word, next required letter, and accepted submissions in real time.
- Optional chat/hint feed for collaboration cues.

**UI Requirements**

- Chain timeline highlighting the latest contributions.
- Input field with validation feedback and timer indicator.
- Player presence list showing whose turn or whose word was accepted.

**Backend Requirements**

- Word validation service (local dictionary, cached API results) with throttling.
- Conflict resolution rules (first valid submission wins, or organizer arbitration).
- Persistence of full chain for replay inside the event recap once summaries are reintroduced.

### Shared Functional Requirements

- Support at least 200 concurrent participants with sub-500 ms average latency for critical interactions.
- Organizer can configure per-game timers, pause/resume, and lock inputs.
- Anti-abuse tooling: rate limiting, profanity filters, ability to mute or remove disruptive users.
- Games conclude gracefully when the organizer switches activities, persisting session data for analytics while deferring participant-facing summaries until the summary feature returns.

## Team Distribution Service

### Data Intake & Preparation

- Organizer can upload participant rosters via CSV or Excel file, or paste data directly into a spreadsheet-like grid component with inline editing before import is finalized.
- Import wizard guides column mapping for mandatory fields (name, contact) plus up to two optional category fields (e.g., department, skill level).
- Validation catches missing required columns, duplicate entries, or unsupported file formats before data is committed.

### Supported Strategies

- **Random** – evenly shuffles participants while honoring specified team size and optional "keep together/keep apart" constraints.
- **Mix for Collaboration** – balances teams across the selected categories to encourage cross-functional collaboration (e.g., mix departments or experience levels).
- **Manual Override** – organizer drags participants between teams before publishing; every change is logged to AuditLog.

### Workflow

1. Organizer imports or pastes participant data, maps columns, and reviews the parsed list for accuracy.
2. Organizer selects strategy (Random or Mix for Collaboration), chooses up to two categories to factor into team distribution, and defines desired team size; optional facilitator pool and constraint lists remain available.
3. System generates a preview highlighting validation warnings (over capacity, unassigned participants, category imbalance, missing facilitators).
4. Organizer confirms to publish; assignments broadcast via team:assignment channel and stored as Team records with metadata about chosen categories and strategy.
5. Participants acknowledge team receipt; system tracks confirmation status.

### Edge Cases & Recovery

- Late joiners trigger incremental assignment suggestions respecting original strategy and category balancing rules.
- If distribution fails (e.g., insufficient facilitators), organizer receives actionable errors to resolve and groups with less people. try to make groups for all people, even if not optimal but warn the organizer of the issue
- Organizers can always perform manual roster edits before publishing or after a warning is raised to ensure every participant is placed.

### Core Entities

- **Event** – id, code, name, description, status, start/end timestamps, activity_state, configuration JSON, theme tokens.
- **User** – id, auth_provider, role (guest, participant, organizer, admin), profile, preferences, achievements, permissions.
- **Topic** – id, event_id, proposer_id, title, description, status (draft/active/frozen), vote_counts, tags.
- **Vote** – id, topic_id, user_id, weight (first/second/third), created_at.
- **Round** – id, event_id, number, start/end timestamps, selected_topic_ids, room_assignments.
- **Room** – id, event_id, name, capacity, amenities, accessibility_flags.
- **ActivityState** – event_id, current_activity (voting/intelligence/discussion/teams), metadata payload (including timer_end, auto_show_summary flag), switched_by, switched_at.
- **Team** – id, event_id, name, members [], strategy_used, facilitator, category_mix metadata.
- **AuditLog** – id, actor_id, action, payload, created_at.

### Relationships & Constraints

- Event has many Topics, Rounds, Rooms, ActivityStates, Teams, EngagementArtifacts.
- User can belong to multiple Events with contextual roles; roles scoped per event.
- Votes validate against active topics and enforce per-user limits.
- ActivityState is append-only history; latest record drives real-time state.
- AuditLog recorded for all organizer/admin mutations.

### Data Storage Requirements

- MVP implementation persists event data in versioned JSON files (read/write via repository layer) to enable rapid prototyping without external services.
- Data access interfaces must be abstracted so that swapping JSON storage for PostgreSQL requires minimal refactoring.
- PostgreSQL (via Prisma schema) becomes the primary persistence layer once MVP validation is complete; plan migrations accordingly.
- Redis or similar cache for current activity state and multiplayer game sessions.
- Object storage (e.g., S3) for exported analytics or large artifacts if needed.
- All personally identifiable information must be encrypted at rest (when stored in PostgreSQL or any persistent store).

### 8. Achievement & Gamification System

**Requirements:**

- Achievement tracking with multiple categories
- Progress tracking
- Social proof generation
- Real-time achievement triggers
- Leaderboard functionality

### 10. Viral Sharing & Social Features

**Requirements:**

- Multi-platform content generation (LinkedIn, Twitter, Instagram, Facebook, Slack)
- Auto-generated social media templates
- Achievement sharing to social platforms
- Event success story generation

### 11. Security & Monitoring

**Requirements:**

- Rate limiting system with endpoint-specific limits
- XSS protection and input sanitization
- CSRF protection with token management
- Security headers (HSTS, CSP, etc.)
- Real-time monitoring and alerting
- API endpoint performance tracking

### 12. Mobile Experience

**Requirements:**

- Mobile-responsive design across all features
- Touch-optimized voting interface
- Push notifications

---

## Technical Architecture & Performance

### Core Technology Stack

**Requirements:**

- Modern web framework (SvelteKit)
- Data layer phases: MVP reads/writes static JSON files stored alongside the app; later iterations migrate to Prisma + PostgreSQL without changing business logic
- Real-time capabilities (WebSockets)
- Vercel cloud architecture

### Performance & Scale

**Requirements:**

- Real-time performance monitoring

## API & Integration Contracts

### REST/GraphQL Endpoints (Illustrative)

| Verb | Path                              | Description                            | Auth                  | Notes                                                              |
| ---- | --------------------------------- | -------------------------------------- | --------------------- | ------------------------------------------------------------------ |
| GET  | /api/events                       | List events visible to requesting user | OAuth/Guest token     | Supports pagination, search                                        |
| POST | /api/events/{id}/activity         | Set current activity                   | Organizer JWT         | Requires payload `{ type, metadata, scheduledAt? }`; logs AuditLog |
| GET  | /api/events/{id}/activity         | Retrieve latest activity state         | Any authenticated     | Includes countdown and metadata                                    |
| POST | /api/events/{id}/topics           | Create topic                           | Participant/Organizer | Validates against submission window                                |
| POST | /api/events/{id}/votes            | Submit or update vote                  | Participant           | Enforces weight uniqueness per user                                |
| POST | /api/events/{id}/teams/distribute | Trigger team distribution              | Organizer             | Body includes strategy + constraints                               |
| GET  | /api/events/{id}/analytics        | Event analytics snapshot               | Organizer/Admin       | Accepts time range filters                                         |

### Real-time Channels

- **activity:update** (event-scoped) – broadcasts `{ activity, metadata, switchedAt, countdown }`.
- **voting:update** – incremental vote tallies for dashboards; throttled to 2 updates/sec.
- **game:state** – multiplayer collaborative/battle game events (e.g., word submissions, scores) with optimistic concurrency.
- **team:assignment** – final team rosters with optional room locations.

### Webhooks & Integrations

- Outbound webhooks for activity changes, round start/end, team distribution completion.
- OAuth integrations (GitHub, Google) require refresh token rotation and consent scopes.

---

## User Experience & Accessibility

### Core UX Features

**Requirements:**

- Intuitive navigation and clear information hierarchy
- Consistent visual design across all interfaces
- Fast loading times and responsive interactions
- Mobile-first responsive design
- Minimalist layouts that prioritize a small number of high-impact elements per screen
- Iconography built with SVG assets inspired by award-winning event/design systems, ensuring visual clarity and accessibility

### Accessibility & Usability

**Requirements:**

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode
- Multiple language support

---

## Data Management & Analytics

### Data Storage & Privacy

**Requirements:**

- MVP: local JSON file storage with privacy protection and clear migration path to relational database
- GDPR compliance features
- Data export capabilities
- Event data archiving
- Participant data portability

### Analytics & Reporting

**Requirements:**

- Connection and collaboration analytics with filters by activity mode and timeframe
- Activity switch history with organizer attribution and average dwell time per mode
- Voting funnel metrics (participants invited → voted → attended discussion)
- Exportable CSV/JSON reports for rounds, teams, and game sessions
- Organizer dashboard widgets for NPS, feedback, and participation retention

---

## Testing & Quality Assurance

### Testing Coverage

**Requirements:**

- Unit tests for core functionality
- Integration tests for API endpoints
- End-to-end user journey testing
- Performance testing for large events
- Security penetration testing
- Regression suite must cover the four primary journeys outlined earlier (join & vote, orchestrate activities, distribute teams, monitor platform health).
- Automated load tests simulate at least 200 concurrent participants engaging in multiplayer game scenarios.
- Chaos tests ensure graceful handling of dropped WebSocket connections and forced activity switch failures.
- Accessibility tests executed in CI (axe-core) plus manual assistive technology checks each minor release.

---

## Documentation & Support

### User Documentation

**Requirements:**

- Comprehensive setup and configuration guides
- Step-by-step user tutorials
- FAQ and troubleshooting sections
- Video walkthrough tutorials
- Multi-language support

---

## Deployment & DevOps

### Deployment Options

**Requirements:**

- Vercel platform compatibility
- Self-hosted installation options
- GH Actions CI/CD pipeline integration

### CI/CD Workflow

- Pull requests trigger lint, unit, integration, and accessibility checks.
- Staging deploys on every main branch merge with automated smoke tests of activity switching.
- Production deploy requires manual approval plus verification of database migrations.

### Observability

- Centralized logging (e.g., Logflare/Datadog) with structured fields for event_id, activity, latency.
- Real-time dashboards monitor active users, activity state distribution, WebSocket success rate, error budgets.
- Alerting thresholds: activity switch failure >2% in 5 minutes, WebSocket error rate >5%, latency SLA breaches.

## Non-Functional Requirements

### Performance

- Activity switch broadcasts reach 95% of clients within 1s, 99% within 2s.
- Multiplayer games sustain 200 concurrent clients with <150ms server processing time per event.
- Initial page load Largest Contentful Paint < 2.5s on mid-tier mobile (Chrome, 4G).

### Reliability & Availability

- Target 99.5% monthly uptime for organizer console and participant app.
- Graceful degradation: if real-time channel unavailable, fall back to polling every 5 seconds.
- Automated backups every 30 minutes with 7-day retention; disaster recovery RTO 30 minutes.
- Offline mode is not supported; users must reconnect before continuing any activity.

### Security & Compliance

- All organizer actions double-logged (database + append-only storage) for audit.
- Role-based access control enforced on API and real-time layers; principle of least privilege.
- Sensitive environment secrets stored in managed secret vault; rotation documented.
- GDPR/CCPA compliance: data deletion workflows, consent logging, privacy notices.

### Accessibility

- Manual audits for WCAG 2.1 AA each release; automated axe-core tests in CI.
- Keyboard-only navigation for organizer console and participant screens.
- Provide captions/text alternatives for audio elements in games.

### Localization & Content

- Support English (en-US) and French (fr-FR) at launch; structure copy for easy extension.
- All user-facing text externalized to translation files with fallback to English.
- Provide locale-aware formatting for dates, times, numbers.
