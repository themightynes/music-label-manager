# [FUTURE] Release Experience Improvement Plan

**Status**: Deferred — sequenced behind Phase 1 service extractions (PR-16..18; PR-17 releasePlanningService touches this exact domain). Companion to `[FUTURE] tour-experience-improvement-plan.md` — the two systems have complementary halves of the same fix.
*Created: July 2, 2026 (from a two-agent read-only code trace of the full release system, same method as the tour trace)*

---

## Problem Statement

Plan Release shares the tour pathology — decisions front-loaded, feedback back-loaded, dead weeks between — but with a different disease underneath. Tours fake their weekly simulation (all results pre-rolled, cosmetically revealed); releases have an **honest weekly simulation** (streaming revenue rolled fresh each week with real decay) but **bury it in context-free output** and offer **zero mid-flight agency** — a planned release cannot be cancelled, edited, or rescheduled, and its marketing budget is charged at plan time and never refunded.

---

## How a Release Plays Today (verified against code, July 2, 2026)

1. **Planning** (`client/src/pages/PlanReleasePage.tsx`) — the strongest planning UX in the game: song selection, auto-detected type (single/EP/album), week picker with seasonal multipliers, per-channel marketing sliders (radio/digital/PR/influencer), optional lead single with its own week + budget, and a live preview (`POST /api/game/:gameId/releases/preview`, `server/routes/releases.ts:314`) showing estimated streams/revenue, ROI, and every multiplier (release bonus, seasonal, marketing synergy, channel diversity, lead-single boost). On commit (`POST .../releases/plan`, `server/routes/releases.ts:435`): full marketing budget + 1 creative capital deducted immediately; songs lock to the release.
2. **Waiting weeks** — a timeline card (`client/src/components/ReleaseWorkflowCard.tsx`) with progress bar and phase badges ("Campaign Planned" → "Lead Single Live"). Static: no weekly updates, no anticipation mechanics, silent in WeekSummary.
3. **Lead single week** (`shared/engine/game-engine.ts:1860-1973`, `processLeadSingles`) — releases separately with real revenue; after week 1 it dissolves into generic "ongoing streams" lines. No hot/cold signal during the exact 1–3 week window where that information should matter.
4. **Release week** (`game-engine.ts:1979-2165`, `processPlannedReleases`) — good one-time payoff: WeekSummary lines ("🎉 Released: …"), artist mood boost (+5 single / +20 EP-album), distribution email, chart tab, detailed post-release card (campaign tier, ROI, cost-per-stream, track breakdown with lead-single contribution).
5. **Weeks after** (`game-engine.ts:1572-1854`, `processReleasedProjects`) — revenue **rolled fresh weekly** with decay (weekly_decay_rate 0.85, reputation/access-tier bonuses; `FinancialSystem.calculateOngoingSongRevenue`). Surfaced only as undifferentiated "🎵 \"song\" ongoing streams" lines — no trend, no rise-vs-fade signal.

### Tour vs. Release comparison

| | Tours | Releases |
|---|---|---|
| Simulation honesty | Fake — pre-rolled, drip-revealed | Real — weekly decay, rolled fresh |
| Weekly feedback | One flat line | Many noisy lines, no context/trend |
| Mid-flight agency | Cancel (60% refund) | **None** — no cancel/edit/reschedule |
| Planning UX | Good | Excellent |

### Distinctive problems

1. **The awareness system is elaborate dead bookkeeping** (`game-engine.ts:1617-1750`): weekly awareness gain from marketing (weeks 1–4), breakthrough checks (weeks 3–6, 2.5× awareness explosion, slower decay), decay (weeks 5+) — computed, persisted per song, announced in WeekSummary ("🔥 BREAKTHROUGH ACHIEVED!") — and **feeds into nothing**: not streams, not charts, not revenue. The game celebrates a stat with zero mechanical existence. Config in `data/balance/markets.json` (awareness_system); design doc exists (`[FUTURE] awareness-system-design.md`); the "Awareness System Backend Integration" item in DEVELOPMENT_STATUS was never finished.
2. **Committed money is a black hole**: marketing charged at plan time, no cancel/edit/reschedule endpoint anywhere — a week-30 release planned on week 8 locks that cash for 22 weeks regardless of circumstances.
3. **Preview and execution are separate code paths** (`calculateReleasePreview`, `game-engine.ts:4692-4941` vs `calculateSophisticatedReleaseOutcome`) — same divergence pathology as the snapshot-built-in-two-places bug (backlog C35) that already shipped a real defect once.
4. **Rich analytics computed once, shown once**: campaign effectiveness, cost-per-stream, stream distribution, lead-single contribution (`releaseAnalytics.ts`) appear only on the post-release card; nothing evolves weekly. Chart entries update weekly via ChartService but movements aren't called out.

---

## Proposed Solutions (tiered)

### Tier 1 — Surfacing (no engine math changes)
- **Contextualize ongoing-revenue lines**: trend arrow vs. last week, "week 3 since release", grouped per release instead of a flat list.
- **Lead-single spotlight** during the pre-release gap: "First week: 41k streams — above projection" on the release card and WeekSummary.
- **Dashboard countdown / anticipation**: "*Neon Nights* drops in 2 weeks".
- **Chart movement callouts**: "debuted at #23", "climbed 8 spots" (data already computed by ChartService weekly).

### Tier 2 — Make the systems honest
- **Awareness: wire it or retire it.** Preferred: feed awareness into the ongoing streaming multiplier per the existing design doc — instantly makes weeks 1–6 matter and gives breakthroughs a real payoff. Alternative: stop announcing a stat with no effect.
- **Unify preview/execution** into one shared calculation path (prevents C35-style drift).
- **Weekly campaign-digest email** while a release is live (template exists; only fires once at release).

### Tier 3 — Agency
- **Cancel/reschedule a planned release** with partial refund — mirror the tour rule but compute it server-side from day one (avoid repeating C40).
- **One mid-campaign decision** keyed to lead-single performance: double the launch marketing / push the release back / swap the lead single. Meaningful precisely because release outcomes are *not* pre-rolled.

---

## Debt found in passing (tracked in technical-debt-backlog.md)

- **C42 (Medium)**: awareness system computed + announced but mechanically dead — product decision to wire or remove.
- **C43 (Medium)**: no cancel/edit endpoint for planned releases; funds locked with no recovery path.
- **C44 (High)**: preview vs execution dual code path.
- **C45 (Low)**: `star_power_amplification` config enabled but unconsumed; `pressMentions` TODO (press pickups computed, only reputation used).

---

## Sequencing

1. **After PR-17 (releasePlanningService)** lands: this domain's code will have its final Phase 1 shape — implement against that.
2. **Tier 1** is one focused PR (pure surfacing; data already exists).
3. **Tier 2 awareness decision** is the highest-leverage item — pairs with the Phase 4 game-feel track, and the tour plan's Tier 2 (per-week rolls + momentum) so both systems converge on "honest weekly simulation, visibly surfaced".
4. **Tier 3** needs a short PRD (refund %, what's editable, decision-point design).
