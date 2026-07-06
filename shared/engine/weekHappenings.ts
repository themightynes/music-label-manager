/**
 * Tier 2 (PR-1) — week happenings derivation (dark launch).
 *
 * Sibling of `meetingSelection.ts`: a pure, storage-free function that derives
 * "things that happened last week" from plain row-shaped inputs, for the
 * reactive-meeting injection stage. See:
 * docs/01-planning/implementation-specs/[READY] tier2-reactive-meetings-and-side-events-plan.md §1.
 *
 * Every trigger is a discrete once-event with a STRICT 1-week freshness
 * window: only events whose week === currentWeek - 1 count. There is nothing
 * to cool down and nothing to persist (fork A1 — stateless, no event queue).
 */
import type { HappeningType } from '../types/gameTypes';

/** One derived happening for the current week's injection stage. */
export interface WeekHappening {
  type: HappeningType;
  week: number;
  artistId?: string;
  artistName?: string;
  songId?: string;
  songTitle?: string;
  projectId?: string;
  releaseId?: string;
}

// ---------------------------------------------------------------------------
// Plain structural input shapes — intentionally minimal supersets of the
// Drizzle row types (server/storage), mirroring meetingSelection.ts's
// RelevanceArtistInput/RelevanceReleaseInput pattern, so this module never
// imports schema/storage code.
// ---------------------------------------------------------------------------

export interface HappeningArtistInput {
  id: string;
  name?: string | null;
  /** Week the artist was signed (artists.signedWeek, shared/schema.ts). */
  signedWeek?: number | null;
}

export interface HappeningReleaseInput {
  id: string;
  /** Week the release went out (releases.releaseWeek, shared/schema.ts). */
  releaseWeek?: number | null;
  status?: string | null;
  artistId?: string | null;
  title?: string | null;
}

/**
 * Minimal shape of a `mood_events` row needed for mood_crater derivation.
 *
 * Verification 6(b) (spec §9 item 2) found `ArtistStateProcessor`'s passive
 * paths — `calculateNaturalMoodDrift` and `calculateWorkloadStressPenalty`
 * (shared/engine/processors/ArtistStateProcessor.ts:255-321), invoked from
 * `processWeeklyMoodChanges` (same file, lines 174-215) — mutate
 * `artist.mood` via a direct `ctx.storage.updateArtist` call and NEVER call
 * `ctx.storage.createMoodEvent`. Only `applyArtistChangesToDatabase`
 * (ArtistStateProcessor.ts:42-165, discrete effect applications: dialogue
 * choices, executive-meeting choices) logs a `mood_events` row. Therefore
 * deriving `mood_crater` from `mood_events` rows alone is HONEST but
 * INCOMPLETE by construction: an artist can drift or stress silently across
 * the threshold and never fire the trigger. Per the spec's fallback
 * (never an engine write to log drift/stress in this route-side PR), the
 * trigger is narrowed to discrete-event craters only — this is a deliberate,
 * documented scope narrowing, not a bug.
 */
export interface HappeningMoodEventInput {
  artistId: string;
  /** shared/schema.ts moodEvents.weekOccurred */
  weekOccurred: number;
  /** shared/schema.ts moodEvents.moodBefore */
  moodBefore: number;
  /** shared/schema.ts moodEvents.moodAfter */
  moodAfter: number;
}

/**
 * Minimal shape of a `chart_entries` row needed for chart_debut derivation.
 * `isDebut` is a real, already-computed column (ChartService.ts:294) — first
 * time a song appears on the chart with a non-null position.
 */
export interface HappeningChartEntryInput {
  songId?: string | null;
  songTitle?: string | null;
  artistId?: string | null;
  isDebut?: boolean | null;
  isCompetitorSong?: boolean | null;
}

export interface DeriveWeekHappeningsInput {
  artists: HappeningArtistInput[];
  releases: HappeningReleaseInput[];
  moodEvents: HappeningMoodEventInput[];
  /**
   * FRESHNESS CONTRACT: chart rows carry no game-week number (chart_entries
   * stores a DATE `chartWeek`), so the CALLER must pass exactly the week-N−1
   * chart snapshot — the route fetches it by
   * `ChartService.generateChartWeekFromGameWeek(currentWeek - 1)`. All other
   * inputs are week-filtered inside this function.
   */
  chartEntries: HappeningChartEntryInput[];
}

