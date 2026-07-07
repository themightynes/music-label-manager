/**
 * Release card Buzz section — awareness slice 2 (C42).
 *
 * Compact readout on ReleaseWorkflowCard for released items: hottest song
 * (max awareness — fork D) with a 0-100 bar, a 🔥 breakthrough count badge,
 * and the QUALITATIVE phase line (fork E: no multiplier numbers anywhere).
 * Renders nothing at all when no released song has awareness > 0 — quiet
 * releases stay quiet, no empty-state box.
 *
 * Own module (house preference, mirrors TourCityCard) so it unit-tests from
 * plain song fixtures without mounting the full card.
 */
import React from 'react';
import { Target } from 'lucide-react';
import { summarizeReleaseBuzz } from '@/lib/releaseBuzz';

interface ReleaseBuzzSectionProps {
  /** The release's songs (already joined by releaseId upstream). */
  songs: any[];
  currentWeek: number;
}

export function ReleaseBuzzSection({ songs, currentWeek }: ReleaseBuzzSectionProps) {
  const buzz = summarizeReleaseBuzz(songs, currentWeek);
  if (!buzz.hottestSong) return null;

  const awareness = Math.max(0, Math.min(100, Math.round(buzz.hottestSong.awareness)));

  return (
    <div className="space-y-2 pt-2 border-t border-white/[0.08]" data-testid="release-buzz-section">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center space-x-2">
          <Target className="w-4 h-4 text-neon-cyan" />
          <span>Buzz</span>
        </h4>
        {buzz.breakthroughCount > 0 && (
          <span className="inline-flex items-center rounded-pill font-mono text-[11px] px-2.5 py-1 border text-neon-cyan bg-neon-cyan/10 border-neon-cyan/40">
            🔥 {buzz.breakthroughCount} breakthrough{buzz.breakthroughCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground truncate">{buzz.hottestSong.title}</span>
        <span className="font-mono text-neon-cyan flex-shrink-0 ml-2">{awareness}/100</span>
      </div>

      {/* 0-100 bar — same track/fill idiom as the tour attendance bar */}
      <div className="relative bg-white/[0.08] rounded-pill h-2 overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-neon-cyan rounded-pill"
          style={{ width: `${awareness}%` }}
        />
      </div>

      {buzz.phaseLabel && (
        <div className="text-xs text-[rgba(233,230,244,0.6)]">{buzz.phaseLabel}</div>
      )}
    </div>
  );
}
