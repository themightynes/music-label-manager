# [FUTURE] Physical Inventory System

**Status**: DEFERRED by designer ruling, July 25, 2026 — physical sales are not being brought into the game for now. The engine mechanism stays live-but-dormant; the two authored scenarios that wired it were removed from the v3 pool review surfaces and are preserved verbatim in §4 of this doc for reactivation.
**Origin**: Engine Verbs Tier 1+2 arc, slice 10 (M9), July 12, 2026 (`[COMPLETE] engine-verbs-plan.md`). Economics flagged as C104 ("dormant 3× money printer") in the July 21, 2026 pre-merge review; retune options queued as PENDING-DECISIONS #10; ruling July 25, 2026: defer the whole feature instead of retuning.
**Reactivation gate**: the §6 checklist. The soft lint `tests/engine/data-lint-content-dead-verbs.test.ts` pins `grant_inventory` as content-dead and its header carries the retune-first rule — content cannot wire the verb without a conscious pin edit.

---

## 1. What exists in the engine today (dormant, fully built)

Everything below is live code on `main`, reachable only via the content-dead `grant_inventory` effect key. **Do not describe physical sales as a live game feature anywhere** — the only physical-adjacent revenue players can see is tour merch (`ticketRevenue × merch_percentage`, a flat 0.15 derived stream with no inventory).

- **Effect key**: `grant_inventory` (badge "Physical Pressing"), registered in `LIVE_EFFECT_KEYS` and processed in `ActionProcessor.applyEffects` (`shared/engine/processors/ActionProcessor.ts`, `case 'grant_inventory'`). Authored value = unit count, rounded, silently clamped to `max_units_per_grant` (20,000); non-positive ignored.
- **Grant behavior**: attaches to the targeted artist's (or label-wide) **latest released** release via `pickLatestReleasedRelease`; skips with a warning if nothing is released. Manufacturing cost `units × unit_cost` is charged up front through `summary.expenses` / `expenseBreakdown.roleMeetingCosts`, mirroring meeting-cost reconciliation.
- **Ledger**: `gameState.flags.inventory[]` (`InventoryLedgerEntry`, `shared/engine/flagsLedgers.ts`): `id` (`${releaseId}-w${createdWeek}`, collision-suffixed), `releaseId`, `releaseTitle`, `artistId?`, `unitsInitial`, `unitsRemaining`, `unitCost`, `unitPrice`, `createdWeek`. Deliberately a **flags-ledger MVP** — "full inventory tables" were deferred in the engine-verbs plan to avoid a SNAPSHOT_VERSION bump.
- **Weekly pass**: `processInventoryWeek` (`shared/engine/flagsLedgers.ts:139-190`), consumed inside `ReleaseProcessor.processReleasedProjects` behind a `ledgersActive` gate (games that never used the verbs stay byte-identical). Order: expiry check first (age ≥ `shelf_life_weeks` → one-time no-money write-off notice, entry dropped), else:
  - `awareness` = the tied release's **best song awareness** that week, clamped 0–100
  - `sold = round(unitsInitial × base_weekly_sell_rate × (1 + awareness/100 × awareness_sell_rate_bonus_max))`, floored at `min_weekly_units`, capped at `unitsRemaining`
  - `revenue = sold × unit_price` → `summary.revenue`, with a "💿 physical copies moved / sold out" change row
- **Knobs**: `data/balance/markets.json` → `market_formulas.physical_inventory` (mirrored in `PHYSICAL_INVENTORY_DEFAULTS`, `shared/engine/flagsLedgers.ts:64-72`): `unit_cost 4`, `unit_price 12`, `base_weekly_sell_rate 0.12`, `awareness_sell_rate_bonus_max 1.0`, `min_weekly_units 1`, `shelf_life_weeks 12`, `max_units_per_grant 20000`.
- **UI**: no dedicated inventory panel exists. Surfacing is only the week-summary change rows above, plus a number-free "Physical Pressing" qualitative badge in `DialogueInterface` (`QUALITATIVE_EFFECT_KEYS`) if content ever offers the key.
- **Tests**: `tests/engine/flags-ledgers.test.ts` (floor, expiry/write-off), `tests/engine/live-economy-effect-keys.test.ts:217-282` (grant flow, `max_units_per_grant` clamp, non-positive no-op).

## 2. Why it was flagged (C104: the money printer)

Two compounding facts at the shipped tuning:

