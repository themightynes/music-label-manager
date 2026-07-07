# [READY] Awareness Surfacing Plan (C42 — "wire it fully player-facing")

*Drafted July 6, 2026, evening. Status: **EXECUTED same evening** as 3 slices on `feat/awareness-surfacing` (stacked on `feat/tour-experience-tier1`; commits `b27c114`/`8d44f08`/`c0028c0`); fresh-context adversarial verifier: **all 10 items CONFIRMED**, none refuted; suite 1,530 → **1,578** green; engine-free by construction (shared/ touched only for the `breakthrough` importance classification + one display-string literal). Held unmerged with PR #149 pending Nes's playtest — file moves to `COMPLETED/[COMPLETE]` post-merge. Execution notes: breakthrough was a **demotion** from an already-'hero'-classified-but-never-rendered state (the §1 "not classified" claim was stale); awareness change entries turned out DESCRIPTION-ONLY (no structured song fields) → slice 1 parses tolerantly, structured fields logged as C80. All six §6 forks decided by Nes same evening: **A = NOTABLE line** (not hero — keep hero inventory scarce), **B = one aggregated line** with suppression threshold, **C = tooltips disambiguate** the two Buzzes, **D = hottest-song (max)** aggregation, **E = QUALITATIVE sustain language only** (no ×N multiplier number — the cap and formula stay mysterious; overrides §2.2/§5 where they assumed the numeric readout), **F = dead config logged as debt** (arc stays engine-free). Design sections below are amended in place where a decision overrides the draft.*

**Decision already made (Nes, July 6):** C42 resolved as **wire awareness fully player-facing** — release page + dashboard readouts. This doc designs the surfacing. **The engine is untouched by this arc** (zero golden-master impact by construction) except where a fork below explicitly says otherwise.

---

## 1. As-is findings (code-verified July 6, 2026 — deep recon)

### The economics are live. The visibility is near-zero.
- **Storage**: per-song 0–100 integer (`shared/schema.ts:184-187`: `awareness`, `breakthrough_achieved`, `peak_awareness`, `awareness_decay_rate`).
- **Writes**: marketing-driven gain weeks 1–4 (`ReleaseProcessor.ts:671-748`; the C69 fix restored it July 4 after ~9 months silently dead), breakthrough weeks 3–6 (quality-tiered, ×2.5 awareness on hit, deterministic sin-based roll — no RNG draw), decay weeks 5+ (3–5%/wk), and the meetings `awareness_boost` channel which banks `pendingAwarenessBoost` and seeds the **next release's** initial awareness (8 pts/unit, 8-week expiry).
- **Reads**: exactly one — the ongoing-streams multiplier, weeks 5+: `1.0 + (awareness/100) × impactFactor` (0.3 wks 5–6, 0.5 wks 7+), **hard cap 2.0×** (`FinancialSystem.ts:1019-1049`). Charts don't read awareness (streams-only), so awareness moves charts only indirectly.
- **Config**: `data/balance/markets.json:126-171`. ⚠️ `breakthrough_thresholds` is a **dead block** — `ReleaseProcessor.ts:694-700` hardcodes the tiers. ⚠️ `awareness_impact_factors.weeks_1_2` is configured but never read.

### What the player can see today
1. A bare per-artist **"Buzz" chip** in SongCatalog (raw number, **no tooltip**, `SongCatalog.tsx:423-433`).
2. The meetings **"+N Buzz" badge** for `awareness_boost` — which is a *different mechanic* (banked next-release seed), sharing the same "Buzz" name. Conflation hazard.

