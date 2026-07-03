# [READY] Phase 3.5: gameState Spine → TanStack Query Ownership

*Created: July 3, 2026 — planned by a code-reading architect pass against the live tree (no code modified).*
*Status: COMPLETE — all 7 PRs landed 2026-07-03.*
*Completes the Phase 3 client-state-ownership arc (Phase 3 PRs 1–10 ✅ landed). This phase migrates the last Zustand-owned server-truth domain — the `gameState` spine (week, money, reputation, creativeCapital, focusSlots, access tiers, flags, A&R fields, `musicLabel`) — onto the TanStack Query cache, and retires the `updateGameState` dead path deferred by the Phase 3 plan §3 footnote.*

## Execution status

| # | PR | Merged as |
|---|---|---|
| 1 | test: spine characterization net | #98 |
| 2 | chore: delete the dead `updateGameState` three-way fallback | #99 |
| 3 | refactor: `useGameState` façade; migrate all spine readers (split 3a/3b) | #103 (3a), #104 (3b) |
| 4 | feat: gameState query key + dual-write commit funnel | #106 |
| 5 | feat: flip `useGameState()` to read the query cache | #108 |
| 6 | refactor: retire the Zustand `gameState` copy | #110 |
| 7 | docs + cleanup | this PR |

## 0. Ground truth (verified against the working tree, 2026-07-03)

Line numbers are from the tree at planning time (`gameStore.ts` is 1,373 lines post-Phase-3).

### 0.1 Consumer inventory of the spine

`useGameStore` appears in **35 files**. Categorized by what they do with `gameState`:

**A. Pure spine readers via the store (25 files — the migration surface):**

- **Components (14):** `GameHeader.tsx:25` (money/week/advance-disabled), `MetricsDashboard.tsx:23` (20 field reads — heaviest single consumer), `Dashboard.tsx:26`, `CommandDock.tsx:113`, `MusicCalendar.tsx:48`, `SongCatalog.tsx:56` (`currentWeek` via selector), `ToastNotification.tsx:9`, `SelectionSummary.tsx:89`, `ActiveReleases.tsx:19`, `ActiveTours.tsx:265`, `Top10ChartDisplay.tsx:18`, `Top100ChartDisplay.tsx:17`, `TourVarianceTester.tsx:47`, `ar-office/AROffice.tsx:118` (actions only; gameState fields arrive via props).
- **Pages (11):** `AROffice.tsx:11`, `ArtistPage.tsx:43`, `ArtistsLandingPage.tsx:54`, `ExecutiveSuitePage.tsx:39` (feeds `SYNC_SLOTS`/`SYNC_WEEK` into the XState machines from `gameState.focusSlots`/`currentWeek`), `GamePage.tsx:25`, `LivePerformancePage.tsx:115`, `MainMenuPage.tsx:119`, `PlanReleasePage.tsx:124`, `RecordingSessionPage.tsx:140`, `StreamingDecayTester.tsx:68`, `Top100ChartPage.tsx:8`.
- **Domain hooks (9):** every Phase 3 hook derives `gameId` from `useGameStore((s) => s.gameState?.id)` — `useAnalytics.ts:16,37,58,79`, `useArtists.ts:37`, `useEmails.ts:62,128,153,187`, `useSongs.ts:25`, `useCharts.ts:30,48`, `useReleases.ts:32,50`, `useExecutives.ts:52`, `useProjects.ts:34`, and `useDiscoveredArtists.ts:77-79` (also reads `flags` + `arOfficeSlotUsed`).

**B. Prop-drilled readers (no store import — unaffected except at the parent):** `AccessTierBadges.tsx:10`, `ArtistDiscoveryModal.tsx`, `ar-office/ArtistDiscoveryTable.tsx` all take `gameState` as a prop.

**C. Writers — ALL inside `gameStore.ts` (one file):** 13 `set(...)`/`setState` sites that write `gameState`: `loadGame` (:352), `loadGameFromSave` (:425, :464), `createNewGame` (:619), `updateGameState` (:662, :687, :696 — dead, see 0.3), `selectAction` (:724), `removeAction` (:745), `clearActions` (:770), `advanceWeek` (:885), `cancelProject` (:1157), `consumeAROfficeSlot` (:1220), `releaseAROfficeSlot` (:1240), plus `adoptServerBalances` (:202 via `useGameStore.setState`).

