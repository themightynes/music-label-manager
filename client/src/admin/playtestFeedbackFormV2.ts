/**
 * Playtest feedback form definition — Round 2 (2026-07-12), the results of
 * the round-1 tuning arc (#159/#160/#161/#162).
 *
 * This is the on-screen mirror of docs/01-planning/PLAYTEST_FEEDBACK_2026-07-12.md
 * (the markdown stays the printable source; the /admin/playtest-feedback page
 * is the recording surface). Wording is carried verbatim from the markdown
 * wherever possible. House rule: NO engine numbers/multipliers in any label
 * or copy — tests/client/playtest-feedback-form-v2.test.tsx guards this
 * module the same way the round-1 module and helpTopics are guarded.
 *
 * Section/knob ids are the canonical V2 ones from @shared/api/contracts
 * (PLAYTEST_SECTION_IDS_V2 / PLAYTEST_KNOB_IDS_V2) — the contract test
 * asserts the two lists stay in lockstep.
 *
 * The round-1 module (playtestFeedbackForm.ts) stays in the repo untouched:
 * it is the historical content behind the round-1 responses file.
 */

import {
  type PlaytestFormDefinition,
  type PlaytestFormSection,
  type PlaytestKnobRow,
  ANYTHING_OFF_PROMPT,
} from './playtestFeedbackForm';

export const FORM_TITLE_V2 = 'Playtest Feedback — Round 2: Volatility & Crisis, 2026-07-12';

export const FORM_INTRO_V2 =
  'Round 2. Your round-1 answers drove a four-PR tuning arc — energy lifecycle, reactive mood, flop drama, ' +
  'slower reputation, richer Creative Capital, sharper meeting relevance, mandatory crisis events, hype legibility, ' +
  'Board brief previews — and this form playtests the results. The three mechanics you never saw fire in round one ' +
  '(flop penalty, mood-driven recording variance, energy effects) should now be encounterable; each gets an explicit ' +
  're-test below. Same rules as before: qualitative only, "never saw it" is a real and useful answer, blank free-text ' +
  'means nothing to report, and the designer questions are the real payload. ' +
  'Reminder: restart the dev server before playing — server-side engine code does not hot-reload.';

