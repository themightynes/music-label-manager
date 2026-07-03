# [READY] Phase 3: Client State Ownership — Single Source of Truth per Domain

*Created: July 3, 2026 — planned by a code-reading architect pass against the live tree (no code modified).*
*Status: READY — not started.*
*Part of the four-phase scaling arc (Phase 0: CI safety net · Phase 1: server seams ✅ · Phase 2: engine seams ✅ · **Phase 3: client state ownership** · Phase 4: game feel).*

## 0. Ground truth (verified against the working tree)

Line numbers are from the tree at planning time.

- **`client/src/store/gameStore.ts` is 1,242 lines** and owns almost everything. It holds server-canonical collections directly in Zustand: `gameState, artists, projects, roles, weeklyActions, songs, releases, emails, releaseSongs, executives, moodEvents, discoveredArtists` (`gameStore.ts:31-45`), plus genuine session/UI state (`selectedActions, isAdvancingWeek, weeklyOutcome, campaignResults`). Only `{ gameState.id }`, `selectedActions`, `isAdvancingWeek` are persisted (`gameStore.ts:1235-1239`).
- **`useGameStore` is read in 35 files / 78 sites** (`grep useGameStore client/src`). This is the dominant data-access path; TanStack Query is the minority.
- **The store is the mutation hub with ~20 raw `apiRequest` calls** (no TanStack): `loadGame` (6-call parallel fan-out, `:131-136`), `loadGameFromSave` (`:253`, `:268-273`), `createNewGame` (`:409`, `:418`) incl. orphan-cleanup `GET /api/saves` + `DELETE /api/game/:id` (`:340`, `:355`), `updateGameState` (`:465`, background re-GET `:487`), `advanceWeek` (`POST /api/advance-week` `:651` then the **same** 6-call fan-out `:681-686`), `signArtist` (`:850`), `updateArtist` (`:886`), `createProject` (`:904`), `updateProject` (`:940`), `cancelProject` (`:961`), `planRelease` (`:993`), `loadDiscoveredArtists` (`:1126`), `saveGame` (`:1225`). The **loadGame / advanceWeek / loadGameFromSave fan-outs are byte-for-byte the same 6 endpoints** — one refetch routine copied three times.

### The dual-write drift class (the core problem)

Every mutation action does **optimistic local math on `gameState`** and never re-reads the server field, so the store's money/creativeCapital can diverge from the DB until the next full reload:
- `signArtist`: `money = money - signingCost` (`:863`)
- `createProject`: `money -= projectCost; creativeCapital -= 1` (`:919-923`)
- `planRelease`: `money -= totalMarketingCost; creativeCapital -= 1` (`:1000-1004`)
- `cancelProject`: trusts `result.newBalance` (`:972`) — the one action that reads the server's number back.

### Comment-49-family bugs (Zustand writes that bypass TanStack invalidation) — VERIFIED LIVE

1. **`advanceWeek` invalidates keys that match nothing.** It calls `invalidateQueries({ queryKey: ['artist-roi'] })` and siblings `['project-roi'|'portfolio-roi'|'release-roi']` (`gameStore.ts:787-790`). But the analytics hooks key on `[url, 'analytics:artist-roi', {...}]` (`useAnalytics.ts:24,45,66,85`). Element-by-element matching (see client/CLAUDE.md) means **these four invalidations are dead no-ops** — ROI cards can show stale data after a week.
2. **`['executives']` invalidation (`:792`) also matches nothing** — no `useQuery(['executives'])` exists anywhere (`grep`). Executives are not in TanStack at all; the machine and store each hold their own copy (below).
3. **C49 (still open, logged in DEVELOPMENT_STATUS 2026-07-03):** `loadGameFromSave` writes `emails` into Zustand (`:239`, `:300`) but never invalidates `EMAIL_LIST_SCOPE`/`EMAIL_UNREAD_SCOPE`, so `useEmails` shows stale pre-restore inbox until reload. `advanceWeek` *does* invalidate these correctly (`:794-798`) — proving the pattern; the save-restore path just missed it. **A fix may land in parallel; this plan assumes it may still be open and folds it into PR-2.**

