# Unused Files & Legacy Code Report

> Generated: December 29, 2025  
> Status: **Analysis Complete**

This report identifies files and modules that appear to be unused or legacy code in the codebase. The project has evolved to focus on **Event Tools** (shuffler, poll, timer, survey) but contains extensive legacy code from a previous "unconference" event management system.

---

## 🔴 HIGH PRIORITY - Safe to Delete (Not used anywhere)

### 1. Empty Route Folders
These routes have empty folders or unused pages:

| Path | Reason |
|------|--------|
| `src/routes/achievements/` | **Empty folder** - no content |
| `src/routes/voting-demo/` | **Empty folder** - demo page with no links |
| `src/routes/api/achievements/` | **Empty folder** - API endpoint not implemented |
| `src/routes/api/gdpr/` | **Empty folder** - API endpoint not implemented |
| `src/routes/api/backup/` | **Empty folder** - API endpoint not implemented |

### 2. Completely Unused Libraries
These entire directories have **zero imports** from routes or active components:

| Path | Files | Reason |
|------|-------|--------|
| `src/lib/achievements/` | `tracker.ts`, `types.ts` | No imports found - achievement system not used |
| `src/lib/gdpr/` | 5 files (consent, deletion, export, retention, audit) | No imports - GDPR system not implemented |
| `src/lib/offline/` | `action-queue.ts`, `network-monitor.ts` | No imports - offline support not used |
| `src/lib/backup/` | 4 files (backup-service, data-integrity, disaster-recovery, monitoring) | Only internal imports - no actual usage |
| `src/lib/components/achievements/` | Empty folder | No components |

### 3. Unused Components in `src/lib/components/`
These components exist but are **never imported in any route**:

| Component | Reason |
|-----------|--------|
| `ActionQueueViewer.svelte` | No route imports |
| `ActivityController.svelte` | No route imports |
| `ActivityInterface.svelte` | Only test imports |
| `ActivityTimerManager.svelte` | No route imports |
| `AnalyticsDashboard.svelte` | No route imports |
| `AssignmentPreview.svelte` | No route imports |
| `AuthGuard.svelte` | No route imports |
| `BottomNavigation.svelte` | No route imports |
| `CloningSuccessDialog.svelte` | No route imports |
| `ConnectionHealthMonitor.svelte` | No route imports |
| `ConnectionStatusIndicator.svelte` | No route imports |
| `DiscussionGroupManager.svelte` | No route imports |
| `DiscussionInterface.svelte` | No route imports |
| `EventCloningInterface.svelte` | No route imports |
| `EventSelector.svelte` | No route imports |
| `EventTemplateList.svelte` | No route imports |
| `GameControls.svelte` | No route imports (word chain game) |
| `GameInterface.svelte` | Only internal import from ActivityInterface |
| `HelpPanel.svelte` | No route imports |
| `HelpTooltip.svelte` | No route imports |
| `Hero.svelte` | No route imports (inline hero used instead) |
| `LateJoinerAssignment.svelte` | No route imports |
| `MobileNavigation.svelte` | No route imports |
| `OfflineIndicator.svelte` | No route imports |
| `OfflineManager.svelte` | No route imports |
| `OrganizerDashboard.svelte` | No route imports |
| `ParticipantDashboard.svelte` | No route imports |
| `ParticipantImporter.svelte` | No route imports |
| `ParticipantManager.svelte` | No route imports |
| `PermissionGuard.svelte` | No route imports |
| `PlayerStatusList.svelte` | No route imports (word chain game) |
| `QRScanner.svelte` | No route imports |
| `ReconnectionPrompt.svelte` | No route imports |
| `RoleGuard.svelte` | No route imports |
| `RoomCard.svelte` | No route imports |
| `TeamAssignmentBroadcast.svelte` | No route imports |
| `TeamAssignmentInterface.svelte` | No route imports |
| `TeamDistributionEditor.svelte` | No route imports |
| `TeamDistributionPreview.svelte` | No route imports |
| `TemplateCreationForm.svelte` | Only internal import from TemplateCreationWizard |
| `TemplateCreationWizard.svelte` | No route imports |
| `TemplateDiscoveryInterface.svelte` | No route imports |
| `TemplatePermissionGuard.svelte` | No route imports |
| `TemplatePreview.svelte` | Only internal import |
| `TemplatePreviewModal.svelte` | Only internal import |
| `TemplateSharingHistory.svelte` | Only internal import |
| `TemplateSharingInterface.svelte` | No route imports |
| `TopicList.svelte` | No route imports |
| `TopicListWithVoting.svelte` | Only internal import from VotingInterface |
| `TopicSubmissionForm.svelte` | No route imports |
| `ValidatedEventJoin.svelte` | No route imports |
| `VotingInterface.svelte` | Only internal import from ActivityInterface |
| `WebSocketTest.svelte` | No route imports |
| `WeightedVoting.svelte` | No route imports |
| `WordChainGame.svelte` | No route imports |
| `WordChainModeSelector.svelte` | No route imports |
| `WordChainTimeline.svelte` | No route imports |
| `WordSubmissionInput.svelte` | No route imports |

