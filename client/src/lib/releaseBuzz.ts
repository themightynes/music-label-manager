/**
 * Release-level Buzz (awareness) aggregation — awareness slice 2 (C42).
 *
 * Pure client-side helper: aggregates a release's songs (from the existing
 * `useSongs` query, joined via `song.releaseId` — see getReleaseSongs in
 * releaseAnalytics.ts) into the release card's Buzz readout. NO server or
 * engine involvement; per-song awareness already reaches the client
 * uncensored via the songs endpoints.
 *
 * Fork D (decided): the headline is the HOTTEST song (max awareness), not an
 * average — averages get diluted by filler tracks.
 * Fork E (decided): QUALITATIVE sustain language only. No ×N multiplier
 * number anywhere — the cap and formula stay mysterious.
 */

export type BuzzPhase = 'building' | 'sustaining' | 'fading';

export interface ReleaseBuzzSummary {
  /** Max-awareness released song, or null when no released song has awareness > 0
   *  (the card then renders NO Buzz section at all). */
  hottestSong: { title: string; awareness: number } | null;
  /** Released songs on this release with breakthrough_achieved. */
  breakthroughCount: number;
  /** null when hottestSong is null OR the hottest song's release week is unknown. */
  phase: BuzzPhase | null;
  /** Only set when phase === 'building': 1..4. */
  buildingWeek?: number;
  /** The exact display string for the phase (from BUZZ_PHASE_LABELS); null when phase is null. */
  phaseLabel: string | null;
}

// ---------------------------------------------------------------------------
// DISPLAY-ONLY CONSTANTS (fork E). These bands are client presentation labels,
// NOT engine values — the engine's awareness math (ReleaseProcessor gain weeks
// 1-4, FinancialSystem multiplier weeks 5+) is untouched by this arc. Tuning
// these changes wording only.
// ---------------------------------------------------------------------------

/** Weeks 1-4 since release: awareness is marketing-driven "building" phase. */
export const BUZZ_BUILDING_WEEKS = 4;
/** Weeks 5+: awareness >= this reads as "sustaining strongly". */
export const BUZZ_SUSTAIN_STRONG_MIN = 70;
/** Weeks 5+: awareness >= this (and below strong) reads as "sustaining"; 1..29 reads as "fading". */
export const BUZZ_SUSTAIN_MIN = 30;

/** The pinned display strings — qualitative only, no multiplier numbers (fork E). */
export const BUZZ_PHASE_LABELS = {
  building: (week: number) => `building — week ${week} of ${BUZZ_BUILDING_WEEKS}`,
  sustainingStrongly: 'sustaining strongly',
  sustaining: 'sustaining',
  fading: 'fading',
} as const;

/**
 * SongCatalog Buzz chip tooltip copy — awareness slice 3, fork C (decided):
 * both mechanics keep the name "Buzz" with MUTUALLY-disambiguating tooltips.
 * This is the song-level live-awareness side; the other side is the meetings
 * `awareness_boost` channel copy in EFFECT_CHANNEL_DESCRIPTIONS (ActionProcessor),
 * which cross-references back here. Fork E: qualitative only — NO multiplier
 * numbers in this copy.
 */
export const SONG_BUZZ_TOOLTIP =
  'Cultural buzz (0–100). Builds from marketing in release weeks 1–4, can break ' +
  'through, then fades. While it lasts, this song’s weekly streams ride the buzz. ' +
  '(Different from the meeting “Buzz” effect, which banks hype for your NEXT release.)';

/** Cross-cutting shape for the dashboard "Hottest track" stat (slice 3). */
export interface HottestTrack {
  title: string;
  awareness: number;
  breakthrough: boolean;
}

/**
 * Pick the max-awareness RELEASED song across the whole catalog — the
 * MetricsDashboard "Hottest track" stat (slice 3; fork D max-not-average).
 * Returns null when no released song has awareness > 0 (the stat then renders
 * its quiet em-dash placeholder). Tolerates both drizzle-property and
 * raw-column shapes, mirroring summarizeReleaseBuzz.
 */
export function findHottestTrack(songs: any[] | null | undefined): HottestTrack | null {
  let hottest: HottestTrack | null = null;
  for (const song of songs ?? []) {
    if (!song || !(song.isReleased ?? song.is_released)) continue;
    const awareness = typeof song.awareness === 'number' ? song.awareness : 0;
    if (awareness > 0 && (!hottest || awareness > hottest.awareness)) {
      hottest = {
        title: song.title ?? 'Untitled',
        awareness,
        breakthrough: Boolean(song.breakthrough_achieved ?? song.breakthroughAchieved),
      };
    }
  }
  return hottest;
}

/**
 * Aggregate a release's songs into the card Buzz summary.
 *
 * @param songs the release's songs (already joined by releaseId upstream)
 * @param currentWeek gameState.currentWeek
 */
export function summarizeReleaseBuzz(songs: any[], currentWeek: number): ReleaseBuzzSummary {
  // Only released songs count — unreleased tracks have no live awareness.
  // Tolerate both drizzle-property (isReleased) and raw-column (is_released)
  // shapes, mirroring getReleaseSongs' releaseId/release_id tolerance.
  const released = (songs ?? []).filter(s => Boolean(s?.isReleased ?? s?.is_released));

  const breakthroughCount = released.filter(s => Boolean(s.breakthrough_achieved)).length;

  let hottest: any = null;
  for (const song of released) {
    const awareness = typeof song.awareness === 'number' ? song.awareness : 0;
    if (awareness > 0 && (!hottest || awareness > hottest.awareness)) {
      hottest = { title: song.title ?? 'Untitled', awareness, releaseWeek: song.releaseWeek ?? song.release_week ?? null };
    }
  }

  if (!hottest) {
    return { hottestSong: null, breakthroughCount, phase: null, phaseLabel: null };
  }

  const hottestSong = { title: hottest.title, awareness: hottest.awareness };

  if (typeof hottest.releaseWeek !== 'number') {
    // Can't date the buzz — show the bar without a phase line.
    return { hottestSong, breakthroughCount, phase: null, phaseLabel: null };
  }

  // Engine convention (ReleaseProcessor:668): weeksSinceRelease = currentWeek - releaseWeek.
  // Gain runs weeks 1-4; decay + streams multiplier run weeks 5+. Week 0 (the
  // release week itself, possibly with banked-boost seeded awareness) is
  // clamped into "week 1 of 4" for display.
  const weeksSinceRelease = currentWeek - hottest.releaseWeek;

  if (weeksSinceRelease <= BUZZ_BUILDING_WEEKS) {
    const buildingWeek = Math.min(BUZZ_BUILDING_WEEKS, Math.max(1, weeksSinceRelease));
    return {
      hottestSong,
      breakthroughCount,
      phase: 'building',
      buildingWeek,
      phaseLabel: BUZZ_PHASE_LABELS.building(buildingWeek),
    };
  }

  // Weeks 5+: banded by the hottest song's awareness (display-only bands).
  if (hottest.awareness >= BUZZ_SUSTAIN_STRONG_MIN) {
    return { hottestSong, breakthroughCount, phase: 'sustaining', phaseLabel: BUZZ_PHASE_LABELS.sustainingStrongly };
  }
  if (hottest.awareness >= BUZZ_SUSTAIN_MIN) {
    return { hottestSong, breakthroughCount, phase: 'sustaining', phaseLabel: BUZZ_PHASE_LABELS.sustaining };
  }
  return { hottestSong, breakthroughCount, phase: 'fading', phaseLabel: BUZZ_PHASE_LABELS.fading };
}
