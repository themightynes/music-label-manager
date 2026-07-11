# Systems Balance Review — 2026-07-10

> **EXECUTED 2026-07-10.** The companion spec (all six slices) ran the same day on `feat/systems-balance-integrity` and moved to `docs/01-planning/implementation-specs/COMPLETED/[COMPLETE] systems-balance-integrity-plan.md`.

*Dated design case file. Produced from the code-verified Systems Map recon (PR #155, `client/src/admin/systemsMapData.ts` — every claim carries a file:line ref there). Point-in-time snapshot; the companion spec is `[READY] systems-balance-integrity-plan.md`.*

## Headline findings

1. **Reputation is a one-way ratchet.** It gates everything (3 access ladders, producer tiers, 4th slot, streams ×2, tours, press) but nothing ever reduces it: `reputation_system.decay_rate`, `flop_penalty`, and `goal_failure_penalty` are all authored-but-dead config. Mid/late-campaign tension evaporates; tier downgrades are theoretically possible but practically unreachable.
2. **Marketing dwarfs quality in the opening week.** Quality spread (60→95 song) ≈ 9 base-stream points; a $40k marketing spend ≈ 79 points (`sqrt(spend/1000) × 12.5`). Quality's real payoff is the tail (awareness gain ×quality/100, breakthrough gates ≥60/70/80, slower decay ≥85). "Marketing opens, quality sustains" is good, real-world-honest design — but the magnitudes fell out of hardcoded scale constants, not a decision.
3. **Marketing is a loss-leader** at $0.05/stream: a $40k spend returns ≈$10k in direct opening-week revenue. Its real returns are charts→reputation, awareness tail, popularity. Realistic (labels lose money breaking records) but never surfaced to the player. **Nes decision 2026-07-10: keep the economics, surface them (loss-leader VIEW).**
4. **Artist psychology is theater.** Energy has zero engine consumers; mood is only a ±10% quality snapshot at recording; stress barely bites. The management fantasy's human systems are far weaker than the money systems.
5. **~40% of edges are hardcoded** (streaming scales, tour costs cap×4/cap×2.7, song-quality factor maps, breakthrough thresholds, popularity saturation 3000/35, variance ranges, tour reaction tables, wks2-4 marketing coefficients). Two config blocks actively lie (shadowed `breakthrough_thresholds`, quality.json producer/time multipliers that don't feed quality).
6. **Tour popularity gains (+1..+7 flat) bypass the streaming-popularity saturation curve** — a potential late-game popularity farm.

## What's well-built (keep)

Diminishing returns on every spend (sqrt curves); channel personalities + lead-single conduit + synergy/diversity; Q4 seasonality = one strategic window per 52-week run; popularity saturation for streams; **skill compresses quality variance** (great artists are consistent, not just better — quietly the best formula in the engine); creative capital as a pure pacing gate (fine as-is — explicitly left alone).

## Recommendations → all approved by Nes 2026-07-10 ("spec all, fix everything; #3 as loss-leader view")

See the spec for the executable slices: (1) knob liberation, (2) reputation two-way via flop penalty, (3) loss-leader view, (4) mood→variance widening, (5) energy→tour effectiveness, (6) tour-popularity saturation. (7) creative capital untouched.
