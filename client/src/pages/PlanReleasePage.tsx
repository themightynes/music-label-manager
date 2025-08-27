import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Music, Calendar, DollarSign, Target, TrendingUp, Users, Star, Award, Play, Check, Loader2, AlertCircle } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

// Mock data types
interface Song {
  id: string;
  title: string;
  quality: number;
  genre: string;
  mood: string;
  artistId: string;
  artistName: string;
  createdMonth: number;
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
  loyalty: number;
}

interface ReleaseType {
  id: 'single' | 'ep' | 'album';
  name: string;
  minSongs: number;
  maxSongs: number;
  description: string;
  bonusType: string;
  bonusAmount: number;
  icon: React.ElementType;
}

interface MarketingChannel {
  id: string;
  name: string;
  description: string;
  minBudget: number;
  maxBudget: number;
  effectiveness: number;
  icon: string;
  targetAudience: string;
}

interface SeasonalTiming {
  id: string;
  name: string;
  description: string;
  multiplier: number;
  isOptimal: boolean;
  marketingCostMultiplier: number;
  competitionLevel: string;
}

// Data transformation utilities
const transformArtistData = (backendArtist: any): Artist => ({
  id: backendArtist.id,
  name: backendArtist.name,
  genre: 'Pop', // Default since not in backend schema
  readySongs: parseInt(backendArtist.readySongsCount || '0'),
  totalSongs: parseInt(backendArtist.totalSongsCount || '0'),
  mood: backendArtist.mood || 50,
  loyalty: backendArtist.loyalty || 50
});

const transformSongData = (backendSong: any, artistName: string): Song => ({
  id: backendSong.id,
  title: backendSong.title,
  quality: backendSong.quality,
  genre: backendSong.genre || 'Pop',
  mood: backendSong.mood || 'neutral',
  artistId: backendSong.artistId,
  artistName,
  createdMonth: backendSong.createdMonth || 1,
  estimatedStreams: backendSong.estimatedMetrics?.streams || backendSong.monthlyStreams || 0,
  estimatedRevenue: backendSong.estimatedMetrics?.revenue || backendSong.totalRevenue || 0,
  isRecorded: backendSong.isRecorded,
  isReleased: backendSong.isReleased
});

const MOCK_SONGS: Song[] = [
  { id: '1', title: 'Midnight Dreams', quality: 87, genre: 'Pop', mood: 'Dreamy', artistId: '1', artistName: 'Luna Starr', createdMonth: 3, estimatedStreams: 145000, estimatedRevenue: 8200, isRecorded: true, isReleased: false },
  { id: '2', title: 'City Lights', quality: 82, genre: 'Pop', mood: 'Upbeat', artistId: '1', artistName: 'Luna Starr', createdMonth: 3, estimatedStreams: 132000, estimatedRevenue: 7500, isRecorded: true, isReleased: false },
  { id: '3', title: 'Hearts on Fire', quality: 91, genre: 'Pop', mood: 'Passionate', artistId: '1', artistName: 'Luna Starr', createdMonth: 4, estimatedStreams: 168000, estimatedRevenue: 9800, isRecorded: true, isReleased: false },
  { id: '4', title: 'Dancing Alone', quality: 79, genre: 'Pop', mood: 'Melancholic', artistId: '1', artistName: 'Luna Starr', createdMonth: 4, estimatedStreams: 118000, estimatedRevenue: 6900, isRecorded: true, isReleased: false },
  { id: '5', title: 'Thunder Road', quality: 85, genre: 'Rock', mood: 'Aggressive', artistId: '2', artistName: 'Echo Rebellion', createdMonth: 2, estimatedStreams: 95000, estimatedRevenue: 5800, isRecorded: true, isReleased: false },
  { id: '6', title: 'Broken Chains', quality: 88, genre: 'Rock', mood: 'Rebellious', artistId: '2', artistName: 'Echo Rebellion', createdMonth: 3, estimatedStreams: 112000, estimatedRevenue: 6900, isRecorded: true, isReleased: false },
  { id: '7', title: 'Rebel Soul', quality: 83, genre: 'Rock', mood: 'Defiant', artistId: '2', artistName: 'Echo Rebellion', createdMonth: 4, estimatedStreams: 98000, estimatedRevenue: 6100, isRecorded: true, isReleased: false },
  { id: '8', title: 'Digital Love', quality: 89, genre: 'Electronic', mood: 'Futuristic', artistId: '3', artistName: 'Neon Dreams', createdMonth: 3, estimatedStreams: 158000, estimatedRevenue: 9200, isRecorded: true, isReleased: false },
  { id: '9', title: 'Neon Nights', quality: 86, genre: 'Electronic', mood: 'Atmospheric', artistId: '3', artistName: 'Neon Dreams', createdMonth: 4, estimatedStreams: 142000, estimatedRevenue: 8400, isRecorded: true, isReleased: false }
];

