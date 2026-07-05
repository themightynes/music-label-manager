# Executive Meetings System — Complete Reference (Post-Revival Canonical)

**Date**: July 4, 2026
**Status**: CURRENT — describes the system as implemented on branch `feat/exec-meetings-revival` (9 PRs, `39ad919`..`4d140c9`), **merged to `main` as PR #119 on July 5, 2026**. Also covers the badge explanation tooltips (legibility Slice A, `af99a29`) that merged the same day via PR #120.
**Supersedes** (as current-state truth; keep these for historical narrative, but do not trust their present-tense claims):
- `docs/98-research/EXECUTIVE_MEETINGS_CASE_FILE_2026-07-03.md` §2 (architecture map) and §4 (choice map / dead-key ledger) — every "dead key" claim there is now obsolete.
- `docs/99-legacy/superseded-2026-07/Actions Implementation Analysis - CORRECTED.md` (archived July 4, 2026) — its dead-key catalog is stale.
- The executive-meetings wireframe specs' badge promises — badges are now whitelisted to what the engine actually implements (`LIVE_EFFECT_KEYS`), so any wireframe promising a dead effect is aspirational, not current.
- `docs/98-research/EXEC_MEETINGS_EFFECT_KEY_DISPOSITIONS_2026-07-03.md` and `docs/01-planning/implementation-specs/COMPLETED/[COMPLETE] executive-meetings-revival-plan.md` remain valid as the **design rationale / historical record** of how this shipped — this document is the as-built reference, not a replacement for their "why."

**Maintenance note**: this document must be updated whenever `LIVE_EFFECT_KEYS` (`shared/engine/processors/ActionProcessor.ts`) or `data/actions.json` changes. The tripwire is `tests/engine/data-lint-effect-keys.test.ts` — if it goes red, an authored key drifted from what the engine implements, and both the data and this doc need reconciling. The same applies to `EFFECT_CHANNEL_DESCRIPTIONS` (same file, co-located with `LIVE_EFFECT_KEYS`): its player-facing tooltip copy quotes balance-JSON magnitudes, and its key set is pinned to the canonical vocabulary by the companion drift-guard `tests/engine/effect-descriptions.test.ts`.

---

## 1. System overview + player-facing flow

1. **Exec/meeting selection** (meeting-relevance Tier 0+1 — PR-1/PR-2 of `[READY] meeting-relevance-tier0-1-plan.md`, July 2026) — `GET /api/roles/:roleId` (`server/routes/executives.ts:12`) strips `TEST_`-prefixed meetings, then selects **one meeting per executive per week** through the pure pipeline in `shared/engine/meetingSelection.ts`: (a) load label state (artists/projects/releases/songs via storage) and derive a `MeetingRelevanceState` snapshot (`deriveRelevanceState`); (b) **filter the role's pool to eligible meetings** — each meeting's optional `requires: RelevanceTag[]` in `data/actions.json` (canonical vocabulary `RELEVANCE_TAGS` in `shared/types/gameTypes.ts`: `artist_signed`, `music_exists`, `release_planned`, `release_out`, `recording_project_active`, `tour_active`) has AND semantics, absent = always eligible; (c) **PR-2: the eligible pool is weighted by situation → category signals** (`weighMeetings`) — `tour_active` boosts category `live`; a `release_planned` release within the tunable recency window boosts `marketing`+`distribution`; `recording_project_active` boosts `production`; an artist signed within the recency window boosts `talent` — each matching signal multiplies that meeting's base weight 1.0 by `relevance_weight` (tunables in `data/balance/progression.json` `weekly_meeting_selection`, HARDCODED fallback in `server/data/gameData.ts` `getWeeklyMeetingSelectionConfigSync`); (d) the same **seeded draw** as before, now weighted (`seededWeightedPick` when tuning is supplied, `seededRandomPick` otherwise — deterministic, seed = `gameId-week-roleId` via `generateMeetingSeed`, `shared/utils/seededRandom.ts`). **Empty eligible pool → the exec sits out the week**: the route answers `meetings: []`, the client renders a calm "nothing needs your call this week" state (card not selectable into a focus slot), and AUTO skips the exec. Without `gameId`+`week` query params the route still returns the full unfiltered pool (unchanged). Data-lint guard: `tests/engine/data-lint-relevance-tags.test.ts` (tags canonical; every role keeps ≥1 meeting eligible under full label state; all `user_selected`/`predetermined` meetings carry `artist_signed`).
2. **Player choice** — the XState machine `client/src/machines/executiveMeetingMachine.ts` walks the meeting's `choices[]`, computes an Impact Preview (mood-modifier-aware, see §4), and emits `{roleId, actionId, choiceId, executiveId?, metadata:{selectedArtistId?, targetScope}}` into `gameStore.selectAction`.
3. **AUTO-select** (no manual pick) — `client/src/services/executiveAutoSelect.ts` scores executives by neglect and picks the **safest** choice in the meeting (§5) — no longer always `choices[0]`.
4. **Week advance** — `advanceWeek` POSTs the selected actions; inside the single week transaction (`advanceWeekService.ts`), `game-engine.ts`'s pipeline runs role meetings **first** (before other actions, releases/charts, delayed effects), then `processDelayedEffects`, then weekly mood/popularity, then exec idle decay.
5. **Engine processing** — `ActionProcessor.processRoleMeeting` (`shared/engine/processors/ActionProcessor.ts:119`):
   - resolves `target_scope` → artist targeting (predetermined = highest-popularity artist; user_selected = `metadata.selectedArtistId` or throw; global = no artist) (`:176-205`);
   - **hoists the executive's current mood** (PR-9) and computes mood modifiers **before** any effect lands (`:207-233`, see §4);
   - applies `effects_immediate` through `applyEffects` (the single effects hub, `:446`), scaled by the mood modifier;
   - banks `effects_delayed` into `gameState.flags[<targetId>-<choiceId>-delayed]` with `triggerWeek = currentWeek + 1`, **also scaled by the mood modifier at queue time** (`:262-281`);
   - updates executive mood/loyalty via `processExecutiveActions` (`:343`, always +5 loyalty; mood = authored `executive_mood` or default +5);
   - pushes a `type: 'meeting'` change entry enriched with `meetingId`, `choiceId`, `choiceLabel`, `appliedEffects`, and (if a mood modifier fired) `moodBand`/`costMultiplier`/`effectMultiplier` (`:296-317`).
