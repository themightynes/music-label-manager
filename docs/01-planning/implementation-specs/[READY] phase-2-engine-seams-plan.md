# [READY] Phase 2: Engine Seams — decompose `shared/engine` + engine-boundary services

*Created: July 2, 2026 — planned from a three-scout code-reading pass against the post-Phase-1 tree (`main` @ Phase 1 complete, PRs #61–#70 merged).*
*Status: READY — not started.*
*Part of the four-phase scaling arc (Phase 0: CI safety net · Phase 1: server seams · Phase 2: engine seams · Phase 3: client state ownership · Phase 4: game feel).*

## Execution status

- ⏳ PR-1 — determinism fixes (seeded RNG everywhere)
- ⏳ PR-2 — golden-master `advanceWeek` characterization harness
- ⏳ PR-3 — `advanceWeekService` (server orchestration extraction)
- ⏳ PR-4 — A&R artists GET cleanup (pure read, canonical array)
- ⏳ PR-5 — `AROfficeProcessor` extraction
- ⏳ PR-6 — `ProgressionProcessor` + weekly-finances extraction
- ⏳ PR-7 — `TourProcessor` extraction + tour-estimate unification
- ⏳ PR-8 — `SongGenerationProcessor` (song gen + quality) extraction
- ⏳ PR-9 — `ProjectStageProcessor` extraction + B6 resolution
- ⏳ PR-10 — `ReleaseProcessor` (releases/streaming/awareness) extraction
- ⏳ PR-11 — `ActionProcessor` + `ArtistStateProcessor` (effects hub) extraction
- ⏳ PR-12 — dead code + dead config sweep
- ⏳ PR-13 — engine-boundary leftovers (PATCH whitelist, defaultRoles, game-state auto-creation routing)

## 0. Ground truth (verified against the working tree, 2026-07-02)

- `shared/engine/game-engine.ts` is **5,116 lines**. `advanceWeek()` (:126–401) is a **22-step ordered pipeline** (§2) with a **single money-update point** (:362) and **no whole-week transaction** — the `dbTransaction` param is threaded into individual steps (`processAction`, `processAROfficeWeekly`, `generateAndPersistEmails`, `advanceProjectStages`, `applyArtistChangesToDatabase`, `processExecutiveMoodDecay`), each managing its own scope. **Do not change transactionality while moving code** (§5).
- Satellites: `FinancialSystem.ts` 2,060 lines (project costs, budget-quality curve, tour economics, weekly burn), `ChartService.ts` 751, `AchievementsEngine.ts` 271, `EmailGenerator.ts` 271, `chartCompetitors.ts` 111; `shared/utils/` (dataLoader 536, producer-tier-utils 374, marketingUtils 292, chartUtils 283, seasonalCalculations 214).
- **The engine is server-authoritative already.** `new GameEngine(` appears only in `server/routes/gameLoop.ts:189`, `server/routes/releases.ts:411`, `server/validation/migration-validator.ts:374`, tests, and debug scripts. **`client/src` imports nothing from `shared/engine`** (verified by grep) — only `shared/utils` date/chart/marketing helpers. Constructor surface is stable: `(gameState, gameData, storage?, seed?)`.
- **Determinism breaks** (the seeded-RNG guarantee is violated in exactly these places):
  - `game-engine.ts:2628` — `Math.random()` for the song-quality outlier roll (breakout/critical-failure) — highest-impact roll in the game
  - `game-engine.ts:3696` — `Math.random()` for tour attendance variance (0.8–1.2×)
  - `game-engine.ts:2494–2496` — dead block reading `quality_bonus` config into unused vars **and consuming a seeded `getRandom()` draw for nothing** (shifts the stream)
  - Wall-clock stamps: `:586`, `:739` (A&R `discoveryTime` ISO strings in flags), `:2257–2258`, `:2535`, `:4558` (song/project `recordedAt`/`generatedAt`/`updatedAt`) — metadata-only today (nothing reads them for gameplay), but they make byte-identical golden-master snapshots impossible unless excluded or injected
  - Everything else uses seeded `this.getRandom()` (:1446) or the deterministic sin-hash (:1659) — verified.
- **Test coverage**: mood system and charts have real coverage; **song generation, stage advancement, and the release pipeline have effectively zero** (recording review W3). There is no golden-master harness for `advanceWeek`. Phase 1's HTTP characterization files (#61–#69) cover the routes, not the engine.
- **Verified dead / near-dead** (from the 2026-07-02 reviews, re-verify at execution): the `:2494–2496` block (E2); `quality.json` `quality_bonus` + `segment_slopes.*_range` (endpoints hardcoded at `FinancialSystem.ts:1330–1377`); `economy.json` `quality_per_song_impact` (read only by deprecated `calculateBudgetQualityBonus` `FS:1385` + delegates `:2691–2717`); `projects.json` `project_durations` (advancement hardcodes ≥2/4-week gates at `:4531–4537`); `testProducerTierIntegration` (:4298–4368, unused); `calculateProjectOutcomes` (:4186–4297, not reachable from `advanceWeek`); `processProjectSongRecording` pass (:2231–2283) is a **no-op** because `generateSong` creates every song `isRecorded: true` (:2509) — recording review B6, needs a design decision (§1 D3).
- **Phase 1 explicitly deferred to Phase 2**: `POST /api/advance-week` orchestration extraction (gameLoop.ts:41–405, two transactions split at :252); the A&R artists GET legacy/fallback block (arOffice.ts:130–407, incl. an **in-GET `Math.random()` write** at :344–356); `POST /api/tour/estimate` unification (tour.ts calls `FinancialSystem` directly — parallel path to the engine's tour math); `GET /api/game-state` auto-creation (games.ts:276–348; `client/src/pages/GamePage.tsx:42` depends on it); `defaultRoles` dead block (`gameCreationService.ts:155–158`, TODO-marked); artists PATCH field whitelist (`artists.ts:212`, TODO-marked).

## 1. Design decisions (defaults chosen; flag disagreement before PR-1)

- **D1 — Engine stays in `shared/`.** It is server-only in practice, but moving to `server/engine/` would churn every import and the test suite for zero behavior gain. Revisit in Phase 3 when client state ownership is decided. Tests and debug scripts keep working unchanged.
- **D2 — Determinism policy.** All *gameplay-affecting* randomness must flow through the seeded `this.getRandom()`. Wall-clock timestamps on *metadata* fields (`recordedAt`, `generatedAt`) stay, but the golden-master harness excludes them from snapshots; the A&R `discoveryTime` flag switches to sim-time (`week N`) since it lives in save-state flags and currently breaks save-restore reproducibility.
- **D3 — B6 resolution: songs are born recorded.** Delete the no-op `processNewlyRecordedProjects`/`processProjectSongRecording` pass (~95 lines) and fire the "recording complete — ready for release" summary notification from `generateWeeklyProjectSongs` when a project's last song is generated. (The alternative — songs born unrecorded, flipped at stage — adds a state transition nothing needs.)
- **D4 — `GET /api/game-state` auto-creation stays** (GamePage depends on it) but the creation path routes through `gameCreationService.createGame` so there is exactly one way a game comes into existence. Response shape unchanged.
- **D5 — Extraction pattern: domain processors + `WeekContext`.** Each extracted module is a class (convention: `server`-style class + exported factory) receiving a `WeekContext` — `{ gameState, summary, gameData, storage, rng, tx }` — so processors never construct their own dependencies and the RNG stream stays ordered. `GameEngine` shrinks toward an orchestrator that builds the context and calls processors in the fixed §2 order. Processor call order is part of the golden-master contract (RNG stream order = behavior).
- **D6 — Transactionality is out of scope.** The per-step tx scopes (and the two-transaction split in advance-week) move verbatim. Wrapping the whole week in one transaction is a real hardening idea — file it as a backlog item, do not mix it into moves.

## 2. The seam map (`advanceWeek` pipeline → target processors)

Pipeline order (:126–401): signing fees → week++/slot reset → A&R weekly → meeting actions → other actions → released projects (revenue/awareness) → newly-recorded pass (B6, deleted) → recording projects (song gen) → lead singles → planned releases → charts → project stages (incl. tour revenue) → delayed effects → mood changes → popularity changes → exec mood decay → weekly burn + salaries → **money update (:362)** → progression gates/tier unlocks → financial summary → emails → insights → campaign completion.

| Target module | Pulls in (approx. lines) | Depends on | Notes |
|---|---|---|---|
| `AROfficeProcessor` | `processAROfficeWeekly` (:550–825, ~276) | storage, gameData, rng | Most isolated; first extraction. Fix `discoveryTime` → sim-time here (D2) |
| `ProgressionProcessor` | `updateAccessTiers`, `checkProducerTierUnlocks`, `checkProgressionGates`, `checkCampaignCompletion` (~210) | gameState only | Pure-ish; easy |
| Weekly finances | `calculateWeeklyBurnWithBreakdown`, salaries glue, `generateFinancialBreakdown`, `generateEconomicInsights` (~300) | FinancialSystem, storage | Keep the single money-update point intact and visible |
| `TourProcessor` | `processUnifiedTourRevenue`, `applyTourPerformanceImpacts`, venue helpers (~270) | FinancialSystem, storage, rng | Includes the `:3696` seeded-variance fix (PR-1 does the swap; move follows) |
| `SongGenerationProcessor` | `generateSong`, `calculateEnhancedSongQuality`, `generateWeeklyProjectSongs`, rate/gating helpers (~500) | FinancialSystem, rng | Contains the `:2628` outlier roll; the quality formula is the game's crown jewel — verbatim move, heaviest review |
| `ProjectStageProcessor` | `advanceProjectStages`, `processRecordingProjects`, B6 deletion (~350 after deletion) | SongGeneration, TourProcessor, tx | Stage machine; hardcoded week gates stay hardcoded (config wiring is Phase 4 material) |
| `ReleaseProcessor` | `processReleasedProjects`, `processLeadSingles`, `processPlannedReleases`, `processSongRelease`, `processProjectSongsRelease`, streaming/awareness calcs, `calculateReleasePreview`, `calculateSophisticatedReleaseOutcome` (~1,250) | FinancialSystem, ChartService, storage | Biggest module; split move across 2 PRs if diffs exceed review budget |
| `ActionProcessor` + `ArtistStateProcessor` | `processAction`, `processRoleMeeting`, `processExecutiveActions`, `processMarketing`, `processArtistDialogue`, `applyEffects`, `applyArtistChangesToDatabase`, mood/popularity/exec-decay (~1,300) | everything above | `applyEffects` (:1151–1380) is the coupling hub — extracted **last**, when every consumer is already a processor with an explicit interface |

`GameEngine` retains: constructor/context assembly, `advanceWeek` orchestration, `getRandom`, delegation shims until Phase 3 removes them.

## 3. PR sequence

*Every PR: `npm run check` green, full vitest green, golden master byte-identical from PR-2 onward (except where a PR's sanctioned behavior change is listed — then the golden master is regenerated in the same PR with the diff explained in the PR body).*

| # | PR | Contents | Risk | Verification |
|---|---|---|---|---|
| 1 | `fix(engine): seed all gameplay randomness` | Swap `:2628` + `:3696` to `this.getRandom()`; delete the `:2494–2496` dead block (stream-shifting); A&R `discoveryTime` → sim-time | Med (RNG stream shifts; statistically identical, per-seed different) | Existing suite green; distribution sanity script for outlier rates (5%/5%) and tour variance bounds |
| 2 | `test(engine): golden-master advanceWeek harness` | Fixture games (empty week · recording week · release week · lead-single week · tour week · A&R week · mood/exec-decay week · campaign-end week) run through seeded `advanceWeek`; snapshot WeekSummary + state delta + persisted-row digests, excluding wall-clock metadata | Low | The harness IS the verification; this is Phase 2's route-manifest equivalent |
| 3 | `refactor(server): advanceWeekService` | gameLoop.ts two-tx orchestration → `server/services/advanceWeekService.ts`; route thins to validate → service → respond; tx boundaries verbatim (D6) | Med | Golden master + sweep-migrations HTTP pins + game-spine integration test |
| 4 | `fix(ar-office): pure-read artists endpoint` | Collapse GET to the canonical `ar_office_discovered_artists` array; delete legacy dual-format handling, the in-GET migration write, and the `Math.random()` fallback write (arOffice.ts:166–356) | Med (response for legacy-flag saves changes) | HTTP characterization first (pin current, incl. the legacy branch); client uses the enriched GET only |
| 5 | `refactor(engine): AROfficeProcessor` | §2 row 1, verbatim move into `shared/engine/processors/` | Low | Golden master byte-identical |
| 6 | `refactor(engine): ProgressionProcessor + weekly finances` | §2 rows 2–3 | Low | Golden master byte-identical |
| 7 | `refactor(engine): TourProcessor + estimate unification` | §2 row 4; `POST /api/tour/estimate` calls the same processor/FinancialSystem path the engine uses (kills the parallel implementation) | Med | Golden master + tour HTTP pins (estimate response byte-identical) |
| 8 | `refactor(engine): SongGenerationProcessor` | §2 row 5, verbatim | Med-High | Golden master + quality-formula unit tests added against the moved code (closes W3 for quality) |
| 9 | `refactor(engine): ProjectStageProcessor + B6` | §2 row 6; delete the no-op recorded pass; wire the ready-for-release notification (D3) | Med (sanctioned behavior change: notification now fires) | Golden master regenerated with the new summary line; stage-machine unit tests added |
| 10 | `refactor(engine): ReleaseProcessor` | §2 row 7 (split into 10a/10b if needed) | Med-High | Golden master byte-identical |
| 11 | `refactor(engine): ActionProcessor + ArtistStateProcessor` | §2 row 8; `applyEffects` gets an explicit interface | High (the hub) | Golden master + mood test suite (already strong) |
| 12 | `chore(engine): dead code + dead config sweep` | `testProducerTierIntegration`, `calculateProjectOutcomes` (re-verify dead), deprecated `calculateBudgetQualityBonus` + `calculateSongCountQualityImpact` delegate pair consolidation, dead config keys (`quality_bonus`, `segment_slopes` ranges, `quality_per_song_impact`, `project_durations`) removed from JSON + loader types | Low | Golden master byte-identical; grep-audit every deletion |
| 13 | `fix(server): engine-boundary leftovers` | artists PATCH `.strict()` whitelist (TODO artists.ts:212); `defaultRoles` deletion (gameCreationService:155); `GET /api/game-state` creation routed through `gameCreationService` (D4) | Low | HTTP characterization pins |

Order constraints: 1 → 2 gate everything (determinism before golden master, golden master before any move). 3–4 are server-side and can interleave with 5–6. 5–10 are ordered by coupling; 11 strictly last among engine moves; 12–13 anytime after 2.

## 4. Conventions (carried from Phase 1)

Characterization-first for every behavior-touching PR (pin current, then flip only sanctioned changes, listed explicitly in the PR body). Verbatim moves — log lines, response shapes, thresholds move character-identical. One mutating agent per checkout; worktrees for parallel non-test work; stacked branches only for true dependencies. Docs on separate `docs/` branches. Merge waits for the vitest CI job. Test DB via `npm run test:db:start`.

## 5. Non-goals

- **No balance or gameplay changes** beyond the three sanctioned ones (seeded RNG per-seed differences, B6 notification, A&R legacy-branch response). Quality formula, decay rates, costs, week gates: byte-identical.
- **No schema/migration changes.** Flags shapes stay (except the A&R `discoveryTime` value format, which is inside a flag the engine owns end-to-end).
- **No client changes** — `client/src` should not appear in any Phase 2 diff (the client doesn't import the engine; previews go through unchanged APIs).
- **No transactionality changes** (D6) — whole-week atomicity is a filed follow-up, not a Phase 2 deliverable.
- **No Phase 3/4 work**: no client state ownership moves, no game-feel features, no config-driven week gates (F6/E4 direction decision deferred).

## 6. Risks & mitigations

- **RNG stream order = behavior.** Any reordering of `getRandom()` calls changes outcomes for a given seed. The golden master pins the stream; processors must be called in the exact §2 order, and PR bodies must state "no RNG-order change" as a review item.
- **Golden-master brittleness.** Snapshot structured data only (summary object, state delta, row digests) — never console output; exclude wall-clock metadata; keep fixtures small and seeded.
- **`applyEffects` hub.** Everything routes through it; that is why it moves last, after each caller is already extracted and its inputs are explicit.
- **Two-transaction advance-week split** (:252) can leave intermediate state on crash — pre-existing; PR-3 moves it verbatim and the backlog gets the atomicity item.
- **Review-doc staleness.** The 2026-07-02 review line numbers predate Phase 2 diffs; every PR re-verifies its targets against the live tree (reality wins).
