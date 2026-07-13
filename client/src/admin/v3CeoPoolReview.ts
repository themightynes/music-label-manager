/**
 * v3 CEO pool — content-review form definition (2026-07-12 working session).
 *
 * On-screen mirror of the authoring scratchpad hand-off files:
 *   v3-ceo-authored-1.md
 *   v3-ceo-authored-2.md
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

export const V3_CEO_POOL_MEETINGS: PoolReviewEntry[] = [
  {
    "id": "the_investor_term_sheet",
    "title": "The Investor Term Sheet",
    "status": "AUTHORED",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "requires release_out · role ceo",
    "prompt": "The term sheet arrived by courier — actual paper, which is how they tell you they're serious. Growth capital, a board observer seat, and a preference stack that reads friendlier than it is. Your release is out and moving, which is exactly why they're here now and not last quarter. The offer letter has an expiry date in bold. If this sits on the desk, the round closes around someone else's label.",
    "description": "An institutional investor wants in while your numbers are hot. Take the money and the strings, negotiate down, or stay wholly yours.",
    "choices": [
      {
        "id": "sign_the_full_round",
        "label": "Sign the full round",
        "gist": "The war chest gets deep. So does the cap table.",
        "immediate": "money +75000, reputation −3, creative_capital −2",
        "delayed": "artist_mood −2 (global — the roster hears suits in the hallway)",
        "outcomeSummary": "The label signed the full term sheet — a deep war chest, and investors who now read our quarterlies."
      },
      {
        "id": "counter_for_half",
        "label": "Counter for half on cleaner terms",
        "gist": "Enough runway to matter, few enough strings to forget.",
        "immediate": "money +30000, reputation −1",
        "delayed": "",
        "outcomeSummary": "We countered for half the round on cleaner paper — real runway, and the cap table still looks like us."
      },
      {
        "id": "bootstrap_on",
        "label": "Send it back unsigned",
        "gist": "Independence is the brand. Say it with a courier.",
        "immediate": "creative_capital +2, award_chances +1",
        "delayed": "artist_mood +2 (global — the roster wears the indie badge)",
        "outcomeSummary": "We returned the term sheet unsigned — no new money, and the label still answers only to itself."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "LAPSE COST: the round closes — the capital, the counter, and the public independence statement all evaporate; the label just gets quietly older.",
      "WHY GATED: release_out — investors circle traction, not intentions; this can only fire once the label has product in market performing."
    ],
    "notes": [
      "Authoring notes: the trilemma axes are cash-with-strings vs. cash-lite vs. identity; every option costs something (control / half the money / all the money). Roster reacts on the two identity-loud choices only — the quiet counter is deliberately reaction-free (nobody hears about a clean deal). Rep costs on the money picks lean on the \"sold a piece\" optics; the 0.7 damper doesn't throttle losses, so they land full-weight."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (gating): ideal trigger is a squeeze — week >= 26 AND cash < $150k (capital arrives when it's tempting, not when it's trivial) — needs week-number and cash-threshold gates that don't exist in the 6-tag vocabulary."
    ],
    "sourceFile": "v3-ceo-authored-1.md"
  },
  {
    "id": "buy_the_failing_rival",
    "title": "Buy the Failing Rival",
    "status": "AUTHORED",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "requires release_out · role ceo",
    "prompt": "Meridian Row is going under — the label that beat you to two signings and one festival slot is sixty days from receivership. Their catalog is for sale, their roster's contracts are voidable, and their founder isn't returning anyone's calls. The majors' lawyers land Thursday. Whatever you don't take this week, they take next week, and the trades will write it either way.",
    "description": "A rival label is collapsing. Buy the catalog, raid the roster, or let it die with dignity — the majors inherit whatever you leave.",
    "choices": [
      {
        "id": "buy_the_catalog",
        "label": "Buy the catalog outright",
        "gist": "Their masters under your roof — the acquisition IS the story of the quarter.",
        "immediate": "money −60000, award_chances +2",
        "delayed": "awareness_boost +4, press_story_flag 1",
        "outcomeSummary": "The label bought Meridian Row's catalog outright — a serious check, and the acquisition is the story of the quarter."
      },
      {
        "id": "poach_the_roster",
        "label": "Raid the roster instead",
        "gist": "Cheaper than the catalog, uglier in the trades.",
        "immediate": "money −20000, rep_swing 2",
        "delayed": "artist_mood −2 (global — your own roster eyes the newcomers' deals)",
        "outcomeSummary": "We raided Meridian Row's roster with signing offers — a fraction of the catalog price, and the trades can call it what they like."
      },
      {
        "id": "let_it_die",
        "label": "Stand back and let it fall",
        "gist": "Not every funeral needs a bid from us.",
        "immediate": "reputation +2, executive_mood −2 (Mac — he wanted at least two of those acts)",
        "delayed": "",
        "outcomeSummary": "We let Meridian Row collapse without bidding — clean hands, and the majors carried away everything Mac wanted."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "LAPSE COST: the majors take catalog AND roster on Thursday; the label reads about it in the trades with everyone else.",
      "WHY GATED: release_out — you need standing in the market (a release out and working) to be the acquirer in this story rather than the next Meridian Row."
    ],
    "notes": [
      "Authoring notes: axes are legacy-asset vs. people vs. dignity. The raid is deliberately the gamble (rep_swing — poaching optics break either way) AND the cheap option, so it tempts; the catalog is the heavy check that banks heat for the next planned release (fiction cashes: \"story of the quarter\" = hype at plan time); standing back is the only free option and it costs you Mac's respect and everything in the building."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (gating): ideal trigger is competitive-state — a rival-label health stat or week >= 20 AND cash > $100k (you can only be the buyer with a real treasury); neither cash floors nor rival state exist today.",
      "UPGRADE SPEC (mechanism grant_artist / grant_catalog): the raid choice wants to actually ADD an artist (or the catalog buy to add revenue-bearing masters). Today the fiction cashes as money/awareness/rep only; a roster-addition mechanism would make this the CEO lane's flagship tangible outcome — log as a C-item alongside Mac's spawns_release wish.",
      "UPGRADE SPEC (targeting): executive_mood on let_it_die targets Mac (head_ar) from a CEO meeting — needs a target-by-role field."
    ],
    "sourceFile": "v3-ceo-authored-1.md"
  },
  {
    "id": "the_genre_pivot",
    "title": "The Genre Pivot",
    "status": "AUTHORED",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires music_exists · role ceo",
    "prompt": "Three data points make a trend, and you have five: the scene your label was built on is cooling. Playlists are rotating out, the tastemakers have moved one neighborhood over, and your catalog is starting to sound like a year, not a sound. There's a window where a pivot reads as vision instead of panic — and it's measured in weeks. Wait, and the label doesn't get to choose what it becomes; the market chooses for it.",
    "description": "Your niche is cooling. Evolve the label's sound, double down on identity, or hedge with a side imprint — waiting means the market decides.",
    "choices": [
      {
        "id": "evolve_the_sound",
        "label": "Steer the whole label into the turn",
        "gist": "New references, new producers, new rooms — everyone bends.",
        "immediate": "artist_mood −3 (global — nobody loves being told their sound is over)",
        "delayed": "variance_up 2, awareness_boost +3",
        "outcomeSummary": "The label steered its whole sound into the new wave — the roster is bending, and nobody knows yet if it's vision or vertigo."
      },
      {
        "id": "double_down",
        "label": "Double down on the house sound",
        "gist": "Scenes rotate back. Identity compounds. Be the label that stayed.",
        "immediate": "creative_capital +2, reputation +2",
        "delayed": "awareness_boost −2 (the next release reads out-of-step with the moment)",
        "outcomeSummary": "We doubled down on the house sound — identity over trend, and the next release will swim against the current."
      },
      {
        "id": "side_imprint",
        "label": "Hedge with a side imprint",
        "gist": "The flagship stays pure; the imprint chases the wave with its own name on the door.",
        "immediate": "money −25000, executive_mood −2 (Sam — two brands, one marketing budget)",
        "delayed": "quality_bonus +3 (new rooms, new collaborators feed the next session)",
        "outcomeSummary": "We launched a side imprint to chase the new sound — the flagship stays pure, and the marketing budget now feeds two brands."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "LAPSE COST: the pivot window closes — evolving later reads as panic, not vision, and the label's positioning gets written by a cooling market instead of by you.",
      "WHY GATED: music_exists — a label with no catalog has no sound to pivot FROM; the dilemma only exists once there's an identity on record."
    ],
    "notes": [
      "Authoring notes: axes are risk (variance-loaded transformation) vs. identity (CC + rep, paid for with a genuinely negative awareness bank — the engine's negative-banked-hype affordance finally earns its keep) vs. cash (the hedge, priced at an EP's whole budget). The evolve gamble is EV-attractive per P2: variance 2 rides with a bigger banked bundle than the hedge's, so taking the risk is a real offer, not poison."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (gating): ideal trigger is trend-state — a genre-heat signal or week >= 15 maturity gate so the pivot lands mid-campaign when identity is established but not fossilized; no trend system or week gate exists today.",
      "UPGRADE SPEC (targeting): executive_mood on side_imprint targets Sam (cmo) from a CEO meeting — needs a target-by-role field."
    ],
    "sourceFile": "v3-ceo-authored-1.md"
  },
  {
    "id": "anchor_artist_renegotiation",
    "title": "Anchor Artist Renegotiation",
    "status": "AUTHORED",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "requires release_out · role ceo",
    "prompt": "Your biggest artist's manager requested a meeting, and brought a lawyer to it. The release is working, the numbers are public enough, and they want the contract reopened two years early — richer points, or they start counting the days until the option lapses. There's a version of this where everyone stays family and a version where the standoff leaks. What there isn't, is a version where you stall: silence gets read as a no, and their team starts returning the majors' calls.",
    "description": "Your anchor artist's team wants to reopen the deal early, off the back of a working release. Re-sign rich, hold the paper, or trade a piece of the label for loyalty.",
    "choices": [
      {
        "id": "resign_rich",
        "label": "Re-sign them rich",
        "gist": "Pay what the leverage says, keep the family photo real.",
        "immediate": "money −40000, artist_mood +10 (targeted)",
        "delayed": "",
        "outcomeSummary": "The label reopened the deal and re-signed our anchor artist rich — an expensive kind of peace, and they know they're home."
      },
      {
        "id": "hold_the_paper",
        "label": "Hold the paper",
        "gist": "A contract is a contract. Let the lawyers earn their retainers.",
        "immediate": "artist_mood −8 (targeted), rep_swing 2",
        "delayed": "",
        "outcomeSummary": "We held the existing paper and declined to reopen — the contract stands, and the standoff is now a matter of time and lawyers."
      },
      {
        "id": "equity_for_loyalty",
        "label": "Offer a piece of the label",
        "gist": "Not richer points — partnership. It costs something money can't buy back.",
        "immediate": "creative_capital −1, artist_mood +6 (targeted), award_chances +1",
        "delayed": "",
        "outcomeSummary": "We offered our anchor artist a stake in the label instead of richer points — partners now, and a piece of the house is theirs."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "LAPSE COST: their team reads silence as a refusal and takes the standoff public on THEIR terms — you get hold_the_paper's downside with none of its resolve.",
      "WHY GATED: release_out — the artist's leverage IS the release in market; no working release, no renegotiation letter."
    ],
    "notes": [
      "Authoring notes: axes are cash vs. relationship-gamble vs. structural-concession. The rep_swing on hold_the_paper is the honest shape of a public standoff (you look strong or petty, coin flip); pairing it with the mood hit makes it the option only a player who really needs the $40k picks — which is exactly when this meeting should hurt. equity_for_loyalty spends CC because a piece of the house is creative control by another name, and it's the one concession no future windfall buys back (P4 irreversibility)."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (gating): ideal trigger is artist-state — anchor-artist popularity above a threshold, or a chart_debut-adjacent success stamp on a specific artist; per-artist stat gates don't exist in the 6-tag vocabulary."
    ],
    "sourceFile": "v3-ceo-authored-1.md"
  },
  {
    "id": "the_buyout_letter",
    "title": "The Buyout Letter",
    "status": "AUTHORED",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "requires release_out + tour_active · role ceo",
    "prompt": "The letter is four paragraphs long and the number in the second one is life-changing. An acquirer wants the label — catalog, roster, name — and they've attached earnest money just for opening the books. Diligence means strangers in the masters vault and the roster finding out from a spreadsheet. The letter expires at the end of the month; offers like this don't get re-sent, they get made to someone else.",
    "description": "An acquirer offers life-changing money for the whole label. Open the books, leak the letter for leverage, or shred it — and the letter expires either way.",
    "choices": [
      {
        "id": "open_the_books",
        "label": "Take the earnest money, open the books",
        "gist": "Diligence pays up front. It also lets strangers into the vault.",
        "immediate": "money +50000, creative_capital −2, artist_mood −5 (global — the roster found out from a spreadsheet)",
        "delayed": "",
        "outcomeSummary": "The label took the earnest money and opened its books to the acquirer — the roster found out from a spreadsheet."
      },
      {
        "id": "leak_for_leverage",
        "label": "Leak the letter",
        "gist": "Nothing raises a label's price like everyone knowing someone wants it.",
        "immediate": "rep_swing 3",
        "delayed": "awareness_boost +3, press_story_flag 1",
        "outcomeSummary": "We leaked the buyout letter to the trades — the label is now publicly worth wanting, whatever that turns out to cost."
      },
      {
        "id": "shred_it",
        "label": "Shred it",
        "gist": "Some numbers are only life-changing if this was ever for sale.",
        "immediate": "creative_capital +2, reputation +2, artist_mood +3 (global — the roster hears the label isn't for sale)",
        "delayed": "",
        "outcomeSummary": "We shredded the buyout letter unanswered — the label is not for sale, and now everyone who works here knows it."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "LAPSE COST: the letter expires on its own terms — no earnest money, no leverage story, and not even the identity statement of refusing it; the offer gets made to a rival instead.",
      "WHY GATED: release_out + tour_active — the closest real proxy for a mature, acquirable label: product in market AND a live operation on the road. Early labels never see this letter."
    ],
    "notes": [
      "Authoring notes: axes are cash-with-exposure vs. narrative-gamble vs. identity. leak_for_leverage carries the game's largest authored rep_swing (3) — a crisis-tier coin flip — sweetened per P2 with banked hype and a press flag so it's a real offer, not poison. open_the_books is deliberately the only choice where the roster is hurt AND you keep nothing structural: the earnest money is real, but CC and five points of global mood are the tuition. shred_it mirrors the Investor Term Sheet's bootstrap pick on purpose — the two meetings rhyme, and a player who refuses both is playing an identity run the award/CC economy quietly rewards."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (gating): ideal trigger is a true late-game gate — week >= 40, or a valuation composite (reputation + cumulative revenue thresholds); week-number and valuation gates don't exist in the 6-tag vocabulary. The tag pair chosen makes this rare-but-possible mid-campaign, which is acceptable until real gates land."
    ],
    "sourceFile": "v3-ceo-authored-1.md"
  },
  {
    "id": "chart_week_war_room",
    "title": "Chart Week War Room",
    "status": "reactive chart_debut (crisis)",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "reactive trigger chart_debut · requires release_out · role ceo",
    "prompt": "{songTitle} charted this week. Not a projection, not a playlist add — a number with your label's name next to it. Every phone in the building is ringing, and every call is really the same question: what does this label do with leverage? You have until the next chart prints to answer. After that, the moment belongs to whoever moved.",
    "description": "Your first real chart leverage. Spend into it, bank it, or share it with the people who made it.",
    "choices": [
      {
        "id": "press_the_advantage",
        "label": "Spend into the moment",
        "gist": "Empty the war chest while the number is hot — buy every surface that will carry it.",
        "immediate": "money −35000",
        "delayed": "awareness_boost +5, press_momentum +2",
        "outcomeSummary": "The label spent hard into the chart week — every screen and column that would take our money got it."
      },
      {
        "id": "bank_the_moment",
        "label": "Bank it",
        "gist": "Say nothing, buy nothing. Let the debut compound into credibility you spend later, on your terms.",
        "immediate": "creative_capital +2",
        "delayed": "award_chances +1",
        "outcomeSummary": "We let the debut speak for itself and banked the credibility for a bigger swing later."
      },
      {
        "id": "throw_the_party",
        "label": "Give it to the roster",
        "gist": "Shut down a floor. The people who made this should feel it before the industry does.",
        "immediate": "money −10000, artist_mood +6",
        "delayed": "artist_energy +2",
        "outcomeSummary": "The label shut down a floor and threw the party — the whole roster felt the win before the industry did."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "LAPSE COST: the chart window closes and momentum spends itself unclaimed — no blitz, no banked credibility, no party. The debut becomes a line in a spreadsheet, and the roster notices that charting changed nothing.",
      "WHY GATED: reactive chart_debut only — it can never enter the regular rotation. Fires at most a handful of times per campaign, exactly when the label has leverage it has never had before."
    ],
    "notes": [
      "Distinct axes: market blitz (cash → banked awareness) vs. strategic patience (CC/award, forfeits the window's market upside) vs. roster investment (cash → morale/energy). Every option forfeits the other two — the blitz buys no goodwill, the bank buys no reach, the party buys no chart position.",
      "Neglect-linkage note (P9 analogue for the CEO lane): the CEO lane has no escalation pipeline — the lapse IS the consequence. The digest/lapse copy should read as the market moving on: \"the moment passed; someone else's debut owns the cycle now.\""
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-ceo-authored-2.md"
  },
  {
    "id": "the_second_signing_doctrine",
    "title": "The Second Signing Doctrine",
    "status": "reactive recent_signing (major)",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "reactive trigger recent_signing · requires artist_signed · role ceo",
    "prompt": "The ink on {artistName}'s deal is a week old. The first signing was survival — this one is doctrine. Whatever you do with {artistName} in the next month becomes what this label does with new artists, because everyone inside and outside the building is watching to find out. Develop them in the dark, ship them while they're wet, or spend real money strapping them to the roster's heat. Pick the sentence the industry will finish for you.",
    "description": "A fresh signee in the building forces the question: what is this label's development doctrine?",
    "choices": [
      {
        "id": "develop_in_the_dark",
        "label": "Develop slow",
        "gist": "No singles until the work is undeniable. Patience as a public statement.",
        "immediate": "artist_mood +3",
        "delayed": "quality_bonus +4, awareness_boost −1",
        "outcomeSummary": "We set the doctrine: {artistName} develops in the dark until the work is undeniable."
      },
      {
        "id": "ship_while_wet",
        "label": "Ship fast",
        "gist": "Straight into the market. Learn in public, iterate in public, let the audience finish the A&R.",
        "immediate": "",
        "delayed": "awareness_boost +3, variance_up +1",
        "outcomeSummary": "We sent {artistName} straight into the market — learn in public, ship while the ink is wet."
      },
      {
        "id": "platform_off_the_heat",
        "label": "Platform them",
        "gist": "Spend real money strapping {artistName} to everything the roster has already built.",
        "immediate": "money −30000, artist_popularity +2",
        "delayed": "awareness_boost +1",
        "outcomeSummary": "The label spent real money platforming {artistName} off the roster's heat — an audience purchased, then inherited."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "LAPSE COST: the signing settles into no doctrine at all — {artistName}'s first months default to drift, and first months don't come back. The industry finishes the sentence for you, and the word it picks is \"unfocused.\"",
      "WHY GATED: reactive recent_signing only — fires once per signing, and the second-signing framing means it lands exactly when the answer stops being improvisation and starts being policy."
    ],
    "notes": [
      "Distinct axes: banked craft (quality, forfeits early visibility) vs. banked exposure with real swing (awareness + variance, forfeits polish) vs. cash-bought popularity (money → durable stat, forfeits the treasury). The variance option is EV-attractive per P2 — shipping fast is a genuine offer, not poison."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-ceo-authored-2.md"
  },
  {
    "id": "layoff_or_lean",
    "title": "Layoff or Lean",
    "status": "crisis",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "requires artist_signed + recording_project_active · role ceo",
    "prompt": "The spreadsheet doesn't editorialize: burn is outpacing revenue, and the runway has a date on it. There are three ways to buy the label time, and each one takes the knife to a different limb — the building, the megaphone, or the catalog. The one thing the numbers won't let you do is nothing.",
    "description": "Burn is outpacing revenue. Cut the overhead, go dark on marketing, or borrow against the catalog.",
    "choices": [
      {
        "id": "cut_the_floor",
        "label": "Cut overhead",
        "gist": "Leaner building, colder hallways. The people who stay will remember how it felt.",
        "immediate": "money +25000, executive_mood −4",
        "delayed": "",
        "outcomeSummary": "The label cut the floor out from under its own overhead — leaner, quieter, and colder in the hallways."
      },
      {
        "id": "go_dark",
        "label": "Cut marketing",
        "gist": "Protect the music budget by silencing the megaphone. The next release walks out unannounced.",
        "immediate": "money +15000, press_momentum −2",
        "delayed": "awareness_boost −2",
        "outcomeSummary": "We went dark on marketing to protect the music — the next release walks out the door unannounced."
      },
      {
        "id": "leverage_the_catalog",
        "label": "Borrow against the catalog",
        "gist": "The masters are worth something today. The industry will read the collateral notice.",
        "immediate": "money +40000, reputation −3",
        "delayed": "",
        "outcomeSummary": "The label borrowed against its own catalog — cash in hand, and the industry noticed the collateral."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "LAPSE COST: the burn continues unchecked. Deciding nothing is the most expensive option on the table, and the prompt says so out loud.",
      "WHY GATED: only meaningful once real spend is committed — an active recording project with a signed roster is the closest real-tag proxy for \"the money is going out the door.\""
    ],
    "notes": [
      "Distinct axes: cash from people (exec morale), cash from voice (press/awareness banks), cash from legacy (reputation). All three PAY — the fork is which wound the label chooses, at three different prices for three different amounts."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (gating): ideal trigger is treasury pressure — fire when cash falls below N× weekly burn (a cash-threshold gate does not exist in the 6-tag vocabulary). Until then the requires-pair keeps it out of the opening weeks, where it would read as nonsense against a full $500k treasury.",
      "UPGRADE SPEC (exec targeting): cut_the_floor's morale hit is designed as label-wide (all four execs −4); the engine can only target the meeting's exec. Needs a broadcast/target parameter before JSON commit."
    ],
    "sourceFile": "v3-ceo-authored-2.md"
  },
  {
    "id": "the_mentorship_hour",
    "title": "The Mentorship Hour",
    "status": "routine-for-CEO — the deliberate small exception",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "requires artist_signed · role ceo",
    "prompt": "There's an hour on your calendar every week that makes no money and moves no chart: the roster's youngest act, a conference room, and whatever they want to ask the person whose name is on the label. It keeps getting rescheduled by things that matter more and somehow matter less. This week, decide what the hour actually is.",
    "description": "A standing hour with the roster's youngest act — keep it, hand it to Mac, or give the time back to the work.",
    "choices": [
      {
        "id": "hold_the_hour",
        "label": "Keep the hour yourself",
        "gist": "No phones on the table. The label head, a young act, and questions nobody else gets asked.",
        "immediate": "creative_capital +1, artist_mood +4",
        "delayed": "",
        "outcomeSummary": "We kept the hour — the label head, a young act, and no phones on the table."
      },
      {
        "id": "hand_it_to_mac",
        "label": "Hand it to Mac",
        "gist": "His ear, his war stories, his protégé now. A different gift than yours, but a real one.",
        "immediate": "executive_mood +3, artist_mood +1",
        "delayed": "",
        "outcomeSummary": "The label handed the mentorship hour to Mac — his ear, his war stories, his protégé now."
      },
      {
        "id": "give_it_to_the_work",
        "label": "Cancel it",
        "gist": "The kindest thing might be a better record. The kids will notice the empty chair anyway.",
        "immediate": "artist_mood −2",
        "delayed": "quality_bonus +1",
        "outcomeSummary": "We cancelled the hour and gave the time to the work — the kids noticed the empty chair."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "LAPSE COST: small by design — the hour just doesn't happen this week. The real cost is the pattern: a lane where even the human-sized moment kept lapsing tells the player something true about the label they're running.",
      "WHY GATED: needs a roster to mentor (artist_signed). Kept lightly gated on purpose — the CEO pool needs exactly one meeting that is allowed to be ordinary, so the heavy ones read as heavy by contrast."
    ],
    "notes": [
      "Distinct axes: personal investment (CC + big mood) vs. delegated relationship (exec bond + small mood) vs. reallocation (mood cost for banked craft). Deliberately routine-sized per the tier table's small exception — this is the lane's one humane, low-stakes beat, and it must NOT be inflated to crisis magnitudes."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (exec targeting): hand_it_to_mac intends Mac (head_ar) specifically; needs the exec-target parameter. Also flagged: ideal artist-targeting is \"youngest/newest signee,\" which the engine cannot express — currently lands per standard artist-targeting rules."
    ],
    "sourceFile": "v3-ceo-authored-2.md"
  },
  {
    "id": "define_the_legacy",
    "title": "Define the Legacy",
    "status": "crisis",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "requires release_out + tour_active · role ceo",
    "prompt": "A career-retrospective press cycle wants the definitive statement — not a quote, a thesis. The writer has done the homework; the piece runs either way. What they're offering is the frame: was this label the business, the music, or the house? You get one sentence at the top of the story everyone will cite from now on. Choose the sentence.",
    "description": "The definitive retrospective is being written. Claim the frame: the business, the music, or the house.",
    "choices": [
      {
        "id": "it_was_the_business",
        "label": "\"We were built to win\"",
        "gist": "The ledger as the legacy. Honest, cold, and impossible to argue with.",
        "immediate": "reputation +3, artist_mood −2",
        "delayed": "",
        "outcomeSummary": "We told them the truth as we saw it: the label was built to win, and it won."
      },
      {
        "id": "it_was_the_music",
        "label": "\"It was always the songs\"",
        "gist": "Put the catalog at the center and let the numbers sit in the back row.",
        "immediate": "creative_capital +2",
        "delayed": "quality_bonus +2, awareness_boost −1",
        "outcomeSummary": "We put the music at the center of the story and let the numbers take the back row."
      },
      {
        "id": "it_was_the_house",
        "label": "\"We built a house\"",
        "gist": "The institution over any single record or ego — a label built to outlast everyone in it.",
        "immediate": "award_chances +3, creative_capital −1",
        "delayed": "press_momentum +1",
        "outcomeSummary": "We claimed the empire outright — a house built to outlast every artist who ever walked through it."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "LAPSE COST: the retrospective runs anyway — written by someone else, with no statement from the label. The thesis question gets answered without us, and the answer on record is \"they never said.\"",
      "WHY GATED: release_out + tour_active is the heaviest honest proxy for label maturity in the 6-tag vocabulary — a label with product in market and a tour on the road has a career worth retrospecting."
    ],
    "notes": [
      "Distinct axes: industry standing at the roster's expense vs. creative identity at commercial expense vs. institutional/awards legacy at the cost of creative capital (the institution over the impulse). Pure identity pick per the bible — the campaign's thesis question, asked once."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (gating): ideal is a late-game week gate (week ≥ 40, once per campaign) so this lands as the endgame thesis rather than a mid-game curiosity. The current tag-pair can technically fire earlier; accept for v3.0, log the week-gate as the mechanism ask."
    ],
    "sourceFile": "v3-ceo-authored-2.md"
  },
  {
    "id": "the_counter_offer",
    "title": "The Counter-Offer",
    "status": "NEW (crisis) — the board-lane poach",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "requires release_out · role ceo",
    "prompt": "The call came to you, which is the courtesy and the threat: a major is making a run at one of your executives — real title, real budget, a number you'd have to think about. They built part of this label with their hands, and now the market has priced that. You can match the money, rewrite the job into something a check can't buy, or hold the line and let them look. Whatever you choose, the whole floor will know by Friday what loyalty is worth here.",
    "description": "A major is poaching one of your own execs. Match the money, counter with meaning, or let them test the market.",
    "choices": [
      {
        "id": "match_the_money",
        "label": "Match the offer",
        "gist": "Beat the number to the dollar. Expensive — and now everyone knows the price of staying.",
        "immediate": "money −40000, executive_mood +6",
        "delayed": "",
        "outcomeSummary": "The label matched the rival's number to the dollar — expensive, and now the whole building knows what loyalty costs."
      },
      {
        "id": "counter_with_meaning",
        "label": "Rewrite the job",
        "gist": "Don't chase the check — expand the mandate. Make the label theirs to build, publicly.",
        "immediate": "creative_capital −1, executive_mood +4",
        "delayed": "award_chances +1",
        "outcomeSummary": "We didn't match the check — we rewrote the job around them and made the label theirs to build."
      },
      {
        "id": "let_them_look",
        "label": "Hold the line",
        "gist": "This label doesn't bid against ghosts. Respect kept; a chill left in the room.",
        "immediate": "executive_mood −5, reputation +1",
        "delayed": "",
        "outcomeSummary": "We held the line and let the market make its offer — respect kept, and a chill left in the room."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "LAPSE COST: silence answers the offer for you. The exec draws the only conclusion silence permits — the relationship takes the hold-the-line hit with none of its dignity, and the industry reads the label as a place people get poached FROM.",
      "WHY GATED: poachers hunt success — release_out is the closest real-tag proxy for \"this label has produced something worth raiding.\""
    ],
    "notes": [
      "Distinct axes: treasury (cash for the bond) vs. political capital (CC + public mandate — the check-proof retention) vs. posture (industry respect at real relationship cost). The hold-the-line option is a genuine temptation — free, rep-positive, and quietly corrosive; the counter-with-meaning option is the EV-thoughtful middle that costs the scarcest currency instead of the deepest one."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (gating): ideal trigger is exec-state-driven — fire against a specific high-loyalty/high-mood exec (poachers target performers), or off a chart_debut/award_won happening. Neither exec-state gates nor those happenings exist in requires today.",
      "UPGRADE SPEC (exec targeting): all three choices intend a specific named exec (Mac/Sam/Dante/Pat — ideally chosen by the selection layer, with the prompt templated on the exec's name); the engine's executive_mood only targets the meeting's own exec, which the CEO lane lacks. This meeting should not ship to JSON until the target parameter exists — it is the strongest single argument FOR that mechanism."
    ],
    "sourceFile": "v3-ceo-authored-2.md"
  },
  {
    "id": "the_open_letter",
    "title": "The Open Letter",
    "status": "NEW (crisis) — the label-values public stance",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "requires artist_signed + release_out · role ceo",
    "prompt": "An open letter is circulating — half the independent side of the industry has signed it, demanding labels cut ties with a partner the trades have spent two weeks burying. Your name is being asked for specifically, because your label is big enough now that the absence would be read as an answer. The partner, meanwhile, has quietly improved terms for everyone who stays put. Three doors: sign it loud, leave quiet, or take the better terms. Every one of them is a public position — including the quiet one.",
    "description": "An industry values crisis demands a public stance: sign the letter, exit quietly, or take the loyalty terms and hold.",
    "choices": [
      {
        "id": "sign_it_loud",
        "label": "Sign the letter",
        "gist": "Put the label's name at the top and eat the cost of walking mid-cycle. The roster stands taller either way the press breaks.",
        "immediate": "money −25000, artist_mood +5",
        "delayed": "rep_swing 2",
        "outcomeSummary": "The label put its name on the letter and ate the cost of walking — the roster stood taller for it, whichever way the coverage breaks."
      },
      {
        "id": "leave_quiet",
        "label": "Exit without a press release",
        "gist": "End the relationship, decline the spotlight. Clean hands, no headlines, no credit.",
        "immediate": "artist_mood +1, reputation +1",
        "delayed": "awareness_boost −1",
        "outcomeSummary": "We ended the relationship without a press release — clean hands, no headlines, and no credit."
      },
      {
        "id": "take_the_terms",
        "label": "Hold and take the terms",
        "gist": "The improved terms are real money. So is the silence in the studio when the roster finds out.",
        "immediate": "money +30000, artist_mood −6, reputation −2",
        "delayed": "",
        "outcomeSummary": "The label held its position and took the improved terms — the money cleared; the studio went quiet."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "LAPSE COST: silence becomes the stance. The letter runs without your name, everyone reads the absence, and you get the reputational exposure of a position with none of the agency of choosing it.",
      "WHY GATED: artist_signed + release_out — the label needs a roster whose morale is at stake and a public footprint big enough that its absence from the letter is legible. A week-one label has no name worth asking for."
    ],
    "notes": [
      "Distinct axes: identity gamble (cash + rep_swing + roster pride — the stance could rally the industry or paint a target) vs. clean low-yield exit (small guaranteed virtue, forfeits the moment's visibility) vs. cash against conscience (the game's clearest money-for-mood trade at crisis scale). The rep_swing on sign_it_loud is deliberate per P2 — taking a public stand is a genuine gamble, sweetened with roster mood so it's a real offer, not a piety tax."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (gating): ideal trigger is an industry_drama happening or a story-flag chain (the scandal breaks as a side event; this meeting fires the following week demanding the stance) — the multi-week chained-event mechanism from the bible's wishlist. Until then the tag-pair keeps it mid-game-plus."
    ],
    "sourceFile": "v3-ceo-authored-2.md"
  }
];

export const V3_CEO_POOL_LEVEL_NOTES: string[] = [
  "[v3-ceo-authored-1.md] Session wrap — mechanism wishlist items logged above",
  "1. Week-number gates (week >= N) — wanted by: Investor Term Sheet, Genre Pivot, Buyout Letter.",
  "2. Cash-threshold gates (floor and ceiling) — wanted by: Investor Term Sheet (squeeze trigger), Buy the Failing Rival (treasury floor).",
  "3. Per-artist stat gates (popularity threshold on a specific artist) — wanted by: Anchor Artist Renegotiation.",
  "4. Trend/valuation composites — wanted by: Genre Pivot (genre-heat), Buyout Letter (valuation).",
  "5. grant_artist / grant_catalog — wanted by: Buy the Failing Rival (tangible roster/catalog outcomes; sibling of Mac-pool's spawns_release).",
  "6. Target-by-role executive_mood from CEO meetings — wanted by: Buy the Failing Rival (Mac), Genre Pivot (Sam).",
  "[v3-ceo-authored-2.md] Pool accounting after this file",
  "| Bucket | Before | This file | After |",
  "|---|---|---|---|",
  "| CEO regular | 8 | +2 (Layoff or Lean, Mentorship Hour, Define the Legacy are catalog items 8–10; The Counter-Offer + The Open Letter are the 2 invented) — net regulars authored here: 5 | 10 |",
  "| CEO reactive | 2 | Chart Week War Room (chart_debut) + Second Signing Doctrine (recent_signing) authored in full | 2 (now fully authored) |",
  "Quota met: 10 regular + 2 reactive. Outstanding before JSON commit: (1) offline magnitude verification against the P3 tier table; (2) orchestrator ruling on the exec-targeting mechanism for meetings 8, 9, 11 — meeting 11 (The Counter-Offer) is blocked on it outright; (3) log the three UPGRADE SPEC gating asks (cash-threshold gate, week gate, happening/story-flag chain) as mechanism C-items at session wrap."
];
