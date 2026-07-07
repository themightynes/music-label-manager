# [READY] Hype & Pre-Marketing Plan (Buzz v2 — link the systems)

*Drafted July 6, 2026, late evening, from Nes's playtest design conversation. Status: **READY — all seven product calls made by Nes (July 6, 2026)**: banked hype attaches at PLAN time, and forks A–F all resolved per recommendation (§5 is now a decision record). Fork E's resolution also **greenlights the C43 cancel UI** as part of this arc (server DELETE + safe refund already exist). Sequencing (Nes-decided): merge #149 → retarget #151 to main → merge #151; this arc then branches off main — do NOT stack on the awareness branch.*

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
- **Artist-scoped pools** (fork A DECIDED): when the meeting has a specific artist (`target_scope: user_selected` — plumbing exists), `awareness_boost` banks to THAT artist's pool; only their next-planned release consumes it. Truly global meetings (CEO, platform deals) keep a label-wide pool consumed by whichever release is planned first (fork B DECIDED: first-planned takes all).
- **Attach at PLAN, not ship** (DECIDED): when a release is planned, matching banked hype transfers onto the release immediately and shows in the plan summary ("Label hype applied: +32 starting buzz"). The 8-week expiry stops mattering for attached hype; it only governs unattached pools (fork C DECIDED: keep the 8-week expiry for unattached pools, now with a visible countdown).
- **Visibility**: a "Banked hype" chip (dashboard core status and/or release-planning page) per artist + label pool, with expiry countdown. **Attribution**: WeekSummary entry when hype attaches ("Your A&R single strategy seeded *Neon Nights* +32 buzz") — this pilots effect-legibility directions B (pending visibility) + C (payoff attribution) from `[FUTURE] executive-meeting-effect-legibility.md`.
- Choice-time preview: the "+N Buzz" badge tooltip names WHERE it will land ("banks hype for {artist}'s next release").

### 2.2 Pre-release marketing (the anticipation phase)
- At release planning, the marketing budget splits across the CALENDAR as well as channels: a **pre-campaign** share builds the release's starting awareness during the lead-up weeks (plan → release), the launch share keeps the current weeks-1–4 behavior.
- **Planning early becomes a strategy**: 6 weeks out = 6 weeks of anticipation ramp (visible on the release card: "anticipation building — 3 weeks to launch", feeding the Release-Tier-1 countdown).
- Engine reality: this is a NEW weekly engine write path for planned-but-unreleased releases — golden-master territory, seeded-RNG discipline if any variance (prefer deterministic build, zero draws, like the tour foreshadow).
- Interlocks (all DECIDED): **fork D** — diminishing returns after ~4 lead-up weeks (planning 6 weeks out beats 2, planning 15 weeks out doesn't dominate), and the existing +25/wk cap applies pre-release too, for consistency; **fork E** — built pre-buzz DIES with a cancellation (anticipation is release-specific; unspent pre-campaign money still refunds) — this fork also greenlights the C43 cancel UI in this arc; **fork F** — the lead single is a *conduit*: pre-campaign builds at full strength only while a lead single is out, weaker without one (finally makes the mechanic matter strategically).

### 2.3 Marketing legibility (cheap, client-mostly)
- Release-planning UI: one line per channel stating its personality ("PR: slow build, long tail" / "Radio: launch week punch"), and a quality note ("this song's quality will amplify/blunt marketing").
- Qualitative only, per the standing fork-E (awareness arc) rule: no formulas, no multipliers.

## 3. Slicing (each ships mechanism + data + UI + tests, independently revertable)
1. Hype visibility + attribution (small engine: emit changes at bank/attach/expire; chip + WeekSummary lines) — additive GM.
2. Artist scoping + attach-at-plan (engine; flags shape change — backward-compatible new keys; save-snapshot review; fork A/B rules).
3. Pre-release build (engine write path with fork D curve + cap, fork F lead-single conduit; planning UI budget split; release-card anticipation ramp) — the big one. Deterministic, zero RNG draws (tour-foreshadow precedent). C79 may ride here if convenient.
4. C43 cancel/reschedule UI + fork E semantics (cancel kills built pre-buzz, refunds unspent pre-campaign; wire the existing server DELETE endpoint).
5. Marketing legibility (client copy, qualitative only).

## 4. Explicitly out of scope
- Rebalancing channel coefficients or the 2.0× cap (playtest data first — the surfaces just shipped).
- C79 (dead breakthrough config) — separate small engine debt, could ride slice 3 if convenient.

## 5. Fork decisions (ALL RESOLVED by Nes, July 6, 2026 — each per recommendation)
- **A. Scoping model → artist pools + label pool.** `user_selected` meetings bank to the picked artist; truly global meetings bank to a label-wide pool. (Rejected: artist-only — bad fiction for CEO-level buzz; release-directed at choice time — most UI, breaks with no plan open.)
- **B. Label-pool consumption → first-planned takes all.** Deterministic, easy to attribute. (Rejected: split across concurrent plans — mushy attribution.)
- **C. Expiry → keep 8 weeks for unattached pools**, now visible as a countdown; attached hype never expires. (Rejected: drop — no urgency; shorten — punitive before playtest data.)
- **D. Pre-campaign returns → diminishing after ~4 lead-up weeks**, and the existing +25/wk cap applies pre-release. (Rejected: flat — mega-early planning becomes strictly optimal.)
- **E. Cancel semantics → built pre-buzz dies with cancellation**; unspent pre-campaign refunds. Also greenlights the C43 cancel UI in this arc. (Rejected: transfer to artist pool — buzz-farming exploit on throwaway plans.)
- **F. Lead single → conduit requirement.** Full-strength pre-build only while a lead single is out. (Rejected: flavor-only — mechanic stays meaningless.)
