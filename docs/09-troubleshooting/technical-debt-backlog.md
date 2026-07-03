# Technical Debt Backlog

**Music Label Manager - Code Quality Improvements**
*Document Purpose: Track technical debt and quality improvements identified during codebase reviews*

---

## 📋 **Document Information**

- **Created**: September 2025 (Artist Mood System Implementation - commit `4991ab3`)
- **Last Updated**: July 3, 2026
- **Total Items**: 50
- **Completed**: 46
- **Deferred by decision**: 3 (C32, C42, C43)
- **In Progress**: 0
- **Pending**: 1 (C50)

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

### ~~Comment 29: ActionSelectionPool hardcodes 3-slot selection cap~~ ✅
**Status**: ✅ **COMPLETED** (July 1, 2026)

`ActionSelectionPool.tsx` computed `isDisabled = !isSelected && selectedActions.length >= 3` (and the same literal in the Auto-Recommend disable check) with a `// TODO: Use gameState.focusSlots from props`. The literal `3` meant that even after a player unlocked the 4th focus slot (reputation ≥ 50), this selection UI would cap them at 3 actions per week.

**Resolution**: Added an optional `focusSlots?: number` prop and derived `const maxFocusSlots = focusSlots && focusSlots > 0 ? focusSlots : 3;` (fallback to the base slot count so selection is never fully disabled by an undefined/0 value). Both the per-card `isDisabled` and the Auto-Recommend `disabled` checks now compare against `maxFocusSlots`. Stale TODO removed; `npm run check` passes.

**Follow-up investigation (July 1, 2026)**: `ActionSelectionPool` had **no render call site** anywhere in the app (dead code), so the fix above had no runtime effect. A read-only trace of the live path confirmed the real focus-slot UI — `ExecutiveSuitePage` → `ExecutiveMeetings` / `SelectionSummary`, gated by `gameStore.selectAction()` — **already computes the cap dynamically from `gameState.focusSlots`** (the `|| 3` occurrences are just fallback defaults), as do all live server routes (`/api/advance-week`, A&R/meeting slot routes) and the engine unlock logic. **The 4th slot is usable end-to-end today; there was no live bug.** As cleanup: deleted the dead `ActionSelectionPool.tsx` and `MonthPlanner.tsx`, and removed a latent `.max(3)` cap on `SelectActionsRequest` (`shared/api/contracts.ts`) that gated the **orphaned** `/api/select-actions` route (no live caller) — now uncapped to match `AdvanceWeekRequest`.

**Relevant Files**:
- [client/src/components/ActionSelectionPool.tsx](client/src/components/ActionSelectionPool.tsx)

*Identified June 30, 2026 during the focus-slot unlock reconciliation; resolved July 1, 2026.*

---

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

### ~~Comment 25: ClerkProvider appearance cast to any~~ ✅
**Status**: ✅ **COMPLETED** (verified July 1, 2026 — already resolved in a prior change)

ClerkProvider appearance was cast to `any`; tighten typing to avoid runtime mismatches.

**Resolution**: `client/src/main.tsx` already imports `type { Appearance } from '@clerk/types'` and types the appearance object via `} satisfies Appearance;` — no `as any` cast remains. Verified against `@clerk/types` v4.86.0; `npm run check` passes.

**Relevant Files**:
- [client/src/main.tsx](client/src/main.tsx)

---

### ~~Comment 30: Email notification reference documents 7 legacy categories; system uses 5~~ ✅
**Status**: ✅ **COMPLETED** (July 1, 2026)

`docs/01-planning/implementation-specs/COMPLETED/email-notification-system-complete-reference.md` (around line 356 / 799-809) documented 7 event-type email categories (tour_completion, top_10_debut, release, number_one_debut, tier_unlock, artist_discovery, financial_report). The actual system uses 5 generic categories (chart, financial, artist, ar, other), with the legacy 7 mapped into them via `LEGACY_CATEGORY_MAP`.

**Resolution**: Rewrote both category sections of the reference doc: added a "Current Categories (5 Generic)" table, a "Legacy Event Type → Current Category Mapping" table transcribed verbatim from `LEGACY_CATEGORY_MAP` in `server/storage.ts`, relabeled the 7 event-type subsections as legacy sender/content specs, and corrected the `EmailCategory` enum block (~line 826) to the 5 shipped values. Other doc sections left untouched.

**Relevant Files**:
- [docs/01-planning/implementation-specs/COMPLETED/email-notification-system-complete-reference.md](docs/01-planning/implementation-specs/COMPLETED/email-notification-system-complete-reference.md)
- [shared/types/emailTypes.ts](shared/types/emailTypes.ts)
- [server/storage.ts](server/storage.ts) (normalizeEmailCategory)

*Identified June 30, 2026 during the email-snapshot/save-load documentation audit.*

---

### ~~Comment 31: Save snapshot v2 format and email-truncation system undocumented~~ ✅
**Status**: ✅ **COMPLETED** (July 1, 2026)

