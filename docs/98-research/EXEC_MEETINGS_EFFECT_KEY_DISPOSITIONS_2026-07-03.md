# Executive Meetings — Effect-Key Disposition Worksheet

**Date**: July 3, 2026
**Status**: PROPOSAL — awaiting Nes review/edits. One recommendation per key; edit dispositions in place.
**Produced by**: design-reasoning agent (Opus) grounded in `EXECUTIVE_MEETINGS_CASE_FILE_2026-07-03.md`; orchestrator-validated: all 71 dead keys present (cross-checked against the deterministic actions.json audit), disposition counts sum to 71, proposed consumer sites verified against the case file's wiring surface.
**Companion docs**: `EXECUTIVE_MEETINGS_CASE_FILE_2026-07-03.md` (§4 choice map, §6 wiring surface), `INTERACTIVITY_GAP_ANALYSIS_2026-07-03.md` (findings 2/6).

---

## 1. Proposed effect channels

Six channels absorb every live-worthy key. All persistent state rides `gameState.flags` (jsonb, no migration; snapshot content change → review `SNAPSHOT_VERSION`). All are consumed at the single `applyEffects` choke point or one named downstream site. "GM" = golden-master re-bless required.

| # | Channel | Stored state (shape) | Consumer site | Duration / decay | Magnitude philosophy | Effort | GM |
|---|---|---|---|---|---|---|---|
| **C1** | **Next-release quality mod** | `flags.pendingQualityBonus: number` (points, signed; accumulates) | `SongGenerationProcessor.calculateEnhancedSongQuality` (~:448) and `ReleaseProcessor` release quality | Consumed by the **next song/release generated**, then zeroed. If none within ~8 weeks, expire (avoid free banking). | Additive points on the 0–98 quality scale. Authored values (±1…+6) map 1:1. A +6 revision is felt; a −5 rush hurts. | M | **Yes** |
| **C2** | **Press / hype momentum** | `flags.pressStoryFlag: boolean` (one-shot) + `flags.pressMomentum: number` (decaying pool) | `FinancialSystem.calculatePressPickups` — thread the flag through the two hardcoded `false` sites; `story_flag_bonus` (0.30) consumer already waits | Flag: consumed by next release's press roll. Momentum: −1/week decay. | story_flag = binary +30% pickup chance. Momentum small (±1–2 chance points/wk). | S (flag) / M (pool) | **Yes** |
| **C3** | **Streaming / playlist boost** | `flags.awarenessBoostPct: number` | Fold into the **awareness economy** — seed `song.awareness` for the next release (awareness-building path, weeks 1–4), which already multiplies weekly streams up to 2× | Applied to next release's awareness seed, then zeroed; awareness decays on its own live curve | Convert authored ±1…+3 into awareness points (e.g. ×8). "guaranteed" = large one-shot; "bias" = modest. | M | **Yes** |
| **C4** | **Outcome variance / risk** | `flags.pendingVariance: number` (widen factor) | `SongGenerationProcessor` `baseVarianceRange` (:406) and/or outlier-roll thresholds (:414–420) | Consumed by next generated song, then zeroed | Multiplier on variance band width. `variance_up:1` ≈ +50% band (wider high AND low); pairs with raised breakout chance. | M | **Yes** |
| **C5** | **Prestige / award track** | `flags.awardChances: number` (accumulating pool) | Campaign-end score axis + reputation events; wire `hit_single_bonus`/`number_one_bonus` (dead config, progression.json) as near-term rep payoff | Persists to campaign end (award season); slow/no decay | Small integer pool; feeds end-of-campaign award roll and/or periodic reputation ticks. `industry_respect`/`prestige` fold in. | M | No (rep-only path) |
| **C6** | **Exec mood delta** (activation) | existing `executives.mood/loyalty` rows | `processExecutiveActions` via the **already-built, unused `executive_mood` handler** | Immediate; existing idle-decay applies | Re-author "the exec is pleased/annoyed" flavor keys into `executive_mood` ±N. No new mechanic. | S | No |

**Net new mechanics actually built: 4** (C1, C3, C4, C5). C2 is a two-line un-stub; C6 activates a built handler.

---

## 2. Full disposition table (all 71 dead keys)

### → CHANNEL C1 (next-release quality mod)
| Key | × | Context | Disposition |
|---|---|---|---|
| quality_bonus | 6 | studio_first / add_revision / producer_expertise / hybrid / demand_more_money / rush(−5) | C1 (signed points) |
| quality_potential | 1 | ar greenlight_weird | C1 (+4) |
| quality_penalty | 1 | release_as_is (−2) | C1 (−2) |
| radio_ready | 1 | cco producer_expertise | C1 (+2, merge into quality) |
| innovation_bonus | 1 | cco creative_solution | C1 (+2) |
| adds_bonus | 1 | ar lean_commercial | **C3** (radio adds = awareness) |

