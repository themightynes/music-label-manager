# [FUTURE] Tour Experience Improvement Plan

**Status**: Deferred — blocked on Phase 1 server-routes refactor (tour routes live in `server/routes.ts`, which is mid-decomposition). Revisit after the tour-domain route-move PR lands.
*Created: July 2, 2026 (from a two-agent code trace of the full tour system)*

---

## Problem Statement

Recording Sessions, Tours, and Project Releases feel clunky week to week — Tours worst of all. A "Single Show" (1 night) occupies **3 game weeks** with almost no feedback: the player books, waits, and eventually finds one flat sentence in the WeekSummary. All player decisions happen before week 1; all interesting information arrives after the last week; the middle is dead air.

---

## How a Tour Plays Today (verified against code, July 2026)

Example: single-show tour booked on week 10.

| Week | Engine | Player sees |
|---|---|---|
| 10 (booking) | Project created; full cost + 1 creative capital deducted immediately | Rich estimate on `LivePerformancePage.tsx` (sell-through math, per-city P&L, ROI) — then nothing |
| 11 | Stage `planning → production`. **All city results pre-calculated here** (±20% RNG) into `project.metadata.tourStats.preCalculatedCities` | Progress bar 0% → 50%; badge "City 0 of 1" |
| 12 | City 1 "revealed" from pre-calculated array | One WeekSummary line: `"Tour X - City 1 performance: $6,500 (58% attendance)"`. No toast; no artist reaction shown |
| 13 | `weeksInProduction > citiesPlanned` → stage `recorded`; completion email | "✓ Complete" badge; email from Head of Distribution; tour moves to Completed tab |

Duration formula: 1 planning week + 1 week per city + 1 bookkeeping week that exists only because the completion check uses `>` instead of `>=` (`shared/engine/game-engine.ts:4487-4522`). UI copy promises "1 night".

### Key code locations (pre-Phase-1 paths; routes will move)

- **Creation UI + estimate**: `client/src/pages/LivePerformancePage.tsx` (estimate via `POST /api/tour/estimate`, debounced; shows sell-through component breakdown, per-city P&L, ROI)
- **Stage machine / duration**: `shared/engine/game-engine.ts:4430-4538` (`planning → production → recorded`; tours skip `marketing`)
- **Revenue pre-calculation + weekly reveal**: `shared/engine/game-engine.ts:3636-3782` (`processUnifiedTourRevenue`); all cities computed on first production week via `FinancialSystem.calculateDetailedTourBreakdown` (`FinancialSystem.ts:509`), then one city revealed per week; ±20% variance at `game-engine.ts:3696`
- **Per-city economics stored but never surfaced mid-tour**: `project.metadata.tourStats.preCalculatedCities[n].economics` (sell-through components, pricing, costs, profit) — only the Completed Tours table shows it (`ActiveTours.tsx:590-723`)
- **Artist reactions applied silently**: mood ±3–8 and popularity gains by attendance tier, `game-engine.ts:3827-3850` (hardcoded thresholds) — never shown to the player
- **Weekly summary line**: `game-engine.ts:3772-3778`
- **Cancellation**: 60% refund computed **client-side** (`ActiveTours.tsx:~290/740`), server trusts request body (`server/routes.ts:1934`, pre-move line)
- **Economy config**: `data/balance/markets.json` `tour_revenue` (sell_through_base 0.15, reputation_modifier 0.05, local_popularity_weight 0.6, merch 0.15, ticket base 25 + 0.03/capacity); `data/balance/progression.json` `venue_access` capacity ranges; venue fee = capacity×4, production = capacity×2.7 (`FinancialSystem.ts:832-854`)

### Root causes of the clunkiness

1. **Decisions front-loaded, information back-loaded** — the weekly moment (experienced 52×/campaign) gets one flat sentence while rich data exists at estimate time and completion time.
2. **Outcomes pre-decided and it shows** — everything rolled on the first production week, drip-revealed cosmetically; no in-flight agency.
3. **Planning week + completion week are pure overhead** — 2 of 3 weeks of a single show are empty.
4. **Feedback is passive** — results only visible if the player opens ActiveTours or the inbox; no toast; artist mood/popularity reactions computed but never told.
5. **Rich data thrown away** — full per-city `economics` object stored but unsurfaced during the tour.

---

## Proposed Solutions (tiered)

### Tier 1 — Quick wins (no engine math changes; one focused PR)
- **Make the weekly city result a moment**: toast on city reveal + a proper WeekSummary card — venue, attendance bar (sold/capacity), revenue vs. that city's cost, net profit, artist reaction ("Crowd loved it — Nova +5 mood, +1 popularity"). All data already exists in `tourStats.preCalculatedCities[n].economics`.
- **Fix the phantom third week**: complete the tour on the same week its last city plays (`>=` semantics or fold completion into final-city processing). Single show becomes book → play → done in 2 weeks.
- **Give the planning week content**: flavor + pre-sales foreshadowing ("crew booked, 340 tickets pre-sold in City 1") — free and believable since sell-through is already known.
- **Surface live tour status on the dashboard / week-advance flow**: "🎤 Nova on tour — plays Theater District this week (2 of 4)".

### Tier 2 — Honest, dramatic reveals (small engine changes)
- **Roll each city on its own week** instead of pre-calculating all upfront (same math, moved to reveal time — nothing downstream needs results early). Enables momentum mechanics; kills the "decided in week 2" smell.
- **Momentum/word-of-mouth**: >85% attendance bumps next city's sell-through a few points; a flop dents it. Mid-tour weeks gain suspense.
- **Move hardcoded knobs to config**: ±20% variance (`game-engine.ts:3696`), mood thresholds + popularity gains (`3827-3850`), VENUE_SCALING constants (`FinancialSystem.ts`), refund 60%.

### Tier 3 — In-flight agency (the real fix)
- **One mid-tour decision point** after a notably good/bad night: add a marketing push to the next city / add a second night (artist energy cost) / cancel remaining dates. Fits the one-decision-per-iteration philosophy; converts tours from slot machine to system.

---

## Bugs found in passing (tracked in technical-debt-backlog.md)

- **C40 (High)**: Server trusts client-supplied `refundAmount` on tour cancellation — no server-side recomputation or cap. Fix as its own small PR once the tour-domain route move (Phase 1) lands.
- **C41 (Medium)**: Missing `project.metadata.venueCapacity` hard-crashes tour processing (`game-engine.ts:3680`) — no fallback for legacy/pre-Phase-3 tours.
- Cosmetic: "Single Show" and "Mini-Tour" are the same backend type (`Mini-Tour`, `cities: 1`) with no visual distinction in Completed Tours.

---

## Sequencing

1. **Now**: nothing — Phase 1 route moves are active; this plan intentionally waits.
2. **After tour-domain route-move PR merges**: fix C40 (server-side refund validation) as a standalone PR.
3. **Then Tier 1** (one PR: surfacing + week-count fix) — removes most perceived clunkiness; engine already computes everything a satisfying weekly beat needs.
4. **Tier 2** pairs naturally with the Phase 4 "game feel / week-advance moment" track.
5. **Tier 3** is a product design conversation (new decision point) — spec via PRD when ready.
