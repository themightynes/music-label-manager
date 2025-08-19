import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Music, Calendar, TrendingUp } from 'lucide-react';

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

  useEffect(() => {
    if (artistId && gameId) {
      loadArtistSongs();
    }
  }, [artistId, gameId]);

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
    if (quality >= 80) return 'bg-green-100 text-green-800';
    if (quality >= 60) return 'bg-yellow-100 text-yellow-800';
    if (quality >= 40) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusBadge = (song: Song) => {
    if (song.isReleased) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Released</Badge>;
    }
    if (song.isRecorded) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Ready</Badge>;
    }
    return <Badge variant="outline">Recording</Badge>;
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-semibold text-slate-700">Song Catalog</h5>
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
        <h5 className="text-xs font-semibold text-slate-700 mb-2">Song Catalog</h5>
        <div className="text-xs text-red-600 p-3 bg-red-50 rounded border border-red-200">
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
                className="ml-2 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded border border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <h5 className="text-xs font-semibold text-slate-700 mb-2">Song Catalog</h5>
        <div className="text-xs text-slate-500 p-3 bg-slate-50 rounded border border-slate-200">
          <div className="flex items-center space-x-2 mb-2">
            <Music className="w-4 h-4" />
            <span className="font-medium">No songs yet</span>
          </div>
          <div className="text-slate-400 leading-relaxed">
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

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-xs font-semibold text-slate-700">Song Catalog</h5>
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <span>{recordedSongs.length} recorded</span>
          <span>•</span>
          <span>{releasedSongs.length} released</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="p-2 bg-slate-50 rounded text-center">
          <div className="font-medium text-slate-900">{songs.length}</div>
          <div className="text-slate-500">Total Songs</div>
        </div>
        <div className="p-2 bg-green-50 rounded text-center">
          <div className="font-medium text-green-700">{readyToReleaseSongs.length}</div>
          <div className="text-slate-500">Ready to Release</div>
        </div>
        <div className="p-2 bg-blue-50 rounded text-center">
          <div className="font-medium text-blue-700">{releasedSongs.length}</div>
          <div className="text-slate-500">In Market</div>
        </div>
      </div>

      {/* Song List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {songs.map((song) => (
          <Card key={song.id} className="border border-slate-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Music className="w-3 h-3 text-slate-400" />
                  <span className="text-xs font-medium text-slate-900 truncate">
                    {song.title}
                  </span>
                </div>
                {getStatusBadge(song)}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3 text-slate-500">
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}