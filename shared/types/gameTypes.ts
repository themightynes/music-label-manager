// Game Data Types for Music Label Manager

export interface GameArtist {
  id: string;
  name: string;
  archetype: 'Visionary' | 'Workhorse' | 'Trendsetter';
  talent: number;
  workEthic: number;
  popularity: number;
  temperament: number;
  energy: number;
  mood: number;
  signed: boolean;
  signingCost?: number;
  weeklyCost?: number;
  bio?: string;
  genre?: string;
  age?: number;
}

/**
 * Engine-verbs Slice 1 (M4 chained/scheduled events): the ONE non-numeric
 * effect value. Authored as `"schedule_event": { "event_id": ..., "defer_weeks": N }`
 * inside a choice's effects_immediate — banks an entry into
 * `flags.scheduled_events[]` that promotes into `flags.pending_side_event`
 * (the mandatory crisis slot) once `defer_weeks` weeks have passed AND the
 * slot is free. See ActionProcessor.applyEffects (`schedule_event` case) and
 * GameEngine.promoteScheduledEvents for the queue/priority rules.
 */
export interface ScheduleEventEffect {
  /** Id of an event in data/events.json (typically `scheduled_only: true`). */
  event_id: string;
  /** Non-negative integer: weeks from now the event becomes due. */
  defer_weeks: number;
}

/** Runtime guard for the authored `schedule_event` effect value shape. */
export function isScheduleEventEffect(value: unknown): value is ScheduleEventEffect {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as any).event_id === 'string' &&
    (value as any).event_id.length > 0 &&
    typeof (value as any).defer_weeks === 'number' &&
    Number.isInteger((value as any).defer_weeks) &&
    (value as any).defer_weeks >= 0
  );
}

/**
 * Engine-verbs Slice 1: one entry in the `flags.scheduled_events[]` queue
 * (additive flags key — NO SNAPSHOT_VERSION bump). Written by
 * ActionProcessor.applyEffects (`schedule_event`), drained by
 * GameEngine.promoteScheduledEvents.
 */
export interface ScheduledEventEntry {
  /** data/events.json event id to land. */
  eventId: string;
  /** Absolute game week the entry becomes due (authored week + defer_weeks). */
  landsOnWeek: number;
  /** Provenance for logs/debugging (meeting/side-event id that scheduled it). */
  source: string;
  /**
   * Optional pinned artist for predetermined-target events ({artistName}
   * interpolation / artist-scoped effects resolve against THIS artist at
   * resolution time instead of re-deriving highest-popularity). Threaded
   * through pending_side_event when the entry promotes.
   */
  artistId?: string;
}

export interface ChoiceEffect {
  money?: number;
  reputation?: number;
  creative_capital?: number;
  artist_energy?: number;
  artist_mood?: number;
  /** @deprecated Use `artist_energy` */
  artist_loyalty?: never;
  /**
   * Engine-verbs Slice 1: structured (non-numeric) scheduling effect. Only
   * honored in effects_immediate of actions.json / events.json choices
   * (lint-enforced).
   */
  schedule_event?: ScheduleEventEffect;
  /**
   * Engine-verbs SLICE 5 (M13): string TARGETING DIRECTIVE, not an effect key.
   * Routes a sibling `executive_mood` value to a specific executive — one of
   * {@link EXEC_MOOD_TARGET_ROLE_IDS} or {@link EXEC_MOOD_TARGET_BROADCAST}
   * ('all'). Only valid in `effects_immediate` of CEO meetings and side/
   * escalation event choices (data-lint enforced); role meetings must NOT
   * carry it (their exec is implicit via action.metadata.executiveId).
   */
  target_executive?: string;
  /**
   * Engine-verbs M14 rider: string TARGETING DIRECTIVE, not an effect key.
   * On a side/escalation EVENT choice only — 'predetermined' applies the
   * block's artist-scoped keys (artist_mood/energy/popularity) to the event's
   * resolved artist (highest-popularity signed artist); 'global' forces the
   * legacy all-signed-artists application. Absent → the event-level `target`
   * field governs (current behavior).
   */
  target_artist?: 'predetermined' | 'global';
  [key: string]: number | string | ScheduleEventEffect | Record<string, unknown> | undefined;
}

