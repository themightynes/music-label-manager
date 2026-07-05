import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Check, X, Pencil, Zap } from 'lucide-react';
import type { RoleMeeting, DialogueChoice, Executive } from '../../../../shared/types/gameTypes';
import { ChoiceEffects } from './DialogueInterface';
import { getChoiceCreativeCapitalCost } from '../../services/executiveAutoSelect';

/**
 * Meeting-relevance PR-3 — AUTO Option A (propose-then-confirm).
 *
 * AUTO no longer commits its picks straight away. It computes them and hands the
 * proposal to this compact review panel: one row per exec that AUTO chose (execs
 * sitting out on an empty pool never appear — they never make it into
 * `autoOptions`). Each row shows the picked meeting, AUTO's chosen choice, the
 * choice's effect badges (reused verbatim from `ChoiceEffects`, so the same
 * LIVE_EFFECT_KEYS whitelist + `EffectBadgeTooltip` wrapping the manual dialogue
 * uses), and the pick's Creative Capital / money cost (surfaced from what AUTO
 * already computes — no new economy math).
 *
 * The player can (a) confirm all — commits exactly these picks — or (b) override
 * a single row, which drops the whole proposal and enters the normal manual
 * meeting flow for that exec. Cancel leaves everything untouched.
 *
 * The panel is presentational only: it renders `autoOptions` and calls back. All
 * commit/cancel/override state lives in `executiveMeetingMachine`.
 */

interface AutoOptionLike {
  executive: Executive;
  meeting: RoleMeeting;
  choice: DialogueChoice;
}

const ROLE_LABELS: Record<string, string> = {
  ceo: 'CEO — You',
  head_ar: 'A&R — Marcus Rodriguez',
  cco: 'CCO — Dante Washington',
  cmo: 'CMO — Samara Chen',
  head_distribution: 'Distro — Patricia Williams',
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ').toUpperCase();
}

function meetingLabel(meeting: RoleMeeting): string {
  return meeting.name || meeting.prompt || meeting.id.replace(/_/g, ' ');
}

/**
 * Net money delta the choice grants/spends (immediate + delayed), summed across
 * both effect buckets. Positive = income, negative = cost. AUTO already reads
 * these keys; we only surface them.
 */
function getChoiceMoneyDelta(choice: DialogueChoice): number {
  let net = 0;
  for (const effects of [choice.effects_immediate, choice.effects_delayed]) {
    if (!effects) continue;
    const value = (effects as Record<string, unknown>).money;
    if (typeof value === 'number') net += value;
  }
  return net;
}

export function AutoSelectReviewPanel({
  options,
  onConfirmAll,
  onCancel,
  onOverrideRow,
}: {
  options: AutoOptionLike[];
  onConfirmAll: () => void;
  onCancel: () => void;
  onOverrideRow: (executive: Executive) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="w-full max-w-xl mx-auto" data-testid="auto-select-review-panel">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-4 w-4 text-neon-cyan" />
        <span className="font-display text-sm text-text-primary">
          AUTO picked {options.length} meeting{options.length === 1 ? '' : 's'} — review before committing
        </span>
      </div>

      <div className="space-y-3">
        {options.map((option) => {
          const ccCost = getChoiceCreativeCapitalCost(option.choice);
          const moneyDelta = getChoiceMoneyDelta(option.choice);
          return (
            <Card
              key={option.executive.role}
              data-testid={`auto-review-row-${option.executive.role}`}
              className="glass-panel chromatic-hairline border-0"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-2 py-0.5 font-mono uppercase tracking-wide bg-neon-lilac/10 text-neon-lilac border border-neon-lilac/40 rounded-pill"
                    >
                      {roleLabel(option.executive.role)}
                    </Badge>
                    <div className="mt-2 text-sm text-text-primary italic leading-snug">
                      "{meetingLabel(option.meeting)}"
                    </div>
                    <div className="mt-1 text-sm font-medium text-text-body">
                      {option.choice.label}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOverrideRow(option.executive)}
                    aria-label={`Override ${roleLabel(option.executive.role)}`}
                    data-testid={`auto-review-override-${option.executive.role}`}
                    className="shrink-0 gap-1 text-text-muted hover:text-neon-cyan"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Override
                  </Button>
                </div>

                <div className="mt-3">
                  <ChoiceEffects choice={option.choice} targetScope={option.meeting.target_scope} />
                </div>

                {(ccCost > 0 || moneyDelta !== 0) && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
                    {ccCost > 0 && (
                      <span className="font-mono text-neon-lilac">
                        Cost: {ccCost} Creative
                      </span>
                    )}
                    {moneyDelta !== 0 && (
                      <span className="font-mono text-money">
                        {moneyDelta > 0 ? '+' : '-'}${Math.abs(moneyDelta).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          data-testid="auto-review-cancel"
          className="gap-1 text-text-muted hover:text-text-primary"
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onConfirmAll}
          data-testid="auto-review-confirm"
          className="gap-1 rounded-button border border-neon-cyan/35 bg-neon-cyan/[0.06] text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan"
        >
          <Check className="h-4 w-4" />
          Confirm All
        </Button>
      </div>
    </div>
  );
}