**D. Imperative `getState()` reads (2 sites, both `SaveGameModal.tsx`):** `:141` (post-restore gameId), `:228` (export snapshot assembly).

**E. Persistence:** `partialize` (`gameStore.ts:1365-1369`) persists `gameState: { id }`, `selectedActions`, `isAdvancingWeek` to localStorage key `music-label-manager-game`. Nothing else of the spine is client-persisted.

### 0.2 Canonical server sources of the spine

- **`GET /api/game/:id`** (`server/routes/games.ts:30-47`) — returns `{ gameState, musicLabel, artists, projects, roles, weeklyActions, ... }`. This is what `fetchGameBundle` (`gameStore.ts:39-86`) fetches; every caller then assembles `{ ...data.gameState, musicLabel: data.musicLabel || null, ...arSync }` and `set`s it into Zustand. **The store's `gameState` embeds `musicLabel`; the server row does not.** This embedding is load-bearing for save snapshots (`buildGameSnapshot` strips it back out to a sibling).
- **`POST /api/advance-week`** — response carries `result.gameState`; `advanceWeek` merges `{ ...resultGameState, ...serverGameState }` (refetch wins, `gameStore.ts:872-879`) and resets `usedFocusSlots` to `arOfficeSlotUsed ? 1 : 0`.
- **`PATCH /api/game/:id`** — used by `syncSlotsPatch` (:215-228) for focus-slot/A&R sync (fire-and-forget with local state already updated) — the app's only live optimistic-write path on the spine besides `cancelProject`'s `result.newBalance` adoption and `adoptServerBalances`.
- **`GET /api/game-state`** (`games.ts:276`) — used ONCE, by `GamePage.tsx:42` as a bootstrap fallback ("find my latest game"), then immediately calls `loadGame(id)`. Not a spine read path per se.

### 0.3 The `updateGameState` three-way fallback — what it actually is

`gameStore.ts:640-701`. It PATCHes `/api/game/:id` with partial updates, then:
1. **Parseable JSON response** → replaces the ENTIRE store `gameState` with the PATCH response (:682). Latent bug: the PATCH handler returns the bare row (`games.ts:88`) with **no `musicLabel`**, so a successful call would clobber the embedded label out of the store (and out of the next save snapshot).
2. **Empty response body** → merges `updates` locally, then schedules a 1-second-delayed background `GET /api/game/:id` re-sync (:665-674) that ALSO sets the raw server state without `musicLabel`.
3. **PATCH throws 404** → merges `updates` locally and swallows the error (:692-696).

**Verified: it has ZERO call sites.** `grep updateGameState client/src` matches only the interface declaration (:260) and the implementation (:640). No component, page, hook, machine, or test calls it. (The `updateGameState` hits elsewhere in the repo are the unrelated `server/storage.ts` method.) The correct migration is **deletion**, proven by `tsc`.

### 0.4 The orphan-cleanup path

`createNewGame` (`gameStore.ts:498-557`, PRD-0006 FR-2): before creating a game it reads `get().gameState` for `id`/`currentWeek`, fetches `GET /api/saves`, filters client-side by `gameId`, and `DELETE /api/game/:id`s the current game if it has no saves. All failures are non-fatal. Its only spine dependency is **reading `id` + `currentWeek` of the current game** — it survives the migration by reading from the cache instead of the store. Behavior is preserved verbatim (Phase 3 non-goal carried forward: do not redesign it).

### 0.5 What Phase 3 already built (the pattern to extend)

