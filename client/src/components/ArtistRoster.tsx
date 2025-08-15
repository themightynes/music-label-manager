import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
import { SAMPLE_ARTISTS } from '@/lib/gameData';
import { useState } from 'react';

export function ArtistRoster() {
  const { artists, signArtist, openDialogue } = useGameStore();
  const [signingArtist, setSigningArtist] = useState(false);

  const handleSignArtist = async () => {
    if (signingArtist || artists.length >= 3) return;

    setSigningArtist(true);
    try {
      // Find an available artist to sign
      const availableArtist = SAMPLE_ARTISTS.find(
        sample => !artists.some(signed => signed.name === sample.name)
      );

      if (availableArtist) {
        await signArtist(availableArtist);
      }
    } catch (error) {
      console.error('Failed to sign artist:', error);
    } finally {
      setSigningArtist(false);
    }
  };

  const handleArtistMeeting = async (artist: any) => {
    await openDialogue('Artist', `meeting_${artist.id}`);
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <i className="fas fa-microphone text-secondary mr-2"></i>
          Artist Roster
        </h3>

        <div className="space-y-4">
          {artists.map(artist => (
            <div key={artist.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-slate-900">{artist.name}</h4>
                  <p className="text-xs text-slate-600">{artist.archetype}</p>
                </div>
                <Badge variant="secondary" className="bg-secondary/10 text-secondary">
                  {artist.isSigned ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Mood</div>
                  <div className="flex items-center space-x-2">
                    <Progress value={artist.mood || 50} className="flex-1 h-2" />
                    <span className="text-xs font-mono">{artist.mood || 50}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Loyalty</div>
                  <div className="flex items-center space-x-2">
                    <Progress value={artist.loyalty || 50} className="flex-1 h-2" />
                    <span className="text-xs font-mono">{artist.loyalty || 50}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                className="w-full text-sm text-primary hover:text-indigo-700 font-medium"
                onClick={() => handleArtistMeeting(artist)}
              >
                Schedule Meeting
              </Button>
            </div>
          ))}

          {/* Empty slots for additional artists */}
          {artists.length < 3 && (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
              <i className="fas fa-plus text-slate-400 text-2xl mb-2"></i>
              <p className="text-sm text-slate-500 mb-2">Sign New Artist</p>
              <Button
                variant="ghost"
                className="text-primary hover:text-indigo-700 text-sm font-medium"
                onClick={handleSignArtist}
                disabled={signingArtist || artists.length >= 3}
              >
                {signingArtist ? 'Signing...' : 'Browse Talent'}
              </Button>
            </div>
          )}

          {/* Fill remaining empty slots */}
          {Array.from({ length: Math.max(0, 3 - artists.length - 1) }).map((_, index) => (
            <div key={`empty-${index}`} className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center opacity-50">
              <i className="fas fa-plus text-slate-400 text-xl mb-2"></i>
              <p className="text-xs text-slate-500">Available Slot</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
