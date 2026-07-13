/**
 * v3 EVENTS pool — content-review form definition (2026-07-12 working session).
 *
 * On-screen mirror of the authoring scratchpad hand-off files:
 *   v3-events-authored-1.md
 *   v3-events-authored-2.md
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

export const V3_EVENTS_POOL_MEETINGS: PoolReviewEntry[] = [
  {
    "id": "event_sync_bidding_war",
    "title": "Sync Bidding War",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "category sync_licensing · role_hint: \"Sync Agent\"",
    "prompt": "Your phone hasn't stopped since nine. Two studios want the same song — one for a spy thriller's title sequence, one for an awards-bait drama's closing scene. The thriller is waving an exclusive check that would make this the label's best morning all year. The drama will share. And your sync agent quietly notes that trailer season opens in a month, when songs like this go to auction instead of negotiation.",
    "description": "Two film studios are bidding on the same song, and the exclusive money is real — but exclusivity locks the song away just as its moment arrives.",
    "choices": [
      {
        "id": "take_exclusive",
        "label": "Take the exclusive check",
        "gist": "Best morning of the year, banked. The song belongs to the thriller now — and to nobody else.",
        "immediate": "money: +25000",
        "delayed": "awareness_boost: -2",
        "outcomeSummary": "We took the exclusive check and locked the song away from everyone else."
      },
      {
        "id": "license_both",
        "label": "License it to both, non-exclusive",
        "gist": "Half the money from each, the song stays ours, and both trailers carry it.",
        "immediate": "money: +6000, artist_mood: +1",
        "delayed": "money: +6000",
        "outcomeSummary": "We licensed the song to both films and kept it ours — smaller checks, no strings."
      },
      {
        "id": "hold_for_trailer_season",
        "label": "Hold it for trailer season",
        "gist": "Walk away from both checks and bet the song's moment is still ahead of it.",
        "immediate": "",
        "delayed": "awareness_boost: +3, variance_up: 1",
        "outcomeSummary": "We turned down both studios and held the song for trailer season — a bet on its moment."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: Two studios called YOU, on the same morning, about the same song — nobody at the label pitched this, no exec owns it, and the window closes with or without you. Pure external demand shock; the only question is triage."
    ],
    "notes": [
      "Trade axes: cash-now-with-ceiling-capped vs. steady-money-keeps-options vs. no-money-banked-heat-plus-gamble. The hold is EV-attractive per P2 (biggest awareness bundle + variance), so passing on real money is a genuine offer, not poison.",
      "Fiction cashes: awareness_boost = banked hype for the NEXT PLANNED RELEASE — the prose sells \"the song's moment is ahead\" as heat for what we put out next, and the exclusive's negative awareness is the song being locked out of the label's own campaign. Clean."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-events-authored-1.md"
  },
  {
    "id": "event_leaked_masters",
    "title": "The Leaked Masters",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "category copyright_issues · role_hint: \"Copyright Lawyer\"",
    "prompt": "It's on the boards. All of it — the unfinished sessions, the scratch vocals, the take where the bridge falls apart. Somebody walked your masters out the door and the internet found them before you did. Your lawyer wants takedown notices filed within the hour. Your inbox wants to know if this was on purpose. And a small, traitorous part of the comment section is saying the rough cuts go harder than anything you've released.",
    "description": "Unreleased session masters leaked overnight and are spreading fast — fight it, own it, or find out who did it.",
    "choices": [
      {
        "id": "takedown_blitz",
        "label": "Full takedown blitz",
        "gist": "Lawyers, notices, platform escalations — expensive, and the roster sees you fight for them.",
        "immediate": "money: -8000, artist_mood: +2",
        "delayed": "press_momentum: -1",
        "outcomeSummary": "We went scorched-earth on takedowns — costly, but the roster saw us fight for their work."
      },
      {
        "id": "embrace_the_leak",
        "label": "Call it a surprise drop",
        "gist": "Rebrand the breach as intent. The heat is real; the artist watching their drafts go public is also real.",
        "immediate": "artist_mood: -2",
        "delayed": "awareness_boost: +4, variance_up: 2",
        "outcomeSummary": "We rebranded the leak as a surprise drop and rode the chaos instead of fighting it."
      },
      {
        "id": "trace_the_leaker",
        "label": "Trace the leaker",
        "gist": "Quiet forensics. If it's outside, vindication and a story. If it's inside, a different kind of story.",
        "immediate": "money: -4000",
        "delayed": "rep_swing: 2, press_story_flag: 1",
        "outcomeSummary": "We put money into finding the leaker — whatever the trail shows, it becomes the story."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: The label didn't decide anything — the files are already out. This is the world acting ON you; every choice is a response posture to a breach that has already happened. No exec vice, no advocacy — damage triage under a running clock."
    ],
    "notes": [
      "Trade axes: pay-to-protect-the-relationship vs. mood-cost-for-the-biggest-banked-heat vs. cheap-investigation-that-gambles-the-label's-name. Embrace is the EV-attractive temptation (P2: awareness +4 / variance 2 is the fattest bundle) with a relationship cost that money can't buy back (P4).",
      "Correction vs. bible sketch: the pitch had \"exec_mood consequences\" on the trace — events have no meeting exec, so executive_mood can't land; replaced with rep_swing + press_story_flag (the investigation's outcome IS press, either way)."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism spawns_release / grant_song): \"Call it a surprise drop\" is the second flagship case after Wall of Misses — today it cashes as banked hype + variance for the next planned release; with the mechanism it becomes an actual chart-eligible surprise release built from the leaked sessions."
    ],
    "sourceFile": "v3-events-authored-1.md"
  },
  {
    "id": "event_beta_algorithm_invite",
    "title": "Beta Algorithm Invite",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "category platform_opportunities · role_hint: \"Platform Rep\"",
    "prompt": "The email is friendly in the way only a platform's partnerships team can be. You've been 'selected' for a closed beta of their new recommendation engine — guaranteed placement lanes for your next release, in exchange for 'enhanced listener data integration.' The attached terms run eleven pages. Page nine is the one your lawyer circles: they want everything your listeners do, forever, portable to 'affiliated services.' The invite expires Friday.",
    "description": "A streaming platform is offering beta placement for your next release — priced in your listeners' data.",
    "choices": [
      {
        "id": "join_full",
        "label": "Sign as-is",
        "gist": "Take the placement lanes, sign page nine, and hope nobody reads the fine print out loud.",
        "immediate": "reputation: -1",
        "delayed": "awareness_boost: +3",
        "outcomeSummary": "We signed the beta terms as written — placement secured, and page nine is now our problem."
      },
      {
        "id": "join_anonymized",
        "label": "Counter with anonymized data",
        "gist": "Pay the lawyers to rebuild page nine. Slower, costlier, and you keep your hands clean-ish.",
        "immediate": "money: -4000",
        "delayed": "awareness_boost: +2",
        "outcomeSummary": "We lawyered the data terms down to anonymized-only and joined the beta on our footing."
      },
      {
        "id": "decline_invite",
        "label": "Decline politely",
        "gist": "Some doors charge admission on the way out. Pass, and be the label that read the terms.",
        "immediate": "reputation: +1",
        "delayed": "",
        "outcomeSummary": "We read page nine and passed — the placement wasn't worth what it cost our listeners."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: A platform's partnerships team picked YOUR label off a list — unsolicited, time-boxed, take-it-or-leave-it terms. No exec is pitching this; a corporation is. The fork is the classic platform bargain: reach for data."
    ],
    "notes": [
      "Trade axes: free-reach-priced-in-optics vs. paid-reach-clean-hands vs. no-reach-principled-standing. Routine tier: money within ±$2–8k, the real currencies are awareness and rep.",
      "Fiction cashes: the offer is literally \"placement for your next release\" — awareness_boost banking as next-planned-release hype is a one-to-one match. Cleanest fiction-to-mechanics event in the set."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-events-authored-1.md"
  },
  {
    "id": "event_festival_cancellation",
    "title": "Festival Cancellation Domino",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "category industry_drama · role_hint: \"Booking Agent\"",
    "prompt": "The festival is dead. Not postponed, not restructured — dead, in a four-paragraph statement posted at 6 a.m., a week before your act was due on the second stage. The deposit is somewhere inside a bankruptcy filing. Your artist spent two months building a set for a crowd that no longer exists. Your booking agent has the promoter's lawyer on line one, and an empty, fully-rehearsed week on line two.",
    "description": "The festival your act was booked on just collapsed a week out — the deposit, the set, and the free week all need answers.",
    "choices": [
      {
        "id": "sue_the_deposit",
        "label": "Send the lawyers after the deposit",
        "gist": "Join the creditor pile and get paid — and be the label suing a corpse in the trades.",
        "immediate": "reputation: -1",
        "delayed": "money: +10000",
        "outcomeSummary": "We sent lawyers into the festival's bankruptcy and clawed the deposit back the hard way."
      },
      {
        "id": "absorb_gracefully",
        "label": "Eat it with grace",
        "gist": "Write it off publicly, back the artist privately. The scene notices who behaved.",
        "immediate": "artist_mood: -3",
        "delayed": "reputation: +2",
        "outcomeSummary": "We ate the festival loss without a lawsuit — the scene noticed who kept their composure."
      },
      {
        "id": "popup_show",
        "label": "Turn the week into a pop-up",
        "gist": "The set exists, the band is hot, the fans are stranded. Book a room and burn the rehearsal fuel on our own terms.",
        "immediate": "money: -6000, artist_energy: -3",
        "delayed": "awareness_boost: +3",
        "outcomeSummary": "We flipped the dead festival week into a pop-up show — the set got its crowd after all."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: A third party's collapse just detonated your calendar — the label did nothing wrong and gets the fallout anyway. Classic domino: someone else's failure, your triage."
    ],
    "notes": [
      "Trade axes: money-back-at-rep-cost vs. rep-earned-at-morale-cost vs. spend-and-sweat-for-banked-heat. Three different resources absorb the same external hit (P4). The grace option is a real trade, not a null: the artist eats the disappointment now, the label's name appreciates later.",
      "Fiction cashes: pop-up awareness_boost = the stranded-fans story building hype toward the next planned release; the energy cost is the band playing a show on rescue timelines."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-events-authored-1.md"
  },
  {
    "id": "event_studio_flood",
    "title": "Studio Flood",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "category technical_problems · role_hint: \"Studio Manager\"",
    "prompt": "The call comes at 7 a.m. from the studio manager, and you can hear the wet-vac behind her. A pipe let go in the ceiling over the live room sometime after midnight. The gear mostly survived; the room did not, and neither did your block of booked dates. She's found you a replacement room across town — a famous one, with a famous day rate. Or there's the producer's home rig. Or there's the calendar, which can always bleed instead.",
    "description": "The studio flooded overnight with your session dates inside — pay up for a premium room, go scrappy at home, or push the schedule.",
    "choices": [
      {
        "id": "premium_replacement",
        "label": "Book the famous room",
        "gist": "The expensive answer that keeps everything else intact — and the roster notices being treated like it matters.",
        "immediate": "money: -12000, artist_mood: +2",
        "delayed": "",
        "outcomeSummary": "We moved the session to the famous room and paid its famous day rate — no momentum lost."
      },
      {
        "id": "home_rig",
        "label": "Track it on the home rig",
        "gist": "Blankets on the walls, a preamp older than the artist, and whatever character the room gives us.",
        "immediate": "money: -2000, creative_capital: +1",
        "delayed": "quality_bonus: -2",
        "outcomeSummary": "We tracked in the producer's living room — scrappier tapes, and a story the team owns."
      },
      {
        "id": "push_the_schedule",
        "label": "Push everything back",
        "gist": "Nobody records this month. The calendar suffers so the record doesn't — and the band gets a breath.",
        "immediate": "artist_mood: -3",
        "delayed": "artist_energy: +2",
        "outcomeSummary": "We pushed the sessions back until the studio dried out — the schedule bled, the band rested."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: A pipe burst. That's it — no antagonist, no negotiation, just physical reality interrupting the schedule. The purest external shock in the set: infrastructure failure, three ways to route around it."
    ],
    "notes": [
      "Trade axes: money-buys-continuity vs. cheap-and-scrappy-costs-fidelity vs. free-costs-time-and-morale-but-restores-the-tank. CC grant is +1, inside the cap — the scrappiness earns creative currency, per the bible's own sketch.",
      "Fiction cashes (with a note): quality_bonus banks against the NEXT recording session — the home-rig penalty reads as \"these dates suffer,\" which is close but not exact (the bank technically lands on the next session started). Acceptable at current engine granularity; flagging rather than spec'ing since the drift is one session-boundary wide. No UPGRADE SPEC needed."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-events-authored-1.md"
  },
  {
    "id": "event_ghostwriter_confession",
    "title": "The Ghostwriter Confession",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "category artist_personal · role_hint: \"Artist Manager\"",
    "prompt": "They ask to see you alone, which is never good. Then it comes out in one breath: the hook — THE hook, the one that broke them, the one in every sync pitch and every bio — wasn't theirs. A ghostwriter, paid in cash, years before you signed them. The ghost has been quiet. The ghost has also just hired a manager. Your artist is sitting across from you looking like the confession cost them a rib, waiting to hear what kind of label this is.",
    "description": "Your artist just confessed their breakout hook was ghostwritten — and the ghost has hired a manager. Settle it, own it, or bury it.",
    "choices": [
      {
        "id": "buy_silence_and_credit",
        "label": "Settle with the ghost, quietly and fully",
        "gist": "Real money, retroactive credit, an NDA — and the artist gets to keep their story, mostly.",
        "immediate": "money: -15000",
        "delayed": "artist_mood: +3, rep_swing: 1",
        "outcomeSummary": "We settled with the ghostwriter in full — credit, money, silence, and a secret that stays kept, probably."
      },
      {
        "id": "get_ahead_publicly",
        "label": "Get ahead of it publicly",
        "gist": "Full credit, joint statement, no NDA. The truth on our terms — however the room takes it.",
        "immediate": "artist_mood: +4",
        "delayed": "rep_swing: 2, press_story_flag: 1",
        "outcomeSummary": "We put the ghostwriter's name on the record ourselves and told the story before anyone else could."
      },
      {
        "id": "restructure_quietly",
        "label": "Restructure the credits quietly",
        "gist": "Paperwork, backdated splits, no announcement. Cheapest now; the asterisk never quite comes off.",
        "immediate": "money: -4000, reputation: -1",
        "delayed": "award_chances: -1",
        "outcomeSummary": "We fixed the credits in the paperwork and nowhere else — cheap, quiet, and never quite clean."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: An artist's private history just became the label's live problem — nobody scheduled this confession, no exec has a play prepared. It arrives sideways, personal, and armed. The fork is integrity-vs-exposure with a human being in the middle."
    ],
    "notes": [
      "Trade axes: big-money-buys-a-fragile-peace vs. free-cash-but-the-label's-name-rides-the-spin vs. cheap-with-permanent-residue. Crisis tier: the public route's rep_swing: 2 is EV-zero, so it's sweetened (P2) with the biggest mood lift plus a banked press story — relief and narrative are what honesty buys. The quiet restructure touches award_chances, the one channel that never expires — an asterisk is exactly what a permanent, unbuyable −1 award feels like (P4 irreversibility)."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-events-authored-1.md"
  },
  {
    "id": "event_brand_deal_strings",
    "title": "Brand Deal With Strings",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "category business_opportunities · role_hint: \"Brand Agency\"",
    "prompt": "The deck is beautiful, the agency people are beautiful, and the number at the end is genuinely serious money. A beverage brand wants your artist as the face of their 'authenticity' campaign — their word, in quotes on their own slide. The strings are on page six: approval over the next single's rollout aesthetic, two brand mentions scripted into interviews, and a morals clause that cuts both ways. Your artist read the deck in four minutes and slid it back across the table without a word.",
    "description": "A brand is offering serious campaign money for your artist — with creative approval strings your artist has already silently vetoed.",
    "choices": [
      {
        "id": "take_it_whole",
        "label": "Sign the deal as offered",
        "gist": "The money is the argument. Page six is the price, and the artist learns what the label costs.",
        "immediate": "money: +20000, artist_mood: -2",
        "delayed": "creative_capital: -1",
        "outcomeSummary": "We signed the brand deal, strings and all — serious money, and page six now owns a piece of the rollout."
      },
      {
        "id": "negotiate_the_strings",
        "label": "Take the money, fight page six",
        "gist": "Half the fee, none of the approval rights. The agency calls it 'partnership'; we call it a fence.",
        "immediate": "artist_mood: +1",
        "delayed": "money: +10000",
        "outcomeSummary": "We cut the brand's strings in negotiation and took a smaller check on our own terms."
      },
      {
        "id": "pass_loudly",
        "label": "Pass, and say why",
        "gist": "Turn it down on the record. The quote costs us the fee and buys us the roster's belief.",
        "immediate": "reputation: +2, artist_mood: +3",
        "delayed": "",
        "outcomeSummary": "We passed on the brand money publicly — the quote cost a fee and bought the roster's trust."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: An agency chose your artist off a mood board and arrived with the money already approved. The label didn't seek this; the terms aren't yours; the clock isn't either. Windfall-vs-integrity, the category's signature fork."
    ],
    "notes": [
      "Trade axes: max-cash-costs-creative-sovereignty-and-the-artist vs. half-cash-clean vs. no-cash-buys-identity. The CC hit on the full deal is −1 (encumbered creative control), inside designer bounds; the loud pass converts money directly into the two channels money can't easily buy (rep, mood) — P4's spread-in-kind."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-events-authored-1.md"
  },
  {
    "id": "event_tribute_moment",
    "title": "The Tribute Moment",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "category industry_drama · role_hint: \"TV Booker\"",
    "prompt": "The news broke Tuesday; the call came Thursday. The televised tribute is Sunday, and the producers want your artist for the second verse of the icon's best-known song — the verse everyone will be singing along to through tears. It's an honor. It's also national television on four days' notice, in the middle of everything else your artist is carrying. The booker needs an answer by tomorrow, and 'an honor' is doing a lot of quiet arithmetic in your head.",
    "description": "A televised memorial wants your artist for the tribute performance — a genuine honor on four days' notice.",
    "choices": [
      {
        "id": "accept_the_slot",
        "label": "Accept the slot",
        "gist": "Four days of rehearsal, one national moment. The country meets your artist mid-eulogy.",
        "immediate": "artist_energy: -3",
        "delayed": "awareness_boost: +4",
        "outcomeSummary": "We put our artist on the televised tribute — four frantic days, one verse the country sang along to."
      },
      {
        "id": "decline_gracefully",
        "label": "Decline, with a personal note",
        "gist": "A handwritten no to the family, and an artist who learns their bandwidth is protected.",
        "immediate": "artist_mood: +1",
        "delayed": "",
        "outcomeSummary": "We declined the tribute slot with a personal note and protected our artist's week."
      },
      {
        "id": "recorded_version",
        "label": "Counter with a studio recording",
        "gist": "Skip the live wire; cut a considered version for the broadcast package. Craft over adrenaline.",
        "immediate": "money: -3000",
        "delayed": "quality_bonus: +2",
        "outcomeSummary": "We countered with a studio-cut tribute for the broadcast — a considered version instead of a live one."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: An icon died and a television producer decided your artist belongs in the memorial broadcast. Grief, honor, and exposure arrived in one phone call the label never solicited — and the answer is due before the week is out."
    ],
    "notes": [
      "Trade axes: exposure-paid-in-exhaustion vs. nothing-gained-relationship-kept vs. small-spend-banks-craft. Routine tier — the honest small event; the graceful decline carries a real (small) return so it's a choice, not a null (P4).",
      "Fiction cashes (with UPGRADE SPEC): the recorded-version's quality_bonus reads as \"the tribute session sharpened the team\" banking into the next recording session — serviceable, but the recording itself doesn't exist as an artifact. UPGRADE SPEC (future mechanism spawns_release / grant_song): with the Wall-of-Misses mechanism, the counter-offer becomes an actual one-off tribute recording (non-chart or chart-eligible per design) attached to {artistName}. Third logged use case for the mechanism."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-events-authored-1.md"
  },
  {
    "id": "the_loop_deal",
    "title": "The Loop Deal",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "category sync_licensing",
    "prompt": "A mobile-game giant's ad agency found your artist's hook through a fan edit — eleven seconds, looped, already tracking better than anything their composers wrote. They want it for a global campaign and they're deciding this week: full buyout, or licensed with a credit. The fan edit, meanwhile, is doing numbers on its own.",
    "description": "A gaming ad agency wants the hook — the check gets bigger the more of the song you let go.",
    "choices": [
      {
        "id": "take_the_buyout",
        "label": "Take the full buyout",
        "gist": "The check clears today; the hook belongs to a puzzle game tomorrow.",
        "immediate": "money +22000",
        "delayed": "awareness_boost −2, artist_mood −2",
        "outcomeSummary": "We took the buyout — the hook belongs to a puzzle game now, and the check cleared."
      },
      {
        "id": "license_with_credit",
        "label": "License it, name on screen",
        "gist": "Smaller check, but the credit rides a billion feeds straight into your next release.",
        "immediate": "money +10000",
        "delayed": "awareness_boost +2",
        "outcomeSummary": "We licensed the loop with our name on it — smaller check, bigger echo."
      },
      {
        "id": "ride_the_fan_edit",
        "label": "Pass — let the fan edit run",
        "gist": "The unofficial version is the culture; the official one would kill it.",
        "immediate": "",
        "delayed": "press_momentum +1, artist_mood +2",
        "outcomeSummary": "We passed on the ad money and let the fan edit run wild on its own."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: windfall-vs-identity triage. The tempting wrong answer is the buyout — biggest check, but it muzzles the song in your own campaign and the artist hears their best hook selling gem bundles forever."
    ],
    "notes": [
      "Mechanics discipline: buyout's awareness_boost −2 = exclusivity strips the hook from your own pre-release promo (banked hype drains); the credit's +2 = global exposure banked for the NEXT planned release. Distinct axes: cash-max / cash-plus-hype / integrity-plus-mood."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-events-authored-2.md"
  },
  {
    "id": "sampled_without_asking",
    "title": "Sampled Without Asking",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "category copyright_issues",
    "prompt": "An overseas smash — twelve markets and climbing — is built on your artist's hook, uncredited, pitched up a half-step like nobody would notice. Their label has stopped answering emails. Your artist noticed before you did.",
    "description": "A foreign hit sampled your catalog without clearance, and its label is playing dead.",
    "choices": [
      {
        "id": "send_the_lawyers",
        "label": "Lawyer up for back royalties",
        "gist": "Retainer now, settlement later — and the industry learns your catalog bites back.",
        "immediate": "money −8000",
        "delayed": "money +18000, reputation +1",
        "outcomeSummary": "We sent the lawyers — they stopped pretending, and the back royalties are coming."
      },
      {
        "id": "cut_the_remix_deal",
        "label": "Settle for credit and an official remix",
        "gist": "Take a smaller check and let their hit drag its audience to your artist's next drop.",
        "immediate": "money +8000",
        "delayed": "awareness_boost +3, artist_mood +1",
        "outcomeSummary": "We settled for credit and a remix — their hit now wears our artist's name."
      },
      {
        "id": "let_it_ride",
        "label": "Let it ride as free promo",
        "gist": "The story travels on its own; the fight isn't worth the fees.",
        "immediate": "",
        "delayed": "press_momentum +1, artist_mood −3",
        "outcomeSummary": "We let the borrowed hook slide — the story travels, but our artist won't forget it."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: someone else's crisis of conscience arriving as your opportunity. The tempting wrong answer is doing nothing — \"free promo\" reads clever until the roster learns the label doesn't defend its own."
    ],
    "notes": [
      "Mechanics discipline: remix deal's awareness_boost +3 is the fiction cashing — the credited remix funnels a foreign audience toward the next planned release. The do-nothing option is a real trade (momentum vs a roster wound), not a freebie."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-events-authored-2.md"
  },
  {
    "id": "takeover_tuesday",
    "title": "Takeover Tuesday",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "category platform_opportunities",
    "prompt": "A platform's genre channel just lost Tuesday's headliner and they're offering your artist the 24-hour account takeover — full editorial keys, their audience, your call. The slot exists because someone else dropped out, and it expires when Tuesday does.",
    "description": "A last-minute channel takeover slot opened up — exposure priced in artist energy.",
    "choices": [
      {
        "id": "run_it_live",
        "label": "Full live takeover, all day",
        "gist": "Camera up at 8 AM, keys back at midnight — unmissable and exhausting.",
        "immediate": "money −3000",
        "delayed": "awareness_boost +2, artist_energy −2",
        "outcomeSummary": "We ran the takeover live all day — exhausting, unmissable."
      },
      {
        "id": "send_the_tape",
        "label": "Pre-taped highlights package",
        "gist": "Safe, tidy, done in an afternoon, forgotten by Wednesday.",
        "immediate": "money −1000",
        "delayed": "awareness_boost +1",
        "outcomeSummary": "We sent a taped package — safe, tidy, and gone by Wednesday."
      },
      {
        "id": "keep_the_studio_week",
        "label": "Decline — protect the studio week",
        "gist": "The session's finally cooking; a day of content costs more than it looks.",
        "immediate": "",
        "delayed": "quality_bonus +1, artist_energy +1",
        "outcomeSummary": "We declined the slot and kept the week for the studio."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: small-stakes triage under a hard clock. The tempting wrong answer is the full live takeover every time — it's the best exposure, and it quietly bills the artist's battery."
    ],
    "notes": [
      "Mechanics discipline: declining cashes as quality_bonus +1 because the fiction is literally an uninterrupted recording week — the banked channel matches the prose."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-events-authored-2.md"
  },
  {
    "id": "ransom_note",
    "title": "Ransom Note",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "category technical_problems",
    "prompt": "The label's file server went dark at 4 AM. Unreleased masters, session stems, half your contracts — encrypted, with a ransom note that reads like a customer-service script and a countdown that ends Friday. The number they're asking for is real money. So is what's locked behind it.",
    "description": "Ransomware took the label's archive hostage, and the clock ends Friday.",
    "choices": [
      {
        "id": "pay_quietly",
        "label": "Pay it, quietly",
        "gist": "Wire the money, get the keys, tell no one — and hope \"no one\" holds.",
        "immediate": "money −30000",
        "delayed": "rep_swing 1",
        "outcomeSummary": "We paid, quietly, and got the keys back before anyone heard a thing."
      },
      {
        "id": "rebuild_from_backups",
        "label": "Refuse — rebuild from partial backups",
        "gist": "Forensics, recovery, and an honest accounting of what's just gone.",
        "immediate": "money −12000",
        "delayed": "quality_bonus −2, artist_mood −4, creative_capital +1",
        "outcomeSummary": "We refused to pay and rebuilt from backups — some takes are just gone."
      },
      {
        "id": "go_public",
        "label": "Go public and own the story",
        "gist": "Announce the breach, hire the response team, take the hit on your own terms.",
        "immediate": "money −6000, reputation −2",
        "delayed": "press_story_flag 1, press_momentum +1",
        "outcomeSummary": "We went public with the hack — embarrassing week, but we own the story now."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: pay-now-vs-bleed-later with no clean exit. The tempting wrong answer is paying — it's the only choice that makes the problem instantly disappear, and it plants a story that can detonate later."
    ],
    "notes": [
      "Mechanics discipline: the rebuild's quality_bonus −2 banks a real penalty into the next session (lost stems get re-cut worse), and CC +1 is the scrappiness dividend (studio-flood precedent, within cap). The pay option's rep_swing is the it-could-leak-either-way gamble."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism catalog_damage): the honest version of the rebuild destroys actual banked songs / in-flight project progress, not just next-session quality. Needs an engine hook that can strike or degrade specific recorded-song rows; log as a C-item when this ships."
    ],
    "sourceFile": "v3-events-authored-2.md"
  },
  {
    "id": "detained_abroad",
    "title": "Detained Abroad",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "category artist_personal",
    "prompt": "Your artist just got pulled aside at a border crossing on a visa technicality, mid-international press run, phone confiscated, next flight nobody's. Their manager is calling you from the terminal. Every hour this runs is a headline, and every option on the table costs something that doesn't come back.",
    "description": "The artist is detained abroad on a paperwork technicality, and the press run is bleeding out by the hour.",
    "choices": [
      {
        "id": "fly_the_lawyers",
        "label": "Fly in the heavyweight legal team",
        "gist": "Overnight flights, obscene hourly rates, out by tomorrow.",
        "immediate": "money −28000",
        "delayed": "artist_mood +6, reputation +1",
        "outcomeSummary": "We flew the lawyers in overnight — costly, fast, and our artist knows who showed up."
      },
      {
        "id": "consular_channels",
        "label": "Work the quiet consular channels",
        "gist": "Proper process, proper pace — days, not hours.",
        "immediate": "money −5000",
        "delayed": "artist_mood −4, awareness_boost −2",
        "outcomeSummary": "We worked the consulate line — slower, cheaper, and the press run quietly died."
      },
      {
        "id": "make_it_a_cause",
        "label": "Make the detention a public cause",
        "gist": "Turn the holding room into a headline and dare them to keep the door shut.",
        "immediate": "money −10000",
        "delayed": "rep_swing 2, press_story_flag 1",
        "outcomeSummary": "We made the detention a headline cause — it'll define us one way or the other."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: other people's bureaucracy arriving at your desk at 2 AM. The tempting wrong answer is the cheap consular route — fiscally correct, and your artist spends four days in a holding room learning what the label thinks they're worth."
    ],
    "notes": [
      "Mechanics discipline: the consular route's awareness_boost −2 is the fiction cashing — the international press run that was feeding the next release dies on the tarmac. The cause play is a true EV-live gamble (rep_swing 2) sweetened with a banked press story, per P2."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-events-authored-2.md"
  },
  {
    "id": "the_catalog_fund",
    "title": "The Catalog Fund",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "category business_opportunities",
    "prompt": "A catalog acquisition fund — the kind with a pension behind it and a spreadsheet where the taste should be — wants the masters to your earliest release. The offer is serious, the window closes at their quarter-end, and the partner on the call keeps saying 'legacy monetization' like it's a compliment.",
    "description": "A catalog fund wants your first release's masters, and the check is big enough to be a strategy.",
    "choices": [
      {
        "id": "sell_the_masters",
        "label": "Sell the masters outright",
        "gist": "The war chest doubles today; the label's first chapter belongs to a fund tomorrow.",
        "immediate": "money +55000",
        "delayed": "reputation −2, artist_mood −5, award_chances −1",
        "outcomeSummary": "We sold the early masters — the war chest is real, and so is the roster's silence."
      },
      {
        "id": "license_half_term",
        "label": "License half, fixed term",
        "gist": "Real money now, and the masters walk back home when the term ends.",
        "immediate": "money +20000",
        "delayed": "artist_mood −1",
        "outcomeSummary": "We licensed half the catalog for a term — money in, masters still ours at the end."
      },
      {
        "id": "refuse_loudly",
        "label": "Refuse — and say so publicly",
        "gist": "No number fixes what selling it breaks. Make the refusal the story.",
        "immediate": "",
        "delayed": "reputation +3, artist_mood +4, press_story_flag 1",
        "outcomeSummary": "We turned the fund down flat — the catalog stays home, and everyone heard us say it."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: the biggest single check in the pool, priced in identity. The tempting wrong answer IS the sale — it solves every cash problem you have and creates one you can't buy back."
    ],
    "notes": [
      "Mechanics discipline: sale's award_chances −1 = the legacy dilution the awards circuit actually punishes; roster-wide mood swing on both poles because the roster is watching what the label does with its own history."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism revenue_stream_transfer): the honest sale should also transfer the sold release's ongoing weekly streaming revenue to the buyer for the rest of the campaign (the engine has ongoing streams; it has no way to reassign them). Until then the one-shot money + award/mood costs stand in for it."
    ],
    "sourceFile": "v3-events-authored-2.md"
  },
  {
    "id": "the_plant_callout",
    "title": "The Plant Callout",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "category industry_drama",
    "prompt": "The genre's reigning superstar spent four minutes on the year's biggest podcast calling your artist 'an industry plant with a good stylist.' The clips hit before lunch. Your artist has a reply drafted, their group chat has a worse one, and every outlet you know has already texted.",
    "description": "A superstar called your artist an industry plant on the biggest podcast in the format.",
    "choices": [
      {
        "id": "clap_back_on_record",
        "label": "Answer it, on record, today",
        "gist": "Loud, fast, and either legendary or a career-defining mistake.",
        "immediate": "money −4000",
        "delayed": "rep_swing 2, press_momentum +1, artist_mood +3",
        "outcomeSummary": "We answered the callout on record — loud, risky, ours."
      },
      {
        "id": "publish_the_receipts",
        "label": "Receipts, not beef",
        "gist": "Ten years of van tours and floor-sleeping, cut into a mini-doc. Let the grind argue.",
        "immediate": "money −9000",
        "delayed": "reputation +2, awareness_boost +2",
        "outcomeSummary": "We answered with receipts — the origin story is doing the arguing for us."
      },
      {
        "id": "silence_and_studio",
        "label": "Say nothing — send it to the studio",
        "gist": "No statement. The reply ships on the next record.",
        "immediate": "",
        "delayed": "quality_bonus +2, artist_mood −2",
        "outcomeSummary": "We said nothing and sent the anger to the studio."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: someone else's mouth, your news cycle. The tempting wrong answer is the clap-back — it feels like loyalty and it hands a superstar exactly the feud they were fishing for."
    ],
    "notes": [
      "Mechanics discipline: clap-back is an EV-live gamble (rep_swing 2 sweetened with momentum + a backed-in-public artist, per P2); receipts cash as banked hype because the origin-story doc feeds the next planned release; the studio option banks the anger as quality_bonus — the fiction and the channel match. Artist mood moves on all three because the roster is the subject."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-events-authored-2.md"
  },
  {
    "id": "the_amplify_pilot",
    "title": "The Amplify Pilot",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "category platform_opportunities",
    "prompt": "A platform is quietly piloting a paid placement program — guaranteed home-screen real estate for your next release, invite-only, and the invite expires Friday. Two trade reporters are already calling the pilot 'the new payola' on background. The rep on the phone says early partners get 'legacy pricing.' He means cheaper. He also means first against the wall.",
    "description": "A platform's pay-for-placement pilot wants the label in before the press decides what to call it.",
    "choices": [
      {
        "id": "buy_in_full",
        "label": "Buy the full placement tier",
        "gist": "If it's payola, it's payola that works — and the next release lands on every home screen.",
        "immediate": "money −18000",
        "delayed": "awareness_boost +4",
        "outcomeSummary": "We paid full freight for placement — if it's payola, it's payola that works."
      },
      {
        "id": "case_study_discount",
        "label": "Take the discounted case-study slot",
        "gist": "Cheaper, real placement — and the label's logo in the deck they show everyone else.",
        "immediate": "money −5000",
        "delayed": "awareness_boost +2, reputation −1",
        "outcomeSummary": "We took the discounted slot as their case study — cheaper, but our name's on the brochure."
      },
      {
        "id": "decline_and_leak",
        "label": "Decline — and let the pitch deck leak",
        "gist": "Clean hands, a friendly reporter, and an algorithm with a long memory.",
        "immediate": "",
        "delayed": "reputation +2, press_story_flag 1, awareness_boost −1",
        "outcomeSummary": "We declined and let the pitch deck leak — righteous, and the algorithm noticed."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: the platform is selling exactly what you want, at the exact moment the press is calling it payola. The tempting wrong answer is the discount tier — half the price, and your label's name on the brochure when the story breaks."
    ],
    "notes": [
      "Mechanics discipline: the leak's awareness_boost −1 is the platform quietly deprioritizing your next release — refusal has a mechanical price, not just a halo. All three touch awareness at different signs; distinct axes are cash-for-reach / optics-for-discount / integrity-at-reach-cost."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-events-authored-2.md"
  },
  {
    "id": "twenty_four_frames",
    "title": "Twenty-Four Frames",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "category sync_licensing",
    "prompt": "An acclaimed documentary — the kind that wins things — is in final cut and wants a deep album cut over its closing scene. The music budget is a rounding error and the director is calling personally, which is what people do when the money argument is unwinnable. The festival premiere lands right in your next release window.",
    "description": "A prestige documentary wants a deep cut for its final scene, for almost no money.",
    "choices": [
      {
        "id": "take_scale",
        "label": "Take the scale fee",
        "gist": "Small check, right film, done by Friday.",
        "immediate": "money +4000",
        "delayed": "",
        "outcomeSummary": "We took the scale fee — small check, right film."
      },
      {
        "id": "waive_for_credit",
        "label": "Waive the fee for a front-title credit",
        "gist": "No check — a credit card in the opening frames and a premiere pointed at the release window.",
        "immediate": "",
        "delayed": "awareness_boost +2, artist_mood +1, creative_capital +1",
        "outcomeSummary": "We waived the fee for the credit — the premiere now points at us."
      },
      {
        "id": "pitch_the_unfinished_cut",
        "label": "Counter with an unreleased track from current sessions",
        "gist": "Give them something nobody's heard — and stitch a deadline into a session that didn't have one.",
        "immediate": "",
        "delayed": "variance_up 1, awareness_boost +1",
        "outcomeSummary": "We pitched them an unfinished track instead — a gamble stitched into the cut."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: the small offer with the long tail. The tempting wrong answer is the scale fee — real money for a deep cut, and it spends the label's one shot at prestige on lunch."
    ],
    "notes": [
      "Mechanics discipline: the counter-offer's variance_up 1 cashes the fiction — an external deadline pressed into the current recording session widens its swing; the credit option's CC +1 (within cap) is the prestige-cachet dividend. Axes: cash / credit-hype / gamble."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-events-authored-2.md"
  },
  {
    "id": "the_collab_drop",
    "title": "The Collab Drop",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "category business_opportunities",
    "prompt": "A cult streetwear brand wants a 48-hour surprise merch capsule timed to your artist's current fanbase spike. They handle production, fulfillment, everything — the label just signs and splits. The catch is the fuse: the drop works this week or not at all, and the mockups use your artist's face six ways.",
    "description": "A streetwear brand wants a 48-hour collab drop on the artist's likeness — split terms, no time.",
    "choices": [
      {
        "id": "take_the_split",
        "label": "Sign the split, ship the drop",
        "gist": "Clean margin, zero lift — and the artist learns about their own capsule online.",
        "immediate": "money +6000",
        "delayed": "artist_mood −1",
        "outcomeSummary": "We took the split on the drop — quick money off the artist's name."
      },
      {
        "id": "artist_runs_the_capsule",
        "label": "Hand the artist creative control",
        "gist": "Thinner margin, longer nights, and a capsule that's actually theirs.",
        "immediate": "money +2000",
        "delayed": "artist_mood +3, artist_popularity +1",
        "outcomeSummary": "We handed the capsule to the artist — less margin, more them."
      },
      {
        "id": "save_the_moment",
        "label": "Pass — spend the spike on our own announcement",
        "gist": "The fanbase is leaning in this week. Point that at the next release, not a t-shirt.",
        "immediate": "",
        "delayed": "awareness_boost +2",
        "outcomeSummary": "We skipped the drop and spent the moment on our own announcement."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: easy money off the artist's face, on a 48-hour fuse. The tempting wrong answer is taking the clean split — the margin's great and the artist finds out about the capsule from a group chat."
    ],
    "notes": [
      "Mechanics discipline: passing converts the fan spike into banked hype for the next planned release — the awareness channel is exactly what \"spend the moment on the announcement\" means. Axes: cash / relationship / banked hype."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-events-authored-2.md"
  },
  {
    "id": "the_old_clip",
    "title": "The Old Clip",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "category artist_personal",
    "prompt": "A twelve-year-old talent-show clip of your artist — braces, enormous dreams, a final note that misses by a mile — hit ten million views overnight. The comments are surprisingly kind. Your artist has watched it forty times and can't decide if they're delighted or destroyed, and every meme account in the format is already cutting remixes.",
    "description": "A decade-old talent-show clip of the artist went viral overnight, tone undecided.",
    "choices": [
      {
        "id": "artist_answers_it",
        "label": "Let the artist answer the clip themselves",
        "gist": "A response video, artist-directed: present-day them, duetting the kid with the braces.",
        "immediate": "money −2000",
        "delayed": "artist_mood +3, awareness_boost +2",
        "outcomeSummary": "We let the artist answer the clip themselves — the internet melted."
      },
      {
        "id": "official_meme_kit",
        "label": "Label leans in with an official meme kit",
        "gist": "Feed the accounts, ride the wave, apologize to the artist later.",
        "immediate": "money −1000",
        "delayed": "press_momentum +1, artist_mood −2",
        "outcomeSummary": "We memed the clip ourselves — great numbers, gritted teeth."
      },
      {
        "id": "let_it_burn_out",
        "label": "Stay out of it entirely",
        "gist": "No statement, no kit — the moment passes unclaimed and the artist keeps their childhood.",
        "immediate": "",
        "delayed": "artist_mood +1, awareness_boost −1",
        "outcomeSummary": "We let the clip burn out on its own and kept the artist out of it."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: the internet excavated your artist without asking either of you. The tempting wrong answer is the label-run meme kit — the numbers are great and the artist feels like inventory."
    ],
    "notes": [
      "Mechanics discipline: staying out has a real cost (awareness_boost −1 — the unclaimed moment is hype the next release never banks), so kindness isn't free. Axes: artist-authored hype / label-extracted momentum / protection-at-a-price."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-events-authored-2.md"
  },
  {
    "id": "the_arena_cover",
    "title": "The Arena Cover",
    "status": "",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "category industry_drama",
    "prompt": "A hall-of-fame headliner closed last night's arena encore with a cover of your artist's song. Not a snippet — the whole thing, learned properly. Forty thousand phones caught it and the clips are everywhere by morning. Their camp hasn't said a word, which means their camp is deciding the same thing you are: whose moment this is.",
    "description": "A legend covered your artist's song at an arena show, and nobody's claimed the moment yet.",
    "choices": [
      {
        "id": "chase_the_duet",
        "label": "Rush an official duet through the managers",
        "gist": "Fees, favors, a session on the calendar — and a legend in the room when the tape rolls.",
        "immediate": "money −12000",
        "delayed": "quality_bonus +3, variance_up 1, artist_mood +4",
        "outcomeSummary": "We chased the duet — the session is booked and the ceiling just moved."
      },
      {
        "id": "clear_the_live_cover",
        "label": "Clear and release the live cover officially",
        "gist": "Their voice, your artist's song, everyone's lawyers satisfied, everyone paid.",
        "immediate": "money +12000",
        "delayed": "awareness_boost +2",
        "outcomeSummary": "We cleared the live cover for release — their voice, our song, everybody paid."
      },
      {
        "id": "bank_the_moment",
        "label": "Say nothing — fold it into the next campaign",
        "gist": "Don't touch it. Let the clips breathe, and spend the moment when the release lands.",
        "immediate": "",
        "delayed": "awareness_boost +3, press_story_flag 1",
        "outcomeSummary": "We stayed quiet and folded the moment into the next campaign."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: a gift with a countdown. The tempting wrong answer is silence-as-strategy played too pure — the moment is real, but moments this size get claimed by whoever moves, and their camp hasn't said a word yet."
    ],
    "notes": [
      "Mechanics discipline: the duet cashes into the RECORDING channels (quality_bonus +3, variance_up 1 — a legend in the session raises the ceiling AND the swing; EV-attractive gamble per P2, not poison); the cover-clearance is real incoming license money; banking is pure next-release hype + press story. Three genuinely different resource sentences (P4)."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism spawns_release / grant_song): the honest duet outcome is a real collab track — a song row with the legend as a feature, chart-eligible, revenue-generating (same mechanism as Wall of Misses' \"From the Vault\"). Until that exists, the quality/variance bank into the next session stands in."
    ],
    "sourceFile": "v3-events-authored-2.md"
  }
];

export const V3_EVENTS_POOL_LEVEL_NOTES: string[] = [
  "[v3-events-authored-1.md] Batch notes (for the offline verification pass before JSON commit)",
  "- Money spread across the batch: routine events (3, 8) stay within ±$2–8k; majors (1, 4, 5, 7) carry $10–25k swings; crises (2, 6) put their weight in irreversible channels (rep_swing, award_chances, mood) with money in the −$8k to −$15k band per the bible's own sketches — the big positive one-shots live in Sync Bidding War (+$25k) and Brand Deal (+$20k), the two \"world offers you a check\" fictions.",
  "- No executive_mood anywhere (events have no meeting exec — one bible sketch corrected, noted in event 2).",
  "- CC usage: +1 (Studio Flood), −1 (Brand Deal) — inside the +1/+2 cap, and only where the fiction touches creative currency.",
  "- Dominance check targets: event 1 (license_both vs take_exclusive — distinct axes, neither dominates), event 3 (join_full vs join_anonymized — free/rep-cost vs paid/clean), event 8 (decline_gracefully is deliberately small — verify the lint accepts a low-magnitude option as non-dominated; it trades away nothing, which is its value).",
  "- UPGRADE SPEC ledger additions: events 2 and 8 both queue behind the spawns_release/grant_song mechanism first logged on Wall of Misses.",
  "[v3-events-authored-2.md] Batch checklist (bible appendix, adapted for events)",
  "- [x] No exec advocate, no bands, no self_serving_hint anywhere (P8)",
  "- [x] 3 choices per event, each nameable in one sentence on a different resource axis (P4); no strict sibling dominance spotted (dominance lint will verify)",
  "- [x] Tier magnitudes: routine ±$2–8k, major ±$10–25k, crisis ±$28–55k (P3); crisis pool carries the one-shot money",
  "- [x] awareness_boost only where fiction feeds the NEXT planned release; quality_bonus/variance_up only where fiction touches the next recording session; press_story_flag/press_momentum per bible; artist_mood wherever the roster is touched; CC grants ≤ +1 (two total: #4 rebuild, #9 credit)",
  "- [x] Every rep_swing is a sweetened, EV-live gamble (P2): #4 pay-quiet, #5 cause, #7 clap-back",
  "- [x] outcome_summary on all 36 choices: label-voice past tense, qualitative, no engine numbers",
  "- [x] All effect keys canonical (money, reputation, creative_capital, artist_mood, artist_energy, artist_popularity, press_story_flag, press_momentum, quality_bonus, awareness_boost, variance_up, rep_swing, award_chances)",
  "- [x] No overlap with the 8 bible pitches (bidding war, leaked masters, beta invite, festival collapse, tribute, studio flood, ghostwriter, brand deal) or the v1 pool (film sync, plagiarism claim, midwest spike, critic listen, platform beta, royalty report, wardrobe, controversial sponsor, blackout, flyers, merch misprint, fired dancers, false takedown, 4 escalations)",
  "- [x] UPGRADE SPECs logged where fiction exceeds mechanics: #4 catalog_damage, #6 revenue_stream_transfer, #12 spawns_release"
];
