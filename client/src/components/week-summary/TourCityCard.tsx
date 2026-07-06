/**
 * Tour city result card (tour-tier1 slice 2).
 *
 * One card per tour_performance change entry, rendered in WeekSummary's
 * NOTABLE reveal stage — the weekly "how did the show go" moment: venue +
 * attendance bar, the money story (gross / costs / net), and the artist's
 * reaction. When the tour's project_complete entry lands the same week
 * (final city — slice 1 completes tours on that week), a wrap-up footer
 * is appended.
 *
 * Extracted into its own module (house preference) so it unit-tests with a
 * plain fixture entry instead of mounting the full WeekSummary.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GameChange } from '@shared/types/gameTypes';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

/**
 * "+8 mood · +1 popularity" — signed, zero terms omitted, null when both are
 * zero/absent (the card then skips the reaction line entirely).
 */
export function formatTourReaction(
  moodChange: number | undefined,
  popularityChange: number | undefined
): string | null {
  const parts: string[] = [];
  if (moodChange) parts.push(`${moodChange > 0 ? '+' : ''}${moodChange} mood`);
  if (popularityChange) parts.push(`${popularityChange > 0 ? '+' : ''}${popularityChange} popularity`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

interface TourCityCardProps {
  /** The tour_performance revenue change (structured slice-1 fields). */
  entry: GameChange;
  /** Same-week project_complete change for this tour, if it wrapped. */
  completion?: GameChange;
}

export function TourCityCard({ entry, completion }: TourCityCardProps) {
  // Description format is "{title} - City {n} performance: ..." (slice 1);
  // the prefix is the tour title. Falls back to the artist name if the
  // description ever changes shape.
  const tourTitle = entry.description?.split(' - City')[0] || entry.artistName || 'Tour';
  const attendanceRate = Math.max(0, Math.min(100, entry.attendanceRate ?? 0));
  const ticketsSold = entry.ticketsSold ?? 0;
  const capacity = entry.capacity ?? 0;
  const gross = entry.amount ?? 0;
  const costs = entry.costs ?? 0;
  const net = entry.netProfit ?? gross - costs;
  const completionNet = completion?.netProfit ?? 0;
  const reaction = formatTourReaction(entry.moodChange, entry.popularityChange);

  return (
    <Card className="border-neon-cyan/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center space-x-2 min-w-0">
            <span className="text-base" aria-hidden="true">🎤</span>
            <span className="text-neon-cyan truncate">{tourTitle}</span>
          </span>
          <span className="text-xs font-mono text-text-muted flex-shrink-0">
            City {entry.cityNumber} of {entry.citiesTotal}
          </span>
        </CardTitle>
        <p className="text-xs text-text-muted">
          {entry.artistName} — {entry.venue}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Attendance bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-label">
              Attendance
            </span>
            <span className="font-mono text-xs text-text-primary/90">
              {ticketsSold.toLocaleString()} / {capacity.toLocaleString()} ({attendanceRate}%)
            </span>
          </div>
          <div className="relative bg-white/[0.08] rounded-pill h-2 overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-neon-cyan rounded-pill"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>

        {/* Money row: gross / costs / net */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-surface-inner/40 rounded-[12px] border border-white/10">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-label">Gross</div>
            <div className="text-sm font-semibold font-mono text-money">{formatCurrency(gross)}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-label">Costs</div>
            <div className="text-sm font-semibold font-mono text-money">{formatCurrency(costs)}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-label">Net</div>
            <div className={`text-sm font-semibold font-mono ${net >= 0 ? 'text-positive' : 'text-negative'}`}>
              {net >= 0 ? '+' : ''}{formatCurrency(net)}
            </div>
          </div>
        </div>

        {/* Artist reaction */}
        {reaction && (
          <p className="text-xs text-neon-lilac">
            {entry.artistName}: {reaction}
          </p>
        )}

        {/* Tour wrap-up footer (final city's week) */}
        {completion && (
          <div className="flex items-center justify-between p-3 rounded-[12px] border border-neon-cyan/30 bg-neon-cyan/[0.08]">
            <span className="text-xs font-semibold text-neon-cyan">
              Tour complete — {entry.citiesTotal} cities
            </span>
            <span className={`text-sm font-semibold font-mono ${completionNet >= 0 ? 'text-positive' : 'text-negative'}`}>
              net {completionNet >= 0 ? '+' : ''}{formatCurrency(completionNet)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
