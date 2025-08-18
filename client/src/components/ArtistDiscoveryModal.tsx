import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Search, Music, TrendingUp, Zap, Heart, Star } from 'lucide-react';
import type { GameState } from '@shared/schema';
import { ARTIST_ARCHETYPES } from '@/lib/gameData';

interface Artist {
  id: string;
  name: string;
  archetype: 'Visionary' | 'Workhorse' | 'Trendsetter';
  talent: number;
  workEthic: number;
  popularity: number;
  temperament: number;
  loyalty: number;
  mood: number;
  signingCost: number;
  monthlyCost: number;
  bio: string;
  genre: string;
  age: number;
}

interface ArtistDiscoveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameState: GameState;
  signedArtists: any[];
  onSignArtist: (artist: Artist) => Promise<void>;
}

// Expanded artist pool - combining data and generating more
const AVAILABLE_ARTISTS: Artist[] = [
  {
    id: "art_1",
    name: "Nova Sterling",
    archetype: "Visionary",
    talent: 85,
    workEthic: 65,
    popularity: 25,
    temperament: 75,
    loyalty: 60,
    mood: 70,
    signingCost: 8000,
    monthlyCost: 1200,
    bio: "Experimental indie artist pushing boundaries with ethereal soundscapes",
    genre: "Experimental Pop",
    age: 23
  },
  {
    id: "art_2", 
    name: "Mason Rivers",
    archetype: "Workhorse",
    talent: 70,
    workEthic: 90,
    popularity: 40,
    temperament: 80,
    loyalty: 85,
    mood: 75,
    signingCost: 6000,
    monthlyCost: 800,
    bio: "Reliable songwriter with a gift for crafting memorable hooks",
    genre: "Folk Rock",
    age: 28
  },
  {
    id: "art_3",
    name: "Luna Vee",
    archetype: "Trendsetter", 
    talent: 75,
    workEthic: 60,
    popularity: 55,
    temperament: 65,
    loyalty: 55,
    mood: 80,
    signingCost: 12000,
    monthlyCost: 1500,
    bio: "Social media savvy artist with an ear for viral melodies",
    genre: "Pop/Electronic",
    age: 21
  },
  {
    id: "art_4",
    name: "Diego Morales",
    archetype: "Visionary",
    talent: 90,
    workEthic: 55,
    popularity: 15,
    temperament: 60,
    loyalty: 70,
    mood: 65,
    signingCost: 15000,
    monthlyCost: 2000,
    bio: "Jazz fusion prodigy creating groundbreaking instrumental compositions",
    genre: "Jazz Fusion",
    age: 26
  },
  {
    id: "art_5",
    name: "Riley Thompson",
    archetype: "Workhorse",
    talent: 65,
    workEthic: 95,
    popularity: 35,
    temperament: 85,
    loyalty: 90,
    mood: 85,
    signingCost: 4000,
    monthlyCost: 600,
    bio: "Dedicated country songwriter with authentic storytelling",
    genre: "Country",
    age: 31
  },
  {
    id: "art_6",
    name: "Zara Chen",
    archetype: "Trendsetter",
    talent: 80,
    workEthic: 70,
    popularity: 65,
    temperament: 70,
    loyalty: 50,
    mood: 75,
    signingCost: 10000,
    monthlyCost: 1300,
    bio: "K-pop inspired artist bridging Eastern and Western sounds",
    genre: "K-Pop/R&B",
    age: 20
  }
];

