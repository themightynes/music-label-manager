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

function AnalyticsTabComponent({ songs, artistReleases }: AnalyticsTabProps) {
  return (
    <TabsContent value="analytics" className="space-y-6 relative z-20">
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
                                'bg-brand-purple-light/10 text-white/70'
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

        {/* Last Week Streams Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Last Week Streams</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {songs.filter(s => s.isReleased && s.weeklyStreams).length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-8 h-8 text-white/30 mx-auto mb-3" />
                <p className="text-white/50">No streaming data for last week</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-white/50 border-b">
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
                          <tr key={song.id} className="border-b last:border-0">
                            <td className="py-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                idx === 0 ? 'bg-yellow-500/20 text-yellow-700' :
                                idx === 1 ? 'bg-gray-500/20 text-white/90' :
                                idx === 2 ? 'bg-orange-500/20 text-orange-700' :
                                'bg-brand-purple-light/10 text-white/70'
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
                              {(song.weeklyStreams || 0).toLocaleString()}
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
  );
}

export const AnalyticsTab = React.memo(AnalyticsTabComponent);
