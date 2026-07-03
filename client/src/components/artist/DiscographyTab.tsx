import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import { Music } from 'lucide-react';
import type { Song, Release } from './types';
import { getQualityColor, getReleaseTypeBadge, getStatusBadge } from './artistPageUtils';

// Group songs by release. Pure — depends only on the songs list.
function getSongsByRelease(songs: Song[]) {
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
}

interface DiscographyTabProps {
  songs: Song[];
  artistReleases: Release[];
}

function DiscographyTabComponent({ songs, artistReleases }: DiscographyTabProps) {
  const { releasedSongs: songsByRelease, unreleasedSongs } = getSongsByRelease(songs);

  return (
    <TabsContent value="discography" className="space-y-6 relative z-20">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
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
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.07]">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-semibold text-lg text-text-primary">{release.title}</h3>
                    {getReleaseTypeBadge(release.type)}
                    {getStatusBadge(release.status)}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-text-body">
                      Week {release.releaseWeek} • {releaseSongs.length} songs
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="flex items-center space-x-1">
                        <span className="text-text-muted">Total:</span>
                        <span className="font-mono font-semibold text-neon-cyan">
                          {(releaseTotalStreams / 1000).toFixed(0)}k streams
                        </span>
                      </div>
                      <div className="text-text-muted">•</div>
                      <div className="flex items-center space-x-1">
                        <span className="font-mono font-semibold text-positive">
                          ${(releaseTotalRevenue / 1000).toFixed(1)}k
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs font-mono uppercase tracking-[0.16em] text-text-muted border-b border-white/[0.07]">
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
                        <tr key={song.id} className="border-b border-white/[0.05] last:border-0">
                          <td className="py-2 text-sm text-text-muted">{idx + 1}</td>
                          <td className="py-2 font-medium text-text-primary">{song.title}</td>
                          <td className="py-2">
                            <Badge className={getQualityColor(song.quality)}>
                              {song.quality}
                            </Badge>
                          </td>
                          <td className="py-2 text-sm text-text-body capitalize">{song.genre}</td>
                          <td className="py-2 text-sm text-text-body capitalize">{song.mood}</td>
                          <td className="py-2 text-sm text-right font-mono text-text-body">
                            {(song.totalStreams || 0).toLocaleString()}
                          </td>
                          <td className="py-2 text-sm text-right font-mono text-text-body">
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
            <div className="mt-6 pt-6 border-t border-white/[0.07]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg text-text-primary">Unreleased Songs</h3>
                <Badge variant="outline" className="bg-warning/[0.1] border-warning/30 text-warning">
                  {unreleasedSongs.length} songs
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-mono uppercase tracking-[0.16em] text-text-muted border-b border-white/[0.07]">
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
                      <tr key={song.id} className="border-b border-white/[0.05] last:border-0">
                        <td className="py-2 text-sm text-text-muted">{idx + 1}</td>
                        <td className="py-2 font-medium text-text-primary">{song.title}</td>
                        <td className="py-2">
                          <Badge className={getQualityColor(song.quality)}>
                            {song.quality}
                          </Badge>
                        </td>
                        <td className="py-2 text-sm text-text-body capitalize">{song.genre}</td>
                        <td className="py-2 text-sm text-text-body capitalize">{song.mood}</td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-xs">
                            {song.isRecorded ? 'Ready' : 'Recording'}
                          </Badge>
                        </td>
                        <td className="py-2 text-sm text-text-body">Week {song.createdWeek}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {songs.length === 0 && (
            <div className="text-center py-8">
              <div className="w-[54px] h-[54px] rounded-chip bg-neon-purple/10 border border-neon-purple/[0.28] flex items-center justify-center mx-auto mb-4 shadow-glow-purple">
                <Music className="w-5 h-5 text-neon-lilac" />
              </div>
              <p className="text-text-muted text-sm">No songs recorded yet</p>
            </div>
          )}

          {/* Overall Summary for all releases */}
          {songs.filter(s => s.isReleased).length > 0 && (
            <div className="mt-6 pt-4 border-t-2 border-neon-purple/40">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-text-primary">Career Totals</h3>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="font-mono text-xl font-bold text-neon-cyan">
                      {(songs.filter(s => s.isReleased).reduce((sum, s) => sum + (s.totalStreams || 0), 0) / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-xs text-text-muted">Total Streams</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-xl font-bold text-positive">
                      ${(songs.filter(s => s.isReleased).reduce((sum, s) => sum + (s.totalRevenue || 0), 0) / 1000).toFixed(0)}k
                    </div>
                    <div className="text-xs text-text-muted">Total Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-xl font-bold text-neon-lilac">
                      {artistReleases.filter(r => r.status === 'released' || r.status === 'catalog').length}
                    </div>
                    <div className="text-xs text-text-muted">Releases</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-xl font-bold text-neon-amber">
                      {songs.filter(s => s.isReleased).length}
                    </div>
                    <div className="text-xs text-text-muted">Released Songs</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

export const DiscographyTab = React.memo(DiscographyTabComponent);
