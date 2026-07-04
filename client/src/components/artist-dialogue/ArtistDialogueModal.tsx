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
import { isRenderableEffectKey } from '../executive-meetings/DialogueInterface';

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

  // Helper to get mood badge color (v2: hue-tinted chip classes)
  const getMoodColor = (mood: number): string => {
    if (mood >= 70) return 'bg-[rgba(55,224,176,0.14)] border-[rgba(55,224,176,0.4)] text-positive';
    if (mood >= 40) return 'bg-[rgba(245,197,66,0.14)] border-[rgba(245,197,66,0.4)] text-warning';
    return 'bg-[rgba(255,93,138,0.14)] border-[rgba(255,93,138,0.4)] text-negative';
  };

  // Helper to get energy badge color (v2: hue-tinted chip classes)
  const getEnergyColor = (energy: number): string => {
    if (energy >= 70) return 'bg-[rgba(55,214,255,0.14)] border-[rgba(55,214,255,0.4)] text-neon-cyan';
    if (energy >= 40) return 'bg-[rgba(160,90,240,0.14)] border-[rgba(160,90,240,0.4)] text-neon-purple';
    return 'bg-[rgba(233,230,244,0.1)] border-[rgba(233,230,244,0.3)] text-muted-foreground';
  };

  // Helper to get talent badge color (v2: hue-tinted chip classes)
  const getTalentColor = (talent: number): string => {
    if (talent >= 70) return 'bg-[rgba(55,224,176,0.14)] border-[rgba(55,224,176,0.4)] text-positive';
    if (talent >= 40) return 'bg-[rgba(245,197,66,0.14)] border-[rgba(245,197,66,0.4)] text-warning';
    return 'bg-[rgba(255,93,138,0.14)] border-[rgba(255,93,138,0.4)] text-negative';
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#F7F4FB]">
            Conversation with {artist.name}
          </DialogTitle>
          <DialogDescription className="flex gap-2 items-center flex-wrap">
            <Badge variant="outline" className={`rounded-pill font-mono text-[11px] ${getMoodColor(artist.mood)}`}>
              Mood: {artist.mood}
            </Badge>
            <Badge variant="outline" className={`rounded-pill font-mono text-[11px] ${getEnergyColor(artist.energy)}`}>
              Energy: {artist.energy}
            </Badge>
            <Badge variant="outline" className={`rounded-pill font-mono text-[11px] ${getTalentColor(artist.talent)}`}>
              Talent: {artist.talent}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-pill font-mono text-[11px] bg-[rgba(200,166,255,0.14)] border-[rgba(200,166,255,0.4)] text-neon-lilac"
            >
              {artist.archetype}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading State */}
          {state.matches('loading') && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-neon-purple" />
              <p className="text-sm text-muted-foreground">Loading dialogue...</p>
            </div>
          )}

          {/* Displaying State */}
          {state.matches('displaying') && context.selectedDialogue && (
            <div className="space-y-4">
              <div className="p-4 rounded-card bg-[rgba(209,74,122,0.1)] border border-[rgba(209,74,122,0.3)]">
                <p className="text-sm leading-relaxed text-[rgba(233,230,244,0.85)]">{context.selectedDialogue.prompt}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">How do you respond?</p>
                {context.selectedDialogue.choices.map((choice) => (
                  <Button
                    key={choice.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3 px-4 rounded-button border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(160,90,240,0.1)] hover:border-[rgba(160,90,240,0.35)]"
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
              <Loader2 className="w-8 h-8 animate-spin text-neon-purple" />
              <p className="text-sm text-muted-foreground">Processing...</p>
            </div>
          )}

          {/* Complete State */}
          {state.matches('complete') && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle2 className="w-12 h-12 text-positive drop-shadow-[0_0_16px_rgba(55,224,176,0.4)]" />
              <p className="text-lg font-semibold text-[#F7F4FB]">Conversation Complete!</p>

              {context.appliedEffects && Object.keys(context.appliedEffects).length > 0 && (
                <div className="w-full space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Immediate Effects:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(context.appliedEffects)
                      .filter(([key]) => isRenderableEffectKey(key))
                      .map(([key, value]) => (
                      <Badge
                        key={key}
                        variant="secondary"
                        className={`rounded-pill font-mono text-[11px] ${
                          value > 0
                            ? 'bg-[rgba(55,224,176,0.1)] text-positive'
                            : 'bg-[rgba(255,93,138,0.1)] text-negative'
                        }`}
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
                    {Object.entries(context.delayedEffects)
                      .filter(([key]) => isRenderableEffectKey(key))
                      .map(([key, value]) => (
                      <Badge
                        key={key}
                        variant="outline"
                        className={`rounded-pill font-mono text-[11px] ${
                          value > 0
                            ? 'border-[rgba(55,224,176,0.5)] text-positive'
                            : 'border-[rgba(255,93,138,0.5)] text-negative'
                        }`}
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
              <AlertCircle className="w-12 h-12 text-negative drop-shadow-[0_0_16px_rgba(255,93,138,0.4)]" />
              <p className="text-lg font-semibold text-negative">Error</p>
              <p className="text-sm text-muted-foreground text-center">
                {context.error || 'An unexpected error occurred'}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-button text-neon-cyan border-[rgba(55,214,255,0.35)] bg-[rgba(55,214,255,0.06)] hover:bg-[rgba(55,214,255,0.12)]"
                  onClick={handleRetry}
                >
                  Retry
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-button text-[rgba(233,230,244,0.75)] border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.02)]"
                  onClick={handleClose}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!state.matches('complete') && !state.matches('error') && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              className="rounded-button text-[rgba(233,230,244,0.75)] border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.02)]"
              onClick={handleClose}
              disabled={state.matches('submitting')}
            >
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
