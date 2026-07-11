/**
 * Playtest feedback form definition — 2026-07-11 merged-mechanics form.
 *
 * This is the on-screen mirror of docs/01-planning/PLAYTEST_FEEDBACK_2026-07-11.md
 * (the markdown stays the printable source; this page is the recording
 * surface). Wording is carried verbatim from the markdown wherever possible.
 * House rule: NO engine numbers/multipliers in any label or copy — the
 * markdown already complies; tests/client/playtest-feedback-form.test.ts
 * guards this module the same way helpTopics is guarded.
 *
 * Section/knob ids are the canonical ones from @shared/api/contracts
 * (PLAYTEST_SECTION_IDS / PLAYTEST_KNOB_IDS) — the contract test asserts the
 * two lists stay in lockstep.
 */

export interface PlaytestExposureOption {
  id: string;
  label: string;
}

export interface PlaytestFormSection {
  id: string;
  number: number;
  title: string;
  blurb: string;
  exposurePrompt: string;
  /** §7–§9 are "(tick all you saw)"; everywhere else the form says one tick. */
  exposureMulti: boolean;
  exposureOptions: PlaytestExposureOption[];
  designerQuestions: string[];
}

export interface PlaytestKnobRow {
  id: string;
  label: string;
}

export const FEEL_OPTIONS = [
  { value: 'dead', label: 'dead', hint: "didn't register" },
  { value: 'flat', label: 'flat', hint: 'registered, no reaction' },
  { value: 'works', label: 'works', hint: 'landed as intended' },
  { value: 'sings', label: 'sings', hint: 'better than intended' },
] as const;

export const STRENGTH_OPTIONS = [
  { value: 'too_weak', label: 'Too weak' },
  { value: 'about_right', label: 'About right' },
  { value: 'too_strong', label: 'Too strong' },
] as const;

export const FORM_TITLE = 'Playtest Feedback — Merged Mechanics, 2026-07-11';

export const FORM_INTRO =
  'Capturing what you already felt after real play on merged main — not prescribing a fresh test run. ' +
  'If a section covers something you genuinely never bumped into, say so — "never saw it" is a real, useful answer here ' +
  '(half of these systems are invisible-until-they-fire). The free-text lines are for the one thing that felt off — ' +
  "a phrase is fine, blank = nothing to report. The designer questions are the real payload. " +
  'Reminder: if any of this felt stale, the dev server may have been running pre-merge engine code — restart-then-verify if a mechanic seemed dead.';

