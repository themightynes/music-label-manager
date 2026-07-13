/**
 * v3 pool content-review registry — one entry per reviewable pool, mirroring
 * the PLAYTEST_FORM_OPTIONS round-picker pattern (PlaytestFeedbackPage).
 *
 * Each pool loads/saves its OWN responses file through the shared
 * GET/POST /api/admin/playtest-feedback endpoint pair, keyed by its formId
 * from the widened server-side allowlist (see POOL_REVIEW_FORM_IDS in
 * @shared/api/contracts and PLAYTEST_RESPONSES_FILENAMES in
 * server/routes/admin.ts). A save against one pool can never reach any other
 * pool's file (or any playtest round's) — the validated formId is the only
 * path to a filename.
 *
 * The lockstep test (tests/client/mac-pool-review-form.test.tsx) asserts each
 * pool module's meeting ids match POOL_REVIEW_MEETING_IDS[formId] exactly,
 * in order.
 */

import {
  MAC_POOL_REVIEW_FORM_ID,
  SAM_POOL_REVIEW_FORM_ID,
  DANTE_POOL_REVIEW_FORM_ID,
  PAT_POOL_REVIEW_FORM_ID,
  CEO_POOL_REVIEW_FORM_ID,
  EVENTS_POOL_REVIEW_FORM_ID,
  ESCALATIONS_POOL_REVIEW_FORM_ID,
  POOL_REVIEW_FORM_IDS,
  type PoolReviewFormId,
} from '@shared/api/contracts';
import type { PoolReviewEntry } from './poolReviewTypes';
import {
  MAC_POOL_REVIEW_INTRO,
  MAC_POOL_REVIEW_TITLE,
  MAC_POOL_OVERALL_NOTES_PROMPT,
  MAC_POOL_VOICE_CONSISTENCY_PROMPT,
  V3_MAC_POOL_MEETINGS,
  V3_MAC_POOL_LEVEL_NOTES,
} from './v3MacPoolReview';
import { V3_SAM_POOL_MEETINGS, V3_SAM_POOL_LEVEL_NOTES } from './v3SamPoolReview';
import { V3_DANTE_POOL_MEETINGS, V3_DANTE_POOL_LEVEL_NOTES } from './v3DantePoolReview';
import { V3_PAT_POOL_MEETINGS, V3_PAT_POOL_LEVEL_NOTES } from './v3PatPoolReview';
import { V3_CEO_POOL_MEETINGS, V3_CEO_POOL_LEVEL_NOTES } from './v3CeoPoolReview';
import { V3_EVENTS_POOL_MEETINGS, V3_EVENTS_POOL_LEVEL_NOTES } from './v3EventsPoolReview';
import {
  V3_ESCALATIONS_POOL_MEETINGS,
  V3_ESCALATIONS_POOL_LEVEL_NOTES,
} from './v3EscalationsPoolReview';

export interface PoolReviewDefinition {
  formId: PoolReviewFormId;
  /** Short picker label, e.g. "Mac (A&R)". */
  pickerLabel: string;
  title: string;
  intro: string;
  /**
   * Name rendered before the prompt quote ("Mac:", "Sam:", …). null for the
   * events/escalations pools, whose prompts are the world addressing the
   * player rather than an exec speaking.
   */
  promptSpeaker: string | null;
  overallNotesPrompt: string;
  voiceConsistencyPrompt: string;
  meetings: PoolReviewEntry[];
  /** File-level trailing sections from the hand-off (divergence summaries etc.). */
  poolLevelNotes: string[];
}

const SHARED_INTRO_TAIL =
  'Read each entry in order, leave a verdict (approve / approve with edits / rework / kill) and ' +
  'freeform notes per entry, then the two overall fields at the end. Effect values are shown raw: ' +
  'this is an admin review surface, and the numbers are part of what is under review (all pending ' +
  'offline divergence/dominance verification before JSON commit).';

