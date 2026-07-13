/**
 * v3 PAT pool — content-review form definition (2026-07-12 working session).
 *
 * On-screen mirror of the authoring scratchpad hand-off files:
 *   v3-pat-authored-routine.md
 *   v3-pat-authored-major.md
 *   v3-pat-authored-reactive.md
 * The authored text is carried VERBATIM (mechanically extracted) — designer-facing
 * copy under review, so no editorializing, no silent typo fixes. Markdown emphasis
 * markers (** / backticks / *) from the source are dropped as formatting; the words,
 * numbers, ⚑ flags and effect values are preserved exactly.
 *
 * NOTE ON NUMBERS: this is an ADMIN review surface, not a player surface — raw
 * effect values are shown here deliberately so the designer can review them.
 *
 * GENERATED from the hand-off files (scripted extraction, this session); edits to
 * the authored text should happen in a re-authoring pass, not ad hoc here.
 */

import type { PoolReviewEntry } from './poolReviewTypes';

export const V3_PAT_POOL_MEETINGS: PoolReviewEntry[] = [
  {
    "id": "the_guaranteed_placement",
    "title": "The Guaranteed Placement",
    "status": "AUTHORED (pending Nes review)",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "requires release_planned · role head_distribution",
    "prompt": "Slide one: the editorial pitch cycle is a lottery with roughly a twelve percent hit rate — I've charted it across six quarters. Slide two: the Sonder Collective mid-tier list is offering a flat placement fee to skip the lottery entirely. Signed number. Zero variance. The check clears in every model I run. The marquee list clears in one model out of eight. I know which column I live in — tell me which one we're booking.",
    "description": "A mid-tier playlist offers a guaranteed flat fee to skip the pitch cycle — cash certainty against editorial upside for the planned release.",
    "choices": [
      {
        "id": "take_the_fee",
        "label": "Take the flat fee",
        "gist": "A signed number beats a good story.",
        "immediate": "money +8000, exec_mood +2, artist_mood −1",
        "delayed": "awareness_boost −1",
        "outcomeSummary": "Pat took the flat placement fee — a clean signed check, and the release slotted quietly into the mid-tier list."
      },
      {
        "id": "pitch_the_marquee",
        "label": "Pitch for the marquee list",
        "gist": "One model out of eight — but it's the model that matters.",
        "immediate": "money −2000, rep_swing 1, artist_mood +1",
        "delayed": "awareness_boost +4, press_story_flag 1",
        "outcomeSummary": "Pat pitched the marquee editors — materials paid for, the label's name riding on a yes she couldn't model."
      },
      {
        "id": "split_the_catalog",
        "label": "Split the catalog across both",
        "gist": "Smaller fees, both lanes, everything documented.",
        "immediate": "money +2000, reputation +1",
        "delayed": "awareness_boost +3, award_chances +1",
        "outcomeSummary": "Pat split the catalog across both lists — smaller checks on each, the marquee lane kept open, all of it documented."
      }
    ],
    "bandPredictions": {
      "heading": "Band arithmetic (verify offline)",
      "lines": [
        "Safety: fee = +5 (money clamp) · marquee = −(100+10) −2.5 = −112.5 · split = +5 (money) +1 (rep) +1 (award) = +7 → loyal = split (7 > 5).",
        "Committed: fee = 8 −1 = +7 · marquee = 4 −3 −0.5 = +0.5 · split = 2(1) +3 +1 +2 = +8 → committed = split ⚑ thin (8 vs 7, ~12.5% margin — acceptable but re-check after any retune).",
        "Disloyal Pat: fee = 8 −1 = +7 · marquee = ≈−996 · split = 2 +3 = +5 → disloyal = fee (29% margin, no hint needed).",
        "Divergence: disloyal ≠ loyal ✓, 2 distinct picks (loyal=committed=split). Aspire-3 not met — accepted; Pat's scorer collision is the documented hard case (bible §3.4 header)."
      ]
    },
    "designNotes": [],
    "notes": [
      "Notes: The money clamp is the whole trick — split's +$2k scores the same +5 as the fee's +$8k, so the rep+award riders push it past the cash-grab. Artist reacts on the fee (their song sold into a budget context) and the marquee swing (they see the label bet on them). Playlist broker is external → lands on exec_mood. Marquee pitch cashes as: rep_swing = a public pitch the editors remember either way; awareness/press = hype + story banked for the planned release. EV check (P2): marquee's ceiling (awareness +4 + press flag + possible rep up) ≈ 2× split's guaranteed bundle ✓."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-pat-authored-routine.md"
  },
  {
    "id": "the_47_slide_deck",
    "title": "The 47-Slide Deck",
    "status": "AUTHORED (pending Nes review)",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "requires — (ungated; prose stays timeless) · role head_distribution",
    "prompt": "Forty-seven slides. I trimmed it from ninety. This is the quarterly pipeline optimization plan: every handoff mapped, every failure point scored, a two-hundred-item checklist with owners and dates. Option A implements everything this quarter — I'll be honest, it's turbulent. Option B is my recommendation: phased rollout, six quarters, KPI gates at each phase, nothing moves until the previous phase is green. Predictable outcomes within margin of error. Or we shelve it and keep tripping over the same handoffs.",
    "description": "Pat's quarterly optimization plan needs sign-off — a turbulent full cutover, her beloved six-quarter phased rollout, or just the free wins.",
    "choices": [
      {
        "id": "aggressive_cutover",
        "label": "Implement everything now",
        "gist": "Rip the bandage; eat one turbulent quarter.",
        "immediate": "money −8000, rep_swing 1",
        "delayed": "awareness_boost +3",
        "outcomeSummary": "Pat executed the full cutover in one quarter — partners watched the label's pipeline wobble and re-form mid-flight."
      },
      {
        "id": "phased_rollout",
        "label": "Approve the phased rollout ⚑ self_serving_hint: true",
        "gist": "Six quarters, KPI gates, nothing can fail.",
        "immediate": "money −3000, exec_mood +4",
        "delayed": "reputation +1",
        "outcomeSummary": "Pat began the six-quarter phased rollout — KPI gates armed, every step reversible, the plan officially hers."
      },
      {
        "id": "free_wins_only",
        "label": "Take the free wins, park the rest",
        "gist": "Implement the zero-cost fixes; the spend waits.",
        "immediate": "reputation +1, artist_mood +1",
        "delayed": "",
        "outcomeSummary": "Pat implemented the zero-cost fixes and parked the rest of the deck — the roster kept its week, the spend stayed banked."
      }
    ],
    "bandPredictions": {
      "heading": "Band arithmetic",
      "lines": [
        "Safety: cutover = −110 −2.5 = −112.5 · phased = −2.5 +1 = −1.5 · free wins = +1 → loyal = free wins.",
        "Committed: cutover = 3 −3 −2 = −2 · phased = 2 −0.75 = +1.25 · free wins = +2 → committed = free wins (2 vs 1.25, ~37% margin ✓).",
        "Disloyal Pat: hint → phased rollout = +∞. Without the hint her scorer reads phased ≈ −0.003 and free-wins = 0 — the scorer literally cannot smell caution-as-vice, which is exactly why this is the bible's flagged hint case (P6: vice ≠ numeric argmax).",
        "Divergence: disloyal ≠ loyal ✓, 2 distinct."
      ]
    },
    "designNotes": [],
    "notes": [
      "Notes: The vice is CAUTION ITSELF — six quarters of Pat being indispensable, unfalsifiable, and budgeted, with the ceiling capped by design; the hint carries what no effect vector can. Fiction cashing: phased rollout → partners see reliability (rep +1); cutover → pipeline reach means the next planned release arrives in more storefronts (awareness_boost +3) and a public wobble-or-triumph (rep_swing). Roster reacts to being spared the 200-item checklist (artist_mood +1 on free wins). EV check: cutover buys awareness +3 + an EV-neutral swing for $8k vs. free-wins' free rep — attractive to a hype-hungry player pre-release ✓."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism — persistent label modifiers): \"pipeline efficiency\" is the natural first customer for a persistent distribution-efficiency stat (small % on release revenue or marketing efficiency for N weeks). Today awareness_boost is the closest cashable proxy; log with the mechanism wishlist at session wrap."
    ],
    "sourceFile": "v3-pat-authored-routine.md"
  },
  {
    "id": "spontaneity_block",
    "title": "Spontaneity Block",
    "status": "AUTHORED (pending Nes review)",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "requires — (ungated; fiction is label-level, assumes no artist/release state) · role head_distribution",
    "prompt": "Something is happening on the platforms right now that touches this label — I won't dignify it with the word 'trend' until I've quantified it. My process needs forty-eight hours: sample the engagement curve, model the decay, THEN we decide. Yes, I'm aware the moment may not survive forty-eight hours of analysis. That is what the moment gets for being unscheduled.",
    "description": "A viral moment brushing the label is spiking right now — and Pat's process wants 48 hours of analysis it may not survive.",
    "choices": [
      {
        "id": "jump_now",
        "label": "Jump on it now, full weight",
        "gist": "Boost budget, official pile-on, no net.",
        "immediate": "money −3000, rep_swing 1",
        "delayed": "awareness_boost +3, press_story_flag 1",
        "outcomeSummary": "Pat authorized the full jump mid-spike — boost budget out the door before the engagement curve had a name."
      },
      {
        "id": "run_the_process",
        "label": "Let her run the 48 hours ⚑ self_serving_hint: true",
        "gist": "The analysis will be immaculate. The moment may not attend.",
        "immediate": "exec_mood +3",
        "delayed": "awareness_boost +1",
        "outcomeSummary": "Pat ran the full forty-eight-hour analysis — the report was immaculate, and the moment was mostly gone when it printed."
      },
      {
        "id": "jump_small",
        "label": "Engage small and native",
        "gist": "Label socials lean in — human, unbudgeted, now.",
        "immediate": "reputation +1, exec_mood −1",
        "delayed": "awareness_boost +2",
        "outcomeSummary": "Pat let the label engage natively while the spike was live — no budget, no process, and it read as human."
      }
    ],
    "bandPredictions": {
      "heading": "Band arithmetic",
      "lines": [
        "Safety: jump_now = −110 −2.5 = −112.5 · process = 0 · small = +1 → loyal = jump_small (needs jump_small spend-free — DO NOT add a money cost here or loyal flips to the vice).",
        "Committed: jump_now = 3 −3 −0.75 = −0.75 · process = +1 · small = 2 +2 = +4 → committed = jump_small.",
        "Disloyal Pat: hint → run_the_process = +∞. Without it: small = +2, process = +1, jump_now = −1000 — her scorer would pick the SMALL JUMP over her own process ⚑, so the hint is load-bearing (caution is invisible to netMoney + A).",
        "Divergence: disloyal ≠ loyal ✓, 2 distinct."
      ]
    },
    "designNotes": [],
    "notes": [
      "Notes: Ungated, so the prose names no artist, song, or release — the moment \"touches the label\" (scene-adjacent sound, a name-check, a format the roster fits). External platform moment → consequences land on exec_mood, not artist_mood. Vice = inaction-as-self-protection: nothing analyzed can be blamed on her. EV check: jump_now's ceiling (awareness +3 + press flag + swing upside) ≈ 1.5–2× jump_small's bundle at $3k + the gamble ✓."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-pat-authored-routine.md"
  },
  {
    "id": "tour_routing_optimization",
    "title": "Tour Routing Optimization",
    "status": "AUTHORED (pending Nes review)",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "requires tour_active · role head_distribution",
    "prompt": "I rebuilt the routing spreadsheet over the weekend — the current legs were booked by sentiment, not geometry. Version one: pure optimization. Shorter drives on paper for the trucks, longer nights for the humans, and a five-figure savings line. Version two keeps the savings that don't cost sleep. Version three is what the artist's manager asked for, which I have labeled 'the expensive one.' The tour is live; every week we don't choose, the old routing chooses for us.",
    "description": "Pat's rebuilt routing sheet can pull real savings out of the live tour — the only question is how much of it the artist absorbs.",
    "choices": [
      {
        "id": "optimize_hard",
        "label": "Run the pure optimization",
        "gist": "Every dollar of savings; the humans absorb the geometry.",
        "immediate": "money +5000, artist_energy −3, artist_mood −2, exec_mood +2",
        "delayed": "",
        "outcomeSummary": "Pat re-routed the tour for maximum savings — the ledger thanked her, and the van schedule stopped pretending to be humane."
      },
      {
        "id": "balanced_routing",
        "label": "Take the savings that don't cost sleep",
        "gist": "Keep what's free; every promoter gets a schedule that holds.",
        "immediate": "money +3000, reputation +2, artist_energy −1",
        "delayed": "",
        "outcomeSummary": "Pat implemented the balanced routing — solid savings kept, and every promoter on the circuit got a schedule that held."
      },
      {
        "id": "artist_first",
        "label": "Route around the artist",
        "gist": "Rest days stay; the spreadsheet loses.",
        "immediate": "money −2000, artist_mood +3, artist_energy +2, exec_mood −2",
        "delayed": "",
        "outcomeSummary": "Pat routed the legs around the artist's rest days — the spreadsheet took the loss, and the bus got quieter."
      }
    ],
    "bandPredictions": {
      "heading": "Band arithmetic",
      "lines": [
        "Safety: hard = +5 (money clamp; energy/mood invisible to the scorer) · balanced = +5 +2 = +7 · artist-first = −2.5 → loyal = balanced (rep +2 is the tiebreak-avoiding rider — without it, hard and balanced tie at +5 and fall to the mood tie-break).",
        "Committed: hard = +5 · balanced = 4 +3 = +7 · artist-first = −0.5 → committed = balanced.",
        "Disloyal Pat: hard = +5 · balanced = +3 · artist-first = −2 → disloyal = optimize_hard (40% margin, no hint needed).",
        "Divergence: disloyal ≠ loyal ✓, 2 distinct."
      ]
    },
    "designNotes": [],
    "notes": [
      "Notes: No gambles anywhere — this is the rare all-guaranteed Pat meeting where her vice is legible as pure extraction (cash out of artist energy/mood mid-tour, where both are live performance edges post-#156). Bible sketch had energy −4/mood −3; trimmed to −3/−2 to sit inside the routine band. Balanced's rep +2 cashes as circuit reputation — promoters, venues, crew chiefs get schedules that hold. Artist reacts on all three (it is their body on the routing). Stakes are real despite routine tier: mid-tour mood/energy hits land on upcoming show performance, so the +$5k is not free money."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-pat-authored-routine.md"
  },
  {
    "id": "predict_the_quarter",
    "title": "Predict the Quarter",
    "status": "AUTHORED (pending Nes review)",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "requires release_out · role head_distribution",
    "prompt": "The model called last quarter within five percent. With a release in market I have live data, and the new forecast is — I'll say it plainly — beautiful. The trades would print it. 'The label that sees the future' is industry credibility you cannot buy, only bet. Or the model stays in this room, where it keeps quietly making us right. I built it to be used, not admired. Mostly.",
    "description": "Pat's forecast model is calling quarters within five percent — publish it for industry cred, hedge it, or keep the edge in-house.",
    "choices": [
      {
        "id": "publish_the_forecast",
        "label": "Publish the full forecast",
        "gist": "The label that sees the future — if the quarter cooperates.",
        "immediate": "rep_swing 2, artist_mood −1",
        "delayed": "award_chances +1, press_momentum +1",
        "outcomeSummary": "Pat published the full forecast under the label's name — a number the whole industry can now grade in public."
      },
      {
        "id": "keep_internal",
        "label": "Keep the model in-house ⚑ self_serving_hint: true",
        "gist": "The edge stays hers; the next window gets picked by it.",
        "immediate": "exec_mood +3",
        "delayed": "awareness_boost +1",
        "outcomeSummary": "Pat kept the model in-house — the edge stayed proprietary, and the next release window got quietly picked by it."
      },
      {
        "id": "publish_hedged",
        "label": "Publish a hedged version",
        "gist": "Ranges and caveats — credible, ungradeable.",
        "immediate": "reputation +1, exec_mood −1",
        "delayed": "press_momentum +1",
        "outcomeSummary": "Pat published a hedged, ranged version — credible enough to quote, too caveated to ever be wrong."
      }
    ],
    "bandPredictions": {
      "heading": "Band arithmetic",
      "lines": [
        "Safety: publish = −(100+20) = −120 · internal = 0 · hedged = +1 → loyal = publish_hedged.",
        "Committed: publish = 1 −6 = −5 · internal = +1 (awareness) · hedged = +2 → committed = publish_hedged.",
        "Disloyal Pat: hint → keep_internal = +∞. Without it: internal = +1, hedged = 0, publish = −1000 — a bare 1-vs-0 margin ⚑, so the hint is required per the bible's ≥10%-margin rule and per P6 (hoarding-the-edge is the narrative vice; the scorer can barely see it).",
        "Divergence: disloyal ≠ loyal ✓, 2 distinct."
      ]
    },
    "designNotes": [],
    "notes": [
      "Notes: Vice = the proprietary hoard — the model exists so PAT is never wrong, not so the label gets credit. keep_internal's awareness_boost +1 cashes cleanly: the model picks the next release window, so the next planned release lands a touch hotter. publish's rep_swing 2 cashes as a public grade on the quarter; artist reacts to seeing their own sales projections printed in the trades (artist_mood −1). Hedged is the professional's non-answer: real rep, small press pool, and Pat mildly insulted that her precision got caveated. EV check: publish carries award + press-pool sweeteners on an EV-neutral swing — genuinely tempting for an awards-focused campaign ✓."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism — story flags): \"the industry graded the forecast\" begs a delayed callback (a follow-up meeting next quarter where the prediction landed or missed). Needs choice-set story flags from the bible §4 wishlist; today the rep_swing IS the whole resolution. Log alongside the flags mechanism at session wrap."
    ],
    "sourceFile": "v3-pat-authored-routine.md"
  },
  {
    "id": "territory_arbitrage",
    "title": "Territory Arbitrage",
    "status": "DRAFT (pitch 3)",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires release_out · role head_distribution · category distribution",
    "prompt": "Three overseas territories, one term sheet. A regional distributor will wire us a guaranteed advance today for exclusive rights — locked for two years, their pipeline, their pace. I ran the alternative: we build our own lanes out there, which costs real money now and pays in reach we own. There's also a third column on my sheet: license one territory, twelve months, and buy ourselves actual data instead of opinions. The advance is the only number on this page with a guarantee attached. I'm obligated to point that out.",
    "description": "A distributor is offering a fat guaranteed advance for three overseas territories — rights locked for two years.",
    "choices": [
      {
        "id": "take_the_advance",
        "label": "Take the guaranteed advance",
        "gist": "Cash today; three markets go dark behind someone else's pipeline for two years.",
        "immediate": "money +18000, reputation −2, artist_popularity −1",
        "delayed": "awareness_boost −2",
        "outcomeSummary": "Pat signed the three-territory advance — guaranteed money in the account, and those markets locked behind someone else's pipeline for two years."
      },
      {
        "id": "build_our_own_lanes",
        "label": "Keep the rights, build the pipeline",
        "gist": "Spend now to own the reach; the roster sees the label investing in a real international footprint.",
        "immediate": "money −12000, reputation +3, artist_mood +3, creative_capital +1",
        "delayed": "awareness_boost +4, award_chances +2",
        "outcomeSummary": "Pat turned down the advance and put the money into building the label's own overseas pipeline — slower, costlier, and entirely ours."
      },
      {
        "id": "license_one_test",
        "label": "License one territory as a test",
        "gist": "One market, twelve months, clean data — the tidy version of the deal.",
        "immediate": "money +10000, reputation +1, executive_mood +2",
        "delayed": "awareness_boost +1",
        "outcomeSummary": "Pat licensed a single territory as a twelve-month test — modest money now, and a spreadsheet of real market data by spring."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (verified arithmetic)",
      "lines": [
        "Loyal: buildout = −5(money) +3(rep) +3(mood) +4(aw) +2(award) +1(CC) = +8; test = +5(money, capped) +1(rep) +1(aw) = +7 ⚑ thin margin (8 vs 7 — one point; verify against the real scorer, widen buildout's award to +3 if it flips); advance = +5 −2(rep) −1(pop) −2(aw) = 0. → loyal = build the lanes.",
        "Committed: test = 10(gain) +2(rep) +1(A) = 13; advance = 18 −4(rep) −2(A) = 12 ⚑ thin margin (13 vs 12); buildout = 6(rep) +4(A) +2(award) −3(spend/4000) = 9. → committed = license the test.",
        "Disloyal Pat: advance = 18 −2(aw) = +16; test = 10 +1 = +11; buildout = −12 +4 = −8. → disloyal = take the advance. No hint needed; margin healthy.",
        "Three distinct picks — the full trilemma. Disloyal ≠ loyal ✓."
      ]
    },
    "designNotes": [],
    "notes": [
      "Vice is EV-defensible: $18k ≈ an EP budget, guaranteed, this week — the check is real; what it costs is ceiling (reach, rep, the artist's overseas fans). Loyal Pat protects the long game; her vice takes the check and caps it (bible §3.4 recipe, textbook).",
      "Artist reaction: buildout mood +3 (the roster sees international commitment); advance popularity −1 cashes the fiction \"locked markets = overseas fans can't be reached properly.\" Distributor is external → routed through exec_mood on the test (a clean, tidy deal is Pat's comfort food).",
      "Fiction cashes mechanics: awareness deltas bank against the NEXT PLANNED RELEASE — prompt and summaries talk reach/pipeline for what ships next, not the release already out."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-pat-authored-major.md"
  },
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
        "immediate": "money −20000, rep_swing 2",
        "delayed": "awareness_boost +5, press_story_flag 1",
        "outcomeSummary": "Pat placed the full vinyl order — a serious bet that the release becomes a physical-media story rather than a storage invoice."
      },
      {
        "id": "small_collector_run",
        "label": "Press a small collector run",
        "gist": "Scarcity by design: sells out, flatters the artist, catalogs beautifully.",
        "immediate": "money −6000, reputation +2, artist_mood +3, award_chances +1",
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
      "Mechanics-cashing fix vs. the bible sketch: §3.4 authored variance_up 2 on the pressing, but variance_up cashes at the NEXT RECORDING SESSION — a vinyl bet cannot honestly widen a recording outcome. Replaced with rep_swing 2: the pressing either lands as indie-cred story or embarrasses the label — that's a label-reputation gamble and the key cashes it exactly."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism physical_inventory): the honest version of the full pressing creates real stock with weekly sell-through revenue against demand (hype/popularity-driven), and dead stock as a carrying cost. When that mechanism exists, full_pressing converts from rep_swing to actual inventory economics. Log as a C-item at session wrap."
    ],
    "sourceFile": "v3-pat-authored-major.md"
  },
  {
    "id": "the_chargeback_discrepancy",
    "title": "The Chargeback Discrepancy",
    "status": "DRAFT (pitch 6)",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires release_out · role head_distribution · category business",
    "prompt": "I reconcile the royalty statements by hand every quarter. Nobody asks me to. This quarter the distributor's numbers and mine disagree — in our favor, five figures. Their error, their systems, and statistically immaterial to a partner that size; flagging it costs us the money and buys us a reputation for being tedious about pennies. I've drafted three memos: one reports it, one files it under reconciled, and one spends the difference auditing every pipeline we touch, because if they got this wrong, what else is wrong?",
    "description": "Pat found a five-figure royalty discrepancy — in the label's favor. The distributor hasn't noticed.",
    "choices": [
      {
        "id": "report_and_refund",
        "label": "Report it and wire it back",
        "gist": "Clean books, loudly. The kind of tedious integrity people remember at contract time.",
        "immediate": "money −14000, reputation +5, artist_mood +4",
        "delayed": "press_story_flag 1, award_chances +2",
        "outcomeSummary": "Pat reported the discrepancy and wired the money back — the distributor was startled, and the roster heard the label refunds even its own windfalls."
      },
      {
        "id": "file_it_reconciled",
        "label": "Quietly bank it",
        "gist": "Their error, their systems, statistically immaterial. The ledger closes.",
        "immediate": "money +14000, executive_mood +2",
        "delayed": "",
        "outcomeSummary": "Pat filed the discrepancy as reconciled and banked the difference — statistically immaterial, procedurally closed."
      },
      {
        "id": "audit_everything",
        "label": "Spend it auditing everything",
        "gist": "If they got this wrong, what else is wrong? Turn the windfall into a magnifying glass.",
        "immediate": "money −6000, creative_capital +1, award_chances +3, executive_mood +4",
        "delayed": "",
        "outcomeSummary": "Pat spent the found money auditing every pipeline the label touches — three vendors nervous, one systemic leak already patched."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (verified arithmetic)",
      "lines": [
        "Loyal: report = −5(money) +5(rep) +4(mood) +2(award) = +6; bank = +5(money, capped — the $14k grab scores the same as $5k) = +5 ⚑ thin margin (6 vs 5; the whole meeting rests on the cap — verify against the real scorer before commit); audit = −5(money) +1(CC) +3(award) = −1. → loyal = report and refund.",
        "Committed: bank = +14 (gain dominates at 1pt/$1k); report = 10(rep) +2(award) −3.5(spend) = +8.5; audit = 3(award) −1.5 = +1.5. → committed = bank it.",
        "Disloyal Pat: bank = +14; report = −14; audit = −6. → disloyal = bank it. No hint needed; no rep_swing on the vice (deliberate — her scorer kills any gamble, so the \"if it's found\" risk lives in fiction, not in a rep_swing key).",
        "Two distinct picks — committed = disloyal = bank (stated). This is deliberate and defensible: a competent professional also calls five figures of a partner's own error \"immaterial\" and closes the ledger; ONLY a loyal Pat gives the money back. Disloyal ≠ loyal ✓. The audit is nobody's argmax — it's the player-only third axis (award/CC utility)."
      ]
    },
    "designNotes": [],
    "notes": [
      "The vice is EV-attractive by construction: +$14k free and clear, this week. What the loyal pick buys instead is everything money can't: rep +5, roster trust, an integrity story banked against the next release, awards-season character evidence.",
      "Distributor and vendors are external parties → routed through exec_mood (Pat +2 closing the ledger; +4 on the audit, which is her love language). Artist reaction on report only: the roster hearing \"this label refunds errors in its own favor\" is a trust event; banking it quietly is, definitionally, something the artists never learn about — no mood key, and the summary is written so the digest still reads as her call."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-pat-authored-major.md"
  },
  {
    "id": "the_data_broker",
    "title": "The Data Broker",
    "status": "DRAFT (pitch 9)",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "no requires (always eligible) · role head_distribution · category business",
    "prompt": "A broker I do not socially endorse is selling competitor streaming intel — territory-level, playlist-level, fresher than anything public. Provenance: officially 'aggregated partner data,' which is a phrase that means don't ask. It would sharpen our next launch considerably. The alternative is the industry benchmark report — legitimate, subscription-priced, eleven weeks stale, and everyone else already has it. Or we buy nothing and keep flying on instruments we own. I know which row of this table I'd sign for. I'd rather be slow than subpoenaed.",
    "description": "A broker is selling competitor streaming intel of dubious provenance. There's also the legitimate — and stale — industry report.",
    "choices": [
      {
        "id": "buy_the_broker_intel",
        "label": "Buy the broker's intel",
        "gist": "Fresh, sharp, and radioactive if the provenance ever surfaces.",
        "immediate": "money −15000, rep_swing 1, artist_popularity +1",
        "delayed": "awareness_boost +4",
        "outcomeSummary": "Pat bought the broker's intel through a cut-out account — the next launch plan is suddenly very sharp, and the invoice says 'consulting.'"
      },
      {
        "id": "buy_the_clean_report",
        "label": "Buy the industry report",
        "gist": "Legitimate, defensible, and slightly stale — data with a paper trail. (self_serving_hint: true)",
        "immediate": "money −8000, executive_mood +3",
        "delayed": "awareness_boost +2",
        "outcomeSummary": "Pat bought the standard industry benchmark report — clean provenance, defensible in any audit, and eleven weeks behind the broker's version."
      },
      {
        "id": "fly_on_our_instruments",
        "label": "Buy nothing",
        "gist": "The label's own numbers are slower but they're OURS.",
        "immediate": "reputation +2, executive_mood −2",
        "delayed": "",
        "outcomeSummary": "Pat closed the vendor file without buying — the label keeps flying on its own instruments, and she noted the competitive gap in the margin."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (verified arithmetic)",
      "lines": [
        "Loyal: broker = −100 (rep_swing); refuse = +2(rep) = +2; clean report = −5(money) +2(aw) = −3. → loyal = buy nothing.",
        "Committed: refuse = 4(2·rep) = +4; clean report = 2(A) −2(spend) = 0; broker = 4(A) −3.75(spend) = +0.25. → committed = buy nothing.",
        "Disloyal Pat (numeric, pre-hint): refuse = 0; clean report = −8 +2 = −6; broker = −1000. Numeric argmax = refuse — narratively wrong (her vice is the safe, defensible purchase: guaranteed value, zero exposure, someone else's liability). → self_serving_hint: true on the clean report ⚑ (exactly the P6 case: the vice ≠ numeric argmax; the bible flagged this pitch for the hint and it is needed).",
        "Two distinct picks — loyal = committed = buy nothing, disloyal = the clean report (hinted). Disloyal ≠ loyal ✓ (stated). The broker is structurally unpickable by all three bands (gamble) — it exists as the player-only temptation, and it's EV-loaded per P2: the biggest awareness bank on the table plus a popularity tick, priced at real money and one rep gamble."
      ]
    },
    "designNotes": [],
    "notes": [
      "Vice reading: disloyal Pat spends label money on the defensible-but-stale option — caution as self-service. She buys the report so that whatever happens next, HER process was clean. The label pays for her alibi.",
      "Fiction cashes mechanics: both purchases bank awareness against the NEXT PLANNED RELEASE (\"sharpen our next launch\"); popularity +1 on the broker cashes \"targeted pushes actually find the fans.\" Broker/vendors external → exec_mood (+3 comfortable with the clean paper trail; −2 flying blind)."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-pat-authored-major.md"
  },
  {
    "id": "the_exclusive_window_auction",
    "title": "The Exclusive Window Auction",
    "status": "DRAFT (pitch 11, v3 successor to v1 distribution_pitch)",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires release_planned · role head_distribution · category distribution",
    "prompt": "Two platforms want an exclusive window on the release, and their term sheets are on my desk. Platform one: the big check, walled garden, our audience shrinks to their subscriber base for the window. Platform two: a smaller check and front-page placement — less money, more reach, their numbers not ours. Or we decline both and ship it open everywhere, which the roster will love and the balance sheet will not. I've modeled all three. The big check is the only one where I can tell you TODAY what we make. Everything else is a forecast.",
    "description": "Two platforms are bidding for an exclusive window on your planned release — big check versus big reach, or no window at all.",
    "choices": [
      {
        "id": "take_the_big_check",
        "label": "Take the big check",
        "gist": "Guaranteed money; the release launches behind a paywall and the artist knows it.",
        "immediate": "money +14000, reputation −2, artist_mood −2, executive_mood +2",
        "delayed": "awareness_boost −2",
        "outcomeSummary": "Pat signed the exclusive window for the guaranteed check — the release launches behind a paywall, and {artistName} found out from the announcement."
      },
      {
        "id": "take_the_reach_deal",
        "label": "Take the reach deal",
        "gist": "Smaller check, front-page placement — pay less attention to the money, more to the map.",
        "immediate": "money +6000",
        "delayed": "awareness_boost +4",
        "outcomeSummary": "Pat took the smaller check for front-page placement — less guaranteed money, and the release opens onto the platform's biggest stage."
      },
      {
        "id": "ship_it_open",
        "label": "No window — ship it open",
        "gist": "Everywhere, day one, nobody's garden. The roster's favorite word is 'everywhere.'",
        "immediate": "reputation +3, artist_mood +4, creative_capital +1, award_chances +2, executive_mood −3",
        "delayed": "press_momentum +2",
        "outcomeSummary": "Pat declined both term sheets and shipped the release open everywhere — the platforms were annoyed, the roster was delighted, and the trades noticed."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (verified arithmetic)",
      "lines": [
        "Loyal: ship open = +3(rep) +4(mood) +1(CC) +2(award) = +10; reach deal = +5(money, capped) +4(aw) = +9 ⚑ thin margin (10 vs 9); big check = +5 −2(rep) −2(mood) −2(aw) = −1. → loyal = ship it open.",
        "Committed: reach deal = 6(gain) +4(A) = +10; big check = 14(gain) −4(rep) −2(A) = +8; ship open = 6(2·rep) +2(award) = +8 ⚑ thin margins (10 vs 8 vs 8 — the committed pick wins but the runners-up tie; verify offline, and if the real formula counts anything extra on either rival, re-tune the reach deal's awareness upward first). → committed = the reach deal.",
        "Disloyal Pat: big check = 14 −2(aw) = +12; reach deal = 6 +4 = +10; ship open = 0. → disloyal = the big check. No hint needed, but the 12-vs-10 margin is real yet modest ⚑ — if verification wants more air, raise the check to +$18k and deepen its rep to −3 (committed then reads 18−6−2=10, tying the reach deal — so prefer widening via awareness_boost −3 on the check instead).",
        "Three distinct picks — the full trilemma, with two flagged-thin margins to verify. Disloyal ≠ loyal ✓."
      ]
    },
    "designNotes": [],
    "notes": [
      "The reputation −2 on the big check is load-bearing: it is what pries the committed band off the guaranteed money (gain/1000 otherwise dominates her formula at $14k+). Fiction cashes it: walled-garden exclusives read as selling out the fanbase, and the trades say so.",
      "Artist reacts on both poles (mood −2 paywalled, +4 shipped open) — the axis players remember. Platforms are external → exec_mood (+2 on the clean guaranteed deal; −3 on walking away from two signed-number term sheets, which physically pains her).",
      "Fiction cashes mechanics: all awareness deltas bank against the NEXT PLANNED RELEASE — which is exactly the release being windowed (requires: release_planned), so the banked hype lands on the thing the meeting is about. press_momentum on ship-open is the persistent trade-press pool, not the one-shot flag."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-pat-authored-major.md"
  },
  {
    "id": "the_algorithm_change",
    "title": "The Algorithm Change",
    "status": "AUTHORED (bible pitch §3.4-4)",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "reactive release_out (urgent) · role head_distribution · category distribution",
    "prompt": "{songTitle} shipped forty minutes before the platform rolled a new recommendation model. Every curve I fit last week is fiction now — mine and everyone else's, which is the one mercy. The platform knows they broke the industry's week, so their partner team sent a make-good term sheet this morning: guaranteed placement on our next cycle, priced off this week's chaos, expiring Friday. I have three response models. For the first time in my career, they don't agree.",
    "description": "A platform algorithm shift landed on top of your release — and the platform's make-good term sheet expires in days.",
    "choices": [
      {
        "id": "sign_the_make_good",
        "label": "Sign the term sheet before it expires",
        "gist": "Chaos pricing favors whoever signs first. Lock next cycle's placement while they're apologizing.",
        "immediate": "money −30000, reputation +2, exec_mood −2",
        "delayed": "awareness_boost +7, award_chances +1",
        "outcomeSummary": "Pat signed the platform's make-good before it expired — next cycle's placement locked at apology prices."
      },
      {
        "id": "pitch_the_humans",
        "label": "Re-route to editorial humans",
        "gist": "The machine is down; the people aren't. Walk {songTitle} into the pitch rooms in person.",
        "immediate": "money −6000, reputation +2, artist_mood +1",
        "delayed": "creative_capital +1, award_chances +1",
        "outcomeSummary": "Pat took {songTitle} to the editorial desks in person — human curators over a broken machine."
      },
      {
        "id": "hold_and_model",
        "label": "Hold and gather data ⚑ self_serving_hint: true",
        "gist": "Nobody prices an anomaly correctly inside a week. Sit tight; sign nothing until the data settles.",
        "immediate": "artist_mood −2, exec_mood +2",
        "delayed": "quality_bonus +1, awareness_boost −2",
        "outcomeSummary": "Pat held the term sheet and kept the models running — no signature until the data settled."
      }
    ],
    "bandPredictions": {
      "heading": "Band predictions (computed)",
      "lines": [
        "Loyal (safety): sign = 2(rep) + 1(award) − 2.5(spend) = +0.5 · pitch = 2 + 1 + 1(CC) − 2.5 = +1.5 ✓ · hold = 0 → loyal = pitch_the_humans (multi-key guaranteed bundle per the §3.4 recipe).",
        "Committed: sign = 4(2·rep) + 7(A) + 1(award) − 7.5(30k/4k) = +4.5 ✓ · pitch = 4 + 1 − 1.5 = +3.5 · hold = 2(2·Q) − 2(A) = 0 → committed = sign_the_make_good. ⚑ thin margin (4.5 vs 3.5) — verify offline; nudge sign to awareness +8 if it drifts.",
        "Disloyal (Pat): sign = −30 + 7 = −23 · pitch = −6 · hold = 0 − 2 = −2 → hold already wins numerically, but the margin over pitch is small and the winner's score ≈ 0 (degenerate margin test), so the hint is set per the task and P6 — inaction-as-self-protection is the narratively mandatory vice here. → disloyal = hold_and_model.",
        "Three distinct picks — the aspire case. Hint is legal: neither loyal nor committed lands on hold."
      ]
    },
    "designNotes": [
      "Escalation linkage (P9): feeds escalation_dist_deal_collapsed — \"Pat sat on the term sheet running models until the platform pulled it — and told the trades why.\" The disloyal pick's summary below is beat one of that story."
    ],
    "notes": [
      "Source prompt heading: Prompt (Pat, aftermath tense — complements the server's \"why now\" line, doesn't restate it)",
      "Mechanics cash the fiction: awareness_boost +7 is banked hype for the NEXT planned release — that's exactly what the term sheet buys (\"guaranteed placement on our next cycle\"), which is also why sitting on it can collapse. quality_bonus +1 on hold: her teardown of the new recommendation model becomes production notes for the next session (intro length, structure, loudness — data-to-studio is her one crossover). awareness_boost −2 on hold: the make-good moment passes.",
      "Neglect timeline (P9): disloyal self-resolve → digest: \"Pat held the term sheet and kept the models running — no signature until the data settled.\" → loyalty < 40 escalation escalation_dist_deal_collapsed: \"Pat sat on the term sheet running models until the platform pulled it — and told the trades why.\" Beat one → beat two, verbatim continuity.",
      "Artist reaction: hold = artist_mood −2 ({artistName} watches the release flounder while the label runs regressions); pitch = artist_mood +1 (being sold as craft, by a human, to humans)."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-pat-authored-reactive.md"
  },
  {
    "id": "supply_chain_hostage",
    "title": "Supply Chain Hostage",
    "status": "AUTHORED (bible pitch §3.4-7)",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "REGULAR pool · requires release_planned · role head_distribution · category distribution",
    "prompt": "Our fulfillment partner has discovered leverage. New rate card, effective immediately, delivered — and I want you to appreciate this — the week your release enters their pipeline. I've modeled their negotiating position four ways and it's airtight: they know exactly what a slipped street date costs us, because I told them last quarter, in a deck, with confidence intervals. My recommendation is on page one. You won't like the number.",
    "description": "The fulfillment partner is renegotiating with your release already in their pipeline — pay, switch, or slip.",
    "choices": [
      {
        "id": "pay_the_increase",
        "label": "Pay the new rate ⚑ self_serving_hint: true",
        "gist": "Predictability has a price. Today it's printed on their rate card.",
        "immediate": "money −25000, exec_mood +3, artist_mood +1",
        "delayed": "",
        "outcomeSummary": "Pat paid the new rate and kept the street date — predictability bought at list price."
      },
      {
        "id": "switch_mid_flight",
        "label": "Switch vendors mid-flight",
        "gist": "Their leverage is our inertia. A rival vendor will onboard us this week to poach the account.",
        "immediate": "money −8000, rep_swing 2, exec_mood −4",
        "delayed": "awareness_boost +3",
        "outcomeSummary": "Pat tore up the fulfillment contract a week out and moved the release to an untested vendor — hostage takers get nothing."
      },
      {
        "id": "slip_the_date",
        "label": "Delay the release",
        "gist": "Nobody negotiates well on a deadline they set themselves. Take the deadline away.",
        "immediate": "reputation −1, artist_mood −8, exec_mood +1",
        "delayed": "awareness_boost −4",
        "outcomeSummary": "Pat slipped the street date rather than pay ransom — the launch moment went with it, and {artistName} took it hard."
      }
    ],
    "bandPredictions": {
      "heading": "Band predictions (computed)",
      "lines": [
        "Loyal (safety): pay = −2.5(spend) = −2.5 · switch = −2.5 − (100 + 20)(rep_swing 2) = −122.5 · slip = −0.5(rep −1 × 0.5) = −0.5 ✓ → loyal = slip_the_date. Deliberate scorer-blindspot texture: the \"safe\" pick quietly burns unscored channels (artist_mood −8, awareness −4) — a loyal Pat protects the ledger and wounds the artist, which is exactly her tragedy.",
        "Committed: pay = −25000/4000 = −6.25 · switch = 3(A) − 6(3V) − 2(spend) = −5 ✓ · slip = −2(2·rep) − 4(A) = −6 → committed = switch_mid_flight. ⚑ razor margin (−5 vs −6 vs −6.25) — crisis triage where everything is bad is the point, but verify offline; sweeten switch to awareness +4 if it drifts.",
        "Disloyal (Pat): pay = −25 · switch = −1000 − 8 = out · slip = 0 − 4 = −4 → slip would win numerically, so the hint is set on pay ⚑: \"predictability at any price\" is her vice, and the scorer can't smell it (paying is pure spend). Legal per P6 — neither loyal nor committed picks pay. → disloyal = pay_the_increase.",
        "Three distinct picks."
      ]
    },
    "designNotes": [],
    "notes": [
      "Source prompt heading: Prompt (Pat, timeless — safe under release_planned only)",
      "Mechanics cash the fiction: rep_swing 2 on switch (not variance_up — that key is next-recording-session and this fiction can't cash it): the untested vendor either ships flawlessly or botches launch week in public, an instant reputation gamble. awareness_boost +3 on switch: the rival vendor's placement network is part of the poach offer — banked hype for the planned release ✓. awareness_boost −4 on slip: the banked launch-moment hype dies with the date — this is the cleanest fiction↔mechanics fit in the meeting (negative awareness hits exactly the release being delayed).",
      "P2 check: the gamble (switch) is EV-attractive — $8k + a rep coin-flip + banked hype vs. a guaranteed $25k ransom. An inspired committed Pat taking it is sometimes right.",
      "Artist reaction on all three (mood +1 / — / −8); vendor is external → exec_mood carries the process feelings."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-pat-authored-reactive.md"
  },
  {
    "id": "the_anomaly_premium",
    "title": "The Anomaly Premium",
    "status": "INVENTED reactive (chart_debut)",
    "finalized": false,
    "contentPending": false,
    "tier": "major (opportunity-shaped urgency; money band ±$10–40k)",
    "gating": "reactive chart_debut (urgent) · role head_distribution · category distribution",
    "prompt": "I need to say this in a controlled environment: my forecast was wrong. {songTitle} charted outside my ninety-fifth percentile, which means every projection I've published this quarter is now mispriced — in our favor, which is worse, because errors in your favor attract salesmen. Three platforms called before lunch with catalog carry deals priced off one anomalous week. They are betting the number corrects before I finish my regression. One of us is mispricing this moment. My model says it's them.",
    "description": "The debut broke Pat's forecast model — and the platforms are pricing term sheets off the anomaly.",
    "choices": [
      {
        "id": "take_the_carry_deal",
        "label": "Take the biggest advance",
        "gist": "Guaranteed money against an unverified anomaly. Bank the error before it corrects.",
        "immediate": "money +30000, artist_popularity −1, exec_mood +3",
        "delayed": "awareness_boost −2",
        "outcomeSummary": "Pat took the carry advance while the number was still an outlier — catalog locked, ceiling capped, cash banked."
      },
      {
        "id": "auction_the_moment",
        "label": "Run a 72-hour open auction",
        "gist": "If they want to price off the anomaly, they can bid against each other in public.",
        "immediate": "money +15000, rep_swing 1, exec_mood −3",
        "delayed": "press_story_flag 1",
        "outcomeSummary": "Pat put the moment up for open auction and let the trades watch the platforms bid — theatrical, for her."
      },
      {
        "id": "publish_the_correction",
        "label": "Publish the corrected forecast",
        "gist": "Reprice the catalog publicly and decline every sheet. Nobody buys the label's upside at last month's number.",
        "immediate": "reputation +3, artist_mood +2, exec_mood +2",
        "delayed": "award_chances +2, creative_capital +1",
        "outcomeSummary": "Pat published the corrected forecast and declined every term sheet — the catalog's upside is not for sale mid-anomaly."
      }
    ],
    "bandPredictions": {
      "heading": "Band predictions (computed)",
      "lines": [
        "Loyal (safety): take = +5(money gain, capped) = +5 · auction = +5 − 110(rep_swing) = −105 · publish = 3(rep) + 2(award) + 1(CC) = +6 ✓ → loyal = publish_the_correction (the multi-key bundle beats the capped windfall by exactly the §3.4 recipe).",
        "Committed: take = 30(gain) − 2(A) = +28 ✓ · auction = 15 − 3(V) = +12 · publish = 6(2·rep) + 2(award) = +8 → committed = take_the_carry_deal (gain/1000 makes windfalls dominate this scorer; nothing authorable outbids +28).",
        "Disloyal (Pat): take = 30 − 2 = +28 ✓ · auction = −1000 · publish = 0 → disloyal = take_the_carry_deal, huge margin, no hint needed — the guaranteed check that caps the ceiling IS her scorer, natively.",
        "Only 2 distinct picks achievable — stated per §3.4 header: committed and disloyal converge on the carry deal (any windfall big enough to be her vice also wins the committed formula); loyal Pat protects the label's long game. Divergence Test still passes (disloyal ≠ loyal, 2 distinct). The auction is the player's EV-attractive temptation (P2): $15k + a press story + a rep coin-flip vs. $30k with the ceiling capped."
      ]
    },
    "designNotes": [],
    "notes": [
      "Source prompt heading: Prompt (Pat, aftermath tense)",
      "Mechanics cash the fiction: carry deal's awareness_boost −2 = locked carry placement narrows organic reach for the next planned release; artist_popularity −1 = {artistName}'s exposure routed through one platform's shelf. Auction's rep_swing 1 = leaking bids to the trades either reads as savvy or as desperate — instant rep gamble ✓. Correction's creative_capital +1 = declining the sheets preserves creative control of the catalog (same independence-as-CC precedent as the bible's CEO Investor pitch).",
      "Neglect timeline (P9): disloyal self-resolve = took the anomaly-priced deal → digest: \"Pat took the carry advance while the number was still an outlier…\" → AUTHORING GAP ⚑: ESCALATION_EVENT_BY_ROLE routes all Pat escalations to escalation_dist_deal_collapsed (\"sat on the term sheet\"), whose prose continues Meeting 1's hold, not this deal-taken beat. Bible target is 2 escalations per archetype — author the second Pat escalation as escalation_dist_anomaly_lockin: \"Pat took the anomaly-priced carry deal solo; the number corrected inside a month and the platform's clawback lawyers found the recoupment clause she initialed.\" Choices (all-cost, damage-control postures): repay the delta (−$20k), fight the clause publicly (rep_swing 2, exec_mood −5), let them recoup from the next release (awareness −3, artist_mood −4). Log at session wrap."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-pat-authored-reactive.md"
  },
  {
    "id": "the_long_tail_audit",
    "title": "The Long Tail Audit",
    "status": "INVENTED regular (catalog-gap filler)",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "REGULAR pool · requires release_out · role head_distribution · category distribution",
    "prompt": "Quarterly catalog review. The bottom third of our released catalog now costs more in per-title distribution fees than it returns — I can show you the crossover point on a chart, it's genuinely elegant. A budget-compilations outfit will take the whole tranche off our books for a flat licensing fee, sight unseen. Or we spend nothing, reframe the deep cuts as a curated story, and pitch the revival ourselves. Or — and I include this option for completeness — we ask the artists what they want done with their own work.",
    "description": "Pat's audit says the bottom of the catalog costs more than it earns — sell it down, revive it, or hand the call to the artists.",
    "choices": [
      {
        "id": "license_the_remnants",
        "label": "License the tranche to the comps outfit",
        "gist": "Flat fee, zero admin, off the books by Friday. The spreadsheet has no column for feelings.",
        "immediate": "money +4000, reputation −1, artist_mood −2, exec_mood +2",
        "delayed": "awareness_boost −1",
        "outcomeSummary": "Pat licensed the bottom of the catalog to a budget-compilations outfit — clean books, and the deep cuts now live on 'Chill Hits Vol. 47'."
      },
      {
        "id": "curate_the_revival",
        "label": "Run a zero-cost deep-cuts revival",
        "gist": "The catalog tells a story if someone bothers to tell it. Reallocate existing pitch slots; spend nothing.",
        "immediate": "reputation +2, artist_mood +2",
        "delayed": "awareness_boost +2, award_chances +2, creative_capital +1, press_momentum +1",
        "outcomeSummary": "Pat repackaged the deep cuts as a curated catalog story and pitched the revival through existing channels — zero spend."
      },
      {
        "id": "ask_the_artists",
        "label": "Hand the decision to the artists",
        "gist": "Their names are on the work. The model can wait a quarter.",
        "immediate": "artist_mood +3, exec_mood −3",
        "delayed": "",
        "outcomeSummary": "Pat tabled the audit and put the catalog question to the artists themselves — the model overruled by the names on the work."
      }
    ],
    "bandPredictions": {
      "heading": "Band predictions (computed)",
      "lines": [
        "Loyal (safety): license = +5(gain, capped) − 0.5(rep −1) = +4.5 · revival = 2(rep) + 2(award) + 1(CC) = +5 ✓ · ask = 0 → loyal = curate_the_revival. ⚑ razor margin (5 vs 4.5) and it exists only because ANY money gain caps at exactly +5 — the CC +1 on revival is load-bearing; verify offline and do not strip it in tuning.",
        "Committed: license = 4(gain) − 1(A) − 2(2·rep) = +1 · revival = 4(2·rep) + 2(A) + 2(award) = +8 ✓ · ask = 0 (nothing it touches is scored) → committed = curate_the_revival.",
        "Disloyal (Pat): license = +4 − 1 = +3 ✓ · revival = 0 + 2 = +2 · ask = 0 → disloyal = license_the_remnants, no hint (margin 3 vs 2 = 33% > the 10% bar, but thin ⚑ — if tuning shaves the license fee below ~$3k equivalent or pushes revival's awareness above +3, re-verify).",
        "Only 2 distinct picks achievable — stated per §3.4 header: loyal and committed converge on the revival; her cash-grab-that-caps-the-ceiling diverges. Divergence Test passes. ask_the_artists is the player-only humanity axis — invisible to all three scorers by design (mood/exec_mood are unscored), which is itself the meeting's quiet point: no version of Pat picks it."
      ]
    },
    "designNotes": [],
    "notes": [
      "Catalog gap filled: back-catalog economics — none of the twelve §3.4 pitches touch what happens to music AFTER its cycle ends; pure Systems Optimizer territory (marginal cost vs. marginal revenue on art), and a routine-tier meeting that trades mostly in non-money channels per P3. Avoids all twelve excluded topics.",
      "Source prompt heading: Prompt (Pat, timeless)",
      "Mechanics cash the fiction: awareness_boost −1 on license = the brand cheapened ahead of the next planned release's moment; awareness_boost +2 + press_momentum +1 on revival = a warmed audience and a slow-build press pool feeding the next release ✓; creative_capital +1 on revival = curation-as-creative-act (the catalog reframed as a body of work). Routine magnitudes throughout (money ±$4k, rep ±1–2, mood ±2–3) — texture tier, non-money channels carry it per P3.",
      "Artist reaction on all three (−2 / +2 / +3); the comps outfit is external → exec_mood carries her satisfaction/offense."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-pat-authored-reactive.md"
  }
];

export const V3_PAT_POOL_LEVEL_NOTES: string[] = [
  "[v3-pat-authored-routine.md] Pool-level divergence summary",
  "| # | Meeting | Loyal | Committed | Disloyal (Pat) | Hint | Distinct |",
  "|---|---|---|---|---|---|---|",
  "| 1 | The Guaranteed Placement | split_the_catalog (7) | split_the_catalog (8 ⚑ vs 7) | take_the_fee (7 vs 5) | no | 2 |",
  "| 2 | The 47-Slide Deck | free_wins_only (1) | free_wins_only (2) | phased_rollout | ⚑ yes | 2 |",
  "| 3 | Spontaneity Block | jump_small (1) | jump_small (4) | run_the_process | ⚑ yes | 2 |",
  "| 4 | Tour Routing Optimization | balanced_routing (7) | balanced_routing (7) | optimize_hard (5 vs 3) | no | 2 |",
  "| 5 | Predict the Quarter | publish_hedged (1) | publish_hedged (2) | keep_internal | ⚑ yes | 2 |",
  "All five pass the Divergence Test's hard requirement (disloyal ≠ loyal, ≥2 distinct). None reach the aspirational 3-way — a structural Pat limitation (her vice scorer and the safety scorer share the gamble-phobia, and the committed scorer is money/rep-shaped like both), documented in bible §3.4. Hint budget: 3 of 5 — above the ~1-in-3 guideline, but all three are the caution-as-vice / hoard-as-vice cases the bible pre-flagged (⚑ in §3.4), where netMoney + A structurally cannot express the vice. The two unhinted meetings (1, 4) are the cash-grab-shaped ones where her scorer works natively.",
  "Open items for Nes: (a) meeting 1's committed margin (8 vs 7) — retune-sensitive; (b) meeting 4 trimmed the bible's energy −4/mood −3 to −3/−2 for the routine band — confirm; (c) meeting 3 must keep jump_small spend-free or the loyal band flips to the vice.",
  "[v3-pat-authored-major.md] Scorer model used for band arithmetic (stated so verification can check the same math)",
  "- Loyal (safety): any variance_up/rep_swing anywhere = −100. Otherwise sum of per-key contributions, each clamped to ±5: money/1000, reputation, creative_capital, award_chances, quality_bonus, artist_mood, awareness_boost (post-fix scorer values quality/mood/awareness). executive_mood, press_story_flag, press_momentum, artist_popularity assumed NOT scored — every meeting below survives them counting at face value except where noted.",
  "- Committed: 2Q + 2rep + A + award + gain/1000 − 3V − spend/4000. Mood, CC, exec_mood, press, popularity not in formula. rep_swing assumed NOT counted as V here (verify offline; no committed pick below depends on a rep_swing choice either way).",
  "- Disloyal Pat: any variance_up or rep_swing = −1000; else netMoney/1000 + awareness_boost. self_serving_hint overrides.",
  "Pat construction rule (bible §3.4 header): her vice ≈ the old safety scorer, so divergence is built deliberately — loyal pick = multi-key guaranteed bundle; her vice = the cash/awareness grab that caps upside; committed gets its own utility home where the arithmetic allows (big positive money dominates the committed formula at 1pt/$1k, so some meetings below are honestly 2-band — each is stated).",
  "---",
  "[v3-pat-authored-major.md] Pool-level verification summary",
  "| # | Meeting | Loyal | Committed | Disloyal | Distinct | Hint | ⚑ Flags |",
  "|---|---|---|---|---|---|---|---|",
  "| 1 | Territory Arbitrage | build the lanes (8) | license test (13) | advance (16) | 3 | no | loyal 8v7; committed 13v12 |",
  "| 2 | Physical Media Bet | small run (2) | small run (4.5) | pass (0) | 2 (loyal=committed, per bible note) | no | loyal 2v0 |",
  "| 3 | Chargeback Discrepancy | report (6) | bank (14) | bank (14) | 2 (committed=disloyal, stated) | no | loyal 6v5 (rests on the money cap) |",
  "| 4 | The Data Broker | buy nothing (2) | buy nothing (4) | clean report (hint) | 2 (loyal=committed, stated) | yes — clean report | hint-dependent by design |",
  "| 5 | Exclusive Window Auction | ship open (10) | reach deal (10) | big check (12) | 3 | no | loyal 10v9; committed 10v8v8; disloyal 12v10 |",
  "- All five: disloyal ≠ loyal ✓ (hard minimum). Two full trilemmas (1, 5); three stated 2-band meetings, each with a bible-sanctioned or narratively-deliberate reason.",
  "- All money moves ±$6–22k against major tier ±$10–40k (the $6k legs are the small siblings of $14–20k forks, which is the tier's intent).",
  "- Every choice ships outcome_summary: executor-voice, agency-neutral past tense, no second person, no engine numbers.",
  "- CC grants ≤ +1 everywhere. One self_serving_hint in five meetings (P6 budget: ~1 in 3 — under budget).",
  "- UPGRADE SPECS logged: physical_inventory (Physical Media Bet). The Chargeback's \"if it's found\" risk is fiction-only by necessity (a rep_swing would nuke her vice scorer) — acceptable, but a future delayed_exposure flag mechanism would cash it honestly; note for the wishlist.",
  "[v3-pat-authored-reactive.md] Cross-meeting notes for the working session",
  "1. Hint budget: 2 of 4 hinted (Algorithm hold, Hostage pay) — both are caution/inaction-as-vice cases the numeric scorer structurally cannot find, exactly P6's intended use. Under the ~1-in-3 budget for a 12-meeting pool if the rest of Pat's pool stays hint-light.",
  "2. Band-shape inventory: M1 = 3 distinct (aspire) · M2 = 3 distinct · M3 = 2 distinct (committed+disloyal converge on the windfall — unavoidable, stated) · M4 = 2 distinct (loyal+committed converge on the bundle — stated). Mix satisfies the Divergence Test on all four.",
  "3. ⚑ thin margins to verify offline before JSON commit: M1 committed (4.5 vs 3.5), M2 committed (−5 vs −6), M4 loyal (5 vs 4.5) and M4 disloyal (3 vs 2). All pass the 10% bar on paper but sit close enough that any tuning pass must re-run the scorers.",
  "4. UPGRADE SPEC (new escalation event): author escalation_dist_anomaly_lockin as Pat's second escalation (per-role escalation routing currently sends everything to deal_collapsed, whose prose only continues M1). Sketch in M3's neglect-timeline note. Log as a C-item at session wrap alongside the mechanism wishlist.",
  "5. Key-discipline note: the bible's §3.4 sketch for Supply Chain Hostage used variance_up on the vendor switch; this authoring replaced it with rep_swing because variance_up cashes only at the next RECORDING session and a fulfillment-vendor fiction can't cash that. Same substitution logic applied to M3's auction. No fiction here promises anything its keys don't deliver."
];