/**
 * mood_crater threshold — PINNED at PR-1 time (spec §9 item 4) from the
 * authored mood bands in data/balance/artists.json `artist_stats.mood_effects`:
 *   `"very_low": [0, 20, -0.3]`   (data/balance/artists.json:27)
 *   `"low":      [21, 40, -0.15]` (data/balance/artists.json:28)
 * (format: [min, max, qualityModifier]). The spec's trigger is "mood crossed
 * BELOW the 'low' band" — dropped past low's lower boundary into "very_low" —
 * so the threshold is 20: a crater fires when a discrete event's
 * moodBefore > 20 AND moodAfter <= 20 (a fresh downward straddle). An artist
 * already at/below 20 sinking further does NOT re-fire (no fresh straddle).
 *
 * The alternative reading (entering "low", threshold 40) was considered and
 * rejected at PR time: mood_crater is the CRISIS trigger (highest injection
 * priority) and should mean the worst band, not merely below-neutral. If the
 * post-PR-2 playtest shows the fire rate is too low, bumping this constant to
 * 40 is a one-line tuning change.
 */
export const MOOD_CRATER_THRESHOLD = 20;

/**
 * Pure derivation: given plain rows and the CURRENT week, return every
 * happening whose underlying event occurred at exactly `currentWeek - 1`
 * (the strict 1-week freshness window — spec §1).
 */
export function deriveWeekHappenings(
  input: DeriveWeekHappeningsInput,
  currentWeek: number
): WeekHappening[] {
  const targetWeek = currentWeek - 1;
  const happenings: WeekHappening[] = [];
  if (targetWeek < 0) return happenings;

  const artistsById = new Map(input.artists.map((a) => [a.id, a]));

  // recent_signing: artists.signedWeek === currentWeek - 1
  for (const artist of input.artists) {
    if (artist.signedWeek === targetWeek) {
      happenings.push({
        type: 'recent_signing',
        week: targetWeek,
        artistId: artist.id,
        artistName: artist.name ?? undefined,
      });
    }
  }

  // release_out: releases.releaseWeek === currentWeek - 1 AND the release
  // actually went out (status released/catalog — set by the engine's release
  // pipeline). A stale still-'planned' release whose scheduled week slipped
  // past must NOT read as "went out last week".
  for (const release of input.releases) {
    if (
      release.releaseWeek === targetWeek &&
      (release.status === 'released' || release.status === 'catalog')
    ) {
      const artist = release.artistId ? artistsById.get(release.artistId) : undefined;
      happenings.push({
        type: 'release_out',
        week: targetWeek,
        releaseId: release.id,
        artistId: release.artistId ?? undefined,
        artistName: artist?.name ?? undefined,
      });
    }
  }

  // mood_crater: discrete mood_events rows at week N-1 whose mood straddles
  // the boundary DOWNWARD (moodBefore > threshold >= moodAfter). See
  // HappeningMoodEventInput doc comment for the derivation-completeness
  // narrowing this implements.
  for (const event of input.moodEvents) {
    if (event.weekOccurred !== targetWeek) continue;
    if (event.moodBefore > MOOD_CRATER_THRESHOLD && event.moodAfter <= MOOD_CRATER_THRESHOLD) {
      const artist = artistsById.get(event.artistId);
      happenings.push({
        type: 'mood_crater',
        week: targetWeek,
        artistId: event.artistId,
        artistName: artist?.name ?? undefined,
      });
    }
  }

  // chart_debut: chart_entries rows at week N-1 with isDebut === true
  // (player songs only — competitor songs never set isDebut, ChartService.ts:326).
  for (const entry of input.chartEntries) {
    if (entry.isCompetitorSong) continue;
    if (entry.isDebut !== true) continue;
    if (!entry.songId) continue;
    const artist = entry.artistId ? artistsById.get(entry.artistId) : undefined;
    happenings.push({
      type: 'chart_debut',
      week: targetWeek,
      songId: entry.songId,
      songTitle: entry.songTitle ?? undefined,
      artistId: entry.artistId ?? undefined,
      artistName: artist?.name ?? undefined,
    });
  }

  return happenings;
}
