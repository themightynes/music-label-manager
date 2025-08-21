import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Music, Calendar, DollarSign, Target, TrendingUp, Users, Star, Award, Play, Check } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useLocation } from 'wouter';

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

// Mock data
const MOCK_ARTISTS: Artist[] = [
  { id: '1', name: 'Luna Starr', genre: 'Pop', readySongs: 4, totalSongs: 6, mood: 85, loyalty: 70 },
  { id: '2', name: 'Echo Rebellion', genre: 'Rock', readySongs: 3, totalSongs: 5, mood: 75, loyalty: 80 },
  { id: '3', name: 'Neon Dreams', genre: 'Electronic', readySongs: 2, totalSongs: 4, mood: 90, loyalty: 65 }
];

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

export default function PlanReleasePage() {
  const [, setLocation] = useLocation();
  const { gameState } = useGameStore();
  
  // Release planning state
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [leadSingle, setLeadSingle] = useState<string>('');
  const [releaseType, setReleaseType] = useState<'single' | 'ep' | 'album' | null>(null);
  const [releaseTitle, setReleaseTitle] = useState('');
  const [seasonalTiming, setSeasonalTiming] = useState('q4');
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

  // Load available songs for selected artist
  const availableSongs = selectedArtist 
    ? MOCK_SONGS.filter(song => song.artistId === selectedArtist && song.isRecorded && !song.isReleased)
    : [];

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
          const artistName = MOCK_ARTISTS.find(a => a.id === selectedArtist)?.name || '';
          setReleaseTitle(`${artistName} ${releaseType.toUpperCase()}`);
        }
      }
    }
  }, [selectedSongs, releaseType, selectedArtist, availableSongs]);

  // Calculate weighted marketing effectiveness based on channel allocation
  const calculateMarketingEffectiveness = (budgets: Record<string, number>, seasonalTiming: string) => {
    const totalBudget = Object.values(budgets).reduce((sum, budget) => sum + budget, 0);
    if (totalBudget === 0) return { multiplier: 1, adjustedCost: 0, diversityBonus: 1 }; // No marketing = baseline
    
    // Apply seasonal cost adjustments
    const seasonalData = SEASONAL_TIMING.find(st => st.id === seasonalTiming);
    const seasonalCostMultiplier = seasonalData?.marketingCostMultiplier || 1;
    const adjustedTotalCost = totalBudget * seasonalCostMultiplier;
    
    // Calculate weighted effectiveness: (channelBudget * channelEffectiveness) / totalBudget for each channel
    let weightedEffectiveness = 0;
    const activeChannels = MARKETING_CHANNELS.filter(channel => (budgets[channel.id] || 0) > 0);
    
    MARKETING_CHANNELS.forEach(channel => {
      const channelBudget = budgets[channel.id] || 0;
      if (channelBudget > 0) {
        const weight = channelBudget / totalBudget;
        const effectiveness = channel.effectiveness / 100; // Convert percentage to decimal
        weightedEffectiveness += weight * effectiveness;
      }
    });
    
    // Channel diversity bonus (prevents single-channel optimization)
    const diversityBonus = Math.min(1 + (activeChannels.length - 1) * 0.06, 1.24); // Up to 24% bonus for 4 channels
    
    // Enhanced diminishing returns formula (less punitive)
    const budgetMultiplier = Math.pow(totalBudget / 5000, 0.6); // Gentler curve than sqrt
    const finalMultiplier = 1 + (weightedEffectiveness * budgetMultiplier * diversityBonus * 0.9); // Increased effectiveness cap
    
    return {
      multiplier: Math.min(finalMultiplier, 2.5), // Increased cap to 250%
      adjustedCost: adjustedTotalCost,
      diversityBonus,
      activeChannelCount: activeChannels.length
    };
  };

  // Calculate release metrics with enhanced marketing logic
  const calculateReleaseMetrics = () => {
    const songs = availableSongs.filter(song => selectedSongs.includes(song.id));
    const totalQuality = songs.reduce((sum, song) => sum + song.quality, 0);
    const averageQuality = songs.length > 0 ? totalQuality / songs.length : 0;
    
    const baseStreams = songs.reduce((sum, song) => sum + song.estimatedStreams, 0);
    const baseRevenue = songs.reduce((sum, song) => sum + song.estimatedRevenue, 0);
    
    // Apply release type bonus
    const releaseBonus = releaseType ? RELEASE_TYPES.find(rt => rt.id === releaseType)?.bonusAmount || 0 : 0;
    const releaseBonusMultiplier = 1 + (releaseBonus / 100);
    
    // Apply seasonal multiplier
    const seasonal = SEASONAL_TIMING.find(st => st.id === seasonalTiming)?.multiplier || 1;
    
    // Calculate marketing effectiveness with enhanced system
    const marketingData = calculateMarketingEffectiveness(channelBudgets, seasonalTiming);
    
    // Enhanced lead single boost with diminishing returns
    let leadSingleBoost = 1;
    let leadSingleData = { multiplier: 1, adjustedCost: 0, diversityBonus: 1, activeChannelCount: 0 };
    
    if (releaseType !== 'single' && leadSingle) {
      const leadSingleBudgetTotal = Object.values(leadSingleBudget).reduce((sum, budget) => sum + budget, 0);
      if (leadSingleBudgetTotal > 0) {
        leadSingleData = calculateMarketingEffectiveness(leadSingleBudget, seasonalTiming);
        // Enhanced lead single effectiveness (50% instead of 30%)
        const leadSingleEffectivenessContribution = Math.min(
          (leadSingleData.multiplier - 1) * 0.5,
          (leadSingleBudgetTotal / 8000) * 0.4 // Diminishing returns based on budget
        );
        leadSingleBoost = 1 + leadSingleEffectivenessContribution;
      }
    }
    
    const finalStreams = Math.round(
      baseStreams * 
      releaseBonusMultiplier * 
      seasonal * 
      marketingData.multiplier * 
      leadSingleBoost
    );
    
    const finalRevenue = Math.round(
      baseRevenue * 
      releaseBonusMultiplier * 
      seasonal * 
      marketingData.multiplier * 
      leadSingleBoost
    );
    
    const totalMarketingCost = marketingData.adjustedCost + leadSingleData.adjustedCost;
    
    return {
      songCount: songs.length,
      averageQuality: Math.round(averageQuality),
      estimatedStreams: finalStreams,
      estimatedRevenue: finalRevenue,
      releaseBonus,
      seasonalMultiplier: seasonal,
      marketingMultiplier: marketingData.multiplier,
      leadSingleBoost,
      totalMarketingCost,
      diversityBonus: marketingData.diversityBonus,
      activeChannelCount: marketingData.activeChannelCount,
      channelEffectiveness: Object.fromEntries(
        MARKETING_CHANNELS.map(channel => [
          channel.id, 
          {
            budget: channelBudgets[channel.id] || 0,
            adjustedBudget: (channelBudgets[channel.id] || 0) * (SEASONAL_TIMING.find(st => st.id === seasonalTiming)?.marketingCostMultiplier || 1),
            effectiveness: channel.effectiveness,
            contribution: ((channelBudgets[channel.id] || 0) / Math.max(1, Object.values(channelBudgets).reduce((a, b) => a + b, 0))) * 100
          }
        ])
      ),
      projectedROI: totalMarketingCost > 0 ? Math.round(((finalRevenue - totalMarketingCost) / totalMarketingCost) * 100) : 0
    };
  };

  const metrics = calculateReleaseMetrics();

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
    
    /*
    API CALL SPECIFICATION:
    
    Endpoint: POST /api/game/{gameId}/releases/plan
    Method: POST
    Headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {sessionToken}' // if using token auth
    }
    
    Request Body: {
      artistId: string;
      title: string;
      type: 'single' | 'ep' | 'album';
      songIds: string[];
      leadSingleId?: string; // for multi-song releases
      seasonalTiming: string;
      scheduledReleaseMonth: number;
      
      // Enhanced marketing budget allocation per channel
      marketingBudget: {
        radio: number;
        digital: number;
        pr: number;
        influencer: number;
      };
      totalMarketingBudget: number; // sum of all channel budgets
      
      // Lead single strategy (for EP/Album releases)
      leadSingleStrategy?: {
        leadSingleId: string;
        leadSingleReleaseMonth: number;
        leadSingleBudget: {
          radio: number;
          digital: number;
          pr: number;
          influencer: number;
        };
        totalLeadSingleBudget: number;
      };
      
      // Enhanced metadata with real-world calculations
      metadata: {
        estimatedStreams: number;
        estimatedRevenue: number;
        releaseBonus: number;
        seasonalMultiplier: number;
        marketingMultiplier: number;
        leadSingleBoost?: number;
        channelEffectiveness: Record<string, {
          budget: number;
          effectiveness: number;
          contribution: number;
        }>;
        projectedROI: number;
        totalInvestment: number; // main release + lead single budgets
      }
    }
    
    Expected Response (Success - 201):
    {
      success: true;
      release: {
        id: string;
        title: string;
        type: string;
        artistId: string;
        artistName: string;
        songIds: string[];
        leadSingleId?: string;
        scheduledReleaseMonth: number;
        status: 'planned';
        
        // Enhanced marketing data
        marketingStrategy: {
          channelAllocation: Record<string, number>;
          totalBudget: number;
          estimatedEffectiveness: number;
          targetAudiences: string[];
        };
        
        // Lead single data (if applicable)
        leadSingleStrategy?: {
          leadSingleId: string;
          releaseMonth: number;
          budget: Record<string, number>;
          totalBudget: number;
        };
        
        estimatedMetrics: {
          streams: number;
          revenue: number;
          roi: number;
          breakEvenMonths: number;
          chartPotential: number;
        };
        
        createdAt: string;
        plannedBy: string; // user ID
      };
      
      updatedGameState: {
        money: number; // reduced by total marketing investment
        plannedReleases: Array<{
          id: string;
          title: string;
          type: string;
          artistName: string;
          scheduledMonth: number;
          leadSingleMonth?: number;
          totalInvestment: number;
          status: 'planned';
        }>;
      };
      
      // Lead single release created automatically
      leadSingleRelease?: {
        id: string;
        title: string;
        type: 'single';
        scheduledMonth: number;
        parentReleaseId: string;
      };
    }
    
    Error Responses:
    400 Bad Request: {
      error: 'VALIDATION_ERROR';
      message: 'Release validation failed';
      details: Array<{
        field: string;
        issue: string;
        currentValue?: any;
        expectedValue?: any;
      }>;
    }
    
    402 Payment Required: {
      error: 'INSUFFICIENT_FUNDS';
      message: 'Not enough money for total marketing investment';
      required: number;
      available: number;
      breakdown: {
        mainReleaseBudget: number;
        leadSingleBudget: number;
        totalRequired: number;
      };
    }
    
    409 Conflict: {
      error: 'SCHEDULING_CONFLICT';
      message: 'Release scheduling conflicts detected';
      conflicts: Array<{
        type: 'SONG_ALREADY_SCHEDULED' | 'ARTIST_OVERBOOKED' | 'TIMELINE_CONFLICT';
        description: string;
        affectedResources: string[];
        suggestedResolution?: string;
      }>;
    }
    
    422 Unprocessable Entity: {
      error: 'BUSINESS_RULE_VIOLATION';
      message: 'Release violates business rules';
      violations: Array<{
        rule: 'LEAD_SINGLE_TIMING' | 'MARKETING_ALLOCATION' | 'BUDGET_LIMITS';
        description: string;
        severity: 'warning' | 'error';
        canOverride: boolean;
      }>;
    }
    */
    
    // Mock API delay
    setTimeout(() => {
      setIsLoading(false);
      // Simulate success
      alert('Release planned successfully! You can view it in your project pipeline.');
      setLocation('/');
    }, 2000);
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {MOCK_ARTISTS.map(artist => (
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
                      <label className="text-xs text-slate-600 mb-1 block">Lead Single Release</label>
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
                      Lead Single Total: ${Object.values(leadSingleBudget).reduce((a, b) => a + b, 0).toLocaleString()}
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
                        const effectiveness = metrics.channelEffectiveness[channel.id];
                        
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
                                <div className="text-xs text-slate-500">{effectiveness?.contribution.toFixed(1) || 0}% of budget</div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-600 mb-1 block">Seasonal Window</label>
                        <Select value={seasonalTiming} onValueChange={setSeasonalTiming}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SEASONAL_TIMING.map(season => (
                              <SelectItem key={season.id} value={season.id}>
                                <div className="flex items-center space-x-2">
                                  <span>{season.name}</span>
                                  {season.isOptimal && <Star className="w-3 h-3 text-yellow-500" />}
                                  <span className="text-xs text-slate-500">
                                    ({season.multiplier > 1 ? '+' : ''}{Math.round((season.multiplier - 1) * 100)}%)
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-600 mb-1 block">Target Month</label>
                        <Select value={releaseMonth.toString()} onValueChange={(value) => setReleaseMonth(parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 8 }, (_, i) => {
                              const month = (gameState?.currentMonth || 1) + i + 1;
                              return month <= 12 ? (
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
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                            const effectiveness = metrics.channelEffectiveness[channel.id];
                            const adjustedBudget = effectiveness?.adjustedBudget || budget;
                            const seasonalCostChange = adjustedBudget - budget;
                            
                            return budget > 0 ? (
                              <div key={channel.id} className="flex justify-between">
                                <span className="text-slate-600 flex items-center space-x-1">
                                  <i className={`${channel.icon} text-xs`} />
                                  <span>{channel.name}:</span>
                                </span>
                                <div className="text-right font-mono">
                                  <div>${adjustedBudget.toLocaleString()} ({effectiveness?.contribution.toFixed(1)}%)</div>
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
                              <span className="font-mono text-purple-600">
                                ${Object.values(leadSingleBudget).reduce((a, b) => a + b, 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
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