1. **`sold` is a fraction of *initial* units, not remaining** — at zero awareness a pressing sells a flat 12% of the run per week, selling out in ~9 weeks, comfortably inside the 12-week shelf life (nominal capacity 0.12 × 12 = 144%). **The write-off branch can mathematically never fire** at meaningful grant sizes; sell-through is a guaranteed 100%.
2. **The margin is 3×** ($12 price vs $4 cost). Every unit converts at a guaranteed +$8; awareness only *accelerates* the payout (up to 2× rate at awareness 100), never gates it.

Net: a deterministic, zero-risk 3× return on any `grant_inventory` spend — same tripwire class as C102's `spawn_release` free lunch. The `min_weekly_units: 1` floor additionally guarantees a trickle at any awareness.

## 3. Retune analysis (from the July 25, 2026 walk-through — unimplemented, preserved for reactivation)

The profit math reduces to **return multiple = sell-through × unit_price ÷ unit_cost**. The three PENDING-DECISIONS #10 levers, evaluated:

- **Sell rate below `1/shelf_life_weeks`** (< 0.083, e.g. 0.06 → max 72% sell-through at zero awareness): makes write-offs *possible*, but alone still guarantees profit (0.72 × 12 ÷ 4 = 2.16×).
- **Narrow the $4→$12 spread**: alone, still guaranteed profit at 144% capacity — just a smaller printer.
- **Awareness carries the upside**: only meaningful combined with the first lever — awareness can't create risk while the base rate already guarantees sellout.

**Conclusion: it takes rate + spread together to create real downside**, with awareness as the redemption arc. Candidate tuning discussed (not ruled on — the deferral mooted it):

| Knob | Shipped | Candidate |
|---|---|---|
| `base_weekly_sell_rate` | 0.12 | 0.06 |
| `unit_cost` / `unit_price` | $4 / $12 | $6 / $10 |
| `awareness_sell_rate_bonus_max` | 1.0 | 1.0 (keep) |

Candidate shape: zero awareness → 72% sell-through, ~−12% loss ("a storage unit full of regret"); mid awareness (~50) → late sellout, ~+45–65%; high awareness → fast sellout, capped ~+67%. The bet becomes "press physical *if you believe in this release's awareness*" — matching both preserved scenarios' fictions, and giving the awareness system its first economic consumer.

Open questions left un-ruled at deferral time:
1. Should zero-awareness pressings lose money outright, or barely break even?
2. What's the right max return for a passive, no-slot, no-energy revenue stream relative to tours (which cost energy + slots)?
3. Is "fraction of initial units" acceptable, or should sales scale off remaining stock? (Knob-only retune keeps the former; the latter is a code + golden-master change and probably unnecessary.)
4. Deterministic sell-through means a player who knows the formula can compute EV exactly — is that acceptable, or does the "bet" fiction want variance?

## 4. The two removed scenarios (verbatim, for reactivation)

Both were removed from the pool review modules and the `POOL_REVIEW_MEETING_IDS` contracts on July 25, 2026 (deferral ruling). Both were `finalized: false` with **no designer review responses recorded**. Mac's "From the Vault" was thematically adjacent but wires `grant_song` + `spawn_release`, not `grant_inventory` — it was NOT removed and is not part of this deferral.

### 4.1 Pat / "Physical Media Bet" (was `v3PatPoolReview.ts`, pool position 7 of 14; id `physical_media_bet`)