const RELEASE_TYPES: ReleaseType[] = [
  { id: 'single', name: 'Single', minSongs: 1, maxSongs: 1, description: 'Quick release for maximum focus', bonusType: 'Focus Bonus', bonusAmount: 20, icon: Music },
  { id: 'ep', name: 'EP', minSongs: 3, maxSongs: 5, description: 'Extended play for sustained momentum', bonusType: 'Momentum Bonus', bonusAmount: 15, icon: Award },
  { id: 'album', name: 'Album', minSongs: 8, maxSongs: 12, description: 'Complete artistic statement', bonusType: 'Cohesion Bonus', bonusAmount: 25, icon: Star }
];

const MARKETING_CHANNELS: MarketingChannel[] = [
  { id: 'radio', name: 'Radio Push', description: 'Traditional radio promotion - high reach, mainstream appeal', minBudget: 2500, maxBudget: 15000, effectiveness: 85, icon: 'fas fa-radio', targetAudience: 'Mainstream' },
  { id: 'digital', name: 'Digital Ads', description: 'Social media, streaming, and search advertising', minBudget: 500, maxBudget: 12000, effectiveness: 92, icon: 'fas fa-ad', targetAudience: 'Online' },
  { id: 'pr', name: 'PR Campaign', description: 'Press coverage, interviews, and media relations', minBudget: 1500, maxBudget: 8000, effectiveness: 78, icon: 'fas fa-newspaper', targetAudience: 'Industry' },
  { id: 'influencer', name: 'Influencer Marketing', description: 'Social media influencer partnerships and content', minBudget: 800, maxBudget: 6000, effectiveness: 88, icon: 'fas fa-users', targetAudience: 'Social' }
];

const SEASONAL_TIMING: SeasonalTiming[] = [
  { 
    id: 'q1', 
    name: 'Q1 (Jan-Mar)', 
    description: 'Post-holiday period, lower competition, reduced marketing costs', 
    multiplier: 0.85, 
    isOptimal: false,
    marketingCostMultiplier: 0.85,
    competitionLevel: 'Low'
  },
  { 
    id: 'q2', 
    name: 'Q2 (Apr-Jun)', 
    description: 'Spring/Summer prep, moderate activity, standard costs', 
    multiplier: 0.95, 
    isOptimal: false,
    marketingCostMultiplier: 0.95,
    competitionLevel: 'Medium'
  },
  { 
    id: 'q3', 
    name: 'Q3 (Jul-Sep)', 
    description: 'Summer season, competitive market, elevated costs', 
    multiplier: 0.90, 
    isOptimal: false,
    marketingCostMultiplier: 1.1,
    competitionLevel: 'High'
  },
  { 
    id: 'q4', 
    name: 'Q4 (Oct-Dec)', 
    description: 'Holiday peak sales, premium marketing costs, maximum competition', 
    multiplier: 1.25, 
    isOptimal: true,
    marketingCostMultiplier: 1.4,
    competitionLevel: 'Maximum'
  }
];

// Auto-detect seasonal window from month
const getSeasonFromMonth = (month: number): string => {
  if (month <= 3) return 'q1';
  if (month <= 6) return 'q2';
  if (month <= 9) return 'q3';
  return 'q4';
};

