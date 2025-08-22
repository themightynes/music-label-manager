import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Search, Music, TrendingUp, Zap, Heart, Star, AlertCircle } from 'lucide-react';
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
  const [availableArtists, setAvailableArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableArtists = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/artists/available');
      if (!response.ok) {
        throw new Error(`Failed to fetch artists: ${response.status}`);
      }
      const data = await response.json();
      const filtered = (data.artists || []).filter((artist: Artist) => 
        !signedArtists.some(signed => signed.id === artist.id || signed.name === artist.name)
      );
      setAvailableArtists(filtered);
    } catch (err) {
      console.error('Failed to fetch available artists:', err);
      setError(err instanceof Error ? err.message : 'Failed to load artists');
      setAvailableArtists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAvailableArtists();
    }
  }, [open, signedArtists]);

  const displayArtists = availableArtists;

  const filteredArtists = displayArtists.filter(artist => {
    const matchesSearch = artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (artist.genre || '').toLowerCase().includes(searchTerm.toLowerCase());
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
          {loading ? (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-slate-400 mx-auto mb-4 animate-pulse" />
              <p className="text-slate-600">Loading available artists...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-600 mb-4">Failed to load artists</p>
              <Button onClick={fetchAvailableArtists} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          ) : filteredArtists.length === 0 ? (
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
                        <p className="text-sm text-slate-600">{artist.genre || 'Unknown Genre'} • Age {artist.age || 25}</p>
                      </div>
                      <Badge className={`${getArchetypeColor(artist.archetype)} border`}>
                        {getArchetypeIcon(artist.archetype)}
                        <span className="ml-1">{artist.archetype}</span>
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{artist.bio || 'Talented artist...'}</p>
                    
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
                        <span className="font-semibold text-slate-900">${(artist.signingCost || 5000).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Monthly Cost:</span>
                        <span className="font-medium text-slate-700">${(artist.monthlyCost || 800).toLocaleString()}/mo</span>
                      </div>
                    </div>

                    {/* Sign Button */}
                    <Button
                      onClick={() => handleSignArtist(artist)}
                      disabled={
                        signingArtist === artist.id || 
                        (gameState.money || 0) < (artist.signingCost || 5000) ||
                        signedArtists.length >= 3
                      }
                      className="w-full"
                      variant={signingArtist === artist.id ? 'secondary' : 'default'}
                    >
                      {signingArtist === artist.id ? 'Signing...' : 
                       (gameState.money || 0) < (artist.signingCost || 5000) ? 'Cannot Afford' :
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