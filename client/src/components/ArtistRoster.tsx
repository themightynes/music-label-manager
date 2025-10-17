import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '@/components/ui/menubar';
import { useGameStore } from '@/store/gameStore';
import { ArtistDiscoveryModal } from './ArtistDiscoveryModal';
import { ArtistDashboardCard } from './ArtistDashboardCard';
import { ArtistDialogueModal } from './artist-dialogue/ArtistDialogueModal';
import { SyntheticEvent, useMemo, useState } from 'react';
import { CalendarDays, Disc3, Mic, Rocket } from 'lucide-react';
import { useLocation } from 'wouter';
import { generateArtistSlug } from '@/utils/artistSlug';
import type { GameArtist } from '@shared/types/gameTypes';
import type { Artist as DbArtist } from '@shared/schema';
import { toast } from '@/hooks/use-toast';
import logger from '@/lib/logger';

const toGameArtist = (artist: DbArtist | (DbArtist & { loyalty?: number | null })): GameArtist => {
  const source = artist as Record<string, any>;

  return {
    id: artist.id,
    name: artist.name,
    archetype: (artist.archetype as GameArtist['archetype']) ?? 'Workhorse',
    talent: artist.talent ?? 50,
    workEthic: artist.workEthic ?? 50,
    popularity: artist.popularity ?? 0,
    temperament: source.temperament ?? 50,
    energy: artist.energy ?? source.loyalty ?? 50,
    mood: artist.mood ?? 50,
    signed: true,
    signingCost: source.signingCost ?? undefined,
    weeklyCost: source.weeklyCost ?? source.weeklyCost ?? undefined,
    bio: source.bio ?? undefined,
    genre: artist.genre ?? undefined,
    age: source.age ?? undefined,
  };
};