**Resolution**: Added "Snapshot v2 Format" and "Email Snapshot & Truncation" sections to `docs/03-workflows/save-load-system-workflow.md` — enumerates all captured collections (with `musicLabel`/collections as siblings of `gameState`), `SNAPSHOT_VERSION = 2` restore gating, the ~10k email cap + `truncated`-flag semantics (only the `MAX_PAGES` path flags truncation; complete snapshots are never falsely flagged), server-side category normalization + deterministic ordering, and the `useEmails` 0 → 30s staleTime, plus the benign "Autosave"-rename caveat.

The save/load snapshot was upgraded (`SNAPSHOT_VERSION = 2`) and now captures additional collections (emails + `emailMetadata.truncated`, releaseSongs, executives, moodEvents, musicLabel) and the email snapshot has a truncation/safety system (~10k cap, `truncated` flag, 5 pagination guardrails) — none of which is documented beyond the workflow doc's basic example. Also document the server-side email category normalization, deterministic email ordering (week, createdAt, id), and the useEmails staleTime change (0 → 30s). Minor footnote: the autosave-name migration will also rename a save a user manually named exactly "Autosave" (benign edge case) — worth a one-line caveat in whatever doc covers autosave naming.

**Action**: Add a "Snapshot v2 format" section to the save/load docs (or a new doc) enumerating all captured collections + the email truncation behavior and `truncated` flag.

**Relevant Files**:
- [shared/schema.ts](shared/schema.ts) (gameSaveSnapshotSchema, SNAPSHOT_VERSION)
- [client/src/utils/emailSnapshot.ts](client/src/utils/emailSnapshot.ts)
- [server/storage.ts](server/storage.ts)
- [docs/03-workflows/save-load-system-workflow.md](docs/03-workflows/save-load-system-workflow.md)

*Identified June 30, 2026 during the email-snapshot/save-load documentation audit.*

---

### ~~Comment 33: Test DB provisioned via `drizzle-kit push` is missing SQL-migration CHECK constraints~~ ✅
**Status**: ✅ **COMPLETED** (July 1, 2026)

