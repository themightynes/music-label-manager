/**
 * Live tour status strip (tour-tier1 slice 3).
 *
 * Compact one-line-per-tour status surfaced at the top of the Tours section
 * so a running tour is visible without scanning the ActiveTours table:
 *
 *   🎤 Nova on tour — plays Theater Venues this week (city 2 of 4)
 *
 * `deriveTourStatuses` is the pure, unit-tested derivation: it takes the raw
 * projects array + an artistId→name resolver and returns typed status
 * entries. The strip itself is purely presentational (props in, DOM out).
 *
 * Week semantics (slice 1 engine change: tours complete on their final
 * city's week — no phantom week): at rest, played = tourStats.cities.length
 * and the NEXT advance plays city played+1. A production-stage tour with all
 * planned cities played is complete (stage flips to 'recorded' next week)
 * and is excluded here, matching ActiveTours' getActiveTours().
 */
import React from 'react';
import { getCityCounts, getCompletedCities, getTourMetadata } from '@/utils/tourHelpers';

/**
 * venueAccess tier → display venue name.
 * Mirrors shared/engine/processors/TourProcessor.ts getVenueNameFromAccess —
 * duplicated locally because engine processors must not be imported into the
 * client bundle. Keep the two 4-entry maps in sync.
 */
const VENUE_NAMES: Record<string, string> = {
  none: 'Small Venues',
  clubs: 'Club Venues',
  theaters: 'Theater Venues',
  arenas: 'Arena Venues',
};

export type TourStatusEntry =
  | {
      /** Booked, first advance pending (stage 'planning'). */
      kind: 'booked';
      projectId: string;
      artistName: string;
    }
  | {
      /** Mid-tour (stage 'production', played < planned). */
      kind: 'mid-tour';
      projectId: string;
      artistName: string;
      /** Venue tier display name for the city playing this week. */
      venueName: string;
      /** 1-based city that plays on the NEXT advance (played + 1). */
      cityNumber: number;
      citiesTotal: number;
      /** Most recently played city's result, when any city has played. */
      lastCity: { attendanceRate: number; revenue: number } | null;
    };

/**
 * Derive live-status entries from the raw projects array.
 * Non-tours, cancelled tours, and completed tours (all planned cities played,
 * or stage already 'recorded'/'released') yield nothing. Missing tourStats /
 * city metadata is tolerated via the tourHelpers fallbacks.
 */
export function deriveTourStatuses(
  projects: any[] | null | undefined,
  getArtistName: (artistId: string) => string,
): TourStatusEntry[] {
  return (projects ?? []).flatMap((project): TourStatusEntry[] => {
    if (!project || project.type !== 'Mini-Tour') return [];

    if (project.stage === 'planning') {
      return [
        {
          kind: 'booked',
          projectId: project.id,
          artistName: getArtistName(project.artistId || ''),
        },
      ];
    }

    if (project.stage !== 'production') return [];

    const cityCounts = getCityCounts(project);
    // All planned cities played → tour completed on the final city's week
    // (stage flips to 'recorded' on the following advance). Not live.
    if (cityCounts.completed >= cityCounts.planned) return [];

    const playedCities = getCompletedCities(project);
    const lastPlayed = playedCities.length > 0 ? playedCities[playedCities.length - 1] : null;
    const venueAccess = getTourMetadata(project).venueAccess || 'none';

    return [
      {
        kind: 'mid-tour',
        projectId: project.id,
        artistName: getArtistName(project.artistId || ''),
        venueName: VENUE_NAMES[venueAccess] ?? 'Small Venues',
        cityNumber: cityCounts.completed + 1,
        citiesTotal: cityCounts.planned,
        lastCity: lastPlayed
          ? {
              attendanceRate: lastPlayed.attendanceRate ?? 0,
              revenue: lastPlayed.revenue ?? 0,
            }
          : null,
      },
    ];
  });
}

interface TourStatusStripProps {
  statuses: TourStatusEntry[];
}

/** Compact per-tour status lines; renders nothing when no tour is live. */
export function TourStatusStrip({ statuses }: TourStatusStripProps) {
  if (statuses.length === 0) return null;

  return (
    <div className="mb-4 space-y-1.5" data-testid="tour-status-strip">
      {statuses.map((status) => (
        <div
          key={status.projectId}
          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-[10px] border border-neon-cyan/20 bg-surface-inner/50 px-3 py-1.5 text-xs"
        >
          <span aria-hidden="true">🎤</span>
          {status.kind === 'booked' ? (
            <span className="text-text-body">
              <span className="font-medium text-text-primary">{status.artistName}</span>
              {' — tour booked, crew prepping this week'}
            </span>
          ) : (
            <>
              <span className="text-text-body">
                <span className="font-medium text-text-primary">{status.artistName}</span>
                {' on tour — plays '}
                <span className="text-neon-cyan">{status.venueName}</span>
                {` this week (city ${status.cityNumber} of ${status.citiesTotal})`}
              </span>
              {status.lastCity && (
                <span className="text-text-muted">
                  {`last night: ${status.lastCity.attendanceRate}% attendance, `}
                  <span className="font-mono text-money">
                    ${status.lastCity.revenue.toLocaleString()}
                  </span>
                </span>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
