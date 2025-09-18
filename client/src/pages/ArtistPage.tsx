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

// Types based on existing patterns
interface Artist {
  id: string;
  name: string;
  archetype: string;
  talent?: number | null;
  workEthic?: number | null;
  popularity?: number | null;
  temperament?: number | null;
  loyalty: number | null;
  mood: number | null;
  signed?: boolean | null;
  isSigned?: boolean | null;
  signingCost?: number | null;
  monthlyCost?: number | null;
  monthlyFee?: number | null;
  bio?: string;
  genre?: string;
  age?: number | null;
}

interface Song {
  id: string;
  title: string;
  quality: number;
  genre: string;
  mood: string;
  artistId: string;
  artistName: string;
  createdMonth: number;
  isRecorded: boolean;
  isReleased: boolean;
  releaseId?: string | null;
  totalStreams?: number;
  totalRevenue?: number;
  monthlyStreams?: number;
  lastMonthRevenue?: number;
  releaseMonth?: number;
  metadata?: any;
}

interface Project {
  id: string;
  title: string;
  type: 'Single' | 'EP' | 'Mini-Tour';
  artistId: string;
  stage: 'planning' | 'production' | 'marketing' | 'released';
  quality: number;
  budget: number;
  budgetUsed: number;
  dueMonth: number;
  startMonth: number;
  metadata?: Record<string, any>;
}

interface Release {
  id: string;
  title: string;
  type: 'single' | 'ep' | 'album';
  artistId: string;
  status: 'planned' | 'released' | 'catalog';
  releaseMonth?: number;
  songIds: string[];
  streamsGenerated: number;
  revenueGenerated: number;
  marketingBudget?: number;
  metadata?: Record<string, any>;
}

