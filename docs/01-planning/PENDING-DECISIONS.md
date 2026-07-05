# Pending Decisions — Nes's Queue

*One entry per open product/strategy decision. Updated in place (resolved entries are deleted, not struck). Last updated: July 4, 2026 (PR #120 session).*

---

## 1. Exec-meeting relevance/reactivity — Tier 0/1/2 scope fork
**Q:** How deep should "meetings react to label state" go? **Options:** Tier 0 = precondition tags so irrelevant meetings stop appearing (guardrail, smallest); Tier 1 = state-weighted meeting selection (bias, medium); Tier 2 = event-driven meetings (genuine feature, largest). **Unblocks:** the entire `[FUTURE] executive-meeting-relevance-and-reactivity.md` doc — nothing there can be planned until a tier is picked; Tier 0 is a prerequisite for 1 and 2. **Defer cost:** the playtest's root disengagement ("hit AUTO because it doesn't matter") stays unaddressed; legibility Slice A (shipped this session, PR #120) treats a symptom, not this cause.

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

## 7. PR #119 merge timing (and now PR #120 stacked on it)
**Q:** When to do the one-merge-at-the-end of `feat/exec-meetings-revival`? **New consideration this session:** PR #120 (Group D fixes + legibility Slice A + Email Narrative Phase 1) is stacked on #119 and lands only after it. **Defer cost:** grows with every stacked commit — `main` is now 50+ commits behind the working line; the `[READY]` revival plan doc can't move to `COMPLETED/` until merge.
**✅ RESOLVED (July 5, 2026):** the unpushed-playtest-commits blocker is cleared — Nes authorized the plain fast-forward push and `origin/feat/exec-meetings-revival` now ends at `d562d0d` (verified pure fast-forward from `5fdea64`, no force). GitHub's #119 carries the full playtest work and #120's diff shows only its own commits. The remaining question here is merge timing itself.

---

## Stopped mid-session (gated territory hit)
- **C62 sub-item 1 — `artistsSuccessful`/`projectsCompleted` campaign score components** (stopped inside the C62 slice, commit `f1b1315`): no doc defines "successful artist"/"completed project" semantics, and `AchievementsEngine.calculateCampaignResults` receives only the `gameState` row (no artist/project data), so implementing it needs a **design decision on the semantics** plus call-site plumbing through `ProgressionProcessor.checkCampaignCompletion`. Expanded TODO left at the site; sub-items 2–3 (Media Mogul tiers, 52-week copy) shipped.