export const POOL_REVIEW_REGISTRY: Record<PoolReviewFormId, PoolReviewDefinition> = {
  [MAC_POOL_REVIEW_FORM_ID]: {
    formId: MAC_POOL_REVIEW_FORM_ID,
    pickerLabel: 'Mac (A&R)',
    title: MAC_POOL_REVIEW_TITLE,
    intro: MAC_POOL_REVIEW_INTRO,
    promptSpeaker: 'Mac',
    overallNotesPrompt: MAC_POOL_OVERALL_NOTES_PROMPT,
    voiceConsistencyPrompt: MAC_POOL_VOICE_CONSISTENCY_PROMPT,
    meetings: V3_MAC_POOL_MEETINGS,
    poolLevelNotes: V3_MAC_POOL_LEVEL_NOTES,
  },
  [SAM_POOL_REVIEW_FORM_ID]: {
    formId: SAM_POOL_REVIEW_FORM_ID,
    pickerLabel: 'Sam (CMO)',
    title: 'v3 Sam Pool — Content Review (2026-07-12)',
    intro:
      'The authored v3 Sam pool (14 meetings: 5 routine, 5 major, 2 reactive, 2 new), transcribed ' +
      'verbatim from the authoring hand-off files. ' +
      SHARED_INTRO_TAIL,
    promptSpeaker: 'Sam',
    overallNotesPrompt:
      'Overall notes — anything pool-wide: tier balance, gating spread, effect-budget consistency, missing territory:',
    voiceConsistencyPrompt:
      'Voice consistency — does Sam sound like the same person across all fourteen rooms (the blogger past, ' +
      'the network-as-power, the nerve)? Where does the voice slip?',
    meetings: V3_SAM_POOL_MEETINGS,
    poolLevelNotes: V3_SAM_POOL_LEVEL_NOTES,
  },
  [DANTE_POOL_REVIEW_FORM_ID]: {
    formId: DANTE_POOL_REVIEW_FORM_ID,
    pickerLabel: 'Dante (CCO)',
    title: 'v3 Dante Pool — Content Review (2026-07-12)',
    intro:
      'The authored v3 Dante pool (15 meetings: 5 routine, 6 major, 3 reactive, 1 new regular), ' +
      'transcribed verbatim from the authoring hand-off files. ' +
      SHARED_INTRO_TAIL,
    promptSpeaker: 'Dante',
    overallNotesPrompt:
      'Overall notes — anything pool-wide: tier balance, gating spread, effect-budget consistency, missing territory:',
    voiceConsistencyPrompt:
      'Voice consistency — does Dante sound like the same person across all fifteen rooms (the 432 Hz ' +
      'mysticism, art-over-ledger, the frequency doctrine)? Where does the voice slip?',
    meetings: V3_DANTE_POOL_MEETINGS,
    poolLevelNotes: V3_DANTE_POOL_LEVEL_NOTES,
  },
  [PAT_POOL_REVIEW_FORM_ID]: {
    formId: PAT_POOL_REVIEW_FORM_ID,
    pickerLabel: 'Pat (Distribution)',
    title: 'v3 Pat Pool — Content Review (2026-07-12)',
    intro:
      'The authored v3 Pat pool (14 meetings: 5 routine, 5 major, 4 reactive/regular from the reactive ' +
      'hand-off), transcribed verbatim from the authoring hand-off files. ' +
      SHARED_INTRO_TAIL,
    promptSpeaker: 'Pat',
    overallNotesPrompt:
      'Overall notes — anything pool-wide: tier balance, gating spread, effect-budget consistency, missing territory:',
    voiceConsistencyPrompt:
      'Voice consistency — does Pat sound like the same person across all fourteen rooms (the models, ' +
      'the confidence intervals, caution-as-vice)? Where does the voice slip?',
    meetings: V3_PAT_POOL_MEETINGS,
    poolLevelNotes: V3_PAT_POOL_LEVEL_NOTES,
  },
  [CEO_POOL_REVIEW_FORM_ID]: {
    formId: CEO_POOL_REVIEW_FORM_ID,
    pickerLabel: 'CEO',
    title: 'v3 CEO Pool — Content Review (2026-07-12)',
    intro:
      'The authored v3 CEO pool (12 meetings: 10 regular + 2 reactive). The CEO lane has no loyalty ' +
      'bands and no autonomy — un-acted meetings genuinely LAPSE, so each entry carries a LAPSE COST ' +
      'and a WHY GATED line instead of band predictions, and outcome summaries are label-voice ' +
      '("The label took… / We passed…"). Transcribed verbatim from the authoring hand-off files. ' +
      SHARED_INTRO_TAIL,
    promptSpeaker: 'The desk',
    overallNotesPrompt:
      'Overall notes — anything pool-wide: lapse-cost credibility, gating spread, tier magnitudes, missing territory:',
    voiceConsistencyPrompt:
      'Voice consistency — do the CEO prompts read as the desk addressing the label head (and the ' +
      'label-voice summaries as "we")? Where does the voice slip?',
    meetings: V3_CEO_POOL_MEETINGS,
    poolLevelNotes: V3_CEO_POOL_LEVEL_NOTES,
  },
  [EVENTS_POOL_REVIEW_FORM_ID]: {
    formId: EVENTS_POOL_REVIEW_FORM_ID,
    pickerLabel: 'Side events',
    title: 'v3 Side Events — Content Review (2026-07-12)',
    intro:
      'The authored v3 side-event pool (20 events: the 8 bible pitches + 12 new). Side events are ' +
      'EXTERNAL SHOCKS — no exec advocate, no loyalty bands — so each entry carries a SHOCK LOGIC ' +
      'line instead of band predictions, and outcome summaries are label-voice. Transcribed verbatim ' +
      'from the authoring hand-off files. ' +
      SHARED_INTRO_TAIL,
    promptSpeaker: null,
    overallNotesPrompt:
      'Overall notes — anything pool-wide: category spread, tier mix, shock-vs-meeting boundary, missing territory:',
    voiceConsistencyPrompt:
      'Voice consistency — do the events read as the world acting ON the label (second-person ' +
      'situational prompts, label-voice summaries), never as an exec pitching? Where does it slip?',
    meetings: V3_EVENTS_POOL_MEETINGS,
    poolLevelNotes: V3_EVENTS_POOL_LEVEL_NOTES,
  },
  [ESCALATIONS_POOL_REVIEW_FORM_ID]: {
    formId: ESCALATIONS_POOL_REVIEW_FORM_ID,
    pickerLabel: 'Escalations',
    title: 'v3 Escalation Events — Content Review (2026-07-12)',
    intro:
      'The authored v3 escalation events (8: two per archetype). Escalations are ' +
      'consequence-of-neglect, ALL-COST forks — each entry carries a CHAIN LOGIC line tying it to ' +
      'the neglect pattern it detonates from, and outcome summaries are label-voice (the player is ' +
      'the executor). Transcribed verbatim from the authoring hand-off file. ' +
      SHARED_INTRO_TAIL,
    promptSpeaker: null,
    overallNotesPrompt:
      'Overall notes — anything set-wide: wound-axis spread, no-windfall discipline, chain-logic ' +
      'continuity with the exec pools, missing territory:',
    voiceConsistencyPrompt:
      'Voice consistency — does each escalation read as ITS exec\'s failure pattern (Mac deals solo; ' +
      'Sam fights alone; Dante overrides the artist; Pat models until the world moves)? Where does it slip?',
    meetings: V3_ESCALATIONS_POOL_MEETINGS,
    poolLevelNotes: V3_ESCALATIONS_POOL_LEVEL_NOTES,
  },
};

// Picker order (exported for the picker lockstep test — one entry per pool
// formId, no more, no less, mirroring PLAYTEST_FORM_OPTIONS).
export const POOL_REVIEW_OPTIONS: PoolReviewDefinition[] = POOL_REVIEW_FORM_IDS.map(
  (formId) => POOL_REVIEW_REGISTRY[formId]
);
