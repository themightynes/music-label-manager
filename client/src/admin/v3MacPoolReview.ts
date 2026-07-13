/**
 * v3 Mac Pool — content-review form definition (2026-07-12 working session).
 *
 * On-screen mirror of the five authoring scratchpad hand-off files
 * (v3-mac-pool-authored.md, v3-mac-authored-routine.md,
 * v3-mac-authored-major.md, v3-mac-authored-reactive.md,
 * v3-mac-authored-new.md). The authored text is carried VERBATIM — it is
 * designer-facing copy under review, so no editorializing, no silent typo
 * fixes, no effect-key conversion. Markdown emphasis markers (** / backticks)
 * from the source are dropped as formatting; the words, numbers, ⚑ flags and
 * effect values are preserved exactly.
 *
 * NOTE ON NUMBERS: this is an ADMIN review surface, not a player surface —
 * the no-engine-numbers house rule guards player-facing copy modules
 * (helpTopics, the playtest form definitions); raw effect values are shown
 * here deliberately so the designer can review them.
 *
 * Meeting ids are the canonical ones from @shared/api/contracts
 * (MAC_POOL_REVIEW_MEETING_IDS) — the render test asserts the two lists stay
 * in lockstep. Reading order = source-file order: pool-authored → routine →
 * major → reactive → new.
 *
 * "The 3 AM Demo" was originally missing from the hand-off (content-pending);
 * its authored content arrived via the pool-review-extension task hand-off
 * (2026-07-12, same session) and is transcribed below — it is no longer
 * content-pending.
 *
 * SHAPE NOTE (pool-review extension): the review surface now covers all seven
 * pools with a generic PoolReviewEntry shape (poolReviewTypes.ts). The Mac
 * data below keeps its original structured band fields (loyal/committed/
 * disloyal/flags) and is mapped to the generic shape at the bottom of this
 * module — the authored text is untouched by the mapping.
 */

import type { MacPoolReviewVerdict } from '@shared/api/contracts';
import type { PoolReviewEntry } from './poolReviewTypes';

export interface MacPoolChoiceRow {
  id: string;
  label: string;
  gist: string;
  immediate: string;
  delayed: string;
  outcomeSummary: string;
}

export interface MacPoolBandPredictions {
  /** Source heading, e.g. "Bands (target)" / "Bands (predicted)" / "Band predictions". */
  heading: string;
  loyal: string;
  committed: string;
  disloyal: string;
  /** Divergence flags / hint requirements pulled from the source, '' if none. */
  flags: string;
}

export interface MacPoolMeetingEntry {
  id: string;
  title: string;
  /** Authoring status carried from the source file heading. */
  status: string;
  /** True only for Wall of Misses — rendered as "FINALIZED (baseline)". */
  finalized: boolean;
  /** True only for The 3 AM Demo — authored content missing from the hand-off. */
  contentPending: boolean;
  tier: string;
  gating: string;
  prompt: string;
  description: string;
  choices: MacPoolChoiceRow[];
  bandPredictions: MacPoolBandPredictions | null;
  notes: string[];
  upgradeSpec: string | null;
  sourceFile: string;
}

export const MAC_POOL_REVIEW_VERDICT_OPTIONS: Array<{
  value: MacPoolReviewVerdict;
  label: string;
}> = [
  { value: 'approve', label: 'Approve' },
  { value: 'approve_with_edits', label: 'Approve with edits' },
  { value: 'rework', label: 'Rework' },
  { value: 'kill', label: 'Kill' },
];

export const MAC_POOL_REVIEW_TITLE = 'v3 Mac Pool — Content Review (2026-07-12)';

export const MAC_POOL_REVIEW_INTRO =
  'The authored v3 Mac pool from the 2026-07-12 working session, transcribed verbatim from the ' +
  'authoring hand-off files for structured review. Read each meeting in order, leave a verdict ' +
  '(approve / approve with edits / rework / kill) and freeform notes per meeting, then the two ' +
  'overall fields at the end. Wall of Misses is already FINALIZED (Nes feedback applied) and sits ' +
  'here as the baseline — notes still welcome. Effect values are shown raw: this is an admin ' +
  'review surface, and the numbers are part of what is under review (all pending offline ' +
  'divergence verification before JSON commit).';

export const MAC_POOL_OVERALL_NOTES_PROMPT =
  'Overall notes — anything pool-wide: tier balance, gating spread, effect-budget consistency, missing territory:';

export const MAC_POOL_VOICE_CONSISTENCY_PROMPT =
  'Voice consistency — does Mac sound like the same person across all fifteen rooms (wall-of-misses religion, gut-versus-spreadsheet, the superstition streak)? Where does the voice slip?';

