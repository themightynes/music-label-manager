import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import { TrendingUp, Radio } from 'lucide-react';
import type { Song, Release } from './types';
import { getQualityColor } from './artistPageUtils';

interface AnalyticsTabProps {
  songs: Song[];
  artistReleases: Release[];
}

// Rank badge fills — top 3 get hue-tinted treatment, rest neutral glass.
function rankBadgeClass(idx: number) {
  if (idx === 0) return 'bg-warning/20 text-warning';
  if (idx === 1) return 'bg-white/10 text-text-body';
  if (idx === 2) return 'bg-neon-amber/20 text-neon-amber';
  return 'bg-neon-lilac/10 text-text-muted';
}

function AnalyticsTabComponent({ songs, artistReleases }: AnalyticsTabProps) {
  return (
    <TabsContent value="analytics" className="space-y-6 relative z-20">
      <div className="space-y-6">
        {/* Total Streams Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <Radio className="w-5 h-5 text-neon-lilac" />
              <span>Total Streams by Song</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {songs.filter(s => s.isReleased).length === 0 ? (
              <div className="text-center py-8">
                <div className="w-[54px] h-[54px] rounded-chip bg-neon-purple/10 border border-neon-purple/[0.28] flex items-center justify-center mx-auto mb-4 shadow-glow-purple">
                  <Radio className="w-5 h-5 text-neon-lilac" />
                </div>
                <p className="text-text-muted text-sm">No released songs to analyze</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-mono uppercase tracking-[0.16em] text-text-muted border-b border-white/[0.07]">
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
                          <tr key={song.id} className="border-b border-white/[0.05] last:border-0">
                            <td className="py-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold ${rankBadgeClass(idx)}`}>
                                {idx + 1}
                              </div>
                            </td>
                            <td className="py-3 font-medium text-text-primary">{song.title}</td>
                            <td className="py-3 text-sm text-text-body">
                              {release?.title || 'Unknown'}
                            </td>
                            <td className="py-3 text-right font-mono font-semibold text-text-primary">
                              {(song.totalStreams || 0).toLocaleString()}
                            </td>
                            <td className="py-3 text-right font-mono text-positive">
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

        {/* Last Week Streams Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <TrendingUp className="w-5 h-5 text-neon-lilac" />
              <span>Last Week Streams</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {songs.filter(s => s.isReleased && s.weeklyStreams).length === 0 ? (
              <div className="text-center py-8">
                <div className="w-[54px] h-[54px] rounded-chip bg-neon-purple/10 border border-neon-purple/[0.28] flex items-center justify-center mx-auto mb-4 shadow-glow-purple">
                  <TrendingUp className="w-5 h-5 text-neon-lilac" />
                </div>
                <p className="text-text-muted text-sm">No streaming data for last week</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-mono uppercase tracking-[0.16em] text-text-muted border-b border-white/[0.07]">
                      <th className="pb-2">Rank</th>
                      <th className="pb-2">Song Title</th>
                      <th className="pb-2">Quality</th>
                      <th className="pb-2 text-right">Weekly Streams</th>
                      <th className="pb-2 text-right">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {songs
                      .filter(s => s.isReleased)
                      .sort((a, b) => (b.weeklyStreams || 0) - (a.weeklyStreams || 0))
                      .slice(0, 10)
                      .map((song, idx) => {
                        const growth = song.totalStreams && song.weeklyStreams
                          ? ((song.weeklyStreams / Math.max(1, song.totalStreams - song.weeklyStreams)) * 100).toFixed(1)
                          : '0.0';
                        return (
                          <tr key={song.id} className="border-b border-white/[0.05] last:border-0">
                            <td className="py-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold ${rankBadgeClass(idx)}`}>
                                {idx + 1}
                              </div>
                            </td>
                            <td className="py-3 font-medium text-text-primary">{song.title}</td>
                            <td className="py-3">
                              <Badge className={getQualityColor(song.quality)}>
                                {song.quality}
                              </Badge>
                            </td>
                            <td className="py-3 text-right font-mono font-semibold text-text-primary">
                              {(song.weeklyStreams || 0).toLocaleString()}
                            </td>
                            <td className="py-3 text-right">
                              <span className={`font-mono font-semibold ${
                                parseFloat(growth) > 0 ? 'text-positive' : 'text-text-muted'
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
  );
}

export const AnalyticsTab = React.memo(AnalyticsTabComponent);