### What's already healthy (do NOT churn these)

- **`buildGameSnapshot` (`client/src/utils/buildGameSnapshot.ts`, 80 lines) is already the single shared snapshot builder.** Both `gameStore.saveGame` (`:1203`) and `SaveGameModal.handleExport` (`SaveGameModal.tsx:230`) call it. The historical drift the project CLAUDE.md warns about is **already resolved.** Phase 3's job here is only to *protect* it with a test, not rebuild it.
- **XState machines are clean.** All three inject their services and never touch the store or fetch directly: `arOfficeMachine.ts` (236 ln, callback-only, no `apiRequest`/`useGameStore`), `artistDialogueMachine.ts` (235 ln, injected actors), `executiveMeetingMachine.ts` (630 ln, injected actors via `executiveService`). Focus-slot/week state flows *into* the machines via `SYNC_SLOTS`/`SYNC_WEEK` events. **This is the target pattern — do not migrate flows out of XState.**
- **`useEmails` (`hooks/useEmails.ts`) is the reference for a correct domain:** scoped keys, mutations that invalidate their own scope. It is the template every read-domain PR below should copy.

### The one real machine/store duplication (minor, deferred)

`executiveMeetingMachine` fetches its own `executives` into machine context (`executiveMeetingMachine.ts:33`, via `fetchExecutives`) and the store *also* holds an `executives` array (`gameStore.ts:41`) refreshed by every fan-out. The **machine's copy is the one the meeting UI actually renders** (`ExecutiveMeetings.tsx:68`); the store copy exists only to be written into save snapshots. Not a live bug — flagged, addressed in PR-8 (non-goal to fully unify this phase).

## 1. Target ownership model

| State domain | Canonical owner (target) | Today |
|---|---|---|
| Server truth: game, artists, projects, releases, songs, charts, executives, mood-events, saves list, discovered artists | **TanStack Query** (cache = source of truth; mutations invalidate) | Mirrored into Zustand via fan-out |
| `gameId` handle | GameContext + `currentGameId` localStorage (unchanged) | Same |
| Session/UI/optimistic: `selectedActions`, `isAdvancingWeek`, `weeklyOutcome`, `campaignResults`, focus-slot reservation | **Zustand** (only this) | Zustand (correct) |
| Multi-step flows: exec meetings, A&R sourcing, artist dialogue | **XState** (injected services) | XState (correct) |

Phase 3 does **not** try to reach this end state in one leap. It removes the *drift classes* first (behavior-preserving), then peels read-domains out of the store into query hooks, largest-risk last.

## 2. Guiding constraints

- **Characterization-first**, exactly as Phases 1–2: for any PR that could shift behavior, add a test that passes before AND after. The Phase 2 golden master covers the engine; Phase 3 needs *client* nets (store-action unit tests + hook tests with a mocked `apiRequest`).
- **No visual redesign, no new gameplay.** Response consumers keep rendering the same fields.
- **One domain per PR.** The store shrinks incrementally; at no point is it half-migrated for a *single* domain.
- Merge policy mirrors Phase 1/2: branch from `main`, `npm run check` + `npm run test:run` (Docker test DB on 5433) green, manual smoke where the domain has no coverage, explicit user go-ahead before merge (repo auto-merge disabled).

## 3. PR sequence (10 PRs)

Behavior-preserving cleanups first (1–4), then read-domain extraction (5–9), then the optimistic-write consolidation (10). PRs 1–4 are independent; 5–9 are independent of each other; 10 gates on 5–7.