const V3_MAC_POOL_MEETINGS_RAW: MacPoolMeetingEntry[] = [
  {
    id: 'wall_of_misses',
    title: 'Wall of Misses',
    status: 'FINALIZED (Nes feedback applied)',
    finalized: true,
    contentPending: false,
    tier: 'routine',
    gating: 'requires artist_signed · role head_ar',
    prompt:
      "You've seen the wall in my office. Every pass I ever regretted, framed, so I never get comfortable. " +
      'One of them just went supernova — and here\'s the part nobody knows: before I passed, they cut a few ' +
      'late-night demos with {artistName}. Those tapes are sitting in our drawer. Two years ago they were a ' +
      "curiosity. This morning they're a decision.",
    description:
      'An artist Mac passed on is suddenly everywhere — and unreleased demos with your signee are gathering dust.',
    choices: [
      {
        id: 'shelve_the_tapes',
        label: 'Leave them in the drawer',
        gist: "Some doors you don't reopen.",
        immediate: '',
        delayed: 'artist_mood +1',
        outcomeSummary: 'Mac left the vault demos in the drawer — no money, no headlines, no mess.',
      },
      {
        id: 'shop_them_quietly',
        label: 'Shop the tapes to their label, quietly',
        gist: 'Wire transfer, no fingerprints.',
        immediate: 'money +10000',
        delayed: 'artist_mood −2',
        outcomeSummary:
          "Mac quietly sold the vault demos to the artist's new label — good money, and {artistName} wasn't told.",
      },
      {
        id: 'leak_the_heat',
        label: 'Let the tapes find the press',
        gist: "Mac's ear found them first — let the story build heat for what's next.",
        immediate: 'money −4000',
        delayed: 'awareness_boost +3, variance_up +1, press_story_flag 1, artist_mood −1',
        outcomeSummary:
          "Mac let the vault demos slip to the press — his ear, on the record, and heat building for {artistName}'s next move.",
      },
    ],
    bandPredictions: {
      heading: 'Bands (target)',
      loyal: 'shelve (relationship-safe under fixed scorer)',
      committed: 'quiet sale',
      disloyal: 'the leak (variance carries it; no hint needed — verify margin)',
      flags: '',
    },
    notes: [
      'Nes decision: artist reacts on ALL choices (axes = primary differentiator, not exclusivity). Fiction changed ' +
        'from "release the demos" to "leak to press" because awareness_boost banks hype for the NEXT planned ' +
        'release — mechanics must cash what prose promises.',
    ],
    upgradeSpec:
      'UPGRADE SPEC (future mechanism spawns_release / grant_song): flagship use case. Choice 3 becomes a true ' +
      '"From the Vault" single: creates a real song/release for {artistName} (quality from a banked roll, ' +
      'chart-eligible, revenue-generating). Log as mechanism C-item at session wrap; meetings gain their first ' +
      'tangible-catalog outcome.',
    sourceFile: 'v3-mac-pool-authored.md',
  },
  {
    id: 'the_3am_demo',
    title: 'The 3 AM Demo',
    status: 'AUTHORED (delivered via the 2026-07-12 pool-review-extension hand-off), pending Nes review',
    finalized: false,
    contentPending: false,
    tier: 'routine',
    gating: 'requires — (ungated) · role head_ar',
    prompt:
      'My text log will show you I have no self-control: 3:04 AM, all caps, YOU NEED TO HEAR THIS. Listen — ' +
      "it's raw, it's the wrong genre for everything we've built, and it's undeniable. I've been wrong twice " +
      "in my life. The wall in my office keeps the score. This isn't a wall one.",
    description:
      'Mac found something at 3 AM — wrong genre, undeniable, and he wants to move before anyone else wakes up.',
    choices: [
      {
        id: 'pass_politely',
        label: 'Not for us. Pass politely.',
        gist: "The catalog has a direction; this isn't it. Mac frames another regret for the wall.",
        immediate: '',
        delayed: 'exec_mood −3',
        outcomeSummary: "Mac passed on the 3 AM find — politely, and he hasn't mentioned it since.",
      },
      {
        id: 'development_deal',
        label: 'Development deal — keep them close',
        gist: 'A small check, studio hours, no announcement.',
        immediate: 'money −6000',
        delayed: 'quality_bonus +2, exec_mood +2',
        outcomeSummary:
          'Mac locked the 3 AM find into a quiet development deal — close enough to watch, cheap enough to defend.',
      },
      {
        id: 'full_pursuit',
        label: 'Go get them. Full pursuit.',
        gist: 'Fly out, front-row the showcase, out-charm the majors.',
        immediate: 'money −18000',
        delayed: 'rep_swing 2, press_story_flag 1',
        outcomeSummary:
          'Mac went all-in courting the 3 AM find — the whole industry heard about the chase.',
      },
    ],
    bandPredictions: {
      heading: 'Bands (target)',
      loyal: 'pass_politely',
      committed: 'development_deal',
      disloyal: 'full_pursuit (rep_swing 2 → 20 pts, no hint, verify margin)',
      flags: '',
    },
    notes: [
      'Artist mood absent by design (unsigned prospect — exec_mood is the reaction axis); the pass feeds the ' +
        'Wall of Misses fiction.',
    ],
    upgradeSpec:
      "UPGRADE SPEC (future mechanism spawns_artist): full pursuit's success delivers a signable artist.",
    sourceFile: 'pool-review-extension task hand-off (2026-07-12)',
  },
  {
    id: 'tuesday_superstition',
    title: 'The Tuesday Superstition',
    status: 'DRAFT, awaiting Nes feedback',
    finalized: false,
    contentPending: false,
    tier: 'routine',
    gating: 'requires — (ungated starter) · role head_ar',
    prompt:
      "I don't sign on Tuesdays. Go ahead and laugh — but the biggest name on my wall of misses shook my hand on " +
      "a Tuesday, and I've buried two more Tuesday deals since. Now the manager for the best unsigned voice I've " +
      "heard all year says Tuesday, ten a.m., take it or leave it. My gut's screaming. My gut is the job. So we " +
      "move them, we send someone whose gut isn't haunted, or I walk in on the cursed day and trust the read anyway.",
    description:
      "Mac's no-Tuesdays rule collides with a hot manager's take-it-or-leave-it Tuesday slot.",
    choices: [
      {
        id: 'move_the_meeting',
        label: 'Work the calendar',
        gist: 'Charm the manager onto a Wednesday; the superstition stays intact and the story travels well.',
        immediate: 'reputation +1, exec_mood +4',
        delayed: 'awareness_boost +1',
        outcomeSummary:
          'Mac charmed the meeting onto a Wednesday — the superstition held, and the manager dined out on the story.',
      },
      {
        id: 'send_fresh_ears',
        label: 'Send a junior scout',
        gist: "Somebody whose Tuesdays aren't cursed takes the room; Mac stays home and stews.",
        immediate: 'money −2000, exec_mood −2',
        delayed: 'quality_bonus +2',
        outcomeSummary:
          'Mac benched himself and sent a junior scout — the kid came back with tape and notes worth folding into the next sessions.',
      },
      {
        id: 'walk_in_on_tuesday',
        label: 'Break the rule',
        gist:
          'Mac takes the meeting rattled. The read he gives will be legend or cautionary tale — the industry will ' +
          'hear about it either way.',
        immediate: 'rep_swing 1, exec_mood −2',
        delayed: 'awareness_boost +2',
        outcomeSummary:
          'Mac broke his own Tuesday rule and took the meeting rattled — the read he gave will travel, one way or the other.',
      },
    ],
    bandPredictions: {
      heading: 'Bands (predicted)',
      loyal:
        'work the calendar (only all-guaranteed choice: rep + awareness, zero spend, no gamble) ⚑ verify margin ' +
        'vs. the junior — depends on how heavily the post-fix safety scorer weighs banked quality vs. ' +
        'exec_mood/awareness.',
      committed:
        'send fresh ears (2Q=4 − 2000/4000 = 3.5 vs. calendar\'s 2rep+A = 3) ⚑ thin margin, verify offline.',
      disloyal:
        "walk in on Tuesday (10·rep_swing = 10 vs. junior's 3Q = 6) — clean, no hint needed (bible guessed ⚑; " +
        'the rep_swing 10× weight settles it).',
      flags: '⚑ loyal margin vs. junior; ⚑ committed margin thin — both verify offline.',
    },
    notes: [
      'Fiction-cashes-mechanics notes: no signing can actually occur (no spawns_artist verb), so every choice ' +
        "trades in what the engine CAN do — Mac's state, label rep, banked label-pool hype, and the junior's " +
        'session-ready notes. rep_swing is EV-zero, so the vice carries an awareness_boost sweetener per P2 (a ' +
        "meeting that becomes an industry story banks chatter-hype for the label's next planned release).",
    ],
    upgradeSpec:
      'UPGRADE SPEC (future mechanism spawns_artist / signing-offer): the real version ends with the prospect ' +
      "joinable — success on the Tuesday read (or the junior's scouting) generates an actual signing offer with " +
      'quality/popularity rolled off the chosen path, and move_the_meeting becomes the guaranteed-but-pricier ' +
      'signing lane. Until then this meeting is honestly about Mac, not the prospect.',
    sourceFile: 'v3-mac-authored-routine.md',
  },
  {
    id: 'reinvention_tape',
    title: 'The Reinvention Tape',
    status: 'DRAFT, awaiting Nes feedback (reshape of bible pitch 9 "Genre Heat Check")',
    finalized: false,
    contentPending: false,
    tier: 'routine',
    gating: 'requires artist_signed · role head_ar',
    prompt:
      "The scene's rotating — I feel it the way you feel weather in a bad knee. And {artistName} feels it too, " +
      'because last night they slid me a tape of themselves sounding like a completely different person. Not ' +
      "chasing the wave. Running from their own reflection. Here's my problem: it's good. Maybe. Or it's a " +
      "costume. I passed on the last artist who tried to shed their skin mid-climb, and that one's framed on my " +
      "wall. So we talk them home, we spend real money finding out who they're becoming, or we let them jump and " +
      'trust the fall.',
    description:
      'The scene is shifting and {artistName} handed Mac a demo of a completely different self — breakthrough or costume.',
    choices: [
      {
        id: 'talk_them_home',
        label: 'Anchor them',
        gist:
          "Remind them who they are and why it worked. The tape goes in a drawer. Mac isn't sure the drawer holds.",
        immediate: 'artist_mood +3, exec_mood −1',
        delayed: '',
        outcomeSummary:
          'Mac talked {artistName} back to the sound that signed them — steadier hands, and the new tape stays a secret between them.',
      },
      {
        id: 'pressure_test',
        label: 'Fund a proper workshop',
        gist:
          'A closed-door writing camp to find out whether the new skin is real before anyone bets the catalog on it.',
        immediate: 'money −6000',
        delayed: 'quality_bonus +3',
        outcomeSummary:
          "Mac booked closed-door writing sessions to pressure-test {artistName}'s new direction before anyone bet the catalog on it.",
      },
      {
        id: 'back_the_jump',
        label: 'Believe the tape',
        gist:
          "Point the next sessions straight at the reinvention. If Mac's ear is right, it's the leap of a career.",
        immediate: 'artist_mood +2, exec_mood +2',
        delayed: 'quality_bonus +3, variance_up 1',
        outcomeSummary:
          "Mac heard the future in {artistName}'s reinvention tape and pointed the next sessions straight at it.",
      },
    ],
    bandPredictions: {
      heading: 'Bands (predicted)',
      loyal:
        "talk them home (artist_mood +3, free, gamble-free; the workshop's banked quality is offset by its spend " +
        'on the safety scorer — ⚑ verify that offset offline).',
      committed:
        "pressure-test (2Q=6 − 6000/4000 = 4.5, beats the jump's 6 − 3V = 3 and the anchor's 0).",
      disloyal: "back the jump (10V + 3Q = 19 vs. workshop's 9) — clean, no hint.",
      flags: '⚑ loyal offset needs offline verification.',
    },
    notes: [
      "Reshape rationale (designer flag): v1's ar_genre_shift was label-level trend-chasing (\"the scene is " +
        'rotating, reposition somebody"). Kept the scene-rotation seed but moved the crisis INSIDE one signee: ' +
        '{artistName} feels the scene leaving them and hands Mac a demo of a different self. The fork is now about ' +
        'identity — anchor them, pressure-test the new skin, or bet on it — not about surfing a trend.',
      'P2 check: the jump carries everything the workshop banks PLUS artist_mood +2 and exec_mood, for zero cash — ' +
        'the gamble is genuinely the best expected-value play; a disloyal Mac taking it is sometimes right, and a ' +
        "loyal Mac's anchor visibly forfeits it.",
      'Artist reacts on two of three (anchor and jump); the workshop is deliberately mood-neutral — being sent to ' +
        'a pressure-test camp is neither an embrace nor a rejection, and keeping it off the mood axis is what ' +
        'holds the loyal/committed split.',
    ],
    upgradeSpec:
      'UPGRADE SPEC (future mechanism: choice-set story flags): the real arc sets ' +
      "flags.story['reinvention_<artistId>'] so a later gated meeting exists only if the jump/workshop was taken " +
      '("the new sound\'s first reviews are in — double down or retreat"). Today the continuity lives only in the ' +
      'banked quality/variance landing at the next session.',
    sourceFile: 'v3-mac-authored-routine.md',
  },
  {
    id: 'showcase_slot',
    title: 'Showcase Slot',
    status: 'DRAFT, awaiting Nes feedback (bible pitch 10)',
    finalized: false,
    contentPending: false,
    tier: 'routine',
    gating: 'requires music_exists · role head_ar',
    prompt:
      'One slot left on the Foundry showcase — the room where I found half my wall, hits and misses both. Prime ' +
      'Friday costs real money and buys every set of ears that matters. Early doors costs lunch money and plays ' +
      'to the bartenders. Or we skip the circus, keep {artistName} in the studio, and let the work do the ' +
      'talking. I know what the data kids would say. I also know three careers that started in that room on a Friday.',
    description:
      'One showcase slot at the room Mac trusts — prime Friday money, early-doors lunch money, or skip it and keep cutting.',
    choices: [
      {
        id: 'prime_friday',
        label: 'Buy the Friday slot ⚑ self_serving_hint',
        gist: "The room, the ears, the scene watching Mac's pick under the good lights.",
        immediate: 'money −7000, artist_mood +3, exec_mood +2',
        delayed: 'awareness_boost +3',
        outcomeSummary:
          'Mac bought the prime Friday slot at the Foundry — {artistName} played to every set of ears that ' +
          'matters, and the room knew whose ear brought them.',
      },
      {
        id: 'early_doors',
        label: 'Take the cheap slot',
        gist: 'A modest room, a tight set, change left in the budget.',
        immediate: 'money −2000, artist_mood +1',
        delayed: 'awareness_boost +1',
        outcomeSummary:
          'Mac took the early-doors slot — a smaller room, a tight set, and most of the budget still in the drawer.',
      },
      {
        id: 'keep_cutting',
        label: 'Skip it, bank the week',
        gist: "No stage this month. The songs aren't finished arguing yet.",
        immediate: 'artist_mood −2',
        delayed: 'quality_bonus +2',
        outcomeSummary:
          'Mac passed on the showcase and kept {artistName} in the studio — the stage can wait, the songs can\'t.',
      },
    ],
    bandPredictions: {
      heading: 'Bands (predicted)',
      loyal:
        'early doors (all-positive, minimal spend, no downside) ⚑ verify margin vs. prime Friday — if the safety ' +
        "scorer's money-spend penalty is shallow, prime's bigger mood+awareness bundle could steal the loyal pick.",
      committed:
        "keep cutting (2Q=4 vs. prime's A3 − 1.75 = 1.25 and early's 0.5) — the professional banks the studio week.",
      disloyal:
        'prime Friday via self_serving_hint — his numeric scorer (10V+3Q+CC) would land on the skip (3Q=6) with ' +
        'prime scoring ~0, which is narratively backwards; this is exactly the P6 hint case the bible predicted ' +
        '(⚑ pitch 10), and the hint is load-bearing, not decorative.',
      flags: 'Hint required on prime_friday (self_serving_hint); ⚑ loyal margin verify.',
    },
    notes: [
      'Vice defensibility (P2 analog for a spend-vice): prime Friday buys the meeting\'s biggest guaranteed bundle ' +
        '(awareness +3, artist_mood +3, exec_mood +2) for $7k — an EV-defensible splurge, not authored idiocy; the ' +
        '"self-serve" is that the scene watching MAC\'S pick is what he\'s really buying.',
      "Fiction cashes: awareness_boost = hype banked for {artistName}'s NEXT PLANNED RELEASE — the showcase buzz " +
        'feeds the next rollout, which is exactly what a showcase is for. quality_bonus = the banked studio week ' +
        'lands at the next recording session.',
    ],
    upgradeSpec:
      'UPGRADE SPEC (future mechanism: tour/show one-off performance): the real version stages an actual ' +
      'one-night performance with a city-style outcome roll (attendance, revenue, press) instead of pure banked ' +
      'hype — the Foundry slot becomes a tiny live event using the tour-performance machinery.',
    sourceFile: 'v3-mac-authored-routine.md',
  },
  {
    id: 'vintage_speakers',
    title: 'Vintage Speakers',
    status: 'DRAFT, awaiting Nes feedback (bible pitch 12)',
    finalized: false,
    contentPending: false,
    tier: 'routine',
    gating: 'requires — (ungated starter) · role head_ar',
    prompt:
      "Nineteen-seventy-one Tannoy monitors. The pair in my listening room died in March and I've been " +
      'auditioning demos on laptop speakers like an animal. You want to know why the last two finds slipped past ' +
      "me? Everything sounds like a ringtone now. Get me the Tannoys and I'll hear the grain again — the thing " +
      "the wall taught me to listen for. Or tell me it's my ears and not the gear, and I'll do my best to forget " +
      'you said it.',
    description:
      'Mac blames two missed finds on his dead listening-room monitors and wants a vintage refit.',
    choices: [
      {
        id: 'buy_the_tannoys',
        label: 'Buy the Tannoys',
        gist:
          "The full vintage refit. New ears cut both ways: he'll hear what nobody else does — or things that " +
          "aren't there.",
        immediate: 'money −8000, exec_mood +5',
        delayed: 'quality_bonus +2, variance_up 1',
        outcomeSummary:
          'Mac got his vintage Tannoys — the listening room hums again, and he swears the next sessions will prove it.',
      },
      {
        id: 'modern_nearfields',
        label: 'Solid modern monitors',
        gist: 'Competent, flat, affordable. Mac calls them "adequate" like it\'s a slur.',
        immediate: 'money −4000, exec_mood +2',
        delayed: 'quality_bonus +1',
        outcomeSummary:
          'Mac got competent modern monitors instead of the vintage grail — the room works, and he calls it ' +
          "adequate like it's a slur.",
      },
      {
        id: 'its_your_ears',
        label: "Tell him it's not the gear",
        gist:
          'Hold the budget line and say the hard thing. Managers and investors hear the label runs lean; Mac ' +
          'hears something else.',
        immediate: 'reputation +1, exec_mood −4',
        delayed: '',
        outcomeSummary:
          'Mac was told the misses were his ears, not his speakers — nothing was bought, and he went quiet for a day.',
      },
    ],
    bandPredictions: {
      heading: 'Bands (predicted)',
      loyal:
        'modern nearfields (small guaranteed quality + exec_mood, modest spend, no gamble) ⚑ verify margin vs. ' +
        '"it\'s your ears" — hinges on whether the safety scorer weighs exec_mood and how it nets rep +1 against ' +
        "the nearfields' spend.",
      committed:
        "it's your ears (2rep = 2 vs. nearfields' 2Q−spend = 1 and the refit's 4 − 3V − 2 = −1) — the cold " +
        "professional read: the gear isn't the problem.",
      disloyal: 'buy the Tannoys (10V + 3Q = 16, others ~0) — clean, no hint.',
      flags: '⚑ loyal margin verify (exec_mood weighting in the safety scorer).',
    },
    notes: [
      'Magnitude note: bible sketch said −$14k; pulled to −$8k to respect the routine cap (±$2–8k) per this ' +
        "session's rules.",
      "P2 check: the refit's variance_up is an honest gamble authored as EV-attractive — quality +2 AND the " +
        "biggest exec_mood swing for the money, vs. the nearfields' quality +1; the vintage ears really might find " +
        'the next one, or hear ghosts.',
      "Reaction-axis note: no natural artist target (it's Mac's own room), so exec_mood carries the reaction on " +
        'all three choices — this is the pure exec-texture meeting of the batch, and the trilemma is indulge / ' +
        'manage / confront his self-mythology.',
    ],
    upgradeSpec:
      'UPGRADE SPEC: none needed — the fiction cashes fully with today\'s verbs. (If per-mood prompt variants ' +
      'ever land, this is the flagship candidate: mood-20 Mac asking for the Tannoys is a different scene than ' +
      'mood-80 Mac.)',
    sourceFile: 'v3-mac-authored-routine.md',
  },
  {
    id: 'poaching_season',
    title: 'Poaching Season',
    status: 'AUTHORED, pending Nes review',
    finalized: false,
    contentPending: false,
    tier: 'major',
    gating: 'requires release_out · role head_ar',
    prompt:
      'Two calls this morning. First: a rival A&R has been taking my roster to lunch — MY roster, at MY diner. ' +
      "Second call: same guy, offering me his castoff act like a peace pipe. You don't get both calls in one " +
      "morning unless somebody smells blood. Wall of misses taught me one thing — when the sharks circle, you " +
      "don't tread water. So: do we build a fence, do we tell a story, or do we bite back?",
    description:
      'A rival A&R is circling your roster while dangling their own castoff at Mac — defend, spin, or raid.',
    choices: [
      {
        id: 'lock_the_roster',
        label: 'Build the fence',
        gist: 'Counter-offers across the board — expensive, airtight, and everyone sleeps at night.',
        immediate: 'money −15000, reputation +2',
        delayed: 'artist_mood +6',
        outcomeSummary:
          'Mac papered the roster with counter-offers — pricey, but the rival left the diner empty-handed.',
      },
      {
        id: 'feed_the_press',
        label: 'Tell the story',
        gist:
          "Trade what Mac knows about the rival's books to a friendly byline; the narrative does the defending.",
        immediate: 'press_story_flag 1, press_momentum +1, reputation +2',
        delayed: 'artist_mood −2',
        outcomeSummary:
          "Mac traded what he knew about the rival's books to a friendly byline — the story banks for the next drop.",
      },
      {
        id: 'raid_them_back',
        label: 'Bite back',
        gist:
          "Go after the rival's best unsigned lead mid-poach. If it lands, legend; if it slips, everyone saw the lunge.",
        immediate: 'money −12000, rep_swing 2',
        delayed: 'exec_mood +4, press_momentum +2, artist_mood +2',
        outcomeSummary:
          "Mac raided the rival's bench mid-poach — the whole industry is watching to see which label blinks first.",
      },
    ],
    bandPredictions: {
      heading: 'Band predictions',
      loyal:
        'lock_the_roster: mood +6 (cap 5) + rep +2 − money (cap −5) = +2; press play = rep 2 − mood 2 = 0; ' +
        'raid = −100 (rep_swing veto). Clear.',
      committed:
        'feed_the_press: 2·2 rep, zero spend = 4.0; fence = 4 − 15000/4000 = +0.25; raid = gamble-penalized + ' +
        'spend. Clear.',
      disloyal: 'raid_them_back: 10·(swing 2) = 20 vs 0 and 0. Huge margin, no hint needed. Perfect 3-way split.',
      flags: '',
    },
    notes: [
      'Bible pitched the press option as "press flag + rep risk"; authored it CLEAN (guaranteed rep) instead so ' +
        'the committed band has a home — the risk in this meeting lives entirely in the raid, which keeps the ' +
        'trilemma legible. Raid is EV-attractive per P2: exec_mood +4 + press_momentum +2 + roster morale ride ' +
        'along with the swing. Roster reacts on all three (mood +6 / −2 wary of a leaky label / +2 "our label ' +
        'fights"). The raid target is UNSIGNED → exec_mood is the reaction axis there.',
    ],
    upgradeSpec:
      'UPGRADE SPEC (future mechanism spawns_artist): raid_them_back becomes a true poach — on a won rep_swing, ' +
      "the rival's act actually joins the roster (mid popularity, discounted signing cost, arrives with a grudge " +
      'flag). Until then the fiction is "the lunge itself is the statement" and the mechanics honestly cash ' +
      'chaos + heat, not a new artist.',
    sourceFile: 'v3-mac-authored-major.md',
  },
  {
    id: 'favor_signing',
    title: 'The Favor Signing',
    status: 'AUTHORED, pending Nes review (⚑ verify committed margin)',
    finalized: false,
    contentPending: false,
    tier: 'major',
    gating: 'requires artist_signed · role head_ar',
    prompt:
      "Half the wall of misses wouldn't be misses if Ray hadn't called me first. Twenty years that man's been " +
      "sliding me demos before anyone else hears them — every good ear I've got is half his. Now he's calling in " +
      "the marker: his kid's band. I've heard the tape. The tape is... the kid's band. But Ray doesn't ask twice, " +
      "and if I pass, the next demo goes to somebody else's wall. Tell me what my ear is worth.",
    description:
      "The venue owner who feeds Mac's pipeline wants his kid's band signed — bad tape, expensive politics.",
    choices: [
      {
        id: 'sign_the_kid',
        label: 'Sign the band',
        gist:
          "A development deal nobody will confuse with A&R judgment. Ray's pipeline stays warm; the trades will " +
          'notice what it is.',
        immediate: 'money −20000, exec_mood +6',
        delayed: 'reputation −3, artist_mood −3',
        outcomeSummary:
          "Mac inked the venue owner's kid — bad tape, good politics, and the pipeline that built his wall stays warm.",
      },
      {
        id: 'pass_politely',
        label: 'Pass, politely',
        gist: 'Clean books, straight answer, cooler handshakes. The roster sees a label with standards.',
        immediate: 'exec_mood −4',
        delayed: 'reputation +1, artist_mood +2',
        outcomeSummary:
          "Mac passed on the venue owner's kid, politely — clean books, and a twenty-year handshake gone cool.",
      },
      {
        id: 'fund_one_single',
        label: 'Fund one single',
        gist:
          'A favor with a receipt: one single, real producer, no roster spot. The industry reads it as class.',
        immediate: 'money −10000, exec_mood +3',
        delayed: 'reputation +2, award_chances +3, quality_bonus −1',
        outcomeSummary:
          'Mac funded one single for the kid — a favor with a receipt, and no roster spot attached.',
      },
    ],
    bandPredictions: {
      heading: 'Band predictions',
      loyal:
        'pass_politely: rep 1 + mood 2 = +3; sign = −(5+3+3) = −11; single = rep 2 + award 3 − quality 1 − money ' +
        '5 = −1. Clear.',
      committed:
        'fund_one_single: 2·2 rep + 3 award − 2 quality − 10000/4000 = +2.5 vs pass = 2·1 = +2.0. ⚑ margin is ' +
        "0.5 — verify offline; if it flips, bump the single's award to +4 or trim pass's rep to 0 (exec_mood " +
        "already carries the pass's cost).",
      disloyal: 'sign_the_kid via hint (+∞). All three bands split.',
      flags:
        "sign_the_kid → self_serving_hint: true — the designed use case: Mac's numeric scorer (10V+3Q+CC) reads " +
        'this choice as 0; the vice here is protecting HIS network, which no effect key expresses. The hint ' +
        'carries the character beat. ⚑ committed margin 0.5.',
    },
    notes: [
      "The kid is UNSIGNED → exec_mood is the reaction axis on every choice (Ray's marker runs through Mac); the " +
        'SIGNED roster reacts as the secondary axis (−3 nepo resentment / +2 respect for standards / ' +
        "neutral-through-quality-drag on the compromise). quality_bonus −1 on the single = the kid's session eats " +
        "your producer bench's next block — the fiction cashes the mechanic. Rep −3 on signing is delayed: the " +
        'trades need a week to clock what the deal is.',
    ],
    upgradeSpec:
      'UPGRADE SPEC (future mechanism spawns_artist): sign_the_kid becomes a real signing — a low-quality, ' +
      'low-popularity artist lands on the roster (ongoing weekly cost, Ray-pipeline perk flag: future Mac ' +
      'meetings gated on it get a discount/first-look flavor). Until then the deal exists in fiction only and ' +
      'mechanically cashes as cash out + Mac appeased + reputation/roster damage — which is honestly what a ' +
      'shelf deal is.',
    sourceFile: 'v3-mac-authored-major.md',
  },
  {
    id: 'second_album_syndrome',
    title: 'Second Album Syndrome',
    status: 'AUTHORED, pending Nes review (⚑ verify loyal margin)',
    finalized: false,
    contentPending: false,
    tier: 'major',
    gating: 'requires music_exists + recording_project_active · role head_ar',
    prompt:
      '{artistName} called me at midnight — not Dante, me — and said the record is lying. Eleven tracks of ' +
      "professional, on-schedule lying. Here's my religion, same as it's ever been: the wall behind my desk " +
      "isn't full of bad ears, it's full of times somebody's gut said GO and my spreadsheet said wait. The " +
      "artist's gut is the only A&R instinct I've never seen miss twice. They want to torch the sessions and " +
      'start clean. I say we hand them the match.',
    description:
      'Your recording artist wants to scrap the sessions and start over — and Mac believes their gut over the schedule.',
    choices: [
      {
        id: 'back_the_restart',
        label: 'Hand them the match',
        gist:
          'Torch it, start clean, trust the gut. Costs real money and the record becomes a bet — but the bet is loaded.',
        immediate: 'money −15000',
        delayed: 'quality_bonus +6, variance_up +2, artist_mood +6, exec_mood +4',
        outcomeSummary:
          "Mac torched the sessions and backed {artistName}'s restart — the gut says the real record is still coming.",
      },
      {
        id: 'hold_the_deadline',
        label: 'Hold the deadline',
        gist:
          'The record ships as scheduled. The cycle stays hot, the label keeps its word — and the artist swallows it.',
        immediate: 'reputation +2',
        delayed: 'awareness_boost +2, artist_mood −6, exec_mood −3',
        outcomeSummary:
          'Mac held {artistName} to the deadline — the record ships on schedule, feelings notwithstanding.',
      },
      {
        id: 'bring_a_cowriter',
        label: 'Bring in a co-writer',
        gist: 'Fresh ears inside the existing sessions: the gut gets heard, the calendar survives.',
        immediate: 'money −10000',
        delayed: 'quality_bonus +3, artist_mood +2, exec_mood +1',
        outcomeSummary:
          "Mac brought a co-writer into {artistName}'s sessions — fresh ears, deadline intact, gut half-honored.",
      },
    ],
    bandPredictions: {
      heading: 'Band predictions',
      loyal:
        'bring_a_cowriter: quality 3 + mood 2 − money (cap −5) = 0 vs deadline = rep 2 + awareness 2 − mood 5 = ' +
        '−1; restart = −100 (variance veto). ⚑ margin is 1 point of capped safety score — verify offline; if it ' +
        'flips, soften the co-writer cost to −$8k or add artist_energy +1 (fresh hands share the load).',
      committed:
        'hold_the_deadline: 2·2 rep + 2 awareness = 6.0 vs co-writer = 2·3 − 10000/4000 = 3.5 vs restart = 2·6 − ' +
        '3·2 − 15000/4000 = +2.25. Clear.',
      disloyal:
        'back_the_restart: 10·2 + 3·6 = 38. Massive margin, no hint needed. Perfect 3-way split.',
      flags: '⚑ loyal margin ~1 (capped-score arithmetic).',
    },
    notes: [
      "Mac's angle vs Dante's territory (designer note applied): Dante's version of this meeting would be about " +
        'HIS sonic truth ("the record isn\'t speaking"); Mac\'s is about the ARTIST\'S instinct — his gut-religion ' +
        "applied to someone else's gut, and the prompt makes the midnight call go to Mac, not the producer. The " +
        'restart is EV-attractive per P2: quality +6 / mood +6 / exec_mood +4 is ~2× the co-writer\'s guaranteed ' +
        "bundle, riding variance 2 — an inspired disloyal Mac taking it is sometimes RIGHT, and the loyal band's " +
        'caution has a visible opportunity cost. Mechanics cash the fiction cleanly: restart/co-writer bank into ' +
        "the NEXT recording session (the active project's continuation), deadline's awareness_boost = the planned " +
        "release's anticipation stays warm because the date holds. Artist reacts on all three (+6 trusted / −6 " +
        'overruled / +2 heard-in-half).',
    ],
    upgradeSpec:
      'UPGRADE SPEC (future mechanism: project-level restart): back_the_restart ideally rewinds the actual ' +
      'recording project (weeks-remaining reset, budget re-draw, song slots cleared) instead of banking into the ' +
      'next session. Needs a project-mutation effect key that doesn\'t exist; the banked quality/variance version ' +
      'is the closest honest cash today.',
    sourceFile: 'v3-mac-authored-major.md',
  },
  {
    id: 'one_that_got_away_again',
    title: 'The One That Got Away, Again',
    status: 'AUTHORED, pending Nes review',
    finalized: false,
    contentPending: false,
    tier: 'crisis',
    gating: 'reactive chart_debut · role head_ar',
    prompt:
      "You know the name I don't say. The one that made me start the wall. Twenty minutes after {songTitle} " +
      'charted, their manager called my cell — a number they\'ve had for six years and never once used. They ' +
      'want in. The price is a war-chest number, and the memo has to be signed while the chart still has our ' +
      'name on it. I have waited two years for this phone to ring. Tell me what we do before I pick it up.',
    description:
      'The artist Mac famously lost is finally calling — the week you charted, and at a price that dents the war chest.',
    choices: [
      {
        id: 'pay_the_price',
        label: 'Pay it — sign the memo tonight',
        gist:
          'The whale calls once. Wire the advance, announce the reunion while {songTitle} is still on the board, ' +
          'fold them straight into the next sessions.',
        immediate: 'money −50000',
        delayed: 'variance_up +2, quality_bonus +3, awareness_boost +3',
        outcomeSummary:
          'Mac paid the ask and papered the reunion deal the same night — announcement first, fine print later.',
      },
      {
        id: 'feature_not_forever',
        label: 'Counter with a feature',
        gist:
          'One verse, one check, prove the fit before anyone signs a life together. The trades still get their headline.',
        immediate: 'money −15000, reputation +2',
        delayed: 'press_story_flag 1, quality_bonus +3',
        outcomeSummary:
          'Mac talked them down to a feature — one verse, one check, and the door left open.',
      },
      {
        id: 'let_mac_say_no',
        label: 'Let Mac finally say no',
        gist:
          "They didn't call when it was hard. Your charting artist is watching who the label answers to this week.",
        immediate: 'exec_mood +8, artist_mood +3, reputation +1',
        delayed: '',
        outcomeSummary:
          "Mac took the call, said the no he'd rehearsed for two years, and hung up lighter.",
      },
    ],
    bandPredictions: {
      heading: 'Bands (target)',
      loyal:
        'let_mac_say_no (spend-free, mood-positive, gamble-free) ⚑ thin margin vs feature_not_forever (quality ' +
        '+3 / rep +2, also gamble-free — depends on whether exec_mood enters the safety scorer; verify offline).',
      committed:
        'feature_not_forever (2Q6 + 2rep4 − spend3.75 ≈ 6.25 vs say-no ≈ 2 vs pay ≈ −9.5).',
      disloyal:
        'pay_the_price (10·V2 + 3·Q3 = 29 vs 9 vs 0 — clean margin, no hint needed). Aspire 3-distinct: PASSES.',
      flags: '⚑ loyal margin thin — verify offline.',
    },
    notes: [
      'P2 check: the gamble carries ~2× the guaranteed bundle of its safe siblings (V2 + Q3 + A3 vs Q3+rep2) — a ' +
        'disloyal Mac paying it is sometimes right, which is the point.',
      'Neglect linkage: the disloyal summary — "papered the reunion deal the same night… fine print later" — is ' +
        'the memo-with-a-leaving-fee-nobody-read of escalation_ar_botched_signing, verbatim setup.',
      'HONEST-VERSION note: "pay it" cannot actually put the returning artist on the roster today (no ' +
        'spawns_artist). The honest fiction: the memo is inked and they\'re in the building — co-writing the next ' +
        'sessions (variance/quality bank) with the reunion announcement heat banking onto the next planned ' +
        'release (awareness). The prose promises presence, not a roster slot.',
    ],
    upgradeSpec:
      'UPGRADE SPEC (future mechanism spawns_artist): pay_the_price becomes a true signing — the returnee joins ' +
      'the roster as a real artist (popularity seeded high, price honest at −$50k+). Second flagship use case ' +
      "after Wall of Misses' spawns_release.",
    sourceFile: 'v3-mac-authored-reactive.md',
  },
  {
    id: 'mood_crater_rescue',
    title: 'Mood-Crater Rescue',
    status: 'AUTHORED, pending Nes review',
    finalized: false,
    contentPending: false,
    tier: 'crisis',
    gating: 'reactive mood_crater · role head_ar',
    prompt:
      "Mac's already got a flight tab open. 'I've seen this spiral before — I lose them if I'm not in the room " +
      "by Friday. But listen —' and here it comes '— there's a kid in that same city. Unsigned. Sounds like the " +
      "future. I could take two meetings. Nobody has to know which one I flew out for.' He means it as " +
      "efficiency. Say the word and he's on a plane — the only question is with how many itineraries.",
    description:
      "{artistName} is spiraling, and Mac wants to fly out — with a plan-B artist's showcase on the same calendar, just in case.",
    choices: [
      {
        id: 'send_mac_all_in',
        label: 'Send him — one itinerary',
        gist:
          'No hedge, no agenda. Mac in the room until {artistName} is standing again, and the label seen standing there too.',
        immediate: 'money −8000, artist_mood +10, reputation +2',
        delayed: '',
        outcomeSummary:
          "Mac flew out with nothing in the bag but the fix — a week at {artistName}'s side, no second agenda.",
      },
      {
        id: 'scout_the_hedge',
        label: 'Take the second meeting quietly',
        gist:
          "The label can't be one bad month from silence. Mac covers the future; {artistName} gets a long phone call.",
        immediate: 'money −5000, exec_mood +4, self_serving_hint: true',
        delayed: 'variance_up +1, awareness_boost +2, artist_mood −4',
        outcomeSummary:
          "Mac worked the plan-B kid's showcase while {artistName} spiraled — insurance, he's calling it.",
      },
      {
        id: 'both_and_pray',
        label: 'Both — and pray nobody talks',
        gist:
          'Fix the artist by day, court the kid by night. If either room finds out about the other, the story writes itself.',
        immediate: 'money −25000, artist_mood +6, rep_swing 2, exec_mood +2',
        delayed: '',
        outcomeSummary: 'Mac ran both plays in one city and bet nobody would compare calendars.',
      },
    ],
    bandPredictions: {
      heading: 'Bands (target)',
      loyal: 'send_mac_all_in (mood +10, gamble-free; the other two carry variance/rep_swing → −100).',
      committed:
        "send_mac_all_in too (2rep4 − spend2 = 2 vs hedge A2 − 3V·1 ≈ −1 vs both −3V·2 − spend6.25 ≈ −12; " +
        "artist_mood isn't in committed's formula, so nothing pulls it elsewhere) — aspire-miss: loyal = " +
        'committed, minimum test still passes (2 distinct).',
      disloyal:
        "scout_the_hedge only via self_serving_hint: the math confirms the task's ⚑ — numerically both_and_pray " +
        'wins (10·rep_swing2 = 20 > 10·variance1 + small = ~10), and "do both" is not the vice; scouting the ' +
        'replacement IS. Hint is the P6-correct fix (vice ≠ numeric argmax).',
      flags: 'Hint required on scout_the_hedge; aspire-miss loyal = committed (2 distinct).',
    },
    notes: [
      'Unsigned-talent rule applied: the plan-B kid can\'t take artist_mood/popularity — exec_mood +4 is Mac\'s ' +
        'reaction axis ("covered"), and the betrayal lands on {artistName} (−4 delayed, word gets around).',
      'HONEST-VERSION note: awareness for the unsigned act is unbuildable; the honest close is label-level — ' +
        '"Mac is shopping" chatter banks hype onto the label\'s next planned release (+2), and the kid\'s demo ' +
        'energy enters the next session as variance.',
      'Neglect linkage: disloyal summary — Mac courting a signing solo mid-crisis — flows directly into ' +
        'escalation_ar_botched_signing: the plan-B courtship IS the wild-card deal he papers alone.',
    ],
    upgradeSpec:
      'UPGRADE SPEC (prospect/spawns_artist mechanism): the hedge produces an actual signable prospect with its ' +
      'own awareness, making the insurance real instead of atmospheric.',
    sourceFile: 'v3-mac-authored-reactive.md',
  },
  {
    id: 'demo_ethics_one',
    title: 'The Demo Ethics One',
    status: 'AUTHORED, pending Nes review',
    finalized: false,
    contentPending: false,
    tier: 'major',
    gating: 'reactive recent_signing · role head_ar',
    prompt:
      "Mac closes the door before he talks, which never means good news. 'The demo. The one that made me sign " +
      "{artistName}. There's a co-writer on it — uncleared, uncredited, and as of this morning, lawyered. I " +
      "played that tape for this whole building and said I'd found a complete artist. Turns out I found most of " +
      "one. I can make this quiet, I can make it right, or we cut the song again from zero — but if it gets loud " +
      "before the ink dries on the profile pieces, it isn't their name that eats it. It's my ear.'",
    description:
      "The breakout demo that justified your newest signing has an uncleared co-writer — and Mac's reputation is welded to it.",
    choices: [
      {
        id: 'settle_quietly',
        label: 'Settle it quietly',
        gist:
          'One number, one NDA, and the story stays the one Mac told. {artistName} never has to read about themselves.',
        immediate: 'money −18000, exec_mood +3, self_serving_hint: true',
        delayed: 'artist_mood +3',
        outcomeSummary:
          'Mac settled the co-writer claim quietly and buried the paperwork — the demo, and his ear, stay spotless.',
      },
      {
        id: 'credit_publicly',
        label: 'Credit them publicly',
        gist:
          'Add the name, restructure the royalties, own the correction before someone else owns it for you.',
        immediate: 'money −5000, reputation +4',
        delayed: 'press_story_flag 1, artist_mood −3',
        outcomeSummary:
          "Mac put the co-writer's name on the record and let the label wear the correction in public.",
      },
      {
        id: 're_record',
        label: 'Cut it again, clean',
        gist:
          "Book the room, strip the song to what was always {artistName}'s, and rebuild it bar by bar. Slower, and theirs.",
        immediate: 'money −8000',
        delayed: 'quality_bonus +4, artist_mood +2',
        outcomeSummary:
          'Mac booked the room and had {artistName} cut the song again — theirs this time, every bar.',
      },
    ],
    bandPredictions: {
      heading: 'Bands (target)',
      loyal: "re_record (quality + artist_mood, small spend, gamble-free — the safety scorer's natural home).",
      committed:
        'credit_publicly (2rep8 − spend1.25 ≈ 6.75 vs re-record 2Q8 − 2 = 6 — ⚑ THIN margin, verify offline; ' +
        'nudge rep to +5 or re-record cost up if it flips).',
      disloyal:
        "settle_quietly via hint — confirmed necessary: numerically Mac's scorer would grab re_record (3·Q4 = 12 " +
        'vs 0 vs 0), which is the loyal pick and narratively wrong; the vice is protecting the signing that ' +
        'proves his ear. Aspire 3-distinct: PASSES (with the hint).',
      flags: 'Hint required on settle_quietly; ⚑ committed margin thin.',
    },
    notes: [
      'Tier check: major band respected — money −$18k, rep +4, mood ±3, quality +4. The temptation is genuinely ' +
        "attractive: hush is the only choice where {artistName}'s mood rises and nothing public happens.",
      'Neglect linkage: disloyal summary — "buried the paperwork" — is precisely the unread fine print ' +
        'escalation_ar_botched_signing exhumes: a settlement Mac papered solo around the signing nobody vetted.',
    ],
    upgradeSpec: null,
    sourceFile: 'v3-mac-authored-reactive.md',
  },
  {
    id: 'the_circuit',
    title: 'The Circuit',
    status: 'NEW (scouting-trip economics)',
    finalized: false,
    contentPending: false,
    tier: 'routine',
    gating: 'requires artist_signed · role head_ar',
    prompt:
      "There's a scene forming out on the small-room circuit — four towns, maybe five, nothing the algorithms " +
      "have smelled yet. I can hear it from here, which means in six months everyone can. I want a week, a " +
      "rental car, and gas money. Last time somebody told me a trip like this wasn't in the budget, the kid I " +
      "didn't drive out to see is on my wall now.",
    description:
      'Mac wants a week and a budget to drive the small-venue circuit chasing a scene that hasn\'t surfaced yet.',
    choices: [
      {
        id: 'fund_the_full_run',
        label: 'Fund the full run',
        gist: 'A week in the field, ears first, receipts later.',
        immediate: 'money −6000, executive_mood +4',
        delayed: 'quality_bonus +2, variance_up +1',
        outcomeSummary:
          "Mac disappeared into the small-room circuit for a week, chasing a scene the algorithms haven't found yet.",
      },
      {
        id: 'two_nights_that_matter',
        label: 'Two nights, two showcases',
        gist: 'Skip the odyssey — hit the two rooms with real heat and shake the right hands.',
        immediate: 'money −2000, reputation +2, executive_mood +2',
        delayed: 'award_chances +1',
        outcomeSummary:
          'Mac hit the two showcases that mattered, worked the rooms, and was home by Sunday with his network warmer for it.',
      },
      {
        id: 'open_the_doors_instead',
        label: 'Let the scene come to us',
        gist: 'No trip — the label hosts a listening night, roster front and center.',
        immediate: 'executive_mood −3, artist_mood +2, press_momentum +1',
        delayed: '',
        outcomeSummary:
          'Mac stayed off the road and the label opened its doors instead — a listening night with {artistName} playing host.',
      },
    ],
    bandPredictions: {
      heading: 'Bands (target)',
      loyal:
        "open_the_doors ⚑ (no spend, artist_mood +2 carries it past the showcase option's rep+award-minus-spend " +
        '— margin thin, verify).',
      committed: 'two_nights (2·rep(2) + award(1) − spend(0.5) = 4.5, clean argmax).',
      disloyal: 'full_run (10·V(1) + 3·Q(2) = 16, wins outright — no hint needed). Aspire-3 met.',
      flags: '⚑ loyal margin thin — verify.',
    },
    notes: [
      'P2 check: the vice is EV-attractive — quality +2 banked plus the variance kicker vs. the safe siblings\' ' +
        'rep/award crumbs; a hot roll on the widened session is genuinely the best outcome in the meeting.',
      'Fiction cashing mechanics: scouting can\'t sign anyone (no engine verb), so the honest version is what the ' +
        'trip does to Mac and the next session — a week of raw rooms recalibrates his ear (quality_bonus) and ' +
        'makes his next read wilder (variance_up). Unsigned talent has no mood target; exec_mood is the reaction ' +
        'axis on the road choices, and the signed artist reacts (+2) only where the fiction touches them (hosting ' +
        'the night).',
    ],
    upgradeSpec:
      'UPGRADE SPEC (future mechanism discovered_prospect / signing-pool injection): the natural payoff is a ' +
      'real act entering the signable-artist pool with a Mac-sourced quality prior. When a prospect-pool ' +
      'mechanism exists, fund_the_full_run should roll a chance to surface a new signable artist tagged "Mac\'s ' +
      'find" instead of (or alongside) the quality bank.',
    sourceFile: 'v3-mac-authored-new.md',
  },
  {
    id: 'second_pair_of_ears',
    title: 'The Second Pair of Ears',
    status: 'NEW (protégé / junior A&R hire)',
    finalized: false,
    contentPending: false,
    tier: 'major',
    gating: 'requires music_exists · role head_ar',
    prompt:
      "There's a kid who's been sneaking into my listening sessions for three months. Last week they played me " +
      "something I'd have passed on — and they were right and I was wrong, and you know how often I say that " +
      "sentence. I was that kid once, before anyone paid me to be. I want to bring them in. The only question is " +
      "whether we do it with a contract or a handshake — and whether I'm building an ear or a rival.",
    description:
      'A junior scout Mac has been mentoring off-book just out-heard him. He wants the kid inside the building — on some terms or other.',
    choices: [
      {
        id: 'hand_them_a_budget',
        label: 'Give the kid a signing budget',
        gist: "Two guts in the field, no leash on either — that's how scenes get caught.",
        immediate: 'money −15000, executive_mood +5',
        delayed: 'variance_up +2, quality_bonus +3',
        outcomeSummary:
          'Mac handed his protégé a real discovery budget and told them to trust the itch — two wild ears loose in the field now.',
      },
      {
        id: 'hire_them_properly',
        label: 'Hire them into a real junior role',
        gist: "Contract, process, and Mac's sign-off on every call — build the ear inside the fence.",
        immediate: 'money −10000, reputation +2, executive_mood +2',
        delayed: 'award_chances +2',
        outcomeSummary:
          "Mac's protégé joined the label on a proper contract — a second pair of ears, with process wrapped around them.",
      },
      {
        id: 'keep_it_a_handshake',
        label: 'No hire — keep it off the books',
        gist: 'Payroll ruins ears; mentorship stays gas money and rough mixes.',
        immediate: 'executive_mood −2, creative_capital +1',
        delayed: 'quality_bonus +1',
        outcomeSummary:
          'Mac took the no and kept mentoring the kid on handshakes and gas money — off the books, the way he started.',
      },
    ],
    bandPredictions: {
      heading: 'Bands (target)',
      loyal:
        "keep_it_a_handshake ⚑ (zero spend + CC + small quality vs. the proper hire's rep/award minus a capped " +
        '−5 spend hit — thin margin, verify).',
      committed:
        "hire_them_properly (2·rep(2) + award(2) − spend(2.5) = 3.5 vs. handshake's ~2, clean-ish).",
      disloyal: 'hand_them_a_budget (10·V(2) + 3·Q(3) = 29, dominant — no hint needed). Aspire-3 met.',
      flags: '⚑ loyal margin thin — verify.',
    },
    notes: [
      "P2 check: the vice bundles quality +3 — roughly double the handshake's banked value — so the double-gut " +
        "gamble is a real offer, not poison; a loyal Mac's caution has visible opportunity cost.",
      "Character beat: the kid is Mac's younger self — the wall of misses made flesh. The vice isn't the hire; " +
        "it's unsupervised replication of his own gut. The find is unsigned, so exec_mood is the reaction axis " +
        'throughout; the handshake option stings him (−2) but keeps the kid in his orbit, hence the CC and ' +
        'quality trickle (rough mixes and reference tracks keep feeding his notes).',
    ],
    upgradeSpec:
      'UPGRADE SPEC (future mechanism: choice-set story flags): hand_them_a_budget and hire_them_properly both ' +
      "want to set flags.story['macs_protege'] so a later meeting can exist only in worlds where the kid is " +
      'inside ("The Protégé\'s First Signing" — the kid\'s gut call lands on your desk and Mac must judge his own ' +
      "reflection). Closest honest version today: the banked quality/variance stand in for the kid's first " +
      'contribution.',
    sourceFile: 'v3-mac-authored-new.md',
  },
  {
    id: 'machine_that_listens',
    title: 'The Machine That Listens',
    status: 'NEW (data-analytics A&R encroachment)',
    finalized: false,
    contentPending: false,
    tier: 'major',
    gating: 'requires release_out · role head_ar',
    prompt:
      "The board sent me a demo login for a 'predictive A&R platform.' It's been trained on our release history. " +
      'Our history. It scored everything I ever brought in, and it has opinions about what I should sign next. ' +
      "Every label that bought one of these fired somebody like me within two years. So here's my counter-offer: " +
      'put me against it. My next call versus its next call, out loud, on the record. If a spreadsheet can hear ' +
      "what I hear, I'll carry it to the server room myself.",
    description:
      'A predictive A&R platform — trained on your own catalog — is knocking, and Mac wants to fight it in public rather than share an office with it.',
    choices: [
      {
        id: 'token_pilot',
        label: 'Run the free-tier pilot',
        gist: 'Appease the board with a demo; Mac keeps final say on anything with a pulse.',
        immediate: 'money −1000, reputation +1, executive_mood +1',
        delayed: 'award_chances +1',
        outcomeSummary:
          'Mac tolerated a token trial of the prediction engine — the board got its demo, and his gut kept the final say.',
      },
      {
        id: 'stake_mac_against_it',
        label: 'Put Mac against the machine',
        gist: "His next call versus the algorithm's, in public, winner keeps the budget line.",
        immediate: 'money −5000, executive_mood +6, artist_mood +1',
        delayed: 'variance_up +2, quality_bonus +2, press_story_flag 1',
        outcomeSummary:
          "Mac staked his ear against the algorithm on the record — his next call versus the machine's, winner keeps the budget.",
      },
      {
        id: 'buy_the_terminal',
        label: 'License the full platform',
        gist: 'The data moves in down the hall; the label reads as modern and Mac reads as furniture.',
        immediate: 'money −12000, reputation +2, executive_mood −5, artist_mood −2',
        delayed: 'quality_bonus +3',
        outcomeSummary:
          'Mac signed off on the full prediction platform moving in down the hall — he calls it the obituary desk, but the data flows.',
      },
    ],
    bandPredictions: {
      heading: 'Bands (target)',
      loyal:
        "token_pilot ⚑ (small guaranteed bundle at trivial spend beats the terminal's rep+quality dragged down " +
        "by the capped −5 spend and the roster's −2 mood — thin, verify).",
      committed:
        'buy_the_terminal (2·Q(3) + 2·rep(2) − spend(3) = 7, clear argmax — the competent professional buys the ' +
        "tool and manages Mac's feelings).",
      disloyal:
        "stake_mac_against_it (10·V(2) + 3·Q(2) = 26 vs. terminal's 9 — dominant, no hint needed). Aspire-3 " +
        'met, and the trilemma is the character thesis: appease, replace, or bet on the gut.',
      flags: '⚑ loyal margin thin — verify.',
    },
    notes: [
      'P2 check: the bet carries quality +2 AND a banked press story ("Mac vs. the Machine" writes itself) for a ' +
        "third of the terminal's price — genuinely the best EV in the meeting if the variance breaks warm, which " +
        'is exactly when an inspired disloyal Mac should feel right.',
      "Artist reactions: the roster hates being dashboarded (buy_the_terminal artist_mood −2) and loves Mac's " +
        'swagger (stake_mac_against_it artist_mood +1). Gated release_out so "trained on our release history" is ' +
        'always true when this fires.',
      "Fiction cashing mechanics: the platform's session analytics genuinely sharpen the next recording " +
        "(quality_bonus on the terminal); the bet's stakes land as a widened, loaded next session plus the press " +
        'flag banked for the next release.',
    ],
    upgradeSpec:
      'UPGRADE SPEC (future mechanism: multi-week chained events): the bet demands a resolution beat — a ' +
      'follow-up event N weeks out that names the winner ("the machine\'s pick stalled; Mac\'s is charting" or the ' +
      'reverse) and moves exec_mood/rep accordingly. Today the variance bank is the honest stand-in for an ' +
      'unresolved wager; when chained events generalize from the escalation pipeline, stake_mac_against_it ' +
      'should schedule the verdict.',
    sourceFile: 'v3-mac-authored-new.md',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Generic-shape export (pool-review extension): map the structured Mac band
// fields onto the shared PoolReviewEntry shape. Pure re-labeling — every
// authored string above is carried through unchanged.
// ─────────────────────────────────────────────────────────────────────────────

export const V3_MAC_POOL_MEETINGS: PoolReviewEntry[] = V3_MAC_POOL_MEETINGS_RAW.map((m) => ({
  id: m.id,
  title: m.title,
  status: m.status,
  finalized: m.finalized,
  contentPending: m.contentPending,
  tier: m.tier,
  gating: m.gating,
  prompt: m.prompt,
  description: m.description,
  choices: m.choices,
  bandPredictions: m.bandPredictions
    ? {
        heading: m.bandPredictions.heading,
        lines: [
          `Loyal: ${m.bandPredictions.loyal}`,
          `Committed: ${m.bandPredictions.committed}`,
          `Disloyal: ${m.bandPredictions.disloyal}`,
          ...(m.bandPredictions.flags ? [`Flags: ${m.bandPredictions.flags}`] : []),
        ],
      }
    : null,
  designNotes: [],
  notes: m.notes,
  upgradeSpecs: m.upgradeSpec ? [m.upgradeSpec] : [],
  sourceFile: m.sourceFile,
}));

export const V3_MAC_POOL_LEVEL_NOTES: string[] = [];
