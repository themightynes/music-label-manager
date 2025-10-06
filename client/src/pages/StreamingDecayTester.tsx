import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BarChart3, TrendingUp, Loader2, Settings, Code } from 'lucide-react';
import { useLocation } from 'wouter';
import { useGameStore } from '@/store/gameStore';
import { apiRequest } from '@/lib/queryClient';
import GameLayout from '@/layouts/GameLayout';

interface StreamingTestResult {
  week: number;
  withMarketing: number;
  withoutMarketing: number;
  marketingBoost: number;
  weeksSinceRelease: number;
  awareness: number;
  awarenessGain: number;
  awarenessDecay: number;
  awarenessModifier: number;
  breakthroughPotential: number;
}

interface MarketingBudget {
  radio: number;
  digital: number;
  pr: number;
  influencer: number;
}

interface StreamingConfig {
  weekly_decay_rate: number;
  revenue_per_stream: number;
  ongoing_factor: number;
  reputation_bonus_factor: number;
  access_tier_bonus_factor: number;
  minimum_revenue_threshold: number;
  max_decay_weeks: number;
}

interface AwarenessConfig {
  enabled: boolean;
  per_unit_spend: number;
  channel_awareness_coefficients: {
    radio: number;
    digital: number;
    pr: number;
    influencer: number;
  };
  awareness_decay_rates: {
    standard_songs: number;
    breakthrough_songs: number;
    quality_bonus_threshold: number;
    quality_bonus_reduction: number;
  };
  awareness_impact_factors: {
    weeks_1_2: number;
    weeks_3_6: number;
    weeks_7_plus: number;
  };
  max_awareness_modifier: number;
}

