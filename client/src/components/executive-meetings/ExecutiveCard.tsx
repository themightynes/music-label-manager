import React from 'react';
import { Badge } from '../ui/badge';
import { Users, Brain, DollarSign, Star, Truck } from 'lucide-react';
import type { Executive } from '../../../../shared/types/gameTypes';
import { getMoodModifiers, isNeutral } from '@shared/utils/executiveMoodModifier';

interface ExecutiveCardProps {
  executive: Executive;
  disabled?: boolean;
  /**
   * Meeting-relevance Tier 0 (PR-1): this exec's eligible meeting pool is empty
   * this week — they sit out. Card is not selectable and shows a calm notice.
   */
  sitOut?: boolean;
  onSelect: () => void;
  weeklySalary?: number;
  arOfficeStatus?: {
    arOfficeSlotUsed: boolean;
    arOfficeSourcingType: string | null;
    arOfficeOperationStart: number | null;
  };
  flipAvatar?: boolean;
  badgesOnLeft?: boolean;
  alignContent?: 'left' | 'right' | 'center';
  isSelected?: boolean;
  compactBadges?: boolean;
}

const roleConfig = {
  ceo: {
    icon: Star,
    color: 'bg-purple-500',
    title: 'Chief Executive Officer',
    shortTitle: 'CEO',
    name: 'You',
    avatar: undefined,
  },
  head_ar: {
    icon: Users,
    color: 'bg-blue-500',
    title: 'Head of A&R',
    shortTitle: 'A&R',
    name: 'Marcus Rodriguez',
    avatar: '/avatars/marcus_rodriguez_exec@0.5x.png',
  },
  cco: {
    icon: Brain,
    color: 'bg-green-500',
    title: 'Chief Creative Officer',
    shortTitle: 'CCO',
    name: 'Dante Washington',
    avatar: '/avatars/dante_washingtong_exec@0.5x.png',
  },
  cmo: {
    icon: DollarSign,
    color: 'bg-orange-500',
    title: 'Chief Marketing Officer',
    shortTitle: 'CMO',
    name: 'Samara Chen',
    avatar: '/avatars/samara_chen_exec@0.5x.png',
  },
  head_distribution: {
    icon: DollarSign,
    color: 'bg-teal-500',
    title: 'Head of Distribution & Operations',
    shortTitle: 'Distro',
    name: 'Patricia Williams',
    avatar: '/avatars/patricia_williams_exec@0.5x.png',
  },
} as const;

