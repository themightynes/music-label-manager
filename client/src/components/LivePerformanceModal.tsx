import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Music, Calendar, Users, DollarSign, AlertCircle, Info } from 'lucide-react';
import type { GameState } from '@shared/schema';

interface LivePerformanceModalProps {
  gameState: GameState;
  artists: any[];
  projects: any[]; // Add projects to check for existing tours
  onCreateTour: (tourData: TourCreationData) => void;
  isCreating: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface TourCreationData {
  title: string;
  type: 'single_show' | 'mini_tour';
  artistId: string;
  budget: number;
  cities: number;
  venueAccess?: string; // Capture current venue access for historical tracking
  // TODO: Add venue selection when venue booking system is implemented
  // TODO: Add date selection when calendar system is implemented
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
    duration: '1-2 months',
    minCities: 3,
    maxCities: 8,
    defaultCities: 3
  }
];

export function LivePerformanceModal({ 
  gameState, 
  artists, 
  projects,
  onCreateTour, 
  isCreating, 
  open = false, 
  onOpenChange 
}: LivePerformanceModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  
  const [selectedType, setSelectedType] = useState<'single_show' | 'mini_tour' | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [title, setTitle] = useState('');
  const [budgetPerCity, setBudgetPerCity] = useState(0);
  const [cities, setCities] = useState(1);
  const [tourConfig, setTourConfig] = useState<any>(null);
  const [venueAccessConfig, setVenueAccessConfig] = useState<any>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const currentMoney = gameState.money || 75000;
  const currentVenueAccess = gameState.venueAccess || 'none';
  const selectedPerformanceType = PERFORMANCE_TYPES.find(type => type.id === selectedType);

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

  // Revenue calculation using venue capacity from unified function
  const calculateEstimatedRevenue = () => {
    if (!tourConfig || !venueAccessConfig || !selectedType || !selectedArtist || !budgetPerCity) return 0;

    const artistPopularity = selectedArtistData?.popularity || 50;
    const venueCapacity = getVenueCapacity(); // Use centralized capacity calculation
    
    // SELL-THROUGH FORMULA using config values from markets.json
    // Sell-Through Rate = Base Rate (config) + (Reputation * config modifier) + (Artist_Popularity * config weight) + (Budget_Per_City/Venue_Capacity*11/100*0.15)
    const baseRate = tourConfig.sell_through_base;
    const reputationBonus = ((gameState.reputation || 0) / 100) * tourConfig.reputation_modifier;
    const popularityBonus = (artistPopularity / 100) * tourConfig.local_popularity_weight;
    const budgetQualityBonus = (budgetPerCity / venueCapacity) * 11 / 100 * 0.15;
    
    const sellThroughRate = Math.min(1.0, baseRate + reputationBonus + popularityBonus + budgetQualityBonus);
    
    // Calculate revenue using sell-through rate
    // Use config values from markets.json
    const ticketPrice = tourConfig.ticket_price_base + (venueCapacity * tourConfig.ticket_price_per_capacity);
    const capacityUsed = Math.round(venueCapacity * sellThroughRate);
    const ticketRevenue = capacityUsed * ticketPrice;
    const merchRevenue = ticketRevenue * tourConfig.merch_percentage;
    const revenuePerCity = ticketRevenue + merchRevenue;
    
    // Return detailed breakdown
    return {
      totalRevenue: Math.round(revenuePerCity * cities),
      breakdown: {
        venueCapacity,
        capacityUsed,
        sellThroughRate: Math.round(sellThroughRate * 100),
        ticketPrice: Math.round(ticketPrice),
        ticketRevenuePerCity: Math.round(ticketRevenue),
        merchRevenuePerCity: Math.round(merchRevenue),
        totalRevenuePerCity: Math.round(revenuePerCity),
        cities
      }
    };
  };

  const estimatedRevenue = useMemo(() => calculateEstimatedRevenue(), [
    selectedType, selectedArtist, budgetPerCity, cities, gameState.reputation, currentVenueAccess, tourConfig, venueAccessConfig
  ]);

  // Calculate costs: Fixed venue fees (capacity * 4) + Production fees (capacity * 2.7) + User marketing budget
  // Only calculate when configuration is loaded
  const costCalculation = useMemo(() => {
    if (!venueAccessConfig) {
      return { totalCosts: 0, venueFeePerCity: 0, productionFeePerCity: 0, totalVenueFees: 0, totalProductionFees: 0, totalMarketingCosts: 0 };
    }

    const venueCapacity = getVenueCapacity();
    const venueFeePerCity = venueCapacity * 4; // Fixed infrastructure cost
    const productionFeePerCity = venueCapacity * 2.7; // Fixed production cost
    const totalVenueFees = venueFeePerCity * cities;
    const totalProductionFees = productionFeePerCity * cities;
    const totalMarketingCosts = budgetPerCity * cities; // User-controlled marketing budget
    const totalCosts = totalVenueFees + totalProductionFees + totalMarketingCosts;

    return { totalCosts, venueFeePerCity, productionFeePerCity, totalVenueFees, totalProductionFees, totalMarketingCosts };
  }, [venueAccessConfig, currentVenueAccess, cities, budgetPerCity]);

  const estimatedProfit = (typeof estimatedRevenue === 'object' ? estimatedRevenue.totalRevenue : 0) - costCalculation.totalCosts;

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
    }
  };

  const handleSubmit = () => {
    if (!selectedType || !selectedArtist || !title || budgetPerCity <= 0) return;

    const tourData: TourCreationData = {
      title,
      type: selectedType,
      artistId: selectedArtist,
      budget: costCalculation.totalCosts, // Pass total costs (venue fees + budget)
      cities: selectedType === 'single_show' ? 1 : cities,
      venueAccess: currentVenueAccess // Capture current venue access tier
    };

    onCreateTour(tourData);
    
    // Reset form
    setSelectedType(null);
    setSelectedArtist('');
    setTitle('');
    setBudgetPerCity(0);
    setCities(1);
    setIsOpen(false);
  };

  const canAfford = costCalculation.totalCosts <= currentMoney;
  const isValid = tourConfig && venueAccessConfig && selectedType && selectedArtist && title && budgetPerCity > 0 && canAfford && availableArtists.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!onOpenChange && (
        <DialogTrigger asChild>
          <Button onClick={() => setIsOpen(true)}>
            <MapPin className="w-4 h-4 mr-2" />
            Live Performance
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plan Live Performance</DialogTitle>
        </DialogHeader>

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

              {/* Revenue Projection */}
              {selectedArtist && budgetPerCity > 0 && typeof estimatedRevenue === 'object' && (
                <div className="bg-[#A75A5B]/10 rounded-lg p-4 border">
                  <h4 className="font-medium text-[#A75A5B] mb-3">Revenue Projection</h4>
                  <div className="space-y-3 text-sm">

                    {/* Per City Breakdown */}
                    <div className="bg-black/20 rounded p-3">
                      <h5 className="font-medium text-white/90 mb-2">Per City Performance:</h5>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-white/60">Venue Capacity:</span>
                          <span className="font-mono text-white/80">{estimatedRevenue.breakdown.venueCapacity.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Expected Attendance ({estimatedRevenue.breakdown.sellThroughRate}%):</span>
                          <span className="font-mono text-white/80">{estimatedRevenue.breakdown.capacityUsed.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Ticket Price:</span>
                          <span className="font-mono text-white/80">${estimatedRevenue.breakdown.ticketPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Ticket Revenue:</span>
                          <span className="font-mono text-blue-400">${estimatedRevenue.breakdown.ticketRevenuePerCity.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Merch Revenue (15%):</span>
                          <span className="font-mono text-blue-400">${estimatedRevenue.breakdown.merchRevenuePerCity.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/20 pt-1 font-medium">
                          <span className="text-white/70">Total Per City:</span>
                          <span className="font-mono text-blue-300">${estimatedRevenue.breakdown.totalRevenuePerCity.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="bg-black/20 rounded p-3">
                      <h5 className="font-medium text-white/90 mb-2">Cost Breakdown:</h5>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-white/60">Venue Fees ({cities} cities × ${costCalculation.venueFeePerCity.toLocaleString()}):</span>
                          <span className="font-mono text-red-400">${costCalculation.totalVenueFees.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Production Fees ({cities} cities × ${costCalculation.productionFeePerCity.toLocaleString()}):</span>
                          <span className="font-mono text-red-400">${costCalculation.totalProductionFees.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Marketing & Logistics ({cities} cities × ${budgetPerCity.toLocaleString()}):</span>
                          <span className="font-mono text-red-400">${costCalculation.totalMarketingCosts.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/20 pt-1 font-medium">
                          <span className="text-white/70">Total Costs:</span>
                          <span className="font-mono text-red-300">${costCalculation.totalCosts.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Total Summary */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white/70">Total Gross Revenue ({cities} cities):</span>
                        <span className="font-mono text-green-400">${estimatedRevenue.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Total Costs:</span>
                        <span className="font-mono text-red-400">-${costCalculation.totalCosts.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-semibold">
                        <span className="text-white">Estimated Profit:</span>
                        <span className={`font-mono ${estimatedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${estimatedProfit.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {selectedArtistData && (
                      <div className="text-xs text-white/50 mt-2">
                        <p>Based on: {selectedArtistData.name}'s popularity ({selectedArtistData.popularity || 0}), 
                           venue access ({venueInfo.name}), and {cities} {cities === 1 ? 'show' : 'cities'}</p>
                        <p className="text-amber-500 mt-1">💡 Calculations now match backend logic (venue fees: capacity × 4 + production budget)</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Budget Warning */}
              {!canAfford && budgetPerCity > 0 && (
                <div className="p-4 bg-red-100 border border-red-300 rounded-md">
                  <p className="text-red-800">
                    Insufficient funds! Need ${costCalculation.totalCosts.toLocaleString()} but only have ${currentMoney.toLocaleString()}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!isValid || isCreating}
                >
                  {isCreating ? 'Booking...' : `Book ${selectedPerformanceType?.name || 'Performance'}`}
                </Button>
              </div>
            </>
          )}
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}