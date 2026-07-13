/**
 * v3 DANTE pool — content-review form definition (2026-07-12 working session).
 *
 * On-screen mirror of the authoring scratchpad hand-off files:
 *   v3-dante-authored-routine.md
 *   v3-dante-authored-major.md
 *   v3-dante-authored-reactive.md
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

export const V3_DANTE_POOL_MEETINGS: PoolReviewEntry[] = [
  {
    "id": "the_432_hz_surcharge",
    "title": "The 432 Hz Surcharge",
    "status": "pitch §3.3-1",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "requires recording_project_active · role cco · category production",
    "prompt": "The session is fighting itself. The room is tuned to commerce — 440, the frequency of impatience. I can realign it: the monitors, the instruments, the intention. It costs what it costs. Or we can keep recording an argument and calling it an album.",
    "description": "Dante wants to add a \"frequency alignment\" ritual to the active recording session — full realignment, one aligned track, or none at all.",
    "choices": [
      {
        "id": "pay_the_ritual",
        "label": "Fund the full alignment",
        "gist": "Retune everything. If the room believes, the tape believes.",
        "immediate": "money −7000, exec_mood +3",
        "delayed": "quality_bonus +3, variance_up +1",
        "outcomeSummary": "Dante realigned the whole session to 432 Hz — costly, ceremonial, and the room now hums with possibility no one can guarantee."
      },
      {
        "id": "one_aligned_track",
        "label": "One track, his way",
        "gist": "Give the ritual a single song and keep the budget honest.",
        "immediate": "money −2000, exec_mood +1",
        "delayed": "quality_bonus +2",
        "outcomeSummary": "Dante was given one track for the alignment ritual — a small tithe to the frequency, quietly paid."
      },
      {
        "id": "refuse_the_ritual",
        "label": "Record at standard tuning",
        "gist": "The artist wants to make a record, not attend a ceremony.",
        "immediate": "exec_mood −3, artist_mood +2",
        "delayed": "",
        "outcomeSummary": "Dante skipped the alignment ritual and kept the session on schedule — the artist got their room back."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (predicted)",
      "lines": [
        "loyal = refuse_the_ritual (gamble-free, protects artist mood; the paid options cost cash for banked quality it discounts); committed = one_aligned_track (2Q − spend/4000 ≈ 3.5 beats the ritual's variance-taxed ~1.3 and the refusal's 0 — it ignores artist mood); disloyal = pay_the_ritual (6·3 + 6·1 + 7 = 31, no contest). Three distinct picks — full trilemma."
      ]
    },
    "designNotes": [],
    "notes": [
      "EV check (P2): the ritual carries variance_up 1 and must out-bundle its safe sibling — quality +3 + exec_mood +3 vs the compromise's quality +2. Genuine best-EV play if you trust the session; loyal's avoidance has visible opportunity cost.",
      "Artist reaction: refusal relieves the artist (+2 — they've been sitting through tuning ceremonies); the paid options leave the artist neutral (it's Dante's time and the label's money, not theirs).",
      "No hint needed; no upgrade spec — every promise in the fiction cashes to a banked channel."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-dante-authored-routine.md"
  },
  {
    "id": "protege_producer",
    "title": "Protégé Producer",
    "status": "pitch §3.3-8 (CC tap)",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "no requires (always eligible) · role cco · category talent",
    "prompt": "There is a kid mixing demos in a storage unit in Reseda who hears the way I heard at twenty-two — before anyone taught him to hear wrong. The frequency must be passed on or it dies with its keepers. I want him in my sessions. Apprenticeships are not free. Neither was mine.",
    "description": "Dante wants label budget to formally mentor a young producer — full apprenticeship, a one-session trial, or a pass.",
    "choices": [
      {
        "id": "fund_the_apprenticeship",
        "label": "Fund the apprenticeship",
        "gist": "A year of Dante's lineage, on the label's dime.",
        "immediate": "money −8000, creative_capital +1, exec_mood +3",
        "delayed": "quality_bonus +1, award_chances +1",
        "outcomeSummary": "Dante took the young producer under his wing — a funded apprenticeship, the frequency formally passed on."
      },
      {
        "id": "one_session_trial",
        "label": "One session behind the desk",
        "gist": "Let the kid assist once. If he's real, it'll be audible.",
        "immediate": "money −3000, exec_mood +1",
        "delayed": "quality_bonus +1, artist_mood +1",
        "outcomeSummary": "Dante gave the protégé one session behind the desk — a paid trial, nothing promised."
      },
      {
        "id": "decline_the_lineage",
        "label": "Pass on the protégé",
        "gist": "The label develops artists, not producers' successors.",
        "immediate": "exec_mood −3",
        "delayed": "",
        "outcomeSummary": "Dante turned the protégé away — no apprenticeship, no cost, and he took it personally."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (predicted)",
      "lines": [
        "loyal = one_session_trial ⚑ (small spend, quality + artist mood, no gamble — but the margin over the apprenticeship's capped CC+award+quality bundle is thin; verify offline); committed = one_session_trial ⚑ (2Q − 0.75 ≈ 1.25 vs the apprenticeship's 2Q + award − spend/4 ≈ 1.0 — committed ignores CC entirely, which is what keeps the big spend from winning; thin, verify); disloyal = fund_the_apprenticeship (6·1 + 8 = 14 vs the trial's 9 — his lineage, the label's money). Two distinct picks; disloyal ≠ loyal. ⚑ both non-vice margins are thin — this meeting MUST go through the offline scorer before JSON."
      ]
    },
    "designNotes": [],
    "notes": [
      "CC discipline: grant capped at +1, and it sits on the vice choice — the player buys CC by indulging Dante, which is the intended texture for one of the pool's several small CC taps (fixes v1's single-source CC).",
      "External party (the unsigned protégé) reacts via exec_mood per the session rule; the artist reacts only on the trial (fresh energy in their session).",
      "Downside audit: apprenticeship = real cash; trial = smaller cash; decline = Dante wounded. Nothing free."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-dante-authored-routine.md"
  },
  {
    "id": "the_perfect_take_exists",
    "title": "The Perfect Take Exists",
    "status": "pitch §3.3-9",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "requires recording_project_active · role cco · category production",
    "prompt": "Take three is good. Take forty-seven is close. The perfect take exists — I have heard its outline in the room, twice. The artist wants to go home. The artist always wants to go home. This is not a scheduling question. It is a question of whether we believe the song is finished lying to us.",
    "description": "Dante wants another day chasing the definitive take; the artist is spent and wants to print what's there.",
    "choices": [
      {
        "id": "one_more_day",
        "label": "Book one more day",
        "gist": "The take exists. Pay for the room until it arrives.",
        "immediate": "money −4000, artist_energy −3, artist_mood −2, exec_mood +2",
        "delayed": "quality_bonus +3",
        "outcomeSummary": "Dante held the session an extra day chasing the perfect take — the tape got closer to true, and the artist left hollowed out."
      },
      {
        "id": "print_take_three",
        "label": "Print take three, send them home",
        "gist": "Rough edges are a kind of honesty. So is rest.",
        "immediate": "artist_mood +3, exec_mood −3",
        "delayed": "",
        "outcomeSummary": "Dante printed take three and let the artist go home — the record keeps its rough edges."
      },
      {
        "id": "comp_it_secretly",
        "label": "Comp the perfect take in secret",
        "gist": "Splice forty-seven's chorus onto three's verse. Tell no one.",
        "immediate": "exec_mood +1, rep_swing 1",
        "delayed": "quality_bonus +2",
        "outcomeSummary": "Dante comped the perfect take together from pieces — seamless, unless anyone ever hears the seams."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (predicted)",
      "lines": [
        "loyal = print_take_three (only choice that protects the artist; the extra day drains energy and mood, the comp is a gamble → −100); committed = one_more_day (2·3 − spend/4000 ≈ 5 — it discounts mood/energy entirely, so the professional and the zealot agree here: an intentional beat, the loyal read is the lonely one); disloyal = one_more_day (6·3 + 4 = 22 vs the comp's 6·2 + 6 = 18 — ~18% margin, passes the 10% bar, no hint; note for offline verify). Two distinct picks; disloyal ≠ loyal."
      ]
    },
    "designNotes": [],
    "notes": [
      "EV check: the secret comp is the tempting gamble — quality +2 for free with a credibility coin-flip attached; genuinely attractive against the paid day."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (conditional delayed leak): the comp's fiction says the risk is \"if it ever leaks\" but rep_swing resolves instantly. Today the copy frames it as an immediate credibility gamble in the studio community. A future delayed conditional event mechanism (generalize pending_side_event) would let the leak fire weeks later — log as a C-item candidate."
    ],
    "sourceFile": "v3-dante-authored-routine.md"
  },
  {
    "id": "remaster_the_debut",
    "title": "Remaster the Debut",
    "status": "pitch §3.3-11",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "requires release_out · role cco · category marketing",
    "prompt": "I listened to our first release last night, start to finish, in the dark. I finally hear what it was trying to be. It deserves to be finished — properly, now that I know how. And the timing is not sentimental: people who fall back in love with the debut show up early for whatever we do next.",
    "description": "Dante wants to remaster the label's debut release — full reissue, one keystone track folded into the next campaign, or leave the past alone.",
    "choices": [
      {
        "id": "full_remaster",
        "label": "Fund the full remaster",
        "gist": "Every track, redone to what it should have been.",
        "immediate": "money −8000, exec_mood +4",
        "delayed": "awareness_boost +2, quality_bonus +1",
        "outcomeSummary": "Dante remastered the debut front to back — the label paid for the reissue, and the renewed heat is warming up whatever comes next."
      },
      {
        "id": "keystone_track",
        "label": "Remaster the one that matters",
        "gist": "One definitive track, folded into the next release's story.",
        "immediate": "money −2000, reputation +1, artist_mood +1, exec_mood +1",
        "delayed": "awareness_boost +1",
        "outcomeSummary": "Dante remastered the debut's keystone track and folded it into the next campaign — tasteful stewardship, quietly noted."
      },
      {
        "id": "leave_it_alone",
        "label": "The debut stays as recorded",
        "gist": "First records are supposed to sound like first records.",
        "immediate": "exec_mood −3",
        "delayed": "",
        "outcomeSummary": "Dante shelved the remaster — the debut stays exactly as it was recorded."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (predicted)",
      "lines": [
        "loyal = keystone_track (small spend, rep + artist mood + awareness, no gamble); committed = keystone_track ⚑ (awareness + 2·rep − spend/4000 ≈ 2.5 vs the full remaster's 2Q + 2A − 2 ≈ 2 — thin, verify offline); disloyal = full_remaster (6·1 + 8 = 14; awareness means nothing to him — the spend and the sound do). Two distinct picks; disloyal ≠ loyal. ⚑ committed margin thin."
      ]
    },
    "designNotes": [],
    "notes": [
      "Mechanics-cash-fiction: awareness_boost banks hype for the NEXT PLANNED RELEASE, so the prompt explicitly sells the reissue as early heat for what's next — the fiction promises exactly what the engine pays. The artist reacts on the keystone option (touched he still cares about their record); the full reissue is Dante's project, not theirs."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (catalog re-release revenue): a remaster that actually re-enters the catalog and generates streams/revenue needs a re-release or catalog-modifier mechanism (spawns_release family, same C-item as Mac's Wall of Misses). Today the reissue's commercial life is fictional; only the banked hype and session lesson (quality +1 — \"hearing what it was trying to be\" carries into the next session) are real."
    ],
    "sourceFile": "v3-dante-authored-routine.md"
  },
  {
    "id": "employee_effectiveness_rewritten",
    "title": "Employee Effectiveness, Rewritten",
    "status": "pitch §3.3-12 (successor to action_1760807005433)",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "no requires (always eligible) · role cco · category production",
    "prompt": "The studio's workflow was designed by accountants and inherited like a curse. Sessions leak time the way a cracked room leaks sound. I can fix it — quickly and shallowly, properly and slowly, or completely, rebuilt around my methodology. Only one of those is free of regret, and it is not the cheap one.",
    "description": "Dante's overhaul of how the label's sessions actually run — the replacement for v1's free-lunch effectiveness meeting. Every option costs something.",
    "choices": [
      {
        "id": "quick_audit",
        "label": "The one-week audit",
        "gist": "Capture the obvious wins, keep moving. Dante will hate the pace.",
        "immediate": "creative_capital +1, exec_mood −2",
        "delayed": "quality_bonus +1",
        "outcomeSummary": "Dante rushed the process audit in a week — the obvious fixes were banked, and he made his displeasure audible."
      },
      {
        "id": "proper_rebuild",
        "label": "Take the time, do it right",
        "gist": "A deliberate rebuild of how sessions run, paid for in full.",
        "immediate": "money −4000, creative_capital +2, reputation +1, exec_mood +3",
        "delayed": "quality_bonus +1",
        "outcomeSummary": "Dante rebuilt the studio's process properly — slow, paid for, and the whole label runs quieter for it."
      },
      {
        "id": "total_methodology",
        "label": "Rebuild it around his methodology",
        "gist": "Tuning-fork arrays. Intention protocols. The full Dante.",
        "immediate": "money −8000, exec_mood +4, artist_mood −3",
        "delayed": "quality_bonus +2",
        "outcomeSummary": "Dante re-instrumented the entire studio around his own methodology — exacting, expensive, and the roster is humoring him."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (predicted)",
      "lines": [
        "loyal = proper_rebuild ⚑ (capped CC + rep + quality against a modest spend beats the audit's cheap bundle and the methodology's artist-mood hit; thin over the audit, verify); committed = proper_rebuild (2Q + 2·rep − spend/4000 ≈ 3 vs the methodology's 2·2 − 2 = 2 and the audit's 2 — committed ignores CC, which is precisely what stops the big grant from being a free win); disloyal = total_methodology (6·2 + 8 = 20 — quality plus indulgent spend, his signature). Two distinct picks; disloyal ≠ loyal. ⚑ loyal/committed margins over quick_audit are thin — offline verify."
      ]
    },
    "designNotes": [],
    "notes": [
      "Free-lunch audit (the whole point of this rewrite): the audit costs Dante's goodwill (exec_mood −2), the rebuild costs real money, the methodology costs big money AND the roster's patience (artist_mood −3, global). No choice is downside-free; v1's action_1760807005433 +5/+9 CC outlier is replaced by capped +1/+2 grants on two different choices, so CC supply in the cco lane survives at designer-cap magnitudes.",
      "Real trilemma by axis: speed-for-relational-cost vs money-for-durable-capital vs quality-indulgence-at-cash-and-mood-cost — each choice nameable in one sentence touching a different resource (P4).",
      "No hint: the vice wins its scorer outright."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-dante-authored-routine.md"
  },
  {
    "id": "forty_eight_hours_or_delete",
    "title": "Forty-Eight Hours or Delete",
    "status": "DRAFT (bible pitch 2)",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires recording_project_active · role cco",
    "prompt": "The sessions are lying to me. Forty-seven takes and not one of them is telling the truth — the room is polite, and polite is death. I have my finger on the delete key. Give me forty-eight hours of silence and an empty drive, and I will find what this record actually is. Or lock the files and admit we're manufacturing furniture.",
    "description": "Dante wants to wipe the active sessions and rebuild from silence. The takes are safe, salable — and, he says, dead.",
    "choices": [
      {
        "id": "let_the_purge_happen",
        "label": "Give him the empty drive",
        "gist": "Silence, then the rebuild. It could be the record of the year or forty-eight hours of nothing.",
        "immediate": "money −18000, artist_mood −2",
        "delayed": "quality_bonus +5, variance_up 2",
        "outcomeSummary": "Dante erased the sessions and started from silence — an expensive purge, chasing something truer."
      },
      {
        "id": "lock_the_files",
        "label": "Lock the files over his objection",
        "gist": "The takes survive. Dante calls it embalming.",
        "immediate": "exec_mood −6, artist_mood +2",
        "delayed": "quality_bonus +2",
        "outcomeSummary": "Dante stood down from the delete key and the files were locked — the takes survived, under protest."
      },
      {
        "id": "bring_in_a_referee",
        "label": "Bring in a co-producer referee",
        "gist": "A second set of ears with veto power over the veto.",
        "immediate": "money −10000, artist_mood +2, exec_mood −2",
        "delayed": "quality_bonus +3",
        "outcomeSummary": "Dante accepted a co-producer as referee — the sessions steadied, the vision shared, barely."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (predicted)",
      "lines": [
        "loyal = lock_the_files (quality + artist_mood, zero spend, no gamble); committed = lock_the_files ⚑ thin margin over the referee (≈4 vs ≈3.5 — the referee's spend just undercuts it; verify); disloyal = let_the_purge_happen (6·5 + 6·2 + 18 ≈ 60, dominant, no hint needed). 2 distinct picks — passes the Divergence Test, misses the 3-way aspiration."
      ]
    },
    "designNotes": [],
    "notes": [
      "P2 check: the purge is EV-attractive — quality +5 vs the safe siblings' +2/+3, with variance as the honest price. Artist reacts on all three (watching their takes deleted / protected / arbitrated)."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism: project-timeline delay): the purge should also push the recording project's delivery back a week — a restart that costs only money isn't a restart. When a delay_project effect exists, add it to choice 1 and soften the money hit."
    ],
    "sourceFile": "v3-dante-authored-major.md"
  },
  {
    "id": "the_aura_veto",
    "title": "The Aura Veto",
    "status": "DRAFT (bible pitch 3, upgraded routine → major per session scope)",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires artist_signed · role cco",
    "prompt": "The feature offer is real money and I am telling you no. I sat in a room with that guest for one hour and my ears rang for three days — the energy is wrong, and wrong energy prints onto tape whether you believe in it or not. Pay me in silence or overrule me in writing. Or, if you must have them: make them earn the room first.",
    "description": "Dante is vetoing a lucrative guest feature over \"bad energy.\" The check is real; so, he insists, is the aura.",
    "choices": [
      {
        "id": "respect_the_veto",
        "label": "Respect the veto",
        "gist": "The check walks. The wavelength stays pure.",
        "immediate": "exec_mood +5, artist_mood +1, self_serving_hint: true",
        "delayed": "",
        "outcomeSummary": "Dante killed the feature over the guest's energy — the check walked, the wavelength stayed pure."
      },
      {
        "id": "overrule_and_book_it",
        "label": "Overrule him, book the feature",
        "gist": "Twenty thousand dollars does not have an aura.",
        "immediate": "money +20000, exec_mood −5, artist_mood −2",
        "delayed": "awareness_boost +2, quality_bonus −3",
        "outcomeSummary": "Dante booked the feature over his own veto — the check cleared, and he mixed it like a stranger."
      },
      {
        "id": "make_them_earn_the_room",
        "label": "Writing camp first",
        "gist": "The guest earns the collaboration before the collaboration exists.",
        "immediate": "money −4000, artist_mood +3, reputation +1, exec_mood +1",
        "delayed": "quality_bonus +3",
        "outcomeSummary": "Dante ran the guest through a writing camp before the session — the collaboration earned its place."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (predicted)",
      "lines": [
        "loyal = make_them_earn_the_room ⚑ thin (≈3 vs overrule's ≈2 under the capped-money assumption — verify); committed = overrule_and_book_it (the $20k gain dominates the formula); disloyal = respect_the_veto via hint — exactly the bible flag: the veto carries no quality/variance numbers, so his scorer would numerically land on the writing camp (≈22) — the hint carries \"art over commerce.\" Three distinct picks."
      ]
    },
    "designNotes": [],
    "notes": [
      "External party (the guest / their label) reaction is expressed on the exec_mood axis per session rule; artist reacts on all three (loses the check / suffers the tense room / gets a better collaborator)."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism: grant_song / feature credit): overruling should put the guest on a real track — a feature that exists only as a mood delta undersells the fiction. When features can attach to songs, choice 2 gains a tangible-catalog payoff and the quality penalty moves onto that song, not the next session."
    ],
    "sourceFile": "v3-dante-authored-major.md"
  },
  {
    "id": "mountain_retreat",
    "title": "Mountain Retreat",
    "status": "DRAFT (bible pitch 4)",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires recording_project_active · role cco",
    "prompt": "The studio has a ceiling and the record can hear it. I found a place — nine thousand feet, no clocks, no phones, a room that was a chapel before it was a studio. Two weeks off-grid and this album stops being a product and starts being a place people will live in. Yes, I know what it costs. So does every record that ever mattered.",
    "description": "Dante wants to move the entire active session off-grid for two weeks. The chapel has a day rate.",
    "choices": [
      {
        "id": "fund_the_retreat",
        "label": "Fund the full two weeks",
        "gist": "No clocks, no ledger, all signal.",
        "immediate": "money −26000, artist_mood +4, artist_energy +2",
        "delayed": "quality_bonus +6, variance_up 1",
        "outcomeSummary": "Dante moved the whole session off-grid for two weeks — no clocks, no ledger, all signal."
      },
      {
        "id": "weekend_at_the_chapel",
        "label": "A weekend, not a fortnight",
        "gist": "A taste of altitude; sessions back by Monday.",
        "immediate": "money −10000, artist_mood +3",
        "delayed": "quality_bonus +3",
        "outcomeSummary": "Dante settled for a weekend at the chapel — a taste of altitude, sessions back by Monday."
      },
      {
        "id": "hold_the_studio",
        "label": "Keep the studio lock-in",
        "gist": "The ceiling stays. So does the schedule.",
        "immediate": "artist_energy −2, exec_mood −4",
        "delayed": "",
        "outcomeSummary": "Dante kept the sessions locked in the studio — schedule intact, windows closed, the grind continued."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (predicted)",
      "lines": [
        "loyal = weekend_at_the_chapel ⚑ thin (quality + mood barely clears the spend cap vs the free lock-in's energy drag — hinges on whether the safety scorer counts energy; verify); committed = weekend_at_the_chapel (retreat's $26k spend drags its score below the weekend's; margin ≈3.5 vs ≈2.5, also worth a verify pass); disloyal = fund_the_retreat (36 + 6 + 26 ≈ 68, dominant). 2 distinct picks."
      ]
    },
    "designNotes": [],
    "notes": [
      "P2 check: the retreat is EV-attractive — quality +6 + mood/energy vs the weekend's +3, roughly the 2× rule, variance 1 as the honest price. Artist reacts on all three."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism: session scheduling / project-week consumption): a two-week retreat should visibly occupy two project weeks (delayed delivery, no other session output) rather than being a same-week money-for-quality trade. When week-consumption exists, choice 1 gets it and the fiction stops over-promising."
    ],
    "sourceFile": "v3-dante-authored-major.md"
  },
  {
    "id": "the_pop_sellout_brief",
    "title": "The Pop Sellout Brief",
    "status": "DRAFT (bible pitch 6)",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires release_planned · role cco",
    "prompt": "The data people sent a brief. Three minutes ten, chorus inside the first twenty seconds, 'brightness target' — they wrote a brightness target for a song. This is commerce interfering with the wavelength. The artist's cut is finished and it is true. I can butcher it for radio if you order me to. I will even do it well. That's the part that should frighten you.",
    "description": "The planned single needs a radio edit, says the data. Dante calls the artist's cut finished — and true.",
    "choices": [
      {
        "id": "cut_the_radio_edit",
        "label": "Order the radio edit",
        "gist": "Three-ten, chorus first. Dante does it well, and hates it.",
        "immediate": "reputation +1, exec_mood −4, artist_mood −1",
        "delayed": "awareness_boost +4",
        "outcomeSummary": "Dante cut the radio edit under protest — three minutes ten, chorus first, wavelength be damned."
      },
      {
        "id": "ship_the_artists_cut",
        "label": "Ship the artist's cut",
        "gist": "Radio passes. Dante calls that a compliment.",
        "immediate": "exec_mood +4, artist_mood +2, self_serving_hint: true",
        "delayed": "quality_bonus +3, awareness_boost −2",
        "outcomeSummary": "Dante shipped the artist's cut untouched — radio passed on it, and he called that a compliment."
      },
      {
        "id": "release_both_versions",
        "label": "Press both versions",
        "gist": "Two truths, one budget line. Let the audience decide.",
        "immediate": "money −14000, exec_mood −1",
        "delayed": "awareness_boost +3, variance_up 1, press_story_flag 1",
        "outcomeSummary": "Dante pressed both versions and let the audience choose — two truths, one budget line."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (predicted)",
      "lines": [
        "loyal = cut_the_radio_edit (awareness +4 and rep, free, no gamble); committed = cut_the_radio_edit (awareness + rep, zero spend, dominates); disloyal = ship_the_artists_cut via hint. Answering the bible's ⚑: the artist's cut does NOT reliably win his scorer — its 6Q ≈ 18 is outscored by the both-versions option (6·variance + $14k spend ≈ 20) the moment a spend+variance sibling exists in the meeting. The hint is required and carries \"the true cut is the vice.\" 2 distinct picks."
      ]
    },
    "designNotes": [],
    "notes": [
      "Mechanics-cashing note: the artist's-cut quality_bonus lands on the NEXT recording session — the prose reads it as preserved creative trust (\"they work looser next time\"), and the awareness −2 is the real radio forfeit hitting the planned release's hype. Both-versions is the player-facing EV gamble neither band picks."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism: alternate release versions): both-versions should create a real A/B on the release (two versions, split or compounding streams) rather than an abstract variance bank. When multi-version releases exist, choice 3 becomes the flagship use."
    ],
    "sourceFile": "v3-dante-authored-major.md"
  },
  {
    "id": "sample_clearance_roulette",
    "title": "Sample Clearance Roulette",
    "status": "DRAFT (bible pitch 7)",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires recording_project_active · role cco",
    "prompt": "The spine of this album is a nineteen-second loop from a record that outsold God in 1974, and we do not own it. Clearing it costs real money and months of lawyers. The interpolation is cheaper and legal and one shade less alive — I will hear the difference every day for the rest of my life. Or we ship it as-is and find out how lucky this label is. The original frequency or nothing.",
    "description": "The album is built on an uncleared sample. Clearing is slow and pricey; interpolating is cheap and lesser; shipping is a coin flip.",
    "choices": [
      {
        "id": "clear_it_whatever_it_costs",
        "label": "Clear the original",
        "gist": "Lawyers, months, money. The frequency survives intact.",
        "immediate": "money −18000, exec_mood +3",
        "delayed": "quality_bonus +4",
        "outcomeSummary": "Dante paid what the original frequency cost — the sample cleared, the spine of the album intact."
      },
      {
        "id": "interpolate_the_hook",
        "label": "Re-cut it as an interpolation",
        "gist": "Legally spotless. One shade less alive.",
        "immediate": "money −4000, reputation +1, artist_mood +1",
        "delayed": "quality_bonus +2",
        "outcomeSummary": "Dante rebuilt the hook as an interpolation — legally spotless, one shade less alive."
      },
      {
        "id": "ship_and_pray",
        "label": "Ship it uncleared",
        "gist": "The album breathes. The label holds its own.",
        "immediate": "artist_mood −1",
        "delayed": "quality_bonus +2, variance_up 1, rep_swing 2",
        "outcomeSummary": "Dante shipped the original sample uncleared — the album breathes, and the label rolls the dice."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (predicted)",
      "lines": [
        "loyal = interpolate_the_hook ⚑ thin (small multi-key bundle at low spend barely beats clear-it's bigger quality at −$18k under the money cap — verify); committed = interpolate_the_hook (clear-it's spend and ship-and-pray's −3V both lose to the cheap clean fix); disloyal = clear_it_whatever_it_costs, NO hint needed — answering the bible's ⚑: his vice IS \"the original frequency or nothing,\" and the numbers already deliver it (6·4 + $18k ≈ 42 vs ship-and-pray's ≈ 30 vs interpolate's ≈ 16). Ship-and-pray stays the player-facing gamble, exactly as briefed. 2 distinct picks."
      ]
    },
    "designNotes": [],
    "notes": [
      "P2 check: ship-and-pray is EV-attractive — the same quality bank as the interpolation for free, plus tail upside; rep_swing is the honest exposure. Artist reacts (sweats the lawsuit)."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism: multi-week chained events): ship-and-pray should schedule a possible clearance-lawsuit side event N weeks out instead of a same-week rep_swing — the dread is the content. When chained events generalize (the escalation pipeline already hardcodes one), migrate choice 3's downside there."
    ],
    "sourceFile": "v3-dante-authored-major.md"
  },
  {
    "id": "score_offer",
    "title": "Score Offer",
    "status": "DRAFT (bible pitch 10)",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "requires release_out · role cco",
    "prompt": "A film. A real one — the director sent me forty minutes of cut footage and I heard the score before the reel ended, complete, like it had always existed. They want me for a season. I want to go the way water wants to go downhill. I am telling you this instead of just going because the record we just put out deserved a producer who stays. Decide what I am.",
    "description": "A prestige film wants Dante for a season — his transcendence, the label's absence. There's a fee, and there's a middle path.",
    "choices": [
      {
        "id": "lend_him_out",
        "label": "Lend him to the film",
        "gist": "A season of glory elsewhere. The fee is real; so is the empty chair.",
        "immediate": "money +15000, exec_mood +6, artist_mood −2, self_serving_hint: true",
        "delayed": "quality_bonus −2",
        "outcomeSummary": "Dante took the film — a season of transcendence elsewhere, the studio quieter without him."
      },
      {
        "id": "keep_the_frequency_home",
        "label": "Refuse the film",
        "gist": "The room keeps its architect. The architect sulks.",
        "immediate": "exec_mood −6, artist_mood +3",
        "delayed": "quality_bonus +2",
        "outcomeSummary": "Dante turned the film down and stayed with the roster — the room kept its architect, grudgingly."
      },
      {
        "id": "co_credit_the_label",
        "label": "Negotiate a label co-credit",
        "gist": "He scores it with the label's name beside his. Prestige, shared.",
        "immediate": "money +10000, award_chances +3, exec_mood +3",
        "delayed": "press_story_flag 1",
        "outcomeSummary": "Dante scored the film with the label's name beside his — prestige shared, absence negotiated."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (predicted)",
      "lines": [
        "loyal = co_credit_the_label (guaranteed money + award, no downside); committed = co_credit_the_label ⚑ thin (≈13 vs lend-him-out's ≈11 — the $15k fee nearly buys the committed pick; nudge the fee down or the award up if the offline run flips it); disloyal = lend_him_out via hint — exactly the bible flag: income earns his scorer nothing and the quality hit is negative, so the scorer is blind to his actual vice (HIS transcendence at the label's cost); numerically he'd land on refusing (≈12 via the quality bank). Hint required. 2 distinct picks."
      ]
    },
    "designNotes": [],
    "notes": [
      "Artist reacts on all three (loses their producer mid-cycle / keeps his undivided attention / shares him with a film). Film studio (external party) reaction rides the exec_mood axis per session rule."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism: exec absence / unavailability window): lending Dante out should make the cco lane sit out for N weeks (no meetings, no session bonuses) — that's the real cost the fiction promises. When an exec_absent effect exists, choice 1 gets it and the banked quality penalty becomes the absence itself."
    ],
    "sourceFile": "v3-dante-authored-major.md"
  },
  {
    "id": "salvage_job",
    "title": "Salvage Job",
    "status": "crisis · reactive mood_crater · role cco",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "reactive_trigger: mood_crater (URGENT — feeds escalation_cco_artist_walkout)",
    "prompt": "The record is not dead. {artistName} left the room, but the frequencies are still in the walls — I can hear where every take was going before it stopped. Give me the stems and two weeks of silence and I will finish what they cannot hear yet. Or put them back in the room with me and we crawl toward it together. Or bury it. But do not ask me to pretend the tape is not screaming.",
    "description": "{artistName}'s sessions collapsed along with their mood. Dante believes the record can still be saved — the question is who saves it, and at what cost to whom.",
    "choices": [
      {
        "id": "hand_dante_the_record",
        "label": "Hand Dante the record",
        "gist": "Stems, silence, two weeks. He finishes it his way.",
        "immediate": "money −30000, artist_mood −6",
        "delayed": "quality_bonus +7, variance_up +2",
        "outcomeSummary": "Dante took the stems into the dark and finished {artistName}'s record to his own hearing — the final cut sealed before the artist heard a note."
      },
      {
        "id": "back_in_the_room",
        "label": "Put them back in the room together",
        "gist": "Slower, gentler — Dante and {artistName} rebuild it side by side.",
        "immediate": "money −15000, artist_mood +8",
        "delayed": "quality_bonus +3",
        "outcomeSummary": "Dante brought {artistName} back into the room and they rebuilt the record together, one salvaged take at a time."
      },
      {
        "id": "bury_the_tape",
        "label": "Shelve it",
        "gist": "Write the sessions off. Some records are meant to stay unfinished.",
        "immediate": "money −25000, artist_mood +4, exec_mood −5",
        "delayed": "",
        "outcomeSummary": "The collapsed sessions were written off and shelved — Dante lit a candle for the record and locked the tapes away."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (target)",
      "lines": [
        "loyal = back in the room (mood + quality, gamble-free); committed = back in the room (best 2Q-per-dollar; hand-him scores near zero after −3V and the spend); disloyal Dante = hand him the record (6·7 + 6·2 + 30 ≈ 84 — no hint needed, huge margin). Two distinct picks (loyal = committed) — passes the Divergence Test; the trilemma axes are artist-relationship vs quality-gamble vs cut-losses."
      ]
    },
    "designNotes": [],
    "notes": [
      "EV check (P2): the vice carries roughly double the guaranteed quality of the safe sibling plus the variance kicker — a real offer, not poison. An inspired disloyal Dante can be right here.",
      "P9 neglect linkage (the design requirement): disloyal self-resolve digest line = beat one of the escalation: \"Dante took the stems into the dark and finished {artistName}'s record to his own hearing — the final cut sealed before the artist heard a note.\" → escalation event: \"Dante rebuilt the record his way; {artistName} heard it finished without them and walked.\" The −6 mood on an already-cratered artist is the mechanical foreshadow of the walkout.",
      "Artist reacts on all three choices (cut out / restored / relieved-but-orphaned); Dante's own hurt on the shelve lands in exec_mood."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism cancel_project): the shelve choice's fiction is \"the record dies,\" but mechanically it's only a cash write-off — the recording project keeps existing. A real cancel_project effect (kill the active recording project, refund nothing) would let the choice cash exactly what it promises. Log as mechanism C-item."
    ],
    "sourceFile": "v3-dante-authored-reactive.md"
  },
  {
    "id": "the_dead_room",
    "title": "The Dead Room",
    "status": "major · reactive recent_signing · role cco (INVENTED)",
    "finalized": false,
    "contentPending": false,
    "tier": "major",
    "gating": "reactive_trigger: recent_signing (URGENT — Dante-lane neglect feeds escalation_cco_artist_walkout)",
    "prompt": "I spent the night with everything {artistName} has ever recorded. All of it — the demos, the live rips, the things they think we haven't heard. There is a true voice in there, buried under decisions someone made out of fear, in a dead room, years ago. If we record them as they arrived, we press that fear onto our masters. Give me three weeks and I will strip them back to the first honest frequency. Or don't — and live with the echo.",
    "description": "The ink is barely dry and Dante has already audited the new signee's entire sonic identity — and found it guilty. First contact between his doctrine and their sound.",
    "choices": [
      {
        "id": "strip_to_first_frequency",
        "label": "Give Dante the rebuild",
        "gist": "Three weeks, a room, total sonic reconstruction before the label records a note.",
        "immediate": "money −20000, artist_mood −3",
        "delayed": "quality_bonus +5, variance_up +2",
        "outcomeSummary": "Dante set {artistName}'s old sound aside and began rebuilding it from the first frequency up, before the label pressed record."
      },
      {
        "id": "record_them_as_they_are",
        "label": "Record them as they arrived",
        "gist": "The sound got them signed. Ship on the signing heat, doctrine later.",
        "immediate": "artist_mood +5",
        "delayed": "awareness_boost +2",
        "outcomeSummary": "{artistName} was recorded exactly as signed — the sound that earned the deal, banked as heat for the debut."
      },
      {
        "id": "weekend_of_preproduction",
        "label": "Broker a weekend of pre-production",
        "gist": "Two days, both of them in the room, translation instead of demolition.",
        "immediate": "money −6000, artist_mood +2, exec_mood +2",
        "delayed": "quality_bonus +3",
        "outcomeSummary": "Dante and {artistName} spent a weekend finding the overlap between doctrine and instinct — a sharper sound, nobody bulldozed."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (target)",
      "lines": [
        "loyal = record them as they arrived (mood +5 and banked awareness, zero gamble, zero spend); committed = the weekend (2Q on a cheap ticket beats raw awareness; the rebuild dies under −3V and the spend); disloyal Dante = the rebuild (30 + 12 + 20 ≈ 62). Three distinct picks — clean trilemma. No hint needed."
      ]
    },
    "designNotes": [],
    "notes": [
      "EV check: rebuild's +5 quality + variance vs the weekend's +3 — the gamble is the best expected recording outcome on the board, priced in a new artist's trust.",
      "P9 neglect linkage: disloyal digest line (\"set {artistName}'s old sound aside and began rebuilding it from the first frequency up\") is a first-week-on-the-label variant of the walkout beat — the escalation prose \"Dante rebuilt the record his way; {artistName} heard it finished without them and walked\" reads as its direct continuation, with the sting that they walked before ever releasing anything here.",
      "Artist reacts on all three (identity overruled / affirmed / met halfway); Dante being heard lands in exec_mood on the compromise."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-dante-authored-reactive.md"
  },
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
        "immediate": "money −18000, exec_mood +6",
        "delayed": "quality_bonus +4, variance_up +1, press_story_flag 1",
        "outcomeSummary": "Dante answered the mix debate with an audiophile edition and a liner-note manifesto — the label's money spent defending his cut of {songTitle}."
      },
      {
        "id": "quiet_streaming_remaster",
        "label": "Commission a quiet streaming remaster",
        "gist": "Fix the phone-speaker complaint without a press release. Nobody has to lose.",
        "immediate": "money −5000, reputation +2, artist_mood +3, exec_mood −4",
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
        "loyal = quiet remaster (rep + artist mood, gamble-free — the artist just wants people to hear their song); committed = let the argument run (2·rep + awareness at zero spend edges the remaster's 2·rep-minus-cost) ⚑ thin margin between remaster and argument on BOTH the loyal and committed scorers — verify offline; if it collapses, raise the remaster's artist_mood or drop its cost to −$4k; disloyal Dante = the edition (24 + 6 + 18 ≈ 48, clear). Three distinct picks targeted."
      ]
    },
    "designNotes": [],
    "notes": [
      "EV check: the edition banks the biggest quality promise for the next session (doctrine emboldened) plus a press story — expensive but genuinely the richest bundle.",
      "P9 neglect linkage: disloyal digest line has Dante spending label money to defend his cut of the artist's song — the walkout escalation reads as the artist concluding whose record this ever was. Softer than the Salvage chain but compatible with the same event prose.",
      "External parties (reviewers, audiophile press) route through exec_mood and press keys, not invented mechanics; artist reacts where plausible (remaster relieves them; the manifesto is conspicuously not about them)."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (future mechanism spawns_release / catalog SKU): the audiophile edition's fiction is a physical product with margin; mechanically it's spend + banked flags. A real limited-pressing SKU (small delayed revenue stream, sellout-or-dead-stock variance) would cash the fiction. Same mechanism family as Mac's \"From the Vault\" spec — second flagship use case."
    ],
    "sourceFile": "v3-dante-authored-reactive.md"
  },
  {
    "id": "the_two_inch_truth",
    "title": "The Two-Inch Truth",
    "status": "routine · regular · role cco (INVENTED, catalog gap: recording medium/workflow fork — not the ritual surcharge, not the purge, not gear-as-excuse)",
    "finalized": false,
    "contentPending": false,
    "tier": "routine",
    "gating": "requires recording_project_active · category production",
    "prompt": "Digital forgives everything, which is why nothing recorded on it ever means anything. I found a machine — two-inch, sixteen-track, serviced by a man who only answers his phone on Thursdays. Tape does not let you lie: you commit to the take or you don't have one. I want this session printed to it. All of it. The artist will be terrified, which is the point.",
    "description": "Dante wants the current session tracked to analog tape — total commitment, no comping, no safety net. The engineer is quoting transfer costs; the artist is quoting their therapist.",
    "choices": [
      {
        "id": "all_analog_all_in",
        "label": "Print it to tape",
        "gist": "Full analog chain. One take is the take.",
        "immediate": "money −6000, exec_mood +3, artist_mood −1",
        "delayed": "quality_bonus +3, variance_up +1",
        "outcomeSummary": "The session went to two-inch tape, no safety net — every keeper take a commitment, the whole record staked on the machine."
      },
      {
        "id": "hybrid_chain",
        "label": "Track digital, print through tape",
        "gist": "The warmth without the terror — masters run through the machine at mix.",
        "immediate": "money −2000",
        "delayed": "quality_bonus +2",
        "outcomeSummary": "The session stayed digital with the masters printed through Dante's tape machine — the warmth bought, the safety net kept."
      },
      {
        "id": "keep_it_digital",
        "label": "Keep it digital, spend nothing",
        "gist": "The take matters, not the medium. Put the comfort back in the room.",
        "immediate": "artist_mood +3, artist_energy +2, exec_mood −3",
        "delayed": "",
        "outcomeSummary": "The tape machine stayed in its crate — the session kept its familiar workflow and the artist kept their nerve."
      }
    ],
    "bandPredictions": {
      "heading": "Bands (target)",
      "lines": [
        "loyal = keep it digital (artist mood + energy, zero gamble, zero spend); committed = hybrid (best guaranteed quality per dollar; full analog dies under −3V); disloyal Dante = print it to tape (18 + 6 + 6 ≈ 30). Three distinct picks. No hint needed — the variance carries his scorer past the hybrid."
      ]
    },
    "designNotes": [],
    "notes": [
      "EV check: full analog offers +3 quality + variance vs hybrid's +2 for triple the cost — attractive, honestly risky (tape's no-comping fiction IS the variance), exactly the P2 shape.",
      "Divergence axes (P4): artist comfort/energy vs cost-efficient quality vs quality-gamble-as-doctrine — each choice nameable in one sentence on a different resource.",
      "Artist reacts on the extremes (terrified by tape, restored by digital); the engineer and the Thursday tape-machine man stay flavor — their opinions land in exec_mood, not invented keys."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-dante-authored-reactive.md"
  }
];

export const V3_DANTE_POOL_LEVEL_NOTES: string[] = [
  "[v3-dante-authored-routine.md] Set-level notes for the offline divergence pass",
  "1. Zero self_serving_hints across all five — Dante's 6Q + 6V + spend/1000 finds his vice unaided in every meeting. If the offline scorer disagrees anywhere, prefer re-tuning effects over adding a hint (P6 budget says hints should be rare in this lane).",
  "2. ⚑ flagged thin margins: #8 (loyal AND committed between trial/apprenticeship), #9 (disloyal 22 vs 18), #11 (committed keystone vs full), #12 (loyal/committed vs quick_audit). #1 is the only clean three-way trilemma; the other four pass on the 2-distinct floor with disloyal always divergent.",
  "3. CC ledger for the set: +1 (Protégé, vice choice), +1/+2 (Effectiveness, non-vice choices) — all within the +1/+2 cap; two independent taps in the cco lane.",
  "4. Money ledger: all spends within routine ±$2–8k; three of five meetings have a zero-cash choice, and no meeting trades primarily in money.",
  "5. UPGRADE SPEC items to log at session wrap: conditional delayed leak (#9, generalizes pending_side_event); catalog re-release revenue (#11, shares the spawns_release C-item with Mac's Wall of Misses).",
  "[v3-dante-authored-major.md] Cross-pool notes for the divergence lint / offline verification",
  "1. Every meeting passes the minimum Divergence Test (disloyal ≠ loyal, ≥2 distinct picks). The Aura Veto is the pool's clean 3-way. Forty-Eight Hours, Retreat, Sellout, Roulette, Score Offer land at 2 distinct — acceptable per bible P1, but the ⚑ thin margins (committed on 48 Hours; loyal on Aura Veto, Retreat, Roulette; committed on Score Offer) all hinge on how the safety scorer scales spend against its ±5 cap. Run the real scorers before JSON commit and retune single coefficients, not structures.",
  "2. Hints used: 3 of 6 (Aura Veto respect, Sellout artist's-cut, Score Offer lend-out) — above the ~1-in-3 budget but each is the bible-flagged case where income/absence-of-numbers blinds the vice scorer; Roulette explicitly needs NO hint (documented above), which buys the budget back.",
  "3. Spend feeds Dante's vice scorer (+spend/1000) — every expensive option in his pool is inherently vice-adjacent. The recurring trap (found while tuning the Sellout): any spend+variance sibling outscores a pure-quality vice pick. Future Dante meetings should either keep sibling spends ≤ ~$10k when the vice is a quality play, or hint.",
  "4. All six carry the executor-voice outcome_summary, artist reactions where plausible, and external-party reactions on exec_mood, per this session's designer rules.",
  "[v3-dante-authored-reactive.md] Authoring checklist status (all four)",
  "- [x] Prompts in Dante's Bible voice; reactives aftermath-tense with {artistName}/{songTitle}, regular meeting timeless under its requires",
  "- [x] Exactly 3 choices each, distinct resource axes",
  "- [x] Magnitude tiers: crisis −$15–30k / major −$5–20k / routine −$2–6k, within band",
  "- [x] Temptations EV-attractive (vice bundles ≈ 1.5–2× safe sibling + variance)",
  "- [x] All three bands predicted per meeting; disloyal ≠ loyal everywhere; meetings 2–4 target the full 3-way split; meeting 1 is a deliberate 2-way (loyal = committed)",
  "- [x] No self_serving_hint needed anywhere — Dante's scorer finds his vice numerically in all four (margins healthy except the ⚑ noted in meeting 3's loyal/committed runner-up gap)",
  "- [x] outcome_summary on every choice: executor-voice, agency-neutral, past tense, no engine numbers",
  "- [x] P9 neglect→escalation linkage authored for all three reactives (Salvage is the canonical beat-one of escalation_cco_artist_walkout)",
  "- [x] Fiction-vs-mechanics gaps logged as UPGRADE SPECs (cancel_project; spawns_release/catalog SKU)",
  "- [x] CC untouched (no grants needed here; the cco CC tap lives in the Protégé/audit meetings)"
];
