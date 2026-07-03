import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Music, TrendingUp, Zap, Heart, Star, MapPin, Globe } from 'lucide-react';
import type { GameState } from '@shared/types/gameTypes';
import type { Artist as SharedArtist } from '@shared/schema';
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
  const { toast } = useToast();

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
      case 'Visionary': return 'bg-neon-lilac/14 text-neon-lilac border-neon-lilac/40';
      case 'Workhorse': return 'bg-positive/14 text-positive border-positive/40';
      case 'Trendsetter': return 'bg-neon-cyan/14 text-neon-cyan border-neon-cyan/40';
      default: return 'bg-white/8 text-text-body border-white/12';
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
            className="pl-3 pr-3 h-10 rounded-button bg-white/[0.03] border border-white/9 text-text-primary placeholder:text-text-muted w-full focus:outline-none focus:border-neon-lilac/40 focus:bg-white/[0.045]"
          />
        </div>
        <div className="flex gap-2">
          {['All', 'Visionary', 'Workhorse', 'Trendsetter'].map(type => {
            const active = selectedArchetype === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onArchetypeChange(type)}
                className={`inline-flex items-center whitespace-nowrap rounded-pill px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
                  active
                    ? 'bg-gradient-to-r from-action-pink to-action-purple text-white shadow-action'
                    : 'bg-white/[0.02] border border-white/9 text-text-body hover:bg-white/[0.045] hover:text-text-primary'
                }`}
              >
                {type !== 'All' && getArchetypeIcon(type)}
                <span className={type !== 'All' ? 'ml-1' : ''}>{type}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table / states */}
      {loading ? (
        <div className="text-center py-8">
          <Music className="w-12 h-12 text-text-muted mx-auto mb-4 animate-pulse" />
          <p className="text-text-body">Loading available artists...</p>
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-text-muted mt-2">Debug: Loading discovered artists from A&R operation</p>
          )}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-negative mx-auto mb-4" />
          <div className="space-y-3">
            {/* Enhanced error messages based on error type */}
            {error.includes('404') ? (
              <>
                <p className="text-neon-amber mb-2">No Artists Discovered</p>
                <p className="text-sm text-text-body">Your A&R operation didn't discover any new artists this week.</p>
                <p className="text-xs text-text-muted">Try a different sourcing approach next time.</p>
              </>
            ) : error.includes('500') ? (
              <>
                <p className="text-negative mb-2">Server Error</p>
                <p className="text-sm text-text-body">There was a problem loading discovered artists.</p>
                <p className="text-xs text-text-muted">This might be a temporary issue.</p>
              </>
            ) : error.includes('network') || error.includes('fetch') ? (
              <>
                <p className="text-warning mb-2">Network Error</p>
                <p className="text-sm text-text-body">Unable to connect to the server.</p>
                <p className="text-xs text-text-muted">Check your internet connection.</p>
              </>
            ) : (
              <>
                <p className="text-negative mb-2">Discovery Failed</p>
                <p className="text-sm text-text-body">Failed to load discovered artists</p>
                <p className="text-xs text-text-muted">{error}</p>
              </>
            )}

            <div className="flex gap-2 justify-center">
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="border-neon-cyan/35 bg-neon-cyan/6 text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan"
              >
                Refresh
              </Button>
              {process.env.NODE_ENV === 'development' && (
                <Button
                  onClick={() => {
                    const debugInfo = {
                      error,
                      sourcingMode,
                      arOfficeSlotUsed: gameState.arOfficeSlotUsed,
                      arOfficeSourcingType: (gameState as any).arOfficeSourcingType,
                      gameId: gameState.id,
                      currentWeek: gameState.currentWeek,
                      flags: (gameState as any).flags
                    };
                    // Log full details to console and surface a toast (no blocking native dialog)
                    console.log('[A&R Debug Info]', debugInfo);
                    toast({
                      title: 'A&R Debug Info',
                      description: `Error: ${error || 'none'} · Sourcing: ${sourcingMode || 'none'} · Slot used: ${gameState.arOfficeSlotUsed || false}. Full details logged to console.`,
                    });
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-text-muted hover:text-text-body"
                >
                  Debug Info
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : artists.length === 0 ? (
        <div className="text-center py-8">
          <Music className="w-12 h-12 text-text-muted mx-auto mb-4" />
          {sourcingMode ? (
            <div className="space-y-2">
              <p className="text-text-body">No new artists discovered this week</p>
              <p className="text-sm text-text-muted">
                Your {sourcingMode} sourcing operation completed, but no suitable artists were found.
              </p>
              <p className="text-xs text-text-muted/80">
                {sourcingMode === 'active'
                  ? 'Try specialized sourcing for higher-quality artists next time.'
                  : sourcingMode === 'passive'
                  ? 'Active sourcing might yield better results.'
                  : 'Consider trying active or passive sourcing approaches.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-text-body">No artists found matching your criteria</p>
              <p className="text-sm text-text-muted">Try adjusting your search or filter settings.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel chromatic-hairline border-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/6 hover:bg-transparent">
                <TableHead className="w-20 font-mono text-[10px] uppercase tracking-[0.18em] text-text-label">Avatar</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-label">Artist</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-label">Archetype</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-label">Talent</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-label">Work Ethic</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-label">Popularity</TableHead>
                {sourcingMode && sourcingMode !== 'passive' && (
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-label">Sourcing</TableHead>
                )}
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-label">Signing Cost</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-label">Weekly Cost</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-label">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {artists.map((artist: UIArtist) => (
                <TableRow key={artist.id || artist.name} className="border-white/6 hover:bg-white/[0.045]">
                  <TableCell className="w-20">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-inner border border-white/8">
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
                          <div className="font-semibold text-text-primary text-base hover:text-neon-lilac transition-colors">{artist.name}</div>
                          <div className="text-xs text-text-muted">{artist.genre || 'Unknown Genre'} • Age {artist.age || 25}</div>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent side="right" className="w-80 bg-surface-tooltip border-white/12 text-text-primary">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">{artist.name}</h4>
                          <p className="text-sm text-text-body">{artist.bio || 'Talented artist...'}</p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getArchetypeColor(artist.archetype)} border rounded-chip font-mono text-[11px]`}>
                      {getArchetypeIcon(artist.archetype)}
                      <span className="ml-1">{artist.archetype}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-text-primary">{artist.talent}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-text-primary">{artist.workEthic}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-text-primary">{artist.popularity}</span>
                  </TableCell>
                  {sourcingMode && sourcingMode !== 'passive' && (
                    <TableCell>
                      <div className="text-xs text-text-body flex items-center gap-1">
                        {sourcingMode === 'active' ? <MapPin className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                        {sourcingMode === 'active' ? 'Club Circuit' : 'Digital Platforms'}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-mono font-semibold text-money">${(artist.signingCost || 5000).toLocaleString()}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-mono text-money/90">${(artist.weeklyCost || 800).toLocaleString()}</div>
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
                      className={
                        signingArtist === (artist.id || artist.name) ||
                        (gameState.money || 0) < (artist.signingCost || 5000) ||
                        signedArtists.length >= 3
                          ? 'bg-white/[0.02] border border-white/9 text-text-muted hover:bg-white/[0.02]'
                          : 'bg-gradient-to-br from-action-pink to-action-purple text-white shadow-action border-0 hover:opacity-90'
                      }
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