export const PLAYTEST_FORM_SECTIONS_V2: PlaytestFormSection[] = [
  {
    id: 'mandatory_crisis_events',
    number: 1,
    title: 'Crisis on the Desk — mandatory side events',
    blurb:
      'A side event that fires no longer resolves inside the weekly results — it lands on your desk the following ' +
      'week as a mandatory crisis card that takes over one focus slot. You cannot advance the week until you decide ' +
      'how to handle it, and the week summary then reports the week you spent handling it. This was your round-one ' +
      'ask, near verbatim.',
    exposurePrompt: 'Did you encounter it? (tick all you saw)',
    exposureMulti: true,
    exposureOptions: [
      { id: 'crisis_card', label: 'A crisis card occupying a focus slot' },
      { id: 'advance_blocked', label: 'The advance blocked until I resolved it' },
      { id: 'handled_beat', label: 'The "spent the week handling it" beat in the week summary' },
      { id: 'multiple_crises', label: 'More than one crisis across the run' },
      { id: 'never', label: 'Never had one fire since the merge' },
    ],
    designerQuestions: [
      'Round one: resolving a crisis inside the weekly results "makes it feel less like an OH MY!" — your words. ' +
        'Is this the OH MY now? Does a crisis landing on your desk carry real dramatic weight, or has it already ' +
        'become a chore card you click through?',
      'The slot cost is the teeth — a crisis week is a week where you do one less thing. Does that price create the ' +
        'right tension, or does losing the slot read as punishment stacked on bad luck?',
      'Crises still land roughly one week in five — same rhythm as before, but now each one costs real bandwidth. ' +
        'Does that frequency feel right lived-in, or should they be rarer-and-bigger? And did the choices on the ' +
        'card ever feel like a real decision under pressure, or an obvious pick?',
    ],
  },
  {
    id: 'energy_lifecycle',
    number: 2,
    title: 'Energy lifecycle — work drains, rest recovers',
    blurb:
      'Energy now moves: recording weeks drain it, every tour city drains it, and an artist with nothing on their ' +
      'plate recovers. Round one you rated energy effects "never saw it" and asked for energy tied to everything an ' +
      'artist actively does — this is that request, shipped.',
    exposurePrompt: 'Did you encounter it? (tick all you saw)',
    exposureMulti: true,
    exposureOptions: [
      { id: 'recording_dip', label: 'Watched energy dip while an artist was recording' },
      { id: 'tour_dip', label: 'Watched energy dip across a tour' },
      { id: 'idle_recovery', label: 'Watched an idle artist recover' },
      { id: 'planned_rest', label: 'Deliberately scheduled a rest week' },
      { id: 'never', label: 'Still could not see energy move' },
    ],
    designerQuestions: [
      'Round-one follow-through: energy was invisible then. Does it now visibly breathe — down when they work, up ' +
        'when they rest — across a normal campaign?',
      'Did the lifecycle ever change a real decision (delayed a tour, forced a rest week, staggered recordings), ' +
        'or does the number move without ever mattering?',
    ],
  },
  {
    id: 'mood_outcomes',
    number: 3,
    title: 'Mood reacts to outcomes — flops hurt, breakthroughs lift, drift livelier',
    blurb:
      'A flop now dents the release artist\'s mood, a breakthrough lifts the song artist\'s mood, and weekly ' +
      'natural drift is stronger. Round one: "mood was generally stable" across a twenty-week run — this aims ' +
      'squarely at that.',
    exposurePrompt: 'Did you encounter it? (tick all you saw)',
    exposureMulti: true,
    exposureOptions: [
      { id: 'flop_mood_hit', label: "Saw a flop knock an artist's mood down" },
      { id: 'breakthrough_lift', label: "Saw a breakthrough lift an artist's mood" },
      { id: 'livelier_drift', label: 'Noticed livelier week-to-week drift' },
      { id: 'still_flat', label: 'Mood still felt flat all run' },
    ],
    designerQuestions: [
      'Round-one follow-through: you said mood never got volatile enough to matter. Does mood now tell a story ' +
        'across the campaign — rough patches, hot streaks — or is it still close to a flat line?',
      'When mood moved off an outcome, was the cause legible in the moment (you knew the flop did it), or did the ' +
        'needle just wiggle?',
    ],
  },
  {
    id: 'mood_recording_variance_retest',
    number: 4,
    title: 'Re-test: low mood widens recording variance',
    blurb:
      'Mechanically unchanged since round one — but round one you never reached low mood, so it never had a chance ' +
      'to fire. With mood now actually swinging, this should finally be encounterable.',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'natural', label: 'Recorded with a genuinely low-mood artist this run' },
      { id: 'hunted', label: 'Went looking for it (tanked a mood on purpose)' },
      { id: 'never', label: "Still never got an artist's mood low enough" },
    ],
    designerQuestions: [
      'You marked this "too weak" in round one without ever seeing it fire. Now that low mood is reachable: could ' +
        "you feel the swing this time — takes landing worse or better than the artist's usual?",
      'Is "get their head right before the studio" now a lever you actually pull, or still noise you cannot plan ' +
        'around?',
    ],
  },
  {
    id: 'flop_drama',
    number: 5,
    title: 'Flops are a moment — harder sting, louder beat',
    blurb:
      "A flop now costs more reputation, dents the artist's mood, and lands as its own notable beat in the week " +
      'summary instead of a quiet ledger line. Round-one verdict: "didn\'t feel dramatic enough," knob marked too ' +
      'weak.',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'natural', label: 'Had a flop land in natural play' },
      { id: 'hunted', label: 'Engineered one to see the drama' },
      { id: 'never', label: 'Never flopped this run' },
    ],
    designerQuestions: [
      'Round-one follow-through: does a flop now read as an event — you see it, you feel it, you know what it cost ' +
        '— or is it still something you discover later in the numbers?',
      'Does flop risk now genuinely enter the greenlight decision on an expensive release, or is the fear still ' +
        'theoretical?',
    ],
  },
  {
    id: 'reputation_pacing',
    number: 6,
    title: 'Reputation pacing — the climb is a career now',
    blurb:
      'Positive reputation gains are damped across every source; losses are not. Round one: "reputation gain feels ' +
      'aggressive and quick" — you were at the ceiling barely halfway through the campaign.',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'deep_run', label: 'Played deep enough into a campaign to feel the new pacing' },
      { id: 'short_stretch', label: 'Watched reputation across a shorter stretch' },
      { id: 'never', label: "Didn't track reputation this run" },
    ],
    designerQuestions: [
      'The direct question: does a full campaign now have a reputation arc — still climbing, still earning in the ' +
        'late game, with the ceiling out of reach until the end (if ever)?',
      'Slower gains plus harsher flop losses: does reputation now feel like something you protect and spend, or ' +
        'just the same number rising slower?',
    ],
  },
  {
    id: 'creative_capital_income',
    number: 7,
    title: 'Creative Capital income — the studio meeting pays better',
    blurb:
      "The recording meeting's Creative Capital grants got a real boost. Round one: \"gaining CC is a bit of a " +
      'struggle."',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'took_meeting', label: "Took the recording meeting's Creative Capital choices this run" },
      { id: 'felt_looser', label: 'Noticed the Creative Capital economy loosen in general play' },
      { id: 'still_starved', label: 'Still felt starved for Creative Capital' },
    ],
    designerQuestions: [
      'Round-one follow-through: can you now bank toward the creative moves you want at a livable clip — or is ' +
        'Creative Capital still the resource that stalls your plans?',
      'Where should the scarcity sit: is Creative Capital currently doing good work (forcing real trade-offs) or ' +
        'just throttling the fun parts of the game?',
    ],
  },
  {
    id: 'meeting_relevance_whynow',
    number: 8,
    title: 'Meeting relevance — why-now pushes harder',
    blurb:
      "Meetings that are reacting to your label's current situation now push to the front of the weekly slate more " +
      'aggressively. Round-one knob verdict: too weak.',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'noticed', label: 'Noticed the slate visibly reacting to my situation' },
      { id: 'couldnt_tell', label: "Watched for it but couldn't tell" },
      { id: 'never', label: "Didn't watch for it" },
    ],
    designerQuestions: [
      'Round-one follow-through: does the weekly slate now chase your situation — the right meeting showing up the ' +
        'week it matters — or does selection still read as generic rotation?',
      'When a why-now meeting surfaced, did its line convince you it was reacting to something real you did — or ' +
        'did it feel like flavor text stapled to a random pick?',
    ],
  },
  {
    id: 'hype_attach_ux',
    number: 9,
    title: 'Hype legibility — attach preview, anticipation line, named pools',
    blurb:
      'Release planning now previews which banked pools will pour into the release before you confirm; a weekly ' +
      'anticipation line tracks hype building toward upcoming releases; and the dashboard hype section names what ' +
      'is building and draining instead of the generic readout you flagged in round one.',
    exposurePrompt: 'Did you encounter it? (tick all you saw)',
    exposureMulti: true,
    exposureOptions: [
      { id: 'attach_preview', label: 'Saw the banked-hype preview while planning a release' },
      { id: 'anticipation_line', label: 'Read the weekly anticipation line' },
      { id: 'named_pools', label: 'Noticed the dashboard hype section got specific' },
      { id: 'never', label: 'Saw none of them' },
    ],
    designerQuestions: [
      'Round one asked for exactly this pair (attach visibility at planning, plus a de-generalized dashboard). Can ' +
        'you now read hype end-to-end — bank it, see it attach, watch it convert — or are there still blind spots?',
      'Honesty check: did any of the new hype copy overpromise — a "strong" read that converted into a launch that ' +
        'felt ordinary?',
    ],
  },
  {
    id: 'board_waiting_brief',
    number: 10,
    title: 'The Board — waiting briefs show their hand',
    blurb:
      "The open-channel strip now previews the waiting meeting's name plus a one-line snippet, with a hint when " +
      'more briefs are stacked behind it — the exact preview you asked for in round one.',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'used_to_triage', label: 'Used the previews to decide who to spend a slot on' },
      { id: 'saw_ignored', label: 'Saw them but chose the same way I always did' },
      { id: 'never', label: "Haven't spent time in The Board since" },
    ],
    designerQuestions: [
      'Round-one follow-through: does knowing what is waiting actually change how you spend focus slots on The ' +
        'Board, or is it nice-to-have flavor?',
      'Is the snippet the right length — enough to triage, not so much it spoils the meeting?',
    ],
  },
];

