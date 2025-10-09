import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Check } from 'lucide-react';
import type { GameArtist } from '../../../../shared/types/gameTypes';

interface ArtistSelectorProps {
  artists: GameArtist[];
  selectedArtistId: string | null;
  onSelectArtist: (artistId: string) => void;
  prompt?: string;
}

function getMoodColor(mood: number): string {
  if (mood >= 70) return 'text-green-500';
  if (mood >= 40) return 'text-yellow-500';
  return 'text-red-500';
}

function getEnergyColor(energy: number): string {
  if (energy >= 70) return 'text-green-500';
  if (energy >= 40) return 'text-yellow-500';
  return 'text-red-500';
}

export function ArtistSelector({ artists, selectedArtistId, onSelectArtist, prompt }: ArtistSelectorProps) {
  return (
    <div className="space-y-4">
      {prompt && (
        <p className="text-white/90 text-center font-medium">{prompt}</p>
      )}

      <div className="grid gap-3">
        {artists.map((artist) => {
          const isSelected = artist.id === selectedArtistId;

          return (
            <Card
              key={artist.id}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'bg-brand-burgundy/30 border-brand-rose ring-2 ring-brand-rose'
                  : 'bg-sidebar-accent hover:bg-sidebar-accent/70 border-sidebar-border'
              }`}
              onClick={() => onSelectArtist(artist.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-white font-semibold">{artist.name}</h4>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-brand-rose flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" className="text-xs">
                        {artist.archetype}
                      </Badge>
                      {artist.signed && (
                        <Badge variant="default" className="text-xs bg-brand-gold/20 text-brand-gold border-brand-gold/30">
                          Signed
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-white/60">Mood:</span>
                        <span className={`font-medium ${getMoodColor(artist.mood || 50)}`}>
                          {artist.mood || 50}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/60">Energy:</span>
                        <span className={`font-medium ${getEnergyColor(artist.energy || 75)}`}>
                          {artist.energy || 75}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/60">Popularity:</span>
                        <span className="text-white font-medium">
                          {artist.popularity || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/60">Talent:</span>
                        <span className="text-white font-medium">
                          {artist.talent}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
