import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Search, Music, TrendingUp, Zap, Heart, Star, AlertCircle } from 'lucide-react';
import type { GameState } from '@shared/types/gameTypes';
import { ARTIST_ARCHETYPES } from '@/lib/gameData';
import { apiRequest } from '@/lib/queryClient';

interface Artist {
  id: string;
  name: string;
  archetype: 'Visionary' | 'Workhorse' | 'Trendsetter';
  talent: number;
  workEthic: number;
  popularity: number;
  temperament: number;
  energy: number;
  mood: number;
  signingCost: number;
  weeklyCost: number;
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
      // Fetch scouted artists from A&R operations instead of all available artists
      const response = await apiRequest('GET', `/api/game/${gameState.id}/ar-office/artists`);
      const data = await response.json();
      console.log('[ArtistDiscoveryModal] A&R scouted artists response:', data);

      // Filter out artists that are already signed
      const scouted = (data.artists || []).filter((artist: Artist) =>
        !signedArtists.some(signed => signed.id === artist.id || signed.name === artist.name)
      );

      console.log('[ArtistDiscoveryModal] Filtered scouted artists:', scouted.length);
      setAvailableArtists(scouted);
    } catch (err) {
      console.error('Failed to fetch scouted artists:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scouted artists');
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
      // Refresh the artist list to remove the newly signed artist
      await fetchAvailableArtists();
      console.log('[ArtistDiscoveryModal] Refreshed artist list after signing:', artist.name);
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
      case 'Visionary': return 'bg-neon-purple/[0.14] text-neon-purple border-neon-purple/40';
      case 'Workhorse': return 'bg-neon-amber/[0.14] text-neon-amber border-neon-amber/40';
      case 'Trendsetter': return 'bg-positive/[0.14] text-positive border-positive/40';
      default: return 'bg-neon-lilac/[0.14] text-neon-lilac border-neon-lilac/40';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden glass-panel chromatic-hairline text-text-primary">
        <DialogHeader className="border-b border-white/[0.08] pb-4">
          <DialogTitle className="text-xl font-bold text-text-primary flex items-center">
            <Music className="w-5 h-5 mr-2 text-neon-lilac" />
            Scouted Artists
          </DialogTitle>
          <p className="text-sm text-text-body mt-2">
            Artists you've scouted through A&R operations
          </p>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="p-6 border-b border-white/[0.08]">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
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

        {/* Artist Table */}
        <div className="overflow-y-auto max-h-96">
          {loading ? (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-text-muted mx-auto mb-4 animate-pulse" />
              <p className="text-text-body">Loading scouted artists...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-negative mx-auto mb-4" />
              <p className="text-negative mb-4">Failed to load artists</p>
              <Button onClick={fetchAvailableArtists} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          ) : filteredArtists.length === 0 ? (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-text-muted mx-auto mb-4" />
              {availableArtists.length === 0 ? (
                <div>
                  <p className="text-text-body mb-2">No artists scouted yet</p>
                  <p className="text-sm text-text-muted">Use the A&R Office to scout for new talent</p>
                </div>
              ) : (
                <p className="text-text-body">No artists found matching your criteria</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.08] hover:bg-white/[0.02]">
                  <TableHead className="text-text-primary/90 font-semibold w-20">Avatar</TableHead>
                  <TableHead className="text-text-primary/90 font-semibold">Artist</TableHead>
                  <TableHead className="text-text-primary/90 font-semibold">Archetype</TableHead>
                  <TableHead className="text-text-primary/90 font-semibold">Talent</TableHead>
                  <TableHead className="text-text-primary/90 font-semibold">Work Ethic</TableHead>
                  <TableHead className="text-text-primary/90 font-semibold">Popularity</TableHead>
                  <TableHead className="text-text-primary/90 font-semibold">Signing Cost</TableHead>
                  <TableHead className="text-text-primary/90 font-semibold">Weekly Cost</TableHead>
                  <TableHead className="text-text-primary/90 font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArtists.map(artist => (
                  <TableRow key={artist.id} className="border-white/[0.08] hover:bg-white/[0.045]">
                    <TableCell className="w-20">
                      <div className="w-16 h-16 rounded-pill overflow-hidden bg-surface-inner border border-white/[0.08]">
                        <img
                          src={`/avatars/${artist.name.toLowerCase().replace(/\s+/g, '_')}_full.png`}
                          alt={`${artist.name} avatar`}
                          className="w-full h-full object-contain scale-[6] translate-y-[205%]"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/avatars/blank_full.png';
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <div className="cursor-pointer">
                            <div className="font-semibold text-text-primary text-base hover:text-neon-lilac transition-colors">{artist.name}</div>
                            <div className="text-xs text-text-body">{artist.genre || 'Unknown Genre'} • Age {artist.age || 25}</div>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent side="right" className="w-80 bg-surface-tooltip border-white/[0.12] text-text-primary">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">{artist.name}</h4>
                            <p className="text-sm text-text-body">{artist.bio || 'Talented artist...'}</p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getArchetypeColor(artist.archetype)} border`}>
                        {getArchetypeIcon(artist.archetype)}
                        <span className="ml-1">{artist.archetype}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium font-mono text-text-primary">{artist.talent}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium font-mono text-text-primary">{artist.workEthic}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium font-mono text-text-primary">{artist.popularity}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-semibold font-mono text-money">${(artist.signingCost || 5000).toLocaleString()}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium font-mono text-money/90">${(artist.weeklyCost || 800).toLocaleString()}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => handleSignArtist(artist)}
                        disabled={
                          signingArtist === artist.id ||
                          signedArtists.some(signed => signed.id === artist.id || signed.name === artist.name) ||
                          (gameState.money || 0) < (artist.signingCost || 5000) ||
                          signedArtists.length >= 3
                        }
                        size="sm"
                        variant={signingArtist === artist.id ? 'secondary' : 'default'}
                      >
                        {signingArtist === artist.id ? 'Signing...' :
                         signedArtists.some(signed => signed.id === artist.id || signed.name === artist.name) ? 'Signed' :
                         (gameState.money || 0) < (artist.signingCost || 5000) ? 'Cannot Afford' :
                         signedArtists.length >= 3 ? 'Roster Full' :
                         'Sign'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/[0.08] flex justify-between items-center">
          <div className="text-sm text-text-body">
            Budget: <span className="font-semibold font-mono text-money">${(gameState.money || 0).toLocaleString()}</span>
            {' • '}
            Roster: <span className="font-semibold font-mono text-text-primary">{signedArtists.length}/3</span>
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
