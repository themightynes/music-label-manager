# Pending Decisions — Nes's Queue

*One entry per open product/strategy decision. **Structure (reorganized July 26, 2026): all OPEN/pending items live at the top, directly under this header; all resolved history lives in the `## Resolved / Former entries (archive)` section at the bottom** — so a reader sees only what's still pending up top and can dig into history below. Open items keep their original `## N.` numbering; resolved entries become `*(Former entry N — …)*` breadcrumbs (deleted from the open list, not struck) and move to the archive. Last updated: July 26, 2026 (#11 C55 email-generation failure resolved — Nes ruled LOG-AND-CONTINUE, gameplay-first; the ruling settled BOTH C55 and C108 because C108's chart-milestone flag is the same swallow-class, and the file was reorganized top-open / bottom-archive the same day; **6 decisions now open**: #6 desktop GUI, #14 C90, #17 C100, #18 C88, #19 C63, and the C62 stopped mid-session item).*

---

## Open / pending decisions

## 6. Desktop GUI migration — option A/B/C
**Q:** Cloud-dependent (A, ~60% effort) vs local-first hybrid (B, ~120%) vs full offline (C, ~250%) — gated on 5 framing questions (offline? multiplayer? mobile? timeline? monetization?). **Unblocks:** all of `desktop-gui-migration-strategy.md`. **Defer cost:** none while web-first development continues.

## 14. C90 — side-event `requires` vocabulary
**Q:** The mechanism (generic `requires` on `data/events.json` events, reusing the proven M16 grammar, replacing the ad-hoc `hasSignedArtist` filter for `crisis_fired_dancers`) is agent-buildable without content. What's the canonical precondition vocabulary — is "≥1 signed artist" the first tag, and which future events need gates? **Defer cost:** low until more predetermined-target events ship; the ad-hoc filter holds today.

## 17. C100 — cash-gate mid-advance drift window
**Q:** When v3 authors `{stat:'cash'}` requires-gates: accept + document the PHASE-1 money read (option a), or snapshot fetch-time money into the offered-meeting payload (option b)? Dormant — zero cash-gated content exists today. **Defer cost:** zero until such content ships.

## 18. C88 — what does "marketing-attributed" mean?
**Q:** Definition of the attribution model (which streams/revenue count as marketing-driven) before the structured-data surfacing is built (engine-additive + GM re-bless + UI). **Defer cost:** loss-leader view stays qualitative.

## 19. C63 — dead artist columns: wire or drop?
**Q:** `massAppeal`/`stress`/`creativity`/`moodHistory`/`lastMoodEvent`/`moodTrend` have ZERO readers (verified July 25). Wire them into systems (interactivity-gap analysis flagged massAppeal as a candidate) or drop via migration + SNAPSHOT_VERSION review? **Shipped meanwhile:** the phantom `artist.loyalty` client fallbacks are gone. **Defer cost:** schema noise only.

## Stopped mid-session (gated territory hit)
- **C62 sub-item 1 — `artistsSuccessful`/`projectsCompleted` campaign score components** (stopped inside the C62 slice, commit `f1b1315`): no doc defines "successful artist"/"completed project" semantics, and `AchievementsEngine.calculateCampaignResults` receives only the `gameState` row (no artist/project data), so implementing it needs a **design decision on the semantics** plus call-site plumbing through `ProgressionProcessor.checkCampaignCompletion`. Expanded TODO left at the site; sub-items 2–3 (Media Mogul tiers, 52-week copy) shipped.

---

## Resolved / Former entries (archive)

*Chronological/numeric record of resolved decisions. Breadcrumb text is preserved verbatim from when each entry was resolved.*

