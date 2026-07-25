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
import {
  RELEVANCE_TAGS,
  REQUIRES_STAT_NAMES,
  HAPPENING_TYPES,
  SIDE_EVENT_CATEGORIES,
  EFFECT_TARGETING_DIRECTIVE_KEYS,
  EXEC_MOOD_TARGET_ROLE_IDS,
  EXEC_MOOD_TARGET_BROADCAST,
} from '@shared/types/gameTypes';
import type { WeeklyAction, DialogueChoiceContract, SideEventContract } from '@shared/api/contracts';

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
const REQUIRES_STAT_NAME_SET: ReadonlySet<string> = new Set(REQUIRES_STAT_NAMES);
const HAPPENING_TYPE_SET: ReadonlySet<string> = new Set(HAPPENING_TYPES);
const CANONICAL_EFFECT_KEY_SET: ReadonlySet<string> = new Set(CANONICAL_EFFECT_KEYS);
const SIDE_EVENT_CATEGORY_SET: ReadonlySet<string> = new Set(SIDE_EVENT_CATEGORIES);

// SLICE 5 (M13/M14): string-valued targeting DIRECTIVE keys — not effect
// channels; excluded from the unknown-key check and validated by the dedicated
// rules below (MIRROR of tests/engine/data-lint-effect-keys.test.ts's
// targeting-directive suite — keep in lockstep).
const TARGETING_DIRECTIVE_KEY_SET: ReadonlySet<string> = new Set(EFFECT_TARGETING_DIRECTIVE_KEYS);
const VALID_EXEC_TARGETS: readonly string[] = [...EXEC_MOOD_TARGET_ROLE_IDS, EXEC_MOOD_TARGET_BROADCAST];
const VALID_EXEC_TARGET_SET: ReadonlySet<string> = new Set(VALID_EXEC_TARGETS);
const VALID_ARTIST_TARGET_SET: ReadonlySet<string> = new Set(['predetermined', 'global']);

/**
 * SLICE 5 (M13): shared exec-targeting rules for the surfaces where
 * target_executive IS legal (CEO meetings + side events). Mirrors
 * lintExecTargetingSurface in tests/engine/data-lint-effect-keys.test.ts.
 */
