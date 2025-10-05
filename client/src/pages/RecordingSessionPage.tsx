import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Music, Disc, MapPin, Star, Clock, Zap, Award, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import type { GameState } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useGameStore } from '@/store/gameStore';
import GameLayout from '@/layouts/GameLayout';


export interface ProjectCreationData {
  title: string;
  type: 'Single' | 'EP';
  artistId: string;
  budgetPerSong: number;  // Per-song budget investment
  totalCost?: number;     // Calculated total project cost
  songCount?: number;
  producerTier: 'local' | 'regional' | 'national' | 'legendary';
  timeInvestment: 'rushed' | 'standard' | 'extended' | 'perfectionist';
}

const PROJECT_TYPES = [
  {
    id: 'Single' as const,
    name: 'Single',
    icon: Music,
    description: 'Recording session for 1-3 songs',
    duration: '2-3 weeks',
    isRecording: true,
    minSongs: 1,
    maxSongs: 3,
    defaultSongs: 1
  },
  {
    id: 'EP' as const,
    name: 'EP',
    icon: Disc,
    description: 'Recording session for 3-5 songs',
    duration: '3-5 weeks',
    isRecording: true,
    minSongs: 3,
    maxSongs: 5,
    defaultSongs: 4
  }
];

const PRODUCER_TIERS = [
  {
    id: 'local' as const,
    name: 'Local',
    icon: Music,
    description: 'Neighborhood studio (skill: 40)',
    costMultiplier: 1.0,
    unlockReputation: 0
  },
  {
    id: 'regional' as const,
    name: 'Regional',
    icon: Star,
    description: 'Regional producer (skill: 55)',
    costMultiplier: 1.8,
    unlockReputation: 15
  },
  {
    id: 'national' as const,
    name: 'National',
    icon: Award,
    description: 'National producer (skill: 75)',
    costMultiplier: 3.2,
    unlockReputation: 35
  },
  {
    id: 'legendary' as const,
    name: 'Legendary',
    icon: Zap,
    description: 'Legendary producer (skill: 95)',
    costMultiplier: 5.5,
    unlockReputation: 60
  }
];

const TIME_INVESTMENT_OPTIONS = [
  {
    id: 'rushed' as const,
    name: 'Rushed',
    icon: Clock,
    description: 'Quick turnaround',
    costMultiplier: 0.7
  },
  {
    id: 'standard' as const,
    name: 'Standard',
    icon: Clock,
    description: 'Normal timeline',
    costMultiplier: 1.0
  },
  {
    id: 'extended' as const,
    name: 'Extended',
    icon: Clock,
    description: 'Extra time',
    costMultiplier: 1.4
  },
  {
    id: 'perfectionist' as const,
    name: 'Perfectionist',
    icon: Clock,
    description: 'Maximum quality',
    costMultiplier: 2.1
  }
];

interface ProjectTypeAPI {
  single?: {
    min: number;
    max: number;
    quality_multiplier: number;
    song_count_default: number;
  };
  ep?: {
    min: number;
    max: number;
    quality_multiplier: number;
    song_count_default: number;
  };
  mini_tour?: {
    min: number;
    max: number;
    venue_tier_multiplier?: Record<string, number>;
  };
}