---

## 🟠 MEDIUM PRIORITY - Review Before Deleting

### 1. Legacy Game System
The word chain game was built but never integrated into routes:

| Path | Files |
|------|-------|
| `src/lib/games/word-chain/` | 8 files: `dictionary.ts`, `game-logic.ts`, `game-state.ts`, `index.ts`, `profanity-filter.ts`, `types.ts`, `websocket-client.ts`, `websocket.ts` |
| `src/test/games/` | 5 test files |

### 2. Unused Utility Files in `src/lib/utils/`
| File | Reason |
|------|--------|
| `cache.ts` | No imports found |
| `csv-parser.ts` | No imports found |
| `late-joiner-handler.ts` | No imports found |
| `lazy-loading.ts` | No imports found |
| `mobile-performance.ts` | No imports found |
| `team-assignment-broadcast.ts` | No imports found |
| `team-distribution.ts` | No imports found |

### 3. Unused Svelte Stores
| File | Reason |
|------|--------|
| `src/lib/stores/discussionGroupStore.ts` | Only used by unused DiscussionGroupManager component |
| `src/lib/stores/topicStore.ts` | Only used by unused TopicList components |
| `src/lib/stores/votingStore.ts` | Only used by unused voting components |

### 4. Admin Pages (Unused but Functional)
These admin pages exist but have **no navigation links** to them:

| Route | Purpose |
|-------|---------|
| `/admin/alerting` | Alert configuration |
| `/admin/audit` | Audit log viewer |
| `/admin/dashboard` | Admin dashboard |
| `/admin/health` | Health monitoring |
| `/admin/lifecycle` | Event lifecycle management |
| `/admin/monitoring` | System monitoring |
| `/admin/organizers` | Organizer management |
| `/admin/resilience` | Resilience configuration |

### 5. API Endpoints for Unused Features
| Endpoint | Used By |
|----------|---------|
| `/api/discussion-groups/*` | Legacy discussion group feature |
| `/api/templates/*` | Template system (components exist but no routes) |
| `/api/analytics/*` | Analytics system (used internally) |
| `/api/alerting/*` | Alerting system (admin only) |

---

## 🟡 LOW PRIORITY - Keep But Consider Cleanup

### 1. Development/Demo Pages
| Route | Reason |
|-------|--------|
| `/ui-showcase` | Component showcase - useful for development |
| `/docs/*` | Documentation pages - may be useful |

### 2. Auth Routes (May Be Used)
| Route | Status |
|-------|--------|
| `/register` | Has links from `/signin` page |
| `/signin` | Referenced in multiple places |

### 3. Services Used by APIs
These services are used by API endpoints but the features may not be user-facing:
- `src/lib/services/admin.ts` - Used by admin API
- `src/lib/services/analytics.ts` - Used by analytics API
- `src/lib/services/archival.ts` - Used by analytics API
- `src/lib/services/eventLifecycle.ts` - Used by lifecycle API
- `src/lib/services/discussionGroupAssignment.ts` - Used by discussion-groups API

---

## 📊 Summary

| Category | File Count | Recommendation |
|----------|------------|----------------|
| Empty folders | 5 | Delete immediately |
| Unused libraries | ~15 files | Delete after backup |
| Unused components | ~50 files | Delete - major cleanup |
| Unused utilities | ~7 files | Delete |
| Legacy game system | ~13 files | Delete |
| Admin pages | 8 routes | Keep but add navigation or delete |
| Test files for unused code | ~10 files | Delete with their sources |

### Estimated Code Reduction
- **~100+ files** can potentially be removed
- **~20,000+ lines** of unused code
- Will significantly simplify the codebase

---

## 🛠️ Recommended Cleanup Actions

### Phase 1: Safe Deletions (Zero Risk)
```
rm -rf src/routes/achievements/
rm -rf src/routes/voting-demo/
rm -rf src/routes/api/achievements/
rm -rf src/routes/api/gdpr/
rm -rf src/routes/api/backup/
rm -rf src/lib/achievements/
rm -rf src/lib/gdpr/
rm -rf src/lib/offline/
rm -rf src/lib/backup/
rm -rf src/lib/components/achievements/
```

### Phase 2: Component Cleanup
Delete all components listed in "Unused Components" section above.

### Phase 3: Game System Removal
```
rm -rf src/lib/games/
rm -rf src/test/games/
```

### Phase 4: Store & Utility Cleanup
Delete unused stores and utilities after component cleanup.

### Phase 5: Decide on Admin Pages
Either:
- Add navigation to admin pages from main app
- Or delete entire `/admin` section and related APIs

---

## ⚠️ Before Deleting

1. **Run tests**: `npm run test` to ensure nothing breaks
2. **Check for dynamic imports**: Some components might be loaded dynamically
3. **Create a backup branch**: `git checkout -b backup/pre-cleanup`
4. **Delete incrementally**: Remove one category at a time and test

---

*This report was generated by analyzing import statements and route usage across the codebase.*