export default function StreamingDecayTester() {
  const [, setLocation] = useLocation();
  const { gameState } = useGameStore();

  // Test Parameters
  const [songQuality, setSongQuality] = useState(75);
  const [artistPopularity, setArtistPopularity] = useState(50);
  const [playlistAccess, setPlaylistAccess] = useState('clubs');
  const [reputation, setReputation] = useState(25);
  const [marketingBudget, setMarketingBudget] = useState<MarketingBudget>({
    radio: 5000,
    digital: 3000,
    pr: 2000,
    influencer: 1500
  });

  // Results
  const [testResults, setTestResults] = useState<StreamingTestResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Awareness state
  const [peakAwareness, setPeakAwareness] = useState(0);
  const [totalAwarenessBuilt, setTotalAwarenessBuilt] = useState(0);
  const [sustainedImpact, setSustainedImpact] = useState(0);
  const [peakBreakthrough, setPeakBreakthrough] = useState(0);

  // Configuration editing state
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [streamingConfig, setStreamingConfig] = useState<StreamingConfig>({
    weekly_decay_rate: 0.85,
    revenue_per_stream: 0.05,
    ongoing_factor: 0.8,
    reputation_bonus_factor: 0.002,
    access_tier_bonus_factor: 0.1,
    minimum_revenue_threshold: 1,
    max_decay_weeks: 24
  });
  const [awarenessConfig, setAwarenessConfig] = useState<AwarenessConfig>({
    enabled: true,
    per_unit_spend: 1000,
    channel_awareness_coefficients: {
      radio: 0.1,
      digital: 0.2,
      pr: 0.4,
      influencer: 0.3
    },
    awareness_decay_rates: {
      standard_songs: 0.05,
      breakthrough_songs: 0.03,
      quality_bonus_threshold: 85,
      quality_bonus_reduction: 0.01
    },
    awareness_impact_factors: {
      weeks_1_2: 0.1,
      weeks_3_6: 0.3,
      weeks_7_plus: 0.5
    },
    max_awareness_modifier: 2.0
  });

  // Calculate streaming progression
  const calculateStreamingProgression = async () => {
    if (!gameState?.id) return;

    setIsCalculating(true);
    setError(null);

    try {
      const response = await apiRequest('POST', `/api/game/${gameState.id}/test/streaming-decay`, {
        songQuality,
        artistPopularity,
        playlistAccess,
        reputation,
        marketingBudget,
        weeksToSimulate: 8,
        streamingConfig,
        awarenessConfig
      });

      const data = await response.json();
      setTestResults(data.results);

      // Update awareness statistics
      const results = data.results || [];
      setPeakAwareness(results.length > 0 ? Math.max(...results.map((r: StreamingTestResult) => r.awareness || 0)) : 0);
      setTotalAwarenessBuilt(results.reduce((sum: number, r: StreamingTestResult) => sum + (r.awarenessGain || 0), 0));
      setPeakBreakthrough(results.length > 0 ? Math.max(...results.map((r: StreamingTestResult) => r.breakthroughPotential || 0)) : 0);

      // Calculate sustained impact (weeks 5+ revenue boost from awareness)
      const sustainedBoost = results
        .filter((r: StreamingTestResult) => r.weeksSinceRelease >= 5 && (r.awarenessModifier || 1) > 1)
        .reduce((sum: number, r: StreamingTestResult) => {
          // Calculate the awareness-driven boost by deriving pre-awareness baseline
          const preAwarenessStreams = r.withMarketing / (r.awarenessModifier || 1);
          const awarenessBoost = r.withMarketing - preAwarenessStreams;
          return sum + awarenessBoost;
        }, 0);
      setSustainedImpact(sustainedBoost);
    } catch (error: any) {
      console.error('Failed to calculate streaming progression:', error);
      setError(error.message || 'Failed to calculate streaming progression');
    } finally {
      setIsCalculating(false);
    }
  };

  // Auto-calculate when parameters change
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateStreamingProgression();
    }, 500);

    return () => clearTimeout(timer);
  }, [songQuality, artistPopularity, playlistAccess, reputation, marketingBudget, streamingConfig, awarenessConfig, gameState?.id]);

  const totalMarketingBudget = Object.values(marketingBudget).reduce((a, b) => a + b, 0);
  const maxStreams = Math.max(...testResults.map(r => Math.max(r.withMarketing, r.withoutMarketing)));

  return (
    <GameLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setLocation('/')}
              className="text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Streaming Decay Tester</h1>
              <p className="text-white/70">Test marketing impact on streaming progression over first 8 weeks</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowConfigEditor(!showConfigEditor)}
            className="text-white/70 hover:text-white"
          >
            <Settings className="w-4 h-4 mr-2" />
            {showConfigEditor ? 'Hide Config' : 'Edit Config'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Configuration Editor (Full Width When Shown) */}
          {showConfigEditor && (
            <div className="lg:col-span-3 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Code className="w-5 h-5" />
                    <span>Configuration Editor</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Streaming Configuration */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Streaming Configuration</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-white/90 mb-2 block">
                            Weekly Decay Rate: {streamingConfig.weekly_decay_rate}
                          </label>
                          <Slider
                            value={[streamingConfig.weekly_decay_rate]}
                            onValueChange={(value) => setStreamingConfig(prev => ({ ...prev, weekly_decay_rate: value[0] }))}
                            max={1.0}
                            min={0.5}
                            step={0.01}
                            className="w-full"
                          />
                          <div className="text-xs text-white/50 mt-1">How much streams decay each week (lower = longer tail)</div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-white/90 mb-2 block">
                            Revenue Per Stream: ${streamingConfig.revenue_per_stream}
                          </label>
                          <Slider
                            value={[streamingConfig.revenue_per_stream]}
                            onValueChange={(value) => setStreamingConfig(prev => ({ ...prev, revenue_per_stream: value[0] }))}
                            max={0.2}
                            min={0.01}
                            step={0.001}
                            className="w-full"
                          />
                          <div className="text-xs text-white/50 mt-1">Revenue generated per stream</div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-white/90 mb-2 block">
                            Ongoing Factor: {streamingConfig.ongoing_factor}
                          </label>
                          <Slider
                            value={[streamingConfig.ongoing_factor]}
                            onValueChange={(value) => setStreamingConfig(prev => ({ ...prev, ongoing_factor: value[0] }))}
                            max={1.0}
                            min={0.3}
                            step={0.01}
                            className="w-full"
                          />
                          <div className="text-xs text-white/50 mt-1">Base multiplier for ongoing streams</div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-white/90 mb-2 block">
                            Max Decay Weeks: {streamingConfig.max_decay_weeks}
                          </label>
                          <Slider
                            value={[streamingConfig.max_decay_weeks]}
                            onValueChange={(value) => setStreamingConfig(prev => ({ ...prev, max_decay_weeks: value[0] }))}
                            max={52}
                            min={8}
                            step={1}
                            className="w-full"
                          />
                          <div className="text-xs text-white/50 mt-1">When songs stop generating revenue</div>
                        </div>
                      </div>
                    </div>

                    {/* Awareness Configuration */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Awareness Configuration</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-white/90 mb-2 block">
                            Per Unit Spend: ${awarenessConfig.per_unit_spend}
                          </label>
                          <Slider
                            value={[awarenessConfig.per_unit_spend]}
                            onValueChange={(value) => setAwarenessConfig(prev => ({ ...prev, per_unit_spend: value[0] }))}
                            max={5000}
                            min={500}
                            step={100}
                            className="w-full"
                          />
                          <div className="text-xs text-white/50 mt-1">Marketing spend unit for calculations</div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-white/90 mb-4 block">Channel Coefficients</label>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-white/70">Radio: {awarenessConfig.channel_awareness_coefficients.radio}</span>
                              <Slider
                                value={[awarenessConfig.channel_awareness_coefficients.radio]}
                                onValueChange={(value) => setAwarenessConfig(prev => ({
                                  ...prev,
                                  channel_awareness_coefficients: { ...prev.channel_awareness_coefficients, radio: value[0] }
                                }))}
                                max={1.0}
                                min={0.05}
                                step={0.05}
                                className="w-32"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-white/70">Digital: {awarenessConfig.channel_awareness_coefficients.digital}</span>
                              <Slider
                                value={[awarenessConfig.channel_awareness_coefficients.digital]}
                                onValueChange={(value) => setAwarenessConfig(prev => ({
                                  ...prev,
                                  channel_awareness_coefficients: { ...prev.channel_awareness_coefficients, digital: value[0] }
                                }))}
                                max={1.0}
                                min={0.05}
                                step={0.05}
                                className="w-32"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-white/70">PR: {awarenessConfig.channel_awareness_coefficients.pr}</span>
                              <Slider
                                value={[awarenessConfig.channel_awareness_coefficients.pr]}
                                onValueChange={(value) => setAwarenessConfig(prev => ({
                                  ...prev,
                                  channel_awareness_coefficients: { ...prev.channel_awareness_coefficients, pr: value[0] }
                                }))}
                                max={1.0}
                                min={0.05}
                                step={0.05}
                                className="w-32"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-white/70">Influencer: {awarenessConfig.channel_awareness_coefficients.influencer}</span>
                              <Slider
                                value={[awarenessConfig.channel_awareness_coefficients.influencer]}
                                onValueChange={(value) => setAwarenessConfig(prev => ({
                                  ...prev,
                                  channel_awareness_coefficients: { ...prev.channel_awareness_coefficients, influencer: value[0] }
                                }))}
                                max={1.0}
                                min={0.05}
                                step={0.05}
                                className="w-32"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-white/90 mb-2 block">
                            Standard Decay Rate: {awarenessConfig.awareness_decay_rates.standard_songs}
                          </label>
                          <Slider
                            value={[awarenessConfig.awareness_decay_rates.standard_songs]}
                            onValueChange={(value) => setAwarenessConfig(prev => ({
                              ...prev,
                              awareness_decay_rates: { ...prev.awareness_decay_rates, standard_songs: value[0] }
                            }))}
                            max={0.2}
                            min={0.01}
                            step={0.01}
                            className="w-full"
                          />
                          <div className="text-xs text-white/50 mt-1">Weekly awareness decay for standard songs</div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-white/90 mb-2 block">
                            Weeks 7+ Impact Factor: {awarenessConfig.awareness_impact_factors.weeks_7_plus}
                          </label>
                          <Slider
                            value={[awarenessConfig.awareness_impact_factors.weeks_7_plus]}
                            onValueChange={(value) => setAwarenessConfig(prev => ({
                              ...prev,
                              awareness_impact_factors: { ...prev.awareness_impact_factors, weeks_7_plus: value[0] }
                            }))}
                            max={1.0}
                            min={0.1}
                            step={0.1}
                            className="w-full"
                          />
                          <div className="text-xs text-white/50 mt-1">How much awareness affects streams in weeks 7+</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Left Column - Test Parameters */}
          <div className="lg:col-span-1 space-y-6">

            {/* Song Parameters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Song Parameters</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                <div>
                  <label className="text-sm font-medium text-white/90 mb-2 block">
                    Song Quality: {songQuality}
                  </label>
                  <Slider
                    value={[songQuality]}
                    onValueChange={(value) => setSongQuality(value[0])}
                    max={100}
                    min={20}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>20 (Poor)</span>
                    <span>100 (Perfect)</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-white/90 mb-2 block">
                    Artist Popularity: {artistPopularity}
                  </label>
                  <Slider
                    value={[artistPopularity]}
                    onValueChange={(value) => setArtistPopularity(value[0])}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>0 (Unknown)</span>
                    <span>100 (Superstar)</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-white/90 mb-2 block">
                    Reputation: {reputation}
                  </label>
                  <Slider
                    value={[reputation]}
                    onValueChange={(value) => setReputation(value[0])}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>0 (No Rep)</span>
                    <span>100 (Industry Leader)</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-white/90 mb-2 block">
                    Playlist Access
                  </label>
                  <Select value={playlistAccess} onValueChange={setPlaylistAccess}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="clubs">Clubs</SelectItem>
                      <SelectItem value="theaters">Theaters</SelectItem>
                      <SelectItem value="arenas">Arenas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </CardContent>
            </Card>

            {/* Marketing Budget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Marketing Budget</span>
                  <Badge variant="outline">${totalMarketingBudget.toLocaleString()}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                <div>
                  <label className="text-sm font-medium text-white/90 mb-2 block">
                    Radio: ${marketingBudget.radio.toLocaleString()}
                  </label>
                  <Slider
                    value={[marketingBudget.radio]}
                    onValueChange={(value) => setMarketingBudget(prev => ({ ...prev, radio: value[0] }))}
                    max={15000}
                    min={0}
                    step={500}
                    className="w-full"
                  />
                  <div className="text-xs text-white/50 mt-1">85% effectiveness, 0.1x awareness coefficient</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-white/90 mb-2 block">
                    Digital: ${marketingBudget.digital.toLocaleString()}
                  </label>
                  <Slider
                    value={[marketingBudget.digital]}
                    onValueChange={(value) => setMarketingBudget(prev => ({ ...prev, digital: value[0] }))}
                    max={12000}
                    min={0}
                    step={500}
                    className="w-full"
                  />
                  <div className="text-xs text-white/50 mt-1">92% effectiveness, 0.2x awareness coefficient</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-white/90 mb-2 block">
                    PR: ${marketingBudget.pr.toLocaleString()}
                  </label>
                  <Slider
                    value={[marketingBudget.pr]}
                    onValueChange={(value) => setMarketingBudget(prev => ({ ...prev, pr: value[0] }))}
                    max={8000}
                    min={0}
                    step={500}
                    className="w-full"
                  />
                  <div className="text-xs text-white/50 mt-1">78% effectiveness, 0.4x awareness coefficient (best for awareness)</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-white/90 mb-2 block">
                    Influencer: ${marketingBudget.influencer.toLocaleString()}
                  </label>
                  <Slider
                    value={[marketingBudget.influencer]}
                    onValueChange={(value) => setMarketingBudget(prev => ({ ...prev, influencer: value[0] }))}
                    max={6000}
                    min={0}
                    step={500}
                    className="w-full"
                  />
                  <div className="text-xs text-white/50 mt-1">88% effectiveness, 0.3x awareness coefficient</div>
                </div>

              </CardContent>
            </Card>

          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-6">

            {/* Chart Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>8-Week Streaming Progression</span>
                  {isCalculating && <Loader2 className="w-4 h-4 animate-spin text-brand-burgundy" />}
                </CardTitle>
              </CardHeader>
              <CardContent>

                {error ? (
                  <div className="text-center py-8">
                    <div className="text-red-400 mb-2">Error calculating streams</div>
                    <div className="text-sm text-white/70">{error}</div>
                    <Button onClick={calculateStreamingProgression} variant="outline" size="sm" className="mt-4">
                      Retry
                    </Button>
                  </div>
                ) : isCalculating && testResults.length === 0 ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-brand-burgundy mx-auto mb-4 animate-spin" />
                    <p className="text-white/70">Calculating streaming progression...</p>
                  </div>
                ) : testResults.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="w-8 h-8 text-white/40 mx-auto mb-4" />
                    <p className="text-white/70">Adjust parameters to see streaming progression</p>
                  </div>
                ) : (
                  <div className="space-y-4">

                    {/* Chart Legend */}
                    <div className="flex items-center justify-center space-x-6 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span className="text-white/70">With Marketing & Awareness</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-500 rounded"></div>
                        <span className="text-white/70">Without Marketing</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded"></div>
                        <span className="text-white/70">Awareness Level</span>
                      </div>
                    </div>

                    {/* Visual Chart */}
                    <div className="space-y-2">
                      {testResults.map((result, index) => {
                        const withMarketingHeight = maxStreams > 0 ? (result.withMarketing / maxStreams) * 100 : 0;
                        const withoutMarketingHeight = maxStreams > 0 ? (result.withoutMarketing / maxStreams) * 100 : 0;
                        const marketingBoostPercent = ((result.marketingBoost - 1) * 100).toFixed(1);

                        return (
                          <div key={index} className="flex items-center space-x-3">
                            <div className="w-12 text-xs text-white/70 text-right">
                              Week {result.week}
                            </div>
                            <div className="flex-1 relative h-8 bg-brand-dark-card rounded">
                              {/* Without Marketing Bar (Gray) */}
                              <div
                                className="absolute left-0 top-0 h-full bg-gray-500/60 rounded transition-all"
                                style={{ width: `${withoutMarketingHeight}%` }}
                              />
                              {/* With Marketing Bar (Blue) */}
                              <div
                                className="absolute left-0 top-0 h-full bg-blue-500/80 rounded transition-all"
                                style={{ width: `${withMarketingHeight}%` }}
                              />
                              {/* Awareness Line */}
                              <div
                                className="absolute top-1 h-1 bg-purple-500 rounded-full transition-all"
                                style={{ width: `${(result.awareness || 0)}%` }}
                              />
                              {/* Values Overlay */}
                              <div className="absolute inset-0 flex items-center justify-between px-2 text-xs">
                                <span className="text-white/90 font-mono">
                                  {result.withMarketing.toLocaleString()}
                                </span>
                                <div className="flex items-center space-x-2">
                                  {result.awareness > 0 && (
                                    <span className="text-purple-400 font-mono text-xs">
                                      A:{Math.round(result.awareness)}
                                    </span>
                                  )}
                                  {result.weeksSinceRelease >= 2 && result.weeksSinceRelease <= 4 && (
                                    <span className="text-yellow-400 font-mono">
                                      +{marketingBoostPercent}%
                                    </span>
                                  )}
                                  {result.weeksSinceRelease >= 5 && result.awarenessModifier > 1 && (
                                    <span className="text-green-400 font-mono">
                                      +{(((result.awarenessModifier || 1) - 1) * 100).toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="w-20 text-xs text-white/50 font-mono text-right">
                              {result.withoutMarketing.toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary Stats */}
                    <div className="mt-6 p-4 bg-brand-dark-card/50 rounded-lg">
                      <h4 className="text-sm font-semibold text-white/90 mb-3">8-Week Summary</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-white/70 mb-1">Total Streams (With Marketing)</div>
                          <div className="font-mono font-semibold text-blue-400">
                            {testResults.reduce((sum, r) => sum + r.withMarketing, 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-white/70 mb-1">Total Streams (Without Marketing)</div>
                          <div className="font-mono font-semibold text-gray-400">
                            {testResults.reduce((sum, r) => sum + r.withoutMarketing, 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-white/70 mb-1">Peak Awareness</div>
                          <div className="font-mono font-semibold text-purple-400">
                            {Math.round(peakAwareness)}/100
                          </div>
                        </div>
                        <div>
                          <div className="text-white/70 mb-1">Marketing Boost (Weeks 2-4)</div>
                          <div className="font-mono font-semibold text-yellow-400">
                            +{(() => {
                              const weeks2to4 = testResults.filter(r => r.weeksSinceRelease >= 2 && r.weeksSinceRelease <= 4);
                              if (weeks2to4.length === 0) return '0';
                              const withMarketingTotal = weeks2to4.reduce((sum, r) => sum + r.withMarketing, 0);
                              const withoutMarketingTotal = weeks2to4.reduce((sum, r) => sum + r.withoutMarketing, 0);
                              if (withoutMarketingTotal === 0) return '0';
                              return ((withMarketingTotal / withoutMarketingTotal - 1) * 100).toFixed(1);
                            })()}%
                          </div>
                        </div>
                        <div>
                          <div className="text-white/70 mb-1">Total Awareness Built</div>
                          <div className="font-mono font-semibold text-purple-400">
                            {totalAwarenessBuilt.toFixed(1)} points
                          </div>
                        </div>
                        <div>
                          <div className="text-white/70 mb-1">Sustained Impact (Weeks 5+)</div>
                          <div className="font-mono font-semibold text-green-400">
                            {sustainedImpact.toLocaleString()} streams
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Awareness Insights */}
                    <div className="mt-4 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                      <h4 className="text-sm font-semibold text-purple-300 mb-3">Awareness System Insights</h4>
                      <div className="space-y-2 text-xs text-white/70">
                        <div className="flex justify-between">
                          <span>Breakthrough Potential</span>
                          <span className="text-purple-300">
                            {(peakBreakthrough * 100).toFixed(1)}% chance achieved
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Channel Contributions to Awareness</span>
                          <span className="text-purple-300">
                            PR (0.4x) &gt; Influencer (0.3x) &gt; Digital (0.2x) &gt; Radio (0.1x)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Long-term Value</span>
                          <span className="text-green-300">
                            {peakAwareness > 0
                              ? `${(peakAwareness * 0.5).toFixed(1)}% sustained boost on weeks 7+`
                              : 'Build awareness for sustained impact'}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

              </CardContent>
            </Card>

            {/* Detailed Week-by-Week Breakdown */}
            {testResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 overflow-x-auto">
                    <div className="grid grid-cols-9 gap-2 text-xs font-medium text-white/70 pb-2 border-b border-white/10 min-w-max">
                      <div>Week</div>
                      <div>With Marketing</div>
                      <div>Without Marketing</div>
                      <div>Boost</div>
                      <div>Awareness</div>
                      <div>Gain</div>
                      <div>Decay</div>
                      <div>A-Mod</div>
                      <div>Marketing Active</div>
                    </div>
                    {testResults.map((result, index) => {
                      const marketingBoostPercent = ((result.marketingBoost - 1) * 100).toFixed(1);
                      const isMarketingActive = result.weeksSinceRelease >= 2 && result.weeksSinceRelease <= 4;
                      const awarenessModifierPercent = (((result.awarenessModifier || 1) - 1) * 100).toFixed(1);

                      return (
                        <div key={index} className="grid grid-cols-9 gap-2 text-xs py-1 min-w-max">
                          <div className="text-white/90 font-medium">{result.week}</div>
                          <div className="font-mono text-blue-400">{result.withMarketing.toLocaleString()}</div>
                          <div className="font-mono text-gray-400">{result.withoutMarketing.toLocaleString()}</div>
                          <div className={`font-mono ${isMarketingActive ? 'text-yellow-400' : 'text-white/50'}`}>
                            {isMarketingActive ? `+${marketingBoostPercent}%` : '--'}
                          </div>
                          <div className="font-mono text-purple-400">
                            {result.awareness || 0}
                          </div>
                          <div className="font-mono text-purple-300">
                            {result.awarenessGain > 0 ? `+${result.awarenessGain.toFixed(1)}` : '--'}
                          </div>
                          <div className="font-mono text-purple-500">
                            {result.awarenessDecay > 0 ? `-${result.awarenessDecay.toFixed(1)}` : '--'}
                          </div>
                          <div className="font-mono text-green-400">
                            {(result.awarenessModifier || 1) > 1 ? `+${awarenessModifierPercent}%` : '--'}
                            {result.breakthroughPotential >= 0.5 && (
                              <span className="ml-1 text-yellow-400">🔥</span>
                            )}
                          </div>
                          <div className="text-center">
                            {isMarketingActive ? (
                              <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-400">
                                Active
                              </Badge>
                            ) : (
                              <span className="text-white/30">--</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </main>
    </GameLayout>
  );
}