```json
{
  "id": "physical_media_bet",
  "title": "Physical Media Bet",
  "status": "DRAFT (pitch 5)",
  "finalized": false,
  "contentPending": false,
  "tier": "major",
  "gating": "requires release_planned · role head_distribution · category distribution",
  "prompt": "Pressing-plant slots opened up — a cancellation upstream, and we're next on the list. I priced three scenarios. Full pressing: real margin if it sells through, a storage unit full of regret if it doesn't — the confidence interval on vinyl is wider than I like to put my name on. Small collector run: costs little, sells out by design, looks good on everyone. Or we pass, and the slots go to whoever's behind us. For the record: the model prefers the option where we don't own ten thousand units of anything.",
  "description": "Vinyl pressing slots just opened up ahead of your release — a real margin if it sells, dead stock if it doesn't.",
  "choices": [
    {
      "id": "full_pressing",
      "label": "Order the full pressing",
      "gist": "Go long on vinyl: either the label becomes a physical-media story or a cautionary one.",
      "immediate": "grant_inventory 4000 (real stock, real weekly sell-through — replaces the money −20000 flat cost; unit cost charged immediately per brief §1.12), rep_swing 2",
      "delayed": "awareness_boost +5, press_story_flag 1",
      "outcomeSummary": "Pat placed the full vinyl order — a serious bet that the release becomes a physical-media story rather than a storage invoice."
    },
    {
      "id": "small_collector_run",
      "label": "Press a small collector run",
      "gist": "Scarcity by design: sells out, flatters the artist, catalogs beautifully.",
      "immediate": "grant_inventory 500 (small guaranteed-sellout run — replaces the flat money −6000 cost), reputation +2, artist_mood +3, award_chances +1",
      "delayed": "awareness_boost +1",
      "outcomeSummary": "Pat ordered a limited collector pressing — small, certain to sell out, and {artistName} reportedly asked to sign the first fifty."
    },
    {
      "id": "pass_on_the_slots",
      "label": "Pass on the slots",
      "gist": "Let the slots go; the safest inventory is none.",
      "immediate": "executive_mood +2",
      "delayed": "",
      "outcomeSummary": "Pat passed on the pressing slots — no stock, no storage, no exposure. The forecast remains exactly as it was."
    }
  ],
  "bandPredictions": {
    "heading": "Bands (verified arithmetic)",
    "lines": [
      "Loyal: full pressing = −100 (rep_swing); small run = −5(money) +2(rep) +3(mood) +1(award) +1(aw) = +2; pass = 0 ⚑ thin margin (2 vs 0). → loyal = small run.",
      "Committed: small run = 4(rep) +1(A) +1(award) −1.5(spend) = +4.5; full pressing = 5(A) −5(spend) = 0; pass = 0. → committed = small run.",
      "Disloyal Pat: pass = 0; small run = −6 +1 = −5; full pressing = −1000. → disloyal = pass. No hint needed.",
      "Two distinct picks — loyal = committed = small run, per the bible's authoring note for this pitch (\"accept loyal=committed here and let disloyal diverge\"). Disloyal ≠ loyal ✓ (minimum satisfied, stated explicitly)."
    ]
  },
  "designNotes": [],
  "notes": [
    "The vice here is caution itself: disloyal Pat lets the moment pass and keeps the forecast clean — the pure zero. The full pressing is the player-only temptation, and it's EV-loaded per P2 (the biggest awareness bank in this pool + a press story + rep upside on the swing) so declining it visibly costs something.",
    "Mechanics-cashing fix vs. the bible sketch: §3.4 authored variance_up 2 on the pressing, but variance_up cashes at the NEXT RECORDING SESSION — a vinyl bet cannot honestly widen a recording outcome. Replaced with rep_swing 2: the pressing either lands as indie-cred story or embarrasses the label — that's a label-reputation gamble and the key cashes it exactly.",
    "ENGINE VERBS TIER 1+2 UPDATE (2026-07-13): the physical_inventory mechanism this scenario's upgradeSpec was waiting for now exists (grant_inventory, brief §1.12) — full_pressing and small_collector_run now grant REAL stock (flags.inventory[] ledger) with weekly sell-through revenue against demand instead of a flat sunk money cost. This is a genuine mechanical upgrade: full_pressing's \"storage unit full of regret if it doesn't sell\" is now literally true (unsold units write off as carrying cost) rather than metaphor. rep_swing 2 stays on full_pressing (the public physical-media bet, independent of whether the stock itself sells). ⚑ Unit counts (4000 / 500) and pricing are a first-pass guess at matching the original $20k/$6k budget feel via the unit_cost knob (data/balance/markets.json market_formulas.physical_inventory) — grant_inventory also silently caps at max_units_per_grant, so Nes must verify these against the live knob defaults before JSON commit; the money −20000/−6000 literals were removed since grant_inventory charges its own expense at the deduction site (brief §1.12) and double-charging would be the exact free-lunch/double-charge class of bug the brief warns about."
  ],
  "upgradeSpecs": [
    "UPGRADE SPEC — IMPLEMENTED (2026-07-13, this sweep): full_pressing and small_collector_run now use the real grant_inventory verb (flags.inventory[] ledger, weekly sell-through, unit-cost expense) instead of a flat money cost + rep_swing/awareness proxy. See notes for the unit-count caveat Nes must verify. No longer a wishlist item."
  ],
  "sourceFile": "v3-pat-authored-major.md"
}
```

