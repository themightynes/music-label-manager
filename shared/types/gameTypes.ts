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

export interface ChoiceEffect {
  money?: number;
  reputation?: number;
  creative_capital?: number;
  artist_energy?: number;
  artist_mood?: number;
  /** @deprecated Use `artist_energy` */
  artist_loyalty?: never;
  [key: string]: number | undefined;
}

export interface DialogueChoice {
  id: string;
  label: string;
  effects_immediate: ChoiceEffect;
  effects_delayed: ChoiceEffect;
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
] as const;

export type RelevanceTag = (typeof RELEVANCE_TAGS)[number];

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

export interface RoleMeeting {
  id: string;
  name?: string; // Display name for the meeting (e.g., "CEO: Artist Roundtable")
  prompt: string;
  prompt_before_selection?: string; // For user_selected meetings (Task 3.2)
  target_scope: TargetScope; // Determines how mood effects are targeted (Task 3.2)
  /**
   * Meeting-relevance Tier 0 (PR-1): relevance tags with AND semantics.
   * Absent = always eligible. See shared/engine/meetingSelection.ts.
   */
  requires?: RelevanceTag[];
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
}

export interface SideEvent {
  id: string;
  role_hint: string;
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
  type: 'expense' | 'revenue' | 'meeting' | 'project_complete' | 'delayed_effect' | 'unlock' | 'ongoing_revenue' | 'song_release' | 'release' | 'marketing' | 'reputation' | 'error' | 'mood' | 'popularity' | 'executive_interaction' | 'expense_tracking' | 'breakthrough' | 'awareness_gain' | 'awareness_decay';
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
  appliedEffects?: Record<string, number>;
  // Exec-meetings-revival PR-9 (C6/D): mood-modifier context on a 'meeting' change
  // entry, set only when a non-neutral executive-mood modifier fired for that meeting.
  // Optional/additive — old saves without these fields remain valid.
  moodBand?: 'disgruntled' | 'neutral' | 'content' | 'inspired';
  costMultiplier?: number;
  effectMultiplier?: number;
}

export interface EventOccurrence {
  id: string;
  title: string;
  occurred: boolean;
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
