# Executive Delegation & Trust

**Status:** EXECUTED (Tiers 1+2) + SUCCESSOR CONTENT SESSION IN PROGRESS. This document was the design brief for the Delegation & Trust arc; it is now maintained as **current truth** (full in-place rewrite, 2026-07-13). The build shipped, and the meeting-content working session this doc pointed at as its successor **has since happened** — producing the v3 scenario pools and the Engine Verbs mechanism arc (§14). The current gating step is **Nes's v3 review pass** at `/admin/mac-pool-review`; the successor work after that is the **Content Integration Wave** (§13).
**EXECUTION STATUS (Tiers 1+2, executed 2026-07-12 on `feat/exec-delegation-trust`, merged as #167):** config extraction, autonomous resolution (engine re-derivation, loyalty-band + mood-risk-appetite choice policy, golden-master coverage), CEO structural changes (`ceo_crisis` migration + predetermined targeting, inaction-penalty removal), escalation (urgent-meeting-ignored → mandatory crisis), and the WeekSummary autonomous-resolution digest all shipped; verifier findings (a flaky characterization test, a delayed-effect key collision, a predetermined-event gating regression, a self-serving-hint schema gap) all fixed pre-merge, and the round-3 live-playtest neglect-economics reversal (§4.1/§4.5) landed. Suite 1,868 → 1,933. **Tiers 3 (Level/XP, §6) and 4 (Portfolios, §7) remain future arcs — designed here, NOT built.**
**POST-EXECUTION (the successor content session, 2026-07-12 late session, on `content/meeting-content-session` — UNMERGED pending designer review):** the content session that was reserved here as future scope **happened live** and grew three waves: (1) decided-mechanics slices (C92 `outcome_summary` field, the loyal-scorer `auto_safe_scoring` fix, `flop_revenue_ratio` 0.10→0.30, CC-from-chart-milestones live, a v2 stakes revision of `data/actions.json` incl. the **C91 `self_serving_hint` sweep — DONE**, real escalation prose replacing stubs, and escalation router arrays); (2) a **v3 ground-up authoring** decision — 98 scenarios across 7 pools with a designer-review surface at `/admin/mac-pool-review`; (3) the **Engine Verbs Tier 1+2** mechanism arc (13 new effect keys + targeting directives + `requires` grammar + scheduled-events queue), which is engine-live but content-unused. §4.3.1, §5.3, §8, §13, and the new §14 record what this changed.
**Author:** game-design architect (for Nes)
**Date:** 2026-07-13 (rewritten as current truth; original brief 2026-07-12)
**Depends on / builds atop (all merged to main):** exec-meetings revival (#119/#120), meeting-relevance Tier 0+1 (#122–#132), Tier 2 reactive meetings + side events (#133–#145), mandatory side events "Crisis on the Desk" (#162), volatility-economy + balance-integrity arcs (#156–#164). **Post-execution work (§13/§14) lives on the unmerged `content/meeting-content-session` branch.**
**Canonical as-built references:** `[REFERENCE] executive-meetings-system-complete-reference.md` (system truth), `COMPLETED/[COMPLETE] engine-verbs-plan.md` (the verbs arc — mechanism detail for §14), `Exec Team - Character Bible.md` (voice/level arcs), `Exec Team System Design Document.md` (the reversed original vision), `[COMPLETE] tier2-reactive-meetings-and-side-events-plan.md` (crisis pipeline + fork-doc conventions), `[READY] mandatory-side-events-plan.md` (pending-crisis pipeline).

> **Reading order:** §1 (why) → §2 (the one law) → §3 (stats) → §4 (autonomous resolution — the heart, as-built) → §5 (escalation, as-built) → §8 (CEO track) → §14 (Engine Verbs capability surface — what the successor session unlocked) → §13 (what the content session produced + what the Content Integration Wave still owes). §6/§7 are the still-future Tiers 3/4. §10 is the golden-master policy. §11 is tier sequencing. §12 is the fork ledger (decided history).

---

## 1. Vision & reversal statement

**The differentiator we are building toward:** *You manage the label through your executive team, not the artists directly.* Today the player micromanages artists and treats executives as effect-dispensers you optionally poke for a bonus. This arc pivots the core loop so that the **executive team is the primary interface to the label**, each exec is a *person with interests* whose autonomy you shape through trust, and the CEO's scarce focus slots are spent deciding **where to intervene vs. where to let your team run**.

**✅ DECIDED — Formal reversal of the original vision.** The original `Exec Team System Design Document.md` §6 states as its first design principle:

> "Focus on optimization over management — **Executives are tools to optimize, not people to manage.**"

That principle is **formally reversed** by this arc. Executives become people you manage: their loyalty, mood, and growth determine how the label runs when you are not looking, and the central tension becomes *delegation and trust*, not *bonus optimization*. This reversal is deliberate and recorded here as the design's founding decision.

**✅ DECIDED — The original's rejections STAY rejected** (they were correct; only the "tools not people" framing flips). This arc does **not** add, now or as a consequence:
- No resignation / quitting (execs never leave).
- No hiring / firing of the core four (head_ar / cmo / cco / head_distribution).
- No inter-exec rivalries or power struggles (each exec remains independent — no combos, no conflicts).
- No success/failure RNG rolls on choices (every choice's stated effects remain guaranteed; `rep_swing` remains the only magnitude gamble and is unchanged).
- No stress / burnout meter.

These are re-affirmed in §13.

---

## 2. The three-lane rule (the one law of the redesign)

**✅ DECIDED.** Every weekly offering an executive or the world puts in front of the CEO belongs to exactly one of three lanes, and each lane has a different **lapse semantics** — what happens when the player does *not* spend a focus slot on it:

| Lane | What it is | Delegable? | Unchosen (lapse) semantics | What a focus slot buys |
|---|---|---|---|---|
| **Exec lane** | Operations — the weekly exec meetings (head_ar / cmo / cco / head_distribution) | **Yes** | **Autonomous resolution** — the exec resolves it themselves, spending real money, per their loyalty/mood/level (§4). Never vanishes silently. | **Control** — you make the call instead of the exec |
| **CEO lane** | Strategic opportunities — the CEO's own meetings (`ceo` role, no exec row) | **No** | **Genuinely lapses** — "the moment passed," no effect. CEO is the player; there is no one to delegate to. | **Opportunity** — a strategic move that is simply gone if unspent |
| **Crisis lane** | Obligations — mandatory side events ("Crisis on the Desk", `flags.pending_side_event`) | **No** | **Cannot lapse** — blocks the advance, consumes a slot until resolved (existing #162 pipeline). | Nothing — it is mandatory; the slot cost *is* the crisis eating bandwidth |

**The law in one paragraph:** *Operations are delegable and never lapse (an unspent slot cedes control to the exec); strategic opportunities are non-delegable and genuinely lapse (an unspent slot forfeits the opportunity); obligations never sit in a lapsing lane at all (they block until handled).* Every structural change below exists to make each offering sit in its correct lane.

**Immediate structural consequences (all ✅ DECIDED, specced in §8):**
- **`ceo_crisis` (the fired-dancers meeting; `id: ceo_crisis`, legacy `meeting_id: mgr_crisis`) migrates OUT of the CEO meeting pool INTO the side-events pipeline** (`data/events.json` format). It is an *obligation* ("your biggest artist just fired their dancers"), not a strategic opportunity — it must not sit in the lapsing CEO lane.
- **`ceo_chart_debut_strategy` keeps its place but loses the `bank_it` inaction penalty** (`executive_mood −2`). Under the three-lane rule, lapsing the CEO's strategic frame while the CMO's `chart_debut` reactive auto-resolves IS the inaction path — a second baked-in penalty double-charges it.
- The **CEO pool needs a "rarer and heavier"** authoring pass (fewer trivial weeks, mostly `requires`-gated so the CEO sits out quiet weeks and CEO lapse feels like a real forfeited opportunity, not a constant nag). **Content authoring is OUT OF SCOPE for the build arc** — reserved for a live working session with Nes (§8, §13). The build arc ships only the *structural* support for `requires`-gated CEO sit-outs.

---

## 3. Three-axis stat model

**✅ DECIDED.** Each executive carries three orthogonal stats on three time horizons. They already exist as columns (`executives.mood`, `executives.loyalty`, `executives.level` — `shared/schema.ts:318-327`); this arc gives **loyalty** and **level** mechanical reads for the first time (both are currently written-but-dead / frozen — see §0 ground truth). CEO has no exec row and **no mood/loyalty/level** — that stays (CEO exemption, `ActionProcessor.ts:330`).

| Axis | Meaning | Horizon | Currently | This arc |
|---|---|---|---|---|
| **Mood** | **Volatility** — cost/effect modifier AND risk appetite of autonomous picks | Fast (1–2 wks) | LIVE (bands read in `processRoleMeeting`) | Extended unchanged to autonomous resolutions + adds risk-appetite bias |
| **Loyalty** | **Direction** — whose interests an autonomous decision serves | Slow (campaign-scale) | Written (+5 use / −5 idle) but **read by nothing** | Becomes the band that selects the autonomous choice |
| **Level** | **Ceiling** — autonomy quality, passive portfolio strength, new choice unlocks | Permanent | Frozen at 1, fully dead | XP accrual + level-gated reads (Tier 3) |

### 3.1 Loyalty = direction (bands, config-driven — Tier 1)

Loyalty selects **which choice** an exec makes when resolving autonomously. Modeled exactly like the shipped mood bands (thresholds in JSON, strict boundaries pinned by a tripwire test — mirror `exec_mood_modifiers`).

| Band | Loyalty range | Autonomous choice policy |
|---|---|---|
| **loyal** | loyalty > `loyal_above` (default **70**) | Picks the **AUTO-safe** choice — what the player would pick (the same "safest choice" AUTO already computes, `executiveAutoSelect.scoreChoiceSafety`). Serves the CEO's interests. |
| **committed** (mid) | `disloyal_below` ≤ loyalty ≤ `loyal_above` (30–70) | Picks the exec's **own reasonable call** — the highest-`level`-quality choice that is not self-serving; a competent professional judgment among the choices. |
| **disloyal** | loyalty < `disloyal_below` (default **30**) | Picks the **in-character self-serving** choice (§4.3 bias table). NOT the "worst" choice — the one that serves the exec's agenda. |

```jsonc
// data/balance/progression.json → reputation_system.executive_delegation (NEW block)
"loyalty_bands": {
  "loyal_above": 70,        // > this => picks the AUTO-safe choice
  "disloyal_below": 30      // < this => picks the self-serving choice; between => own call
}
```
- **Read at:** the new autonomous-resolution path (§4), engine-side, inside the week transaction.
- **Written at:** `+loyalty_on_use` on any attended meeting (currently hardcoded `+5`, `ActionProcessor.ts:589`); `−loyalty_decay_per_week` after `idle_weeks_before_decay` idle weeks (currently hardcoded `−5` / `3`, `ArtistStateProcessor.ts:500-501`). **All three constants extract to config in Tier 1** (§3.4).
- **Tripwire:** a `DEFAULT_EXEC_DELEGATION_CONFIG` parity test mirroring the mood-modifier tripwire (`tests/unit/executive-mood-modifier.test.ts:172-185`) — tuning the JSON without updating the default fails CI.

**🔀 OPEN FORK (d): does loyalty gain differ between AUTO-endorsed and personally-chosen meetings?** See §12.

### 3.2 Mood = volatility (unchanged bands + NEW risk-appetite bias — Tier 1)

The shipped mood bands (`exec_mood_modifiers`, `progression.json:22-29`) extend **unchanged** to autonomous resolutions: an autonomous pick's negative-money cost scales ×1.25 when the exec is disgruntled, ×0.90 when content; non-money effects ×1.20 when inspired (`shared/utils/executiveMoodModifier.ts`, reused verbatim — no new modifier logic, same shared util both paths). **This is the single most important reuse in the arc: autonomous resolution routes the exact same `applyMoodModifiersToEffects` transform the player path already uses, so the two can't drift.**

**NEW — mood biases risk appetite of the autonomous pick** (a *tie-break within the loyalty band*, not a replacement for it):
- **inspired** (mood > 90): swings big — among candidate choices in the loyalty band, prefers the higher-variance / higher-spend option ("The universe is composing through me").
- **disgruntled** (mood < 30): picks defensive/cheap — prefers the lower-spend, lower-variance option ("Everything sounds like commerce").
- **neutral/content:** no risk bias (loyalty band decides alone).

```jsonc
// same executive_delegation block
"autonomous_risk_appetite": {
  "inspired_bias": "aggressive",   // prefer higher variance_up / larger |money| within band
  "disgruntled_bias": "defensive", // prefer lower variance_up / smaller |money| within band
  "neutral_bias": "balanced"       // no bias
}
```
Implementation note: "risk score" of a choice = presence/magnitude of `variance_up`/`rep_swing` + absolute money spend. Aggressive → argmax risk score within band; defensive → argmin; balanced → the band's canonical pick (§3.1). This reuses the gamble-key detection already in `scoreChoiceSafety` (`executiveAutoSelect.ts:47-72`).

### 3.3 Level = ceiling (Tier 3 — see §6)

Config knobs and reads in §6. Named here for completeness: level raises autonomy quality (unlocks the exec preferring higher-quality choices even at mid loyalty), adds a small passive portfolio strength (§7), and unlocks NEW choice options at L3/L5/L8 (mined from the Character Bible's level arcs — e.g. Mac's "predict genre trends" at L5, Sam's "turn negative press positive" at L5).

### 3.4 Config extraction (Tier 1 — no hardcoded literals may survive)

Every currently-hardcoded exec constant moves into the new block. **No literal may remain in `ActionProcessor.ts` / `ArtistStateProcessor.ts`.**

```jsonc
// data/balance/progression.json → reputation_system.executive_delegation
{
  "loyalty_on_use": 5,            // was hardcoded, ActionProcessor.ts:589
  "loyalty_decay_per_week": 5,    // was hardcoded, ArtistStateProcessor.ts:501
  "idle_weeks_before_decay": 3,   // was hardcoded, ArtistStateProcessor.ts:500
  "mood_drift_per_week": 5,       // was hardcoded ±5 toward 50, ArtistStateProcessor.ts:420-428
  "mood_default_delta": 5,        // unauthored executive_mood fallback, ActionProcessor.ts:582
  "loyalty_bands": { "loyal_above": 70, "disloyal_below": 30 },
  "autonomous_risk_appetite": { "inspired_bias": "aggressive", "disgruntled_bias": "defensive", "neutral_bias": "balanced" },
  "auto_endorse_loyalty_gain": 5, // fork (d) recommendation — same as loyalty_on_use for now
  "neglect_loyalty_gain": 0,      // fork (d) recommendation — a self-served meeting grants no loyalty
  "neglect_mood_gain": 0          // playtest-revision (2026-07-12 round 3) — a self-served meeting grants NO exec-mood gain either (was implicitly mood_default_delta)
}
```
Accessor: `getExecDelegationConfigSync()` in `server/data/gameData.ts` (HARDCODED fallback mirroring `getWeeklyMeetingSelectionConfigSync`), threaded through `ctx.gameData` like `getExecMoodModifierConfigSync()`.

---

## 4. Autonomous resolution spec (the heart — Tier 1)

**✅ DECIDED — the mechanic:** every offered **exec-lane** meeting resolves every week. If the player spends a focus slot, it resolves by their choice (unchanged path). If not, **the executive resolves it autonomously**, spending real money with **no cap** ("they are executives"). AUTO-endorse (player clicks AUTO) and neglect (player never touches the exec) are **different** (§4.5).

### 4.1 Where in the week pipeline it runs

The week advance is ONE transaction with `FOR UPDATE` (`advanceWeekService.ts`). Player meetings run in **PHASE 1** (`game-engine.ts:189-197`) before other actions. **Autonomous resolution runs immediately after PHASE 1's player-meeting loop, before `applyArtistChangesToDatabase` (line 200)** — so autonomous artist-mood deltas flush in the same pass as player-meeting deltas:

```
processAROfficeWeekly (line 187)
PHASE 1: for (player role_meeting actions) processAction   (line 195-197)
>>> NEW: resolveAutonomousExecMeetings(ctx)                 <<< INSERT HERE
applyArtistChangesToDatabase                                (line 200)
PHASE 2: other actions … processPendingSideEventResolution … decay … checkForEvents
```

`processExecutiveMoodDecay` (line 264) already runs late and **skips execs used this week**.

> **▲ playtest-revision (2026-07-12 round 3) — REVERSED from the original recommendation below.** A neglect (autonomous) resolution is **NOT** counted as "used": it does **NOT** set `lastActionWeek`, is **NOT** added to `summary.usedExecutives`, and therefore does **NOT** suppress idle loyalty-decay or passive mood-drift. Only a *player-engaged* meeting (manual or AUTO-endorsed) marks the exec used. This is safe against double-processing because the autonomous-resolution candidate list is computed once before its loop (`resolveAutonomousExecMeetings`) and never re-reads `usedExecutives`. Sustained neglect thus erodes loyalty (−`loyalty_decay_per_week` after `idle_weeks_before_decay`) and drifts mood toward 50, instead of parking the exec's stats at full benefit. See §4.5 for the corrected write rules and rationale.

~~The original recommendation (superseded): an autonomously-resolved exec counts as **used** (it made a decision) — so it must set `lastActionWeek` and skip decay, exactly like a player-attended meeting. The recommendation was: autonomous resolution sets `lastActionWeek` to prevent the −5 idle decay from *also* firing on top of the self-serving pick, so neglect costs you *control* and *loyalty-gain-forgone*, not a double loyalty hit.~~ Live playtesting (Entries 3–5) showed this made neglect a *reward* (mood ratcheted to the cap, loyalty parked), defeating the escalation ceiling — hence the reversal above.

### 4.2 How the engine knows which meeting each exec was offered

**This is the load-bearing new coupling.** Meeting *selection* is currently **route-side only** (`server/routes/executives.ts`, `selectWeeklyMeetingWithHappenings`) — the engine has never known what each exec was offered; unchosen meetings vanish with no memory. Autonomous resolution requires the engine to know the offered meeting for each non-acted exec. **🔀 OPEN FORK (e)** decides the mechanism; the recommended path:

**Recommended (Fork e → option A): engine re-derives deterministically.** The selection pipeline (`shared/engine/meetingSelection.ts`, `deriveRelevanceState`, `deriveWeekHappenings`) is already **pure and shared**. Inside the transaction, for each non-CEO exec with no player action this week, the engine runs the identical seeded pipeline (`generateMeetingSeed(gameId, week, roleId)`) against the same persisted inputs the route reads, yielding the same offered meeting the player saw. Deterministic, authoritative, no client trust. Cost: the engine gains DB reads (artists/projects/releases/songs/moodEvents/chartEntries) it already has in-transaction, plus a dependency on `serverGameData`/actions content inside the engine seam. See §10 for the golden-master implication (the GM harness must stub the meeting pool).

- **Empty eligible pool → exec sits out → nothing to resolve** (unchanged sit-out semantics).
- **Reactive meeting offered → that is what resolves** (the pulse-dot meeting). Ignoring it is what feeds §5 escalation.

### 4.3 How the choice is picked (per loyalty band + mood risk bias)

For the resolved meeting's `choices[]`:
1. **Loyalty band** (§3.1) selects the candidate policy: loyal → AUTO-safe set; committed → own-call set; disloyal → self-serving set.
2. **Mood risk appetite** (§3.2) tie-breaks within the candidate set.
3. **Determinism:** ties resolve by an **isolated seeded pick**, seed `${gameId}-week${week}-${roleId}-autonomous` (seededRandom family, `shared/utils/seededRandom.ts`) — **never** `ctx.getRandom`, so the engine's pinned RNG stream and draw count are undisturbed (Ground Rule 4 / isolated-seed rule, §10).
4. **`user_selected` meetings** (AUTO never picks an artist for the player): under never-lapse the exec DOES make the call including *who*. **✅ DECIDED recommendation:** autonomous resolution of a `user_selected` meeting falls back to **predetermined targeting** (highest-popularity artist, reusing `selectHighestPopularityArtist`, `ActionProcessor.ts:295`) — the exec picks the obvious artist in character. (This is the one place autonomous resolution diverges from AUTO, which skips `user_selected` entirely.)

### 4.3.1 In-character self-serving bias table (disloyal band) — grounded in the Character Bible

**✅ DECIDED — requires a per-exec authoring pass.** When disloyal, each exec picks the choice that expresses their archetype's self-interest. This is a **selection heuristic over existing authored choices**, not new content — the engine tags each meeting's choices per exec archetype, or (simpler, recommended) scores existing choices against the archetype's "signature vice" and picks the argmax. The four archetypes (from `Exec Team - Character Bible.md`):

| Exec | Role | Character (Bible) | Self-serving archetype | Choice-preference heuristic (disloyal band) |
|---|---|---|---|---|
| **Mac** (Marcus Rodriguez) | head_ar | "The Taste Maker Who Lost The One" — trusts his gut, haunted by the one that got away | **Risky pet signings** — chases the wild-card artist to prove his ear | Prefer choices banking `variance_up` / creative bets (e.g. `greenlight_weird`, `market_test`); the gut over the safe commercial play |
| **Sam** (Samara Chen) | cmo | "The Narrative Architect" — PR is power, owns the narrative | **Flashy overspend on campaigns** — the big blitz that makes *her* the story | Prefer the highest-`money`-spend press/awareness choice (e.g. `full_campaign`, `full_blitz`, `play_the_game`); reach at any cost |
| **Dante** (D-Wave Washington) | cco | "The Sonic Architect" — mystical perfectionist, art over commerce | **Indulgent experimental creative** — quality/variance regardless of budget | Prefer choices maximizing `quality_bonus`/`variance_up` at creative_capital/money cost (e.g. `add_revision`, `greenlight_weird`, `creative_reset`); the "frequency" over the ledger |
| **Pat** (Patricia Williams) | head_distribution | "The Systems Optimizer" — data, ROI, risk-averse | **Conservative upside-capping deals** — takes the guaranteed small win, caps the ceiling | Prefer low-variance guaranteed-value choices / windfalls that cap upside (e.g. `small_rooms`, `modified_approach`, `digital_focus`); the safe 3% |

> **✅ AS-BUILT (Tier 1 + the successor stakes revision):** the mechanism is a per-choice `self_serving_hint` tag in `data/actions.json` scored against a numeric-proxy heuristic; the engine reads it and a data-lint test asserts every non-CEO exec's pool yields a well-defined self-serving argmax under the disloyal band. Tier 1 shipped with only **2** choices tagged (`cmo_scandal.spin_collaboration`, `ar_genre_shift.chase_trends`), which left several meetings (`ar_discovery`, `cco_creative_clash`, the timestamp-id CCO meeting) resolving to *weak-archetype* self-serving picks under the numeric proxy alone — logged as **C91**. **C91 is now RESOLVED:** the successor session's v2 stakes revision of `data/actions.json` (`bdb78fb`) ran the full sweep — 6 hints added, 1 moved — so **every non-CEO meeting now yields a unique self-serving argmax and the data-lint is green.** This is grounded in the Bible's "Failure Personalities" (Mac self-blame/risk, Sam blames market/goes aggressive, Dante retreats to abstraction/experiment, Pat over-optimizes/over-caps). **Player-facing copy stays qualitative (no engine numbers, house regex rule).**

### 4.4 Mood/level scaling of the autonomous pick

- **Mood modifiers** apply to the picked choice's effects exactly as for a player pick (§3.2) — same `applyMoodModifiersToEffects`, same delayed-queue scaling at queue time (`ActionProcessor.ts:394-404`).
- **`executive_mood` self-effect:** ~~an autonomous resolution grants the exec their `mood_default_delta` (or the choice's authored `executive_mood`) — an exec who just acted feels engaged.~~ **▲ playtest-revision (2026-07-12 round 3):** a neglect (autonomous) resolution grants the exec `neglect_mood_gain` (default **0**) — NOT `mood_default_delta` and NOT the authored `executive_mood`. A self-served meeting is not engagement, so the exec's mood is left to drift toward 50 rather than boosted. Loyalty change per Fork (d) (`neglect_loyalty_gain = 0` — self-serving is not endorsement).
- **Level** raises the *quality floor* of the committed (mid-loyalty) band (§6): a higher-level committed exec's "own call" trends toward better choices.

### 4.5 AUTO vs neglect distinction (✅ DECIDED)

> **▲ playtest-revision (2026-07-12 round 3):** the original neglect rules (mood_default_delta on the exec + `lastActionWeek` set to suppress idle decay) made neglect *reward* the exec — a neglected exec ratcheted mood to the cap and parked its loyalty, so the `<40` escalation ceiling and `<30` self-serving band were unreachable and three of four execs sat at mood 100 while being ignored (live Entries 3–5). Corrected below: on the **neglect path ONLY**, the exec's personal engagement rewards are withheld — mood self-effect = `neglect_mood_gain` (default **0**, NOT the authored `executive_mood`/`mood_default_delta`), and `lastActionWeek` is **NOT** set, so idle loyalty-decay and passive mood-drift toward 50 both continue. The choice's *other* effects (money, reputation, artist mood, delayed banks) are unchanged — the decision still happens; only the exec's engagement rewards stop. Player-attended and AUTO-endorsed paths are unchanged.

| | Slot cost | Choice source | Loyalty consequence | Mood self-effect | Marked "used"? |
|---|---|---|---|---|---|
| **Player manual** | 1 slot | Player picks | `+loyalty_on_use` (endorsed); `lastActionWeek` set | authored `executive_mood` or `mood_default_delta` | Yes |
| **AUTO-endorse** (player clicks AUTO → confirms the safe pick via the review panel) | 1 slot | AUTO-safe (loyal-band pick) | `+auto_endorse_loyalty_gain` (endorsed) — fork (d); `lastActionWeek` set | `mood_default_delta` | Yes |
| **Neglect** (player never engages; exec self-resolves) | **0 slots** | Loyalty-band pick (may be self-serving) | `+neglect_loyalty_gain` (default **0**); `lastActionWeek` **NOT** set → idle decay continues to accrue | `neglect_mood_gain` (default **0**); passive mood-drift toward 50 continues | **No** |

The key player-legible difference: **AUTO costs a slot and endorses the safe pick; neglect is free but hands the exec the wheel** (and at low loyalty they drive it their way). Sustained neglect now also *quietly erodes the relationship* — loyalty decays and mood drifts back toward indifference — so ignoring an exec has a real, accumulating cost rather than parking them at full benefit. This is the central trade the arc creates.

### 4.6 How it lands in WeekSummary

Autonomous resolutions surface through the existing `summary.changes[]` → `categorizeChanges` → **meetings bucket** (`WeekSummary.tsx:236,245`). Each autonomous resolution pushes a `type: 'meeting'` entry **exactly like a player meeting** (so all the badge/tooltip/effect-legibility plumbing — `LIVE_EFFECT_KEYS` whitelist, `EffectBadgeTooltip` — is reused verbatim), plus an additive marker:

```jsonc
// summary.changes entry — additive field on the existing 'meeting' shape
{
  "type": "meeting",
  "autonomous": true,                     // NEW — drives the "While you were out" group
  "roleId": "cmo",
  "meetingId": "cmo_awards",
  "choiceId": "full_campaign",
  "choiceLabel": "Go all in on the awards campaign",
  "appliedEffects": { "money": -20000, "award_chances": 5 },
  "description": "Sam ran the awards campaign while you were out",  // qualitative, no numbers in prose
  "moodBand": "inspired", "effectMultiplier": 1.2   // when a modifier fired (unchanged shape)
}
```

**"While you were out" attribution group** *(shipped player-facing header: **"Made Without You"**, `WeekSummary.tsx` — "While you were out" survives as the internal/dev name throughout this doc)*: `categorizeChanges` groups `meeting` entries with `autonomous: true` under a distinct header inside the meetings card (v2 tokens; visually secondary to player decisions — this is the label running itself). Effect-legibility tie-in: each autonomous entry shows the same effect badges + tooltips as a player meeting, so the player can read *exactly* what the exec spent and got. Copy is qualitative ("Sam went big on press"), the badges carry the magnitudes.

**🔀 OPEN FORK (c): do ordinary (non-urgent) autonomous resolutions get their own staged reveal beat, or a quieter grouped digest?** See §12. Recommendation: **quieter digest** (grouped, collapsed-by-default under "While you were out"), reserving the staged Phase-4 reveal for player decisions + escalations, so a 4-exec autonomous week doesn't drown the beats that matter.

---

## 5. Escalation spec (Tier 2)

**✅ DECIDED — the mechanic:** an ignored **URGENT** meeting (a Tier-2 reactive / pulse-dot meeting, `reactiveContext` present) — especially when the exec is low-loyalty — escalates into a **mandatory crisis side event** via the existing #162 pipeline (`flags.pending_side_event`). This makes the pulse-dot meaningful: ignore the CCO's `mood_crater` intervention with a disloyal CCO, and next week a crisis lands on your desk.

### 5.1 Trigger — 🔀 OPEN FORK (a)

**Fork options:**
- **(a1)** Urgent meeting autonomously resolved (not player-chosen) **once** while that exec's loyalty < `escalation_loyalty_ceiling` → escalate.
- **(a2)** Urgent meeting ignored **twice** (any loyalty) → escalate.

**Recommendation: a1 (loyalty-gated single strike), with the ceiling as a config knob.** It ties escalation to the trust axis — the thematic core of the arc. A loyal exec who self-resolves an urgent meeting handles it competently (no escalation); a disloyal one lets it blow up. Single-strike keeps it legible ("I ignored the crisis meeting and my disgruntled CCO let it explode") without a hidden counter. a2's "twice" needs a persisted per-meeting counter and reads as arbitrary.

```jsonc
// executive_delegation block
"escalation": {
  "loyalty_ceiling": 40,          // urgent meeting self-resolved below this => escalates
  "enabled": true                 // kill-switch, mirrors mandatory_side_events.enabled
}
```

### 5.2 Payload into `flags.pending_side_event`

On escalation, the engine sets the **mandatory-mode rich payload** the #162 pipeline already consumes: `{ eventId, week, prompt, category, choices }` (`mandatory-side-events-plan.md` §Data). The `eventId` points at a small set of **escalation side events** authored per exec archetype (structural spec only — see §5.3). This slots into the existing `processPendingSideEventResolution` (`game-engine.ts:211`) with zero new resolution machinery: next advance blocks, a focus slot is consumed, the crisis card renders.

**Timing:** escalation is *emitted* during the advance in which the urgent meeting self-resolves (right after §4's autonomous resolution, before decay), setting `pending_side_event` for the **following** week — same one-week deferral as a rolled crisis.

### 5.3 Content status (as-built + what the content session changed)

- The roster of escalation side events in `data/events.json` — one per exec archetype (`escalation_ar_botched_signing`, `escalation_cmo_narrative_lost`, `escalation_cco_artist_walkout`, `escalation_dist_deal_collapsed`), each with a `category` (∈ `event_weights` keys) and 3 choices in the standard effect-key vocabulary — shipped with Tier 2.
- These are **NOT rolled** by the weekly side-event draw — they are **injected only by escalation** (event-gated, like reactive meetings are trigger-gated). A data-lint rule marks them escalation-only (excluded from the weighted roll pool) so they never fire randomly.
- **✅ Stub prose is GONE.** Tier 2 shipped these as placeholder/stub content sufficient for tests; the successor session's stakes revision (`bdb78fb`) **replaced the stub prose with real copy** for the four events.
- **✅ Router arrays now exist.** `pickEscalationEventId` (`shared/utils/executiveDelegation.ts:146`) routes a per-role event **ARRAY** with an isolated seeded pick, and the Engine Verbs arc's escalation last-seen memory (`flags.escalationHistory[roleId]`, stamped at pick time, `executiveDelegation.ts:100–133`) filters already-seen ids OUT of the pool before the seeded draw (mirrors `flags.side_event_history`). **But the per-role pools are still singletons** — one authored event each — so the array machinery has nothing to choose between yet.
- **REMAINING (Content Integration Wave, C103):** the **4 second-per-archetype escalation events** (a genuine second option each, so the router arrays and the seen-filter actually rotate) are being authored into the v3 escalation review pool (`client/src/admin/v3EscalationsPoolReview.ts`) in the current sweep. Until they land, escalation still fires the single authored event per role.

---

## 6. Leveling spec (Tier 3)

**✅ DECIDED — the mechanic:** `executives.level` (frozen at 1 today) becomes live. Level = ceiling: better autonomy, passive portfolio strength (§7), and NEW choice unlocks.

### 6.1 XP sources & curve

```jsonc
// executive_delegation block
"leveling": {
  "xp_per_meeting_attended": 10,        // primary — player engaged the exec
  "xp_per_autonomous_resolution": 3,    // smaller — exec acted, but you weren't there
  "xp_per_domain_milestone": 25,        // e.g. head_ar: a signee hits Top 10; cmo: a #1; cco: a breakout; head_distribution: a release clears a revenue bar
  "level_thresholds": [0,100,250,450,700,1000,1400,1900,2500,3200], // cumulative XP for L1..L10
  "unlock_levels": [3, 5, 8]            // levels at which new choices unlock
}
```
- XP accrues on `executives.metadata` (currently dead jsonb — no migration): `metadata.xp` accumulates; level recomputes from the threshold table each advance. **XP write happens in `processExecutiveActions`** (attended + autonomous) and in the domain-milestone hooks (reuse `applyChartMilestoneBonuses`, `game-engine.ts:1067`, which already fires once-per-song Top10/#1 — tag the head_ar/cmo of that song's era).
- **Determinism / GM:** XP and level are pure functions of persisted counters — no RNG, no stream impact.

### 6.2 Level reads

1. **Autonomy quality:** higher level raises the committed (mid-loyalty) band's floor — a level-8 exec's "own call" trends toward the AUTO-safe pick even without high loyalty (competence compensates for indifference).
2. **Portfolio strength:** small passive per-level bonus in the exec's domain (§7).
3. **Choice unlocks at L3/L5/L8:** new `choices[]` entries in `data/actions.json` gated by a new optional `unlock_level` field (Zod additive; data-lint: `unlock_level` ∈ `unlock_levels`). Mined from the Character Bible level arcs:
   - **Mac L5:** "predict genre trends 3 months out" → a lower-variance A&R choice. **L8/L10:** poach-from-rivals flavored choice.
   - **Sam L5:** "turn negative press into positive" → a `cmo_scandal` choice that banks positive `press_momentum` cheaply.
   - **Dante L5:** "salvage any project to decent quality" → a high `quality_bonus` floor choice.
   - **Pat L5:** "predict sales within 5%" → a distribution choice with a guaranteed `money` return.
   - **Content authoring of these choices is reserved for a content pass**; Tier 3 ships the `unlock_level` field + gating + lint + the *availability* read (locked choices appear as ghost/gradient per the v2 tier-badge spec).
   - **▲ The Engine Verbs arc (§14) widened what an unlock choice can DO.** These level-gated choices no longer have to express themselves through the old numeric-effect ceiling: Mac's L5 "predict genre trends" or L8 "poach from rivals" can now `spawn_prospect` a real discoverable artist; Sam's "turn negative press positive" can bank a `press_scrutiny_flag` reversal or `schedule_event` a verdict beat; Pat's "predict sales within 5%" can use a `requires`-gated guaranteed `money` return. When Tier 3 is authored, mine the verb vocabulary in §14 — the unlock choices are a natural home for the tangible-catalog and scheduling verbs.

**🔀 OPEN FORK (b): salary raise on level-up?** See §12. Recommendation: **yes, small, config-gated** — a level-up nudges the exec's monthly salary (currently static $17k total, `data/roles.json`) up by a config percentage, so growth has a cost and the "manage the team" loop gains an economic lever. Ship the knob; default it modest.

---

## 7. Portfolios spec (Tier 4)

**✅ DECIDED — order:** couple exec state to their operational domain, biggest decoupling first.

1. **Mac/A&R ↔ scouting quality (FIRST).** The A&R Office scouting system (`AROfficeProcessor`, `processAROfficeWeekly`) is **entirely decoupled** from the `head_ar` executive's state today (ground truth §0). Tier 4 couples them: head_ar `level` raises scouting quality/pool, `mood` modulates variance of sourced artists, `loyalty` — a disloyal Mac sources his *pet* risky picks (§4.3 archetype). This is the flagship portfolio because it makes the exec you neglect *visibly* run their department their way.
2. **Sam/CMO ↔ marketing efficiency (SECOND).** cmo level/mood scales the efficiency of PR-push / digital-ads marketing spend (`processMarketing`, `ActionProcessor.ts:1092`) — a high-level content Sam gets more awareness per dollar; a disloyal one overspends (archetype).
3. **Dante/CCO & Pat/Distribution — sketched only.** Dante → passive `quality_bonus` floor on recording sessions at high level; Pat → passive release-timing / distribution efficiency. Named for completeness; full spec deferred to a Tier-4 planning slice.

Every coupling is a **config knob** (new keys under `executive_delegation.portfolio`, defaults 1.0 = no effect) so Tier 4 can ship dark and tune live.

---

## 8. CEO track changes (Tier 1 — structural)

**✅ DECIDED, structural only (no content authoring):**

1. **Migrate `ceo_crisis` → side-events pipeline.** Remove the `ceo_crisis` meeting from `data/actions.json`'s CEO pool; author an equivalent obligation event in `data/events.json` (id e.g. `crisis_fired_dancers`, `category: artist_personal`, the 3 existing choices carried over). **✅ DECIDED (Nes, 2026-07-12 — fork f):** the event **keeps its predetermined highest-popularity-artist targeting**. The side-event resolver gains an optional per-event targeting mode (`target: "predetermined"` → resolve effects against the highest-popularity artist via `selectHighestPopularityArtist`, `ActionProcessor.ts:295`; absent → existing global behavior, fully backward-compatible with the 12 existing events). A characterization test pins that a predetermined-target event hits exactly one artist and a legacy event still applies globally.
2. **Remove `ceo_chart_debut_strategy`'s `bank_it` inaction penalty** (`executive_mood −2`). Note: CEO has no exec row, so `executive_mood` on a CEO choice is *already inert* (`ActionProcessor.ts:330` gates the exec fetch on `roleId !== 'ceo'`) — this is a **dead key on a CEO choice today**. Removing it is a data-cleanliness + design-intent change (the penalty never fired mechanically, but it signals the wrong model). The dominance lint (`meeting-dominance.test.ts`) must stay green after removal.
3. **Structural support for `requires`-gated CEO sit-outs.** The selection pipeline already honors `requires` tags and returns `meetings: []` (sit-out) on an empty eligible pool — CEO already flows through this. Tier 1 verifies the CEO lane sit-out renders as a *calm forfeited-opportunity* state (distinct from an exec sit-out, since CEO genuinely lapses), and that the `requires`-gating is authored-ready.

**▲ AS-BUILT UPDATE — the "rarer and heavier" CEO authoring pass has BEGUN.** At Tier 1 this was flagged "the content session's job / not started," with the CEO pool remaining the current 3 regular + 1 reactive. The successor session moved it forward on two fronts:
- **The M16 `requires` grammar now makes "rarer and heavier" expressible.** The Engine Verbs arc (§14) extended `requires` from tag/story-flag matching to **threshold objects** (`{stat: 'cash'|'week', gte/lte}`) plus artist-state tags, threaded through `deriveRelevanceState` with a two-site lockstep helper (parity test `tests/engine/meeting-selection-two-site-parity.test.ts`). A CEO meeting can now gate on "only offer when cash ≥ $X" or "only after week N" — the precise lever the rarity contract needed. This was the *most-demanded* verb slice for the CEO lane (M16, 9 scenarios).
- **The v3 CEO pool is authored.** The ground-up v3 authoring wave produced a full CEO scenario pool (`client/src/admin/v3CeoPoolReview.ts`, one of the 7 review pools) built as rare, heavy, mostly `requires`-gated strategic opportunities — the intended shape. It is **awaiting Nes's review** at `/admin/mac-pool-review` and has **not been committed to `data/actions.json`** yet; several of its scenarios ship a compromised "honest version" pending the Content Integration Wave (they lean on verbs like `target_executive` for "The Counter-Offer" that are now live but content-unwired). **Note:** the v3 CEO pool review reported ~83% of its scenarios initially compromised by the pre-verbs effect ceiling — the verbs arc exists to un-compromise them.

Until the v3 pool is reviewed and committed, the live CEO pool remains the current 3 regular + 1 reactive; the Tier-1 structural changes above still land and are correct.

---

## 9. Economy & throughput rebalance

**The problem never-lapse creates:** today most weeks, most execs are ignored and contribute *nothing* (they just decay). Under never-lapse, **every eligible exec resolves every week**, roughly **doubling weekly effect volume** — including **unapproved autonomous spend** (money the player didn't authorize). A disloyal, inspired CMO can autonomously drop $20k on an awards campaign every week. Left untuned, the economy breaks.

**Tuning targets & knobs:**
- **Per-meeting magnitude review** vs. **a weekly autonomous-spend expectation curve.** Recommendation: model the *expected weekly autonomous spend* (sum over execs of P(neglected) × expected pick cost per loyalty band) and set a target as a fraction of weekly income, then tune. The lever is NOT a spend cap (✅ DECIDED: no cap) but the **magnitudes of the choices themselves** (already all in balance JSON per the file-map in `data/CLAUDE.md`) and the **loyalty-band pick policy** (a disloyal exec picking the *cheap* self-serving option vs. the expensive one).
- Note the existing **`reputation_gain_scaling: 0.7`** damper (progression.json:9) and **flop penalties** — autonomous spend interacts with these; a flood of autonomous marketing could inflate reputation/awareness past the volatility-economy arc's carefully-set curves.
- **Focus-slot scarcity is the counterweight:** 3 slots (4 at rep≥50), and a pending crisis eats one (§2). The player can only *control* 3–4 of the ~4 exec + CEO + crisis offerings per week — the rest run autonomously by design. Tuning must make "which to control" a genuine dilemma.

**Playtest probes (round 3 form sections):**
- Does autonomous spend feel like *your team running the label*, or like *losing money to bugs*?
- Is the AUTO-vs-neglect trade legible? Do players understand that neglecting a low-loyalty exec is costly?
- Does a disloyal exec's self-serving pick read as *in character* (Sam overspends, Pat under-commits) or as random?
- Is the weekly WeekSummary readable with 3–4 autonomous resolutions added, or overwhelming (informs fork c)?

---

## 10. Golden-master & testing policy (the hardest part)

**This is the heaviest GM rework in the project's history**, because never-lapse changes what *every* week does for any game with exec rows. Discipline (from the tier2/revival precedent): **double-run, zero un-root-caused deltas; every new roll isolated-seeded and additive; audited re-bless per changed field.**

### 10.1 GM blast radius (enumerated)

- **Only one existing fixture seeds an executive row:** `actions-week` (`golden-master-advance-week.test.ts:438-450`) seeds one `head_ar` (mood 70, loyalty 60) and a **CEO** role_meeting action. Under never-lapse, that `head_ar` is now un-acted → **resolves autonomously** → its snapshot **WILL change** (new meeting effects + `lastActionWeek` set + decay suppressed). This is an **expected, root-caused** delta — re-bless it, documenting each changed field (money spent, effects applied, exec mood/loyalty, summary.changes gains a `type:'meeting' autonomous:true` entry).
- **Every other fixture has no exec rows** → `resolveAutonomousExecMeetings` finds no execs → **no-op → snapshots stay byte-identical** (proven by double-run). This bounds the blast radius to one existing snapshot.
- **The GM harness stubs `gameData`** (`golden-master-fixtures.ts:283` — `getRoleById`, `getActionById` are generic stubs). Fork-e's engine re-derivation needs the meeting pool. The harness must either (a) stub `getWeeklyActionsWithCategories` to return a minimal deterministic pool for `actions-week`, or (b) the autonomous path must degrade gracefully to no-op when the pool is empty/stubbed. **Specify (a):** give `actions-week` a real (small) head_ar pool so the autonomous resolution is actually exercised and pinned.

### 10.2 New additive fixtures required

- **`autonomous-resolution-week`:** seeds all four non-CEO execs at **different loyalty bands** (e.g. head_ar loyal-75, cmo disloyal-20, cco committed-50, head_distribution disloyal-25) with **no player actions**, and pins that each resolves the *band-correct* choice (loyal→safe, disloyal→self-serving, committed→own-call). Proves §3.1/§4.3.
- **`autonomous-mood-risk-week`:** same execs, varying **mood** (inspired vs disgruntled) at the *same* loyalty band, pins the risk-appetite tie-break (§3.2).
- **`auto-vs-neglect-divergence`:** two otherwise-identical games, one AUTO-endorses, one neglects — pins the loyalty/slot/mood divergence (§4.5).
- **`escalation-week`:** an urgent (reactive) meeting self-resolved by a loyalty<40 exec — pins `pending_side_event` gets set with the escalation payload (§5). (Tier 2.)

### 10.3 RNG-stream audit

- Autonomous choice selection uses **isolated seed** `${gameId}-week${week}-${roleId}-autonomous` (seededRandom family) — **never** `ctx.getRandom`. Zero draws added to the engine's pinned stream (same rule that kept `rep_swing` and the award roll off-stream).
- Engine re-derivation of the offered meeting (fork e) uses `generateMeetingSeed` (already isolated) — no stream impact.
- XP/level (Tier 3): pure counters, no RNG.
- **Any GM delta on a fixture WITHOUT exec rows is a bug** (means the autonomous path leaked into a no-op case or shifted the stream) — root-cause before re-bless.

### 10.4 New characterization tests

- **Loyalty-band pick determinism** (unit, `executiveMoodModifier`-style): given (loyalty, mood, meeting), the picked choice is a pure deterministic function.
- **Self-serving pick well-defined per exec** (data-lint): every exec's pool yields exactly one self-serving argmax under the disloyal band (no ties that would make the pick non-deterministic without the seed).
- **Autonomous-vs-manual parity:** a manually-picked choice and the same choice picked autonomously apply *byte-identical* effects (proves the shared-util reuse — mood modifiers, delayed queue, rep scaling all route the same path).
- **AUTO-vs-neglect divergence** (loyalty/slot/mood) — endpoint + engine characterization.
- **Escalation** (Tier 2): urgent + low-loyalty + self-resolved ⇒ `pending_side_event` set; loyal exec ⇒ not set.
- **Config extraction:** `DEFAULT_EXEC_DELEGATION_CONFIG` parity tripwire (tuning JSON without updating the default fails CI).
- **CEO lane still lapses:** an un-acted CEO meeting applies *nothing* (no autonomous resolution for `ceo`).

---

## 11. Tier / build sequencing

Factory pattern (one fresh subagent per PR, anti-stall guard in every prompt, orchestrator diff-review + adversarial verifier before each merge; one mutating agent in the tree at a time — the July-05 collision lesson). **Tiers 1 + 2 = the next `/goal` arc, delivered as ONE PR-train.** Tiers 3 + 4 are later arcs.

### Tier 1 — Trust & Delegation (+ CEO structural + config extraction) — THE CORE
- **Scope:** loyalty bands read; autonomous resolution (§4) incl. engine re-derivation (fork e→A); mood risk-appetite; self-serving heuristic + tagging (§4.3.1); config extraction of all hardcoded exec constants (§3.4); `ceo_crisis` migration + `ceo_chart_debut_strategy` penalty removal + CEO sit-out structural support (§8); WeekSummary "While you were out" group (§4.6); economy first-pass tuning (§9).
- **Files touched:** `shared/engine/processors/ActionProcessor.ts` (autonomous path, config reads), `shared/engine/processors/ArtistStateProcessor.ts` (decay config extraction + `lastActionWeek` interaction), `shared/engine/game-engine.ts` (insert `resolveAutonomousExecMeetings` at PHASE 1), `shared/engine/meetingSelection.ts` (engine-side re-derivation entry), `server/data/gameData.ts` (`getExecDelegationConfigSync`), `data/balance/progression.json` (new block), `data/actions.json` (ceo_crisis removal, penalty removal, self-serving hints), `data/events.json` (migrated crisis event), `client/src/components/WeekSummary.tsx` (attribution group), `shared/api/contracts.ts` (additive `autonomous` field), GM fixtures + harness.
- **Risks:** GM re-bless of `actions-week` + harness pool stub (§10.1); the new engine↔content coupling (fork e); economy balance (§9); `ceo_crisis` targeting shift (§8.1 flagged fork).
- **Test plan:** §10.2 fixtures (`autonomous-resolution-week`, `autonomous-mood-risk-week`, `auto-vs-neglect-divergence`), §10.4 characterization, config tripwire, dominance-lint stays green after actions.json edits.
- **Doc-sync targets:** `[REFERENCE] executive-meetings-system-complete-reference.md` (§4 exec mechanics, §5 AUTO, §8 deferred → move loyalty/level out of deferred), `/admin/systems-map` (loyalty/level become real edges — `client/src/admin/systemsMapData.ts`), `docs/03-workflows/game-system-workflows.md`, Label Head's Guide topics (`helpTopics.ts` — new "delegation & trust" topic, qualitative), playtest form round-3 sections (§9 probes).

### Tier 2 — Escalation
- **Scope:** urgent-meeting-ignored → `pending_side_event` injection (§5); escalation-only side-event lint; `escalation` config block; escalation stub events.
- **Files:** `game-engine.ts` (emit escalation post-autonomous-resolution), `data/events.json` (stub escalation events + escalation-only flag), `data/balance/events.json` or `progression.json` (escalation config), data-lint suite.
- **Risks:** double-firing (escalation + normal crisis roll same week — reuse the "one crisis at a time" discard rule, `mandatory-side-events-plan.md` §6); loyalty-ceiling tuning.
- **Test plan:** `escalation-week` fixture; loyal-exec-no-escalation; one-crisis-at-a-time defensive test.
- **Doc-sync:** REFERENCE (escalation section), systems-map (new reactive→crisis edge), Label Head's Guide.

### Tier 3 — Levels (later arc)
- **Scope:** XP accrual + curve (§6.1); autonomy-quality/portfolio/unlock reads (§6.2); `unlock_level` field + gating + ghost/gradient locked-choice UI; salary-raise fork (b).
- **Files:** `ActionProcessor.processExecutiveActions` (XP write), `game-engine.ts` (domain-milestone XP hooks), `data/actions.json` (`unlock_level` choices — content-session-dependent), `ExecutiveCard.tsx` (level display, locked choices), `data/roles.json` (salary if fork b), schema `metadata.xp` (no migration — jsonb).
- **Risks:** content dependency for unlock choices; salary-economy interaction.

### Tier 4 — Portfolios (later arc)
- **Scope:** Mac/A&R scouting coupling (first), Sam/CMO marketing efficiency (second), Dante/Pat sketched (§7). All config-gated, ship dark.
- **Files:** `AROfficeProcessor`, `ActionProcessor.processMarketing`, `SongGenerationProcessor` (Dante floor), new `executive_delegation.portfolio` config.

---

## 12. Open forks (each with a recommendation)

> **✅ DECIDED (Nes, 2026-07-12) FORK (a) → a1.** Urgent meeting self-resolved **once** while loyalty < ceiling escalates (loyalty-gated single strike) — ties escalation to the trust axis, legible, no hidden counter. Config: `escalation.loyalty_ceiling` (default 40).

> **✅ DECIDED (Nes, 2026-07-12) FORK (b) → yes, small, config-gated.** A level-up nudges salary via `leveling.salary_raise_pct` (modest default); growth costs something. Ships with Tier 3 (later arc).

> **✅ DECIDED (Nes, 2026-07-12) FORK (c) → quiet grouped digest.** "While you were out" is grouped and collapsed-by-default; the staged Phase-4 reveal stays reserved for player decisions + escalations. Revisit against the §9 playtest probe.

> **✅ DECIDED (Nes, 2026-07-12) FORK (d) → engagement vs. abandonment.** Personally-chosen and AUTO-endorsed both grant `loyalty_on_use`; neglect (self-served) grants `neglect_loyalty_gain = 0`. (`auto_endorse_loyalty_gain` knob exists if playtest shows AUTO feels too cheap.)

> **✅ DECIDED (Nes, 2026-07-12) FORK (e) → option A.** The engine re-derives each exec's offered meeting via the shared seeded pipeline inside the transaction — authoritative, deterministic, no client trust for money-spending decisions (option B rejected). Cost accepted: new engine↔content coupling + GM harness pool stub (§10.1).

> **✅ DECIDED (Nes, 2026-07-12) FORK (f) → keep predetermined targeting.** `ceo_crisis` migrates WITH its highest-popularity-artist targeting preserved: the side-event resolver gains **predetermined-target support** (an optional per-event targeting mode reusing `selectHighestPopularityArtist`). Global application was explicitly declined — the fired-dancers fallout lands on the artist it names.

---

## 13. The content session (what it produced) + Content Integration Wave (what's still owed)

**Preserved rejections (re-affirmed from the original vision — see §1, UNTOUCHED design truth):** no resignation/quitting; no hiring/firing of the core four; no inter-exec rivalries or power struggles; no success/failure RNG rolls on choices; no stress/burnout meter.

### 13.1 The content session HAPPENED — what it produced

This doc originally deferred a cluster of content work "to a live content session with Nes." That session **took place** (2026-07-12 late session, `content/meeting-content-session`, unmerged) and turned into three waves:

- **Decided-mechanics slices (Wave 1):** the C91 `self_serving_hint` sweep is DONE (§4.3.1); escalation stub prose replaced with real copy (§5.3); the C92 `outcome_summary` per-choice field added to the schema (`shared/api/contracts.ts:442`, fallback-to-`label` reads in the digest renderers); the loyal-band scorer fixed via the `auto_safe_scoring` config block (it was blind to soft stats and clamped money too tightly); `flop_revenue_ratio` 0.10→0.30 (PENDING-DECISIONS #8, C93); CC from chart milestones now LIVE (`applyChartMilestoneBonuses`, once-per-song, `creative_capital_milestones` knobs — PENDING-DECISIONS #9, C94); escalation router arrays (§5.3).
- **v3 ground-up authoring (Wave 2):** rather than patch the v2 pool, Nes chose to re-author the meeting/event content from scratch — **98 scenarios across 7 pools** (Mac/Sam/Dante/Pat/CEO/side-events/escalations) in `client/src/admin/v3*PoolReview.ts`, served by a per-pool designer-review form at `/admin/mac-pool-review` (approve/revise/cut + notes, responses persisted to `docs/01-planning/v3-<pool>-pool-review.responses.json`). ~60% of the authored scenarios initially shipped a compromised "honest version" because the then-current 13-effect-key ceiling couldn't cash their fictions.
- **Engine Verbs Tier 1+2 (Wave 3):** the compromise census triggered a full mechanism arc — 13 new effect keys and the supporting grammar (§14). Engine-live, content-unused.

### 13.2 What the Content Integration Wave still owes (the current successor work)

The gating step right now is **Nes's v3 review pass** (approve/revise/cut the 98 scenarios pool by pool). After review, the **Content Integration Wave**:
- **Re-author the compromised "honest version" scenarios against the §14 verbs** — upgrade the placeholder specs into real effects now that the keys exist.
- **Author the `outcome_summary` past-tense texts** per choice (C92 field is live; the copy is not).
- **Spread the #9 Creative-Capital grants** across the exec pool (exec-pool and CEO-lane CC grants are authored into v3 and land with this wave).
- **Author the 4 second-per-archetype escalation events** so the router arrays actually rotate (§5.3, C103), plus the **scheduled/verdict events** — `scheduled_only` content consumed by `schedule_event`, of which **none exists yet (C103)**.
- **Commit the reviewed v3 pools to `data/actions.json` / `data/events.json`**, then **round-4 playtest** (confirm the flop actually fires at ratio 0.30 — C93; feel the stakes revision).

⚠️ The whole `content/meeting-content-session` branch **holds until Nes reviews the v3 direction** — merge to main is pending designer say-so. Dev-server restart required before any live verification (server/engine code, no tsx watch).

### 13.3 Horizon only (a door noted, not built — UNTOUCHED design truth)

- **Board-confidence oversight layer.** A future layer where a board evaluates the CEO's stewardship — the natural next tension above "manage your execs." Explicitly not in any build tier; recorded so the delegation model leaves room for it (loyalty/level/autonomous-spend are exactly the signals a board would read).

**Future execs as feature vehicles (principle, out of scope — UNTOUCHED design truth):**
- New executives should each carry a *system* as their reason to exist — **Head of International → `regional_barriers`** (the dead `regional_barriers` config already in `progression.json:31-36`), **General Counsel → sync licensing** (the `sync_licensing` side-event category already exists). Not 5th-executive scaffolding now; a principle for when the roster grows.

---

## 14. Engine Verbs capability surface (what the successor session unlocked)

**This section is new (2026-07-13).** The successor content session's Wave 3 shipped the **Engine Verbs Tier 1+2** mechanism arc — 13 new effect keys, 2 targeting directives, the `requires` threshold grammar, and a scheduled-events queue. All are **engine-live but content-unused today**; authoring them into scenarios is the Content Integration Wave (§13.2). This is a **design-altitude** summary of what a meeting/event/escalation choice can now *do* — for mechanism detail (files, seeds, GM policy, deferrals) see `COMPLETED/[COMPLETE] engine-verbs-plan.md`.

**Why it matters to THIS arc:** §2's three-lane rule now has real teeth. Before the verbs, "operations vs. strategic opportunities vs. obligations" was a taxonomy the effect vocabulary couldn't fully express — most choices could only nudge money/mood/reputation numbers. The verbs let a choice reach into the catalog, the roster, the calendar, and the exec team itself, so each lane can carry consequences proportional to its weight.

**The capability surface, grouped by what it lets a choice express:**

- **Chained meetings (the calendar lane).** `schedule_event` defers a follow-up event by N weeks into the `flags.scheduled_events[]` queue (earliest-first, max 1 lands per week, escalations keep priority; weekly promotion at workflow step 8b). A meeting choice can now set up a **verdict event** that lands later — "greenlight the risky signing now, learn how it played out in 6 weeks." This is the structural backbone the CEO lane's "heavy strategic opportunity → later payoff" shape wanted. *(Content owed: the `scheduled_only` verdict events themselves — C103, none authored yet.)*
- **Tangible catalog verbs (operations with real stakes).** `grant_song` mints a real recorded song; `spawn_release` creates a release flowing into `processReleasedProjects`; `promote_release` adds clamped awareness to an already-OUT release (the economy was forward-only before this); `catalog_damage` reduces a released song's awareness/future revenue; `cancel_project` soft-cancels an active recording project. A disloyal or blundering exec's autonomous pick, or a crisis, can now damage the actual catalog — not just a number on a ledger.
- **Prospect spawning (the A&R roster).** `spawn_prospect` injects a prospect descriptor into the existing `flags.ar_office_discovered_artists` pool; the existing sign-from-discovery flow does the rest. Mac's archetype ("chases the wild-card") finally has a verb — a meeting can literally put a specific artist in front of the player to sign.
- **Exec-targeted wounds (the team as a surface).** `target_executive: roleId | 'all'` (M13) lets `executive_mood` land on a *named* exec from CEO meetings and events — previously it only applied to the role meeting's own exec and CEO/events dropped the key. Escalation events and CEO plays can now wound a specific executive's mood, making inter-exec consequences legible without adding rivalries (§13's rejection stands — this is one-directional damage, not a power struggle). The M14 per-artist event rider similarly targets a specific artist for an event's effects.
- **Executive absence.** `set_exec_absence` writes `flags.execAbsence[roleId]=untilWeek`, read at BOTH the route offer filter and the `resolveAutonomousExecMeetings` candidate list — so an absent exec offers no meeting AND does not autonomously resolve. An escalation or crisis can pull an exec off the board for a stretch.
- **`requires`-gated content (rarity as a lever).** The M16 grammar extends `requires` from tag/story-flag matching to **threshold objects** (`{stat: 'cash'|'week', gte/lte}`) plus artist-state tags, threaded through `deriveRelevanceState` with a two-site lockstep helper. This is what makes the CEO lane's "rarer and heavier" contract (§8) authorable, and lets any pool gate a heavy choice behind economic or timing preconditions. Selection is route-side → zero golden-master risk.
- **Persistent flags & ledgers.** `story_flag` writes `flags.story[key]=true` (readable by `requires`), giving content branching memory. `press_scrutiny_flag` banks a next-release liability (the negative counterpart to the positive-only press momentum); `distribution_efficiency` banks a decaying label-wide streaming-revenue multiplier; `grant_inventory` / `transfer_revenue_stream` are flags-ledger MVPs (no new tables — the one snapshot-bump risk was deliberately avoided).

**Supporting conventions (design-relevant):**
- **`STRUCTURED_EFFECT_KEYS`** (`ActionProcessor.ts:147`) is the sanctioned convention for effect keys whose values are objects/strings rather than plain numbers (the older effect vocabulary was numeric-only). Data-lint enforces the shapes. This is why the new verbs can carry rich payloads (a song descriptor, a target roleId, a threshold) instead of a bare magnitude.
- **Escalation memory** (`flags.escalationHistory[roleId]`, §5.3) and the **router arrays** (`pickEscalationEventId`) are live — the escalation content just needs a second option per role to exercise them.

**Known TODOs / deferrals at this altitude:**
- **C101 — `applyEscalation` artist threading (TODO).** The scheduled-events queue carries a scheduling choice's pinned `artistId`, but threading the *triggering* meeting's resolved artist through `applyEscalation` for autonomous escalations is still a TODO (`game-engine.ts` ~1008). Until done, predetermined directives on escalation events resolve against the highest-popularity artist rather than the exec's actual subject.
- **C103 — unauthored scheduled/second-escalation content.** The `scheduled_only` verdict events and the 4 second-per-archetype escalation events do not exist yet (§13.2).
- **Deferred by the verbs plan (not built):** M8 multi-version releases, M6 restart/delay (fights the monotonic stage model), full inventory tables, M17 new happening types, M18 mood prompt variants, M19 meeting cooldowns.
