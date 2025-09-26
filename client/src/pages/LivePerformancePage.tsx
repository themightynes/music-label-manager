import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { MapPin, Music, Calendar, Users, DollarSign, AlertCircle, Info, Target, TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react';
import type { GameState } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useGameStore } from '@/store/gameStore';
import GameLayout from '@/layouts/GameLayout';


export interface TourCreationData {
  title: string;
  type: 'single_show' | 'mini_tour';
  artistId: string;
  budget: number;
  cities: number;
  venueAccess?: string; // Capture current venue access for historical tracking
  venueCapacity?: number; // PHASE 3: Selected venue capacity
  // TODO: Add venue selection when venue booking system is implemented
  // TODO: Add date selection when calendar system is implemented
}

interface CityBreakdown {
  cityNumber: number;
  venueCapacity: number;
  sellThroughRate: number;
  ticketRevenue: number;
  merchRevenue: number;
  totalRevenue: number;
  venueFee: number;
  productionFee: number;
  marketingCost: number;
  totalCosts: number;
  profit: number;
}

interface SellThroughAnalysis {
  baseRate: number;
  reputationBonus: number;
  popularityBonus: number;
  budgetQualityBonus: number;
  finalRate: number;
}

interface TourEstimate {
  estimatedRevenue: number;
  totalCosts: number;
  estimatedProfit: number;
  roi: number;
  canAfford: boolean;
  breakdown: {
    totalCosts: number;
    venueFees: number;
    productionFees: number;
    marketingBudget: number;
    breakdown: {
      venueFeePerCity: number;
      productionFeePerCity: number;
      marketingBudgetPerCity: number;
    };
  };
  sellThroughRate: number;
  totalBudget?: number;
  // ENHANCED: Rich breakdown data from FinancialSystem
  cities?: CityBreakdown[];
  sellThroughAnalysis?: SellThroughAnalysis;
  venueCapacity?: number;
  // PHASE 2 ENHANCEMENTS: New fields from enhanced API
  selectedCapacity?: number;
  tierRange?: { min: number; max: number };
  pricePerTicket?: number;
  playerTier?: string;
  venueCategory?: {
    category: string;
    description: string;
    riskLevel: 'low'|'medium'|'high';
    advice: string;
  };
}

// Performance types - costs now calculated dynamically using venue_capacity * 4 + user budget
const PERFORMANCE_TYPES = [
  {
    id: 'single_show' as const,
    name: 'Single Show',
    icon: Music,
    description: 'One-time performance at a venue',
    duration: '1 night',
    minCities: 1,
    maxCities: 1,
    defaultCities: 1
  },
  {
    id: 'mini_tour' as const,
    name: 'Mini Tour',
    icon: MapPin,
    description: 'Small tour across multiple cities',
    duration: '1-2 weeks',
    minCities: 3,
    maxCities: 8,
    defaultCities: 3
  }
];

