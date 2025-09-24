import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { TrendingUp, TrendingDown, Clock, Zap, ArrowLeft } from 'lucide-react';
import type { DialogueChoice } from '../../../../shared/types/gameTypes';

interface DialogueInterfaceProps {
  dialogue: {
    prompt: string;
    choices: DialogueChoice[];
  };
  onSelectChoice: (choice: DialogueChoice) => void;
  onBack: () => void;
}

function EffectBadge({ effect, value, isDelayed = false }: { effect: string; value: number; isDelayed?: boolean }) {
  const isPositive = value > 0;
  const Icon = isDelayed ? Clock : (isPositive ? TrendingUp : TrendingDown);
  const colorClass = isPositive ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200';
  const delayedClass = isDelayed ? 'border-blue-200 bg-blue-50 text-blue-700' : '';

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
      case 'quality_bonus':
        return `${val > 0 ? '+' : ''}${val} Quality`;
      case 'press_story_flag':
        return 'Press Story';
      case 'sellthrough_hint':
        return 'Market Data';
      case 'venue_relationships':
        return `${val > 0 ? '+' : ''}${val} Venue Rep`;
      case 'quality_risk':
        return 'Quality Risk';
      case 'artist_popularity':
        return `${val > 0 ? '+' : ''}${val} Popularity`;
      case 'international_rep':
        return `${val > 0 ? '+' : ''}${val} Intl Rep`;
      default:
        return `${val > 0 ? '+' : ''}${val} ${key.replace(/_/g, ' ')}`;
    }
  };

  return (
    <Badge
      variant="outline"
      className={`text-xs flex items-center gap-1 ${isDelayed ? delayedClass : colorClass}`}
    >
      <Icon className="h-3 w-3" />
      {formatEffect(effect, value)}
    </Badge>
  );
}

function ChoiceEffects({ choice }: { choice: DialogueChoice }) {
  const hasImmediate = Object.keys(choice.effects_immediate).length > 0;
  const hasDelayed = Object.keys(choice.effects_delayed).length > 0;

  if (!hasImmediate && !hasDelayed) {
    return (
      <div className="text-xs text-white/50 italic">
        No direct effects
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {hasImmediate && (
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Zap className="h-3 w-3 text-orange-300" />
            <span className="text-xs font-medium text-white/70">Immediate</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(choice.effects_immediate).map(([effect, value]) =>
              value !== undefined ? (
                <EffectBadge key={effect} effect={effect} value={value} />
              ) : null
            )}
          </div>
        </div>
      )}

      {hasDelayed && (
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Clock className="h-3 w-3 text-blue-300" />
            <span className="text-xs font-medium text-white/70">Next Week</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(choice.effects_delayed).map(([effect, value]) =>
              value !== undefined ? (
                <EffectBadge key={effect} effect={effect} value={value} isDelayed={true} />
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function DialogueInterface({ dialogue, onSelectChoice, onBack }: DialogueInterfaceProps) {
  return (
    <div className="space-y-6">
      <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-primary">
        <p className="text-base italic leading-relaxed">
          "{dialogue.prompt}"
        </p>
      </div>

      <div className="space-y-4">
        <div className="text-sm font-medium text-white/50 uppercase tracking-wide">
          Choose Your Response
        </div>

        <div className="grid gap-3">
          {dialogue.choices.map((choice) => (
            <Card key={choice.id} className="hover:shadow-md transition-all duration-200">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="font-medium text-sm leading-relaxed text-white">
                    {choice.label}
                  </div>

                  <ChoiceEffects choice={choice} />

                  <Button
                    onClick={() => onSelectChoice(choice)}
                    className="w-full"
                    variant="outline"
                  >
                    Choose This Response
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t">
        <Button
          onClick={onBack}
          variant="ghost"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Meetings
        </Button>
      </div>
    </div>
  );
}