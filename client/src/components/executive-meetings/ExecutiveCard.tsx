import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
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
}

const roleConfig = {
  ceo: {
    icon: Star,
    color: 'bg-purple-500',
    title: 'Chief Executive Officer',
    avatar: undefined,
  },
  head_ar: {
    icon: Users,
    color: 'bg-blue-500',
    title: 'Head of A&R',
    avatar: '/avatars/marcus_rodriguez_exec@0.5x.png',
  },
  cco: {
    icon: Brain,
    color: 'bg-green-500',
    title: 'Chief Creative Officer',
    avatar: '/avatars/dante_washingtong_exec@0.5x.png',
  },
  cmo: {
    icon: DollarSign,
    color: 'bg-orange-500',
    title: 'Chief Marketing Officer',
    avatar: '/avatars/samara_chen_exec@0.5x.png',
  },
  head_distribution: {
    icon: DollarSign,
    color: 'bg-teal-500',
    title: 'Head of Distribution & Operations',
    avatar: '/avatars/patricia_williams_exec@0.5x.png',
  },
} as const;

export function ExecutiveCard({ executive, disabled = false, onSelect, weeklySalary, arOfficeStatus }: ExecutiveCardProps) {
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

  return (
    <Card className={`transition-all duration-200 hover:shadow-md bg-[#8B6B70]/20 border-[#65557c] ${
      effectiveDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg hover:bg-[#8B6B70]/30'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Avatar/Icon column */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center">
            {/* Avatar/Icon Box */}
            <div className="w-36 h-36 bg-[#8B6B70]/30 border border-[#65557c] rounded-lg overflow-hidden relative">
              {config.avatar ? (
                <img
                  src={config.avatar}
                  alt={`${config.title} avatar`}
                  className="absolute w-full object-cover"
                  style={{
                    height: '244px',
                    top: '-20px',
                    imageRendering: 'auto'
                  }}
                />
              ) : (
                <div className={`w-full h-full bg-[#3c252d]/50 flex items-center justify-center`}>
                  <div className={`p-3 rounded-lg ${config.color} text-white`}>
                    <IconComponent className="h-12 w-12" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Executive information content */}
          <div className="flex-1 min-w-0">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <div className="font-semibold text-white text-base">{executive.role.toUpperCase()}</div>
                <div className="text-sm text-white/70 flex items-center gap-2">
                  {config.title}
                  {isHeadAR && arOfficeStatus?.arOfficeSlotUsed && (
                    <Badge variant="outline" className="text-[10px]">Consumes 1 slot</Badge>
                  )}
                </div>
              </div>

              {/* Meet button in top right */}
              <Button
                onClick={onSelect}
                disabled={effectiveDisabled}
                className="py-1 px-3 text-xs"
                variant={effectiveDisabled ? "secondary" : "default"}
                size="sm"
              >
                {isArBusy ? "A&R Busy" : effectiveDisabled ? "No Slots" : isCEO ? "Strategic" : "Meet"}
              </Button>
            </div>

            {/* Metrics */}
            {!isCEO ? (
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="p-2 bg-[#3c252d]/30 rounded text-center text-xs">
                  <div className={`font-medium ${(executive.loyalty || 50) >= 70 ? 'text-green-600' : (executive.loyalty || 50) >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {executive.loyalty || 50}
                  </div>
                  <div className="text-white/50">Loyalty</div>
                </div>
                <div className="p-2 bg-[#3c252d]/30 rounded text-center text-xs">
                  <div className={`font-medium ${(executive.mood || 50) >= 70 ? 'text-green-600' : (executive.mood || 50) >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {executive.mood || 50}
                  </div>
                  <div className="text-white/50">Mood</div>
                </div>
                <div className="p-2 bg-[#3c252d]/30 rounded text-center text-xs">
                  <div className="font-medium text-white">
                    Lv.{executive.level || 1}
                  </div>
                  <div className="text-white/50">Level</div>
                </div>
              </div>
            ) : (
              <div className="flex justify-start mb-3">
                <Badge variant="secondary" className="text-xs px-3 py-1 bg-purple-500/20 text-purple-200 border-purple-300/30">
                  You
                </Badge>
              </div>
            )}

            {/* Salary */}
            {!isCEO && weeklySalary !== undefined && (
              <div className="text-sm text-white/60">
                Monthly Salary: {weeklySalary === 0 ? 'Equity Only' : `$${weeklySalary.toLocaleString()}`}
              </div>
            )}

            {/* A&R Status for Head of A&R */}
            {isHeadAR && arOfficeStatus?.arOfficeSlotUsed && (
              <div className="mt-2 p-2 bg-[#3c252d]/30 rounded flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-xs">Sourcing Active</Badge>
                  {arOfficeStatus.arOfficeSourcingType && (
                    <span className="text-white/70">{arOfficeStatus.arOfficeSourcingType}</span>
                  )}
                </div>
                <div className="text-xs text-white/60">
                  {arOfficeStatus.arOfficeOperationStart ? `since ${new Date(arOfficeStatus.arOfficeOperationStart).toLocaleTimeString()}` : ''}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}