- `fetchGameBundle` seeds `songs`/`releases`/`releaseSongs` (dedicated GETs) and `projects`/`artists` (selected off the game payload) into the cache via `setQueryData` — zero extra requests (`gameStore.ts:66-83`).
- Every hook exports `SCOPE` + `xQueryKey(gameId)`; `tests/client/query-key-contract.test.ts` asserts every store invalidation matches a real hook key.
- `saveGame` (:1321-1326) and `SaveGameModal.handleExport` (:234-238) already source the five migrated collections from the cache via `getQueryData`, feeding the shared `buildGameSnapshot` (shape frozen, pinned by `tests/client/buildGameSnapshot.shape.test.ts`; `SNAPSHOT_VERSION = 2` at `shared/schema.ts:514` — **no bump in this phase**).
- Characterization net: `tests/client/gameStore-actions.characterization.test.ts` + `gameStore-harness.ts` (mocked `apiRequest`/`queryClient`, `baseGameState` fixture).

### 0.6 The timing constraint that shapes the design

`selectAction`/`removeAction`/`clearActions`/`consumeAROfficeSlot`/`releaseAROfficeSlot` do **synchronous local math** on `usedFocusSlots` and then fire `syncSlotsPatch` in the background. `SelectionSummary`, `ExecutiveSuitePage` (which pipes slots into the XState machines via `SYNC_SLOTS`), and the CommandDock AUTO-filler all assume the update is visible on the next render. A query-owned `gameState` must therefore behave as a **client-committed record**: `staleTime: Infinity`, no `refetchOnWindowFocus`, never updated by background refetch — only by explicit `setQueryData` commits (fan-out seed, advance-week commit, slot math, `adoptServerBalances`). The app-default query options (`queryClient.ts:335-354`: `staleTime: 60_000`, `refetchOnWindowFocus: true`) are **wrong for this key** and must be overridden per-hook, or a focus-refetch could race the optimistic slot math.

## 1. Target ownership model

