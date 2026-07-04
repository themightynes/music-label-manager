# [READY] Executive Meetings Revival — Phased Implementation Plan

**Date**: July 3, 2026
**Status**: READY — dispositions adopted as-is from the worksheet (Nes: "draft the phased implementation plan as-is"); per-key values remain editable during PR review.
**Foundations** (read before any PR):
- `docs/98-research/EXECUTIVE_MEETINGS_CASE_FILE_2026-07-03.md` — validated architecture map (§2), full choice map (§4), wiring surface (§6)
- `docs/98-research/EXEC_MEETINGS_EFFECT_KEY_DISPOSITIONS_2026-07-03.md` — the 71-key disposition table, 6 channels, trap fixes
**Goal**: every executive meeting choice has real, differentiated, *visible* consequences; executives stop being props. Out of scope (deferred, §7): success/failure rolls, Level/XP, combo actions.

---

## 0. Design decisions locked by this plan

1. **Canonical channel keys.** The engine consumes a small canonical key set; the data is normalized to it. New live keys after this plan: `quality_bonus` (C1), `press_story_flag` + `press_momentum` (C2), `awareness_boost` (C3), `variance_up` (C4), `award_chances` (C5), plus the existing six + `executive_mood` (C6). The 64 non-canonical dead keys are **renamed or replaced in `data/actions.json`/`data/events.json`** per the disposition table — the engine does NOT grow a 71-case switch.
2. **Each channel PR is self-contained**: mechanism + its keys' data normalization + badge rendering + tests land together, so every PR is player-visible (house 48-hour rule).
3. **Channel state lives in `gameState.flags`** (jsonb). Snapshot contents change but shape doesn't; `SNAPSHOT_VERSION` stays 2 unless the delayed-effect entry *shape* changes (it doesn't in this plan — only the key string, see PR-1).
4. **New RNG uses isolated seeds** (`shared/utils/seededRandom.ts`, seeded on `(gameId, week, purpose, …)`), never `ctx.getRandom` — zero disturbance to the golden-master-pinned stream. (C4 widens bands consumed at existing draw sites, which re-blesses those scenarios but does not reorder draws.)
5. **Golden-master discipline**: PRs 3–7 re-bless snapshots; every re-bless must be root-caused per changed field (zero unexplained drift), matching the Phase 2–4 precedent.

---

## 1. Phase A — Honesty & foundations (zero engine-behavior risk)

### PR-1 — Truth infrastructure (S)
**Files**: `shared/engine/processors/ActionProcessor.ts`, `shared/utils/dataLoader.ts`, `data/actions.json`
- Fix the delayed-effect key bug: `ActionProcessor.ts:187` `action.details?.choiceId` → the local `choiceId`. (Old `-undefined-delayed` entries in in-flight saves still process — the consumer scans by `triggerWeek`, not key — so no migration.)
- Add `export const LIVE_EFFECT_KEYS: Set<string>` next to `applyEffects`; add a `default:` case that `console.warn`s unknown keys (loud, not throwing).
- Delete `TEST_mood_boost_immediate` from `data/actions.json`.
- Tighten `dataLoader.ts:336`: replace `choices: z.array(z.any())` with a real choice schema (`effects_immediate`/`effects_delayed` as `z.record(z.number())`); make loader failure THROW in dev instead of returning raw data.
**Accept**: tsc clean; existing suite green; a unit test proves an unknown key warns and is dropped; a test pins the new delayed-key format.

