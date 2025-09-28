import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { AlertCircle, Music, TrendingUp, Zap, Heart, Star, MapPin, Globe } from 'lucide-react';
import type { GameState, Artist as SharedArtist } from '@shared/schema';
import type { SourcingType } from '../../machines/arOfficeMachine';

// UIArtist extends the shared Artist with optional UI fields used in discovery views
export type UIArtist = SharedArtist & {
  archetype?: 'Visionary' | 'Workhorse' | 'Trendsetter';
  workEthic?: number;
  signingCost?: number;
  weeklyCost?: number;
  genre?: string;
  age?: number;
  bio?: string;
  talent?: number;
  popularity?: number;
};

interface ArtistDiscoveryTableProps {
  artists: UIArtist[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  selectedArchetype: string;
  sourcingMode: SourcingType | null;
  gameState: GameState;
  signedArtists: UIArtist[];
  signingArtist: string | null;
  onSignArtist: (artist: UIArtist) => void;
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  onArchetypeChange: (value: string) => void;
}

export function ArtistDiscoveryTable({
  artists,
  loading,
  error,
  searchTerm,
  selectedArchetype,
  sourcingMode,
  gameState,
  signedArtists,
  signingArtist,
  onSignArtist,
  onRetry,
  onSearchChange,
  onArchetypeChange,
}: ArtistDiscoveryTableProps) {
  const getArchetypeIcon = (archetype?: string) => {
    switch (archetype) {
      case 'Visionary': return <Zap className="w-4 h-4" />;
      case 'Workhorse': return <Heart className="w-4 h-4" />;
      case 'Trendsetter': return <TrendingUp className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getArchetypeColor = (archetype?: string) => {
    switch (archetype) {
      case 'Visionary': return 'bg-[#791014]/20 text-[#B34A4F] border-[#791014]/30';
      case 'Workhorse': return 'bg-[#A75A5B]/20 text-[#A75A5B] border-[#A75A5B]/30';
      case 'Trendsetter': return 'bg-green-500/20 text-green-300 border-green-400/30';
      default: return 'bg-[#65557c]/20 text-[#65557c] border-[#65557c]/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and filter controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            placeholder="Search artists by name or genre..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-3 pr-3 h-10 rounded-md bg-[#23121c] border border-[#4e324c] text-white w-full"
          />
        </div>
        <div className="flex gap-2">
          {['All', 'Visionary', 'Workhorse', 'Trendsetter'].map(type => (
            <Button
              key={type}
              variant={selectedArchetype === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => onArchetypeChange(type)}
              className="whitespace-nowrap"
            >
              {type !== 'All' && getArchetypeIcon(type)}
              <span className={type !== 'All' ? 'ml-1' : ''}>{type}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Table / states */}
      {loading ? (
        <div className="text-center py-8">
          <Music className="w-12 h-12 text-white/50 mx-auto mb-4 animate-pulse" />
          <p className="text-white/70">Loading available artists...</p>
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-white/50 mt-2">Debug: Loading discovered artists from A&R operation</p>
          )}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <div className="space-y-3">
            {/* Enhanced error messages based on error type */}
            {error.includes('404') ? (
              <>
                <p className="text-orange-400 mb-2">No Artists Discovered</p>
                <p className="text-sm text-white/70">Your A&R operation didn't discover any new artists this week.</p>
                <p className="text-xs text-white/50">Try a different sourcing approach next time.</p>
              </>
            ) : error.includes('500') ? (
              <>
                <p className="text-red-400 mb-2">Server Error</p>
                <p className="text-sm text-white/70">There was a problem loading discovered artists.</p>
                <p className="text-xs text-white/50">This might be a temporary issue.</p>
              </>
            ) : error.includes('network') || error.includes('fetch') ? (
              <>
                <p className="text-yellow-400 mb-2">Network Error</p>
                <p className="text-sm text-white/70">Unable to connect to the server.</p>
                <p className="text-xs text-white/50">Check your internet connection.</p>
              </>
            ) : (
              <>
                <p className="text-red-400 mb-2">Discovery Failed</p>
                <p className="text-sm text-white/70">Failed to load discovered artists</p>
                <p className="text-xs text-white/50">{error}</p>
              </>
            )}

            <div className="flex gap-2 justify-center">
              <Button onClick={onRetry} variant="outline" size="sm">
                Refresh
              </Button>
              {process.env.NODE_ENV === 'development' && (
                <Button
                  onClick={() => {
                    console.log('[A&R Debug] Error details:', error);
                    console.log('[A&R Debug] Sourcing mode:', sourcingMode);
                    console.log('[A&R Debug] Game state:', gameState);
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  Debug Info
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : artists.length === 0 ? (
        <div className="text-center py-8">
          <Music className="w-12 h-12 text-white/50 mx-auto mb-4" />
          {sourcingMode ? (
            <div className="space-y-2">
              <p className="text-white/70">No new artists discovered this week</p>
              <p className="text-sm text-white/50">
                Your {sourcingMode} sourcing operation completed, but no suitable artists were found.
              </p>
              <p className="text-xs text-white/40">
                {sourcingMode === 'active'
                  ? 'Try specialized sourcing for higher-quality artists next time.'
                  : sourcingMode === 'passive'
                  ? 'Active sourcing might yield better results.'
                  : 'Consider trying active or passive sourcing approaches.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-white/70">No artists found matching your criteria</p>
              <p className="text-sm text-white/50">Try adjusting your search or filter settings.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#4e324c] hover:bg-[#2C222A]">
                <TableHead className="text-white/90 font-semibold w-20">Avatar</TableHead>
                <TableHead className="text-white/90 font-semibold">Artist</TableHead>
                <TableHead className="text-white/90 font-semibold">Archetype</TableHead>
                <TableHead className="text-white/90 font-semibold">Talent</TableHead>
                <TableHead className="text-white/90 font-semibold">Work Ethic</TableHead>
                <TableHead className="text-white/90 font-semibold">Popularity</TableHead>
                {sourcingMode && sourcingMode !== 'passive' && (
                  <TableHead className="text-white/90 font-semibold">Sourcing</TableHead>
                )}
                <TableHead className="text-white/90 font-semibold">Signing Cost</TableHead>
                <TableHead className="text-white/90 font-semibold">Weekly Cost</TableHead>
                <TableHead className="text-white/90 font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {artists.map((artist: UIArtist) => (
                <TableRow key={artist.id || artist.name} className="border-[#4e324c] hover:bg-[#2C222A]/50">
                  <TableCell className="w-20">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-[#2C222A]">
                      <img
                        src={`/avatars/${String(artist.name || '').toLowerCase().replace(/\s+/g, '_')}_full.png`}
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
                          <div className="font-semibold text-white text-base hover:text-[#A75A5B] transition-colors">{artist.name}</div>
                          <div className="text-xs text-white/70">{artist.genre || 'Unknown Genre'} • Age {artist.age || 25}</div>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent side="right" className="w-80 bg-[#23121c] border-[#4e324c] text-white">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">{artist.name}</h4>
                          <p className="text-sm text-white/70">{artist.bio || 'Talented artist...'}</p>
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
                    <span className="font-medium text-white">{artist.talent}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-white">{artist.workEthic}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-white">{artist.popularity}</span>
                  </TableCell>
                  {sourcingMode && sourcingMode !== 'passive' && (
                    <TableCell>
                      <div className="text-xs text-white/70 flex items-center gap-1">
                        {sourcingMode === 'active' ? <MapPin className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                        {sourcingMode === 'active' ? 'Club Circuit' : 'Digital Platforms'}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-semibold text-white">${(artist.signingCost || 5000).toLocaleString()}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium text-white/90">${(artist.weeklyCost || 800).toLocaleString()}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={() => onSignArtist(artist)}
                      disabled={
                        signingArtist === (artist.id || artist.name) ||
                        (gameState.money || 0) < (artist.signingCost || 5000) ||
                        signedArtists.length >= 3
                      }
                      size="sm"
                      variant={signingArtist === (artist.id || artist.name) ? 'secondary' : 'default'}
                    >
                      {signingArtist === (artist.id || artist.name) ? 'Signing...' :
                        (gameState.money || 0) < (artist.signingCost || 5000) ? 'Cannot Afford' :
                          signedArtists.length >= 3 ? 'Roster Full' : 'Sign'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