*(Former entry 1 — Tier 2 event-driven meetings + side events — resolved and removed July 5, 2026, evening session: Nes decided all six design forks (A1 stateless happenings derivation, B1 replace-the-draw injection, C2 WeekSummary beat, D1 keep-the-in-stream-draw RNG discipline, E mood disposition, F two-slice MVP arc), approved the spec with three amendments, and the whole arc EXECUTED the same evening as PRs #133–#139 — reactive meetings with why-now lines + urgency dots, side events surfaced as the WeekSummary choice beat, C64 closed, playtest gate answered CONTINUE after live verification. Full record incl. the design-space rationale: `implementation-specs/COMPLETED/[COMPLETE] tier2-reactive-meetings-and-side-events-plan.md`.)*

*(Former entry 2 — C42 awareness — resolved and removed July 6, 2026: Nes decided to **wire awareness fully player-facing** (release page + dashboard readouts per the awareness design doc) after an Opus planning-doc survey confirmed the engine side is already live (up to ~2× streaming; the "wire it or retire it" framing was stale). Build **EXECUTED the same evening** — 3 slices on `feat/awareness-surfacing` per `implementation-specs/COMPLETED/[COMPLETE] awareness-surfacing-plan.md` (all six surfacing forks decided by Nes: NOTABLE-not-hero breakthrough, aggregated buzz line, tooltip disambiguation, max aggregation, qualitative-only language, dead config → C79), verifier all-10-CONFIRMED, PR #151 stacked on #149 and held for playtest. Unblocks Release-Experience Tier 2 + the awareness design doc + the effect-legibility Buzz channel.)*

*(Former entry 2 — Hype & pre-marketing arc (Buzz v2) — resolved July 6, 2026, late evening: Nes decided ALL six forks per recommendation (A artist pools + label pool, B first-planned takes all, C keep 8-week expiry for unattached, D diminishing returns after ~4 weeks + weekly cap applies, E built pre-buzz dies with cancellation, F lead single as conduit) plus merge-first sequencing (#149 → retarget #151 → then branch off main). Spec promoted to `implementation-specs/[READY] hype-and-premarketing-plan.md` (now `COMPLETED/[COMPLETE] hype-and-premarketing-plan.md`). Arc scheduled as the current build.)*

*(Former entry 3 — C43 cancel/reschedule planned releases — resolved July 6, 2026, via the Buzz-v2 fork-E decision: releases become cancellable; refund = existing server DELETE safe-refund behavior incl. unspent pre-campaign; built pre-buzz dies with the cancellation. Ships as a slice of the hype arc. Unblocks Release-Experience Tier 3.)*

*(Former entry 4 — C32 email snapshot ~10k cap — resolved and removed July 26, 2026: Nes accepted the standing recommendation to leave it **deferred indefinitely** — the cap is ~20–100× real campaign volume, truncation surfacing already shipped, and it unblocks nothing material (defer cost ≈ zero). C32 stays Deferred-by-decision in the backlog; no code change.)*

*(Former entry 5 — Artist Mood Phases 6–10 — resolved and removed July 5, 2026, evening session: Nes folded it into the §1 Tier 2 design call and decided fork E per recommendation — Phase 7 subsumed into the shared event model as mood happenings; Phase 6 spun off as an independent small dialogue slice; Phase 9 anticipated as future tuning only; Phases 8 + 10 stay deferred pending player feedback. Recorded in the [DRAFT] Tier 2 spec §4.)*

*(Former entry 7 — C74, GameHeader AUTO review-gate bypass — resolved and removed July 5, 2026: Nes chose to route the header AUTO button through the same Option A review panel (the old direct-commit path was removed); the same slice also fixed AUTO proposing the A&R exec while the A&R office slot was in use. See backlog C74.)*

*(Earlier former entry 7 — PR #119/#120 merge timing — resolved and removed July 5, 2026: both merged, plus the docs pass, as `bbcacef`/`e6b4723`/`d3ddc2f`.)*

*(Former entry 8 — flop trigger threshold — resolved and removed July 12, 2026, meeting-content working session: Nes decided option 1 per recommendation — raise `flop_revenue_ratio`. Shipped same day on `content/meeting-content-session` (`ad155d8`): ratio 0.10 → 0.30 in `data/balance/progression.json` `reputation_system`, `flop_investment_floor` unchanged at $10k, pure config. Whether the flop now actually fires in competent play awaits round-4 playtest confirmation. Backlog C93 marked resolved.)*

*(Former entry 9 — Creative Capital economy — resolved and removed July 12, 2026, meeting-content working session: Nes decided ALL THREE sources as complementary. Option 2 (CC from chart milestones) shipped same day on `content/meeting-content-session` (`2a74a24`) via the `applyChartMilestoneBonuses` hook — once-per-song, no-stack, knobs `creative_capital_milestones.cc_top10_bonus`/`cc_number_one_bonus`, systems-map edge `e-chart-creative-capital`. Options 1 (exec-pool grants) and 3 (CEO-lane grants) are authored into the v3 ground-up scenario rewrite and land with the content-integration wave. Backlog C94 marked resolved.)*

*(Former entry 10 — C104 `physical_inventory` retune — resolved and removed July 25, 2026, evening: Nes ruled to **defer physical sales entirely** rather than retune ("not sure I want to half load in physical inventory"), mooting the formula question and clearing the content-wave HARD BLOCKER. Executed same session: the two `grant_inventory` scenarios removed from the v3 pools (`physical_media_bet` from Pat, `the_loudness_heresy` from Dante, incl. their `POOL_REVIEW_MEETING_IDS` entries + pinned pool counts); both preserved verbatim — with the money-printer analysis, candidate retune math, and a reactivation checklist — in `implementation-specs/[FUTURE] physical-inventory-system.md`. The engine mechanism stays live-but-dormant; the content-dead-verb soft lint remains the guard. C104 moved to Deferred-by-decision.)*

*(Former entry 11 — C55 email-generation failure: rethrow or log-and-continue? — resolved and removed July 26, 2026: Nes ruled **LOG-AND-CONTINUE for both, gameplay-first** — an infrastructure failure never blocks the player's advance. For C55 (emails): the week keeps committing, and the existing `summary.emailGenerationFailed` flag is now SURFACED in the WeekSummary UI as a subtle, non-blocking notice. The same ruling settled C108 (chart milestones) because C108's flag is the same swallow-class as C55's: the week keeps committing, but a skipped chart-MILESTONE grant is now RECOVERABLE — re-attempted on the next successful advance via peak-based, flag-guarded milestone detection (a milestone whose chart rows were written but whose grant was skipped by a fetch/apply failure gets granted next advance; only a generation-stage failure that wrote no rows is genuinely unrecoverable). Both C55 and C108 fully resolved — implemented this session on branch `debt/docs-hygiene-and-correctness-cluster-2026-07-26`.)*

*(Former entry 12 — C61 access-tier downgrade/loss copy tone — resolved and removed July 25, 2026, evening: Nes ruled the shipped neutral/factual copy **final** ("… Access Downgraded" / "… Access Lost") — zero string changes. The flagged doc-sync loose end was fixed in the same pass: the Label Head's Guide "Access" veteran note (`client/src/lib/helpTopics.ts`) no longer claims a door can "quietly close" — the close is described as announced. Backlog C61 fully resolved.)*

*(Former entry 13 — C89 AUTO-endorse loyalty — resolved and removed July 25, 2026, evening: Nes ruled **same loyalty by design** — AUTO-endorse and personal picks both grant 5 (`auto_endorse_loyalty_gain` stays == `loyalty_on_use`) intentionally, since AUTO already pays its own costs (CC budget, review gate) and shouldn't be taxed twice. The knob stays in `progression.json` as a reserved future tuning lever; the `autoEndorsed`-marker plumbing stays unbuilt unless a future ruling picks a differing value (re-open as a NEW C-item if so). Backlog C89 marked resolved-by-design; no code changed.)*

*(Former entry 15 — C95 Buzz bar at zero awareness — resolved and removed July 25, 2026, evening: Nes ruled to KEEP the zero-awareness Buzz section hidden — intended behavior, the always-render "building" fix does not ship; `releaseBuzz.ts` scaffolding stays dormant. The round-2/round-3 carried-forward playtest confusion closes as accepted. Backlog C95 resolved-by-design; no code changed.)*

*(Former entry 16 — C96 reactive-meeting "why now" visibility — resolved and removed July 25, 2026, evening: Nes ruled **"Amplify in place"** — the urgency dot and why-now line stay exactly where they are but get visually louder; no layout moves, no new copy, the pre-open card still reveals zero trigger text. Executed same session: urgency dot 10px→14px with an animate-ping halo + stronger glow (both ExecutiveCard sites), reactive strip glow alpha 0.16→0.32, why-now pill 11.5px→13.5px with doubled border/bg opacity and whole-pill pulse, and the AutoSelectReviewPanel's hand-duplicated pill consolidated onto the shared WhyNowLine (compact variant). Noticed-ness confirmation rides the next playtest. Backlog C96 marked resolved.)*

*(Former entry 20 — v3 CEO pool "The Buyout Letter" reputation gate rescale — resolved and removed July 25, 2026, evening: Nes rescaled the gate `reputation >= 60` → **`>= 440`** on the 0-700 scale (national-press-tier anchor; the week-40 gate remains the real limiter). Annotation updated in `client/src/admin/v3CeoPoolReview.ts`. Closes the C106 remaining designer note.)*

---

### Context: Debt-cleanup session queue (added July 25, 2026)

*Full triage in that session's backlog updates; every safe slice already shipped on `debt/cleanup-2026-07-25`. This queue appended entries #10–#20 — the designer queue distilled from the full 33-item backlog triage. Its resolved items (#10, #12, #13, #15, #16, #20) are archived above; its still-open items (#14, #17, #18, #19) are in the Open section at the top. #11 (C55) resolved July 26, 2026.*
