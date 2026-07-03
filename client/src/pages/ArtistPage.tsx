import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ReleaseWorkflowCard } from '@/components/ReleaseWorkflowCard';
import { ArtistCard, getArchetypeInfo as getArtistCardArchetypeInfo, getRelationshipStatus } from '@/components/ArtistCard';
import GameLayout from '@/layouts/GameLayout';
import {
  ArrowLeft,
  User,
  Music,
  Calendar,
  DollarSign,
  TrendingUp,
  Heart,
  Star,
  Play,
  AlertCircle,
  Loader2,
  BarChart3,
  Activity,
  Award,
  Settings,
  Filter,
  PlayCircle,
  Mic,
  Users,
  Target,
  Clock,
  ChevronDown,
  Eye,
  Disc,
  Radio
} from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useLocation, useParams } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useArtistROI } from '@/hooks/useAnalytics';
import { findArtistBySlugOrId, generateArtistSlug } from '@/utils/artistSlug';
import type { Artist, Song, Project, Release } from '@/components/artist/types';
import { getQualityColor } from '@/components/artist/artistPageUtils';
import { DiscographyTab } from '@/components/artist/DiscographyTab';
import { AnalyticsTab } from '@/components/artist/AnalyticsTab';
import { ReleasesTab } from '@/components/artist/ReleasesTab';
import { ManagementTab } from '@/components/artist/ManagementTab';

