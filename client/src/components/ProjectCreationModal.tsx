import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Music, Disc, MapPin } from 'lucide-react';
import type { GameState } from '@shared/schema';

interface ProjectCreationModalProps {
  gameState: GameState;
  artists: any[]; // Using any[] since Artist type may be defined differently
  onCreateProject: (projectData: ProjectCreationData) => void;
  isCreating: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface ProjectCreationData {
  title: string;
  type: 'Single' | 'EP' | 'Mini-Tour';
  artistId: string;
  budget: number;
  songCount?: number; // Number of songs to create (for recording projects)
}

const PROJECT_TYPES = [
  {
    id: 'Single' as const,
    name: 'Single',
    icon: Music,
    description: 'Recording session for 1-3 songs',
    budgetRange: '$3k - $12k',
    minBudget: 3000,
    maxBudget: 12000,
    defaultBudget: 6000,
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
    budgetRange: '$15k - $35k',
    minBudget: 15000,
    maxBudget: 35000,
    defaultBudget: 25000,
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
    budgetRange: '$5k - $15k',
    minBudget: 5000,
    maxBudget: 15000,
    defaultBudget: 10000,
    duration: '1-2 months',
    isRecording: false,
    minSongs: 0,
    maxSongs: 0,
    defaultSongs: 0
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
  const [budget, setBudget] = useState(0);
  const [songCount, setSongCount] = useState(1);

  const currentMoney = gameState.money || 75000;
  const selectedProjectType = PROJECT_TYPES.find(type => type.id === selectedType);

  const handleTypeSelect = (type: 'Single' | 'EP' | 'Mini-Tour') => {
    setSelectedType(type);
    const projectType = PROJECT_TYPES.find(p => p.id === type);
    if (projectType) {
      setBudget(projectType.defaultBudget);
      setSongCount(projectType.defaultSongs);
      setTitle('');
    }
  };

  const handleCreate = () => {
    if (!selectedType || !selectedArtist || !title || budget <= 0) return;

    onCreateProject({
      title,
      type: selectedType,
      artistId: selectedArtist,
      budget,
      songCount: selectedProjectType?.isRecording ? songCount : 0
    });

    // Reset form
    setSelectedType(null);
    setSelectedArtist('');
    setTitle('');
    setBudget(0);
    setSongCount(1);
    setIsOpen(false);
  };

  const canAfford = budget <= currentMoney;
  const isSongCountValid = !selectedProjectType?.isRecording || 
    (songCount >= (selectedProjectType?.minSongs || 1) && songCount <= (selectedProjectType?.maxSongs || 1));
  const isFormValid = selectedType && selectedArtist && title.length > 0 && budget > 0 && canAfford && isSongCountValid;

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <Dialog open={open || isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-yellow-500 text-xl">Create New Project</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Type Selection */}
          <div className="space-y-4">
            <Label className="text-white font-semibold">Choose Project Type</Label>
            <div className="space-y-3">
              {PROJECT_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;
                const canAffordType = type.minBudget <= currentMoney;
                
                return (
                  <Card 
                    key={type.id} 
                    className={`cursor-pointer transition-all border-2 ${
                      isSelected 
                        ? 'border-yellow-500 bg-yellow-500/10' 
                        : canAffordType 
                          ? 'border-gray-600 bg-gray-800 hover:border-gray-500' 
                          : 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => canAffordType && handleTypeSelect(type.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-6 h-6 ${isSelected ? 'text-yellow-500' : 'text-gray-400'}`} />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-white">{type.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {type.duration}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400">{type.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{type.budgetRange}</p>
                        </div>
                        {!canAffordType && (
                          <Badge variant="destructive" className="text-xs">
                            Can't afford
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Project Details */}
          <div className="space-y-4">
            <Label className="text-white font-semibold">Project Details</Label>
            
            {selectedType && (
              <div className="space-y-4">
                {/* Title Input */}
                <div>
                  <Label htmlFor="title" className="text-sm text-gray-300">Project Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`Enter ${selectedType.toLowerCase()} title...`}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                {/* Artist Selection */}
                <div>
                  <Label htmlFor="artist" className="text-sm text-gray-300">Artist</Label>
                  <Select value={selectedArtist} onValueChange={setSelectedArtist}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Select an artist..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {artists.map((artist) => (
                        <SelectItem key={artist.id} value={artist.id}>
                          {artist.name} ({artist.archetype})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Budget Input */}
                <div>
                  <Label htmlFor="budget" className="text-sm text-gray-300">
                    Budget (${selectedProjectType?.minBudget.toLocaleString()} - ${selectedProjectType?.maxBudget.toLocaleString()})
                  </Label>
                  <Input
                    id="budget"
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    min={selectedProjectType?.minBudget}
                    max={selectedProjectType?.maxBudget}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span className={canAfford ? 'text-gray-400' : 'text-red-400'}>
                      Available: ${currentMoney.toLocaleString()}
                    </span>
                    {!canAfford && (
                      <span className="text-red-400">Insufficient funds</span>
                    )}
                  </div>
                </div>

                {/* Song Count Selection (only for recording projects) */}
                {selectedProjectType?.isRecording && (
                  <div>
                    <Label htmlFor="songCount" className="text-sm text-gray-300">
                      Number of Songs ({selectedProjectType.minSongs}-{selectedProjectType.maxSongs})
                    </Label>
                    <Input
                      id="songCount"
                      type="number"
                      value={songCount}
                      onChange={(e) => setSongCount(Number(e.target.value))}
                      min={selectedProjectType.minSongs}
                      max={selectedProjectType.maxSongs}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      More songs = longer recording time but more content for releases
                    </div>
                  </div>
                )}

                {/* Create Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleCreate}
                    disabled={!isFormValid || isCreating}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                  >
                    {isCreating ? 'Creating...' : `Create ${selectedType}`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}