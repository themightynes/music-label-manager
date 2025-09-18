import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Music, Disc, MapPin, Star, Clock, Zap, Award, Loader2, AlertCircle } from 'lucide-react';
import type { GameState } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface ProjectCreationModalProps {
  gameState: GameState;
  artists: any[];
  onCreateProject: (projectData: ProjectCreationData) => void;
  isCreating: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

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

// PROJECT_TYPES moved to API - will be fetched from /api/project-types
// Temporary fallback data with defensive programming
// NOTE: Mini-Tour removed - now handled by dedicated Live Performance system
const PROJECT_TYPES_FALLBACK = [
  {
    id: 'Single' as const,
    name: 'Single',
    icon: Music,
    description: 'Recording session for 1-3 songs',
    duration: '2-3 months',
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
    duration: '3-5 months',
    isRecording: true,
    minSongs: 3,
    maxSongs: 5,
    defaultSongs: 4
  }
];

// Use fallback data until API integration is complete
const PROJECT_TYPES = PROJECT_TYPES_FALLBACK;

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

export function ProjectCreationModal({ 
  gameState, 
  artists, 
  onCreateProject, 
  isCreating, 
  open = false, 
  onOpenChange 
}: ProjectCreationModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  const [selectedType, setSelectedType] = useState<'Single' | 'EP' | null>(null);
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
    if (open) {
      fetchProjectTypes();
    }
  }, [open]);

  const currentMoney = gameState.money || 75000;
  const currentReputation = gameState.reputation || 0;
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

  // Calculate dynamic minimum viable cost (matches backend calculation)
  const calculateDynamicMinViableCost = (projectType: string, producerTier: string, timeInvestment: string, songCount: number): number => {
    // Base per-song costs
    const baseCosts = {
      'Single': 3500,
      'EP': 4000,
      'Mini-Tour': 3500
    };
    
    let baseCostPerSong = baseCosts[projectType as keyof typeof baseCosts] || 3500;
    
    // Apply economies of scale for multi-song projects
    if (songCount > 1) {
      const economiesMultiplier = songCount >= 7 ? 0.8 :
                                 songCount >= 4 ? 0.85 :
                                 songCount >= 2 ? 0.9 : 1.0;
      baseCostPerSong *= economiesMultiplier;
    }
    
    // Don't apply producer and time multipliers to minimum viable cost
    // These are already reflected in the actual project cost the player pays
    // The minimum viable should represent the baseline quality expectation
    
    // Apply baseline quality multiplier for recording sessions
    // This ensures minimum selectable budgets don't give quality bonuses
    const baselineQualityMultiplier = (projectType === 'Single' || projectType === 'EP') ? 1.5 : 1.0;
    
    return Math.round(baseCostPerSong * baselineQualityMultiplier);
  };
  
  // Calculate budget multiplier using new 5-segment piecewise function
  const calculateBudgetMultiplier = (budgetPerSong: number, projectType: string, producerTier: string, timeInvestment: string, songCount: number): number => {
    if (budgetPerSong <= 0) return 1.0;
    
    const minViableCost = calculateDynamicMinViableCost(projectType, producerTier, timeInvestment, songCount);
    let efficiencyRatio = budgetPerSong / minViableCost;
    
    // Apply dampening factor (matching backend logic)
    const dampeningFactor = 0.7; // Must match quality.json
    efficiencyRatio = 1 + dampeningFactor * (efficiencyRatio - 1);
    
    // 5-segment piecewise function (simplified version of backend)
    const breakpoints = {
      penalty_threshold: 0.6,
      minimum_viable: 0.8,
      optimal_efficiency: 1.2,
      luxury_threshold: 2.0,
      diminishing_threshold: 3.5
    };
    
    let multiplier: number;
    
    if (efficiencyRatio < breakpoints.penalty_threshold) {
      // Segment 1: Heavy penalty for insufficient budget
      // Should be flat 0.65 for anything under 0.6x
      multiplier = 0.65;
    } else if (efficiencyRatio < breakpoints.minimum_viable) {
      // Segment 2: Below standard to minimum viable
      // Should go from 0.65 to 0.85
      const progress = (efficiencyRatio - breakpoints.penalty_threshold) / (breakpoints.minimum_viable - breakpoints.penalty_threshold);
      const startMult = 0.65;
      const endMult = 0.85;
      multiplier = startMult + (endMult - startMult) * progress;
    } else if (efficiencyRatio <= breakpoints.optimal_efficiency) {
      // Segment 3: Minimum viable to optimal efficiency (best value)
      // Should go from 0.85 to 1.05
      const progress = (efficiencyRatio - breakpoints.minimum_viable) / (breakpoints.optimal_efficiency - breakpoints.minimum_viable);
      const startMult = 0.85;
      const endMult = 1.05;
      multiplier = startMult + (endMult - startMult) * progress;
    } else if (efficiencyRatio <= breakpoints.luxury_threshold) {
      // Segment 4: Optimal to luxury threshold
      // Should go from 1.05 to 1.20
      const progress = (efficiencyRatio - breakpoints.optimal_efficiency) / (breakpoints.luxury_threshold - breakpoints.optimal_efficiency);
      const startMult = 1.05;
      const endMult = 1.20;
      multiplier = startMult + (endMult - startMult) * progress;
    } else if (efficiencyRatio <= breakpoints.diminishing_threshold) {
      // Segment 5: Luxury to diminishing threshold
      // Should go from 1.20 to 1.35
      const progress = (efficiencyRatio - breakpoints.luxury_threshold) / (breakpoints.diminishing_threshold - breakpoints.luxury_threshold);
      const startMult = 1.20;
      const endMult = 1.35;
      multiplier = startMult + (endMult - startMult) * progress;
    } else {
      // Segment 6: Diminishing returns (logarithmic)
      const baseMultiplier = 1.35;
      const excessRatio = efficiencyRatio - breakpoints.diminishing_threshold;
      const diminishingBonus = Math.log(1 + excessRatio) * 0.025;
      multiplier = baseMultiplier + diminishingBonus;
    }
    
    return Math.max(0.65, Math.min(1.35, multiplier));
  };
  
  // Get budget efficiency rating for UI display
  const getBudgetEfficiencyRating = (budgetPerSong: number, projectType: string, producerTier: string, timeInvestment: string, songCount: number): { rating: string, description: string, color: string } => {
    if (budgetPerSong <= 0) return { rating: "Unknown", description: "Enter budget to see efficiency", color: "text-gray-400" };
    
    const minViableCost = calculateDynamicMinViableCost(projectType, producerTier, timeInvestment, songCount);
    let efficiencyRatio = budgetPerSong / minViableCost;
    
    // Apply dampening factor (matching backend logic)
    const dampeningFactor = 0.7; // Must match quality.json
    efficiencyRatio = 1 + dampeningFactor * (efficiencyRatio - 1);
    
    if (efficiencyRatio < 0.6) {
      return { rating: "Insufficient", description: "Budget too low for quality production", color: "text-red-500" };
    } else if (efficiencyRatio < 0.8) {
      return { rating: "Below Standard", description: "Minimal quality, corners will be cut", color: "text-orange-500" };
    } else if (efficiencyRatio <= 1.2) {
      return { rating: "Efficient", description: "Good value for money, solid quality", color: "text-green-500" };
    } else if (efficiencyRatio <= 2.0) {
      return { rating: "Premium", description: "High-end production, excellent quality", color: "text-blue-500" };
    } else if (efficiencyRatio <= 3.5) {
      return { rating: "Luxury", description: "Top-tier production, maximum quality", color: "text-purple-500" };
    } else {
      return { rating: "Excessive", description: "Diminishing returns, money could be better spent", color: "text-yellow-500" };
    }
  };

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
  const budgetFactor = selectedProjectType?.isRecording ? 
    calculateBudgetMultiplier(budgetPerSong, selectedType || '', selectedProducer?.id || 'local', selectedTimeOption?.id || 'standard', songCount) : 1.0;
  
  // Get budget efficiency information for display
  const budgetEfficiency = selectedProjectType?.isRecording && budgetPerSong > 0 ?
    getBudgetEfficiencyRating(budgetPerSong, selectedType || '', selectedProducer?.id || 'local', selectedTimeOption?.id || 'standard', songCount) :
    null;
  
  // Calculate minimum viable cost for display
  const minimumViableCost = selectedProjectType?.isRecording ?
    calculateDynamicMinViableCost(selectedType || '', selectedProducer?.id || 'local', selectedTimeOption?.id || 'standard', songCount) :
    0;
  
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
    
    // Use API data if available, otherwise fallback to local data
    const apiKey = type === 'Single' ? 'single' : 'ep';
    const apiProjectType = projectTypesAPI[apiKey];
    const fallbackProjectType = PROJECT_TYPES.find(p => p.id === type);
    
    if (apiProjectType) {
      // Use API data for song count first
      const songCountDefault = (apiProjectType && 'song_count_default' in apiProjectType) ? apiProjectType.song_count_default : 1;
      setSongCount(songCountDefault);
      
      // For recording projects, convert total to per-song
      const minPerSong = Math.round(apiProjectType.min / songCountDefault);
      const maxPerSong = Math.round(apiProjectType.max / songCountDefault);
      const defaultPerSong = Math.floor((minPerSong + maxPerSong) / 2);
      setBudgetPerSong(defaultPerSong);
    } else if (fallbackProjectType) {
      // Fallback to local data
      setSongCount(fallbackProjectType.defaultSongs);
      // Calculate a reasonable default budget
      setBudgetPerSong(type === 'Single' ? 5000 : 5000);
    }
  };

  const handleSubmit = () => {
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

    onCreateProject(projectData);
    
    // Reset form
    setSelectedType(null);
    setSelectedArtist('');
    setTitle('');
    setBudgetPerSong(0);
    setSongCount(1);
    setSelectedProducerTier('local');
    setSelectedTimeInvestment('standard');
    setIsOpen(false);
  };

  const canAfford = finalTotalCost <= currentMoney;
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

  const isValid = selectedType && selectedArtist && title && canAfford && isBudgetValid;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!onOpenChange && (
        <DialogTrigger asChild>
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Start Project
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Type Selection */}
          <div>
            <Label className="text-base font-semibold">Project Type</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {loadingProjectTypes ? (
                <div className="col-span-2 text-center py-8">
                  <Loader2 className="w-8 h-8 text-[#A75A5B] mx-auto mb-4 animate-spin" />
                  <p className="text-white/70">Loading project types...</p>
                </div>
              ) : projectTypesError ? (
                <div className="col-span-2 text-center py-8">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
                  <p className="text-red-600 mb-4">Failed to load project types</p>
                  <Button onClick={fetchProjectTypes} variant="outline" size="sm">
                    Try Again
                  </Button>
                </div>
              ) : (
                PROJECT_TYPES.map((type) => {
                  // Get budget range from API if available
                  const apiKey = type.id === 'Single' ? 'single' : 'ep';
                  const apiProjectType = projectTypesAPI[apiKey];
                  
                  // Calculate per-song budget range for recording projects
                  let budgetRange;
                  if (apiProjectType && type.isRecording) {
                    const defaultSongCount = (apiProjectType && 'song_count_default' in apiProjectType ? apiProjectType.song_count_default : type.defaultSongs) || 1;
                    const minPerSong = Math.round(apiProjectType.min / defaultSongCount);
                    const maxPerSong = Math.round(apiProjectType.max / defaultSongCount);
                    budgetRange = `$${minPerSong.toLocaleString()} - $${maxPerSong.toLocaleString()} per song`;
                  } else if (apiProjectType) {
                    budgetRange = `$${apiProjectType.min?.toLocaleString()} - $${apiProjectType.max?.toLocaleString()}`;
                  } else {
                    // No API data, show placeholder
                    budgetRange = type.isRecording ? 'Loading...' : '$5k - $15k';
                  }
                  
                  return (
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
                <Label htmlFor="artist">Artist</Label>
                <Select value={selectedArtist} onValueChange={setSelectedArtist}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an artist" />
                  </SelectTrigger>
                  <SelectContent>
                    {artists.map((artist) => (
                      <SelectItem key={artist.id} value={artist.id}>
                        {artist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project Title */}
              <div>
                <Label htmlFor="title">Project Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter project title"
                />
              </div>

              {/* Producer Tier Selection */}
              <div>
                <Label className="text-base font-semibold">Producer Tier</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {PRODUCER_TIERS.map((tier) => {
                    const isUnlocked = currentReputation >= tier.unlockReputation;
                    return (
                      <Card 
                        key={tier.id}
                        className={`cursor-pointer transition-all ${
                          !isUnlocked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
                        } ${
                          selectedProducerTier === tier.id ? 'ring-2 ring-[#A75A5B] bg-[#A75A5B]/10' : ''
                        }`}
                        onClick={() => isUnlocked && setSelectedProducerTier(tier.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <tier.icon className="w-5 h-5 text-[#A75A5B]" />
                              <div>
                                <h4 className="font-semibold">{tier.name}</h4>
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
                <Label className="text-base font-semibold">Time Investment</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {TIME_INVESTMENT_OPTIONS.map((option) => (
                    <Card 
                      key={option.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedTimeInvestment === option.id ? 'ring-2 ring-[#A75A5B] bg-[#A75A5B]/10' : ''
                      }`}
                      onClick={() => setSelectedTimeInvestment(option.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <option.icon className="w-5 h-5 text-[#A75A5B]" />
                            <div>
                              <h4 className="font-semibold">{option.name}</h4>
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
                <Label htmlFor="budgetPerSong">
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
                  className={!isBudgetValid && budgetPerSong > 0 ? 'border-red-500' : ''}
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
                    <div className="p-3 bg-[#3c252d]/20 rounded-lg border">
                      <h4 className="font-medium text-white/90 mb-2">Cost Calculation:</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-white/70">Budget per song:</span>
                          <span className="font-mono">${budgetPerSong.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Number of songs:</span>
                          <span className="font-mono">{songCount} song{songCount > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="text-white/70">Base cost:</span>
                          <span className="font-mono">${totalBaseCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Producer ({producerMultiplier}x):</span>
                          <span className="font-mono">${Math.round(totalBaseCost * producerMultiplier).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Time investment ({timeMultiplier}x):</span>
                          <span className="font-mono">${finalTotalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-semibold">
                          <span className="text-white">Final total cost:</span>
                          <span className="font-mono text-[#A75A5B]">${finalTotalCost.toLocaleString()}</span>
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
                  <div className="p-3 bg-[#A75A5B]/10 rounded-lg border">
                    <h4 className="font-medium text-[#A75A5B] mb-2">Quality Preview:</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#A75A5B]">Base (talent+producer):</span>
                        <span className="font-mono">{Math.round(baseQuality)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#A75A5B]">Time & Work Ethic factor:</span>
                        <span className="font-mono">×{timeFactor.toFixed(2)}</span>
                      </div>
                      {selectedArtist && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-[#A75A5B]">Popularity factor:</span>
                            <span className="font-mono">×{popularityFactor.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#A75A5B]">Mood factor:</span>
                            <span className="font-mono">×{moodFactor.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      {songCount > 3 && (
                        <div className="flex justify-between">
                          <span className="text-[#A75A5B]">Session fatigue:</span>
                          <span className="font-mono text-amber-500">×{focusFactor.toFixed(2)}</span>
                        </div>
                      )}
                      {selectedProjectType?.isRecording && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-[#A75A5B]">Budget factor:</span>
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
                      <div className="flex justify-between border-t pt-1">
                        <span className="text-[#A75A5B] font-medium">Est. quality:</span>
                        <span className="font-mono font-bold text-[#A75A5B]">{Math.round(estimatedQuality)}</span>
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
                  <Label htmlFor="songCount">Number of Songs</Label>
                  <Input
                    id="songCount"
                    type="number"
                    value={songCount}
                    onChange={(e) => setSongCount(Number(e.target.value))}
                    min={selectedProjectType.minSongs}
                    max={selectedProjectType.maxSongs}
                  />
                </div>
              )}

              {/* Budget Warning */}
              {!canAfford && (
                <div className="p-4 bg-red-100 border border-red-300 rounded-md">
                  <p className="text-red-800">
                    Insufficient funds! Need ${finalTotalCost.toLocaleString()} but only have ${currentMoney.toLocaleString()}
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
                  {isCreating ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