/**
 * Engine-verbs SLICE 5 (M13 + M14 rider): the string-valued targeting
 * DIRECTIVE keys that may appear inside an authored effects block alongside
 * the numeric effect keys. They are NOT effect channels (never in
 * LIVE_EFFECT_KEYS, never carry a magnitude) — they only steer WHERE a
 * sibling effect lands. Every numeric-effect consumer already filters
 * `typeof value === 'number'`, so directives are inert everywhere except the
 * dedicated resolvers (ActionProcessor.applyTargetedExecutiveMood and
 * game-engine.processPendingSideEventResolution).
 */
export const EFFECT_TARGETING_DIRECTIVE_KEYS = ['target_executive', 'target_artist'] as const;

/**
 * Valid `target_executive` role ids (the four hireable executives — the CEO is
 * the player and has no executive row). Matches gameCreationService's seeded
 * roles and shared/engine/emailTemplates.ts's role union.
 */
export const EXEC_MOOD_TARGET_ROLE_IDS = ['head_ar', 'cmo', 'cco', 'head_distribution'] as const;

/** `target_executive: 'all'` — broadcast the mood delta to every executive. */
export const EXEC_MOOD_TARGET_BROADCAST = 'all' as const;

export interface DialogueChoice {
  id: string;
  label: string;
  effects_immediate: ChoiceEffect;
  effects_delayed: ChoiceEffect;
  /**
   * Delegation-arc §4.3.1: optional authoring escape hatch. When true, this choice
   * is FORCED as the exec's self-serving pick (scoreSelfServing returns +Infinity),
   * overriding the archetype heuristic — used when the numeric heuristic would tie
   * or would pick a choice that is not the in-character self-serving one.
   */
  self_serving_hint?: boolean;
  /**
   * C92: optional authored past-tense outcome line ("Signed the deal despite the
   * risk") rendered by digest/results surfaces — WeekSummary autonomous digest,
   * meeting entries, crisis-resolved beats. Falls back to `label` when absent.
   * Pre-decision surfaces (choice buttons, meeting flows) always use `label`.
   */
  outcome_summary?: string;
}

// Mood targeting scope for executive meetings (Task 3.1)
export type TargetScope = 'global' | 'predetermined' | 'user_selected';

/**
 * Meeting-relevance Tier 0 (PR-1) — the canonical relevance-tag vocabulary.
 *
 * SINGLE SOURCE OF TRUTH for the `requires` field on weekly_actions: both Zod
 * surfaces (shared/utils/dataLoader.ts and shared/api/contracts.ts) derive
 * their enums from this array, and the data-lint suite
 * (tests/engine/data-lint-relevance-tags.test.ts) validates data/actions.json
 * against it. Add new tags HERE first; predicates live in
 * shared/engine/meetingSelection.ts.
 */
export const RELEVANCE_TAGS = [
  'artist_signed',
  'music_exists',
  'release_planned',
  'release_out',
  'recording_project_active',
  'tour_active',
  // Engine-verbs M16 (requires-gates): per-artist-state tags. Thresholds are
  // config knobs in data/balance/progression.json weekly_meeting_selection
  // .artist_state_thresholds (comparator encoded in the knob name); predicates
  // in shared/engine/meetingSelection.ts deriveRelevanceState.
  'any_artist_low_mood',
  'any_artist_high_popularity',
  'any_artist_low_energy',
] as const;

export type RelevanceTag = (typeof RELEVANCE_TAGS)[number];

/**
 * Engine-verbs M16 (requires-gates) — the extended `requires` grammar.
 *
 * A `requires` array keeps AND semantics; each entry is ONE of:
 *  - a plain RelevanceTag string (the original Tier 0 grammar, unchanged);
 *  - a stat threshold object `{ stat, gte?, lte? }` — at least one bound
 *    required; both together form an inclusive range. `stat` names come from
 *    REQUIRES_STAT_NAMES ('week' = current game week, 'cash' = label money,
 *    'reputation' = label reputation). An UNKNOWN stat value at selection
 *    time (e.g. cash not threaded by a caller) fails CLOSED — the meeting is
 *    ineligible, never spuriously offered.
 *  - a story-flag object `{ flag, is? }` — reads `gameState.flags.story[flag]`
 *    (M3's write key; read defensively: an absent flag counts as false).
 *    `is` defaults to true ("flag must be set"); `is: false` means "flag must
 *    NOT be set" (exclusion gate).
 *
 * SINGLE SOURCE OF TRUTH: both Zod surfaces (shared/api/contracts.ts
 * RequiresEntrySchema, reused by shared/utils/dataLoader.ts) and the data-lint
 * suite (tests/engine/data-lint-relevance-tags.test.ts) validate against this
 * shape. Predicates live in shared/engine/meetingSelection.ts
 * (isRequirementSatisfied).
 */