**Resolution**: `tests/helpers/test-db.ts` `setupDatabase()` now applies the real `migrations/0009_add_mood_constraints.sql` + `migrations/0020_add_artist_attribute_constraints.sql` after `drizzle-kit push`, executed statement-by-statement and made idempotent (duplicate-object errors `42710`/`42P07` are swallowed; `0020` also uses `DROP CONSTRAINT IF EXISTS`). Chose applying the actual migration SQL over re-hardcoding constraints in the helper (avoids re-creating the drift class) and over `drizzle-kit migrate` (the journal doesn't list `0009`/`0020`). Verified on a freshly-provisioned DB: `artist-mood-constraints.test.ts` 4/4 pass, and the full suite (532 tests) is green with `[Test DB] CHECK constraints applied`.

The test DB helper provisions tables with `drizzle-kit push` (see note in [tests/helpers/test-db.ts](tests/helpers/test-db.ts)), but `push` does not materialize the raw-SQL `CHECK` constraints that are defined both inline in `shared/schema.ts` (e.g. `artists_mood_check`, line ~59) and in the SQL migration files (`migrations/0009_add_mood_constraints.sql`, `migrations/0020_add_artist_attribute_constraints.sql`). As a result, a cleanly push-provisioned test DB has **no** check constraints on `artists`, and `tests/features/artist-mood-constraints.test.ts` fails (2 cases) because out-of-range mood inserts are accepted instead of rejected. Manually applying the constraint (`ALTER TABLE artists ADD CONSTRAINT artists_mood_check ...`) makes all 4 tests pass, confirming the gap is provisioning-only, not a code defect.

**Action**: Provision the test DB via migrations (`drizzle-kit migrate` / apply `migrations/*.sql`) instead of, or in addition to, `drizzle-kit push` — or add a constraint-application step to the test-db setup helper. Document the chosen approach in `tests/helpers/test-db.ts`.

**Relevant Files**:
- [tests/helpers/test-db.ts](tests/helpers/test-db.ts)
- [tests/start-test-db.js](tests/start-test-db.js)
- [migrations/0020_add_artist_attribute_constraints.sql](migrations/0020_add_artist_attribute_constraints.sql)
- [tests/features/artist-mood-constraints.test.ts](tests/features/artist-mood-constraints.test.ts)

*Identified June 30, 2026 during the email-snapshot/save-load full test-suite validation.*

---

### ~~Comment 34: WeekSummary shows reputation gains only from press coverage, not role-meeting effects~~ ✅
**Status**: ✅ **COMPLETED** (July 1, 2026)

**Resolution**: Product decision was **option (b): a single aggregated ⭐ line** (reputation is label-wide; avoids noise from many small ±1 effects). Implemented in `shared/engine/game-engine.ts`: `summary.reputationChanges` is already accumulated by *every* source (role-meeting `applyEffect` + press coverage), so removed the press-coverage-only `type: 'reputation'` push and now emit ONE aggregated Achievement line from the net weekly total at the end of `advanceWeek()` (same reduce used for `weeklyStats.reputationChange`). Single source of truth → no double-counting; net of 0 emits nothing; negatives render correctly. `WeekSummary.tsx` needed no change (already renders `type: 'reputation'`). Worked example: +2 press & +1 role-meeting → one "+3 reputation points" line.

The reputation-visibility work surfaces a ⭐ "+N reputation points" line in WeekSummary only for **press-coverage** reputation, which pushes a `type: 'reputation'` change in [shared/engine/game-engine.ts](shared/engine/game-engine.ts) (~line 2119-2120). Reputation gained through **role-meeting effects** goes through `applyEffect` (~line 1166-1170), which only updates the aggregate `summary.reputationChanges` total and does **not** push a `type: 'reputation'` change — so it produces no ⭐ Achievement line. Reproduced in manual smoke testing: a role-meeting choice granting +1 reputation updated the total (reputation → 22) but showed nothing in the Week Summary's Achievements section.

**Action**: Decide the intended UX, then implement. Options: (a) have `applyEffect` also push a `type: 'reputation'` change so all reputation sources surface; (b) aggregate per-week reputation into a single ⭐ summary line to avoid noise from many small ±1 effects. Needs a product decision on per-artist vs global and description text before coding.

**Relevant Files**:
- [shared/engine/game-engine.ts](shared/engine/game-engine.ts) (applyEffect ~1166-1170; press-coverage change ~2119-2126)
- [client/src/components/WeekSummary.tsx](client/src/components/WeekSummary.tsx) (achievements grouping ~line 132; ⭐ icon ~line 45)

*Identified June 30, 2026 during the email-snapshot/save-load manual smoke test (PR #29).*

---

### ~~Comment 35: Game snapshot object is built field-by-field in two places (export vs saveGame)~~ ✅
**Status**: ✅ **COMPLETED** (July 1, 2026)

**Resolution**: Extracted `client/src/utils/buildGameSnapshot.ts` as the single snapshot assembler and call it from both `gameStore.saveGame` (manual/autosave) and `SaveGameModal.handleExport` (export). This resolves the `emailMetadata.truncated` drift — `saveGame` previously omitted the flag, so autosaves/manual saves never persisted it while exports did; now both go through the helper, which always sets `{ total, unreadCount, truncated }`. Snapshot shape preserved (`musicLabel` stripped to a sibling of `gameState`); `SNAPSHOT_VERSION` unchanged. Verified: `save-load-snapshot-integrity.test.ts` passes.

The save snapshot (`{snapshotVersion, gameState, musicLabel, artists, projects, roles, songs, releases, emails, emailMetadata, releaseSongs, executives, moodEvents, weeklyActions, weeklyOutcome}`) is assembled independently in `client/src/components/SaveGameModal.tsx` `handleExport` (~line 227) and `client/src/store/gameStore.ts` `saveGame` (~line 1208). They have ALREADY diverged: `handleExport` sets `emailMetadata.truncated` but `saveGame`'s `emailMetadata` omits it, so manual saves and autosaves never persist the `truncated` flag while exports do.

**Action**: Extract a single `buildGameSnapshot(state, collections)` helper (e.g. under `client/src/utils/` next to `emailSnapshot.ts`) and call it from both `handleExport` and `saveGame` so the field list lives in one place.

**Relevant Files**:
- [client/src/components/SaveGameModal.tsx](client/src/components/SaveGameModal.tsx)
- [client/src/store/gameStore.ts](client/src/store/gameStore.ts)
- [client/src/utils/emailSnapshot.ts](client/src/utils/emailSnapshot.ts)

*Identified June 30, 2026 during the PR #29 code review.*

---

## 🔵 **Low Priority Items**

### ~~Comment 26: ArtistPage is monolithic~~ ✅
**Status**: ✅ **COMPLETED** (July 3, 2026, PR #89)

**Resolution**: `ArtistPage.tsx` went **1,180 → 361 lines**. The five tabs (Overview, Discography, Releases, Analytics, Management) plus `PerformanceMetrics` are now `React.memo`-wrapped components under `client/src/components/artist/`, with shared pure helpers in `artistPageUtils.tsx` and deduplicated local types in `types.ts`. The page shell keeps the data-loading effects, `useMemo`d derived values, `useCallback`d child callbacks, and — untouched verbatim — the coupled avatar-crop block (`-top-40`/`h-56` math). Dead code deleted along the way: `analytics`/`qualityFilter`/`sortBy` state, `getTotalMarketingCost`, and the never-read `totalStreams`/`totalRevenue`/`releasedSongs` locals (all verified dead against pre-refactor `main` by an independent review pass, which also confirmed the extracted JSX byte-identical). First-ever test coverage added: 12 render smoke tests across the five tabs (`client/src/components/artist/__tests__/`). Follow-ups noted in the PR: swap the local types for `shared/schema.ts` types; remove pre-existing dead `songFilter` state.

**Relevant Files**:
- [client/src/pages/ArtistPage.tsx](client/src/pages/ArtistPage.tsx)
- [client/src/components/artist/](client/src/components/artist/)

---

### [ ] Comment 32: Email snapshot silently truncates for very long games (~10k email cap)
**Priority**: 🔵 Low
**Impact**: Save completeness for long-running games (edge case)
**Effort**: Medium
**Status**: ⏸️ **DEFERRED — cap unreachable in practice; "silently" part FIXED** (July 3, 2026)

**Disposition (July 3, 2026)**: The cap itself is formally deferred with quantified justification: `EmailGenerator.generateEmails` runs once per week and produces exactly 1 guaranteed email (financial summary) plus small bounded conditionals (releases dropping *that week*, top-10 chart *debuts*, tour completions, rare tier unlocks, 0–1 A&R discovery) — no per-artist or per-song weekly loops exist. A full 52-week campaign lands at ~100–500 emails, roughly 20–100× below the 10,000-email cap; hitting it would take 1,000+ weeks of a single save's history. The truncation is also read-side only (drops *oldest* emails, per the `desc(week)` ordering in `server/storage.ts:937`) — no data is lost at insert time. What DID land (commit `8669235`): the export flow in `SaveGameModal.tsx` now shows an explicit toast when `emailMetadata.truncated` is set (previously a confirmed dead write — nothing read the flag anywhere). A saves-*list* warning would additionally require exposing `emailMetadata` in `storage.getGameSaves`' JSON-path SELECT (server change, out of scope for the client-only fix).

`client/src/utils/emailSnapshot.ts` caps email capture at ~10,000 emails (100 pages) and sets a `truncated` flag when the cap is hit. For very long-running games this means saved snapshots omit older emails. This is intentional safety behavior (prevents pagination hangs) and is flagged via `truncated`, but the cap itself is a long-term limitation.

**Action**: Future — consider chunked/paged email storage or a higher/configurable cap, and surface the `truncated` state to players in the save/restore UI.

**Relevant Files**:
- [client/src/utils/emailSnapshot.ts](client/src/utils/emailSnapshot.ts)
- [shared/schema.ts](shared/schema.ts) (emailMetadata.truncated)

*Identified June 30, 2026 during the email-snapshot/save-load documentation audit.*

---

### ~~Comment 39: CLAUDE.md references npm scripts that don't exist in package.json~~ ✅
**Status**: ✅ **COMPLETED** (July 1, 2026)

**Resolution**: Added the missing scripts to `package.json` rather than deleting the documented workflow — `db:generate` (`drizzle-kit generate`), `db:studio` (`drizzle-kit studio`), `db:introspect` (`drizzle-kit introspect`); all three commands are supported by the installed drizzle-kit 0.30.4 and `docs/06-development/database-practices.md` documents them extensively as the intended workflow. Fixed CLAUDE.md: `npm test` now correctly described as a single run (`vitest run`) with `npx vitest` for watch mode; replaced the POSIX-only `pkill` cleanup line with `npx kill-port 5000`; corrected the dev-server description (single Express process with Vite middleware, not two servers); fixed the emergency-recovery migration path (`migrations/`, not `drizzle/migrations/`).

Root `CLAUDE.md` had drifted from `package.json`: the "Database & Migrations" and "Validation Commands" sections referenced `npm run db:generate`, `npm run db:studio`, and `npm run db:introspect`, none of which existed as scripts. `npm test` was described as "watch mode" but was defined as `vitest run`. `pkill -f "tsx server"` was a Linux command documented for a Windows dev environment.

**Relevant Files**:
- [CLAUDE.md](CLAUDE.md)
- [package.json](package.json)

*Identified July 1, 2026 during the architecture-docs cleanup session; resolved same day.*

---

### ~~Comment 36: Autosave display-name format hardcoded in three places~~ ✅
**Status**: ✅ **COMPLETED** (July 1, 2026)

**Resolution**: Extracted `formatAutosaveName(labelName, week)` into `shared/utils/saveName.ts` and use it from all three sites: `gameStore.ts` (autosave write), `server/storage.ts` `getGameSaves` (legacy-name migration), and `tests/features/save-load-snapshot-integrity.test.ts` (local `getAutosaveName` helper deleted). All three already agreed on `"{label} - Week {n}"`; standardized on that. The no-label `"Autosave - Week {n}"` fallback is intentionally left as-is.

The `"{label} - Week {n}"` format is constructed independently in `client/src/store/gameStore.ts` (autosave write), `server/storage.ts` `getGameSaves` (legacy-name migration), and `tests/features/save-load-snapshot-integrity.test.ts` (local `getAutosaveName` helper). A format change in one place silently breaks the others (migration would rewrite to a name that no longer matches fresh autosaves).

**Action**: Extract a single `formatAutosaveName(labelName, week)` helper into `shared/` and use it from all three.

**Relevant Files**:
- [client/src/store/gameStore.ts](client/src/store/gameStore.ts)
- [server/storage.ts](server/storage.ts)
- [tests/features/save-load-snapshot-integrity.test.ts](tests/features/save-load-snapshot-integrity.test.ts)

*Identified June 30, 2026 during the PR #29 code review.*

---

### ~~Comment 37: emailSnapshot pagination has 5 overlapping safety checks (one is dead code)~~ ✅
**Status**: ✅ **COMPLETED** (June 30, 2026)

`client/src/utils/emailSnapshot.ts` accreted five separate safety checks. Check 5 (`collected.length > total + PAGE_SIZE`) was unreachable because check 4 (`collected.length >= total`) exited the loop one threshold earlier in the same iteration; the post-loop "adjust total" block was similarly redundant, and the over-collection check set a false `truncated = true`.

**Resolution**: Collapsed the loop to a single principled termination bound while fixing review finding #6 — paginate until a short page (`pageEmails.length < EMAIL_PAGE_SIZE`, which also covers a fully empty page so no redundant fetches), with the `MAX_PAGES` cap as the only path that sets `truncated`. The server `total` is used only as a sanity-check `console.warn`, never for loop termination, and the returned `total` is the true collected count. Complete snapshots are no longer falsely flagged truncated.

**Relevant Files**:
- [client/src/utils/emailSnapshot.ts](client/src/utils/emailSnapshot.ts)

*Identified June 30, 2026 during the PR #29 code review; resolved same day alongside finding #6.*

---

### ~~Comment 38: SaveGameModal import duplicates schema validation with a manual missingKeys block~~ ✅
**Status**: ✅ **COMPLETED** (July 1, 2026)

**Resolution**: `SaveGameModal.handleImport` now relies solely on `gameSaveSnapshotSchema.parse` — removed the manual `missingKeys` block that hand-checked `gameState`/`gameState.id`/`gameState.currentWeek`. On failure it catches `ZodError` and surfaces `error.issues` as a readable field-level toast (`path: message`), falling back to `error.message` for non-Zod errors. A malformed import now yields a precise per-field message instead of a lumped string.

`client/src/components/SaveGameModal.tsx` `handleImport` hand-checks `gameState` existence, `gameState.id` (non-empty string), and `gameState.currentWeek` (number) immediately before calling `gameSaveSnapshotSchema.parse(candidateSnapshot)`, which already validates those fields. When the schema's required fields change, the manual block goes stale.

**Action**: Drop the manual `missingKeys` block and rely on `gameSaveSnapshotSchema.parse`, catching `ZodError` and surfacing `error.issues` for a field-level message.

**Relevant Files**:
- [client/src/components/SaveGameModal.tsx](client/src/components/SaveGameModal.tsx)

*Identified June 30, 2026 during the PR #29 code review.*

---

### Comment 40: Tour cancellation trusts client-supplied refundAmount 🟡
**Status**: ✅ **FIXED** — merged in PR #66 (2026-07-02); create-side costs additionally hardened in PR #68.

The 60% tour-cancellation refund is computed entirely client-side (`client/src/components/ActiveTours.tsx`, `refundPercentage = 0.6`) and sent in the request body of `DELETE /api/projects/:id/cancel`. The server (`server/routes/projects.ts:205` since the Phase 1 route moves) applies the client's `refundAmount` to the player's money without recomputing or capping it — any refund amount can be submitted.

**Action**: Recompute the refund server-side (`(totalCost / plannedCities) * remainingCities * 0.6`) and ignore or validate the client value; move the 60% constant to balance config while at it. **Unblocked as of July 2, 2026** — the Phase 1 route moves are done; do as a standalone PR.

**Relevant Files**:
- [client/src/components/ActiveTours.tsx](client/src/components/ActiveTours.tsx)
- [server/routes/projects.ts](server/routes/projects.ts)

*Identified July 2, 2026 during the tour-experience code trace (see `docs/01-planning/implementation-specs/[FUTURE] tour-experience-improvement-plan.md`).*

---

### ~~Comment 41: Missing venueCapacity metadata hard-crashes tour week processing~~ ✅
**Status**: ✅ **COMPLETED** (July 3, 2026)

**Resolution**: `TourProcessor.processUnifiedTourRevenue` (the code moved there in Phase 2 PR-7) no longer throws on a missing `metadata.venueCapacity` — it falls back to the **deterministic midpoint** of the stored `venueAccess` tier's capacity range (e.g. clubs [50,500] → 275) with a logged warning. Midpoint rather than an RNG draw so the seeded stream is untouched for other systems. Pinned by a new golden-master scenario (`legacy-tour-week`) that seeds a Mini-Tour without stored capacity and asserts the week completes with capacity 275.

`processUnifiedTourRevenue` throws if `project.metadata.venueCapacity` is absent, with no fallback to tier-based capacity generation. Capacity has been stored at creation since the Phase 3 venue-capacity feature, so this only bites legacy/imported tours — but a single bad project bricks week advancement for that save.

**Relevant Files**:
- [shared/engine/processors/TourProcessor.ts](shared/engine/processors/TourProcessor.ts)

*Identified July 2, 2026 during the tour-experience code trace.*

---

### Comment 42: Awareness system is fully implemented dead bookkeeping 🟢
**Status**: ⏸️ **DEFERRED** (product decision, July 3, 2026 — explicitly deferred by Nes during the Phase 3 session; neither wiring awareness into the streaming multiplier nor removing the bookkeeping was chosen yet. Revisit alongside the release-experience plan Tier 2.)

The song awareness system (`shared/engine/game-engine.ts:1617-1750`) runs every week: awareness gain from marketing channels (weeks 1–4), breakthrough checks with 2.5× awareness explosions (weeks 3–6), and decay (weeks 5+). Values are persisted per song and announced in WeekSummary ("🔥 BREAKTHROUGH ACHIEVED!") — but awareness feeds into **nothing**: not streaming revenue, not charts, not any financial metric. The game celebrates a stat with zero mechanical existence. Config lives in `data/balance/markets.json` (awareness_system); the integration design exists in `docs/01-planning/implementation-specs/[FUTURE] awareness-system-design.md` but the "Awareness System Backend Integration" work was never finished.

**Action**: Product decision — either wire awareness into the ongoing streaming multiplier (preferred; see the release-experience plan Tier 2) or stop surfacing it in WeekSummary until it does something.

**Relevant Files**:
- [shared/engine/game-engine.ts](shared/engine/game-engine.ts)
- [data/balance/markets.json](data/balance/markets.json)

*Identified July 2, 2026 during the release-experience code trace (see `docs/01-planning/implementation-specs/[FUTURE] release-experience-improvement-plan.md`).*

---

### Comment 43: Planned releases cannot be cancelled, edited, or rescheduled 🟢
**Status**: ⏸️ **DEFERRED** (product decision, July 3, 2026 — explicitly deferred by Nes during the Phase 3 session; refund rule design still open. When picked up: server-side recompute from day one, per the Action note below.)

`POST /api/game/:gameId/releases/plan` (`server/routes/releases.ts:435`) deducts the full marketing budget plus 1 creative capital at plan time and locks songs to the release — and there is no endpoint (or UI) to cancel, edit, or reschedule a planned release afterward. Money committed to a distant release week is unrecoverable regardless of changed circumstances. Tours, by contrast, support cancellation with a 60% refund.

**Action**: Add a cancel (and optionally reschedule) endpoint with a partial refund, computed server-side from day one (don't repeat C40's client-trust mistake). Land after PR-17 (releasePlanningService) settles this domain.

**Relevant Files**:
- [server/routes/releases.ts](server/routes/releases.ts)
- [client/src/components/ReleaseWorkflowCard.tsx](client/src/components/ReleaseWorkflowCard.tsx)

*Identified July 2, 2026 during the release-experience code trace.*

---

### ~~Comment 44: Release preview and execution are separate calculation code paths~~ ✅
**Status**: ✅ **COMPLETED** (July 3, 2026)

**Resolution**: The "two independent implementations" claim was **already stale** — since the Phase 2 `ReleaseProcessor` extraction, `calculateSophisticatedReleaseOutcome` is a thin adapter that reconstructs a release config from stored metadata and **delegates to `calculateReleasePreview`**; the multiplier chain (release type, seasonal, marketing synergy/diversity, lead-single boost) exists in exactly one place, and the preview endpoint (`POST /releases/preview`) calls the same method. The stored-metadata field names (`marketingBudgetBreakdown`, `leadSingleBudgetBreakdown`) were verified to line up between `releasePlanningService` (write) and the adapter (read).

**One real residual divergence was found and fixed**: `processPlannedReleases` fetched `getArtistsByGame(...)[0]` — the **first artist in the game** — and only fell back to `getArtist(release.artistId)` on an empty roster. On any multi-artist roster, execution computed the outcome with the wrong artist's popularity while the preview used the correct one. Now fetches the release's artist directly. Pinned by a new golden-master scenario (`multi-artist-release-week`: low-popularity bystander seeded first, release owned by a popularity-90 artist → 232,553 streams, vs 156,368 for the popularity-50 single-artist fixture with identical quality/marketing). The single-artist `release-week` snapshot stayed byte-identical, confirming no behavior change for single-artist games.

**Accepted (inherent) preview/execution differences, documented here deliberately**: (1) RNG variance — the preview endpoint draws from a fresh engine seeded at the planning week; execution draws mid-stream during the release week's `advanceWeek`, so exact numbers differ (the preview is an estimate, not a quote); (2) game state evolves between plan time and release week (reputation, playlist access, artist popularity all legitimately move); (3) for EPs with a lead single, the preview estimates the whole campaign while execution splits it into the lead-single week and the main-release week (already-released songs are excluded from the main drop).

**Relevant Files**:
- [shared/engine/processors/ReleaseProcessor.ts](shared/engine/processors/ReleaseProcessor.ts)
- [server/routes/releases.ts](server/routes/releases.ts)

*Identified July 2, 2026 during the release-experience code trace.*

---

### ~~Comment 45: Dead release config and unsurfaced press data~~ ✅
**Status**: ✅ **COMPLETED** (July 3, 2026)

**Resolution**: (1) The `star_power_amplification` claim was **incorrect** — the config IS live: `FinancialSystem.calculateStreamingOutcome` (called by `ReleaseProcessor` for every release's initial streams) applies the `1 + (popularity/100) × max_multiplier` amplification when `enabled`, and `tests/unit/financial-system-streaming.test.ts` covers the toggle. No change made; do NOT delete this config. (2) Press mentions are now surfaced: `WeekSummary.pressMentions` accumulates pickups from release press coverage (`ReleaseProcessor.calculatePressOutcome`) and PR campaigns (`ActionProcessor`), and `weeklyStats.pressMentions` reads it instead of the hardcoded `0` — MetricsDashboard's three press-mention displays now show real values. Golden-master release-week snapshot updated (only the new `pressMentions: 8` field appeared; no other numbers moved).

Two small leftovers from the release trace: (1) `data/balance/markets.json` `streaming_calculation.star_power_amplification` is `enabled: true` but was believed unconsumed; (2) `calculatePressOutcome()` computes a detailed result (pickups count, structure) but only `reputationGain` was used, and `summary.pressMentions` was a standing `TODO`.

**Relevant Files**:
- [data/balance/markets.json](data/balance/markets.json)
- [shared/engine/game-engine.ts](shared/engine/game-engine.ts)

*Identified July 2, 2026 during the release-experience code trace.*

---

### ~~Comment 46: Tour estimate's totalBudget draws tier-RNG capacity even when explicit capacity is supplied~~ ✅
**Status**: ✅ **COMPLETED** (July 3, 2026)

**Resolution**: The estimate now honors an explicit `venueCapacity` for `totalBudget` — `server/routes/tour.ts` costs it via `calculateTourCostsWithCapacity(venueCapacity, cities, 0)` and only falls back to the tier-RNG `calculateTourCosts` when no capacity was supplied. With an explicit capacity, `totalBudget` is deterministic and equals `breakdown.totalCosts` (fixed venue/production fees for the chosen capacity + marketing budget), so `canAfford` is stable and matches what the tour actually charges. The characterization test now pins `totalBudget`/`canAfford` exactly (the old `<rng-derived>` normalization is gone). Note the issue was **not** display-only as originally written: `LivePerformancePage` passes the estimate's `totalBudget` back as the tour's `totalCost` at creation, which the server charges verbatim — so the RNG draw was leaking into the player's actual charge.

`POST /api/tour/estimate` (`server/routes/tour.ts`) computes `totalBudget` by drawing venue capacity from the tier-based RNG helper even when the caller already supplied an explicit `venueCapacity`, so the displayed estimate total can vary run-to-run for what should be a deterministic preview of the same inputs. It makes `canAfford` checks against the estimate flaky relative to what the actual tour (via `TourProcessor`) will do with the same explicit capacity.

**Action**: Product/behavior decision needed — either have the estimate always honor an explicit `venueCapacity` when provided (matching `TourProcessor`'s actual behavior) or document that the estimate is intentionally a range and stop treating `totalBudget` as a single comparable number for `canAfford`.

**Relevant Files**:
- [server/routes/tour.ts](server/routes/tour.ts)
- [shared/engine/processors/TourProcessor.ts](shared/engine/processors/TourProcessor.ts)

*Identified 2026-07-02 during Phase 2 PR-7 (TourProcessor extraction + tour-estimate unification).*

---

### ~~Comment 47: artistPopularity defaults differ between tour estimate route and engine (0 vs 50)~~ ✅
**Status**: ✅ **COMPLETED** (July 3, 2026)

**Resolution** (two steps, same day): First aligned the estimate route to the engine's `|| 50`. Then, per product decision, changed **both** sides to floor zero/unset popularity to **1** instead of 50 — `server/routes/tour.ts` and `TourProcessor.processUnifiedTourRevenue` both use `artist.popularity || 1`, so a true unknown tours (and previews) as a nobody rather than a mid-tier act. This is a sanctioned engine behavior change for zero/unset-popularity artists only; no RNG-stream impact (popularity affects magnitudes, not draw count), and the golden-master tour fixture (popularity 60) is unaffected. Pinned by a characterization test asserting popularity-0 ≡ popularity-1 estimates and popularity-0 < popularity-50 revenue (guards against the old default regressing).

`POST /api/tour/estimate` defaults `artistPopularity` to `0` when the field is absent from the request, while `TourProcessor`'s actual week-advance tour processing (`shared/engine/processors/TourProcessor.ts`) defaults the same field to `50`. For any caller that omits `artistPopularity`, the estimate and the real tour outcome are computed against different assumed popularity — a behavioral inconsistency between the preview and the executed tour, in the same family as C44 (release preview vs. execution divergence).

**Action**: Product/behavior decision needed — pick one canonical default (50 matches the engine's general "unknown artist" convention used elsewhere) and align the route to it.

**Relevant Files**:
- [server/routes/tour.ts](server/routes/tour.ts)
- [shared/engine/processors/TourProcessor.ts](shared/engine/processors/TourProcessor.ts)

*Identified 2026-07-02 during Phase 2 PR-7 (TourProcessor extraction + tour-estimate unification).*

---

### ~~Comment 48: Tour marketing-budget extraction drew tier-RNG capacity, drifting executed spend from the player's choice~~ ✅
**Status**: ✅ **COMPLETED** (July 3, 2026 — fixed same session it was identified)

**Resolution**: `TourProcessor.processUnifiedTourRevenue` extracted the marketing budget as `totalCost − calculateTourCosts(tier)`, where `calculateTourCosts` draws a **random** capacity from the tier range — so the executed tour's marketing spend differed from the `budgetPerCity × cities` the player chose and paid at creation by the delta between two capacity draws. Now extracts against the tour's actual capacity via `calculateTourCostsWithCapacity`, making executed marketing spend exactly the player's chosen amount. Sanctioned behavior change: removes one RNG draw per tour pre-calculation (shifts subsequent variance draws), so the golden-master `tour-week` snapshot was regenerated — the fixture now shows exactly $6,650/city marketing (was $8,619.80 inflated by a random ~206 capacity draw).

**Relevant Files**:
- [shared/engine/processors/TourProcessor.ts](shared/engine/processors/TourProcessor.ts)

*Identified July 3, 2026 during the C46/C47 tour-estimate fixes; resolved same day.*

---

### ~~Comment 49: Inbox shows stale (pre-restore) emails until a full page reload after save/load restore~~ ✅
**Status**: ✅ **COMPLETED** (July 3, 2026, commit `2b57880` on `main`)

**Resolution**: `loadGameFromSave` now invalidates the email query cache immediately after the restore completes — a `queryClient.invalidateQueries` predicate matching `EMAIL_LIST_SCOPE`/`EMAIL_UNREAD_SCOPE` keyed on `restoredGameId` (the server-confirmed post-restore id, so overwrite-restores flush the stale cache under the same id and fork-restores start clean under the new id). Mirrors the week-advance invalidation pattern in the same file exactly, per the Action note below. Both SaveGameModal call sites (restore and JSON import) funnel through `loadGameFromSave`, so one fix covers both. No test added: no harness exists for the real Zustand store + TanStack Query wiring (the only gameStore test mocks predicates inline), and building one for an 8-line predicate was judged disproportionate — noted here rather than skipped silently.

`loadGameFromSave` (`client/src/store/gameStore.ts:200`) restores a save by writing the snapshot's `emails` array directly into the Zustand store (`set({ emails: snapshot.emails || [], ... })`) and re-fetching related collections via direct `apiRequest` calls into local state — but it never invalidates the TanStack Query cache. `InboxWidget.tsx` and `InboxModal.tsx` read emails through `useEmails` (`client/src/hooks/useEmails.ts`), which is keyed on the scoped `EMAIL_LIST_SCOPE`/`EMAIL_UNREAD_SCOPE` query keys. After a restore, the dashboard inbox panel keeps rendering whatever was cached from before the restore (verified during the 2026-07-03 manual smoke test: restoring a Week 4 save while sitting on Week 6 briefly showed the Week 6 inbox entries) until a full page reload forces a refetch. The underlying game/email data in the store and database is correct immediately — this is purely a stale read from the query cache, same family as the week-advance email-invalidation gap fixed during the PR #29 review (`['emails']` not matching the scoped `emails:list`/`emails:unread-count` keys — see the Cache Management note in `client/CLAUDE.md`).

**Action**: After `loadGameFromSave` (and any other place that writes `emails` into the Zustand store directly) completes, invalidate the email queries the same way `client/CLAUDE.md`'s Cache Management section prescribes — a predicate matching `EMAIL_LIST_SCOPE`/`EMAIL_UNREAD_SCOPE` for the restored `gameId`, not a raw `['emails']` key.

**Relevant Files**:
- [client/src/store/gameStore.ts](client/src/store/gameStore.ts) (`loadGameFromSave`, ~line 200)
- [client/src/hooks/useEmails.ts](client/src/hooks/useEmails.ts) (`EMAIL_LIST_SCOPE`/`EMAIL_UNREAD_SCOPE`, ~lines 16-17)
- [client/src/components/InboxWidget.tsx](client/src/components/InboxWidget.tsx)

*Identified July 3, 2026 during the post-PR #86 manual smoke test (save/restore round-trip).*

---

### [ ] Comment 50: DB-free client tests still require the Docker test database via shared tests/setup.ts 🔵
**Priority**: 🔵 Low
**Impact**: Test ergonomics (client tests can't run without Docker Postgres)
**Effort**: Low-Medium

The Phase 3 client characterization tests (`tests/client/` — gameStore actions, query-key contracts, snapshot shape, hook tests) are pure jsdom/mock tests with zero database usage, but the global `tests/setup.ts` `beforeAll` connects to the Docker Postgres on `localhost:5433` unconditionally, so they fail on a machine without the container running. CI is unaffected (the postgres service is always provisioned).

**Action**: Split vitest setup by project/environment (e.g. a vitest `projects`/workspace config where `tests/client/**` uses a DB-free setup file) or make the DB connection in `tests/setup.ts` lazy/conditional on the test file needing it.

**Relevant Files**:
- [tests/setup.ts](tests/setup.ts)
- [tests/client/](tests/client/)

*Identified July 3, 2026 during Phase 3 PR-1 (client characterization net).*

---

## 📊 **Summary Statistics**

### By Priority
- 🔴 Critical: 0 items (all completed! 🎉)
- 🟡 High: 0 items (all completed! 🎉) — note: C40's header lacks the `~~strikethrough~~` convention despite being fixed (PR #66/#68); cosmetic only
- 🟢 Medium: 2 deferred (C42, C43 — product decisions, July 3, 2026)
- 🔵 Low: 1 deferred (C32 — cap unreachable; surfacing fixed), 1 pending (C50 — client tests' incidental DB dependency)

### By Status
- ✅ Completed: 46 items (92.0%)
- 🚧 In Progress: 0 items
- ⏸️ Deferred by decision: 3 items (C32, C42, C43)
- 📋 Pending: 1 item (C50 — logged July 3, 2026; low, not scheduled)

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
- 🟢 Comments 30, 31, 32: Save-snapshot v2 / email-system documentation debt (identified June 30, 2026)

---

*This document is maintained as part of the project's technical debt tracking. Update status checkboxes and completion dates as items are addressed.*









