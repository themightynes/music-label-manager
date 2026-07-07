# [DRAFT] Hype & Pre-Marketing Plan (Buzz v2 — link the systems)

*Drafted July 6, 2026, late evening, from Nes's playtest design conversation. Status: DRAFT — future arc, NOT scheduled. One product call already made: **banked hype attaches at PLAN time, not ship time** (Nes, July 6). Everything else in §5 is an open fork. Sequencing: after PRs #149/#151 merge (builds directly on the awareness surfaces).* 

**Goal (Nes):** make the meeting Buzz channel *mean what it says* (direct correlation between the choice and a song/artist), make banked hype visible, and model **pre-release marketing** — anticipation between planning and release, which today is dead air.

---

## 1. As-is facts (code-verified July 6, 2026)

### The meeting Buzz channel's three sins
- **Untargeted**: `awareness_boost` banks into ONE label-global pool (`flags.pendingAwarenessBoost`, `ActionProcessor.ts:941-965`). Even `ar_single_choice` — a `user_selected` meeting where the player literally picks the artist ("Lean commercial" = +4 delayed buzz) — banks globally; the picked artist affects only the mood effect. Whatever release ships next, ANY artist's, consumes the whole pool (`ReleaseProcessor.ts:1044-1141`, 8 pts/unit seed).
- **Invisible while banked**: nothing anywhere shows the pool, its size, or its 8-week expiry fuse.
- **Unattributed and silently lost**: consumption and expiry are console-logs only (`ActionProcessor.ts:1237-1253`) — zero summary entries, zero UI. A player can bank +6 across three meetings and lose it all without ever knowing it existed.
- 13 choices across 9 meetings carry `awareness_boost` today (grep `data/actions.json`), values −2…+4, mostly delayed.

### The marketing timeline's dead air
- Plan week: money locked, nothing happens until release. **Planning early is strictly bad today** (longer lock, zero benefit — half of C43's complaint).
- Release weeks 1–4: marketing budget converts to awareness (per-channel coefficients: pr 0.4 / influencer 0.3 / digital 0.2 / radio 0.1 per $1k, × quality, × small popularity bonus, cap +25/wk — `FinancialSystem.calculateAwarenessGain`).
- Weeks 3–6 breakthrough; weeks 5+ decay + the streams multiplier (cap 2.0×).
- **No pre-release awareness build exists.** The lead-single mechanic exists (releases support a lead single dropping early) but contributes nothing to the main release's awareness.
- Channel personalities (launch spike vs long tail) are invisible at planning; quality-gating of marketing efficiency is invisible too.

---

## 2. Design (three connected pieces — one coherent "how hype works" redesign)

### 2.1 Banked hype v2 (targeting + visibility + attribution)
- **Artist-scoped pools**: when the meeting has a specific artist (`target_scope: user_selected` — plumbing exists), `awareness_boost` banks to THAT artist's pool; only their next-planned release consumes it. Truly global meetings (CEO, platform deals) keep a label-wide pool consumed by whichever release is planned first (fork B: or split?).
- **Attach at PLAN, not ship** (DECIDED): when a release is planned, matching banked hype transfers onto the release immediately and shows in the plan summary ("Label hype applied: +32 starting buzz"). The 8-week expiry then stops mattering for attached hype; it only governs unattached pools (fork C: keep/lengthen/drop expiry).
- **Visibility**: a "Banked hype" chip (dashboard core status and/or release-planning page) per artist + label pool, with expiry countdown. **Attribution**: WeekSummary entry when hype attaches ("Your A&R single strategy seeded *Neon Nights* +32 buzz") — this pilots effect-legibility directions B (pending visibility) + C (payoff attribution) from `[FUTURE] executive-meeting-effect-legibility.md`.
- Choice-time preview: the "+N Buzz" badge tooltip names WHERE it will land ("banks hype for {artist}'s next release").

### 2.2 Pre-release marketing (the anticipation phase)
- At release planning, the marketing budget splits across the CALENDAR as well as channels: a **pre-campaign** share builds the release's starting awareness during the lead-up weeks (plan → release), the launch share keeps the current weeks-1–4 behavior.
- **Planning early becomes a strategy**: 6 weeks out = 6 weeks of anticipation ramp (visible on the release card: "anticipation building — 3 weeks to launch", feeding the Release-Tier-1 countdown).
- Engine reality: this is a NEW weekly engine write path for planned-but-unreleased releases — golden-master territory, seeded-RNG discipline if any variance (prefer deterministic build, zero draws, like the tour foreshadow).
- Interlocks to resolve: diminishing returns so mega-early planning doesn't dominate (fork D); whether the +25/wk cap applies pre-release; C43 interaction — cancelling a planned release refunds unspent pre-campaign but the built buzz dies with it or transfers to the artist (fork E); whether the lead single is the *conduit* (pre-buzz only builds while a lead single is out) or just flavor (fork F).

### 2.3 Marketing legibility (cheap, client-mostly)
- Release-planning UI: one line per channel stating its personality ("PR: slow build, long tail" / "Radio: launch week punch"), and a quality note ("this song's quality will amplify/blunt marketing").
- Qualitative only, per the standing fork-E (awareness arc) rule: no formulas, no multipliers.

## 3. Rough slicing (future session; sizes are guesses)
1. Hype visibility + attribution (small engine: emit changes at bank/attach/expire; chip + WeekSummary lines) — additive GM.
2. Artist scoping + attach-at-plan (engine; flags shape change — backward-compatible new keys; save-snapshot review).
3. Pre-release build (engine write path + planning UI split + release-card ramp) — the big one.
4. Marketing legibility (client copy).

## 4. Explicitly out of scope
- Rebalancing channel coefficients or the 2.0× cap (playtest data first — the surfaces just shipped).
- C79 (dead breakthrough config) — separate small engine debt, could ride slice 3 if convenient.

## 5. Open forks (for the design checkpoint when this arc is scheduled)
- **A. Scoping model**: artist pools + label pool (recommended) vs artist-only (global meetings then need a rule) vs release-directed at choice time (most agency, most UI).
- **B. Label-pool consumption**: first-planned-release-takes-all (recommended, simple) vs split across concurrent plans.
- **C. Expiry**: keep 8w for unattached pools (recommended) vs drop expiry once visible (visibility may be enough pressure) vs shorten.
- **D. Pre-campaign returns curve**: flat per-week (simple) vs diminishing after N weeks (recommended, anti-degenerate) — and does the weekly cap apply?
- **E. Cancel semantics (ties into C43)**: built pre-buzz dies with cancellation (recommended: anticipation is release-specific) vs transfers to artist pool.
- **F. Lead single role**: conduit requirement (recommended if we want the mechanic to matter) vs flavor-only.