export const REQUIRES_STAT_NAMES = ['week', 'cash', 'reputation'] as const;

export type RequiresStatName = (typeof REQUIRES_STAT_NAMES)[number];

export interface StatRequirement {
  stat: RequiresStatName;
  /** Inclusive lower bound: satisfied when value >= gte. */
  gte?: number;
  /** Inclusive upper bound: satisfied when value <= lte. */
  lte?: number;
}

export interface FlagRequirement {
  /** Key into gameState.flags.story (snake_case; absent = false). */
  flag: string;
  /** Required flag value; defaults to true. `is: false` = exclusion gate. */
  is?: boolean;
}

export type RequiresEntry = RelevanceTag | StatRequirement | FlagRequirement;

/**
 * Tier 2 (PR-1) — the canonical "week happening" vocabulary.
 *
 * SINGLE SOURCE OF TRUTH for the `reactive_trigger` field on weekly_actions:
 * both Zod surfaces (shared/utils/dataLoader.ts and shared/api/contracts.ts)
 * derive their enums from this array, and the data-lint suite
 * (tests/engine/data-lint-reactive-triggers.test.ts) validates
 * data/actions.json against it. Add new types HERE first; derivation logic
 * lives in shared/engine/weekHappenings.ts.
 *
 * `tour_wrapped` is deliberately ABSENT: PR-1 verification (spec §9 item 1)
 * found no queryable tour-completion week — `TourProcessor.processUnifiedTourRevenue`
 * (shared/engine/processors/TourProcessor.ts) reveals cities into
 * `project.metadata.tourStats.cities` with no per-city week stamp, only a
 * cumulative array. Adding one would require an engine write, which the spec
 * (§9 item 1, §0 constraint 5) forbids for this dark-launch PR. The CEO's
 * reactive-meeting slot uses `chart_debut` instead (PR-2; cross-exec trigger
 * duplication with the CMO is permitted by the per-(exec, trigger) lint rule).
 */
export const HAPPENING_TYPES = [
  'chart_debut',
  'release_out',
  'mood_crater',
  'recent_signing',
] as const;

export type HappeningType = (typeof HAPPENING_TYPES)[number];

/**
 * Tier 2 (PR-3) — the canonical side-event category vocabulary.
 *
 * SINGLE SOURCE OF TRUTH for the `category` field on data/events.json events
 * (the RELEVANCE_TAGS / HAPPENING_TYPES one-source pattern): the SideEvent Zod
 * schema (shared/utils/dataLoader.ts) derives its `category` enum from this
 * array, and the data-lint suite (tests/engine/data-lint-side-event-categories.test.ts)
 * validates data/events.json against it.
 *
 * These seven keys MUST stay exactly in sync with the `event_weights` keys in
 * data/balance/events.json — the isolated-seed weighted selection in
 * ServerGameData.selectSideEventOnHit looks up each candidate event's weight by
 * its category. A category with no authored event is permitted (warn-level in
 * the lint); an authored category absent from the weight table is not.
 */
export const SIDE_EVENT_CATEGORIES = [
  'sync_licensing',
  'copyright_issues',
  'platform_opportunities',
  'industry_drama',
  'technical_problems',
  'business_opportunities',
  'artist_personal',
] as const;

export type SideEventCategory = (typeof SIDE_EVENT_CATEGORIES)[number];

export interface RoleMeeting {
  id: string;
  name?: string; // Display name for the meeting (e.g., "CEO: Artist Roundtable")
  prompt: string;
  prompt_before_selection?: string; // For user_selected meetings (Task 3.2)
  target_scope: TargetScope; // Determines how mood effects are targeted (Task 3.2)
  /**
   * Meeting-relevance Tier 0 (PR-1): relevance tags with AND semantics.
   * Absent = always eligible. M16 (requires-gates): entries may also be
   * `{stat, gte?, lte?}` / `{flag, is?}` objects — see RequiresEntry above and
   * shared/engine/meetingSelection.ts isRequirementSatisfied.
   */
  requires?: RequiresEntry[];
  /**
   * Meeting-relevance Tier 1 (PR-2): weighting axis. Existing field on every
   * actions.json entry (business/talent/production/marketing/distribution/live);
   * typed here so shared/engine/meetingSelection.ts's weighting stage can read
   * it off a properly-typed RoleMeeting instead of an `any`.
   */
  category?: string;
  /**
   * Tier 2 (PR-1): the week-happening type that makes this meeting reactive.
   * Absent = a normal Tier 0+1 pool meeting (the dark-launch default — no
   * data/actions.json entry sets this yet). See
   * shared/engine/meetingSelection.ts's injection stage and
   * shared/engine/weekHappenings.ts.
   */
  reactive_trigger?: HappeningType;
  /**
   * Tier 2 (PR-2): server-attached "why now" context on the SELECTED meeting —
   * present only when the route's injection stage picked this meeting via a
   * matching week happening (never authored in data/actions.json; response-side
   * only). See server/routes/executives.ts and shared/api/contracts.ts
   * ReactiveContextSchema. Drives the client's "why now" line + urgency dot.
   */
  reactiveContext?: {
    trigger: HappeningType;
    artistName?: string;
    songTitle?: string;
  };
  choices: DialogueChoice[];
}

