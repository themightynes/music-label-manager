import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Music, Calendar, TrendingUp, DollarSign, PlayCircle } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';

interface Song {
  id: string;
  title: string;
  quality: number;
  genre?: string;
  mood?: string;
  createdMonth?: number;
  isRecorded: boolean;
  isReleased: boolean;
  releaseId?: string | null;
  metadata?: any;
  
  // Individual song revenue and streaming metrics
  initialStreams?: number;
  totalStreams?: number;
  totalRevenue?: number;
  monthlyStreams?: number;
  lastMonthRevenue?: number;
  releaseMonth?: number;
}

interface SongCatalogProps {
  artistId: string;
  gameId: string;
  className?: string;
}

export function SongCatalog({ artistId, gameId, className = '' }: SongCatalogProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Subscribe to gameState to detect month changes
  const currentMonth = useGameStore((state) => state.gameState?.currentMonth);
  const storeSongs = useGameStore((state) => state.songs);

  useEffect(() => {
    if (artistId && gameId) {
      loadArtistSongs();
    }
  }, [artistId, gameId, currentMonth]); // Refresh when month changes

  const loadArtistSongs = async (isRetry = false) => {
    try {
      setLoading(true);
      if (!isRetry) {
        setError(null);
        setRetryCount(0);
      }
      
      // Validate required parameters
      if (!gameId || !artistId) {
        throw new Error('Missing required game ID or artist ID');
      }
      
      console.log(`[SongCatalog] Loading songs for artist ${artistId} in game ${gameId}`);
      
      // Phase 1: Use real API endpoint for artist songs
      const response = await fetch(`/api/game/${gameId}/artists/${artistId}/songs`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If we can't parse JSON, use the default error message
        }
        throw new Error(errorMessage);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Check server status.');
      }
      
      const songData = await response.json();
      console.log(`[SongCatalog] Successfully loaded ${songData?.length || 0} songs`);
      
      // Ensure we have an array
      const songArray = Array.isArray(songData) ? songData : [];
      setSongs(songArray);
      setError(null);
      
    } catch (err) {
      console.error('Error loading artist songs:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load songs';
      setError(errorMessage);
      
      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (retryCount < 3) { // Limit retries to 3 attempts
      console.log(`[SongCatalog] Retrying... (attempt ${retryCount + 1})`);
      loadArtistSongs(true);
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 80) return 'bg-green-900/30 text-green-300 border border-green-600/40';
    if (quality >= 60) return 'bg-amber-900/30 text-amber-300 border border-amber-600/40';
    if (quality >= 40) return 'bg-orange-900/30 text-orange-300 border border-orange-600/40';
    return 'bg-red-900/30 text-red-300 border border-red-600/40';
  };

  const getStatusBadge = (song: Song) => {
    if (song.isReleased) {
      return <Badge variant="default" className="bg-[#A75A5B]/20 text-[#A75A5B]">Released</Badge>;
    }
    if (song.isRecorded) {
      return <Badge variant="secondary" className="bg-green-900/30 text-green-300 border border-green-600/40">Ready</Badge>;
    }
    return <Badge variant="outline">Recording</Badge>;
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-semibold text-white/90">Song Catalog</h5>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <h5 className="text-xs font-semibold text-white/90 mb-2">Song Catalog</h5>
        <div className="text-xs text-red-300 p-3 bg-red-900/30 rounded border border-red-600/40">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-medium mb-1">Unable to load songs</div>
              <div className="text-red-500">{error}</div>
              {retryCount > 0 && (
                <div className="text-red-400 mt-1">
                  Retry attempts: {retryCount}/3
                </div>
              )}
            </div>
            {retryCount < 3 && (
              <button
                onClick={handleRetry}
                disabled={loading}
                className="ml-2 px-2 py-1 text-xs bg-red-900/30 hover:bg-red-800/40 text-red-300 rounded border border-red-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Retrying...' : 'Retry'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className={className}>
        <h5 className="text-xs font-semibold text-white/90 mb-2">Song Catalog</h5>
        <div className="text-xs text-white/50 p-3 bg-[#3c252d]/20 rounded border border-[#4e324c]">
          <div className="flex items-center space-x-2 mb-2">
            <Music className="w-4 h-4" />
            <span className="font-medium">No songs yet</span>
          </div>
          <div className="text-white/50 leading-relaxed">
            Songs are created during recording projects. Try:
            <br />• Start a Single or EP recording project
            <br />• Wait for the project to reach "Production" stage
            <br />• Songs will appear here as they're recorded
          </div>
        </div>
      </div>
    );
  }

  const recordedSongs = songs.filter(s => s.isRecorded);
  const releasedSongs = songs.filter(s => s.isReleased);
  const readyToReleaseSongs = songs.filter(s => s.isRecorded && !s.isReleased);
  
  // Calculate aggregate metrics
  const totalRevenue = releasedSongs.reduce((sum, song) => sum + (song.totalRevenue || 0), 0);
  const totalStreams = releasedSongs.reduce((sum, song) => sum + (song.totalStreams || 0), 0);
  const lastMonthRevenue = releasedSongs.reduce((sum, song) => sum + (song.lastMonthRevenue || 0), 0);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-xs font-semibold text-white/90">Song Catalog</h5>
        <div className="flex items-center space-x-2 text-xs text-white/50">
          <span>{recordedSongs.length} recorded</span>
          <span>•</span>
          <span>{releasedSongs.length} released</span>
          {totalRevenue > 0 && (
            <>
              <span>•</span>
              <span className="text-green-600">${totalRevenue.toLocaleString()}</span>
            </>
          )}
        </div>
      </div>

      {/* Enhanced Summary Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="p-2 bg-green-900/30 border border-green-600/40 rounded text-center">
          <div className="font-medium text-white">{songs.length}</div>
          <div className="text-white/50">Total Songs</div>
        </div>
        <div className="p-2 bg-green-900/30 border border-green-600/40 rounded text-center">
          <div className="font-medium text-green-300">{releasedSongs.length}</div>
          <div className="text-white/50">Released</div>
        </div>
      </div>
      
      {/* Revenue & Streams Stats - Only show if there are released songs with metrics */}
      {releasedSongs.length > 0 && (totalRevenue > 0 || totalStreams > 0) && (
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="p-2 bg-green-900/30 border border-green-600/40 rounded text-center">
            <div className="font-medium text-green-300">${totalRevenue.toLocaleString()}</div>
            <div className="text-white/50">Total Revenue</div>
          </div>
          <div className="p-2 bg-green-900/30 border border-green-600/40 rounded text-center">
            <div className="font-medium text-green-300">{totalStreams.toLocaleString()}</div>
            <div className="text-white/50">Total Streams</div>
          </div>
        </div>
      )}
      
      {/* Last Month Performance - Only show if there was recent activity */}
      {lastMonthRevenue > 0 && (
        <div className="p-2 bg-gradient-to-r from-green-900/20 to-[#A75A5B]/20 border border-green-600/30 rounded mb-3">
          <div className="text-xs text-center">
            <div className="font-medium text-white/90">Last Month: +${lastMonthRevenue.toLocaleString()}</div>
            <div className="text-white/50">Recent Performance</div>
          </div>
        </div>
      )}

      {/* Song List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {songs.map((song) => (
          <Card key={song.id} className="border border-[#4e324c]">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Music className="w-3 h-3 text-white/50" />
                  <span className="text-xs font-medium text-white truncate">
                    {song.title}
                  </span>
                </div>
                {getStatusBadge(song)}
              </div>

              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center space-x-3 text-white/50">
                  {song.genre && (
                    <span className="capitalize">{song.genre}</span>
                  )}
                  {song.mood && (
                    <span className="capitalize">{song.mood}</span>
                  )}
                  {song.createdMonth && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>Month {song.createdMonth}</span>
                    </div>
                  )}
                </div>
                
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getQualityColor(song.quality)}`}
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {song.quality}
                </Badge>
              </div>

              {/* Individual Song Metrics - Only show for released songs */}
              {song.isReleased && (song.totalStreams || song.totalRevenue) && (
                <div className="pt-2 border-t border-[#4e324c]/50 space-y-1">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {song.totalStreams && (
                      <div className="flex items-center space-x-1">
                        <PlayCircle className="w-3 h-3 text-[#A75A5B]" />
                        <span className="text-white/50">Streams:</span>
                        <span className="font-mono text-[#A75A5B]">
                          {song.totalStreams.toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {song.totalRevenue && (
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-3 h-3 text-green-500" />
                        <span className="text-white/50">Revenue:</span>
                        <span className="font-mono text-green-600">
                          ${song.totalRevenue.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {song.lastMonthRevenue && song.lastMonthRevenue > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">Last Month:</span>
                      <div className="flex items-center space-x-1">
                        <span className="font-mono text-green-600">
                          +${song.lastMonthRevenue.toLocaleString()}
                        </span>
                        {song.monthlyStreams && (
                          <span className="text-white/50">
                            ({song.monthlyStreams.toLocaleString()} streams)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {song.releaseMonth && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">Released:</span>
                      <span className="font-mono text-white/70">Month {song.releaseMonth}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}