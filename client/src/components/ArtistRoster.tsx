import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
import { ArtistDiscoveryModal } from './ArtistDiscoveryModal';
import { ArtistCard, getArchetypeInfo, getRelationshipStatus } from './ArtistCard';
import { useState } from 'react';
import { TrendingUp, TrendingDown, Heart, Star, Info, DollarSign, ExternalLink } from 'lucide-react';
import { SongCatalog } from './SongCatalog';
import { useLocation } from 'wouter';
import { useArtistROI } from '@/hooks/useAnalytics';

export function ArtistRoster() {
  const { gameState, artists, signArtist, openDialogue, projects } = useGameStore();
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null);
  const [, setLocation] = useLocation();

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

  // Enhanced artist analytics (ROI moved to backend)
  const getArtistInsights = (artist: any) => {
    const archetype = artist.archetype;
    const mood = artist.mood || 50;
    const loyalty = artist.loyalty || 50;
    const popularity = artist.popularity || 0;
    
    // Artist projects
    const artistProjects = projects.filter(p => p.artistId === artist.id);
    const releasedProjects = artistProjects.filter(p => p.stage === 'released');
    
    // Total revenue now comes from backend, keeping this for backward compatibility
    const totalRevenue = releasedProjects.reduce((sum, project) => {
      const metadata = project.metadata as any || {};
      return sum + (metadata.revenue || 0);
    }, 0);

    return {
      projects: artistProjects.length,
      releasedProjects: releasedProjects.length,
      totalRevenue,
      archetype,
      mood,
      loyalty,
      popularity
    };
  };


  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <h3 className="text-base font-semibold text-white mb-3 flex items-center justify-between">
          <div className="flex items-center">
            <i className="fas fa-microphone text-secondary mr-2"></i>
            Artist Roster
          </div>
          <Badge variant="secondary" className="text-xs">
            {artists?.length || 0}/3
          </Badge>
        </h3>

        <div className="space-y-3">

          {/* Empty state when no artists */}
          {(!artists || artists.length === 0) && (
            <div className="text-center text-white/50 py-6">
              <i className="fas fa-microphone text-white/30 text-3xl mb-3"></i>
              <p className="text-sm font-medium text-white/70 mb-2">No Artists Signed</p>
              <p className="text-xs text-white/50 mb-4">Discover talent to build your roster</p>
              <Button
                onClick={() => setShowDiscoveryModal(true)}
                size="sm"
                className="bg-[#791014] text-white hover:bg-[#A75A5B] transition-colors"
              >
                <i className="fas fa-search mr-1"></i>
                Discover Artists
              </Button>
            </div>
          )}

          {/* Enhanced Artist Cards */}
          {artists && artists.length > 0 && (
            <>
              {artists.map(artist => {
                const insights = getArtistInsights(artist);
                const archetype = getArchetypeInfo(artist.archetype);
                const relationship = getRelationshipStatus(artist.mood || 50, artist.loyalty || 50);
                const isExpanded = expandedArtist === artist.id;

                return (
                  <ArtistCard
                    key={artist.id}
                    artist={artist}
                    insights={insights}
                    relationship={relationship}
                    archetype={archetype}
                    isExpanded={isExpanded}
                    onToggleExpand={() => setExpandedArtist(isExpanded ? null : artist.id)}
                    onMeet={() => handleArtistMeeting(artist)}
                    onNavigate={() => setLocation(`/artist/${artist.id}`)}
                    gameState={gameState}
                  />
                );
              })}
              
              {/* Discover More Artists Button - shown when roster is not full */}
              {artists.length < 3 && (
                <div className="mt-3 text-center">
                  <Button
                    onClick={() => setShowDiscoveryModal(true)}
                    size="sm"
                    className="bg-[#791014] text-white hover:bg-[#A75A5B] transition-colors"
                  >
                    <i className="fas fa-plus mr-1"></i>
                    Discover More Artists ({3 - artists.length} slots available)
                  </Button>
                </div>
              )}
            </>
          )}
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