### → CHANNEL C2 (press/hype momentum)
| Key | × | Context | Disposition |
|---|---|---|---|
| press_story_flag | 3 | content_first / acoustic_pivot / unexpected_cut | C2 (cheapest real wire; consumer exists) |
| press_pickups | 1 | cmo spin_collaboration | C2 (+2 momentum) |
| press_bias | 1 | cmo safe | C2 (small momentum) |
| media_skepticism | 1 | cmo damage_control | C2 (negative momentum) |

### → CHANNEL C3 (streaming/playlist/awareness)
| Key | × | Context | Disposition |
|---|---|---|---|
| streaming_boost | 2 | official_version / spotify_exclusive | C3 |
| playlist_bias | 2 | lean_commercial / obvious_single | C3 |
| viral_boost | 1 | cmo embrace_remix | C3 (large one-shot awareness) |
| artificial_boost | 1 | exploit_loophole | C3 (large — pair with C4 detection downside) |
| moderate_boost | 1 | modified_approach | C3 (small) |
| playlist_guaranteed | 1 | play_the_game | C3 (very large one-shot) |
| playlist_bias_next | 1 | distribution hold | C3 (deferred +1 next cycle) |
| niche_success | 1 | alternative_playlists | C3 (modest, + small rep) |
| commercial_potential | 1 | ar chase_trends | C3 |
| viral_kill | 1 | copyright_strike (−2) | C3 (negative awareness) |

### → CHANNEL C4 (variance/risk)
| Key | × | Context | Disposition |
|---|---|---|---|
| variance_up | 3 | greenlight_weird / spicy / unexpected_cut | C4 (widen band) |
| rep_swing | 2 | spicy / big_bet | C4 (variance on reputation outcome) |
| detection_risk | 1 | exploit_loophole | C4 (bad-tail chance for artificial_boost) |
| quality_risk | 1 | ceo local_talent | C4 (widen quality band downward) |
| commercial_risk | 1 | cco artist_vision | C4 |
| sellthrough_risk | 1 | mid_rooms | C4 (tour variance) |
| blacklist_risk | 1 | report_behavior (−2) | C4 (rep downside tail) |
| delay_risk | 2 | split_test / add_revision | **DELETE+REAUTHOR** — no schedule sim; replace with small money cost or C4 |

### → CHANNEL C5 (prestige/award)
| Key | × | Context | Disposition |
|---|---|---|---|
| award_chances | 2 | full_campaign / grassroots_push | C5 |
| industry_respect | 2 | full_campaign / report_behavior | C5 (feeds reputation) |
| prestige | 2 | mid_rooms / big_bet | C5 |
| prestige_loss | 1 | skip_awards (−1) | C5 (negative) |
| niche_dominance | 1 | double_down_rock | C5 (small prestige) |
| relationship_building | 1 | grassroots_push | C5 (fold to award pool) |
| international_rep | 1 | euro_circuit | **MAP-TO reputation** (+2 now) |

