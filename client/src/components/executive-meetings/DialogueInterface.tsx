import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, Clock, Zap, Shuffle, Sparkles } from 'lucide-react';
import type { DialogueChoice } from '../../../../shared/types/gameTypes';
import {
  LIVE_EFFECT_KEYS,
  STRUCTURED_EFFECT_KEYS,
  EFFECT_CHANNEL_DESCRIPTIONS,
} from '@shared/engine/processors/ActionProcessor';
import { EffectBadgeTooltip } from './EffectBadgeTooltip';
import { getChoiceCreativeCapitalCost } from '../../services/executiveAutoSelect';

// C99 fix (v3 meeting-content wave): an authored effect VALUE is not always a
// number — the STRUCTURED_EFFECT_KEYS carry objects/strings (e.g. schedule_event
// = { event_id, defer_weeks }), and several live-economy verbs carry a raw
// magnitude/units/fraction whose bare number would MISLEAD a player.
type EffectValue = number | string | boolean | Record<string, unknown> | null | undefined;

// Keys rendered as a QUALITATIVE, number-free badge — the label comes from
// EFFECT_CHANNEL_DESCRIPTIONS[key].title and the full explanation rides the
// existing EffectBadgeTooltip. Two families:
//   1. STRUCTURED_EFFECT_KEYS — object/string-valued; a number is meaningless.
//   2. live-economy + scrutiny keys whose raw numeric value would leak an
//      internal magnitude/fraction (fork-E: no raw numbers on qualitative
//      surfaces) — render the channel, not the knob.
// CRITICAL (fork-E): none of these branches ever interpolate the value, so the
// schedule_event target event_id can never leak onto the badge.
const QUALITATIVE_EFFECT_KEYS: ReadonlySet<string> = new Set<string>([
  ...Array.from(STRUCTURED_EFFECT_KEYS),
  'press_scrutiny_flag',
  'promote_release',
  'catalog_damage',
  'cancel_project',
  'grant_inventory',
  'transfer_revenue_stream',
]);

// Qualitative keys whose fiction is clearly adverse — colored negative for
// legibility (still number-free). Everything else in QUALITATIVE_EFFECT_KEYS is
// a beneficial/neutral move and gets the neutral qualitative treatment.
const QUALITATIVE_NEGATIVE_KEYS: ReadonlySet<string> = new Set<string>([
  'set_exec_absence',
  'press_scrutiny_flag',
  'catalog_damage',
  'cancel_project',
  'transfer_revenue_stream',
]);

function isQualitativeEffect(key: string, value: EffectValue): boolean {
  return QUALITATIVE_EFFECT_KEYS.has(key) || typeof value !== 'number';
}

// Number-free label for a qualitative badge — the channel name, never the value.
function qualitativeLabel(key: string): string {
  return EFFECT_CHANNEL_DESCRIPTIONS[key]?.title ?? key.replace(/_/g, ' ');
}

// Badge honesty (exec-meetings-revival PR-2): only render a badge for a key the
// engine actually implements (LIVE_EFFECT_KEYS) or 'executive_mood' (handled
// outside applyEffects's switch by processExecutiveActions, but still a real,
// wired effect). Every other key is a dead channel until its own PR lands — no
// badge, not a mislabeled one. See EXECUTIVE_MEETINGS_CASE_FILE_2026-07-03.md §2/§6d.
export function isRenderableEffectKey(key: string): boolean {
  return LIVE_EFFECT_KEYS.has(key) || key === 'executive_mood';
}

