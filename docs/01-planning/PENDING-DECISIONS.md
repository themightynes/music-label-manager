# Pending Decisions — Nes's Queue

*One entry per open product/strategy decision. Updated in place (resolved entries are deleted, not struck). Last updated: July 26, 2026 (#4 C32 email cap resolved — Nes accepted the standing "defer indefinitely" recommendation, removed from the open queue; **7 decisions now open**. Earlier, July 25, 2026, evening: #10, #12, #13, #15, #16, #20 all resolved — #10 physical inventory deferred entirely to `implementation-specs/[FUTURE] physical-inventory-system.md`, content-wave blocker cleared; #12/#13/#20 the Group-A low-impact rulings pass — C61 copy ruled final, C89 same-loyalty-by-design, Buyout Letter gate rescaled to 440; #15 C95 zero-awareness Buzz section ruled to stay hidden by design; #16 C96 why-now visibility ruled "Amplify in place" and shipped same session (louder dot/pill, WhyNowLine consolidation). Earlier same day: debt-cleanup session appended entries #10–#20 — the designer queue distilled from the full 33-item backlog triage; every safe mechanical slice already shipped on `debt/cleanup-2026-07-25`. Previously remaining open: C32 email cap, desktop GUI, C62 sub-item semantics — of these C32 is now resolved (July 26), desktop GUI + C62 still open).*

---

*(Former entry 1 — Tier 2 event-driven meetings + side events — resolved and removed July 5, 2026, evening session: Nes decided all six design forks (A1 stateless happenings derivation, B1 replace-the-draw injection, C2 WeekSummary beat, D1 keep-the-in-stream-draw RNG discipline, E mood disposition, F two-slice MVP arc), approved the spec with three amendments, and the whole arc EXECUTED the same evening as PRs #133–#139 — reactive meetings with why-now lines + urgency dots, side events surfaced as the WeekSummary choice beat, C64 closed, playtest gate answered CONTINUE after live verification. Full record incl. the design-space rationale: `implementation-specs/COMPLETED/[COMPLETE] tier2-reactive-meetings-and-side-events-plan.md`.)*

*(Former entry 2 — C42 awareness — resolved and removed July 6, 2026: Nes decided to **wire awareness fully player-facing** (release page + dashboard readouts per the awareness design doc) after an Opus planning-doc survey confirmed the engine side is already live (up to ~2× streaming; the "wire it or retire it" framing was stale). Build **EXECUTED the same evening** — 3 slices on `feat/awareness-surfacing` per `implementation-specs/COMPLETED/[COMPLETE] awareness-surfacing-plan.md` (all six surfacing forks decided by Nes: NOTABLE-not-hero breakthrough, aggregated buzz line, tooltip disambiguation, max aggregation, qualitative-only language, dead config → C79), verifier all-10-CONFIRMED, PR #151 stacked on #149 and held for playtest. Unblocks Release-Experience Tier 2 + the awareness design doc + the effect-legibility Buzz channel.)*

*(Former entry 2 — Hype & pre-marketing arc (Buzz v2) — resolved July 6, 2026, late evening: Nes decided ALL six forks per recommendation (A artist pools + label pool, B first-planned takes all, C keep 8-week expiry for unattached, D diminishing returns after ~4 weeks + weekly cap applies, E built pre-buzz dies with cancellation, F lead single as conduit) plus merge-first sequencing (#149 → retarget #151 → then branch off main). Spec promoted to `implementation-specs/[READY] hype-and-premarketing-plan.md` (now `COMPLETED/[COMPLETE] hype-and-premarketing-plan.md`). Arc scheduled as the current build.)*

*(Former entry 3 — C43 cancel/reschedule planned releases — resolved July 6, 2026, via the Buzz-v2 fork-E decision: releases become cancellable; refund = existing server DELETE safe-refund behavior incl. unspent pre-campaign; built pre-buzz dies with the cancellation. Ships as a slice of the hype arc. Unblocks Release-Experience Tier 3.)*

*(Former entry 4 — C32 email snapshot ~10k cap — resolved and removed July 26, 2026: Nes accepted the standing recommendation to leave it **deferred indefinitely** — the cap is ~20–100× real campaign volume, truncation surfacing already shipped, and it unblocks nothing material (defer cost ≈ zero). C32 stays Deferred-by-decision in the backlog; no code change.)*

*(Former entry 5 — Artist Mood Phases 6–10 — resolved and removed July 5, 2026, evening session: Nes folded it into the §1 Tier 2 design call and decided fork E per recommendation — Phase 7 subsumed into the shared event model as mood happenings; Phase 6 spun off as an independent small dialogue slice; Phase 9 anticipated as future tuning only; Phases 8 + 10 stay deferred pending player feedback. Recorded in the [DRAFT] Tier 2 spec §4.)*

## 6. Desktop GUI migration — option A/B/C
**Q:** Cloud-dependent (A, ~60% effort) vs local-first hybrid (B, ~120%) vs full offline (C, ~250%) — gated on 5 framing questions (offline? multiplayer? mobile? timeline? monetization?). **Unblocks:** all of `desktop-gui-migration-strategy.md`. **Defer cost:** none while web-first development continues.

*(Former entry 7 — C74, GameHeader AUTO review-gate bypass — resolved and removed July 5, 2026: Nes chose to route the header AUTO button through the same Option A review panel (the old direct-commit path was removed); the same slice also fixed AUTO proposing the A&R exec while the A&R office slot was in use. See backlog C74.)*

*(Former entry 8 — flop trigger threshold — resolved and removed July 12, 2026, meeting-content working session: Nes decided option 1 per recommendation — raise `flop_revenue_ratio`. Shipped same day on `content/meeting-content-session` (`ad155d8`): ratio 0.10 → 0.30 in `data/balance/progression.json` `reputation_system`, `flop_investment_floor` unchanged at $10k, pure config. Whether the flop now actually fires in competent play awaits round-4 playtest confirmation. Backlog C93 marked resolved.)*

*(Former entry 9 — Creative Capital economy — resolved and removed July 12, 2026, meeting-content working session: Nes decided ALL THREE sources as complementary. Option 2 (CC from chart milestones) shipped same day on `content/meeting-content-session` (`2a74a24`) via the `applyChartMilestoneBonuses` hook — once-per-song, no-stack, knobs `creative_capital_milestones.cc_top10_bonus`/`cc_number_one_bonus`, systems-map edge `e-chart-creative-capital`. Options 1 (exec-pool grants) and 3 (CEO-lane grants) are authored into the v3 ground-up scenario rewrite and land with the content-integration wave. Backlog C94 marked resolved.)*

*(Earlier former entry 7 — PR #119/#120 merge timing — resolved and removed July 5, 2026: both merged, plus the docs pass, as `bbcacef`/`e6b4723`/`d3ddc2f`.)*

---

## Debt-cleanup session queue (added July 25, 2026 — full triage in that session's backlog updates; every safe slice already shipped on `debt/cleanup-2026-07-25`)

*(Former entry 10 — C104 `physical_inventory` retune — resolved and removed July 25, 2026, evening: Nes ruled to **defer physical sales entirely** rather than retune ("not sure I want to half load in physical inventory"), mooting the formula question and clearing the content-wave HARD BLOCKER. Executed same session: the two `grant_inventory` scenarios removed from the v3 pools (`physical_media_bet` from Pat, `the_loudness_heresy` from Dante, incl. their `POOL_REVIEW_MEETING_IDS` entries + pinned pool counts); both preserved verbatim — with the money-printer analysis, candidate retune math, and a reactivation checklist — in `implementation-specs/[FUTURE] physical-inventory-system.md`. The engine mechanism stays live-but-dormant; the content-dead-verb soft lint remains the guard. C104 moved to Deferred-by-decision.)*

## 11. C55 — email-generation failure: rethrow or log-and-continue?
**Q:** When weekly email generation/persist throws, should the week ABORT (all-or-nothing, moves golden master + re-arms D6 failure-injection tests) or keep committing without emails? **Shipped meanwhile:** `summary.emailGenerationFailed` flag so the failure is at least visible. **Defer cost:** low — failures remain observable but non-blocking.

*(Former entry 12 — C61 access-tier downgrade/loss copy tone — resolved and removed July 25, 2026, evening: Nes ruled the shipped neutral/factual copy **final** ("… Access Downgraded" / "… Access Lost") — zero string changes. The flagged doc-sync loose end was fixed in the same pass: the Label Head's Guide "Access" veteran note (`client/src/lib/helpTopics.ts`) no longer claims a door can "quietly close" — the close is described as announced. Backlog C61 fully resolved.)*

*(Former entry 13 — C89 AUTO-endorse loyalty — resolved and removed July 25, 2026, evening: Nes ruled **same loyalty by design** — AUTO-endorse and personal picks both grant 5 (`auto_endorse_loyalty_gain` stays == `loyalty_on_use`) intentionally, since AUTO already pays its own costs (CC budget, review gate) and shouldn't be taxed twice. The knob stays in `progression.json` as a reserved future tuning lever; the `autoEndorsed`-marker plumbing stays unbuilt unless a future ruling picks a differing value (re-open as a NEW C-item if so). Backlog C89 marked resolved-by-design; no code changed.)*

## 14. C90 — side-event `requires` vocabulary
**Q:** The mechanism (generic `requires` on `data/events.json` events, reusing the proven M16 grammar, replacing the ad-hoc `hasSignedArtist` filter for `crisis_fired_dancers`) is agent-buildable without content. What's the canonical precondition vocabulary — is "≥1 signed artist" the first tag, and which future events need gates? **Defer cost:** low until more predetermined-target events ship; the ad-hoc filter holds today.

*(Former entry 15 — C95 Buzz bar at zero awareness — resolved and removed July 25, 2026, evening: Nes ruled to KEEP the zero-awareness Buzz section hidden — intended behavior, the always-render "building" fix does not ship; `releaseBuzz.ts` scaffolding stays dormant. The round-2/round-3 carried-forward playtest confusion closes as accepted. Backlog C95 resolved-by-design; no code changed.)*

*(Former entry 16 — C96 reactive-meeting "why now" visibility — resolved and removed July 25, 2026, evening: Nes ruled **"Amplify in place"** — the urgency dot and why-now line stay exactly where they are but get visually louder; no layout moves, no new copy, the pre-open card still reveals zero trigger text. Executed same session: urgency dot 10px→14px with an animate-ping halo + stronger glow (both ExecutiveCard sites), reactive strip glow alpha 0.16→0.32, why-now pill 11.5px→13.5px with doubled border/bg opacity and whole-pill pulse, and the AutoSelectReviewPanel's hand-duplicated pill consolidated onto the shared WhyNowLine (compact variant). Noticed-ness confirmation rides the next playtest. Backlog C96 marked resolved.)*

## 17. C100 — cash-gate mid-advance drift window
**Q:** When v3 authors `{stat:'cash'}` requires-gates: accept + document the PHASE-1 money read (option a), or snapshot fetch-time money into the offered-meeting payload (option b)? Dormant — zero cash-gated content exists today. **Defer cost:** zero until such content ships.

## 18. C88 — what does "marketing-attributed" mean?
**Q:** Definition of the attribution model (which streams/revenue count as marketing-driven) before the structured-data surfacing is built (engine-additive + GM re-bless + UI). **Defer cost:** loss-leader view stays qualitative.

## 19. C63 — dead artist columns: wire or drop?
**Q:** `massAppeal`/`stress`/`creativity`/`moodHistory`/`lastMoodEvent`/`moodTrend` have ZERO readers (verified July 25). Wire them into systems (interactivity-gap analysis flagged massAppeal as a candidate) or drop via migration + SNAPSHOT_VERSION review? **Shipped meanwhile:** the phantom `artist.loyalty` client fallbacks are gone. **Defer cost:** schema noise only.

*(Former entry 20 — v3 CEO pool "The Buyout Letter" reputation gate rescale — resolved and removed July 25, 2026, evening: Nes rescaled the gate `reputation >= 60` → **`>= 440`** on the 0-700 scale (national-press-tier anchor; the week-40 gate remains the real limiter). Annotation updated in `client/src/admin/v3CeoPoolReview.ts`. Closes the C106 remaining designer note.)*

---

## Stopped mid-session (gated territory hit)
- **C62 sub-item 1 — `artistsSuccessful`/`projectsCompleted` campaign score components** (stopped inside the C62 slice, commit `f1b1315`): no doc defines "successful artist"/"completed project" semantics, and `AchievementsEngine.calculateCampaignResults` receives only the `gameState` row (no artist/project data), so implementing it needs a **design decision on the semantics** plus call-site plumbing through `ProgressionProcessor.checkCampaignCompletion`. Expanded TODO left at the site; sub-items 2–3 (Media Mogul tiers, 52-week copy) shipped.
