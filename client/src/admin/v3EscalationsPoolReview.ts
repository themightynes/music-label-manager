/**
 * v3 ESCALATIONS pool — content-review form definition (2026-07-12 working session).
 *
 * On-screen mirror of the authoring scratchpad hand-off files:
 *   v3-escalations-authored.md
 * The authored PLAYER copy (prompts, labels, gists, outcome summaries) is carried
 * VERBATIM — designer-facing text under review, so no editorializing, no silent
 * typo fixes. Markdown emphasis markers (** / backticks / *) are dropped as
 * formatting; the words, numbers, ⚑ flags and effect values are preserved exactly.
 *
 * ENGINE-VERBS UPGRADE PASS — 2026-07-13 (this sweep), designer-review pending.
 * Upgraded against Engine Verbs Tier 1+2 (13 new effect keys + M13 target_executive
 * exec-mood routing + M14 target_artist + M16 requires + M12b escalation router
 * arrays). Two changes to the effect RENDERINGS in this pass (player copy untouched):
 *   1. "Escalations get their exec-mood wounds" (prior session's intent): every
 *      escalation now moves the RESPONSIBLE exec's mood via target_executive — a
 *      WOUND on the choices that override / litigate / repudiate the exec, and (its
 *      natural counterpart) relief on the choice that BACKS the exec's play. This is
 *      a design PROPOSAL surfaced for review, not committed JSON — dial to
 *      wounds-only if preferred. Only executive_mood is authorable; loyalty is NOT
 *      an effect key (it moves through the delegation engine, not content).
 *   2. UPGRADE SPEC lines that pointed at then-unavailable channels are resolved
 *      where the verb now ships (executive_mood via target_executive → #1/#3/#6/#8;
 *      press_scrutiny_flag → #4) and left LOGGED where still deferred ({artistName}
 *      escalation threading = C101, pipeline/talent-scouting debuff, per-artist mood).
 * The four "NEW" second-per-archetype events (#2/#4/#6/#8) remain review-only: landing
 * any of them in data/events.json ALSO requires appending its id to the singleton
 * ESCALATION_EVENT_BY_ROLE[<role>] array in shared/utils/executiveDelegation.ts —
 * flagged as the integration step in each entry's notes, NOT done here.
 *
 * NOTE ON NUMBERS: this is an ADMIN review surface, not a player surface — raw
 * effect values (and effect/targeting keys) are shown here deliberately so the
 * designer can review them.
 *
 * The actual JSON edit (data/events.json) happens on designer sign-off; this module
 * is presentation/tracking only.
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
        "immediate": "money −10000, executive_mood −5 (target_executive: head_ar)",
        "delayed": "rep_swing 2, press_momentum −1",
        "outcomeSummary": "Took the leaving-fee to lawyers in full view of the scene — the clause is contested and so is the label's name."
      },
      {
        "id": "honor_the_deal",
        "label": "Honor the signing you never wanted",
        "gist": "Keep the artist Mac chose for you; the roster does the math on whose budget shrank.",
        "immediate": "money −15000, executive_mood +4 (target_executive: head_ar)",
        "delayed": "artist_mood −6, variance_up 1",
        "outcomeSummary": "Honored Mac's signing, advance and all — the roster watched the budget move and Mac swears the ear will pay it back."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "CHAIN LOGIC: Neglect pattern — Mac's urgent talent calls (The One That Got Away / Mood-Crater Rescue / Demo Ethics) went unanswered at low loyalty, so he cut the deal himself: paid the price, signed the plan-B, papered over the problem — solo, with nobody reading the paper. The week before, the digest showed his vice pick's summary (e.g. \"Mac paid the artist's number and signed them before the ink could cool\" / \"Mac locked in the replacement while the dust was still up\"), foreshadowing that a Mac-made deal now exists that the label never vetted. This event IS that deal's fine print detonating."
    ],
    "notes": [
      "Wound axes: money-clean vs. money+exec-wound+rep-gamble+press vs. money+exec-relief+roster-mood(+a maybe). No dominance: each loses on an axis another doesn't (fight adds executive_mood −5; honor adds executive_mood +4 — the exec channel is now a live axis, not a tie-breaker)."
    ],
    "upgradeSpecs": [
      "RESOLVED (M13 target_executive): fight_the_clause now carries executive_mood −5 (target_executive head_ar) — his deal, litigated in the open, craters Mac. Its counterpart: honor_the_deal carries executive_mood +4 (target_executive head_ar) — keeping the artist Mac chose vindicates the ear. pay_the_exit stays exec-neutral (silent burial, the money-clean axis). executive_mood is immediate-only on event choices; loyalty is not authorable. Integration: these ride effects_immediate on JSON commit."
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
        "immediate": "money −30000, executive_mood +3 (target_executive: head_ar)",
        "delayed": "",
        "outcomeSummary": "Made good on every promise Mac scattered across the scene — the checkbook closed what the handshakes opened."
      },
      {
        "id": "grovel_publicly",
        "label": "Repudiate the promises, own it publicly",
        "gist": "The label's word wasn't given — say so out loud and eat what that admission means.",
        "immediate": "reputation −5, executive_mood −6 (target_executive: head_ar)",
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
      "Wound axes: money+exec-relief vs. rep+press+exec-wound vs. money+next-session-quality+roster-mood. Fiction cashes: quality_bonus −4 = the obligation act eats studio attention out of the next session; press_momentum −1 = trade coverage cools. Exec channel: pay_the_make_goods executive_mood +3 (the boss made his word good — Mac feels backed); grovel_publicly executive_mood −6 (the label announced his word was never real). keep_one_promise stays exec-neutral (partial keep, the roster-cost axis).",
      "INTEGRATION (new second-per-archetype event): landing escalation_ar_pipeline_burned in data/events.json also requires appending 'escalation_ar_pipeline_burned' to ESCALATION_EVENT_BY_ROLE.head_ar in shared/utils/executiveDelegation.ts (today a singleton ['escalation_ar_botched_signing']) and updating the events-lint escalation-only↔map expectation. pickEscalationEventId already routes multi-event arrays; escalation_only: true keeps it out of the weekly roll."
    ],
    "upgradeSpecs": [
      "STILL DEFERRED (pipeline as state): \"the demo pipeline closed\" wants a lingering scouting debuff; no such channel shipped in Engine Verbs Tier 1+2. Logged: a future talent_pipeline modifier (or a story_flag gating Mac's recent_signing meetings via the M16 requires grammar — story_flag IS now live, so a persistent-flag stopgap is expressible even if the scouting-throttle read-side is not). Wound currently resolves in one bill + the exec-mood hit."
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
        "immediate": "money −30000, executive_mood −4 (target_executive: cmo)",
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
        "immediate": "reputation −5, executive_mood +3 (target_executive: cmo)",
        "delayed": "press_momentum −2",
        "outcomeSummary": "Let the hostile outlets stay hostile — the label wears the 'threatens journalists' line and the coverage keeps cooling."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "CHAIN LOGIC: Neglect pattern — Sam's urgent press windows (Chart Debut One Hour Window / Old Tweets Surface) self-resolved at low loyalty, which means Sam answered the press ALONE, the way disloyal Sam answers: maximum aggression, her name on the counterpunch. Digest foreshadow: her vice summaries the week before read like escalation (\"Sam went scorched-earth on the diggers and made the story about them\", \"Sam spent the moment her way and told the holdout outlets exactly what she thought of their timing\"). This event is the bill for the bridges she torched."
    ],
    "notes": [
      "Wound axes: money+exec-wound (harm-reduction momentum at full price) vs. next-launch-heat+artist vs. rep+press+exec-relief. Fiction cashes: awareness_boost −5 = the exclusive given away is hype your next planned release never banks; artist_mood −4 = their launch story got spent as an apology. Exec channel: buy_the_make_goods executive_mood −4 (the apology tour re-sods her scorched earth in front of her); ride_it_out executive_mood +3 (holding her line vindicates the read — \"they were never with us\"). offer_the_exclusive stays exec-neutral (the artist-cost axis)."
    ],
    "upgradeSpecs": [
      "RESOLVED (M13 target_executive): buy_the_make_goods now carries executive_mood −4 (target_executive cmo) — the apology tour humiliates Sam. Counterpart: ride_it_out carries executive_mood +3 (target_executive cmo) — the player backs her read. Immediate-only. Integration: rides effects_immediate on JSON commit."
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
        "immediate": "reputation −6, executive_mood −5 (target_executive: cmo), press_scrutiny_flag 1",
        "delayed": "press_momentum −1",
        "outcomeSummary": "Corrected the record before the story ran — the label called its own numbers wrong so nobody else got to."
      },
      {
        "id": "pay_the_audit",
        "label": "Commission an outside audit and paid corrections",
        "gist": "An independent firm re-counts everything; the corrections run with receipts.",
        "immediate": "money −35000, executive_mood −3 (target_executive: cmo)",
        "delayed": "reputation −2",
        "outcomeSummary": "Paid an outside firm to audit every claim and run corrections with receipts — credibility bought back at consultant rates."
      },
      {
        "id": "stand_by_the_story",
        "label": "Let Sam stand by every word",
        "gist": "She says the checker folds if nobody blinks. She's been right before.",
        "immediate": "executive_mood +4 (target_executive: cmo)",
        "delayed": "rep_swing 3, artist_mood −5",
        "outcomeSummary": "Stood by every word of Sam's version — either the fact-checker folds or the label does, and the artist hates being the face of the math either way."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "CHAIN LOGIC: Neglect pattern — the other disloyal-Sam failure: not aggression, invention. Left to answer her urgents alone, Sam kept the narrative alive by seeding stories with details that didn't exist yet — numbers rounded up, milestones pre-dated, quotes 'reconstructed.' Digest foreshadow: her vice summaries read like a storyteller outrunning the facts (\"Sam spent big and told the trades the moment was bigger than it was\", \"Sam got ahead of the story with a version of events the room hadn't agreed on\"). This event is a fact-checker pulling the one thread that unravels the sweater."
    ],
    "notes": [
      "Wound axes: rep-now+exec-wound+lingering-scrutiny (controlled) vs. money+exec-wound (rep mostly saved) vs. all-in gamble + artist + exec-relief. rep_swing 3 is the risk-wound: the roll IS the cost. artist_mood −5 cashes the fiction that the invented numbers were pinned to the artist's success. Exec channel: full_retraction executive_mood −5 (the label publicly calls Sam's numbers lies) and pay_the_audit −3 (an outside firm overrules her, less personal); stand_by_the_story executive_mood +4 (the player bets on her version). press_scrutiny_flag 1 on full_retraction = the corrected outlet fact-checks the NEXT release (M12: one-shot pickups+press-rep down, then clears).",
      "No-dominance check: full_retraction beats pay_the_audit on money but loses on rep and eats the scrutiny flag; pay_the_audit overpays to save rep; stand_by_the_story risks the most and hurts the artist but soothes the exec. Clean (the exec axis differentiates further).",
      "INTEGRATION (new second-per-archetype event): landing escalation_cmo_fabricated_story in data/events.json also requires appending 'escalation_cmo_fabricated_story' to ESCALATION_EVENT_BY_ROLE.cmo in shared/utils/executiveDelegation.ts (today a singleton ['escalation_cmo_narrative_lost']) and updating the events-lint escalation-only↔map expectation."
    ],
    "upgradeSpecs": [
      "RESOLVED (M12 press_scrutiny_flag): \"the corrected outlet remembers\" now lands as press_scrutiny_flag 1 on full_retraction — the next release's press roll is scaled down once (pickups + press-reputation gain), then the flag clears. Numeric key, sign-only (magnitude unread); immediate. RESOLVED (M13 target_executive): fabrication is Sam's failure, so full_retraction/pay_the_audit wound her (−5 / −3) and stand_by_the_story soothes her (+4). Integration: both ride effects_immediate on JSON commit."
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
        "immediate": "money −15000, executive_mood −6 (target_executive: cco)",
        "delayed": "artist_mood +8, quality_bonus −5",
        "outcomeSummary": "Gave the artist their record back and paid to re-cut it their way — the relationship came home, Dante's version didn't."
      },
      {
        "id": "release_dantes_cut",
        "label": "Keep Dante's cut",
        "gist": "It IS better. It's also not theirs, and everyone will know how it got made.",
        "immediate": "reputation −3, executive_mood +5 (target_executive: cco)",
        "delayed": "quality_bonus +4, artist_mood −12",
        "outcomeSummary": "Kept Dante's rebuild as the record of record — the sound won, the artist lost, and the story of how is already out."
      },
      {
        "id": "shelve_everything",
        "label": "Shelve both versions",
        "gist": "Nobody gets the record. Write it all off and start clean someday.",
        "immediate": "money −40000, creative_capital −2, executive_mood −4 (target_executive: cco)",
        "delayed": "artist_mood +3",
        "outcomeSummary": "Shelved both versions and wrote the whole record off — nobody won, which was the only outcome everyone could live with."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "CHAIN LOGIC: Neglect pattern — Dante's urgent creative crises (Salvage Job + the new reactives) self-resolved at low loyalty, which means Dante resolved them the disloyal-Dante way: he took the work. Rebuilt the record to his own frequency, artist optional. Digest foreshadow: his vice summaries the week before read like a door closing (\"Dante took the record home and rebuilt it from the stems up\", \"Dante kept cutting after everyone else stopped believing\"). This event is the artist hearing the finished thing they weren't in the room for."
    ],
    "notes": [
      "Wound axes: money+the-record-regresses+exec-wound (relationship saved) vs. rep+relationship-crater+exec-relief (the sound saved) vs. huge money+CC write-off+exec-wound (dignity saved). The quality_bonus +4 on Dante's cut is the classic all-cost trap: the \"gain\" costs the artist relationship at crisis magnitude — no silver lining, a wound with good acoustics. Exec channel: beg_them_back executive_mood −6 (his rebuild struck, the record handed back); release_dantes_cut executive_mood +5 (his vision becomes the record of record); shelve_everything executive_mood −4 (his work written off with everyone's).",
      "ARTIST TARGETING NOTE (C101): the artist_mood keys stay GLOBAL (all signed artists) deliberately — do NOT add target_artist: 'predetermined'. Per the verb brief §2.3 / backlog C101, predetermined targeting on an ESCALATION event resolves to the highest-popularity signed artist at resolution time, NOT the artist who actually walked. Global application avoids naming the wrong artist; \"your artist\" in the prompt reads as the roster generally until escalation artist-threading ships."
    ],
    "upgradeSpecs": [
      "STILL DEFERRED (C101 — {artistName} in escalations): this prompt lands hardest naming the artist who walked, but the pending_side_event pipeline carries no reactiveContext and applyEscalation never returns the autonomous meeting's predetermined-target artist. Until that TODO lands, escalation prose cannot interpolate {artistName} and predetermined artist targeting mis-resolves (highest-popularity, not the wounded artist) — so this event keeps global artist_mood and unnamed prose. RESOLVED (M13 target_executive): the override/shelve choices wound Dante (−6 / −4); keeping his cut soothes him (+5)."
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
        "immediate": "money −45000, executive_mood −5 (target_executive: cco)",
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
        "immediate": "money −25000, executive_mood +4 (target_executive: cco)",
        "delayed": "variance_up 2, artist_mood −6",
        "outcomeSummary": "Funded Dante's rebuild from silence — his vision, the label's money, and an artist watching their record become his."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "CHAIN LOGIC: Neglect pattern — the other disloyal-Dante failure: destruction as purification. Ignored through his urgents, Dante decided the accumulated sessions were the problem — 'documents of a lie' — and erased them: drives wiped, takes recorded over, safety copies 'consolidated.' Digest foreshadow: his vice summaries read like a man burning lumber to warm the house (\"Dante struck the takes that were poisoning the well\", \"Dante started the record over from silence — again\"). This event is the morning someone opens the session folder."
    ],
    "notes": [
      "Wound axes: max money+artist-exhaustion+exec-wound vs. cheap+quality-crater+launch-heat vs. mid money+risk+relationship+exec-relief. Fiction cashes: artist_energy −4 = the re-cut grind; quality_bonus −6 banks into the rushed salvage sessions; awareness_boost −3 = the limping campaign around a thin release; variance_up 2 = Dante's rebuild could be transcendent or nothing. Exec channel: pay_to_reconstruct executive_mood −5 (resurrecting the 'lie' over his objection); fund_the_rebuild executive_mood +4 (his vision, funded); salvage_the_fragments stays exec-neutral (the cheap/thin axis).",
      "No-dominance check: cheapest option craters quality AND launch; the money options split on certainty vs. risk, and now on exec-mood direction. Clean.",
      "VERB CONSIDERATION (catalog_damage / cancel_project — the Dante-new premise steer): both were evaluated and deliberately NOT used. catalog_damage hits RELEASED songs' awareness (verb brief §1.10) — the erased masters are UNRELEASED session takes, so it doesn't fit. cancel_project soft-cancels an active recording project (§1.11), but all three authored forks RECOVER the record (reconstruct / salvage / rebuild) rather than abandon it — no fork is a cancel. The 'perfectionism wrecking something real' premise is carried by the fiction (six weeks of masters destroyed) plus money+quality/awareness/energy+variance+exec-mood, not by those verbs. If a designer wants a fourth 'let the record die' fork, cancel_project 1 would be its natural key.",
      "INTEGRATION (new second-per-archetype event): landing escalation_cco_erased_masters in data/events.json also requires appending 'escalation_cco_erased_masters' to ESCALATION_EVENT_BY_ROLE.cco in shared/utils/executiveDelegation.ts (today a singleton ['escalation_cco_artist_walkout']) and updating the events-lint escalation-only↔map expectation."
    ],
    "upgradeSpecs": [
      "RESOLVED (M13 target_executive): pay_to_reconstruct now carries executive_mood −5 (target_executive cco) — resurrecting the 'lie' over Dante's objection. Counterpart: fund_the_rebuild carries executive_mood +4 (target_executive cco) — the player funds his vision. Immediate-only. Integration: rides effects_immediate on JSON commit."
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
        "immediate": "money −25000, executive_mood −4 (target_executive: head_distribution)",
        "delayed": "awareness_boost −3",
        "outcomeSummary": "Reopened the platform deal at penance rates — worse terms, weaker placement, and everyone at the table knew who blinked."
      },
      {
        "id": "pivot_to_rival",
        "label": "Take it to the rival platform",
        "gist": "Start over with the competitor — new terms, no history, no certainty either.",
        "immediate": "money −12000, executive_mood −2 (target_executive: head_distribution)",
        "delayed": "variance_up 2, press_momentum −1",
        "outcomeSummary": "Took the release to the rival platform mid-scramble — a fresh deal with no track record, closed while the trades narrated."
      },
      {
        "id": "spin_independence",
        "label": "Spin it: the label chose independence",
        "gist": "No window at all — sell the walk-away as principle and pray the story holds.",
        "immediate": "executive_mood +2 (target_executive: head_distribution)",
        "delayed": "rep_swing 2, press_story_flag 1, awareness_boost −4",
        "outcomeSummary": "Declared the collapsed deal a choice and sold independence as the story — the next release goes out with a narrative instead of a window."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "CHAIN LOGIC: Neglect pattern — Pat's urgent platform windows (The Algorithm Change + the new reactive) self-resolved at low loyalty, which means Pat responded the disloyal-Pat way: hold, model, wait for certainty. Digest foreshadow: her vice summaries the week before read like a spreadsheet breathing (\"Pat held position and gathered another week of data\", \"Pat ran the models again rather than move on an unverified number\"). This event is the window closing while the models converged."
    ],
    "notes": [
      "Wound axes: money+reach+exec-wound (certainty bought back at a markup) vs. money+risk+press+exec-wound vs. no-window-at-all+rep-gamble+exec-relief (the press_story_flag is the harm-reduction: a story banked to partially dress the wound, at the price of the biggest awareness hole and a rep roll). Every option damages the release's reach differently — the wound IS distribution. Exec channel: crawl_back executive_mood −4 (begging at penance rates is the sharpest rebuke of her 'process was sound'); pivot_to_rival executive_mood −2 (moving on without her partner, milder); spin_independence executive_mood +2 (reframing the loss as a chosen principle lets Pat off the hook — the market moved irrationally, the model held).",
      "No-dominance check: spin_independence is free in cash but worst in reach, adds a gamble, and is the only exec-relief; the paid options split certainty vs. upside and both wound Pat. Clean."
    ],
    "upgradeSpecs": [
      "RESOLVED (M13 target_executive): this entry originally logged no exec spec, but the collapse is Pat's over-modeling failure, so the sweep adds the wound axis — crawl_back −4 / pivot_to_rival −2 (the choices that rebuke her caution) and spin_independence +2 (dressing the failure as strategy soothes her). All target_executive head_distribution, immediate-only."
    ],
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
        "immediate": "money −30000, executive_mood −4 (target_executive: head_distribution)",
        "delayed": "artist_mood +2",
        "outcomeSummary": "Back-paid every frozen royalty with interest and a written apology — expensive, immediate, and the only version of sorry that cashes."
      },
      {
        "id": "pay_flat_defend_process",
        "label": "Pay what's owed, stand by the process",
        "gist": "Exact amounts, no premium, and Pat's memo published as the label's official position.",
        "immediate": "money −15000, executive_mood +4 (target_executive: head_distribution)",
        "delayed": "artist_mood −8, press_momentum −1",
        "outcomeSummary": "Paid the frozen royalties to the penny and published Pat's memo as policy — the roster read the word 'immaterial' about their own money."
      },
      {
        "id": "freeze_for_forensics",
        "label": "Freeze everything for an outside forensic audit",
        "gist": "Nobody gets paid until an independent firm rules — clean hands, cold checks.",
        "immediate": "money −20000, creative_capital −2, executive_mood −2 (target_executive: head_distribution)",
        "delayed": "artist_mood −4",
        "outcomeSummary": "Froze all disputed royalties pending an outside forensic audit — procedurally spotless, and the roster kept waiting on their own money."
      }
    ],
    "bandPredictions": null,
    "designNotes": [
      "CHAIN LOGIC: Neglect pattern — the other disloyal-Pat failure: quiet unilateral bookkeeping. Ignored through her urgents, Pat kept the machine running her way — and when a payout discrepancy surfaced in the label's favor, she classified it 'statistically immaterial,' parked the artists' share in a holding line, and let her audit run for a quarter. Digest foreshadow: her vice summaries read like footnotes (\"Pat held the variance in a reconciliation account pending review\", \"Pat took the guaranteed number and filed the rest for later\"). This event is a distributor statement leaking to the roster's business managers."
    ],
    "notes": [
      "Wound axes: max money+exec-wound (relationship partially repaired — harm reduction at full price) vs. cheap+roster-crater+press+exec-relief vs. mid money+CC+prolonged-mood+exec-wound. creative_capital −2 cashes the fiction: a label lawyering its own artists burns creative credibility. Exec channel: pay_with_interest executive_mood −4 (overriding her freeze and apologizing repudiates the 'immaterial' call); pay_flat_defend_process executive_mood +4 (publishing her memo as policy BACKS her process); freeze_for_forensics executive_mood −2 (an outside firm distrusting her own audit stings mildly).",
      "No-dominance check: the cheap option wounds roster mood at crisis depth but soothes the exec; the CC option costs less mood but real CC, still money, and wounds the exec; the premium option overpays and wounds the exec. Clean (the exec axis cuts opposite the roster-mood axis on the cheap option — a genuine trade).",
      "VERB CONSIDERATION (distribution_efficiency / transfer_revenue_stream — the Pat-new premise steer): evaluated and NOT used. distribution_efficiency is a streaming-revenue multiplier modifier (verb brief §1.5) and transfer_revenue_stream sells a release's future stream (§1.13) — both are DISTRIBUTION-mechanics verbs, but this event's fiction is withheld ROYALTIES / roster trust, not routing throughput or a revenue sale. The wound is expressed via money + roster artist_mood + CC + press + the exec-mood hit. Those two verbs fit a different, un-authored 'Pat over-tuned the pipes and broke the stream' escalation, not this royalty-freeze one.",
      "INTEGRATION (new second-per-archetype event): landing escalation_dist_royalty_freeze in data/events.json also requires appending 'escalation_dist_royalty_freeze' to ESCALATION_EVENT_BY_ROLE.head_distribution in shared/utils/executiveDelegation.ts (today a singleton ['escalation_dist_deal_collapsed']) and updating the events-lint escalation-only↔map expectation."
    ],
    "upgradeSpecs": [
      "STILL DEFERRED (per-artist targeting): \"the shorted artists specifically\" wants targeted artist_mood rather than global. target_artist: 'predetermined' is now a live directive (M14) BUT on an ESCALATION event it mis-resolves to the highest-popularity artist (C101), not the shorted ones — so global stays correct here (the whole roster read the statement anyway). Logged alongside the {artistName} escalation-threading item in event #5. RESOLVED (M13 target_executive): exec-mood wounds/relief added this sweep (see notes)."
    ],
    "sourceFile": "v3-escalations-authored.md"
  }
];

export const V3_ESCALATIONS_POOL_LEVEL_NOTES: string[] = [
  "[v3-escalations-authored.md] Cross-set verification checklist (run before JSON commit)",
  "- [ ] Dominance lint offline: within each event, no choice weakly-dominates a sibling on every touched key (spot-checked above; the lint is the authority).",
  "- [ ] Effect keys all canonical: money, reputation, creative_capital, artist_mood, artist_energy, press_momentum, press_story_flag, quality_bonus, awareness_boost, variance_up, rep_swing — PLUS (Engine Verbs upgrade sweep 2026-07-13) executive_mood routed via the target_executive directive on every event, and press_scrutiny_flag on #4 full_retraction. executive_mood/target_executive are immediate-only on event choices and lockstep (each requires the other). No negative press_story_flag anywhere. press_scrutiny_flag is sign-only (positive) — magnitude unread.",
  "- [ ] UPGRADE STATUS (this sweep): every escalation now carries an exec-mood axis — WOUND on the choice(s) that override/litigate/repudiate the responsible exec, RELIEF on the choice that backs their play (design proposal; dial to wounds-only if preferred). Loyalty is NOT authorable via effects — only executive_mood. Verify the exec axis doesn't break the offline dominance lint (each event spot-checked clean above).",
  "- [ ] escalation_only: true on all 8. The M12b router change HAS shipped: ESCALATION_EVENT_BY_ROLE is now role → readonly string[] and pickEscalationEventId does the isolated seeded pick with escalation-last-seen filtering (never-empty fallback). The four arrays still ship as SINGLETONS — on JSON commit of each NEW event (#2 head_ar, #4 cmo, #6 cco, #8 head_distribution) append its id to that role's array AND update the events-lint escalation-only↔map expectation. This is the per-event INTEGRATION step flagged in each new entry's notes.",
  "- [ ] Qualitative copy: no engine numbers in any prompt/label/summary (dollar figures in fiction OK — none used in player copy above; all magnitudes live in effect bags).",
  "- [ ] Sam pronoun decision (she/her per bible vs. v1 stub's \"him\") confirmed with Nes and consistent across all v3 Sam content.",
  "- [ ] CC costs within crisis band (−2 max used, at the shelve/audit choices only).",
  "[v3-escalations-authored.md] UPGRADE SPEC summary — status after the Engine Verbs Tier 1+2 sweep (2026-07-13)",
  "1. RESOLVED (M12b): two escalations per role — ESCALATION_EVENT_BY_ROLE is now role → readonly string[] and pickEscalationEventId picks (isolated seed, last-seen filtered, never-empty). Arrays ship as singletons; each NEW event's id is appended on its JSON commit (see the per-event INTEGRATION notes).",
  "2. RESOLVED (M13 target_executive): executive_mood now routes on event choices — the sweep wounds/soothes the offending exec on every escalation (#1 fight_the_clause −5 / honor +4; #2 grovel −6 / pay +3; #3 buy_the_make_goods −4 / ride +3; #4 full_retraction −5, pay_the_audit −3 / stand_by +4; #5 beg −6, shelve −4 / release +5; #6 pay_to_reconstruct −5 / fund_the_rebuild +4; #7 crawl_back −4, pivot −2 / spin +2; #8 pay_with_interest −4, freeze −2 / pay_flat +4).",
  "3. STILL DEFERRED (C101): artist context threading — carry the flagged week's artist id through pending_side_event so escalation prose can interpolate {artistName} and predetermined artist targeting resolves to the WOUNDED artist, not highest-popularity (#5, #8). Until then, artist_mood stays global and prose stays unnamed.",
  "4. RESOLVED (M12 press_scrutiny_flag): #4 full_retraction now carries press_scrutiny_flag 1 — the corrected outlet fact-checks the next release (one-shot press penalty, then clears).",
  "5. STILL DEFERRED: persistent pipeline debuff — \"the demo pipeline closed\" wants a lingering scouting consequence (#2). No talent_pipeline read-side shipped; story_flag (now live) could hold a stopgap marker but nothing reads it to throttle Mac's recent_signing meetings yet."
];
