import React, { useState, useEffect } from 'react';
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
  // TODO: Add venue selection when venue booking system is implemented
  // TODO: Add date selection when calendar system is implemented
}

// STUB: Hardcoded performance types - will be replaced with API data
const PERFORMANCE_TYPES = [
  {
    id: 'single_show' as const,
    name: 'Single Show',
    icon: Music,
    description: 'One-time performance at a venue',
    duration: '1 night',
    minCities: 1,
    maxCities: 1,
    defaultCities: 1,
    baseCost: 2500
  },
  {
    id: 'mini_tour' as const,
    name: 'Mini Tour',
    icon: MapPin,
    description: 'Small tour across multiple cities',
    duration: '1-2 months',
    minCities: 3,
    maxCities: 8,
    defaultCities: 3,
    baseCost: 5000
  }
];

export function LivePerformanceModal({ 
  gameState, 
  artists, 
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
  const [budget, setBudget] = useState(0);
  const [cities, setCities] = useState(1);

  const currentMoney = gameState.money || 75000;
  const currentVenueAccess = gameState.venueAccess || 'none';
  const selectedPerformanceType = PERFORMANCE_TYPES.find(type => type.id === selectedType);
  const selectedArtistData = selectedArtist ? artists.find(a => a.id === selectedArtist) : null;

  // STUB: Venue access integration - shows current tier but doesn't restrict booking yet
  const getVenueAccessInfo = () => {
    const accessInfo = {
      'none': { name: 'No Access', capacity: '0-50', color: 'text-red-500', warning: 'Very limited venue options' },
      'clubs': { name: 'Club Access', capacity: '50-500', color: 'text-green-500', warning: null },
      'theaters': { name: 'Theater Access', capacity: '500-2K', color: 'text-blue-500', warning: null },
      'arenas': { name: 'Arena Access', capacity: '2K-20K', color: 'text-purple-500', warning: null }
    };
    return accessInfo[currentVenueAccess as keyof typeof accessInfo] || accessInfo.none;
  };

  const venueInfo = getVenueAccessInfo();

  // HARDCODED: Simple budget calculation - will be replaced with complex venue/popularity logic
  const calculateEstimatedRevenue = () => {
    if (!selectedType || !selectedArtist || !budget) return 0;
    
    // STUB: Very basic revenue calculation
    const artistPopularity = selectedArtistData?.popularity || 50;
    const venueMultiplier = {
      'none': 0.3,
      'clubs': 0.7,
      'theaters': 1.0,
      'arenas': 1.5
    }[currentVenueAccess as keyof typeof venueMultiplier] || 0.3;
    
    const baseRevenue = budget * 0.8; // Assume 80% of budget as baseline
    const popularityBonus = (artistPopularity / 100) * 0.5; // Up to 50% bonus
    const venueBonus = venueMultiplier;
    
    return Math.round(baseRevenue * (1 + popularityBonus) * venueBonus * cities);
  };

  const estimatedRevenue = calculateEstimatedRevenue();
  const estimatedProfit = estimatedRevenue - budget;

  const handleTypeSelect = (type: 'single_show' | 'mini_tour') => {
    setSelectedType(type);
    const performanceType = PERFORMANCE_TYPES.find(p => p.id === type);
    if (performanceType) {
      setCities(performanceType.defaultCities);
      setBudget(performanceType.baseCost);
      // Auto-generate title if none exists
      if (!title && selectedArtistData) {
        const titleSuffix = type === 'single_show' ? 'Live' : 'Tour';
        setTitle(`${selectedArtistData.name} ${titleSuffix}`);
      }
    }
  };

  const handleSubmit = () => {
    if (!selectedType || !selectedArtist || !title || budget <= 0) return;

    const tourData: TourCreationData = {
      title,
      type: selectedType,
      artistId: selectedArtist,
      budget,
      cities: selectedType === 'single_show' ? 1 : cities
    };

    onCreateTour(tourData);
    
    // Reset form
    setSelectedType(null);
    setSelectedArtist('');
    setTitle('');
    setBudget(0);
    setCities(1);
    setIsOpen(false);
  };

  const canAfford = budget <= currentMoney;
  const isValid = selectedType && selectedArtist && title && budget > 0 && canAfford;

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
                    {artists.map((artist) => (
                      <SelectItem key={artist.id} value={artist.id}>
                        <div className="flex items-center space-x-2">
                          <span>{artist.name}</span>
                          <Badge variant="outline" className="text-xs">
                            Pop: {artist.popularity || 0}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              {/* Budget */}
              <div>
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  placeholder="Total performance budget"
                  min={1000}
                />
                <p className="text-sm text-white/50 mt-1">
                  Covers venue costs, promotion, crew, and logistics
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
                    onChange={(e) => setCities(Number(e.target.value))}
                    min={selectedPerformanceType?.minCities || 1}
                    max={selectedPerformanceType?.maxCities || 8}
                  />
                  <p className="text-sm text-white/50 mt-1">
                    More cities = higher revenue potential but increased costs
                  </p>
                </div>
              )}

              {/* Revenue Projection */}
              {selectedArtist && budget > 0 && (
                <div className="bg-[#A75A5B]/10 rounded-lg p-4 border">
                  <h4 className="font-medium text-[#A75A5B] mb-3">Revenue Projection</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Estimated Gross Revenue:</span>
                      <span className="font-mono text-green-400">${estimatedRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Total Costs:</span>
                      <span className="font-mono text-red-400">-${budget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span className="text-white">Estimated Profit:</span>
                      <span className={`font-mono ${estimatedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${estimatedProfit.toLocaleString()}
                      </span>
                    </div>
                    {selectedArtistData && (
                      <div className="text-xs text-white/50 mt-2">
                        <p>Based on: {selectedArtistData.name}'s popularity ({selectedArtistData.popularity || 0}), 
                           venue access ({venueInfo.name}), and {cities} {cities === 1 ? 'show' : 'cities'}</p>
                        <p className="text-amber-500 mt-1">⚠️ STUB: Basic calculation - actual revenue varies with market conditions</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Budget Warning */}
              {!canAfford && budget > 0 && (
                <div className="p-4 bg-red-100 border border-red-300 rounded-md">
                  <p className="text-red-800">
                    Insufficient funds! Need ${budget.toLocaleString()} but only have ${currentMoney.toLocaleString()}
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
      </DialogContent>
    </Dialog>
  );
}