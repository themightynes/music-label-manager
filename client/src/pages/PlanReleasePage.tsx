import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Music, Calendar, DollarSign, Target, TrendingUp, Users, Star, Award, Play, Check, Loader2, AlertCircle, Edit2, X } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import GameLayout from '@/layouts/GameLayout';
import { MusicCalendar } from '@/components/MusicCalendar';
import { cn } from '@/lib/utils';
import {
  getSeasonFromWeek,
  getSeasonalMultiplierValue,
  getQuarterInfoForWeek,
  QUARTER_DEFINITIONS
} from '@shared/utils/seasonalCalculations';
import {
  getMarketingChannelsFromBalance,
  getReleaseTypesFromBalance,
  calculateTotalMarketingCost,
  calculateChannelSynergies,
  calculateChannelEffectiveness,
  type MarketingChannel,
  type ReleaseType
} from '@shared/utils/marketingUtils';

// Mock data types
interface Song {
  id: string;
  title: string;
  quality: number;
  genre: string;
  mood: string;
  artistId: string;
  artistName: string;
  createdWeek: number;
  estimatedStreams: number;
  estimatedRevenue: number;
  isRecorded: boolean;
  isReleased: boolean;
}

interface Artist {
  id: string;
  name: string;
  genre: string;
  readySongs: number;
  totalSongs: number;
  mood: number;
  energy: number;
}

// Marketing and Release types now imported from shared utilities

// REMOVED: SeasonalTiming interface - using balance.json as single source

// Data transformation utilities
// FIXED: Honor backend fields instead of forcing defaults
const transformArtistData = (backendArtist: any): Artist => ({
  id: backendArtist.id,
  name: backendArtist.name,
  genre: backendArtist.genre || 'Unknown', // Honor backend genre field
  readySongs: parseInt(backendArtist.readySongsCount || '0'),
  totalSongs: parseInt(backendArtist.totalSongsCount || '0'),
  mood: backendArtist.mood || 50, // Honor actual mood from backend
  energy: backendArtist.energy ?? backendArtist.loyalty ?? 50 // TEMP: fallback to legacy loyalty
});

const transformSongData = (backendSong: any, artistName: string): Song => ({
  id: backendSong.id,
  title: backendSong.title,
  quality: backendSong.quality,
  genre: backendSong.genre || 'Unknown', // Honor backend genre, don't force 'Pop'
  mood: backendSong.mood || 'Unknown', // Honor backend mood, don't force 'neutral'
  artistId: backendSong.artistId,
  artistName,
  createdWeek: backendSong.createdWeek || 1,
  estimatedStreams: backendSong.estimatedMetrics?.streams || backendSong.weeklyStreams || 0,
  estimatedRevenue: backendSong.estimatedMetrics?.revenue || backendSong.totalRevenue || 0,
  isRecorded: backendSong.isRecorded,
  isReleased: backendSong.isReleased
});

// REMOVED: Static MOCK_SONGS array - now using dynamic backend data
// REMOVED: Static releaseTypes and marketingChannels - now imported from shared utilities

// REMOVED: Local seasonal calculation functions - now imported from shared utilities

// Budget calculation helpers to eliminate duplicate code
const getTotalChannelBudget = (budgets: Record<string, number>): number =>
  Object.values(budgets).reduce((a, b) => a + b, 0);

const getAdjustedBudget = (budgets: Record<string, number>, week: number, balanceData: any): number =>
  getTotalChannelBudget(budgets) * getSeasonalMultiplierValue(week, balanceData);

const getSeasonalAdjustment = (budgets: Record<string, number>, week: number, balanceData: any): number =>
  getTotalChannelBudget(budgets) * (getSeasonalMultiplierValue(week, balanceData) - 1);

