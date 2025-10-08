I have the following comments after thorough review of file. Implement the comments by following the instructions verbatim.

---
## Comment 1: Inconsistent auth: useCurrentUser fetches /api/me with credentials: 'include' while other API calls rely on Clerk bearer token.

Standardize auth in `client/src/auth/useCurrentUser.ts` to use `apiRequest` with Clerk bearer token and remove `{ credentials: 'include' }`. Ensure all client calls go through `apiRequest`. Confirm server endpoints accept and validate the JWT. Update `/api/me` client to handle 401 via `getQueryFn({ on401: 'returnNull' })` if appropriate.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\auth\useCurrentUser.ts
- c:\Users\ulyan\music-label-manager\client\src\lib\queryClient.ts
---
## Comment 2: apiRequest and throwIfResNotOk log verbose request/response details including headers; avoid leaking Authorization or PII in prod.

Add a logging utility in `client/src/lib/queryClient.ts` that redacts Authorization header and is gated by `import.meta.env.DEV` or a DEBUG flag. Wrap all console.* calls with a check and avoid printing bodies/headers except whitelisted fields. Remove unnecessary console.groupEnd calls when suppressed.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\lib\queryClient.ts
---
## Comment 3: Two corrupted files named 'components/ux-prototypes…' look like accidental shell commands committed, likely exposing paths.

Delete or rename the malformed files under `client/src/components` containing `ux-prototypes` and accidental shell text. Create a proper folder `client/src/components/ux-prototypes/` and move valid prototypes there. Verify imports and ensure Vite build passes.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\components\ux-prototypes && cp cUsersulyanmusic-label-managerux-improvementsmobile-optimized-layout.tsx cUsersulyanmusic-label-managerclientsrccomponentsux-prototypes
- c:\Users\ulyan\music-label-manager\client\src\components\ux-prototypes && cp cUsersulyanmusic-label-managerux-improvementsguided-workflow.tsx cUsersulyanmusic-label-managerclientsrccomponentsux-prototypes
---
## Comment 4: GamePage creates default label on closing modal if week===1; can surprise users and mask errors.

In `pages/GamePage.tsx`, modify `handleLabelModalOpenChange` to not auto-create a default label when closing. Instead, prompt user to confirm creating a default label, or keep the modal open with an error message. Only call `createDefaultLabelForGame` when user confirms.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\pages\GamePage.tsx
---
## Comment 5: getQueryFn builds URL via queryKey.join('/'); risky if keys contain leading slashes or absolute URLs.

Refactor `getQueryFn` in `lib/queryClient.ts` to accept a `queryKey: [string, ...unknown[]]` where the first element is the full request URL. Use it directly instead of `join('/')`. Update call sites to pass full URLs (e.g., `/api/resource?x=y`).

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\lib\queryClient.ts
---
## Comment 6: apiRequest has no timeouts/retry/backoff; critical flows can hang or fail transiently.

Enhance `apiRequest` to support an optional timeout (e.g., 10s default) via AbortController and configurable retries for GET with exponential backoff. Thread options through hooks like `useEmails`, analytics hooks, and high-frequency calls.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\lib\queryClient.ts
- c:\Users\ulyan\music-label-manager\client\src\hooks\useEmails.ts
- c:\Users\ulyan\music-label-manager\client\src\hooks\useAnalytics.ts
---
## Comment 7: Many components log errors but continue silently; add user feedback and consistent error boundaries.

Sweep components to replace bare console.error with user-facing toasts using `useToast` for key actions: week advance, sign artist, auto-select, load data. Standardize error messages and add actionable suggestions.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\components\GameSidebar.tsx
- c:\Users\ulyan\music-label-manager\client\src\components\ArtistRoster.tsx
- c:\Users\ulyan\music-label-manager\client\src\pages\ExecutiveSuitePage.tsx
- c:\Users\ulyan\music-label-manager\client\src\components\ar-office\AROffice.tsx
---
## Comment 8: Excessive console logs across components create noise; add debug flag gating and structured logging.

Create `client/src/lib/logger.ts` with leveled logging gated by `import.meta.env.DEV || import.meta.env.VITE_DEBUG`. Replace console.log/info in components like `Top10ChartDisplay`, `Top100ChartDisplay`, `SelectionSummary`, `ActiveReleases` with logger.debug, and disable in prod.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\components\Top10ChartDisplay.tsx
- c:\Users\ulyan\music-label-manager\client\src\components\Top100ChartDisplay.tsx
- c:\Users\ulyan\music-label-manager\client\src\components\SelectionSummary.tsx
- c:\Users\ulyan\music-label-manager\client\src\components\ActiveReleases.tsx
---
## Comment 9: React Query defaults are global staleTime=Infinity and retry=false; may stale critical data or overfetch elsewhere.

