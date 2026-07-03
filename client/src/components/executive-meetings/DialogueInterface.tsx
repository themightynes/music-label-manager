import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';
import { BorderTrail } from '../motion-primitives/border-trail';
import { GlowEffect } from '../motion-primitives/glow-effect';
import { TrendingUp, TrendingDown, Clock, Zap, ArrowLeft } from 'lucide-react';
import type { DialogueChoice } from '../../../../shared/types/gameTypes';

interface DialogueInterfaceProps {
  dialogue: {
    prompt: string;
    choices: DialogueChoice[];
  };
  onSelectChoice: (choice: DialogueChoice) => void;
  onBack: () => void;
  targetScope?: 'global' | 'predetermined' | 'user_selected';
  selectedArtistName?: string;
}

function EffectBadge({
  effect,
  value,
  isDelayed = false,
  targetScope,
  selectedArtistName
}: {
  effect: string;
  value: number;
  isDelayed?: boolean;
  targetScope?: 'global' | 'predetermined' | 'user_selected';
  selectedArtistName?: string;
}) {
  const isPositive = value > 0;
  const Icon = isDelayed ? Clock : (isPositive ? TrendingUp : TrendingDown);
  const colorClass = isPositive
    ? 'text-positive bg-positive/10 border-positive/40'
    : 'text-negative bg-negative/10 border-negative/40';
  const delayedClass = isDelayed ? 'border-neon-lilac/40 bg-neon-lilac/10 text-neon-lilac' : '';

  const formatEffect = (key: string, val: number) => {
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
      className={`text-xs font-mono rounded-pill flex items-center gap-1 ${isDelayed ? delayedClass : colorClass}`}
    >
      <Icon className="h-3 w-3" />
      {formatEffect(effect, value)}
    </Badge>
  );
}

function ChoiceEffects({
  choice,
  targetScope,
  selectedArtistName
}: {
  choice: DialogueChoice;
  targetScope?: 'global' | 'predetermined' | 'user_selected';
  selectedArtistName?: string;
}) {
  const hasImmediate = choice.effects_immediate && Object.keys(choice.effects_immediate).length > 0;
  const hasDelayed = choice.effects_delayed && Object.keys(choice.effects_delayed).length > 0;

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
            {Object.entries(choice.effects_immediate).map(([effect, value]) =>
              value !== undefined ? (
                <EffectBadge
                  key={effect}
                  effect={effect}
                  value={value}
                  targetScope={targetScope}
                  selectedArtistName={selectedArtistName}
                />
              ) : null
            )}
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
            {Object.entries(choice.effects_delayed).map(([effect, value]) =>
              value !== undefined ? (
                <EffectBadge
                  key={effect}
                  effect={effect}
                  value={value}
                  isDelayed={true}
                  targetScope={targetScope}
                  selectedArtistName={selectedArtistName}
                />
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function DialogueInterface({
  dialogue,
  onSelectChoice,
  onBack,
  targetScope,
  selectedArtistName
}: DialogueInterfaceProps) {
  // Replace {artistName} placeholder with actual artist name
  const displayPrompt = selectedArtistName
    ? dialogue.prompt.replace(/{artistName}/g, selectedArtistName)
    : dialogue.prompt;

  return (
    <div className="space-y-6">
      <Card className="glass-panel chromatic-hairline relative overflow-hidden w-full max-w-md mx-auto border-0">
        <GlowEffect
          mode="static"
          colors={['#a05af0', '#4a6bff', '#c8a6ff', '#ff4d8d']}
          blur="medium"
        />
        <CardContent className="p-4 relative z-10">
          <p className="text-base italic leading-relaxed text-text-primary">
            "{displayPrompt}"
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">

        <Carousel
          className="w-full max-w-md mx-auto"
          opts={{
            loop: true,
          }}
        >
          <CarouselContent>
            {dialogue.choices.map((choice) => (
              <CarouselItem key={choice.id}>
                <Card className="glass-panel chromatic-hairline relative border-0 transition-all duration-200 hover:shadow-glow-lilac">
                  <BorderTrail
                    size={180}
                    className="bg-gradient-to-l from-action-pink via-money to-neon-lilac"
                    transition={{
                      repeat: Infinity,
                      duration: 4,
                      ease: "linear"
                    }}
                  />
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="font-medium text-sm leading-relaxed text-text-primary">
                        {choice.label}
                      </div>

                      <ChoiceEffects
                        choice={choice}
                        targetScope={targetScope}
                        selectedArtistName={selectedArtistName}
                      />

                      <Button
                        onClick={() => onSelectChoice(choice)}
                        className="w-full rounded-button bg-gradient-to-br from-action-pink to-action-purple text-white shadow-action hover:opacity-90"
                        size="sm"
                      >
                        Choose This Response
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="bg-neon-lilac/10 hover:bg-neon-lilac/20 border-neon-lilac/40 text-neon-lilac" />
          <CarouselNext className="bg-neon-lilac/10 hover:bg-neon-lilac/20 border-neon-lilac/40 text-neon-lilac" />
        </Carousel>
      </div>
    </div>
  );
}