export default function LivePerformancePage() {
  const [, setLocation] = useLocation();
  const { gameState, artists, projects, createProject } = useGameStore();
  const [isCreating, setIsCreating] = useState(false);

  const [selectedType, setSelectedType] = useState<'single_show' | 'mini_tour' | null>(null);

  // Get artistId from URL params if provided
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedArtistId = urlParams.get('artistId');
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [title, setTitle] = useState('');
  const [budgetPerCity, setBudgetPerCity] = useState(0);
  const [cities, setCities] = useState(1);
  const [tourConfig, setTourConfig] = useState<any>(null);
  const [venueAccessConfig, setVenueAccessConfig] = useState<any>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [selectedCapacity, setSelectedCapacity] = useState<number>(500); // Default capacity

  const currentMoney = gameState?.money || 75000;
  const currentVenueAccess = gameState?.venueAccess || 'none';
  const selectedPerformanceType = PERFORMANCE_TYPES.find(type => type.id === selectedType);

  // Handle URL parameter for artist pre-selection
  useEffect(() => {
    if (preselectedArtistId && !selectedArtist) {
      setSelectedArtist(preselectedArtistId);
      const artist = artists?.find(a => a.id === preselectedArtistId);
      if (artist && selectedType) {
        const titleSuffix = selectedType === 'single_show' ? 'Live' : 'Tour';
        setTitle(`${artist.name} ${titleSuffix}`);
      }
    }
  }, [preselectedArtistId, selectedArtist, artists, selectedType]);

  // Load configuration from both markets.json and progression.json
  useEffect(() => {
    const loadConfigurations = async () => {
      try {
        // Load tour revenue config from markets.json
        const marketsResponse = await fetch('/data/balance/markets.json');
        if (!marketsResponse.ok) {
          throw new Error(`Failed to fetch markets.json: ${marketsResponse.status} ${marketsResponse.statusText}`);
        }
        const marketsData = await marketsResponse.json();
        const tourRevenue = marketsData.market_formulas.tour_revenue;
        setTourConfig({
          sell_through_base: tourRevenue.sell_through_base,
          reputation_modifier: tourRevenue.reputation_modifier,
          local_popularity_weight: tourRevenue.local_popularity_weight,
          merch_percentage: tourRevenue.merch_percentage,
          ticket_price_base: tourRevenue.ticket_price_base,
          ticket_price_per_capacity: tourRevenue.ticket_price_per_capacity
        });

        // Load venue access config from progression.json
        const progressionResponse = await fetch('/data/balance/progression.json');
        if (!progressionResponse.ok) {
          throw new Error(`Failed to fetch progression.json: ${progressionResponse.status} ${progressionResponse.statusText}`);
        }
        const progressionData = await progressionResponse.json();
        const venueAccess = progressionData.access_tier_system.venue_access;
        setVenueAccessConfig(venueAccess);
      } catch (error) {
        console.error('CRITICAL: Failed to load tour configurations:', error);
        setConfigError(`Configuration loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Don't throw - let the component show the error state instead
      }
    };
    loadConfigurations();
  }, []);
  const selectedArtistData = selectedArtist ? artists.find(a => a.id === selectedArtist) : null;

  // Venue access integration using loaded configuration
  const getVenueAccessInfo = () => {
    if (!venueAccessConfig) {
      return { name: 'Loading...', capacity: '---', color: 'text-gray-500', warning: 'Configuration loading...' };
    }

    const tierConfig = venueAccessConfig[currentVenueAccess];
    if (!tierConfig) {
      return { name: 'Unknown Access', capacity: '---', color: 'text-red-500', warning: 'Invalid venue access tier' };
    }

    const [min, max] = tierConfig.capacity_range;
    const formatCapacity = (num: number) => {
      if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
      return num.toString();
    };

    const accessNames = {
      'none': 'No Access',
      'clubs': 'Club Access',
      'theaters': 'Theater Access',
      'arenas': 'Arena Access'
    };

    const accessColors = {
      'none': 'text-red-500',
      'clubs': 'text-green-500',
      'theaters': 'text-blue-500',
      'arenas': 'text-purple-500'
    };

    return {
      name: accessNames[currentVenueAccess as keyof typeof accessNames] || 'Unknown Access',
      capacity: `${formatCapacity(min)}-${formatCapacity(max)}`,
      color: accessColors[currentVenueAccess as keyof typeof accessColors] || 'text-gray-500',
      warning: currentVenueAccess === 'none' ? 'Very limited venue options' : null
    };
  };

  const venueInfo = getVenueAccessInfo();

  // Check for artists with existing active tours
  const getArtistsWithActiveTours = () => {
    return projects
      .filter(project => 
        project.type === 'Mini-Tour' && 
        (project.stage === 'planning' || project.stage === 'production')
      )
      .map(project => project.artistId);
  };

  // Filter available artists (exclude those with active tours)
  const availableArtists = artists.filter(artist => 
    !getArtistsWithActiveTours().includes(artist.id)
  );

  // Get venue capacity for current access tier using loaded configuration
  const getVenueCapacity = () => {
    if (!venueAccessConfig) {
      throw new Error('Venue access configuration not loaded. Cannot calculate capacity.');
    }

    const tierConfig = venueAccessConfig[currentVenueAccess];
    if (!tierConfig?.capacity_range) {
      throw new Error(`Invalid venue access tier: ${currentVenueAccess}`);
    }

    const [min, max] = tierConfig.capacity_range;
    // Use average for consistent preview (backend uses random within range)
    return (min + max) / 2;
  };

  // API Integration - Phase 4: Replace calculations with API calls
  const [estimateData, setEstimateData] = useState<TourEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  // Fetch estimate from API with venueCapacity - PHASE 3 ENHANCEMENT
  const fetchTourEstimate = useCallback(async () => {
    if (!selectedArtist || !budgetPerCity || !gameState?.id) return;

    setEstimateLoading(true);
    setEstimateError(null);

    try {
      const response = await apiRequest('POST', '/api/tour/estimate', {
        artistId: selectedArtist,
        cities,
        budgetPerCity,
        gameId: gameState.id,
        venueCapacity: selectedCapacity,
      });

      const estimate = await response.json();
      setEstimateData(estimate);

    } catch (error) {
      console.error('[TOUR ESTIMATE]', error instanceof Error ? error.message : 'Unknown error');
      setEstimateError(error instanceof Error ? error.message : 'Unknown error');
      setEstimateData(null);
    } finally {
      setEstimateLoading(false);
    }
  }, [selectedArtist, budgetPerCity, cities, gameState?.id, selectedCapacity]); // PHASE 3: Include selectedCapacity in dependency

  // Trigger estimate fetch when parameters change
  useEffect(() => {
    const timeoutId = setTimeout(fetchTourEstimate, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [fetchTourEstimate]);

  // Display comprehensive estimate data - NO CLIENT CALCULATIONS
  const renderEstimate = () => {
    if (estimateLoading) return <div className="text-white/60">Calculating...</div>;
    if (estimateError) return <div className="text-red-400">Error: {estimateError}</div>;
    if (!estimateData) return <div className="text-white/60">Enter tour parameters</div>;

    const hasDetailedData = estimateData.cities && estimateData.sellThroughAnalysis;

    return (
      <div className="space-y-4">
        {/* Phase 3: Enhanced display with capacity-specific data */}
        {estimateData.selectedCapacity && (
          <div className="bg-blue-500/20 rounded p-2 mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-300">Selected Venue Size:</span>
              <span className="font-mono text-blue-100">{estimateData.selectedCapacity.toLocaleString()} capacity</span>
            </div>
            {estimateData.pricePerTicket && (
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-blue-400/80">Ticket Price:</span>
                <span className="font-mono text-blue-200">${estimateData.pricePerTicket}</span>
              </div>
            )}
            {estimateData.playerTier && (
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-blue-400/80">Player Tier:</span>
                <span className="text-blue-200">{estimateData.playerTier}</span>
              </div>
            )}
          </div>
        )}

        {/* High-level summary */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-white/70">Estimated Revenue:</span>
            <span className="font-mono text-green-400">${estimateData.estimatedRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Total Costs:</span>
            <span className="font-mono text-red-400">${estimateData.totalCosts.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span className="text-white">Estimated Profit:</span>
            <span className={`font-mono ${estimateData.estimatedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${estimateData.estimatedProfit.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">ROI:</span>
            <span className="font-mono text-white/80">{estimateData.roi.toFixed(1)}%</span>
          </div>
        </div>

        {/* Enhanced breakdown if available */}
        {hasDetailedData && (
          <>
            {/* Sell-Through Analysis */}
            <div className="bg-black/20 rounded p-3">
              <h5 className="font-medium text-white/90 mb-2">Sell-Through Analysis:</h5>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/60">Base Rate:</span>
                  <span className="font-mono text-white/80">{(estimateData.sellThroughAnalysis!.baseRate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Reputation Bonus:</span>
                  <span className="font-mono text-white/80">+{(estimateData.sellThroughAnalysis!.reputationBonus * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Popularity Bonus:</span>
                  <span className="font-mono text-white/80">+{(estimateData.sellThroughAnalysis!.popularityBonus * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Budget Quality Bonus:</span>
                  <span className="font-mono text-white/80">+{(estimateData.sellThroughAnalysis!.budgetQualityBonus * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between border-t border-white/20 pt-1 font-medium">
                  <span className="text-white/70">Final Sell-Through:</span>
                  <span className="font-mono text-blue-300">{(estimateData.sellThroughAnalysis!.finalRate * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Per City Breakdown */}
            <div className="bg-black/20 rounded p-3">
              <h5 className="font-medium text-white/90 mb-2">Per City Performance:</h5>
              {estimateData.cities!.slice(0, 3).map((city, index) => (
                <div key={city.cityNumber} className="space-y-1 text-xs mb-3">
                  <div className="font-medium text-white/90">City {city.cityNumber}:</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="flex justify-between">
                      <span className="text-white/60">Venue Capacity:</span>
                      <span className="font-mono text-white/80">{city.venueCapacity.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Ticket Revenue:</span>
                      <span className="font-mono text-blue-400">${city.ticketRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Attendance:</span>
                      <span className="font-mono text-white/80">{Math.round(city.venueCapacity * city.sellThroughRate).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Merch Revenue:</span>
                      <span className="font-mono text-blue-400">${city.merchRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Total Costs:</span>
                      <span className="font-mono text-red-400">${city.totalCosts.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-white/70">City Profit:</span>
                      <span className={`font-mono ${city.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${city.profit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {index < Math.min(2, estimateData.cities!.length - 1) && (
                    <div className="border-t border-white/10 mt-2"></div>
                  )}
                </div>
              ))}
              {estimateData.cities!.length > 3 && (
                <div className="text-xs text-white/50 text-center mt-2">
                  ... and {estimateData.cities!.length - 3} more cities with similar performance
                </div>
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="bg-black/20 rounded p-3">
              <h5 className="font-medium text-white/90 mb-2">Cost Breakdown:</h5>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/60">Venue Fees ({cities} cities):</span>
                  <span className="font-mono text-red-400">${estimateData.breakdown.venueFees.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Production Fees ({cities} cities):</span>
                  <span className="font-mono text-red-400">${estimateData.breakdown.productionFees.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Marketing & Logistics:</span>
                  <span className="font-mono text-red-400">${estimateData.breakdown.marketingBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-white/20 pt-1 font-medium">
                  <span className="text-white/70">Total Costs:</span>
                  <span className="font-mono text-red-300">${estimateData.breakdown.totalCosts.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {selectedArtistData && (
              <div className="text-xs text-white/50 mt-2">
                <p>Analysis based on: {selectedArtistData.name}'s popularity ({selectedArtistData.popularity || 0}),
                   venue access ({venueInfo.name}), {gameState?.reputation || 0} reputation, and {cities} {cities === 1 ? 'show' : 'cities'}</p>
                <p className="text-green-500 mt-1">✅ Comprehensive projections powered by unified calculation engine</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // PHASE 3: Capacity range and strategic guidance helpers
  const getCapacityRange = () => {
    if (!venueAccessConfig || !estimateData?.tierRange) {
      return { min: 50, max: 2000 }; // Fallback range
    }
    return estimateData.tierRange;
  };

  const getVenueCategoryInfo = (capacity: number) => {
    // Use venueCategory from API response if available (configuration-driven)
    if (estimateData?.venueCategory) {
      const apiCategory = estimateData.venueCategory;
      return {
        category: apiCategory.category,
        description: apiCategory.description,
        riskLevel: apiCategory.riskLevel,
        icon: apiCategory.riskLevel === 'low' ? Users :
              apiCategory.riskLevel === 'medium' ? Target : TrendingUp,
        advice: apiCategory.advice,
        color: apiCategory.riskLevel === 'low' ? 'text-green-500' :
               apiCategory.riskLevel === 'medium' ? 'text-yellow-500' : 'text-red-500'
      };
    }

    // Temporary fallback - API not loaded yet or missing venueCategory
    // This will help us debug what's happening with the API response
    console.warn('API venueCategory missing, using temporary fallback. EstimateData:', estimateData);
    return {
      category: 'Loading...',
      description: 'Calculating venue category...',
      riskLevel: 'medium' as const,
      icon: Target,
      advice: 'Loading venue analysis from server...',
      color: 'text-gray-400'
    };
  };

  const handleTypeSelect = (type: 'single_show' | 'mini_tour') => {
    setSelectedType(type);
    const performanceType = PERFORMANCE_TYPES.find(p => p.id === type);
    if (performanceType) {
      const defaultCities = performanceType.defaultCities;
      setCities(defaultCities);
      // Set reasonable default budget per city (no longer using hardcoded costs)
      setBudgetPerCity(2000); // Default production budget per city
      // Auto-generate title if none exists
      if (!title && selectedArtistData) {
        const titleSuffix = type === 'single_show' ? 'Live' : 'Tour';
        setTitle(`${selectedArtistData.name} ${titleSuffix}`);
      }
      // PHASE 3: Reset capacity to middle of range when type changes
      const range = getCapacityRange();
      setSelectedCapacity(Math.round((range.min + range.max) / 2));
    }
  };

  const handleSubmit = async () => {
    if (!selectedType || !selectedArtist || !title || budgetPerCity <= 0) return;

    const tourData: TourCreationData = {
      title,
      type: selectedType,
      artistId: selectedArtist,
      budget: Math.round(estimateData?.totalBudget || 0), // Pass total budget from API (rounded to integer)
      cities: selectedType === 'single_show' ? 1 : cities,
      venueAccess: currentVenueAccess, // Capture current venue access tier
      venueCapacity: selectedCapacity // PHASE 3: Include selected capacity
    };

    try {
      setIsCreating(true);
      // Map TourCreationData to ProjectCreationData format
      // Tours are stored as projects with type 'Mini-Tour'
      const projectData = {
        title: tourData.title,
        type: 'Mini-Tour' as const, // Always use Mini-Tour type for live performances
        artistId: tourData.artistId,
        totalCost: Math.round(tourData.budget), // Map budget to totalCost (rounded to integer)
        budgetPerSong: 0, // Not applicable for tours
        songCount: 0, // Tours don't have songs
        producerTier: 'local' as const, // Default for tours
        timeInvestment: 'standard' as const, // Default for tours
        metadata: {
          performanceType: 'mini_tour', // Always store as mini_tour (single shows are just 1-city tours)
          cities: tourData.cities, // 1 for single shows, 3+ for multi-city tours
          venueAccess: tourData.venueAccess || 'none', // Store venue access at time of booking
          venueCapacity: tourData.venueCapacity, // Store selected venue capacity
          createdFrom: 'LivePerformancePage' // Track source for debugging
        }
      };

      // Use existing createProject method from gameStore
      await createProject(projectData);
      setLocation('/');
    } catch (error) {
      console.error('Failed to create tour:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const canAfford = estimateData?.canAfford ?? false;
  const isValid = selectedType && selectedArtist && title && budgetPerCity > 0 && canAfford && availableArtists.length > 0;

  return (
    <GameLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-white">Live Performance</h1>
        </div>

        {configError ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">!</span>
              </div>
              <p className="text-red-400 font-semibold mb-2">Configuration Error</p>
              <p className="text-white/70 mb-4">{configError}</p>
              <p className="text-xs text-white/50">Check browser console for detailed error information</p>
            </div>
          </div>
        ) : !tourConfig || !venueAccessConfig ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A75A5B] mx-auto mb-4"></div>
              <p className="text-white/70">Loading tour and venue configurations...</p>
              <p className="text-xs text-white/50 mt-2">Game cannot continue without configuration data</p>
            </div>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Current Venue Access Display */}
          <div className="bg-[#3c252d]/20 rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-[#A75A5B]" />
                <div>
                  <h4 className="font-semibold text-white">Current Venue Access</h4>
                  <p className="text-sm text-white/70">Determines available venue capacity</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${venueInfo.color}`}>{venueInfo.name}</p>
                <p className="text-sm text-white/50">Capacity: {venueInfo.capacity}</p>
              </div>
            </div>
            {venueInfo.warning && (
              <div className="mt-2 flex items-center space-x-2 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <p className="text-sm">{venueInfo.warning}</p>
              </div>
            )}
          </div>

          {/* Performance Type Selection */}
          <div>
            <Label className="text-base font-semibold">Performance Type</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {PERFORMANCE_TYPES.map((type) => (
                <Card 
                  key={type.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedType === type.id ? 'ring-2 ring-[#A75A5B] bg-[#A75A5B]/10' : ''
                  }`}
                  onClick={() => handleTypeSelect(type.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <type.icon className="w-6 h-6 text-[#A75A5B]" />
                      <div>
                        <h3 className="font-semibold">{type.name}</h3>
                        <p className="text-sm text-white/70">{type.description}</p>
                        <p className="text-xs text-white/50">Duration: {type.duration}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {selectedType && (
            <>
              {/* Artist Selection */}
              <div>
                <Label htmlFor="artist">Select Artist</Label>
                <Select value={selectedArtist} onValueChange={(value) => {
                  setSelectedArtist(value);
                  const artist = artists.find(a => a.id === value);
                  if (artist && selectedType) {
                    const titleSuffix = selectedType === 'single_show' ? 'Live' : 'Tour';
                    setTitle(`${artist.name} ${titleSuffix}`);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an artist" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableArtists.length > 0 ? (
                      availableArtists.map((artist) => (
                        <SelectItem key={artist.id} value={artist.id}>
                          <div className="flex items-center space-x-2">
                            <span>{artist.name}</span>
                            <Badge variant="outline" className="text-xs">
                              Pop: {artist.popularity || 0}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Mood: {artist.mood || 0}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Loyalty: {artist.loyalty || 0}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        <span className="text-gray-500">No artists available (all are currently on tour)</span>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {availableArtists.length === 0 && artists.length > 0 && (
                  <div className="mt-2 flex items-center space-x-2 text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-sm">All artists are currently on tour. Complete existing tours to book new performances.</p>
                  </div>
                )}
              </div>

              {/* Performance Title */}
              <div>
                <Label htmlFor="title">Performance Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter performance/tour name"
                />
              </div>

              {/* Production Budget Per City */}
              <div>
                <Label htmlFor="budgetPerCity">Marketing and Logistics Budget Per City</Label>
                <Input
                  id="budgetPerCity"
                  type="number"
                  value={budgetPerCity}
                  onChange={(e) => setBudgetPerCity(Number(e.target.value))}
                  placeholder="Marketing and logistics budget for each city"
                  min={500}
                />
                <p className="text-sm text-white/50 mt-1">
                  Marketing and logistics budget per city. Venue fees calculated separately.
                </p>
              </div>

              {/* Cities (for mini tours) */}
              {selectedType === 'mini_tour' && (
                <div>
                  <Label htmlFor="cities">Number of Cities</Label>
                  <Input
                    id="cities"
                    type="number"
                    value={cities}
                    onChange={(e) => {
                      const newCityCount = Number(e.target.value);
                      setCities(newCityCount);
                      // Budget per city stays the same, total budget updates automatically
                    }}
                    min={selectedPerformanceType?.minCities || 1}
                    max={selectedPerformanceType?.maxCities || 8}
                  />
                  <p className="text-sm text-white/50 mt-1">
                    More cities = higher revenue potential but increased costs
                  </p>
                </div>
              )}

              {/* PHASE 3: Venue Capacity Selection */}
              <div className="bg-purple-500/10 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-purple-300 mb-1">Venue Capacity Selection</h4>
                    <p className="text-xs text-white/60">Choose your target venue size</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{selectedCapacity.toLocaleString()}</p>
                    <p className="text-xs text-white/50">capacity</p>
                  </div>
                </div>

                {/* Capacity Slider */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-white/50 mb-2">
                      <span>{getCapacityRange().min}</span>
                      <span>{getCapacityRange().max}</span>
                    </div>
                    <Slider
                      value={[selectedCapacity]}
                      onValueChange={(value) => setSelectedCapacity(value[0])}
                      min={getCapacityRange().min}
                      max={getCapacityRange().max}
                      step={25}
                      className="mb-2"
                    />

                    {/* Alternative number input */}
                    <div className="mt-3">
                      <Input
                        type="number"
                        value={selectedCapacity}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          const range = getCapacityRange();
                          if (value >= range.min && value <= range.max) {
                            setSelectedCapacity(value);
                          }
                        }}
                        min={getCapacityRange().min}
                        max={getCapacityRange().max}
                        className="text-center"
                        placeholder="Enter capacity"
                      />
                    </div>
                  </div>

                  {/* Strategic Guidance */}
                  {(() => {
                    const venueInfo = getVenueCategoryInfo(selectedCapacity);
                    const IconComponent = venueInfo.icon;
                    return (
                      <div className="bg-black/30 rounded p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <IconComponent className={`w-4 h-4 ${venueInfo.color}`} />
                          <span className={`font-medium ${venueInfo.color}`}>{venueInfo.category}</span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              venueInfo.riskLevel === 'low' ? 'border-green-500 text-green-400' :
                              venueInfo.riskLevel === 'medium' ? 'border-yellow-500 text-yellow-400' :
                              'border-red-500 text-red-400'
                            }`}
                          >
                            {venueInfo.riskLevel} risk
                          </Badge>
                        </div>
                        <p className="text-xs text-white/70 mb-1">{venueInfo.description}</p>
                        <p className="text-xs text-white/60">{venueInfo.advice}</p>

                        {/* Real-time feedback if estimate is available */}
                        {estimateData && estimateData.selectedCapacity && (
                          <div className="mt-2 pt-2 border-t border-white/10">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/60">Expected attendance:</span>
                              <span className="font-mono text-blue-300">
                                {Math.round(estimateData.selectedCapacity * (estimateData.sellThroughRate || 0.7)).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs mt-1">
                              <span className="text-white/60">Sell-through rate:</span>
                              <span className={`font-mono ${
                                (estimateData.sellThroughRate || 0) > 0.8 ? 'text-green-400' :
                                (estimateData.sellThroughRate || 0) > 0.6 ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                {((estimateData.sellThroughRate || 0) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Comprehensive Tour Analysis - Enhanced API Integration */}
              <div className="bg-[#A75A5B]/10 rounded-lg p-4 border">
                <h4 className="font-medium text-[#A75A5B] mb-3">Comprehensive Tour Analysis</h4>
                {renderEstimate()}
              </div>

              {/* Budget Warning */}
              {!canAfford && estimateData && (
                <div className="p-4 bg-red-100/10 border border-red-300/30 rounded-md">
                  <p className="text-red-400">
                    Insufficient funds! Need ${estimateData.totalBudget?.toLocaleString()} but only have ${currentMoney.toLocaleString()}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setLocation('/')}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!isValid || isCreating}
                  className="bg-[#A75A5B] hover:bg-[#D99696] text-white"
                >
                  {isCreating ? 'Booking...' : `Book ${selectedPerformanceType?.name || 'Performance'}`}
                </Button>
              </div>
            </>
          )}
        </div>
        )}
      </div>
    </GameLayout>
  );
}
