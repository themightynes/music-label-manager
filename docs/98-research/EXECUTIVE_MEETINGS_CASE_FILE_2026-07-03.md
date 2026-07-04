# Executive Meetings — Complete Case File

**Date**: July 3, 2026
**Method**: Orchestrator + 3 scouts (docs design-intent sweep, exhaustive actions.json choice map, end-to-end code trace), with orchestrator validation: an independent deterministic parse of `data/actions.json` cross-checked every aggregate number, and every load-bearing code claim (mood table, delayed-key bug, WeekSummary buckets, free-money-trap values) was re-verified directly against source.
**Purpose**: everything needed to plan "bringing executive meetings to life." Read-only analysis; nothing changed.
**Companion**: extends finding 2 and finding 6 of `INTERACTIVITY_GAP_ANALYSIS_2026-07-03.md` with the full choice-level map, the designed-vs-implemented ledger, and the wiring surface.

---

## 1. Executive summary

The Executive Meetings loop **works mechanically** (selection → focus slots → engine → mood/loyalty bookkeeping) but is **hollow at every layer that would make it a game**:

1. **The choices are mostly fake.** Of 62 choices across 21 meetings, only **7 are fully wired**; 45 are partial (real immediate cost, dead delayed payoff); 10 have zero live effect. **Every one of the 71 dead effect keys lives in `effects_delayed`** — the immediate layer (money/rep/CC/mood costs) is almost entirely live, so the game reliably *charges* the player and then silently drops the *reward*. Six choices are free-money traps whose advertised downsides never fire.
2. **The UI promises everything.** Both badge renderers (`DialogueInterface.tsx` `formatEffect` with its generic default case, `SelectionSummary.tsx` Impact Preview) render a plausible badge for every key with zero live/dead distinction.
3. **The executives are props.** Level is written once (1) and never again; mood/loyalty are tracked and decayed but modify nothing; there is no success/failure roll anywhere. The design docs specify all of these in detail (see §3) — none were built.
4. **The outcome is invisible.** `meeting`/`executive_interaction`/`delayed_effect` changes are hard-classified `routine` (`changeImportance.ts:112-113`) and then die in WeekSummary's unrendered `other` bucket. No emails, no toasts. The only visible traces are mood lines and "Executive meeting benefit" revenue lines.

The original design (docs/01-planning/exec_team_context/) is unusually complete — numeric success-rate tables, mood cost modifiers, level scaling 1–10, failure cascades, combo actions. The content in `actions.json` was authored against that design; the engine consumed only the simplest slice.

---

## 2. Architecture map (validated, file:line)

### Data
- `data/actions.json` (994 lines, 21 `role_meeting` entries) loaded via `GameDataLoader.loadActionsData()` (`shared/utils/dataLoader.ts:315-370`). ⚠️ `choices: z.array(z.any())` (`:336`) — choices are NOT deeply validated, and on validation failure the loader **returns raw data anyway** (`:361-369`).
- Server accessors: `server/data/gameData.ts` — `getActionById` (:135), `getChoiceById` (:147), `validateActionData` (:716-750, enforces `target_scope` at boot).
- Types: `TargetScope`/`RoleMeeting` at `shared/types/gameTypes.ts:40-47`; `GameChange.type` union `:346-347`.

### Client selection
- `GET /api/roles/:roleId` (`server/routes/executives.ts:12-65`) strips `TEST_` meetings and deterministically picks ONE meeting per exec per week (`seededRandomPick`, seed = `gameId-week-roleId`, `shared/utils/seededRandom.ts`).
- XState machine `client/src/machines/executiveMeetingMachine.ts` (states :402-630) → emits `{roleId, actionId, choiceId, executiveId?, metadata:{selectedArtistId?, targetScope}}` as a JSON string into `gameStore.selectAction` (`gameStore.ts:768-799`).
- Auto-select (`client/src/services/executiveAutoSelect.ts`): score = `(100-mood)+(100-loyalty)+rolePriority` (:53-59); skips `user_selected` meetings (:68-74); **always takes `choices[0]`** (:96).
- `advanceWeek` POSTs `selectedActions` with `actionType: 'role_meeting'` (`gameStore.ts:844-899`).
- CEO is synthetic (client-side, `executiveService.ts:27-33`) — no DB row, no `executiveId` in its actions.

