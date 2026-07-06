/**
 * Meeting-relevance Tier 0+1 (PR-1, PR-2) — pure weekly-meeting selection pipeline.
 *
 * Selection is a staged pure pipeline: pool → eligibility filter → weighting → draw.
 * Tier 2 (event-driven meetings, deferred) plugs in as a stage BEFORE the draw
 * by extending MeetingRelevanceState with event flags.
 *
 * This module is deliberately storage-free: `deriveRelevanceState` takes plain
 * row-shaped inputs so the server route, tests, and any future consumer share
 * ONE implementation without importing server code into shared/.
 *
 * Spec: docs/01-planning/implementation-specs/[READY] meeting-relevance-tier0-1-plan.md §1-§2.
 */

import { seededRandomPick, seededWeightedPick } from '../utils/seededRandom';
import type { RelevanceTag, HappeningType } from '../types/gameTypes';
import type { WeekHappening } from './weekHappenings';

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
  /**
   * Tier 1 (PR-2) imminence signal: ≥1 'planned' release whose releaseWeek is
   * UPCOMING within `recency_window_weeks` of currentWeek — scheduled for the
   * next N weeks, not released N weeks ago (releases.releaseWeek is a real DB
   * column — shared/schema.ts `releases`). Distinct from `releasePlanned` (any
   * planned release, no window): the weighting stage wants "release imminent",
   * the moment marketing/distribution attention is warranted.
   */
  releasePlannedSoon: boolean;
  /**
   * Tier 1 (PR-2) recency signal: ≥1 artist whose signedWeek falls within
   * `recency_window_weeks` of currentWeek (artists.signedWeek is a real DB
   * column — shared/schema.ts `artists`).
   */
  artistSignedRecently: boolean;
}

// ---------------------------------------------------------------------------
// Plain structural input shapes — intentionally minimal supersets of the
// Drizzle row types (server/storage) so the route can pass rows straight in
// without this module importing schema/storage code.
// ---------------------------------------------------------------------------

export interface RelevanceArtistInput {
  id?: string | null;
  /** Week the artist was signed (artists.signedWeek, shared/schema.ts). */
  signedWeek?: number | null;
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
  /** Week the release is/was scheduled for (releases.releaseWeek, shared/schema.ts). */
  releaseWeek?: number | null;
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
  /**
   * Tier 1 (PR-2) window, in weeks, for `releasePlannedSoon` (future-facing) /
   * `artistSignedRecently` (past-facing). Defaults to 0 (no window — both
   * signals are OFF) so PR-1 callers that don't pass this keep compiling with
   * the exact Tier 0 snapshot shape.
   */
  recencyWindowWeeks?: number;
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
  const { artists, projects, releases, songs, currentWeek, recencyWindowWeeks = 0 } = input;

  // Past-facing window: the event happened up to N weeks AGO (signings).
  const withinPastWindow = (weekValue: number | null | undefined): boolean => {
    if (weekValue == null || recencyWindowWeeks <= 0) return false;
    const age = currentWeek - weekValue;
    return age >= 0 && age <= recencyWindowWeeks;
  };
  // Future-facing window: the event is scheduled up to N weeks AHEAD (planned
  // releases — a 'planned' releaseWeek is in the future by definition; today
  // counts, an overdue week does not fire the "imminent" signal).
  const withinUpcomingWindow = (weekValue: number | null | undefined): boolean => {
    if (weekValue == null || recencyWindowWeeks <= 0) return false;
    const lead = weekValue - currentWeek;
    return lead >= 0 && lead <= recencyWindowWeeks;
  };

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
    releasePlannedSoon: releases.some(
      (r) => r.status === 'planned' && withinUpcomingWindow(r.releaseWeek)
    ),
    artistSignedRecently: artists.some((a) => withinPastWindow(a.signedWeek)),
  };
}

/** Minimal shape a pool item needs for eligibility filtering. */
export interface RelevanceTaggable {
  requires?: RelevanceTag[];
}

/** Minimal shape a pool item needs for Tier 1 (PR-2) weighting. */
export interface CategoryTaggable {
  category?: string | null;
}

/**
 * Tier 1 (PR-2) tuning knobs. Omitted entirely (or `relevanceWeight` <= 0) ⇒
 * every weight collapses to 1.0 — the exact Tier 0 uniform-pick behavior.
 * Sourced from `data/balance/progression.json` `weekly_meeting_selection`
 * (see server/data/gameData.ts getWeeklyMeetingSelectionConfigSync).
 */
export interface MeetingSelectionTuning {
  /** Multiplier applied once per matching situation→category signal. */
  relevanceWeight: number;
  /** Recency window (weeks) `deriveRelevanceState` used for the recency signals. */
  recencyWindowWeeks: number;
}

