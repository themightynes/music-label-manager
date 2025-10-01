---
title: Email Notification System — Phase Progress
status: In Progress
owners:
  - Ernesto Chapa
contributors:
  - Droid (Factory AI Engineer)
last_updated: 2025-10-01
tags:
  - notifications
  - roadmap
  - implementation-tracking
---

# Email Notification System — Phase Progress

## Executive Summary

Phase 1 of the email notification system is now complete. The backend foundation can generate, persist, and expose game emails through authenticated API endpoints. Phases 2 and 3 will bring the player-facing experiences online and polish narrative delivery across the UX.

## Phase 1 — Backend Foundation (✅ Complete)

- **Goal**: Persist weekly executive correspondence so the CEO (player) has a narrative archive of label activity.
- **Scope Delivered**
  - `shared/schema.ts`: Added normalized `emails` table plus migration `0015_create_emails_table.sql`.
  - `server/storage.ts`: CRUD operations for fetching, filtering, updating, and deleting emails (supports pagination & unread counts).
  - `shared/types/emailTypes.ts`: Shared domain models.
  - `shared/engine/EmailGenerator.ts`: Generates all seven planned email categories with executive-specific senders.
  - `shared/engine/game-engine.ts`: Weekly loop now calls `generateAndPersistEmails` so emails are emitted alongside other game events.
  - `server/routes.ts`: REST surface for inbox UI — list, unread count, mark-as-read, and delete.
- **Validation**
  - `npm run check`
  - `npx vitest run` *(fails: repo contains no Vitest suites yet — expected)*
- **Outstanding Items**
  - No automated tests exist for the new APIs; will be covered when integration points become concrete in Phase 2.
  - Email copy uses structured payloads; narrative rendering deferred to frontend templates.

## Phase 2 — Frontend Inbox & Presentation (🚧 Upcoming)

### Objectives
- Surface generated emails inside the SimUI so players can triage executive correspondence without leaving the dashboard.
- Preserve executive voice and context via templated rendering.
- Expose status cues (new, read) and quick actions (mark read, delete) across the UI.

### Deliverables
1. **Inbox Entry Points**
   - Dashboard widget with unread badge & previews.
   - Optional toast hook that links into the inbox modal when new emails arrive.
2. **Inbox Modal / Panel**
   - Two-pane layout: sortable list (left) + detail view (right).
   - Filtering by category, unread, and week number.
   - Keyboard navigation & accessibility pass (Radix primitives available).
3. **Email Templates**
   - Narrative rendering for each category (tour reports, chart debuts, releases, tier unlocks, artist discoveries, financial summaries).
   - Executive portrait/name plates leveraging `roles.json` metadata.
4. **Client Data Hooks**
   - React Query integration for `/emails`, `/emails/unread-count`.
   - Mutations for mark read / delete with optimistic updates and store sync.
5. **State Synchronization**
   - Extend `client/src/store/gameStore.ts` to stash inbox data where necessary (e.g., unread count for top-bar badge).

### Technical Notes
- Respect existing Router/modular layout; prefer lazy-loading the inbox modal to keep initial bundle small.
- Map structured `body` payloads to strongly-typed renderers to avoid brittle string formatting.
- Ensure hydration-safe date handling (server timestamps → client `Date` objects).
- Record analytics events for open/read/delete to support future achievements or analytics dashboards.

### Exit Criteria
- Inbox UI demonstrated with seeded emails (via dev tools or scripted week advancers).
- Accessibility audit (keyboard focus, ARIA for list & detail panes).
- Storybook/Chromatic entries for email templates (at least each category). 
- QA checklist covering slow network, simultaneous updates, and optimistic rollback states.

## Phase 3 — Polish & Narrative Depth (🔮 Planned)

### Goals
- Refine the storytelling layer, integrate real-time feedback, and support longitudinal analysis.

### Roadmap Highlights
1. **Narrative Enhancements**
   - Executive-specific sign-offs, tone adjustments based on morale/loyalty.
   - Dynamic attachment support (charts, mini dashboards).
2. **Lifecycle Features**
   - Archive / label functionality (pinning important emails, bulk actions).
   - Calendar integration for scheduling follow-up actions.
3. **Realtime Signals**
   - Socket or polling triggers to pop inbox badge immediately after week advance.
   - Optional toast integration summarizing top highlights with deep links into full email.
4. **Analytics & Export**
   - Weekly digest summarizing email trends (counts per category, unread rate).
   - Export pipeline (PDF/CSV) for players that want campaign reports.
5. **Automation Hooks**
   - Use email metadata to drive other systems (e.g., persistent tasks, achievements, or executive meeting unlocks).

### Dependencies / Research
- Executive mood system roadmap (docs/01-planning/implementation-specs/[IN-PROGRESS] artist-mood-plan.md).
- Potential integration with achievements engine for narrative milestones.

## Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| No dedicated tests yet | Medium | Add API contract tests alongside frontend integration to ensure shape stability. |
| Email copy drift between backend & frontend | Low | Centralize narrative strings inside template renderers; backend stores structured data only. |
| Inbox clutter over long campaigns | Medium | Introduce archive filtering & pagination defaults in Phase 2 release. |
| Performance of week advance with large email volumes | Low | `createEmails` already batch-persist; monitor and cap per-week generation if necessary. |

## Decision Log

- ✅ 2025-09-30 — Approved three-phase rollout (Backend → UI → Polish).
- ✅ 2025-10-01 — Backend implementation merged (PR `feat: implement backend email system`).
- ⏳ 2025-10-XX — Targeting Phase 2 feature branch `feature/email-system-phase2` (TBD).

## Next Actions

1. Kick off Phase 2 scoping session → finalize UI wireframes & component contracts.
2. Draft Storybook entries for each email template with sample payloads.
3. Schedule QA time for inbox workflows once feature branch enters review.
4. Define telemetry/analytics events to capture inbox usage.

---

_Document Owner: Ernesto Chapa_