### Engine processing (inside the single week transaction, `advanceWeekService.ts:75-85,259`)
- Pipeline (`game-engine.ts:138-236`): meetings process FIRST (:182-189), then artist-change flush, other actions, releases/charts, `processDelayedEffects` (:224), weekly mood/popularity, exec idle decay (:236).
- `ActionProcessor.processRoleMeeting` (:84-216): metadata IDs (:91) → `target_scope` resolution (:141-170; `predetermined` = highest-popularity artist, `user_selected` = metadata.selectedArtistId or THROW, `global` = no artist) → `applyEffects` immediate (:181) → delayed queue into `gameState.flags` (:184-197) → `processExecutiveActions` (:209) → pushes `{type:'meeting', description:'Met with {role}'}` (:211-215).
- **`applyEffects` (:320-546) — the live-key switch, no default case**: `money` (:324), `reputation` (:351, clamp 0-100), `creative_capital` (:360, floor 0 only), `artist_mood` (:363, scope-aware per-artist), `artist_energy` (:468, **always all-artists, artistId ignored**), `artist_popularity` (:508, **same all-artists quirk** — backlog C60). Everything else silently dropped, immediate AND delayed (`processDelayedEffects` :548-619 re-enters the same switch).
- `executive_mood` is live only as a special case in `processExecutiveActions` (:261-270), outside the switch; default +5 mood, always +5 loyalty (:275), writes `{mood, loyalty, lastActionWeek}` (:288-296). **Zero choices in actions.json use `executive_mood`** — every meeting gets the flat default.
- Exec idle decay: `ArtistStateProcessor.processExecutiveMoodDecay` (:374-467) — loyalty −5/week after 3+ idle weeks, mood drifts toward 50 ±5/week; errors swallowed (:465-467).

### Feedback (the black hole)
- `changeImportance.ts:112-113`: `meeting` and `executive_interaction` hard-classified **routine** — can never be hero/notable.
- `WeekSummary.tsx` `categorizeChanges` (:167-194) buckets, but only **`revenue` (:305), `mood` (:456), `achievements` (:225)** are rendered. `expenses` change-lines and `other` (which receives `meeting`, `executive_interaction`, `delayed_effect`) are **never rendered** (verified by grep: no other `categorizedChanges.` reads).
- `EmailGenerator.ts`: zero meeting/executive references. No toasts.

### Executive state
- Schema `shared/schema.ts:318-327`: `level` (default 1), `mood` (50), `loyalty` (50), `lastActionWeek`, `metadata` jsonb.
- Level: written once at creation (`gameCreationService.ts:188-201`), read only by `ExecutiveCard.tsx:83,180`. Never incremented, never gates anything.
- Mood/loyalty reads: card badges + auto-select ordering + the engine's own update math. **Never modifies cost, effects, availability, or outcomes.**

---

## 3. Designed vs implemented (from docs/01-planning/exec_team_context/)

