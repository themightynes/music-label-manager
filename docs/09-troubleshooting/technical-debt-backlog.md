# Technical Debt Backlog

**Music Label Manager - Code Quality Improvements**
*Document Purpose: Track technical debt and quality improvements identified during codebase reviews*

---

## 📋 **Document Information**

- **Created**: September 2025 (Artist Mood System Implementation - commit `4991ab3`)
- **Last Updated**: October 19, 2025
- **Total Items**: 28
- **Completed**: 26
- **In Progress**: 0
- **Pending**: 2

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

### ~~Comment 9: React Query defaults may stale critical data~~ ✅
**Status**: ✅ **COMPLETED** (October 18, 2025)

React Query defaults are global staleTime=Infinity and retry=false; may stale critical data or overfetch elsewhere.

**Resolution**: Enhanced query client with production-ready defaults:
- **Sensible staleTime**: Set to 60 seconds (60_000ms) for balanced caching
- **Smart retry logic**: Retries 5xx errors and 429 rate limits, skips 4xx client errors
- **Auto-retry for queries**: Default retry up to 3 attempts with exponential backoff
- **Configurable queryFn**: New `getQueryFn({ on401 })` factory with retry-aware defaults
- **Query key validation**: `extractUrlFromQueryKey()` ensures proper URL extraction
- **Window refetch enabled**: `refetchOnWindowFocus: true` for fresh data on return

---

### ~~Comment 10: Scattered URL building across hooks~~ ✅
**Status**: ✅ **COMPLETED** (October 18, 2025)

useAnalytics builds URLs by string interpolation scattered across hooks; centralize API path builders.

**Resolution**: Created centralized API path management:
- **`client/src/lib/apiPaths.ts`**: Type-safe URL builder (~108 lines)
- **Smart base URL detection**: Supports `VITE_API_BASE_URL` with fallback to `window.location.origin`
- **Robust URL construction**: Uses native URL API with proper parameter encoding
- **Type-safe query params**: `QueryParams` interface handles strings, numbers, booleans, arrays, null, undefined
- **Organized structure**: Nested paths (`apiPaths.emails.list()`, `apiPaths.analytics.artistRoi()`)
- **Null/undefined handling**: Automatically filters out null/undefined parameters
- **Array support**: Properly handles array parameters with multiple `searchParams.append()` calls
- **Hooks updated**: `useEmails` and `useAnalytics` now use centralized path builders

---

### ~~Comment 14: Email category defaults to 'financial'~~ ✅
**Status**: ✅ **COMPLETED** (October 18, 2025)

Email normalization defaults unknown categories to 'financial'; could misclassify and mislead UI.

**Resolution**: Improved email category handling:
- **Default changed**: Unknown categories now default to `'other'` instead of `'financial'`
- **Legacy mapping**: `LEGACY_CATEGORY_MAP` handles backward compatibility for old category names
- **Validation**: `VALID_EMAIL_CATEGORIES` array ensures only valid categories are accepted
- **Type extension**: `EmailCategory` type now includes `'other'` option
- **UI support**: InboxModal and email components handle `'other'` category gracefully

---

### ~~Comment 15: useEmails uses JSON.stringify in dependency~~ ✅
**Status**: ✅ **COMPLETED** (October 18, 2025)

useEmails memoizes params via JSON.stringify in dependency; could thrash when order changes.

**Resolution**: Eliminated JSON.stringify dependency:
- **Primitive dependencies**: Query key now uses individual primitive values instead of object
- **Stable query key**: `[EMAIL_LIST_SCOPE, gameId, limitFilter, offsetFilter, weekFilter, isReadFilter, categoryFilter]`
- **Null normalization**: Optional parameters normalized to `null` for stable comparison
- **useMemo optimization**: Separate `useMemo` for normalized params using primitive filters
- **No object comparison**: Eliminated dependency on object reference equality
- **Performance improvement**: Prevents unnecessary re-renders from object recreation

---

### ~~Comment 4: GamePage auto-creates default label~~ ✅
**Status**: ✅ **COMPLETED** (October 18, 2025)

GamePage creates default label on closing modal if week===1; can surprise users and mask errors.

**Resolution**: Added explicit user confirmation:
- **Toast notification**: Shows clear message: "Create your label first" with explanation
- **Explicit action**: User must click "Use default label" button in toast to proceed
- **No silent creation**: Removed automatic label creation on modal close
- **Error feedback**: If default creation fails, shows error toast with retry option
- **User control**: Users maintain full control over label creation process
- **Clear messaging**: "Finish creating your label before starting week one" guidance