export interface GameRole {
  id: string;
  name: string;
  relationship: number;
  access: Record<string, any>;
  kpis: string[];
  meetings: RoleMeeting[];
  baseSalary?: number;
}

export interface Executive {
  id: string;
  role: string;
  level: number;
  mood: number;
  loyalty: number;
}

export interface EventChoice {
  id: string;
  label: string;
  effects_immediate: ChoiceEffect;
  effects_delayed: ChoiceEffect;
  /** C92: optional authored past-tense outcome line (falls back to `label`). */
  outcome_summary?: string;
}

export interface SideEvent {
  id: string;
  role_hint: string;
  /** Tier 2 (PR-3): weighted-selection + cooldown category. One of SIDE_EVENT_CATEGORIES. */
  category: SideEventCategory;
  /**
   * Executive Delegation arc (Tier 1, §8/fork f): optional per-event targeting mode.
   * 'predetermined' resolves artist-scoped effects (artist_mood, etc.) against the
   * highest-popularity signed artist, reusing the same resolver role-meeting
   * predetermined targeting uses. Absent -> existing global-application behavior
   * (backward-compatible with all pre-arc events).
   */
  target?: 'predetermined';
  /**
   * Executive Delegation arc (Tier 2, §5.3): marks an event as INJECTED ONLY by
   * escalation (shared/utils/executiveDelegation.ts ESCALATION_EVENT_BY_ROLE) —
   * it must never enter the weekly weighted side-event roll. Absent/false for
   * every pre-arc event. Enforced by a data-lint rule
   * (tests/engine/data-lint-escalation-events.test.ts): every `escalation_*`
   * event id carries this flag, and no non-escalation event does. Filtered out
   * of the roll's candidate pool in game-engine.ts checkForEvents.
   */
  escalation_only?: boolean;
  /**
   * Engine-verbs Slice 1 (M4): marks an event as INJECTED ONLY via the
   * `flags.scheduled_events[]` queue (authored `schedule_event` effects) — it
   * must never enter the weekly weighted side-event roll. Parallel to
   * `escalation_only` (an event may carry either, never both — lint-enforced
   * in tests/engine/data-lint-effect-keys.test.ts). Filtered out of the roll's
   * candidate pool in game-engine.ts checkForEvents.
   */
  scheduled_only?: boolean;
  prompt: string;
  choices: EventChoice[];
}

export interface DialogueScene {
  id: string;
  speaker?: string; // Optional: not used in mood/energy-based dialogue system
  archetype?: string; // Optional: not used in mood/energy-based dialogue system
  prompt: string;
  choices: DialogueChoice[];
}

export type SourcingTypeString = 'active' | 'passive' | 'specialized';

export interface GameState {
  // Primary key
  id: string;

  // Required fields with defaults (NOT NULL in DB)
  currentWeek: number;
  money: number;
  reputation: number;
  creativeCapital: number;
  focusSlots: number;
  usedFocusSlots: number;
  arOfficeSlotUsed: boolean;
  playlistAccess: string;
  pressAccess: string;
  venueAccess: string;
  campaignType: string;
  campaignCompleted: boolean;
  flags: Record<string, any>;
  weeklyStats: Record<string, any>;
  tierUnlockHistory: Record<string, any>;

  // Nullable fields (can be NULL in DB)
  userId: string | null;
  arOfficeSourcingType: SourcingTypeString | null;
  arOfficePrimaryGenre: string | null;
  arOfficeSecondaryGenre: string | null;
  arOfficeOperationStart: number | null;
  rngSeed: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;

  // Optional fields (added by application logic, not in DB schema)
  musicLabel?: MusicLabel;
}

