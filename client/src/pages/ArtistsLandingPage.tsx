import React, { useState } from 'react';
import { Users, TrendingUp, Star, DollarSign, Music, Eye, UserPlus } from 'lucide-react';
import { useLocation } from 'wouter';
import type { Artist } from '@shared/schema';
import GameLayout from '../layouts/GameLayout';
import { ArtistDiscoveryModal } from '../components/ArtistDiscoveryModal';
import { ArtistCard as RichArtistCard, getArchetypeInfo, getRelationshipStatus } from '../components/ArtistCard';
import { useGameStore } from '../store/gameStore';
import { usePortfolioROI, useArtistROI } from '../hooks/useAnalytics';

const ArtistsLandingPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false);
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null);
  const { gameState, artists, signArtist, projects } = useGameStore();
  const { data: portfolioROI, isLoading: portfolioLoading, error: portfolioError } = usePortfolioROI();

  const signedArtists = artists || [];
  const maxArtists = 3; // Based on typical roster limits in the game
  const availableSlots = maxArtists - signedArtists.length;

  const handleViewArtistDetails = (artistId: string) => {
    setLocation(`/artist/${artistId}`);
  };

  const handleDiscoverArtists = () => {
    setIsDiscoveryModalOpen(true);
  };

  // Helper function to get artist insights for rich cards
  const getArtistInsights = (artist: Artist) => {
    const mood = artist.mood || 50;
    const loyalty = artist.loyalty || 50;
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
      loyalty,
      popularity
    };
  };

  // Event handlers for rich artist cards
  const handleArtistMeeting = (artist: Artist) => {
    console.info(`[ArtistsLandingPage] Artist meetings temporarily unavailable for ${artist.name}.`);
  };

  const handleNavigateToArtist = (artistId: string) => {
    setLocation(`/artist/${artistId}`);
  };


  // Calculate success metrics
  const successfulArtists = signedArtists.filter(artist => {
    // Consider an artist successful if they have positive ROI or high popularity/reputation
    return artist.popularity > 60 || artist.reputation > 60;
  }).length;
  const successRate = signedArtists.length > 0 ? (successfulArtists / signedArtists.length) * 100 : 0;

  return (
    <GameLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Artists</h1>
            <p className="text-gray-300">Manage your roster and discover new talent</p>
          </div>
          {availableSlots > 0 && (
            <button
              onClick={handleDiscoverArtists}
              className="bg-[#A75A5B] hover:bg-[#B86B6C] text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Discover Artists
            </button>
          )}
        </div>

        {/* Analytics Overview */}
        <div className="bg-[#23121c] rounded-[10px] shadow-lg border border-[#4e324c] p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#3c252d]/[0.66] border border-[#65557c] rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm font-medium">Total Artists</p>
                <p className="text-2xl font-bold text-white">{signedArtists.length}</p>
                <p className="text-sm text-gray-400">{availableSlots} slots available</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-[#3c252d]/[0.66] border border-[#65557c] rounded-lg p-6">
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

          <div className="bg-[#3c252d]/[0.66] border border-[#65557c] rounded-lg p-6">
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

          <div className="bg-[#3c252d]/[0.66] border border-[#65557c] rounded-lg p-6">
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
        </div>

        {/* Signed Artists Grid */}
        <div className="bg-[#23121c] rounded-[10px] shadow-lg border border-[#4e324c] p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Signed Artists</h2>
            <p className="text-gray-400">{signedArtists.length} of {maxArtists} artists signed</p>
          </div>

          {signedArtists.length === 0 ? (
            <div className="bg-[#3c252d]/[0.66] border border-[#65557c] rounded-lg p-12 text-center">
              <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Artists Signed</h3>
              <p className="text-gray-400 mb-6">Start building your roster by discovering new talent</p>
              <button
                onClick={handleDiscoverArtists}
                className="bg-[#A75A5B] hover:bg-[#B86B6C] text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Discover Artists
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {signedArtists.map((artist) => {
                const insights = getArtistInsights(artist);
                const relationship = getRelationshipStatus(artist.mood || 50, artist.loyalty || 50);
                const archetype = getArchetypeInfo(artist.archetype);
                const isExpanded = expandedArtist === artist.id;

                return (
                  <RichArtistCard
                    key={artist.id}
                    artist={artist}
                    insights={insights}
                    relationship={relationship}
                    archetype={archetype}
                    isExpanded={isExpanded}
                    onToggleExpand={() => setExpandedArtist(isExpanded ? null : artist.id)}
                    onMeet={() => handleArtistMeeting(artist)}
                    onNavigate={() => handleNavigateToArtist(artist.id)}
                    gameState={gameState}
                  />
                );
              })}
            </div>
          )}
        </div>

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
    </GameLayout>
  );
};


export default ArtistsLandingPage;