# [FUTURE] Executive Meeting — Effect Legibility

> **Status:** FUTURE / seed planning doc — problem framing + directions, NOT a chosen design or build plan. Needs a planning pass (and some product decisions) before it becomes an implementation plan.
> **Created:** 2026-07-04 (elevated from the design-discussion section of `docs/99-legacy/superseded-2026-07/PLAYTEST_NOTES_EXEC_MEETINGS_2026-07-04.md`)
> **Origin:** exec-meetings-revival playtest walkthrough (Nes + Claude), post-PR #119.
> **Related:** [REFERENCE] executive-meetings-system-complete-reference.md (canonical as-built), COMPLETED/[COMPLETE] executive-meetings-revival-plan.md (the arc that made these effects real), [FUTURE] awareness-system-design.md (the "Buzz" channel), docs/98-research/INTERACTIVITY_GAP_ANALYSIS_2026-07-03.md (awareness is live-but-invisible).

---

## Problem

The exec-meetings revival (PR #119) made 14 canonical effect keys genuinely live and gave every meeting choice honest badges. But making an effect *real* is not the same as making it *legible*. A player now sees badges like "Volatility," "Buzz," "Press Story," or "Prestige" on a choice — and the game never tells them what those mean, where the effect lands, or when it pays off. The mechanics are honest but opaque.

This is the natural successor problem to the revival: the revival fixed *"the badges lie / the effects are dead."* This doc is about *"the effects are real but the player can't reason about them."*

## Evidence

From the 2026-07-04 playtest walkthrough, working through the 14 canonical keys one at a time from a pure player-experience angle:

- **Self-explanatory as-is** (no work needed): **Exec Mood**, **Rep Gamble**.
- **NOT well-defined to the player** (this doc's scope):
  - **Press** — Press Story flag + Press Buzz (momentum pool)
  - **Studio pair** — Quality bonus + Volatility (variance)
  - **Buzz** — awareness seed
  - **Prestige** — award chances

The player explicitly ranked the explanation gap as most foundational — *"if you don't know [what it is], nothing else really matters"* — but called all three gaps below equally important in practice.

## The three legibility gaps

1. **Explanation gap.** No in-context definition of what a badge like "Volatility" or "Buzz" actually does. The player learns by trial and error over many weeks. → *What does this effect DO?*

2. **Pending / banked visibility gap.** Several of these effects are not instant — they are a queue the player is loading:
   - Press Buzz **accumulates** (a growing momentum pool)
   - Quality / Volatility **bank until the next recording session**
   - Buzz **banks until the next release**
   - Prestige **accumulates across the whole campaign** (resolves at campaign end)

   None of this "currently loaded and waiting to fire" state is surfaced anywhere today. The player has spent the choice but cannot see what's in the chamber. → *What have I got loaded and waiting?*

3. **Payoff attribution gap.** When a banked effect finally resolves (a release spends its banked Buzz; a recording session consumes its Quality bonus; the campaign-end award roll cashes in Prestige), the game delivers the payoff as an anonymous number, disconnected from the decision that caused it weeks earlier. → *Why did this good/bad thing just happen?*

These map cleanly onto three moments in the effect's lifecycle: **at choice** (explanation), **while banked** (pending visibility), **at resolution** (attribution). A complete fix touches all three moments; each moment can also be shipped independently.

## Per-channel legibility snapshot (as-built)

Pulled from the canonical reference — verify against it before building, as values are balance-JSON knobs.

| Channel | Badge label(s) player sees | Timing | Where it lands | Currently visible? |
|---|---|---|---|---|
| Exec Mood | Exec Mood | instant | the executive | ✅ self-explanatory |
| Rep Gamble | Rep Gamble | instant (seeded) | reputation | ✅ self-explanatory |
| Press | Press Story / Press Buzz | banked / accumulating | next release's press roll | ❌ |
| Quality | Quality | banks to next recording session | all songs generated that week | ❌ |
| Volatility | Volatility | banks to next recording session | quality variance band | ❌ |
| Buzz (awareness) | Buzz | banks to next release | per-song awareness seed | ❌ (a Buzz chip exists in SongCatalog from PR-5, but not tied to the meeting choice) |
| Prestige (awards) | Prestige | accumulates all campaign | campaign-end award roll | ❌ (CampaignResultsModal shows the final roll, not the running pool) |

## Open questions (need product input)

- **Explanation surface:** inline tooltip on the badge? A one-time "what's this?" affordance? A glossary/codex? The player wanted the definition *in context*, not a manual.
- **How much pending state to expose, and where?** A dedicated "loaded effects" panel risks clutter; per-surface hints (e.g. "Buzz banked: +24 awareness on your next release" on the Plan Release screen) may be more legible but more scattered. Which surfaces?
- **Attribution granularity:** name the exact meeting + choice ("+24 awareness from your Week 6 CMO call"), or just the channel ("banked Buzz applied")? The delayed-effect labeling from playtest #3 (commit `ef1050b`) is a precedent to build on.
- **Is Prestige's campaign-long accumulation worth a running readout,** or is the end-of-campaign reveal actually the more satisfying payoff (surprise vs. anticipation)?

## Solution directions (options, not decisions)

- **A. At-choice explanation.** Tooltip/popover on non-self-explanatory badges sourced from a single channel-description map (co-located with `LIVE_EFFECT_KEYS`). Cheapest, highest-ranked-by-player, and unblocks the other two by giving the vocabulary a home.
- **B. Pending-effects visibility.** Surface banked state where it will be *spent*, not where it was *chosen* — Buzz on Plan Release, Quality/Volatility on the recording/session screen, Press momentum on the press-relevant surface, Prestige on a campaign-progress readout. Reads the same `flags.*` the engine already banks into (e.g. `pendingQualityBonus`, awareness seed, press momentum pool).
- **C. Payoff attribution.** Extend the WeekSummary payoff entries (already enriched for #3) to name the originating meeting/choice when a banked effect resolves. Reuses the `meetingId`/`choiceId`/`choiceLabel` context already threaded onto delayed-effect changes.

These are independent and shippable in any order; **A** is the recommended first slice (player-ranked most foundational, lowest risk, pure additive UI).

## Constraints / collisions

- **Effect-key vocabulary is fixed at 14 canonical keys** — any explanation map must stay in sync with `LIVE_EFFECT_KEYS` (the data-lint test guards the data; a doc/rule already exists for the reference doc). Consider a co-located description map so it can't drift.
- **Badge-whitelist rule** (client/CLAUDE.md): never render a badge for a key outside `LIVE_EFFECT_KEYS ∪ {executive_mood}`. Any new explanation UI must respect the same whitelist.
- **Pending state is read-only presentation** of engine-owned `flags.*` — must not become a second source of truth or a client-side write path (Phase 3.5 ownership rules).
- Pure-UI slices should not touch the engine and therefore should not perturb the golden master or `SNAPSHOT_VERSION`.

## Next steps

1. Product pass on the open questions (explanation surface + how much pending state, and where).
2. If pursued, start with direction **A** (at-choice explanation) as a standalone additive-UI PR; it's the player-ranked priority and unblocks the shared channel-description vocabulary the other two reuse.
3. Re-verify the per-channel table against the canonical reference at build time (values are balance knobs).