Pool-summary rows that referenced it (removed context, for band re-verification at reactivation): band table row "| 2 | Physical Media Bet | small run (2) | small run (4.5) | pass (0) | 2 (loyal=committed, per bible note) | no | loyal 2v0 |"; it was one of the "9 of 14 scenarios upgraded to real verbs" and carried a ⚑ band-arithmetic caveat (bands computed against the OLD proxy keys, never re-verified against real ledger mechanics).

### 4.2 Dante / "The Loudness Heresy" (was `v3DantePoolReview.ts`, reactive pool; id `the_loudness_heresy`)

Note at reactivation: only ONE choice (`press_the_audiophile_edition`) wires `grant_inventory` — an alternative to restoring the whole scenario is re-authoring that choice without the pressing and returning the scenario to the pool. It was removed wholesale under the "remove the pending meetings that use it" ruling. Its gating fed the `escalation_cco_artist_walkout` linkage (P9 note below), which other Dante scenarios (e.g. Salvage Job) also serve.

```json
{
  "id": "the_loudness_heresy",
  "title": "The Loudness Heresy",
  "status": "major · reactive release_out · role cco (INVENTED)",
  "finalized": false,
  "contentPending": false,
  "tier": "major",
  "gating": "reactive_trigger: release_out (URGENT — Dante-lane neglect feeds escalation_cco_artist_walkout)",
  "prompt": "{songTitle} is in the world exactly as I mixed it — no limiter crushing its lungs, dynamics intact. The believers hear a record that breathes. Everyone else is listening on telephone speakers and calling depth 'mud.' The reviews are a referendum on my ears, and someone in this building is already drafting an apology for the mix. Decide now what we are.",
  "description": "The mix Dante fought for is out, and reception has split down doctrinal lines — audiophiles in rapture, casual listeners asking why it's so quiet. His wavelength is on trial.",
  "choices": [
    {
      "id": "press_the_audiophile_edition",
      "label": "Double down — press the audiophile edition",
      "gist": "A statement pressing, liner-note manifesto, doctrine vindicated at full price.",
      "immediate": "money −6000, executive_mood +6, grant_inventory 250",
      "delayed": "quality_bonus +4, variance_up +1, press_story_flag 1",
      "outcomeSummary": "Dante answered the mix debate with an audiophile edition and a liner-note manifesto — the label's money spent defending his cut of {songTitle}."
    },
    {
      "id": "quiet_streaming_remaster",
      "label": "Commission a quiet streaming remaster",
      "gist": "Fix the phone-speaker complaint without a press release. Nobody has to lose.",
      "immediate": "money −5000, reputation +2, artist_mood +3, executive_mood −4",
      "delayed": "",
      "outcomeSummary": "A louder streaming master of {songTitle} was quietly swapped in — casual ears satisfied, Dante's original preserved for the believers."
    },
    {
      "id": "let_the_argument_run",
      "label": "Let the argument be the marketing",
      "gist": "No remaster, no edition — hand the controversy to press and let it burn.",
      "immediate": "reputation +1, press_momentum +1",
      "delayed": "press_story_flag 1, awareness_boost +2",
      "outcomeSummary": "The mud-versus-depth debate over {songTitle} was left to rage — and fed to the press as the story of a label that doesn't flinch."
    }
  ],
  "bandPredictions": {
    "heading": "Bands (target)",
    "lines": [
      "loyal = quiet remaster (rep + artist mood, gamble-free — the artist just wants people to hear their song); committed = let the argument run (2·rep + awareness at zero spend edges the remaster's 2·rep-minus-cost) ⚑ thin margin between remaster and argument on BOTH the loyal and committed scorers — verify offline; if it collapses, raise the remaster's artist_mood or drop its cost to −$4k; disloyal Dante = the edition, still dominant post-upgrade (money term shrank to −6000 but the effect now ALSO auto-charges units×unit_cost via grant_inventory, so re-run the exact total before treating the margin as final — directionally still clear). Three distinct picks targeted."
    ]
  },
  "designNotes": [],
  "notes": [
    "EV check: the edition banks the biggest quality promise for the next session (doctrine emboldened) plus a press story — expensive but genuinely the richest bundle.",
    "P9 neglect linkage: disloyal digest line has Dante spending label money to defend his cut of the artist's song — the walkout escalation reads as the artist concluding whose record this ever was. Softer than the Salvage chain but compatible with the same event prose.",
    "External parties (reviewers, audiophile press) route through executive_mood and press keys, not invented mechanics; artist reacts where plausible (remaster relieves them; the manifesto is conspicuously not about them).",
    "Money split (post-upgrade): −6000 is authored as the manifesto/liner-notes/press-campaign spend only; the physical pressing cost is now charged automatically by `grant_inventory` (units × unit_cost knob, `data/balance/markets.json market_formulas.physical_inventory`). 250 units is a first-pass \"limited pressing\" estimate — verify the auto-charged total lands near the original −18000 all-in cost (and stays under the `max_units_per_grant` knob) before this goes into data/events.json."
  ],
  "upgradeSpecs": [
    "UPGRADE SPEC ADOPTED (2026-07-13): the audiophile edition now creates a REAL limited-pressing SKU via `grant_inventory` (§1.12) — a genuine flags-ledger inventory entry with weekly sell-through (`flagsLedgers.processInventoryWeek`), not just spend + banked flags. This is the exact \"small delayed revenue stream, sellout-or-dead-stock variance\" the original spec asked for, and shares the mechanism family with Mac's \"From the Vault\" spec. Residual: the money split above needs a knob-informed balance pass before shipping to JSON (flagged in notes)."
  ],
  "sourceFile": "v3-dante-authored-reactive.md"
}
```

