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

/**
 * Banked-Hype chip copy — buzz-v2 (Hype & Pre-Marketing) slice 1. The meeting
 * "Buzz" channel banks awareness_boost into a label-global pool
 * (flags.pendingAwarenessBoost) that seeds the NEXT release you ship as starting
 * Buzz, and expires unused after 8 weeks. This chip is the first time that pool
 * is visible while banked. Fork E (standing rule): qualitative only — a point
 * value ("+N Hype") is fine, but NO multiplier numbers.
 */
/**
 * Weeks an unconsumed banked-hype pool survives before it expires. DISPLAY-ONLY
 * mirror of the engine knob `pending_awareness_boost_expiry_weeks`
 * (data/balance/markets.json → market_formulas.awareness_system, currently 8),
 * used to render the chip's "fades wk W" countdown synchronously without an
 * async balance fetch. HARDCODED: if the balance knob changes, update this too
 * (same mirror-the-engine pattern as BUZZ_BUILDING_WEEKS above).
 */
export const BANKED_HYPE_EXPIRY_WEEKS = 8;

export const BANKED_HYPE_TOOLTIP =
  'Banked Hype from your executive meetings. It seeds a release with extra ' +
  'starting Buzz when you plan it — an artist-targeted meeting banks for that ' +
  'artist’s next planned release, otherwise for your next planned release. ' +
  'Unused, it fades after a while. (Different from a released song’s live Buzz stat.)';

/**
 * Buzz-v2 slice 2 — sum ALL unattached hype pools for the core-status chip. As
 * of slice 2 there is a label pool (flags.pendingAwarenessBoost, stamped by
 * flags.pendingAwarenessBoostWeek) AND per-artist pools
 * (flags.hypeArtistPools[artistId] = { amount, week }). The chip shows the total
 * banked positive hype and the SOONEST fade week across all contributing pools.
 * Attached hype (moved onto a release at plan time) is NOT in flags and never
 * appears here. Only POSITIVE pools count toward the advertised total (a negative
 * pool suppresses discovery — not a resource to surface); a pool's fade week only
 * counts if it contributes to the positive total.
 */
export interface BankedHypeSummary {
  /** Sum of all positive unattached pools (label + per-artist). */
  total: number;
  /** Soonest last-bank week among the positive contributing pools, or null. */
  soonestWeek: number | null;
}

export function summarizeBankedHype(flags: Record<string, any> | undefined | null): BankedHypeSummary {
  let total = 0;
  let soonestWeek: number | null = null;
  const consider = (amount: unknown, week: unknown) => {
    if (typeof amount !== 'number' || amount <= 0) return;
    total += amount;
    if (typeof week === 'number' && (soonestWeek === null || week < soonestWeek)) {
      soonestWeek = week;
    }
  };
  const f = flags || {};
  consider(f.pendingAwarenessBoost, f.pendingAwarenessBoostWeek);
  if (f.hypeArtistPools && typeof f.hypeArtistPools === 'object') {
    for (const pool of Object.values(f.hypeArtistPools as Record<string, any>)) {
      consider(pool?.amount, pool?.week);
    }
  }
  return { total, soonestWeek };
}

/** Catalog-wide counts backing the MetricsDashboard core-status "Buzz" stat. */
export interface CatalogBuzzStatus {
  /** Released songs in the building window (weeks 1-4 since release) with awareness > 0. */
  building: number;
  /** Released songs past the building window (weeks 5+) with awareness >= 1. */
  fading: number;
}

/**
 * Derive the persistent core-status "Buzz" stat (playtest feedback July 6:
 * replaced both the WeekSummary routine buzz line and the "Hottest track"
 * stat) LIVE from the songs cache — counts, not per-song lines, and (fork E)
 * strictly qualitative: no multiplier numbers anywhere.
 *
 * Phase convention mirrors summarizeReleaseBuzz / ReleaseProcessor:
 * weeksSinceRelease = currentWeek - releaseWeek; gain runs weeks 1-4
 * (BUZZ_BUILDING_WEEKS, week 0 counts as building), decay runs weeks 5+.
 * Unreleased songs and songs with an unknown release week are excluded.
 * Tolerates both drizzle-property and raw-column shapes, mirroring
 * summarizeReleaseBuzz.
 */
export function summarizeCatalogBuzz(
  songs: any[] | null | undefined,
  currentWeek: number
): CatalogBuzzStatus {
  let building = 0;
  let fading = 0;
  for (const song of songs ?? []) {
    if (!song || !(song.isReleased ?? song.is_released)) continue;
    const releaseWeek = song.releaseWeek ?? song.release_week ?? null;
    if (typeof releaseWeek !== 'number') continue; // can't date the buzz
    const awareness = typeof song.awareness === 'number' ? song.awareness : 0;
    const weeksSinceRelease = currentWeek - releaseWeek;
    if (weeksSinceRelease <= BUZZ_BUILDING_WEEKS) {
      if (awareness > 0) building++;
    } else if (awareness >= 1) {
      fading++;
    }
  }
  return { building, fading };
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