### PR-2 — Badge honesty + WeekSummary meetings bucket (S)
**Files**: `client/src/components/executive-meetings/DialogueInterface.tsx`, `client/src/components/SelectionSummary.tsx`, `client/src/components/WeekSummary.tsx`, `shared/utils/changeImportance.ts`, `shared/engine/processors/ActionProcessor.ts` (change-entry enrichment only)
- Filter both badge renderers through `LIVE_EFFECT_KEYS` — delete `formatEffect`'s generic default case. Until channels land, dead badges simply disappear (the game stops lying; interim UX is honest-but-sparser, accepted).
- Add a `meetings` bucket to `categorizeChanges` (`WeekSummary.tsx:167-194`) + a render card (mirror the mood card at :456) for `meeting`/`executive_interaction`/`delayed_effect` — exec decay notices become visible for the first time.
- Enrich the `meeting` change entry (`ActionProcessor.ts:211-215`) with `choiceId`, choice label, and applied-effect deltas so the card has content.
- `changeImportance.ts:112-113`: keep `meeting` routine; promote `executive_interaction` decay warnings (loyalty drop) to notable.
**Accept**: RTL tests for the new bucket; badge-whitelist unit test (a dead key renders nothing); existing test-pinned strings preserved; staged-reveal (Phase 4) untouched — new card slots into an existing stage.

## 2. Phase B — First real consequences

### PR-3 — C2: press story flag + momentum (S/M) — *the proof-of-pattern wire*
**Files**: `ActionProcessor.ts`, `shared/engine/FinancialSystem.ts`, `data/actions.json`, balance JSON
- `press_story_flag` → set `flags.pressStoryFlag`; thread `true` through the two hardcoded-`false` `calculatePressPickups` call sites (`FinancialSystem.ts:1899-1906`, `ActionProcessor.ts:662-668`); consume (clear) on the next release's press roll. `story_flag_bonus: 0.30` already in config.
- Add `press_momentum` (decaying pool, −1/wk) feeding pickup chance; normalize `press_pickups`/`press_bias`/`media_skepticism` data → `press_momentum` values.
- Badge formatter: real copy for both keys.
**Accept**: golden-master re-bless root-caused (press fields only); unit tests for flag consumption + momentum decay; a characterization test proving a `content_first` choice measurably raises next-release press mentions (the C45 `pressMentions` stat now moves from a meeting!).

