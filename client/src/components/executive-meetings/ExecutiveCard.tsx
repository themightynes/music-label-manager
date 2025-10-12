import React from 'react';
import { Badge } from '../ui/badge';
import { Users, Brain, DollarSign, Star, Truck } from 'lucide-react';
import type { Executive } from '../../../../shared/types/gameTypes';

interface ExecutiveCardProps {
  executive: Executive;
  disabled?: boolean;
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

export function ExecutiveCard({ executive, disabled = false, onSelect, weeklySalary, arOfficeStatus, flipAvatar = false, badgesOnLeft = false, alignContent = 'center', isSelected = false, compactBadges = false }: ExecutiveCardProps) {
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
  const effectiveDisabled = disabled || isArBusy;
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
  const neutralBadgeClass = 'bg-brand-mauve/60 text-white border-brand-purple-light';

  const loyaltyClass = shouldCompact
    ? neutralBadgeClass
    : loyaltyValue >= 70
      ? 'bg-green-500/90 text-green-400 border-green-400/30'
      : loyaltyValue >= 40
        ? 'bg-yellow-500/90 text-yellow-400 border-yellow-400/30'
        : 'bg-red-500/90 text-red-400 border-red-400/30';

  const moodClass = shouldCompact
    ? neutralBadgeClass
    : moodValue >= 70
      ? 'bg-green-500/90 text-green-400 border-green-400/30'
      : moodValue >= 40
        ? 'bg-yellow-500/90 text-yellow-400 border-yellow-400/30'
        : 'bg-red-500/90 text-red-400 border-red-400/30';

  const levelClass = shouldCompact ? neutralBadgeClass : 'bg-blue-500/90 text-blue-300 border-blue-300/30';
  const salaryClass = shouldCompact ? neutralBadgeClass : 'bg-purple-500/90 text-purple-200 border-purple-300/30';

  // CEO only shows badge, no avatar
  if (isCEO) {
    return (
      <Badge
        variant="secondary"
        className={`text-xs px-3 py-1 bg-brand-mauve/60 text-white border-brand-purple-light ${
          effectiveDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-brand-mauve/80 transition-colors'
        }`}
        onClick={effectiveDisabled ? undefined : onSelect}
      >
        {config.shortTitle} - {config.name}
      </Badge>
    );
  }

  // Avatar column content
  const avatarColumn = (
    <div className={`flex-shrink-0 flex flex-col ${alignmentClass} justify-center gap-2`}>
      <div className="relative">
        {/* Avatar/Icon Box */}
        <div className="w-36 h-36 bg-brand-mauve/30 border border-brand-purple-light rounded-lg overflow-hidden relative">
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
            <div className={`w-full h-full bg-brand-dark-card/50 flex items-center justify-center`}>
              <div className={`p-3 rounded-lg ${config.color} text-white`}>
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
        className={`text-xs px-3 py-1 bg-brand-mauve/60 text-white border-brand-purple-light ${
          effectiveDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-brand-mauve/80 transition-colors'
        }`}
        onClick={effectiveDisabled ? undefined : onSelect}
      >
        {config.shortTitle} - {config.name}
      </Badge>
    </div>
  );

  // A&R Status content
  return avatarColumn;
}