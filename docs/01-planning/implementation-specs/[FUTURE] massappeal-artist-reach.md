# [FUTURE] massAppeal — Artist Commercial Reach

**Status**: `[FUTURE]` — deferred design, not scheduled. Dated 2026-07-27.
**Origin**: Follow-on to the C63 dead-column cleanup (backlog **C63** / former PENDING-DECISIONS **#19**). On 2026-07-27 the five other never-read artist columns were dropped; `massAppeal` was **deliberately retained** so this design could later give it a purpose. This doc records what it would take to make the column earn its keep.

---

## 1. What `massAppeal` is (intended)

A per-artist **"commercial reach"** lever — how broadly an artist's music lands with a mainstream audience, independent of how good the songs are or how famous the artist has become. It is meant to be distinct from the two levers that already exist:

- **`popularity`** — earned over time through releases, charts, and awareness. A *result*.
- **`talent`** — feeds song quality. A *quality input*.
- **`massAppeal`** (new reach lever) — a *static-ish disposition*: is this artist niche-brilliant (low reach, can still be high-talent) or broadly-appealing (high reach)?

The design payoff is roster texture: a signed artist can feel "critically loved but niche" vs "radio-ready but middlebrow," and that distinction should show up in outcomes rather than only in flavor text.

## 2. Current state (verified 2026-07-27)

- **Column exists**: `shared/schema.ts` — `massAppeal: integer("mass_appeal").default(50)` (line 43), with a CHECK constraint `massAppeal >= 0 AND massAppeal <= 100` (line 57). Range 0–100, default 50.
- **ZERO readers**: no engine, service, or client code reads the column. Grep confirms it is write-never/read-never today.
- **No authored values**: `data/artists.json` has **no** `massAppeal` field on any artist, so every artist inherits the default **50**. Consequence: **any multiplier keyed on massAppeal is a NO-OP until designers author real per-artist values** — at a uniform 50, a curve centered on 50 returns 1.0 for everyone.

This is the crux: the column is inert in two ways at once (no reader *and* no data spread). Both must be fixed for the lever to do anything.

## 3. Recommended v1 hook — a streaming-reach multiplier

Wire massAppeal as a **streaming-reach multiplier** in `FinancialSystem.calculateStreamingOutcome`, sitting **beside the existing star-power amplification** (`shared/engine/FinancialSystem.ts:830-834`):

```ts
// existing star-power block, ~L830-834
let amplifiedStreams = baseStreams;
if (config.star_power_amplification?.enabled) {
  const starPowerMultiplier = 1 + (artistPopularity / 100) * config.star_power_amplification.max_multiplier;
  amplifiedStreams = baseStreams * starPowerMultiplier;
}
```

Proposed addition (config-gated, applied to `amplifiedStreams`):

- **Muted curve**: `reachMultiplier = 1 + (massAppeal - 50)/100 * K`
- **Small `K`** (~0.2–0.3) so the swing stays gentle: at K = 0.3, massAppeal 0 → ×0.85, massAppeal 100 → ×1.15 (roughly ±10–15%). This is a *reach nudge*, not a dominant term — it must not overpower quality/popularity.
- **Knob-driven**: add a `mass_appeal_reach` block (enabled flag + `max_swing`/`K`) to the `streaming_calculation` config in `data/balance/markets.json`, following the star-power pattern (default the constant so games with the flag off stay byte-identical).
- **Centered on 50** so the current uniform-50 roster is a clean no-op until values are authored — this makes the feature safe to merge dark.

### Legibility (required, not optional)

A silent multiplier is exactly the kind of invisible mechanic this codebase keeps flagging. Ship it with cause→effect visible:

- **ArtistCard**: surface a 0–100 **"Mass Appeal"** stat alongside popularity/talent.
- **WeekSummary**: one streaming-breakdown line attributing the reach nudge (e.g. "Mass Appeal reach ±X%") so a player can see why a broadly-appealing artist over-/under-performed base expectation.

## 4. Scope discipline

Wire **ONE outcome — streaming reach — only.** The original (superseded) design over-scoped this by also wiring tour draw and popularity-growth off the same column; that turns a 1-day knob into a multi-system change with entangled balance. **Resist that.** Streaming reach is the single cleanest hook (one call site, one config block, one UI stat). Estimated **~1–2 day slice** including the two UI surfaces.

## 5. Prerequisites

1. **Author per-artist `massAppeal` values in `data/artists.json`** — spread them meaningfully (niche artists well below 50, mainstream artists above) or the multiplier does nothing.
2. **Add the UI surfaces** — ArtistCard "Mass Appeal" stat + the WeekSummary streaming-breakdown line.
3. **Add the `mass_appeal_reach` knob** to `streaming_calculation` in `data/balance/markets.json`.

## 6. Open questions

- **Which single outcome does massAppeal drive?** — *streaming reach recommended* (§3). If designers prefer a different single hook (e.g. playlist access odds), pick one and only one.
- **Who authors the per-artist values, and against what rubric?** — needs a designer pass over `data/artists.json`; without a deliberate spread the feature is invisible regardless of the engine wiring.
