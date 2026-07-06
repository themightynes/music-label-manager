# Pending Decisions — Nes's Queue

*One entry per open product/strategy decision. Updated in place (resolved entries are deleted, not struck). Last updated: July 5, 2026, late evening (former §1 Tier 2 + side-events ARC LANDED — decided, specced, executed, playtested, all in one evening, PRs #133–#139 — and removed; former §5 mood phases 6–10 resolved via fork E, removed earlier the same evening; remaining open: C42 awareness, C43 release cancel/reschedule, C32 email cap, desktop GUI).*

---

*(Former entry 1 — Tier 2 event-driven meetings + side events — resolved and removed July 5, 2026, evening session: Nes decided all six design forks (A1 stateless happenings derivation, B1 replace-the-draw injection, C2 WeekSummary beat, D1 keep-the-in-stream-draw RNG discipline, E mood disposition, F two-slice MVP arc), approved the spec with three amendments, and the whole arc EXECUTED the same evening as PRs #133–#139 — reactive meetings with why-now lines + urgency dots, side events surfaced as the WeekSummary choice beat, C64 closed, playtest gate answered CONTINUE after live verification. Full record incl. the design-space rationale: `implementation-specs/COMPLETED/[COMPLETE] tier2-reactive-meetings-and-side-events-plan.md`.)*

## 2. C42 — awareness → wire further or stop celebrating it
**Q:** Awareness is live in streaming revenue but weakly surfaced — invest in full player-facing integration (release page/dashboard readouts per `[FUTURE] awareness-system-design.md`) or trim the celebration to match its weight? **Unblocks:** Release-Experience Tier 2 AND the awareness design doc (three docs queue on this one call). **Defer cost:** a live economic system stays invisible; WeekSummary keeps celebrating a stat players can't reason about. **Session evidence:** C69 (fixed July 4 on PR #119) showed marketing-driven awareness gain was silently dead for ~9 months and nobody noticed — strong signal the system's invisibility is itself the bug. The Slice A "Buzz" tooltip (PR #120) now explains the meeting channel, which slightly raises the cost of removing awareness later.

## 3. C43 — cancel/reschedule planned releases
**Q:** Should planned releases be cancellable/reschedulable, and what's the refund rule? Server DELETE endpoint with safe refund already exists; only UI + refund-policy decision missing. **Unblocks:** Release-Experience Tier 3. **Defer cost:** money committed to a distant release week stays unrecoverable; inconsistent with tours (60% refund).

## 4. C32 — email snapshot ~10k cap
**Q:** Raise/chunk the email cap or accept it? **Deferred with quantified justification** (cap is ~20–100× above real campaign volume; truncation surfacing already shipped). **Unblocks:** nothing material. **Defer cost:** effectively zero. Recommend leaving deferred indefinitely.

*(Former entry 5 — Artist Mood Phases 6–10 — resolved and removed July 5, 2026, evening session: Nes folded it into the §1 Tier 2 design call and decided fork E per recommendation — Phase 7 subsumed into the shared event model as mood happenings; Phase 6 spun off as an independent small dialogue slice; Phase 9 anticipated as future tuning only; Phases 8 + 10 stay deferred pending player feedback. Recorded in the [DRAFT] Tier 2 spec §4.)*

## 6. Desktop GUI migration — option A/B/C
**Q:** Cloud-dependent (A, ~60% effort) vs local-first hybrid (B, ~120%) vs full offline (C, ~250%) — gated on 5 framing questions (offline? multiplayer? mobile? timeline? monetization?). **Unblocks:** all of `desktop-gui-migration-strategy.md`. **Defer cost:** none while web-first development continues.

*(Former entry 7 — C74, GameHeader AUTO review-gate bypass — resolved and removed July 5, 2026: Nes chose to route the header AUTO button through the same Option A review panel (the old direct-commit path was removed); the same slice also fixed AUTO proposing the A&R exec while the A&R office slot was in use. See backlog C74.)*

*(Earlier former entry 7 — PR #119/#120 merge timing — resolved and removed July 5, 2026: both merged, plus the docs pass, as `bbcacef`/`e6b4723`/`d3ddc2f`.)*

---

## Stopped mid-session (gated territory hit)
- **C62 sub-item 1 — `artistsSuccessful`/`projectsCompleted` campaign score components** (stopped inside the C62 slice, commit `f1b1315`): no doc defines "successful artist"/"completed project" semantics, and `AchievementsEngine.calculateCampaignResults` receives only the `gameState` row (no artist/project data), so implementing it needs a **design decision on the semantics** plus call-site plumbing through `ProgressionProcessor.checkCampaignCompletion`. Expanded TODO left at the site; sub-items 2–3 (Media Mogul tiers, 52-week copy) shipped.
