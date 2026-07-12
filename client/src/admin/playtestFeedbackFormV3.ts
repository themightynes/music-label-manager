/**
 * Playtest feedback form definition — Round 3 (2026-07-12), the Executive
 * Delegation & Trust arc (Tiers 1+2, `feat/exec-delegation-trust`).
 *
 * This is the on-screen mirror of
 * docs/01-planning/PLAYTEST_FEEDBACK_2026-07-12-delegation.md (the markdown
 * stays the printable source; the /admin/playtest-feedback page is the
 * recording surface). Wording is carried verbatim from the markdown wherever
 * possible. House rule: NO engine numbers/multipliers in any label or copy —
 * tests/client/playtest-feedback-form-v3.test.tsx guards this module the same
 * way the round-1/round-2 modules and helpTopics are guarded.
 *
 * Section/knob ids are the canonical V3 ones from @shared/api/contracts
 * (PLAYTEST_SECTION_IDS_V3 / PLAYTEST_KNOB_IDS_V3) — the contract test
 * asserts the two lists stay in lockstep.
 *
 * The round-1 and round-2 modules stay in the repo untouched: they are the
 * historical content behind the round-1/round-2 responses files.
 *
 * Sections map to the plan doc's §9 playtest probes
 * (`[READY] executive-delegation-and-trust-plan.md`): (1) autonomous spend
 * feel, (2) AUTO-vs-neglect legibility, (3) disloyal-in-character reads,
 * (4) WeekSummary digest readability, (5) escalation legibility, (6) three-
 * lane clarity, (7) post-never-lapse economy feel, (8) freeform + priorities.
 * Two open round-2 items are carried forward per the round-3 charter: the
 * buzz hidden-at-zero ambiguity (still open) and the stale admin-index label
 * (fixed in this same session — noted as resolved, not re-asked).
 */

import {
  type PlaytestFormDefinition,
  type PlaytestFormSection,
  type PlaytestKnobRow,
  ANYTHING_OFF_PROMPT,
} from './playtestFeedbackForm';

export const FORM_TITLE_V3 = 'Playtest Feedback — Round 3: Delegation & Trust, 2026-07-12';

export const FORM_INTRO_V3 =
  'Round 3. The Executive Delegation & Trust arc shipped Tiers 1+2: meetings you skip no longer vanish — your ' +
  'exec resolves them autonomously per their loyalty and mood, a low-loyalty exec who ignores an urgent meeting can ' +
  'trigger a mandatory crisis next week, and every hardcoded exec constant is now a tuning knob. This form probes ' +
  'whether delegation reads as "your team running the label" or "losing money to bugs." Same rules as before: ' +
  'qualitative only, "never saw it" is a real and useful answer, blank free-text means nothing to report, and the ' +
  'designer questions are the real payload. Reminder: restart the dev server before playing — server-side engine ' +
  'code does not hot-reload.';