Review `lib/queryClient.ts` defaultOptions: set a more reasonable default staleTime (e.g., 60s) and retry for GETs. Explicitly configure hooks (emails, analytics) with per-use staleness and retry settings. Document conventions in a README comment within `queryClient.ts`.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\lib\queryClient.ts
- c:\Users\ulyan\music-label-manager\client\src\hooks\useEmails.ts
- c:\Users\ulyan\music-label-manager\client\src\hooks\useAnalytics.ts
---
## Comment 10: useAnalytics builds URLs by string interpolation scattered across hooks; centralize API path builders.

Create `client/src/lib/apiPaths.ts` exporting helpers: `me()`, `emails(gameId,q)`, `artistROI(gameId, artistId)`, etc. Refactor hooks/services to use these helpers and pass to `apiRequest`.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\hooks\useAnalytics.ts
- c:\Users\ulyan\music-label-manager\client\src\hooks\useEmails.ts
- c:\Users\ulyan\music-label-manager\client\src\services\*.ts
---
## Comment 11: Auto-select logic duplicated in GameSidebar and executiveMeetingMachine; consolidate into shared helper.

Extract the auto-selection scoring algorithm to `client/src/services/executiveAutoSelect.ts` used by both `executiveMeetingMachine` and `GameSidebar`. Ensure types align and write a simple unit test if test harness exists.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\components\GameSidebar.tsx
- c:\Users\ulyan\music-label-manager\client\src\machines\executiveMeetingMachine.ts
---
## Comment 12: Some interactive elements lack clear focus management and aria attributes (InboxWidget card clickable, complex modals).

Audit `components/InboxWidget.tsx` and `components/InboxModal.tsx` and other icon-only buttons for `aria-label`s and visible focus styles. Use shadcn/ui accessible primitives. Add tests in Storybook if available.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\components\InboxWidget.tsx
- c:\Users\ulyan\music-label-manager\client\src\components\InboxModal.tsx
- c:\Users\ulyan\music-label-manager\client\src\components\ExecutiveMeetings.tsx
---
## Comment 13: SaveGameModal uses window.alert for UX; replace with in-app toasts/modals for consistency.

Update `components/SaveGameModal.tsx` to replace `alert()` with `useToast()` notifications and modal close actions. Ensure error messages are surfaced via toast.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\components\SaveGameModal.tsx
- c:\Users\ulyan\music-label-manager\client\src\hooks\use-toast.ts
---
## Comment 14: Email normalization defaults unknown categories to 'financial'; could misclassify and mislead UI.

In `hooks/useEmails.ts`, change default category mapping to 'artist' or introduce a new 'other' category supported by UI. Update CATEGORY_OPTIONS/LABELS in `InboxModal.tsx` accordingly.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\hooks\useEmails.ts
- c:\Users\ulyan\music-label-manager\client\src\components\InboxModal.tsx
---
## Comment 15: useEmails memoizes params via JSON.stringify in dependency; could thrash when order changes; use stable object/serializer.

Refactor `useEmails` to build the queryKey as `['emails', gameId, params.isRead ?? null, params.category ?? null, params.week ?? null, params.limit ?? null, params.offset ?? null]` and avoid extra memoization object.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\hooks\useEmails.ts
---
## Comment 16: useAnalytics has API_BASE = '' placeholder; if base URL differs in prod, hooks may break.

Introduce `VITE_API_BASE_URL` and set `API_BASE = import.meta.env.VITE_API_BASE_URL || ''` in `hooks/useAnalytics.ts`, or centralize in `lib/apiPaths.ts` to avoid duplication.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\hooks\useAnalytics.ts
---
## Comment 17: ExecutiveSuitePage uses props: any = {}; weak typing; remove and rely on store or typed props.

In `pages/ExecutiveSuitePage.tsx`, remove `props: any = {}` and directly consume store values; or define `ExecutiveSuitePageProps` and export a typed component without default `any`.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\pages\ExecutiveSuitePage.tsx
---
## Comment 18: AROffice retries discoveredArtists 3 times with fixed backoff; make backoff jittered and cancellable.

