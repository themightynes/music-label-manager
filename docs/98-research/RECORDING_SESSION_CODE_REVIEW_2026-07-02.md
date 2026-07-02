# Recording Session Feature — Code Review
**Date**: July 2, 2026 · **Reviewer**: Claude (read-only session) · **Branch reviewed**: `claude/onboarding-jira33` (clean, even with main)
**Scope**: The recording-session feature end to end — creating a recording project (Single/EP) → weekly song generation → songs recorded / project reaches `recorded` stage. Release planning is out of scope (separate feature). All findings were verified directly in source at the cited file:line locations.

## Background / context needed to read this report

- **Architecture**: TypeScript monorepo. React client (`client/src/`), Express feature routers (`server/routes/`, post-Phase-1 decomposition), shared deterministic game engine (`shared/engine/game-engine.ts`, 5,116 lines) + `shared/engine/FinancialSystem.ts` (2,060 lines). Balance config in `data/balance/*.json`. Weekly turn loop: `POST /api/advance-week` → `GameEngine.advanceWeek()` inside a DB transaction.
- **Feature flow as designed**: Player picks artist, type (Single 1–3 songs / EP 3–5), budget-per-song, producer tier (local/regional/national/legendary; reputation-gated at 0/15/35/60), time investment (rushed/standard/extended/perfectionist). Creation deducts `budgetPerSong × songCount × producerCostMult × timeCostMult` in money plus 1 creative capital. Each week in `production`, the engine generates songs (Single 2/wk, EP 3/wk — hardcoded), quality from a multiplicative formula. Project advances `planning → production → recorded` (all songs done + ≥2 weeks elapsed, or forced at 4 weeks). Songs end `isRecorded: true`, feeding the separate Plan Release feature.
- **Key code locations**:
  - Client live path: route `/recording-session` (`client/src/App.tsx:48`) → `client/src/pages/RecordingSessionPage.tsx` (769 ln) → `gameStore.createProject` (`client/src/store/gameStore.ts:899-934`) → `POST /api/game/:gameId/projects`.
  - Server: `server/routes/projects.ts:73-193` (create), `:12-70` (`POST /api/budget-calculation` preview endpoint), `:195-199` (PATCH), `:208` (tour cancel, known TODO C40).
  - Engine weekly ordering (`game-engine.ts:187-206`): `processNewlyRecordedProjects` (191) → `processRecordingProjects` (194, song generation) → releases/charts → `advanceProjectStages` (206, runs last).
  - Song generation: `shouldGenerateProjectSongs` (:2307), `generateWeeklyProjectSongs` (:2323), `getSongsPerWeek` (:2395, hardcoded Single 2 / EP 3), `generateSong` (:2406), `calculateEnhancedSongQuality` (:2544-2684).
  - Stage advancement: `advanceProjectStages` (:4408-4587); stages array `['planning','production','recorded']` (:4430); gates at :4452 (planning→production at `weeksElapsed >= 0`) and :4529-4537 (production→recorded: `allSongsCreated && weeksElapsed>=2` OR `weeksElapsed>=4`).
  - Budget/quality math: `FinancialSystem.calculateBudgetQualityMultiplier` (:1194), `calculateDynamicMinimumViableCost` (:1260), `calculatePiecewiseBudgetMultiplier` (:1318-1382), `calculatePerSongProjectCost` (:1591).
  - Config: `data/balance/economy.json` (`project_costs`, `song_count_cost_system`), `data/balance/quality.json` (budget system, producer/time tiers), `data/balance/projects.json` (`project_durations` — dead, see F6), `data/balance/markets.json` (streaming: 0.85 weekly decay, $0.05/stream, 24-wk cutoff).

## Verified quality formula (engine, `game-engine.ts:2544-2684`)
`base = talent×0.65 + producerSkill×0.35` (skill map 40/55/75/95) → × timeFactor (`{0.7,1.0,1.1,1.2} × (1 + workEthic/100×0.3)`) → × popularity (`0.95 + 0.1×√(pop/100)` = 0.95–1.05) → × fatigue (`0.97^max(0, songCount−3)`) → × budget multiplier (piecewise, dampened 0.7, min 0.65 / max ~1.35+log) → × mood (`0.9 + 0.2×mood/100`) → × variance (skill-based ±35%→±5%; 5% breakout 1.5–2.0x, 5% critical failure 0.5–0.7x) → clamp [25, 98].
The live client preview (`RecordingSessionPage.tsx:241-292`) matches this exactly (variance intentionally excluded from preview); budget multiplier is fetched from `/api/budget-calculation` rather than duplicated. **No drift on the live path.**

## Bugs (confirmed, ranked)

