import React from 'react';
import { Badge } from '../ui/badge';
import { HoloDisc } from '../ui/holo-disc';
import { Users, Brain, DollarSign, Star, Check } from 'lucide-react';
import type { Executive } from '../../../../shared/types/gameTypes';
import { getMoodModifiers, isNeutral } from '@shared/utils/executiveMoodModifier';

/**
 * Exec Console redesign (2026-07-11, from the claude.ai/design "Exec Meetings —
 * Console" direction): each executive renders as a mixing-console CHANNEL STRIP —
 * channel number, avatar disc, name/role/salary, vertical loyalty & mood faders,
 * and a status readout at the foot of the strip. The CEO renders as the narrower
 * MASTER strip (spinning HoloDisc, no faders — the CEO has no exec mood/loyalty row).
 *
 * All pre-redesign behavior contracts are preserved:
 * - `sit-out-${role}` / `urgency-dot-${role}` testids (Tier 0 sit-out, Tier 2 urgency)
 * - selection blocked while disabled / sitting out / A&R-busy
 * - mood-band modifier chip via the SAME shared util the engine routes through
 */
interface ExecutiveCardProps {
  executive: Executive;
  disabled?: boolean;
  /**
   * Meeting-relevance Tier 0 (PR-1): this exec's eligible meeting pool is empty
   * this week — they sit out. Card is not selectable and shows a calm notice.
   */
  sitOut?: boolean;
  /**
   * Tier 2 (PR-2, Nes amendment 1 — urgency indicator): this exec's selected
   * meeting carries `reactiveContext` this week — a happening fired their
   * reactive meeting. Shows a small pulse dot signaling "something happened"
   * WITHOUT revealing content (no meeting name/trigger here — the "why now"
   * line is the payoff on open).
   */
  hasReactiveMeeting?: boolean;
  onSelect: () => void;
  weeklySalary?: number;
  arOfficeStatus?: {
    arOfficeSlotUsed: boolean;
    arOfficeSourcingType: string | null;
    arOfficeOperationStart: number | null;
  };
  /** This exec already has a meeting queued into a focus slot this week. */
  queued?: boolean;
  /** No focus slots remain this week (distinct from queued — drives status copy). */
  noSlots?: boolean;
  /** Console channel number shown in the strip head (1-based). */
  channelNumber?: number;
}

export const roleConfig = {
  ceo: {
    icon: Star,
    title: 'Chief Executive Officer',
    shortTitle: 'CEO',
    name: 'You',
    avatar: undefined,
    roleText: 'text-money',
    ringShadow: 'shadow-[0_0_0_1.5px_rgba(240,201,138,0.5)]',
    tint: 'from-money/10',
    border: 'border-money/30',
  },
  head_ar: {
    icon: Users,
    title: 'Head of A&R',
    shortTitle: 'A&R',
    name: 'Marcus Rodriguez',
    avatar: '/avatars/marcus_rodriguez_exec@0.5x.png',
    roleText: 'text-neon-cyan',
    ringShadow: 'shadow-[0_0_0_1.5px_rgba(55,214,255,0.45)]',
    tint: 'from-neon-cyan/10',
    border: 'border-white/10',
  },
  cco: {
    icon: Brain,
    title: 'Chief Creative Officer',
    shortTitle: 'CCO',
    name: 'Dante Washington',
    avatar: '/avatars/dante_washingtong_exec@0.5x.png',
    roleText: 'text-neon-lilac',
    ringShadow: 'shadow-[0_0_0_1.5px_rgba(160,90,240,0.45)]',
    tint: 'from-neon-purple/10',
    border: 'border-white/10',
  },
  cmo: {
    icon: DollarSign,
    title: 'Chief Marketing Officer',
    shortTitle: 'CMO',
    name: 'Samara Chen',
    avatar: '/avatars/samara_chen_exec@0.5x.png',
    roleText: 'text-neon-pink',
    ringShadow: 'shadow-[0_0_0_1.5px_rgba(255,61,110,0.4)]',
    tint: 'from-neon-magenta/10',
    border: 'border-white/10',
  },
  head_distribution: {
    icon: DollarSign,
    title: 'Head of Distribution',
    shortTitle: 'Distro',
    name: 'Patricia Williams',
    avatar: '/avatars/patricia_williams_exec@0.5x.png',
    roleText: 'text-positive',
    ringShadow: 'shadow-[0_0_0_1.5px_rgba(55,224,176,0.45)]',
    tint: 'from-positive/10',
    border: 'border-white/10',
  },
} as const;