interface DialogueInterfaceProps {
  dialogue: {
    prompt: string;
    choices: DialogueChoice[];
  };
  onSelectChoice: (choice: DialogueChoice) => void;
  onBack: () => void;
  targetScope?: 'global' | 'predetermined' | 'user_selected';
  selectedArtistName?: string;
  /**
   * CC affordability gate (playtest bug, 2026-07-05): the player's current
   * Creative Capital. When provided, a choice whose CC cost (immediate +
   * delayed, via the same getChoiceCreativeCapitalCost helper AUTO budgets
   * with) exceeds it is DISABLED with an explanatory note — previously a
   * CC-costing choice was selectable at 0 CC and the engine's Math.max(0, …)
   * clamp silently erased the cost (free lunch). Absent = no gating (other
   * render sites / tests keep their existing behavior). Server clamp remains
   * the backstop. Known limitation: gates against CURRENT CC only, not net of
   * other already-queued choices this week (ledger C75).
   */
  availableCreativeCapital?: number;
}

function EffectBadge({
  effect,
  value,
  isDelayed = false,
  targetScope,
  selectedArtistName
}: {
  effect: string;
  value: EffectValue;
  isDelayed?: boolean;
  targetScope?: 'global' | 'predetermined' | 'user_selected';
  selectedArtistName?: string;
}) {
  // C99: a structured/object value (or any non-numeric authored value) renders
  // qualitatively — the channel name only, never the raw value.
  const isQualitative = isQualitativeEffect(effect, value);
  const numericValue = typeof value === 'number' ? value : 0;
  const isPositive = numericValue > 0;
  // Exec-meetings-revival PR-6 (C4): variance_up is neither good nor bad — it's a
  // volatility knob, not a value delta — so it renders neutral instead of
  // green/red regardless of sign. rep_swing IS a directional value (a
  // reputation change, even if gambled), so it keeps the normal positive/
  // negative styling once resolved.
  const isNeutralEffect = effect === 'variance_up';
  // Qualitative badges: adverse channels read negative; the rest get a neutral
  // cyan "information" treatment (no value direction implied).
  const isQualitativeNegative = isQualitative && QUALITATIVE_NEGATIVE_KEYS.has(effect);

  const Icon = isDelayed
    ? Clock
    : isQualitative
      ? (isQualitativeNegative ? TrendingDown : Sparkles)
      : isNeutralEffect
        ? Shuffle
        : (isPositive ? TrendingUp : TrendingDown);

  const colorClass = isQualitative
    ? (isQualitativeNegative
        ? 'text-negative bg-negative/10 border-negative/40'
        : 'text-neon-cyan bg-neon-cyan/10 border-neon-cyan/40')
    : isNeutralEffect
      ? 'text-neon-amber bg-neon-amber/10 border-neon-amber/40'
      : isPositive
        ? 'text-positive bg-positive/10 border-positive/40'
        : 'text-negative bg-negative/10 border-negative/40';
  const delayedClass = isDelayed ? 'border-neon-lilac/40 bg-neon-lilac/10 text-neon-lilac' : '';

  const formatEffect = (key: string, rawVal: EffectValue) => {
    // C99: qualitative channels (structured values + misleading-numeric verbs)
    // short-circuit to a number-free channel label BEFORE the numeric switch, so
    // no branch can ever stringify an object or leak a knob/event_id.
    if (isQualitativeEffect(key, rawVal)) {
      return qualitativeLabel(key);
    }
    const val = rawVal as number;
    switch (key) {
      case 'money':
        return `${val > 0 ? '+' : ''}$${val.toLocaleString()}`;
      case 'reputation':
        return `${val > 0 ? '+' : ''}${val} Rep`;
      case 'creative_capital':
        return `${val > 0 ? '+' : ''}${val} Creative`;
      case 'artist_mood':
        // Add scope-specific context for mood changes
        if (targetScope === 'global') {
          return `${val > 0 ? '+' : ''}${val} Mood (All Artists)`;
        } else if (targetScope === 'user_selected' && selectedArtistName) {
          return `${val > 0 ? '+' : ''}${val} Mood (${selectedArtistName})`;
        } else if (targetScope === 'predetermined') {
          return `${val > 0 ? '+' : ''}${val} Mood (Most Popular)`;
        }
        return `${val > 0 ? '+' : ''}${val} Mood`;
      case 'artist_energy':
        return `${val > 0 ? '+' : ''}${val} Energy`;
      case 'artist_popularity':
        return `${val > 0 ? '+' : ''}${val} Popularity`;
      case 'executive_mood':
        return `${val > 0 ? '+' : ''}${val} Exec Mood`;
      case 'press_story_flag':
        // Exec-meetings-revival PR-3 (C2) — one-shot boolean, value-less badge.
        return 'Press Story';
      case 'press_momentum':
        return `${val > 0 ? '+' : ''}${val} Press Buzz`;
      case 'quality_bonus':
        // Exec-meetings-revival PR-4 (C1) — next-release quality channel.
        return `${val > 0 ? '+' : ''}${val} Quality`;
      case 'awareness_boost':
        // Exec-meetings-revival PR-5 (C3) — next-release awareness channel.
        return `${val > 0 ? '+' : ''}${val} Buzz`;
      case 'variance_up':
        // Exec-meetings-revival PR-6 (C4) — a volatility knob, not a value delta;
        // always shown with a magnitude (±N), never colored green/red (see
        // isNeutralEffect above).
        return `±${Math.abs(val)} Volatility`;
      case 'rep_swing':
        // Exec-meetings-revival PR-6 (C4) — the authored value here is the
        // GAMBLE's magnitude (pre-roll), shown at the choice-preview stage before
        // the isolated seeded roll resolves it.
        return `±${Math.abs(val)} Rep Gamble`;
      case 'award_chances':
        // Exec-meetings-revival PR-7 (C5) — prestige/award track. Never expires,
        // banks to campaign end; badge reads as a durable prestige value.
        return `${val > 0 ? '+' : ''}${val} Prestige`;
      default:
        // Unreachable in practice — the caller filters to isRenderableEffectKey
        // before rendering an EffectBadge at all. Kept as a safe fallback only.
        return `${val > 0 ? '+' : ''}${val} ${key.replace(/_/g, ' ')}`;
    }
  };

  return (
    <Badge
      variant="outline"
      className={`text-xs font-mono rounded-pill flex items-center gap-1 ${isDelayed ? delayedClass : colorClass}`}
    >
      <Icon className="h-3 w-3" />
      {formatEffect(effect, value)}
    </Badge>
  );
}