The design corpus is complete and CURRENT-labeled. Key docs:
- **`Exec Team - Actions - COMPLETE MECHANICAL FRAMEWORK.md`** — 16 actions × 4 execs with per-level (1–10) costs, success rates (e.g. scouting 60%→95%), failure effects, plus 4 combo actions and global mechanics tables.
- **`Exec Team System Design Document.md`** — focus slots, exec stats, progression philosophy; explicitly NO resignation mechanic (:233).
- **`Executive Team System - COMPLETE - First Implementation.md`** — what v1.0 (Sept 2025) actually built; confirms availability gates were *intentionally skipped* "in favor of future effectiveness modifiers" that then never came.
- **`Actions Implementation Analysis - CORRECTED.md`** — prior catalog of the dead keys (matches this session's findings).
- Also: Character Bible (per-exec level arcs, e.g. A&R Level 5 unlock "poach from rivals"), Wireframe Specs (the effect-badge UI that now over-promises).

| Designed mechanic | Source (framework doc) | Status |
|---|---|---|
| Mood < 30 ⇒ +25% action cost | :385 | ❌ never built |
| Mood < 20 ⇒ refuses risky actions; < 10 ⇒ basic only | :386-387 | ❌ |
| Mood > 80 ⇒ −10% cost; > 90 ⇒ "inspired" +20% effectiveness | :388-389 | ❌ |
| Success rates per action per level (60%–95%+) with authored failure effects | every action table | ❌ no RNG gate anywhere; every choice guaranteed |
| Failure cascade (3 fails ⇒ "Crisis of Confidence" −30 mood) / Hot Streak (3 wins ⇒ +20 mood, +10% success) | :391-401 | ❌ |
| Level 1–10 progression, XP, level-gated actions (e.g. Poach at L5+) | throughout + Character Bible | ❌ level frozen at 1 |
| Combo actions (Coordinated Album Launch, Crisis to Comeback, Talent Factory, Revenue Maximizer) | :357-371 | ❌ no scaffolding (gap analysis: needs success/failure substrate first) |
| Resource depletion states (0 CC locks creative actions, 0 rep blacklist) | :403+ | ❌ |
| Mood/loyalty tracking, +5 on use, idle decay, salary drain, focus slots, one-meeting-per-week seeded randomization, artist mood effects from choices | various | ✅ built and working |

**The pattern**: everything *bookkeeping* was built; everything *consequential* was not.

---

## 4. The complete choice map (all 21 meetings × 62 choices)

Ground truth, script-verified: **21 meetings, 62 choices, 76 distinct effect keys (71 dead), 166 key usages (91 dead)**. Live keys used by actions.json: `money`, `reputation`, `creative_capital`, `artist_mood`, `artist_popularity` (`artist_energy` and `executive_mood` have engine handlers but zero uses in actions.json). Classification: **7 FULLY WIRED / 45 PARTIAL / 10 FULLY DEAD** (of which 2 have no effects at all).

Legend: effects marked ✅ live / ☠ dead. Flags: 💸 free-money trap, 🎭 fake choice, 🕳 all-cost meeting.

### CEO (synthetic exec, no mood/loyalty row)
| Meeting | Choice | Immediate | Delayed | Class |
|---|---|---|---|---|
| **TEST_mood_boost_immediate** ⚠️ test data in prod (API strips `TEST_` prefix from lists, but it ships in actions.json) | yes_boost | ✅mood+5 | — | WIRED |
| | no_boost | — | — | DEAD (empty) |
| | small_boost | ✅mood+3 | — | WIRED |
| **ceo_priorities** (global) | studio_first | ✅$−2000 | ☠quality_bonus+5, ✅mood+2 | PARTIAL |
| | content_first | ✅$−1500, ✅rep+1 | ☠press_story_flag | PARTIAL |
| | tour_first | ✅$−4000 | ☠sellthrough_hint, ✅mood−1 | PARTIAL |
| **ceo_crisis** (predetermined) | emergency_auditions | ✅$−8000, ✅rep+1 | ✅mood+3 | WIRED |
| | local_talent | ✅$−3000 | ☠venue_relationships, ☠quality_risk | PARTIAL |
| | acoustic_pivot | ✅CC−1 | ✅mood−2, ☠press_story_flag | PARTIAL |
| **ceo_expansion** (predetermined) | coachella_prestige | ✅CC−2, ✅pop+2, ✅rep+3 | — | WIRED |
| | euro_circuit | ✅$−12000 | ☠international_rep+2 | PARTIAL |
| | profitable_path | ✅$+25000, ✅rep−1 | ✅mood−1 | WIRED |

### Head of A&R
| Meeting | Choice | Immediate | Delayed | Class |
|---|---|---|---|---|
| **ar_single_choice** (user_selected) | lean_commercial | ✅mood−2 | ☠playlist_bias+2, ☠adds_bonus+5 | PARTIAL |
| | split_test | ✅$−1000 | ☠learning_bonus, ☠delay_risk | PARTIAL |
| | greenlight_weird | ✅CC−2 | ☠variance_up, ☠quality_potential+4 | PARTIAL |
| **ar_discovery** (global) | accept_terms | ✅$−15000, ✅CC−3 | ☠talent_potential+4, ☠control_issues | PARTIAL |
| | negotiate_compromise | ✅$−8000 | ☠talent_potential+2, ☠relationship_stability | PARTIAL |
| | pass_on_talent | ✅rep−1 | ☠competitor_gain | PARTIAL |
| **ar_genre_shift** (global) | chase_trends | ✅mood−3 | ☠commercial_potential+2, ☠authenticity_loss | PARTIAL |
| | double_down_rock | ✅CC−2, ✅$−5000 | ☠niche_dominance | PARTIAL |
| | gradual_evolution | ✅$−2000 | ☠artistic_growth, ☠chart_stability | PARTIAL |

### CCO
| Meeting | Choice | Immediate | Delayed | Class |
|---|---|---|---|---|
| **cco_timeline** (global) | rush 💸 | ✅$+1000 | ☠quality_bonus−5, ☠on_time | PARTIAL — the "−5 Quality" badge is a lie |
| | standard | — | — | DEAD (empty) |
| | add_revision | ✅$−1500 | ☠quality_bonus+6, ☠delay_risk | PARTIAL |
| **cco_creative_clash** (user_selected) | artist_vision | — | ☠authenticity_bonus+2, ☠commercial_risk | DEAD |
| | producer_expertise | ✅$−3000, ✅mood−2 | ☠quality_bonus+3, ☠radio_ready | PARTIAL |
| | hybrid_approach | ✅$−1500 | ☠quality_bonus+1, ✅mood+1 | PARTIAL |
| **cco_budget_crisis** (global) | demand_more_money | ✅$−10000, ✅rep+1 | ☠quality_bonus+4 | PARTIAL |
| | creative_solution | ✅CC−1 | ☠innovation_bonus+2, ☠producer_rep | PARTIAL |
| | release_as_is 💸 | ✅$+2000 | ☠authenticity_bonus, ☠quality_penalty−2 | PARTIAL |
| **action_1760807005433** "Employee Effectiveness" (user_selected; custom-authored) | quick_one | ✅mood+10, ✅$−3500 | ✅CC+3 | WIRED |
| | take_time | ✅mood+10, ✅$−10000 | ✅mood+10, ✅CC+6 | WIRED |

### CMO
| Meeting | Choice | Immediate | Delayed | Class |
|---|---|---|---|---|
| **cmo_pr_angle** 🕳 (global) | safe | ✅$−1000 | ☠press_bias | PARTIAL |
| | spicy | ✅$−1500 | ☠variance_up, ☠rep_swing | PARTIAL |
| | community | ✅$−800 | ☠local_favor, ☠ticket_bias | PARTIAL |
| **cmo_scandal** (global) | damage_control | ✅$−5000, ✅rep−1 | ☠media_skepticism | PARTIAL |
| | spin_collaboration | ✅CC−1 | ☠press_pickups+2, ☠collab_pressure | PARTIAL |
| | ignore_let_fade | ✅rep−2 | ☠authenticity_bonus | PARTIAL |
| **cmo_awards** (global) | full_campaign | ✅$−20000 | ☠award_chances+3, ☠industry_respect+2 | PARTIAL |
| | grassroots_push | ✅$−5000, ✅CC−1 | ☠award_chances+1, ☠relationship_building+2 | PARTIAL |
| | skip_awards 💸 | ✅$+3000 | ☠commercial_focus, ☠prestige_loss−1 | PARTIAL |
| **cmo_viral** 🕳 (global) | embrace_remix | ✅$−2000 | ☠viral_boost+3, ☠fan_loyalty+2 | PARTIAL |
| | official_version | ✅$−8000 | ☠streaming_boost+2, ☠remix_competition | PARTIAL |
| | copyright_strike | — | ☠viral_kill−2, ☠fan_backlash−1 | DEAD |
| **cmo_platform_exclusive** (global) | spotify_exclusive 💸 | ✅$+15000 | ☠streaming_boost+2, ☠apple_relationship−1 | PARTIAL |
| | apple_exclusive 💸 | ✅$+18000 | ☠premium_positioning, ☠reach_limitation−1 | PARTIAL — strictly dominates Spotify AND simultaneous |
| | simultaneous_release | — | ☠platform_neutrality, ☠discovery_challenge | DEAD |

### Head of Distribution
| Meeting | Choice | Immediate | Delayed | Class |
|---|---|---|---|---|
| **distribution_pitch** 🎭 (global) | obvious_single | — | ☠playlist_bias+2 | DEAD |
| | unexpected_cut | ✅CC−1 | ☠variance_up, ☠press_story_flag | PARTIAL |
| | hold | — | ☠playlist_bias_next | DEAD — obvious_single ≡ hold after stripping |
| **distribution_politics** (global) | play_the_game | ✅$−10000, ✅rep−1 | ☠playlist_guaranteed, ☠industry_compromise | PARTIAL |
| | alternative_playlists | ✅CC−1 | ☠niche_success+2, ☠mainstream_miss−1 | PARTIAL |
| | report_behavior | — | ☠industry_respect+2, ☠blacklist_risk−2 | DEAD |
| **distribution_algorithm** 🕳 (global) | exploit_loophole | ✅$−5000 | ☠artificial_boost+3, ☠detection_risk+2 | PARTIAL |
| | modified_approach | ✅$−2000 | ☠moderate_boost, ☠sustainable_growth | PARTIAL |
| | organic_only | — | ☠authentic_growth, ☠slow_building | DEAD |
| **distribution_tour_scale** 🕳 (global) | small_rooms | ✅$−5000 | ☠venue_stability | PARTIAL |
| | mid_rooms | ✅$−8000 | ☠prestige, ☠sellthrough_risk | PARTIAL |
| | big_bet | ✅$−12000 | ☠prestige+2, ☠rep_swing | PARTIAL |
| **distribution_supply** (global) | pay_premium | ✅$−12000 | ☠collector_loyalty+2, ☠premium_positioning | PARTIAL |
| | digital_focus 💸 | ✅$+3000 | ☠cost_savings, ☠collector_disappointment−2 | PARTIAL — **trap missed by prior analysis** |
| | delayed_vinyl | — | ☠staggered_release, ☠timeline_disruption | DEAD |

### Dead-key usage ranking (top of 71)
`quality_bonus` ×6 · `press_story_flag` ×3 (has a real waiting consumer — see §5) · `variance_up` ×3 · `authenticity_bonus` ×3 · `playlist_bias` ×2 · `award_chances` ×2 · `talent_potential` ×2 · `industry_respect` ×2 · `streaming_boost` ×2 · `premium_positioning` ×2 · `prestige` ×2 · `rep_swing` ×2 · `delay_risk` ×2 · then a ×1 long tail of 58 keys.

### Corrections to INTERACTIVITY_GAP_ANALYSIS numbers
- "77 effect keys" → **76** distinct keys in actions.json (71 dead confirmed exactly).
- "8 choices that do nothing" → **10** choices with zero live effect (8 with dead-only payload + 2 with no effects at all: `TEST/no_boost`, `cco_timeline/standard`).
- "7 all-payoff-dead meetings" → **not reproducible**; strictest honest count is **4** meetings where every choice is dead or pure-cost (`cmo_pr_angle`, `cmo_viral`, `distribution_algorithm`, `distribution_tour_scale`). Treat "7" as an overcount from a looser heuristic.
- Free-money traps: prior list of 4 + **`cmo_platform_exclusive/spotify_exclusive`** and **`distribution_supply/digital_focus`** = **6 total**.
- `data/dialogue.json` (27 choices): all keys live ✅. `data/events.json`: many dead keys incl. `playlist_block`, 4 stale `artist_loyalty` uses (3 delayed + 1 immediate) — moot while events are dead (gap-analysis finding 1).

---

## 5. New defects found this session (beyond the gap analysis)

1. **Delayed-effect flag key bug** — `ActionProcessor.ts:187`: `` `${action.targetId}-${action.details?.choiceId}-delayed` `` but the client puts choiceId in `metadata`, never `details` → every key is `{actionId}-undefined-delayed`. Two same-actionId delayed-effect meetings in one week would overwrite each other (theoretical today — one meeting per exec per week — but load-bearing the moment delayed effects become real). Fix to the local `choiceId` variable when touching this code.
2. **`TEST_mood_boost_immediate` ships in production data** — the roles route strips `TEST_`-prefixed meetings from lists (`executives.ts:31-33`), but it's live content in the file and reachable by id.
3. **WeekSummary's `expenses` change-bucket is also unrendered** (not just `other`) — only revenue/mood/achievements buckets render. The expense *total* shows elsewhere; the line items don't.
4. **Choices are schema-unvalidated** (`dataLoader.ts:336` `z.any()`) and the loader falls back to raw data on validation failure (`:361-369`) — nothing would catch a typo'd effect key at authoring time (which is arguably how 71 dead keys accumulated silently).
5. **`press_story_flag` double-dead** (carried from gap analysis, reconfirmed): `FinancialSystem.calculatePressPickups` has a real `story_flag_bonus` consumer, but both live call sites hardcode `false` — the single cheapest "make a dead key real" wire in the system.

Existing logged debt that any plan must absorb: **C60** (`artist_energy`/`artist_popularity` in `applyEffects` ignore `artistId` — always hit the whole roster).

---

## 6. Wiring surface (exactly what a plan touches)

**(a) Make dead keys live** — single choke point: add cases to the `applyEffects` switch (`ActionProcessor.ts:322-544`); both immediate and delayed route through it (dialogue too). Add a `default:` warn so future dead keys are loud. New persistent state rides `gameState.flags` (jsonb, no migration) but changes snapshot contents → `SNAPSHOT_VERSION` (=2, `shared/schema.ts:514`) review. New `GameChange` types must be added to the union (`gameTypes.ts:347`) and to `changeImportance.ts` (its `assertNever` forces the update) and given a WeekSummary bucket. Natural consumers for the multi-use keys: `quality_bonus` → `SongGenerationProcessor`/`ReleaseProcessor` quality math; `press_story_flag` → thread `true` through the two hardcoded call sites; `playlist_bias`/`streaming_boost` → `FinancialSystem` streaming outcome; `award_chances`/`prestige`/`industry_respect` → reputation events.

**(b) Exec mood modifies outcomes** — the exec row is currently fetched only AFTER effects apply (`:247` vs `:181`). Hoist `ctx.storage.getExecutive(executiveId, dbTransaction)` to the top of `processRoleMeeting` (~:100) and scale numeric effects before the `applyEffects` call and the delayed-queue write. CEO has no exec row (skip). The client Impact Preview (`executiveMeetingMachine.ts:338-400`) must apply the same modifier or the UI lies in a new way. Balance knobs belong in a JSON balance file per house style.

**(c) Success/failure rolls** — two options: (i) `ctx.getRandom(0,1)` — shifts the seeded stream for everything downstream, ALL golden-master snapshots re-bless; (ii) an isolated deterministic roll via `shared/utils/seededRandom.ts` seeded on `(gameId, week, actionId, choiceId)` — zero stream disturbance, same pattern the meeting-randomization route already uses. **(ii) is the recommended pattern.** Surface the outcome on the `summary.changes` entry (:211-215). Data needs a `success_rate`/`failure_effects` schema in actions.json (currently `z.any()`, so tighten validation at the same time).

**(d) Surface outcomes in WeekSummary** — render-only: add a `meetings` bucket to `categorizeChanges` (`WeekSummary.tsx:167-194`) + a card (mirror the mood card at :456); the data already arrives (`executive_interaction` carries `moodChange/newMood/loyaltyBoost/newLoyalty`). Reclassify from hard-`routine` in `changeImportance.ts:112-113` where deserved. Richer entries (choice label, effect deltas) come from enriching the change objects at `ActionProcessor.ts:211-215/299-306`. Meeting-outcome emails → `EmailGenerator.ts` (zero exec awareness today).

**Badge honesty (S, ships alone)** — export a `LIVE_EFFECT_KEYS` whitelist next to `applyEffects`; filter both renderers (`DialogueInterface.tsx:42-80` — delete the generic default case; `SelectionSummary.tsx:356-398`). Until real wiring lands, this stops the UI promising dead effects.

### Constraints checklist
- **Golden master**: any engine change re-blesses `tests/engine/__snapshots__/`; the `actions-week` scenario (fixture line ~396) covers a role meeting + exec decay; `empty-week` pins pure decay.
- **Atomic week**: all meeting processing already runs inside the one `db.transaction` with `FOR UPDATE`; new writes must take `dbTransaction`.
- **Seeded RNG discipline**: prefer isolated seeds (§6c) over `ctx.getRandom` insertions.
- **Save shape**: exec rows and `gameState.flags` are in the snapshot (siblings of `gameState`); delayed-effect entry shape changes ⇒ `SNAPSHOT_VERSION` bump + migration.
- **Auto-select** always picks `choices[0]` (`executiveAutoSelect.ts:96`) — any risky/safe choice design must upgrade this heuristic or AUTO becomes a trap.
- **Tests pinning current behavior**: `test-executive-meeting-machine.test.ts`, `action-validation.test.ts`, the seven mood-* engine tests (some call `(engine as any).applyEffects` directly), `advance-week-atomicity.test.ts`. Docker Postgres on 5433 required.

---

## 7. Building blocks for the plan (effort-ranked, composable)

| # | Slice | Size | Risk | What it buys |
|---|---|---|---|---|
| 1 | **Badge whitelist** (stop lying) + delete `TEST_` meeting + fix delayed-key bug + `default:` warn in applyEffects | S | zero engine behavior change | Honesty floor; makes all later work legible |
| 2 | **WeekSummary meetings bucket** + enriched change entries | S | UI-only | Meetings visibly *happened*; exec neglect (decay notices) surfaces |
| 3 | **`press_story_flag` wire** (consumer exists, flip two hardcoded `false`s) | S | golden master (FinancialSystem) | First real delayed payoff; proof of pattern |
| 4 | **`quality_bonus` wire** (6 uses; consume in song-quality math, decaying flag) | M | golden master | The single most-promised effect becomes real; un-fakes cco meetings |
| 5 | **Exec mood → cost/effectiveness modifier** (design table exists: <30 +25% cost … >90 +20% effect) | M | engine + client preview parity | Mood/loyalty bookkeeping finally matters; cultivation loop is born |
| 6 | **Success/failure rolls** (isolated seeded RNG; authored rates from the framework doc; failure effects) | L | data schema + engine + UI | Choices become bets; unlocks streaks/cascades later |
| 7 | **Remaining key triage**: wire the ~10 multi-use keys (playlist_bias, award_chances, streaming_boost, prestige, industry_respect…), delete/replace the ×1 flavor tail in actions.json | M–L cumulative | per-key | Every meeting has ≥2 genuinely differentiated choices |
| 8 | **Level/XP** (accrue on use/success; level-gate the framework doc's per-level action tiers) | L | save shape review | Long-game exec progression; Character Bible content activates |
| 9 | Combo actions, resource-depletion states | XL | needs 6 first | Endgame depth (design doc files under Future) |

**Content decision needed from Nes** (not code): for the 58 single-use flavor keys, wire-vs-rewrite — it is almost certainly cheaper to *re-author* those choices against the live key set + a small set of new real mechanics (quality_bonus, press_story_flag, playlist_bias, award_chances, exec_mood) than to build 58 bespoke mechanics. The choice map in §4 is the worksheet for that pass.

---

## 8. Sources
- Scout reports (this session): docs design-intent sweep; exhaustive choice map (script-validated: 21/62/76/71 exact); end-to-end code trace (all load-bearing claims re-verified by orchestrator).
- `docs/98-research/INTERACTIVITY_GAP_ANALYSIS_2026-07-03.md` findings 2, 6 (+ corrections in §4 above).
- `docs/01-planning/exec_team_context/*` (9 docs — design canon).
- `docs/09-troubleshooting/technical-debt-backlog.md` C60–C65.