| State domain | Owner after Phase 3.5 | Today |
|---|---|---|
| `gameState` spine (incl. embedded `musicLabel`) | **TanStack Query cache** at `['gameState:record', gameId]` — client-committed record; store actions write via `setQueryData`, readers via `useGameState()` | Zustand `gameState` |
| `gameId` handle | GameContext + `currentGameId` localStorage + minimal persisted store id (unchanged shape) | Same |
| Session/UI: `selectedActions`, `isAdvancingWeek`, `weeklyOutcome`, `campaignResults` | **Zustand** (unchanged) | Zustand |
| Mutation actions (`advanceWeek`, `signArtist`, …) | **Zustand store actions** (unchanged API; internals read/write the cache) | Same |
| Flows | **XState** (unchanged — machines keep receiving `SYNC_SLOTS`/`SYNC_WEEK` events) | Same |
| `roles`, `weeklyActions`, `emails`, `executives`, `moodEvents` store arrays | **Unchanged this phase** (snapshot inputs; see Discovered debt #5) | Zustand |

**Strategy decision — synchronized copy first, wholesale flip second.** Readers (25 files) migrate behind a `useGameState()` façade *while it still reads Zustand* (zero behavior change), then the store dual-writes Zustand + cache, then the façade flips to the cache, then the Zustand copy is retired. Rationale: all 13 writers live in ONE file while readers span 25; the façade makes the risky ownership flip a **one-file diff** (PR-5) with a one-file rollback, instead of a 25-file big-bang. This is the executives "sanctioned snapshot input" pattern from Phase 3 PR-8, inverted at the end. A wholesale reader move directly onto `useQuery` was rejected: it couples the wide mechanical churn to the subtle subscription-timing change, making bisection and rollback impossible.

## 2. Guiding constraints

- **Client-only.** No `server/` diffs. `GET /api/game/:id` + the advance-week response are sufficient canonical sources. (Optional future nicety, NOT this phase: a lightweight `GET /api/game/:id/state` so the `useGameState` queryFn fallback doesn't pull the full bundle.)
- **Characterization-first**, matching Phases 1–3: every behavior-touching PR lands tests green against the OLD code first (extend `tests/client/`).
- **Snapshot shape frozen.** `buildGameSnapshot` and `SNAPSHOT_VERSION = 2` untouched; `buildGameSnapshot.shape.test.ts` must stay green after every PR. The cached record keeps embedding `musicLabel` exactly as the store copy does today, so the strip-to-sibling logic is unchanged.
- **Persisted localStorage shape frozen.** `partialize` keeps emitting `{ gameState: { id } | null, selectedActions, isAdvancingWeek }` so existing browsers rehydrate without a persist-version migration.
- **One concern per PR; each leaves `main` green** (`npm run check` + `npm run test:run` with the Docker test DB on 5433; CI vitest job). Explicit user go-ahead before each merge (per-session grant).

## 3. PR sequence (7 PRs)

PR-1 is the net. PR-2 is independent. PRs 3→4→5→6 are strictly ordered. PR-7 closes out.

| # | PR | Scope & files | Risk | Verification / "green" |
|---|---|---|---|---|
| 1 | **test: spine characterization net** | No behavior change. Extend `tests/client/` (reusing `gameStore-harness.ts`): (a) pin the synchronous slot math + `syncSlotsPatch` payloads of `selectAction`/`removeAction`/`clearActions`/`consumeAROfficeSlot`/`releaseAROfficeSlot`, including same-tick visibility of `usedFocusSlots` after the action call; (b) pin `advanceWeek`'s gameState assembly — `{...resultGameState, ...serverGameState}` precedence, `usedFocusSlots: arUsed ? 1 : 0` reset, `musicLabel` sourcing; (c) pin `adoptServerBalances` as a two-field merge (`money`, `creativeCapital` only — A&R fields/`musicLabel` preserved); (d) pin `cancelProject`'s `result.newBalance` adoption; (e) pin `loadGame`'s `gameStateWithLabel` assembly (musicLabel embedded, `usedFocusSlots` from `arOfficeSlotUsed`); (f) pin orphan-cleanup: `createNewGame` with an unsaved current game issues `GET /api/saves` then `DELETE /api/game/:id`, and skips DELETE when saves exist; (g) extend the snapshot pin: `saveGame` passes the store `gameState` (with embedded `musicLabel`) into `buildGameSnapshot` verbatim. Files: `tests/client/*` only. | Low | Suite green against current `main`. This is the net for PRs 4–6. |
| 2 | **chore: delete the dead `updateGameState` three-way fallback** | Remove `GameStore.updateGameState` (interface `:260` + implementation `:640-701`). Zero call sites verified (§0.3); the three-way fallback (replace-with-PATCH-response / local-merge-plus-delayed-resync / swallow-404) is unreachable code hiding a musicLabel-clobber bug — deletion IS the fix. Files: `gameStore.ts`. | Low | `npm run check` proves no callers; full suite green. Rollback: revert one commit. |
| 3 | **refactor: `useGameState` façade; migrate all spine readers** | New `client/src/hooks/useGameState.ts` exporting `useGameState()` — initially literally `useGameStore((s) => s.gameState)` — plus `useGameId()` (`s.gameState?.id ?? null`). Mechanically migrate: the 9 domain hooks' `gameId` derivations → `useGameId()` (and `useDiscoveredArtists`' `flags`/`arOfficeSlotUsed` reads → `useGameState` selectors); the 14 components + 11 pages in §0.1-A → `useGameState()` (keeping their action destructures on `useGameStore`). Prop-drilled components (§0.1-B) untouched. `SaveGameModal`'s two `getState()` sites untouched (PR-6). **Split into 3a (hooks + components) and 3b (pages) if the diff exceeds ~15 files.** Files: new hook + ~25 read sites. | Low-Med (wide but mechanical; zero runtime change — same Zustand subscription underneath) | `npm run check`; existing component tests (`ArtistRoster.test.tssx`, hook tests) green; grep gate: no `useGameStore((state) => state.gameState` outside `useGameState.ts`/`gameStore.ts`. Rollback: revert (pure refactor). |
| 4 | **feat: gameState query key + dual-write commit funnel** | Add to `useGameState.ts`: `GAME_STATE_SCOPE = 'gameState:record'`, `gameStateQueryKey(gameId)`. In `gameStore.ts`, funnel all 12 remaining `gameState` writes through one internal `commitGameState(set, next)` that (a) `set({ gameState: next })` and (b) `queryClient.setQueryData(gameStateQueryKey(next.id), next)` synchronously. Partial-field writers (`selectAction` etc.) build `next` from `get().gameState` exactly as today. `createNewGame` seeds the new game's key; `loadGameFromSave` commits both interim and post-restore states. Extend `query-key-contract.test.ts` with the new key. `useGameState()` STILL reads Zustand. Files: `gameStore.ts`, `useGameState.ts`, `tests/client/`. | Medium | PR-1 pins unchanged and green; new test: after each store action, `getQueryData(gameStateQueryKey(id))` deep-equals `getState().gameState`. Rollback: revert; readers never saw the cache. |
| 5 | **feat: flip `useGameState()` to read the query cache** ⚠️ riskiest | One-file change: `useGameState()` becomes `useQuery({ queryKey: gameStateQueryKey(gameId), enabled: !!gameId, staleTime: Infinity, gcTime: Infinity, refetchOnWindowFocus: false, refetchOnReconnect: false, queryFn: GET /api/game/:id → ({ ...data.gameState, musicLabel: data.musicLabel ?? null }) }).data ?? null`, where `gameId` comes from the (still-present) Zustand copy. The queryFn is a cold-cache fallback only — in practice PR-4's funnel always pre-seeds. **Client-committed-record semantics per §0.6 are mandatory** — the app-default `staleTime: 60s` + focus-refetch must be overridden or slot math races. Files: `useGameState.ts` (+ a render-timing test). | **High** | PR-1 slot-math pins re-run against a rendered consumer: a component test (RTL) asserting `usedFocusSlots` updates on the render after `selectAction`, and that a simulated window-focus does NOT refetch/clobber. Manual smoke: select/remove actions, A&R start/cancel, advance week, exec-meeting slot gating. Rollback: revert the one file — PR-4's dual-write keeps both sources correct either way. |
| 6 | **refactor: retire the Zustand `gameState` copy** | Store internals stop reading/writing Zustand for the spine: `commitGameState` drops the `set({ gameState })` half (keeps a `gameId`-only mirror for `useGameId`/persist); action guards (`get().gameState`) switch to a `readGameState()` helper (`queryClient.getQueryData(gameStateQueryKey(currentGameId))`); `adoptServerBalances` becomes a `setQueryData` merge; orphan-cleanup reads `id`/`currentWeek` via `readGameState()`; `saveGame` + `SaveGameModal` `:141`/`:228` source `gameState` from the cache (matching how they already source the five collections). `partialize` still emits `{ gameState: { id } }` (sourced from the retained `gameId`) — on-disk shape frozen, rehydrate path adjusted to hydrate `gameId` + re-seed nothing (bootstrap loads as today). Files: `gameStore.ts`, `SaveGameModal.tsx`, `useGameState.ts`, `tests/client/`. | Med-High | ALL PR-1 pins re-pointed at the cache and green; snapshot shape test green; save→restore→export round-trip smoke; fresh-browser rehydrate smoke (old localStorage shape loads). Rollback: revert — PR-5 works indefinitely atop the dual-write. |
| 7 | **docs + cleanup** | Update `client/CLAUDE.md` (State Management / Cache Management: spine is cache-owned, `useGameState`/`useGameId` are the read path, client-committed-record semantics) and root `CLAUDE.md` if needed; delete stale comments (`releaseAnalytics.ts:3`); grep-gate that no new `useGameStore((s) => s.gameState` crept in. Files: docs, comments. | Low | Suite green; docs match code. |

## 4. Acceptance criteria (phase-level, testable)

All 10 verified against the tree at PR-7 time (2026-07-03): `npm run check` clean, `npx vitest run tests/client client/src` green (15 files / 130 tests in `tests/client`, 10 files / 97 tests in `client/src`).

1. ✅ **Single owner.** `gameState` exists in exactly one canonical place: the query cache at `['gameState:record', gameId]`. Zustand's `gameState` field holds only `{ id } | null` (`gameStore.ts` `GameStatePointer` type, PR-6). `tests/client/gameState-ownership.grepgate.test.ts` (added PR-7) greps `client/src` and fails on any `useGameStore((s) => s.gameState...)` selector outside `gameStore.ts`/`useGameState.ts` — passes clean today.
2. ✅ **`updateGameState` gone.** Confirmed by grep: zero matches for `updateGameState` in `client/src` (PR-2 deleted the interface + three-way fallback); `npm run check` clean.
3. ✅ **Optimistic semantics preserved.** `tests/client/useGameState-facade-flip.test.tsx` renders a real component through `useGameState()` and asserts `usedFocusSlots` updates on the next render after `selectAction`/`removeAction` with no `waitFor`, plus a simulated `window.dispatchEvent(new Event('focus'))` that must NOT trigger the tripwire queryFn — both pass.
4. ✅ **Balances stay server-canonical.** `adoptServerBalances` (`gameStore.ts:261`) still reads `GET /api/game/:id` and merges only `money`/`creativeCapital` onto the current record (comment block `gameStore.ts:243-260`), now committed via `commitGateState`'s `setQueryData` funnel instead of `set()`.
5. ✅ **Snapshot integrity.** `tests/client/buildGameSnapshot.shape.test.ts` green (6 tests); `SNAPSHOT_VERSION` still `2` (`shared/schema.ts:514`); both `saveGame` (`gameStore.ts`) and `SaveGameModal.handleExport` call the shared `buildGameSnapshot()` helper, `musicLabel` stays a top-level sibling.
6. ✅ **Persistence compatible.** `partialize` (`gameStore.ts:1407-1411`) still emits `{ gameState: { id } | null, selectedActions, isAdvancingWeek }` — byte-identical on-disk shape to pre-Phase-3.5.
7. ✅ **Orphan-cleanup behavior identical.** `createNewGame`'s orphan-cleanup path (PR-1 pin (f)) is covered by `tests/client/gameStore-actions.characterization.test.ts`, green against the current code (reads via `readGameState(get)` instead of `get().gameState` directly, same id/currentWeek semantics).
8. ✅ **Key contract extended.** `tests/client/query-key-contract.test.ts` imports `GAME_STATE_SCOPE`/`gameStateQueryKey` from `hooks/useGameState.ts` and asserts the key shape + invalidation-matching; no dead invalidations (the gameState key is never invalidated by design — see `client/CLAUDE.md` Cache Management).
9. ✅ **XState untouched.** `grep -rn "useQuery\|getQueryData" client/src/machines/*.ts` returns zero matches.
10. ✅ **Suite green after every PR.** Confirmed for the final tree: `npm run check` clean; `npx vitest run tests/client client/src` — 25 files, 227 tests, all passing.

## 5. Non-goals

- **No server changes** (no new endpoints, no PATCH response reshaping — even though returning `musicLabel` from PATCH would be nice, `updateGameState`'s deletion removes the need).
- **No `SNAPSHOT_VERSION` bump / snapshot shape change.**
- **No migration of `roles`, `weeklyActions`, `emails`, `executives`, `moodEvents` store arrays** (snapshot inputs; separate cleanup — see debt #5).
- **No redesign of orphan-cleanup or the dual bootstrap paths** (GameContext `/api/games` + GamePage `/api/game-state`) — behavior preserved; debt #4 logs the duplication.
- **No optimistic-mutation framework** (`onMutate`/rollback); the existing commit-then-sync semantics are preserved as-is.
- **No visual/UX changes; no XState migration; no Zustand removal** (it keeps session/UI state and the action API).

## 6. Honest risk notes

- **PR-5 is the riskiest step in the whole phase**: it swaps the subscription mechanism under 25 files at once (Zustand `useSyncExternalStore` → TanStack query subscription). Identical data, different notification timing. The mitigations are (a) the dual-write funnel landing first so data can never diverge, (b) the RTL same-tick slot test, (c) one-file rollback. Budget real manual smoke time here (action selection, A&R, advance week, exec meetings).
- **Render-batching differences** could surface as one extra render or a transient `null` during game-switch (`gameId` changes before the new key is seeded). `createNewGame`/`loadGameFromSave` must seed the new key BEFORE `gameId` flips (PR-4 ordering pins this).
- **`useGameState()` returning `.data ?? null`** must keep the exact `GameState | null` contract; components currently null-check `gameState` everywhere, so the loading state maps cleanly, but `isLoading` semantics are new — do not expose them this phase (return the plain value, not the query object).
- **`SaveGameModal.handleExport` timing** (PR-6): it reads the spine imperatively mid-callback; `getQueryData` is synchronous so behavior matches `getState()`, but the test must cover export-right-after-action.
- **Autosave path**: `advanceWeek` → `saveGame` runs immediately after the commit; after PR-6 `saveGame` reads the cache, which the funnel just wrote — same-tick, safe, but pinned by test (g).
- **A parallel session could touch `gameStore.ts`** (it's the hottest file in the repo). Rebase PRs 4/6 late; the funnel refactor conflicts textually with almost anything.

## 7. Discovered debt (log only — do NOT fix in this phase, except #1 which is PR-2's scope)

1. **`updateGameState` dead code + latent musicLabel clobber** — `client/src/store/gameStore.ts:640-701`; PATCH response (`server/routes/games.ts:88`) lacks `musicLabel`, so branch 1 would strip the label from the store and from subsequent saves. *(Fixed by PR-2 via deletion.)*
2. **Unused variable** `availableSlots` — `gameStore.ts:706`.
3. **Full-bundle refetch for one array**: `useProjects.ts:46` and `useArtists.ts:49` each GET the entire `/api/game/:id` payload to select `.projects`/`.artists`; a mutation invalidating both keys triggers two full-bundle GETs. Needs dedicated endpoints (server change → future phase).
4. **Dual bootstrap paths**: `GameContext.tsx:38` (`GET /api/games`, most-recent-game recovery) and `GamePage.tsx:42` (`GET /api/game-state` fallback) overlap; `client/CLAUDE.md:43` describes only the latter. Consolidation candidate.
5. **Zustand still owns snapshot-input arrays** that have cache-owned read paths: `emails` (`gameStore.ts:246`, read path is `useEmails`), `executives`/`moodEvents` (`:247-248`, `useExecutives` exists since PR-8). Dual copies exist solely for `saveGame`/`handleExport`; they should source from the cache like the other five collections.
6. **`advanceWeek` merge precedence** `{...resultGameState, ...serverGameState}` (`gameStore.ts:872-874`) silently discards any advance-week response field that the immediate refetch disagrees with, and hardcodes `usedFocusSlots: arOfficeSlotUsed ? 1 : 0` (:877) — correct today only because actions clear on week end.
7. **Stale comment** referencing store-owned data — `client/src/lib/releaseAnalytics.ts:3`.
8. **Heavy `console.log` debug noise** in store hot paths — `gameStore.ts:323-330` (loadGame), `:586-599` (createNewGame), `:834-865` (advanceWeek) — should move behind the `logger` used by `queryClient.ts`.
9. **`GamePage` effect dep list** includes `createNewGame` which the effect never calls — `GamePage.tsx:80`.
10. **`any`-typed store fields** `emails`/`executives`/`moodEvents`/`weeklyOutcome`/`campaignResults` (`gameStore.ts:246-254`).

## Critical files

- `client/src/store/gameStore.ts` — all 13 spine writers; the commit funnel lands here
- `client/src/hooks/useGameState.ts` (new) — the façade; PR-5's one-file ownership flip
- `client/src/lib/queryClient.ts:335-354` — app-default query options the gameState key must override
- `client/src/utils/buildGameSnapshot.ts` + `tests/client/buildGameSnapshot.shape.test.ts` — frozen snapshot contract (`musicLabel` sibling)
- `client/src/components/SaveGameModal.tsx:141,228` — the imperative `getState()` reads PR-6 repoints
- `tests/client/gameStore-harness.ts`, `gameStore-actions.characterization.test.ts`, `query-key-contract.test.ts` — the net to extend
- `client/CLAUDE.md` — ownership-model docs to update in PR-7