export interface TierUnlockHistory {
  playlist?: {
    niche?: number;
    mid?: number;
    flagship?: number;
  };
  press?: {
    blogs?: number;
    mid_tier?: number;
    national?: number;
  };
  venue?: {
    clubs?: number;
    theaters?: number;
    arenas?: number;
  };
}

export interface MusicLabel {
  id: string;
  name: string;
  gameId: string;
  foundedWeek?: number;
  foundedYear?: number;
  description?: string;
  genreFocus?: string;
  createdAt?: string;
}

export interface LabelData {
  name: string;
  description?: string;
  genreFocus?: string;
  foundedYear?: number;
}

export interface GameProject {
  id: string;
  title: string;
  type: 'Single' | 'EP' | 'Mini-Tour';
  artistId: string;
  stage: 'planning' | 'production' | 'released';
  quality: number;
  budget: number;
  budgetUsed: number;
  dueWeek: number;
  startWeek: number;
  metadata?: Record<string, any>;
}

export interface ProducerTierData {
  multiplier: number;
  unlock_rep: number;
  description: string;
}

export interface TimeInvestmentData {
  multiplier: number;
  duration_modifier: number;
  description: string;
}

export interface BalanceConfig {
  version: string;
  economy: {
    starting_money: number;
    weekly_burn_base: number[];
    bankruptcy_threshold: number;
    rng_variance: number[];
    project_costs: Record<string, any>;
    song_count_cost_system: Record<string, any>;
    marketing_costs: Record<string, any>;
    talent_costs: Record<string, any>;
  };
  time_progression: {
    campaign_length_weeks: number;
    focus_slots_base: number;
    focus_slots_max: number;
    seasonal_modifiers: Record<string, number>;
  };
  reputation_system: {
    starting_reputation: number;
    starting_creative_capital?: number;
    max_reputation: number;
    goal_failure_penalty: number;
    hit_single_bonus: number;
    number_one_bonus: number;
    flop_penalty: number;
    // Balance-integrity slice 2 (flop penalty): a released record FLOPS when its
    // release-week revenue < flop_revenue_ratio × totalInvestment (production +
    // marketing), evaluated once at release-week processing, only when
    // totalInvestment ≥ flop_investment_floor (zero/low-budget drops are exempt).
    // On a flop, reputation −flop_penalty (clamp ≥0). Optional — absent ⇒
    // ReleaseProcessor read-site literal fallbacks (0.10 / 10000) apply.
    flop_revenue_ratio?: number;
    flop_investment_floor?: number;
    regional_barriers: Record<string, number>;
    decay_rate: number;
  };
  access_tier_system: Record<string, Record<string, any>>;
  artist_stats: Record<string, any>;
  market_formulas: Record<string, any>;
  side_events: Record<string, any>;
  progression_thresholds: Record<string, number>;
  quality_system: Record<string, any>;
  producer_tier_system: Record<string, ProducerTierData>;
  time_investment_system: Record<string, TimeInvestmentData>;
  /**
   * Balance-integrity slice 1 (knob liberation). Song-QUALITY formula constants
   * (producer skill map, time multipliers, popularity/fatigue/mood factors,
   * variance band, outlier chances). DISTINCT from producer_tier_system /
   * time_investment_system multipliers (which feed cost/duration). Optional —
   * absent ⇒ SongGenerationProcessor read-site literal fallbacks apply.
   */
  song_quality_formula?: Record<string, any>;
  ui_constants: Record<string, number>;
  save_system: Record<string, any>;
  difficulty_modifiers: Record<string, Record<string, number>>;
  /** Meeting-relevance Tier 1 (PR-2). Optional — absent ⇒ read-site HARDCODED fallback. */
  weekly_meeting_selection?: {
    relevance_weight: number;
    recency_window_weeks: number;
  };
  song_generation?: {
    name_pools: {
      default: string[];
      genre_specific?: Record<string, string[]>;
    };
    mood_types: string[];
    /** Engine-verbs M1a (grant_song). Optional — absent ⇒ read-site HARDCODED fallback.
     * default_quality_range is a [min, max] pair (typed number[] because JSON
     * imports infer arrays, not tuples; the read site validates length === 2). */
    granted_song?: {
      default_quality_range: number[];
    };
  };
}

export interface WorldConfig {
  version: string;
  generated: string;
  seed: number;
  money_start: number;
  weekly_burn_base: [number, number];
  access_tiers: {
    playlist: string[];
    press: string[];
    venue: string[];
  };
  mvp_caps: {
    playlist: string;
    press: string;
    venue: string;
  };
  unlock_thresholds: Record<string, number>;
  rng_band: [number, number];
}