export function ExecutiveCard({ executive, disabled = false, sitOut = false, onSelect, weeklySalary, arOfficeStatus, flipAvatar = false, badgesOnLeft = false, alignContent = 'center', isSelected = false, compactBadges = false }: ExecutiveCardProps) {
  const config = roleConfig[executive.role as keyof typeof roleConfig] || {
    icon: Users,
    color: 'bg-gray-500',
    title: executive.role,
    avatar: undefined,
  };

  const IconComponent = config.icon;
  const isCEO = executive.role === 'ceo';
  const isHeadAR = executive.role === 'head_ar';
  const isArBusy = !!(isHeadAR && arOfficeStatus?.arOfficeSlotUsed);
  // PR-1 sit-out: an exec with an empty eligible meeting pool cannot be
  // selected into a focus slot this week.
  const effectiveDisabled = disabled || isArBusy || sitOut;
  const shouldCompact = compactBadges && !isSelected;

  const loyaltyValue = executive.loyalty ?? 50;
  const moodValue = executive.mood ?? 50;
  const levelValue = executive.level ?? 1;

  const formatSalaryAbbrev = (value: number) => {
    const thousands = value / 1000;
    const rounded = Math.round(thousands * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}K`;
  };

  const salaryLabel = (value: number) => {
    if (shouldCompact) {
      return `$${formatSalaryAbbrev(value)}`;
    }
    return `Salary $${value.toLocaleString()}`;
  };

  const alignmentClass = alignContent === 'left' ? 'items-start' : alignContent === 'right' ? 'items-end' : 'items-center';
  const badgeOffsetDefault = badgesOnLeft ? '-left-20' : '-right-20';
  const badgeOffsetCompact = badgesOnLeft ? '-left-8' : '-right-6';
  const badgeStackSideClass = shouldCompact ? badgeOffsetCompact : badgeOffsetDefault;
  const badgeStackAlignment = badgesOnLeft ? 'items-end' : 'items-start';
  const badgeStackGapClass = shouldCompact ? 'gap-0.5' : 'gap-1';
  const neutralBadgeClass = 'font-mono bg-neon-lilac/10 text-neon-lilac border border-neon-lilac/40 rounded-pill';

  const loyaltyClass = shouldCompact
    ? neutralBadgeClass
    : loyaltyValue >= 70
      ? 'font-mono bg-positive/10 text-positive border border-positive/40 rounded-pill'
      : loyaltyValue >= 40
        ? 'font-mono bg-warning/10 text-warning border border-warning/40 rounded-pill'
        : 'font-mono bg-negative/10 text-negative border border-negative/40 rounded-pill';

  const moodClass = shouldCompact
    ? neutralBadgeClass
    : moodValue >= 70
      ? 'font-mono bg-positive/10 text-positive border border-positive/40 rounded-pill'
      : moodValue >= 40
        ? 'font-mono bg-warning/10 text-warning border border-warning/40 rounded-pill'
        : 'font-mono bg-negative/10 text-negative border border-negative/40 rounded-pill';

  const levelClass = shouldCompact ? neutralBadgeClass : 'font-mono bg-neon-blue/10 text-neon-blue border border-neon-blue/40 rounded-pill';
  const salaryClass = shouldCompact ? neutralBadgeClass : 'font-mono bg-money/10 text-money border border-money/40 rounded-pill';

  // Exec-meetings-revival PR-9 (C6/D) — active mood-modifier chip. CEO has no exec row
  // (returns early below), so this only surfaces for real executives. Neutral band
  // (mood 30-80) shows nothing. Uses the SAME shared util the engine + preview route
  // through, so the label can never drift from the mechanic.
  const moodModifiers = getMoodModifiers(moodValue);
  const moodBandChip = isCEO || isNeutral(moodModifiers)
    ? null
    : moodModifiers.band === 'inspired'
      ? {
          label: shouldCompact
            ? `+${Math.round((moodModifiers.effectMultiplier - 1) * 100)}%`
            : `Inspired +${Math.round((moodModifiers.effectMultiplier - 1) * 100)}%`,
          className: 'font-mono bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/40 rounded-pill',
        }
      : moodModifiers.band === 'content'
        ? {
            label: shouldCompact
              ? `-${Math.round((1 - moodModifiers.costMultiplier) * 100)}%`
              : `Content −${Math.round((1 - moodModifiers.costMultiplier) * 100)}% costs`,
            className: 'font-mono bg-positive/10 text-positive border border-positive/40 rounded-pill',
          }
        : {
            label: shouldCompact
              ? `+${Math.round((moodModifiers.costMultiplier - 1) * 100)}%`
              : `Disgruntled +${Math.round((moodModifiers.costMultiplier - 1) * 100)}% costs`,
            className: 'font-mono bg-negative/10 text-negative border border-negative/40 rounded-pill',
          };

  // CEO only shows badge, no avatar
  if (isCEO) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Badge
          variant="secondary"
          className={`text-xs px-3 py-1 font-mono uppercase tracking-wide bg-neon-lilac/10 text-neon-lilac border border-neon-lilac/40 rounded-pill ${
            effectiveDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-neon-lilac/20 transition-colors'
          }`}
          onClick={effectiveDisabled ? undefined : onSelect}
        >
          {config.shortTitle} - {config.name}
        </Badge>
        {sitOut && (
          <span data-testid={`sit-out-${executive.role}`} className="text-xs text-text-muted">
            Nothing needs your call this week
          </span>
        )}
      </div>
    );
  }

  // Avatar column content
  const avatarColumn = (
    <div className={`flex-shrink-0 flex flex-col ${alignmentClass} justify-center gap-2`}>
      <div className="relative">
        {/* Avatar/Icon Box */}
        <div className="w-36 h-36 bg-gradient-to-br from-neon-purple to-neon-blue border border-white/10 rounded-card overflow-hidden relative shadow-panel">
          {config.avatar ? (
            <img
              src={config.avatar}
              alt={`${config.title} avatar`}
              className={`absolute w-full object-cover ${flipAvatar ? 'scale-x-[-1]' : ''}`}
              style={{
                height: '244px',
                top: '-20px',
                imageRendering: 'auto'
              }}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center`}>
              <div className="p-3 rounded-card bg-white/10 text-white">
                <IconComponent className="h-12 w-12" />
              </div>
            </div>
          )}
        </div>

        {/* Metrics Badges - Stacked vertically, slightly overlapping avatar */}
        <div className={`absolute ${badgeStackSideClass} top-1/2 -translate-y-1/2 flex flex-col ${badgeStackGapClass} ${badgeStackAlignment}`}>
          {/* Loyalty Badge */}
          <Badge variant="secondary" className={`text-xs px-2 py-1 ${loyaltyClass}`}>
            {shouldCompact ? `L${loyaltyValue}` : `Loyalty: ${loyaltyValue}`}
          </Badge>

          {/* Mood Badge */}
          <Badge variant="secondary" className={`text-xs px-2 py-1 ${moodClass}`}>
            {shouldCompact ? `M${moodValue}` : `Mood: ${moodValue}`}
          </Badge>

          {/* Exec-meetings-revival PR-9: mood-modifier chip (non-neutral only) */}
          {moodBandChip && (
            <Badge variant="secondary" className={`text-xs px-2 py-1 ${moodBandChip.className}`}>
              {moodBandChip.label}
            </Badge>
          )}

          {/* Level Badge */}
          <Badge variant="secondary" className={`text-xs px-2 py-1 ${levelClass}`}>
            {shouldCompact ? `Lvl${levelValue}` : `Level ${levelValue}`}
          </Badge>

          {/* Salary Badge */}
          {weeklySalary !== undefined && (
            <Badge variant="secondary" className={`text-xs px-2 py-1 ${salaryClass}`}>
              {salaryLabel(weeklySalary)}
            </Badge>
          )}
        </div>
      </div>

      {/* Title - Name Badge - Clickable */}
      <Badge
        variant="secondary"
        className={`text-xs px-3 py-1 font-mono uppercase tracking-wide bg-neon-lilac/10 text-neon-lilac border border-neon-lilac/40 rounded-pill ${
          effectiveDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-neon-lilac/20 transition-colors'
        }`}
        onClick={effectiveDisabled ? undefined : onSelect}
      >
        {config.shortTitle} - {config.name}
      </Badge>

      {/* Meeting-relevance Tier 0 (PR-1): sit-out notice — empty eligible pool */}
      {sitOut && (
        <span data-testid={`sit-out-${executive.role}`} className="text-xs text-text-muted max-w-36 text-center">
          Nothing needs their call this week
        </span>
      )}
    </div>
  );

  // A&R Status content
  return avatarColumn;
}