export function ArtistRoster() {
  const { gameState, artists, signArtist, projects, loadGame } = useGameStore();
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [isDialogueModalOpen, setIsDialogueModalOpen] = useState(false);
  const [selectedArtistForDialogue, setSelectedArtistForDialogue] = useState<DbArtist | null>(null);
  const [, setLocation] = useLocation();

  const sortedArtists = useMemo(() => {
    if (!artists || artists.length === 0) {
      return [] as DbArtist[];
    }

    return [...artists].sort((a, b) => {
      const weekA = a.signedWeek ?? Number.MAX_SAFE_INTEGER;
      const weekB = b.signedWeek ?? Number.MAX_SAFE_INTEGER;

      if (weekA !== weekB) {
        return weekA - weekB;
      }

      return a.name.localeCompare(b.name);
    });
  }, [artists]);

  const getAvatarUrl = (artistName: string) => {
    const filename = artistName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '') + '_full.png';

    return `/avatars/${filename}`;
  };

  const handleImageError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    const img = event.currentTarget;
    if (!img.src.endsWith('/avatars/blank_full.png')) {
      img.src = '/avatars/blank_full.png';
    }
  };

  const handleSignArtist = async (artistData: any) => {
    try {
      await signArtist(artistData);
      toast({
        title: "Artist signed successfully",
        description: `${artistData.name} has been added to your roster.`,
        duration: 3000,
      });
    } catch (error) {
      logger.error('Failed to sign artist:', error);
      toast({
        title: "Failed to sign artist",
        description: error instanceof Error ? error.message : "An error occurred while signing the artist. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
      throw error; // Re-throw so modal can handle it
    }
  };

  const handleArtistMeeting = (artist: any) => {
    if (!artist) {
      return;
    }
    setSelectedArtistForDialogue(artist);
    setIsDialogueModalOpen(true);
  };

  const handleDialogueModalChange = (open: boolean) => {
    setIsDialogueModalOpen(open);
    if (!open) {
      setSelectedArtistForDialogue(null);
    }
  };

  const handleDialogueComplete = async () => {
    if (!gameState?.id || typeof loadGame !== 'function') {
      return;
    }

    try {
      await loadGame(gameState.id);
    } catch (error) {
      logger.error('[ArtistRoster] Failed to refresh game state after dialogue', error);
      toast({
        title: "Failed to refresh game state",
        description: error instanceof Error ? error.message : "An error occurred while refreshing the game. Please reload the page.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleNavigateToArtist = (artist: any) => {
    const slug = generateArtistSlug(artist.name);
    setLocation(`/artist/${slug}`);
  };

  const handlePlanTour = (artistId: string) => {
    setLocation(`/live-performance?artistId=${artistId}`);
  };

  const handleStartRecording = (artistId: string) => {
    setLocation(`/recording-session?artistId=${artistId}`);
  };

  const handlePlanRelease = (artistId: string) => {
    setLocation(`/plan-release?artistId=${artistId}`);
  };

  // Enhanced artist analytics (ROI moved to backend)
  const currentWeek = gameState?.currentWeek || 1;

  const getArtistStatus = (artistId: string) => {
    if (!projects || !Array.isArray(projects)) return 'IDLE';

    const artistProjects = projects.filter((project: any) =>
      project.artistId === artistId &&
      project.stage === 'production' &&
      project.startWeek &&
      currentWeek >= project.startWeek
    );

    const activeTour = artistProjects.find((project: any) => project.type === 'Mini-Tour');
    if (activeTour) return 'ON TOUR';

    const activeRecording = artistProjects.find((project: any) =>
      project.type === 'Single' || project.type === 'EP'
    );
    if (activeRecording) return 'RECORDING';

    return 'IDLE';
  };

  const getArtistInsights = (artist: any) => {
    const archetype = artist.archetype;
    const mood = artist.mood || 50;
    const energy = (artist as any).energy ?? (artist as any).loyalty ?? 50;
    const popularity = artist.popularity || 0;
    
    // Artist projects
    const artistProjects = (projects || []).filter((p: any) => p.artistId === artist.id);
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
      mood,
      energy,
      popularity
    };
  };


  return (
    <Card className="shadow-sm h-full">
      <CardContent className="p-4 flex flex-col h-full">
        <h3 className="text-base font-semibold text-white mb-3 flex items-center justify-between">
          <div className="flex items-center">
            <i className="fas fa-microphone text-secondary mr-2"></i>
            Artist Roster
          </div>
          <Badge variant="secondary" className="text-xs">
            {sortedArtists.length}/3
          </Badge>
        </h3>

        <div className="flex-1">

          {/* Empty state when no artists */}
          {sortedArtists.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center text-white/50">
              <i className="fas fa-microphone text-white/30 text-3xl mb-3"></i>
              <p className="text-sm font-medium text-white/70 mb-2">No Artists Signed</p>
              <p className="text-xs text-white/50 mb-4">Scout talent to build your roster</p>
              <Button
                onClick={() => setShowDiscoveryModal(true)}
                size="sm"
                className="bg-brand-burgundy-dark text-white hover:bg-brand-burgundy transition-colors"
              >
                <i className="fas fa-search mr-1"></i>
                Scouted Artists
              </Button>
            </div>
          )}

          {/* Enhanced Artist Cards */}
          {sortedArtists.length > 0 && (
            <>
              <div className="flex flex-wrap justify-center gap-4">
                {sortedArtists.map(artist => {
                  const insights = getArtistInsights(artist);
                  const status = getArtistStatus(artist.id);

                  return (
                    <div
                      key={artist.id}
                      className="flex w-max items-start gap-4 rounded-lg border border-brand-purple-light bg-brand-dark-card/40 p-3"
                    >
                      <div className="flex w-24 flex-shrink-0 flex-col items-center justify-center space-y-2">
                        <div
                          className="relative h-32 w-24 cursor-pointer overflow-hidden rounded-lg border border-brand-purple-light bg-brand-mauve"
                          onClick={() => handleNavigateToArtist(artist)}
                        >
                          <img
                            src={getAvatarUrl(artist.name)}
                            alt={`${artist.name} avatar`}
                            className="absolute h-[450px] w-full object-cover"
                            style={{ top: '-14px', objectPosition: 'center top' }}
                            onError={handleImageError}
                          />
                        </div>

                        <Menubar className="h-8 w-full rounded-lg border-brand-purple-light bg-brand-burgundy p-0">
                          <MenubarMenu>
                            <MenubarTrigger className="h-full w-full justify-center rounded-lg px-2 py-1 text-xs text-white hover:bg-brand-burgundy-light data-[state=open]:bg-brand-burgundy-light data-[state=open]:text-white">
                              Actions
                            </MenubarTrigger>
                            <MenubarContent className="border-brand-purple bg-brand-dark-card text-white">
                              <MenubarItem
                                className="text-gray-300 hover:bg-brand-burgundy hover:text-white focus:bg-brand-burgundy focus:text-white"
                                onClick={() => handleArtistMeeting(artist)}
                              >
                                <CalendarDays className="mr-2 h-4 w-4 text-gray-300" />
                                Meet
                              </MenubarItem>
                              <MenubarItem
                                className="text-gray-300 hover:bg-brand-burgundy hover:text-white focus:bg-brand-burgundy focus:text-white"
                                onClick={() => handlePlanTour(artist.id)}
                              >
                                <Mic className="mr-2 h-4 w-4 text-gray-300" />
                                Tour
                              </MenubarItem>
                              <MenubarItem
                                className="text-gray-300 hover:bg-brand-burgundy hover:text-white focus:bg-brand-burgundy focus:text-white"
                                onClick={() => handleStartRecording(artist.id)}
                              >
                                <Disc3 className="mr-2 h-4 w-4 text-gray-300" />
                                Record
                              </MenubarItem>
                              <MenubarItem
                                className="text-gray-300 hover:bg-brand-burgundy hover:text-white focus:bg-brand-burgundy focus:text-white"
                                onClick={() => handlePlanRelease(artist.id)}
                              >
                                <Rocket className="mr-2 h-4 w-4 text-gray-300" />
                                Release
                              </MenubarItem>
                            </MenubarContent>
                          </MenubarMenu>
                        </Menubar>
                      </div>

                      <div className="flex-none">
                        <ArtistDashboardCard
                          artist={artist}
                          status={status}
                          mood={insights.mood}
                          energy={insights.energy}
                          popularity={insights.popularity}
                          onNavigate={() => handleNavigateToArtist(artist)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Discover More Artists Button - shown when roster is not full */}
              {sortedArtists.length < 3 && (
                <div className="mt-3 text-center">
                  <Button
                    onClick={() => setShowDiscoveryModal(true)}
                    size="sm"
                    className="bg-brand-burgundy-dark text-white hover:bg-brand-burgundy transition-colors"
                  >
                    <i className="fas fa-plus mr-1"></i>
                    Scouted Artists ({3 - artists.length} slots available)
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

      {isDialogueModalOpen && selectedArtistForDialogue && gameState?.id && (
        <ArtistDialogueModal
          artist={toGameArtist(selectedArtistForDialogue)}
          gameId={gameState.id}
          open={isDialogueModalOpen}
          onOpenChange={handleDialogueModalChange}
          onComplete={handleDialogueComplete}
        />
      )}
    </Card>
  );
}