### What the player cannot see (the actual C42 gap)
- **All three weekly change types — `awareness_gain`, `awareness_decay`, and `breakthrough` — are swallowed**: `categorizeChanges` routes them to the `other` bucket, which is never rendered (`week-summary/categorizeChanges.ts`). The 🔥 BREAKTHROUGH moment — rare, quality-gated, 2.5× explosion — is **completely invisible**. (The old "WeekSummary keeps celebrating a stat players can't reason about" framing was itself stale: it never celebrated.)
- `breakthrough` isn't classified in `changeImportance.ts` (falls to default) — the exhaustive-switch discipline missed it because nothing rendered it.
- **No release-level awareness aggregation exists anywhere** — ActiveReleases, Dashboard, MetricsDashboard: zero references. Per-song values already reach the client uncensored via both `/songs` endpoints (`['songs:list', gameId]` TanStack hook exists), so surfacing needs no server changes.
- The design doc's release-planning surfacing ideas (`[FUTURE] awareness-system-design.md` §"Release Planning Impact") were never built; that doc's engine sections are otherwise ~90% BUILT (divergence: the breakthrough roll formula).

### Degenerate / min-max cases surfaced (design duty)
- **Line-spam**: a mature catalog (15–20 released songs) would emit up to 20 gain/decay lines weekly if naively rendered. Must aggregate.
- **PR-channel dominance**: PR's awareness coefficient (0.4) is 2–4× the other channels — once awareness is visible, players will notice PR-only allocation maximizes buzz per dollar. That's *texture* (PR = long-tail play, radio/digital = quick ROI, exactly as the design doc intended) but worth watching in playtests once legible.
- **Cap legibility**: the 2.0× multiplier cap means awareness ≥100 at week 7+ is all equivalent; a readout that shows the multiplier (not just the 0–100 number) makes the cap honest instead of mysterious.

---

## 2. Design

**Principle**: surface awareness where the player already looks, in the units they can reason about — the multiplier ("Buzz ×1.4 streams") is the reasoning hook, the 0–100 number is the progress bar, the breakthrough is the moment. Client-only; all data already flows.

### 2.1 Slice 1 — WeekSummary honesty (the invisible-breakthrough fix)
- **Breakthrough → NOTABLE-stage line item** (fork A decided: not a hero card — hero inventory stays scarce): 🔥 song title, "BREAKTHROUGH — buzz exploded to N/100", artist name, and a qualitative payoff clause ("its streams will ride the buzz while it lasts" — no numbers per fork E). Classify `breakthrough` as `notable` in `changeImportance.ts` (closes the switch hole).
- **Gains/decays → ONE aggregated routine line**, not per-song spam: e.g. `🎯 Buzz: 3 songs building (+12 total) · 2 fading` with the top mover named. Threshold: suppress the line entirely when total |Δ| < 3 to keep quiet weeks quiet.
- Routing: new `awareness` bucket in `week-summary/categorizeChanges.ts` (the slice-2-of-tour pattern — pure module, unit-testable).

### 2.2 Slice 2 — Release page readout (ActiveReleases)
- Per release card: a **Buzz section** — headline = the release's **hottest song** (max awareness, name + 0–100 bar), breakthrough badge count if any, and **qualitative sustain language** (fork E decided: NO ×N number): weeks 1–4 "building — week N of 4"; weeks 5+ banded by awareness value, e.g. ≥70 "sustaining strongly", 30–69 "sustaining", 1–29 "fading", 0 nothing. Bands are display-only constants in the client helper (commented as such).
- Aggregation is client-side from the existing songs query + releaseSongs join (no server change). Max-not-average headline (average is diluted by filler tracks — fork D).

### 2.3 Slice 3 — Dashboard + chip tooltip (small)
- **MetricsDashboard**: one compact "Hottest track" stat — top-awareness released song (name, buzz value, 🔥 if breakthrough). No new panel; joins the existing metrics row.
- **SongCatalog Buzz chip gets a tooltip** with its own copy (NOT the `awareness_boost` copy, which describes the banked pre-release mechanic), qualitative per fork E: "Cultural buzz (0–100). Builds from marketing in release weeks 1–4, can break through, then fades. While it lasts, this song's weekly streams ride the buzz."
- Terminology guard (fork C): the two "Buzz"es get mutually-referencing tooltip copy so the banked meeting channel and the live song stat stop reading as one stat.