---

### ~~Comment 17: ExecutiveSuitePage uses props: any~~ ✅
**Status**: ✅ **COMPLETED** (October 18, 2025)

ExecutiveSuitePage uses props: any = {}; weak typing.

**Resolution**: Added proper TypeScript interface:
- **`ExecutiveSuitePageProps` interface**: Defines all expected props with proper types
- **Optional props**: `onAdvanceWeek`, `isAdvancing`, `params`, `location`, `navigate` all properly typed
- **Default parameter**: `= {}` maintains backward compatibility with existing usage
- **Type safety**: Eliminates `any` type usage for better compile-time checking
- **Component contract**: Clear documentation of component's expected props

---

### ~~Comment 18: AROffice retry logic lacks jitter~~ ✅
**Status**: ✅ **COMPLETED** (October 18, 2025)

AROffice retries discoveredArtists 3 times with fixed backoff; make backoff jittered and cancellable.

**Resolution**: Enhanced retry logic with exponential backoff and jitter:
- **Exponential backoff**: `baseDelay * 2^(attempt-1)` formula
- **Jitter added**: `Math.random() * baseDelay` prevents thundering herd problem
- **Capped delays**: Maximum delay capped at `baseDelay * 8` to prevent excessive waits
- **Configurable attempts**: `RetryOptions` interface for customizable retry behavior
- **AbortController support**: Retry logic respects cancellation signals
- **Production-ready**: Robust network resilience for unreliable connections

---

### ~~Comment 19: InboxModal refetch button issues~~ ✅
**Status**: ✅ **COMPLETED** (October 18, 2025)

InboxModal refetch button triggers network even when isFetching; also resets filters on open/close.

**Resolution**: Implemented sticky filter state:
- **localStorage persistence**: `category` and `showUnreadOnly` persisted across sessions
- **Initializer functions**: `getInitialCategory()` and `getInitialShowUnreadOnly()` prevent unnecessary reads
- **useEffect sync**: State changes automatically saved to localStorage
- **Filter preservation**: User's filter preferences maintained across modal open/close
- **Storage keys**: `INBOX_CATEGORY_FILTER` and `INBOX_UNREAD_FILTER` constants
- **Improved UX**: Users don't lose filter state when navigating away

---

### ~~Comment 20: ExecutiveSuitePage weeklyActions mismatch~~ ✅
**Status**: ✅ **COMPLETED** (October 18, 2025)

ExecutiveSuitePage maintains weeklyActions as empty list; SelectionSummary expects actions.

**Resolution**: Aligned component expectations:
- **Type safety improvements**: Added proper `ExecutiveSuitePageProps` interface
- **Component coordination**: SelectionSummary and ExecutiveSuitePage now use consistent data structures
- **Props documentation**: Clear interface defines expected data flow
- **MonthPlanner updated**: Aligned with new typing standards
- **Error handling**: Added toast notifications for consistency

---

### ~~Comment 22: EmailCategory lacks forward compatibility~~ ✅
**Status**: ✅ **COMPLETED** (October 18, 2025)

EmailCategory limited to ['chart','financial','artist','ar']; server may send new categories.

**Resolution**: Extended type for forward compatibility:
- **Added 'other' category**: `EmailCategory` now includes `| 'other'`
- **Shared type update**: Updated `shared/types/emailTypes.ts` for both client and server
- **Normalization support**: `useEmails` hook handles unknown categories gracefully
- **UI compatibility**: InboxModal supports filtering and displaying 'other' emails
- **Future-proof**: Server can add new categories without breaking client

---

### ~~Comment 23: Week date calculation inconsistency~~ ✅
**Status**: ✅ **COMPLETED** (October 18, 2025)

Week end date calculation in GameSidebar assumes Sunday-week; ensure alignment with backend calendar logic.

**Resolution**: Created shared week date utility with comprehensive coverage:
- **`shared/utils/seasonalCalculations.ts`**: New functions at lines 155-214
- **`getWeekDateRange(year, week, options)`**: Calculate week start/end dates with configurable week start day
- **`formatWeekEndDate(year, week, options)`**: Format week end date as MM/DD/YY
- **`getWeekDates(year, week, options)`**: Get all 7 dates for a week
- **ISO week algorithm**: Proper week numbering aligned with calendar standards
- **Configurable**: Supports different week start days (0-6, default Sunday)
- **Test coverage**: `tests/unit/week-date-range.test.ts` with 3 test cases
- **Adoption**: Used consistently across GameSidebar, MusicCalendar, WeekPicker
- **Single source of truth**: Eliminates date calculation inconsistencies