export const PLAYTEST_FORM_SECTIONS: PlaytestFormSection[] = [
  {
    id: 'flop_penalty',
    number: 1,
    title: 'Flop penalty — reputation finally bites back',
    blurb:
      'A big-budget release that earns almost nothing on release week costs you reputation, shown in the Achievements card.',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'natural', label: 'Happened to me in natural play' },
      { id: 'hunted', label: 'Went looking for it (deliberately floated a big release)' },
      { id: 'never', label: 'Never saw it fire' },
    ],
    designerQuestions: [
      'When the penalty hit, did you connect it to the flop — or did your reputation just quietly drop and you had to go hunting for why? Was the Achievements card the right place for it to surface?',
      'Does a two-way reputation (rep can now fall, not just climb) change how you feel about greenlighting an expensive risky release — or is the sting too small to enter the decision?',
    ],
  },
  {
    id: 'mood_recording_variance',
    number: 2,
    title: 'Low mood widens recording variance',
    blurb:
      'A low-mood artist records less predictably — you can get a worse-than-usual or better-than-usual take.',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'natural', label: 'Recorded with a visibly low-mood artist' },
      { id: 'hunted', label: 'Went looking for it (tanked a mood on purpose)' },
      { id: 'never', label: "Never saw it / couldn't tell" },
    ],
    designerQuestions: [
      'Could you actually feel the extra swing, or is variance too invisible to read across a couple of sessions? What would make "this take was volatile because they\'re miserable" legible without me putting a number on screen?',
      "Does managing mood-before-recording feel like a lever you'd choose to pull, or just noise you can't plan around?",
    ],
  },
  {
    id: 'energy_tour_sellthrough',
    number: 3,
    title: 'Artist energy drives tour sell-through',
    blurb:
      'A tired artist draws a thinner house on tour; a fresh one sells through better. First time energy has ever driven the economy.',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'natural', label: 'Toured with artists at different energy levels' },
      { id: 'hunted', label: 'Went looking for it (toured someone exhausted)' },
      { id: 'never', label: "Never saw it / couldn't tell" },
    ],
    designerQuestions: [
      'Energy used to be a display-only stat. Now that it does something — did you notice it mattered before the tour underperformed, or only in hindsight?',
      "Note (C87): touring doesn't yet drain energy back. Did the one-directional relationship feel incomplete in play — like energy should be a resource tours burn?",
    ],
  },
  {
    id: 'tour_popularity_saturation',
    number: 4,
    title: 'Tour popularity saturation',
    blurb:
      'Popularity gains from a tour taper as an artist gets bigger — a megastar gains less pop per show than an unknown.',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'compared', label: 'Toured both small and large artists and compared' },
      { id: 'hunted', label: 'Went looking for it' },
      { id: 'never', label: "Never saw it / couldn't tell" },
    ],
    designerQuestions: [
      'Do diminishing pop-gains from touring read as fair (big stars have less to prove) or as punishing (why tour my headliner at all)?',
    ],
  },
  {
    id: 'loss_leader_marketing',
    number: 5,
    title: 'Loss-leader marketing note + ROI tooltip (PlanReleasePage)',
    blurb:
      'The release-planning page now surfaces marketing economics — a loss-leader note and an ROI tooltip. (Never rendered in-session at merge — the save had no signed artist, so this may be your first look.)',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'saw', label: 'Saw the note/tooltip while planning a release' },
      { id: 'hunted', label: 'Went looking for it' },
      { id: 'never', label: 'Never got a release-planning screen with a signed artist' },
    ],
    designerQuestions: [
      'Did the loss-leader framing change how you thought about marketing spend — or read as a wall of text you skipped past?',
      'The economics are deliberately untouched (this is a view onto existing math). After seeing it laid out, does the underlying marketing ROI feel like it needs tuning, or just needed to be visible?',
    ],
  },
  {
    id: 'hype_pools_premarketing',
    number: 6,
    title: 'Hype pools + pre-marketing (Buzz v2)',
    blurb:
      'Artists (and the label) bank hype; pre-marketing gets attached at release planning; banked hype expires if unused; cancelling a release kills the pre-buzz you built for it.',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'banked_spent', label: 'Banked and spent hype across releases' },
      { id: 'attached', label: 'Attached pre-marketing at planning time' },
      { id: 'cancelled', label: 'Cancelled a release and lost built pre-buzz' },
      { id: 'expired', label: 'Let banked hype expire' },
      { id: 'never', label: 'Never engaged with hype at all' },
    ],
    designerQuestions: [
      'Two hype pools exist (per-artist and label-wide). Was that distinction ever legible in play, or did they blur into one "hype number"?',
      'Hype expiring, and pre-buzz dying on cancel — did those feel like fair consequences you understood, or like the game silently eating value you thought you had?',
    ],
  },
  {
    id: 'awareness_surfacing',
    number: 7,
    title: 'Awareness surfacing — breakthroughs, weekly buzz, release buzz, hottest track',
    blurb:
      "Breakthrough moments now show as a notable line; a single weekly buzz line aggregates rising/fading songs; release cards carry a buzz section; there's a Hottest Track stat. All qualitative — no numbers.",
    exposurePrompt: 'Did you encounter it? (tick all you saw)',
    exposureMulti: true,
    exposureOptions: [
      { id: 'breakthrough_line', label: 'A breakthrough line in a week summary' },
      { id: 'weekly_buzz_line', label: 'The aggregated weekly buzz line ("N songs building · M fading")' },
      { id: 'release_buzz_section', label: 'The buzz section on a release card' },
      { id: 'hottest_track', label: 'The Hottest Track stat' },
      { id: 'never', label: 'Never noticed any of it' },
    ],
    designerQuestions: [
      'The breakthrough was completely invisible before this arc — deliberately demoted from a hero card to a notable line. Now that it shows: does it land as a moment, or did it slide past in the noise? Should it be louder?',
      'Everything here is qualitative on purpose (no numbers). Did the word-only language give you enough to act on, or did you find yourself wishing you could see the actual magnitude?',
    ],
  },
  {
    id: 'reactive_meetings_side_events',
    number: 8,
    title: 'Reactive meetings + side events',
    blurb:
      'Meetings now carry a "why now" line and an urgency dot when they\'re reacting to your label state; side events fire as a choice beat in the week summary; AUTO-select routes through a review panel before committing.',
    exposurePrompt: 'Did you encounter it? (tick all you saw)',
    exposureMulti: true,
    exposureOptions: [
      { id: 'why_now', label: 'A "why now" line explaining a meeting\'s relevance' },
      { id: 'urgency_dot', label: 'An urgency dot on an exec card' },
      { id: 'side_event_beat', label: 'A side-event choice beat in the week summary' },
      { id: 'auto_review', label: 'The AUTO review panel (proposals before commit)' },
      { id: 'never', label: 'Never noticed the reactive layer' },
    ],
    designerQuestions: [
      'Do the meetings now feel connected to your label\'s actual situation — or is it still "hit AUTO because it doesn\'t matter"? (That was the original root problem this arc targeted.)',
      'Side events fire roughly one week in five. Did they feel like a welcome interruption ("and then THIS happened") or like a random tax on your turn? And did the three choices ever feel like a real decision vs. an obvious pick?',
    ],
  },
  {
    id: 'tour_tier1',
    number: 9,
    title: 'Tour Tier 1 — no phantom week, city cards, foreshadow, live strip',
    blurb:
      "A tour now completes without a dangling empty week; city results show as cards in the week summary; the planning week shows a foreshadow line; there's a live TourStatusStrip in Active Tours.",
    exposurePrompt: 'Did you encounter it? (tick all you saw)',
    exposureMulti: true,
    exposureOptions: [
      { id: 'clean_finish', label: 'Booked a tour and it finished cleanly (no empty final week)' },
      { id: 'city_cards', label: 'City result cards in the week summary' },
      { id: 'foreshadow', label: 'The planning-week foreshadow line' },
      { id: 'status_strip', label: 'The live TourStatusStrip ("on tour — city 2 of 4")' },
      { id: 'never', label: "Haven't toured since this merged" },
    ],
    designerQuestions: [
      'When a tour underperformed, could you tell why from what the game showed you (venue, attendance, energy) — or did it just feel like the numbers came in low with no story?',
      'The foreshadow line is a pre-variance estimate shown at planning. Did it set the right expectation, or did the real result diverge enough that the foreshadow felt like a lie?',
    ],
  },
  {
    id: 'the_board_reskin',
    number: 10,
    title: 'The Board — Exec Console reskin',
    blurb:
      'The Executive Suite is reskinned as "The Board," a mixing-console layout. Presentation-only — no mechanics changed.',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'real_time', label: 'Spent real time in the reskinned Executive Suite' },
      { id: 'glanced', label: 'Glanced at it' },
      { id: 'never', label: "Haven't opened it since the reskin" },
    ],
    designerQuestions: [
      'Does the mixing-console framing help you read the exec team (roles, availability, state at a glance) — or is it style over legibility?',
      'Anything the old layout did better that got lost in the reskin?',
    ],
  },
  {
    id: 'phase4_game_feel',
    number: 11,
    title: 'Phase 4 game feel — staged reveal, transitions, sound',
    blurb:
      'The week summary reveals in stages; there are week transitions; sound stings play on events. (Audio audition is still formally owed — this is your chance to log it.)',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'staged_rhythm', label: 'Played enough weeks to feel the staged reveal rhythm' },
      { id: 'transitions', label: 'Noticed the week transitions' },
      { id: 'stings', label: 'Had sound on and heard the stings' },
      { id: 'muted', label: "Played muted / can't speak to audio" },
    ],
    designerQuestions: [
      "Does the staged reveal build anticipation, or has it started to feel slow now that you've seen it many times? Would you want a way to speed/skip it?",
      "Audio audition (owed): do the stings land on the right moments, and is anything either missing a sound it deserves or making noise it shouldn't?",
    ],
  },
];