6. **Delayed effects** — `processDelayedEffects` (`:872`) runs weekly: decays `pressMomentum` **before** applying this week's triggered entries (ordering rationale in §2), drains any flag entry whose `triggerWeek` matches the current week through `applyEffects` again, then runs each channel's unconsumed-bank expiry check (§2 per-channel).
7. **WeekSummary surfacing** — `client/src/components/WeekSummary.tsx`'s `categorizeChanges` (`:236`) buckets `meeting`/`executive_interaction`/`delayed_effect` into a dedicated **`meetings` bucket** (`:245`), rendered as its own card (`:609+`) — badges are filtered through `LIVE_EFFECT_KEYS ∪ {executive_mood}` (`formatAppliedEffects`, `:117-137`) so a dead/unauthored key can never render.

**Badge explanation tooltips (legibility Slice A — PR #120, `af99a29`, merged July 5, 2026)**: every rendered effect badge is wrapped in `EffectBadgeTooltip` (`client/src/components/executive-meetings/EffectBadgeTooltip.tsx`) — a hover/focus tooltip (Radix, `cursor-help` affordance; badge itself visually unchanged) explaining what the channel does, when it fires, and where it lands. Copy lives in ONE place: the `EFFECT_CHANNEL_DESCRIPTIONS` map (`{title, text}` per key), co-located with `LIVE_EFFECT_KEYS` in `ActionProcessor.ts` (`:111-177`) so descriptions can't drift from the live vocabulary. All four whitelisted badge renderers use the wrapper: `DialogueInterface` (at-choice), `SelectionSummary` (Impact Preview), the `WeekSummary` meetings card, and `ArtistDialogueModal`. Defensive backstop: a key with no description entry (non-canonical, which the whitelist already excludes) renders the badge bare with no tooltip — never a broken popover. Drift-guard: `tests/engine/effect-descriptions.test.ts` enforces that the description map is EXACTLY the canonical set (`LIVE_EFFECT_KEYS ∪ {executive_mood}`, size parity both directions) with non-empty title/text.

---

## 2. The 14 canonical effect keys

`LIVE_EFFECT_KEYS` (`ActionProcessor.ts:62-81`) has 13 entries; `executive_mood` is the 14th canonical key — it is intentionally excluded from the set because it is consumed directly out of `effects_immediate` by `processExecutiveActions`, never reaching the `applyEffects` switch (see the comment at `:56-60`). The data-lint test (`tests/engine/data-lint-effect-keys.test.ts`) enforces `CANONICAL_KEYS = LIVE_EFFECT_KEYS ∪ {executive_mood}` as the total live vocabulary across `actions.json`/`events.json`/`dialogue.json`.

Of the 14, **6 are legacy/base keys** (money, reputation, creative_capital, artist_mood, artist_energy, artist_popularity — pre-existing, unaffected by the revival except `artist_energy`/`artist_popularity`'s C60 all-roster quirk, still present) and **8 are exec-meetings-revival additions**, one per PR:

| Key | Channel | Banks in (`flags.`) | Consumer | Timing | Decay/expiry | Balance knobs (current values) | Badge copy |
|---|---|---|---|---|---|---|---|
| `press_story_flag` | C2 (PR-3) | `pressStoryFlag: boolean` (+ `pressStoryFlagWeek` stamp) | `FinancialSystem.calculatePressPickups` via `ReleaseProcessor.calculatePressOutcome` (`ReleaseProcessor.ts:111-142`) | Next release's press roll only; one-shot, cleared win-or-lose (`:134-139`) | Expires unconsumed after `press_story_flag_expiry_weeks` (8, `data/balance/markets.json:34`) — checked in `processDelayedEffects` (`ActionProcessor.ts:976-985`) | `story_flag_bonus: 0.30` (chance bonus, `markets.json:30`) | "Press Story" |
| `press_momentum` | C2 (PR-3) | `pressMomentum: number` (accumulating, signed) | Same press-pickup roll, **and** `processMarketing`'s `pr_push` action (`ActionProcessor.ts:1092-1102`) | Every press roll while nonzero | **Decays 1/week toward 0 from either side**, run BEFORE this week's triggered delayed effects apply (`ActionProcessor.ts:894-902`) — see decay-ordering note below | `press_momentum_chance_per_point: 0.02` (`markets.json:33`) | "Press Buzz" |
| `quality_bonus` | C1 (PR-4) | `pendingQualityBonus: number` (signed, accumulating) + `pendingQualityBonusWeek` stamp | `SongGenerationProcessor.calculateEnhancedSongQuality` (`SongGenerationProcessor.ts:553-555`) — additive, post-formula, clamped `[25, 98]` | Next recording session's songs (all songs generated that week); zeroed once, in `processRecordingProjects`, after the first week that generates any song (`:87-90`) | Expires unconsumed after `pending_quality_bonus_expiry_weeks` (8, `data/balance/quality.json:6`) | same knob | "Quality" |
| `awareness_boost` | C3 (PR-5) | `pendingAwarenessBoost: number` (signed) + week stamp | `ReleaseProcessor.processPlannedReleases` (`ReleaseProcessor.ts:1042-1141`) — seeds the **first** released song's initial `awareness` this week, clamped at 0 | Next planned release only; consumed once then zeroed (`:1136-1142`) | Expires unconsumed after `pending_awareness_boost_expiry_weeks` (8, `data/balance/markets.json:130`) | `awareness_boost_points_per_unit: 8` (`markets.json:129`) — 1 authored point = 8 awareness points | "Buzz" |
| `variance_up` | C4 (PR-6) | `pendingVariance: number` (signed) + week stamp | `SongGenerationProcessor.calculateEnhancedSongQuality` — widens `baseVarianceRange` and raises outlier thresholds (`SongGenerationProcessor.ts:469-497`) | Next recording session; zeroed once after any song generates that week (`:104-107`, mirrors quality_bonus) | Expires unconsumed after `pending_variance_expiry_weeks` (8, `data/balance/quality.json:9`) | `variance_widen_per_point: 0.5` (+50% band width/point), `outlier_chance_bonus_per_point: 0.02` (`quality.json:7-8`) | "Volatility" (rendered ±magnitude, not signed) |
| `rep_swing` | C4 (PR-6) | Not banked — resolved immediately | Isolated seeded roll inline in `applyEffects` (`ActionProcessor.ts:772-812`), seed = `gameId-week{N}-repswing-{meetingName}-{choiceId}` | Immediate (the meeting week) | N/A — one-shot gamble, no persistence | Maps to a uniform integer in `[-|value|, +|value|]`; not a JSON-configured knob (formula-only) | "Rep Gamble" |
| `award_chances` | C5 (PR-7) | `awardChances: number` (signed, accumulating, **never expires, never decays**) | `AchievementsEngine.calculateCampaignResults` (`AchievementsEngine.ts:57-108`) — campaign-end award roll, isolated seed `${gameId}-awardseason` | Campaign end only | None (persists all campaign) | `award_chance_per_point: 0.08`, `award_chance_cap: 0.8`, `award_score_bonus: 2000`, `award_nominee_pool_threshold: 5` (`data/balance/progression.json:11-14`) | "Prestige" |
| `executive_mood` | C6 (PR-9 authored PR-8) | Not banked — applied immediately | `processExecutiveActions` (`ActionProcessor.ts:386-397`), reads `effects_immediate.executive_mood` directly, bypassing `applyEffects` | Immediate, this meeting's exec row | N/A (mood itself idle-decays separately — see §4) | Default fallback is a flat **+5** when a choice doesn't author this key | "Exec Mood" |

**Decay-before-apply ordering (`press_momentum`)**: `processDelayedEffects` runs the weekly `pressMomentum` decay **before** the triggered-delayed-effects loop (`ActionProcessor.ts:884-902`). This is deliberate: decay-after-apply would erode momentum that lands the *same* week it's banked (a +1 authored value applied and then immediately decayed to 0 six lines later), meaning it could never influence any press roll — the exact silent-no-op bug class this revival exists to eliminate. With decay-first, momentum landing this week survives to be read by next week's press rolls before it decays further.

**`variance_up`/`quality_bonus` zero-out ordering**: both banks are consumed **once per week** (not per-song) inside `SongGenerationProcessor.processRecordingProjects`, after every song generated that week has had a chance to read the flag snapshot — so a batch of songs from one recording session all benefit from a single banked bonus, and the pool is zeroed only after that batch completes.

---

## 3. THE COMPLETE MEETING CATALOG (20 meetings, 59 choices)

Script-verified against `data/actions.json` directly (`node` dump of `weekly_actions[]`): **20 meetings, 59 choices, 13 distinct authored keys** (the 14th, `executive_mood`, is among them — 12 uses across 6 non-CEO meetings). Values below are copied verbatim from the current file — do not hand-edit without re-running the dump.

Legend: **Imm** = `effects_immediate`, **Del** = `effects_delayed`. Money values are dollars; all others are signed points in their channel's units.

### CEO (role_id `ceo`; synthetic — no executive DB row, no mood/loyalty, `executive_mood` never fires)

| Meeting (scope) | Choice | Imm | Del | Strategic identity |
|---|---|---|---|---|
| **ceo_priorities** (global) — "We can only push two initiatives next week—what's the focus?" (copy rewritten state-agnostic in meeting-relevance PR-1; `studio_first` label now "Studio-first to polish our next single") | `studio_first` | money −2000 | quality_bonus +5, artist_mood +2 | Buy studio time now, bank quality for the next session |
| | `content_first` | money −1500, reputation +1 | press_story_flag +1 | Cheapest option; banks a one-shot press angle |
| | `tour_first` | money −4000 | artist_mood −1, awareness_boost +2 | Priciest; trades mood for market-testing buzz |
| **ceo_crisis** (predetermined) — "Your biggest artist just fired their last three backup dancers." | `emergency_auditions` | money −8000, reputation +1 | artist_mood +3 | Expensive but clean — no risk, guaranteed mood payoff |
| | `local_talent` | money −3000 | variance_up +1 | Cheap but rolls the dice on the next recording session |
| | `acoustic_pivot` | creative_capital −1 | artist_mood −2, press_story_flag +1 | Creative-cost pivot; banks a press angle despite the mood hit |
| **ceo_expansion** (predetermined) — "Three major festivals want your act." | `coachella_prestige` | creative_capital −2, artist_popularity +2, reputation +3 | (none) | All-immediate prestige play, no delayed banking |
| | `euro_circuit` | money −12000 | reputation +2 | Expensive, slow-burn reputation build |
| | `profitable_path` | money +25000, reputation −1 | artist_mood −1 | Windfall with a real reputation and mood cost |

### Head of A&R (role_id `head_ar`)

| Meeting (scope) | Choice | Imm | Del | Strategic identity |
|---|---|---|---|---|
| **ar_single_choice** (user_selected) — "Pick the lead single approach for {artist}." | `lean_commercial` | artist_mood −2 | awareness_boost +4 | Biggest guaranteed awareness payoff, at an artist-mood cost |
| | `split_test` | money −1000 | quality_bonus +2, variance_up +1 | Small money cost for a modest quality bank plus risk |
| | `greenlight_weird` | creative_capital −2 | variance_up +1, quality_bonus +4 | Highest quality-bank choice; pairs with variance risk |
| **ar_discovery** (global) — "I found our next superstar… her parents want creative control." | `accept_terms` | money −15000, creative_capital −3, executive_mood +8 | reputation +2, artist_mood −2 | Priciest, biggest exec-mood payoff, real artist-mood cost |
| | `negotiate_compromise` | money −8000 | reputation +1, artist_mood +1 | Middle path — cheaper, smaller but positive payoff on both axes |
| | `pass_on_talent` | reputation −1, executive_mood +2 | (none) | Free of money cost, but a guaranteed reputation hit |
| **ar_genre_shift** (global) — "Rock is dying in the charts. Pivot to pop-rock?" | `chase_trends` | artist_mood −3, executive_mood +8 | awareness_boost +2, artist_mood −1 | Biggest awareness gain, biggest cumulative mood cost |
| | `double_down_rock` | creative_capital −2, money −5000 | award_chances +1 | Only choice banking prestige; costliest immediate spend |
| | `gradual_evolution` | money −2000 | awareness_boost +1, artist_mood +1 | Cheapest, smallest payoff, but net-positive mood |

### CCO (role_id `cco`)

| Meeting (scope) | Choice | Imm | Del | Strategic identity |
|---|---|---|---|---|
| **cco_timeline** (global) — "Timeline is tight—what's the call?" | `rush` | money +1000, executive_mood −2 | quality_bonus **−5** | Trap-fixed: the windfall now costs real quality |
| | `standard` | (none) | (none) | True no-op baseline |
| | `add_revision` | money −1500 | quality_bonus +6, variance_up +1 | Biggest quality bank in the catalog, at a real cost |
| **cco_creative_clash** (user_selected) — "{artist} wants to record live in one take; I want overdubs." | `artist_vision` | (none) | variance_up +1, artist_mood +2 | Free immediate cost; banks risk and artist goodwill |
| | `producer_expertise` | money −3000, artist_mood −2, executive_mood +8 | quality_bonus +5 | Priciest on mood, but a clean quality payoff |
| | `hybrid_approach` | money −1500 | quality_bonus +1, artist_mood +1 | Cheap compromise; smaller payoff on both axes |
| **cco_budget_crisis** (global) — "We're over budget and the vocals still aren't right." | `demand_more_money` | money −10000, reputation +1 | quality_bonus +4 | Most expensive, but reputation AND quality both gain |
| | `creative_solution` | creative_capital −1 | quality_bonus +2 | Cheapest, smaller quality payoff |
| | `release_as_is` | money +2000, executive_mood −2 | quality_bonus **−2**, artist_mood +2 | Trap-fixed: windfall costs quality, though artist mood improves |
| **action_1760807005433** "Employee Effectiveness" (user_selected, custom-authored) | `quick_one` | artist_mood +10, money −3500 | creative_capital +3 | Cheaper, faster, smaller creative payoff |
| | `take_time` | artist_mood +10, money −10000 | artist_mood +10, creative_capital +6 | Pricier; doubles down on mood AND creative capital |

### CMO (role_id `cmo`)

| Meeting (scope) | Choice | Imm | Del | Strategic identity |
|---|---|---|---|---|
| **cmo_pr_angle** (global) — "Choose the story angle for this cycle." | `safe` | money −1000 | press_momentum +1 | Cheapest, smallest guaranteed press buzz |
| | `spicy` | money −1500 | variance_up +1, rep_swing +1 | Costlier; gambles reputation for a shot at upside |
| | `community` | money −800 | reputation +1, artist_popularity +1 | Cheapest of all three; small guaranteed dual payoff |
| **cmo_scandal** (global) — "Paparazzi caught your artist leaving a rival's studio at 3am." | `damage_control` | money −5000, reputation −1 | press_momentum −1 | Costly and still banks negative press momentum |
| | `spin_collaboration` | creative_capital −1, executive_mood +8 | press_momentum +2, artist_mood −1 | Only choice banking positive press momentum, at an artist-mood cost |
| | `ignore_let_fade` | reputation −2 | artist_mood +2 | Free of money/CC cost; biggest immediate reputation hit |
| **cmo_awards** (global) — "Award season is coming. Campaign or save money?" | `full_campaign` | money −20000, executive_mood +8 | award_chances +5 | Priciest, biggest prestige bank in the catalog |
| | `grassroots_push` | money −5000, creative_capital −1 | award_chances +3 | Mid-cost, mid-payoff prestige |
| | `skip_awards` | money +3000, executive_mood −2 | award_chances **−1**, awareness_boost +1 | Trap-fixed: windfall now costs real prestige, though it banks some buzz |
| **cmo_viral** (global) — "A fan remix is going viral on TikTok." | `embrace_remix` | money −2000 | awareness_boost +3, artist_popularity +1 | Cheapest, dual positive payoff |
| | `official_version` | money −8000 | awareness_boost +1, press_story_flag +1 | Priciest; smaller awareness but banks a press flag too |
| | `copyright_strike` | (none) | awareness_boost **−2**, artist_popularity **−1** | Free immediate cost, but a real double negative payoff |
| **cmo_platform_exclusive** (global) — "Spotify wants an exclusive window; Apple will match." | `spotify_exclusive` | money +15000 | awareness_boost +2 | Windfall AND positive awareness — the milder side of the trilemma |
| | `apple_exclusive` | money +18000 | awareness_boost **−1** | Trap-fixed: the bigger windfall now costs real reach |
| | `simultaneous_release` | (none) | awareness_boost +1, reputation +1 | No windfall, but the only choice banking both awareness and reputation |

### Head of Distribution (role_id `head_distribution`)

| Meeting (scope) | Choice | Imm | Del | Strategic identity |
|---|---|---|---|---|
| **distribution_pitch** (global) — "Which track and context for editorial pitch?" | `obvious_single` | (none) | awareness_boost +2 | Free, safe, modest guaranteed awareness |
| | `unexpected_cut` | creative_capital −1 | variance_up +1, press_story_flag +1 | Only choice banking a press flag; pairs with variance risk |
| | `hold` | (none) | award_chances +1 | Free; re-authored (PR-8) to bank prestige instead of a dead key — a genuine third option distinct from `obvious_single` |
| **distribution_politics** (global) — "The curator wants a 'favor' before considering our track." | `play_the_game` | money −10000, reputation −1, executive_mood +8 | awareness_boost +4 | Biggest guaranteed awareness gain, at real cost |
| | `alternative_playlists` | creative_capital −1 | awareness_boost +1 | Cheap, modest, clean payoff |
| | `report_behavior` | executive_mood +2 | award_chances +2, rep_swing +2 | No money cost; banks prestige and gambles reputation upward |
| **distribution_algorithm** (global) — "I found a loophole… ethically gray." | `exploit_loophole` | money −5000 | awareness_boost +3, variance_up +2 | Biggest awareness gain, biggest variance risk pairing |
| | `modified_approach` | money −2000 | awareness_boost +2 | Cheaper, clean, smaller payoff |
| | `organic_only` | executive_mood −2 | awareness_boost +2, artist_mood +1 | No money cost; same awareness as modified_approach plus artist mood, but costs exec mood |
| **distribution_tour_scale** (global) — "Mini-tour scale choice?" | `small_rooms` | money −5000 | money +2000 | Only choice with a delayed money RETURN — smallest, safest bet |
| | `mid_rooms` | money −8000 | award_chances +1, variance_up +1 | Mid-cost; banks prestige with variance risk |
| | `big_bet` | money −12000 | award_chances +2, rep_swing +1 | Priciest; biggest prestige bank plus a reputation gamble |
| **distribution_supply** (global) — "Vinyl shortage; pay 3x for allocation?" | `pay_premium` | money −12000 | awareness_boost +1, reputation +1 | Priciest; only choice with a clean dual positive payoff |
| | `digital_focus` | money +3000 | artist_popularity **−2** | Trap-fixed: the windfall now costs real artist popularity |
| | `delayed_vinyl` | (none) | award_chances +1, artist_mood −1 | Free immediate cost; small prestige gain against a mood cost |

---

## 4. Executive state mechanics

**Schema** (`shared/schema.ts:318-327`): `executives` table — `role`, `level` (default 1, still frozen/unused — see §8), `mood` (default 50, 0–100), `loyalty` (default 50, 0–100), `lastActionWeek`, `metadata` jsonb. CEO has no row (synthetic, client-side).

**Mood/loyalty on use** (`ActionProcessor.processExecutiveActions`, `:343-434`): every non-CEO meeting grants **+5 loyalty** unconditionally (`:401`), and mood changes by the choice's authored `executive_mood` value if present, else a flat **+5** default (`:386-396`). 12 non-CEO choices across `data/actions.json` author `executive_mood` explicitly (all `+8` except `pass_on_talent` and `report_behavior` at `+2`, and `organic_only`/`skip_awards`/`release_as_is`/`rush`/`cco_timeline.rush`/`cmo_scandal.damage_control`... — see the per-choice `executive_mood` values in §3's Imm column; every other choice in every other meeting falls back to the flat +5).

**Idle decay** (`ArtistStateProcessor.processExecutiveMoodDecay`, `:374-473`, run once per week for every executive not used that week):
- **Loyalty**: −5/week once `weeksSinceAction >= 3` and the exec wasn't used this week (`:414-416`) — a flat penalty, not compounding beyond −5/week.
- **Mood**: drifts toward 50 by up to ±5/week (`:420-428`) — only for executives NOT used this week (used executives skip drift so the meeting's own mood delta isn't immediately fought by drift in the same pass).
- Errors are swallowed (`:470-473`) — decay failure never blocks week advancement.

**Mood modifier bands** (`shared/utils/executiveMoodModifier.ts`, config mirrored in `data/balance/progression.json:16-22`):

| Band | Mood range | Cost multiplier (negative `money` only) | Effect multiplier (all other non-money numeric effects) |
|---|---|---|---|
| `disgruntled` | mood < 30 | ×1.25 (costs MORE) | ×1 (unchanged) |
| `neutral` | 30 ≤ mood ≤ 80 | ×1 | ×1 |
| `content` | mood > 80 | ×0.90 (costs LESS) | ×1 |
| `inspired` | mood > 90 | ×0.90 (inherits content's cost break) | ×1.20 (amplified) |

Boundaries are **strict**: mood 29 → disgruntled, 30 → neutral, 80 → neutral, 81 → content, 90 → content, 91 → inspired (pinned by `tests/unit/executive-mood-modifier.test.ts:26-48`). Positive `money` (windfalls) is **never** scaled; `executive_mood` itself is **never** scaled (no feedback loop). Rounding: money uses `Math.round`; every other magnitude uses `sign * Math.round(|value| * multiplier)`.

**CEO exemption**: CEO meetings have no executive row (`roleIdForExec !== 'ceo'` gate at `ActionProcessor.ts:216`), so mood modifiers never apply to CEO choices.

**Hoisted-fetch mechanics**: the executive is fetched **before** `applyEffects` runs (`ActionProcessor.ts:207-233`) specifically so the CURRENT mood (pre-meeting) scales that same meeting's effects — both `effects_immediate` (scaled inline before `applyEffects`, `:250-259`) and `effects_delayed` (scaled at queue time, so `processDelayedEffects` never needs mood awareness later, `:266-271`).

**Shared-util parity rule**: `executiveMeetingMachine.calculateImpactPreview` (client) and `ActionProcessor.processRoleMeeting` (engine) both import the SAME `shared/utils/executiveMoodModifier.ts` functions — they cannot drift by construction. The balance-JSON knobs (`progression.json`'s `exec_mood_modifiers`) are pinned against `DEFAULT_EXEC_MOOD_MODIFIER_CONFIG` by a **tripwire test** (`tests/unit/executive-mood-modifier.test.ts:172-185`): if you tune `progression.json`, you MUST update `DEFAULT_EXEC_MOOD_MODIFIER_CONFIG` in the same PR or this test goes red.

**Deferred**: the <20/<10 mood availability gates (meeting refusal / basic-only restriction) are explicitly NOT implemented — see §8.

---

## 5. AUTO-select behavior

`client/src/services/executiveAutoSelect.ts`:
- **Executive scoring** (`calculateExecutiveScore`, `:133-139`): `(100 - mood) + (100 - loyalty) + rolePriority`, where `rolePriority` is `{ceo:50, head_ar:40, cmo:30, cco:20, head_distribution:10}` — lower mood/loyalty (needs attention) scores higher; role priority tie-breaks.
- **Meeting eligibility** (`findEligibleMeeting`, `:148-154`): skips any meeting with `target_scope === 'user_selected'` (AUTO never picks an artist on the player's behalf) and requires at least one choice.
- **Choice safety scoring** (`scoreChoiceSafety`, `:47-72`, PR-6/C4): any presence of `variance_up` or `rep_swing` in either `effects_immediate` or `effects_delayed` is a **strong penalty** (`-100 - |value|*10`) — AUTO will avoid a gamble whenever a gamble-free choice exists in the same meeting. `award_chances` is explicitly treated as guaranteed-positive value (NOT a gamble) alongside `money`/`reputation`/`creative_capital` — small bonuses for net-positive value, small penalties for costs, as a tie-breaker only.
- **`pickSafestChoice`** (`:78-95`): highest safety score wins; ties resolve to the first matching choice (deterministic).
- **What AUTO never does**: never selects a `user_selected` meeting, never picks a variance/gamble choice over an available safe alternative in the same meeting, never re-derives a live engine key set (the gamble-key list is a local client-side constant, deliberately not imported from `shared/engine`).
- **Propose-then-confirm (meeting-relevance PR-3, spec §6 Option A)**: AUTO no longer commits its picks on click. The one-click AUTO now computes its selections (all logic above unchanged) into a compact review panel (`client/src/components/executive-meetings/AutoSelectReviewPanel.tsx`) via a new `reviewingAutoSelections` machine state — one row per chosen exec (execs sitting out on an empty pool never appear), showing the picked meeting, AUTO's chosen choice with its `EffectBadgeTooltip`-wrapped effect badges (reused from `ChoiceEffects`), and the pick's Creative Capital / money cost. The player then **confirms all** (commits exactly the proposed picks), **cancels** (commits nothing, no focus slots consumed), or **overrides a single row** (drops the proposal and enters the normal manual meeting flow for that exec). The scoring/safest-choice/budget-awareness/empty-pool-skip logic in `executiveAutoSelect.ts` is untouched — PR-3 only inserts a review gate between "picks computed" and "picks committed".

---

## 6. Cross-system hooks

- **Chart milestones → reputation** (`game-engine.ts:applyChartMilestoneBonuses`, `:1067-1119`): the first week a song enters the Top 10 grants `hit_single_bonus` (**+5** reputation, `progression.json` `reputation_system.hit_single_bonus`); the first week it reaches No. 1 grants `number_one_bonus` (**+10**, `.number_one_bonus`) — both can fire the same week for a song that debuts straight to #1. **Once per song per milestone**, tracked via `gameState.flags.chartMilestones[songId] = {hitTop10, hitNumberOne}` (an explicit once-fired flag, deliberately not re-derived from `ChartService`'s `peakPosition`/`isDebut` — see the code comment at `:1056-1065` for why). Competitor rows are skipped.
- **Award roll at campaign end** (`AchievementsEngine.calculateCampaignResults`, `:57-108`): consumes `flags.awardChances` via chance `= min(award_chance_cap, pool * award_chance_per_point)` (0.08/point, capped 0.8), rolled with an isolated seed `${gameId}-awardseason` (NOT the engine's pinned RNG stream). A win adds `award_score_bonus` (**2000**) to the campaign score and the `🏆 Industry Award Winner` achievement; a pool ≥ `award_nominee_pool_threshold` (**5**) without a win gets a `🎗 Award Nominee` consolation entry so an unconsumed pool is never silently invisible.
- **Press flag/momentum → press pickups** (`FinancialSystem.calculatePressPickups`, `:1854-1895`): `story_flag_bonus` (0.30) and `pressMomentum * press_momentum_chance_per_point` (0.02/point) both additively raise the per-pickup roll chance fed into `max_pickups_per_release` (8) independent draws — no new draws are added or removed (RNG invariant preserved).
- **Awareness → streams (2× cap)**: `awareness_boost` seeds a released song's initial `awareness` field, which rides the pre-existing awareness economy — `FinancialSystem.ts:1003` reads `awarenessConfig.max_awareness_modifier ?? 2.0`, the pre-existing cap on how much awareness can multiply weekly streams. The revival does not change this cap; it only feeds the input awareness seeds into a channel that already existed.
- **Variance → quality band/outliers**: `variance_up` widens `SongGenerationProcessor`'s `baseVarianceRange` (×`1 + pendingVariance * 0.5` per point) and raises both the breakout (`0.05 + pendingVariance*0.02`, capped 0.45) and critical-failure (`0.10 + pendingVariance*0.04`, capped 0.90) outlier thresholds — it never adds/removes/reorders an RNG draw, only shifts the thresholds those existing draws are compared against.

---

## 7. Guardrails

- **Data-lint test** (`tests/engine/data-lint-effect-keys.test.ts`): loads `data/actions.json`/`data/events.json`/`data/dialogue.json` and asserts every authored `effects_immediate`/`effects_delayed` key is in `LIVE_EFFECT_KEYS ∪ {executive_mood}`, imported live from the engine (not a hand-copied list) — authoring a new key that the engine doesn't implement fails CI immediately. This is the "authoring a new key requires an engine case first" tripwire.
- **No-dominant-choice test** (`tests/engine/meeting-dominance.test.ts`): asserts no choice weakly-dominates another within the same meeting (better-or-equal on every payoff axis, strictly better on ≥1) — `variance_up`/`rep_swing` are explicitly excluded from the dominance axes (a variance-only difference is a real risk/no-risk fork, not domination). This is what proves the six historical free-money traps (rush, release_as_is, skip_awards, spotify_exclusive, apple_exclusive, digital_focus) are fixed.
- **Golden-master discipline**: `tests/engine/golden-master-fixtures.ts` + snapshots in `tests/engine/__snapshots__/` pin `advanceWeek` byte-for-byte across 8 seeded scenarios (the `actions-week` fixture covers a role meeting + exec decay). Every engine-touching PR in this revival re-blessed snapshots root-caused per changed field — the session log records the golden master's only delta across the whole branch as PR-2's additive meeting fields + importance flip.
- **Isolated-seeded-RNG rule**: any new roll introduced by this revival (`rep_swing`'s reputation gamble, the campaign-end award roll) uses `shared/utils/seededRandom.ts` seeded on `(gameId, week, purpose, meetingName, choiceId)`-style composite strings — **never** `ctx.getRandom`, so the engine's pinned RNG stream and its draw count are completely undisturbed by these new mechanics.
- **SNAPSHOT/flags notes**: all new channel state rides `gameState.flags` (jsonb) — no schema migration, no `SNAPSHOT_VERSION` bump (stayed at 2 throughout the revival; only the delayed-effect flag *key format* changed, not the entry shape — see PR-1 below).
- **Tripwire test** for mood-modifier balance-JSON parity: `tests/unit/executive-mood-modifier.test.ts:172-185` (see §4).
- **Delayed-effect flag-key bug fix** (PR-1, `39ad919`): `ActionProcessor.ts:265` now uses the local `choiceId` variable (previously always read `action.details?.choiceId`, which the client never populated — every delayed-effect key was `{actionId}-undefined-delayed}`, silently colliding across choices sharing an actionId).

---

## 8. Deferred by design (NOT built)

Source of design intent for all of the below: `docs/01-planning/exec_team_context/Exec Team - Actions - COMPLETE MECHANICAL FRAMEWORK.md`.

- **Mood availability gates** (mood < 20 refuses risky actions; < 10 restricts to basic only) — needs meeting-filtering UI; the cost/effect *modifier* bands (§4) are built, but the framework doc's harder availability gates are not.
- **Level/XP** — `executives.level` is written once at creation (default 1) and never incremented; no XP accrual, no level-gated actions (e.g. the Character Bible's "A&R Level 5 unlocks poach from rivals").
- **Success/failure rolls** — every choice's stated effects are guaranteed; there is no per-action success-rate roll anywhere (the framework doc's 60%–95%+ tables by level were never built). `rep_swing` is a magnitude gamble on an already-guaranteed effect, not a success/failure roll on the CHOICE itself — it is a genuinely different mechanic, not a partial implementation of this deferred item.
- **Combo actions** (Coordinated Album Launch, Crisis to Comeback, Talent Factory, Revenue Maximizer) — no scaffolding; the plan explicitly gated these on a success/failure substrate landing first.
- **Failure cascades/streaks** ("Crisis of Confidence" after 3 fails, "Hot Streak" after 3 wins) — depend on the success/failure rolls above, which don't exist.
- **Resource depletion states** (0 creative capital locking creative actions, 0 reputation blacklist) — not built.
- **Meeting-outcome emails** — `EmailGenerator.ts` still has zero exec/meeting awareness; deferred to pair with separate email-CTA work.
- **Side-event wiring** (`data/events.json`) — made key-clean during PR-8's content sweep so it's ready, but the side-event system itself is still not wired into the weekly pipeline.

---

## 9. Known discrepancies (code vs. source docs)

- The case file's wiring-surface note (§6d) speculated `meeting` changes might be reclassified out of `routine` in `changeImportance.ts`. **Code says otherwise**: `meeting` stays hard-classified `routine` (`shared/utils/changeImportance.ts:122`); only `executive_interaction` with a negative `loyaltyChange` was promoted to `notable` (`:113-114`). This is a deliberate, narrower choice than the wiring surface originally sketched — worth confirming with Nes if broader promotion is still wanted.
- The original plan (`COMPLETED/[COMPLETE] executive-meetings-revival-plan.md` §0.1) named the canonical channel key as `awareness_boost` — this matches the shipped code exactly (no drift there), but the plan's proposed canonical set also mentioned keeping `press_momentum` and both are indeed live; no discrepancy, noted here only because the plan's key list undersold that `rep_swing` also became a full 14th mechanism-bearing key rather than "existing six + executive_mood" as its intro paragraph summarized.
- `data/actions.json` contains a custom-authored, non-standard-ID meeting `action_1760807005433` ("Employee Effectiveness") under CCO — it uses a timestamp-style ID rather than the `role_meeting_name` convention every other meeting follows. Not a bug, just an authoring inconsistency worth normalizing if the catalog is touched again.
