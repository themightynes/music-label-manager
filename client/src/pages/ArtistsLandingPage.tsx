import React, { useState } from 'react';
import { Users, TrendingUp, Star, DollarSign, UserPlus, CalendarDays, Mic, Disc3, Rocket } from 'lucide-react';
import { useLocation } from 'wouter';
import type { Artist } from '@shared/schema';
import type { GameArtist } from '@shared/types/gameTypes';
import GameLayout from '../layouts/GameLayout';
import { ArtistDiscoveryModal } from '../components/ArtistDiscoveryModal';
import { ArtistDialogueModal } from '../components/artist-dialogue/ArtistDialogueModal';
import { ArtistCard as RichArtistCard, getArchetypeInfo, getRelationshipStatus } from '../components/ArtistCard';
import { useGameStore } from '../store/gameStore';
import { useGameState } from '../hooks/useGameState';
import { useProjects } from '../hooks/useProjects';
import { useArtists } from '../hooks/useArtists';
import { usePortfolioROI, useArtistROI } from '../hooks/useAnalytics';
import { generateArtistSlug } from '../utils/artistSlug';
import { Card, CardContent } from '../components/ui/card';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '../components/ui/menubar';

/**
 * Converts an Artist from the database schema to a GameArtist interface
 * Provides safe defaults for mood and energy to avoid undefined labels
 */
const toGameArtist = (artist: Artist): GameArtist => {
  return {
    id: artist.id,
    name: artist.name,
    archetype: artist.archetype as 'Visionary' | 'Workhorse' | 'Trendsetter',
    talent: artist.talent ?? 50,
    workEthic: artist.workEthic ?? 50,
    popularity: artist.popularity ?? 0,
    temperament: artist.temperament ?? 50,
    energy: artist.energy ?? 50,
    mood: artist.mood ?? 50,
    signed: true, // Artists on this page are always signed
    signingCost: artist.signingCost ?? undefined,
    weeklyCost: artist.weeklyCost ?? undefined,
    bio: artist.bio ?? undefined,
    genre: artist.genre ?? undefined,
    age: artist.age ?? undefined,
  };
};

const ArtistsLandingPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false);
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null);
  const [isDialogueModalOpen, setIsDialogueModalOpen] = useState(false);
  const [selectedArtistForDialogue, setSelectedArtistForDialogue] = useState<Artist | null>(null);
  const gameState = useGameState();
  const { signArtist, loadGame } = useGameStore();
  // Phase 3 PR-7/PR-9: projects and artists are cache-owned; read via hooks.
  const { data: projects = [] } = useProjects();
  const { data: artists = [] } = useArtists();
  const { data: portfolioROI, isLoading: portfolioLoading, error: portfolioError } = usePortfolioROI();

  const signedArtists = artists || [];
  const maxArtists = 3; // Based on typical roster limits in the game
  const availableSlots = maxArtists - signedArtists.length;

  const handleViewArtistDetails = (artist: Artist) => {
    const slug = generateArtistSlug(artist.name);
    setLocation(`/artist/${slug}`);
  };

  const handleDiscoverArtists = () => {
    setIsDiscoveryModalOpen(true);
  };

  // Dynamic avatar function based on artist name
  const getAvatarUrl = (artistName: string) => {
    // Convert "Nova Sterling" -> "nova_sterling_full.png"
    const filename = artistName
      .toLowerCase()
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^a-z0-9_]/g, '') // Remove any non-alphanumeric characters except underscores
      + '_full.png';

    return `/avatars/${filename}`;
  };

  // Function to handle image load error and fallback to blank_full.png
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    if (img.src !== '/avatars/blank_full.png') {
      img.src = '/avatars/blank_full.png';
    }
  };

  // Helper function to get artist insights for rich cards
  const getArtistInsights = (artist: Artist) => {
    const mood = artist.mood || 50;
    const energy = (artist as any).energy ?? (artist as any).loyalty ?? 50;
    const popularity = artist.popularity || 0;

    // Get projects for this artist
    const artistProjects = projects?.filter(p => p.artistId === artist.id) || [];
    const releasedProjects = artistProjects.filter(p => p.stage === 'released');

    // Calculate total revenue from projects (keeping for backward compatibility)
    const totalRevenue = releasedProjects.reduce((sum, project) => {
      const metadata = project.metadata as any || {};
      return sum + (metadata.revenue || 0);
    }, 0);

    return {
      projects: artistProjects.length,
      releasedProjects: releasedProjects.length,
      totalRevenue,
      archetype: artist.archetype,
      mood,
      energy,
      loyalty: energy,
      popularity
    };
  };

  // Event handlers for rich artist cards
  const handleArtistMeeting = (artist: Artist) => {
    console.info(`[ArtistsLandingPage] Artist meetings temporarily unavailable for ${artist.name}.`);
  };

  const handleNavigateToArtist = (artist: Artist) => {
    const slug = generateArtistSlug(artist.name);
    setLocation(`/artist/${slug}`);
  };

  // Artist action handlers
  const handleMeetArtist = (artist: Artist) => {
    console.info(`[ArtistsLandingPage] Opening dialogue with ${artist.name}...`);
    setSelectedArtistForDialogue(artist);
    setIsDialogueModalOpen(true);
  };

  const handleDialogueComplete = async () => {
    console.info('[ArtistsLandingPage] Dialogue completed, refreshing game state...');
    if (gameState?.id) {
      try {
        await loadGame(gameState.id);
        console.info('[ArtistsLandingPage] Game state refreshed successfully');
      } catch (error) {
        console.error('[ArtistsLandingPage] Failed to refresh game state:', error);
      }
    }
  };

  const handleDialogueModalChange = (open: boolean) => {
    setIsDialogueModalOpen(open);
    // Clear selected artist when modal closes to prevent stale data
    if (!open) {
      setSelectedArtistForDialogue(null);
    }
  };

  const handlePlanTour = (artist: Artist) => {
    console.info(`[ArtistsLandingPage] Planning tour for ${artist.name}...`);
    // Navigate to dedicated Live Performance page with artist pre-selected
    setLocation(`/live-performance?artistId=${artist.id}`);
  };

  const handleStartRecording = (artist: Artist) => {
    console.info(`[ArtistsLandingPage] Starting recording project for ${artist.name}...`);
    // Navigate to dedicated Recording Session page with artist pre-selected
    setLocation(`/recording-session?artistId=${artist.id}`);
  };

  const handlePlanRelease = (artist: Artist) => {
    console.info(`[ArtistsLandingPage] Planning release for ${artist.name}...`);
    // Navigate to Plan Release page with artist pre-selected
    setLocation(`/plan-release?artistId=${artist.id}`);
  };


  // Calculate success metrics
  const successfulArtists = signedArtists.filter(artist => {
    // Consider an artist successful if they have positive ROI or high popularity/reputation
    return (artist.popularity ?? 0) > 60;
  }).length;
  const successRate = signedArtists.length > 0 ? (successfulArtists / signedArtists.length) * 100 : 0;

  return (
    <GameLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-end flex-wrap gap-4">
            <div>
              <div className="text-label text-[10px] uppercase tracking-[0.24em] text-neon-lilac/60 mb-1 flex items-center gap-2">
                <Users className="w-3 h-3" />
                Roster
              </div>
              <h1 className="font-display text-2xl md:text-[28px] text-text-primary text-aberration">Artists</h1>
              <div className="shimmer-bar w-40 mt-2" />
              <p className="text-text-body mt-3">Manage your roster and discover new talent</p>
            </div>
            {availableSlots > 0 && (
              <button
                onClick={handleDiscoverArtists}
                className="rounded-button px-6 py-3 font-medium text-white flex items-center gap-2 bg-gradient-to-br from-action-pink to-action-purple shadow-action border-t border-white/25 hover:brightness-110 transition-all"
              >
                <UserPlus className="w-5 h-5" />
                Scouted Artists
              </button>
            )}
          </div>

        {/* Analytics Overview */}
        <Card>
          <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="relative border border-white/[0.08] rounded-card p-6 bg-surface-inner/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm font-medium">Total Artists</p>
                <p className="text-2xl font-bold font-mono text-text-primary">{signedArtists.length}</p>
                <p className="text-sm text-text-muted">{availableSlots} slots available</p>
              </div>
              <Users className="w-8 h-8 text-text-muted" />
            </div>
          </div>

          <div className="relative border border-white/[0.08] rounded-card p-6 bg-surface-inner/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm font-medium">Portfolio Revenue</p>
                {portfolioLoading ? (
                  <p className="text-2xl font-bold text-text-primary">Loading...</p>
                ) : portfolioError ? (
                  <p className="text-2xl font-bold text-negative">Error</p>
                ) : (
                  <p className="text-2xl font-bold font-mono text-money">
                    ${portfolioROI?.totalRevenue?.toLocaleString() || '0'}
                  </p>
                )}
                <p className="text-sm text-text-muted">All-time earnings</p>
              </div>
              <DollarSign className="w-8 h-8 text-positive" />
            </div>
          </div>

          <div className="relative border border-white/[0.08] rounded-card p-6 bg-surface-inner/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm font-medium">Average ROI</p>
                {portfolioLoading ? (
                  <p className="text-2xl font-bold text-text-primary">Loading...</p>
                ) : portfolioError ? (
                  <p className="text-2xl font-bold text-negative">Error</p>
                ) : (
                  <p className="text-2xl font-bold font-mono text-text-primary">
                    {portfolioROI?.averageROI ? `${portfolioROI.averageROI.toFixed(1)}%` : '0%'}
                  </p>
                )}
                <p className="text-sm text-text-muted">Return on investment</p>
              </div>
              <TrendingUp className="w-8 h-8 text-neon-cyan" />
            </div>
          </div>

          <div className="relative border border-white/[0.08] rounded-card p-6 bg-surface-inner/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm font-medium">Success Rate</p>
                <p className="text-2xl font-bold font-mono text-text-primary">{successRate.toFixed(0)}%</p>
                <p className="text-sm text-text-muted">{successfulArtists} of {signedArtists.length} artists</p>
              </div>
              <Star className="w-8 h-8 text-neon-yellow" />
            </div>
          </div>
          </div>
          </CardContent>
        </Card>

        {/* Signed Artists Grid */}
        <Card>
          <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-primary">Signed Artists</h2>
            <p className="text-text-muted">{signedArtists.length} of {maxArtists} artists signed</p>
          </div>

          {signedArtists.length === 0 ? (
            <div className="border border-dashed border-white/[0.12] rounded-card p-12 text-center">
              <div className="w-[52px] h-[52px] rounded-chip bg-neon-cyan/[0.12] border border-neon-cyan/32 flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-neon-cyan" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">No Artists Signed</h3>
              <p className="text-text-muted mb-6">Start building your roster by scouting talent</p>
              <button
                onClick={handleDiscoverArtists}
                className="rounded-button px-6 py-3 font-medium text-white transition-all bg-gradient-to-br from-action-pink to-action-purple shadow-action border-t border-white/25 hover:brightness-110"
              >
                Scouted Artists
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {signedArtists.map((artist) => {
                const insights = getArtistInsights(artist);
                const relationship = getRelationshipStatus(artist.mood || 50, (artist as any).energy ?? (artist as any).loyalty ?? 50);
                const archetype = getArchetypeInfo(artist.archetype);
                const isExpanded = expandedArtist === artist.id;

                return (
                  <Card key={artist.id} className="p-4">
                    <div className="flex items-center space-x-4">
                      {/* Avatar and Meet button column */}
                      <div className="flex-shrink-0 flex flex-col items-center justify-center space-y-2">
                        {/* Avatar Box */}
                        <div
                          className="w-24 h-32 bg-surface-inner border border-white/[0.08] rounded-chip overflow-hidden relative cursor-pointer hover:border-white/[0.16] transition-colors"
                          onClick={() => handleNavigateToArtist(artist)}
                        >
                          <img
                            src={getAvatarUrl(artist.name)}
                            alt={`${artist.name} avatar`}
                            className="absolute w-full object-cover"
                            style={{
                              height: '450px',
                              top: '-14px',
                              objectPosition: 'center top'
                            }}
                            onError={handleImageError}
                          />
                        </div>

                        {/* Artist Actions Menubar */}
                        <Menubar className="w-24 h-8 p-0 rounded-chip border-none bg-gradient-to-br from-action-pink to-action-purple shadow-action">
                          <MenubarMenu>
                            <MenubarTrigger className="w-full h-full text-xs text-white px-2 py-1 hover:brightness-110 data-[state=open]:brightness-110 data-[state=open]:text-white justify-center rounded-chip">
                              Actions
                            </MenubarTrigger>
                            <MenubarContent className="glass-panel chromatic-hairline text-text-primary border-white/[0.08]">
                              <MenubarItem
                                className="text-text-body hover:bg-white/[0.06] hover:text-text-primary cursor-pointer focus:bg-white/[0.06] focus:text-text-primary"
                                onClick={() => handleMeetArtist(artist)}
                              >
                                <CalendarDays className="w-4 h-4 mr-2 text-text-body" />
                                Meet
                              </MenubarItem>
                              <MenubarItem
                                className="text-text-body hover:bg-white/[0.06] hover:text-text-primary cursor-pointer focus:bg-white/[0.06] focus:text-text-primary"
                                onClick={() => handlePlanTour(artist)}
                              >
                                <Mic className="w-4 h-4 mr-2 text-text-body" />
                                Tour
                              </MenubarItem>
                              <MenubarItem
                                className="text-text-body hover:bg-white/[0.06] hover:text-text-primary cursor-pointer focus:bg-white/[0.06] focus:text-text-primary"
                                onClick={() => handleStartRecording(artist)}
                              >
                                <Disc3 className="w-4 h-4 mr-2 text-text-body" />
                                Record
                              </MenubarItem>
                              <MenubarItem
                                className="text-text-body hover:bg-white/[0.06] hover:text-text-primary cursor-pointer focus:bg-white/[0.06] focus:text-text-primary"
                                onClick={() => handlePlanRelease(artist)}
                              >
                                <Rocket className="w-4 h-4 mr-2 text-text-body" />
                                Release
                              </MenubarItem>
                            </MenubarContent>
                          </MenubarMenu>
                        </Menubar>
                      </div>

                      {/* Artist Card content pushed to the right */}
                      <div className="flex-1 min-w-0">
                        <RichArtistCard
                          artist={artist}
                          insights={insights}
                          relationship={relationship}
                          archetype={archetype}
                          isExpanded={isExpanded}
                          onToggleExpand={() => setExpandedArtist(isExpanded ? null : artist.id)}
                          onMeet={() => handleArtistMeeting(artist)}
                          onNavigate={() => handleNavigateToArtist(artist)}
                          gameState={gameState}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          </CardContent>
        </Card>

        {/* Artist Discovery Modal */}
        {isDiscoveryModalOpen && gameState && (
          <ArtistDiscoveryModal
            open={isDiscoveryModalOpen}
            onOpenChange={setIsDiscoveryModalOpen}
            gameState={gameState}
            signedArtists={artists}
            onSignArtist={signArtist}
          />
        )}

        {/* Artist Dialogue Modal */}
        {isDialogueModalOpen && selectedArtistForDialogue && gameState?.id && (
          <ArtistDialogueModal
            gameId={gameState.id}
            artist={toGameArtist(selectedArtistForDialogue)}
            open={isDialogueModalOpen}
            onOpenChange={handleDialogueModalChange}
            onComplete={handleDialogueComplete}
          />
        )}
        </div>
      </main>
    </GameLayout>
  );
};


export default ArtistsLandingPage;