function lintExecTargeting(
  scope: string,
  choice: Pick<DialogueChoiceContract, 'effects_immediate' | 'effects_delayed'>,
  issues: LintIssue[],
): void {
  const imm = (choice.effects_immediate ?? {}) as Record<string, unknown>;
  const del = (choice.effects_delayed ?? {}) as Record<string, unknown>;
  if ('executive_mood' in imm && !('target_executive' in imm)) {
    issues.push({
      severity: 'error',
      scope,
      message: `executive_mood needs a target_executive sibling here — this surface has no implicit executive, so the key would be silently dropped.`,
    });
  }
  if ('target_executive' in imm) {
    if (!('executive_mood' in imm)) {
      issues.push({
        severity: 'error',
        scope,
        message: `target_executive without an executive_mood sibling routes nothing — add the executive_mood value or remove the directive.`,
      });
    }
    const v = imm.target_executive;
    if (typeof v !== 'string' || !VALID_EXEC_TARGET_SET.has(v)) {
      issues.push({
        severity: 'error',
        scope,
        message: `target_executive must be one of: ${VALID_EXEC_TARGETS.join(', ')} (got ${JSON.stringify(v)}).`,
      });
    }
  }
  if ('executive_mood' in del) {
    issues.push({
      severity: 'error',
      scope,
      message: `executive_mood in effects_delayed is a dead key — it only applies from effects_immediate.`,
    });
  }
  if ('target_executive' in del) {
    issues.push({
      severity: 'error',
      scope,
      message: `target_executive in effects_delayed is a dead directive — targeted exec mood is immediate-only.`,
    });
  }
}

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

    // requires: plain tags must be RELEVANCE_TAGS; M16 threshold/flag objects
    // must be well-formed (mirrors RequiresEntrySchema in shared/api/contracts.ts
    // and the data-lint suite — keep the three surfaces in lockstep).
    if (action.requires) {
      for (const entry of action.requires) {
        if (typeof entry === 'string') {
          if (!RELEVANCE_TAG_SET.has(entry)) {
            issues.push({
              severity: 'error',
              scope: action.id,
              message: `Action '${action.id}' has an unknown requires tag '${entry}' — must be one of: ${RELEVANCE_TAGS.join(', ')}.`,
            });
          }
        } else if (entry && typeof entry === 'object' && 'stat' in entry) {
          const stat = (entry as { stat?: unknown }).stat;
          if (!REQUIRES_STAT_NAME_SET.has(String(stat))) {
            issues.push({
              severity: 'error',
              scope: action.id,
              message: `Action '${action.id}' has a requires threshold with unknown stat '${String(stat)}' — must be one of: ${REQUIRES_STAT_NAMES.join(', ')}.`,
            });
          }
          const { gte, lte } = entry as { gte?: unknown; lte?: unknown };
          if (gte === undefined && lte === undefined) {
            issues.push({
              severity: 'error',
              scope: action.id,
              message: `Action '${action.id}' has a requires threshold on '${String(stat)}' with no bound — provide gte and/or lte.`,
            });
          }
        } else if (entry && typeof entry === 'object' && 'flag' in entry) {
          const flag = (entry as { flag?: unknown }).flag;
          if (typeof flag !== 'string' || !/^[a-z][a-z0-9_]*$/.test(flag)) {
            issues.push({
              severity: 'error',
              scope: action.id,
              message: `Action '${action.id}' has a requires flag gate with invalid key '${String(flag)}' — story-flag keys must be snake_case identifiers.`,
            });
          }
        } else {
          issues.push({
            severity: 'error',
            scope: action.id,
            message: `Action '${action.id}' has an unrecognized requires entry ${JSON.stringify(entry)} — must be a relevance tag, {stat, gte/lte} or {flag, is?}.`,
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

      // Effect keys must be canonical (targeting directives are validated separately below).
      for (const block of ['effects_immediate', 'effects_delayed'] as const) {
        const effects = choice[block] || {};
        for (const key of Object.keys(effects)) {
          if (TARGETING_DIRECTIVE_KEY_SET.has(key)) continue;
          if (!CANONICAL_EFFECT_KEY_SET.has(key)) {
            issues.push({
              severity: 'error',
              scope,
              message: `Choice '${choice.id}' in action '${action.id}' uses unknown effect key '${key}' — must be one of the canonical effect channels.`,
            });
          }
        }
      }

      // SLICE 5 (M13): exec-mood targeting rules.
      //  - CEO meetings have no implicit executive → executive_mood REQUIRES a
      //    target_executive directive (and the directive must be valid).
      //  - Role meetings' executive is implicit (metadata.executiveId) → the
      //    directive is forbidden (the engine ignores it there).
      if (action.role_id === 'ceo') {
        lintExecTargeting(scope, choice, issues);
      } else {
        for (const block of ['effects_immediate', 'effects_delayed'] as const) {
          if ('target_executive' in ((choice[block] ?? {}) as Record<string, unknown>)) {
            issues.push({
              severity: 'error',
              scope,
              message: `target_executive is not allowed on a role meeting — the meeting's own executive is implicit; the directive only works on CEO meetings and side events.`,
            });
          }
        }
      }

      // M14: target_artist is an event-choice-only directive (meetings target via target_scope).
      for (const block of ['effects_immediate', 'effects_delayed'] as const) {
        if ('target_artist' in ((choice[block] ?? {}) as Record<string, unknown>)) {
          issues.push({
            severity: 'error',
            scope,
            message: `target_artist is not allowed on a meeting — meetings target artists via target_scope; the directive only works on side-event choices.`,
          });
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

/**
 * Lint a would-be-saved array of side events (content-editor slice 3, spec §2.3).
 * Returns a list of hard-block issues; an empty array means the array is safe to
 * save (pending the Zod parse, which remains the second gate in
 * SideEventsEditor.tsx).
 *
 * `eventWeights` is the `event_weights` table from data/balance/events.json,
 * keyed by SIDE_EVENT_CATEGORIES entry — passed in by the caller (read-only
 * display context in the UI; not editable here) so this function stays pure
 * and framework-free, with no static-import coupling to a specific JSON file.
 *
 * DELIBERATELY NO DOMINANCE CHECK. The meeting-dominance suite
 * (tests/engine/meeting-dominance.test.ts) only covers weekly meetings — side
 * events are exempt by design. Applying that hard-block here would make the
 * REAL, currently-shipping data/events.json unsaveable: `royalty_discrepancy`
 * has a weakly-dominant pair under the same value model — `negotiate` nets
 * +2000 money with no cost, strictly better than `audit`'s -1000 immediate /
 * +500 delayed (net -500) on every tracked payoff axis. That's authored,
 * accepted content, not a bug the tool should block. Do not add a dominance
 * check to this function without first resolving that data conflict.
 */
export function lintSideEvents(
  events: SideEventContract[],
  eventWeights: Record<string, number>,
): LintIssue[] {
  const issues: LintIssue[] = [];

  const seenEventIds = new Set<string>();

  for (const event of events) {
    // Duplicate event ids.
    if (seenEventIds.has(event.id)) {
      issues.push({
        severity: 'error',
        scope: event.id,
        message: `Duplicate event id '${event.id}' — event ids must be unique.`,
      });
    }
    seenEventIds.add(event.id);

    // Empty choices array.
    if (!event.choices || event.choices.length === 0) {
      issues.push({
        severity: 'error',
        scope: event.id,
        message: `Event '${event.id}' has no choices — every side event needs at least one.`,
      });
    }

    // category must be one of SIDE_EVENT_CATEGORIES.
    if (!SIDE_EVENT_CATEGORY_SET.has(event.category)) {
      issues.push({
        severity: 'error',
        scope: event.id,
        message: `Event '${event.id}' has an unknown category '${event.category}' — must be one of: ${SIDE_EVENT_CATEGORIES.join(', ')}.`,
      });
    } else if (!(event.category in eventWeights)) {
      // Mirrors the HARD assertion in tests/engine/data-lint-side-event-categories.test.ts:
      // an authored category absent from event_weights is not allowed (a category with
      // zero authored events is fine — that's the opposite direction).
      issues.push({
        severity: 'error',
        scope: event.id,
        message: `Event '${event.id}' has category '${event.category}' which has no entry in event_weights (data/balance/events.json) — every authored category must have a weight.`,
      });
    }

    // Duplicate choice ids within this event.
    const seenChoiceIds = new Set<string>();
    for (const choice of event.choices ?? []) {
      const scope = `${event.id}:${choice.id}`;
      if (seenChoiceIds.has(choice.id)) {
        issues.push({
          severity: 'error',
          scope,
          message: `Duplicate choice id '${choice.id}' within event '${event.id}' — choice ids must be unique per event.`,
        });
      }
      seenChoiceIds.add(choice.id);

      // Effect keys must be canonical (targeting directives are validated separately below).
      for (const block of ['effects_immediate', 'effects_delayed'] as const) {
        const effects = choice[block] || {};
        for (const key of Object.keys(effects)) {
          if (TARGETING_DIRECTIVE_KEY_SET.has(key)) continue;
          if (!CANONICAL_EFFECT_KEY_SET.has(key)) {
            issues.push({
              severity: 'error',
              scope,
              message: `Choice '${choice.id}' in event '${event.id}' uses unknown effect key '${key}' — must be one of the canonical effect channels.`,
            });
          }
        }
      }

      // SLICE 5 (M13): event choices have no implicit executive → executive_mood
      // requires (and validates) a target_executive directive, immediate-only.
      lintExecTargeting(scope, choice, issues);

      // M14: target_artist value check ('predetermined' routes the block's
      // artist-scoped effects to the event's resolved artist; 'global' forces
      // the legacy all-signed-artists application).
      for (const block of ['effects_immediate', 'effects_delayed'] as const) {
        const effects = (choice[block] ?? {}) as Record<string, unknown>;
        if ('target_artist' in effects) {
          const v = effects.target_artist;
          if (typeof v !== 'string' || !VALID_ARTIST_TARGET_SET.has(v)) {
            issues.push({
              severity: 'error',
              scope,
              message: `target_artist must be 'predetermined' or 'global' (got ${JSON.stringify(v)}).`,
            });
          }
        }
      }
    }

    // NO dominance check here — see the function-level comment above.
  }

  return issues;
}