export default function ArtistPage() {
  const params = useParams();
  const artistParam = params.artistParam; // Can be either ID or slug
  const [, setLocation] = useLocation();
  const { gameState, artists, projects, releases } = useGameStore();

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
          // Fallback to store
          const { songs: allSongs } = useGameStore.getState();
          const artistSongs = allSongs?.filter(s => s.artistId === actualArtistId) || [];
          setSongs(artistSongs as Song[]);
        }
      } catch (error: any) {
        console.error('Failed to load songs:', error);
        // Fallback to store on error
        const { songs: allSongs } = useGameStore.getState();
        const artistSongs = allSongs?.filter(s => s.artistId === actualArtistId) || [];
        setSongs(artistSongs as Song[]);
      } finally {
        setLoadingSongs(false);
      }
    };
    
    loadSongsData();
  }, [actualArtistId, gameState?.id]);
  
  const getArchetypeInfo = (archetype: string) => {
    const archetypeData: Record<string, any> = {
      'Visionary': { color: 'text-brand-burgundy-dark', icon: Star, description: 'Creative and experimental' },
      'Workhorse': { color: 'text-blue-600', icon: Target, description: 'Reliable and productive' },
      'Commercial': { color: 'text-green-600', icon: TrendingUp, description: 'Market-focused and strategic' }
    };
    return archetypeData[archetype] || { color: 'text-white/70', icon: User, description: 'Unique artist' };
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

  // Enhanced artist analytics (for artist card)
  const getArtistInsights = (artist: Artist) => {
    const mood = artist.mood || 50;
    const energy = artist.energy ?? (artist as any).loyalty ?? 50;
    const popularity = artist.popularity || 0;

    // Total revenue from songs
    const totalRevenue = songs.reduce((sum, song) => {
      return sum + (song.totalRevenue || 0);
    }, 0);

    return {
      projects: artistProjects.length,
      releasedProjects: songs.filter(s => s.isReleased).length,
      totalRevenue,
      archetype: artist.archetype,
      mood,
      energy,
      loyalty: energy,
      popularity
    };
  };
  
  if (loadingArtist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-white/70">Loading artist data...</p>
        </div>
      </div>
    );
  }
  
  if (artistError || !artist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Artist Not Found</h2>
            <p className="text-white/70 mb-4">{artistError || 'The requested artist could not be found.'}</p>
            <Button onClick={() => setLocation('/game')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const avgQuality = songs.length > 0 
    ? Math.round(songs.reduce((sum, s) => sum + s.quality, 0) / songs.length)
    : 0;
  
  const totalStreams = songs.reduce((sum, s) => sum + (s.totalStreams || 0), 0);
  const totalRevenue = songs.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);
  const releasedSongs = songs.filter(s => s.isReleased).length;
  
  const archetypeInfo = getArchetypeInfo(artist.archetype);
  const moodStatus = (artist.mood || 50) >= 70 
    ? { status: 'Happy', color: 'text-green-600', bgColor: 'bg-green-500/10' }
    : (artist.mood || 50) >= 40 
    ? { status: 'Neutral', color: 'text-yellow-600', bgColor: 'bg-yellow-500/10' }
    : { status: 'Unhappy', color: 'text-red-600', bgColor: 'bg-red-500/10' };

  // Artist card handlers
  const handleArtistMeeting = () => {
    console.info(`[ArtistPage] Artist meetings temporarily unavailable for ${artist.name}.`);
  };

  const handleNavigateToArtist = () => {
    // Already on artist page, so scroll to top or refresh
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <GameLayout>
      <div className="min-h-screen">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Move artist header info here as hero section */}
          <div className="mb-8 mt-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-burgundy/80 to-brand-burgundy-dark/80 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{artist.name}</h1>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="outline" className="text-xs bg-white/10 text-white border-white/20">{artist.archetype}</Badge>
                  {artist.signed && (
                    <Badge className="text-xs bg-green-500/20 text-green-400 border-0">Signed</Badge>
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
                  className="w-[600px] h-auto object-cover object-top"
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
          <TabsContent value="overview" className="space-y-6">
            {/* Rich Artist Card */}
            <Card className="relative z-20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Artist Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ArtistCard
                    artist={artist}
                    insights={getArtistInsights(artist)}
                    relationship={getRelationshipStatus(artist.mood || 50, artist.energy ?? (artist as any).loyalty ?? 50)}
                    archetype={getArtistCardArchetypeInfo(artist.archetype)}
                    isExpanded={expandedArtist}
                    onToggleExpand={() => setExpandedArtist(!expandedArtist)}
                    onMeet={handleArtistMeeting}
                    onNavigate={handleNavigateToArtist}
                    gameState={gameState}
                    roiData={roiData}
                  />
                </CardContent>
              </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Artist Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Artist Stats</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Mood</span>
                        <span className={`font-medium ${(artist.mood || 50) >= 70 ? 'text-green-600' : (artist.mood || 50) >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {artist.mood || 50}%
                        </span>
                      </div>
                      <Progress value={artist.mood || 50} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                      <span>Energy</span>
                        <span className={`font-medium ${((artist.energy ?? (artist as any).loyalty ?? 50) >= 70) ? 'text-green-600' : ((artist.energy ?? (artist as any).loyalty ?? 50) >= 40) ? 'text-yellow-600' : 'text-red-600'}`}>
                          {artist.energy ?? (artist as any).loyalty ?? 50}%
                        </span>
                      </div>
                      <Progress value={artist.energy ?? (artist as any).loyalty ?? 50} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Talent</span>
                        <span className="font-medium">{artist.talent || 50}%</span>
                      </div>
                      <Progress value={artist.talent || 50} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Work Ethic</span>
                        <span className="font-medium">{artist.workEthic || 50}%</span>
                      </div>
                      <Progress value={artist.workEthic || 50} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PerformanceMetrics
                    artistId={actualArtistId || ''}
                    avgQuality={avgQuality}
                    projectCount={artistProjects.length}
                    readySongs={songs.filter(s => s.isRecorded && !s.isReleased).length}
                    popularity={artist.popularity || 0}
                    roiData={roiData}
                  />
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>Recent Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {songs.length === 0 ? (
                      <div className="text-center text-white/50 py-4">
                        <Music className="w-8 h-8 text-white/30 mx-auto mb-2" />
                        <p className="text-sm">No activity yet</p>
                      </div>
                    ) : (
                      <>
                        {songs.slice(0, 3).map(song => (
                          <div key={song.id} className="flex items-center justify-between p-2 bg-brand-dark-card/5 rounded">
                            <div>
                              <div className="text-sm font-medium">{song.title}</div>
                              <div className="text-xs text-white/50">
                                {song.isReleased ? 'Released' : song.isRecorded ? 'Recorded' : 'Recording'} • Week {song.createdWeek}
                              </div>
                            </div>
                            <Badge className={getQualityColor(song.quality)}>
                              {song.quality}
                            </Badge>
                          </div>
                        ))}
                        {songs.length > 3 && (
                          <div className="text-center">
                            <Button variant="ghost" size="sm">
                              View All {songs.length} Songs
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
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

// Component to display performance metrics with backend ROI
function PerformanceMetrics({
  artistId,
  avgQuality,
  projectCount,
  readySongs,
  popularity,
  roiData
}: {
  artistId: string;
  avgQuality: number;
  projectCount: number;
  readySongs: number;
  popularity: number;
  roiData?: any;
}) {
  // Use passed roiData to avoid duplicate API calls
  const overallROI = roiData?.overallROI ?? 0;
  const totalRevenue = roiData?.totalRevenue ?? 0;
  const totalStreams = roiData?.totalStreams ?? 0;
  const totalProductionCost = roiData?.totalProductionInvestment ?? 0;
  const totalMarketingCost = roiData?.totalMarketingInvestment ?? 0;
  
  return (
    <div className="space-y-4">
      {/* Main metrics grid */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="p-3 bg-blue-500/10 rounded-lg">
          <div className="text-lg font-bold text-blue-700">{avgQuality}</div>
          <div className="text-xs text-white/70">Avg Quality</div>
        </div>
        <div className="p-3 bg-green-500/10 rounded-lg">
          <div className="text-lg font-bold text-green-700">{projectCount}</div>
          <div className="text-xs text-white/70">Projects</div>
        </div>
        <div className="p-3 bg-brand-burgundy-dark/10 rounded-lg">
          <div className="text-lg font-bold text-brand-burgundy-dark">{readySongs}</div>
          <div className="text-xs text-white/70">Ready Songs</div>
        </div>
        <div className="p-3 bg-orange-500/10 rounded-lg">
          <div className="text-lg font-bold text-orange-700">{popularity}</div>
          <div className="text-xs text-white/70">Popularity</div>
        </div>
      </div>
      
      {/* Financial metrics - separate section */}
      <div className="pt-3 border-t border-brand-purple/50">
        <div className="grid grid-cols-2 gap-3">
          {/* Revenue and Streams */}
          <div className="p-3 bg-green-500/10 rounded-lg">
            <div className="text-lg font-bold text-green-700">
              ${(totalRevenue / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-white/70">Total Revenue</div>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg">
            <div className="text-lg font-bold text-blue-700">
              {(totalStreams / 1000).toFixed(0)}k
            </div>
            <div className="text-xs text-white/70">Total Streams</div>
          </div>
          
          {/* Costs */}
          <div className="p-3 bg-brand-purple-light/10 rounded-lg">
            <div className="text-lg font-bold text-brand-purple-light">
              ${(totalProductionCost / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-white/70">Recording Costs</div>
          </div>
          <div className="p-3 bg-brand-burgundy/10 rounded-lg">
            <div className="text-lg font-bold text-brand-burgundy">
              ${(totalMarketingCost / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-white/70">Marketing Costs</div>
          </div>
          
          {/* ROI - spans full width */}
          <div className={`col-span-2 p-3 ${overallROI >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'} rounded-lg`}>
            <div className={`text-xl font-bold ${overallROI >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {overallROI > 0 ? '+' : ''}{overallROI.toFixed(0)}%
            </div>
            <div className="text-xs text-white/70">Return on Investment</div>
          </div>
        </div>
      </div>
    </div>
  );
}