export const KNOB_SECTION_TITLE_V2 = 'Knob check — did the tuning land?';

export const KNOB_SECTION_BLURB_V2 =
  "Round one's table was about untouched knobs; every row here was just tuned (or newly created) in direct " +
  'response to it. This is the second-pass read that tells me whether the tuning landed, undershot, or overshot. ' +
  'Tick a strength read per system; leave blank if no opinion.';

export const PLAYTEST_FORM_KNOBS_V2: PlaytestKnobRow[] = [
  { id: 'energy_drain_rate', label: 'Energy drain (recording + touring)' },
  { id: 'idle_recovery_rate', label: 'Idle-week energy recovery' },
  { id: 'mood_swing_size', label: 'Mood swing size (outcomes + drift)' },
  { id: 'flop_sting', label: 'Flop sting (reputation + mood)' },
  { id: 'reputation_pacing', label: 'Reputation gain pacing' },
  { id: 'creative_capital_income', label: 'Creative Capital income' },
  { id: 'crisis_frequency', label: 'Crisis frequency' },
  { id: 'crisis_slot_cost', label: 'Crisis slot cost' },
];

export const ONE_KNOB_PROMPT_V2 = "One knob you'd change today if you could, and which way:";

export const PRIORITIES_SECTION_TITLE_V2 = 'Top-3 priority — what do I fix/tune next?';

