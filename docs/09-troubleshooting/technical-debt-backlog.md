# Technical Debt Backlog

**Music Label Manager - Code Quality Improvements**
*Document Purpose: Track technical debt and quality improvements identified during codebase reviews*

---

## 📋 **Document Information**

- **Created**: September 2025 (Artist Mood System Implementation - commit `4991ab3`)
- **Last Updated**: October 17, 2025
- **Total Items**: 28
- **Completed**: 9
- **In Progress**: 0
- **Pending**: 19

---

## 🎯 **Priority Legend**

- 🔴 **Critical**: Security/Production stability issues
- 🟡 **High**: Code quality issues affecting maintainability
- 🟢 **Medium**: UX/Developer experience improvements
- 🔵 **Low**: Nice-to-have refactorings

---

## ✅ **Completed Items**

### ~~Comment 1: Inconsistent auth implementation~~ ✅
**Status**: ✅ **COMPLETED** (October 16, 2025)

`useCurrentUser` fetches `/api/me` with `credentials: 'include'` while other API calls rely on Clerk bearer token.

**Resolution**: Updated `useCurrentUser.ts` to use the standardized `apiRequest` helper with Clerk bearer tokens. Removed `credentials: 'include'` and ensured consistent authentication across all API calls. Added `silent401: true` option for graceful handling of unauthenticated requests.

---

### ~~Comment 6: apiRequest lacks timeouts/retry/backoff~~ ✅
**Status**: ✅ **COMPLETED** (October 16, 2025)

apiRequest had no timeouts/retry/backoff; critical flows could hang or fail transiently.

**Resolution**: Enhanced `apiRequest` with:
- **Timeout support**: Default 10s timeout using AbortController, configurable via `timeout` option
- **Retry logic**: Exponential backoff with jitter for GET requests (opt-in via `retry: true`)
- **Smart retry strategy**: Retries on 5xx errors, 429 rate limits, and timeout errors; skips 4xx client errors
- **Configurable retries**: Default 3 max retries with exponential backoff (1s, 2s, 4s, capped at 10s)
- **Request options interface**: New `ApiRequestOptions` type for timeout/retry/maxRetries configuration

---

### ~~Comment 21: Admin routes lack server-side protection~~ ✅
**Status**: ✅ **COMPLETED** (October 16, 2025)

withAdmin redirects non-admins client-side only; sensitive admin routes should be server-protected too.

**Resolution**:
- **Server-side protection verified**: All admin routes already use `requireClerkUser, requireAdmin` middleware (lines 324, 4703, 4715, 4767, 4861 in `server/routes.ts`)
- **Client UX improved**: Enhanced `withAdmin` HOC to show friendly "Unauthorized Access" message with 2-second countdown before redirecting to home page instead of rendering `null`

---

### ~~Comment 3: Corrupted ux-prototype files~~ ✅
**Status**: ✅ **COMPLETED** (October 16, 2025)

Delete or rename the malformed files under `client/src/components` containing `ux-prototypes` and accidental shell text.

**Resolution**: Deleted two malformed files that were shell command artifacts accidentally committed to the repository.

---

### ~~Comment 2: Verbose logging exposes sensitive data~~ ✅
**Status**: ✅ **COMPLETED** (October 16, 2025)

apiRequest and throwIfResNotOk log verbose request/response details including headers; avoid leaking Authorization or PII in prod.

**Resolution**: Created production-safe logging infrastructure with:
- **`client/src/lib/logger.ts`**: Lightweight logger utility (~85 lines) with DEV-gated debug/info methods
- **Header redaction**: `redactSensitiveHeaders()` function redacts Authorization, Cookie, and API key headers
- **queryClient.ts refactor**: All console.log → logger.debug, console.warn/error unchanged (always visible)
- **Component updates**: Top10ChartDisplay and SelectionSummary migrated to logger pattern as examples
- **Production safety**: Debug logs completely silent in production, only warnings/errors visible