### 2.4 Explicitly out of scope
- Engine changes: the dead `breakthrough_thresholds` config block and the unused `weeks_1_2` impact factor are **logged as debt, not fixed here** (fork F) — fixing them re-opens golden-master territory for zero player-visible gain.
- Release-planning preview integration ("expected awareness from this budget") — real but bigger; queue behind Release-Experience Tier 2 proper.
- Chart effects, awarenessHistory, cross-demographic effects (design-doc future tiers).

---

## 3. Slice plan (factory, one subagent per slice)

| # | Slice | Model | Contents |
|---|-------|-------|----------|
| 1 | WeekSummary honesty | Sonnet 5 | breakthrough hero card + `changeImportance` classification, aggregated buzz routine line, `awareness` bucket in categorizeChanges, tests |
| 2 | Release page Buzz section | Sonnet 5 | client-side per-release aggregation helper (pure, tested), Buzz section on ActiveReleases cards w/ phase-aware display (building vs sustaining ×N), tests |
| 3 | Dashboard stat + tooltips | Sonnet 5 | MetricsDashboard hottest-track stat, SongCatalog chip tooltip w/ new copy, disambiguation pass on the two Buzz tooltips, tests |

All slices client-only (+ `shared/utils/changeImportance.ts` in slice 1 — display classification, no engine writes). Golden-master impact: **zero by construction**; GM double-run per slice regardless. Suite baseline going in: 1,530 (post-tour-tier1; this arc branches from main, independent of PR #149).

## 4. Test plan
- Slice 1: bucket routing (all 3 types out of `other`), aggregation math + suppression threshold, breakthrough classified hero.
- Slice 2: aggregation helper (max/means/breakthrough count, week-phase selection), section renders from fixtures incl. multi-song, zero-awareness release renders nothing.
- Slice 3: stat picks the max-awareness released song; tooltip copy present and distinct between the two Buzz surfaces.

## 5. Risks / notes
- WeekSummary just gained the tour card (PR #149, unmerged). **Sequencing**: land this arc AFTER #149 merges (both touch `categorizeChanges.ts`/WeekSummary; trivially mergeable but pointless conflict risk). If #149 is rejected in playtest, rebase.
- The multiplier readout exposes a balance internal (the 2.0 cap). Deliberate: honesty over mystery, consistent with the "honest weekly simulation, visibly surfaced" direction. Flagged so it's a choice, not an accident.

---

## 6. Product forks — for Nes

**A. Breakthrough celebration weight** — HERO-stage card (recommended: it's rare, quality-gated, and currently 100% invisible — this IS the payoff moment) vs NOTABLE-stage line (if you'd rather not add hero inventory).
**B. Weekly buzz line** — one aggregated line with suppression threshold (recommended) vs per-song lines (spam at catalog scale) vs decay-only-silent (gains shown, decay hidden — dishonest, not recommended).
**C. The two-Buzz name collision** — keep both named "Buzz" with mutually-disambiguating tooltips (recommended — cheapest, no reference-doc churn) vs rename the meeting channel's display label (e.g. "Hype") which touches `EFFECT_CHANNEL_DESCRIPTIONS` + the [REFERENCE] exec-meetings doc pairing rule vs rename the song stat.
**D. Release-card headline aggregation** — hottest song (max, recommended: matches how players think about a hit) vs average (diluted) vs streams-weighted (opaque).
**E. Multiplier exposure** — show the live "×1.4" multiplier (recommended: it's the reasoning hook; the whole point of C42 is a stat players can reason about) vs keep it qualitative ("sustaining strongly").
**F. Dead config debt** — log `breakthrough_thresholds` (dead block) + `weeks_1_2` (never read) as a C-number and keep this arc engine-free (recommended) vs wire them in-arc (engine change, GM re-bless, zero player-visible gain).
