import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
import { apiRequest } from '@/lib/queryClient';
import { Calculator, TrendingUp, TrendingDown, Target } from 'lucide-react';

interface TourEstimate {
  estimatedRevenue: number;
  totalCosts: number;
  estimatedProfit: number;
  sellThroughRate: number;
  cities?: Array<{
    cityNumber: number;
    venueCapacity: number;
    sellThroughRate: number;
    ticketRevenue: number;
    merchRevenue: number;
    totalRevenue: number;
    totalCosts: number;
    profit: number;
  }>;
}

interface ActualResult {
  cityNumber: number;
  venueCapacity: number;
  actualSellThrough: number;
  projectedSellThrough: number;
  actualRevenue: number;
  projectedRevenue: number;
  actualProfit: number;
  projectedProfit: number;
  varianceFactor: number;
  attendanceDiff: number;
  revenueDiff: number;
  profitDiff: number;
}

export function TourVarianceTester() {
  const { gameState, artists } = useGameStore();
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [cities, setCities] = useState(3);
  const [budgetPerCity, setBudgetPerCity] = useState(2000);
  const [venueCapacity, setVenueCapacity] = useState(500);
  const [estimate, setEstimate] = useState<TourEstimate | null>(null);
  const [actualResults, setActualResults] = useState<ActualResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate variance simulation
  const generateVarianceTest = async () => {
    if (!selectedArtist || !gameState?.id) return;

    setIsLoading(true);
    try {
      // Get the projection first
      const response = await apiRequest('POST', '/api/tour/estimate', {
        artistId: selectedArtist,
        cities,
        budgetPerCity,
        gameId: gameState.id,
        venueCapacity,
      });

      const estimateData = await response.json();
      setEstimate(estimateData);

      // Simulate actual results with variance for each city
      const simulated: ActualResult[] = [];
      if (estimateData.cities) {
        estimateData.cities.forEach((city: any) => {
          // Apply ±20% variance (matching implementation)
          const varianceFactor = 0.8 + (Math.random() * 0.4);
          const actualSellThrough = city.sellThroughRate * varianceFactor;
          const actualRevenue = Math.round(city.totalRevenue * varianceFactor);
          const actualProfit = actualRevenue - city.totalCosts;

          const attendanceDiff = ((actualSellThrough - city.sellThroughRate) / city.sellThroughRate) * 100;
          const revenueDiff = ((actualRevenue - city.totalRevenue) / city.totalRevenue) * 100;
          const profitDiff = city.profit !== 0 ? ((actualProfit - city.profit) / city.profit) * 100 : 0;

          simulated.push({
            cityNumber: city.cityNumber,
            venueCapacity: city.venueCapacity,
            actualSellThrough,
            projectedSellThrough: city.sellThroughRate,
            actualRevenue,
            projectedRevenue: city.totalRevenue,
            actualProfit,
            projectedProfit: city.profit,
            varianceFactor,
            attendanceDiff,
            revenueDiff,
            profitDiff
          });
        });
      }

      setActualResults(simulated);
    } catch (error) {
      console.error('Tour variance test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedArtistData = selectedArtist ? artists.find(a => a.id === selectedArtist) : null;
  const venueAccessInfo = gameState?.venueAccess || 'clubs';

  const getVarianceColor = (diff: number) => {
    if (diff > 10) return 'text-green-500';
    if (diff > 0) return 'text-green-400';
    if (diff > -10) return 'text-red-400';
    return 'text-red-500';
  };

  const getVarianceIcon = (diff: number) => {
    if (diff > 0) return <TrendingUp className="w-3 h-3" />;
    if (diff < 0) return <TrendingDown className="w-3 h-3" />;
    return <Target className="w-3 h-3" />;
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-[#A75A5B]" />
            <span>Tour Variance Tester</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-white/70">
            Test the variance between projected and actual tour performance.
            This simulates the ±20% attendance variance applied to real tours.
          </p>

          {/* Artist Selection */}
          <div>
            <Label htmlFor="artist">Artist</Label>
            <Select value={selectedArtist} onValueChange={setSelectedArtist}>
              <SelectTrigger>
                <SelectValue placeholder="Select an artist" />
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

          {/* Tour Parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cities">Cities</Label>
              <Input
                id="cities"
                type="number"
                value={cities}
                onChange={(e) => setCities(Number(e.target.value))}
                min={1}
                max={8}
              />
            </div>
            <div>
              <Label htmlFor="budget">Budget per City</Label>
              <Input
                id="budget"
                type="number"
                value={budgetPerCity}
                onChange={(e) => setBudgetPerCity(Number(e.target.value))}
                min={500}
              />
            </div>
          </div>

          {/* Venue Capacity Slider */}
          <div>
            <Label>Venue Capacity: {venueCapacity.toLocaleString()}</Label>
            <div className="mt-2">
              <Slider
                value={[venueCapacity]}
                onValueChange={(value) => setVenueCapacity(value[0])}
                min={100}
                max={2000}
                step={25}
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-white/50">
                <span>100</span>
                <span>Current Access: {venueAccessInfo}</span>
                <span>2,000</span>
              </div>
            </div>
          </div>

          <Button
            onClick={generateVarianceTest}
            disabled={!selectedArtist || isLoading}
            className="w-full"
          >
            {isLoading ? 'Simulating...' : 'Generate Variance Test'}
          </Button>
        </CardContent>
      </Card>

      {/* Results Comparison */}
      {estimate && actualResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Projected vs Actual Results</CardTitle>
            {selectedArtistData && (
              <div className="text-sm text-white/70">
                {selectedArtistData.name} • {cities} cities • {venueCapacity.toLocaleString()} capacity venues
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Overall Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-[#3c252d]/20 rounded-lg">
                <div>
                  <h4 className="font-medium text-white mb-2">Projected Totals</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Revenue:</span>
                      <span className="font-mono text-blue-400">${estimate.estimatedRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Profit:</span>
                      <span className="font-mono text-green-400">${estimate.estimatedProfit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Sell-through:</span>
                      <span className="font-mono text-white">{(estimate.sellThroughRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">Actual Totals</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Revenue:</span>
                      <span className="font-mono text-blue-400">
                        ${actualResults.reduce((sum, city) => sum + city.actualRevenue, 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Profit:</span>
                      <span className="font-mono text-green-400">
                        ${actualResults.reduce((sum, city) => sum + city.actualProfit, 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Avg Sell-through:</span>
                      <span className="font-mono text-white">
                        {(actualResults.reduce((sum, city) => sum + city.actualSellThrough, 0) / actualResults.length * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* City-by-City Breakdown */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#4e324c] text-white/70">
                      <th className="text-left p-2">City</th>
                      <th className="text-right p-2">Attendance</th>
                      <th className="text-right p-2">Revenue</th>
                      <th className="text-right p-2">Profit</th>
                      <th className="text-right p-2">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actualResults.map((city) => (
                      <tr key={city.cityNumber} className="border-b border-[#4e324c]/50">
                        <td className="p-2 font-medium">City {city.cityNumber}</td>
                        <td className="text-right p-2">
                          <div className="space-y-1">
                            <div className="font-mono text-blue-400">
                              {Math.round(city.venueCapacity * city.actualSellThrough)} / {city.venueCapacity}
                            </div>
                            <div className="text-xs text-white/50">
                              vs {Math.round(city.venueCapacity * city.projectedSellThrough)}
                            </div>
                            <div className={`text-xs flex items-center justify-end space-x-1 ${getVarianceColor(city.attendanceDiff)}`}>
                              {getVarianceIcon(city.attendanceDiff)}
                              <span>{city.attendanceDiff > 0 ? '+' : ''}{city.attendanceDiff.toFixed(1)}%</span>
                            </div>
                          </div>
                        </td>
                        <td className="text-right p-2">
                          <div className="space-y-1">
                            <div className="font-mono text-green-400">${city.actualRevenue.toLocaleString()}</div>
                            <div className="text-xs text-white/50">vs ${city.projectedRevenue.toLocaleString()}</div>
                            <div className={`text-xs flex items-center justify-end space-x-1 ${getVarianceColor(city.revenueDiff)}`}>
                              {getVarianceIcon(city.revenueDiff)}
                              <span>{city.revenueDiff > 0 ? '+' : ''}{city.revenueDiff.toFixed(1)}%</span>
                            </div>
                          </div>
                        </td>
                        <td className="text-right p-2">
                          <div className="space-y-1">
                            <div className={`font-mono ${city.actualProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ${city.actualProfit.toLocaleString()}
                            </div>
                            <div className="text-xs text-white/50">vs ${city.projectedProfit.toLocaleString()}</div>
                            <div className={`text-xs flex items-center justify-end space-x-1 ${getVarianceColor(city.profitDiff)}`}>
                              {getVarianceIcon(city.profitDiff)}
                              <span>{city.profitDiff > 0 ? '+' : ''}{city.profitDiff.toFixed(1)}%</span>
                            </div>
                          </div>
                        </td>
                        <td className="text-right p-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${city.varianceFactor > 1 ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'}`}
                          >
                            {city.varianceFactor > 1 ? '+' : ''}{((city.varianceFactor - 1) * 100).toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Variance Statistics */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-[#4e324c]/20 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {actualResults.filter(c => c.varianceFactor > 1).length}
                  </div>
                  <div className="text-xs text-green-400">Cities Above Projection</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {actualResults.filter(c => c.varianceFactor < 1).length}
                  </div>
                  <div className="text-xs text-red-400">Cities Below Projection</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {actualResults.filter(c => Math.abs(c.varianceFactor - 1) < 0.1).length}
                  </div>
                  <div className="text-xs text-blue-400">Cities Near Target</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}