export default function PlanReleasePage() {
  const [, setLocation] = useLocation();
  const { gameState, loadGame } = useGameStore();
  
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
  const [releaseTitle, setReleaseTitle] = useState('');
  const [releaseMonth, setReleaseMonth] = useState(6);
  
  // Marketing budget allocation per channel
  const [channelBudgets, setChannelBudgets] = useState<Record<string, number>>({
    radio: 0,
    digital: 2000,
    pr: 0,
    influencer: 1000
  });
  
  // Lead single timing (for multi-song releases)
  const [leadSingleMonth, setLeadSingleMonth] = useState(5); // Default 1 month before main release
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
  useEffect(() => {
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
        scheduledReleaseMonth: releaseMonth,
        marketingBudget: channelBudgets,
        leadSingleStrategy: releaseType !== 'single' && leadSingle ? {
          leadSingleId: leadSingle,
          leadSingleReleaseMonth: leadSingleMonth,
          leadSingleBudget,
          totalLeadSingleBudget: Object.values(leadSingleBudget).reduce((a, b) => a + b, 0)
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
  }, [selectedArtist, selectedSongs, releaseType, channelBudgets, releaseMonth, leadSingle, leadSingleBudget, leadSingleMonth]);

  // Use preview data or fallback to default values
  const metrics = previewData || {
    songCount: selectedSongs.length,
    averageQuality: 0,
    estimatedStreams: 0,
    estimatedRevenue: 0,
    releaseBonus: 0,
    seasonalMultiplier: 1,
    marketingMultiplier: 1,
    leadSingleBoost: 1,
    totalMarketingCost: 
      Object.values(channelBudgets).reduce((a, b) => a + b, 0) * 
        (SEASONAL_TIMING.find(s => s.id === getSeasonFromMonth(releaseMonth))?.marketingCostMultiplier || 1) +
      Object.values(leadSingleBudget).reduce((a, b) => a + b, 0) * 
        (SEASONAL_TIMING.find(s => s.id === getSeasonFromMonth(leadSingleMonth))?.marketingCostMultiplier || 1),
    diversityBonus: 1,
    activeChannelCount: 0,
    channelEffectiveness: {},
    projectedROI: 0
  };

  // Validation
  const validateRelease = () => {
    const errors: string[] = [];
    const totalMarketingCost = metrics.totalMarketingCost;
    const activeChannels = MARKETING_CHANNELS.filter(channel => (channelBudgets[channel.id] || 0) > 0);
    
    if (!selectedArtist) errors.push('Please select an artist');
    if (selectedSongs.length === 0) errors.push('Please select at least one song');
    if (!releaseTitle.trim()) errors.push('Please enter a release title');
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
      if (leadSingleMonth >= releaseMonth) {
        errors.push('Lead single must release before the main release');
      }
      if (releaseMonth - leadSingleMonth > 3) {
        errors.push('Lead single should release no more than 3 months before main release');
      }
      if (Object.values(leadSingleBudget).reduce((a, b) => a + b, 0) === 0) {
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
        scheduledReleaseMonth: releaseMonth,
        marketingBudget: channelBudgets,
        leadSingleStrategy: releaseType !== 'single' && leadSingle ? {
          leadSingleId: leadSingle,
          leadSingleReleaseMonth: leadSingleMonth,
          leadSingleBudget,
          totalLeadSingleBudget: Object.values(leadSingleBudget).reduce((a, b) => a + b, 0)
        } : null,
        metadata: {
          estimatedStreams: metrics.estimatedStreams,
          estimatedRevenue: metrics.estimatedRevenue,
          releaseBonus: metrics.releaseBonus,
          seasonalMultiplier: metrics.seasonalMultiplier,
          marketingMultiplier: metrics.marketingMultiplier,
          leadSingleBoost: metrics.leadSingleBoost,
          channelEffectiveness: metrics.channelEffectiveness,
          projectedROI: metrics.projectedROI,
          totalInvestment: metrics.totalMarketingCost
        }
      };
      
      const response = await apiRequest('POST', 
        `/api/game/${gameState?.id}/releases/plan`, releaseData);
      const result = await response.json();
      
      // Success - refresh game data and redirect to dashboard
      alert('Release planned successfully! You can view it in your project pipeline.');
      
      // Refresh game data to load the new planned release
      if (gameState?.id) {
        await loadGame(gameState.id);
      }
      
      setLocation('/');
      
    } catch (error: any) {
      console.error('Failed to create release:', error);
      
      // Handle specific error types
      if (error.status === 402) {
        setValidationErrors(['Insufficient funds for total marketing budget']);
      } else if (error.status === 409) {
        const details = error.details || {};
        if (details.conflicts) {
          setValidationErrors(details.conflicts.map((c: any) => c.description));
        } else {
          setValidationErrors(['Song scheduling conflict detected']);
        }
      } else if (error.status === 400) {
        const details = error.details || [];
        setValidationErrors(details.map((d: any) => d.issue || d.message || 'Validation error'));
      } else {
        setValidationErrors(['Failed to create release. Please try again.']);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 90) return 'text-green-600 bg-green-100';
    if (quality >= 80) return 'text-blue-600 bg-blue-100';
    if (quality >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Button>
              <div className="h-6 w-px bg-slate-300" />
              <h1 className="text-xl font-bold text-slate-900">Plan Release</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-lg">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-mono font-semibold">${(gameState?.money || 0).toLocaleString()}</span>
              </div>
              <div className="text-sm text-slate-600">Month {gameState?.currentMonth || 1}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                {loadingArtists ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
                    <p className="text-slate-600">Loading available artists...</p>
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
                    <Users className="w-8 h-8 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">No artists with ready songs found</p>
                    <p className="text-sm text-slate-500 mt-2">Artists need recorded songs to plan releases</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {artists.map(artist => (
                      <div
                        key={artist.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedArtist === artist.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => {
                          setSelectedArtist(artist.id);
                          setSelectedSongs([]);
                          setLeadSingle('');
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-slate-900">{artist.name}</h3>
                          <Badge variant="outline" className="text-xs">{artist.genre}</Badge>
                        </div>
                        <div className="space-y-1 text-sm text-slate-600">
                          <div className="flex justify-between">
                            <span>Ready Songs:</span>
                            <span className="font-mono font-semibold text-green-600">{artist.readySongs}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Mood:</span>
                            <span className="font-mono font-semibold">{artist.mood}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Loyalty:</span>
                            <span className="font-mono font-semibold">{artist.loyalty}%</span>
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
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Music className="w-5 h-5" />
                    <span>Select Songs</span>
                    <Badge variant="secondary">{selectedSongs.length} selected</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSongs ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
                      <p className="text-slate-600">Loading available songs...</p>
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
                      <Music className="w-8 h-8 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No ready songs found for this artist</p>
                      <p className="text-sm text-slate-500 mt-2">Songs must be recorded but not yet released</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableSongs.map(song => (
                        <div
                          key={song.id}
                          className={`p-4 border rounded-lg transition-all ${
                            selectedSongs.includes(song.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
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
                                <h4 className="font-semibold text-slate-900">{song.title}</h4>
                                <div className="flex items-center space-x-2">
                                  <Badge className={`text-xs ${getQualityColor(song.quality)}`}>
                                    {song.quality} Quality
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">{song.mood}</Badge>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-slate-600">
                                <span>Est. {song.estimatedStreams.toLocaleString()} streams</span>
                                <span>Est. ${song.estimatedRevenue.toLocaleString()} revenue</span>
                                <span>Created Month {song.createdMonth}</span>
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
                            {song.title} (Quality: {song.quality})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-slate-600 mt-2">
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
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-700 mb-2">Selected Lead Single</h4>
                    <p className="text-sm text-blue-600">
                      {availableSongs.find(s => s.id === leadSingle)?.title || 'No lead single selected'}
                    </p>
                    <p className="text-xs text-blue-500 mt-1">
                      This single will build momentum for the full {releaseType} release
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-600 mb-1 block">
                        Lead Single Release
                        <span className="ml-2 text-orange-600">
                          ({SEASONAL_TIMING.find(s => s.id === getSeasonFromMonth(leadSingleMonth))?.name} - {(() => {
                            const multiplier = SEASONAL_TIMING.find(s => s.id === getSeasonFromMonth(leadSingleMonth))?.marketingCostMultiplier || 1;
                            const percentage = Math.round((multiplier - 1) * 100);
                            return percentage > 0 ? `+${percentage}%` : `${percentage}%`;
                          })()} cost)
                        </span>
                      </label>
                      <Select value={leadSingleMonth.toString()} onValueChange={(value) => setLeadSingleMonth(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: Math.min(6, releaseMonth - (gameState?.currentMonth || 1)) }, (_, i) => {
                            const month = (gameState?.currentMonth || 1) + i + 1;
                            return month < releaseMonth ? (
                              <SelectItem key={month} value={month.toString()}>
                                Month {month}
                              </SelectItem>
                            ) : null;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 mb-1 block">Main Release</label>
                      <div className="p-2 bg-slate-100 rounded border text-sm text-slate-700">
                        Month {releaseMonth}
                      </div>
                    </div>
                  </div>

                  {/* Lead Single Marketing Budget */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Lead Single Marketing Budget</h4>
                    <div className="space-y-3">
                      {MARKETING_CHANNELS.map(channel => (
                        <div key={`lead-${channel.id}`} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <i className={`${channel.icon} text-sm text-slate-600`} />
                            <span className="text-sm text-slate-700">{channel.name}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-xs text-slate-500 w-16">
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
                    <div className="mt-2 text-xs text-slate-500">
                      <div>Lead Single Total: ${Object.values(leadSingleBudget).reduce((a, b) => a + b, 0).toLocaleString()}</div>
                      {SEASONAL_TIMING.find(s => s.id === getSeasonFromMonth(leadSingleMonth))?.marketingCostMultiplier !== 1 && (
                        <div className="text-orange-600">
                          Adjusted for {SEASONAL_TIMING.find(s => s.id === getSeasonFromMonth(leadSingleMonth))?.name}: ${Math.round(Object.values(leadSingleBudget).reduce((a, b) => a + b, 0) * (SEASONAL_TIMING.find(s => s.id === getSeasonFromMonth(leadSingleMonth))?.marketingCostMultiplier || 1)).toLocaleString()}
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
                      <h4 className="text-sm font-medium text-slate-700">Budget Allocation</h4>
                      <span className="text-sm font-mono font-semibold text-blue-600">
                        Total: ${Object.values(channelBudgets).reduce((a, b) => a + b, 0).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {MARKETING_CHANNELS.map(channel => {
                        const budget = channelBudgets[channel.id] || 0;
                        const isActive = budget > 0;
                        const effectiveness = metrics.channelEffectiveness?.[channel.id];
                        
                        return (
                          <div key={channel.id} className={`p-4 border rounded-lg transition-all ${
                            isActive ? 'border-blue-300 bg-blue-50' : 'border-slate-200'
                          }`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <i className={`${channel.icon} text-lg ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                                <div>
                                  <h5 className="font-semibold text-slate-900">{channel.name}</h5>
                                  <p className="text-xs text-slate-600">{channel.description}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-slate-900">${budget.toLocaleString()}</div>
                                <div className="text-xs text-slate-500">{effectiveness?.contribution ? effectiveness.contribution.toFixed(1) : 0}% of budget</div>
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
                              <div className="flex justify-between text-xs text-slate-500">
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
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Release Timing</h4>
                    <div>
                      <div>
                        <label className="text-xs text-slate-600 mb-1 block">
                          Target Month 
                          <span className="ml-2 text-orange-600">
                            ({SEASONAL_TIMING.find(s => s.id === getSeasonFromMonth(releaseMonth))?.name} - {(() => {
                              const multiplier = SEASONAL_TIMING.find(s => s.id === getSeasonFromMonth(releaseMonth))?.marketingCostMultiplier || 1;
                              const percentage = Math.round((multiplier - 1) * 100);
                              return percentage > 0 ? `+${percentage}%` : `${percentage}%`;
                            })()} cost)
                          </span>
                        </label>
                        <Select value={releaseMonth.toString()} onValueChange={(value) => setReleaseMonth(parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 8 }, (_, i) => {
                              const month = (gameState?.currentMonth || 1) + i + 1;
                              return month <= 36 ? (
                                <SelectItem key={month} value={month.toString()}>
                                  Month {month}
                                </SelectItem>
                              ) : null;
                            })}
                          </SelectContent>
                        </Select>
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
                    {React.createElement(RELEASE_TYPES.find(rt => rt.id === releaseType)?.icon || Music, { className: "w-5 h-5" })}
                    <span>{RELEASE_TYPES.find(rt => rt.id === releaseType)?.name} Release</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Release Title</label>
                      <input
                        type="text"
                        value={releaseTitle}
                        onChange={(e) => setReleaseTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        placeholder="Enter release title"
                      />
                    </div>
                    
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Release Bonus</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">
                          {RELEASE_TYPES.find(rt => rt.id === releaseType)?.bonusType}
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          +{RELEASE_TYPES.find(rt => rt.id === releaseType)?.bonusAmount}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {RELEASE_TYPES.find(rt => rt.id === releaseType)?.description}
                      </p>
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
                    {calculatingPreview && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
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
                      <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
                      <p className="text-slate-600">Calculating release metrics...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="text-xl font-bold text-slate-900">{metrics.songCount}</div>
                        <div className="text-slate-600">Songs</div>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="text-xl font-bold text-slate-900">{metrics.averageQuality}</div>
                        <div className="text-slate-600">Avg Quality</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Estimated Streams:</span>
                        <span className="font-mono font-semibold text-blue-600">
                          {metrics.estimatedStreams.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Estimated Revenue:</span>
                        <span className="font-mono font-semibold text-green-600">
                          ${metrics.estimatedRevenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Marketing Cost:</span>
                        <span className="font-mono font-semibold text-red-600">
                          -${metrics.totalMarketingCost.toLocaleString()}
                        </span>
                      </div>
                      <div className="border-t pt-3 flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-700">Projected ROI:</span>
                        <span className={`font-mono font-bold ${
                          metrics.projectedROI > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {metrics.projectedROI > 0 ? '+' : ''}{metrics.projectedROI}%
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Multipliers Applied</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Release Bonus:</span>
                            <span className="font-mono">+{metrics.releaseBonus}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Seasonal Revenue:</span>
                            <span className="font-mono">
                              {metrics.seasonalMultiplier > 1 ? '+' : ''}{Math.round((metrics.seasonalMultiplier - 1) * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Marketing:</span>
                            <span className="font-mono">
                              +{Math.round((metrics.marketingMultiplier - 1) * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Channel Diversity:</span>
                            <span className="font-mono text-blue-600">
                              +{Math.round((metrics.diversityBonus - 1) * 100)}% ({metrics.activeChannelCount} channels)
                            </span>
                          </div>
                          {releaseType !== 'single' && leadSingle && metrics.leadSingleBoost > 1 && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Lead Single Boost:</span>
                              <span className="font-mono text-purple-600">
                                +{Math.round((metrics.leadSingleBoost - 1) * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Marketing Channel Breakdown */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Marketing Breakdown</h4>
                        <div className="space-y-1 text-xs">
                          {MARKETING_CHANNELS.map(channel => {
                            const budget = channelBudgets[channel.id] || 0;
                            const effectiveness = metrics.channelEffectiveness?.[channel.id];
                            const adjustedBudget = effectiveness?.adjustedBudget || budget;
                            const seasonalCostChange = adjustedBudget - budget;
                            
                            return budget > 0 ? (
                              <div key={channel.id} className="flex justify-between">
                                <span className="text-slate-600 flex items-center space-x-1">
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
                          {releaseType !== 'single' && leadSingle && Object.values(leadSingleBudget).reduce((a, b) => a + b, 0) > 0 && (
                            <div className="flex justify-between border-t pt-1">
                              <span className="text-slate-600">Lead Single Budget:</span>
                              <div className="text-right font-mono text-purple-600">
                                <div>${Math.round(Object.values(leadSingleBudget).reduce((a, b) => a + b, 0) * (SEASONAL_TIMING.find(s => s.id === getSeasonFromMonth(leadSingleMonth))?.marketingCostMultiplier || 1)).toLocaleString()}</div>
                                {SEASONAL_TIMING.find(s => s.id === getSeasonFromMonth(leadSingleMonth))?.marketingCostMultiplier !== 1 && (
                                  <div className="text-xs text-orange-600">
                                    +${Math.round(Object.values(leadSingleBudget).reduce((a, b) => a + b, 0) * ((SEASONAL_TIMING.find(s => s.id === getSeasonFromMonth(leadSingleMonth))?.marketingCostMultiplier || 1) - 1)).toLocaleString()} seasonal
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
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
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

                <p className="text-xs text-slate-500 text-center mt-2">
                  This will schedule the release and deduct the marketing budget from your funds.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}