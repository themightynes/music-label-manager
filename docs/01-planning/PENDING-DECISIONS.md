# Pending Decisions — Nes's Queue

*One entry per open product/strategy decision. Updated in place (resolved entries are deleted, not struck). Last updated: July 12, 2026, late session (resolved and removed #8 flop-threshold and #9 CC-economy — both decided by Nes in the meeting-content working session, built same day on `content/meeting-content-session`. Remaining open: C32 email cap, desktop GUI, C62 sub-item semantics).*

---

*(Former entry 1 — Tier 2 event-driven meetings + side events — resolved and removed July 5, 2026, evening session: Nes decided all six design forks (A1 stateless happenings derivation, B1 replace-the-draw injection, C2 WeekSummary beat, D1 keep-the-in-stream-draw RNG discipline, E mood disposition, F two-slice MVP arc), approved the spec with three amendments, and the whole arc EXECUTED the same evening as PRs #133–#139 — reactive meetings with why-now lines + urgency dots, side events surfaced as the WeekSummary choice beat, C64 closed, playtest gate answered CONTINUE after live verification. Full record incl. the design-space rationale: `implementation-specs/COMPLETED/[COMPLETE] tier2-reactive-meetings-and-side-events-plan.md`.)*

*(Former entry 2 — C42 awareness — resolved and removed July 6, 2026: Nes decided to **wire awareness fully player-facing** (release page + dashboard readouts per the awareness design doc) after an Opus planning-doc survey confirmed the engine side is already live (up to ~2× streaming; the "wire it or retire it" framing was stale). Build **EXECUTED the same evening** — 3 slices on `feat/awareness-surfacing` per `implementation-specs/COMPLETED/[COMPLETE] awareness-surfacing-plan.md` (all six surfacing forks decided by Nes: NOTABLE-not-hero breakthrough, aggregated buzz line, tooltip disambiguation, max aggregation, qualitative-only language, dead config → C79), verifier all-10-CONFIRMED, PR #151 stacked on #149 and held for playtest. Unblocks Release-Experience Tier 2 + the awareness design doc + the effect-legibility Buzz channel.)*

*(Former entry 2 — Hype & pre-marketing arc (Buzz v2) — resolved July 6, 2026, late evening: Nes decided ALL six forks per recommendation (A artist pools + label pool, B first-planned takes all, C keep 8-week expiry for unattached, D diminishing returns after ~4 weeks + weekly cap applies, E built pre-buzz dies with cancellation, F lead single as conduit) plus merge-first sequencing (#149 → retarget #151 → then branch off main). Spec promoted to `implementation-specs/[READY] hype-and-premarketing-plan.md` (now `COMPLETED/[COMPLETE] hype-and-premarketing-plan.md`). Arc scheduled as the current build.)*

*(Former entry 3 — C43 cancel/reschedule planned releases — resolved July 6, 2026, via the Buzz-v2 fork-E decision: releases become cancellable; refund = existing server DELETE safe-refund behavior incl. unspent pre-campaign; built pre-buzz dies with the cancellation. Ships as a slice of the hype arc. Unblocks Release-Experience Tier 3.)*

## 4. C32 — email snapshot ~10k cap
**Q:** Raise/chunk the email cap or accept it? **Deferred with quantified justification** (cap is ~20–100× above real campaign volume; truncation surfacing already shipped). **Unblocks:** nothing material. **Defer cost:** effectively zero. Recommend leaving deferred indefinitely.

*(Former entry 5 — Artist Mood Phases 6–10 — resolved and removed July 5, 2026, evening session: Nes folded it into the §1 Tier 2 design call and decided fork E per recommendation — Phase 7 subsumed into the shared event model as mood happenings; Phase 6 spun off as an independent small dialogue slice; Phase 9 anticipated as future tuning only; Phases 8 + 10 stay deferred pending player feedback. Recorded in the [DRAFT] Tier 2 spec §4.)*

## 6. Desktop GUI migration — option A/B/C
**Q:** Cloud-dependent (A, ~60% effort) vs local-first hybrid (B, ~120%) vs full offline (C, ~250%) — gated on 5 framing questions (offline? multiplayer? mobile? timeline? monetization?). **Unblocks:** all of `desktop-gui-migration-strategy.md`. **Defer cost:** none while web-first development continues.

*(Former entry 7 — C74, GameHeader AUTO review-gate bypass — resolved and removed July 5, 2026: Nes chose to route the header AUTO button through the same Option A review panel (the old direct-commit path was removed); the same slice also fixed AUTO proposing the A&R exec while the A&R office slot was in use. See backlog C74.)*

*(Former entry 8 — flop trigger threshold — resolved and removed July 12, 2026, meeting-content working session: Nes decided option 1 per recommendation — raise `flop_revenue_ratio`. Shipped same day on `content/meeting-content-session` (`ad155d8`): ratio 0.10 → 0.30 in `data/balance/progression.json` `reputation_system`, `flop_investment_floor` unchanged at $10k, pure config. Whether the flop now actually fires in competent play awaits round-4 playtest confirmation. Backlog C93 marked resolved.)*

*(Former entry 9 — Creative Capital economy — resolved and removed July 12, 2026, meeting-content working session: Nes decided ALL THREE sources as complementary. Option 2 (CC from chart milestones) shipped same day on `content/meeting-content-session` (`2a74a24`) via the `applyChartMilestoneBonuses` hook — once-per-song, no-stack, knobs `creative_capital_milestones.cc_top10_bonus`/`cc_number_one_bonus`, systems-map edge `e-chart-creative-capital`. Options 1 (exec-pool grants) and 3 (CEO-lane grants) are authored into the v3 ground-up scenario rewrite and land with the content-integration wave. Backlog C94 marked resolved.)*

*(Earlier former entry 7 — PR #119/#120 merge timing — resolved and removed July 5, 2026: both merged, plus the docs pass, as `bbcacef`/`e6b4723`/`d3ddc2f`.)*

---

## Stopped mid-session (gated territory hit)
- **C62 sub-item 1 — `artistsSuccessful`/`projectsCompleted` campaign score components** (stopped inside the C62 slice, commit `f1b1315`): no doc defines "successful artist"/"completed project" semantics, and `AchievementsEngine.calculateCampaignResults` receives only the `gameState` row (no artist/project data), so implementing it needs a **design decision on the semantics** plus call-site plumbing through `ProgressionProcessor.checkCampaignCompletion`. Expanded TODO left at the site; sub-items 2–3 (Media Mogul tiers, 52-week copy) shipped.