export const PLAYTEST_FORM_SECTIONS_V3: PlaytestFormSection[] = [
  {
    id: 'autonomous_spend_feel',
    number: 1,
    title: 'Autonomous spend — your team running the label, or losing money to bugs?',
    blurb:
      'Every executive meeting now resolves every week. If you spend a focus slot, you make the call. If you ' +
      "don't, the executive resolves it themselves — spending real money, with no cap, per their loyalty and mood.",
    exposurePrompt: 'Did you encounter it? (tick all you saw)',
    exposureMulti: true,
    exposureOptions: [
      { id: 'saw_money_spent', label: "Watched an exec spend real money on their own call" },
      { id: 'saw_while_you_were_out', label: 'Noticed the "While you were out" group in the week summary' },
      { id: 'surprised_by_spend', label: 'Was surprised by how much an exec spent unsupervised' },
      { id: 'never', label: 'Every exec I had was always personally staffed' },
    ],
    designerQuestions: [
      "Does an autonomous exec spend read as your team running the label while you're focused elsewhere, or does " +
        'it feel like money leaking out for no reason you authorized?',
      'Did the size of an autonomous spend ever feel wrong — too big for a decision you never saw coming?',
    ],
  },
  {
    id: 'auto_vs_neglect_legibility',
    number: 2,
    title: 'AUTO vs. neglect — is the trade legible?',
    blurb:
      'AUTO costs a focus slot and endorses the safe pick. Neglect is free but hands the exec the wheel — at low ' +
      'loyalty, they may serve themselves. This is the central trade the arc creates.',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'used_auto', label: 'Used AUTO deliberately, understanding the trade' },
      { id: 'neglected_on_purpose', label: 'Let an exec go unstaffed on purpose to save a slot' },
      { id: 'neglected_by_accident', label: 'Realized only afterward that an exec had gone unstaffed' },
      { id: 'couldnt_tell', label: "Couldn't tell the difference between AUTO and neglect from the results" },
    ],
    designerQuestions: [
      'Could you tell, from what you saw, whether an exec had been AUTO-endorsed (cost you a slot) or had ' +
        "neglected-resolved (free, but their call)? What told you, if anything?",
      'Did neglecting a low-loyalty exec ever feel like a real, informed gamble — or did it just feel random?',
    ],
  },
  {
    id: 'disloyal_in_character',
    number: 3,
    title: 'Disloyal picks — in character, or random? (ask per exec)',
    blurb:
      "A disloyal exec picks a self-serving choice in character for their archetype: Mac chases risky signings, " +
      "Sam overspends on the story that makes her the story, Dante indulges creative bets, Pat caps the upside on " +
      'a safe guaranteed win.',
    exposurePrompt: 'Which execs did you see make a self-serving call? (tick all you saw)',
    exposureMulti: true,
    exposureOptions: [
      { id: 'mac_ar', label: 'Mac (A&R) — a risky, gut-driven pick' },
      { id: 'sam_cmo', label: 'Sam (CMO) — a flashy, expensive campaign' },
      { id: 'dante_cco', label: 'Dante (CCO) — an indulgent creative bet' },
      { id: 'pat_distribution', label: 'Pat (Distribution) — a safe, upside-capped deal' },
      { id: 'never', label: 'Never got an exec disloyal enough to see it' },
    ],
    designerQuestions: [
      'For whichever exec you saw go disloyal: did the pick feel like THAT person acting in character, or like a ' +
        'random weird choice with no personality behind it?',
      'Did a loyal or committed exec ever feel indistinguishable from a disloyal one, or were the three bands ' +
        'genuinely readable apart?',
    ],
  },
  {
    id: 'week_summary_digest_readability',
    number: 4,
    title: 'WeekSummary readability with the "While you were out" digest',
    blurb:
      'Autonomous resolutions are grouped into a quiet, collapsed-by-default "While you were out" section, ' +
      'separate from the decisions you made yourself.',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'read_it_every_week', label: 'Read the digest every week it appeared' },
      { id: 'skipped_it', label: 'Usually skipped past it' },
      { id: 'never_noticed', label: 'Never noticed it was there' },
    ],
    designerQuestions: [
      'With 3-4 autonomous resolutions in a busy week, was the digest readable, or did it drown the decisions ' +
        'that actually mattered to you?',
      'Should ordinary autonomous resolutions stay a quiet grouped digest, or do they deserve their own staged ' +
        'reveal beat like a player decision would get?',
    ],
  },
  {
    id: 'escalation_crisis_legibility',
    number: 5,
    title: 'Escalation — did a crisis land, and did the loyalty connection read?',
    blurb:
      'Ignore an urgent meeting with a low-loyalty exec and the crisis is not free — it can land on your desk the ' +
      'following week as a mandatory crisis, the same "Crisis on the Desk" pipeline from round 2.',
    exposurePrompt: 'Did you encounter it? (tick all you saw)',
    exposureMulti: true,
    exposureOptions: [
      { id: 'crisis_after_ignore', label: 'A crisis landed the week after I ignored an urgent meeting' },
      { id: 'understood_why', label: 'Understood why it happened without checking a wiki' },
      { id: 'seemed_random', label: 'A crisis landed and I could not connect it to anything I did' },
      { id: 'never', label: 'Never saw an escalation fire' },
    ],
    designerQuestions: [
      'When an escalation crisis landed, did you connect it to ignoring an urgent meeting with a disaffected ' +
        'exec — or did it feel disconnected from your own choices?',
      'Does escalation make you think twice before neglecting an urgent (pulse-dot) meeting, or does it still ' +
        'feel like background weather?',
    ],
  },
  {
    id: 'three_lane_clarity',
    number: 6,
    title: 'Three-lane clarity — exec, CEO, and crisis lapse differently',
    blurb:
      'Exec meetings never lapse (your exec resolves them their way). CEO meetings genuinely lapse if unspent — ' +
      'the moment is just gone. Crisis events cannot lapse at all — they block the week until resolved.',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'clear_distinction', label: 'The three felt clearly different from each other' },
      { id: 'ceo_and_exec_blurred', label: 'CEO and exec meetings felt like the same kind of thing' },
      { id: 'never_thought_about_it', label: "Never thought about the difference" },
    ],
    designerQuestions: [
      'Did skipping a CEO meeting feel different from skipping an exec meeting — a forfeited opportunity versus ' +
        'handing over the wheel — or did both just feel like "nothing happened"?',
      'Is it clear that a crisis is not something you can simply let slide, unlike the other two lanes?',
    ],
  },
  {
    id: 'post_never_lapse_economy',
    number: 7,
    title: 'Economy feel — reputation and awareness after never-lapse',
    blurb:
      'Every eligible exec now resolves every week — roughly doubling weekly effect volume, including ' +
      'unapproved autonomous spend. This can inflate reputation and awareness gains beyond what round 2 tuned.',
    exposurePrompt: 'Did you encounter it?',
    exposureMulti: false,
    exposureOptions: [
      { id: 'felt_faster_climb', label: 'Reputation or awareness climbed noticeably faster than round 2' },
      { id: 'felt_same_pace', label: 'Pacing still felt like round 2' },
      { id: 'didnt_track', label: "Didn't track it closely enough to say" },
    ],
    designerQuestions: [
      'Round 2 slowed the reputation climb into a career-length arc. Did this arc\'s autonomous spend quietly ' +
        'undo that pacing work, or does the climb still feel earned?',
      'Focus slots are the counterweight — only 3-4 of the weekly offerings can be YOUR call, the rest run ' +
        'autonomously by design. Did which-to-control ever feel like a genuine dilemma?',
    ],
  },
  {
    id: 'freeform_priorities',
    number: 8,
    title: 'Freeform + priorities',
    blurb:
      'Open floor for anything not covered above, plus the standing top-3 priority ask.',
    exposurePrompt: 'Anything from this arc worth flagging that the sections above missed?',
    exposureMulti: true,
    exposureOptions: [
      { id: 'nothing_else', label: 'Nothing else to add' },
    ],
    designerQuestions: [
      'Round-2 carryover, still open: a fresh release with no banked hype shows no Buzz section at all in its ' +
        'first post-release week, indistinguishable from a dead release — did you run into this again, or has ' +
        'later play made it a non-issue?',
      'Anything about Level/XP or Portfolios (both explicitly NOT built this arc) that you want flagged before ' +
        'they become the next arc?',
    ],
  },
];

