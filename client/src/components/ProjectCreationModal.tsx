import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Music, Disc, MapPin, Star, Clock, Zap, Award } from 'lucide-react';
import type { GameState } from '@shared/schema';

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
  type: 'Single' | 'EP' | 'Mini-Tour';
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
    budgetRange: '$2k - $6k per song',
    minBudgetPerSong: 2000,
    maxBudgetPerSong: 6000,
    defaultBudgetPerSong: 3000,
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
    budgetRange: '$3k - $7k per song',
    minBudgetPerSong: 3000,
    maxBudgetPerSong: 7000,
    defaultBudgetPerSong: 4500,
    duration: '3-5 months',
    isRecording: true,
    minSongs: 3,
    maxSongs: 5,
    defaultSongs: 4
  },
  {
    id: 'Mini-Tour' as const,
    name: 'Mini-Tour',
    icon: MapPin,
    description: 'Small venue tour',
    budgetRange: '$5k - $15k total',
    minBudgetPerSong: 5000,     // For tours, this represents total budget
    maxBudgetPerSong: 15000,
    defaultBudgetPerSong: 10000,
    duration: '1-2 months',
    isRecording: false,
    minSongs: 0,
    maxSongs: 0,
    defaultSongs: 0
  }
];

const PRODUCER_TIERS = [
  {
    id: 'local' as const,
    name: 'Local',
    icon: Music,
    description: 'Neighborhood studio',
    costMultiplier: 1.0,
    qualityBonus: 0,
    unlockReputation: 0
  },
  {
    id: 'regional' as const,
    name: 'Regional',
    icon: Star,
    description: 'Regional producer',
    costMultiplier: 1.8,
    qualityBonus: 5,
    unlockReputation: 15
  },
  {
    id: 'national' as const,
    name: 'National',
    icon: Award,
    description: 'National producer',
    costMultiplier: 3.2,
    qualityBonus: 12,
    unlockReputation: 35
  },
  {
    id: 'legendary' as const,
    name: 'Legendary',
    icon: Zap,
    description: 'Legendary producer',
    costMultiplier: 5.5,
    qualityBonus: 20,
    unlockReputation: 60
  }
];

const TIME_INVESTMENT_OPTIONS = [
  {
    id: 'rushed' as const,
    name: 'Rushed',
    icon: Clock,
    description: 'Quick turnaround',
    costMultiplier: 0.7,
    qualityModifier: -10
  },
  {
    id: 'standard' as const,
    name: 'Standard',
    icon: Clock,
    description: 'Normal timeline',
    costMultiplier: 1.0,
    qualityModifier: 0
  },
  {
    id: 'extended' as const,
    name: 'Extended',
    icon: Clock,
    description: 'Extra time',
    costMultiplier: 1.4,
    qualityModifier: 8
  },
  {
    id: 'perfectionist' as const,
    name: 'Perfectionist',
    icon: Clock,
    description: 'Maximum quality',
    costMultiplier: 2.1,
    qualityModifier: 15
  }
];

