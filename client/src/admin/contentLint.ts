/**
 * Client-side lint mirror for the Content Editor (content-editor-side-events-and-meetings
 * plan, §2.1 shared infrastructure). Pure, framework-free module — no React — so it is
 * unit-testable in isolation and reusable by both the Meetings tab (slice 2, this file's
 * first consumer) and the Side Events tab (slice 3, which will add `lintSideEvents` here
 * following the same LintIssue shape).
 *
 * All issues are hard-block errors (fork C decided: dominance is a hard block too — see
 * plan §6 fork C). The tool's output must never be able to turn the suite red, so every
 * rule mirrored here is a MIRROR of an actual test/schema constraint:
 *   - effect keys: shared/engine/processors/ActionProcessor.ts LIVE_EFFECT_KEYS (+ executive_mood)
 *   - requires tags: shared/types/gameTypes.ts RELEVANCE_TAGS
 *   - reactive_trigger: shared/types/gameTypes.ts HAPPENING_TYPES
 *   - dominance: tests/engine/meeting-dominance.test.ts's EXACT value model (mirrored
 *     byte-for-byte below: same PAYOFF_KEYS, same EXCLUDED_KEYS, same weaklyDominates rule).
 */
import { LIVE_EFFECT_KEYS } from '@shared/engine/processors/ActionProcessor';
import { RELEVANCE_TAGS, HAPPENING_TYPES } from '@shared/types/gameTypes';
import type { WeeklyAction, DialogueChoiceContract } from '@shared/api/contracts';

export interface LintIssue {
  severity: 'error';
  /** e.g. an action id or a choice id — identifies where the issue lives. */
  scope: string;
  message: string;
}

/**
 * Canonical effect-key set for pickers/lint: LIVE_EFFECT_KEYS plus 'executive_mood'
 * (which is legitimately read outside applyEffects's per-key switch — see
 * ActionProcessor.ts's comment on LIVE_EFFECT_KEYS). Exported so ActionsViewer.tsx and
 * its tests share exactly one canonical list (drift guard).
 */
export const CANONICAL_EFFECT_KEYS: readonly string[] = Array.from(
  new Set<string>([...Array.from(LIVE_EFFECT_KEYS), 'executive_mood']),
).sort();

const RELEVANCE_TAG_SET: ReadonlySet<string> = new Set(RELEVANCE_TAGS);
const HAPPENING_TYPE_SET: ReadonlySet<string> = new Set(HAPPENING_TYPES);
const CANONICAL_EFFECT_KEY_SET: ReadonlySet<string> = new Set(CANONICAL_EFFECT_KEYS);

// ---------------------------------------------------------------------------
// Dominance model — mirrored EXACTLY from tests/engine/meeting-dominance.test.ts.
// Do not change these without also updating that test's model in lockstep.
// ---------------------------------------------------------------------------

const PAYOFF_KEYS = [
  'money',
  'reputation',
  'creative_capital',
  'artist_mood',
  'artist_energy',
  'artist_popularity',
  'press_story_flag',
  'press_momentum',
  'quality_bonus',
  'awareness_boost',
  'award_chances',
  'executive_mood',
] as const;

const EXCLUDED_KEYS = ['variance_up', 'rep_swing'] as const;

type Vec = Record<string, number>;

function choiceVector(choice: Pick<DialogueChoiceContract, 'effects_immediate' | 'effects_delayed'>): Vec {
  const v: Vec = {};
  for (const block of ['effects_immediate', 'effects_delayed'] as const) {
    const eff = choice[block] || {};
    for (const [k, val] of Object.entries(eff)) {
      if (typeof val === 'number') v[k] = (v[k] || 0) + val;
    }
  }
  return v;
}

