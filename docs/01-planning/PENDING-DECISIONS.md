# Pending Decisions — Nes's Queue

*One entry per open product/strategy decision. Updated in place (resolved entries are deleted, not struck). Last updated: July 5, 2026 (merge day + meeting-relevance Tier 0+1 arc).*

---

## 1. Tier 2 (event-driven meetings) — deferred, paired with side-events
**Resolved upstream (July 5, 2026):** Nes chose **Tier 0+1 as one planned slice** — plan: `implementation-specs/COMPLETED/[COMPLETE] meeting-relevance-tier0-1-plan.md` (EXECUTED — PRs #122–#124 merged July 5, 2026; verifier-confirmed except C74, see §7). **What remains pending:** Tier 2 (meetings fire *because* something happened) is deferred by decision and must be **designed jointly with the deferred side-events system** — they'd share an event model (`events.json` is already key-clean per revival PR-8); neither should be planned in isolation. The Tier 0+1 selection pipeline is built as staged pure functions specifically so Tier 2 slots in as a pre-draw stage (plan §5). **Unblocks when decided:** the "timeliness" half of the relevance problem + the phantom side-events system. **Defer cost:** low while Tier 0+1 is unplaytested — timeliness feedback should come from playing the weighted version first.

## 2. C42 — awareness → wire further or stop celebrating it
**Q:** Awareness is live in streaming revenue but weakly surfaced — invest in full player-facing integration (release page/dashboard readouts per `[FUTURE] awareness-system-design.md`) or trim the celebration to match its weight? **Unblocks:** Release-Experience Tier 2 AND the awareness design doc (three docs queue on this one call). **Defer cost:** a live economic system stays invisible; WeekSummary keeps celebrating a stat players can't reason about. **Session evidence:** C69 (fixed July 4 on PR #119) showed marketing-driven awareness gain was silently dead for ~9 months and nobody noticed — strong signal the system's invisibility is itself the bug. The Slice A "Buzz" tooltip (PR #120) now explains the meeting channel, which slightly raises the cost of removing awareness later.

## 3. C43 — cancel/reschedule planned releases
**Q:** Should planned releases be cancellable/reschedulable, and what's the refund rule? Server DELETE endpoint with safe refund already exists; only UI + refund-policy decision missing. **Unblocks:** Release-Experience Tier 3. **Defer cost:** money committed to a distant release week stays unrecoverable; inconsistent with tours (60% refund).

## 4. C32 — email snapshot ~10k cap
**Q:** Raise/chunk the email cap or accept it? **Deferred with quantified justification** (cap is ~20–100× above real campaign volume; truncation surfacing already shipped). **Unblocks:** nothing material. **Defer cost:** effectively zero. Recommend leaving deferred indefinitely.

## 5. Artist Mood Phases 6–10
**Q:** Ship the deferred enhancements (dialogue integration, event system, enhanced UI, advanced factors, analytics) or keep the pause? Paused since 2025-10-12 awaiting player feedback on the Phase 1–5 core. **Unblocks:** the back half of `[IN-PROGRESS] artist-mood-plan.md`. **Defer cost:** low; core mood works. Worth folding the decision into the relevance/reactivity call (#1) since both concern "systems reacting to state."

## 6. Desktop GUI migration — option A/B/C
**Q:** Cloud-dependent (A, ~60% effort) vs local-first hybrid (B, ~120%) vs full offline (C, ~250%) — gated on 5 framing questions (offline? multiplayer? mobile? timeline? monetization?). **Unblocks:** all of `desktop-gui-migration-strategy.md`. **Defer cost:** none while web-first development continues.

## 7. C74 — GameHeader AUTO button bypasses the propose-then-confirm gate
**Q:** The always-visible header AUTO button (`client/src/components/GameHeader.tsx`, Phase 4 code — pre-existing, not touched by PR-3) still fetches, scores, and **commits AUTO picks immediately**, bypassing the Option A review panel that now gates the Executive Suite's AUTO button. Found by the July 5 fresh-context verifier (F1, Medium); logged as backlog C74. **Options:** (a) wire the header button through the same review flow (needs the machine's review state reachable from outside ExecutiveMeetings — real plumbing); (b) remove/repoint the header button to the Executive Suite (product/UX call — it's the more prominent button); (c) accept two AUTO behaviors and document it. **Unblocks:** C74; makes Option A's "one deliberate glance" actually universal. **Defer cost:** players who use the header button never see the review gate, so the disengagement fix doesn't reach them — worth deciding before the next playtest.

*(Former entry 7 — PR #119/#120 merge timing — resolved and removed July 5, 2026: both merged, plus the docs pass, as `bbcacef`/`e6b4723`/`d3ddc2f`.)*

---

## Stopped mid-session (gated territory hit)
- **C62 sub-item 1 — `artistsSuccessful`/`projectsCompleted` campaign score components** (stopped inside the C62 slice, commit `f1b1315`): no doc defines "successful artist"/"completed project" semantics, and `AchievementsEngine.calculateCampaignResults` receives only the `gameState` row (no artist/project data), so implementing it needs a **design decision on the semantics** plus call-site plumbing through `ProgressionProcessor.checkCampaignCompletion`. Expanded TODO left at the site; sub-items 2–3 (Media Mogul tiers, 52-week copy) shipped.