export interface GameDataFiles {
  artists: { version: string; generated: string; artists: GameArtist[] };
  balance: BalanceConfig;
  world: WorldConfig;
  dialogue: { version: string; generated: string; description: string; additional_scenes: DialogueScene[] };
  events: { version: string; generated: string; events: SideEvent[] };
  roles: { version: string; generated: string; roles: GameRole[] };
}

// Utility types for game engine
export interface WeeklyOutcome {
  revenue: number;
  expenses: number;
  reputationChange: number;
  streams: number;
  pressMentions: number;
  accessUpgrades: string[];
}

export interface ActionResult {
  immediate: ChoiceEffect;
  delayed: ChoiceEffect;
  description: string;
}

export interface MarketCalculation {
  quality: number;
  accessTier: string;
  reputation: number;
  marketingSpend: number;
  rngVariance: number;
  finalOutcome: number;
}

// Chart system types
export interface ChartEntryDTO {
  id: string;
  songId: string;
  chartWeek: string; // ISO date string (YYYY-MM-DD format)
  streams: number;
  position: number | null;
  isCharting: boolean;
  isDebut: boolean;
  movement: number;
}

export interface CompetitorSong {
  id: string;
  title: string;
  artist: string;
  baseStreams: number;
  genre: string;
}

export interface SongPerformance {
  id: string;
  title: string;
  artist: string;
  streams: number;
  isPlayerSong: boolean;
  songId?: string;
}

// Game Engine types - unified location for shared interfaces

/**
 * Change-importance classification (Phase 4 PR-2).
 * Drives the staged WeekSummary reveal: hero moments get fanfare, routine
 * changes stay quiet. Assigned by the deterministic classifier in
 * `shared/utils/changeImportance.ts` at WeekSummary-assembly time.
 */
export type ChangeImportance = 'hero' | 'notable' | 'routine';

export interface ChartUpdate {
  songTitle: string;
  artistName: string;
  position: number | null;
  movement?: number;
  isDebut: boolean;
  weeksOnChart?: number;
  peakPosition?: number | null;
  isCompetitorSong?: boolean;
  // Phase 4 PR-2: optional additive importance classification. Old saves without
  // this field remain valid; no SNAPSHOT_VERSION bump.
  importance?: ChangeImportance;
}

