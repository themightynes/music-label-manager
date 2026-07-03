import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Music, Disc3, MapPin, Star, Clock, Zap, Award, Loader2, AlertCircle, SlidersHorizontal } from 'lucide-react';
import type { GameState } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useGameStore } from '@/store/gameStore';
import { useArtists } from '@/hooks/useArtists';
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
    icon: Disc3,
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
  const { gameState, createProject } = useGameStore();
  // Phase 3 PR-9: artists roster read from the TanStack Query cache, not Zustand.
  const { data: artists = [] } = useArtists();
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
      setLocation('/game');
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
        <header className="mb-6 flex items-start justify-between">
          <div>
            <div className="text-label text-[10px] uppercase tracking-[0.24em] text-neon-lilac/60 mb-1 flex items-center gap-2">
              <SlidersHorizontal className="w-3 h-3" />
              Recording
            </div>
            <h1 className="font-display text-2xl md:text-[28px] text-text-primary text-aberration">Recording Session</h1>
            <div className="shimmer-bar w-40 mt-2" />
          </div>
          <div className="inline-flex items-center gap-2 rounded-pill border border-white/10 bg-white/5 px-4 py-2 text-label text-[10px] font-semibold uppercase tracking-[0.4em] text-text-muted">
            The Studio
          </div>
        </header>

        <section
          className="glass-panel chromatic-hairline hud-ticks relative mb-8 min-h-[320px] bg-cover bg-center"
          style={{ backgroundImage: "url('/recording_session_background.png')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-surface-panel/70 via-transparent to-surface-panel-alt/80" aria-hidden />
          <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-neon-purple/20 blur-3xl" aria-hidden />
          <div className="absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-neon-amber/10 blur-3xl" aria-hidden />
          <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6">
            <Badge variant="outline" className="inline-flex items-center gap-1 px-4 py-2 text-sm font-normal text-text-body bg-white/10 border-white/20 text-center max-w-full rounded-pill">
              Smooth sessions lift spirits; tough takes linger—your artist’s <span className="font-semibold text-neon-lilac">Mood</span> and each song’s <span className="font-semibold text-money">Quality</span> shift with every take you chase.
            </Badge>
          </div>
        </section>

        <div className="space-y-6">
          {/* Project Type Selection */}
          <div>
            <Label className="text-label text-[10px] uppercase tracking-[0.2em] text-text-label">Project Type</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {loadingProjectTypes ? (
                <div className="col-span-2 text-center py-8">
                  <Loader2 className="w-8 h-8 text-neon-purple mx-auto mb-4 animate-spin" />
                  <p className="text-text-body">Loading project types...</p>
                </div>
              ) : projectTypesError ? (
                <div className="col-span-2 text-center py-8">
                  <AlertCircle className="w-8 h-8 text-negative mx-auto mb-4" />
                  <p className="text-negative mb-4">Failed to load project types. Please refresh the page.</p>
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

                  const isSelected = selectedType === type.id;

                  return (
                    <div
                      key={type.id}
                      className={`cursor-pointer transition-all rounded-card border p-4 ${
                        isSelected
                          ? 'bg-gradient-to-br from-action-pink/20 to-action-purple/20 border-neon-purple/50 shadow-glow-purple'
                          : 'bg-surface-inner/50 border-white/10 hover:border-white/20 hover:bg-white/[0.03]'
                      }`}
                      onClick={() => handleTypeSelect(type.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <type.icon className={`w-6 h-6 ${isSelected ? 'text-neon-lilac' : 'text-neon-purple'}`} />
                        <div>
                          <h3 className="font-semibold text-text-primary">{type.name}</h3>
                          <p className="text-sm text-text-body">{type.description}</p>
                          <p className="text-xs font-mono text-text-muted">{budgetRange}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {selectedType && (
            <>
              {/* Artist Selection */}
              <div>
                <Label htmlFor="artist" className="text-label text-[10px] uppercase tracking-[0.2em] text-text-label">Artist</Label>
                <Select value={selectedArtist} onValueChange={(value) => {
                  setSelectedArtist(value);
                  const artist = artists.find(a => a.id === value);
                  if (artist && selectedType) {
                    setTitle(`${artist.name} Recording Session`);
                  }
                }}>
                  <SelectTrigger className="bg-surface-inner border-white/10 text-text-primary">
                    <SelectValue placeholder="Select an artist" />
                  </SelectTrigger>
                  <SelectContent>
                    {artists.map((artist) => (
                      <SelectItem key={artist.id} value={artist.id}>
                        <div className="flex items-center space-x-2">
                          <span>{artist.name}</span>
                          <Badge variant="outline" className="text-xs font-mono">
                            Pop: {artist.popularity || 0}
                          </Badge>
                          <Badge variant="outline" className="text-xs font-mono">
                            Mood: {artist.mood || 0}
                          </Badge>
                          <Badge variant="outline" className="text-xs font-mono">
                            Energy: {artist.energy ?? 0}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project Title */}
              <div>
                <Label htmlFor="title" className="text-label text-[10px] uppercase tracking-[0.2em] text-text-label">Project Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter project title"
                  className="bg-surface-inner border-white/10 text-text-primary"
                />
              </div>

              {/* Producer Tier Selection */}
              <div>
                <Label className="text-label text-[10px] uppercase tracking-[0.2em] text-text-label">Producer Tier</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {PRODUCER_TIERS.map((tier) => {
                    const isUnlocked = currentReputation >= tier.unlockReputation;
                    const isSelected = selectedProducerTier === tier.id;
                    return (
                      <div
                        key={tier.id}
                        className={`transition-all rounded-card border p-4 ${
                          !isUnlocked
                            ? 'opacity-50 cursor-not-allowed bg-surface-inner/50 border-white/10'
                            : 'cursor-pointer bg-surface-inner/50 border-white/10 hover:border-white/20 hover:bg-white/[0.03]'
                        } ${
                          isSelected ? 'bg-gradient-to-br from-action-pink/20 to-action-purple/20 border-neon-purple/50 shadow-glow-purple' : ''
                        }`}
                        onClick={() => isUnlocked && setSelectedProducerTier(tier.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <tier.icon className={`w-5 h-5 ${isSelected ? 'text-neon-lilac' : 'text-neon-purple'}`} />
                            <div>
                              <h4 className="font-semibold text-text-primary">{tier.name}</h4>
                              <p className="text-sm text-text-body">{tier.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-mono text-text-muted">{tier.costMultiplier}x Cost</p>
                          </div>
                        </div>
                        {!isUnlocked && (
                          <Badge variant="secondary" className="mt-2 rounded-chip">
                            Requires {tier.unlockReputation} Reputation
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Time Investment */}
              <div>
                <Label className="text-label text-[10px] uppercase tracking-[0.2em] text-text-label">Time Investment</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {TIME_INVESTMENT_OPTIONS.map((option) => {
                    const isSelected = selectedTimeInvestment === option.id;
                    return (
                      <div
                        key={option.id}
                        className={`cursor-pointer transition-all rounded-card border p-4 ${
                          isSelected
                            ? 'bg-gradient-to-br from-action-pink/20 to-action-purple/20 border-neon-purple/50 shadow-glow-purple'
                            : 'bg-surface-inner/50 border-white/10 hover:border-white/20 hover:bg-white/[0.03]'
                        }`}
                        onClick={() => setSelectedTimeInvestment(option.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <option.icon className={`w-5 h-5 ${isSelected ? 'text-neon-lilac' : 'text-neon-purple'}`} />
                            <div>
                              <h4 className="font-semibold text-text-primary">{option.name}</h4>
                              <p className="text-sm text-text-body">{option.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-mono text-text-muted">{option.costMultiplier}x Cost</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Budget Per Song */}
              <div>
                <Label htmlFor="budgetPerSong" className="text-label text-[10px] uppercase tracking-[0.2em] text-text-label">
                  {selectedProjectType?.isRecording ? 'Budget Per Song' : 'Budget'}
                  {!isBudgetValid && budgetPerSong > 0 && (
                    <span className="text-negative text-sm ml-2 normal-case tracking-normal">
                      (Outside valid range)
                    </span>
                  )}
                </Label>
                <Input
                  id="budgetPerSong"
                  type="number"
                  value={budgetPerSong}
                  onChange={(e) => setBudgetPerSong(Number(e.target.value))}
                  className={`bg-surface-inner border-white/10 text-text-primary font-mono ${!isBudgetValid && budgetPerSong > 0 ? 'border-negative' : ''}`}
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
                <div className="mt-2 text-sm space-y-3">
                  {selectedProjectType?.isRecording && (
                    <div className="glass-panel chromatic-hairline p-4">
                      <h4 className="font-medium text-text-primary mb-2 text-label text-[10px] uppercase tracking-[0.2em]">Cost Calculation</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-text-body">Budget per song:</span>
                          <span className="font-mono text-money">${budgetPerSong.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-body">Number of songs:</span>
                          <span className="font-mono text-text-primary">{songCount} song{songCount > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/10 pt-1">
                          <span className="text-text-body">Base cost:</span>
                          <span className="font-mono text-money">${totalBaseCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-body">Producer ({producerMultiplier}x):</span>
                          <span className="font-mono text-money">${Math.round(totalBaseCost * producerMultiplier).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-body">Time investment ({timeMultiplier}x):</span>
                          <span className="font-mono text-money">${finalTotalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/10 pt-1 font-semibold">
                          <span className="text-text-primary">Final total cost:</span>
                          <span className="font-mono text-money">${finalTotalCost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {!selectedProjectType?.isRecording && (
                    <div className="text-text-body">
                      <p>Total cost with multipliers: <span className="font-mono text-money">${finalTotalCost.toLocaleString()}</span></p>
                    </div>
                  )}
                  {/* Quality Preview with Breakdown */}
                  <div className="glass-panel chromatic-hairline p-4">
                    <h4 className="font-medium text-neon-lilac mb-2 text-label text-[10px] uppercase tracking-[0.2em]">Quality Preview</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-text-body">Base (talent+producer):</span>
                        <span className="font-mono text-text-primary">{Math.round(baseQuality)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-body">Time & Work Ethic factor:</span>
                        <span className="font-mono text-text-primary">×{timeFactor.toFixed(2)}</span>
                      </div>
                      {selectedArtist && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-text-body">Popularity factor:</span>
                            <span className="font-mono text-text-primary">×{popularityFactor.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-body">Mood factor:</span>
                            <span className="font-mono text-text-primary">×{moodFactor.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      {songCount > 3 && (
                        <div className="flex justify-between">
                          <span className="text-text-body">Session fatigue:</span>
                          <span className="font-mono text-warning">×{focusFactor.toFixed(2)}</span>
                        </div>
                      )}
                      {selectedProjectType?.isRecording && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-text-body">Budget factor:</span>
                            <span className="font-mono font-semibold text-positive">
                              ×{budgetFactor.toFixed(2)}
                            </span>
                          </div>
                          {budgetEfficiency && budgetEfficiency.rating !== 'Unknown' && (
                            <div className="text-xs mt-1">
                              <span className={`${budgetEfficiency.color} font-medium`}>{budgetEfficiency.rating}:</span>
                              <span className="text-text-muted ml-1">{budgetEfficiency.description}</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex justify-between border-t border-white/10 pt-1">
                        <span className="text-neon-lilac font-medium">Est. quality:</span>
                        <span className="font-mono font-bold text-neon-lilac">{Math.round(estimatedQuality)}</span>
                      </div>
                      {selectedProjectType?.isRecording && selectedArtist && selectedProducer && (
                        <div className="text-xs text-text-muted mt-1">
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
                  <Label htmlFor="songCount" className="text-label text-[10px] uppercase tracking-[0.2em] text-text-label">Number of Songs</Label>
                  <Input
                    id="songCount"
                    type="number"
                    value={songCount}
                    onChange={(e) => setSongCount(Number(e.target.value))}
                    min={selectedProjectType.minSongs}
                    max={selectedProjectType.maxSongs}
                    className="bg-surface-inner border-white/10 text-text-primary font-mono"
                  />
                </div>
              )}

              {/* Budget Warning */}
              {!canAfford && (
                <div className="p-4 bg-negative/10 border border-negative/30 rounded-card">
                  <p className="text-negative">
                    Insufficient funds! Need <span className="font-mono">${finalTotalCost.toLocaleString()}</span> but only have <span className="font-mono">${currentMoney.toLocaleString()}</span>
                  </p>
                </div>
              )}

              {/* Creative Capital Warning */}
              {!hasCreativeCapital && (
                <div className="p-4 bg-negative/10 border border-negative/30 rounded-card">
                  <p className="text-negative">
                    Insufficient creative capital! Need 1 creative capital to start a new project, but you have {currentCreativeCapital}.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setLocation('/game')}
                  className="rounded-button border-white/10 bg-white/[0.02] text-text-body hover:bg-white/[0.05]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!isValid || isCreating}
                  className="rounded-button bg-gradient-to-br from-action-pink to-action-purple shadow-action text-white font-semibold hover:opacity-90 disabled:opacity-40"
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
