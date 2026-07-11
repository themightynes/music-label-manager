# [READY] Systems Balance & Integrity Plan

*Status: READY — all forks decided by Nes 2026-07-10 ("spec all — orchestrate an entire session to fix everything; #3 like loss leader view"). Basis: `docs/98-research/SYSTEMS_BALANCE_REVIEW_2026-07-10.md` + the Systems Map recon (PR #155). Branch: `feat/systems-balance-integrity`, stacked on `feat/admin-systems-map` (#155 → this); merge order #152 → #154 → #155 → this.*

## Decisions on record

- **All six recommendations execute.** #7 (creative capital) explicitly untouched.
- **#3 = loss-leader VIEW**: marketing economics unchanged; the game surfaces that marketing rarely pays for itself in direct streams — it pays in charts, standing, awareness.
- Fork picks embedded per slice below (flop definition, energy mapping, mood widening shape, saturation reuse) follow the review's recommended options; deviations require a new checkpoint.

## Golden-master policy (critical, per-slice)

- **Slice 1 must be BYTE-IDENTICAL**: same values, new source. GM double-run with ZERO snapshot deltas is the acceptance gate.
- **Slices 2, 4, 5, 6 change engine outputs**: re-bless the golden master (run with update, then double-run to prove determinism), and the diff must be explainable line-by-line by the slice's mechanism. No RNG draws added, removed, or reordered anywhere (`git diff` audit of `shared/` for `getRandom` call sites).
- Slice 3 is client/content-only: GM untouched.

## Slices (strictly sequential; orchestrator diff-review + full gates between each)

### Slice 1 — Knob liberation (engine/config; Opus)
Move every HARDCODED balance constant flagged in `systemsMapData.ts` into `data/balance/*.json`, and make the two lying config blocks real:
- `base_streams_per_point` (gameData.ts:462 → markets.json `streaming_calculation`), `PLAYLIST_COMPONENT_SCALE`, `MARKETING_SCALE` (divisor+mult), `VARIANCE_RANGE`, `REPUTATION_BASELINE` (FinancialSystem.ts:446-455 → markets.json).
- Breakthrough thresholds: ReleaseProcessor.ts:738-743 reads `markets.json breakthrough_thresholds` (delete the literals; config becomes live — closes C79).
- Song-quality maps: producerSkill 40/55/75/95, time multipliers 0.7/1.0/1.1/1.2, mood factor 0.9+0.2×, popularity factor, fatigue 0.97, variance band/outlier constants (SongGenerationProcessor.ts:395-497 → quality.json, NEW keys — do NOT reuse the existing cost-path `multiplier` keys; name distinctly, e.g. `song_quality_formula.*`).
- Popularity-from-streams `baseThreshold 3000` / `saturationPoint 35` (ReleaseProcessor.ts:861-863 → markets.json).
- Tour: venue×4 / production×2.7 per-city costs, VENUE_SCALING 0.3/0.5/0.003, mood/pop reaction tables (FinancialSystem.ts:461-463,807-808; TourProcessor.ts:338-361 → markets.json `tour_revenue`).
- Wks2-4 marketing-factor coefficients (FinancialSystem.ts:1085-1099 → markets.json).
- Update `systemsMapData.ts`: moved knobs flip `hardcoded: false` + live-import their values; non-edges 4-5 (shadowed configs) move to a "RESOLVED <date>" note or are removed with the map test updated. Update Zod/types for new config keys.
**Gate:** tsc; full suite; GM double-run ZERO deltas; systems-map tests green.

### Slice 2 — Reputation becomes two-way: flop penalty (engine; Opus)
- Definition (deterministic, config-driven): a release FLOPS if `releaseWeekRevenue < flop_revenue_ratio × totalInvestment` (production + marketing), evaluated once at release-week processing, only when `totalInvestment ≥ flop_investment_floor` (don't punish zero-budget drops). New keys in progression.json `reputation_system`: `flop_revenue_ratio` (default 0.10), `flop_investment_floor` (default 10000); consumes the existing dead `flop_penalty` (3).
- Apply: reputation −flop_penalty (clamp ≥0), accumulate into `summary.reputationChanges`, push a change entry (`type: 'reputation'`-adjacent structured entry, description e.g. `📉 "<title>" flopped — the industry noticed`), once per release (flag `flags.flopPenalties[releaseId]`-style, deterministic key, NO Date.now()).
- Tier downgrades now reachable: verify `updateAccessTiers` handles a downgrade week gracefully (it does — assert with a regression test) and that the WeekSummary shows the reputation line (existing aggregated ⭐ line covers it).
**Gate:** tsc; full suite; GM RE-BLESS + double-run; new regression tests (flop fires / doesn't fire below floor / once-only).

### Slice 3 — Loss-leader view (client + help content; Sonnet)
- **PlanReleasePage**: in the marketing budget section, a compact qualitative note ("Marketing rarely pays for itself in streams alone — it buys the opening, the charts, and the record's tail") + tooltip citing charts/awareness/reputation as the real returns. No engine numbers beyond what the page already shows.
- **Help guide** (`helpTopics.ts` `streams-and-money`): add the loss-leader framing to body/rules in the exec voice (e.g. rule: "Marketing is a loss-leader on streams alone — it pays in charts, standing, and the tail. Spend it to break the record, not to buy revenue."), voice-guard tests stay green; word counts within bounds.
- **MetricsDashboard/analytics**: no new computation — reframe the existing song ROI tooltip copy to note marketing's indirect returns.
**Gate:** tsc; client tests incl. help-topics voice guards; live preview verification.

### Slice 4 — Mood → variance widening (engine; Opus)
- Low mood widens the song-quality variance band (volatile, not uniformly worse): `widenFactor = 1 + max(0, (mood_baseline − mood)/mood_baseline) × mood_variance_widening_max`, applied to the variance band alongside the existing pending_variance widening. New quality.json keys: `mood_baseline` (50), `mood_variance_widening_max` (default 0.4). No narrowing above baseline (skill already narrows). The existing 0.9–1.1 mood quality factor stays.
**Gate:** tsc; full suite; GM RE-BLESS + double-run; direction-pinned tests (mood 10 band > mood 50 band; mood 90 band == mood 50 band); Systems Map edge for mood→quality updated to describe both effects.

### Slice 5 — Energy → tour effectiveness (engine; Opus)
- Energy finally consumed: sell-through multiplier `energyFactor = energy_min + (energy_max − energy_min) × (energy/100)` (markets.json `tour_revenue.energy_effectiveness`, defaults min 0.90 / max 1.05, enabled flag). Applied in the sell-through calc alongside popularity/reputation.
- Systems Map: non-edge #1 (energy display-only) becomes a real edge (artist_energy → tour_revenue) with formula + ref; map tests updated. Help guide On the Road: one clause may be added ("a rested act sells the room harder") — keep voice rules.
- NOT in scope: energy drain from touring (logged as follow-up debt).
**Gate:** tsc; full suite; GM RE-BLESS + double-run; direction-pinned tests.

### Slice 6 — Tour-popularity saturation (engine; Opus)
- Tour popularity gains (+1..+7 table) multiply by the SAME saturation multiplier used by streaming popularity (`popularity_saturation` config from Slice 1), `round`, min 0 when the raw gain was > 0 → min 1? **Pick: floor at 0; a sold-out arena for a 90-pop star can legitimately move nothing.** Mood reactions unchanged.
**Gate:** tsc; full suite; GM RE-BLESS + double-run; direction-pinned test (pop 80 tour gain < pop 20 tour gain for same attendance).

### Wrap
- Backlog ledger: close/annotate C79 (resolved by Slice 1); add follow-up entries (energy drain on tour; marketing-attribution structured fields as a future engine surface). Fix arithmetic.
- Spec → `COMPLETED/[COMPLETE]` with deviations recorded; Systems Map header re-dated; DEVELOPMENT_STATUS session log at session end (docs-branch convention).

## Factory rules (from prior arcs, mandatory in every slice prompt)
Anti-stall guard + no-sub-delegation guard; selective `git add`; never touch the GM snapshot except via a deliberate re-bless run; PS 5.1 quoting traps; restart dev server before any live verification after engine merges (tsx has no watch).
