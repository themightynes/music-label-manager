# [FUTURE] Executive Meeting — Relevance & Reactivity

> **Status:** FUTURE / seed planning doc — problem framing + directions, NOT a chosen design or build plan. This one has a **large scope fork** that needs a product decision before any planning pass.
> **Created:** 2026-07-04 (elevated from the design-discussion section of `docs/99-legacy/superseded-2026-07/PLAYTEST_NOTES_EXEC_MEETINGS_2026-07-04.md`)
> **Origin:** exec-meetings-revival playtest walkthrough (Nes + Claude), post-PR #119.
> **Related:** [REFERENCE] executive-meetings-system-complete-reference.md (canonical as-built — meeting selection mechanism), COMPLETED/[COMPLETE] executive-meetings-revival-plan.md, [FUTURE] executive-meeting-effect-legibility.md (the sibling problem), docs/98-research/INTERACTIVITY_GAP_ANALYSIS_2026-07-03.md.

---

## Problem

Meetings feel **disconnected from the actual state of the label.** This is a distinct, deeper problem than effect legibility (its sibling doc): even if every badge were perfectly explained, the meetings would still feel *fake* because they don't react to what's actually happening in the player's business.

This is the single most important qualitative finding from the playtest — because it explains *why the whole weekly-decision loop is being skipped.*

## The mechanism (confirmed as-built)

Per the canonical reference: **meeting selection is one random pick per executive per week, drawn from that executive's entire authored pool, with no check for whether the topic is currently relevant to the label's state.**

Consequences observed / implied:
- A tour-scale meeting from Head of Distribution can fire when **no tour is running**.
- An A&R meeting can reference **"your artist"** when **no artist is signed**.
- The executive confidently references something (a tour, an artist, a release) that isn't actually happening right now.

## Why it matters — the disengagement cost

The player stated the downstream cost directly and bluntly:

> *"Most of the time you just end up hitting the auto button because it really doesn't matter."*

This is the critical insight. Because the meeting doesn't feel tied to anything real, the **rational player response is to disengage** — hit AUTO and skip the deliberation. That undercuts the entire point of the executive-meetings system, which exists to create a **weekly player-agency / decision-making moment.** A system built to make the player choose is training the player not to.

Note the collision with the revival's own AUTO improvement (playtest #11 / commit `b482c5e`): AUTO is now safer and budget-aware, which makes it an even *more* rational default. Good AUTO behavior and low meeting relevance compound each other toward disengagement.

## The relevance → meaningfulness chain

A key clarification from the walkthrough: **the choices *within* a meeting inherit the same fakeness** — the player confirmed *"it's all one thing."*

It is NOT that (a) meeting relevance is one problem and (b) choice meaningfulness is a separate one. If the meeting itself doesn't feel tied to the label's real state, the choices offered inside it can't feel meaningful either — no matter how well-balanced their payoffs are under the hood (which the revival spent significant effort balancing: non-dominance tests, trilemmas, etc.).

**Relevance is upstream of, and likely the root cause of, the "choices don't matter" feeling.** The revival made the choices *mechanically* matter; this problem is why they don't *feel* like they matter. Balancing payoffs cannot fix a relevance problem.

## Open questions (need product input)

- **Timeliness, not just topicality.** Even when a meeting IS topically relevant, does the pick still feel arbitrary in *timing* — no sense of "this is timely because X just happened"? Flagged in the playtest, not resolved either way. Reactivity may need to be event-driven (fires *because* something happened), not just state-filtered (eligible *given* current state).
- **How much reactivity is the goal?** This is the scope fork below — the biggest decision.
- **Relationship to the exec's authored voice/personality** (see [FUTURE] Email Narrative Storytelling Guide) — reactive meetings and exec personality are the same surface; do they get designed together?

## The scope fork (the decision that gates a plan)

Everything downstream depends on how far reactivity should go. Rough tiers, cheapest → deepest:

- **Tier 0 — Relevance filter (guardrail).** Before selecting, filter each exec's pool to meetings whose preconditions match current label state (has-a-tour, has-a-signed-artist, has-an-upcoming-release, etc.). Never fire a meeting that references something that doesn't exist. Smallest change; removes the most jarring immersion breaks; does NOT make meetings feel *timely*, only non-contradictory. Requires authoring/annotating precondition tags on meetings.
- **Tier 1 — State-weighted selection.** As Tier 0, but also *bias* selection toward meetings relevant to the player's current situation (recent signing → A&R meeting more likely; tour in progress → distribution meeting more likely). Makes meetings feel like the exec is paying attention to the business.
- **Tier 2 — Event-driven / reactive meetings.** Meetings fire *because* something happened (a release charted, an artist's mood cratered, a tour wrapped). This is the "timeliness" the player gestured at. Largest scope — needs an event model, authored reactive meetings, and careful interaction with the random weekly cadence.

Tier 0 is a real, shippable improvement on its own and is a prerequisite for the others. Tier 2 is a genuine feature, not a fix.

## Constraints / collisions

- **Meeting selection uses the seeded RNG** — any change to the selection algorithm must preserve determinism and will interact with the golden master if it runs in the advance-week engine path. A pre-selection filter changes *which* meeting is drawn → expect golden-master deltas; scope carefully.
- **Authoring surface.** Tiers 0–1 need precondition/relevance metadata on meetings in `data/actions.json`; the data-lint test and the canonical reference doc must stay in sync (existing rule: when `actions.json`/`LIVE_EFFECT_KEYS` changes, update the reference doc).
- **Interaction with AUTO.** If meetings become relevant, revisit whether AUTO should stay as frictionless — the whole point is to pull the player back into deliberating. Don't fix relevance and leave AUTO as the path of least resistance untouched.
- **`events.json` is already key-clean** (per the revival's PR-8) and side-events are unblocked — a reactive-meeting/event model may share infrastructure with the deferred side-events work; check before building either in isolation.
- Deferred-by-design mechanics that may become relevant here: mood-availability gates, success/failure rolls, combo actions (see the revival plan's "deferred by design" list) — some could be natural companions to reactivity.

## Next steps

1. **Product decision on the scope fork** (Tier 0 / 1 / 2). This gates everything; nothing else should be planned until it's answered.
2. If Tier 0 is chosen as the first step: scope the precondition-tagging of the meeting pool + the pre-selection filter, and measure the golden-master impact of changing selection.
3. Design relevance and effect-legibility (sibling doc) as a pair where they touch the same UI — but they are independently valuable and can ship separately.
4. Re-examine whether AUTO's frictionlessness should be tuned once meetings are worth deliberating over.