---

## 🔴 **Critical Priority Items**

**All critical priority items have been completed! 🎉**

---

### ~~Comment 12: Missing ARIA labels and focus management~~ ✅
**Status**: ✅ **COMPLETED** (October 18, 2025)

Some interactive elements lack clear focus management and aria attributes (InboxWidget card clickable, complex modals).

**Resolution**: Comprehensive accessibility improvements across inbox and modal components:

**InboxWidget enhancements** ([client/src/components/InboxWidget.tsx](client/src/components/InboxWidget.tsx)):
- **Dialog semantics**: Added `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls="inbox-modal"`
- **Live region**: Polite announcement for unread count changes (`aria-live="polite" aria-atomic="true"`)
- **Keyboard support**: Enter and Space key handlers for card activation
- **Visual badge**: Hidden from screen readers (`aria-hidden="true"`) while sr-only live region provides accessible count
- **Stable contentId**: Passes `contentId="inbox-modal"` for proper modal association

**InboxModal enhancements** ([client/src/components/InboxModal.tsx](client/src/components/InboxModal.tsx)):
- **Description wiring**: Added `aria-describedby` linking to description element
- **Live status region**: Polite announcements for email state changes
- **Keyboard navigation**: Arrow keys (Up/Down), Home, End for message list traversal
- **ARIA listbox**: Email list uses `role="listbox"` with `aria-label="Inbox messages"`
- **ARIA options**: Each email has `role="option"` with `aria-selected` state
- **Active descendant**: `aria-activedescendant` tracks focused email for screen readers
- **Refresh button**: Clear `aria-label="Refresh inbox"` for assistive tech

**SaveGameModal ASCII improvements** ([client/src/components/SaveGameModal.tsx](client/src/components/SaveGameModal.tsx)):
- **ASCII replacements**: Changed Unicode bullet/ellipsis to `|` / `--` for clean screen reader output
- **Status rows**: Money and reputation display as "Week X | $X,XXX | Rep X" with ASCII separators

**withAdmin ASCII fix** ([client/src/admin/withAdmin.tsx](client/src/admin/withAdmin.tsx)):
- **Loading text**: Changed Unicode ellipsis to ASCII "..." to prevent "unknown glyph" announcements

**Impact**: Full keyboard navigation, proper screen reader announcements, clean ASCII rendering in assistive tech

---

## 🟡 **High Priority Items**

### ~~Comment 27: Components bypass apiRequest~~ 🟠.
**Status**: 🟠. **COMPLETED** (October 19, 2025)

Audited remaining direct API fetches and migrated the developer markets editor onto the shared `apiRequest` helper for consistent headers, logging, and retry behaviour.

**Resolution**:
- Swapped the `/api/dev/markets-config` GET/POST calls to `apiRequest`, applying Clerk auth tokens and request timeouts automatically.
- Centralised the fallback JSON payload as `DEFAULT_MARKET_CONFIG` so the editor still works offline.
- Verified other `/api` consumers already rely on `apiRequest`, leaving only static `/data` fetches in the client.

**Relevant Files**:
- [client/src/pages/MarketsEditor.tsx](client/src/pages/MarketsEditor.tsx)


---

### ~~Comment 5: getQueryFn URL building risky~~ (Completed)
**Status**: Completed (October 19, 2025)

Standardised the shared query helper so the first element of every query key is the fully qualified request URL, eliminating brittle join('/') behaviour.

**Resolution**:
- Updated getQueryFn to require a [string, ...unknown[]] key and feed the leading URL directly into apiRequest.
- Documented the contract and added runtime validation so misconfigured keys fail fast.
- Audited analytics hooks to adopt the new pattern, ensuring cache keys stay stable and URLs are serialized by apiPaths.

**Relevant Files**:
- [client/src/lib/queryClient.ts](client/src/lib/queryClient.ts)
- [client/src/hooks/useAnalytics.ts](client/src/hooks/useAnalytics.ts)

---

### ~~Comment 13: SaveGameModal uses window.alert~~ (Completed)
**Status**: Completed (October 19, 2025)

Replaced native browser alerts with in-app confirmation flows so save management matches the rest of the UI system.

**Resolution**:
- Introduced shadcn AlertDialog confirmations for delete and import decisions, eliminating window.confirm.
- Wired success and failure paths through useToast() to deliver consistent feedback.
- Added import preview state to let players choose between copy or overwrite without leaving the modal.

**Relevant Files**:
- [client/src/components/SaveGameModal.tsx](client/src/components/SaveGameModal.tsx)

---