/**
 * Situation signal → boosted categories, per spec §2's table. Multiple firing
 * signals on the same category stack multiplicatively (each is an independent
 * "multiply by relevanceWeight once").
 */
function boostedCategoriesForState(state: MeetingRelevanceState): string[] {
  const boosted: string[] = [];
  if (state.tourActive) boosted.push('live');
  if (state.releasePlannedSoon) boosted.push('marketing', 'distribution');
  if (state.recordingProjectActive) boosted.push('production');
  if (state.artistSignedRecently) boosted.push('talent');
  return boosted;
}

/**
 * Tier 1 weighting stage: base weight 1.0 per eligible meeting, multiplied by
 * `tuning.relevanceWeight` once per matching situation→category signal that
 * targets this meeting's `category` (stacks multiplicatively — e.g. a
 * `marketing`-category meeting whose only booster is `releasePlannedSoon`
 * gets one multiply; if two independent firing signals both targeted the same
 * category it would get two).
 *
 * No `tuning` (or a category-less meeting, or no signals firing) ⇒ weight 1.0
 * — degrades to Tier 0's uniform pick.
 */
export function weighMeetings<T extends CategoryTaggable>(
  eligible: T[],
  state: MeetingRelevanceState,
  tuning?: MeetingSelectionTuning
): number[] {
  if (!tuning || !(tuning.relevanceWeight > 0)) {
    return eligible.map(() => 1.0);
  }

  const boosted = boostedCategoriesForState(state);
  if (boosted.length === 0) {
    return eligible.map(() => 1.0);
  }

  return eligible.map((meeting) => {
    const category = meeting.category ?? undefined;
    if (!category) return 1.0;
    const hits = boosted.filter((c) => c === category).length;
    if (hits === 0) return 1.0;
    return Math.pow(tuning.relevanceWeight, hits);
  });
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
 * Select this week's meeting: filter to the eligible pool, weight it (Tier 1,
 * PR-2 — omit `tuning` for the exact Tier 0 uniform behavior), then a single
 * seeded draw (same string-seed mechanism as before — deterministic per
 * (gameId, week, roleId), isolated from the engine's RNG stream).
 *
 * Returns `null` on an EMPTY eligible pool — the exec sits out the week
 * (spec §1's empty-pool rule): the route answers `meetings: []`, the client
 * renders the sit-out state, and AUTO skips the exec.
 */
export function selectWeeklyMeeting<T extends RelevanceTaggable & CategoryTaggable>(
  pool: T[],
  state: MeetingRelevanceState,
  seed: string,
  tuning?: MeetingSelectionTuning
): T | null {
  const eligible = filterEligible(pool, state);
  if (eligible.length === 0) return null;
  if (!tuning) {
    return seededRandomPick(eligible, seed) ?? null;
  }
  const weights = weighMeetings(eligible, state, tuning);
  return seededWeightedPick(eligible, weights, seed) ?? null;
}

// ---------------------------------------------------------------------------
// Tier 2 (PR-1) — reactive-meeting injection stage (dark launch).
//
// Spec: docs/01-planning/implementation-specs/[READY] tier2-reactive-meetings-and-side-events-plan.md §2,
// slot-in guarantee: COMPLETED/[COMPLETE] meeting-relevance-tier0-1-plan.md §5.
//
// Injection sits PRE-DRAW, after the existing Tier 0 eligibility filter: if a
// current happening matches a pool meeting's `reactive_trigger` AND that
// meeting's `requires` tags are still satisfied, the reactive meeting
// REPLACES the weighted draw entirely for that exec this week (fork B1).
// With zero authored `reactive_trigger` values in data/actions.json (this PR
// is dark-launch), `matchReactiveMeeting` always returns null and
// `selectWeeklyMeetingWithHappenings` falls through to the existing
// filter → weigh → draw pipeline, UNCHANGED — this is the dark-launch
// invariant `no-match falls through byte-identical to the pre-existing
// pipeline`, exercised by the unit tests beside this module.
// ---------------------------------------------------------------------------

/** Minimal shape a pool item needs to be considered for reactive injection. */
export interface ReactiveTaggable {
  reactive_trigger?: HappeningType;
}

/**
 * Fixed trigger priority (spec §2 item 2 / §9 item 1's tie-break law):
 * crisis first, then follow-ups. `tour_wrapped` is intentionally absent — see
 * `HAPPENING_TYPES`'s doc comment (shared/types/gameTypes.ts) for why it never
 * made it into this PR's vocabulary.
 */
export const REACTIVE_TRIGGER_PRIORITY: readonly HappeningType[] = [
  'mood_crater',
  'chart_debut',
  'release_out',
  'recent_signing',
];

/** Result of the injection stage: which meeting won and why, or no match. */
export interface ReactiveMatch<T> {
  meeting: T;
  happening: WeekHappening;
}

/**
 * Find the reactive meeting (if any) that should replace this exec's weighted
 * draw this week.
 *
 * 1. Filter `eligiblePool` (already Tier-0-filtered by the caller) to
 *    meetings whose `reactive_trigger` matches ANY current happening's type.
 * 2. Among matches, pick the happening/meeting pair whose trigger has the
 *    highest `REACTIVE_TRIGGER_PRIORITY` rank.
 * 3. Ties within the same priority level (e.g. two different happenings of
 *    the SAME trigger type both matching, which the per-(exec,trigger) data
 *    lint makes rare but not impossible if the pool ever holds >1 meeting per
 *    trigger) are broken by a seeded pick using an ISOLATED seed
 *    (`${seed}-reactive-tiebreak`) — NEVER `ctx.getRandom`, so the engine's
 *    RNG stream stays untouched.
 *
 * Returns null when no happening matches any pool meeting's trigger — the
 * caller then runs the existing Tier 0+1 pipeline unchanged.
 */
export function matchReactiveMeeting<T extends ReactiveTaggable>(
  eligiblePool: T[],
  happenings: WeekHappening[],
  seed: string
): ReactiveMatch<T> | null {
  if (happenings.length === 0 || eligiblePool.length === 0) return null;

  const happeningsByType = new Map<HappeningType, WeekHappening[]>();
  for (const happening of happenings) {
    const list = happeningsByType.get(happening.type) ?? [];
    list.push(happening);
    happeningsByType.set(happening.type, list);
  }

  // Collect every (meeting, happening) pair whose trigger fires this week.
  const candidates: ReactiveMatch<T>[] = [];
  for (const meeting of eligiblePool) {
    if (!meeting.reactive_trigger) continue;
    const matchingHappenings = happeningsByType.get(meeting.reactive_trigger);
    if (!matchingHappenings) continue;
    for (const happening of matchingHappenings) {
      candidates.push({ meeting, happening });
    }
  }
  if (candidates.length === 0) return null;

  // Highest-priority trigger type present among the candidates wins.
  let bestPriorityIndex = Infinity;
  for (const candidate of candidates) {
    const idx = REACTIVE_TRIGGER_PRIORITY.indexOf(candidate.happening.type);
    const rank = idx === -1 ? Infinity : idx;
    if (rank < bestPriorityIndex) bestPriorityIndex = rank;
  }
  const topCandidates = candidates.filter(
    (c) => REACTIVE_TRIGGER_PRIORITY.indexOf(c.happening.type) === bestPriorityIndex
  );

  if (topCandidates.length === 1) return topCandidates[0];

  // Tie-break: isolated seed, never the engine's ctx.getRandom stream.
  const picked = seededRandomPick(topCandidates, `${seed}-reactive-tiebreak`);
  return picked ?? topCandidates[0];
}

/**
 * Extended selection entry point: injects the Tier 2 reactive stage before
 * the existing Tier 0+1 pipeline. `selectWeeklyMeeting` (above) is left
 * completely untouched so existing callers that don't pass `happenings` keep
 * their exact prior behavior — this function is additive, not a signature
 * change to the original.
 *
 * `happenings` defaults to an empty array (== "no happenings"), which is
 * byte-identical to omitting it: both fall straight through to
 * `selectWeeklyMeeting`'s existing filter → weigh → draw pipeline.
 *
 * REACTIVE MEETINGS ARE EVENT-GATED: a meeting carrying `reactive_trigger`
 * can ONLY be selected via the injection stage — it is excluded from the
 * fall-through weighted draw. Its authored copy references a specific
 * last-week event ("because X debuted…"), which would read as nonsense in a
 * week where that event didn't happen. With zero authored reactive meetings
 * (this PR's dark launch) the exclusion filters nothing, so fall-through
 * remains byte-identical to the pre-existing pipeline.
 */
export function selectWeeklyMeetingWithHappenings<
  T extends RelevanceTaggable & CategoryTaggable & ReactiveTaggable
>(
  pool: T[],
  state: MeetingRelevanceState,
  seed: string,
  happenings: WeekHappening[] = [],
  tuning?: MeetingSelectionTuning
): { meeting: T | null; reactiveHappening: WeekHappening | null } {
  const eligible = filterEligible(pool, state);
  if (eligible.length > 0 && happenings.length > 0) {
    const match = matchReactiveMeeting(eligible, happenings, seed);
    if (match) {
      return { meeting: match.meeting, reactiveHappening: match.happening };
    }
  }

  // No match (or no happenings at all): existing Tier 0+1 pipeline, unchanged
  // over the NON-reactive pool (see doc comment — reactive meetings are
  // event-gated and never enter the regular rotation).
  const regularPool = pool.filter((m) => m.reactive_trigger === undefined);
  const selected = selectWeeklyMeeting(regularPool, state, seed, tuning);
  return { meeting: selected, reactiveHappening: null };
}