export default function ArtistPage() {
  const params = useParams();
  const artistId = params.artistId;
  const [, setLocation] = useLocation();
  const { gameState, artists, projects, releases } = useGameStore();

  // Fetch ROI data once at top level to avoid duplicate calls
  const { data: roiData } = useArtistROI(artistId || '');

  // Data state
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [artistProjects, setArtistProjects] = useState<Project[]>([]);
  const [artistReleases, setArtistReleases] = useState<Release[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  
  // Loading and error states
  const [loadingArtist, setLoadingArtist] = useState(true);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [artistError, setArtistError] = useState<string | null>(null);
  const [songsError, setSongsError] = useState<string | null>(null);
  
  // Filter states for discography
  const [songFilter, setSongFilter] = useState<'all' | 'recorded' | 'released'>('all');
  const [qualityFilter, setQualityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'creation' | 'quality' | 'streams' | 'revenue'>('creation');

  // Artist card state
  const [expandedArtist, setExpandedArtist] = useState<boolean>(false);
  
  // Load artist data
  useEffect(() => {
    if (!artistId || !gameState?.id) return;
    
    const loadArtistData = async () => {
      setLoadingArtist(true);
      setArtistError(null);
      
      try {
        // First try to find artist in the store
        const foundArtist = artists?.find(a => a.id === artistId);
        if (foundArtist) {
          // Transform the artist data to match our interface
          const transformedArtist: Artist = {
            ...foundArtist,
            mood: foundArtist.mood || 50,
            loyalty: foundArtist.loyalty || 50,
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
        const relevantProjects = projects?.filter(p => p.artistId === artistId) || [];
        setArtistProjects(relevantProjects as Project[]);
        
        // Get releases for this artist  
        const relevantReleases = releases?.filter(r => r.artistId === artistId) || [];
        setArtistReleases(relevantReleases as Release[]);
        
      } catch (error: any) {
        console.error('Failed to load artist:', error);
        setArtistError(error.message || 'Failed to load artist data');
      } finally {
        setLoadingArtist(false);
      }
    };
    
    loadArtistData();
  }, [artistId, gameState?.id, artists, projects, releases]);
  
  // Load songs data
  useEffect(() => {
    if (!artistId || !gameState?.id) return;
    
    const loadSongsData = async () => {
      setLoadingSongs(true);
      setSongsError(null);
      
      try {
        // Try to load from API first
        const response = await apiRequest('GET', 
          `/api/game/${gameState.id}/artists/${artistId}/songs`);
        const data = await response.json();
        
        if (data.songs) {
          setSongs(data.songs);
        } else {
          // Fallback to store
          const { songs: allSongs } = useGameStore.getState();
          const artistSongs = allSongs?.filter(s => s.artistId === artistId) || [];
          setSongs(artistSongs as Song[]);
        }
      } catch (error: any) {
        console.error('Failed to load songs:', error);
        // Fallback to store on error
        const { songs: allSongs } = useGameStore.getState();
        const artistSongs = allSongs?.filter(s => s.artistId === artistId) || [];
        setSongs(artistSongs as Song[]);
      } finally {
        setLoadingSongs(false);
      }
    };
    
    loadSongsData();
  }, [artistId, gameState?.id]);
  
  // Helper functions
  const getQualityColor = (quality: number) => {
    if (quality >= 90) return 'bg-green-500/20 text-green-800';
    if (quality >= 80) return 'bg-blue-500/20 text-blue-800';
    if (quality >= 70) return 'bg-yellow-500/20 text-yellow-800';
    return 'bg-red-500/20 text-red-800';
  };
  
  const getReleaseTypeBadge = (type: string) => {
    const typeConfig = {
      single: { label: 'Single', color: 'bg-blue-500/20 text-blue-800' },
      ep: { label: 'EP', color: 'bg-[#791014]/20 text-[#791014]' },
      album: { label: 'Album', color: 'bg-green-500/20 text-green-800' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.single;
    return <Badge className={config.color}>{config.label}</Badge>;
  };
  
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planned: { label: 'Planned', color: 'bg-yellow-500/20 text-yellow-800', icon: Clock },
      released: { label: 'Released', color: 'bg-green-500/20 text-green-800', icon: PlayCircle },
      catalog: { label: 'Catalog', color: 'bg-gray-500/20 text-white', icon: Disc }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { label: status, color: 'bg-gray-500/20 text-white', icon: Music };
    return (
      <Badge className={`${config.color} flex items-center space-x-1`}>
        <config.icon className="w-3 h-3" />
        <span>{config.label}</span>
      </Badge>
    );
  };
  
  // Group songs by release
  const getSongsByRelease = () => {
    const releasedSongs: { [releaseId: string]: Song[] } = {};
    const unreleasedSongs: Song[] = [];
    
    songs.forEach(song => {
      if (song.isReleased && song.releaseId) {
        if (!releasedSongs[song.releaseId]) {
          releasedSongs[song.releaseId] = [];
        }
        releasedSongs[song.releaseId].push(song);
      } else {
        unreleasedSongs.push(song);
      }
    });
    
    return { releasedSongs, unreleasedSongs };
  };
  
  // Calculate total marketing cost including lead single
  const getTotalMarketingCost = (release: Release) => {
    const mainBudget = release.marketingBudget || 0;
    const leadSingleBudget = release.metadata?.leadSingleStrategy?.totalLeadSingleBudget || 0;
    return mainBudget + leadSingleBudget;
  };
  
  const getArchetypeInfo = (archetype: string) => {
    const archetypeData: Record<string, any> = {
      'Visionary': { color: 'text-[#791014]', icon: Star, description: 'Creative and experimental' },
      'Workhorse': { color: 'text-blue-600', icon: Target, description: 'Reliable and productive' },
      'Commercial': { color: 'text-green-600', icon: TrendingUp, description: 'Market-focused and strategic' }
    };
    return archetypeData[archetype] || { color: 'text-white/70', icon: User, description: 'Unique artist' };
  };

  // Enhanced artist analytics (for artist card)
  const getArtistInsights = (artist: Artist) => {
    const mood = artist.mood || 50;
    const loyalty = artist.loyalty || 50;
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
      loyalty,
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
            <Button onClick={() => setLocation('/')}>Back to Dashboard</Button>
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
  
  const { releasedSongs: songsByRelease, unreleasedSongs } = getSongsByRelease();

  // Artist card handlers
  const handleArtistMeeting = async () => {
    const { openDialogue } = useGameStore.getState();
    await openDialogue('Artist', `meeting_${artist.id}`);
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
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#A75A5B]/80 to-[#791014]/80 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{artist.name}</h1>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="outline" className="text-xs bg-white/10 text-white border-white/20">{artist.archetype}</Badge>
                  {artist.isSigned && (
                    <Badge className="text-xs bg-green-500/20 text-green-400 border-0">Signed</Badge>
                  )}
                </div>
              </div>
            </div>
            {/* Move quick stats here */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#23121c] border border-[#4e324c] rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{songs.length}</div>
                <div className="text-xs text-white/70">Total Songs</div>
              </div>
              <div className="bg-[#23121c] border border-[#4e324c] rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-green-600">{releasedSongs}</div>
                <div className="text-xs text-white/70">Released</div>
              </div>
              <div className="bg-[#23121c] border border-[#4e324c] rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-blue-600">${(totalRevenue / 1000).toFixed(1)}k</div>
                <div className="text-xs text-white/70">Total Revenue</div>
              </div>
              <div className="bg-[#23121c] border border-[#4e324c] rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-[#791014]">{(totalStreams / 1000).toFixed(0)}k</div>
                <div className="text-xs text-white/70">Total Streams</div>
              </div>
            </div>
          </div>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
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
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Rich Artist Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Artist Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ArtistCard
                  artist={artist}
                  insights={getArtistInsights(artist)}
                  relationship={getRelationshipStatus(artist.mood || 50, artist.loyalty || 50)}
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
                        <span>Loyalty</span>
                        <span className={`font-medium ${(artist.loyalty || 50) >= 70 ? 'text-green-600' : (artist.loyalty || 50) >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {artist.loyalty || 50}%
                        </span>
                      </div>
                      <Progress value={artist.loyalty || 50} className="h-2" />
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
                    artistId={artistId || ''}
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
                          <div key={song.id} className="flex items-center justify-between p-2 bg-[#23121c]/5 rounded">
                            <div>
                              <div className="text-sm font-medium">{song.title}</div>
                              <div className="text-xs text-white/50">
                                {song.isReleased ? 'Released' : song.isRecorded ? 'Recorded' : 'Recording'} • Month {song.createdMonth}
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
          <TabsContent value="discography" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Complete Discography</span>
                  <Badge variant="outline">{songs.length} Total Songs</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Released Songs by Release */}
                {artistReleases.filter(r => r.status === 'released' || r.status === 'catalog').map(release => {
                  const releaseSongs = songsByRelease[release.id] || [];
                  if (releaseSongs.length === 0) return null;
                  
                  // Calculate totals for this release
                  const releaseTotalStreams = releaseSongs.reduce((sum, song) => sum + (song.totalStreams || 0), 0);
                  const releaseTotalRevenue = releaseSongs.reduce((sum, song) => sum + (song.totalRevenue || 0), 0);
                  
                  return (
                    <div key={release.id} className="mb-6 last:mb-0">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-lg">{release.title}</h3>
                          {getReleaseTypeBadge(release.type)}
                          {getStatusBadge(release.status)}
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-sm text-white/70">
                            Month {release.releaseMonth} • {releaseSongs.length} songs
                          </div>
                          <div className="flex items-center space-x-3 text-sm">
                            <div className="flex items-center space-x-1">
                              <span className="text-white/50">Total:</span>
                              <span className="font-semibold text-blue-600">
                                {(releaseTotalStreams / 1000).toFixed(0)}k streams
                              </span>
                            </div>
                            <div className="text-white/30">•</div>
                            <div className="flex items-center space-x-1">
                              <span className="font-semibold text-green-600">
                                ${(releaseTotalRevenue / 1000).toFixed(1)}k
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-xs text-white/50 border-b">
                              <th className="pb-2">#</th>
                              <th className="pb-2">Title</th>
                              <th className="pb-2">Quality</th>
                              <th className="pb-2">Genre</th>
                              <th className="pb-2">Mood</th>
                              <th className="pb-2 text-right">Streams</th>
                              <th className="pb-2 text-right">Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {releaseSongs.map((song, idx) => (
                              <tr key={song.id} className="border-b last:border-0">
                                <td className="py-2 text-sm text-white/50">{idx + 1}</td>
                                <td className="py-2 font-medium">{song.title}</td>
                                <td className="py-2">
                                  <Badge className={getQualityColor(song.quality)}>
                                    {song.quality}
                                  </Badge>
                                </td>
                                <td className="py-2 text-sm capitalize">{song.genre}</td>
                                <td className="py-2 text-sm capitalize">{song.mood}</td>
                                <td className="py-2 text-sm text-right">
                                  {(song.totalStreams || 0).toLocaleString()}
                                </td>
                                <td className="py-2 text-sm text-right">
                                  ${(song.totalRevenue || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
                
                {/* Unreleased Songs */}
                {unreleasedSongs.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">Unreleased Songs</h3>
                      <Badge variant="outline" className="bg-yellow-500/10">
                        {unreleasedSongs.length} songs
                      </Badge>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-xs text-white/50 border-b">
                            <th className="pb-2">#</th>
                            <th className="pb-2">Title</th>
                            <th className="pb-2">Quality</th>
                            <th className="pb-2">Genre</th>
                            <th className="pb-2">Mood</th>
                            <th className="pb-2">Status</th>
                            <th className="pb-2">Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unreleasedSongs.map((song, idx) => (
                            <tr key={song.id} className="border-b last:border-0">
                              <td className="py-2 text-sm text-white/50">{idx + 1}</td>
                              <td className="py-2 font-medium">{song.title}</td>
                              <td className="py-2">
                                <Badge className={getQualityColor(song.quality)}>
                                  {song.quality}
                                </Badge>
                              </td>
                              <td className="py-2 text-sm capitalize">{song.genre}</td>
                              <td className="py-2 text-sm capitalize">{song.mood}</td>
                              <td className="py-2">
                                <Badge variant="outline" className="text-xs">
                                  {song.isRecorded ? 'Ready' : 'Recording'}
                                </Badge>
                              </td>
                              <td className="py-2 text-sm">Month {song.createdMonth}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {songs.length === 0 && (
                  <div className="text-center py-8">
                    <Music className="w-12 h-12 text-white/30 mx-auto mb-4" />
                    <p className="text-white/50">No songs recorded yet</p>
                  </div>
                )}
                
                {/* Overall Summary for all releases */}
                {songs.filter(s => s.isReleased).length > 0 && (
                  <div className="mt-6 pt-4 border-t-2 border-[#4e324c]/50">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Career Totals</h3>
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-xl font-bold text-blue-600">
                            {(songs.filter(s => s.isReleased).reduce((sum, s) => sum + (s.totalStreams || 0), 0) / 1000000).toFixed(1)}M
                          </div>
                          <div className="text-xs text-white/70">Total Streams</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-600">
                            ${(songs.filter(s => s.isReleased).reduce((sum, s) => sum + (s.totalRevenue || 0), 0) / 1000).toFixed(0)}k
                          </div>
                          <div className="text-xs text-white/70">Total Revenue</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-[#791014]">
                            {artistReleases.filter(r => r.status === 'released' || r.status === 'catalog').length}
                          </div>
                          <div className="text-xs text-white/70">Releases</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-orange-600">
                            {songs.filter(s => s.isReleased).length}
                          </div>
                          <div className="text-xs text-white/70">Released Songs</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Releases Tab */}
          <TabsContent value="releases" className="space-y-6">
            {/* Upcoming Releases */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Upcoming Releases</span>
                <Badge variant="outline" className="ml-2">
                  {artistReleases.filter(r => r.status === 'planned').length}
                </Badge>
              </h3>
              
              {artistReleases.filter(r => r.status === 'planned').length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Clock className="w-12 h-12 text-white/30 mx-auto mb-4" />
                    <p className="text-white/70 mb-4">No planned releases</p>
                    <Button onClick={() => setLocation('/plan-release')}>
                      Plan New Release
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {artistReleases.filter(r => r.status === 'planned').map(release => (
                    <ReleaseWorkflowCard
                      key={release.id}
                      release={release}
                      currentMonth={gameState?.currentMonth || 1}
                      artistName={artist.name}
                      songs={songs}
                      onReleasePage={true}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Released */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <PlayCircle className="w-5 h-5" />
                <span>Released</span>
                <Badge variant="outline" className="ml-2">
                  {artistReleases.filter(r => r.status === 'released' || r.status === 'catalog').length}
                </Badge>
              </h3>
              
              {artistReleases.filter(r => r.status === 'released' || r.status === 'catalog').length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <PlayCircle className="w-12 h-12 text-white/30 mx-auto mb-4" />
                    <p className="text-white/70">No releases yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {artistReleases.filter(r => r.status === 'released' || r.status === 'catalog').map(release => (
                    <ReleaseWorkflowCard
                      key={release.id}
                      release={release}
                      currentMonth={gameState?.currentMonth || 1}
                      artistName={artist.name}
                      songs={songs}
                      onReleasePage={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="space-y-6">
              {/* Total Streams Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Radio className="w-5 h-5" />
                    <span>Total Streams by Song</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {songs.filter(s => s.isReleased).length === 0 ? (
                    <div className="text-center py-8">
                      <Radio className="w-8 h-8 text-white/30 mx-auto mb-3" />
                      <p className="text-white/50">No released songs to analyze</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-xs text-white/50 border-b">
                            <th className="pb-2">Rank</th>
                            <th className="pb-2">Song Title</th>
                            <th className="pb-2">Release</th>
                            <th className="pb-2 text-right">Total Streams</th>
                            <th className="pb-2 text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {songs
                            .filter(s => s.isReleased)
                            .sort((a, b) => (b.totalStreams || 0) - (a.totalStreams || 0))
                            .slice(0, 10)
                            .map((song, idx) => {
                              const release = artistReleases.find(r => r.id === song.releaseId);
                              return (
                                <tr key={song.id} className="border-b last:border-0">
                                  <td className="py-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                      idx === 0 ? 'bg-yellow-500/20 text-yellow-700' :
                                      idx === 1 ? 'bg-gray-500/20 text-white/90' :
                                      idx === 2 ? 'bg-orange-500/20 text-orange-700' :
                                      'bg-[#65557c]/10 text-white/70'
                                    }`}>
                                      {idx + 1}
                                    </div>
                                  </td>
                                  <td className="py-3 font-medium">{song.title}</td>
                                  <td className="py-3 text-sm text-white/70">
                                    {release?.title || 'Unknown'}
                                  </td>
                                  <td className="py-3 text-right font-mono font-semibold">
                                    {(song.totalStreams || 0).toLocaleString()}
                                  </td>
                                  <td className="py-3 text-right font-mono text-green-600">
                                    ${(song.totalRevenue || 0).toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Last Month Streams Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Last Month Streams</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {songs.filter(s => s.isReleased && s.monthlyStreams).length === 0 ? (
                    <div className="text-center py-8">
                      <TrendingUp className="w-8 h-8 text-white/30 mx-auto mb-3" />
                      <p className="text-white/50">No streaming data for last month</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-xs text-white/50 border-b">
                            <th className="pb-2">Rank</th>
                            <th className="pb-2">Song Title</th>
                            <th className="pb-2">Quality</th>
                            <th className="pb-2 text-right">Monthly Streams</th>
                            <th className="pb-2 text-right">Growth</th>
                          </tr>
                        </thead>
                        <tbody>
                          {songs
                            .filter(s => s.isReleased)
                            .sort((a, b) => (b.monthlyStreams || 0) - (a.monthlyStreams || 0))
                            .slice(0, 10)
                            .map((song, idx) => {
                              const growth = song.totalStreams && song.monthlyStreams 
                                ? ((song.monthlyStreams / Math.max(1, song.totalStreams - song.monthlyStreams)) * 100).toFixed(1)
                                : '0.0';
                              return (
                                <tr key={song.id} className="border-b last:border-0">
                                  <td className="py-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                      idx === 0 ? 'bg-yellow-500/20 text-yellow-700' :
                                      idx === 1 ? 'bg-gray-500/20 text-white/90' :
                                      idx === 2 ? 'bg-orange-500/20 text-orange-700' :
                                      'bg-[#65557c]/10 text-white/70'
                                    }`}>
                                      {idx + 1}
                                    </div>
                                  </td>
                                  <td className="py-3 font-medium">{song.title}</td>
                                  <td className="py-3">
                                    <Badge className={getQualityColor(song.quality)}>
                                      {song.quality}
                                    </Badge>
                                  </td>
                                  <td className="py-3 text-right font-mono font-semibold">
                                    {(song.monthlyStreams || 0).toLocaleString()}
                                  </td>
                                  <td className="py-3 text-right">
                                    <span className={`font-semibold ${
                                      parseFloat(growth) > 0 ? 'text-green-600' : 'text-white/40'
                                    }`}>
                                      {parseFloat(growth) > 0 ? '+' : ''}{growth}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Management Tab */}
          <TabsContent value="management" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Artist Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Heart className="w-5 h-5" />
                    <span>Artist Relationship</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`p-4 rounded-lg ${moodStatus.bgColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Overall Status</span>
                      <Badge className={`${moodStatus.color} border-current`} variant="outline">
                        {moodStatus.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-white/70">
                      {(artist.mood || 50) >= 70 
                        ? 'Artist is happy and motivated. Continue current management approach.'
                        : (artist.mood || 50) >= 40 
                        ? 'Artist relationship is stable but could be improved with attention.'
                        : 'Artist is unhappy. Immediate attention needed to improve relationship.'
                      }
                    </p>
                  </div>
                  
                  {/* Archetype Information */}
                  <div className="p-4 border border-[#4e324c]/50 rounded-lg">
                    <h4 className="font-medium mb-2">Archetype: {artist.archetype}</h4>
                    <p className="text-sm text-white/70 mb-3">{archetypeInfo.description}</p>
                    <div className="text-xs text-white/50">
                      <strong>Management Tip:</strong> {
                        artist.archetype === 'Visionary' 
                          ? 'Provide creative freedom and avoid purely commercial decisions.'
                          : artist.archetype === 'Workhorse'
                          ? 'Maintain consistent project flow and clear communication.'
                          : 'Focus on commercial viability and current market trends.'
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Quick Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setLocation('/plan-release')}
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Plan New Release
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    disabled
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Schedule Meeting
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    disabled
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    View Contract
                  </Button>
                  
                  <div className="pt-3 border-t border-[#4e324c]/50">
                    <div className="text-sm text-white/70 mb-2">Monthly Cost</div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">${(artist.monthlyCost || artist.monthlyFee || 0).toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs">
                        Per Month
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
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
        <div className="p-3 bg-[#791014]/10 rounded-lg">
          <div className="text-lg font-bold text-[#791014]">{readySongs}</div>
          <div className="text-xs text-white/70">Ready Songs</div>
        </div>
        <div className="p-3 bg-orange-500/10 rounded-lg">
          <div className="text-lg font-bold text-orange-700">{popularity}</div>
          <div className="text-xs text-white/70">Popularity</div>
        </div>
      </div>
      
      {/* Financial metrics - separate section */}
      <div className="pt-3 border-t border-[#4e324c]/50">
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
          <div className="p-3 bg-[#65557c]/10 rounded-lg">
            <div className="text-lg font-bold text-[#65557c]">
              ${(totalProductionCost / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-white/70">Recording Costs</div>
          </div>
          <div className="p-3 bg-[#A75A5B]/10 rounded-lg">
            <div className="text-lg font-bold text-[#A75A5B]">
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