import React, { useState } from 'react';
import { Users, TrendingUp, Star, DollarSign, Music, Eye, UserPlus, CalendarDays, Mic, Disc3, Rocket } from 'lucide-react';
import { useLocation } from 'wouter';
import type { Artist } from '@shared/schema';
import GameLayout from '../layouts/GameLayout';
import { ArtistDiscoveryModal } from '../components/ArtistDiscoveryModal';
import { ArtistCard as RichArtistCard, getArchetypeInfo, getRelationshipStatus } from '../components/ArtistCard';
import { useGameStore } from '../store/gameStore';
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

const ArtistsLandingPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false);
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null);
  const { gameState, artists, signArtist, projects } = useGameStore();
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
    console.info(`[ArtistsLandingPage] Arranging meeting with ${artist.name}...`);
    // TODO: Implement meeting functionality - could navigate to /executives or open meeting modal
    setLocation('/executives');
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
        <div className="mb-6 mt-12">
          <div className="flex items-center mb-4">
            <img
              src="/avatars/artists.png"
              alt="Artists"
              className="w-auto mr-4"
              style={{ width: '459px', height: '135px' }}
            />
          </div>
        </div>

        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-300">Manage your roster and discover new talent</p>
            </div>
            {availableSlots > 0 && (
              <button
                onClick={handleDiscoverArtists}
                className="bg-brand-burgundy hover:bg-brand-burgundy-light text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
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
          <div className="bg-brand-dark-card/[0.66] border border-brand-purple-light rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm font-medium">Total Artists</p>
                <p className="text-2xl font-bold text-white">{signedArtists.length}</p>
                <p className="text-sm text-gray-400">{availableSlots} slots available</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-brand-dark-card/[0.66] border border-brand-purple-light rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm font-medium">Portfolio Revenue</p>
                {portfolioLoading ? (
                  <p className="text-2xl font-bold text-white">Loading...</p>
                ) : portfolioError ? (
                  <p className="text-2xl font-bold text-red-400">Error</p>
                ) : (
                  <p className="text-2xl font-bold text-white">
                    ${portfolioROI?.totalRevenue?.toLocaleString() || '0'}
                  </p>
                )}
                <p className="text-sm text-gray-400">All-time earnings</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-brand-dark-card/[0.66] border border-brand-purple-light rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm font-medium">Average ROI</p>
                {portfolioLoading ? (
                  <p className="text-2xl font-bold text-white">Loading...</p>
                ) : portfolioError ? (
                  <p className="text-2xl font-bold text-red-400">Error</p>
                ) : (
                  <p className="text-2xl font-bold text-white">
                    {portfolioROI?.averageROI ? `${portfolioROI.averageROI.toFixed(1)}%` : '0%'}
                  </p>
                )}
                <p className="text-sm text-gray-400">Return on investment</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-brand-dark-card/[0.66] border border-brand-purple-light rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm font-medium">Success Rate</p>
                <p className="text-2xl font-bold text-white">{successRate.toFixed(0)}%</p>
                <p className="text-sm text-gray-400">{successfulArtists} of {signedArtists.length} artists</p>
              </div>
              <Star className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          </div>
          </CardContent>
        </Card>

        {/* Signed Artists Grid */}
        <Card>
          <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Signed Artists</h2>
            <p className="text-gray-400">{signedArtists.length} of {maxArtists} artists signed</p>
          </div>

          {signedArtists.length === 0 ? (
            <div className="bg-brand-dark-card/[0.66] border border-brand-purple-light rounded-lg p-12 text-center">
              <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Artists Signed</h3>
              <p className="text-gray-400 mb-6">Start building your roster by scouting talent</p>
              <button
                onClick={handleDiscoverArtists}
                className="bg-brand-burgundy hover:bg-brand-burgundy-light text-white px-6 py-3 rounded-lg font-medium transition-colors"
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
                          className="w-24 h-32 bg-brand-mauve border border-brand-purple-light rounded-lg overflow-hidden relative cursor-pointer hover:bg-brand-mauve-light transition-colors"
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
                        <Menubar className="w-24 h-8 p-0 bg-brand-burgundy border-brand-purple-light rounded-lg">
                          <MenubarMenu>
                            <MenubarTrigger className="w-full h-full text-xs text-white px-2 py-1 hover:bg-brand-burgundy-light data-[state=open]:bg-brand-burgundy-light data-[state=open]:text-white justify-center rounded-lg">
                              Actions
                            </MenubarTrigger>
                            <MenubarContent className="bg-brand-dark-card border-brand-purple text-white">
                              <MenubarItem
                                className="text-gray-300 hover:bg-brand-burgundy hover:text-white cursor-pointer focus:bg-brand-burgundy focus:text-white"
                                onClick={() => handleMeetArtist(artist)}
                              >
                                <CalendarDays className="w-4 h-4 mr-2 text-gray-300" />
                                Meet
                              </MenubarItem>
                              <MenubarItem
                                className="text-gray-300 hover:bg-brand-burgundy hover:text-white cursor-pointer focus:bg-brand-burgundy focus:text-white"
                                onClick={() => handlePlanTour(artist)}
                              >
                                <Mic className="w-4 h-4 mr-2 text-gray-300" />
                                Tour
                              </MenubarItem>
                              <MenubarItem
                                className="text-gray-300 hover:bg-brand-burgundy hover:text-white cursor-pointer focus:bg-brand-burgundy focus:text-white"
                                onClick={() => handleStartRecording(artist)}
                              >
                                <Disc3 className="w-4 h-4 mr-2 text-gray-300" />
                                Record
                              </MenubarItem>
                              <MenubarItem
                                className="text-gray-300 hover:bg-brand-burgundy hover:text-white cursor-pointer focus:bg-brand-burgundy focus:text-white"
                                onClick={() => handlePlanRelease(artist)}
                              >
                                <Rocket className="w-4 h-4 mr-2 text-gray-300" />
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
        </div>
      </main>
    </GameLayout>
  );
};


export default ArtistsLandingPage;