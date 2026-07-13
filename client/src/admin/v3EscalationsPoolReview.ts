/**
 * v3 ESCALATIONS pool — content-review form definition (2026-07-12 working session).
 *
 * On-screen mirror of the authoring scratchpad hand-off files:
 *   v3-escalations-authored.md
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

export const V3_ESCALATIONS_POOL_MEETINGS: PoolReviewEntry[] = [
  {
    "id": "escalation_ar_botched_signing",
    "title": "The Leaving-Fee Memo",
    "status": "Mac — KEEPS EXISTING ID",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "escalation_only: true · role_hint \"Mac (Head of A&R)\" · category industry_drama",
    "prompt": "The deal Mac closed while your door stayed shut has a leaving-fee clause on page six — triggered by exactly the kind of restructuring he agreed to on page four. The artist's manager invoked it this morning. Mac's defense, delivered without blinking: 'The ear was right. The paperwork was a formality.' The invoice on your desk says the formality has a number, and it's not small.",
    "description": "Mac dealt solo while unheard — and the memo he signed has teeth nobody counted.",
    "choices": [
      {
        "id": "pay_the_exit",
        "label": "Pay the leaving-fee, close the wound",
        "gist": "Wire it, shred it, never speak of page six again.",
        "immediate": "money −35000",
        "delayed": "",
        "outcomeSummary": "Paid the leaving-fee in full and buried the memo — expensive, quiet, and over."
      },
      {
        "id": "fight_the_clause",
        "label": "Fight the clause in the open",
        "gist": "Lawyers, filings, and the whole scene watching how the label treats its paper.",
        "immediate": "money −10000",
        "delayed": "rep_swing 2, press_momentum −1",
        "outcomeSummary": "Took the leaving-fee to lawyers in full view of the scene — the clause is contested and so is the label's name."
      },
      {
        "id": "honor_the_deal",
        "label": "Honor the signing you never wanted",
        "gist": "Keep the artist Mac chose for you; the roster does the math on whose budget shrank.",
        "immediate": "money −15000",
        "delayed": "artist_mood −6, variance_up 1",
        "outcomeSummary": "Honored Mac's signing, advance and all — the roster watched the budget move and Mac swears the ear will pay it back."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "CHAIN LOGIC: Neglect pattern — Mac's urgent talent calls (The One That Got Away / Mood-Crater Rescue / Demo Ethics) went unanswered at low loyalty, so he cut the deal himself: paid the price, signed the plan-B, papered over the problem — solo, with nobody reading the paper. The week before, the digest showed his vice pick's summary (e.g. \"Mac paid the artist's number and signed them before the ink could cool\" / \"Mac locked in the replacement while the dust was still up\"), foreshadowing that a Mac-made deal now exists that the label never vetted. This event IS that deal's fine print detonating."
    ],
    "notes": [
      "Wound axes: money-clean vs. money+rep-gamble+press vs. money+roster-mood(+a maybe). No dominance: each loses on an axis another doesn't."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (executive_mood in events): fighting the clause publicly should crater Mac's mood (his deal, litigated); when events can carry exec mood, add executive_mood: −5 to fight_the_clause."
    ],
    "sourceFile": "v3-escalations-authored.md"
  },
  {
    "id": "escalation_ar_pipeline_burned",
    "title": "Promises All Over Town",
    "status": "Mac — NEW",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "escalation_only: true · role_hint \"Mac (Head of A&R)\" · category industry_drama",
    "prompt": "Three managers had lunch and compared notes. Every one of them was holding a Mac promise — an offer, a settle-up, a 'we'll make it right' — and none of it ever turned into paper from this office. The demo pipeline that feeds this label has gone quiet overnight; two showcases 'lost' your RSVP. Mac's rationalization, verbatim: 'A promise is a placeholder. Everybody in this business knows that.' Nobody in this business knows that.",
    "description": "Mac freelanced the label's word all over the scene — and the demo pipeline just closed its door.",
    "choices": [
      {
        "id": "pay_the_make_goods",
        "label": "Make good on every promise, quietly",
        "gist": "Turn each handshake into a check before anyone else talks.",
        "immediate": "money −30000",
        "delayed": "",
        "outcomeSummary": "Made good on every promise Mac scattered across the scene — the checkbook closed what the handshakes opened."
      },
      {
        "id": "grovel_publicly",
        "label": "Repudiate the promises, own it publicly",
        "gist": "The label's word wasn't given — say so out loud and eat what that admission means.",
        "immediate": "reputation −5",
        "delayed": "press_momentum −1",
        "outcomeSummary": "Publicly walked back Mac's promises — the label's word held, but only by admitting it had been loaned out."
      },
      {
        "id": "keep_one_promise",
        "label": "Keep the one promise Mac can keep",
        "gist": "Sign the weakest of the promised acts to prove the label honors its word — and carry them.",
        "immediate": "money −18000",
        "delayed": "quality_bonus −4, artist_mood −4",
        "outcomeSummary": "Signed the one act Mac had actually promised — the scene saw the word kept, and the studio calendar felt the weight."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "CHAIN LOGIC: Neglect pattern — the OTHER way an ignored Mac fails: not one bad deal, but weeks of freelancing goodwill. Self-resolving his urgents means Mac kept moving through the scene making calls in the label's name — hushing a demo problem here, dangling a rescue signing there — commitments the label never ratified. Digest foreshadow the week before: his vice summaries read like a man writing checks (\"Mac promised the manager a real offer by Friday\", \"Mac settled it with a handshake and a number\"). This event is the scene comparing notes."
    ],
    "notes": [
      "Wound axes: pure money vs. rep+press vs. money+next-session-quality+roster-mood. Fiction cashes: quality_bonus −4 = the obligation act eats studio attention out of the next session; press_momentum −1 = trade coverage cools."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (pipeline as state): \"the demo pipeline closed\" wants a lingering scouting debuff; no such channel exists. Logged: a future talent_pipeline modifier (or story flag gating Mac's recent_signing meetings) would let this wound persist mechanically instead of resolving in one bill."
    ],
    "sourceFile": "v3-escalations-authored.md"
  },
  {
    "id": "escalation_cmo_narrative_lost",
    "title": "Two Outlets Gone Hostile",
    "status": "Sam — KEEPS EXISTING ID",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "escalation_only: true · role_hint \"Sam (CMO)\" · category industry_drama",
    "prompt": "Whatever the fire was last week, Sam fought it her way — alone, on the record, and personal. Two outlets that used to pick up your releases sight-unseen have gone from neutral to openly hostile; one editor is telling people the label 'threatens journalists now.' Sam's read, delivered while refreshing her mentions: 'They were never really with us. I just made the seating chart honest.' Your next release will walk into that seating chart.",
    "description": "Sam fought the press war solo and torched the bridges your releases walk across.",
    "choices": [
      {
        "id": "buy_the_make_goods",
        "label": "Fund the apology tour",
        "gist": "Retainers, dinners, sponsored make-goods — bridges rebuilt at rack rate.",
        "immediate": "money −30000",
        "delayed": "press_momentum +1",
        "outcomeSummary": "Funded a full make-goods tour with the hostile outlets — the bridges are rebuilt and the invoice shows every plank."
      },
      {
        "id": "offer_the_exclusive",
        "label": "Give away the next launch as a peace offering",
        "gist": "Hand the hostile outlets your artist's next story, first and free.",
        "immediate": "",
        "delayed": "awareness_boost −5, artist_mood −4",
        "outcomeSummary": "Gave the hostile outlets first claim on the artist's next launch — peace was bought with the story that was supposed to build it."
      },
      {
        "id": "ride_it_out",
        "label": "Let them stay hostile",
        "gist": "Two enemies in the press corps is survivable. Probably.",
        "immediate": "reputation −5",
        "delayed": "press_momentum −2",
        "outcomeSummary": "Let the hostile outlets stay hostile — the label wears the 'threatens journalists' line and the coverage keeps cooling."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "CHAIN LOGIC: Neglect pattern — Sam's urgent press windows (Chart Debut One Hour Window / Old Tweets Surface) self-resolved at low loyalty, which means Sam answered the press ALONE, the way disloyal Sam answers: maximum aggression, her name on the counterpunch. Digest foreshadow: her vice summaries the week before read like escalation (\"Sam went scorched-earth on the diggers and made the story about them\", \"Sam spent the moment her way and told the holdout outlets exactly what she thought of their timing\"). This event is the bill for the bridges she torched."
    ],
    "notes": [
      "Wound axes: money (with harm-reduction momentum at full price) vs. next-launch-heat+artist vs. rep+press. Fiction cashes: awareness_boost −5 = the exclusive given away is hype your next planned release never banks; artist_mood −4 = their launch story got spent as an apology."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (executive_mood): the apology tour humiliates Sam (buy_the_make_goods wants executive_mood −4 when events support it — she's watching her scorched earth get re-sodded)."
    ],
    "sourceFile": "v3-escalations-authored.md"
  },
  {
    "id": "escalation_cmo_fabricated_story",
    "title": "Directionally True",
    "status": "Sam — NEW",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "escalation_only: true · role_hint \"Sam (CMO)\" · category industry_drama",
    "prompt": "A fact-checker at a mid-size outlet spent two weeks on the label's recent press run and found the seams: a streaming figure that didn't exist when Sam quoted it, a 'sold-out' that wasn't, a partner quote the partner never said. The piece runs Friday. Sam has already annotated the draft in red: 'Every label rounds up. The story needed a number, so I gave it one. Directionally, all of it is true.' Directionally, you are now the label that makes things up.",
    "description": "Sam kept the story alive with facts that weren't — and a fact-checker found every seam.",
    "choices": [
      {
        "id": "full_retraction",
        "label": "Correct the record yourselves, first",
        "gist": "Publish the corrections before Friday and own every rounded number.",
        "immediate": "reputation −6",
        "delayed": "press_momentum −1",
        "outcomeSummary": "Corrected the record before the story ran — the label called its own numbers wrong so nobody else got to."
      },
      {
        "id": "pay_the_audit",
        "label": "Commission an outside audit and paid corrections",
        "gist": "An independent firm re-counts everything; the corrections run with receipts.",
        "immediate": "money −35000",
        "delayed": "reputation −2",
        "outcomeSummary": "Paid an outside firm to audit every claim and run corrections with receipts — credibility bought back at consultant rates."
      },
      {
        "id": "stand_by_the_story",
        "label": "Let Sam stand by every word",
        "gist": "She says the checker folds if nobody blinks. She's been right before.",
        "immediate": "",
        "delayed": "rep_swing 3, artist_mood −5",
        "outcomeSummary": "Stood by every word of Sam's version — either the fact-checker folds or the label does, and the artist hates being the face of the math either way."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "CHAIN LOGIC: Neglect pattern — the other disloyal-Sam failure: not aggression, invention. Left to answer her urgents alone, Sam kept the narrative alive by seeding stories with details that didn't exist yet — numbers rounded up, milestones pre-dated, quotes 'reconstructed.' Digest foreshadow: her vice summaries read like a storyteller outrunning the facts (\"Sam spent big and told the trades the moment was bigger than it was\", \"Sam got ahead of the story with a version of events the room hadn't agreed on\"). This event is a fact-checker pulling the one thread that unravels the sweater."
    ],
    "notes": [
      "Wound axes: rep-now (controlled) vs. money (rep mostly saved) vs. all-in gamble + artist. rep_swing 3 is the risk-wound: the roll IS the cost. artist_mood −5 cashes the fiction that the invented numbers were pinned to the artist's success.",
      "No-dominance check: full_retraction beats pay_the_audit on money but loses on rep; stand_by_the_story risks the most and hurts the artist. Clean."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (press flag as liability): \"the corrected outlet remembers\" wants a negative press flag on the next release; press_story_flag is positive-only. Logged for a future press_scrutiny_flag (next release gets extra fact-checking friction)."
    ],
    "sourceFile": "v3-escalations-authored.md"
  },
  {
    "id": "escalation_cco_artist_walkout",
    "title": "Finished Without Them",
    "status": "Dante — KEEPS EXISTING ID",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "escalation_only: true · role_hint \"Dante (CCO)\" · category artist_personal",
    "prompt": "Your artist asked to hear the sessions and got played a finished record — finished by Dante, rebuilt from the stems up, every choice theirs replaced by a choice of his. They put their laminate on the console and walked. Dante hasn't stopped mixing. His explanation, over the monitors: 'The record knows what it wants to be. They were standing between it and itself. Someone had to step aside, and it wasn't going to be the record.'",
    "description": "Dante rebuilt the record his way; the artist heard it finished without them and walked.",
    "choices": [
      {
        "id": "beg_them_back",
        "label": "Give the artist the record back",
        "gist": "Re-cut it their way, control returned, Dante's version struck.",
        "immediate": "money −15000",
        "delayed": "artist_mood +8, quality_bonus −5",
        "outcomeSummary": "Gave the artist their record back and paid to re-cut it their way — the relationship came home, Dante's version didn't."
      },
      {
        "id": "release_dantes_cut",
        "label": "Keep Dante's cut",
        "gist": "It IS better. It's also not theirs, and everyone will know how it got made.",
        "immediate": "reputation −3",
        "delayed": "quality_bonus +4, artist_mood −12",
        "outcomeSummary": "Kept Dante's rebuild as the record of record — the sound won, the artist lost, and the story of how is already out."
      },
      {
        "id": "shelve_everything",
        "label": "Shelve both versions",
        "gist": "Nobody gets the record. Write it all off and start clean someday.",
        "immediate": "money −40000, creative_capital −2",
        "delayed": "artist_mood +3",
        "outcomeSummary": "Shelved both versions and wrote the whole record off — nobody won, which was the only outcome everyone could live with."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "CHAIN LOGIC: Neglect pattern — Dante's urgent creative crises (Salvage Job + the new reactives) self-resolved at low loyalty, which means Dante resolved them the disloyal-Dante way: he took the work. Rebuilt the record to his own frequency, artist optional. Digest foreshadow: his vice summaries the week before read like a door closing (\"Dante took the record home and rebuilt it from the stems up\", \"Dante kept cutting after everyone else stopped believing\"). This event is the artist hearing the finished thing they weren't in the room for."
    ],
    "notes": [
      "Wound axes: money+the-record-regresses (relationship saved) vs. rep+relationship-crater (the sound saved) vs. huge money+CC write-off (dignity saved). The quality_bonus +4 on Dante's cut is the classic all-cost trap: the \"gain\" costs the artist relationship at crisis magnitude — no silver lining, a wound with good acoustics."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC ({artistName} in escalations): this prompt lands hardest naming the artist; the pending_side_event pipeline carries no reactiveContext. Logged: thread the flagged week's artist id through the escalation flag so escalation prose can interpolate like reactive meetings do."
    ],
    "sourceFile": "v3-escalations-authored.md"
  },
  {
    "id": "escalation_cco_erased_masters",
    "title": "The Sessions Weren't True",
    "status": "Dante — NEW",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "escalation_only: true · role_hint \"Dante (CCO)\" · category technical_problems",
    "prompt": "The engineer opened the session folder Monday and found silence where six weeks of takes used to be. Dante wiped them — deliberately, methodically, safeties included. 'The sessions weren't true,' he says, calm as a lake. 'You can't release a lie. I saved this label from putting one out.' The studio invoices for those six weeks are, unfortunately, still extremely true, and the release calendar behind them is now a fiction of its own.",
    "description": "Dante erased six weeks of masters as an act of artistic mercy nobody asked for.",
    "choices": [
      {
        "id": "pay_to_reconstruct",
        "label": "Reconstruct everything",
        "gist": "Forensic recovery, session players, and every hour re-cut at rush rates.",
        "immediate": "money −45000",
        "delayed": "artist_energy −4",
        "outcomeSummary": "Paid to reconstruct six weeks of erased sessions at rush rates — the record survived, the artist is running on fumes."
      },
      {
        "id": "salvage_the_fragments",
        "label": "Comp what survived, rush the gaps",
        "gist": "Build from the scraps on the artist's phone and the rough bounces — fast, thin, done.",
        "immediate": "money −8000",
        "delayed": "quality_bonus −6, awareness_boost −3",
        "outcomeSummary": "Salvaged the record from rough bounces and phone demos — it will exist on schedule, and it will sound like what it is."
      },
      {
        "id": "fund_the_rebuild",
        "label": "Let Dante rebuild from silence",
        "gist": "He erased it; let him replace it. His vision, your money, nobody's guarantees.",
        "immediate": "money −25000",
        "delayed": "variance_up 2, artist_mood −6",
        "outcomeSummary": "Funded Dante's rebuild from silence — his vision, the label's money, and an artist watching their record become his."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "CHAIN LOGIC: Neglect pattern — the other disloyal-Dante failure: destruction as purification. Ignored through his urgents, Dante decided the accumulated sessions were the problem — 'documents of a lie' — and erased them: drives wiped, takes recorded over, safety copies 'consolidated.' Digest foreshadow: his vice summaries read like a man burning lumber to warm the house (\"Dante struck the takes that were poisoning the well\", \"Dante started the record over from silence — again\"). This event is the morning someone opens the session folder."
    ],
    "notes": [
      "Wound axes: max money+artist-exhaustion vs. cheap+quality-crater+launch-heat vs. mid money+risk+relationship. Fiction cashes: artist_energy −4 = the re-cut grind; quality_bonus −6 banks into the rushed salvage sessions; awareness_boost −3 = the limping campaign around a thin release; variance_up 2 = Dante's rebuild could be transcendent or nothing.",
      "No-dominance check: cheapest option craters quality AND launch; the money options split on certainty vs. risk. Clean."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (executive_mood): pay_to_reconstruct resurrects the 'lie' over Dante's objection — wants executive_mood −5 when events support it."
    ],
    "sourceFile": "v3-escalations-authored.md"
  },
  {
    "id": "escalation_dist_deal_collapsed",
    "title": "The Term Sheet Expired",
    "status": "Pat — KEEPS EXISTING ID",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "escalation_only: true · role_hint \"Pat (Head of Distribution)\" · category business_opportunities",
    "prompt": "The platform pulled the term sheet Tuesday. Pat was on revision fourteen of the projection model when it happened — she can show you the model, it's genuinely excellent, and it now projects a deal that no longer exists. Worse: the platform's BD lead told two trade reporters why they walked, and the quote — 'some partners can't say yes' — is already doing the rounds. Pat's assessment: 'The market moved irrationally. My process was sound.' The process was sound. The deal is gone.",
    "description": "Pat modeled the platform deal to death — the term sheet expired and the trades know why.",
    "choices": [
      {
        "id": "crawl_back",
        "label": "Crawl back for worse terms",
        "gist": "Reopen the door at whatever number makes them forget Tuesday.",
        "immediate": "money −25000",
        "delayed": "awareness_boost −3",
        "outcomeSummary": "Reopened the platform deal at penance rates — worse terms, weaker placement, and everyone at the table knew who blinked."
      },
      {
        "id": "pivot_to_rival",
        "label": "Take it to the rival platform",
        "gist": "Start over with the competitor — new terms, no history, no certainty either.",
        "immediate": "money −12000",
        "delayed": "variance_up 2, press_momentum −1",
        "outcomeSummary": "Took the release to the rival platform mid-scramble — a fresh deal with no track record, closed while the trades narrated."
      },
      {
        "id": "spin_independence",
        "label": "Spin it: the label chose independence",
        "gist": "No window at all — sell the walk-away as principle and pray the story holds.",
        "immediate": "",
        "delayed": "rep_swing 2, press_story_flag 1, awareness_boost −4",
        "outcomeSummary": "Declared the collapsed deal a choice and sold independence as the story — the next release goes out with a narrative instead of a window."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "CHAIN LOGIC: Neglect pattern — Pat's urgent platform windows (The Algorithm Change + the new reactive) self-resolved at low loyalty, which means Pat responded the disloyal-Pat way: hold, model, wait for certainty. Digest foreshadow: her vice summaries the week before read like a spreadsheet breathing (\"Pat held position and gathered another week of data\", \"Pat ran the models again rather than move on an unverified number\"). This event is the window closing while the models converged."
    ],
    "notes": [
      "Wound axes: money+reach (certainty bought back at a markup) vs. money+risk+press vs. no-window-at-all+rep-gamble (the press_story_flag is the harm-reduction: a story banked to partially dress the wound, at the price of the biggest awareness hole and a rep roll). Every option damages the release's reach differently — the wound IS distribution.",
      "No-dominance check: spin_independence is free in cash but worst in reach and adds a gamble; the paid options split certainty vs. upside. Clean."
    ],
    "upgradeSpecs": [],
    "sourceFile": "v3-escalations-authored.md"
  },
  {
    "id": "escalation_dist_royalty_freeze",
    "title": "Statistically Immaterial",
    "status": "Pat — NEW",
    "finalized": false,
    "contentPending": false,
    "tier": "crisis",
    "gating": "escalation_only: true · role_hint \"Pat (Head of Distribution)\" · category business_opportunities",
    "prompt": "A distributor statement found its way to your artists' business managers, and the line items don't match the checks. For a full quarter, Pat has been sitting on a royalty discrepancy — the artists' side of it — in a reconciliation account, pending her audit. Her memo, when confronted, is a masterpiece of the genre: 'The variance was statistically immaterial at the portfolio level and disbursement prior to verification would have been procedurally unsound.' The roster group chat has a different word for it, and the word is 'stolen.'",
    "description": "Pat froze the roster's royalty discrepancy for a quarter as 'statistically immaterial' — and the statement leaked.",
    "choices": [
      {
        "id": "pay_with_interest",
        "label": "Back-pay everything, with interest and apology",
        "gist": "Every artist made whole plus a goodwill premium, checks out this week.",
        "immediate": "money −30000",
        "delayed": "artist_mood +2",
        "outcomeSummary": "Back-paid every frozen royalty with interest and a written apology — expensive, immediate, and the only version of sorry that cashes."
      },
      {
        "id": "pay_flat_defend_process",
        "label": "Pay what's owed, stand by the process",
        "gist": "Exact amounts, no premium, and Pat's memo published as the label's official position.",
        "immediate": "money −15000",
        "delayed": "artist_mood −8, press_momentum −1",
        "outcomeSummary": "Paid the frozen royalties to the penny and published Pat's memo as policy — the roster read the word 'immaterial' about their own money."
      },
      {
        "id": "freeze_for_forensics",
        "label": "Freeze everything for an outside forensic audit",
        "gist": "Nobody gets paid until an independent firm rules — clean hands, cold checks.",
        "immediate": "money −20000, creative_capital −2",
        "delayed": "artist_mood −4",
        "outcomeSummary": "Froze all disputed royalties pending an outside forensic audit — procedurally spotless, and the roster kept waiting on their own money."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "CHAIN LOGIC: Neglect pattern — the other disloyal-Pat failure: quiet unilateral bookkeeping. Ignored through her urgents, Pat kept the machine running her way — and when a payout discrepancy surfaced in the label's favor, she classified it 'statistically immaterial,' parked the artists' share in a holding line, and let her audit run for a quarter. Digest foreshadow: her vice summaries read like footnotes (\"Pat held the variance in a reconciliation account pending review\", \"Pat took the guaranteed number and filed the rest for later\"). This event is a distributor statement leaking to the roster's business managers."
    ],
    "notes": [
      "Wound axes: max money (relationship partially repaired — harm reduction at full price) vs. cheap+roster-crater+press vs. mid money+CC+prolonged-mood. creative_capital −2 cashes the fiction: a label lawyering its own artists burns creative credibility.",
      "No-dominance check: the cheap option wounds mood at crisis depth; the CC option costs less mood but real CC and still money. Clean."
    ],
    "upgradeSpecs": [
      "UPGRADE SPEC (per-artist targeting): \"the shorted artists specifically\" wants targeted artist_mood rather than global; events apply mood globally when untargeted. Acceptable here (the whole roster read the statement), but logged alongside the {artistName} threading item in event #5."
    ],
    "sourceFile": "v3-escalations-authored.md"
  }
];

export const V3_ESCALATIONS_POOL_LEVEL_NOTES: string[] = [
  "[v3-escalations-authored.md] Cross-set verification checklist (run before JSON commit)",
  "- [ ] Dominance lint offline: within each event, no choice weakly-dominates a sibling on every touched key (spot-checked above; the lint is the authority).",
  "- [ ] Effect keys all canonical: only money, reputation, creative_capital, artist_mood, artist_energy, press_momentum, press_story_flag, quality_bonus, awareness_boost, variance_up, rep_swing used. No executive_mood (events path doesn't read it — UPGRADE SPECs logged in #1, #3, #6). No negative press_story_flag anywhere.",
  "- [ ] escalation_only: true on all 8; all 8 ids present in ESCALATION_EVENT_BY_ROLE mapping (the map must grow from 1 → 2 per role, or gain a picker — engine change required: today the map is role → single event id; two-per-role needs either an array + seeded/alternating pick, ideally \"not the one you saw last\"). The events-lint enforces escalation-only ↔ map membership in both directions — update the lint expectation with the map.",
  "- [ ] Qualitative copy: no engine numbers in any prompt/label/summary (dollar figures in fiction OK — none used in player copy above; all magnitudes live in effect bags).",
  "- [ ] Sam pronoun decision (she/her per bible vs. v1 stub's \"him\") confirmed with Nes and consistent across all v3 Sam content.",
  "- [ ] CC costs within crisis band (−2 max used, at the shelve/audit choices only).",
  "[v3-escalations-authored.md] UPGRADE SPEC summary (log as C-items at session wrap)",
  "1. Two escalations per role — ESCALATION_EVENT_BY_ROLE currently maps role → one event id; needs role → [ids] + a pick rule (\"not the last one seen\" preferred, seeded otherwise). Blocking for this content to ship as designed.",
  "2. executive_mood in the event path — several escalation choices want to wound/soothe the offending exec (#1 fight_the_clause, #3 buy_the_make_goods, #6 pay_to_reconstruct).",
  "3. Artist context threading — carry the flagged week's artist id through pending_side_event so escalation prose can interpolate {artistName} like reactive meetings (#5, #8).",
  "4. Negative press flag (press_scrutiny_flag) — \"the corrected outlet fact-checks your next release\" (#4).",
  "5. Persistent pipeline debuff / story flag — \"the demo pipeline closed\" wants a lingering scouting consequence (#2)."
];