⚠️ Known authoring inconsistency to fix at reactivation: 250 units at the shipped $4 `unit_cost` is only $1,000 of auto-charged pressing cost — nowhere near the intended ~$18k all-in feel. Either `unit_cost` rises substantially, the unit count rises, or the intended cost feel is revised.

## 5. Design questions for the eventual implementation

Beyond the §3 retune math, a real physical-sales feature should decide:

1. **Is a meeting-choice verb the right entry point at all?** The MVP models pressings only as exec-meeting side effects. A fuller feature could live on the Plan Release page (pressing as a release-planning decision alongside marketing budget), which is where a player would expect it.
2. **Ledger vs. table**: the flags-ledger MVP deliberately avoided a SNAPSHOT_VERSION bump. A player-facing feature with UI (stock on hand, sell-through history) probably wants the deferred "full inventory tables."
3. **UI surface**: nothing displays `flags.inventory` today. Minimum: a stock line on the release page; the week-summary rows already exist.
4. **Interaction with awareness**: the sell formula is the natural first *economic consumer* of the awareness system — a deliberate design opportunity, not just a balance patch.
5. **Variance**: the current sell-through is fully deterministic. The "bet" fiction (both preserved scenarios) implies risk; consider a seeded roll on weekly demand, or let awareness movement carry the uncertainty.
6. **Merch adjacency**: tour merch (0.15 of ticket revenue) is a separate, live, non-inventory stream. A physical-sales feature should decide whether they stay separate fictions or unify.

## 6. Reactivation checklist

1. Rule on the §3/§5 questions (at minimum: the knob retune — sell rate + spread together; a unit test asserting sell-through < 100% at zero awareness per the C104 entry's effort note).
2. Retune `data/balance/markets.json` `market_formulas.physical_inventory` + mirror `PHYSICAL_INVENTORY_DEFAULTS` (`shared/engine/flagsLedgers.ts`); keep them in lockstep (tripwire-style, per C82 precedent).
3. Restore/re-author the §4 scenarios into the v3 pools: re-add ids to `DANTE_POOL_REVIEW_MEETING_IDS` / `PAT_POOL_REVIEW_MEETING_IDS` (`shared/api/contracts.ts`), re-add the objects to `v3DantePoolReview.ts` / `v3PatPoolReview.ts`, bump the pinned pool counts in `tests/shared/api/mac-pool-review-contract.test.ts` (they were decremented at removal: Dante 15→14, Pat 14→13).
4. Re-verify both scenarios' band arithmetic against the REAL ledger mechanics (both carried ⚑ caveats — bands were computed against old proxy keys) and fix the §4.2 unit-count/cost-feel inconsistency.
5. When the first content actually wires the verb: edit `EXPECTED_CONTENT_DEAD_VERBS` in `tests/engine/data-lint-content-dead-verbs.test.ts` (remove `grant_inventory`) — the pin header's rule ("retune those knobs first") must be satisfied by then.
6. Decide the UI surfacing (§5.3) and update the systems map + Label Head's Guide if the mechanic becomes player-visible (C103-class doc-sync).
