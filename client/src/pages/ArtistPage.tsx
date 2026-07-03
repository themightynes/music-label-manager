import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GameLayout from '@/layouts/GameLayout';
import {
  User,
  Music,
  TrendingUp,
  Star,
  AlertCircle,
  Loader2,
  BarChart3,
  Settings,
  PlayCircle,
  Target,
  Eye,
  ChevronRight,
  Users,
  CircleCheck
} from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import { useReleases } from '@/hooks/useReleases';
import { useSongs } from '@/hooks/useSongs';
import { useProjects } from '@/hooks/useProjects';
import { useArtists } from '@/hooks/useArtists';
import { useLocation, useParams } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useArtistROI } from '@/hooks/useAnalytics';
import { findArtistBySlugOrId, generateArtistSlug } from '@/utils/artistSlug';
import type { Artist, Song, Project, Release } from '@/components/artist/types';
import { OverviewTab } from '@/components/artist/OverviewTab';
import { DiscographyTab } from '@/components/artist/DiscographyTab';
import { AnalyticsTab } from '@/components/artist/AnalyticsTab';
import { ReleasesTab } from '@/components/artist/ReleasesTab';
import { ManagementTab } from '@/components/artist/ManagementTab';

export default function ArtistPage() {
  const params = useParams();
  const artistParam = params.artistParam; // Can be either ID or slug
  const [, setLocation] = useLocation();
  const gameState = useGameState();
  // Phase 3 PR-6/PR-7/PR-9: releases / songs / projects / artists read from the
  // TanStack Query cache, not Zustand.
  const { data: releases = [] } = useReleases();
  const { data: storeSongs = [] } = useSongs();
  const { data: projects = [] } = useProjects();
  const { data: artists = [] } = useArtists();

  // Find the actual artist first to get ID for ROI
  const foundArtist = artists ? findArtistBySlugOrId(artists, artistParam || '') : null;
  const actualArtistId = foundArtist?.id || '';

  // Fetch ROI data once at top level to avoid duplicate calls
  const { data: roiData } = useArtistROI(actualArtistId);

  // Data state
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [artistProjects, setArtistProjects] = useState<Project[]>([]);
  const [artistReleases, setArtistReleases] = useState<Release[]>([]);

  // Loading and error states
  const [loadingArtist, setLoadingArtist] = useState(true);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [artistError, setArtistError] = useState<string | null>(null);
  const [songsError, setSongsError] = useState<string | null>(null);
  
  // Filter states for discography
  const [songFilter, setSongFilter] = useState<'all' | 'recorded' | 'released'>('all');

  // Artist card state
  const [expandedArtist, setExpandedArtist] = useState<boolean>(false);
  
  // Load artist data
  useEffect(() => {
    if (!artistParam || !gameState?.id) return;
    
    const loadArtistData = async () => {
      setLoadingArtist(true);
      setArtistError(null);
      
      try {
        // Find artist by slug or ID (backwards compatibility)
        const foundArtist = artists ? findArtistBySlugOrId(artists, artistParam) : null;
        if (foundArtist) {
          // Transform the artist data to match our interface
          const transformedArtist: Artist = {
            ...foundArtist,
            mood: foundArtist.mood || 50,
            energy: (foundArtist as any).energy ?? (foundArtist as any).loyalty ?? 50,
            loyalty: (foundArtist as any).energy ?? (foundArtist as any).loyalty ?? 50,
            talent: foundArtist.talent || 50,
            workEthic: foundArtist.workEthic || 50,
            popularity: foundArtist.popularity || 0,
            temperament: (foundArtist as any).temperament || 50
          };
          setArtist(transformedArtist);
        } else {
          // If not in store, could fetch from API
          throw new Error('Artist not found');
        }
        
        // Get projects for this artist
        const relevantProjects = projects?.filter(p => p.artistId === foundArtist.id) || [];
        setArtistProjects(relevantProjects as Project[]);
        
        // Get releases for this artist
        const relevantReleases = releases?.filter(r => r.artistId === foundArtist.id) || [];
        setArtistReleases(relevantReleases as Release[]);
        
      } catch (error: any) {
        console.error('Failed to load artist:', error);
        setArtistError(error.message || 'Failed to load artist data');
      } finally {
        setLoadingArtist(false);
      }
    };
    
    loadArtistData();
  }, [artistParam, gameState?.id, artists, projects, releases]);
  
  // Load songs data
  useEffect(() => {
    if (!actualArtistId || !gameState?.id) return;
    
    const loadSongsData = async () => {
      setLoadingSongs(true);
      setSongsError(null);
      
      try {
        // Try to load from API first
        const response = await apiRequest('GET',
          `/api/game/${gameState.id}/artists/${actualArtistId}/songs`);
        const data = await response.json();
        
        if (data.songs) {
          setSongs(data.songs);
        } else {
          // Fallback to the cached song list (Phase 3 PR-6: query cache, not store)
          const artistSongs = storeSongs?.filter((s: any) => s.artistId === actualArtistId) || [];
          setSongs(artistSongs as Song[]);
        }
      } catch (error: any) {
        console.error('Failed to load songs:', error);
        // Fallback to the cached song list on error
        const artistSongs = storeSongs?.filter((s: any) => s.artistId === actualArtistId) || [];
        setSongs(artistSongs as Song[]);
      } finally {
        setLoadingSongs(false);
      }
    };

    loadSongsData();
  }, [actualArtistId, gameState?.id, storeSongs]);
  
  const getArchetypeInfo = (archetype: string) => {
    const archetypeData: Record<string, any> = {
      'Visionary': { color: 'text-neon-lilac', icon: Star, description: 'Creative and experimental' },
      'Workhorse': { color: 'text-neon-cyan', icon: Target, description: 'Reliable and productive' },
      'Commercial': { color: 'text-positive', icon: TrendingUp, description: 'Market-focused and strategic' }
    };
    return archetypeData[archetype] || { color: 'text-text-body', icon: User, description: 'Unique artist' };
  };

  // Dynamic avatar function based on artist name
  const getAvatarUrl = (artistName: string) => {
    // Convert "Nova Sterling" -> "nova_sterling_full.png"
    const filename = artistName
      .toLowerCase()
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^a-z0-9_]/g, '') // Remove any non-alphanumeric characters except underscores
      + '_full.png';

    return `/avatars/${filename}`;
  };

  // Function to handle image load error and fallback to blank_full.png
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    if (img.src !== '/avatars/blank_full.png') {
      img.src = '/avatars/blank_full.png';
    }
  };

  // Derived values (memoized) — computed unconditionally to respect the Rules
  // of Hooks; guarded against a null `artist` so they are safe before the
  // loading/error early returns below.
  const avgQuality = useMemo(() => (
    songs.length > 0
      ? Math.round(songs.reduce((sum, s) => sum + s.quality, 0) / songs.length)
      : 0
  ), [songs]);

  const archetypeInfo = useMemo(
    () => getArchetypeInfo(artist?.archetype ?? ''),
    [artist?.archetype]
  );

  const moodStatus = useMemo(() => {
    const mood = artist?.mood ?? 50;
    return mood >= 70
      ? { status: 'Happy', color: 'text-positive', bgColor: 'bg-positive/10' }
      : mood >= 40
      ? { status: 'Neutral', color: 'text-warning', bgColor: 'bg-warning/10' }
      : { status: 'Unhappy', color: 'text-negative', bgColor: 'bg-negative/10' };
  }, [artist?.mood]);

  // Enhanced artist analytics (for artist card)
  const insights = useMemo(() => {
    const mood = artist?.mood ?? 50;
    const energy = artist?.energy ?? (artist as any)?.loyalty ?? 50;
    const popularity = artist?.popularity ?? 0;

    // Total revenue from songs
    const totalRevenue = songs.reduce((sum, song) => sum + (song.totalRevenue || 0), 0);

    return {
      projects: artistProjects.length,
      releasedProjects: songs.filter(s => s.isReleased).length,
      totalRevenue,
      archetype: artist?.archetype,
      mood,
      energy,
      loyalty: energy,
      popularity
    };
  }, [artist, songs, artistProjects]);

  // Artist card handlers (memoized for the memoized OverviewTab child)
  const handleArtistMeeting = useCallback(() => {
    console.info(`[ArtistPage] Artist meetings temporarily unavailable for ${artist?.name}.`);
  }, [artist?.name]);

  const handleNavigateToArtist = useCallback(() => {
    // Already on artist page, so scroll to top or refresh
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleToggleExpand = useCallback(() => {
    setExpandedArtist(prev => !prev);
  }, []);

  if (loadingArtist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-neon-lilac mx-auto mb-4 animate-spin" />
          <p className="text-text-body">Loading artist data...</p>
        </div>
      </div>
    );
  }

  if (artistError || !artist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-negative mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">Artist Not Found</h2>
            <p className="text-text-body mb-4">{artistError || 'The requested artist could not be found.'}</p>
            <Button onClick={() => setLocation('/game')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2-letter initials for the avatar tile fallback badge (Major Mono Display, per reference)
  const initials = artist.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toLowerCase();

  return (
    <GameLayout>
      <div className="min-h-screen">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-text-muted mb-4 mt-8">
            <Users className="w-3 h-3" />
            <span>Artists</span>
            <ChevronRight className="w-2.5 h-2.5 opacity-50" />
            <span className="text-text-body">{artist.name}</span>
          </div>

          {/* Hero section */}
          <div className="mb-8">
            <div className="flex items-center gap-4">
              <div className="relative w-[74px] h-[74px] rounded-card overflow-hidden flex-shrink-0 bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center shadow-glow-purple ring-1 ring-white/[0.14]">
                <span className="font-display text-2xl text-white/90 lowercase">{initials}</span>
              </div>
              <div>
                <h1 className="font-sans font-bold text-4xl leading-none tracking-tight text-text-primary">{artist.name}</h1>
                <div className="flex items-center gap-2 mt-3">
                  <Badge className="border-neon-lilac/40 bg-neon-lilac/[0.18] text-neon-lilac gap-1.5">
                    <Star className="w-3 h-3" />
                    {artist.archetype}
                  </Badge>
                  {artist.signed && (
                    <Badge className="border-positive/40 bg-positive/[0.16] text-positive gap-1.5">
                      <CircleCheck className="w-3 h-3" />
                      Signed
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="relative">
            <TabsList className="grid grid-cols-5 w-full max-w-2xl">
              {/* Artist avatar positioned relative to tab menu — wrapper height =
                  top offset (160px) + tab bar (40px) + space-y-6 gap (24px) so the
                  image crops exactly at the translucent card's top edge below */}
              <div className="absolute -top-40 -right-20 z-10 h-56 overflow-hidden">
                <img
                  src={getAvatarUrl(artist.name)}
                  alt={`${artist.name} avatar`}
                  className="relative w-[600px] h-auto object-cover object-top rounded-card"
                  style={{ height: '300px' }}
                  onError={handleImageError}
                />
              </div>
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="discography" className="flex items-center space-x-2">
                <Music className="w-4 h-4" />
                <span className="hidden sm:inline">Discography</span>
              </TabsTrigger>
              <TabsTrigger value="releases" className="flex items-center space-x-2">
                <PlayCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Releases</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="management" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Manage</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <OverviewTab
            artist={artist}
            songs={songs}
            artistId={actualArtistId || ''}
            avgQuality={avgQuality}
            projectCount={artistProjects.length}
            insights={insights}
            roiData={roiData}
            gameState={gameState}
            expandedArtist={expandedArtist}
            onToggleExpand={handleToggleExpand}
            onMeet={handleArtistMeeting}
            onNavigate={handleNavigateToArtist}
          />
          
          {/* Discography Tab - Reorganized with releases grouping */}
          <DiscographyTab songs={songs} artistReleases={artistReleases} />
          
          {/* Releases Tab */}
          <ReleasesTab
            artistReleases={artistReleases}
            songs={songs}
            artistName={artist.name}
            currentWeek={gameState?.currentWeek || 1}
            onNavigate={setLocation}
          />
          
          {/* Analytics Tab */}
          <AnalyticsTab songs={songs} artistReleases={artistReleases} />
          
          {/* Management Tab */}
          <ManagementTab
            artist={artist}
            moodStatus={moodStatus}
            archetypeInfo={archetypeInfo}
            onNavigate={setLocation}
          />
        </Tabs>
        </main>
      </div>
    </GameLayout>
  );
}