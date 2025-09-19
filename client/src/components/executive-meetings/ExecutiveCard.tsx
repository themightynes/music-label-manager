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
  monthlySalary?: number;
}

const roleConfig = {
  ceo: {
    icon: Star,
    color: 'bg-purple-500',
    title: 'Chief Executive Officer',
  },
  head_ar: {
    icon: Users,
    color: 'bg-blue-500',
    title: 'Head of A&R',
  },
  cco: {
    icon: Brain,
    color: 'bg-green-500',
    title: 'Chief Creative Officer',
  },
  cmo: {
    icon: DollarSign,
    color: 'bg-orange-500',
    title: 'Chief Marketing Officer',
  },
  head_distribution: {
    icon: DollarSign,
    color: 'bg-teal-500',
    title: 'Head of Distribution & Operations',
  },
} as const;

export function ExecutiveCard({ executive, disabled = false, onSelect, monthlySalary }: ExecutiveCardProps) {
  const config = roleConfig[executive.role as keyof typeof roleConfig] || {
    icon: Users,
    color: 'bg-gray-500',
    title: executive.role,
  };

  const IconComponent = config.icon;
  const isCEO = executive.role === 'ceo';

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={`p-1.5 rounded-lg ${config.color} text-white`}>
            <IconComponent className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-sm">{executive.role.toUpperCase()}</div>
            <div className="text-xs text-white/60 truncate">
              {config.title}
            </div>
          </div>
        </div>

        {!isCEO && (
          <div className="flex flex-wrap justify-center gap-1 mb-3">
            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-white/10 text-white/80 border-white/20">
              💖 {executive.loyalty}
            </Badge>
            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-white/10 text-white/80 border-white/20">
              😊 {executive.mood}
            </Badge>
            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-white/10 text-white/80 border-white/20">
              Lv.{executive.level}
            </Badge>
          </div>
        )}

        {isCEO && (
          <div className="flex justify-center mb-3">
            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-200 border-purple-300/30">
              You
            </Badge>
          </div>
        )}

        {!isCEO && monthlySalary !== undefined && (
          <div className="text-center mb-3">
            <span className="text-xs text-white/50">
              {monthlySalary === 0 ? 'Equity Only' : `$${monthlySalary.toLocaleString()}/mo`}
            </span>
          </div>
        )}

        <Button
          onClick={onSelect}
          disabled={disabled}
          className="w-full"
          variant={disabled ? "secondary" : "default"}
          size="sm"
        >
          {disabled ? "No Slots" : isCEO ? "Strategic" : "Meet"}
        </Button>
      </CardContent>
    </Card>
  );
}