| # | PR | Scope & files | Risk | Verification / "green" |
|---|---|---|---|---|
| 1 | **test: client-state characterization net** | No behavior change. Add `tests/client/` with: (a) a `gameStore` action test harness that mocks `apiRequest`/`queryClient` and pins the optimistic deltas of `signArtist`/`createProject`/`planRelease`/`cancelProject` + the exact `set(...)` shape after `loadGame`/`advanceWeek`; (b) a snapshot test asserting `buildGameSnapshot` output shape (locks `musicLabel`-as-sibling + `emailMetadata.truncated`); (c) a query-key contract test asserting the keys `advanceWeek` invalidates actually equal the keys `useAnalytics`/`useEmails` produce (this test **fails today** — see PR-3; land it `.skip` or as a known-red pin first, or split the assertion). | Low | Suite green (minus the intentionally-pending analytics-key pin). This is the net for PRs 3, 5–10. |
| 2 | **fix(C49): invalidate email scopes after `loadGameFromSave`** | If not already fixed in parallel: after the restore fan-out in `loadGameFromSave`, invalidate `EMAIL_LIST_SCOPE`/`EMAIL_UNREAD_SCOPE` for the restored `gameId` using the **same predicate** `advanceWeek` uses (`gameStore.ts:794-798`). Files: `gameStore.ts`. | Low | Add a store-action test (extends PR-1) asserting the invalidation fires with the restored id; manual smoke: restore a save, inbox updates without reload. If parallel fix already merged, this PR is dropped. |
| 3 | **fix: repair dead ROI + executives invalidations in `advanceWeek`** | Behavior fix. Replace the four no-op `['*-roi']` invalidations (`gameStore.ts:787-790`) with predicate invalidations matching `analytics:*-roi` keys (`useAnalytics.ts`). Delete the dead `['executives']` invalidation (`:792`) or convert it to the mechanism that actually refreshes the meeting machine (leave a `// TODO(phase-3 PR-8)` — executives aren't in TanStack yet). Files: `gameStore.ts`. | Medium | The PR-1 analytics-key contract test flips green. Manual smoke: advance a week with an active artist/release, ROI cards refresh without reload. |
| 4 | **refactor: extract the shared 6-endpoint reload into one helper** | Pure move. The identical fan-out in `loadGame` (`:131-136`), `loadGameFromSave` (`:268-273`), `advanceWeek` (`:681-686`) becomes one internal `fetchGameBundle(gameId)`; also fold `utils/emailSnapshot.ts` snapshot helpers behind it where they duplicate the same GETs. No call-site behavior change. Files: `gameStore.ts`, `utils/emailSnapshot.ts`. | Medium | PR-1 store tests pin the resulting `set(...)` shape byte-identical across all three callers; `tsc` clean. |
| 5 | **feat: `useCharts` query hooks; move chart reads off raw apiRequest** | Charts are pure server reads never mirrored into the store. Replace the raw `apiRequest` in `Top10ChartDisplay.tsx:46` / `Top100ChartDisplay.tsx:46` (and their pages) with `useQuery` hooks keyed `['charts:top10', gameId]` / `['charts:top100', gameId]`; have `advanceWeek` invalidate them. Files: new `hooks/useCharts.ts`, the two display components, `gameStore.advanceWeek` (add invalidation). | Low | Hook test with mocked `apiRequest`; smoke: Top 10/Top 100 pages load and refresh after a week. Lowest-risk extraction — do it first to prove the pattern. |
| 6 | **feat: `useReleases`/`useSongs` read hooks (store stops owning them)** | `releases`, `releaseSongs`, `songs` become query hooks (`['releases', gameId]`, etc.); components that read `useGameStore(s => s.releases)` switch to the hook. `advanceWeek`/`loadGame` stop writing these into Zustand and instead invalidate. Big consumer surface (`ActiveReleases`, `SongCatalog`, `ReleaseWorkflowCard`, `PlanReleasePage`). Files: new `hooks/useReleases.ts`,`useSongs.ts`; ~6 components; `gameStore.ts`. | Med-High | Characterization: PR-1 already pins the fan-out; add hook tests + smoke the full plan→release→execute flow (the flow the 2026-07-03 smoke pass exercised). Split into two PRs if the component diff is large. |
| 7 | **feat: `useProjects` read hook** | Same treatment for `projects`. Consumers: `Dashboard`, `ArtistPage`, `RecordingSessionPage`, `ActiveTours`. Mutations (`createProject`/`updateProject`/`cancelProject`) stay in the store for now but switch to invalidating `['projects', gameId]` instead of hand-splicing the array. Files: new `hooks/useProjects.ts`; ~4 components; `gameStore.ts`. | Med-High | Hook test; smoke: create Single, cancel a tour, project list + money reflect correctly. |
| 8 | **feat: `useExecutives` hook; collapse the triple copy** | Introduce `hooks/useExecutives.ts` wrapping `executiveService.fetchExecutives` (keyed `['executives', gameId]`). Point `executiveMeetingMachine`'s injected `fetchExecutives` and the store-snapshot need at the single cached source; make PR-3's TODO'd invalidation real. Store stops holding a standalone `executives` array (snapshot reads from the query cache or a thin selector). Files: new hook, `ExecutiveMeetings.tsx`, `gameStore.ts` (snapshot assembly), `buildGameSnapshot` caller. | Medium | Meeting-flow smoke (open meeting → choice → mood/loyalty updates post-week); assert snapshot still contains executives. |
| 9 | **feat: `useDiscoveredArtists` + `useArtists` read hooks** | `discoveredArtists` (raw `apiRequest` at `:1126` with flags-fallback synthesis `:1132-1148`) and the `artists` roster become query hooks. Preserve the discovered-artist fallback synthesis verbatim inside the hook. `signArtist`'s discovered-list removal becomes cache invalidation. Files: new `hooks/useArtists.ts`,`useDiscoveredArtists.ts`; `AROffice.tsx`, `ArtistRoster`, `ArtistCard`, `ArtistPage`; `gameStore.ts`. | Med-High | A&R smoke: run op → discover → sign → discovered list drops the signed artist, roster gains it. |
| 10 | **refactor: remove optimistic money/creativeCapital math (server-canonical balances)** | The drift fix. `signArtist`/`createProject`/`planRelease` stop doing local `money`/`creativeCapital` subtraction (`:863,:919-923,:1000-1004`); instead they invalidate/refetch the game so the balance comes from the server (as `cancelProject` already does via `result.newBalance`, `:972`). Accept one extra round-trip; add optimistic UI via TanStack `onMutate` only if a flicker appears. Files: `gameStore.ts`; possibly `useGameState` hook if `gameState` itself moves to a query. | High | **Characterization mandatory:** PR-1's optimistic-delta pins are rewritten to assert the *post-refetch* balance equals the server number (mock returns a known balance); regression-test that double-clicking sign/create can't double-deduct. Manual smoke on money display after each action. |

**Explicitly deferred to a later phase / out of scope for these 10:** moving `gameState` itself fully into TanStack (it's the spine `useGameStore(s => s.gameState)` read in ~30 files — a Phase 3.5 or Phase 4 item); deleting the orphan-cleanup logic in `createNewGame`; unifying `updateGameState`'s three-way fallback (`:478-520`); the `GameContext` bootstrap `GET /api/games` (`:38`).

## 4. Acceptance criteria (phase-level, testable)

1. **No dead invalidations.** A test asserts every `queryClient.invalidateQueries` key/predicate in `gameStore.ts` matches at least one live `useQuery` key produced by a hook (the analytics + executives no-ops from `:787-792` are gone or matched).
2. **C49 closed.** After `loadGameFromSave`, `useEmails`/`useUnreadEmailCount` reflect the restored inbox with no manual reload — covered by a store-action test and the manual restore smoke.
3. **Single reload routine.** The 6-endpoint fan-out exists in exactly one place (`fetchGameBundle`); `grep` finds no duplicated `Promise.all([...songs...releases...])` block across `loadGame`/`advanceWeek`/`loadGameFromSave`.
4. **Read-domains own their data once.** `charts`, `releases`, `songs`, `projects`, `discoveredArtists`, `artists`, `executives` are read through query hooks; `useGameStore` no longer exposes them as owned arrays for those domains (they may remain only as transient snapshot inputs where a save needs them, sourced from the cache).
5. **No optimistic balance drift.** After `signArtist`/`createProject`/`planRelease`, displayed `money`/`creativeCapital` equal the server's value (test asserts post-action balance == mocked server balance; no client-side arithmetic remains for these three).
6. **Snapshot integrity preserved.** `buildGameSnapshot` output shape is unchanged (existing shape test + PR-1 pin both green); save/restore round-trip smoke passes.
7. **Flows still owned by XState.** No `apiRequest`/`fetch` or `useGameStore` write is introduced into any `machines/*.ts`; the three machines keep the injected-service pattern.
8. **Suite green throughout:** `npm run check` clean and `npm run test:run` green after every PR; CI `vitest` job passes.

## 5. Non-goals

- **No visual redesign, no layout/CSS changes, no new gameplay features or endpoints.**
- **No server changes.** Phase 3 is client-only; `server/` never appears in a diff.
- **No XState migration** — flows stay in machines; do not move meeting/dialogue/A&R logic into hooks or the store.
- **No full `gameState`→TanStack migration** (deferred; it's the app spine).
- **No schema/`SNAPSHOT_VERSION` bump** — snapshot shape is preserved, not changed.
- **No deletion of the orphan-cleanup or `GameContext` bootstrap paths** — behavior-preserving; separate review if touched.
- **No Zustand→another-library swap.** Zustand stays; it just narrows to session/UI/optimistic state.

## 6. Honest risk notes (where the codebase fights the plan)

- **The store is load-bearing everywhere (78 sites).** Read-domain extraction (PRs 6–9) has a wide blast radius per PR. Mitigation: one domain per PR, split any PR whose component diff exceeds ~6 files, lean on the PR-1 net. Expect PR-6 and PR-9 to possibly each become two PRs.
- **`gameState` is entangled with the collections.** Many components read `gameState.money` alongside `artists`/`projects` from the same store. Until `gameState` itself moves to a query (deferred), PR-10 must refetch the *game* to get canonical balances, which means a hook boundary that half-crosses the store. Accept the seam; document it.
- **Client test infrastructure is thinner than server's.** There is no client golden master; the characterization net (PR-1) must be built essentially from scratch with `apiRequest`/`queryClient` mocks. Under-investing here removes the whole safety argument — PR-1 is not optional and should not be rushed.
- **A parallel C49 fix is in flight.** PR-2 may collide or become a no-op. Rebase PR-2 last among 1–4 and drop it if the fix already merged; keep the *test* regardless.
- **`executives` triple-ownership (store + machine + snapshot need)** makes PR-8 subtler than a pure read-hook: the save snapshot still needs an executives array, so the hook's cache must be reachable at save time. If that proves awkward, keep a thin store selector fed by the query and defer full unification.

## Critical files

- `client/src/store/gameStore.ts` — the 1,242-line hub every PR shrinks or touches
- `client/src/hooks/useEmails.ts` — the reference pattern for scoped-key read+mutation hooks
- `client/src/hooks/useAnalytics.ts` — the keys PR-3's invalidation fix must match
- `client/src/utils/buildGameSnapshot.ts` — the already-shared snapshot builder to protect, not rebuild
- `client/src/machines/*.ts` — the injected-service flow pattern to preserve
- `client/CLAUDE.md` — element-by-element query-key matching rule that explains the dead invalidations