export interface GameChange {
  type: 'expense' | 'revenue' | 'meeting' | 'project_complete' | 'delayed_effect' | 'unlock' | 'ongoing_revenue' | 'song_release' | 'release' | 'marketing' | 'reputation' | 'error' | 'mood' | 'energy' | 'popularity' | 'executive_interaction' | 'expense_tracking' | 'breakthrough' | 'awareness_gain' | 'awareness_decay' | 'tour_planning' | 'hype_banked' | 'hype_applied' | 'hype_expired' | 'pre_campaign' | 'flop' | 'creative_capital' | 'song_granted' | 'release_spawned';
  description: string;
  amount?: number;
  roleId?: string;
  projectId?: string;
  grossRevenue?: number;
  // #12: tour-completion economics. `totalCosts` = summed per-city tour costs
  // (venue + production + marketing); `netProfit` = grossRevenue − totalCosts.
  // Optional/additive — old saves without these fields remain valid.
  totalCosts?: number;
  netProfit?: number;
  moodChange?: number;
  newMood?: number;
  energyBoost?: number;
  newEnergy?: number;
  loyaltyBoost?: number; // For executive loyalty tracking
  newLoyalty?: number; // For executive loyalty tracking
  source?: string;
  artistId?: string;
  // Phase 4 PR-2: optional additive importance classification. Old saves without
  // this field remain valid; no SNAPSHOT_VERSION bump.
  importance?: ChangeImportance;
  // Exec-meetings-revival PR-2: explicit signed loyalty delta for executive-decay
  // 'executive_interaction' entries (ArtistStateProcessor). Distinguishes a genuine
  // loyalty-decay notice (loyaltyChange < 0) from the "Met with X" interaction entry
  // (which instead carries loyaltyBoost/newLoyalty, always positive) and from the
  // natural-mood-drift entry (neither field) — without string-matching descriptions.
  loyaltyChange?: number;
  // Exec-meetings-revival PR-2: enrichment for 'meeting' change entries so the
  // WeekSummary meetings card has real content (which meeting, which choice, what
  // it actually did). Optional/additive — old saves without these fields remain valid.
  meetingId?: string;
  choiceId?: string;
  choiceLabel?: string;
  // C92: authored past-tense outcome line (choice.outcome_summary), camelCase on
  // the wire like choiceLabel. Only present when the choice authors it — producers
  // conditionally spread it (never an always-present undefined key; golden master
  // snapshots WeekSummary verbatim). Render sites fall back to choiceLabel.
  outcomeSummary?: string;
  appliedEffects?: Record<string, number>;
  // Executive Delegation arc (Tier 1, §4.6): true on a 'meeting' entry that an
  // executive resolved AUTONOMOUSLY (the player spent no slot on them). Drives the
  // WeekSummary "While you were out" attribution group. Optional/additive — old
  // saves without this field remain valid; no SNAPSHOT_VERSION bump.
  autonomous?: boolean;
  // Exec-meetings-revival PR-9 (C6/D): mood-modifier context on a 'meeting' change
  // entry, set only when a non-neutral executive-mood modifier fired for that meeting.
  // Optional/additive — old saves without these fields remain valid.
  moodBand?: 'disgruntled' | 'neutral' | 'content' | 'inspired';
  costMultiplier?: number;
  effectMultiplier?: number;
  // Tour-tier1 slice 1: structured per-city fields on tour_performance revenue
  // entries and tour_planning foreshadow entries, so the client can render a
  // proper tour card without re-parsing the description string. All optional/
  // additive — old saves without them remain valid.
  venue?: string;
  attendanceRate?: number;
  ticketsSold?: number;
  capacity?: number;
  cityNumber?: number;
  citiesTotal?: number;
  costs?: number; // per-city total costs (economics.costs.total)
  // netProfit (declared above for tour completion) is reused for per-city profit.
  estTickets?: number; // deterministic pre-variance ticket estimate (foreshadow)
  artistName?: string;
  // Slice 1b: artist reaction deltas attached to the tour_performance entry
  // itself (moodChange above is reused); popularity delta from the show.
  popularityChange?: number;
  // Buzz-v2 (Hype & Pre-Marketing) slice 1: banked-hype lifecycle attribution.
  // Three additive entry types make the meeting Buzz channel — invisible before
  // this slice — legible: 'hype_banked' when a meeting choice banks awareness_boost
  // into flags.pendingAwarenessBoost (routine), 'hype_applied' when the next
  // shipped release consumes the pool as starting Buzz (notable), 'hype_expired'
  // when an unconsumed pool ages out after N weeks (notable). STRUCTURED from day
  // one (C80 lesson — awareness entries shipped description-only and could not be
  // re-styled without string-parsing). All optional/additive; `amount` above
  // carries the signed hype units for banked/applied/expired.
  hypeTotal?: number;   // hype_banked: label pool size AFTER this bank
  hypeUnits?: number;   // hype_applied: signed units consumed from the pool
  releaseId?: string;   // hype_applied / pre_campaign: the release the entry concerns
  releaseName?: string; // hype_applied / pre_campaign: that release's title
  // Buzz-v2 slice 3: pre-release marketing ('pre_campaign'). One entry per planned
  // release per week while its pre-campaign is converting. `amount` (declared above)
  // carries the signed awareness points added this week; `weeksToLaunch` is how many
  // weeks remain until the release ships. Structured from day one (C80 lesson).
  weeksToLaunch?: number;
}

export interface EventOccurrence {
  id: string;
  title: string;
  occurred: boolean;
  // Tier 2 (PR-3): on a side-event hit, the FULL authored payload is attached so
  // PR-4's WeekSummary beat can render the event card + choices from the weekly
  // outcome without a second fetch. Optional so the legacy {id,title,occurred}
  // shape (and any non-side-event occurrence) still satisfies the type.
  category?: SideEventCategory;
  prompt?: string;
  choices?: EventChoice[];
  // Mandatory Side Events ("Crisis on the Desk"): when a deferred crisis is
  // RESOLVED during a week's advance, the engine emits a resolved beat instead
  // of the interactive one. `resolved` marks it; `choiceId`/`choiceLabel` record
  // the pick; `effects`/`delayedEffects` are the applied immediate/delayed maps
  // (for the "You spent the week handling: …" WeekSummary card).
  resolved?: boolean;
  choiceId?: string;
  choiceLabel?: string;
  // C92: authored past-tense outcome line (choice.outcome_summary), conditionally
  // spread by the engine (golden-master-safe); render falls back to choiceLabel.
  outcomeSummary?: string;
  effects?: Record<string, number>;
  delayedEffects?: Record<string, number>;
}

