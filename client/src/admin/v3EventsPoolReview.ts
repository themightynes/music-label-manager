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
 *
 * UPGRADED + VERDICT EVENTS AUTHORED against Engine Verbs Tier 1+2 on 2026-07-13
 * (content-integration sweep — this was the LAST authoring pass in the orchestrated
 * wave; the five meeting pools + escalations were swept first). Two changes:
 *   PART 1 — existing side-event scenarios whose old UPGRADE SPECs named a
 *     now-shipped mechanism were re-authored to the real verb (grant_song +
 *     spawn_release for the "surprise drop"/"real recording" fictions,
 *     catalog_damage for leaks/lawsuits wounding released work,
 *     transfer_revenue_stream for the masters sale, story_flag for the
 *     cross-pool industry-scandal hook). Honest scenarios were left untouched —
 *     no gratuitous verb-ification.
 *   PART 2 — the eight SCHEDULED VERDICT EVENTS that the meeting pools' new
 *     schedule_event chains point at (but which did not exist yet) are authored
 *     below as new review entries, grouped in a labeled section. Each is
 *     scheduled_only (never rolled by the weekly draw — game-engine.ts:1584
 *     excludes scheduled_only from the roll candidate pool) and pays off the
 *     fiction of its originating meeting choice.
 * Designer review (Nes) pending on both the upgrades and the verdict events.
 *
 * KEY-NAME NOTE (executive_mood vs exec_mood): on EVENT choices the canonical
 * exec-mood key is `executive_mood` (NOT `exec_mood`, which is not a canonical
 * key at all — 0 occurrences in any data file; not in LIVE_EFFECT_KEYS ∪
 * {executive_mood}), and it REQUIRES a `target_executive` sibling (events have no
 * implicit executive). Verdict events below that move an exec's mood always pair
 * `executive_mood` with the originating role's `target_executive`.
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
        "immediate": "artist_mood: -2, grant_song {quality_range:[40,65], artist:'targeted'} (one of the leaked sessions becomes a real recorded song), spawn_release {songs:'granted', type:'single', defer_weeks:1} (it ships as a genuine surprise single, ~1 week out)",
        "delayed": "variance_up: 2, press_story_flag: 1",
        "outcomeSummary": "We rebranded the leak as a surprise drop and cut a real single out of the leaked sessions — chaos, on the record, banking as an actual release for {artistName}."
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
      "UPGRADE SPEC: IMPLEMENTED THIS SWEEP (grant_song + spawn_release, 2026-07-13). \"Call it a surprise drop\" now cuts a REAL chart-eligible single out of the leaked sessions — a recorded song (quality rolled 40–65) shipped ~1 week later — instead of banking an abstract awareness number. This was the flagship event-side use case the original spec anticipated (the second after Wall of Misses' vault single). AUTHOR CAUTION for the data/events.json wiring (downstream, out of this module's scope): grant_song no-ops without a resolved targetArtistId — this event must carry event-level target:'predetermined' (or a target_artist:'predetermined' directive on this block) so {artistName} resolves; per C101, on events 'predetermined' resolves to the highest-popularity signed artist, which reads fine for \"our leaked masters.\""
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
        "immediate": "money: -3000, grant_song {title_hint:'For the Broadcast', quality_range:[55,75], artist:'targeted'} (the tribute becomes a real recorded song), spawn_release {songs:'granted', type:'single', defer_weeks:2} (released as a real one-off single ~2 weeks out)",
        "delayed": "",
        "outcomeSummary": "We countered with a studio-cut tribute for the broadcast — a considered version that becomes a real one-off single in {artistName}'s catalog, not just an appearance."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: An icon died and a television producer decided your artist belongs in the memorial broadcast. Grief, honor, and exposure arrived in one phone call the label never solicited — and the answer is due before the week is out."
    ],
    "notes": [
      "Trade axes: exposure-paid-in-exhaustion vs. nothing-gained-relationship-kept vs. small-spend-banks-craft. Routine tier — the honest small event; the graceful decline carries a real (small) return so it's a choice, not a null (P4).",
      "Fiction cashes: originally the recorded-version banked quality_bonus into the next session — serviceable, but the recording itself didn't exist as an artifact. IMPLEMENTED THIS SWEEP: the counter-offer now produces an actual one-off tribute single via grant_song + spawn_release, attached to {artistName}."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC: IMPLEMENTED THIS SWEEP (grant_song + spawn_release, 2026-07-13). The studio-cut counter-offer is now a real recorded single (\"For the Broadcast\", quality rolled 55–75) shipped ~2 weeks out instead of a banked quality_bonus with no artifact — the third logged use case for the mechanism after Wall of Misses and the leaked-masters surprise drop. AUTHOR CAUTION (downstream data/events.json wiring): grant_song needs a resolved targetArtistId — this event must carry target:'predetermined' (or target_artist:'predetermined' on the block) so {artistName} resolves; per C101 that lands on the highest-popularity signed artist."
    ],
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
        "immediate": "money −12000, catalog_damage 2 (lost masters degrade the label's released catalog — real awareness/streaming erosion, not just next-session quality)",
        "delayed": "artist_mood −4, creative_capital +1",
        "outcomeSummary": "We refused to pay and rebuilt from backups — some takes are just gone, and the released catalog wears the scars."
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
      "UPGRADE SPEC: IMPLEMENTED THIS SWEEP (catalog_damage, 2026-07-13). The rebuild now strikes the released catalog directly — catalog_damage 2 erodes the target release's awareness (and therefore ongoing streaming revenue via FinancialSystem.calculateDecayRevenue), which is the honest cost of \"some takes are just gone,\" not merely a next-session quality debit. The delayed artist_mood/creative_capital texture is unchanged. NO-OP CAVEAT (inherent to catalog_damage): if the label has nothing released yet, catalog_damage is a warn-and-skip; untargeted here, so it hits the label-wide highest-awareness release — fine for a label-archive breach. quality_bonus −2 was dropped since the real awareness hit now carries the loss."
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
        "immediate": "money +55000, transfer_revenue_stream 50 (the up-front check is the money key; this encumbers ~50% of the sold release's ongoing streaming income to the buyer for the ledger's default window)",
        "delayed": "reputation −2, artist_mood −5, award_chances −1",
        "outcomeSummary": "We sold the early masters — the war chest is real, the roster is silent, and half the release's streams now flow to the fund."
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
      "UPGRADE SPEC: IMPLEMENTED THIS SWEEP (transfer_revenue_stream, 2026-07-13). The sale now genuinely reassigns ~50% of the release's ongoing weekly streaming revenue to the buyer via flags.revenue_transfers[] for the ledger's default window — the +55000 money key is the up-front check (kept separate per §1.13, which is exactly how transfer_revenue_stream expects the price authored), and the encumbrance is the real future cost the one-shot money used to stand in for. FICTION DRIFT (flagged, not fatal): the prose sells the label's EARLIEST release, but transfer_revenue_stream targets the LATEST released release (pickLatestReleasedRelease) — mechanically it encumbers whatever release is currently biggest, not literally the first. For a single-release-era save these coincide; for a deep catalog a designer may want to soften the copy to \"a chunk of our catalog's income\" rather than \"our FIRST release.\" NO-OP CAVEAT: warn-and-skip if nothing is released."
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
        "immediate": "story_flag 'industry_scandal_active' (the leaked payola deck ignites an industry-wide values crisis — the flag the CEO pool's the_open_letter gates on)",
        "delayed": "reputation +2, press_story_flag 1, awareness_boost −1",
        "outcomeSummary": "We declined and let the pitch deck leak — righteous, the algorithm noticed, and the whole format is suddenly arguing about payola."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: the platform is selling exactly what you want, at the exact moment the press is calling it payola. The tempting wrong answer is the discount tier — half the price, and your label's name on the brochure when the story breaks."
    ],
    "notes": [
      "Mechanics discipline: the leak's awareness_boost −1 is the platform quietly deprioritizing your next release — refusal has a mechanical price, not just a halo. All three touch awareness at different signs; distinct axes are cash-for-reach / optics-for-discount / integrity-at-reach-cost.",
      "CROSS-POOL HOOK (PART 3 of the 2026-07-13 sweep): decline_and_leak now writes story_flag 'industry_scandal_active'. The CEO pool's the_open_letter (v3CeoPoolReview.ts) gates on requires:[{flag:'industry_scandal_active'}] — a payola scandal breaking IS the \"industry values crisis\" that meeting demands a public stance on. Before this sweep NOTHING wrote that flag, so the_open_letter was permanently ineligible; this leak is the producer. This is the strongest fit in the pool: an industry-wide values story (not a label-internal breach), player-triggered, and time-adjacent to the CEO stance. Chosen over event_leaked_masters (a label-internal masters breach, not an industry scandal) and the_plant_callout (about one artist, not a values crisis). CO-COMMIT NOTE for the data/events.json wiring: this flag-write and the_open_letter's flag-read must land in the same JSON commit or one side dangles."
    ],
    "upgradeSpecs": [
      "RESOLVED THIS SWEEP (story_flag): decline_and_leak stamps story_flag 'industry_scandal_active', satisfying the CEO the_open_letter cross-pool dependency (its requires gate had no producer until now). story_flag is legal in effects_immediate on events; the flag is additive JSONB (no SNAPSHOT_VERSION bump)."
    ],
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
        "immediate": "money −12000, grant_song {title_hint:'The Encore', quality_range:[60,85], artist:'targeted'} (the duet becomes a real recorded collab), spawn_release {songs:'granted', type:'single', defer_weeks:3} (ships as a real single ~3 weeks out, the legend as feature)",
        "delayed": "variance_up 1, artist_mood +4",
        "outcomeSummary": "We chased the duet and it became a real collab single with the legend on it — a genuine chart-eligible release for {artistName}, not just a session that raised the ceiling."
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
      "UPGRADE SPEC: IMPLEMENTED THIS SWEEP (grant_song + spawn_release, 2026-07-13). The duet outcome is now a real collab single (\"The Encore\", quality rolled 60–85, the legend as feature) shipped ~3 weeks out — a genuine chart-eligible, revenue-generating song row, the same mechanism as Wall of Misses' \"From the Vault.\" quality_bonus +3 was dropped in favor of the real release; variance_up 1 stays (a live legend session is a genuine wildcard). AUTHOR CAUTION (downstream data/events.json wiring): grant_song no-ops without a resolved targetArtistId — this event must carry target:'predetermined' (or target_artist:'predetermined' on the block) so {artistName} resolves; per C101 that lands on the highest-popularity signed artist, which reads correctly for \"your artist's song\" being covered."
    ],
    "sourceFile": "v3-events-authored-2.md"
  },

  // ───────────────────────────────────────────────────────────────────────────
  // SCHEDULED VERDICT EVENTS — new, chained from meeting choices (2026-07-13 sweep)
  //
  // These eight events did NOT exist before this sweep. The five meeting pools'
  // Engine-Verbs upgrade introduced schedule_event chains (§1.1 of the verb brief)
  // whose future "verdict" events were only sketched in VERDICT EVENT NEEDED notes.
  // Each event below is authored to pay off ONE originating meeting choice, keyed
  // by the exact event_id that choice's schedule_event points at.
  //
  // SHARED CONTRACT for all eight:
  //   - scheduled_only: true (in data/events.json) — game-engine.ts:1584 excludes
  //     scheduled_only AND escalation_only from the weekly-roll candidate pool, so
  //     these NEVER fire on the random draw; they land ONLY when their originating
  //     choice's schedule_event promotes them (GameEngine.promoteScheduledEvents),
  //     once due and the mandatory-crisis slot is free (escalations have absolute
  //     priority; a sustained escalation streak can defer a verdict indefinitely,
  //     never drop it — §1.1).
  //   - Artist pinning IS reliable here (unlike escalation events, C101): the
  //     scheduled_events[] queue entry carries the scheduling choice's resolved
  //     artistId, so target_artist:'predetermined' / {artistName} resolves against
  //     the SAME artist the originating meeting touched (§1.1, §2.3 contrast).
  //   - executive_mood on these EVENT choices is canonical + REQUIRES a
  //     target_executive sibling (events have no implicit exec); it is immediate-
  //     only. `exec_mood` is NOT a canonical key and is never used here.
  //   - Conditional-in-fiction outcomes ("if it stuck / if Mac won") are expressed
  //     as CHOICE STRUCTURE + variance_up, never pseudo-logic — the engine has no
  //     conditional-outcome mechanism. Each choice is a genuine label decision with
  //     real trade-offs, not a menu of predetermined rewards.
  // ───────────────────────────────────────────────────────────────────────────

  {
    "id": "scheduled_mac_3am_demo_verdict",
    "title": "The 3 AM Demo — Eight Weeks On",
    "status": "AUTHORED (2026-07-13 verdict-event sweep), pending Nes review",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "SCHEDULED-ONLY (scheduled_only: true) · chained from Mac pool → the_3am_demo → development_deal (schedule_event, defer_weeks 8) · role fiction: head_ar",
    "prompt": "Eight weeks ago you fronted a quiet development deal for the 3 AM find — a small check, studio hours, a promise to circle back. The window's closed. Mac has the tapes and, for the first time you can remember, he won't tell you what he thinks of them. 'Either the best thing I've touched all year, or eight weeks of studio time we'll never see again,' he says. 'Your call decides which.' The prospect's manager wants an answer by Friday.",
    "description": "The 3 AM development deal comes due — Mac won't call it, so the star-or-waste read is yours to make.",
    "choices": [
      {
        "id": "sign_at_premium",
        "label": "Sign them now, at the premium",
        "gist": "Bet the studio time made a star. Pay up before a major does.",
        "immediate": "money −12000, executive_mood +3, target_executive 'head_ar'",
        "delayed": "awareness_boost +2, variance_up 1",
        "outcomeSummary": "We paid the premium and signed the 3 AM find — Mac's development bet cashed, and the buzz is banking for the debut."
      },
      {
        "id": "let_it_lapse",
        "label": "Let the deal lapse",
        "gist": "The tapes didn't move you. Frame another one for the wall.",
        "immediate": "executive_mood −2, target_executive 'head_ar', story_flag 'mac_3am_miss'",
        "delayed": "",
        "outcomeSummary": "We let the development deal lapse — the money was a wash, and Mac quietly added it to the wall."
      },
      {
        "id": "keep_watching",
        "label": "Keep them developing, no ink yet",
        "gist": "Neither star nor waste. Buy another window and keep the option open.",
        "immediate": "money −3000, executive_mood +1, target_executive 'head_ar'",
        "delayed": "",
        "outcomeSummary": "We extended the development deal without signing — no windfall, no disaster, the prospect still in orbit."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: a decision you made two months ago comes back with its bill — the development window you funded has quietly closed, and the tapes are on your desk demanding a verdict you can no longer defer. The shock is deferred consequence, not external demand.",
      "VERDICT/CHAIN LOGIC: pays off Mac pool → the_3am_demo → development_deal, which fires schedule_event {event_id:'scheduled_mac_3am_demo_verdict', defer_weeks:8} and spawn_prospect. Scheduled_only — never rolled. The origin's star/fizzle/middling ambiguity is expressed as the three CHOICES (the engine can't branch on the prospect's rolled quality); variance_up on sign_at_premium carries the residual gamble that they still might not convert.",
      "story_flag 'mac_3am_miss' (on let_it_lapse) banks the miss for a future Wall-of-Misses-style callback — write-only for now, no downstream consumer authored."
    ],
    "notes": [
      "Trade axes: pay-for-the-upside (money + exec_mood, banked buzz, a gamble) vs. cut-it-loose (exec_mood cost + a logged miss) vs. keep-the-option (small spend, mild exec_mood, defer the decision). No dominant choice — the sign only pays if the read is right, and variance keeps it honest.",
      "Exec-mood routes to head_ar (Mac's own deal) via target_executive on every choice, since the prospect is unsigned and exec_mood is the reaction axis — same rationale the origin meeting used."
    ],
    "upgradeSpecs": [
      "AUTHORED THIS SWEEP to satisfy the VERDICT EVENT NEEDED note in v3MacPoolReview.ts (the_3am_demo). Needs authoring into data/events.json as scheduled_only: true with this exact id; effect keys used are all canonical (money, executive_mood + target_executive, story_flag, awareness_boost, variance_up)."
    ],
    "sourceFile": "SCHEDULED VERDICT EVENTS (2026-07-13 sweep)"
  },
  {
    "id": "scheduled_mac_machine_verdict",
    "title": "Mac vs. the Machine — The Verdict",
    "status": "AUTHORED (2026-07-13 verdict-event sweep), pending Nes review",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "SCHEDULED-ONLY (scheduled_only: true) · chained from Mac pool → machine_that_listens → stake_mac_against_it (schedule_event, defer_weeks 6) · role fiction: head_ar",
    "prompt": "Six weeks ago Mac bet his ear against the algorithm — out loud, on the record, winner keeps the budget line. The numbers are in, and they're close enough that the board is claiming the tie while Mac is claiming the win. The trades are holding a paragraph open, waiting to be told which it was. Somebody has to write the ending, and whoever writes it decides what the label is: the house that trusts its people, or the one that bought the terminal.",
    "description": "The 'Mac vs. the Machine' wager resolves — close enough that the label's framing, not the spreadsheet, decides who won.",
    "choices": [
      {
        "id": "declare_mac_won",
        "label": "Declare Mac's win, loud",
        "gist": "Put the gut on the marquee. His pick beat the model; say so where everyone hears it.",
        "immediate": "executive_mood +4, target_executive 'head_ar', story_flag 'mac_beat_the_machine'",
        "delayed": "reputation +2, press_story_flag 1",
        "outcomeSummary": "We declared Mac the winner and put it in the trades — the gut beat the model, and the whole industry read it."
      },
      {
        "id": "concede_the_board",
        "label": "Concede the board's point, license the platform",
        "gist": "Call it for the machine, buy the terminal, and manage the man in the corner office who used to own the call.",
        "immediate": "money −12000, executive_mood −5, target_executive 'head_ar'",
        "delayed": "reputation +1",
        "outcomeSummary": "We conceded to the board and licensed the platform — the label reads modern, and Mac calls the new desk the obituary desk."
      },
      {
        "id": "call_it_a_draw",
        "label": "Call it a draw, keep the rivalry",
        "gist": "Nobody wins, nobody loses, the fight rides another quarter. The cheapest ending and the least resolved.",
        "immediate": "money −1000, executive_mood +1, target_executive 'head_ar'",
        "delayed": "press_momentum +1",
        "outcomeSummary": "We called the bet a draw and let the rivalry run — no verdict, just an ongoing argument the label now owns."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: the public wager you signed off on six weeks ago just resolved on its own timeline — the trades are holding a paragraph open and not choosing IS choosing. The shock is a chained consequence detonating, not an unsolicited outside offer.",
      "VERDICT/CHAIN LOGIC: pays off Mac pool → machine_that_listens → stake_mac_against_it, which fires schedule_event {event_id:'scheduled_mac_machine_verdict', defer_weeks:6}. Scheduled_only. The origin's win/lose/draw outcomes become the three CHOICES — the engine can't branch on who 'actually' won, so the deliberately ambiguous close (origin outcome 3) is the honest frame and each choice is a legitimate label call with its own cost.",
      "story_flag 'mac_beat_the_machine' (declare_mac_won) is a forward hook for a future 'the board comes back' beat — write-only, no consumer authored."
    ],
    "notes": [
      "Trade axes: crown-the-gut (big exec_mood + rep + press, no spend, a public commitment) vs. buy-the-tool (real spend + rep-as-modern but Mac's morale craters) vs. defer (cheap, mild, unresolved). concede_the_board is the intended dark ending — the machine wins and the label pays twice, in cash and in Mac.",
      "All exec_mood routes to head_ar via target_executive — the wager is Mac's whole identity."
    ],
    "upgradeSpecs": [
      "AUTHORED THIS SWEEP to satisfy the VERDICT EVENT NEEDED note in v3MacPoolReview.ts (machine_that_listens). Needs authoring into data/events.json as scheduled_only: true. All keys canonical."
    ],
    "sourceFile": "SCHEDULED VERDICT EVENTS (2026-07-13 sweep)"
  },
  {
    "id": "scheduled_sam_comeback_verdict",
    "title": "The Comeback — Five Weeks In",
    "status": "AUTHORED (2026-07-13 verdict-event sweep), pending Nes review",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "SCHEDULED-ONLY (scheduled_only: true) · chained from Sam pool → the_comeback_client → take_it_loudly (schedule_event, defer_weeks 5) · role fiction: cmo",
    "prompt": "Five weeks ago Sam put the label's name across a canceled artist's redemption arc. It's live now, everywhere, and genuinely in the balance — half the timeline is moved to tears, half is sharpening knives, and the story hasn't decided what it is yet. The next move the label makes is the one that tips it. Sam has three drafts open and hates two of them.",
    "description": "Sam's public comeback campaign is live and unresolved — the label's next move decides whether it reads as a revival or a tar pit.",
    "choices": [
      {
        "id": "victory_lap",
        "label": "Double down — full victory lap",
        "gist": "Bet it stuck. Spend a little more and make the redemption the label's own headline.",
        "immediate": "money −5000, executive_mood +2, target_executive 'cmo'",
        "delayed": "reputation +2, press_momentum +2, artist_mood +1, variance_up 1",
        "outcomeSummary": "We doubled down on the comeback and took the victory lap — the redemption stuck, and the label's name rode it."
      },
      {
        "id": "distance_the_label",
        "label": "Quietly distance the label",
        "gist": "Read the knives. Pull the fingerprints back before the tar pit closes over the logo.",
        "immediate": "executive_mood −2, target_executive 'cmo'",
        "delayed": "reputation −1, artist_mood +1",
        "outcomeSummary": "We quietly pulled the label back from the comeback — a small bruise, and our own roster exhaled."
      },
      {
        "id": "let_it_settle",
        "label": "Say nothing, let it settle",
        "gist": "Neither claim it nor flee it. Let the cycle forget on its own schedule.",
        "immediate": "",
        "delayed": "press_momentum −1",
        "outcomeSummary": "We said nothing and let the comeback settle — it faded without incident, and so did the moment."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: the redemption arc you set in motion five weeks ago has taken on a life of its own — it's breaking wide with or without you, and your next move is the only variable left. The shock is a chained payoff, not an external party arriving.",
      "VERDICT/CHAIN LOGIC: pays off Sam pool → the_comeback_client → take_it_loudly, which fires schedule_event {event_id:'scheduled_sam_comeback_verdict', defer_weeks:5} (this replaced the origin choice's compressed rep_swing 3). Scheduled_only. The origin's stuck/tar-pit/forgotten outcomes are the three CHOICES; variance_up on victory_lap carries the tail where a public double-down still curdles.",
      "The origin note flags that take_it_loudly's band math predates the rep_swing→schedule_event swap and must be re-run — that is a data/actions.json concern, out of this module's scope; flagged here for the same JSON-commit pass."
    ],
    "notes": [
      "Trade axes: claim-the-win (small spend + rep + press + roster nod, gambled by variance) vs. hedge-the-loss (exec_mood cost + a small rep bruise, roster relief) vs. do-nothing (a quiet press decay). No dominant pick — the victory lap only pays if the arc held, which the variance keeps uncertain.",
      "exec_mood routes to cmo (Sam) via target_executive; artist_mood is the signed-roster axis (relief on the hedge, a small lift on the win)."
    ],
    "upgradeSpecs": [
      "AUTHORED THIS SWEEP to satisfy the VERDICT EVENT NEEDED note in v3SamPoolReview.ts (the_comeback_client). Needs authoring into data/events.json as scheduled_only: true. All keys canonical."
    ],
    "sourceFile": "SCHEDULED VERDICT EVENTS (2026-07-13 sweep)"
  },
  {
    "id": "scheduled_sam_documentary_release",
    "title": "The Documentary Drops",
    "status": "AUTHORED (2026-07-13 verdict-event sweep), pending Nes review",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "SCHEDULED-ONLY (scheduled_only: true) · chained from Sam pool → the_documentary_ask → full_access (schedule_event, defer_weeks 7) · role fiction: cmo",
    "prompt": "Seven weeks after Sam sold the streamer full access, the tour documentary drops — and the label finds out, at the same moment as everyone else, what actually made the cut. Episode three has the thing nobody wanted on camera. It is also the thing everyone is screenshotting. Sam is already drafting the framing; she wants to know which way to point it before the first review posts.",
    "description": "The raw tour doc ships — and what made the final cut is both the authenticity gold and the breakdown clip. Frame it.",
    "choices": [
      {
        "id": "lean_into_raw",
        "label": "Lean into the raw cut",
        "gist": "The rawness IS the story. Amplify it and let the honesty do the work — even the parts that sting.",
        "immediate": "artist_mood −1",
        "delayed": "awareness_boost +3, press_momentum +2",
        "outcomeSummary": "We leaned into the raw cut — the honesty read as authenticity, and the artist wore the exposure."
      },
      {
        "id": "damage_control",
        "label": "Damage-control the breakdown clip",
        "gist": "Spend to soften the worst scene and protect the artist — and swallow Sam's fury at burying her story.",
        "immediate": "money −8000, executive_mood −2, target_executive 'cmo'",
        "delayed": "reputation −1, artist_mood +2",
        "outcomeSummary": "We spent to bury the breakdown clip — a bruise in the coverage, but the artist knew we fought for them."
      },
      {
        "id": "let_the_doc_ride",
        "label": "Let it ride — it's furniture",
        "gist": "Say nothing. The doc is what it is; not every cut is a moment.",
        "immediate": "",
        "delayed": "press_momentum +1",
        "outcomeSummary": "We let the documentary ride untouched — competent, forgettable, gone by the next news cycle."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: the cameras you sold access to seven weeks ago shipped their cut, and you're seeing what made it at the same instant as the public — the edit was never yours to control. The shock is a deferred consequence landing, not a fresh outside pitch.",
      "VERDICT/CHAIN LOGIC: pays off Sam pool → the_documentary_ask → full_access, which fires schedule_event {event_id:'scheduled_sam_documentary_release', defer_weeks:7} (replaced the origin's rep_swing 2). Scheduled_only. The origin's authenticity/detonation/forgettable outcomes are the three CHOICES — the doc ships regardless (a fixed world event); the fork is how the label frames what aired.",
      "The origin note flags full_access's band math predates the rep_swing→schedule_event swap — data/actions.json concern, flagged for the same commit pass."
    ],
    "notes": [
      "Trade axes: amplify-the-raw (big awareness + press, artist stung by the exposure) vs. protect-the-artist (real spend + a rep bruise + Sam sour, but the roster relationship gains) vs. do-nothing (a small press bump). No dominance — leaning in trades the artist relationship for reach, damage-control trades cash and Sam's mood for the artist.",
      "exec_mood routes to cmo (Sam) via target_executive on the damage-control choice (burying her own story is the one edit she hates); artist_mood is the signed-roster axis."
    ],
    "upgradeSpecs": [
      "AUTHORED THIS SWEEP to satisfy the VERDICT EVENT NEEDED note in v3SamPoolReview.ts (the_documentary_ask). Needs authoring into data/events.json as scheduled_only: true. All keys canonical."
    ],
    "sourceFile": "SCHEDULED VERDICT EVENTS (2026-07-13 sweep)"
  },
  {
    "id": "scheduled_dante_comp_leak_verdict",
    "title": "The Seams Show",
    "status": "AUTHORED (2026-07-13 verdict-event sweep), pending Nes review",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "SCHEDULED-ONLY (scheduled_only: true) · chained from Dante pool → the_perfect_take_exists → comp_it_secretly (schedule_event, defer_weeks 5) · role fiction: cco",
    "prompt": "Word has been moving through the studio community about how 'the perfect take' actually came together — that seamless chorus that never happened in one room, spliced from a verse here and a take there. It hasn't broken wide. It could. Dante is unusually quiet about it, which is its own kind of answer. Somebody's going to ask the pointed question soon, and the label decides now whether to be ready for it.",
    "description": "The comped-take secret is circulating — get ahead of it, sit on it, or concede the seams are already the story.",
    "choices": [
      {
        "id": "own_the_craft",
        "label": "Get ahead of it — own the craft",
        "gist": "Reframe the splice as production craft before anyone frames it as a lie.",
        "immediate": "executive_mood +1, target_executive 'cco', press_story_flag 1",
        "delayed": "reputation +1",
        "outcomeSummary": "We got ahead of the comp story and sold it as craft — Dante's discretion read as skill, not deception."
      },
      {
        "id": "sit_on_it",
        "label": "Say nothing and hope it dies",
        "gist": "Give the gossip no oxygen — and carry the risk it surfaces in the next release's press cycle.",
        "immediate": "press_scrutiny_flag 1",
        "delayed": "",
        "outcomeSummary": "We sat on the comp story and let it smolder — the next release goes out under a shadow of scrutiny."
      },
      {
        "id": "concede_exposed",
        "label": "It's out — let the seams be the story",
        "gist": "The splice is public. Stop fighting it and take the hit on the record that carried it.",
        "immediate": "catalog_damage 2, target_artist 'predetermined'",
        "delayed": "reputation −1, artist_mood −1, target_artist 'predetermined'",
        "outcomeSummary": "The seams came out and we stopped denying them — the comped release took real damage, and the artist wore a vocal they never fully sang."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: a shortcut taken quietly in the studio is circulating outside it — the secret is aging into a story, and the label learns it has a decision only because someone else is about to ask the question. The shock is a deferred consequence surfacing, not an unsolicited windfall.",
      "VERDICT/CHAIN LOGIC: pays off Dante pool → the_perfect_take_exists → comp_it_secretly, which fires schedule_event {event_id:'scheduled_dante_comp_leak_verdict', defer_weeks:5} (this is the deferred consequence the origin's 'unless it ever leaks' fiction always promised, replacing an instant rep_swing). Scheduled_only. The origin's never-surfaces / noticed / fully-exposed outcomes are the three CHOICES.",
      "press_scrutiny_flag (sit_on_it) fires ONCE on the next release's press roll, scaling pickups down, then clears — the honest 'it might surface mid-cycle' cost. catalog_damage 2 (concede_exposed) erodes the comped release's awareness/streaming, routed to the originating artist via target_artist:'predetermined' (reliable here — the queue pins the scheduling choice's artistId)."
    ],
    "notes": [
      "Trade axes: pre-empt (spin it as craft — cheap reputation gain, a press story) vs. bury (no cost now, a scrutiny debt on the next release) vs. concede (the real catalog + artist hit, but the fight ends). No dominance — burying trades a future press penalty for present calm; conceding pays the whole cost at once.",
      "target_artist:'predetermined' appears in BOTH the immediate (catalog_damage) and delayed (artist_mood) blocks of concede_exposed because each block resolves its own directive independently (§2.2)."
    ],
    "upgradeSpecs": [
      "AUTHORED THIS SWEEP to satisfy the VERDICT EVENT NEEDED note in v3DantePoolReview.ts (the_perfect_take_exists). Needs authoring into data/events.json as scheduled_only: true. Uses press_scrutiny_flag + catalog_damage exactly as the origin sketch asked; all keys canonical."
    ],
    "sourceFile": "SCHEDULED VERDICT EVENTS (2026-07-13 sweep)"
  },
  {
    "id": "scheduled_dante_clearance_lawsuit_verdict",
    "title": "The Sample Comes Due",
    "status": "AUTHORED (2026-07-13 verdict-event sweep), pending Nes review",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "SCHEDULED-ONLY (scheduled_only: true) · chained from Dante pool → sample_clearance_roulette → ship_and_pray (schedule_event, defer_weeks 6) · role fiction: cco",
    "prompt": "The album shipped with the uncleared sample in it, and for a while the label got lucky. Six weeks on, the luck ran out: the rights holder's lawyers found the nineteen-second loop, and there is a letter. It is not a bluff — the 1974 record still has a publisher with a long memory and a longer legal budget. The clock on responding is short, and every option costs something.",
    "description": "The uncleared-sample gamble comes due — a rights holder's lawyers found the loop. Settle, fight, or pull the track.",
    "choices": [
      {
        "id": "settle_quiet",
        "label": "Settle fast and quiet",
        "gist": "Pay the retroactive clearance, sign the NDA, make it disappear before it's a story.",
        "immediate": "money −12000, executive_mood +1, target_executive 'cco'",
        "delayed": "",
        "outcomeSummary": "We settled the sample claim quietly — expensive, clean, and Dante's frequency stays on the record."
      },
      {
        "id": "fight_it",
        "label": "Fight it in court",
        "gist": "Cheaper up front, and a coin-flip on the verdict. Fair use is an argument, not a guarantee.",
        "immediate": "money −6000",
        "delayed": "reputation −1, variance_up 1",
        "outcomeSummary": "We fought the clearance claim in court — cheaper now, and the outcome is anyone's guess."
      },
      {
        "id": "pull_the_track",
        "label": "Pull the track, eat the loss",
        "gist": "Strip the infringing song from the release. No lawsuit, but the album loses its spine.",
        "immediate": "catalog_damage 3, target_artist 'predetermined'",
        "delayed": "artist_mood −1, target_artist 'predetermined'",
        "outcomeSummary": "We pulled the sampled track — the lawsuit died with it, and so did a piece of the album."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: the gamble shipped clean and then, six weeks on, the lawyers arrive — the consequence you deferred at mix-down lands as a legal letter with a short clock. The shock is a chained payoff, not a third party's collapse detonating your calendar.",
      "VERDICT/CHAIN LOGIC: pays off Dante pool → sample_clearance_roulette → ship_and_pray, which fires schedule_event {event_id:'scheduled_dante_clearance_lawsuit_verdict', defer_weeks:6} (the deferred dread the origin spec asked for, replacing an instant rep_swing). Scheduled_only. The origin's nothing-comes-of-it / cease-and-desist / full-lawsuit outcomes map to settle / fight / pull.",
      "catalog_damage 3 (pull_the_track) is the biggest catalog hit in the pool — the album loses its spine, routed to the originating artist via target_artist:'predetermined'. variance_up on fight_it is the litigation coin-flip."
    ],
    "notes": [
      "Trade axes: pay-it-away (real crisis money, clean exit, Dante placated) vs. litigate (cheaper, gambled on the verdict, a rep bruise either way) vs. amputate (no cash out but permanent catalog + artist damage). Crisis tier, money band −$6k to −$12k with the weight in the catalog channel — no dominance.",
      "target_artist:'predetermined' in both blocks of pull_the_track (each block resolves its own directive). exec_mood routes to cco (Dante) on the settle."
    ],
    "upgradeSpecs": [
      "AUTHORED THIS SWEEP to satisfy the VERDICT EVENT NEEDED note in v3DantePoolReview.ts (sample_clearance_roulette). Needs authoring into data/events.json as scheduled_only: true. Uses catalog_damage per the origin sketch; all keys canonical."
    ],
    "sourceFile": "SCHEDULED VERDICT EVENTS (2026-07-13 sweep)"
  },
  {
    "id": "scheduled_pat_forecast_graded",
    "title": "The Forecast, Graded",
    "status": "AUTHORED (2026-07-13 verdict-event sweep), pending Nes review",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "SCHEDULED-ONLY (scheduled_only: true) · chained from Pat pool → predict_the_quarter → publish_the_forecast (schedule_event, defer_weeks 12; also stamps story_flag 'pat_forecast_published') · role fiction: head_distribution",
    "prompt": "Twelve weeks ago Pat published the full forecast under the label's name — a number the whole industry could grade in public. The quarter's closed. The trades have the actuals now, and they land close enough to Pat's line that the story could break either way: prophet or overreach. Pat, who is never wrong, is bracing to find out if she was. How the label frames it decides the headline.",
    "description": "Pat's published forecast is graded against the real quarter — close enough that the label's spin picks the headline.",
    "choices": [
      {
        "id": "victory_lap",
        "label": "Take the victory lap — the number landed",
        "gist": "Claim the prophecy. 'The label that sees the future' is a headline you only get to write once.",
        "immediate": "executive_mood +3, target_executive 'head_distribution', press_story_flag 1",
        "delayed": "reputation +2",
        "outcomeSummary": "We took the victory lap on Pat's forecast — the number landed, and the trades printed 'the label that sees the future.'"
      },
      {
        "id": "own_the_miss",
        "label": "Own the miss publicly",
        "gist": "Concede the gap with your name on it. Honesty now, at the cost of the next number's credibility.",
        "immediate": "executive_mood −4, target_executive 'head_distribution', press_scrutiny_flag 1",
        "delayed": "reputation −1",
        "outcomeSummary": "We owned the forecast miss publicly — Pat's one public wrongness, and the next number goes out under scrutiny."
      },
      {
        "id": "bury_in_correction",
        "label": "Bury it in a quiet correction",
        "gist": "Caveat it into irrelevance. Nobody remembers a footnote — including, eventually, the win.",
        "immediate": "executive_mood +1, target_executive 'head_distribution'",
        "delayed": "reputation −1",
        "outcomeSummary": "We buried the grade in a quiet correction — no triumph, no scandal, and the model's edge kept its mystery."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: the number you published twelve weeks ago is now being graded against reality by people who didn't ask your permission — prophet or overreach is being decided in public, right now. The shock is a deferred consequence maturing, not a fresh external offer.",
      "VERDICT/CHAIN LOGIC: pays off Pat pool → predict_the_quarter → publish_the_forecast, which fires schedule_event {event_id:'scheduled_pat_forecast_graded', defer_weeks:12} and stamps story_flag 'pat_forecast_published'. Scheduled_only. The origin's within-margin / missed-badly / wash outcomes are the three CHOICES; the 12-week defer matches the fiction's 'next quarter grades it.'",
      "GATING NOTE from the origin: the verdict event should read story_flag 'pat_forecast_published' to confirm it's grading THIS forecast, not a stray — but since it is scheduled_only and only ever promoted from the publish choice, the flag is belt-and-suspenders. press_scrutiny_flag (own_the_miss) scales the next release's press down once, the mechanical cost of a public wrongness."
    ],
    "notes": [
      "Trade axes: claim-the-prophecy (exec_mood + press + rep, no spend, a public commitment) vs. confess (exec_mood crater + a scrutiny debt on the next release) vs. footnote-it (mild exec_mood, a small quiet rep decay, the edge preserved). No dominance — the victory lap risks nothing in cash but stakes credibility, and the confession's scrutiny is a real forward cost.",
      "All exec_mood routes to head_distribution (Pat) via target_executive; artist axis is deliberately absent (this is Pat's public reputation, not a roster beat)."
    ],
    "upgradeSpecs": [
      "AUTHORED THIS SWEEP to satisfy the VERDICT EVENT NEEDED note in v3PatPoolReview.ts (predict_the_quarter). Needs authoring into data/events.json as scheduled_only: true. Uses press_scrutiny_flag/press_story_flag per the origin sketch; all keys canonical."
    ],
    "sourceFile": "SCHEDULED VERDICT EVENTS (2026-07-13 sweep)"
  },
  {
    "id": "scheduled_pat_anomaly_lockin",
    "title": "The Clause Bites Back",
    "status": "AUTHORED (2026-07-13 verdict-event sweep), pending Nes review",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "SCHEDULED-ONLY (scheduled_only: true) · chained from Pat pool → the_anomaly_premium → take_the_carry_deal (schedule_event, defer_weeks 4) · role fiction: head_distribution",
    "prompt": "Four weeks ago Pat banked the anomaly-priced carry advance while the chart number was still an outlier. The number corrected — exactly as her own model said it would — and the platform's clawback lawyers just finished reading the recoupment clause she initialed. They want the delta back, or a piece of whatever comes next. Pat, for the record, is furious at herself in advance.",
    "description": "The anomaly corrected and the carry deal's recoupment clause bites — repay, fight, or let the platform take it out of the next release.",
    "choices": [
      {
        "id": "repay_delta",
        "label": "Repay the delta outright",
        "gist": "Write the check, close the clause, take the loss on the chin. Clean and expensive.",
        "immediate": "money −20000, executive_mood −2, target_executive 'head_distribution'",
        "delayed": "",
        "outcomeSummary": "We repaid the recoupment delta outright — a clean, costly exit from a deal that was too good to be true."
      },
      {
        "id": "fight_clause",
        "label": "Fight the clawback clause publicly",
        "gist": "Make the platform defend its own fine print in daylight. Costs nothing but nerve — and could cut either way.",
        "immediate": "executive_mood −5, target_executive 'head_distribution'",
        "delayed": "rep_swing 2",
        "outcomeSummary": "We fought the clawback in public — a gamble on optics that reads as savvy or as sour grapes, no telling which."
      },
      {
        "id": "let_them_recoup",
        "label": "Let them recoup from the next release",
        "gist": "No cash out now — the platform quietly takes its piece from whatever drops next, and the artist absorbs it.",
        "immediate": "",
        "delayed": "awareness_boost −3, artist_mood −4, target_artist 'predetermined'",
        "outcomeSummary": "We let the platform recoup from the next release — no bill today, and the artist quietly paid it instead."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "SHOCK LOGIC: the deal that looked free four weeks ago corrected exactly as predicted, and the fine print you initialed just became a clawback demand — the windfall's true price arrives on someone else's timeline. The shock is a chained consequence, not an unsolicited term sheet.",
      "VERDICT/CHAIN LOGIC: pays off Pat pool → the_anomaly_premium → take_the_carry_deal, which fires schedule_event {event_id:'scheduled_pat_anomaly_lockin', defer_weeks:4}. Scheduled_only. Choices are lifted near-verbatim from the origin's explicit sketch (repay −$20k / fight rep_swing + exec_mood / let-them-recoup awareness + artist_mood).",
      "The origin note also raises whether to additionally register a second head_distribution escalation event (escalation_dist_anomaly_lockin) in ESCALATION_EVENT_BY_ROLE so a NEGLECTED carry deal escalates too — that file is outside this module's scope; this schedule_event chain covers the DIRECTLY-CHOSEN path on a fixed timer regardless of loyalty. Open item for Nes."
    ],
    "notes": [
      "Trade axes: pay-it-off (big money, clean, Pat stings) vs. fight (no cash but a rep gamble + Pat furious) vs. defer-onto-the-artist (no bill now, the next release's reach and the artist's mood eat it). No dominance — the recoup path is the tempting free-today option that quietly wounds the roster (P4).",
      "exec_mood routes to head_distribution (Pat) on the two active choices; target_artist:'predetermined' on let_them_recoup routes the awareness/mood hit to the originating artist (reliable — queue-pinned)."
    ],
    "upgradeSpecs": [
      "AUTHORED THIS SWEEP to satisfy the VERDICT EVENT NEEDED note in v3PatPoolReview.ts (the_anomaly_premium). Needs authoring into data/events.json as scheduled_only: true. Uses rep_swing/awareness_boost/artist_mood per the origin sketch; all keys canonical."
    ],
    "sourceFile": "SCHEDULED VERDICT EVENTS (2026-07-13 sweep)"
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
  "- [x] UPGRADE SPECs logged where fiction exceeds mechanics: #4 catalog_damage, #6 revenue_stream_transfer, #12 spawns_release",
  "[Engine Verbs Tier 1+2 sweep, 2026-07-13 — the LAST authoring pass in the orchestrated wave]",
  "PART 1 (existing-scenario upgrades, 6 touched, all where a prior UPGRADE SPEC named a now-shipped verb): event_leaked_masters (embrace_the_leak → grant_song + spawn_release, real surprise single); event_tribute_moment (recorded_version → grant_song + spawn_release, real one-off tribute single); ransom_note (rebuild_from_backups → catalog_damage 2 on the released catalog); the_catalog_fund (sell_the_masters → transfer_revenue_stream 50, the up-front +55000 is the price key); the_arena_cover (chase_the_duet → grant_song + spawn_release, real legend collab single); the_amplify_pilot (decline_and_leak → story_flag 'industry_scandal_active', PART 3 cross-pool hook). All other 15 existing events left unchanged — honest as authored, no gratuitous verb-ification (event_sync_bidding_war, event_beta_algorithm_invite, event_festival_cancellation, event_studio_flood, event_ghostwriter_confession, event_brand_deal_strings, the_loop_deal, sampled_without_asking, takeover_tuesday, detained_abroad, the_plant_callout, twenty_four_frames, the_collab_drop, the_old_clip stand).",
  "PART 2 (8 SCHEDULED VERDICT EVENTS authored as new entries, grouped in the labeled section above): scheduled_mac_3am_demo_verdict, scheduled_mac_machine_verdict, scheduled_sam_comeback_verdict, scheduled_sam_documentary_release, scheduled_dante_comp_leak_verdict, scheduled_dante_clearance_lawsuit_verdict, scheduled_pat_forecast_graded, scheduled_pat_anomaly_lockin. Each is scheduled_only (never rolled), pays off one originating meeting choice's schedule_event chain, and expresses conditional-in-fiction outcomes as choice-structure + variance_up (no pseudo-logic). Their ids were added to EVENTS_POOL_REVIEW_MEETING_IDS in shared/api/contracts.ts in matching order (lockstep render test).",
  "PART 3 (cross-pool dependency): the CEO pool's the_open_letter gates on requires:[{flag:'industry_scandal_active'}] with no producer until now — the_amplify_pilot → decline_and_leak now writes that story_flag (the leaked payola deck IS the industry values crisis the open letter demands a stance on). The flag-write here and the CEO flag-read must land in the same data/events.json + data/actions.json commit.",
  "KEY-NAME RULING (executive_mood vs exec_mood): on EVENT choices the canonical key is executive_mood (immediate-only, REQUIRES a target_executive sibling); exec_mood is not canonical anywhere (0 occurrences in any data file). All verdict-event exec-mood effects above use executive_mood + target_executive.",
  "SCOPE NOTE: this module (and the contracts id list) is a REVIEW SURFACE — the real effect JSON is authored downstream in data/events.json (scheduled_only: true for all 8 verdict events) and data/actions.json (the meeting choices already point at these ids). The prose here is the design of record for that JSON pass."
];
