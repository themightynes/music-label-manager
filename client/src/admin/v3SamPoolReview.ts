/**
 * v3 SAM pool — content-review form definition (2026-07-12 working session).
 *
 * On-screen mirror of the authoring scratchpad hand-off files:
 *   v3-sam-authored-routine.md
 *   v3-sam-authored-major.md
 *   v3-sam-authored-reactive.md
 *   v3-sam-authored-new.md
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

export const V3_SAM_POOL_MEETINGS: PoolReviewEntry[] = [
  {
    "id": "slow_news_week",
    "title": "Slow News Week",
    "status": "AUTHORED (pending Nes review + divergence verification)",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "requires release_planned · role cmo",
    "prompt": "Nothing is happening. I've read every trade twice, three group chats are arguing about a festival poster, and that's the whole industry this week. A dead cycle is not a rest, it's a vacuum — and vacuums get filled by whoever moves first. We have something coming. I can start a fight, I can place a piece, or I can sit on my hands and let some other label's nobody own the week.",
    "description": "A dead news cycle before your release — Sam wants to fill the vacuum before someone else does.",
    "choices": [
      {
        "id": "manufacture_the_feud",
        "label": "Start a tasteful little war",
        "gist": "Two subtweets and a well-briefed columnist. Feuds write themselves — and sometimes they write you.",
        "immediate": "rep_swing 1",
        "delayed": "awareness_boost +3, press_momentum +1",
        "outcomeSummary": "Sam lit a controlled feud in a dead news cycle — the industry picked a side, and the label was suddenly the story."
      },
      {
        "id": "seed_the_profile",
        "label": "Commission the long-lens profile",
        "gist": "The expensive kind of quiet: a prestige writer, weeks of access, a piece people cite for years.",
        "immediate": "money −8000, reputation +1",
        "delayed": "press_story_flag 1, awareness_boost +1, artist_mood +1",
        "outcomeSummary": "Sam bought {artistName} a long-lens prestige profile — real money for the kind of piece that gets cited for years."
      },
      {
        "id": "hold_fire",
        "label": "Hold fire, keep the powder dry",
        "gist": "Silence is a position too. Save the moves for a week that deserves them.",
        "immediate": "",
        "delayed": "press_momentum +1, artist_mood +1",
        "outcomeSummary": "Sam sat the dead week out and banked the quiet — no spend, no noise, powder dry for the rollout."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (target)",
      "lines": [
        "loyal = hold fire (only gamble-free, spend-free line; small mood/momentum value), committed = the profile ⚑ (2·rep + awareness − spend/4000 ≈ +1, thin margin over hold's ~0 — verify), disloyal Sam = the profile (biggest spend, 10·8k dominates; no hint needed). 2 distinct picks, disloyal ≠ loyal ✓."
      ]
    },
    "designNotes": [],
    "notes": [
      "Authoring note (per bible ⚑): the tasteful profile is deliberately authored as THE BIG SPEND so Sam's 10·spend scorer lands on it naturally — the feud stays the pure gamble (rep_swing + the fattest awareness bank, EV-attractive per P2, auto-excluded for loyal). Artist reacts on profile (+flattered) and hold (+relieved); the feud leaves the artist out of it by design — Sam fights her wars off the roster's lawn.",
      "Fiction cashing: profile lands as a banked press story + a sliver of anticipation for the planned release; the feud's heat is banked hype spent when the release is planned — copy says \"own the week going INTO the drop,\" never \"boost the drop that's out.\""
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-sam-authored-routine.md"
  },
  {
    "id": "billboard_money",
    "title": "Billboard Money",
    "status": "AUTHORED (pending Nes review + divergence verification)",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "requires release_planned · role cmo",
    "prompt": "There's a billboard on the best corner in the city and its lease just fell through, which means for about seventy-two hours it costs what it should instead of what it does. I used to write about labels who bought that corner. People photograph it. People argue under the photographs. Or we do the boring-smart thing and buy screens instead of skyline. Or we keep the money and I stop describing the corner to you.",
    "description": "A prime physical takeover slot opened up cheap ahead of your release — skyline, screens, or savings.",
    "choices": [
      {
        "id": "full_takeover",
        "label": "Buy the corner",
        "gist": "The skyline play. Nobody screenshots a budget line, everybody screenshots that wall.",
        "immediate": "money −8000",
        "delayed": "awareness_boost +3, artist_mood +1, press_momentum +1",
        "outcomeSummary": "Sam bought the best corner in the city for {artistName}'s rollout — a wall you can't scroll past."
      },
      {
        "id": "targeted_digital",
        "label": "Buy screens, not skyline",
        "gist": "Geo-targeted digital where the actual listeners live. Less romance, more receipts.",
        "immediate": "money −5000, reputation +1",
        "delayed": "awareness_boost +2",
        "outcomeSummary": "Sam skipped the skyline and bought targeted screens — cheaper, measurable, aimed where the listeners already are."
      },
      {
        "id": "bank_the_budget",
        "label": "Keep the money",
        "gist": "The corner will exist next quarter. Let the rollout's own drumbeat do the early work.",
        "immediate": "",
        "delayed": "press_momentum +1",
        "outcomeSummary": "Sam passed on the billboard and banked the budget — the rollout keeps its powder, the corner keeps its lease."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (target)",
      "lines": [
        "loyal = bank the budget (full and targeted both eat the capped −5 money penalty and net ≤0; bank is clean small positive), committed = targeted digital (2·rep + A − spend/4000 ≈ +2.75, clear winner), disloyal Sam = full takeover ($8k > $5k spend; no hint needed). 3 distinct picks — the perfect trilemma."
      ]
    },
    "designNotes": [],
    "notes": [
      "Authoring note: the vice is EV-defensible (P2) — the takeover carries the biggest awareness bank plus momentum and an artist beat; a disloyal Sam buying the corner is not authored as an idiot, just as someone spending your money on her portfolio. Artist reacts on the takeover (they drive past their own face); the other two are pure label-machinery calls, so Sam's exec_mood is deliberately left quiet — this one is about the money's shape, not her feelings.",
      "Fiction cashing: release_planned gating means the billboard genuinely promotes the upcoming release — awareness_boost cashes exactly as the prose promises. No upgrade needed."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-sam-authored-routine.md"
  },
  {
    "id": "journalist_favor_called_in",
    "title": "Journalist Favor Called In",
    "status": "AUTHORED (pending Nes review + divergence verification)",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "requires music_exists · role cmo (bible lists ungated; the prose needs held music — gate it)",
    "prompt": "Remember the review that put us on the map before we deserved it? That critic just called in the marker. They want first listen — to the thing we're still holding, the one nobody outside this building has heard. In my old life a favor was currency and I never bounced a check. But it's not my song. So: we open the vault, we hand them something shiny that isn't the vault, or I call them back and burn twelve years of goodwill in one sentence.",
    "description": "A critic who owes Sam everything wants first listen to music you're still holding.",
    "choices": [
      {
        "id": "grant_first_listen",
        "label": "Open the vault",
        "gist": "Her network is her power — and networks run on paid debts. The right byline hearing it first changes how everyone else hears it. self_serving_hint: true",
        "immediate": "exec_mood +3, artist_mood −1",
        "delayed": "press_story_flag 1, awareness_boost +3",
        "outcomeSummary": "Sam opened the vault and gave her critic first listen — the debt is paid and the first word on the record is theirs."
      },
      {
        "id": "grant_a_decoy",
        "label": "Hand them something shiny",
        "gist": "An exclusive that isn't THE exclusive. Decoys work right up until they're noticed.",
        "immediate": "rep_swing 1",
        "delayed": "press_momentum +1, exec_mood −2",
        "outcomeSummary": "Sam fed the critic a decoy exclusive — a real story, just not the one they were owed, and decoys get noticed."
      },
      {
        "id": "burn_the_favor",
        "label": "Burn the favor",
        "gist": "The music isn't collateral. Sam makes the call herself, and it costs her something real.",
        "immediate": "exec_mood −4, reputation +1",
        "delayed": "artist_mood +2",
        "outcomeSummary": "Sam called her oldest marker void and kept the vault shut — the critic heard 'no' and the artist never heard about it."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (target)",
      "lines": [
        "loyal = burn the favor (rep + artist-relief, zero gamble, zero spend; the decoy's rep_swing auto-excludes it), committed = open the vault ⚑ (awareness ≈ +3 edges burn's 2·rep ≈ +2 — thin, verify), disloyal Sam = open the vault via self_serving_hint (nothing here spends a dollar, so her 10·spend scorer is blind — this is the textbook P6 hint: the vice is her NETWORK, not her budget). 2 distinct picks, disloyal ≠ loyal ✓."
      ]
    },
    "designNotes": [],
    "notes": [
      "Authoring note: Sam's exec_mood is the reaction axis on all three (the critic is an external party, not an artist) — paying the debt feeds her, the decoy embarrasses her craft, burning it genuinely hurts her. The artist reacts where the music is touched: stung by the vault opening, protected by the burn.",
      "Fiction cashing: the first listen banks a press story + hype toward the held music's eventual planned release — honest as written. UPGRADE SPEC (future mechanism relationship ledger / per-journalist memory): burning the favor should set a story flag a later Sam meeting can require (\"the critic you burned reviews the next record\") — today the cost is compressed into exec_mood + the decoy's leak risk."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-sam-authored-routine.md"
  },
  {
    "id": "crisis_retainer",
    "title": "Crisis Retainer",
    "status": "AUTHORED (pending Nes review + divergence verification)",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "requires — · role cmo",
    "prompt": "Every label thinks it doesn't need crisis PR until the night it needs crisis PR, and by then the good firms are conflicted out and you're paying triple for someone who learned your artist's name in the cab. I want a retainer. Standing, boring, invisible — the fire department you resent every month there isn't a fire. I know what next quarter looks like from the inside of a story you never saw coming. Fund it, halve it, or tell me I'm the retainer.",
    "description": "Sam wants a standing crisis-PR retainer funded before anyone needs it.",
    "choices": [
      {
        "id": "fund_the_retainer",
        "label": "Fund the fire department",
        "gist": "The full firm, on standing call. Nobody plans the emergency; you can plan the response.",
        "immediate": "money −8000, exec_mood +3, artist_mood +1",
        "delayed": "press_momentum +2",
        "outcomeSummary": "Sam put a crisis firm on full standing retainer — an invisible line item until the night it's the only one that matters."
      },
      {
        "id": "fund_half",
        "label": "Fund the hotline, not the firm",
        "gist": "A scoped retainer: first-48-hours coverage, nothing gold-plated. Preparedness that reads as professionalism.",
        "immediate": "money −4000, reputation +1",
        "delayed": "press_momentum +1",
        "outcomeSummary": "Sam negotiated a half-retainer — first-forty-eight-hours crisis coverage on a scoped check, professionalism without the gold plate."
      },
      {
        "id": "she_is_the_retainer",
        "label": "Tell her she IS the retainer",
        "gist": "The label already pays for the best crisis operator in the business. She doesn't take it as a compliment.",
        "immediate": "exec_mood −3",
        "delayed": "",
        "outcomeSummary": "Sam was told she IS the crisis plan — the retainer stayed unfunded and she filed the compliment under 'cheap'."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (target)",
      "lines": [
        "loyal = she IS the retainer (both funded lines net negative under the capped money penalty; the free line's exec_mood hit isn't scored by safety), committed = fund half ⚑ (2·rep − spend/4000 ≈ +1 over refuse's 0 — thin, verify), disloyal Sam = full retainer (biggest spend; no hint needed). 3 distinct picks."
      ]
    },
    "designNotes": [],
    "notes": [
      "Authoring note: this is the purest expression of her vice-as-a-defensible-position — the full retainer is genuinely good practice AND the biggest check with her name on the org chart. Artist reacts only on the full fund (the roster hears there's a safety net); the refuse line's cost is entirely Sam — the external party here is a PR firm, so exec_mood carries the reaction (per rule: external parties are not artists).",
      "Fiction cashing: a standing press apparatus = press_momentum, the persistent decaying pool — the retainer IS the mechanic, decaying monthly exactly like an unrenewed engagement would. Cleanest mechanical fit in the pool; no upgrade needed."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-sam-authored-routine.md"
  },
  {
    "id": "own_the_correction",
    "title": "Own the Correction",
    "status": "AUTHORED (pending Nes review + divergence verification)",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "requires release_out · role cmo",
    "prompt": "A mid-size outlet ran our numbers this morning and undersold the release by a margin I'd call malicious if I thought they could count. Here's what I know from the other side of the byline: a correction runs at the bottom of the page, but a better story runs at the top of someone else's. We can make them fix it, we can make it irrelevant, or we can let it die in the archive where — I'll be honest — most numbers live.",
    "description": "An outlet ran numbers that undersell your release — demand the fix, bury it, or let it fade.",
    "choices": [
      {
        "id": "demand_the_correction",
        "label": "Make them print the correction",
        "gist": "The label that checks receipts gets quoted carefully forever after. Slow, unglamorous, compounding.",
        "immediate": "reputation +1, artist_mood +1",
        "delayed": "exec_mood +1",
        "outcomeSummary": "Sam made the outlet print the correction — bottom of the page, but every desk in town saw the label check its receipts."
      },
      {
        "id": "plant_the_counter",
        "label": "Plant the better story",
        "gist": "Don't fight the number, replace the headline. A counter-piece in a bigger outlet that makes the bad math irrelevant.",
        "immediate": "money −4000, reputation +1",
        "delayed": "awareness_boost +2, press_momentum +1",
        "outcomeSummary": "Sam planted a bigger counter-story over the bad math — the wrong number died under a better headline, with heat carrying into what's next."
      },
      {
        "id": "let_it_die",
        "label": "Let it die in the archive",
        "gist": "Nobody remembers a Tuesday chart piece. Except Sam. And possibly the artist.",
        "immediate": "exec_mood −2, artist_mood −1",
        "delayed": "",
        "outcomeSummary": "Sam let the underselling piece die unanswered in the archive — no spend, no fight, and no one on record defending the number."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (target)",
      "lines": [
        "loyal = demand the correction (rep + artist-mood, spend-free, gamble-free — clear safety argmax), committed = plant the counter ⚑ (2·rep + A − spend/4000 ≈ +3 over demand's ~+2 — thin, verify), disloyal Sam = plant the counter (the only spend on the board; no hint needed). 2 distinct picks, disloyal ≠ loyal ✓ (committed and disloyal converge on the plant — an honest convergence: it IS the smart play, they just want it for different reasons)."
      ]
    },
    "designNotes": [],
    "notes": [
      "Authoring note: artist reacts on two of three — defended (+) when the label fights, stung (−) when nobody does; the plant deliberately leaves the artist neutral (they never learn the counter-story was bought). The outlet is an external party → Sam's exec_mood carries that edge (quiet satisfaction on the correction, disgust at letting it die).",
      "Fiction cashing (honest version): awareness_boost cannot promote the release that's already OUT — the counter-story's copy is authored as reframing the narrative so the heat carries into the artist's NEXT planned release (\"with heat carrying into what's next\"), which is exactly what the bank does. UPGRADE SPEC (future mechanism catalog_bump / retroactive stream modifier on an existing release): the plant's truest payoff is a streams bump on the undersold release itself; today's closest honest version banks the heat forward instead. Log as mechanism C-item at session wrap."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-sam-authored-routine.md"
  },
  {
    "id": "the_dossier",
    "title": "The Dossier",
    "status": "DRAFT, awaiting Nes review",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires — (timeless) · role cmo · category marketing",
    "prompt": "There's a journalist sitting on a story about us. Not fatal — just ugly enough to follow us around for a quarter. Here's what I never put in a memo: I know things about how that byline gets made. Sourcing they'd rather keep quiet. It's leverage, not blackmail — I checked with myself twice. I can make this story disappear by Friday, or we can trade our way out like civilians, or we can eat it. Your label, your stomach.",
    "description": "A journalist is sitting on an unflattering label story — and Sam is holding leverage she's itching to spend.",
    "choices": [
      {
        "id": "spend_the_leverage",
        "label": "Let Sam spend the leverage",
        "gist": "The story dies — and everyone on that beat learns what crossing Sam costs. Could cut either way.",
        "immediate": "rep_swing 2, executive_mood +3, self_serving_hint: true",
        "delayed": "press_momentum +2",
        "outcomeSummary": "Sam spent her leverage on the journalist — the story died, and everyone on that beat noticed how."
      },
      {
        "id": "trade_the_exclusive",
        "label": "Trade an exclusive instead",
        "gist": "Kill the bad story by handing them a better one — first access to the next release, packaged at label expense.",
        "immediate": "money −10000, reputation +2",
        "delayed": "press_story_flag 1",
        "outcomeSummary": "Sam traded the journalist first access to the next release — the story got shelved for a better one."
      },
      {
        "id": "let_it_run",
        "label": "Let the story run",
        "gist": "Clean hands. Take the bruise, keep the moral inventory intact.",
        "immediate": "reputation −2, executive_mood −3, award_chances +1",
        "delayed": "artist_mood +2",
        "outcomeSummary": "Sam let the story run untouched — a bruise in print, and the label's hands stayed clean."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (math checked)",
      "lines": [
        "Loyal: leverage = −100 (rep_swing). Exclusive ≈ money −5 (cap) + rep +2 = −3. Let it run ≈ rep −2 + award +1 + artist_mood +2 = +1 → loyal = let it run.",
        "Committed: leverage ≈ 0 (nothing scored; ≤ −6 if rep_swing counts toward V). Exclusive = 2(+2) − 10000/4000 = +1.5. Let it run = 2(−2) + 1 = −3 → committed = trade the exclusive.",
        "Disloyal Sam: leverage spends $0 → raw score 0; exclusive spends $10k → 100. The numeric argmax lands on the WRONG choice — self_serving_hint on spend_the_leverage is confirmed required by the math (the bible's ⚑ was right). Her vice here is her nerve and her network, not the check. → disloyal = spend the leverage. Perfect trilemma, 3 distinct."
      ]
    },
    "designNotes": [],
    "notes": [
      "P2 check: rep_swing 2 is EV-zero, so the vice carries a press_momentum +2 sweetener — the gamble is a genuinely attractive offer, not poison.",
      "Artist reaction: on let_it_run only (\"the roster hears the label ate a bad story rather than play dirty\") — no plausible artist axis on the other two; the journalist is external, so Sam's exec_mood is the reaction channel there."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism story_flags): the natural version sets flags.story['journalist_burned'] / ['journalist_owed'] so a later Sam meeting can call the favor back or duck the hostile byline. Closest honest version today: press_momentum / press_story_flag stand in for the relationship."
    ],
    "sourceFile": "v3-sam-authored-major.md"
  },
  {
    "id": "awards_whisper_campaign",
    "title": "Awards Whisper Campaign",
    "status": "DRAFT, awaiting Nes review",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires release_out · role cmo · category marketing",
    "prompt": "Three trades used the word 'contender' about the release this month. That word doesn't happen by accident — somebody's whispering, and right now it isn't us. There's a consultant who runs these campaigns; his fee is obscene and his win rate is why. Or I burn my own book — every favor I banked in ten years of bylines — and we whisper for ourselves. Or we go the other way entirely: announce we don't campaign, and let the abstention BE the story. Awards season only knocks once per record.",
    "description": "The trades say your release has outside award heat — Sam wants to decide, this week, how hard the label whispers.",
    "choices": [
      {
        "id": "hire_the_consultant",
        "label": "Hire the campaign consultant",
        "gist": "The obscene fee, the professional machine, Sam directing it.",
        "immediate": "money −25000, executive_mood +2",
        "delayed": "award_chances +4, awareness_boost +1",
        "outcomeSummary": "Sam hired the awards consultant — the quiet-money kind whose fee never appears on any ballot."
      },
      {
        "id": "work_her_contacts",
        "label": "Sam works her own book",
        "gist": "Ten years of favors, called in over dinners. Cheaper, personal, and it costs her something to spend.",
        "immediate": "money −8000, reputation +1, executive_mood +4",
        "delayed": "award_chances +3",
        "outcomeSummary": "Sam worked her own contacts for the award push — favors called, dinners booked, no consultants."
      },
      {
        "id": "refuse_to_campaign",
        "label": "Publicly refuse to campaign",
        "gist": "'The work speaks.' Sam hates it — and drafts the most quotable refusal in trade history anyway.",
        "immediate": "reputation +1, award_chances −1, executive_mood −2",
        "delayed": "artist_mood +3, press_momentum +1",
        "outcomeSummary": "Sam announced the label doesn't campaign for awards — the work speaks, and the trades quoted it."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (math checked)",
      "lines": [
        "Loyal: consultant ≈ −5 + 4 + 1 = 0. Contacts ≈ −5 + 3 + 1 = −1. Refuse ≈ +1 − 1 + 3 = +3 → loyal = refuse (the only pick with no five-figure outlay and an artist upside).",
        "Committed: consultant = 4 + 1 − 6.25 = −1.25. Contacts = 2(+1) + 3 − 2 = +3. Refuse = 2(+1) − 1 = +1 → committed = work her contacts. ⚑ margin vs refuse is 2 points — verify offline; if too thin, trim refuse's rep to 0 (the statement is cool, not reputational).",
        "Disloyal Sam: consultant = 10·25 + 1 = 251; contacts = 80; refuse = 0 → disloyal = the consultant, numerically, no hint needed. Three distinct picks."
      ]
    },
    "designNotes": [],
    "notes": [
      "Artist reaction: refuse carries artist_mood +3 (the artist reads the label betting on the work, not the room). ⚑ Nes call: if the artist would rather WANT the trophy push, flip this to artist_mood on work_her_contacts (+2, \"Sam spending her own book on me\") and re-run the loyal math.",
      "P3: −$25k is a real dent (an EP's budget) against award +4 — the biggest award grant in the major band, priced accordingly.",
      "No UPGRADE SPEC needed: award_chances accumulating to the end-of-campaign roll cashes this fiction exactly."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-sam-authored-major.md"
  },
  {
    "id": "the_comeback_client",
    "title": "The Comeback Client",
    "status": "DRAFT, awaiting Nes review",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires — (timeless) · role cmo · category marketing",
    "prompt": "Name from my blogger days just called. Canceled — properly canceled, three years ago, you'd know the headline. They want a redemption arc and they want US to run it. This is either the story of the year with our name on the byline, or a tar pit with our logo in it. I can run it loud — full campaign, label out front. I can ghost-run it for a fee — good money, zero fingerprints. Or we pass and stay boring. I'll be honest: my hands are already typing the pitch.",
    "description": "A canceled artist from Sam's blogger past wants the label to run their redemption — the story of the year, or a tar pit.",
    "choices": [
      {
        "id": "take_it_loudly",
        "label": "Take it, label out front",
        "gist": "Full redemption campaign, Sam's name on every beat of it. The label is in every story for a month.",
        "immediate": "money −20000, rep_swing 3, artist_mood −3",
        "delayed": "awareness_boost +4, press_momentum +2",
        "outcomeSummary": "Sam took the comeback story publicly and put the label's name across the whole redemption arc."
      },
      {
        "id": "ghost_run_quietly",
        "label": "Ghost-run it for a fee",
        "gist": "Consulting money, no credit. If it ever leaks that Sam wrote the arc, the optics are mercenary.",
        "immediate": "money +15000, rep_swing 1, executive_mood −3",
        "delayed": "",
        "outcomeSummary": "Sam ghost-ran the comeback for a consulting fee — good money, and no label fingerprints anywhere."
      },
      {
        "id": "decline_politely",
        "label": "Pass on the whole thing",
        "gist": "Some stories you cover; some you don't become.",
        "immediate": "reputation +1, artist_mood +2",
        "delayed": "",
        "outcomeSummary": "Sam passed on the comeback client — the story of the year went off to be someone else's problem."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (math checked)",
      "lines": [
        "Loyal: loudly = −100 (rep_swing 3). Ghost-run = −100 (rep_swing 1). Decline = +1 + 2 = +3 → loyal = decline (both money plays carry leak/backfire risk; the safe Sam keeps the roster out of it).",
        "Committed: loudly = 4 − 9 − 5 = −10. Ghost-run = 15 − 3 = +12. Decline = 2 → committed = ghost-run (a professional takes clean money for work she can do in her sleep).",
        "Disloyal Sam: loudly = 10·20 + 4 = 204; ghost-run = 0 (income); decline = 0 → disloyal = take it loudly, numerically, no hint needed. Three distinct picks."
      ]
    },
    "designNotes": [],
    "notes": [
      "P2 check: the loud play is EV-defensible — awareness +4 + press_momentum +2 + the halo bundle is ~2× the safe siblings' guaranteed value; an inspired disloyal Sam nailing the redemption arc is sometimes RIGHT.",
      "Artist reaction: loudly = artist_mood −3 (your own signee squirms sharing a label with the redemption project); decline = artist_mood +2 (relief). Ghost-run = no artist axis — they never know (that's the point), so Sam's exec_mood −3 (her best work, uncredited) carries the reaction.",
      "Honest-fiction note: awareness_boost banks label-side heat for the NEXT PLANNED release (~2-month expiry) — copy says \"the label is in every story for a month; heat that carries into whatever you release next,\" never \"the comeback artist joins the roster.\""
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism chained_events / story_flags): the real version is a multi-week arc — take it loudly schedules a \"redemption verdict\" event 4–6 weeks out that pays or detonates based on a roll. Today's rep_swing 3 is the compressed honest version of that verdict."
    ],
    "sourceFile": "v3-sam-authored-major.md"
  },
  {
    "id": "platform_exclusive_bidding",
    "title": "Platform Exclusive Bidding",
    "status": "DRAFT, awaiting Nes review (REPLACES v1 cmo_platform_exclusive)",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires release_planned · role cmo · category marketing",
    "prompt": "Two platforms want an exclusive window on the release. One is waving the bigger check — take the money, wall the release off from half its audience for a month. The other pays nothing but puts us on every screen they own, and they'll co-brand the announcement if we fund the launch moment — my copy, our logo, their reach. Or we tell both of them windows are a scam and ship everywhere at once. The check is real. The reach is real. The principle is also, annoyingly, real.",
    "description": "Two platforms are bidding for an exclusive window on the planned release — the check, the reach, or no window at all.",
    "choices": [
      {
        "id": "take_the_check",
        "label": "Take the bigger check",
        "gist": "Guaranteed money now; the release launches behind a wall and the fans outside it notice.",
        "immediate": "money +20000, artist_mood −3",
        "delayed": "awareness_boost −2",
        "outcomeSummary": "Sam took the bigger check and windowed the release behind the platform's wall for launch month."
      },
      {
        "id": "take_the_reach",
        "label": "Take the reach, fund the moment",
        "gist": "No fee — but the label spends real money on a co-branded launch with Sam's fingerprints on every frame.",
        "immediate": "money −12000, artist_mood +2, executive_mood +4",
        "delayed": "awareness_boost +4, press_momentum +1",
        "outcomeSummary": "Sam took the reach deal and funded a co-branded launch — the announcement carried the label's name everywhere."
      },
      {
        "id": "refuse_windows",
        "label": "Refuse windows on principle",
        "gist": "Everywhere, day one, on the record about why.",
        "immediate": "reputation +2, artist_mood +1",
        "delayed": "press_momentum +1",
        "outcomeSummary": "Sam turned down both windows — the release ships everywhere at once, on principle, on record."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (math checked)",
      "lines": [
        "Loyal: check ≈ +5 (money cap) − 2 (awareness) − 3 (artist) = 0. Reach ≈ −5 + 4 + 2 = +1. Refuse ≈ +2 + 1 = +3 → loyal = refuse (no spend, no wall, artist content).",
        "Committed: check = 20 − 2 = +18. Reach = 4 + 1... = 4 − 3 = +1. Refuse = 2(+2) = +4 → committed = take the check (a competent pro banks $20k against a burn-rate; the awareness ding is a fair trade).",
        "Disloyal Sam: reach = 10·12 + 4 = 124; check = 0 (income) − 2 = −2; refuse = 0 → disloyal = the reach deal, numerically, no hint needed. Three distinct picks."
      ]
    },
    "designNotes": [],
    "notes": [
      "v1 flaw fixed by design: v1's choices were all windfalls, so Sam's overspend archetype had zero purchase — every band grabbed money and delegation was invisible. The co-branded announcement rider (per the bible's recommendation) puts a real spend on the reach deal, so her 10·spend scorer finally has something to land on, and the three bands split the meeting three ways.",
      "Artist reaction on all three (Nes rule): −3 walled off from fans / +2 maximum reach / +1 no games. The platforms are external — Sam's exec_mood +4 on the reach deal is the \"her byline energy\" beat.",
      "Mechanics cash the fiction cleanly: meeting requires release_planned, and awareness_boost banks hype exactly onto that planned release — including the honest NEGATIVE bank on the check (the wall suppresses launch hype)."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-sam-authored-major.md"
  },
  {
    "id": "the_documentary_ask",
    "title": "The Documentary Ask",
    "status": "DRAFT, awaiting Nes review",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires release_out + tour_active · role cmo · category marketing",
    "prompt": "A streamer wants a tour documentary. Warts and all — the fights, the flat nights, the 4 AM load-outs. They're paying real money for full access, less for a cut we control. Here's my bias, stated for the record: sanitized tour docs are furniture. The raw one is the only one anyone screenshots. But it's not my bus, and it's not my breakdown on camera in episode three. Full access, approved cut, or we keep the doors closed.",
    "description": "A streamer wants a warts-and-all documentary of the tour — full access money, a sanitized cut, or closed doors.",
    "choices": [
      {
        "id": "full_access",
        "label": "Sell full access",
        "gist": "The biggest check and the rawest story — cameras on everything, outcome uncontrollable.",
        "immediate": "money +15000, rep_swing 2, artist_mood −4, self_serving_hint: true",
        "delayed": "press_momentum +2",
        "outcomeSummary": "Sam sold the streamer full access — cameras on everything, the raw tour story with her framing on it."
      },
      {
        "id": "sanitized_cut",
        "label": "Negotiate the approved cut",
        "gist": "Smaller check, approvals on every frame. Furniture, but respectable furniture.",
        "immediate": "money +8000, artist_mood −1, executive_mood −2",
        "delayed": "awareness_boost +2",
        "outcomeSummary": "Sam negotiated a sanitized cut of the tour doc — decent money, approvals on every frame."
      },
      {
        "id": "decline_the_cameras",
        "label": "Keep the doors closed",
        "gist": "No cameras on the bus. The tour stays the band's own story, and the band exhales.",
        "immediate": "artist_mood +5, artist_energy +2, executive_mood −4",
        "delayed": "",
        "outcomeSummary": "Sam declined the documentary — no cameras on the bus, and the tour stayed the band's own story."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (math checked)",
      "lines": [
        "Loyal: full access = −100 (rep_swing). Sanitized ≈ +5 (money cap) + 2 (awareness) − 1 (artist) = +6. Decline ≈ +5 (artist cap) + 2 (energy) = +7 → loyal = decline. ⚑ 1-point margin — verify offline; if it flips, drop sanitized's awareness to +1 or raise decline's artist_mood copy-justified.",
        "Committed: full access = 15 − 6 (V2) = +9. Sanitized = 8 + 2 = +10. Decline = 0 → committed = sanitized cut. ⚑ 1-point margin vs full access — verify offline; committed being almost tempted by the raw doc is the intended flavor, but the pick must hold.",
        "Disloyal Sam: full access spends $0 (it's INCOME — her 10·spend scorer can't see it, exactly as the bible flagged ⚑) → raw scores: full = 0, sanitized = 2 (awareness), decline = 0 — the numeric argmax lands on the WRONG choice. self_serving_hint on full_access confirmed required. The vice is the biggest story with her name on it, not the biggest check. → disloyal = full access. Three distinct picks."
      ]
    },
    "designNotes": [],
    "notes": [
      "Artist reaction on all three (Nes rule): −4 breakdown-on-camera dread / −1 still wary even with approvals / +5 and energy +2 (no cameras = an actual private tour, rest included). The streamer is external — Sam's exec_mood carries the deal-side reaction (−2 bored by furniture, −4 furious at passing the story of the year).",
      "Honest-fiction note: awareness_boost on the sanitized cut banks toward the NEXT PLANNED release (~2-month expiry) — copy says \"the doc drops into whatever you set up next,\" not \"the doc boosts this tour.\""
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism spawns_release / chained_events): the real version makes the doc a tangible asset — a delayed windfall-over-weeks (or a real catalog item) landing when the streamer ships it, with the raw cut rolling quality/variance at delivery. Today's compression: rep_swing 2 at signing = the edit you don't control."
    ],
    "sourceFile": "v3-sam-authored-major.md"
  },
  {
    "id": "chart_debut_one_hour_window",
    "title": "Chart Debut, One Hour Window",
    "status": "AUTHORED, pending divergence verification + Nes review",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "reactive_trigger chart_debut · role cmo · v3 successor to v1 cmo_chart_debut_press (stakes raised: v1's ~$8k moves were treasury noise; this one asks a real question of the war chest)",
    "prompt": "The number is real — I had it triple-checked before I called you. Now understand what a debut actually is: it's not a result, it's a credential, and credentials expire. Every editor in my phone is deciding right now whether this was a moment or the start of one — and whatever we do with the next record launches off that answer. I can spend an hour writing the ending for them, or we can find out what the universe thinks. You have until I finish this coffee.",
    "description": "{songTitle} charted and Sam wants to convert the debut into the label's story before the cycle turns.",
    "choices": [
      {
        "id": "full_spectrum_blitz",
        "label": "Spend the moment — everywhere",
        "gist": "Trade press, paid placements, the works. The debut becomes the label's origin myth, and the next record launches from orbit.",
        "immediate": "money −45000, executive_mood +3, artist_mood −2",
        "delayed": "awareness_boost +7, press_momentum +2",
        "outcomeSummary": "Sam bought the debut wall-to-wall — outlets asking for exclusives were told to take the package."
      },
      {
        "id": "prestige_exclusive",
        "label": "One definitive story",
        "gist": "Give the debut to a single prestige outlet. One serious profile that treats it like a career, not a fluke.",
        "immediate": "money −18000, reputation +3, artist_mood +2",
        "delayed": "press_story_flag 1",
        "outcomeSummary": "Sam gave the debut to one prestige outlet and held the rest back for the next record's runway."
      },
      {
        "id": "ride_organic",
        "label": "Let the number talk",
        "gist": "Scarcity is a strategy. The chart did the announcing; anything Sam adds now reads as insecurity.",
        "immediate": "artist_mood +4, executive_mood −3",
        "delayed": "press_momentum +1",
        "outcomeSummary": "Sam let the chart speak for itself — no buys, no placements, and the phone kept ringing anyway."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (predicted, pending offline verification)",
      "lines": [
        "Loyal (post-fix safety scorer; money/rep/CC/award only, each capped ±5, no gamble keys present): blitz −5 (money cap) · exclusive −4.5 + 3 = −1.5 · organic 0 → organic. Margin 1.5 — adequate but not fat; ⚑ verify offline (and note it assumes artist_mood is NOT a safety-scorer input — if the post-fix scorer counts mood, organic's +4 only widens the win).",
        "Committed (2Q+2rep+A+award+gain/1000−3V−spend/4000): blitz 7 − 11.25 = −4.25 · exclusive 6 − 4.5 = +1.5 · organic 0 → exclusive. Margin over organic is 1.5 ⚑ thin-ish — if verification flips it, drop exclusive to −$15k (score +2.25).",
        "Disloyal Sam (10·spend$k + awareness): blitz 450 + 7 = 457 · exclusive 180 · organic 0 → blitz, no hint needed (margin ~2.5×).",
        "Perfect trilemma: three distinct picks, three distinct axes (banked hype vs. reputation-now vs. artist relationship + free)."
      ]
    },
    "designNotes": [],
    "notes": [
      "Fiction-cashes-mechanics note: the blitz does NOT claim to push {songTitle} up the chart — awareness_boost banks hype for the NEXT planned release, so all three choices are authored as what the debut sets up, not chart defense. Sam's \"credential\" framing makes that honest.",
      "Temptation check (P2): the blitz is EV-defensible — $45k (crisis band) buys the game's largest awareness bank (+7, crisis band) plus the biggest press_momentum grant in the pool; against a $500k treasury with a release coming it is a real offer, not authored poison. No variance keys — the risk is the spend itself.",
      "Artist reaction (per rule): all three choices touch artist_mood — steamrolled by the machine (−2), treated like an artist (+2), trusted to be the story (+4).",
      "Neglect timeline (P9): disloyal Sam self-resolves → blitz → digest line above (outlets told to take the package = beat one of the bridge-torching) → at loyalty < 40, escalation_cmo_narrative_lost continues it: the frozen-out outlets are the \"two outlets gone from neutral to hostile.\" The $45k also lands on the ledger with no loyalty credit — neglect priced in cash and press relationships."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism chart_position_support / current-release marketing key): the fantasy players will reach for — \"defend {songTitle}'s chart position THIS week\" — has no effect key; awareness only banks forward. A current-release promotion key would let a chart_debut reactive actually fight for the charting song. Log as mechanism C-item at session wrap."
    ],
    "sourceFile": "v3-sam-authored-reactive.md"
  },
  {
    "id": "old_tweets_surface",
    "title": "Old Tweets Surface",
    "status": "AUTHORED, pending divergence verification + Nes review",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "reactive_trigger release_out (mid-cycle resurfacing — chosen over mood_crater: the dig is timed to the release, which is the whole nastiness of it) · role cmo",
    "prompt": "Someone ran an archaeology dig on {artistName}'s old accounts and the screenshots are already moving — mid-cycle, of course; it's always mid-cycle, that's how you know it was commissioned. I know who paid for the shovel, and I keep a folder of my own for exactly this weather. So: do we bow, do we build, or do we burn? I'd like an answer before the quote-tweets hit five figures.",
    "description": "{artistName}'s past just resurfaced with a release in the field, and Sam is holding three very different responses.",
    "choices": [
      {
        "id": "measured_containment",
        "label": "Starve it of oxygen",
        "gist": "Short, sober statement, no follow-ups granted. Boring on purpose — outrage needs a sparring partner and Sam declines to provide one.",
        "immediate": "money −10000, reputation +1, artist_mood +2, executive_mood −2",
        "delayed": "",
        "outcomeSummary": "Sam issued one short statement and starved the story of oxygen — {artistName} kept their head down."
      },
      {
        "id": "redemption_arc",
        "label": "Build the growth story",
        "gist": "Full sit-down interview, receipts, who they were and who they've become — timed to land with the next record. Expensive, exposed, and the only response that ends the question forever.",
        "immediate": "money −30000, creative_capital −1, artist_mood +6, reputation +3",
        "delayed": "press_story_flag 1, awareness_boost +4",
        "outcomeSummary": "Sam turned the dig into a growth story — full interview, receipts, and a feature banked for the next record."
      },
      {
        "id": "scorched_earth",
        "label": "Open the folder",
        "gist": "Sam's counter-dossier on whoever commissioned the dig. The story dies tonight — along with the fiction that this label is safe to swing at. self_serving_hint: true",
        "immediate": "money −15000, executive_mood +4, artist_mood −4",
        "delayed": "rep_swing 2, press_momentum +2",
        "outcomeSummary": "Sam answered the dig with a counter-dossier — the story died, and two press friendships went with it."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (predicted, pending offline verification)",
      "lines": [
        "Loyal (safety scorer): scorched −100 (rep_swing) · redemption −5 (money cap) + 3 (rep) − 1 (CC) = −3 · containment −2.5 + 1 = −1.5 → containment. Margin 1.5 ⚑ thin — flag for offline verification; if it tightens, trim containment to −$8k (−1.0).",
        "Committed: containment 2 − 2.5 = −0.5 · redemption 6 + 4 − 7.5 = +2.5 · scorched −6 (3V, counting rep_swing as gamble) − 3.75 = −9.75 → redemption. Solid margin.",
        "Disloyal Sam (10·spend$k + awareness): redemption 300 + 4 = 304 · scorched 150 · containment 100 → the vice loses numerically (her scorer only smells spend, and the aggression is mid-spend) → self_serving_hint: true on scorched_earth is REQUIRED, exactly as the bible ⚑ predicted. The hint carries the character truth: the counter-dig is Sam's blogger-era instinct, not her biggest invoice.",
        "Perfect trilemma: three distinct picks, three distinct axes (quiet cash vs. artist relationship + banked story vs. rep gamble + press-pool power)."
      ]
    },
    "designNotes": [],
    "notes": [
      "Fiction-cashes-mechanics note: the redemption feature can't run against the CURRENT release (press_story_flag fires at the next release) — so the fiction is authored as Sam negotiating the piece to drop with the next record (\"the arc ends where the next one begins\"). See UPGRADE SPEC.",
      "Temptation check (P2): scorched earth is a rep_swing paired with real sweeteners (press_momentum +2, the story genuinely killed, Sam energized +4) — EV-neutral gamble plus guaranteed value, per the rule that rep_swing must be sweetened to tempt. Redemption is the EV-rich play and it costs crisis money — the player's actual dilemma is real.",
      "Artist reaction (per rule): {artistName} reacts on all three — sheltered (+2), heard and vindicated (+6), or conscripted into a war they never asked for (−4). External parties (the press pool, the rival who commissioned the dig) land on Sam's exec_mood, not fake rep keys.",
      "Neglect timeline (P9): disloyal Sam self-resolves → scorched earth → digest line above (\"two press friendships went with it\") IS beat one of escalation_cmo_narrative_lost: the escalation's \"two outlets gone from neutral to hostile\" names the same two burned relationships. Ignore-chain reads as one continuous story: dig → dossier → hostile press corps consuming a focus slot."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism: mid-cycle press effect on CURRENT release): press_story_flag and awareness_boost both bank to the NEXT release, so no choice can mechanically defend the release that is out right now — the one the dig was timed to hurt. A current_release_sentiment (or streams-decay modifier) key would let crisis PR act on the active cycle. Log as mechanism C-item at session wrap."
    ],
    "sourceFile": "v3-sam-authored-reactive.md"
  },
  {
    "id": "the_engagement_farm",
    "title": "The Engagement Farm",
    "status": "AUTHORED (awaiting Nes review)",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires release_planned · role cmo · regular pool",
    "prompt": "There's a collective — forty accounts, one invoice — promising they can make the single 'happen organically.' I've watched them fake three moments this year, and two of them stuck. I hate everything about it, which is why I did my job and priced it anyway: if we don't buy the swarm, somebody else's release will. Here's the quote. Tell me what we are.",
    "description": "An engagement farm has priced a manufactured \"organic\" moment for your upcoming release. Sam distrusts it — and brought the invoice anyway.",
    "choices": [
      {
        "id": "buy_the_swarm",
        "label": "Buy the swarm",
        "gist": "Forty accounts, one story, her name on the invoice.",
        "immediate": "money −18000",
        "delayed": "awareness_boost +4, artist_mood −2",
        "outcomeSummary": "Sam signed the engagement farm's invoice — the single started 'happening,' and {artistName} could tell it was bought."
      },
      {
        "id": "one_true_fan",
        "label": "Back one real creator",
        "gist": "Find the one creator who actually loves the record and fund the real thing.",
        "immediate": "money −6000, reputation +1",
        "delayed": "awareness_boost +2, artist_mood +2",
        "outcomeSummary": "Sam skipped the farm and funded one true fan instead — a smaller wave, but a real one, and {artistName} reposted it first."
      },
      {
        "id": "hold_the_line",
        "label": "Refuse to buy fake",
        "gist": "Sam writes the pass memo and keeps the powder dry for a story she can stand behind.",
        "immediate": "reputation +1, executive_mood +2",
        "delayed": "press_momentum +1",
        "outcomeSummary": "Sam passed on the engagement farm and put the refusal in writing — slower build, clean hands."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (target)",
      "lines": [
        "loyal = hold_the_line (spend-free, no gamble, guaranteed rep+momentum) ⚑ thin margin vs one_true_fan (artist_mood +2 / awareness +2 may outweigh the small spend under the capped safety scorer — verify offline, tune the spend if the loyal pick flips); committed = one_true_fan (2·rep + awareness clears the spend penalty: ≈2.5 vs 2.0 vs −0.5) ⚑ thin vs hold_the_line; disloyal Sam = buy_the_swarm (10·18 + 4 = 184, runaway — no hint needed). Aspirational 3-way trilemma."
      ]
    },
    "designNotes": [],
    "notes": [
      "Axes: paid reach (money→hype) vs. authentic partnership (relationship + modest reach) vs. principle (rep/momentum, free). Artist reacts on the two choices that touch their audience (bought swarm reads fake = mood −; real fan = mood +); the collective is an external party, so Sam's exec_mood carries the reaction on the refusal (her skepticism vindicated, she LIVES for the fight she can win in the open).",
      "Temptation check: the swarm is genuinely the biggest hype number in the meeting (+4 banked vs +2) and it sometimes WORKS in the fiction (\"two of them stuck\") — an EV-defensible blitz, not authored-as-idiot spend. No variance keys: variance_up banks into the next recording session and this fiction is all release-cycle, so the mechanics only promise what they can cash."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism viral_moment happening / direct-hype injection): the natural fiction is a trend hitting the release that is ALREADY planned this cycle — the engine can only bank awareness for the next planned release at plan time. Upgrade: allow awareness_boost to top up an existing planned release's hype directly, or add a viral_moment happening the swarm purchase can trigger (with a fizzle branch — that's where a release-side variance verb would belong). Log as mechanism C-item at session wrap."
    ],
    "sourceFile": "v3-sam-authored-new.md"
  },
  {
    "id": "the_hatchet_piece",
    "title": "The Hatchet Piece",
    "status": "AUTHORED (awaiting Nes review)",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires artist_signed · role cmo · regular pool",
    "prompt": "Twenty sixteen. I wrote four hundred words that ended somebody's career, and I was proud of the traffic. That somebody has a podcast now, my old byline printed on a mug, and next week's episode is about me. I've read the receipts. They're mine. Everything they're going to say is true — so we decide what I am before they decide it for us.",
    "description": "A decade-old hatchet piece from Sam's blogging days is resurfacing — the artist she buried is telling the story, and it's all true.",
    "choices": [
      {
        "id": "stage_the_spectacle",
        "label": "Make the reunion the story",
        "gist": "Book her old target, put them next to {artistName}, and own the narrative at full volume.",
        "immediate": "money −15000",
        "delayed": "awareness_boost +3, press_story_flag 1, artist_mood −1",
        "outcomeSummary": "Sam booked her old target for a headline reunion — the redemption arc ran everywhere, with {artistName} cast in Sam's story."
      },
      {
        "id": "own_the_byline",
        "label": "Publish the mea culpa",
        "gist": "No spin, no lawyers — Sam answers the receipts under her own byline.",
        "immediate": "reputation +2",
        "delayed": "press_momentum +1, executive_mood −2",
        "outcomeSummary": "Sam published the apology under her own byline before the episode dropped — no spin, and it cost her to write it."
      },
      {
        "id": "quiet_amends",
        "label": "Make it right off the record",
        "gist": "Fund the artist she buried — studio time, no press, no credit taken.",
        "immediate": "money −5000, executive_mood +1",
        "delayed": "artist_mood +3",
        "outcomeSummary": "Sam paid for her old target's studio time, quietly and uncredited — the roster heard about it anyway."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (target)",
      "lines": [
        "loyal = quiet_amends (artist_mood-led, gamble-free, small spend) ⚑ thin margin vs own_the_byline (rep +2 at zero spend — verify offline; artist_mood +3 is authored above rep +2 precisely to hold the loyal pick); committed = own_the_byline (2·rep = 4 vs ≈−0.75 spectacle vs ≈−1 amends); disloyal Sam = stage_the_spectacle (10·15 + 3 = 153, runaway — no hint needed). Aspirational 3-way trilemma."
      ]
    },
    "designNotes": [],
    "notes": [
      "Axes: narrative control at any price (money→hype+press flag) vs. reputation via honesty (rep/momentum, free but she bleeds for it) vs. private repair (artist relationship). The podcast host is the external party — exec_mood carries Sam's side of it (−2 on the mea culpa because swallowing pride is the one fight she can't enjoy; +1 on quiet amends, the rare peace she chose). {artistName} reacts where dragged in (cast in the spectacle = mood −) and where the roster learns who she is (amends leak internally = mood +).",
      "Temptation check: the spectacle is the biggest hype-and-press bundle in the meeting AND the only choice that banks a press_story_flag for the next release — the vice is genuinely the strongest marketing play, not poison. Distinct from catalog #7 (The Comeback Client): there an outsider asks the label to run THEIR redemption for a fee; here the reckoning is Sam's own, and the artist she torched never asked for anything.",
      "Neglect note: regular-pool, so no escalation linkage required — but the disloyal self-resolve digest line (\"booked her old target for a headline reunion…\") reads exactly as a Sam-made-it-about-Sam beat, which is the vice made legible."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (two mechanisms): (1) spawns_release / grant_song — stage_the_spectacle naturally produces a real collab track or live moment between the torched artist and {artistName} (same flagship mechanism as Wall of Misses choice 3). (2) Choice-set story flags — quiet_amends wants to set flags.story['sam_amends_made'] so a later Sam meeting (or the podcast resurfacing as a side event) can require/exclude it; today the episode simply never airs in fiction and the engine keeps no memory. Log both as mechanism C-items at session wrap."
    ],
    "sourceFile": "v3-sam-authored-new.md"
  }
];

export const V3_SAM_POOL_LEVEL_NOTES: string[] = [
  "[v3-sam-authored-routine.md] Divergence summary (verify offline before JSON commit)",
  "| meeting | loyal | committed | disloyal (Sam) | distinct | hint used |",
  "|---|---|---|---|---|---|",
  "| Slow News Week | hold_fire | seed_the_profile ⚑ | seed_the_profile | 2 | no |",
  "| Billboard Money | bank_the_budget | targeted_digital | full_takeover | 3 | no |",
  "| Journalist Favor Called In | burn_the_favor | grant_first_listen ⚑ | grant_first_listen (hint) | 2 | yes |",
  "| Crisis Retainer | she_is_the_retainer | fund_half ⚑ | fund_the_retainer | 3 | no |",
  "| Own the Correction | demand_the_correction | plant_the_counter ⚑ | plant_the_counter | 2 | no |",
  "All five: disloyal ≠ loyal ✓; every gamble is EV-attractive (P2); money within routine ±$2–8k with the weight on press_momentum / awareness / press_story_flag / rep / moods; CC untouched; hint budget 1-of-5 (P6, on the meeting whose vice can't spend). ⚑ = thin committed margins — run scoreCommitted offline; nudge the flagged choice's reputation/awareness_boost by 1 if a tie breaks the wrong way.",
  "[v3-sam-authored-major.md] Cross-pool notes (Sam major set)",
  "- Hint budget: 2 of 5 hinted (The Dossier, The Documentary Ask) — both are the cases the bible predicted (vice with no spend / vice paid in income), both confirmed by the math above. The other three vices win her scorer numerically. Within the ~1-in-3 P6 budget.",
  "- Divergence: all five meetings produce 3 distinct band picks (aspire-level), pending offline scorer verification of the ⚑ thin margins (Awards committed-vs-refuse; Documentary both margins).",
  "- Spend spread: vice spends $0 / $25k / $20k / $12k / $0-income — Sam's overspend archetype has real purchase in three meetings and her nerve/story vice carries the two hinted ones, so disloyal-Sam digests won't read as a one-note money hose."
];