/** Does A weakly-dominate B under the meeting-dominance.test.ts model? */
function weaklyDominates(a: Vec, b: Vec): boolean {
  for (const k of EXCLUDED_KEYS) {
    if ((a[k] || 0) !== (b[k] || 0)) return false;
  }
  let strictlyBetterSomewhere = false;
  for (const k of PAYOFF_KEYS) {
    const av = a[k] || 0;
    const bv = b[k] || 0;
    if (av < bv) return false;
    if (av > bv) strictlyBetterSomewhere = true;
  }
  return strictlyBetterSomewhere;
}

/**
 * Lint a would-be-saved array of weekly actions (meetings). Returns a list of hard-block
 * issues; an empty array means the array is safe to save (pending the Zod parse, which
 * remains the second gate in ActionsViewer.tsx).
 */
export function lintMeetings(actions: WeeklyAction[]): LintIssue[] {
  const issues: LintIssue[] = [];

  const seenActionIds = new Set<string>();

  for (const action of actions) {
    // Duplicate action ids.
    if (seenActionIds.has(action.id)) {
      issues.push({
        severity: 'error',
        scope: action.id,
        message: `Duplicate action id '${action.id}' — action ids must be unique.`,
      });
    }
    seenActionIds.add(action.id);

    // Empty choices array.
    if (!action.choices || action.choices.length === 0) {
      issues.push({
        severity: 'error',
        scope: action.id,
        message: `Action '${action.id}' has no choices — every meeting needs at least one.`,
      });
    }

    // requires: must be a subset of RELEVANCE_TAGS.
    if (action.requires) {
      for (const tag of action.requires) {
        if (!RELEVANCE_TAG_SET.has(tag)) {
          issues.push({
            severity: 'error',
            scope: action.id,
            message: `Action '${action.id}' has an unknown requires tag '${tag}' — must be one of: ${RELEVANCE_TAGS.join(', ')}.`,
          });
        }
      }
    }

    // reactive_trigger: must be one of HAPPENING_TYPES.
    if (action.reactive_trigger && !HAPPENING_TYPE_SET.has(action.reactive_trigger)) {
      issues.push({
        severity: 'error',
        scope: action.id,
        message: `Action '${action.id}' has an unknown reactive_trigger '${action.reactive_trigger}' — must be one of: ${HAPPENING_TYPES.join(', ')}.`,
      });
    }

    // Duplicate choice ids within this action.
    const seenChoiceIds = new Set<string>();
    for (const choice of action.choices ?? []) {
      const scope = `${action.id}:${choice.id}`;
      if (seenChoiceIds.has(choice.id)) {
        issues.push({
          severity: 'error',
          scope,
          message: `Duplicate choice id '${choice.id}' within action '${action.id}' — choice ids must be unique per action.`,
        });
      }
      seenChoiceIds.add(choice.id);

      // Effect keys must be canonical.
      for (const block of ['effects_immediate', 'effects_delayed'] as const) {
        const effects = choice[block] || {};
        for (const key of Object.keys(effects)) {
          if (!CANONICAL_EFFECT_KEY_SET.has(key)) {
            issues.push({
              severity: 'error',
              scope,
              message: `Choice '${choice.id}' in action '${action.id}' uses unknown effect key '${key}' — must be one of the canonical effect channels.`,
            });
          }
        }
      }
    }

    // Weakly-dominant choice within a meeting.
    const choices = (action.choices ?? []).map((c) => ({ id: c.id, label: c.label, vec: choiceVector(c) }));
    for (const a of choices) {
      for (const b of choices) {
        if (a.id === b.id) continue;
        if (weaklyDominates(a.vec, b.vec)) {
          issues.push({
            severity: 'error',
            scope: `${action.id}:${a.id}`,
            message: `'${a.label}' makes '${b.label}' never worth picking (in ${action.id}).`,
          });
        }
      }
    }
  }

  return issues;
}

// MISSING (slice 3): lintSideEvents(events: SideEvent[]): LintIssue[] — will share
// CANONICAL_EFFECT_KEYS and the LintIssue shape defined above.