export default function RecordingSessionPage() {
  const [, setLocation] = useLocation();
  const { gameState, artists, createProject } = useGameStore();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedType, setSelectedType] = useState<'Single' | 'EP' | null>(null);

  // Get artistId from URL params if provided
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedArtistId = urlParams.get('artistId');
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [title, setTitle] = useState('');
  const [budgetPerSong, setBudgetPerSong] = useState(0);
  const [songCount, setSongCount] = useState(1);
  const [selectedProducerTier, setSelectedProducerTier] = useState<'local' | 'regional' | 'national' | 'legendary'>('local');
  const [selectedTimeInvestment, setSelectedTimeInvestment] = useState<'rushed' | 'standard' | 'extended' | 'perfectionist'>('standard');

  // API state for project types
  const [projectTypesAPI, setProjectTypesAPI] = useState<ProjectTypeAPI>({});
  const [loadingProjectTypes, setLoadingProjectTypes] = useState(false);
  const [projectTypesError, setProjectTypesError] = useState<string | null>(null);

  // Fetch project types from API
  const fetchProjectTypes = async () => {
    setLoadingProjectTypes(true);
    setProjectTypesError(null);
    try {
      const response = await apiRequest('GET', '/api/project-types');
      const data = await response.json();
      setProjectTypesAPI(data.projectTypes || {});
    } catch (err) {
      console.error('Failed to fetch project types:', err);
      setProjectTypesError(err instanceof Error ? err.message : 'Failed to load project types');
      setProjectTypesAPI({});
    } finally {
      setLoadingProjectTypes(false);
    }
  };

  useEffect(() => {
    fetchProjectTypes();
  }, []);

  // Handle URL parameter for artist pre-selection
  useEffect(() => {
    if (preselectedArtistId && !selectedArtist) {
      setSelectedArtist(preselectedArtistId);
    }
  }, [preselectedArtistId, selectedArtist]);

  const currentMoney = gameState?.money || 75000;
  const currentReputation = gameState?.reputation || 0;
  const currentCreativeCapital = gameState?.creativeCapital || 0;
  const selectedProjectType = PROJECT_TYPES.find(type => type.id === selectedType);
  const selectedProducer = PRODUCER_TIERS.find(tier => tier.id === selectedProducerTier);
  const selectedTimeOption = TIME_INVESTMENT_OPTIONS.find(option => option.id === selectedTimeInvestment);

  // Calculate total cost with clear per-song to total flow
  const actualSongCount = selectedProjectType?.isRecording ? songCount : 1; // Tours use songCount=1 for calculation
  const baseCostPerSong = budgetPerSong;
  const totalBaseCost = baseCostPerSong * actualSongCount;
  const producerMultiplier = selectedProducer?.costMultiplier || 1.0;
  const timeMultiplier = selectedTimeOption?.costMultiplier || 1.0;
  const finalTotalCost = Math.round(totalBaseCost * producerMultiplier * timeMultiplier);

  // Budget calculation state
  const [budgetCalculation, setBudgetCalculation] = useState<{
    budgetMultiplier: number;
    efficiencyRating: { rating: string; description: string; color: string };
    minimumViableCost: number;
  } | null>(null);

  // Fetch budget calculation from backend
  const fetchBudgetCalculation = async () => {
    if (!selectedType || !budgetPerSong || budgetPerSong <= 0) {
      setBudgetCalculation(null);
      return;
    }

    try {
      const response = await apiRequest('POST', '/api/budget-calculation', {
        budgetPerSong,
        projectType: selectedType,
        producerTier: selectedProducerTier,
        timeInvestment: selectedTimeInvestment,
        songCount
      });
      const data = await response.json();
      setBudgetCalculation(data);
    } catch (error) {
      console.error('Failed to fetch budget calculation:', error);
      setBudgetCalculation(null);
    }
  };

  // Trigger budget calculation when relevant values change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchBudgetCalculation();
    }, 300); // Debounce API calls

    return () => clearTimeout(timeoutId);
  }, [budgetPerSong, selectedType, selectedProducerTier, selectedTimeInvestment, songCount]);

  // Calculate estimated quality with new multiplicative formula
  // IMPORTANT: This preview calculation must match the backend formula in:
  // shared/engine/game-engine.ts (calculateEnhancedSongQuality method, line ~1577)
  const selectedArtistData = selectedArtist ? artists.find(a => a.id === selectedArtist) : null;
  
  // 1. Base quality (talent + producer skill)
  const producerSkillMap: Record<string, number> = {
    'local': 40,
    'regional': 55,
    'national': 75,
    'legendary': 95
  };
  const producerSkill = producerSkillMap[selectedProducer?.id || 'local'] || 40;
  const artistTalent = selectedArtistData?.talent || 50;
  const baseQuality = (artistTalent * 0.65 + producerSkill * 0.35);
  
  // 2. Work ethic & time synergy
  const timeMultipliers: Record<string, number> = {
    'rushed': 0.7,
    'standard': 1.0,
    'extended': 1.1,
    'perfectionist': 1.2
  };
  const artistWorkEthic = selectedArtistData?.workEthic || 50;
  const workEthicBonus = (artistWorkEthic / 100) * 0.3;
  const timeFactor = (timeMultipliers[selectedTimeOption?.id || 'standard'] || 1.0) * (1 + workEthicBonus);
  
  // 3. Popularity factor (balanced: 0.95x to 1.05x range)
  const artistPopularity = selectedArtistData?.popularity || 0;
  const popularityFactor = 0.95 + 0.1 * Math.sqrt(artistPopularity / 100);
  
  // 4. Session fatigue (quality drops for multiple songs)
  const focusFactor = Math.pow(0.97, Math.max(0, songCount - 3));
  
  // 5. Budget factor
  const budgetFactor = budgetCalculation?.budgetMultiplier || 1.0;

  // Get budget efficiency information for display
  const budgetEfficiency = budgetCalculation?.efficiencyRating || null;

  // Calculate minimum viable cost for display
  const minimumViableCost = budgetCalculation?.minimumViableCost || 0;
  
  // 6. Mood factor
  const artistMood = selectedArtistData?.mood || 50;
  const moodFactor = 0.9 + 0.2 * (artistMood / 100);
  
  // Combine all factors multiplicatively
  let estimatedQuality = baseQuality * timeFactor * popularityFactor * focusFactor * budgetFactor * moodFactor;
  
  // Apply floor and ceiling
  estimatedQuality = Math.round(Math.min(98, Math.max(25, estimatedQuality)));

  // Check if producer tier is unlocked
  const getUnlockedProducers = () => {
    return PRODUCER_TIERS.filter(tier => currentReputation >= tier.unlockReputation);
  };

  const handleTypeSelect = (type: 'Single' | 'EP') => {
    setSelectedType(type);

    // Use API data
    const apiKey = type === 'Single' ? 'single' : 'ep';
    const apiProjectType = projectTypesAPI[apiKey];
    const fallbackProjectType = PROJECT_TYPES.find(p => p.id === type);

    if (apiProjectType) {
      // Use API data for song count and budget
      const songCountDefault = apiProjectType.song_count_default || fallbackProjectType?.defaultSongs || 1;
      setSongCount(songCountDefault);

      // For recording projects, convert total to per-song
      const minPerSong = Math.round(apiProjectType.min / songCountDefault);
      const maxPerSong = Math.round(apiProjectType.max / songCountDefault);
      const defaultPerSong = Math.floor((minPerSong + maxPerSong) / 2);
      setBudgetPerSong(defaultPerSong);
    } else {
      // Use local data as fallback
      setSongCount(fallbackProjectType?.defaultSongs || 1);
      setBudgetPerSong(5000);
    }

    // Auto-generate title if artist is already selected
    if (selectedArtist) {
      const artist = artists.find(a => a.id === selectedArtist);
      if (artist) {
        setTitle(`${artist.name} Recording Session`);
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedType || !selectedArtist || !title) return;

    const projectData: ProjectCreationData = {
      title,
      type: selectedType,
      artistId: selectedArtist,
      budgetPerSong: budgetPerSong,
      totalCost: finalTotalCost,
      songCount: selectedProjectType?.isRecording ? songCount : undefined,
      producerTier: selectedProducerTier,
      timeInvestment: selectedTimeInvestment
    };

    try {
      setIsCreating(true);
      await createProject(projectData);
      setLocation('/');
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const canAfford = finalTotalCost <= currentMoney;
  const hasCreativeCapital = currentCreativeCapital >= 1;
  
  // Check if budget is within valid range
  const isBudgetValid = (() => {
    if (!selectedType) return true; // Don't validate if no type selected
    const apiKey = selectedType === 'Single' ? 'single' : 'ep';
    const apiProjectType = projectTypesAPI[apiKey];
    
    if (apiProjectType && selectedProjectType?.isRecording) {
      const defaultSongs = 'song_count_default' in apiProjectType ? apiProjectType.song_count_default : songCount;
      const minPerSong = Math.round(apiProjectType.min / defaultSongs);
      const maxPerSong = Math.round(apiProjectType.max / defaultSongs);
      return budgetPerSong >= minPerSong && budgetPerSong <= maxPerSong;
    }
    return true;
  })();

  const isValid = selectedType && selectedArtist && title && canAfford && hasCreativeCapital && isBudgetValid;

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
          <h1 className="text-2xl font-heading font-bold text-white">Recording Session</h1>
        </div>

        <div className="space-y-6">
          {/* Project Type Selection */}
          <div>
            <Label className="text-base font-semibold text-white">Project Type</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {loadingProjectTypes ? (
                <div className="col-span-2 text-center py-8">
                  <Loader2 className="w-8 h-8 text-brand-burgundy mx-auto mb-4 animate-spin" />
                  <p className="text-white/70">Loading project types...</p>
                </div>
              ) : projectTypesError ? (
                <div className="col-span-2 text-center py-8">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
                  <p className="text-red-600 mb-4">Failed to load project types. Please refresh the page.</p>
                </div>
              ) : (
                PROJECT_TYPES.map((type) => {
                  // Get budget range from API if available
                  const apiKey = type.id === 'Single' ? 'single' : 'ep';
                  const apiProjectType = projectTypesAPI[apiKey];

                  // Calculate per-song budget range for recording projects
                  let budgetRange = 'Loading...';
                  if (apiProjectType && type.isRecording) {
                    const defaultSongCount = apiProjectType.song_count_default || type.defaultSongs || 1;
                    const minPerSong = Math.round(apiProjectType.min / defaultSongCount);
                    const maxPerSong = Math.round(apiProjectType.max / defaultSongCount);
                    budgetRange = `$${minPerSong.toLocaleString()} - $${maxPerSong.toLocaleString()} per song`;
                  } else if (apiProjectType) {
                    budgetRange = `$${apiProjectType.min?.toLocaleString()} - $${apiProjectType.max?.toLocaleString()}`;
                  }

                  return (
                    <Card
                      key={type.id}
                      className={`cursor-pointer transition-all hover:shadow-md bg-brand-dark-card border-brand-purple ${
                        selectedType === type.id ? 'ring-2 ring-brand-burgundy bg-brand-burgundy/10' : ''
                      }`}
                      onClick={() => handleTypeSelect(type.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <type.icon className="w-6 h-6 text-brand-burgundy" />
                          <div>
                            <h3 className="font-semibold text-white">{type.name}</h3>
                            <p className="text-sm text-white/70">{type.description}</p>
                            <p className="text-xs text-white/50">{budgetRange}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {selectedType && (
            <>
              {/* Artist Selection */}
              <div>
                <Label htmlFor="artist" className="text-white">Artist</Label>
                <Select value={selectedArtist} onValueChange={(value) => {
                  setSelectedArtist(value);
                  const artist = artists.find(a => a.id === value);
                  if (artist && selectedType) {
                    setTitle(`${artist.name} Recording Session`);
                  }
                }}>
                  <SelectTrigger className="bg-brand-dark border-brand-purple text-white">
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
                          <Badge variant="outline" className="text-xs">
                            Mood: {artist.mood || 0}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Loyalty: {artist.loyalty || 0}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project Title */}
              <div>
                <Label htmlFor="title" className="text-white">Project Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter project title"
                  className="bg-brand-dark border-brand-purple text-white"
                />
              </div>

              {/* Producer Tier Selection */}
              <div>
                <Label className="text-base font-semibold text-white">Producer Tier</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {PRODUCER_TIERS.map((tier) => {
                    const isUnlocked = currentReputation >= tier.unlockReputation;
                    return (
                      <Card
                        key={tier.id}
                        className={`cursor-pointer transition-all bg-brand-dark-card border-brand-purple ${
                          !isUnlocked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
                        } ${
                          selectedProducerTier === tier.id ? 'ring-2 ring-brand-burgundy bg-brand-burgundy/10' : ''
                        }`}
                        onClick={() => isUnlocked && setSelectedProducerTier(tier.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <tier.icon className="w-5 h-5 text-brand-burgundy" />
                              <div>
                                <h4 className="font-semibold text-white">{tier.name}</h4>
                                <p className="text-sm text-white/70">{tier.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-white/50">{tier.costMultiplier}x Cost</p>
                            </div>
                          </div>
                          {!isUnlocked && (
                            <Badge variant="secondary" className="mt-2">
                              Requires {tier.unlockReputation} Reputation
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Time Investment */}
              <div>
                <Label className="text-base font-semibold text-white">Time Investment</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {TIME_INVESTMENT_OPTIONS.map((option) => (
                    <Card
                      key={option.id}
                      className={`cursor-pointer transition-all hover:shadow-md bg-brand-dark-card border-brand-purple ${
                        selectedTimeInvestment === option.id ? 'ring-2 ring-brand-burgundy bg-brand-burgundy/10' : ''
                      }`}
                      onClick={() => setSelectedTimeInvestment(option.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <option.icon className="w-5 h-5 text-brand-burgundy" />
                            <div>
                              <h4 className="font-semibold text-white">{option.name}</h4>
                              <p className="text-sm text-white/70">{option.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-white/50">{option.costMultiplier}x Cost</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Budget Per Song */}
              <div>
                <Label htmlFor="budgetPerSong" className="text-white">
                  {selectedProjectType?.isRecording ? 'Budget Per Song' : 'Budget'}
                  {!isBudgetValid && budgetPerSong > 0 && (
                    <span className="text-red-500 text-sm ml-2">
                      (Outside valid range)
                    </span>
                  )}
                </Label>
                <Input
                  id="budgetPerSong"
                  type="number"
                  value={budgetPerSong}
                  onChange={(e) => setBudgetPerSong(Number(e.target.value))}
                  className={`bg-brand-dark border-brand-purple text-white ${!isBudgetValid && budgetPerSong > 0 ? 'border-red-500' : ''}`}
                  min={(() => {
                    if (!selectedType) return undefined;
                    const apiKey = selectedType === 'Single' ? 'single' : 'ep';
                    const apiProjectType = projectTypesAPI[apiKey];
                    if (apiProjectType && selectedProjectType?.isRecording) {
                      const defaultSongs = 'song_count_default' in apiProjectType ? apiProjectType.song_count_default : songCount;
                      return Math.round(apiProjectType.min / defaultSongs);
                    }
                    return apiProjectType?.min;
                  })()}
                  max={(() => {
                    if (!selectedType) return undefined;
                    const apiKey = selectedType === 'Single' ? 'single' : 'ep';
                    const apiProjectType = projectTypesAPI[apiKey];
                    if (apiProjectType && selectedProjectType?.isRecording) {
                      const defaultSongs = 'song_count_default' in apiProjectType ? apiProjectType.song_count_default : songCount;
                      return Math.round(apiProjectType.max / defaultSongs);
                    }
                    return apiProjectType?.max;
                  })()}
                  placeholder={selectedProjectType?.isRecording ? "Investment per song" : "Total budget"}
                />
                <div className="mt-2 text-sm space-y-1">
                  {selectedProjectType?.isRecording && (
                    <div className="p-3 bg-brand-dark-card/20 rounded-lg border border-brand-purple">
                      <h4 className="font-medium text-white/90 mb-2">Cost Calculation:</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-white/70">Budget per song:</span>
                          <span className="font-mono text-white">${budgetPerSong.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Number of songs:</span>
                          <span className="font-mono text-white">{songCount} song{songCount > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex justify-between border-t border-brand-purple pt-1">
                          <span className="text-white/70">Base cost:</span>
                          <span className="font-mono text-white">${totalBaseCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Producer ({producerMultiplier}x):</span>
                          <span className="font-mono text-white">${Math.round(totalBaseCost * producerMultiplier).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Time investment ({timeMultiplier}x):</span>
                          <span className="font-mono text-white">${finalTotalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-brand-purple pt-1 font-semibold">
                          <span className="text-white">Final total cost:</span>
                          <span className="font-mono text-brand-burgundy">${finalTotalCost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {!selectedProjectType?.isRecording && (
                    <div className="text-white/70">
                      <p>Total cost with multipliers: ${finalTotalCost.toLocaleString()}</p>
                    </div>
                  )}
                  {/* Quality Preview with Breakdown */}
                  <div className="p-3 bg-brand-burgundy/10 rounded-lg border border-brand-purple">
                    <h4 className="font-medium text-brand-burgundy mb-2">Quality Preview:</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-brand-burgundy">Base (talent+producer):</span>
                        <span className="font-mono text-white">{Math.round(baseQuality)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-burgundy">Time & Work Ethic factor:</span>
                        <span className="font-mono text-white">×{timeFactor.toFixed(2)}</span>
                      </div>
                      {selectedArtist && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-brand-burgundy">Popularity factor:</span>
                            <span className="font-mono text-white">×{popularityFactor.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-brand-burgundy">Mood factor:</span>
                            <span className="font-mono text-white">×{moodFactor.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      {songCount > 3 && (
                        <div className="flex justify-between">
                          <span className="text-brand-burgundy">Session fatigue:</span>
                          <span className="font-mono text-amber-500">×{focusFactor.toFixed(2)}</span>
                        </div>
                      )}
                      {selectedProjectType?.isRecording && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-brand-burgundy">Budget factor:</span>
                            <span className="font-mono font-semibold text-green-600">
                              ×{budgetFactor.toFixed(2)}
                            </span>
                          </div>
                          {budgetEfficiency && budgetEfficiency.rating !== 'Unknown' && (
                            <div className="text-xs mt-1">
                              <span className={`${budgetEfficiency.color} font-medium`}>{budgetEfficiency.rating}:</span>
                              <span className="text-white/60 ml-1">{budgetEfficiency.description}</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex justify-between border-t border-brand-purple pt-1">
                        <span className="text-brand-burgundy font-medium">Est. quality:</span>
                        <span className="font-mono font-bold text-brand-burgundy">{Math.round(estimatedQuality)}</span>
                      </div>
                      {selectedProjectType?.isRecording && selectedArtist && selectedProducer && (
                        <div className="text-xs text-white/50 mt-1">
                          <span>Variance: ±{Math.round(35 - 30 * ((selectedArtistData?.talent || 50) + (selectedProducer?.id === 'legendary' ? 95 : selectedProducer?.id === 'national' ? 75 : selectedProducer?.id === 'regional' ? 55 : 40)) / 200)}%</span>
                          <span className="ml-1">(10% chance of outliers)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Song Count for Recording Projects */}
              {selectedProjectType?.isRecording && (
                <div>
                  <Label htmlFor="songCount" className="text-white">Number of Songs</Label>
                  <Input
                    id="songCount"
                    type="number"
                    value={songCount}
                    onChange={(e) => setSongCount(Number(e.target.value))}
                    min={selectedProjectType.minSongs}
                    max={selectedProjectType.maxSongs}
                    className="bg-brand-dark border-brand-purple text-white"
                  />
                </div>
              )}

              {/* Budget Warning */}
              {!canAfford && (
                <div className="p-4 bg-red-100/10 border border-red-300/30 rounded-md">
                  <p className="text-red-400">
                    Insufficient funds! Need ${finalTotalCost.toLocaleString()} but only have ${currentMoney.toLocaleString()}
                  </p>
                </div>
              )}
              
              {/* Creative Capital Warning */}
              {!hasCreativeCapital && (
                <div className="p-4 bg-red-100/10 border border-red-300/30 rounded-md">
                  <p className="text-red-400">
                    Insufficient creative capital! Need 1 creative capital to start a new project, but you have {currentCreativeCapital}.
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
                  className="bg-brand-burgundy hover:bg-brand-rose text-white"
                >
                  {isCreating ? 'Creating...' : 'Start Recording Session'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </GameLayout>
  );
}