export function ProjectCreationModal({ 
  gameState, 
  artists, 
  onCreateProject, 
  isCreating, 
  open = false, 
  onOpenChange 
}: ProjectCreationModalProps) {
  const [isOpen, setIsOpen] = useState(open);
  const [selectedType, setSelectedType] = useState<'Single' | 'EP' | 'Mini-Tour' | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [title, setTitle] = useState('');
  const [budgetPerSong, setBudgetPerSong] = useState(0);
  const [songCount, setSongCount] = useState(1);
  const [selectedProducerTier, setSelectedProducerTier] = useState<'local' | 'regional' | 'national' | 'legendary'>('local');
  const [selectedTimeInvestment, setSelectedTimeInvestment] = useState<'rushed' | 'standard' | 'extended' | 'perfectionist'>('standard');

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

  // Calculate budget quality bonus (simplified version of backend logic)
  const calculateBudgetQualityBonus = (budgetPerSong: number, projectType: string): number => {
    if (budgetPerSong <= 0) return 0;
    
    // Approximate minimum viable costs (simplified)
    const minViableCosts = {
      'Single': 2500,
      'EP': 3000,
      'Mini-Tour': 5000
    };
    
    const minCost = minViableCosts[projectType as keyof typeof minViableCosts] || 2500;
    const budgetRatio = budgetPerSong / minCost;
    
    // Efficiency breakpoints (matching backend logic)
    if (budgetRatio < 0.6) {
      return -5; // Below minimum viable - penalty
    } else if (budgetRatio <= 1.0) {
      // 0-40% of max bonus (10 points) in optimal range
      return Math.floor(((budgetRatio - 0.6) / 0.4) * 10);
    } else if (budgetRatio <= 2.0) {
      // 40-70% of max bonus (10-17.5 points) in luxury range
      return Math.floor(10 + ((budgetRatio - 1.0) / 1.0) * 7.5);
    } else if (budgetRatio <= 3.0) {
      // 70-90% of max bonus (17.5-22.5 points) in premium range
      return Math.floor(17.5 + ((budgetRatio - 2.0) / 1.0) * 5);
    } else {
      // 90-100% of max bonus (22.5-25 points) with diminishing returns
      return Math.min(25, Math.floor(22.5 + ((budgetRatio - 3.0) / 1.0) * 2.5));
    }
  };

  // Calculate estimated quality with budget bonus
  const baseQuality = 50;
  const producerBonus = selectedProducer?.qualityBonus || 0;
  const timeBonus = selectedTimeOption?.qualityModifier || 0;
  const artistMoodBonus = selectedArtist ? (artists.find(a => a.id === selectedArtist)?.mood || 50) * 0.2 : 0;
  const budgetBonus = selectedProjectType?.isRecording ? calculateBudgetQualityBonus(budgetPerSong, selectedType || '') : 0;
  const estimatedQuality = Math.min(100, Math.max(20, baseQuality + producerBonus + timeBonus + artistMoodBonus + budgetBonus));

  // Check if producer tier is unlocked
  const getUnlockedProducers = () => {
    return PRODUCER_TIERS.filter(tier => currentReputation >= tier.unlockReputation);
  };

  const handleTypeSelect = (type: 'Single' | 'EP' | 'Mini-Tour') => {
    setSelectedType(type);
    const projectType = PROJECT_TYPES.find(p => p.id === type);
    if (projectType) {
      setBudgetPerSong(projectType.defaultBudgetPerSong);
      setSongCount(projectType.defaultSongs);
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
  const isValid = selectedType && selectedArtist && title && canAfford;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Start Project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Type Selection */}
          <div>
            <Label className="text-base font-semibold">Project Type</Label>
            <div className="grid grid-cols-3 gap-4 mt-2">
              {PROJECT_TYPES.map((type) => (
                <Card 
                  key={type.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedType === type.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => handleTypeSelect(type.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <type.icon className="w-6 h-6 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">{type.name}</h3>
                        <p className="text-sm text-gray-600">{type.description}</p>
                        <p className="text-xs text-gray-500">{type.budgetRange}</p>
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
                          selectedProducerTier === tier.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                        }`}
                        onClick={() => isUnlocked && setSelectedProducerTier(tier.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <tier.icon className="w-5 h-5 text-blue-600" />
                              <div>
                                <h4 className="font-semibold">{tier.name}</h4>
                                <p className="text-sm text-gray-600">{tier.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">+{tier.qualityBonus} Quality</p>
                              <p className="text-xs text-gray-500">{tier.costMultiplier}x Cost</p>
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
                        selectedTimeInvestment === option.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedTimeInvestment(option.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <option.icon className="w-5 h-5 text-blue-600" />
                            <div>
                              <h4 className="font-semibold">{option.name}</h4>
                              <p className="text-sm text-gray-600">{option.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {option.qualityModifier > 0 ? '+' : ''}{option.qualityModifier} Quality
                            </p>
                            <p className="text-xs text-gray-500">{option.costMultiplier}x Cost</p>
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
                </Label>
                <Input
                  id="budgetPerSong"
                  type="number"
                  value={budgetPerSong}
                  onChange={(e) => setBudgetPerSong(Number(e.target.value))}
                  min={selectedProjectType?.minBudgetPerSong}
                  max={selectedProjectType?.maxBudgetPerSong}
                  placeholder={selectedProjectType?.isRecording ? "Investment per song" : "Total budget"}
                />
                <div className="mt-2 text-sm space-y-1">
                  {selectedProjectType?.isRecording && (
                    <div className="p-3 bg-slate-50 rounded-lg border">
                      <h4 className="font-medium text-slate-700 mb-2">Cost Calculation:</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Budget per song:</span>
                          <span className="font-mono">${budgetPerSong.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Number of songs:</span>
                          <span className="font-mono">{songCount} song{songCount > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="text-slate-600">Base cost:</span>
                          <span className="font-mono">${totalBaseCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Producer ({producerMultiplier}x):</span>
                          <span className="font-mono">${Math.round(totalBaseCost * producerMultiplier).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Time investment ({timeMultiplier}x):</span>
                          <span className="font-mono">${finalTotalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-semibold">
                          <span className="text-slate-900">Final total cost:</span>
                          <span className="font-mono text-blue-600">${finalTotalCost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {!selectedProjectType?.isRecording && (
                    <div className="text-gray-600">
                      <p>Total cost with multipliers: ${finalTotalCost.toLocaleString()}</p>
                    </div>
                  )}
                  {/* Quality Preview with Breakdown */}
                  <div className="p-3 bg-blue-50 rounded-lg border">
                    <h4 className="font-medium text-blue-700 mb-2">Quality Preview:</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-blue-600">Base quality:</span>
                        <span className="font-mono">{baseQuality}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Producer ({selectedProducerTier}):</span>
                        <span className="font-mono">{producerBonus > 0 ? '+' : ''}{producerBonus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Time ({selectedTimeInvestment}):</span>
                        <span className="font-mono">{timeBonus > 0 ? '+' : ''}{timeBonus}</span>
                      </div>
                      {selectedArtist && (
                        <div className="flex justify-between">
                          <span className="text-blue-600">Artist mood:</span>
                          <span className="font-mono">{artistMoodBonus > 0 ? '+' : ''}{Math.round(artistMoodBonus)}</span>
                        </div>
                      )}
                      {selectedProjectType?.isRecording && (
                        <div className="flex justify-between">
                          <span className="text-blue-600">Budget bonus:</span>
                          <span className="font-mono font-semibold text-green-600">
                            {budgetBonus > 0 ? '+' : ''}{budgetBonus}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-1">
                        <span className="text-blue-700 font-medium">Total quality:</span>
                        <span className="font-mono font-bold text-blue-700">{Math.round(estimatedQuality)}</span>
                      </div>
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