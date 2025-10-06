import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';
import { Clock, DollarSign, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import type { RoleMeeting, ChoiceEffect } from '../../../../shared/types/gameTypes';

interface MeetingSelectorProps {
  meetings: RoleMeeting[];
  onSelectMeeting: (meeting: RoleMeeting) => void;
  onBack: () => void;
}

function EffectBadge({ effect, value }: { effect: string; value: number }) {
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';

  const formatEffect = (key: string, val: number) => {
    switch (key) {
      case 'money':
        return `${val > 0 ? '+' : ''}$${val.toLocaleString()}`;
      case 'reputation':
        return `${val > 0 ? '+' : ''}${val} Rep`;
      case 'creative_capital':
        return `${val > 0 ? '+' : ''}${val} Creative`;
      case 'artist_mood':
        return `${val > 0 ? '+' : ''}${val} Mood`;
      case 'artist_loyalty':
        return `${val > 0 ? '+' : ''}${val} Loyalty`;
      default:
        return `${val > 0 ? '+' : ''}${val} ${key}`;
    }
  };

  return (
    <Badge variant="secondary" className={`text-xs ${colorClass} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {formatEffect(effect, value)}
    </Badge>
  );
}

function ChoicePreview({ choices }: { choices: RoleMeeting['choices'] }) {
  const totalChoices = choices.length;
  const hasImmediateEffects = choices.some(choice =>
    Object.keys(choice.effects_immediate).length > 0
  );
  const hasDelayedEffects = choices.some(choice =>
    Object.keys(choice.effects_delayed).length > 0
  );

  return (
    <div className="flex items-center gap-2 text-sm text-white/50">
      <span>{totalChoices} choices</span>
      {hasImmediateEffects && (
        <Badge variant="outline" className="text-xs border-white/30 text-white/70">
          <Zap className="h-3 w-3 mr-1" />
          Immediate
        </Badge>
      )}
      {hasDelayedEffects && (
        <Badge variant="outline" className="text-xs border-white/30 text-white/70">
          <Clock className="h-3 w-3 mr-1" />
          Delayed
        </Badge>
      )}
    </div>
  );
}

function MeetingCostEstimate({ choices }: { choices: RoleMeeting['choices'] }) {
  const costs = choices
    .map(choice => choice.effects_immediate.money || 0)
    .filter(cost => cost < 0);

  if (costs.length === 0) return null;

  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);

  return (
    <div className="flex items-center gap-1 text-sm text-white/50">
      <DollarSign className="h-3 w-3" />
      {minCost === maxCost ? (
        <span>Cost: ${Math.abs(minCost).toLocaleString()}</span>
      ) : (
        <span>Cost: ${Math.abs(maxCost).toLocaleString()} - ${Math.abs(minCost).toLocaleString()}</span>
      )}
    </div>
  );
}

export function MeetingSelector({ meetings, onSelectMeeting, onBack }: MeetingSelectorProps) {
  if (meetings.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="text-white/70">
          <p className="text-lg font-medium">No meetings available</p>
          <p className="text-sm mt-1 text-white/50">This executive doesn't have any available meetings right now.</p>
        </div>
        <Button onClick={onBack} className="mt-4" variant="outline">
          Back to Executives
        </Button>
      </div>
    );
  }

  return (
    <Carousel
      className="w-full max-w-md mx-auto"
      opts={{
        loop: true,
      }}
    >
      <CarouselContent>
        {meetings.map((meeting) => (
          <CarouselItem key={meeting.id}>
            <Card className="hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{meeting.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-white/70 italic">
                  "{meeting.prompt}"
                </p>
                <Button
                  onClick={() => onSelectMeeting(meeting)}
                  size="sm"
                  className="w-full"
                >
                  Start Meeting
                </Button>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="bg-brand-mauve/80 hover:bg-brand-mauve border-brand-purple-light text-white" />
      <CarouselNext className="bg-brand-mauve/80 hover:bg-brand-mauve border-brand-purple-light text-white" />
    </Carousel>
  );
}