function VerticalFader({ value, label, fillClass, valueClass }: {
  value: number;
  label: string;
  fillClass: string;
  valueClass: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-[88px] w-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className={`absolute bottom-0 left-0 right-0 rounded-full ${fillClass}`}
          style={{ height: `${clamped}%` }}
        />
      </div>
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-muted">{label}</span>
      <span className={`font-mono text-[11px] ${valueClass}`}>{clamped}</span>
    </div>
  );
}

export function ExecutiveCard({
  executive,
  disabled = false,
  sitOut = false,
  hasReactiveMeeting = false,
  onSelect,
  weeklySalary,
  arOfficeStatus,
  queued = false,
  noSlots = false,
  channelNumber,
}: ExecutiveCardProps) {
  const config = roleConfig[executive.role as keyof typeof roleConfig] || {
    icon: Users,
    title: executive.role,
    shortTitle: executive.role,
    name: executive.role,
    avatar: undefined,
    roleText: 'text-text-muted',
    ringShadow: '',
    tint: 'from-white/5',
    border: 'border-white/10',
  };

  const IconComponent = config.icon;
  const isCEO = executive.role === 'ceo';
  const isHeadAR = executive.role === 'head_ar';
  const isArBusy = !!(isHeadAR && arOfficeStatus?.arOfficeSlotUsed);
  // PR-1 sit-out: an exec with an empty eligible meeting pool cannot be
  // selected into a focus slot this week.
  const effectiveDisabled = disabled || isArBusy || sitOut || queued;

  const loyaltyValue = executive.loyalty ?? 50;
  const moodValue = executive.mood ?? 50;

  // Exec-meetings-revival PR-9 (C6/D) — active mood-modifier chip. CEO has no exec row
  // (master strip below), so this only surfaces for real executives. Neutral band
  // (mood 30-80) shows nothing. Uses the SAME shared util the engine + preview route
  // through, so the label can never drift from the mechanic.
  const moodModifiers = getMoodModifiers(moodValue);
  const moodBandChip = isCEO || isNeutral(moodModifiers)
    ? null
    : moodModifiers.band === 'inspired'
      ? {
          label: `Inspired +${Math.round((moodModifiers.effectMultiplier - 1) * 100)}%`,
          className: 'font-mono bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/40 rounded-pill',
        }
      : moodModifiers.band === 'content'
        ? {
            label: `Content −${Math.round((1 - moodModifiers.costMultiplier) * 100)}% costs`,
            className: 'font-mono bg-positive/10 text-positive border border-positive/40 rounded-pill',
          }
        : {
            label: `Disgruntled +${Math.round((moodModifiers.costMultiplier - 1) * 100)}% costs`,
            className: 'font-mono bg-negative/10 text-negative border border-negative/40 rounded-pill',
          };

  // Console status readout (foot of the strip) — precedence mirrors the design:
  // busy > queued > sit-out > no-slots > open for business.
  const status = isArBusy
    ? { text: 'Running a scouting op — back next week', className: 'bg-neon-amber/10 border-neon-amber/30 text-neon-amber' }
    : queued
      ? { text: 'Meeting queued for this week', className: 'bg-neon-green/10 border-neon-green/30 text-neon-green' }
      : sitOut
        ? { text: isCEO ? 'Nothing needs your call this week' : 'Nothing needs their call this week', className: 'bg-white/[0.03] border-white/10 text-text-muted' }
        : noSlots
          ? { text: 'No focus slots remaining', className: 'bg-negative/10 border-negative/25 text-negative' }
          : { text: 'Has something for you', className: 'bg-neon-purple/10 border-neon-purple/35 text-neon-lilac' };

  const queuedChip = (
    <span className="flex items-center gap-1.5 rounded-pill border border-neon-green/40 bg-neon-green/15 px-2 py-0.5 font-mono text-[9px] font-semibold text-neon-green">
      <Check className="h-2.5 w-2.5" /> Queued
    </span>
  );

  // ── CEO master strip ─────────────────────────────────────────────────────
  if (isCEO) {
    return (
      <div
        data-testid="exec-strip-ceo"
        onClick={effectiveDisabled ? undefined : onSelect}
        className={`relative flex w-[150px] flex-shrink-0 flex-col items-center overflow-hidden rounded-card border ${config.border} bg-gradient-to-b ${config.tint} to-surface-inner/90 px-4 py-5 transition-colors ${
          effectiveDisabled ? 'opacity-60' : 'cursor-pointer hover:border-money/60'
        }`}
      >
        <div className="mb-4 flex w-full items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.26em] text-money">master</span>
          {hasReactiveMeeting && !sitOut && (
            <span
              data-testid="urgency-dot-ceo"
              aria-label="Something happened this week"
              className="h-2.5 w-2.5 rounded-full bg-neon-cyan shadow-[0_0_8px_2px_rgba(34,211,238,0.6)] animate-pulse"
            />
          )}
        </div>
        <HoloDisc size={56} spinSeconds={12} className="mb-3.5" />
        <div className="text-center text-[13.5px] font-semibold text-text-primary">
          {config.shortTitle} - {config.name}
        </div>
        <div className="mt-1 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-money/70">
          {queued ? 'meeting queued' : noSlots ? 'no slots left' : 'quarterly vision'}
        </div>
        <div className="flex-1 min-h-4" />
        {queued ? (
          queuedChip
        ) : (
          <div className="w-full rounded-lg border border-money/25 bg-money/[0.08] px-1 py-1.5 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-money">
            open channel
          </div>
        )}
        {sitOut && (
          <span data-testid="sit-out-ceo" className="mt-2 text-center text-xs text-text-muted">
            Nothing needs your call this week
          </span>
        )}
      </div>
    );
  }

  // ── Exec channel strip ───────────────────────────────────────────────────
  return (
    <div
      data-testid={`exec-strip-${executive.role}`}
      onClick={effectiveDisabled ? undefined : onSelect}
      className={`relative flex flex-1 flex-col items-center overflow-hidden rounded-card border ${
        effectiveDisabled ? 'border-white/[0.07]' : 'border-white/[0.14] hover:border-white/25'
      } bg-gradient-to-b ${config.tint} to-surface-inner/90 px-4 py-5 transition-all duration-200 ${
        effectiveDisabled ? (queued ? 'opacity-75' : 'opacity-55') : 'cursor-pointer hover:-translate-y-1.5'
      } ${hasReactiveMeeting && !effectiveDisabled ? 'shadow-[0_0_34px_rgba(55,214,255,0.16)]' : ''}`}
    >
      {/* channel head */}
      <div className="mb-4 flex w-full items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-text-muted">
          ch {channelNumber ?? ''}
        </span>
        {queued ? (
          queuedChip
        ) : hasReactiveMeeting && !sitOut ? (
          <span
            data-testid={`urgency-dot-${executive.role}`}
            aria-label="Something happened this week"
            className="h-2.5 w-2.5 rounded-full bg-neon-cyan shadow-[0_0_8px_2px_rgba(34,211,238,0.6)] animate-pulse"
          />
        ) : null}
      </div>

      {/* avatar disc */}
      <div className={`relative mb-3.5 h-[78px] w-[78px] overflow-hidden rounded-full ${config.ringShadow} shadow-panel`}>
        {config.avatar ? (
          <img
            src={config.avatar}
            alt={`${config.title} avatar`}
            className="absolute left-1/2 top-0 h-[130px] w-auto max-w-none -translate-x-1/2 object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neon-purple to-neon-blue">
            <IconComponent className="h-8 w-8 text-white" />
          </div>
        )}
      </div>

      <div className="text-center text-[14.5px] font-semibold text-text-primary">{config.name}</div>
      <div className={`mt-1 font-mono text-[9px] uppercase tracking-[0.18em] ${config.roleText}`}>
        {config.title}
      </div>
      {weeklySalary !== undefined && (
        <div className="mt-1.5 font-mono text-[10.5px] text-money">
          ${weeklySalary.toLocaleString()}/wk
        </div>
      )}

      {/* vertical faders */}
      <div className="my-4 flex gap-6">
        <VerticalFader
          value={loyaltyValue}
          label="loy"
          fillClass="bg-gradient-to-b from-neon-lilac to-neon-purple shadow-[0_0_10px_rgba(160,90,240,0.7)]"
          valueClass="text-neon-lilac"
        />
        <VerticalFader
          value={moodValue}
          label="mood"
          fillClass="bg-gradient-to-b from-neon-green to-positive shadow-[0_0_10px_rgba(55,224,176,0.6)]"
          valueClass="text-positive"
        />
      </div>

      {/* Exec-meetings-revival PR-9: mood-modifier chip (non-neutral only) */}
      {moodBandChip && (
        <Badge variant="secondary" className={`mb-2 px-2 py-0.5 text-[10px] ${moodBandChip.className}`}>
          {moodBandChip.label}
        </Badge>
      )}

      <div className="flex-1" />

      {/* status readout */}
      <div className={`flex min-h-[44px] w-full items-center justify-center rounded-lg border px-2.5 py-1.5 text-center text-[11px] leading-snug ${status.className}`}>
        {status.text}
      </div>

      {/* Meeting-relevance Tier 0 (PR-1): sit-out testid anchor (copy lives in the
          status readout above so the strip stays one coherent console element) */}
      {sitOut && <span data-testid={`sit-out-${executive.role}`} className="sr-only">sitting out</span>}
    </div>
  );
}