export default function PlanReleasePage() {
  const [, setLocation] = useLocation();
  const { gameState, loadGame, planRelease } = useGameStore();

  // Dynamic data state (loaded from balance config)
  const [marketingChannels, setMarketingChannels] = useState<MarketingChannel[]>([]);
  const [releaseTypes, setReleaseTypes] = useState<ReleaseType[]>([]);
  const [balanceData, setBalanceData] = useState<any>(null);

  // Data state
  const [artists, setArtists] = useState<Artist[]>([]);
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  
  // Loading states
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [loadingSongs, setLoadingSongs] = useState(false);
  
  // Error states
  const [artistError, setArtistError] = useState<string | null>(null);
  const [songError, setSongError] = useState<string | null>(null);
  
  // Release planning state
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [leadSingle, setLeadSingle] = useState<string>('');
  const [releaseType, setReleaseType] = useState<'single' | 'ep' | 'album' | null>(null);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [songTitles, setSongTitles] = useState<Record<string, string>>({});
  const [releaseTitle, setReleaseTitle] = useState('');
  const [releaseWeek, setReleaseWeek] = useState(6);
  
  // Marketing budget allocation per channel
  const [channelBudgets, setChannelBudgets] = useState<Record<string, number>>({
    radio: 0,
    digital: 2000,
    pr: 0,
    influencer: 1000
  });
  
  // Lead single timing (for multi-song releases)
  const [leadSingleWeek, setLeadSingleWeek] = useState(5); // Default 1 week before main release
  const [leadSingleBudget, setLeadSingleBudget] = useState<Record<string, number>>({
    radio: 0,
    digital: 1500,
    pr: 0,
    influencer: 500
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Release preview state
  const [previewData, setPreviewData] = useState<any>(null);
  const [calculatingPreview, setCalculatingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Load balance data and dynamic configuration
  useEffect(() => {
    const loadBalanceData = async () => {
      try {
        const response = await apiRequest('GET', `/api/game/${gameState?.id}/balance`);
        const data = await response.json();
        setBalanceData(data.balance);

        // Load dynamic marketing and release configuration
        const channels = getMarketingChannelsFromBalance(data.balance);
        const types = getReleaseTypesFromBalance(data.balance);

        setMarketingChannels(channels);
        setReleaseTypes(types);
      } catch (error) {
        console.error('Failed to load balance data:', error);
        // Let errors bubble up for debugging - no fallbacks
        throw error;
      }
    };

    if (gameState?.id) {
      loadBalanceData();
    }
  }, [gameState?.id]);

  // Load ready artists on component mount
  useEffect(() => {
    const loadReadyArtists = async () => {
      if (!gameState?.id) return;
      
      setLoadingArtists(true);
      setArtistError(null);
      try {
        const response = await apiRequest('GET', `/api/game/${gameState.id}/artists/ready-for-release`);
        const data = await response.json();
        
        setArtists(data.artists.map(transformArtistData));
      } catch (error: any) {
        console.error('Failed to load ready artists:', error);
        
        // Handle specific error types
        if (error.status === 503 || error.message?.includes('unavailable')) {
          setArtistError('Database temporarily unavailable. Please refresh the page to try again.');
        } else if (error.status === 504 || error.message?.includes('timeout')) {
          setArtistError('Request timed out. Please try again.');
        } else {
          setArtistError(error.message || 'Failed to load artists. Please try again.');
        }
        setArtists([]);
      } finally {
        setLoadingArtists(false);
      }
    };
    
    loadReadyArtists();
  }, [gameState?.id]);

  // Load available songs for selected artist
  const loadArtistSongs = async () => {
    if (!selectedArtist || !gameState?.id) {
      setAvailableSongs([]);
      return;
    }
    
    setLoadingSongs(true);
    setSongError(null);
    try {
      const response = await apiRequest('GET', 
        `/api/game/${gameState.id}/artists/${selectedArtist}/songs/ready`);
      const data = await response.json();
      
      const artist = artists.find(a => a.id === selectedArtist);
      setAvailableSongs(data.songs.map((song: any) => transformSongData(song, artist?.name || '')));
    } catch (error: any) {
      console.error('Failed to load artist songs:', error);
      
      // Handle specific error types
      if (error.status === 503 || error.message?.includes('unavailable')) {
        setSongError('Database temporarily unavailable. Please try again in a moment.');
      } else if (error.status === 504 || error.message?.includes('timeout')) {
        setSongError('Request timed out. Please try again.');
      } else {
        setSongError(error.message || 'Failed to load songs. Please try again.');
      }
      setAvailableSongs([]);
    } finally {
      setLoadingSongs(false);
    }
  };
  
  useEffect(() => {
    loadArtistSongs();
  }, [selectedArtist, gameState?.id, artists]);

  // Auto-detect release type based on selected songs
  useEffect(() => {
    const songCount = selectedSongs.length;
    if (songCount === 1) {
      setReleaseType('single');
    } else if (songCount >= 3 && songCount <= 5) {
      setReleaseType('ep');
    } else if (songCount >= 8) {
      setReleaseType('album');
    } else {
      setReleaseType(null);
    }
  }, [selectedSongs]);

  // Auto-generate release title
  useEffect(() => {
    if (selectedSongs.length > 0 && releaseType) {
      const firstSong = availableSongs.find(song => song.id === selectedSongs[0]);
      if (firstSong) {
        if (releaseType === 'single') {
          setReleaseTitle(firstSong.title);
        } else {
          const artistName = artists.find(a => a.id === selectedArtist)?.name || '';
          setReleaseTitle(`${artistName} ${releaseType.toUpperCase()}`);
        }
      }
    }
  }, [selectedSongs, releaseType, selectedArtist, availableSongs, artists]);


  // Calculate release preview using backend API
  const calculateReleasePreview = async () => {
    if (!selectedArtist || selectedSongs.length === 0 || !releaseType || !gameState?.id) {
      setPreviewData(null);
      return;
    }
    
    setCalculatingPreview(true);
    setPreviewError(null);
    
    try {
      const previewRequest = {
        artistId: selectedArtist,
        songIds: selectedSongs,
        releaseType,
        leadSingleId: leadSingle || null,
        scheduledReleaseWeek: releaseWeek,
        marketingBudget: channelBudgets,
        leadSingleStrategy: releaseType !== 'single' && leadSingle ? {
          leadSingleId: leadSingle,
          leadSingleReleaseWeek: leadSingleWeek,
          leadSingleBudget,
          totalLeadSingleBudget: getTotalChannelBudget(leadSingleBudget)
        } : null
      };
      
      const response = await apiRequest('POST', 
        `/api/game/${gameState.id}/releases/preview`, previewRequest);
      const data = await response.json();
      
      setPreviewData(data.preview);
    } catch (error: any) {
      console.error('Failed to calculate release preview:', error);
      
      // Handle specific error types
      if (error.status === 503 || error.message?.includes('unavailable')) {
        setPreviewError('Database temporarily unavailable. Preview will refresh automatically.');
        // Retry after a delay
        setTimeout(() => calculateReleasePreview(), 5000);
      } else if (error.status === 504 || error.message?.includes('timeout')) {
        setPreviewError('Request timed out. Retrying...');
        // Retry after a shorter delay
        setTimeout(() => calculateReleasePreview(), 3000);
      } else {
        setPreviewError(error.message || 'Failed to calculate preview');
      }
      setPreviewData(null);
    } finally {
      setCalculatingPreview(false);
    }
  };

  // Trigger preview calculation when inputs change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateReleasePreview();
    }, 500); // Debounce API calls
    
    return () => clearTimeout(timer);
  }, [selectedArtist, selectedSongs, releaseType, channelBudgets, releaseWeek, leadSingle, leadSingleBudget, leadSingleWeek]);

  // Use preview data or fallback to default values (only when balance data is loaded)
  const metrics = previewData || (!balanceData ? null : {
    songCount: selectedSongs.length,
    averageQuality: 0,
    estimatedStreams: 0,
    estimatedRevenue: 0,
    releaseBonus: 0,
    seasonalMultiplier: getSeasonalMultiplierValue(releaseWeek, balanceData),
    marketingMultiplier: calculateChannelSynergies(channelBudgets),
    leadSingleBoost: 1,
    totalMarketingCost: calculateTotalMarketingCost(
      channelBudgets,
      releaseWeek,
      balanceData,
      leadSingleBudget,
      leadSingleWeek
    ),
    diversityBonus: calculateChannelSynergies(channelBudgets),
    activeChannelCount: Object.keys(channelBudgets).filter(id => (channelBudgets[id] || 0) > 0).length,
    channelEffectiveness: calculateChannelEffectiveness(channelBudgets, balanceData),
    projectedROI: 0
  });

  // Validation
  const validateRelease = () => {
    const errors: string[] = [];
    const totalMarketingCost = metrics?.totalMarketingCost || 0;
    const activeChannels = marketingChannels.filter(channel => (channelBudgets[channel.id] || 0) > 0);
    const currentCreativeCapital = gameState?.creativeCapital || 0;
    
    if (!selectedArtist) errors.push('Please select an artist');
    if (selectedSongs.length === 0) errors.push('Please select at least one song');
    if (!releaseTitle.trim()) errors.push('Please enter a release title');
    if (currentCreativeCapital < 1) errors.push('Insufficient creative capital. You need 1 creative capital to plan a release.');
    if (totalMarketingCost > (gameState?.money || 0)) errors.push('Insufficient funds for total marketing budget');
    if (activeChannels.length === 0) errors.push('Please allocate budget to at least one marketing channel');
    
    // Release type validation
    if (releaseType === 'ep' && selectedSongs.length < 3) {
      errors.push('EP requires at least 3 songs');
    }
    if (releaseType === 'album' && selectedSongs.length < 8) {
      errors.push('Album requires at least 8 songs');
    }
    
    // Lead single timing validation
    if (releaseType !== 'single' && leadSingle) {
      if (leadSingleWeek >= releaseWeek) {
        errors.push('Lead single must release before the main release');
      }
      if (releaseWeek - leadSingleWeek > 3) {
        errors.push('Lead single should release no more than 3 weeks before main release');
      }
      if (getTotalChannelBudget(leadSingleBudget) === 0) {
        errors.push('Lead single requires marketing budget allocation');
      }
    }
    
    // Channel budget validation
    activeChannels.forEach(channel => {
      const budget = channelBudgets[channel.id];
      if (budget < channel.minBudget) {
        errors.push(`${channel.name} requires minimum $${channel.minBudget.toLocaleString()} budget`);
      }
      if (budget > channel.maxBudget) {
        errors.push(`${channel.name} budget cannot exceed $${channel.maxBudget.toLocaleString()}`);
      }
    });
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleCreateRelease = async () => {
    if (!validateRelease()) return;
    
    setIsLoading(true);
    
    try {
      const releaseData = {
        artistId: selectedArtist,
        title: releaseTitle,
        type: releaseType,
        songIds: selectedSongs,
        leadSingleId: leadSingle || null,
        scheduledReleaseWeek: releaseWeek,
        marketingBudget: channelBudgets,
        leadSingleStrategy: releaseType !== 'single' && leadSingle ? {
          leadSingleId: leadSingle,
          leadSingleReleaseWeek: leadSingleWeek,
          leadSingleBudget,
          totalLeadSingleBudget: getTotalChannelBudget(leadSingleBudget)
        } : null,
        metadata: {
          estimatedStreams: metrics?.estimatedStreams || 0,
          estimatedRevenue: metrics?.estimatedRevenue || 0,
          releaseBonus: metrics?.releaseBonus || 0,
          seasonalMultiplier: metrics?.seasonalMultiplier || 1,
          marketingMultiplier: metrics?.marketingMultiplier || 1,
          leadSingleBoost: metrics?.leadSingleBoost || 1,
          channelEffectiveness: metrics?.channelEffectiveness || {},
          projectedROI: metrics?.projectedROI || 0,
          totalInvestment: metrics?.totalMarketingCost || 0,
          // Store the marketing budget in metadata as well for released items
          marketingBudget: getTotalChannelBudget(channelBudgets)
        }
      };
      
      const result = await planRelease(releaseData);
      
      // Success - clear selected songs and refresh available songs immediately
      setSelectedSongs([]);
      setLeadSingle('');
      setReleaseTitle('');
      
      // Refresh available songs to remove the ones that were just scheduled
      await loadArtistSongs();
      
      // Success message with more detailed feedback
      const scheduledSongTitles = selectedSongs.map(songId => {
        const song = availableSongs.find(s => s.id === songId);
        return song?.title || 'Unknown Song';
      }).join(', ');
      
      alert(`Release "${releaseData.title}" planned successfully!\n\nScheduled songs: ${scheduledSongTitles}\n\nThese songs are now reserved and won't appear in future release planning until this release is completed or cancelled.`);
      
      // Refresh game data to load the new planned release
      if (gameState?.id) {
        await loadGame(gameState.id);
      }
      
      // Offer to plan another release or go to dashboard
      const planAnother = confirm('Would you like to plan another release? Click OK to stay on this page, or Cancel to go to the dashboard.');

      if (!planAnother) {
        setLocation('/game');
      }
      
    } catch (error: any) {
      console.error('Failed to create release:', error);
      
      // Handle specific error types
      if (error.status === 402) {
        // Check if it's a creative capital error or money error
        const errorMessage = error.message || '';
        if (errorMessage.includes('creative capital')) {
          setValidationErrors(['Insufficient creative capital. You need 1 creative capital to plan a release.']);
        } else {
          setValidationErrors(['Insufficient funds for total marketing budget']);
        }
      } else if (error.status === 409) {
        // Song conflict detected - refresh available songs to show current state
        await loadArtistSongs();
        
        const details = error.details || {};
        if (details.conflicts) {
          setValidationErrors(details.conflicts.map((c: any) => c.description));
        } else {
          setValidationErrors(['Song scheduling conflict detected. The song list has been refreshed to show current availability.']);
        }
      } else if (error.status === 400) {
        const details = error.details;
        const extractMessage = (entry: any): string | null => {
          if (!entry) return null;
          if (typeof entry === 'string') return entry;
          if (typeof entry === 'object') {
            return entry.issue || entry.message || null;
          }
          return null;
        };

        let messages: string[] = [];

        if (Array.isArray(details)) {
          details.forEach((entry: any) => {
            const message = extractMessage(entry);
            if (message) messages.push(message);
          });
        } else if (details?.issues && Array.isArray(details.issues)) {
          details.issues.forEach((entry: any) => {
            const message = extractMessage(entry);
            if (message) messages.push(message);
          });
        } else if (typeof details === 'string') {
          messages = [details];
        } else if (details && typeof details === 'object') {
          messages = Object.values(details).reduce<string[]>((acc, value: any) => {
            if (Array.isArray(value)) {
              value.forEach(item => {
                const message = extractMessage(item);
                if (message) acc.push(message);
              });
            } else {
              const message = extractMessage(value);
              if (message) acc.push(message);
            }
            return acc;
          }, []);
        }

        if (messages.length === 0 && error.message) {
          messages = [error.message];
        }

        setValidationErrors(messages.length > 0 ? messages : ['Validation error']);
      } else {
        setValidationErrors(['Failed to create release. Please try again.']);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 90) return 'text-green-600';
    if (quality >= 80) return 'text-brand-burgundy';
    if (quality >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Song title editing functions
  const startEditingSong = (songId: string, currentTitle: string) => {
    setEditingSongId(songId);
    setEditedTitle(currentTitle);
  };

  const cancelEditingSong = () => {
    setEditingSongId(null);
    setEditedTitle('');
  };

  const saveSongTitle = async (songId: string) => {
    const trimmedTitle = editedTitle.trim();
    
    // Validation
    if (!trimmedTitle) {
      cancelEditingSong();
      return;
    }
    
    if (trimmedTitle.length > 100) {
      alert('Song title must be 100 characters or less');
      return;
    }
    
    try {
      await apiRequest('PATCH', `/api/songs/${songId}`, { title: trimmedTitle });
      
      // If we get here without throwing, the update was successful
      // Update local state
      setSongTitles(prev => ({ ...prev, [songId]: trimmedTitle }));
      
      // Update the song in availableSongs if it exists
      setAvailableSongs(prev => prev.map(song => 
        song.id === songId ? { ...song, title: trimmedTitle } : song
      ));
      
      // Close the edit box
      setEditingSongId(null);
      setEditedTitle('');
    } catch (error: any) {
      console.error('Failed to update song title:', error);
      const errorMessage = error?.message || error?.details || 'Unknown error';
      alert(`Failed to update song title: ${errorMessage}`);
    }
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent, songId: string) => {
    if (e.key === 'Enter') {
      saveSongTitle(songId);
    } else if (e.key === 'Escape') {
      cancelEditingSong();
    }
  };

  return (
    <GameLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-xl md:text-2xl font-heading font-bold text-white">Plan Release</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Release Planning */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Artist Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Select Artist</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingArtists || !balanceData || marketingChannels.length === 0 || releaseTypes.length === 0 ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-brand-burgundy mx-auto mb-4 animate-spin" />
                    <p className="text-white/70">
                      {!balanceData ? 'Loading balance data...' :
                       marketingChannels.length === 0 || releaseTypes.length === 0 ? 'Loading configuration...' :
                       'Loading available artists...'}
                    </p>
                  </div>
                ) : artistError ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
                    <p className="text-red-600 mb-4">{artistError}</p>
                    <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                      Try Again
                    </Button>
                  </div>
                ) : artists.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 text-white/40 mx-auto mb-4" />
                    <p className="text-white/70">No artists with ready songs found</p>
                    <p className="text-sm text-white/50 mt-2">Artists need recorded songs to plan releases</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {artists.map(artist => (
                      <div
                        key={artist.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedArtist === artist.id 
                            ? 'border-brand-burgundy bg-brand-burgundy/10' 
                            : 'border-brand-purple/50 hover:border-brand-purple-light/60'
                        }`}
                        onClick={() => {
                          setSelectedArtist(artist.id);
                          setSelectedSongs([]);
                          setLeadSingle('');
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-white">{artist.name}</h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/artist/${artist.id}`);
                              }}
                              className="text-brand-burgundy hover:text-brand-burgundy text-xs"
                              title="View artist details"
                            >
                              <i className="fas fa-external-link-alt"></i>
                            </button>
                          </div>
                          <Badge variant="outline" className="text-xs">{artist.genre}</Badge>
                        </div>
                        <div className="space-y-1 text-sm text-white/70">
                          <div className="flex justify-between">
                            <span>Ready Songs:</span>
                            <span className="font-mono font-semibold text-green-600">{artist.readySongs}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Mood:</span>
                            <span className="font-mono font-semibold">{artist.mood}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Energy:</span>
                            <span className="font-mono font-semibold">{(artist.energy ?? (artist as any).loyalty ?? 0)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Song Selection */}
            {selectedArtist && (
              <Card>
              <CardHeader className="flex items-start justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Music className="w-5 h-5" />
                  <span>Select Songs</span>
                  <Badge variant="secondary">{selectedSongs.length} selected</Badge>
                </CardTitle>
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSongs(availableSongs.map(s => s.id))}
                    disabled={availableSongs.length === 0 || selectedSongs.length === availableSongs.length}
                  >
                    Select all
                  </Button>
                </div>
              </CardHeader>
                <CardContent>
                  {loadingSongs ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 text-brand-burgundy mx-auto mb-4 animate-spin" />
                      <p className="text-white/70">Loading available songs...</p>
                    </div>
                  ) : songError ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
                      <p className="text-red-600 mb-4">{songError}</p>
                      <Button onClick={() => {
                        setSelectedArtist('');
                        setSelectedArtist(selectedArtist);
                      }} variant="outline" size="sm">
                        Try Again
                      </Button>
                    </div>
                  ) : availableSongs.length === 0 ? (
                    <div className="text-center py-8">
                      <Music className="w-8 h-8 text-white/40 mx-auto mb-4" />
                      <p className="text-white/70">No ready songs found for this artist</p>
                      <p className="text-sm text-white/50 mt-2">Songs must be recorded but not yet released</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableSongs.map(song => (
                        <div
                          key={song.id}
                          className={`p-4 border rounded-lg transition-all ${
                            selectedSongs.includes(song.id)
                              ? 'border-brand-burgundy bg-brand-burgundy/10'
                              : 'border-brand-purple/50 hover:border-brand-purple-light/60'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={selectedSongs.includes(song.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedSongs([...selectedSongs, song.id]);
                                } else {
                                  setSelectedSongs(selectedSongs.filter(id => id !== song.id));
                                  if (leadSingle === song.id) setLeadSingle('');
                                }
                              }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                {editingSongId === song.id ? (
                                  <div className="flex items-center space-x-2 flex-1 mr-2">
                                    <Input
                                      value={editedTitle}
                                      onChange={(e) => setEditedTitle(e.target.value)}
                                      onKeyDown={(e) => handleTitleKeyPress(e, song.id)}
                                      onBlur={(e) => {
                                        // Don't save if clicking on the cancel or save buttons
                                        const relatedTarget = e.relatedTarget as HTMLElement;
                                        if (relatedTarget && relatedTarget.closest('.song-edit-buttons')) {
                                          return;
                                        }
                                        saveSongTitle(song.id);
                                      }}
                                      className="h-7 text-sm font-semibold"
                                      maxLength={100}
                                      autoFocus
                                    />
                                    <div className="song-edit-buttons flex items-center space-x-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => saveSongTitle(song.id)}
                                        className="h-7 w-7 p-0"
                                        type="button"
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={cancelEditingSong}
                                        className="h-7 w-7 p-0"
                                        type="button"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2 group">
                                    <h4 className="font-semibold text-white">
                                      {songTitles[song.id] || song.title}
                                    </h4>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => startEditingSong(song.id, songTitles[song.id] || song.title)}
                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                <div className="flex items-center space-x-2">
                                  <Badge className={`text-xs ${getQualityColor(song.quality)}`}>
                                    {song.quality} Quality
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">{song.mood}</Badge>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-white/70">
                                <span>Created Week {song.createdWeek}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Lead Single Selection (for multi-song releases) */}
            {selectedSongs.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="w-5 h-5" />
                    <span>Lead Single</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={leadSingle} onValueChange={setLeadSingle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose the lead single for promotion" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSongs
                        .filter(song => selectedSongs.includes(song.id))
                        .map(song => (
                          <SelectItem key={song.id} value={song.id}>
                            {songTitles[song.id] || song.title} (Quality: {song.quality})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-white/70 mt-2">
                    The lead single will receive extra promotional focus and affect overall release performance.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Lead Single Planning (for multi-song releases) */}
            {releaseType !== 'single' && leadSingle && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Play className="w-5 h-5" />
                    <span>Lead Single Strategy</span>
                    <Badge variant="secondary" className="text-xs">Releases First</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-brand-burgundy/10 rounded-lg border border-brand-burgundy/30">
                    <h4 className="text-sm font-semibold text-brand-burgundy mb-2">Selected Lead Single</h4>
                    <p className="text-sm text-brand-burgundy">
                      {(() => {
                        const leadSong = availableSongs.find(s => s.id === leadSingle);
                        return leadSong ? (songTitles[leadSong.id] || leadSong.title) : 'No lead single selected';
                      })()}
                    </p>
                    <p className="text-xs text-brand-burgundy mt-1">
                      This single will build momentum for the full {releaseType} release
                    </p>
                  </div>

                  {/* Timing Summary */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-brand-burgundy/10 rounded-lg border border-brand-burgundy/30">
                      <div className="text-xs font-medium text-brand-burgundy mb-1">Lead Single Release</div>
                      <div className="text-sm font-semibold text-white">Week {leadSingleWeek}</div>
                      <div className="text-xs text-orange-600">
                        {getQuarterInfoForWeek(leadSingleWeek).name} - {(() => {
                          const multiplier = getSeasonalMultiplierValue(leadSingleWeek, balanceData);
                          const percentage = Math.round((multiplier - 1) * 100);
                          return percentage > 0 ? `+${percentage}%` : `${percentage}%`;
                        })()} cost
                      </div>
                    </div>
                    <div className="p-3 bg-brand-dark-card/10 rounded-lg border border-brand-purple/50">
                      <div className="text-xs font-medium text-white/70 mb-1">Main Release</div>
                      <div className="text-sm font-semibold text-white">Week {releaseWeek}</div>
                      <div className="text-xs text-orange-600">
                        {getQuarterInfoForWeek(releaseWeek).name} - {(() => {
                          const multiplier = getSeasonalMultiplierValue(releaseWeek, balanceData);
                          const percentage = Math.round((multiplier - 1) * 100);
                          return percentage > 0 ? `+${percentage}%` : `${percentage}%`;
                        })()} cost
                      </div>
                    </div>
                  </div>

                  {/* Lead Single Week Selection */}
                  <div>
                    <label className="text-xs text-white/70 mb-2 block">
                      Select Lead Single Release Week
                    </label>
                    <MusicCalendar
                      selectionMode={true}
                      selectedWeek={leadSingleWeek}
                      onWeekSelect={setLeadSingleWeek}
                      minWeek={gameState ? gameState.currentWeek + 1 : 1}
                      maxWeek={releaseWeek - 1}
                      className="max-w-lg"
                    />
                  </div>

                  {/* Lead Single Marketing Budget */}
                  <div>
                    <h4 className="text-sm font-medium text-white/90 mb-3">Lead Single Marketing Budget</h4>
                    <div className="space-y-3">
                      {marketingChannels.map(channel => (
                        <div key={`lead-${channel.id}`} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <i className={`${channel.icon} text-sm text-white/70`} />
                            <span className="text-sm text-white/90">{channel.name}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-xs text-white/50 w-16">
                              ${(leadSingleBudget[channel.id] || 0).toLocaleString()}
                            </span>
                            <Slider
                              value={[leadSingleBudget[channel.id] || 0]}
                              onValueChange={(value) => 
                                setLeadSingleBudget(prev => ({ ...prev, [channel.id]: value[0] }))
                              }
                              max={channel.maxBudget}
                              min={0}
                              step={100}
                              className="w-32"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-white/50">
                      <div>Lead Single Total: ${getTotalChannelBudget(leadSingleBudget).toLocaleString()}</div>
                      {getSeasonalMultiplierValue(leadSingleWeek, balanceData) !== 1 && (
                        <div className="text-orange-600">
                          Adjusted for {getQuarterInfoForWeek(leadSingleWeek).name}: ${Math.round(calculateTotalMarketingCost({}, 0, balanceData, leadSingleBudget, leadSingleWeek)).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Marketing Strategy */}
            {releaseType && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>{releaseType === 'single' ? 'Marketing Strategy' : 'Main Release Marketing'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Marketing Budget Allocation */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-white/90">Budget Allocation</h4>
                      <span className="text-sm font-mono font-semibold text-brand-burgundy">
                        Total: ${getTotalChannelBudget(channelBudgets).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {marketingChannels.map(channel => {
                        const budget = channelBudgets[channel.id] || 0;
                        const isActive = budget > 0;
                        const effectiveness = metrics?.channelEffectiveness?.[channel.id];
                        
                        return (
                          <div key={channel.id} className={`p-4 border rounded-lg transition-all ${
                            isActive ? 'border-brand-burgundy bg-brand-burgundy/10' : 'border-brand-purple/50'
                          }`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <i className={`${channel.icon} text-lg ${isActive ? 'text-brand-burgundy' : 'text-white/40'}`} />
                                <div>
                                  <h5 className="font-semibold text-white">{channel.name}</h5>
                                  <p className="text-xs text-white/70">{channel.description}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-white">${budget.toLocaleString()}</div>
                                <div className="text-xs text-white/50">{effectiveness?.contribution ? effectiveness.contribution.toFixed(1) : 0}% of budget</div>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Slider
                                value={[budget]}
                                onValueChange={(value) => 
                                  setChannelBudgets(prev => ({ ...prev, [channel.id]: value[0] }))
                                }
                                max={Math.min(channel.maxBudget, gameState?.money || 0)}
                                min={0}
                                step={250}
                                className="w-full"
                              />
                              <div className="flex justify-between text-xs text-white/50">
                                <span>${channel.minBudget.toLocaleString()} min</span>
                                <span className="font-semibold">
                                  {channel.effectiveness}% effectiveness • {channel.targetAudience}
                                </span>
                                <span>${channel.maxBudget.toLocaleString()} max</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Release Timing */}
                  <div>
                    <h4 className="text-sm font-medium text-white/90 mb-3">Release Timing</h4>
                    <div>
                      <div>
                        <label className="text-xs text-white/70 mb-1 block">
                          Target Week
                          <span className="ml-2 text-orange-600">
                            ({getQuarterInfoForWeek(releaseWeek).name} - {(() => {
                              const multiplier = getSeasonalMultiplierValue(releaseWeek, balanceData);
                              const percentage = Math.round((multiplier - 1) * 100);
                              return percentage > 0 ? `+${percentage}%` : `${percentage}%`;
                            })()} cost)
                          </span>
                        </label>
<MusicCalendar
                          selectionMode={true}
                          selectedWeek={releaseWeek}
                          onWeekSelect={setReleaseWeek}
                          minWeek={gameState ? gameState.currentWeek + 1 : 1}
                          className="max-w-lg"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Release Preview */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Release Type & Preview */}
            {releaseType && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {(() => {
                      const IconComponent = releaseTypes.find(rt => rt.id === releaseType)?.icon || Music;
                      return <IconComponent className="w-5 h-5" />;
                    })()}
                    <span>{releaseTypes.find(rt => rt.id === releaseType)?.name} Release</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-white/90 mb-1 block">Release Title</label>
                      <Input
                        type="text"
                        value={releaseTitle}
                        onChange={(e) => setReleaseTitle(e.target.value)}
                        placeholder="Enter release title"
                      />
                    </div>
                    
                    <div className="p-3 bg-brand-dark-card/5 rounded-lg">
                      <h4 className="text-sm font-semibold text-white/90 mb-2">Release Type Benefits</h4>
                      {(() => {
                        const selectedType = releaseTypes.find(rt => rt.id === releaseType);
                        if (!selectedType) return null;

                        const revenueBonus = Math.round((selectedType.revenueMultiplier - 1) * 100);

                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-white/70">Revenue Bonus:</span>
                              <span className="text-sm font-semibold text-green-600">
                                +{revenueBonus}%
                              </span>
                            </div>
                            <p className="text-xs text-white/50 pt-1 border-t border-white/10">
                              <span className="font-medium text-brand-burgundy">{selectedType.bonusType}:</span> {selectedType.description}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance Preview */}
            {selectedSongs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Performance Preview</span>
                    {calculatingPreview && <Loader2 className="w-4 h-4 animate-spin text-brand-burgundy" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {previewError ? (
                    <div className="text-center py-4">
                      <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                      <p className="text-red-600 text-sm">{previewError}</p>
                      <Button onClick={calculateReleasePreview} variant="outline" size="sm" className="mt-2">
                        Retry Calculation
                      </Button>
                    </div>
                  ) : calculatingPreview && !previewData ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 text-brand-burgundy mx-auto mb-4 animate-spin" />
                      <p className="text-white/70">Calculating release metrics...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-3 bg-brand-dark-card/5 rounded-lg">
                        <div className="text-xl font-bold text-white">{metrics?.songCount || 0}</div>
                        <div className="text-white/70">Songs</div>
                      </div>
                      <div className="text-center p-3 bg-brand-dark-card/5 rounded-lg">
                        <div className="text-xl font-bold text-white">{metrics?.averageQuality || 0}</div>
                        <div className="text-white/70">Avg Quality</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white/70">Estimated Streams:</span>
                        <span className="font-mono font-semibold text-brand-burgundy">
                          {metrics?.estimatedStreams?.toLocaleString() || '0'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white/70">Estimated Revenue:</span>
                        <span className="font-mono font-semibold text-green-600">
                          ${metrics?.estimatedRevenue?.toLocaleString() || '0'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white/70">Marketing Cost:</span>
                        <span className="font-mono font-semibold text-red-600">
                          -${metrics?.totalMarketingCost.toLocaleString()}
                        </span>
                      </div>
                      <div className="border-t pt-3 flex justify-between items-center">
                        <span className="text-sm font-semibold text-white/90">Projected ROI:</span>
                        <span className={`font-mono font-bold ${
                          metrics?.projectedROI > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {metrics?.projectedROI > 0 ? '+' : ''}{metrics?.projectedROI}%
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-white/90 mb-2">Multipliers Applied</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-white/70">Release Bonus:</span>
                            <span className="font-mono">+{metrics?.releaseBonus}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70">Seasonal Revenue:</span>
                            <span className="font-mono">
                              {metrics?.seasonalMultiplier > 1 ? '+' : ''}{Math.round((metrics?.seasonalMultiplier - 1) * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70">Marketing:</span>
                            <span className="font-mono">
                              +{Math.round((metrics?.marketingMultiplier - 1) * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70">Channel Diversity:</span>
                            <span className="font-mono text-brand-burgundy">
                              +{Math.round((metrics?.diversityBonus - 1) * 100)}% ({metrics?.activeChannelCount} channels)
                            </span>
                          </div>
                          {releaseType !== 'single' && leadSingle && metrics?.leadSingleBoost > 1 && (
                            <div className="flex justify-between">
                              <span className="text-white/70">Lead Single Boost:</span>
                              <span className="font-mono text-brand-burgundy-dark">
                                +{Math.round((metrics?.leadSingleBoost - 1) * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Marketing Channel Breakdown */}
                      <div>
                        <h4 className="text-sm font-semibold text-white/90 mb-2">Marketing Breakdown</h4>
                        <div className="space-y-1 text-xs">
                          {marketingChannels.map(channel => {
                            const budget = channelBudgets[channel.id] || 0;
                            const effectiveness = metrics?.channelEffectiveness?.[channel.id];
                            const adjustedBudget = effectiveness?.adjustedBudget || budget;
                            const seasonalCostChange = adjustedBudget - budget;
                            
                            return budget > 0 ? (
                              <div key={channel.id} className="flex justify-between">
                                <span className="text-white/70 flex items-center space-x-1">
                                  <i className={`${channel.icon} text-xs`} />
                                  <span>{channel.name}:</span>
                                </span>
                                <div className="text-right font-mono">
                                  <div>${adjustedBudget.toLocaleString()} {effectiveness?.contribution ? `(${effectiveness.contribution.toFixed(1)}%)` : ''}</div>
                                  {seasonalCostChange !== 0 && (
                                    <div className="text-xs text-orange-600">
                                      {seasonalCostChange > 0 ? '+' : ''}${seasonalCostChange.toLocaleString()} seasonal
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : null;
                          })}
                          {releaseType !== 'single' && leadSingle && getTotalChannelBudget(leadSingleBudget) > 0 && (
                            <div className="flex justify-between border-t pt-1">
                              <span className="text-white/70">Lead Single Budget:</span>
                              <div className="text-right font-mono text-brand-burgundy-dark">
                                <div>${Math.round(getAdjustedBudget(leadSingleBudget, leadSingleWeek, balanceData)).toLocaleString()}</div>
                                {getSeasonalMultiplierValue(leadSingleWeek, balanceData) !== 1 && (
                                  <div className="text-xs text-orange-600">
                                    +${Math.round(getSeasonalAdjustment(leadSingleBudget, leadSingleWeek, balanceData)).toLocaleString()} seasonal
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Validation & Submit */}
            <Card>
              <CardContent className="pt-6">
                {validationErrors.length > 0 && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-red-700 mb-1">Please fix the following:</h4>
                    <ul className="text-xs text-red-600 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  onClick={handleCreateRelease}
                  disabled={isLoading || selectedSongs.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Planning Release...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Plan Release</span>
                    </div>
                  )}
                </Button>

                <p className="text-xs text-white/50 text-center mt-2">
                  This will schedule the release and deduct the marketing budget from your funds.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </GameLayout>
  );
}