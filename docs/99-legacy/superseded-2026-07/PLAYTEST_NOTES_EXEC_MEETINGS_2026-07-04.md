> ⚠️ ARCHIVED July 4, 2026 — playtest tracker for the exec-meetings-revival (PR #119); all findings resolved or elevated, so the doc is closed. Superseded by: the fix commits on `feat/exec-meetings-revival` (see the "Fixes landed" tables below for the per-finding commit refs), `docs/09-troubleshooting/technical-debt-backlog.md` (C67 open; C68/C69 resolved), and the two elevated design docs `docs/01-planning/implementation-specs/[FUTURE] executive-meeting-effect-legibility.md` + `docs/01-planning/implementation-specs/[FUTURE] executive-meeting-relevance-and-reactivity.md`. Any NEW findings from continued playtesting belong in a fresh dated doc, not here. Kept for historical reference.

# Playtest Notes — Executive Meetings Revival (2026-07-04)

Live notes captured while playtesting `feat/exec-meetings-revival` (post-PR #119, unmerged). Raw observations first, triage/follow-ups at the end.

Context: see [[exec-meetings-revival-execution]] memory and `docs/98-research/EXECUTIVE_MEETINGS_CASE_FILE_2026-07-03.md` for what shipped in this arc. See also `docs/01-planning/implementation-specs/REFERENCES AND ANALYSIS/[REFERENCE] executive-meetings-system-complete-reference.md` (as-built canonical reference, walked through alongside this playtest) and `docs/09-troubleshooting/technical-debt-backlog.md` (durable tracker — playtest bugs #8/#9 promoted there as C67/C68).

---

## Raw notes

(newest at bottom — just tell me what you're seeing and I'll log it here)

1. **Weekly results popup — "Meetings" section shows duplicate/doubled entries per exec.** Screenshot shows:
   - "Met with head_ar" (+2 Mood, +5 Loyalty)
   - "Met with Head of A&R" (no stats shown)
   - "Met with cmo" (-2 Mood, +5 Loyalty)
   - "Met with Chief Marketing Officer" (no stats shown)
   - "Met with CEO" (no stats shown, no paired raw-slug entry visible)

   Pattern: looks like one entry uses the raw role slug (`head_ar`, `cmo`) with the actual mood/loyalty deltas, and a second entry uses the human-readable title (`Head of A&R`, `Chief Marketing Officer`) with no deltas — i.e. two renders of the same meeting, one correct/populated and one a duplicate stub. CEO only shows the human-readable one (no slug-based duplicate seen in this screenshot, or it's off-screen).

2. **Advancing to next week from inside the executive meetings room skips the Weekly Results popup entirely.** No summary shown for that week's outcome — presumably still processed server-side, just the client doesn't surface the popup when triggered from that screen/route.

3. **"Delayed effect triggered" entries in weekly results are unlabeled/generic — unclear what they refer to.** Screenshot shows the same duplicate-entry pattern from #1 (`Met with cmo` +5 Mood/+5 Loyalty paired with an empty `Met with Chief Marketing Officer`; `Met with head_distribution` +8 Mood/+5 Loyalty paired with an empty `Met with Head of Distribution/Operations`), followed by **three** separate boxes that just say "Delayed effect triggered" with no name, exec, or effect detail attached. Then a final distinct box: "Chief Creative Officer's loyalty decreased (ignored for 3 weeks)." Player can't tell whether that last box IS one of the three "Delayed effect triggered" entries (i.e. redundant/duplicate rendering of the same event) or a fourth, separate delayed effect — the three generic boxes give no way to match them to outcomes. Needs the delayed-effect entries to say what triggered and what the effect was (like the CCO ignored-loyalty one does), not just a bare "Delayed effect triggered" placeholder.

4. **Artist Talent stat isn't surfaced anywhere except the Artist Hats tab of the artist profile.** Player has to drill into that specific sub-tab to see an artist's talent; it doesn't show alongside other artist stats elsewhere (roster list, artist header/summary, etc.). Request: audit where other artist stats (mood, loyalty, popularity, etc.) are already surfaced across the UI and add talent to those same spots so it's visible without the extra drill-down.

   **Sub-agent findings (haiku, code audit):** `talent` is already in the schema (`shared/schema.ts:41`) and **is already rendered in 4 places** — `OverviewTab.tsx:131-135` (full stat-bar, same component as mood/energy), `ar-office/ArtistDiscoveryTable.tsx:270`, `ArtistDiscoveryModal.tsx:251/257`, and `executive-meetings/ArtistSelector.tsx:71-95`. It's **missing** from `ArtistDashboardCard.tsx:113-117` (roster dashboard cards), `ArtistCard.tsx:155-183` (expanded profile header, 5-col metric grid), `ArtistDialogueModal.tsx:141-152` (dialogue badges), and `ManagementTab.tsx` (relationship tab).
   ⚠️ This doesn't line up with the "only visible under Artist Hats" observation above — worth double-checking in-app whether OverviewTab's talent bar is actually rendering/visible for the player, or whether "Artist Hats" *is* OverviewTab under a different label. Needs a quick look before treating this as confirmed scope (add talent to: roster cards, profile header, dialogue modal).

5. **Dashboard calendar: week view is missing prev/next navigation arrows that the month view has.** Month view lets you page back/forth; week view has no equivalent control to step to adjacent weeks. Flagged as an easy UI add.

6. **Live Performance / venue capacity: slider range doesn't match the actual server-side minimum, causing a 400 error.** Repro state: Week 5, reputation = 2, all venue access tiers show "None" / "Current venue access: no access" (reputation gate presumably needs to be higher than 2, tier threshold maybe ~15?). Despite that, the "Single Show" venue capacity slider is enabled and lets the player drag from 0–50. Submitting (or the game auto-validating) throws **"Error: 400: venueCapacity must be a number >= 50"** — i.e. the server requires capacity ≥ 50, but the client slider happily lets you pick 0–49, guaranteeing a failed request for most of the slider's range. Two bugs bundled together:
   - (a) slider min should be clamped to match the server's `>= 50` validation (or server should accept the same range client offers)
   - (b) separately: is a reputation-2 player even supposed to have "Single Show" available at all if venue access is "no access" / 0-15 tier is locked? Need to check whether the slider should be disabled/hidden entirely when venue access is None, rather than exposing a control that always fails validation.
   **Root cause found (Explore sub-agent):**
   - Client: `client/src/pages/LivePerformancePage.tsx` — `getCapacityRange()` (~L481-510) pulls slider min/max straight from `data/balance/progression.json`'s `venue_access.none.capacity_range` = `[0, 50]` (L85), and the `<Slider>` (L839-846) uses that range directly. No gating on `venueAccess === 'none'` — slider renders fully interactive.
   - Server: `server/routes/tour.ts` L26-31 hardcodes `venueCapacity < 50` → 400, independent of the config's per-tier ranges. Also L46-48 separately rejects the whole request outright if `venueAccess === 'none'` — so a rep-2 player can't book *any* show regardless of slider value.
   - Config: `data/balance/progression.json` L82-103 — tiers are `none` (threshold 0, range [0,50]), `clubs` (threshold 5, range [50,500]), `theaters` (threshold 20, [500,2000]), `arenas` (threshold 45, [2000,20000]). The `none` tier's own declared range (0-50) directly contradicts the server's hardcoded `>= 50` floor — config and validation were never reconciled.
   - **Verdict: three-layer bug** — (1) data/config: `none` tier range collides with hardcoded server minimum; (2) server: silently rejects the whole tier rather than reflecting that in the client; (3) client: slider isn't disabled/hidden when `venueAccess === 'none'`, so the player interacts with a control that can never succeed. Fix needs to touch the config (or the hardcoded 50), tour.ts's validation, and LivePerformancePage's slider gating together — not just one layer.

7. **"Met with CEO" in the weekly results Meetings section doesn't make sense — the player IS the CEO.** In this game the player character occupies the CEO role, so a "meeting" line item framed as the player meeting with themselves is a narrative/logic error. Likely the CEO exec role is being treated the same as the other hired executives (CMO, Head of A&R, Head of Distribution, CCO) in the meetings loop when it shouldn't be — either CEO shouldn't appear in the meetings list at all, or the copy/framing needs to be different (e.g. a personal reflection/solo decision rather than "met with").

8. **Tour planning: venueCapacity slider locks exclusively to the current tier's band instead of allowing anything up to that tier's max.** Related to #6's `venue_access` tiers (`none` [0,50], `clubs` [50,500], `theaters` [500,2000], `arenas` [2000,20000] per `data/balance/progression.json`). Player is currently at Theater access, but the slider only lets them pick within [500, 2000] — they can't book a smaller/club-sized show for a brand-new artist who shouldn't debut at a 500-capacity venue. Design expectation: unlocking a tier should *raise the ceiling*, not move the floor — the range should probably be `[lowest-unlocked-tier-min, current-tier-max]` (or just `[0, current-tier-max]`) so higher-reputation labels can still book small/appropriate shows for new signings, rather than being forced into oversized venues for every artist. **→ Promoted to `technical-debt-backlog.md` Comment 67 (2026-07-04).**

9. **Weekly Summary "Milestone Moments" — wrong stage label applied to a tour milestone.** For a tour named "Quantum Leap Showcase," the milestone entries read: "Quantum Leap Showcase" / "Advanced to Recorded Stage" / "Tour Completed After One City." "Advanced to Recorded Stage" is wrong for a tour event — "Recorded" is a project/recording-project stage label, not a touring concept. Likely the milestone-moments generator is reusing a generic project-stage-progression message/enum for tour milestones without a tour-specific label set (tours should probably progress through something like Planned → Touring/In Progress → Completed, not the recording pipeline's stage names). **→ Promoted to `technical-debt-backlog.md` Comment 68 (2026-07-04).**

10. **[BIG FEATURE IDEA] Artist profit-sharing on streaming/revenue and tour income.** Currently (as far as observed) all streaming/revenue-stream income and tour income appears to flow entirely to the label with no cut siphoned to the artist. Proposal: introduce a revenue-share mechanic where artists get a percentage of streaming revenue and a percentage of tour revenue, likely tied to contract terms/artist deals. This is flagged explicitly as a *bigger* feature, not a quick fix — would need its own design pass (where does the % come from — negotiated at signing? tied to loyalty/leverage? does it affect label net profit calculations, mood/loyalty if underpaid, etc.) before scoping implementation.

11. **Auto-select meetings feature allows picking a combination that would overdraw Creative Capital.** Week 10, player had 1 Creative Capital remaining, used the "auto" feature for meeting selection, and the resulting Impact Preview showed **-2 Creative Capital** — i.e. auto-select chose a combo that spends more CC than the player has available. This shouldn't be possible: either the auto-select algorithm needs a budget constraint (don't pick choices that collectively exceed remaining CC), or at minimum the game needs to block/clamp/warn before letting the player commit to a preview that goes negative. Needs fleshing out — currently no guardrail against negative CC from auto-select.

12. **Tour-completion email only reports gross revenue, not actual profit.** The metrics email sent after a tour wraps shows gross revenue only — doesn't net out tour costs (venue, production, etc.) to show what the label actually made/lost. Player wants to see real profit in that summary, not just top-line revenue.

---

## Design discussion — effect-key legibility (2026-07-04, post-playtest walkthrough with Claude)

Follow-on conversation after the raw notes above, working through the 14 canonical effect keys one at a time from a pure player-experience angle (what does this mean to the player, not how it's coded). Ties directly into observations #1 and #3 (duplicate/unlabeled meeting entries) — the underlying problem is broader than just those rendering bugs.

**Which badges are currently self-explanatory to the player vs. not:**
- Self-explanatory as-is: **Exec Mood**, **Rep Gamble** (both read fine without extra context)
- NOT well-defined for the player: **Press** (Press Story + Press Buzz), **Studio pair** (Quality + Volatility), **Buzz** (awareness), **Prestige** (award chances) — these show up as badge labels on meeting choices and again in the weekly results, but the game never tells the player what they mean, what they attach to, or where they land.

**Three distinct UX gaps identified (player and Claude agreed all three matter; player ranked explanation as most foundational — "if you don't know #1, nothing else really matters" — but all three were called equally important in practice):**

1. **Explanation gap** — no in-context definition of what a badge like "Volatility" or "Buzz" actually does. Player currently has to learn by trial and error over many weeks of play.
2. **Pending/banked visibility gap** — several of these aren't instant, they're a queue (Press Buzz accumulates; Quality/Volatility bank until the next recording session; Buzz banks until the next release; Prestige accumulates all campaign). None of this "currently loaded and waiting to fire" state is visible anywhere to the player today.
3. **Payoff attribution gap** — when a banked effect finally resolves (a release finally spends its banked Buzz, a recording session finally consumes its Quality bonus), the game doesn't tell the player "this happened because of the choice you made two weeks ago." The payoff lands as an anonymous number, disconnected from the decision that caused it.

**Status: discussion only, not yet scoped into a plan.** Explicitly not mapping/planning implementation yet — this section is capturing the design conversation itself so it isn't lost, to be picked up in a later planning pass.

---

## Design discussion — meeting relevance / "fakeness" (2026-07-04, same walkthrough)

Separate overarching feeling from the player, distinct from the effect-key legibility gaps above: **meetings feel disconnected from the actual state of the label.**

- Confirmed mechanism (per the reference doc): meeting selection is one random pick per executive per week from that exec's whole authored pool, with no check for whether the topic is currently relevant. A tour-scale meeting from Head of Distribution can fire with no tour running; an A&R meeting can reference "your artist" with no artist signed.
- Player experience: the executive confidently references something (a tour, an artist, a release) that isn't actually happening in the label right now, which breaks the illusion that the exec team is paying attention to the player's actual business — meetings read as generic/fake rather than reactive.
- **Real downstream cost, stated directly by the player: "most of the time you just end up hitting the auto button because it really doesn't matter."** Because the meeting doesn't feel tied to anything real, the rational player response is to disengage (AUTO) rather than deliberate — which undercuts the entire point of the system (weekly player agency/decision-making).
- Open sub-question raised but not yet resolved: even when a meeting IS topically relevant, does the pick still feel arbitrary in *timing* (no sense of "this is timely because X just happened")? Flagged for a future pass, not confirmed either way yet.
- **Follow-up, same conversation: the choices *within* a meeting inherit the same fakeness — player confirmed "it's all one thing."** It isn't that meeting relevance is one problem and choice meaningfulness is a separate one; if the meeting itself doesn't feel tied to the label's real state, the choices offered inside it can't feel meaningful either, no matter how well-balanced their payoffs are under the hood. The relevance problem is upstream of, and likely the root cause of, the choices-don't-matter feeling — not just a coincidentally correlated complaint.

**Status: discussion only, not yet scoped into a plan.**

---

## Fixes landed — 2026-07-04 (branch `feat/exec-meetings-revival`, PR #119, orchestrated subagent batch)

Five findings fixed and committed on the branch this session (orchestrator + subagents; every fix orchestrator-reviewed, full suite green at **1,151 tests** after the batch). All rode onto PR #119 per the standing "one merge at the end" policy — no new branches.

| # | Fix | Commit | Notes |
|---|-----|--------|-------|
| **#1** | Meeting rows deduped — `processExecutiveActions` no longer pushes a second `executive_interaction` "Met with `<slug>`" row; it returns the mood/loyalty deltas which `processRoleMeeting` folds onto the single `meeting` change | `ef1050b` | Fixed at the SOURCE (ActionProcessor), not the renderer. WeekSummary already rendered deltas for any meetings-bucket entry, so display is preserved. Loyalty-decay `executive_interaction` path untouched. |
| **#3** | Delayed-effect payoffs labeled via new `describeDelayedEffect()` — "Delayed effect: `<meeting>` — `<choice>`" instead of bare "Delayed effect triggered", graceful fallbacks | `ef1050b` | Resolves meeting name + choice label from the delayed-effect flag context. |
| **#7** | CEO meetings render "Executive strategy decision" instead of "Met with CEO" (player IS the CEO) | `ef1050b` | Golden-master's single delta; snapshot updated. |
| **#5** | Week-view calendar gains prev/next arrows mirroring the month view, clamped to `[minWeek, maxWeek]` | `45d884d` | `MusicCalendar.tsx`, client-only. |
| **#6** | Venue booking UI gated when `venueAccess === 'none'` — slider hidden behind a reputation-gated "Venue Access Locked" panel, `handleSubmit`/Book disabled | `f41bf27` | Client-only; server `>=50` / `none`-rejection guards left intact (they were correct). Unlock threshold derived from config, not hardcoded. Tier-band issue (#8/C67) explicitly out of scope. |

Regression coverage added in `69a7bcf` (`tests/engine/meeting-change-dedup.test.ts`, 5 tests): pins single-`meeting`-row + folded deltas (#1), CEO relabel + no exec deltas (#7), and `describeDelayedEffect` labeling with fallbacks (#3).

### Batch 2 — no-decision fixes (2026-07-04, second orchestrated wave)

Four more agents in parallel (client-disjoint + one isolated engine agent for the golden-master-touching tour work). Full suite green at **1,177 tests** after the batch; tsc clean.

| # | Fix | Commit | Notes |
|---|-----|--------|-------|
| **#4** (roster/profile) | Talent surfaced on `ArtistDashboardCard` (roster), `ArtistCard` (profile grid 5→6 col), `ArtistDialogueModal` (badge), `ManagementTab` (relationship card) | `4bcfc26` | Prop threaded via `ArtistRoster` caller. Display-only, v2 tokens. |
| **#4** (dropdowns) | Talent badge added to Live Performance + Recording Session artist-picker dropdowns | `537983a` | Follow-up; mirrors existing Pop/Mood/Energy chips. |
| **#2** | Weekly Results popup now auto-opens from ANY route — consumer relocated from Dashboard (home-only) to `CommandDock` (mounted on every route via GameLayout) | `52dd7be` | One-shot semantics preserved; removes a latent double-consume. +4 tests. |
| **#9** (C68) | Tour milestones read Planned / On Tour / Tour Completed instead of the recording pipeline's "advanced to recorded stage" — branched on `project.type === 'Mini-Tour'` in `ProjectStageProcessor` | `5b44d9e` | Internal DB stage value unchanged; golden master zero-delta. |
| **#12** | Tour-completion email headline now shows NET profit/loss (gross alongside); `ProjectStageProcessor` sums per-city costs, `GameChange` gains additive `totalCosts`/`netProfit` | `5b44d9e` | Bundled with #9 (same file/snapshot surface). +6 tests. |
| **#11** | AUTO-select is now CC-budget-aware — walks execs tracking a running budget, picks the safest AFFORDABLE choice, never overdraws Creative Capital | `b482c5e` | `creativeCapital` threaded into the machine context. +10 tests. Known limitation: budget doesn't net out manually pre-queued CC (server is final authority; reported fresh-AUTO case fixed). |

**#4 resolved (investigation → fixed):** "Artist Hats" is NOT a real component/tab — it's the **Overview tab** (`ArtistPage.tsx` tabs: Overview / Discography / Releases / Analytics / Manage). Talent already rendered in `OverviewTab.tsx:132-135` + 3 discovery/selector surfaces; now added to the 6 surfaces it was missing from (4 cards/tabs + 2 dropdowns).

**#8/C67 fixed (commit `071c6df`):** decision made (`[lowest-unlocked-min, current-max]`). New `VenueCapacityManager.getBookingRangeForTier` = `[smallest bookable-tier min, current-tier max]`; `validateCapacity` + estimate `tierRange` + client `getCapacityRange` fallback all route through it. Unlocking a tier now raises the ceiling, keeps the floor at the smallest real venue. +8 venue tests; golden master + tour-estimate snapshot unaffected.

**Discovered incidentally (logged as C69, NOT fixed):** `FinancialSystem.calculateAwarenessGain` (`:1184`) calls a non-existent `getArtistSync`, silently zeroing marketing awareness gain during advance-week — pre-existing since 2025-09-26, swallowed by a try/catch. Not caused by the revival; see `technical-debt-backlog.md` C69 for the full diagnosis + likely fix.

**Still open from this playtest:** only the two design-discussion sections (effect-key legibility; meeting "fakeness") — they need a planning pass, not a bug fix.

---

## Triage (fill in at session end)

- 🐛 Bugs:
  - #1 ✅ **FIXED `ef1050b`** — Weekly results Meetings section renders each exec twice (raw-slug entry with real deltas + human-readable-title entry with no deltas)
  - #2 ✅ **FIXED `52dd7be`** — Advancing week from inside the exec meetings room skips the Weekly Results popup (auto-open consumer moved to always-mounted CommandDock)
  - #3 ✅ **FIXED `ef1050b`** — "Delayed effect triggered" boxes are unlabeled/generic, can't tell how many distinct delayed effects actually fired or match them to the detailed CCO box
  - #6 ✅ **FIXED `f41bf27`** — Venue capacity slider vs. server validation — three-layer bug (config `none` tier range collides with hardcoded server `>=50`, server rejects `venueAccess==='none'` outright, client slider not gated); client-gating fix, server/config left correct
  - #7 ✅ **FIXED `ef1050b`** — "Met with CEO" nonsensical since player IS the CEO
  - #8 ✅ **FIXED `071c6df`** (C67) — venueCapacity slider locked to current tier's exact band; now spans `[lowest-bookable-tier-min, current-tier-max]` (decision: unlocking raises the ceiling, keeps the floor at the smallest real venue)
  - #9 ✅ **FIXED `5b44d9e`** (C68) — Milestone Moments mislabels a tour milestone as "Advanced to Recorded Stage" (recording-pipeline stage name leaking into tour milestones)
  - #11 ✅ **FIXED `b482c5e`** — Auto-select meetings can pick a combo that overdraws Creative Capital (-2 CC preview with only 1 CC available); now CC-budget-aware
  - #12 ✅ **FIXED `5b44d9e`** — Tour-completion email shows gross revenue only, no net profit

- 🎨 Feel / balance:
  - #5 ✅ **FIXED `45d884d`** — Week view calendar missing prev/next arrows that month view has (easy add)
  - #12 also feel-adjacent — player wants profit visibility, not just revenue

- 💡 Ideas / backlog candidates:
  - #4 Surface Talent stat in more places — **investigation done (no fix yet)**: talent already renders in `OverviewTab.tsx:132-135` + AR-discovery-table/discovery-modal/exec-meeting-selector; "Artist Hats" == the Overview tab (not a distinct component). Genuinely missing from `ArtistDashboardCard.tsx`, `ArtistCard.tsx`, `ArtistDialogueModal.tsx`, `ManagementTab.tsx` — ranked scope in the "Fixes landed" section above; ready if greenlit
  - #10 [BIG] Artist revenue-share on streaming + tour income — needs its own design pass before scoping

- ❓ Open questions:
  - #4: ✅ **RESOLVED** — "Artist Hats" is not a distinct tab; it's the **Overview tab**, where talent DOES render (`OverviewTab.tsx:132-135`). No contradiction. Scope finalized (4 missing surfaces, see "Fixes landed").
  - #3: are the three "Delayed effect triggered" boxes 3 distinct effects, or duplicates of the same event (echoing the #1 duplicate-rendering pattern)? Needs source-level check of the delayed-effects renderer.
  - #6/#8: once fixed, should "none" tier allow booking at all (server currently hard-rejects it), or should reaching some minimal reputation be required before any tour is bookable — i.e. is blocking correct behavior and only the UI/slider needs to reflect it, or should "none" tier get a legitimate small-capacity booking path?

- ✅ **Resolved this session:** #1, #2, #3, #5, #6, #7, #8, #9, #11, #12 all fixed + committed on the branch (see "Fixes landed"), and #4 fixed across all 7 surfaces (cards/profile/dialogue/management + Live Performance/Recording Session dropdowns + Plan Release). #8 was C67, #9 was C68 (both now fixed).
- 🆕 **Logged, not fixed (C69):** the `getArtistSync` awareness-gain silent-zero bug found incidentally during the playtest (pre-existing, unrelated to the revival).
- ⏸️ **Still needs attention:** only the two design-discussion sections above (effect-key legibility; meeting "fakeness") — carried into a future planning pass, NOT quick fixes.