### PR-4 — C1: next-release quality modifier (M)
**Files**: `ActionProcessor.ts`, `shared/engine/processors/SongGenerationProcessor.ts` (+`ReleaseProcessor` if release-quality path needs it), `data/actions.json`, `data/balance/*.json`
- `quality_bonus` → accumulate `flags.pendingQualityBonus` (signed); consume in `calculateEnhancedSongQuality` (~:448) as additive points post-formula, clamp to existing bounds, zero after consumption; expire after 8 weeks unconsumed (balance knob).
- Data normalization: `quality_potential`/`radio_ready`/`innovation_bonus`/`quality_penalty`/`learning_bonus`/`producer_rep` → `quality_bonus` values per disposition table.
- **Trap fixes shipped here**: `rush` (−5) and `release_as_is` (−2) become real.
- WeekSummary line when a banked bonus is consumed ("Studio time paid off: +6 quality on {song}").
**Accept**: golden-master re-bless (quality fields, root-caused); quality unit tests (the 17-test suite from PR Phase-2 #(SongGenerationProcessor) extended: bank → consume → zero; expiry; negative values; stacking).

## 3. Phase C — The remaining channels

### PR-5 — C3: awareness boost (M) — *biggest bucket, rides a live system*
**Files**: `ActionProcessor.ts`, `shared/engine/processors/ReleaseProcessor.ts` (awareness seed site :650-727), `data/actions.json`, `data/balance/markets.json`
- `awareness_boost` → `flags.awarenessBoost`; applied to the next release's awareness seed (weeks 1–4 build path), then zeroed. Conversion: authored ±1…+3 → awareness points (×8 starting knob, in balance JSON).
- Normalize the 10 C3 keys (`streaming_boost`, `playlist_bias`, `viral_boost`, `playlist_guaranteed`, `viral_kill`(−), etc.) + C3-bound strays (`adds_bonus`, `premium_positioning`, `sustainable_growth`, `chart_stability`, reauthored `reach_limitation`/`mainstream_miss`/`remix_competition`/`discovery_challenge`/`commercial_focus`/`slow_building`/`authentic_growth` negatives/smalls).
- **Trap fixes shipped here**: `spotify_exclusive`/`apple_exclusive` rebalanced (reach vs $/stream trilemma).
- Pairs with gap-analysis finding 4 (awareness surfacing) — if that UI work hasn't landed, include a minimal awareness readout on the release page so the boost is visible.
**Accept**: golden-master re-bless (awareness/stream fields); tests: boost seeds next release only, zeroes after, negative boosts floor at 0 awareness.

### PR-6 — C4: variance/risk + AUTO heuristic (M)
**Files**: `ActionProcessor.ts`, `SongGenerationProcessor.ts` (`baseVarianceRange` :406, outlier thresholds :414-420), `client/src/services/executiveAutoSelect.ts`, `data/actions.json`
- `variance_up` → `flags.pendingVariance`; widens the next song's variance band (+50%/point) and raises outlier chance; consumed then zeroed. Uses the existing in-place draws — no stream reorder.
- Normalize: `rep_swing` (variance applied to that meeting's rep payout via isolated seeded roll), `quality_risk`/`commercial_risk`/`detection_risk`/`blacklist_risk` (downside-tail variants), `sellthrough_risk` (tour variance — smallest slice, may defer to a tour PR if it drags).
- **Auto-select upgrade** (mandatory with this PR): replace always-`choices[0]` (`executiveAutoSelect.ts:96`) with a risk-averse pick (prefer choices without `variance_up`/negative tails) so AUTO doesn't gamble on the player's behalf.
**Accept**: golden-master re-bless; distribution test (variance widens spread over N seeded runs, mean preserved); AUTO test pinning risk-averse selection.

### PR-7 — C5: prestige/award track + chart rep bonuses (M)
**Files**: `ActionProcessor.ts`, `shared/engine/processors/ProgressionProcessor.ts` or chart-update assembly site (`game-engine.ts:1022-1056`), `shared/engine/AchievementsEngine.ts`, `data/balance/progression.json`, `data/actions.json`
- `award_chances` → accumulating `flags.awardChances` pool (no decay); consumed by (a) periodic small reputation ticks and (b) a campaign-end award roll (isolated seeded RNG) feeding a new score component in `AchievementsEngine` — replacing one of the hardcoded-zero axes is a natural pairing (C62 synergy, optional).
- Wire the dead `hit_single_bonus: 5`/`number_one_bonus: 10` config where chart updates are assembled — a #1 finally pays reputation (gap-analysis finding 7's S-slice; belongs here because it shares the "prestige feeds rep" pattern).
- Normalize: `industry_respect`/`prestige`/`prestige_loss`(−)/`niche_dominance`/`relationship_building` → `award_chances`; `international_rep` → `reputation`.
- **Trap fix shipped here**: `skip_awards`.
**Accept**: rep-only paths GM-safe except the chart-bonus wire (re-bless chart scenarios, root-caused); campaign-end test with a seeded award roll.

### PR-8 — Content normalization sweep + C6 activation (S/M, mostly data)
**Files**: `data/actions.json`, `data/events.json`, `data/balance/*.json`
- Apply every remaining MAP-TO-EXISTING and DELETE(+REAUTHOR) row: `authenticity_bonus`→`artist_mood+2` (×3), `fan_loyalty`/`fan_backlash`→`artist_popularity`, `talent_potential`/`collector_loyalty`/`local_favor`/`platform_neutrality`→`reputation`, mood-negatives (`control_issues`/`collab_pressure`/`authenticity_loss`/`timeline_disruption`), deletions (`on_time`/`cost_savings`/`industry_compromise`/`apple_relationship`/`competitor_gain`), tour-mapped keys (`venue_stability`/`sellthrough_hint`/`ticket_bias` — smallest, cut if thin).
- **C6**: author `executive_mood` values into choices where the fiction supports it (the handler exists, zero uses today) — an exec whose advice you reject gets −3, one you back gets +3.
- **Trap fix shipped here**: `digital_focus` (`collector_disappointment` → `artist_popularity −2`).
- Re-author the two flagged meetings: `cmo_pr_angle/community`, `distribution_pitch/hold` (+`obvious_single` differentiation).
- `data/events.json`: same normalization (incl. `playlist_block`→`awareness_boost −`, 4 stale `artist_loyalty`→`artist_energy`) so the file is clean when side events (gap finding 1) get wired later.
- End state: **zero non-canonical keys** in either file; the PR-1 `default:` warn stays silent across a full simulated campaign.
**Accept**: a data-lint test asserting every key in actions.json/events.json ∈ LIVE_EFFECT_KEYS ∪ canonical channel keys (this test then guards authoring forever); badge rendering spot-checks; free-money-trap regression test: no choice's live payoff is strictly dominant within its meeting (assert on the six fixed traps).

## 4. Phase D — Executives matter (case-file slice 5)

### PR-9 — Exec mood → cost & effectiveness modifier (M)
**Files**: `ActionProcessor.ts` (`processRoleMeeting` ~:100), `client/src/machines/executiveMeetingMachine.ts` (impact preview :338-400), `client/src/components/executive-meetings/*`, `data/balance/*.json`
- Hoist the `getExecutive` fetch above effect application; scale numeric effects + delayed queue by the design table (balance JSON knobs): mood <30 ⇒ costs ×1.25; >80 ⇒ ×0.90; >90 ⇒ effect magnitudes ×1.20 ("inspired"). CEO (no row) unmodified. Defer the <20/<10 availability gates (needs meeting-filtering UI — follow-up).
- Client Impact Preview applies the same modifier (shared util in `shared/utils/` so client and engine can't drift); ExecutiveCard shows the active modifier ("Inspired +20%" / "Disgruntled — costs +25%").
- WeekSummary meeting card notes the modifier when it fired.
**Accept**: golden-master re-bless (meeting cost fields); parity test: preview modifier ≡ engine modifier for the same exec state; decay → modifier integration test (neglect an exec 5 weeks → costs rise — **the cultivation loop exists**).

---

## 5. Sequencing & orchestration

```
PR-1 ──► PR-2 ──► PR-3 ──► PR-4 ──► PR-5 ──► PR-6 ──► PR-7 ──► PR-8 ──► PR-9
 (A: honesty)      (B: first wires)        (C: channels + content)      (D: execs)
```
- Strictly sequential at the engine layer (each channel PR re-blesses golden masters; parallel re-blesses collide). PR-2 (client-only) can run parallel to PR-3.
- House pattern: one subagent per PR in an isolated worktree, adversarial review on every engine-touching PR (3–7, 9), orchestrator diff-review before merge, CI green incl. grep-gate. **Merge policy is a per-session grant — re-confirm at execution session start.**
- Sizing: A = 1 session; B = 1 session; C = 1–2 sessions; D = 1 session. Comparable to the Phase 3.5+D6 cadence.

## 6. Global constraints (every PR)
- Atomic week: all new writes take `dbTransaction`; channel state mutates `ctx.gameState` only.
- Isolated seeded RNG for any new roll; never insert `ctx.getRandom` calls into the pipeline.
- Golden-master drift rule: root-cause per changed field or stop.
- Client: spine reads via `useGameState()` façade only; record writes via store actions.
- Tests need Docker Postgres 5433 (`npm run test:db:start`); validate both paths (`npx vitest run tests/client client/src`).
- Existing mood-* tests call `(engine as any).applyEffects` directly — keep the delegate (`game-engine.ts:629-634`) working.
- C60 (artist_energy/artist_popularity global-misapply) — fix opportunistically in PR-1 or the first PR that touches those switch cases (S; mirror the `artist_mood` artistId branch).

## 7. Deferred (explicitly out of scope)
- Success/failure rolls + streaks/cascades (case-file slice 6, L) — data schema exists in the framework doc; requires C4's variance vocabulary and PR-6's AUTO upgrade first.
- Level/XP + level-gated actions (slice 8, L) — save-shape review; Character Bible content.
- Combo actions, resource-depletion states (slice 9, XL).
- Exec mood availability gates (<20/<10) — needs meeting-filter UX.
- Meeting-outcome emails (`EmailGenerator.ts`) — pairs better with the email-CTA work from gap finding 14.
- Side-event wiring (gap finding 1) — PR-8 leaves `events.json` key-clean so this slots in later.