export const PRIORITIES_SECTION_BLURB_V2 =
  'Rank the three things most worth my time after this round. A bug, a tuning pass, a legibility fix, or ' +
  '"make X louder." Be specific — round one left this section blank and it was missed. ' +
  'Already queued from live play this session (rank against your own finds, or strike them): ' +
  '(1) Buzz hidden-at-zero is ambiguous during the building window — a release with no banked-hype seed shows ' +
  'no Buzz section at all in its first post-release week, indistinguishable from a dead release (this misled real ' +
  'play: Glass Houses read as "never generated buzz" when it simply had not had its first building tick; candidate ' +
  'fix: always show the bar during the building weeks, even empty, labeled "building"). ' +
  '(2) Stale Admin-index link label still says Round 1. ' +
  '(3) Context, not a bug: the campaign verdict on a fresh release is a week-one snapshot — Glass Houses flipped ' +
  'from Underperformed to Strong Success as week-two streams landed; note here if that flip read as confusing ' +
  'rather than dramatic.';

export const PULL_BACK_PROMPT_V2 =
  "Anything from this tuning arc that overshot and you'd rather I pull back or reconsider?";

export const GUT_CHECK_PROMPT_V2 =
  "One-line gut check — round one's build felt stable to a fault; does round two have the drama?";

export const PLAYTEST_FORM_V2: PlaytestFormDefinition = {
  formId: 'playtest-feedback-2026-07-12',
  title: FORM_TITLE_V2,
  intro: FORM_INTRO_V2,
  sections: PLAYTEST_FORM_SECTIONS_V2,
  knobs: PLAYTEST_FORM_KNOBS_V2,
  knobSectionTitle: KNOB_SECTION_TITLE_V2,
  knobSectionBlurb: KNOB_SECTION_BLURB_V2,
  oneKnobPrompt: ONE_KNOB_PROMPT_V2,
  prioritiesSectionTitle: PRIORITIES_SECTION_TITLE_V2,
  prioritiesSectionBlurb: PRIORITIES_SECTION_BLURB_V2,
  pullBackPrompt: PULL_BACK_PROMPT_V2,
  gutCheckPrompt: GUT_CHECK_PROMPT_V2,
  anythingOffPrompt: ANYTHING_OFF_PROMPT,
};