---

### ~~Comment 8: Excessive console logs create noise~~ ✅
**Status**: ✅ **COMPLETED** (October 16, 2025)

Excessive console logs across components create noise; add debug flag gating and structured logging.

**Resolution**: Same logger.ts utility from Comment 2 solves this issue:
- **DEV-gated logging**: All debug/info logs automatically suppressed in production builds
- **Structured levels**: logger.debug(), logger.info(), logger.warn(), logger.error()
- **Simple migration**: Components replace `console.log` with `logger.debug`
- **Production logs**: Only warnings and errors appear in production (critical for debugging)
- **Performance**: Zero overhead in production (conditionals resolve at runtime but logging calls are no-ops)

---

### ~~Comment 7: Silent error handling without user feedback~~ ✅
**Status**: ✅ **COMPLETED** (October 17, 2025)

Many components log errors but continue silently; add user feedback and consistent error boundaries.

**Resolution**:
- **Logging infrastructure** (Oct 16): Created logger.ts with consistent error logging and header redaction
- **User-facing toasts** (Oct 17): Added toast notifications to all key user actions:
  - **GameSidebar**: Auto-select operations (success/error), week advance errors, new game creation errors
  - **ArtistRoster**: Artist signing (success/error), game state refresh errors
  - **ExecutiveSuitePage**: Week advance errors
  - **AROffice**: Data loading errors, sourcing operation failures, cancel operation errors, artist signing (success/error)
- **Pattern established**: All error-prone operations now use try/catch with logger.error() + toast({ variant: "destructive" })
- **User experience**: Users now receive immediate feedback for both success and failure states

---

### ~~Comment 11: Duplicated auto-select logic~~ ✅
**Status**: ✅ **COMPLETED** (October 17, 2025)

Auto-select logic duplicated in GameSidebar and executiveMeetingMachine; consolidate into shared helper.

**Resolution**: Created unified auto-selection service:
- **`client/src/services/executiveAutoSelect.ts`**: Shared service (~125 lines) with 5 focused functions
- **Documented algorithm**: score = (100 - mood) + (100 - loyalty) + role_priority
- **Role priority scores**: CEO (50), Head A&R (40), CMO (30), CCO (20), Head Distribution (10)
- **GameSidebar refactor**: Reduced from ~55 lines to ~40 lines using shared service
- **executiveMeetingMachine refactor**: Reduced from ~50 lines to ~35 lines using shared service
- **DRY principle applied**: Both components now use identical logic, ensuring consistency
- **Comprehensive JSDoc**: All functions documented with purpose, parameters, and return types

---

## 🔴 **Critical Priority Items**

**All critical priority items have been completed! 🎉**

---

## 🟡 **High Priority Items**

### [ ] Comment 9: React Query defaults may stale critical data
**Priority**: 🟡 High
**Impact**: Data freshness, cache behavior
**Effort**: Low

React Query defaults are global staleTime=Infinity and retry=false; may stale critical data or overfetch elsewhere.

**Action**: Review `lib/queryClient.ts` defaultOptions: set a more reasonable default staleTime (e.g., 60s) and retry for GETs. Explicitly configure hooks (emails, analytics) with per-use staleness and retry settings. Document conventions in a README comment within `queryClient.ts`.

**Relevant Files**:
- [client/src/lib/queryClient.ts](client/src/lib/queryClient.ts)
- [client/src/hooks/useEmails.ts](client/src/hooks/useEmails.ts)
- [client/src/hooks/useAnalytics.ts](client/src/hooks/useAnalytics.ts)

---

### [ ] Comment 10: Scattered URL building across hooks
**Priority**: 🟡 High
**Impact**: Maintainability
**Effort**: Medium

useAnalytics builds URLs by string interpolation scattered across hooks; centralize API path builders.

