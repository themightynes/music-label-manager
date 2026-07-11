import React from 'react';
import { Button } from '../ui/button';
import { Check, X, Zap, Sparkles, Wand2 } from 'lucide-react';
import type { RoleMeeting, DialogueChoice, Executive } from '../../../../shared/types/gameTypes';
import { ChoiceEffects } from './DialogueInterface';
import { roleConfig } from './ExecutiveCard';
import { getChoiceCreativeCapitalCost } from '../../services/executiveAutoSelect';
import { formatWhyNow } from '../../utils/reactiveContextCopy';

/**
 * Meeting-relevance PR-3 — AUTO Option A (propose-then-confirm), restyled as the
 * Exec Console's "proposed patch list" modal overlay (2026-07-11 redesign).
 *
 * AUTO no longer commits its picks straight away. It computes them and hands the
 * proposal to this review overlay: one row per exec that AUTO chose (execs
 * sitting out on an empty pool never appear — they never make it into
 * `autoOptions`). Each row shows the picked meeting, AUTO's chosen choice, the
 * choice's effect badges (reused verbatim from `ChoiceEffects`, so the same
 * LIVE_EFFECT_KEYS whitelist + `EffectBadgeTooltip` wrapping the manual dialogue
 * uses), the Tier 2 "why now" line when the pick is reactive, and the pick's
 * Creative Capital / money cost (surfaced from what AUTO already computes — no
 * new economy math).
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

function execConfig(role: string) {
  return (
    roleConfig[role as keyof typeof roleConfig] ?? {
      shortTitle: role.replace(/_/g, ' ').toUpperCase(),
      name: role.replace(/_/g, ' '),
      title: role.replace(/_/g, ' '),
      avatar: undefined,
      roleText: 'text-text-muted',
    }
  );
}

function roleLabel(role: string): string {
  const config = execConfig(role);
  return `${config.shortTitle} — ${config.name}`;
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-app/70 p-4 backdrop-blur-lg"
      data-testid="auto-select-review-panel"
    >
      <div className="chromatic-hairline relative max-h-[86vh] w-[860px] max-w-full overflow-auto rounded-card border border-white/10 bg-gradient-to-b from-surface-panel to-surface-inner p-7 shadow-panel md:p-9">
        <div className="mb-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-action-pink to-action-purple shadow-action">
              <Wand2 className="h-4 w-4 text-white" />
            </div>
            <h2 className="m-0 font-display text-[21px] font-semibold text-text-primary">
              AUTO — proposed patch list
            </h2>
          </div>
          <span className="font-mono text-[11px] text-text-muted">
            {options.length} pick{options.length === 1 ? '' : 's'}
          </span>
        </div>
        <p className="mb-6 mt-0 text-[13px] text-text-muted">
          Safe picks for your remaining focus slots. Nothing commits until you confirm.
        </p>

        <div className="flex flex-col gap-3.5">
          {options.map((option) => {
            const ccCost = getChoiceCreativeCapitalCost(option.choice);
            const moneyDelta = getChoiceMoneyDelta(option.choice);
            const config = execConfig(option.executive.role);
            return (
              <div
                key={option.executive.role}
                data-testid={`auto-review-row-${option.executive.role}`}
                className="chromatic-hairline relative overflow-hidden rounded-card border border-white/[0.08] bg-surface-inner/50 px-5 py-4"
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full shadow-panel">
                    {config.avatar ? (
                      <img
                        src={config.avatar}
                        alt={`${config.title} avatar`}
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-money to-action-pink font-display text-sm text-white">
                        {config.shortTitle}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2.5">
                      <span className="text-[14.5px] font-semibold text-text-primary">{roleLabel(option.executive.role)}</span>
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-text-body">
                      {meetingLabel(option.meeting)} →{' '}
                      <span className="font-medium text-text-primary">{option.choice.label}</span>
                    </div>
                    {option.meeting.reactiveContext && (
                      <div
                        data-testid="why-now-line"
                        className="mt-2 inline-flex items-center gap-1.5 rounded-pill border border-neon-cyan/30 bg-neon-cyan/10 px-2.5 py-0.5 text-[11px] text-neon-cyan"
                      >
                        <Sparkles className="h-3 w-3 shrink-0" />
                        <span className="font-mono">{formatWhyNow(option.meeting.reactiveContext)}</span>
                      </div>
                    )}
                    <div className="mt-2.5">
                      <ChoiceEffects choice={option.choice} targetScope={option.meeting.target_scope} />
                    </div>
                    {(ccCost > 0 || moneyDelta !== 0) && (
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
                        {ccCost > 0 && (
                          <span className="font-mono text-neon-lilac">Cost: {ccCost} Creative</span>
                        )}
                        {moneyDelta !== 0 && (
                          <span className="font-mono text-money">
                            {moneyDelta > 0 ? '+' : '-'}${Math.abs(moneyDelta).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-2">
                    {ccCost > 0 && (
                      <span className="flex items-center gap-1.5 rounded-pill border border-neon-lilac/30 bg-neon-lilac/10 px-2.5 py-1 font-mono text-[11px] text-neon-lilac">
                        <Zap className="h-2.5 w-2.5" />
                        {ccCost} CC
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOverrideRow(option.executive)}
                      aria-label={`Override ${roleLabel(option.executive.role)}`}
                      data-testid={`auto-review-override-${option.executive.role}`}
                      className="rounded-button border border-neon-cyan/40 bg-neon-cyan/[0.07] text-xs text-neon-cyan hover:bg-neon-cyan/15 hover:text-neon-cyan"
                    >
                      Override
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3.5">
          <Button
            onClick={onConfirmAll}
            data-testid="auto-review-confirm"
            className="flex-1 gap-2 rounded-button bg-gradient-to-br from-action-pink to-action-purple py-6 text-[14.5px] font-semibold text-white shadow-action hover:opacity-90"
          >
            <Check className="h-4 w-4" />
            Confirm All
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            data-testid="auto-review-cancel"
            className="flex-none basis-[180px] gap-2 rounded-button border border-white/10 bg-white/[0.03] py-6 text-sm text-text-body hover:bg-white/[0.07]"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
