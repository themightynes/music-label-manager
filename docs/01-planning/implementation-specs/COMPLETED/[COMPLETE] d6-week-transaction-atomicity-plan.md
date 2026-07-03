# [READY] D6 — Whole-Week Transaction Atomicity

**Goal**: `POST /api/advance-week` commits the entire week advance in ONE PostgreSQL transaction — all-or-nothing. A crash at any point leaves the game exactly at week N or exactly at week N+1, never in between.

**Status**: Plan verified against code on `main` (2026-07-03). Feasibility: **CONFIRMED** — a single transaction is achievable with no compromise (evidence in §5).

---

## 1. Current transaction map (code-verified)

Orchestration: `server/services/advanceWeekService.ts` (`AdvanceWeekService.advanceWeek`), called from `server/routes/gameLoop.ts:44`. The route does nothing else DB-wise.

### TX 1 — `advanceWeekService.ts:50–254` (`this.db.transaction`)
- Reads: `gameStates` select (:52), `artists` select (:62), released `projects` select (:152).
- Campaign-completed early return (:107–144) — read-only, returns inside the tx.
- `serverGameData.initialize()` (:148) — JSON file loads only, no DB.
- `gameEngine.advanceWeek(formattedActions, tx)` (:229) — the engine is **NOT pure**: it persists via `storage` / `gameData` as it runs, threading `dbTransaction` through every processor (`shared/engine/game-engine.ts:178–308`).

**Writes correctly bound to tx1** (verified tx-honoring implementations):
| Write | Call site | Storage impl |
|---|---|---|
| Song creation | `SongGenerationProcessor.ts:107` → `gameData.createSong` | `server/data/gameData.ts:827–845` (uses tx) |
| Song updates (streams/revenue/release) | `ReleaseProcessor.ts:972,1106`, `FinancialSystem.ts:258,271,354` | `storage.ts:483` (`updateSong`), `:507` (`updateSongs`) |
| Release status | `ReleaseProcessor.ts` → `updateReleaseStatus` | `storage.ts:628` |
| Chart entries | `ChartService.ts:354` | `storage.ts:805` |
| Emails | `game-engine.ts:549` → `createEmails` | `storage.ts:979` |
| Mood events | `ArtistStateProcessor.ts:120–130` | `storage.ts:1035` |
| Executive mood/loyalty | `ActionProcessor.ts:288`, `ArtistStateProcessor.ts:439` | `storage.ts:763` (`updateExecutive`, tx-aware) |
| Project stage advance | `ProjectStageProcessor.ts:199` (direct `dbTransaction.update`) | n/a |

### ESCAPING BOTH TRANSACTIONS — autocommit on the global `db` pool (a *different* pool connection)
These writes commit immediately even if tx1 later rolls back. **The current system is worse than a two-transaction split — it is a two-transaction split plus N autocommitted stragglers.**

| Escaping write | Call site | Why it escapes |
|---|---|---|
| Artist mood/energy | `ArtistStateProcessor.ts:153` (`updateArtist(artist.id, updates)`) | `storage.ts:348` `updateArtist` has **no tx param**; caller passes none |
| Artist weekly mood drift | `ArtistStateProcessor.ts:199` | same |
| Artist popularity (tours) | `ArtistStateProcessor.ts:354` | same |
| Project totalRevenue/completion (tour done) | `ProjectStageProcessor.ts:139–142` — **passes `dbTransaction` as 3rd arg** | `storage.ts:371` `updateProject(id, project)` takes 2 params; JS silently drops the tx arg |
| Project tour metadata (per-city stats) | `TourProcessor.ts:212` — passes tx as 3rd arg | same silent drop |
| Release marketing-allocation idempotency flags + metadata | `FinancialSystem.ts:296, 319, 341, 355` (`InvestmentTracker` → `updateRelease`) | `storage.ts:569` `updateRelease` has no tx param |