export const KNOB_SECTION_TITLE = 'Feel-knob tuning appetite';

export const KNOB_SECTION_BLURB =
  'Which systems feel mis-weighted? These knobs are all deliberately untouched so far — this section tells me where to reach first. Tick a strength read per system; leave blank if no opinion.';

export const PLAYTEST_FORM_KNOBS: PlaytestKnobRow[] = [
  { id: 'flop_reputation_penalty', label: 'Flop reputation penalty' },
  { id: 'low_mood_recording_variance', label: 'Low-mood recording variance' },
  { id: 'energy_tour_sellthrough', label: 'Energy → tour sell-through' },
  { id: 'tour_popularity_saturation', label: 'Tour popularity saturation' },
  { id: 'hype_pools_premarketing', label: 'Hype pools / pre-marketing' },
  { id: 'side_event_frequency', label: 'Side-event frequency' },
  { id: 'meeting_relevance_why_now', label: 'Meeting relevance (why-now)' },
  { id: 'staged_reveal_pacing', label: 'Staged-reveal pacing' },
];

export const ONE_KNOB_PROMPT = "One knob you'd change today if you could, and which way:";

export const PRIORITIES_SECTION_TITLE = 'Top-3 priority — what do I fix/tune next?';

export const PRIORITIES_SECTION_BLURB =
  'Rank the three things most worth my time. Can be a bug, a tuning pass, a legibility fix, or "make X louder." Be specific.';

export const PULL_BACK_PROMPT =
  "Anything that shipped that you'd rather I pull back or reconsider?";

export const GUT_CHECK_PROMPT =
  'One-line gut check — does the label sim feel more alive than it did a week ago?';

export const ANYTHING_OFF_PROMPT = 'Anything off / confusing / invisible?';