// Exported for badge-honesty testing (exec-meetings-revival PR-2) — lets tests
// render just the effects list without mounting the Carousel/BorderTrail tree,
// which is brittle under jsdom.
export function ChoiceEffects({
  choice,
  targetScope,
  selectedArtistName
}: {
  choice: DialogueChoice;
  targetScope?: 'global' | 'predetermined' | 'user_selected';
  selectedArtistName?: string;
}) {
  // Badge honesty: only surface entries for LIVE_EFFECT_KEYS (+ executive_mood).
  // Dead keys are filtered out entirely here, not just at render — so
  // hasImmediate/hasDelayed (and thus the "No direct effects" fallback) reflect
  // reality rather than the raw authored data.
  const immediateEntries = Object.entries(choice.effects_immediate || {}).filter(
    ([effect, value]) => value !== undefined && isRenderableEffectKey(effect)
  );
  const delayedEntries = Object.entries(choice.effects_delayed || {}).filter(
    ([effect, value]) => value !== undefined && isRenderableEffectKey(effect)
  );
  const hasImmediate = immediateEntries.length > 0;
  const hasDelayed = delayedEntries.length > 0;

  if (!hasImmediate && !hasDelayed) {
    return (
      <div className="text-xs text-text-muted italic">
        No direct effects
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {hasImmediate && (
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Zap className="h-3 w-3 text-neon-amber" />
            <span className="text-xs font-medium text-text-body">Immediate</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {immediateEntries.map(([effect, value]) => (
              <EffectBadgeTooltip key={effect} effectKey={effect}>
                <EffectBadge
                  effect={effect}
                  value={value as EffectValue}
                  targetScope={targetScope}
                  selectedArtistName={selectedArtistName}
                />
              </EffectBadgeTooltip>
            ))}
          </div>
        </div>
      )}

      {hasDelayed && (
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Clock className="h-3 w-3 text-neon-cyan" />
            <span className="text-xs font-medium text-text-body">Next Week</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {delayedEntries.map(([effect, value]) => (
              <EffectBadgeTooltip key={effect} effectKey={effect}>
                <EffectBadge
                  effect={effect}
                  value={value as EffectValue}
                  isDelayed={true}
                  targetScope={targetScope}
                  selectedArtistName={selectedArtistName}
                />
              </EffectBadgeTooltip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Exec Console redesign (2026-07-11): the dialogue step renders all takes SIDE
 * BY SIDE ("your three takes" in the console design) instead of a carousel —
 * the player compares responses at a glance. Behavior is unchanged: same
 * ChoiceEffects badge honesty, same CC affordability gate + testids.
 */
export function DialogueInterface({
  dialogue,
  onSelectChoice,
  onBack,
  targetScope,
  selectedArtistName,
  availableCreativeCapital
}: DialogueInterfaceProps) {
  // Replace {artistName} placeholder with actual artist name
  const displayPrompt = selectedArtistName
    ? dialogue.prompt.replace(/{artistName}/g, selectedArtistName)
    : dialogue.prompt;

  return (
    <div className="space-y-6">
      {/* prompt quote panel */}
      <div className="chromatic-hairline relative rounded-card border border-neon-pink/20 bg-gradient-to-br from-action-pink/15 to-action-purple/15 px-6 py-5">
        <p className="text-[15.5px] italic leading-relaxed text-text-primary">
          "{displayPrompt}"
        </p>
        {selectedArtistName && (
          <div className="mt-2.5 inline-flex items-center gap-2 rounded-pill border border-neon-lilac/30 bg-neon-lilac/10 px-3 py-1 text-[11px] text-neon-lilac">
            Re: {selectedArtistName}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
          your takes
        </div>
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dialogue.choices.map((choice) => {
            // CC affordability gate: disable a choice the player can't pay
            // for (same cost math AUTO budgets with). undefined prop = no gate.
            const ccCost = getChoiceCreativeCapitalCost(choice);
            const cannotAfford =
              typeof availableCreativeCapital === 'number' && ccCost > availableCreativeCapital;
            return (
              <div
                key={choice.id}
                className={`chromatic-hairline relative flex flex-col rounded-card border bg-surface-inner/60 p-5 ${
                  cannotAfford ? 'border-negative/25 opacity-80' : 'border-white/10'
                }`}
              >
                <div className="mb-3.5 flex items-start justify-between gap-2.5">
                  <div className="text-sm font-semibold leading-snug text-text-primary">
                    {choice.label}
                  </div>
                  <span className="flex flex-shrink-0 items-center gap-1.5 rounded-pill border border-neon-lilac/30 bg-neon-lilac/10 px-2.5 py-1 font-mono text-[10.5px] text-neon-lilac">
                    <Zap className="h-2.5 w-2.5" />
                    {ccCost === 0 ? 'Free' : `${ccCost} CC`}
                  </span>
                </div>

                <ChoiceEffects
                  choice={choice}
                  targetScope={targetScope}
                  selectedArtistName={selectedArtistName}
                />

                <div className="flex-1" />

                {cannotAfford && (
                  <div
                    data-testid={`cc-gate-${choice.id}`}
                    className="mt-3.5 flex items-center gap-1.5 rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-xs font-mono text-negative"
                  >
                    <Zap className="h-3 w-3 shrink-0" />
                    <span>
                      Needs {ccCost} Creative Capital — you have {availableCreativeCapital}
                    </span>
                  </div>
                )}
                <Button
                  onClick={() => onSelectChoice(choice)}
                  disabled={cannotAfford}
                  className="mt-3.5 w-full rounded-button bg-gradient-to-br from-action-pink to-action-purple text-white shadow-action hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  size="sm"
                >
                  {cannotAfford ? 'Locked' : 'Choose'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}