export function ArtistDiscoveryModal({ 
  open, 
  onOpenChange, 
  gameState, 
  signedArtists,
  onSignArtist 
}: ArtistDiscoveryModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArchetype, setSelectedArchetype] = useState<string>('All');
  const [signingArtist, setSigningArtist] = useState<string | null>(null);

  const availableArtists = AVAILABLE_ARTISTS.filter(artist => 
    !signedArtists.some(signed => signed.id === artist.id || signed.name === artist.name)
  );

  const filteredArtists = availableArtists.filter(artist => {
    const matchesSearch = artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         artist.genre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArchetype = selectedArchetype === 'All' || artist.archetype === selectedArchetype;
    return matchesSearch && matchesArchetype;
  });

  const handleSignArtist = async (artist: Artist) => {
    if (signingArtist || (gameState.money || 0) < artist.signingCost) return;

    setSigningArtist(artist.id);
    try {
      await onSignArtist(artist);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to sign artist:', error);
    } finally {
      setSigningArtist(null);
    }
  };

  const getArchetypeIcon = (archetype: string) => {
    switch (archetype) {
      case 'Visionary': return <Zap className="w-4 h-4" />;
      case 'Workhorse': return <Heart className="w-4 h-4" />;
      case 'Trendsetter': return <TrendingUp className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getArchetypeColor = (archetype: string) => {
    switch (archetype) {
      case 'Visionary': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Workhorse': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Trendsetter': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="border-b border-slate-200 pb-4">
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center">
            <Music className="w-5 h-5 mr-2 text-primary" />
            Discover Artists
          </DialogTitle>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search artists by name or genre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {['All', 'Visionary', 'Workhorse', 'Trendsetter'].map(type => (
                <Button
                  key={type}
                  variant={selectedArchetype === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedArchetype(type)}
                  className="whitespace-nowrap"
                >
                  {type !== 'All' && getArchetypeIcon(type)}
                  <span className={type !== 'All' ? 'ml-1' : ''}>{type}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Artist Grid */}
        <div className="p-6 overflow-y-auto max-h-96">
          {filteredArtists.length === 0 ? (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No artists found matching your criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredArtists.map(artist => (
                <Card key={artist.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold text-slate-900">
                          {artist.name}
                        </CardTitle>
                        <p className="text-sm text-slate-600">{artist.genre} • Age {artist.age}</p>
                      </div>
                      <Badge className={`${getArchetypeColor(artist.archetype)} border`}>
                        {getArchetypeIcon(artist.archetype)}
                        <span className="ml-1">{artist.archetype}</span>
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{artist.bio}</p>
                    
                    {/* Stats */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Talent</span>
                        <span className="font-medium">{artist.talent}/100</span>
                      </div>
                      <Progress value={artist.talent} className="h-1" />
                      
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Work Ethic</span>
                        <span className="font-medium">{artist.workEthic}/100</span>
                      </div>
                      <Progress value={artist.workEthic} className="h-1" />
                      
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Popularity</span>
                        <span className="font-medium">{artist.popularity}/100</span>
                      </div>
                      <Progress value={artist.popularity} className="h-1" />
                    </div>

                    {/* Costs */}
                    <div className="bg-slate-50 rounded-lg p-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Signing Cost:</span>
                        <span className="font-semibold text-slate-900">${artist.signingCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Monthly Cost:</span>
                        <span className="font-medium text-slate-700">${artist.monthlyCost.toLocaleString()}/mo</span>
                      </div>
                    </div>

                    {/* Sign Button */}
                    <Button
                      onClick={() => handleSignArtist(artist)}
                      disabled={
                        signingArtist === artist.id || 
                        (gameState.money || 0) < artist.signingCost ||
                        signedArtists.length >= 3
                      }
                      className="w-full"
                      variant={signingArtist === artist.id ? 'secondary' : 'default'}
                    >
                      {signingArtist === artist.id ? 'Signing...' : 
                       (gameState.money || 0) < artist.signingCost ? 'Cannot Afford' :
                       signedArtists.length >= 3 ? 'Roster Full' :
                       'Sign Artist'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex justify-between items-center">
          <div className="text-sm text-slate-600">
            Budget: <span className="font-semibold">${(gameState.money || 0).toLocaleString()}</span>
            {' • '}
            Roster: <span className="font-semibold">{signedArtists.length}/3</span>
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}