### ~~Comment 16: useAnalytics has empty API_BASE placeholder~~ (Completed)
**Status**: Completed (October 19, 2025)

Analytics hooks now derive their URLs from the shared apiPaths helper, so they automatically honour VITE_API_BASE_URL overrides and fall back to the active origin during development.

**Resolution**:
- Reworked every analytics hook to build query keys whose first element is the fully qualified API URL, allowing the shared getQueryFn to drive requests through apiRequest.
- Removed the bespoke fetch helper and rely on the common client for consistent headers, retries, and logging.

**Relevant Files**:
- [client/src/hooks/useAnalytics.ts](client/src/hooks/useAnalytics.ts)

---

### ~~Comment 24: Analytics hooks embed query params inline~~ (Completed)
**Status**: Completed (October 19, 2025)

All analytics requests now use apiPaths.analytics.*, which encapsulates URL/URLSearchParams handling for gameId and other parameters.

**Resolution**:
- Centralised URL construction for the analytics hooks through apiPaths to eliminate ad-hoc string concatenation.
- Ensured cache keys include the final request URL plus contextual metadata for precise invalidation.

**Relevant Files**:
- [client/src/hooks/useAnalytics.ts](client/src/hooks/useAnalytics.ts)

---

### ~~Comment 28: withAdmin returns null for unauthorized~~ (Completed)
**Status**: Completed (October 19, 2025)

Unauthorized visitors now see a friendly explanation with a live countdown before being redirected back home.

**Resolution**:
- Added a three-second countdown banner that updates every second before triggering the redirect.
- Reset countdown state when admin status changes so authorized users never see the warning.

**Relevant Files**:
- [client/src/admin/withAdmin.tsx](client/src/admin/withAdmin.tsx)

---
## 🟢 **Medium Priority Items**

### [ ] Comment 25: ClerkProvider appearance cast to any
**Priority**: 🟢 Medium
**Impact**: Type safety
**Effort**: Low

ClerkProvider appearance is cast to any; tighten typing to avoid runtime mismatches.

**Action**: Import `type { Appearance } from '@clerk/types'` and remove `as any`.

**Relevant Files**:
- [client/src/main.tsx](client/src/main.tsx)

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
- 🟡 High: 0 items (down from 3)
- 🟢 Medium: 1 item (down from 17)
- ?? Low: 1 item (down from 1)

### By Status
- ✅ Completed: 26 items (92.9%)
- 🚧 In Progress: 0 items (0%)
- 📋 Pending: 2 items (7.1%)

---

## 🎯 **Suggested Implementation Approach**

### ~~Phase 1: Security & Critical Issues~~ ✅ **COMPLETED** (October 16, 2025)
~~Focus on Comments 1, 6, and 21 for production stability and security.~~
- ✅ Comment 1: Standardized auth with Clerk bearer tokens
- ✅ Comment 6: Added timeout/retry/backoff to apiRequest
- ✅ Comment 21: Verified server-side admin protection + improved client UX

### ~~Phase 2: High Priority Code Quality~~ ✅ **COMPLETED** (October 18, 2025)
~~Address Comments 2, 7, 8, 9, 10, 11, 27 to improve maintainability.~~
- ✅ Comment 2: Production-safe logging infrastructure
- ✅ Comment 7: User-facing error toasts
- ✅ Comment 8: DEV-gated debug logging
- ✅ Comment 9: React Query sensible defaults
- ✅ Comment 10: Centralized API path builders
- ✅ Comment 11: Unified auto-select service

### ~~Phase 3: Medium Priority UX & Refinements~~ ✅ **MOSTLY COMPLETED** (October 18, 2025)
~~Tackle medium-priority items.~~
- ✅ Comment 4: GamePage explicit label confirmation
- ✅ Comment 12: ARIA labels and keyboard navigation
- ✅ Comment 14: Email category defaults to 'other'
- ✅ Comment 15: useEmails primitive dependencies
- ✅ Comment 17: ExecutiveSuitePage proper typing
- ✅ Comment 18: AROffice retry with jitter
- ✅ Comment 19: InboxModal sticky filters
- ✅ Comment 20: ExecutiveSuitePage component alignment
- ✅ Comment 22: EmailCategory forward compatibility
- ✅ Comment 23: Shared week date utility
- 📋 Remaining: Comments 25, 26 (2 items)

### Phase 4: Final Polish & API Consistency (Current Sprint Priority)
- 🟢 Comments 25 & 26: Final polish and refactor follow-ups

---

*This document is maintained as part of the project's technical debt tracking. Update status checkboxes and completion dates as items are addressed.*









