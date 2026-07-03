import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';
import { Clock, DollarSign, TrendingUp, TrendingDown, Zap, Globe, Star, User } from 'lucide-react';
import type { RoleMeeting, GameArtist } from '../../../../shared/types/gameTypes';
import { ArtistSelector } from './ArtistSelector';

interface MeetingSelectorProps {
  meetings: RoleMeeting[];
  signedArtists: GameArtist[];
  onSelectMeeting: (meeting: RoleMeeting, selectedArtistId?: string) => void;
  onBack: () => void;
}

function EffectBadge({ effect, value }: { effect: string; value: number }) {
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive
    ? 'text-positive bg-positive/10 border border-positive/40'
    : 'text-negative bg-negative/10 border border-negative/40';

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
    <Badge variant="secondary" className={`text-xs font-mono rounded-pill ${colorClass} flex items-center gap-1`}>
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
    <div className="flex items-center gap-2 text-sm text-text-muted">
      <span>{totalChoices} choices</span>
      {hasImmediateEffects && (
        <Badge variant="outline" className="text-xs font-mono rounded-pill border-neon-lilac/40 bg-neon-lilac/10 text-neon-lilac">
          <Zap className="h-3 w-3 mr-1" />
          Immediate
        </Badge>
      )}
      {hasDelayedEffects && (
        <Badge variant="outline" className="text-xs font-mono rounded-pill border-neon-lilac/40 bg-neon-lilac/10 text-neon-lilac">
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
    <div className="flex items-center gap-1 text-sm text-money font-mono">
      <DollarSign className="h-3 w-3" />
      {minCost === maxCost ? (
        <span>Cost: ${Math.abs(minCost).toLocaleString()}</span>
      ) : (
        <span>Cost: ${Math.abs(maxCost).toLocaleString()} - ${Math.abs(minCost).toLocaleString()}</span>
      )}
    </div>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  const scopeConfig = {
    global: {
      icon: Globe,
      label: 'All Artists',
      color: 'text-neon-cyan bg-neon-cyan/10 border-neon-cyan/40',
    },
    predetermined: {
      icon: Star,
      label: 'Top Artist',
      color: 'text-warning bg-warning/10 border-warning/40',
    },
    user_selected: {
      icon: User,
      label: 'Your Choice',
      color: 'text-neon-purple bg-neon-purple/10 border-neon-purple/40',
    },
  };

  const config = scopeConfig[scope as keyof typeof scopeConfig] || scopeConfig.global;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`text-xs font-mono rounded-pill ${config.color} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export function MeetingSelector({ meetings, signedArtists, onSelectMeeting, onBack }: MeetingSelectorProps) {
  const [selectedMeetingIndex, setSelectedMeetingIndex] = useState<number | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);

  // Filter out user_selected meetings if no artists are signed (FR-12)
  const filteredMeetings = signedArtists.length === 0
    ? meetings.filter(m => m.target_scope !== 'user_selected')
    : meetings;

  if (filteredMeetings.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="text-text-body">
          <p className="text-lg font-medium">No meetings available</p>
          <p className="text-sm mt-1 text-text-muted">This executive doesn't have any available meetings right now.</p>
        </div>
        <Button onClick={onBack} className="mt-4" variant="outline">
          Back to Executives
        </Button>
      </div>
    );
  }

  const handleSelectMeeting = (meeting: RoleMeeting, index: number) => {
    // If user_selected and no artist selected yet, show artist selector
    if (meeting.target_scope === 'user_selected' && signedArtists.length > 0) {
      setSelectedMeetingIndex(index);
      setSelectedArtistId(null);
    } else {
      // For global or predetermined meetings, proceed immediately
      onSelectMeeting(meeting);
    }
  };

  const handleArtistSelected = (artistId: string) => {
    setSelectedArtistId(artistId);
  };

  const handleConfirmMeeting = () => {
    if (selectedMeetingIndex !== null && selectedArtistId) {
      const meeting = meetings[selectedMeetingIndex];
      onSelectMeeting(meeting, selectedArtistId);
    }
  };

  const handleBackFromArtistSelection = () => {
    setSelectedMeetingIndex(null);
    setSelectedArtistId(null);
  };

  // If showing artist selection
  if (selectedMeetingIndex !== null) {
    const meeting = filteredMeetings[selectedMeetingIndex];
    const selectedArtist = signedArtists.find(a => a.id === selectedArtistId);
    const displayPrompt = selectedArtist
      ? meeting.prompt.replace('{artistName}', selectedArtist.name)
      : meeting.prompt;

    return (
      <div className="w-full max-w-md mx-auto space-y-4">
        <Card className="glass-panel chromatic-hairline border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-text-primary">{meeting.name || meeting.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</CardTitle>
              <ScopeBadge scope={meeting.target_scope} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ArtistSelector
              artists={signedArtists}
              selectedArtistId={selectedArtistId}
              onSelectArtist={handleArtistSelected}
              prompt={meeting.prompt_before_selection}
            />

            {selectedArtistId && (
              <div className="p-3 bg-neon-lilac/10 border border-neon-lilac/30 rounded-card">
                <p className="text-sm text-text-body italic">
                  "{displayPrompt}"
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleBackFromArtistSelection}
                variant="outline"
                className="flex-1 rounded-button border border-white/10 bg-white/[0.02] text-text-body hover:bg-white/5"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirmMeeting}
                disabled={!selectedArtistId}
                className="flex-1 rounded-button bg-gradient-to-br from-action-pink to-action-purple text-white shadow-action hover:opacity-90"
              >
                Start Meeting
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default carousel view
  return (
    <Carousel
      className="w-full max-w-md mx-auto"
      opts={{
        loop: true,
      }}
    >
      <CarouselContent>
        {filteredMeetings.map((meeting, index) => (
          <CarouselItem key={meeting.id}>
            <Card className="glass-panel chromatic-hairline border-0 transition-all duration-200 hover:shadow-glow-lilac">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-text-primary">{meeting.name || meeting.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</CardTitle>
                  <ScopeBadge scope={meeting.target_scope} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-text-body italic">
                  "{meeting.target_scope === 'user_selected' && meeting.prompt_before_selection
                    ? meeting.prompt_before_selection
                    : meeting.prompt}"
                </p>
                <Button
                  onClick={() => handleSelectMeeting(meeting, index)}
                  size="sm"
                  className="w-full rounded-button bg-gradient-to-br from-action-pink to-action-purple text-white shadow-action hover:opacity-90"
                >
                  {meeting.target_scope === 'user_selected' ? 'Select Artist' : 'Start Meeting'}
                </Button>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="bg-neon-lilac/10 hover:bg-neon-lilac/20 border-neon-lilac/40 text-neon-lilac" />
      <CarouselNext className="bg-neon-lilac/10 hover:bg-neon-lilac/20 border-neon-lilac/40 text-neon-lilac" />
    </Carousel>
  );
}