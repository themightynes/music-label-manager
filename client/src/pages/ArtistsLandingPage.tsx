import React, { useState } from 'react';
import { Users, TrendingUp, Star, DollarSign, Music, Eye, UserPlus } from 'lucide-react';
import { useLocation } from 'wouter';
import type { Artist } from '@shared/schema';
import GameLayout from '../layouts/GameLayout';
import { ArtistDiscoveryModal } from '../components/ArtistDiscoveryModal';
import { useGameStore } from '../store/gameStore';
import { usePortfolioROI, useArtistROI } from '../hooks/useAnalytics';

const ArtistsLandingPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false);
  const { gameState, artists, signArtist } = useGameStore();
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {signedArtists.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  onViewDetails={() => handleViewArtistDetails(artist.id)}
                />
              ))}
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

interface ArtistCardProps {
  artist: Artist;
  onViewDetails: () => void;
}

const ArtistCard: React.FC<ArtistCardProps> = ({ artist, onViewDetails }) => {
  const { data: artistROI, isLoading: roiLoading } = useArtistROI(artist.id);
  const roi = artistROI?.overallROI ?? 0;
  const roiColor = roi > 0 ? 'text-green-400' : roi < 0 ? 'text-red-400' : 'text-gray-300';

  // Get mood and loyalty colors
  const getMoodColor = (mood: number) => {
    if (mood >= 75) return 'text-green-400';
    if (mood >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getLoyaltyColor = (loyalty: number) => {
    if (loyalty >= 75) return 'text-green-400';
    if (loyalty >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-[#3c252d]/[0.66] border border-[#65557c] rounded-lg p-6 hover:border-[#7a6a8a] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{artist.name}</h3>
          <p className="text-sm text-gray-400">{artist.archetype}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Popularity</p>
          <p className="text-lg font-semibold text-white">{artist.popularity}</p>
        </div>
      </div>

      {/* Artist Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">Mood</p>
          <p className={`text-sm font-medium ${getMoodColor(artist.mood)}`}>
            {artist.mood || 50}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Loyalty</p>
          <p className={`text-sm font-medium ${getLoyaltyColor(artist.loyalty)}`}>
            {artist.loyalty || 50}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Reputation</p>
          <p className="text-sm font-medium text-white">{artist.reputation}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">ROI</p>
          <p className={`text-sm font-medium ${roiColor}`}>
            {roiLoading ? 'Loading...' : `${roi.toFixed(1)}%`}
          </p>
        </div>
      </div>

      {/* Revenue Information */}
      {artistROI && !roiLoading && (
        <div className="mb-4 p-3 bg-[#2C222A] rounded border border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400">Total Revenue</span>
            <span className="text-sm font-medium text-white">
              ${artistROI.totalRevenue?.toLocaleString() || '0'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">Total Investment</span>
            <span className="text-sm font-medium text-white">
              ${artistROI.totalInvestment?.toLocaleString() || '0'}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onViewDetails}
          className="flex-1 bg-[#A75A5B] hover:bg-[#B86B6C] text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          View Details
        </button>
      </div>
    </div>
  );
};

export default ArtistsLandingPage;