**Action**: Create `client/src/lib/apiPaths.ts` exporting helpers: `me()`, `emails(gameId,q)`, `artistROI(gameId, artistId)`, etc. Refactor hooks/services to use these helpers and pass to `apiRequest`.

**Relevant Files**:
- [client/src/hooks/useAnalytics.ts](client/src/hooks/useAnalytics.ts)
- [client/src/hooks/useEmails.ts](client/src/hooks/useEmails.ts)
- [client/src/services/*.ts](client/src/services/)

---

### [ ] Comment 27: Components bypass apiRequest
**Priority**: 🟡 High
**Impact**: API consistency, error handling
**Effort**: Low

Some hooks/components bypass apiRequest and use fetch directly; use unified client for headers, errors.

**Action**: Replace direct fetch calls in `client/src/auth/useCurrentUser.ts` (and any others) with `apiRequest`. Audit components for fetch usage and migrate to the shared client.

**Relevant Files**:
- [client/src/auth/useCurrentUser.ts](client/src/auth/useCurrentUser.ts)
- [client/src/components/ArtistDiscoveryModal.tsx](client/src/components/ArtistDiscoveryModal.tsx)
- [client/src/components/ProjectCreationModal.tsx](client/src/components/ProjectCreationModal.tsx)
- [client/src/pages/RecordingSessionPage.tsx](client/src/pages/RecordingSessionPage.tsx)

---

## 🟢 **Medium Priority Items**

### [ ] Comment 4: GamePage auto-creates default label
**Priority**: 🟢 Medium
**Impact**: User experience
**Effort**: Low

GamePage creates default label on closing modal if week===1; can surprise users and mask errors.

**Action**: In `pages/GamePage.tsx`, modify `handleLabelModalOpenChange` to not auto-create a default label when closing. Instead, prompt user to confirm creating a default label, or keep the modal open with an error message.

**Relevant Files**:
- [client/src/pages/GamePage.tsx](client/src/pages/GamePage.tsx)

---

### [ ] Comment 5: getQueryFn URL building risky
**Priority**: 🟢 Medium
**Impact**: Robustness
**Effort**: Medium

getQueryFn builds URL via queryKey.join('/'); risky if keys contain leading slashes or absolute URLs.

**Action**: Refactor `getQueryFn` in `lib/queryClient.ts` to accept a `queryKey: [string, ...unknown[]]` where the first element is the full request URL. Use it directly instead of `join('/')`.

**Relevant Files**:
- [client/src/lib/queryClient.ts](client/src/lib/queryClient.ts)

---

### [ ] Comment 12: Missing ARIA labels and focus management
**Priority**: 🟢 Medium
**Impact**: Accessibility
**Effort**: Medium

Some interactive elements lack clear focus management and aria attributes (InboxWidget card clickable, complex modals).

**Action**: Audit components for `aria-label`s and visible focus styles. Use shadcn/ui accessible primitives.

**Relevant Files**:
- [client/src/components/InboxWidget.tsx](client/src/components/InboxWidget.tsx)
- [client/src/components/InboxModal.tsx](client/src/components/InboxModal.tsx)
- [client/src/components/ExecutiveMeetings.tsx](client/src/components/ExecutiveMeetings.tsx)

---

### [ ] Comment 13: SaveGameModal uses window.alert
**Priority**: 🟢 Medium
**Impact**: UX consistency
**Effort**: Low

SaveGameModal uses window.alert for UX; replace with in-app toasts/modals for consistency.

**Action**: Update `components/SaveGameModal.tsx` to replace `alert()` with `useToast()` notifications and modal close actions.

**Relevant Files**:
- [client/src/components/SaveGameModal.tsx](client/src/components/SaveGameModal.tsx)
- [client/src/hooks/use-toast.ts](client/src/hooks/use-toast.ts)

---

### [ ] Comment 14: Email category defaults to 'financial'
**Priority**: 🟢 Medium
**Impact**: Data accuracy
**Effort**: Low

Email normalization defaults unknown categories to 'financial'; could misclassify and mislead UI.

**Action**: In `hooks/useEmails.ts`, change default category mapping to 'artist' or introduce a new 'other' category supported by UI.

**Relevant Files**:
- [client/src/hooks/useEmails.ts](client/src/hooks/useEmails.ts)
- [client/src/components/InboxModal.tsx](client/src/components/InboxModal.tsx)

---

### [ ] Comment 15: useEmails uses JSON.stringify in dependency
**Priority**: 🟢 Medium
**Impact**: Performance
**Effort**: Low

useEmails memoizes params via JSON.stringify in dependency; could thrash when order changes.

**Action**: Refactor `useEmails` to build the queryKey as `['emails', gameId, params.isRead ?? null, ...]` and avoid extra memoization object.

**Relevant Files**:
- [client/src/hooks/useEmails.ts](client/src/hooks/useEmails.ts)

---

### [ ] Comment 16: useAnalytics has empty API_BASE placeholder
**Priority**: 🟢 Medium
**Impact**: Production deployment
**Effort**: Low

useAnalytics has API_BASE = '' placeholder; if base URL differs in prod, hooks may break.

**Action**: Introduce `VITE_API_BASE_URL` and set `API_BASE = import.meta.env.VITE_API_BASE_URL || ''` or centralize in `lib/apiPaths.ts`.

**Relevant Files**:
- [client/src/hooks/useAnalytics.ts](client/src/hooks/useAnalytics.ts)

---

### [ ] Comment 17: ExecutiveSuitePage uses props: any
**Priority**: 🟢 Medium
**Impact**: Type safety
**Effort**: Low

ExecutiveSuitePage uses props: any = {}; weak typing.

**Action**: Remove `props: any = {}` and directly consume store values; or define `ExecutiveSuitePageProps`.

**Relevant Files**:
- [client/src/pages/ExecutiveSuitePage.tsx](client/src/pages/ExecutiveSuitePage.tsx)

---

### [ ] Comment 18: AROffice retry logic lacks jitter
**Priority**: 🟢 Medium
**Impact**: Network resilience
**Effort**: Medium

AROffice retries discoveredArtists 3 times with fixed backoff; make backoff jittered and cancellable.

**Action**: Refactor retry logic to use a reusable `retry` helper with exponential backoff and jitter.

**Relevant Files**:
- [client/src/components/ar-office/AROffice.tsx](client/src/components/ar-office/AROffice.tsx)

---

### [ ] Comment 19: InboxModal refetch button issues
**Priority**: 🟢 Medium
**Impact**: UX
**Effort**: Low

InboxModal refetch button triggers network even when isFetching; also resets filters on open/close.

**Action**: Persist `category` and `showUnreadOnly` in localStorage. Disable Refresh button when `isFetching` is true.

**Relevant Files**:
- [client/src/components/InboxModal.tsx](client/src/components/InboxModal.tsx)

---

### [ ] Comment 20: ExecutiveSuitePage weeklyActions mismatch
**Priority**: 🟢 Medium
**Impact**: Code clarity
**Effort**: Low

ExecutiveSuitePage maintains weeklyActions as empty list; SelectionSummary expects actions.

**Action**: Review `SelectionSummary.tsx` expectations and supply action metadata or update component.

**Relevant Files**:
- [client/src/pages/ExecutiveSuitePage.tsx](client/src/pages/ExecutiveSuitePage.tsx)
- [client/src/components/SelectionSummary.tsx](client/src/components/SelectionSummary.tsx)

---

### [ ] Comment 22: EmailCategory lacks forward compatibility
**Priority**: 🟢 Medium
**Impact**: Extensibility
**Effort**: Low

EmailCategory limited to ['chart','financial','artist','ar']; server may send new categories.

**Action**: Extend `EmailCategory` union to include 'other'. Update normalization and UI label map.

**Relevant Files**:
- [client/src/hooks/useEmails.ts](client/src/hooks/useEmails.ts)
- [client/src/components/InboxModal.tsx](client/src/components/InboxModal.tsx)
- [shared/types/emailTypes.ts](shared/types/emailTypes.ts)

---

### [ ] Comment 23: Week date calculation inconsistency
**Priority**: 🟢 Medium
**Impact**: Date accuracy
**Effort**: Medium

Week end date calculation in GameSidebar assumes Sunday-week; ensure alignment with backend calendar logic.

**Action**: Move week date calculation into shared utility and align with backend logic. Add tests.

**Relevant Files**:
- [client/src/components/GameSidebar.tsx](client/src/components/GameSidebar.tsx)
- [shared/utils/seasonalCalculations.ts](shared/utils/seasonalCalculations.ts)

---

### [ ] Comment 24: Analytics hooks embed query params inline
**Priority**: 🟢 Medium
**Impact**: Code quality
**Effort**: Low

Analytics hooks embed query params inline; consider using URLSearchParams for safety.

**Action**: Refactor to use `new URL()` and URLSearchParams for gameId and other params.

**Relevant Files**:
- [client/src/hooks/useAnalytics.ts](client/src/hooks/useAnalytics.ts)

---

### [ ] Comment 25: ClerkProvider appearance cast to any
**Priority**: 🟢 Medium
**Impact**: Type safety
**Effort**: Low

ClerkProvider appearance is cast to any; tighten typing to avoid runtime mismatches.

**Action**: Import `type { Appearance } from '@clerk/types'` and remove `as any`.

**Relevant Files**:
- [client/src/main.tsx](client/src/main.tsx)

---

### [ ] Comment 28: withAdmin returns null for unauthorized
**Priority**: 🟢 Medium
**Impact**: UX
**Effort**: Low

withAdmin returns null for unauthorized users; consider rendering a friendly unauthorized message.

**Action**: Render unauthorized message and navigate home after short delay.

**Relevant Files**:
- [client/src/admin/withAdmin.tsx](client/src/admin/withAdmin.tsx)

---

## 🔵 **Low Priority Items**

### [ ] Comment 26: ArtistPage is monolithic
**Priority**: 🔵 Low
**Impact**: Code organization
**Effort**: High

ArtistPage is very large and monolithic; split into subcomponents and memoize heavy sections.

**Action**: Refactor by extracting tabs (Overview, Discography, Releases, Analytics, Management) into separate memoized components.

**Relevant Files**:
- [client/src/pages/ArtistPage.tsx](client/src/pages/ArtistPage.tsx)

---

## 📊 **Summary Statistics**

### By Priority
- 🔴 Critical: 0 items (all completed! 🎉)
- 🟡 High: 2 items (down from 7)
- 🟢 Medium: 17 items
- 🔵 Low: 1 item

### By Status
- ✅ Completed: 9 items (32.1%)
- 🚧 In Progress: 0 items (0%)
- 📋 Pending: 19 items (67.9%)

---

## 🎯 **Suggested Implementation Approach**

### ~~Phase 1: Security & Critical Issues~~ ✅ **COMPLETED** (October 16, 2025)
~~Focus on Comments 1, 6, and 21 for production stability and security.~~
- ✅ Comment 1: Standardized auth with Clerk bearer tokens
- ✅ Comment 6: Added timeout/retry/backoff to apiRequest
- ✅ Comment 21: Verified server-side admin protection + improved client UX

### Phase 2: High Priority Code Quality (Current Sprint Priority)
Address Comments 2, 7, 8, 9, 10, 11, 27 to improve maintainability.

### Phase 3: Medium Priority UX & Refinements (Future Sprints)
Tackle remaining medium-priority items as time allows.

### Phase 4: Low Priority Refactoring (Future)
Consider ArtistPage refactoring when feature development slows.

---

*This document is maintained as part of the project's technical debt tracking. Update status checkboxes and completion dates as items are addressed.*
