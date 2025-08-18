import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
import { ArtistDiscoveryModal } from './ArtistDiscoveryModal';
import { useState } from 'react';

export function ArtistRoster() {
  const { gameState, artists, signArtist, openDialogue } = useGameStore();
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);


  const handleSignArtist = async (artistData: any) => {
    try {
      await signArtist(artistData);
    } catch (error) {
      console.error('Failed to sign artist:', error);
      throw error; // Re-throw so modal can handle it
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

          {/* Empty state when no artists */}
          {(!artists || artists.length === 0) && (
            <div className="text-center text-slate-500 py-8">
              <i className="fas fa-microphone text-slate-300 text-4xl mb-4"></i>
              <p className="text-lg font-medium text-slate-600 mb-2">No Artists Signed</p>
              <p className="text-sm text-slate-500 mb-6">Start building your roster by discovering new talent</p>
              <Button
                onClick={() => setShowDiscoveryModal(true)}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <i className="fas fa-search mr-2"></i>
                Discover Artists
              </Button>
            </div>
          )}

          {/* Existing artists */}
          {artists && artists.length > 0 && artists.map(artist => (
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

          {/* Browse Talent slot for additional artists (only show if we have artists but room for more) */}
          {artists && artists.length > 0 && artists.length < 3 && (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
              <i className="fas fa-plus text-slate-400 text-2xl mb-2"></i>
              <p className="text-sm text-slate-500 mb-2">Sign New Artist</p>
              <Button
                variant="ghost"
                className="text-primary hover:text-indigo-700 text-sm font-medium"
                onClick={() => setShowDiscoveryModal(true)}
                disabled={artists.length >= 3}
              >
                {artists.length >= 3 ? 'Roster Full' : 'Browse Talent'}
              </Button>
            </div>
          )}

          {/* Fill remaining empty slots (only show if we have artists) */}
          {artists && artists.length > 0 && Array.from({ length: Math.max(0, 2 - artists.length) }).map((_, index) => (
            <div key={`empty-${index}`} className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center opacity-50">
              <i className="fas fa-plus text-slate-400 text-xl mb-2"></i>
              <p className="text-xs text-slate-500">Available Slot</p>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Artist Discovery Modal */}
      {gameState && (
        <ArtistDiscoveryModal
          open={showDiscoveryModal}
          onOpenChange={setShowDiscoveryModal}
          gameState={gameState}
          signedArtists={artists as any[]}
          onSignArtist={handleSignArtist}
        />
      )}
    </Card>
  );
}
