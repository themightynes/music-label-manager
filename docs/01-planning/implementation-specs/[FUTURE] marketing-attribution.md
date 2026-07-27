# [FUTURE] Marketing-Attributed Revenue

**Status**: `[FUTURE]` — **PAUSED** pending a designer policy call (see the KEY BLOCKER in §4). Dated 2026-07-27.
**Origin**: Backlog **C88** / former PENDING-DECISIONS **#18**.

---

## 1. The question

Define which streams/revenue count as **marketing-driven**, so the marketing budget's payoff can be shown as a **quantified** number instead of the current purely qualitative "loss-leader" framing (`MARKETING_LOSS_LEADER_NOTE` in `client/src/lib/releaseBuzz.ts`). The player should be able to see that marketing spend, while it rarely earns back its cost in *direct* week-1 streams, drives a measurable tail of downstream revenue.

## 2. Revenue chain (verified 2026-07-27)

Marketing enters streaming revenue in two structurally different places:

- **WEEK 1 — clean additive term.** In `FinancialSystem.calculateStreamingOutcome` (`shared/engine/FinancialSystem.ts:795-868`), ad spend is one additive component of `baseStreams`:
  `Math.sqrt(adSpend / marketingScaleDivisor) * config.marketing_weight * marketingScaleMultiplier`
  (the shipped literals resolve to `sqrt(adSpend/1000) * 12.5`). Because it is a discrete summand, the marketing contribution to week-1 streams is **trivially attributable** — you can read it straight off the formula.

- **TAIL (weeks 2+) — entangled multipliers.** Marketing has no additive slice in the decay weeks. Instead it flows through awareness:
  `marketing → calculateAwarenessGain (FinancialSystem.ts:~1231; no spend ⇒ no awareness) → gates the breakthrough roll → awareness then multiplies decay streams.`
  The two tail multipliers are `weeklyStreams *= marketingFactor` (~L1104-1105, `calculateMarketingFactor` / `ongoing_marketing_factor`) and `weeklyStreams *= awarenessModifier` (~L1125-1131). **There is no additive marketing term to read off in the tail** — marketing's tail value only exists as a *ratio against the counterfactual*.

This asymmetry (additive head, multiplicative entangled tail) is what makes attribution a design decision rather than a lookup.

## 3. Three attribution models

**(a) MARGINAL LIFT** — revenue vs a **$0-marketing counterfactual** (spend it vs don't). True causal attribution, and the only model that correctly captures the tail. **Cost:** requires a **seeded SHADOW RE-SIMULATION** of the release with marketing zeroed — big and invasive (double the sim, re-thread RNG seeds, keep the shadow run out of persisted state).

**(b) PROPORTIONAL SHARE** — attribute marketing's *fraction of baseStreams*. Easy and defensible for week 1; **ill-defined in the tail**, where marketing is a multiplier on everything rather than a share of a sum. Model breaks exactly where the interesting money is.

**(c) CHANNEL-TAGGED (recommended v1)** — capture the tail multipliers **as they already fire** and emit them as a field:
`marketingAttributed += weeklyStreams * (marketingFactor - 1) + weeklyStreams * (awarenessModifier - 1)`
plus the week-1 additive term. **Additive read-off, no change to engine math** (the multipliers already exist and run; we only record their incremental effect). Teaches the player the **channel-mix lever** — that awareness/marketing multipliers are compounding the tail. Not a pure causal counterfactual (it credits the multipliers' effect on already-boosted streams), but honest, cheap, and legible.

**Recommendation: ship (c) as v1.** Keep **marginal-lift (a)** as a possible **phase 2** if designers later want true causal numbers.

## 4. KEY BLOCKER — resolve FIRST

C88 **directly conflicts with the standing "fork-E rule"**: the loss-leader marketing copy (`releaseBuzz.ts:459-471`, `MARKETING_LOSS_LEADER_NOTE` / `_TOOLTIP`) is **qualitative only — no formulas, multipliers, or percentages anywhere in that copy**, by explicit design. C88's entire purpose is to surface a **dollar number**.

**A designer must decide whether C88 overrides the fork-E rule before any build starts.** If the answer is "keep copy number-free," C88 is dead as specified and should be re-scoped or closed. Do not implement against an unresolved policy — the whole UI slice (§5.3) is gated on this call.

## 5. Implementation slices (for model c, once unblocked)

1. **Engine-additive capture** — at the two multiplier sites in `FinancialSystem` (week-1 additive term in `calculateStreamingOutcome` ~L827; tail `marketingFactor`/`awarenessModifier` multipliers ~L1104-1131), accumulate a `marketingAttributedRevenue` and **persist** it on the release/song outcome. No change to the actual stream math — pure read-off of terms that already fire.
2. **Aggregate into ROI** — roll `marketingAttributedRevenue` into the `AnalyticsService` ROI payload (`server/services/AnalyticsService.ts:54-110`, `getArtistROI`) so it flows to `PerformanceMetrics`.
3. **UI** — upgrade the loss-leader view to a **two-part number**: e.g. *"direct receipt −$X · marketing-driven tail +$Y"* — **and re-bless the golden master** (this changes the persisted/displayed outcome shape). Gated on §4.

## 6. Pointers

- `shared/engine/FinancialSystem.ts:795-1300` — week-1 additive marketing term (~L827), tail `marketingFactor` (~L1104), `awarenessModifier` (~L1125-1131), `calculateAwarenessGain` (~L1231).
- `data/balance/markets.json` — `market_formulas.streaming_calculation`, `.awareness_system`, `ongoing_marketing_factor` knobs.
- `server/services/AnalyticsService.ts:54-110` — `getArtistROI` payload (aggregation target).
- `client/src/lib/releaseBuzz.ts:459-471` — the fork-E loss-leader copy (the blocker) + `PerformanceMetrics.tsx` + `PlanReleasePage.tsx:1148-1159` (UI surfaces).
- `docs/98-research/SYSTEMS_BALANCE_REVIEW_2026-07-10.md` — loss-leader ground truth (marketing rarely earns back direct cost).
- `docs/98-research/INTERACTIVITY_GAP_ANALYSIS_2026-07-03.md` — awareness-invisible framing (why the tail is currently illegible).