/**
 * Type-safe artist stat changes (Tech Debt Item #4)
 * Represents changes to mood, energy, and popularity for a single artist
 */
export interface ArtistStatChange {
  mood?: number;
  energy?: number;
  popularity?: number;
  // Task 2.4: Track event source for mood_events logging
  eventSource?: {
    type: 'executive_meeting' | 'dialogue_choice' | 'project_completion' | 'other';
    sceneId?: string; // For dialogue choices
    choiceId?: string; // For dialogue choices
    meetingName?: string; // For executive meetings
  };
}

/**
 * Helper functions for type-safe artist stat accumulation
 */
export const ArtistChangeHelpers = {
  /**
   * Safely get an artist's stat changes, initializing if needed
   */
  getOrCreate(
    artistChanges: Record<string, ArtistStatChange> | undefined,
    artistId: string
  ): ArtistStatChange {
    if (!artistChanges) return {};
    if (!artistChanges[artistId]) {
      artistChanges[artistId] = {};
    }
    return artistChanges[artistId];
  },

  /**
   * Accumulate mood change for an artist
   */
  addMood(
    artistChanges: Record<string, ArtistStatChange> | undefined,
    artistId: string,
    value: number
  ): void {
    if (!artistChanges) return;
    if (!artistChanges[artistId]) {
      artistChanges[artistId] = {};
    }
    const current = artistChanges[artistId].mood || 0;
    artistChanges[artistId].mood = current + value;
  },

  /**
   * Accumulate energy change for an artist
   */
  addEnergy(
    artistChanges: Record<string, ArtistStatChange> | undefined,
    artistId: string,
    value: number
  ): void {
    if (!artistChanges) return;
    if (!artistChanges[artistId]) {
      artistChanges[artistId] = {};
    }
    const current = artistChanges[artistId].energy || 0;
    artistChanges[artistId].energy = current + value;
  },

  /**
   * Accumulate popularity change for an artist
   */
  addPopularity(
    artistChanges: Record<string, ArtistStatChange> | undefined,
    artistId: string,
    value: number
  ): void {
    if (!artistChanges) return;
    if (!artistChanges[artistId]) {
      artistChanges[artistId] = {};
    }
    const current = artistChanges[artistId].popularity || 0;
    artistChanges[artistId].popularity = current + value;
  },

  /**
   * Get mood change for an artist (returns 0 if not set)
   */
  getMood(
    artistChanges: Record<string, ArtistStatChange> | undefined,
    artistId: string
  ): number {
    return artistChanges?.[artistId]?.mood || 0;
  },

  /**
   * Get energy change for an artist (returns 0 if not set)
   */
  getEnergy(
    artistChanges: Record<string, ArtistStatChange> | undefined,
    artistId: string
  ): number {
    return artistChanges?.[artistId]?.energy || 0;
  },

  /**
   * Get popularity change for an artist (returns 0 if not set)
   */
  getPopularity(
    artistChanges: Record<string, ArtistStatChange> | undefined,
    artistId: string
  ): number {
    return artistChanges?.[artistId]?.popularity || 0;
  },
};

export interface WeekSummary {
  week: number;
  changes: GameChange[];
  revenue: number;
  expenses: number;
  streams?: number;
  // Press pickups earned this week (release press coverage + PR campaigns);
  // surfaced as weeklyStats.pressMentions in MetricsDashboard (C45)
  pressMentions?: number;
  reputationChanges: Record<string, number>;
  events: EventOccurrence[];
  // Per-artist stat changes (mood/energy/popularity) - UNIFIED FORMAT
  // All artist changes now use consistent per-artist object format (Tech Debt #1 completed)
  // Type-safe with ArtistStatChange interface (Tech Debt #4 completed)
  artistChanges?: Record<string, ArtistStatChange>;
  expenseBreakdown?: {
    weeklyOperations: number;
    artistSalaries: number;
    executiveSalaries: number;
    signingBonuses: number;
    projectCosts: number;
    marketingCosts: number;
    roleMeetingCosts: number;
  };
  revenueBreakdown?: {
    streamingRevenue: number;
    projectRevenue: number;
    tourRevenue: number;
    roleBenefits: number;
    otherRevenue: number;
  };
  financialBreakdown?: string; // Human-readable financial calculation
  chartUpdates?: ChartUpdate[]; // Chart position changes, debuts, and movements
  // A&R Office weekly outcome
  arOffice?: {
    completed: boolean;
    sourcingType?: 'active' | 'passive' | 'specialized' | null;
    discoveredArtistId?: string | null;
  };
}