**B1 — No game-ownership check in the entire projects router (cross-tenant).** `server/routes/projects.ts` contains zero `userId` references (verified by grep); `requireClerkUser` authenticates but nothing verifies the game belongs to the caller. Every other data router scopes by owner (e.g. `server/routes/emails.ts:49` — `and(eq(gameStates.id, gameId), eq(gameStates.userId, userId))`). Impact: any authenticated user can create projects in any game (draining that game's money/creative capital), and `PATCH /api/projects/:id` (:195-199) applies raw `req.body` to any project — no ownership check, no field whitelist.

**B2 — Payment and quality are decoupled; both client-trusted.** Deduction uses `projectCost = validatedData.totalCost || validatedData.budgetPerSong || 0` (:151) — never recomputed server-side even though `FinancialSystem.calculatePerSongProjectCost` exists (:1591). Only `budgetPerSong` is bounds-checked (:107-111); `totalCost` is not validated for recording projects. Song quality uses `budgetPerSong × songCount` (`game-engine.ts:2441`). Exploit: send in-bounds `budgetPerSong` (drives quality) with `totalCost: 1` (drives payment) → full-quality songs for $1. Same class as backlog item C40 (tour-cancel refund trusts client, `projects.ts:208` TODO).

**B3 — Mass-assignment on create.** `insertProjectSchema = createInsertSchema(projects).omit({id:true})` (`shared/schema.ts:585`), so a raw request can set `stage: 'production'` (skips the planning week), `songsCreated`, `quality`, or unbounded `songCount`. Large `songCount` also *lowers* the per-song minimum check, since `minPerSong = config.min / songCount` (:104).

**B4 — Create + deduct is non-atomic.** `storage.createProject` (:156) and `storage.updateGameState` (:159) are separate awaits with no transaction. A crash between them yields a project that was never paid for. (The weekly engine path is transactional; creation is not.)

**B5 — Seeded-RNG break in quality variance.** The outlier roll uses raw `Math.random()` (`game-engine.ts:2628`) while the rest of the engine uses seeded `this.getRandom()`. This breaks the documented "deterministic gameplay (seeded RNG)" guarantee precisely on the highest-impact roll (breakout/critical-failure), and blocks deterministic tests of the flow.

**B6 — The "mark songs recorded" pass is a no-op.** `generateSong` creates every song with `isRecorded: true` (:2509), so `processNewlyRecordedProjects` → `processProjectSongRecording` (:2189-2278) filters `!song.isRecorded` and always finds zero. Consequences: the "🎵 recording completed — ready for release" summary notification never fires, per-song `recordedAt` is never set, and the pass rescans *all* `recorded`-stage projects every week for the rest of the campaign. Fix is a design decision: either songs are born unrecorded and flip at the `recorded` stage (making the pass meaningful), or delete the ~90-line pass.

**B7 — Silent failure UX on creation.** `RecordingSessionPage.handleSubmit` catch only `console.error`s (:350-352) — no toast/message when creation fails (e.g., insufficient funds race with weekly burn).

## Falsities — documentation vs code

| # | Claim | Where documented | Code reality |
|---|---|---|---|
| F1 | Time-investment quality multipliers 0.9/1.0/1.08/1.15 | `docs/01-planning/implementation-specs/COMPLETED/[COMPLETE] song-quality-calculation-system.md` | 0.7/1.0/**1.1/1.2** (`game-engine.ts:2567-2572`) |
| F2 | Popularity factor `0.8 + pop/100×0.3` (0.8–1.1x) | same doc | `0.95 + 0.1×√(pop/100)` = 0.95–1.05 (:2581); engine's own comment at :2610 ("0.8x to 1.1x") is also stale |
| F3 | Economies of scale 1.0/0.95/0.85/0.75 | `[COMPLETE] song-budget-quality-calculation.md` | economy.json: 1.0/**0.9**/0.85/**0.8** (thresholds 2/4/7) |
| F4 | Monthly cycle, additive quality (20–100), $0.50/initial stream | `docs/02-architecture/music-creation-architecture.md` (Aug 2025) | Weekly, multiplicative (25–98), $0.05/stream — doc is entirely pre-weekly-conversion; should be marked legacy |
| F5 | `duration_months`, `revenue_per_stream 0.003` | `docs/02-architecture/content-data-schemas.md` | weekly; `markets.json` `revenue_per_stream: 0.05` |
| F6 | `project_durations.single_recording [2,4]`, `ep_recording [4,8]` | `data/balance/projects.json` | **Dead config** — advancement hardcodes ≥2-week gate / 4-week cap (:4531-4537) |
| F7 | Quality method at "line ~1577" | comment `RecordingSessionPage.tsx:242-243` (and `ProjectCreationModal.tsx:334`) | actual location :2544 |
| F8 | Stages "planning, production, released" | `shared/schema.ts` projects.stage comment; `ArtistPage.tsx:90` local type | actual `planning/production/recorded` (:4430); dead components use a third vocabulary (`writing/recording`) |

Accurate: `docs/03-workflows/game-system-workflows.md` (weekly rates Single 2/wk EP 3/wk, 0.85 decay, $0.05/stream — all verified) and the two `[COMPLETE]` quality docs are structurally right (multiplicative model, piecewise budget, variance/outliers, 25–98 clamp) apart from F1–F3.

## Efficiency / smart-minimal-code findings

- **E1 — ~2,000 lines of dead client code**: `client/src/components/ActiveProjects.tsx` (940 ln), `ProjectCreationModal.tsx` (837 ln — only imported by dead ActiveProjects), `ActiveRecordingSessions.tsx` (223 ln). None rendered anywhere (verified: only self-references). ProjectCreationModal re-implements the entire backend budget piecewise curve locally with hardcoded breakpoints and `dampeningFactor = 0.7 // Must match quality.json` (:250, :315) — violating client/CLAUDE.md's "Never duplicate game calculations in client".
- **E2 — Dead engine code that corrupts the RNG stream**: `game-engine.ts:2494-2496` computes `baseQuality/producerBonus/timeBonus` that are never used, and the `getRandom(0,20)` call there consumes a value from the seeded sequence for nothing. These lines are also the only live read of quality.json's `quality_bonus` fields → those config values (0/5/12/20 producer, −10/0/8/15 time) do not affect gameplay.
- **E3 — More dead config**: `quality.json segment_slopes.*_range` (piecewise endpoints hardcoded in `FinancialSystem.ts:1330-1377`; only `diminishing_factor` is read); `economy.json quality_per_song_impact` (superseded by focusFactor; read only by deprecated `calculateBudgetQualityBonus`, still present at `FinancialSystem.ts:1385` + engine delegate :2691).
- **E4 — Hardcoded values that contradict the "configuration-driven" architecture claim**: songs-per-week 2/3 (:2395-2401), quality floor/ceiling 25/98 (:2663-2664), time quality-multipliers (:2567-2572), producer skill map (:2553-2558), planning/production week gates (:4452, :4531-4537).
- **E5 — Semantic misuse of WeekSummary change types**: each *song* creation pushes `type: 'project_complete'` ("Using existing type for now", :2360) so the WeekSummary Projects tab shows one "Recorded ✓" row per song, not per project; stage advancement and song-recorded notifications use `type: 'unlock'` (:4572, :2267).
- **E6 — Log noise**: create handler logs the request body three times (`projects.ts:75, 124, 170`); `generateSong` logs 4 multi-line objects per song (~12 blocks per EP week).
- **E7 — Duplicate cost calculators**: `calculateEnhancedProjectCost` vs `calculatePerSongProjectCost` exist in both engine (thin delegates, :4594/:4617) and FinancialSystem; the former is reachable only from a debug/analysis path (:4321).
- **E8 — Legacy project-level quality**: `advanceProjectStages` adds flat +25 to `project.quality` per stage (:4549); song quality is independent and nothing in the recording→release flow reads it.

## Wiring gaps

- **W1 — No UI surface shows in-progress recording sessions.** `Dashboard.tsx` renders roster/tours/releases/charts/calendar/inbox only. The components that would show session progress are the dead ones (E1). Players see progress only via per-artist song lists (`ArtistPage.tsx:543,572,720`) and WeekSummary change lines.
- **W2 — Creation-week timeline subtlety**: song generation (:194) runs before stage advancement (:206) within the same `advanceWeek`, and projects start in `planning`, so the first advance after creation always yields 0 songs (planning→production happens at the end of it); first songs land on the second advance, and a Single reaches `recorded` no earlier than the ≥2-week gate. Works as coded, but undocumented and easily mistaken for a bug.
- **W3 — Test coverage effectively zero** for this feature: `tests/endpoints/route-manifest.test.ts` covers route registration only; no test references `generateWeeklyProjectSongs`, `advanceProjectStages`, `calculateEnhancedSongQuality`, `getSongsPerWeek`, or exercises the POST handler's budget/capital logic. B5 must be fixed for deterministic engine tests.

## Suggested follow-up order (not executed; review was read-only)
1. **B1** — add ownership checks to the projects router (small, severe; copy the emails.ts pattern).
2. **B2+B3+B4** — one PR: recompute cost server-side via existing `calculatePerSongProjectCost`, whitelist creation fields (title/type/artistId/budgetPerSong/songCount/producerTier/timeInvestment; server sets stage/startWeek/totalCost), wrap create+deduct in a transaction. Characterization-test-first per the Phase 1 convention.
3. **B6** — decide born-recorded (delete the dead pass) vs flip-at-stage (unset at creation); also fixes the missing "ready for release" notification.
4. **B5 + E2** — swap `Math.random()` → `this.getRandom()`, delete the dead vars; unblocks deterministic tests (W3).
5. **E1** — dead-code deletion PR (~2,000 client lines).
6. **F1–F5, F7–F8** — doc/comment corrections; mark `music-creation-architecture.md` legacy. **F6/E3/E4** — decide config-vs-hardcode direction before touching.
7. **W3** — characterization tests for create → generate → recorded (natural "PR-19" following the Phase 1 service-extraction series).

*Environment note: `npm run check` fails in this review container solely because `node_modules` is not installed; no compile assessment was made.*