### → MAP-TO-EXISTING (reputation / mood / popularity / tours — no new channel)
| Key | × | Context | Disposition |
|---|---|---|---|
| authenticity_bonus | 3 | artist_vision / release_as_is / ignore_let_fade | artist_mood +2 (authenticity pleases the artist) |
| talent_potential | 2 | accept_terms / negotiate_compromise | reputation (signing prestige) |
| collector_loyalty | 2 | pay_premium | reputation (+small) |
| premium_positioning | 2 | apple_exclusive / pay_premium | **C3** (rev-per-stream proxy) |
| fan_loyalty | 1 | embrace_remix | artist_popularity (+small) |
| local_favor | 1 | cmo community | reputation (+1) |
| ticket_bias | 1 | cmo community | tours sell-through — or DELETE |
| venue_stability | 1 | small_rooms | tours (sell-through floor) |
| venue_relationships | 1 | ceo local_talent | tours — or DELETE |
| sustainable_growth | 1 | modified_approach | C3 (small durable awareness) |
| artistic_growth | 1 | gradual_evolution | artist_mood (+1) |
| chart_stability | 1 | gradual_evolution | C3 (small awareness floor) |
| fan_backlash | 1 | copyright_strike (−1) | artist_popularity (−1) |
| control_issues | 1 | accept_terms | artist_mood (− — the signing's downside) |
| collab_pressure | 1 | spin_collaboration | artist_mood (−1) |
| authenticity_loss | 1 | chase_trends | artist_mood (−1) |

### → DELETE + REAUTHOR (mechanic unfelt in 52 weeks; replace with live/channel effect)
| Key | × | Context | Suggested replacement |
|---|---|---|---|
| on_time | 1 | rush | DELETE — the C1 −5 is the cost; no timeline sim |
| staggered_release | 1 | delayed_vinyl | small money savings + tiny C5 |
| timeline_disruption | 1 | delayed_vinyl | artist_mood −1 |
| learning_bonus | 1 | split_test | C1 +2 (the A/B teaches what sells) |
| sellthrough_hint | 1 | tour_first | tours sell-through +small |
| relationship_stability | 1 | negotiate_compromise | artist_mood +1 |
| competitor_gain | 1 | pass_on_talent | deepen existing reputation −1, or DELETE |
| producer_rep | 1 | creative_solution | fold into C1 |
| cost_savings | 1 | digital_focus | DELETE — the +$3000 IS the saving |
| commercial_focus | 1 | skip_awards | C3 small (commercial pivot) |
| slow_building | 1 | organic_only | C3 small durable awareness |
| authentic_growth | 1 | organic_only | C3 small + artist_mood +1 |
| discovery_challenge | 1 | simultaneous_release | C3 −small (no exclusive push) |
| platform_neutrality | 1 | simultaneous_release | reputation +1 (industry goodwill) |
| reach_limitation | 1 | apple_exclusive (−1) | C3 −small (see trap fixes) |
| mainstream_miss | 1 | alternative_playlists (−1) | C3 −small |
| remix_competition | 1 | official_version | C3 −small (cannibalization) |

### → DELETE (pure fiction; the choice's other effects carry it)
| Key | × | Context |
|---|---|---|
| collector_disappointment | 1 | digital_focus (−2) — replaced by artist_popularity −2 / reputation −1 (trap fix), not silently dropped |
| industry_compromise | 1 | play_the_game — reputation −1 already fires |
| apple_relationship | 1 | spotify_exclusive (−1) — no named-entity flags; downside via C3 |

---

## 3. Trap fixes (all 6 free-money traps get real downsides)

| Trap | Free money | Restored downside |
|---|---|---|
| **rush** (cco_timeline) | +$1,000 | C1 −5 becomes real → next release measurably worse |
| **release_as_is** (cco_budget_crisis) | +$2,000 | C1 −2 real; authenticity→mood +2 keeps it a genuine tradeoff |
| **skip_awards** (cmo_awards) | +$3,000 | C5 prestige_loss real → lowers award axis; forgoes award_chances others buy |
| **spotify_exclusive** | +$15,000 | C3 boost real (upside), plus a C3 reach penalty — exclusive window caps discovery |
| **apple_exclusive** | +$18,000 | reach_limitation → real C3 awareness cut; rebalance to Apple (higher $, lower reach) vs Spotify (lower $, higher reach) — a real trilemma with simultaneous |
| **digital_focus** (distribution_supply) | +$3,000 | collector_disappointment → artist_popularity −2 / reputation −1 |

---

## 4. Meeting health after dispositions

All 21 meetings have ≥2 genuinely differentiated choices under this scheme, **except two needing content re-authoring**:
- **`cmo_pr_angle`** — the `community` choice stays thin (ticket_bias→tours is marginal); re-author or add a mood/rep hook.
- **`distribution_pitch`** — `obvious_single` vs `hold` differentiate only if deferred C3 (`playlist_bias_next`) is real; re-author `hold`.

(Both were pre-existing 🎭/🕳 flags in the case file, not regressions of this scheme. `TEST_mood_boost_immediate` deletes from prod data.)

---

## 5. Counts

- CHANNEL-bound: **35** (C1: 6 · C2: 4 · C3: 10 · C4: 8 · C5: 7)
- MAP-TO-EXISTING: **16**
- DELETE+REAUTHOR: **17**
- DELETE outright: **3**
- **Total: 71** ✓
- **New engine mechanics built: 4** (C1, C3, C4, C5) + 2 near-zero-cost activations (C2, C6)

## 6. Engineering flags

- C1–C4 touch `SongGenerationProcessor`/`FinancialSystem` → **golden-master re-bless** (`actions-week` fixture covers a role meeting). C5 rep-only and C6 are GM-safe.
- New RNG (C4, C5 award roll) should use isolated `seededRandom` seeded on `(gameId, week, actionId, choiceId)` — NOT `ctx.getRandom` — to avoid disturbing the pinned stream (case-file §6c).
- **Prerequisite fix**: the delayed-effect flag key bug (`ActionProcessor.ts:187`, `details?.choiceId` → always `undefined`) must land before any channel ships, or same-actionId delayed effects collide.
- New flags in `gameState.flags` change snapshot contents → `SNAPSHOT_VERSION` review.
- Auto-select always picks `choices[0]` — once C4 risk choices are real, upgrade the heuristic or AUTO becomes a trap.