export const KNOB_SECTION_TITLE_V3 = 'Knob check — did delegation land?';

export const KNOB_SECTION_BLURB_V3 =
  'Every row here is a knob this arc actually shipped (loyalty bands, autonomous spend magnitude, the escalation ' +
  'ceiling, digest grouping, the AUTO-endorse-vs-neglect loyalty gap). Tick a strength read per system; leave blank ' +
  'if no opinion.';

export const PLAYTEST_FORM_KNOBS_V3: PlaytestKnobRow[] = [
  { id: 'loyalty_band_thresholds', label: 'Loyalty band thresholds (loyal / committed / disloyal)' },
  { id: 'autonomous_spend_magnitude', label: 'Autonomous spend magnitude' },
  { id: 'escalation_loyalty_ceiling', label: 'Escalation loyalty ceiling' },
  { id: 'escalation_frequency', label: 'Escalation frequency' },
  { id: 'digest_grouping', label: '"While you were out" digest grouping' },
  { id: 'auto_endorse_vs_neglect_gap', label: 'AUTO-endorse vs. neglect loyalty gap' },
];

export const ONE_KNOB_PROMPT_V3 = "One knob you'd change today if you could, and which way:";

export const PRIORITIES_SECTION_TITLE_V3 = 'Top-3 priority — what do I fix/tune next?';

export const PRIORITIES_SECTION_BLURB_V3 =
  'Rank the three things most worth my time after this round. A bug, a tuning pass, a legibility fix, or ' +
  '"make X louder." Be specific. Carried forward from round 2 (still open, unless later play resolved it): buzz ' +
  'hidden-at-zero during the building window remains ambiguous — a release with no banked hype shows no Buzz ' +
  'section at all in its first post-release week, indistinguishable from a dead release.';

export const PULL_BACK_PROMPT_V3 =
  "Anything from the delegation arc that overshot and you'd rather I pull back or reconsider?";

export const GUT_CHECK_PROMPT_V3 =
  'One-line gut check — does the label finally feel like a team you manage, or still like a set of dials you turn?';

export const PLAYTEST_FORM_V3: PlaytestFormDefinition = {
  formId: 'playtest-feedback-2026-07-12-delegation',
  title: FORM_TITLE_V3,
  intro: FORM_INTRO_V3,
  sections: PLAYTEST_FORM_SECTIONS_V3,
  knobs: PLAYTEST_FORM_KNOBS_V3,
  knobSectionTitle: KNOB_SECTION_TITLE_V3,
  knobSectionBlurb: KNOB_SECTION_BLURB_V3,
  oneKnobPrompt: ONE_KNOB_PROMPT_V3,
  prioritiesSectionTitle: PRIORITIES_SECTION_TITLE_V3,
  prioritiesSectionBlurb: PRIORITIES_SECTION_BLURB_V3,
  pullBackPrompt: PULL_BACK_PROMPT_V3,
  gutCheckPrompt: GUT_CHECK_PROMPT_V3,
  anythingOffPrompt: ANYTHING_OFF_PROMPT,
};