Refactor the retry logic in `components/ar-office/AROffice.tsx` to use a reusable `retry` helper with exponential backoff and jitter, and cancel retries on unmount or when operation restarts.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\components\ar-office\AROffice.tsx
---
## Comment 19: InboxModal refetch button triggers network even when isFetching; also resets filters on open/close.

In `components/InboxModal.tsx`, persist `category` and `showUnreadOnly` in localStorage or keep them in parent state. Disable the Refresh button when `isFetching` and `isLoading` are both true. Consider a small staleTime to avoid refetch loops.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\components\InboxModal.tsx
---
## Comment 20: ExecutiveSuitePage maintains weeklyActions as empty list; SelectionSummary expects actions; ensure clarity or remove prop.

Review `components/SelectionSummary.tsx` expectations. If it needs action metadata, supply it from backend or render placeholders. Alternatively, update SelectionSummary to extract labels from `selectedActions` JSON when metadata missing.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\pages\ExecutiveSuitePage.tsx
- c:\Users\ulyan\music-label-manager\client\src\components\SelectionSummary.tsx
---
## Comment 21: withAdmin redirects non-admins client-side only; sensitive admin routes should be server-protected too.

Verify that backend routes used by admin pages perform authorization checks. In the client, keep `withAdmin` but add a user-friendly message on unauthorized rather than silent null.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\admin\withAdmin.tsx
- c:\Users\ulyan\music-label-manager\server\auth.ts
---
## Comment 22: EmailCategory limited to ['chart','financial','artist','ar']; server may send new categories; add forward compatibility.

Extend `EmailCategory` union on the shared types to include 'other'. Update normalization to default to 'other', and UI label map in `InboxModal.tsx` to handle 'other'.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\hooks\useEmails.ts
- c:\Users\ulyan\music-label-manager\client\src\components\InboxModal.tsx
- c:\Users\ulyan\music-label-manager\shared\types\emailTypes.ts
---
## Comment 23: Week end date calculation in GameSidebar assumes Sunday-week; ensure alignment with backend calendar logic.

Move week date calculation in `components/GameSidebar.tsx` into `@shared/utils/seasonalCalculations.ts` or a new `client/src/lib/dateUtils.ts` and align with backend logic. Add tests to assert week mapping.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\components\GameSidebar.tsx
- c:\Users\ulyan\music-label-manager\shared\utils\seasonalCalculations.ts
---
## Comment 24: Analytics hooks embed query params inline; consider using URLSearchParams for safety.

Refactor `hooks/useAnalytics.ts` to build URLs with `new URL('/api/analytics/...', API_BASE)` and URLSearchParams for gameId and other params.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\hooks\useAnalytics.ts
---
## Comment 25: ClerkProvider appearance is cast to any; tighten typing to avoid runtime mismatches.

Update `client/src/main.tsx` to type `clerkAppearance` using Clerk's Appearance interface: import type { Appearance } from '@clerk/types' (or appropriate package) and remove `as any`.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\main.tsx
---
## Comment 26: ArtistPage is very large and monolithic; split into subcomponents and memoize heavy sections.

Refactor `pages/ArtistPage.tsx` by extracting tabs (Overview, Discography, Releases, Analytics, Management) into separate memoized components. Use `useMemo`/`useCallback` for derived data and handlers.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\pages\ArtistPage.tsx
---
## Comment 27: Some hooks/components bypass apiRequest and use fetch directly; use unified client for headers, errors.

Replace direct fetch calls in `client/src/auth/useCurrentUser.ts` (and any others) with `apiRequest`. Audit components for fetch usage and migrate to the shared client.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\auth\useCurrentUser.ts
- c:\Users\ulyan\music-label-manager\client\src\components\ArtistDiscoveryModal.tsx
- c:\Users\ulyan\music-label-manager\client\src\components\ProjectCreationModal.tsx
- c:\Users\ulyan\music-label-manager\client\src\pages\RecordingSessionPage.tsx
---
## Comment 28: withAdmin returns null for unauthorized users; consider rendering a friendly unauthorized message.

Update `admin/withAdmin.tsx` to render a simple unauthorized message and navigate home after a short delay, or immediate redirect is fine but avoid null state. Provide a visible hint if stayed.

### Relevant Files
- c:\Users\ulyan\music-label-manager\client\src\admin\withAdmin.tsx
---