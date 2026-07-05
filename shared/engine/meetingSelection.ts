/**
 * Meeting-relevance Tier 0 (PR-1) — pure weekly-meeting selection pipeline.
 *
 * Selection is a staged pure pipeline: pool → eligibility filter → draw.
 * PR-2 (Tier 1) adds a weighting stage between filter and draw; Tier 2 (event-
 * driven meetings, deferred) plugs in as a stage BEFORE the draw by extending
 * MeetingRelevanceState with event flags.
 *
 * This module is deliberately storage-free: `deriveRelevanceState` takes plain
 * row-shaped inputs so the server route, tests, and any future consumer share
 * ONE implementation without importing server code into shared/.
 *
 * Spec: docs/01-planning/implementation-specs/[READY] meeting-relevance-tier0-1-plan.md §1-§2.
 */

import { seededRandomPick } from '../utils/seededRandom';
import type { RelevanceTag } from '../types/gameTypes';

/**
 * Snapshot of the label state the relevance predicates read.
 *
 * Designed for extension: PR-2 (Tier 1) adds recency signals (e.g. weeks since
 * last signing / release planning) and Tier 2 adds event flags — add new
 * OPTIONAL fields here so existing call sites keep compiling.
 */
export interface MeetingRelevanceState {
  currentWeek: number;
  /** ≥1 signed artist */
  artistSigned: boolean;
  /** ≥1 recorded song */
  musicExists: boolean;
  /** ≥1 scheduled (status 'planned') release */
  releasePlanned: boolean;
  /** ≥1 released release/song */
  releaseOut: boolean;
  /** ≥1 Single/EP project in the production stage */
  recordingProjectActive: boolean;
  /** ≥1 booked Mini-Tour in production with cities still to play */
  tourActive: boolean;
}

// ---------------------------------------------------------------------------
// Plain structural input shapes — intentionally minimal supersets of the
// Drizzle row types (server/storage) so the route can pass rows straight in
// without this module importing schema/storage code.
// ---------------------------------------------------------------------------

export interface RelevanceArtistInput {
  id?: string | null;
}

export interface RelevanceProjectInput {
  type?: string | null;
  stage?: string | null;
  startWeek?: number | null;
  /** JSONB metadata; tour city counts live under metadata.cities / metadata.tourStats.cities */
  metadata?: unknown;
}

export interface RelevanceReleaseInput {
  status?: string | null;
}

export interface RelevanceSongInput {
  isRecorded?: boolean | null;
  isReleased?: boolean | null;
}

export interface DeriveRelevanceStateInput {
  artists: RelevanceArtistInput[];
  projects: RelevanceProjectInput[];
  releases: RelevanceReleaseInput[];
  songs: RelevanceSongInput[];
  currentWeek: number;
}

/**
 * Is this Mini-Tour project still actively touring?
 *
 * MIRRORS `getArtistStatus`'s tour branch in `client/src/utils/tourHelpers.ts`
 * (C51's shared completion rule): a tour is active while it is in 'production',
 * has started (startWeek <= currentWeek), and has NOT yet played all planned
 * cities (metadata.cities planned vs metadata.tourStats.cities.length
 * completed). Missing city metadata fails OPEN (stage-only behavior), exactly
 * like the client helper. Kept as a shared mirror (with this cross-reference)
 * rather than importing client/ code into shared/ — if the tour-completion rule
 * changes, update BOTH places.
 */
function isTourProjectActive(project: RelevanceProjectInput, currentWeek: number): boolean {
  if (project.type !== 'Mini-Tour') return false;
  if (project.stage !== 'production') return false;
  if (project.startWeek == null || currentWeek < project.startWeek) return false;

  const metadata = (project.metadata ?? {}) as {
    cities?: number;
    tourStats?: { cities?: unknown[] };
  };
  if (metadata.cities == null) {
    // MISSING metadata: fall back to stage-based behavior (fail open, not closed).
    return true;
  }
  const planned = metadata.cities || 1;
  const completed = metadata.tourStats?.cities?.length ?? 0;
  return completed < planned;
}

/**
 * Derive the relevance-state snapshot from plain row inputs. Pure — no storage,
 * no I/O; the caller (server route, tests) supplies the rows.
 */
export function deriveRelevanceState(input: DeriveRelevanceStateInput): MeetingRelevanceState {
  const { artists, projects, releases, songs, currentWeek } = input;

  return {
    currentWeek,
    artistSigned: artists.length > 0,
    musicExists: songs.some((s) => s.isRecorded === true),
    releasePlanned: releases.some((r) => r.status === 'planned'),
    releaseOut:
      releases.some((r) => r.status === 'released' || r.status === 'catalog') ||
      songs.some((s) => s.isReleased === true),
    recordingProjectActive: projects.some(
      (p) => (p.type === 'Single' || p.type === 'EP') && p.stage === 'production'
    ),
    tourActive: projects.some((p) => isTourProjectActive(p, currentWeek)),
  };
}

/** Minimal shape a pool item needs for eligibility filtering. */
export interface RelevanceTaggable {
  requires?: RelevanceTag[];
}

/** Evaluate one relevance tag against the state snapshot. */
export function isTagSatisfied(tag: RelevanceTag, state: MeetingRelevanceState): boolean {
  switch (tag) {
    case 'artist_signed':
      return state.artistSigned;
    case 'music_exists':
      return state.musicExists;
    case 'release_planned':
      return state.releasePlanned;
    case 'release_out':
      return state.releaseOut;
    case 'recording_project_active':
      return state.recordingProjectActive;
    case 'tour_active':
      return state.tourActive;
    default: {
      // Exhaustiveness guard: a new tag added to RELEVANCE_TAGS without a
      // predicate here is a compile error, not a silent always-false.
      const exhaustive: never = tag;
      return exhaustive;
    }
  }
}

/**
 * Tier 0 eligibility filter: `requires` has AND semantics; an absent (or empty)
 * `requires` means always eligible.
 */
export function filterEligible<T extends RelevanceTaggable>(
  pool: T[],
  state: MeetingRelevanceState
): T[] {
  return pool.filter((meeting) =>
    (meeting.requires ?? []).every((tag) => isTagSatisfied(tag, state))
  );
}

/**
 * Select this week's meeting: filter to the eligible pool, then a uniform
 * seeded draw (same string-seed mechanism as before — deterministic per
 * (gameId, week, roleId), isolated from the engine's RNG stream).
 *
 * Returns `null` on an EMPTY eligible pool — the exec sits out the week
 * (spec §1's empty-pool rule): the route answers `meetings: []`, the client
 * renders the sit-out state, and AUTO skips the exec.
 */
export function selectWeeklyMeeting<T extends RelevanceTaggable>(
  pool: T[],
  state: MeetingRelevanceState,
  seed: string
): T | null {
  const eligible = filterEligible(pool, state);
  return seededRandomPick(eligible, seed) ?? null;
}