**Stale reads on the global connection during tx1** (cannot see tx1's own uncommitted writes): `getArtistsByGame` (`storage.ts:334`; used at `ArtistStateProcessor.ts:58,178,334,496,538`, `ReleaseProcessor.ts:614`, `AROfficeProcessor.ts:81`), `getProjectsByGame` (`storage.ts:357`), `getRelease` (`storage.ts:559`; `FinancialSystem.ts:287,336`, `ReleaseProcessor.ts:656`), `getSong` (`storage.ts:461`; `FinancialSystem.ts:348`), `getSongsByArtist` (`FinancialSystem.ts:373`), `getArtist` (`TourProcessor.ts:245`, `ReleaseProcessor.ts:788`), `getExecutivesByGame`/`getExecutive` (`storage.ts:746,754`; `ArtistStateProcessor.ts:381`, `ActionProcessor.ts:247`), `getReleasesByGame` (`ReleaseProcessor.ts:627` — called WITHOUT tx there though a tx-aware variant exists).

### TX 2 — `advanceWeekService.ts:267–378` (second `this.db.transaction`)
- `UPDATE game_states` — week, money, reputation, creativeCapital, slots, access tiers, tierUnlockHistory, campaignCompleted, A&R fields, flags, weeklyStats (:270–295).
- `INSERT weekly_actions` (one row per selected action) (:298–313).
- Read-backs of `projects` + `songs` for the `debug` response envelope (:325–334).

### Outside any transaction
- No DB writes. `serverGameData.initialize()` and `getStartingValues()` are JSON file loads. Emails are DB rows (no SMTP). Charts are DB rows. **No external/network side effects anywhere in the week advance** (verified: no fetch/queue/webhook in the engine, processors, `FinancialSystem`, `ChartService`, `EmailGenerator` paths). Client autosave is a separate later HTTP request from `gameStore` — not this endpoint's concern.

### Crash consequences today
1. Crash between tx1 commit and tx2 commit → songs/emails/charts/stage-advances committed, **but `currentWeek` not incremented and money not deducted** → replaying the week double-applies everything.
2. Crash (or thrown error → rollback) *inside* tx1 → tx1's writes roll back **but the escaping artist/project/release writes stay committed** → half-applied week even without the two-tx split.
3. Cross-connection hazard: escaping writes target rows (`projects`) that tx1 also writes via the tx handle (`ProjectStageProcessor.ts:139` vs `:199`). If ordering ever inverts (tx write before global write to the same row), the global write blocks on tx1's row lock while tx1 awaits it → self-deadlock until lock timeout. Currently avoided only by accidental ordering.

---

## 2. PR sequence

Each PR lands green on `main`: `npm run check` + full `npm run test:run` (Docker test DB on 5433 up via `npm run test:db:start`).

### PR-1 — Characterization: failure-injection tests pinning today's half-applied behavior
**New file**: `tests/features/advance-week-atomicity.test.ts` (node environment, real test Postgres via `createTestDatabase()` — NEVER `server/db`).

`AdvanceWeekService` already has injectable deps (`storage`, `db`, `serverGameData` — `advanceWeekService.ts:36–40`), so no production change is needed:
- Construct `new AdvanceWeekService(new DatabaseStorage(testDb), dbProxy, gameData)` where `gameData` is the real `ServerGameData`-shaped mock used by `tests/engine/golden-master-fixtures.ts` / `game-spine-advance-save-restore.test.ts` (reads real balance JSON), extended with the tx-aware bridge methods the engine calls (`createSong`, `getActiveRecordingProjects`, `getReleasesByGame`, `getSongsByRelease`, `updateReleaseStatus`, `updateSongs`) delegating to the `DatabaseStorage(testDb)` instance. **Caveat**: the production `ServerGameData` singleton hard-imports `server/db`/`storage` singletons internally (`gameData.ts:759–845`), so the test must inject a test-DB-backed equivalent, mirroring the existing engine-test harnesses.
- Seed a game + artist + an in-production recording project (fixture shapes from `tests/engine/golden-master-fixtures.ts`) so the week produces artist mood writes, song creation, and emails.

**Test A — "crash between tx1 and tx2 leaves a half-applied week" (pins current behavior)**
`dbProxy.transaction` delegates to `testDb.transaction` on the 1st call and **throws before running the callback** on the 2nd call. Assert after the rejected `advanceWeek`:
- tx1 effects COMMITTED: new `songs` rows exist / `emails` rows exist / project stage advanced;
- `game_states.currentWeek` UNCHANGED, money unchanged, `weekly_actions` empty.

**Test B — "error inside tx1 still leaks escaping writes" (pins the escape hatch)**
Spy `storage.createEmails` (runs last in the engine, `game-engine.ts:308`) to throw → tx1 rolls back. Assert:
- tx-bound writes rolled back: no `songs`, no `emails`, no `chart_entries`;
- **escaping writes persisted anyway**: artist `mood`/`energy` changed in DB (from `ArtistStateProcessor.ts:153` on the global connection). Use a fixture guaranteed to produce a nonzero mood delta (e.g. tour city week or a meeting action with mood effects; weekly drift from a non-50 starting mood also works).

Comments in the test must state these pin CURRENT (broken) behavior and will be flipped by PR-2/PR-3.

**Acceptance**: both tests green against unmodified production code; suite + `npm run check` green.

### PR-2 — Plumb the tx handle through every escaping storage method (zero intended behavior change)
Scope: `server/storage.ts` (+ `IStorage` interface), processor/`FinancialSystem` call sites. Pattern already established in the file: trailing `dbTransaction?: any`, `const dbContext = dbTransaction || this.db;`.

1. Add `dbTransaction?` and honor it in: `updateArtist` (:348), `updateProject` (:371) — **this alone fixes the two call sites that already pass a tx and have it silently dropped** (`ProjectStageProcessor.ts:139`, `TourProcessor.ts:212`) — `updateRelease` (:569), `getRelease` (:559), `getSong` (:461), `getSongsByArtist` (:435), `getArtistsByGame` (:334), `getArtist` (:338), `getProjectsByGame` (:357), `getExecutivesByGame` (:746), `getExecutive` (:754). Update `IStorage` signatures to match.
2. Thread `ctx.dbTransaction` / the local `dbTransaction` at every week-advance call site currently omitting it: `ArtistStateProcessor.ts:58,153,178,181,199,334,354,381,496,538`, `ReleaseProcessor.ts:614,627,656,788`, `AROfficeProcessor.ts:81`, `ActionProcessor.ts:247`, `TourProcessor.ts:245`, and `InvestmentTracker` in `FinancialSystem.ts:287,296,319,336,341,348,355,373` (its methods already receive `dbTransaction` — they just don't forward it to `getRelease`/`updateRelease`/`getSong`).
3. Do NOT touch non-week-advance callers (they pass nothing; the optional param defaults preserve behavior).
4. Flip PR-1 **Test B**: after this PR, an error inside tx1 rolls back EVERYTHING including artist/project/release writes. Update assertions accordingly (this is the proof of the fix).

**Risk — golden master drift**: moving reads onto the tx connection gives read-your-own-writes semantics (e.g. `FinancialSystem.ts:348` `getSong` will now see tx-applied `marketingAllocation` updates; `getRelease` at :287/:336 will see idempotency flags set earlier in the same tx). `tests/engine/golden-master-advance-week.test.ts` pins persisted-row digests byte-identical — run it first. If any snapshot changes, inspect the diff: a change means a stale-read bug was live; update the snapshot **deliberately, with the diff explained in the PR body** (the golden master is a characterization net, not a spec). Expectation: no drift in the pinned scenarios because each pinned week touches each song/release once, but this must be verified, not assumed.

**Acceptance**: `npm run check` green; full vitest green; golden master snapshots unchanged OR changed with explicit justification; PR-1 Test B flipped and green; PR-1 Test A still pins the two-tx split (unchanged).

### PR-3 — Merge tx1 + tx2 into one transaction; add concurrency guard
Scope: `server/services/advanceWeekService.ts` only (plus flipping PR-1 Test A).

1. Delete the second `this.db.transaction` (:267); move its body — `gameStates` UPDATE, `weeklyActions` INSERT, projects/songs debug read-backs, response assembly object — inside the first transaction, immediately after `gameEngine.advanceWeek(...)` returns. Keep statement order identical. The campaign-completed early return keeps returning early (it performs no writes); shape the single tx to return the final envelope in both paths.
2. **Concurrency guard (cheap, in scope)**: make the initial `gameStates` select `FOR UPDATE` (drizzle: `.for('update')` on the select at :52). Today two concurrent advance-week requests for the same game both read week N, both run the engine, and both commit N+1 with doubled revenue/songs/actions — there is **no locking or idempotency anywhere** (verified: no `FOR UPDATE`/advisory locks in `server/`). With a single tx + row lock, the second request serializes behind the first and then operates on week N+1's state (advancing again, once). If product wants "reject instead of advance twice", that is a follow-up (compare a client-supplied expected week) — do not scope-creep it here.
3. Flip PR-1 **Test A**: inject failure at the final persistence step instead of the tx boundary (e.g. spy the injected `storage`… the gameStates UPDATE uses `tx.update` directly, so inject via the `dbProxy`: wrap the tx object passed to the callback so its first `update(gameStates)` invocation throws — or simpler, make `createEmails` the injection point and assert TOTAL rollback: no songs, no emails, no stage advance, no artist mood change, week unchanged, no weekly_actions). Assert the all-or-nothing property.
4. Response assembly and `res.json` remain after commit (they already are — the route sends the resolved value). See §4.

**Acceptance**: `npm run check` + full vitest green (including the endpoint characterization `tests/endpoints/advance-week.characterization.test.ts`, which pins the HTTP envelope and must not change); PR-1 Test A flipped to prove full rollback; golden master unchanged (pure boundary move — no statement added/removed inside the engine); manual crash-consistency argument documented in PR body.

---

## 3. Concurrency finding
- **Today**: nothing prevents two concurrent `POST /api/advance-week` for the same game. `requireGameOwner` is per-request; tx1's select takes no lock; tx2's UPDATE has no `WHERE current_week = expected` guard (`advanceWeekService.ts:270–295`). Result: double-applied weekly effects and duplicated `weekly_actions` rows are possible today.
- **After D6**: the single tx makes each request internally atomic but two requests could still interleave; the `SELECT … FOR UPDATE` in PR-3 serializes them for ~the engine's compute time (ms-scale). Recommended and included. Optimistic week-guard rejection is a noted follow-up, not in scope.

## 4. Post-commit ordering
- Everything that must be atomic is a DB row → inside the tx.
- After commit, in order: (1) the service returns the envelope (already assembled from in-tx values), (2) route `res.json`. No other post-commit work exists on the server.
- The debug read-backs (`projects`/`songs` selects) stay INSIDE the tx (as today in tx2) so the envelope reflects exactly what was committed.
- Client autosave / query invalidation are separate subsequent HTTP requests — unaffected.
- `console.log` noise is interleaved with the tx but is not a side effect requiring ordering.

## 5. Feasibility evidence (single transaction, no compromise)
- **The expensive part is already one transaction.** tx1 already spans the ENTIRE engine run — every processor, chart generation, email generation (`advanceWeekService.ts:50–254`). Merging tx2 adds exactly 1 UPDATE + 1 multi-row INSERT + 2 SELECTs. Lock duration increases by microseconds-to-milliseconds, not by a new class of work.
- **Statement volume** is modest: per week, tens of statements (worst case: `updateSongs` loops one UPDATE per song, `storage.ts:514`; chart entries are one batched insert). Well within a single pg transaction; pool max 10 (`server/db.ts:15`) is unaffected — one connection held slightly longer.
- **No external side effects**: emails, charts, mood events are all Postgres rows; no network calls, queues, or filesystem writes in the advance path (verified across engine + processors + FinancialSystem + ChartService + EmailGenerator).
- **No engine-driven commits**: the engine only writes through storage/gameData handles; after PR-2 all of them accept and honor the tx.
- One pre-existing softener: `processWeeklyCharts` swallows its own errors (`game-engine.ts:1038–1041`), so a chart failure yields a committed week without chart rows. That is deliberate current behavior, unchanged by D6 (noted as debt).

## 6. Risks
| Risk | Mitigation |
|---|---|
| Golden-master drift in PR-2 from read-your-writes semantics | Run golden master first; any diff reviewed as a stale-read bug fix; snapshots updated deliberately with justification |
| Missed escaping call site | PR-1 Test B asserts total tx1 rollback after PR-2; grep audit `storage\.(update|create|get)` under `shared/engine/` in PR-2 review |
| `FOR UPDATE` changes latency under concurrent requests | Only same-game requests serialize; single-player game → same user double-click; acceptable |
| Test harness `gameData` diverging from production `ServerGameData` | Reuse the established mock from golden-master fixtures; keep bridge methods delegating to `DatabaseStorage(testDb)` |
| tx held during heavy `console.log` I/O | Pre-existing (tx1 already spans it); debt item, not a blocker |

## 7. Discovered debt (do NOT fix in these PRs)
1. `storage.updateProject` silently drops a tx argument two callers already pass — `server/storage.ts:371`, `shared/engine/processors/ProjectStageProcessor.ts:139`, `shared/engine/processors/TourProcessor.ts:212` (fixed incidentally by PR-2, but the underlying `any`-typed tx plumbing invites recurrence).
2. `dbTransaction?: any` everywhere — no compile-time protection against exactly this class of bug (`server/storage.ts`, all processors). A typed `DbOrTx` union would prevent silent drops.
3. `processWeeklyCharts` swallows all errors → week can commit without chart rows — `shared/engine/game-engine.ts:1038–1041`.
4. `applyArtistChangesToDatabase` runs twice per week — `shared/engine/game-engine.ts:191` and `:226`.
5. `InvestmentTracker` idempotency flags read via non-tx `getRelease` — `shared/engine/FinancialSystem.ts:287,336` — check-then-set race (mitigated by PR-2 + PR-3 serialization).
6. `ServerGameData` duplicates storage with inline SQL against hard-imported singletons — `server/data/gameData.ts:759–845, 1015–1036` — two parallel data layers to keep tx-aware.
7. Extreme `console.log` volume in the hot path — `server/services/advanceWeekService.ts` (throughout), `server/storage.ts:384–425, 509–544`, `server/data/gameData.ts:760–818`.
8. `weekly_actions.results` splits week revenue/expenses evenly across actions — `server/services/advanceWeekService.ts:307` — meaningless per-action attribution.
9. `rngSeed` fallback `Math.random()` inside the service — `server/services/advanceWeekService.ts:87` — nondeterminism if a row lacks a seed.
10. tx2's `gameStates` UPDATE has no optimistic week guard — `server/services/advanceWeekService.ts:270–295` (partially addressed by PR-3's `FOR UPDATE`; a `WHERE current_week = expected` rejection is the complete fix).
11. Hardcoded `week: gameState.currentWeek || 14` in the early-return summary — `server/services/advanceWeekService.ts:129`.
