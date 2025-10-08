import React, { useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { artistDialogueMachine } from '../../machines/artistDialogueMachine';
import { loadAllDialogues, submitArtistDialogueChoice } from '../../services/artistDialogueService';
import type { GameArtist } from '@shared/types/gameTypes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ArtistDialogueModalProps {
  gameId: string;
  artist: GameArtist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

/**
 * Modal component for artist dialogue interactions
 * Uses XState machine for state management and displays randomly selected dialogue
 */
export function ArtistDialogueModal({
  gameId,
  artist,
  open,
  onOpenChange,
  onComplete,
}: ArtistDialogueModalProps) {
  const [state, send] = useMachine(artistDialogueMachine, {
    input: {
      gameId,
      artist,
      loadAllDialogues,
      submitDialogueChoice: submitArtistDialogueChoice,
    },
  });

  const { context } = state;

  // Send OPEN event when modal opens
  useEffect(() => {
    if (open && state.matches('idle')) {
      send({ type: 'OPEN' });
    }
  }, [open, state, send]);

  // Send CLOSE event when modal closes
  useEffect(() => {
    if (!open) {
      send({ type: 'CLOSE' });
    }
  }, [open, send]);

  // Handle completion
  useEffect(() => {
    if (state.matches('complete')) {
      const timer = setTimeout(() => {
        send({ type: 'COMPLETE' });
        onOpenChange(false);
        onComplete?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state, send, onOpenChange, onComplete]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      send({ type: 'CLOSE' });
    }
    onOpenChange(next);
  };

  const handleClose = () => {
    send({ type: 'CLOSE' });
    onOpenChange(false);
  };

  const handleChoiceSelect = (choiceId: string) => {
    const choice = context.selectedDialogue?.choices.find((c) => c.id === choiceId);
    if (choice) {
      send({ type: 'SELECT_CHOICE', choice });
    }
  };

  const handleRetry = () => {
    send({ type: 'RETRY' });
  };

  // Helper to format effect values
  const formatEffect = (key: string, value: number): string => {
    const sign = value > 0 ? '+' : '';
    if (key === 'money') {
      return `${sign}$${value.toLocaleString()}`;
    }
    return `${sign}${value}`;
  };

  // Helper to get effect label
  const getEffectLabel = (key: string): string => {
    const labels: Record<string, string> = {
      money: 'Money',
      reputation: 'Reputation',
      creative_capital: 'Creative Capital',
      artist_mood: 'Mood',
      artist_energy: 'Energy',
      artist_popularity: 'Popularity',
    };
    return labels[key] || key;
  };

  // Helper to get mood badge color
  const getMoodColor = (mood: number): string => {
    if (mood >= 70) return 'bg-green-500';
    if (mood >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Helper to get energy badge color
  const getEnergyColor = (energy: number): string => {
    if (energy >= 70) return 'bg-blue-500';
    if (energy >= 40) return 'bg-cyan-500';
    return 'bg-gray-500';
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-gradient-to-br from-brand-burgundy/5 to-brand-rose/5">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-brand-burgundy">
            Conversation with {artist.name}
          </DialogTitle>
          <DialogDescription className="flex gap-2 items-center">
            <Badge variant="outline" className={getMoodColor(artist.mood)}>
              Mood: {artist.mood}
            </Badge>
            <Badge variant="outline" className={getEnergyColor(artist.energy)}>
              Energy: {artist.energy}
            </Badge>
            <Badge variant="outline">
              {artist.archetype}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading State */}
          {state.matches('loading') && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-burgundy" />
              <p className="text-sm text-muted-foreground">Loading dialogue...</p>
            </div>
          )}

          {/* Displaying State */}
          {state.matches('displaying') && context.selectedDialogue && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-brand-burgundy/10 border border-brand-burgundy/20">
                <p className="text-sm leading-relaxed">{context.selectedDialogue.prompt}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">How do you respond?</p>
                {context.selectedDialogue.choices.map((choice) => (
                  <Button
                    key={choice.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-brand-burgundy/10 hover:border-brand-burgundy/30"
                    onClick={() => handleChoiceSelect(choice.id)}
                  >
                    <span className="text-sm">{choice.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Submitting State */}
          {state.matches('submitting') && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-burgundy" />
              <p className="text-sm text-muted-foreground">Processing...</p>
            </div>
          )}

          {/* Complete State */}
          {state.matches('complete') && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="text-lg font-semibold text-brand-burgundy">Conversation Complete!</p>

              {context.appliedEffects && Object.keys(context.appliedEffects).length > 0 && (
                <div className="w-full space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Immediate Effects:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(context.appliedEffects).map(([key, value]) => (
                      <Badge
                        key={key}
                        variant="secondary"
                        className={value > 0 ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}
                      >
                        {getEffectLabel(key)}: {formatEffect(key, value)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {context.delayedEffects && Object.keys(context.delayedEffects).length > 0 && (
                <div className="w-full space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Delayed Effects (Next Week):</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(context.delayedEffects).map(([key, value]) => (
                      <Badge
                        key={key}
                        variant="outline"
                        className={value > 0 ? 'border-green-500/50 text-green-700' : 'border-red-500/50 text-red-700'}
                      >
                        {getEffectLabel(key)}: {formatEffect(key, value)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {state.matches('error') && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <p className="text-lg font-semibold text-red-600">Error</p>
              <p className="text-sm text-muted-foreground text-center">
                {context.error || 'An unexpected error occurred'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetry}>
                  Retry
                </Button>
                <Button variant="ghost" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!state.matches('complete') && !state.matches('error') && (
          <div className="flex justify-end">
            <Button variant="ghost" onClick={handleClose} disabled={state.matches('submitting')}>
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
