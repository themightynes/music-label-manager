// Systems Map — data module (admin dev tool)
//
// Hand-verified snapshot of shared/engine as of 2026-07-10, updated for the
// full balance-integrity arc (6 slices, same day): slice 1 "knob liberation" —
// every balance constant that was previously a HARDCODED engine literal is now
// read from data/balance/*.json (byte-identical values) and its edge flips to
// source 'live' — plus 4 new/changed edges from slices 2, 4, 5, 6: flop penalty
// (e-flop-reputation, reputation's first sink), mood → variance widening, energy
// → tour sell-through (energy_effectiveness), and tour-popularity gains routed
// through the shared saturation curve. Every edge cites the
// engine code that implements it; every "live" value is read straight out of the
// authored balance JSON via a static import (same precedent as the read-only knobs
// strip in client/src/admin/SideEventsEditor.tsx), so the diagram always reflects
// current tuning. Every "hardcoded" value is a literal embedded in engine code —
// it is NOT tunable by editing a balance JSON, and is flagged for the designer.
//
// Doc-sync: re-verify this file whenever shared/engine formulas change (see
// docs/06-development/documentation-governance.md).
//
// eslint-disable-next-line import/no-relative-packages
import markets from '../../../data/balance/markets.json';
// eslint-disable-next-line import/no-relative-packages
import quality from '../../../data/balance/quality.json';
// eslint-disable-next-line import/no-relative-packages
import progression from '../../../data/balance/progression.json';
// eslint-disable-next-line import/no-relative-packages
import economy from '../../../data/balance/economy.json';
// eslint-disable-next-line import/no-relative-packages
import artists from '../../../data/balance/artists.json';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type DomainId = 'resources' | 'meetings' | 'artist' | 'production' | 'release' | 'live';

export interface DomainMeta {
  id: DomainId;
  label: string;
  /** Tailwind v2 neon accent token, e.g. "neon-green" (used for text/border/stroke lookups). */
  accent: string;
  /** Hex value of the accent, for direct use in inline SVG stroke/fill (no new deps, no inline-hex-in-JSX rule violation — this is data, not a component style). */
  hex: string;
}

export const DOMAINS: DomainMeta[] = [
  { id: 'resources', label: 'Resources', accent: 'neon-green', hex: '#57ff8f' },
  { id: 'meetings', label: 'Meetings & Events', accent: 'neon-purple', hex: '#a05af0' },
  { id: 'artist', label: 'Artist', accent: 'neon-magenta', hex: '#ff3d6e' },
  { id: 'production', label: 'Production', accent: 'neon-amber', hex: '#ff9a3d' },
  { id: 'release', label: 'Release & Marketing', accent: 'neon-cyan', hex: '#37d6ff' },
  { id: 'live', label: 'Live & Charts', accent: 'neon-blue', hex: '#4a6bff' },
];

export const DOMAIN_ORDER: DomainId[] = DOMAINS.map((d) => d.id);

export interface SystemNode {
  id: string;
  label: string;
  domain: DomainId;
  /** Column index (0-5), matches DOMAIN_ORDER — redundant with domain but keeps layout explicit/curated. */
  col: number;
  /** Row index within the column, for curated static layout. */
  row: number;
  description: string;
}

export type ValueSource = 'live' | 'hardcoded';

export interface EdgeValue {
  label: string;
  value: number | string;
  source: ValueSource;
  /** Dotted path into the imported balance JSON, e.g. "markets.market_formulas.streaming_calculation.quality_weight". Present only for source === 'live'. */
  configPath?: string;
  /** file:line citation. Always present for source === 'hardcoded'; optional for 'live' (points at the consuming code). */
  ref?: string;
}

export interface SystemEdge {
  id: string;
  from: string;
  to: string;
  mechanism: string;
  formula: string;
  values: EdgeValue[];
  /** True if any value in this edge is NOT tunable via a balance JSON (C79-class debt). */
  hardcoded: boolean;
  /** Primary code reference for the edge (function/file:line-range). */
  ref: string;
  /** Optional free-text note, e.g. flagging a shadowed config (C79) or a naming nuance. */
  note?: string;
}

export interface NonEdge {
  id: string;
  from: string;
  to: string;
  /** What a reader would assume, based on node/config naming. */
  claim: string;
  /** Why it's actually not wired (or only partially/differently wired), with code/config citations. */
  evidence: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Live balance accessors (typed loosely — these are read-only display values,
// same posture as SideEventsEditor's `sideEventsBalance` cast)
// ─────────────────────────────────────────────────────────────────────────────

const mf = (markets as any).market_formulas;
const streamingCalc = mf.streaming_calculation;
const ongoingStreams = streamingCalc.ongoing_streams;
const awarenessSystem = mf.awareness_system;
const releasePlanning = mf.release_planning;
const chartSystem = mf.chart_system;
const pressCoverage = mf.press_coverage;
const tourRevenue = mf.tour_revenue;
// Balance-integrity slice 1 (knob liberation) — newly config-driven blocks.
const popularitySaturation = mf.popularity_saturation;
const ongoingMarketingFactor = mf.ongoing_marketing_factor;
const tourVenueScaling = tourRevenue.venue_scaling;

const qualitySystem = (quality as any).quality_system;
const budgetQualitySystem = qualitySystem.budget_quality_system;
const producerTierSystem = (quality as any).producer_tier_system;
const timeInvestmentSystem = (quality as any).time_investment_system;
// Balance-integrity slice 1 (knob liberation) — the song-QUALITY formula block
// (DISTINCT from producer_tier_system/time_investment_system cost/duration multipliers).
const songQualityFormula = (quality as any).song_quality_formula;

const reputationSystem = (progression as any).reputation_system;
const accessTierSystem = (progression as any).access_tier_system;
const progressionThresholds = (progression as any).progression_thresholds;
const execMoodModifiers = reputationSystem.exec_mood_modifiers;

const economyData = economy as any;

// ─────────────────────────────────────────────────────────────────────────────
// Nodes (23) — 6 domain columns, left → right
// ─────────────────────────────────────────────────────────────────────────────

export const NODES: SystemNode[] = [
  // Resources
  {
    id: 'money',
    label: 'Money',
    domain: 'resources',
    col: 0,
    row: 0,
    description: `Starts at $${economyData.starting_money?.toLocaleString?.() ?? economyData.starting_money} (economy.json starting_money). Bankruptcy at $${economyData.bankruptcy_threshold} (economy.json bankruptcy_threshold). Weekly burn: rand($${economyData.weekly_burn_base?.[0]}-$${economyData.weekly_burn_base?.[1]}) base (economy.json weekly_burn_base) + $${economyData.talent_costs ? '' : ''}${'per-artist default fee $1200 HARDCODED (FinancialSystem.ts:456 DEFAULT_ARTIST_FEE)'} + exec salaries (FinancialSystem.ts:1721-1789). Meeting choices also set money directly via effects_immediate/effects_delayed (ActionProcessor.ts:621) — not modeled as an edge since the source is player/content choice, not another system.`,
  },
  {
    id: 'reputation',
    label: 'Reputation',
    domain: 'resources',
    col: 0,
    row: 1,
    description: `0-100, starts at ${reputationSystem.starting_reputation} (progression.json reputation_system.starting_reputation), master gate for access tiers, producer tiers, and the 4th focus slot. Meeting choices can also apply a seeded rep_swing (ActionProcessor.ts:1049) and reputation itself never decays in code (see non-edges) despite a configured decay_rate. GLOBAL GAIN DAMPER (volatility-economy slice 3): every POSITIVE reputation gain is multiplied by reputation_gain_scaling (${reputationSystem.reputation_gain_scaling}) and rounded — applied per-source (no single chokepoint) at chart milestones (e-chart-reputation), release press coverage, PR-push/digital-ads marketing, and meeting immediate/delayed effects, via shared/utils/reputationScaling.scaleReputationGain. LOSSES ARE NOT SCALED (the flop penalty e-flop-reputation and negative meeting/rep-swing outcomes bite at full magnitude). C65 FIXED: the release press-coverage path — formerly the ONLY reputation write that skipped the 0-100 clamp — is now clamped to max_reputation (${reputationSystem.max_reputation}) like every other path.`,
  },
  {
    id: 'creative_capital',
    label: 'Creative Capital',
    domain: 'resources',
    col: 0,
    row: 2,
    description: `Starts at ${reputationSystem.starting_creative_capital} (progression.json reputation_system.starting_creative_capital). Gates action availability at the route/UI layer only — see non-edges (no engine revenue/quality/stream formula reads it). Set by meeting choices (ActionProcessor.ts:657).`,
  },
  {
    id: 'focus_slots',
    label: 'Focus Slots',
    domain: 'resources',
    col: 0,
    row: 3,
    description: `3 base slots; 4th unlocks at reputation ≥ ${progressionThresholds.fourth_focus_slot_reputation} (progression.json progression_thresholds.fourth_focus_slot_reputation), enforced game-engine.ts:393-402.`,
  },

  // Meetings & Events
  {
    id: 'executive_mood',
    label: 'Executive Mood',
    domain: 'meetings',
    col: 1,
    row: 0,
    description: `Scales that executive's meeting outcomes via shared/utils/executiveMoodModifier.ts, config from progression.json reputation_system.exec_mood_modifiers: disgruntled below ${execMoodModifiers.disgruntled_below} (cost ×${execMoodModifiers.cost_multiplier_disgruntled}), content above ${execMoodModifiers.content_above} (cost ×${execMoodModifiers.cost_multiplier_content}), inspired above ${execMoodModifiers.inspired_above} (additionally all non-money effects ×${execMoodModifiers.effect_multiplier_inspired}). Positive money effects are never scaled. Set via ActionProcessor.processExecutiveActions (ActionProcessor.ts:564). Executive Delegation & Trust arc Tier 1 (2026-07-12): mood gained a SECOND, distinct read — the SAME inspired/disgruntled boundaries also bias the risk appetite of an autonomously-resolved meeting's pick (a tie-break WITHIN the loyalty-band candidate set, not a replacement for it) — see edge e-execmood-autonomous-risk.`,
  },
  {
    id: 'executive_loyalty',
    label: 'Executive Loyalty',
    domain: 'meetings',
    col: 1,
    row: 1,
    description: `0-100. +${reputationSystem.executive_delegation?.loyalty_on_use ?? 5} when the exec is used in a meeting (ActionProcessor.ts:576); −${reputationSystem.executive_delegation?.loyalty_decay_per_week ?? 5}/week after ${reputationSystem.executive_delegation?.idle_weeks_before_decay ?? 3} consecutive weeks ignored, idle mood drifts ±5 toward 50 (ArtistStateProcessor.ts:414, :420-427). ALL of these constants are config-extracted (progression.json reputation_system.executive_delegation), Executive Delegation & Trust arc Tier 1 (2026-07-12). Still not read by any streams/quality/revenue formula, but as of this arc it IS read: loyalty now selects WHICH choice an un-acted exec makes when their meeting resolves autonomously (never-lapse) — see edges e-loyalty-autonomous-direction and e-loyalty-escalation.`,
  },
  {
    id: 'award_chances',
    label: 'Award Chances',
    domain: 'meetings',
    col: 1,
    row: 2,
    description: `A never-expiring pool, incremented by meeting choices (ActionProcessor.ts:1091). At campaign end: chance = min(${reputationSystem.award_chance_cap}, pool × ${reputationSystem.award_chance_per_point}) (progression.json award_chance_per_point / award_chance_cap), win adds +${reputationSystem.award_score_bonus} to the campaign score (progression.json award_score_bonus) via an isolated seeded roll — AchievementsEngine.ts:66-73. The score itself is a campaign-end abstraction with no dedicated system node, so this is not modeled as an edge.`,
  },
  {
    id: 'side_events',
    label: 'Side Events (Crisis)',
    domain: 'meetings',
    col: 1,
    row: 3,
    description: `A weekly seeded roll (weekly_chance in data/balance/events.json side_events, currently 20%) draws a side event in-stream — game-engine.ts checkForEvents, the fixed C64 stream position (never moved/reordered). MANDATORY mode (data/balance/events.json mandatory_side_events.enabled, default true): the rolled event is DEFERRED — stored on flags.pending_side_event and surfaced the FOLLOWING week as a crisis card that consumes ONE focus slot (threaded like arOfficeSlotUsed through the manual UI + AUTO), blocking the advance until the player picks. Its chosen effects apply DURING that week's advance (game-engine.ts processPendingSideEventResolution → ActionProcessor.applyEffects for immediate, delayed banked triggerWeek+1). One crisis at a time (a roll while one is pending still draws but discards). Kill-switch OFF restores the legacy in-results interactive beat (resolved via POST /api/game/:id/side-event-choice, lapses if unresolved). Cooldown event_cooldown weeks per event; category weights in event_weights. Executive Delegation & Trust arc Tier 2 (2026-07-12): a SECOND, roll-free injection path — escalation (game-engine.ts applyEscalation) can ALSO set flags.pending_side_event, roll-free, when a low-loyalty exec self-resolves an urgent meeting (see edge e-loyalty-escalation). Escalation runs before the weekly roll, so it wins any same-week collision by construction (the roll's own "already pending" check discards). Escalation-only events (data/events.json escalation_only: true, one per core-four archetype) are excluded from the weighted roll pool entirely — they can only ever fire via this path.`,
  },

  // Artist
  {
    id: 'artist_popularity',
    label: 'Artist Popularity',
    domain: 'artist',
    col: 2,
    row: 0,
    description: `Grows from streams (log-scaled) and tour attendance; feeds song_quality and streams calculations.`,
  },
  {
    id: 'artist_mood',
    label: 'Artist Mood',
    domain: 'artist',
    col: 2,
    row: 1,
    description: `Default 50. Feeds song_quality at generation time only (snapshotted — see non-edges for why it never moves an already-released song's streams). Set by meeting/dialogue choices (ActionProcessor.ts:660) and tour attendance (TourProcessor.ts:338-345). Also moved by RELEASE OUTCOMES (volatility-economy slice 2): a flop wounds the release artist (edge e-flop-artist-mood) and a breakthrough lifts the song artist (edge e-breakthrough-artist-mood). PASSIVE WEEKLY DRIFT toward neutral (liberated to config + amplified, slice 2): mood above threshold_high drifts down by drift_amount, below threshold_low drifts up — artists.json artist_stats.mood_drift { threshold_high 55, threshold_low 45, drift_amount ${(artists as any).artist_stats.mood_drift.drift_amount} (round-2 tuning 2026-07-12: 5 → 8, bands unchanged) }, ArtistStateProcessor.calculateNaturalMoodDrift.`,
  },
  {
    id: 'artist_energy',
    label: 'Artist Energy',
    domain: 'artist',
    col: 2,
    row: 2,
    description: `Default 50. Drives TOUR sell-through (balance-integrity slice 5): energyFactor = min + (max−min)×(energy/100) multiplies sell-through before the 1.0 cap (edge e-energy-tour). Still has NO effect on song_quality or streams (see non-edges). PASSIVE WEEKLY LIFECYCLE (volatility-economy slice 1 + C87), modeled here on the node like the mood/exec drift self-corrections rather than as edges — all clamped 0–100 in ArtistStateProcessor.applyArtistChangesToDatabase, zero RNG: (a) TOUR DRAIN −tour_revenue.energy_cost.per_city per city reveal (C87, TourProcessor.ts applyTourPerformanceImpacts); (b) RECORDING DRAIN −energy_lifecycle.recording_drain_per_week while any Single/EP project sits in the 'production' stage ("from the studio"); (c) IDLE RECOVERY +energy_lifecycle.idle_recovery_per_week when the artist has NO Mini-Tour in production and NO recording project in production ("a week to breathe"). Recording drain + idle recovery live in ArtistStateProcessor.processWeeklyEnergyLifecycle, config markets.json market_formulas.energy_lifecycle (enabled flag short-circuits both). Set/clamped also by meetings & dialogue (ActionProcessor.ts:765).`,
  },
  {
    id: 'song_quality',
    label: 'Song Quality',
    domain: 'artist',
    col: 2,
    row: 3,
    description: `25-98, computed once at generation (SongGenerationProcessor.calculateEnhancedSongQuality, SongGenerationProcessor.ts:385-573). As of slice 1 (knob liberation) the formula factors are read from quality.json song_quality_formula (a block DISTINCT from producer_tier_system/time_investment_system, which feed cost/duration) — see the quality edges.`,
  },

  // Production
  {
    id: 'producer_tier',
    label: 'Producer Tier',
    domain: 'production',
    col: 3,
    row: 0,
    description: `local / regional / national / legendary. Unlocks gated by reputation: regional ${producerTierSystem.regional.unlock_rep}, national ${producerTierSystem.national.unlock_rep}, legendary ${producerTierSystem.legendary.unlock_rep} (quality.json producer_tier_system.unlock_rep, game-engine.ts:1225).`,
  },
  {
    id: 'time_investment',
    label: 'Time Investment',
    domain: 'production',
    col: 3,
    row: 1,
    description: `rushed / standard / extended / perfectionist. quality.json's time_investment_system.multiplier and duration_modifier feed cost/duration only — the quality formula reads its OWN distinct set from quality.json song_quality_formula.time_multipliers (slice 1 knob liberation; see non-edges).`,
  },

  // Release & Marketing
  {
    id: 'hype_banked',
    label: 'Hype (Banked)',
    domain: 'release',
    col: 4,
    row: 0,
    description: `Label-pool flag (flags.pendingAwarenessBoost) + per-artist pools (flags.hypeArtistPools), 8-week expiry (markets.json awareness_system.pending_awareness_boost_expiry_weeks). Filled by meeting choices' awareness_boost effect (ActionProcessor.ts:945).`,
  },
  {
    id: 'awareness',
    label: 'Awareness',
    domain: 'release',
    col: 4,
    row: 1,
    description: `Live, per-song, 0-100. Builds weeks 1-4, decays week 5+ at ${awarenessSystem.awareness_decay_rates.standard_songs} standard / ${awarenessSystem.awareness_decay_rates.breakthrough_songs} breakthrough, −${awarenessSystem.awareness_decay_rates.quality_bonus_reduction} if quality ≥ ${awarenessSystem.awareness_decay_rates.quality_bonus_threshold} (markets.json awareness_system.awareness_decay_rates, ReleaseProcessor.ts:801-816).`,
  },
  {
    id: 'streams',
    label: 'Streams',
    domain: 'release',
    col: 4,
    row: 2,
    description: `Release-level config knobs that shape streams but aren't modeled as system nodes: release type multiplier (single ×${releasePlanning.release_type_bonuses.single.revenue_multiplier} / ep ×${releasePlanning.release_type_bonuses.ep.revenue_multiplier} / album ×${releasePlanning.release_type_bonuses.album.revenue_multiplier}, markets.json release_planning.release_type_bonuses, ReleaseProcessor.ts:269) and seasonal multiplier (q1 ×${markets.seasonal_modifiers.q1} / q2 ×${markets.seasonal_modifiers.q2} / q3 ×${markets.seasonal_modifiers.q3} / q4 ×${markets.seasonal_modifiers.q4}, markets.json seasonal_modifiers, ReleaseProcessor.ts:274).`,
  },
  {
    id: 'marketing_channels',
    label: 'Marketing Channels',
    domain: 'release',
    col: 4,
    row: 3,
    description: `radio / digital / pr / influencer. Effectiveness live in markets.json release_planning.marketing_channels: radio ${releasePlanning.marketing_channels.radio.effectiveness}, digital ${releasePlanning.marketing_channels.digital.effectiveness}, pr ${releasePlanning.marketing_channels.pr.effectiveness}, influencer ${releasePlanning.marketing_channels.influencer.effectiveness}.`,
  },
  {
    id: 'pending_quality_bonus',
    label: 'Pending Quality Bonus',
    domain: 'release',
    col: 4,
    row: 4,
    description: `Banked recording modifier, 8-week expiry (quality.json quality_system.pending_quality_bonus_expiry_weeks). Filled by meeting choices' quality_bonus effect (ActionProcessor.ts:921); consumed additively at song generation (SongGenerationProcessor.ts:553).`,
  },
  {
    id: 'pending_variance',
    label: 'Pending Variance',
    domain: 'release',
    col: 4,
    row: 5,
    description: `Banked recording modifier, 8-week expiry (quality.json quality_system.pending_variance_expiry_weeks). Filled by meeting choices' variance_up effect (ActionProcessor.ts:1024); consumed at song generation (SongGenerationProcessor.ts:486-495).`,
  },
  {
    id: 'press',
    label: 'Press',
    domain: 'release',
    col: 4,
    row: 6,
    description: `Pickups feed reputation. pressMomentum (+${pressCoverage.press_momentum_chance_per_point}/pt chance, −1/wk decay, ActionProcessor.ts:1115) and pressStoryFlag (+${pressCoverage.story_flag_bonus} next press roll, ${pressCoverage.press_story_flag_expiry_weeks}wk expiry, ActionProcessor.ts:897) are both meeting-choice-filled pools consumed by FinancialSystem.calculatePressPickups (FinancialSystem.ts:1898-1939).`,
  },

  // Live & Charts
  {
    id: 'tour_revenue',
    label: 'Tour Revenue',
    domain: 'live',
    col: 5,
    row: 0,
    description: `TourProcessor.ts + FinancialSystem.ts:796-928.`,
  },
  {
    id: 'chart_position',
    label: 'Chart Position',
    domain: 'live',
    col: 5,
    row: 1,
    description: `1-100 vs competitors, ranked weekly by streams (ChartService.ts:139,161-172).`,
  },
  {
    id: 'access_tiers',
    label: 'Access Tiers',
    domain: 'live',
    col: 5,
    row: 2,
    description: `×3 rep-gated tiers: playlist, press, venue. Venue capacity ranges live in progression.json access_tier_system.venue_access.capacity_range: clubs ${JSON.stringify(accessTierSystem.venue_access.clubs.capacity_range)}, theaters ${JSON.stringify(accessTierSystem.venue_access.theaters.capacity_range)}, arenas ${JSON.stringify(accessTierSystem.venue_access.arenas.capacity_range)}.`,
  },
];

export const NODES_BY_ID: Record<string, SystemNode> = Object.fromEntries(NODES.map((n) => [n.id, n]));

// ─────────────────────────────────────────────────────────────────────────────
// Edges
// ─────────────────────────────────────────────────────────────────────────────

export const EDGES: SystemEdge[] = [
  {
    id: 'e-quality-streams-base',
    from: 'song_quality',
    to: 'streams',
    mechanism: 'Streaming outcome — quality component + global modifiers',
    formula: 'streams = quality × quality_weight × (playlist + reputation + marketing + popularity components) × rand(0.9,1.1) × first_week_multiplier × base_streams_per_point',
    values: [
      { label: 'quality_weight', value: streamingCalc.quality_weight, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.quality_weight', ref: 'FinancialSystem.ts:748' },
      { label: 'first_week_multiplier', value: streamingCalc.first_week_multiplier, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.first_week_multiplier', ref: 'FinancialSystem.ts:777' },
      { label: 'variance range (rand)', value: JSON.stringify(streamingCalc.variance_range), source: 'live', configPath: 'markets.market_formulas.streaming_calculation.variance_range', ref: 'FinancialSystem.calculateStreamingOutcome' },
      { label: 'base_streams_per_point', value: streamingCalc.base_streams_per_point, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.base_streams_per_point', ref: 'server/data/gameData.ts getStreamingConfigSync' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.calculateStreamingOutcome, FinancialSystem.ts:726-789',
    note: 'Knob liberation (slice 1): variance_range + base_streams_per_point moved to markets.json streaming_calculation; the gameData.ts:462 literal shadow is resolved.',
  },
  {
    id: 'e-access-streams-playlist',
    from: 'access_tiers',
    to: 'streams',
    mechanism: 'Streaming outcome — playlist reach component',
    formula: 'component = reach_multiplier × playlist_weight × PLAYLIST_COMPONENT_SCALE',
    values: [
      { label: 'playlist_weight', value: streamingCalc.playlist_weight, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.playlist_weight', ref: 'FinancialSystem.ts:749' },
      { label: 'playlist_component_scale', value: streamingCalc.playlist_component_scale, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.playlist_component_scale', ref: 'FinancialSystem.calculateStreamingOutcome' },
      { label: 'reach_multiplier (none/niche/mid/flagship)', value: '0.1 / 0.4 / 0.8 / 1.5', source: 'live', configPath: 'progression.access_tier_system.playlist_access.*.reach_multiplier' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.calculateStreamingOutcome, FinancialSystem.ts:749',
    note: 'Knob liberation (slice 1): PLAYLIST_COMPONENT_SCALE moved to markets.json streaming_calculation.playlist_component_scale.',
  },
  {
    id: 'e-reputation-streams-base',
    from: 'reputation',
    to: 'streams',
    mechanism: 'Streaming outcome — reputation component',
    formula: 'component = reputation × reputation_weight',
    values: [
      { label: 'reputation_weight', value: streamingCalc.reputation_weight, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.reputation_weight', ref: 'FinancialSystem.ts:750' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.calculateStreamingOutcome, FinancialSystem.ts:750',
  },
  {
    id: 'e-marketing-streams-base',
    from: 'marketing_channels',
    to: 'streams',
    mechanism: 'Streaming outcome — ad-spend component (per-song, at generation)',
    formula: 'component = sqrt(adSpend / 1000) × marketing_weight × 50',
    values: [
      { label: 'marketing_weight', value: streamingCalc.marketing_weight, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.marketing_weight', ref: 'FinancialSystem.ts:751' },
      { label: 'divisor', value: streamingCalc.marketing_scale_divisor, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.marketing_scale_divisor', ref: 'FinancialSystem.calculateStreamingOutcome' },
      { label: 'multiplier', value: streamingCalc.marketing_scale_multiplier, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.marketing_scale_multiplier', ref: 'FinancialSystem.calculateStreamingOutcome' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.calculateStreamingOutcome, FinancialSystem.ts:751',
    note: 'Knob liberation (slice 1): MARKETING_SCALE divisor/multiplier moved to markets.json streaming_calculation.',
  },
  {
    id: 'e-popularity-streams-base',
    from: 'artist_popularity',
    to: 'streams',
    mechanism: 'Streaming outcome — popularity component + star power amplification',
    formula: 'component = popularity × popularity_weight; starPower = 1 + (popularity/100) × max_multiplier',
    values: [
      { label: 'popularity_weight', value: streamingCalc.popularity_weight, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.popularity_weight', ref: 'FinancialSystem.ts:752' },
      { label: 'star_power max_multiplier', value: streamingCalc.star_power_amplification.max_multiplier, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.star_power_amplification.max_multiplier', ref: 'FinancialSystem.ts:757' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.calculateStreamingOutcome, FinancialSystem.ts:752,757',
  },
  {
    id: 'e-marketing-streams-release-budget',
    from: 'marketing_channels',
    to: 'streams',
    mechanism: 'Release aggregation — marketing budget multiplier',
    formula: 'multiplier = 1 + sqrt(totalBudget / 5000) × 0.25 × 3 × weightedEffectiveness',
    values: [
      { label: 'channel effectiveness (radio/digital/pr/influencer)', value: `${releasePlanning.marketing_channels.radio.effectiveness} / ${releasePlanning.marketing_channels.digital.effectiveness} / ${releasePlanning.marketing_channels.pr.effectiveness} / ${releasePlanning.marketing_channels.influencer.effectiveness}`, source: 'live', configPath: 'markets.market_formulas.release_planning.marketing_channels.*.effectiveness', ref: 'ReleaseProcessor.ts:287-302' },
      { label: 'divisor', value: 5000, source: 'hardcoded', ref: 'ReleaseProcessor.ts:302' },
      { label: 'scale', value: 3, source: 'hardcoded', ref: 'ReleaseProcessor.ts:302' },
    ],
    hardcoded: true,
    ref: 'ReleaseProcessor.calculateReleasePerformance, ReleaseProcessor.ts:287-302',
  },
  {
    id: 'e-marketing-streams-diversity-synergy',
    from: 'marketing_channels',
    to: 'streams',
    mechanism: 'Release aggregation — channel diversity + synergy bonuses',
    formula: 'diversity = min(1.4, 1 + (n-1) × 0.08); synergy: radio+digital +0.15, pr+influencer +0.12, all 4 +0.10',
    values: [
      { label: 'diversity_bonus (base/per-channel/max)', value: `${releasePlanning.diversity_bonus.base} / ${releasePlanning.diversity_bonus.per_additional_channel} / ${releasePlanning.diversity_bonus.maximum}`, source: 'live', configPath: 'markets.market_formulas.release_planning.diversity_bonus', ref: 'ReleaseProcessor.ts:306' },
      { label: 'synergy (radio+digital / pr+influencer / full spectrum)', value: `${releasePlanning.channel_synergy_bonuses.radio_digital} / ${releasePlanning.channel_synergy_bonuses.pr_influencer} / ${releasePlanning.channel_synergy_bonuses.full_spectrum}`, source: 'live', configPath: 'markets.market_formulas.release_planning.channel_synergy_bonuses', ref: 'ReleaseProcessor.ts:317-328' },
    ],
    hardcoded: false,
    ref: 'ReleaseProcessor.calculateReleasePerformance, ReleaseProcessor.ts:306,317-328',
  },
  {
    id: 'e-marketing-streams-lead-single',
    from: 'marketing_channels',
    to: 'streams',
    mechanism: 'Release aggregation — lead single strategy',
    formula: 'bonus = timingBonus × (1 + sqrt(leadBudget / budget_scaling_factor) × marketing_effectiveness_factor)',
    values: [
      { label: 'optimal (wks 1-2) / good (wk 3) / default timing bonus', value: `${releasePlanning.lead_single_strategy.optimal_timing_bonus} / ${releasePlanning.lead_single_strategy.good_timing_bonus} / ${releasePlanning.lead_single_strategy.default_bonus}`, source: 'live', configPath: 'markets.market_formulas.release_planning.lead_single_strategy', ref: 'ReleaseProcessor.ts:347-365' },
      { label: 'marketing_effectiveness_factor', value: releasePlanning.lead_single_strategy.marketing_effectiveness_factor, source: 'live', configPath: 'markets.market_formulas.release_planning.lead_single_strategy.marketing_effectiveness_factor' },
      { label: 'budget_scaling_factor', value: releasePlanning.lead_single_strategy.budget_scaling_factor, source: 'live', configPath: 'markets.market_formulas.release_planning.lead_single_strategy.budget_scaling_factor' },
    ],
    hardcoded: false,
    ref: 'ReleaseProcessor.calculateReleasePerformance, ReleaseProcessor.ts:347-365',
  },
  {
    id: 'e-streams-money-ongoing',
    from: 'streams',
    to: 'money',
    mechanism: 'Ongoing (decayed) weekly revenue',
    formula: 'weeklyRevenue = max(min_revenue, weeklyStreams × revenue_per_stream); weeklyStreams = initialStreams × decay_rate^weeks × repBonus × accessBonus × ongoing_factor, capped at max_decay_weeks',
    values: [
      { label: 'revenue_per_stream', value: ongoingStreams.revenue_per_stream, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.ongoing_streams.revenue_per_stream', ref: 'FinancialSystem.ts:1053' },
      { label: 'minimum_revenue_threshold', value: ongoingStreams.minimum_revenue_threshold, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.ongoing_streams.minimum_revenue_threshold' },
      { label: 'weekly_decay_rate', value: ongoingStreams.weekly_decay_rate, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.ongoing_streams.weekly_decay_rate', ref: 'FinancialSystem.ts:1009' },
      { label: 'ongoing_factor', value: ongoingStreams.ongoing_factor, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.ongoing_streams.ongoing_factor' },
      { label: 'max_decay_weeks', value: ongoingStreams.max_decay_weeks, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.ongoing_streams.max_decay_weeks' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.calculateDecayRevenue, FinancialSystem.ts:935-1063',
  },
  {
    id: 'e-reputation-streams-ongoing',
    from: 'reputation',
    to: 'streams',
    mechanism: 'Ongoing revenue — reputation bonus',
    formula: 'bonus = 1 + (reputation - 50) × reputation_bonus_factor',
    values: [
      { label: 'baseline', value: ongoingStreams.reputation_baseline, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.ongoing_streams.reputation_baseline', ref: 'FinancialSystem.calculateDecayRevenue' },
      { label: 'reputation_bonus_factor', value: ongoingStreams.reputation_bonus_factor, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.ongoing_streams.reputation_bonus_factor', ref: 'FinancialSystem.ts:973' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.calculateDecayRevenue, FinancialSystem.ts:973',
    note: 'Knob liberation (slice 1): REPUTATION_BASELINE moved to markets.json ongoing_streams.reputation_baseline.',
  },
  {
    id: 'e-access-streams-ongoing',
    from: 'access_tiers',
    to: 'streams',
    mechanism: 'Ongoing revenue — playlist access bonus',
    formula: 'bonus = 1 + (reachMultiplier - 1) × access_tier_bonus_factor',
    values: [
      { label: 'access_tier_bonus_factor', value: ongoingStreams.access_tier_bonus_factor, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.ongoing_streams.access_tier_bonus_factor', ref: 'FinancialSystem.ts:975' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.calculateDecayRevenue, FinancialSystem.ts:975',
  },
  {
    id: 'e-marketing-streams-ongoing',
    from: 'marketing_channels',
    to: 'streams',
    mechanism: 'Ongoing revenue — weeks 2-4 channel bonuses',
    formula: 'radio: (spend/divisor) × effectiveness × scale; digital similar; pr peaks week 3 (×week3_multiplier), else ×off_peak_multiplier; total capped at max_boost',
    values: [
      { label: 'radio (divisor/effectiveness/scale)', value: `${ongoingMarketingFactor.radio.divisor} / ${ongoingMarketingFactor.radio.effectiveness} / ${ongoingMarketingFactor.radio.scale}`, source: 'live', configPath: 'markets.market_formulas.ongoing_marketing_factor.radio', ref: 'FinancialSystem.calculateMarketingFactor' },
      { label: 'digital (divisor/effectiveness/scale)', value: `${ongoingMarketingFactor.digital.divisor} / ${ongoingMarketingFactor.digital.effectiveness} / ${ongoingMarketingFactor.digital.scale}`, source: 'live', configPath: 'markets.market_formulas.ongoing_marketing_factor.digital' },
      { label: 'pr (divisor/effectiveness/scale/wk3×/off-peak×)', value: `${ongoingMarketingFactor.pr.divisor} / ${ongoingMarketingFactor.pr.effectiveness} / ${ongoingMarketingFactor.pr.scale} / ${ongoingMarketingFactor.pr.week3_multiplier} / ${ongoingMarketingFactor.pr.off_peak_multiplier}`, source: 'live', configPath: 'markets.market_formulas.ongoing_marketing_factor.pr' },
      { label: 'influencer (divisor/effectiveness/scale)', value: `${ongoingMarketingFactor.influencer.divisor} / ${ongoingMarketingFactor.influencer.effectiveness} / ${ongoingMarketingFactor.influencer.scale}`, source: 'live', configPath: 'markets.market_formulas.ongoing_marketing_factor.influencer' },
      { label: 'max_boost', value: ongoingMarketingFactor.max_boost, source: 'live', configPath: 'markets.market_formulas.ongoing_marketing_factor.max_boost' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.calculateMarketingFactor, FinancialSystem.ts:1085-1111',
    note: 'Knob liberation (slice 1): weeks-2-4 per-channel coefficients + cap moved to markets.json ongoing_marketing_factor.',
  },
  {
    id: 'e-awareness-streams-ongoing',
    from: 'awareness',
    to: 'streams',
    mechanism: 'Ongoing revenue — awareness impact, weeks 5+',
    formula: 'bonus = 1 + (awareness/100) × impact; impact = weeks_3_6 for wks5-6, weeks_7_plus for wks7+; cap max_awareness_modifier',
    values: [
      { label: 'weeks_1_2 / weeks_3_6 / weeks_7_plus impact', value: `${awarenessSystem.awareness_impact_factors.weeks_1_2} / ${awarenessSystem.awareness_impact_factors.weeks_3_6} / ${awarenessSystem.awareness_impact_factors.weeks_7_plus}`, source: 'live', configPath: 'markets.market_formulas.awareness_system.awareness_impact_factors', ref: 'FinancialSystem.ts:1029-1042' },
      { label: 'max_awareness_modifier', value: awarenessSystem.max_awareness_modifier, source: 'live', configPath: 'markets.market_formulas.awareness_system.max_awareness_modifier' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.calculateDecayRevenue, FinancialSystem.ts:1029-1042',
  },
  {
    id: 'e-awareness-streams-breakthrough',
    from: 'awareness',
    to: 'streams',
    mechanism: 'Ongoing revenue — breakthrough growth effect',
    formula: 'growth 1.2-1.4× for stream_growth_duration weeks, then decay at enhanced_decay_rate',
    values: [
      { label: 'awareness_multiplier / stream_growth_duration / enhanced_decay_rate', value: `${awarenessSystem.breakthrough_effects.awareness_multiplier} / ${awarenessSystem.breakthrough_effects.stream_growth_duration} / ${awarenessSystem.breakthrough_effects.enhanced_decay_rate}`, source: 'live', configPath: 'markets.market_formulas.awareness_system.breakthrough_effects', ref: 'FinancialSystem.ts:985-999' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.calculateDecayRevenue, FinancialSystem.ts:985-999',
  },
  {
    id: 'e-marketing-awareness-build',
    from: 'marketing_channels',
    to: 'awareness',
    mechanism: 'Awareness build, weeks 1-4',
    formula: 'awareness += Σ(spend/1000 × coeff) × (quality/100) × (1 + popularity/200), capped at +25/week',
    values: [
      { label: 'radio/digital/pr/influencer coefficients', value: `${awarenessSystem.channel_awareness_coefficients.radio} / ${awarenessSystem.channel_awareness_coefficients.digital} / ${awarenessSystem.channel_awareness_coefficients.pr} / ${awarenessSystem.channel_awareness_coefficients.influencer}`, source: 'live', configPath: 'markets.market_formulas.awareness_system.channel_awareness_coefficients', ref: 'FinancialSystem.ts:1132-1198' },
      { label: 'weekly cap', value: 25, source: 'hardcoded', ref: 'FinancialSystem.ts:1132-1198 (called from ReleaseProcessor.ts:727)' },
    ],
    hardcoded: true,
    ref: 'FinancialSystem calculation, called ReleaseProcessor.ts:727',
  },
  {
    id: 'e-quality-awareness-breakthrough',
    from: 'song_quality',
    to: 'awareness',
    mechanism: 'Breakthrough roll (weeks 3-6) + decay reduction',
    formula: 'potential = min(awareness/needed, 1) × baseChance; roll = (sin(seed)+1)/2; on hit awareness × 2.5. Also: decay rate −0.01 if quality ≥ 85.',
    values: [
      { label: 'high_quality (min_quality / awareness_needed / base_chance)', value: `${awarenessSystem.breakthrough_thresholds.high_quality.min_quality} / ${awarenessSystem.breakthrough_thresholds.high_quality.awareness_needed} / ${awarenessSystem.breakthrough_thresholds.high_quality.base_chance}`, source: 'live', configPath: 'markets.market_formulas.awareness_system.breakthrough_thresholds.high_quality', ref: 'ReleaseProcessor.ts:738-743' },
      { label: 'medium_quality (min_quality / awareness_needed / base_chance)', value: `${awarenessSystem.breakthrough_thresholds.medium_quality.min_quality} / ${awarenessSystem.breakthrough_thresholds.medium_quality.awareness_needed} / ${awarenessSystem.breakthrough_thresholds.medium_quality.base_chance}`, source: 'live', configPath: 'markets.market_formulas.awareness_system.breakthrough_thresholds.medium_quality' },
      { label: 'low_quality (min_quality / awareness_needed / base_chance)', value: `${awarenessSystem.breakthrough_thresholds.low_quality.min_quality} / ${awarenessSystem.breakthrough_thresholds.low_quality.awareness_needed} / ${awarenessSystem.breakthrough_thresholds.low_quality.base_chance}`, source: 'live', configPath: 'markets.market_formulas.awareness_system.breakthrough_thresholds.low_quality' },
      { label: 'awareness multiplier on hit', value: awarenessSystem.breakthrough_effects.awareness_multiplier, source: 'live', configPath: 'markets.market_formulas.awareness_system.breakthrough_effects.awareness_multiplier', ref: 'ReleaseProcessor.ts:757' },
      { label: 'decay reduction at quality≥85', value: awarenessSystem.awareness_decay_rates.quality_bonus_reduction, source: 'live', configPath: 'markets.market_formulas.awareness_system.awareness_decay_rates.quality_bonus_reduction', ref: 'ReleaseProcessor.ts:801-816' },
    ],
    hardcoded: false,
    ref: 'ReleaseProcessor.ts:738-757, 801-816',
    note: 'C79 RESOLVED (slice 1, knob liberation): the breakthrough tier thresholds now READ markets.json awareness_system.breakthrough_thresholds (values were byte-identical to the old literals) — the shadow is gone.',
  },
  {
    id: 'e-hype-awareness-attach',
    from: 'hype_banked',
    to: 'awareness',
    mechanism: 'Pre-banked hype attaches at plan time',
    formula: 'initialAwareness = pool × awareness_boost_points_per_unit',
    values: [
      { label: 'awareness_boost_points_per_unit', value: awarenessSystem.awareness_boost_points_per_unit, source: 'live', configPath: 'markets.market_formulas.awareness_system.awareness_boost_points_per_unit', ref: 'ReleaseProcessor.ts:1254' },
    ],
    hardcoded: false,
    ref: 'ReleaseProcessor.ts:1254',
  },
  {
    id: 'e-streams-popularity',
    from: 'streams',
    to: 'artist_popularity',
    mechanism: 'Log-scaled popularity growth',
    formula: 'threshold = base × exp_base^(pop/divisor); points = min(cap, log10(streams/threshold)); mult = dim_base + dim_range/(1+(pop/saturation)^exp)',
    values: [
      { label: 'base_threshold', value: popularitySaturation.base_threshold, source: 'live', configPath: 'markets.market_formulas.popularity_saturation.base_threshold', ref: 'ReleaseProcessor.calculateStreamingPopularityBonus' },
      { label: 'saturation_point', value: popularitySaturation.saturation_point, source: 'live', configPath: 'markets.market_formulas.popularity_saturation.saturation_point' },
      { label: 'threshold exp_base / divisor', value: `${popularitySaturation.dynamic_threshold_exponent_base} / ${popularitySaturation.dynamic_threshold_divisor}`, source: 'live', configPath: 'markets.market_formulas.popularity_saturation' },
      { label: 'max_stream_points / saturation_exponent', value: `${popularitySaturation.max_stream_points} / ${popularitySaturation.saturation_exponent}`, source: 'live', configPath: 'markets.market_formulas.popularity_saturation' },
      { label: 'diminishing base / range / min_bonus', value: `${popularitySaturation.diminishing_multiplier_base} / ${popularitySaturation.diminishing_multiplier_range} / ${popularitySaturation.min_bonus}`, source: 'live', configPath: 'markets.market_formulas.popularity_saturation' },
    ],
    hardcoded: false,
    ref: 'ReleaseProcessor.ts:619-648, 861-863',
    note: 'Knob liberation (slice 1): baseThreshold/saturationPoint + shape constants moved to markets.json popularity_saturation (Slice 6 reuses this block for tour saturation).',
  },
  {
    id: 'e-producer-quality',
    from: 'producer_tier',
    to: 'song_quality',
    mechanism: 'Talent/producer skill blend',
    formula: 'quality = talent × 0.65 + producerSkill × 0.35',
    values: [
      { label: 'weights (talent/producer)', value: `${songQualityFormula.talent_weight} / ${songQualityFormula.producer_weight}`, source: 'live', configPath: 'quality.song_quality_formula.talent_weight / producer_weight', ref: 'SongGenerationProcessor.calculateEnhancedSongQuality' },
      { label: 'skill map (local/regional/national/legendary)', value: `${songQualityFormula.producer_skill_map.local} / ${songQualityFormula.producer_skill_map.regional} / ${songQualityFormula.producer_skill_map.national} / ${songQualityFormula.producer_skill_map.legendary}`, source: 'live', configPath: 'quality.song_quality_formula.producer_skill_map' },
    ],
    hardcoded: false,
    ref: 'SongGenerationProcessor.calculateEnhancedSongQuality, SongGenerationProcessor.ts:395-405',
    note: 'Knob liberation (slice 1): the quality skill-map + weights now live in quality.json song_quality_formula (DISTINCT from producer_tier_system.multiplier, which still only feeds cost/duration — see non-edges).',
  },
  {
    id: 'e-time-quality',
    from: 'time_investment',
    to: 'song_quality',
    mechanism: 'Time multiplier + work ethic',
    formula: 'quality *= timeMult × (1 + workEthic/100 × 0.3)',
    values: [
      { label: 'timeMult (rushed/standard/extended/perfectionist)', value: `${songQualityFormula.time_multipliers.rushed} / ${songQualityFormula.time_multipliers.standard} / ${songQualityFormula.time_multipliers.extended} / ${songQualityFormula.time_multipliers.perfectionist}`, source: 'live', configPath: 'quality.song_quality_formula.time_multipliers', ref: 'SongGenerationProcessor.calculateEnhancedSongQuality' },
      { label: 'work ethic scale', value: songQualityFormula.work_ethic_max_bonus, source: 'live', configPath: 'quality.song_quality_formula.work_ethic_max_bonus' },
    ],
    hardcoded: false,
    ref: 'SongGenerationProcessor.ts:409-418',
    note: 'Knob liberation (slice 1): the quality TIME multipliers now live in quality.json song_quality_formula.time_multipliers (DISTINCT from time_investment_system.multiplier, which still only feeds cost/duration — see non-edges).',
  },
  {
    id: 'e-popularity-quality',
    from: 'artist_popularity',
    to: 'song_quality',
    mechanism: 'Popularity bonus + release fatigue',
    formula: 'quality *= 0.95 + 0.1 × sqrt(pop/100); fatigue *= 0.97^max(0, releaseCount-3)',
    values: [
      { label: 'popularity bonus coefficients', value: `${songQualityFormula.popularity_factor_base} / ${songQualityFormula.popularity_factor_range}`, source: 'live', configPath: 'quality.song_quality_formula.popularity_factor_base / popularity_factor_range', ref: 'SongGenerationProcessor.ts:423' },
      { label: 'fatigue base / free releases', value: `${songQualityFormula.fatigue_base} / ${songQualityFormula.fatigue_free_songs}`, source: 'live', configPath: 'quality.song_quality_formula.fatigue_base / fatigue_free_songs', ref: 'SongGenerationProcessor.ts:429' },
    ],
    hardcoded: false,
    ref: 'SongGenerationProcessor.ts:423,429',
    note: 'Knob liberation (slice 1): popularity + fatigue quality coefficients moved to quality.json song_quality_formula.',
  },
  {
    id: 'e-money-quality',
    from: 'money',
    to: 'song_quality',
    mechanism: 'Recording budget multiplier',
    formula: 'piecewise budget multiplier, clamp [min_multiplier, max_multiplier], dampened by efficiency_dampening.factor',
    values: [
      { label: 'min / max multiplier', value: `${budgetQualitySystem.min_multiplier} / ${budgetQualitySystem.max_multiplier}`, source: 'live', configPath: 'quality.quality_system.budget_quality_system.min_multiplier / max_multiplier', ref: 'SongGenerationProcessor.ts:434' },
      { label: 'efficiency_dampening.factor', value: budgetQualitySystem.efficiency_dampening.factor, source: 'live', configPath: 'quality.quality_system.budget_quality_system.efficiency_dampening.factor' },
    ],
    hardcoded: false,
    ref: 'SongGenerationProcessor.ts:434',
  },
  {
    id: 'e-mood-quality',
    from: 'artist_mood',
    to: 'song_quality',
    mechanism: 'Mood multiplier + variance widening (snapshotted at generation)',
    formula: 'quality *= 0.9 + 0.2 × (mood/100)  •  varianceBand *= 1 + max(0, (mood_baseline − mood)/mood_baseline) × mood_variance_widening_max',
    values: [
      { label: 'mood multiplier coefficients', value: `${songQualityFormula.mood_factor_base} / ${songQualityFormula.mood_factor_range}`, source: 'live', configPath: 'quality.song_quality_formula.mood_factor_base / mood_factor_range', ref: 'SongGenerationProcessor.ts:445' },
      { label: 'variance widening (baseline / max)', value: `${songQualityFormula.mood_baseline} / ${songQualityFormula.mood_variance_widening_max}`, source: 'live', configPath: 'quality.song_quality_formula.mood_baseline / mood_variance_widening_max', ref: 'SongGenerationProcessor.calculateEnhancedSongQuality (computeMoodVarianceWiden)' },
    ],
    hardcoded: false,
    ref: 'SongGenerationProcessor.ts:445',
    note: 'Two distinct effects. (1) Knob liberation (slice 1): mood quality coefficients moved to quality.json song_quality_formula — the unchanged 0.9–1.1 mean multiplier. (2) Mood → variance widening (slice 4): low mood WIDENS the variance band (volatile, not uniformly worse); mood ≥ mood_baseline (50) → ×1.0 (no narrowing above baseline), mood 0 → ×1.4. No RNG draw added/reordered — only the band width scales.',
  },
  {
    id: 'e-variance-quality',
    from: 'pending_variance',
    to: 'song_quality',
    mechanism: 'Variance band widen + outlier chance',
    formula: 'band *= 1 + pool × variance_widen_per_point; outlierChance += pool × outlier_chance_bonus_per_point',
    values: [
      { label: 'variance_widen_per_point', value: qualitySystem.variance_widen_per_point, source: 'live', configPath: 'quality.quality_system.variance_widen_per_point', ref: 'SongGenerationProcessor.ts:486-495' },
      { label: 'outlier_chance_bonus_per_point', value: qualitySystem.outlier_chance_bonus_per_point, source: 'live', configPath: 'quality.quality_system.outlier_chance_bonus_per_point' },
    ],
    hardcoded: false,
    ref: 'SongGenerationProcessor.ts:486-495',
  },
  {
    id: 'e-pending-bonus-quality',
    from: 'pending_quality_bonus',
    to: 'song_quality',
    mechanism: 'Additive bonus, then clamp',
    formula: 'quality = clamp(quality + pool, 25, 98)',
    values: [
      { label: 'clamp bounds', value: '[25, 98]', source: 'hardcoded', ref: 'SongGenerationProcessor.ts:553' },
    ],
    hardcoded: true,
    ref: 'SongGenerationProcessor.ts:553',
  },
  {
    id: 'e-reputation-tour',
    from: 'reputation',
    to: 'tour_revenue',
    mechanism: 'Sell-through — reputation modifier',
    formula: 'sellThrough += (reputation/100) × reputation_modifier',
    values: [
      { label: 'reputation_modifier', value: tourRevenue.reputation_modifier, source: 'live', configPath: 'markets.market_formulas.tour_revenue.reputation_modifier', ref: 'FinancialSystem.ts:817' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.ts:796-928, :817',
  },
  {
    id: 'e-popularity-tour',
    from: 'artist_popularity',
    to: 'tour_revenue',
    mechanism: 'Sell-through — popularity weight',
    formula: 'sellThrough += (popularity/100) × local_popularity_weight × effectiveness',
    values: [
      { label: 'local_popularity_weight', value: tourRevenue.local_popularity_weight, source: 'live', configPath: 'markets.market_formulas.tour_revenue.local_popularity_weight', ref: 'FinancialSystem.ts:818' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.ts:818',
  },
  {
    id: 'e-energy-tour',
    from: 'artist_energy',
    to: 'tour_revenue',
    mechanism: 'Sell-through — energy effectiveness multiplier',
    formula: 'energyFactor = energy_min + (energy_max − energy_min) × (energy/100); sellThrough = min(1.0, (base + reputation + popularity + budget + venueSize) × energyFactor)',
    values: [
      { label: 'enabled', value: String(tourRevenue.energy_effectiveness.enabled), source: 'live', configPath: 'markets.market_formulas.tour_revenue.energy_effectiveness.enabled' },
      { label: 'min / max (energy 0 → min, 100 → max, default 50 → 0.975)', value: `${tourRevenue.energy_effectiveness.min} / ${tourRevenue.energy_effectiveness.max}`, source: 'live', configPath: 'markets.market_formulas.tour_revenue.energy_effectiveness', ref: 'FinancialSystem.computeEnergyFactor' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.ts calculateSellThroughBreakdown / calculateTourRevenueWithCapacity',
    note: 'Balance-integrity slice 5: artist energy finally consumed. Multiplies the summed sell-through BEFORE the 1.0 cap — a rested act (energy 100 → ×1.05) sells the room harder; a run-down one (energy 10 → ×0.915) does not. Threaded through TourProcessor execution + estimatePlanningForeshadow so preview matches the roll.',
  },
  {
    id: 'e-money-tour',
    from: 'money',
    to: 'tour_revenue',
    mechanism: 'Sell-through — marketing budget',
    formula: 'sellThrough = sell_through_base + (budget/capacity) × 11/100 × 0.15',
    values: [
      { label: 'sell_through_base', value: tourRevenue.sell_through_base, source: 'live', configPath: 'markets.market_formulas.tour_revenue.sell_through_base' },
      { label: 'budget_sell_through_coefficient', value: tourRevenue.budget_sell_through_coefficient, source: 'live', configPath: 'markets.market_formulas.tour_revenue.budget_sell_through_coefficient', ref: 'FinancialSystem.ts:819' },
      { label: 'budget_sell_through_scale', value: tourRevenue.budget_sell_through_scale, source: 'live', configPath: 'markets.market_formulas.tour_revenue.budget_sell_through_scale' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.ts:819',
    note: 'Knob liberation (slice 1): budget sell-through coefficients (11, 0.15) moved to markets.json tour_revenue; formula is (budget/capacity) × coeff/100 × scale.',
  },
  {
    id: 'e-access-tour-scaling',
    from: 'access_tiers',
    to: 'tour_revenue',
    mechanism: 'Venue capacity scaling + ticket price',
    formula: 'venueSizeModifier = (1-posInTier) × 0.5; popularityEffectiveness = 1-posInTier × 0.3; ticket = ticket_price_base × (1 + (pop/100) × (2.5 - posInTier×2)), cap-mult 0.003',
    values: [
      { label: 'venue_size_bonus / popularity_scaling_factor', value: `${tourVenueScaling.venue_size_bonus} / ${tourVenueScaling.popularity_scaling_factor}`, source: 'live', configPath: 'markets.market_formulas.tour_revenue.venue_scaling', ref: 'FinancialSystem.getTourFormulas' },
      { label: 'ticket_price_base', value: tourRevenue.ticket_price_base, source: 'live', configPath: 'markets.market_formulas.tour_revenue.ticket_price_base', ref: 'FinancialSystem.ts:463' },
      { label: 'ticket scarcity (max_multiplier / position_penalty) + capacity mult', value: `${tourRevenue.ticket_scarcity_max_multiplier} / ${tourRevenue.ticket_scarcity_position_penalty} / ${tourVenueScaling.ticket_price_capacity_multiplier}`, source: 'live', configPath: 'markets.market_formulas.tour_revenue.ticket_scarcity_max_multiplier / ticket_scarcity_position_penalty / venue_scaling.ticket_price_capacity_multiplier', ref: 'FinancialSystem.calculateTicketPrice' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.ts:461-463, 643',
    note: 'Knob liberation (slice 1): VENUE_SCALING + ticket scarcity constants moved to markets.json tour_revenue.venue_scaling / ticket_scarcity_*.',
  },
  {
    id: 'e-tour-aggregation',
    from: 'access_tiers',
    to: 'tour_revenue',
    mechanism: 'Final revenue aggregation + costs',
    formula: 'revenue = capacity × sellThrough × ticket × (1 + merch_percentage) × cities; costs = venue cap×4 + production cap×2.7 per city',
    values: [
      { label: 'merch_percentage', value: tourRevenue.merch_percentage, source: 'live', configPath: 'markets.market_formulas.tour_revenue.merch_percentage', ref: 'FinancialSystem.ts:825-829' },
      { label: 'venue cost / production cost per-capacity', value: `×${tourRevenue.venue_fee_per_capacity} / ×${tourRevenue.production_fee_per_capacity}`, source: 'live', configPath: 'markets.market_formulas.tour_revenue.venue_fee_per_capacity / production_fee_per_capacity', ref: 'FinancialSystem.ts:807-808' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.ts:807-808, 825-829',
    note: 'Knob liberation (slice 1): per-city venue/production cost multipliers moved to markets.json tour_revenue.',
  },
  {
    id: 'e-tour-mood',
    from: 'tour_revenue',
    to: 'artist_mood',
    mechanism: 'Attendance-based mood swing',
    formula: `<${tourRevenue.mood_reactions.poor_threshold}% → ${tourRevenue.mood_reactions.poor_delta}; –${tourRevenue.mood_reactions.neutral_max}% → ${tourRevenue.mood_reactions.neutral_delta}; –${tourRevenue.mood_reactions.good_max}% → +${tourRevenue.mood_reactions.good_delta}; >${tourRevenue.mood_reactions.good_max}% → +${tourRevenue.mood_reactions.great_delta}`,
    values: [
      { label: 'thresholds (poor/neutral_max/good_max)', value: `${tourRevenue.mood_reactions.poor_threshold} / ${tourRevenue.mood_reactions.neutral_max} / ${tourRevenue.mood_reactions.good_max}`, source: 'live', configPath: 'markets.market_formulas.tour_revenue.mood_reactions', ref: 'TourProcessor.ts:338-345' },
      { label: 'deltas (poor/neutral/good/great)', value: `${tourRevenue.mood_reactions.poor_delta} / ${tourRevenue.mood_reactions.neutral_delta} / ${tourRevenue.mood_reactions.good_delta} / ${tourRevenue.mood_reactions.great_delta}`, source: 'live', configPath: 'markets.market_formulas.tour_revenue.mood_reactions' },
    ],
    hardcoded: false,
    ref: 'TourProcessor.ts:338-345',
    note: 'Knob liberation (slice 1): attendance→mood reaction table moved to markets.json tour_revenue.mood_reactions.',
  },
  {
    id: 'e-tour-popularity',
    from: 'tour_revenue',
    to: 'artist_popularity',
    mechanism: 'Attendance-based popularity gain (saturation-limited)',
    formula: `only attendance >${tourRevenue.popularity_reactions.attendance_threshold}%: gain = round(tableGain(crowd size, ${tourRevenue.popularity_reactions.tiers.map((t: any) => t.gain).join('..+')}) × min(1, satMult(pop))), floor 0; satMult(pop) = ${popularitySaturation.diminishing_multiplier_base} + ${popularitySaturation.diminishing_multiplier_range}/(1+(pop/${popularitySaturation.saturation_point})^${popularitySaturation.saturation_exponent})`,
    values: [
      { label: 'attendance_threshold', value: tourRevenue.popularity_reactions.attendance_threshold, source: 'live', configPath: 'markets.market_formulas.tour_revenue.popularity_reactions.attendance_threshold', ref: 'TourProcessor.ts:350-361' },
      { label: 'crowd-size tiers (max_attendees → gain)', value: tourRevenue.popularity_reactions.tiers.map((t: any) => `${t.max_attendees ?? '∞'}:+${t.gain}`).join(' / '), source: 'live', configPath: 'markets.market_formulas.tour_revenue.popularity_reactions.tiers' },
      { label: 'saturation (base/range/point/exp) — min(1,·) so table is the max', value: `${popularitySaturation.diminishing_multiplier_base} / ${popularitySaturation.diminishing_multiplier_range} / ${popularitySaturation.saturation_point} / ${popularitySaturation.saturation_exponent}`, source: 'live', configPath: 'markets.market_formulas.popularity_saturation', ref: 'shared/utils/popularitySaturation.ts' },
    ],
    hardcoded: false,
    ref: 'TourProcessor.ts:350-361 (saturation), shared/utils/popularitySaturation.ts',
    note: 'Slice 6: tour popularity gains now run through the SAME diminishing-returns curve as streaming (shared/utils/popularitySaturation.ts), clamped min(1, satMult) so the reaction table stays the MAXIMUM — saturation only reduces gains for already-famous acts, floor 0. Table itself moved to config in slice 1.',
  },
  {
    id: 'e-streams-chart',
    from: 'streams',
    to: 'chart_position',
    mechanism: 'Weekly chart ranking vs competitors',
    formula: 'rank by weekly streams desc; competitorStreams × rand(competitor_variance_range)',
    values: [
      { label: 'competitor_variance_range', value: JSON.stringify(chartSystem.competitor_variance_range), source: 'live', configPath: 'markets.market_formulas.chart_system.competitor_variance_range', ref: 'ChartService.ts:139,161-172' },
    ],
    hardcoded: false,
    ref: 'ChartService.ts:139,161-172',
  },
  {
    id: 'e-chart-reputation',
    from: 'chart_position',
    to: 'reputation',
    mechanism: 'Chart milestone reputation bonus (once per song)',
    formula: 'first top-10 → +round(hit_single_bonus × reputation_gain_scaling); first No.1 → +round(number_one_bonus × reputation_gain_scaling)',
    values: [
      { label: 'hit_single_bonus', value: reputationSystem.hit_single_bonus, source: 'live', configPath: 'progression.reputation_system.hit_single_bonus', ref: 'game-engine.ts:1150-1190' },
      { label: 'number_one_bonus', value: reputationSystem.number_one_bonus, source: 'live', configPath: 'progression.reputation_system.number_one_bonus' },
      { label: 'reputation_gain_scaling (positive-gain damper)', value: reputationSystem.reputation_gain_scaling, source: 'live', configPath: 'progression.reputation_system.reputation_gain_scaling', ref: 'shared/utils/reputationScaling.ts' },
    ],
    hardcoded: false,
    ref: 'game-engine.ts:1150-1190',
    note: 'Volatility-economy slice 3: the chart-milestone bonus (a "release success" reputation GAIN) is throttled by the global reputation_gain_scaling damper before it lands. Same damper applies to press-coverage + marketing + meeting reputation gains; losses (flop) are exempt.',
  },
  {
    id: 'e-flop-reputation',
    from: 'streams',
    to: 'reputation',
    mechanism: 'Flop penalty — reputation sink on an underperforming release (balance-integrity slice 2)',
    formula: 'FLOP if releaseWeekRevenue < flop_revenue_ratio × totalInvestment AND totalInvestment ≥ flop_investment_floor, where totalInvestment = Σ song.productionBudget + release.marketingBudget. On flop: reputation −flop_penalty (clamp ≥0), once per release (flags.flop_penalty_applied_<releaseId>).',
    values: [
      { label: 'flop_penalty', value: reputationSystem.flop_penalty, source: 'live', configPath: 'progression.reputation_system.flop_penalty', ref: 'ReleaseProcessor.ts processPlannedReleases (flop block)' },
      { label: 'flop_revenue_ratio', value: reputationSystem.flop_revenue_ratio, source: 'live', configPath: 'progression.reputation_system.flop_revenue_ratio' },
      { label: 'flop_investment_floor', value: reputationSystem.flop_investment_floor, source: 'live', configPath: 'progression.reputation_system.flop_investment_floor' },
    ],
    hardcoded: false,
    ref: 'ReleaseProcessor.processPlannedReleases (flop penalty block)',
    note: 'RESOLVED 2026-07-10 (balance-integrity slice 2): was non-edge ne-flop-reputation (flop_penalty dead). Now the game\'s first reputation SINK — a record whose release-week revenue falls below flop_revenue_ratio of its production+marketing investment (and clears the flop_investment_floor) costs the label flop_penalty reputation, once.',
  },
  {
    id: 'e-flop-artist-mood',
    from: 'streams',
    to: 'artist_mood',
    mechanism: 'Flop morale wound on the release artist (volatility-economy slice 2)',
    formula: 'On the SAME flop condition as e-flop-reputation: summary.artistChanges[release.artistId].mood += flop_artist_mood_penalty (signed, negative), once per release (same flop gate), clamped 0-100 downstream.',
    values: [
      { label: 'flop_artist_mood_penalty', value: reputationSystem.flop_artist_mood_penalty, source: 'live', configPath: 'progression.reputation_system.flop_artist_mood_penalty', ref: 'ReleaseProcessor.processPlannedReleases (flop block)' },
    ],
    hardcoded: false,
    ref: 'ReleaseProcessor.processPlannedReleases (flop penalty block)',
    note: 'Volatility-economy slice 2: a flop no longer only costs label reputation (e-flop-reputation) — it also wounds the release artist\'s morale, fired inside the same once-only flop flag gate. Zero RNG.',
  },
  {
    id: 'e-breakthrough-artist-mood',
    from: 'awareness',
    to: 'artist_mood',
    mechanism: 'Breakthrough morale lift on the song artist (volatility-economy slice 2)',
    formula: 'When a song breaks through (existing deterministic sin-seed roll, weeks 3-6): summary.artistChanges[song.artistId].mood += artist_mood_bonus, clamped 0-100 downstream.',
    values: [
      { label: 'artist_mood_bonus', value: awarenessSystem.breakthrough_effects.artist_mood_bonus, source: 'live', configPath: 'markets.market_formulas.awareness_system.breakthrough_effects.artist_mood_bonus', ref: 'ReleaseProcessor.processReleasedProjects (breakthrough block)' },
    ],
    hardcoded: false,
    ref: 'ReleaseProcessor.processReleasedProjects (breakthrough block)',
    note: 'Volatility-economy slice 2: a breakthrough lifts the song artist\'s morale. No new RNG — the breakthrough itself is the existing deterministic sin-seed roll (see e-quality-awareness-breakthrough).',
  },
  {
    id: 'e-reputation-access',
    from: 'reputation',
    to: 'access_tiers',
    mechanism: 'Access tier unlock thresholds',
    formula: 'playlist 10/30/60; press 8/25/50; venue 5/20/45',
    values: [
      { label: 'playlist thresholds (niche/mid/flagship)', value: `${accessTierSystem.playlist_access.niche.threshold} / ${accessTierSystem.playlist_access.mid.threshold} / ${accessTierSystem.playlist_access.flagship.threshold}`, source: 'live', configPath: 'progression.access_tier_system.playlist_access.*.threshold', ref: 'ProgressionProcessor.ts:48-85' },
      { label: 'press thresholds (blogs/mid_tier/national)', value: `${accessTierSystem.press_access.blogs.threshold} / ${accessTierSystem.press_access.mid_tier.threshold} / ${accessTierSystem.press_access.national.threshold}`, source: 'live', configPath: 'progression.access_tier_system.press_access.*.threshold' },
      { label: 'venue thresholds (clubs/theaters/arenas)', value: `${accessTierSystem.venue_access.clubs.threshold} / ${accessTierSystem.venue_access.theaters.threshold} / ${accessTierSystem.venue_access.arenas.threshold}`, source: 'live', configPath: 'progression.access_tier_system.venue_access.*.threshold' },
    ],
    hardcoded: false,
    ref: 'ProgressionProcessor.ts:48-85',
  },
  {
    id: 'e-reputation-focus-slots',
    from: 'reputation',
    to: 'focus_slots',
    mechanism: '4th focus slot unlock',
    formula: 'unlockedAt reputation >= fourth_focus_slot_reputation',
    values: [
      { label: 'fourth_focus_slot_reputation', value: progressionThresholds.fourth_focus_slot_reputation, source: 'live', configPath: 'progression.progression_thresholds.fourth_focus_slot_reputation', ref: 'game-engine.ts:393-402' },
    ],
    hardcoded: false,
    ref: 'game-engine.ts:393-402',
  },
  {
    id: 'e-reputation-producer-tier',
    from: 'reputation',
    to: 'producer_tier',
    mechanism: 'Producer tier unlock thresholds',
    formula: 'unlockedAt reputation >= unlock_rep',
    values: [
      { label: 'regional / national / legendary unlock_rep', value: `${producerTierSystem.regional.unlock_rep} / ${producerTierSystem.national.unlock_rep} / ${producerTierSystem.legendary.unlock_rep}`, source: 'live', configPath: 'quality.producer_tier_system.*.unlock_rep', ref: 'game-engine.ts:1225' },
    ],
    hardcoded: false,
    ref: 'game-engine.ts:1225',
  },
  {
    id: 'e-access-press',
    from: 'access_tiers',
    to: 'press',
    mechanism: 'Press pickup chance — tier base',
    formula: 'chance = base_chance + tier.pickup_chance + prSpend×pr_spend_modifier + rep×reputation_modifier + storyFlag×story_flag_bonus + momentum×press_momentum_chance_per_point, capped at max_pickups_per_release',
    values: [
      { label: 'base_chance', value: pressCoverage.base_chance, source: 'live', configPath: 'markets.market_formulas.press_coverage.base_chance', ref: 'FinancialSystem.ts:1898-1939' },
      { label: 'tier pickup_chance (none/blogs/mid_tier/national)', value: `${accessTierSystem.press_access.none.pickup_chance} / ${accessTierSystem.press_access.blogs.pickup_chance} / ${accessTierSystem.press_access.mid_tier.pickup_chance} / ${accessTierSystem.press_access.national.pickup_chance}`, source: 'live', configPath: 'progression.access_tier_system.press_access.*.pickup_chance' },
      { label: 'max_pickups_per_release', value: pressCoverage.max_pickups_per_release, source: 'live', configPath: 'markets.market_formulas.press_coverage.max_pickups_per_release' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.calculatePressPickups, FinancialSystem.ts:1898-1939',
  },
  {
    id: 'e-reputation-press',
    from: 'reputation',
    to: 'press',
    mechanism: 'Press pickup chance — reputation modifier',
    formula: 'chance += reputation × reputation_modifier',
    values: [
      { label: 'reputation_modifier', value: pressCoverage.reputation_modifier, source: 'live', configPath: 'markets.market_formulas.press_coverage.reputation_modifier', ref: 'FinancialSystem.ts:1898-1939' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.calculatePressPickups, FinancialSystem.ts:1898-1939',
  },
  {
    id: 'e-money-press',
    from: 'money',
    to: 'press',
    mechanism: 'Press pickup chance — PR spend modifier',
    formula: 'chance += prSpend × pr_spend_modifier',
    values: [
      { label: 'pr_spend_modifier', value: pressCoverage.pr_spend_modifier, source: 'live', configPath: 'markets.market_formulas.press_coverage.pr_spend_modifier', ref: 'FinancialSystem.ts:1898-1939' },
    ],
    hardcoded: false,
    ref: 'FinancialSystem.calculatePressPickups, FinancialSystem.ts:1898-1939',
  },
  {
    id: 'e-execmood-money',
    from: 'executive_mood',
    to: 'money',
    mechanism: 'Meeting cost scaling',
    formula: 'mood < disgruntled_below → costs ×cost_multiplier_disgruntled; mood > content_above → costs ×cost_multiplier_content. Positive money effects never scaled.',
    values: [
      { label: 'disgruntled_below / cost_multiplier_disgruntled', value: `${execMoodModifiers.disgruntled_below} / ${execMoodModifiers.cost_multiplier_disgruntled}`, source: 'live', configPath: 'progression.reputation_system.exec_mood_modifiers.disgruntled_below / cost_multiplier_disgruntled', ref: 'shared/utils/executiveMoodModifier.ts' },
      { label: 'content_above / cost_multiplier_content', value: `${execMoodModifiers.content_above} / ${execMoodModifiers.cost_multiplier_content}`, source: 'live', configPath: 'progression.reputation_system.exec_mood_modifiers.content_above / cost_multiplier_content' },
    ],
    hardcoded: false,
    ref: 'shared/utils/executiveMoodModifier.ts (consumed via ActionProcessor.ts:617-1143)',
  },
  {
    id: 'e-execmood-creative-capital',
    from: 'executive_mood',
    to: 'creative_capital',
    mechanism: 'Meeting non-money effect scaling (inspired band)',
    formula: 'mood > inspired_above → ALL non-money effect magnitudes ×effect_multiplier_inspired',
    values: [
      { label: 'inspired_above / effect_multiplier_inspired', value: `${execMoodModifiers.inspired_above} / ${execMoodModifiers.effect_multiplier_inspired}`, source: 'live', configPath: 'progression.reputation_system.exec_mood_modifiers.inspired_above / effect_multiplier_inspired', ref: 'shared/utils/executiveMoodModifier.ts' },
    ],
    hardcoded: false,
    ref: 'shared/utils/executiveMoodModifier.ts (consumed via ActionProcessor.ts:617-1143)',
    note: 'Representative edge — the same ×1.20 scaling applies to every non-money meeting effect channel (reputation, artist_mood, artist_popularity, etc.), not creative_capital alone.',
  },
  // ─── Executive Delegation & Trust arc (Tiers 1+2, 2026-07-12) ──────────────
  {
    id: 'e-loyalty-autonomous-direction',
    from: 'executive_loyalty',
    to: 'money',
    mechanism: 'Autonomous choice DIRECTION (loyalty bands) — un-acted meetings never lapse',
    formula: 'loyalty > loyal_above → picks the AUTO-safe choice; loyalty < disloyal_below → picks the in-character self-serving choice; otherwise → the exec\'s own competent-professional call. The picked choice\'s money/effects apply through the SAME path a player pick uses.',
    values: [
      { label: 'loyal_above / disloyal_below', value: `${reputationSystem.executive_delegation?.loyalty_bands?.loyal_above ?? 70} / ${reputationSystem.executive_delegation?.loyalty_bands?.disloyal_below ?? 30}`, source: 'live', configPath: 'progression.reputation_system.executive_delegation.loyalty_bands.loyal_above / disloyal_below', ref: 'shared/utils/executiveDelegation.ts getLoyaltyBand' },
    ],
    hardcoded: false,
    ref: 'shared/engine/executiveAutonomy.ts pickAutonomousChoice; shared/engine/game-engine.ts resolveAutonomousExecMeetings',
    note: 'Every exec-lane meeting the player did NOT personally staff this week resolves anyway — the exec spends real money per this band, with no spend cap. "money" stands in for the whole authored effect bag (reputation, awareness, quality, etc.), the same targets a player pick can touch.',
  },
  {
    id: 'e-execmood-autonomous-risk',
    from: 'executive_mood',
    to: 'money',
    mechanism: 'Autonomous choice RISK APPETITE (mood tie-break within the loyalty band)',
    formula: 'mood > inspired_above → prefers the higher-risk/higher-spend candidate WITHIN the loyalty band\'s top-scoring set (argmax variance_up/rep_swing magnitude + |money|); mood < disgruntled_below → prefers the lower-risk/lower-spend candidate (argmin); otherwise → no bias, the band\'s top pick stands.',
    values: [
      { label: 'inspired_above / disgruntled_below (shared with the cost-multiplier bands)', value: `${execMoodModifiers.inspired_above} / ${execMoodModifiers.disgruntled_below}`, source: 'live', configPath: 'progression.reputation_system.exec_mood_modifiers.inspired_above / disgruntled_below', ref: 'shared/utils/executiveDelegation.ts getRiskAppetiteBias' },
    ],
    hardcoded: false,
    ref: 'shared/engine/executiveAutonomy.ts riskScore + pickAutonomousChoice',
    note: 'A tie-break WITHIN the loyalty band\'s candidate set (e-loyalty-autonomous-direction), not a replacement for it — an inspired disloyal exec still only picks among the self-serving candidates, just the riskiest one among them.',
  },
  {
    id: 'e-focusslot-autonomous-spend',
    from: 'focus_slots',
    to: 'money',
    mechanism: 'Neglect still spends — an unspent focus slot does not save the money',
    formula: 'A focus slot NOT spent on an exec meeting does not cancel that meeting — the exec resolves it themselves. Neglect costs 0 slots but grants only neglect_loyalty_gain (0) loyalty, versus loyalty_on_use (5) for a personally-staffed or AUTO-endorsed meeting.',
    values: [
      { label: 'neglect_loyalty_gain / loyalty_on_use', value: `${reputationSystem.executive_delegation?.neglect_loyalty_gain ?? 0} / ${reputationSystem.executive_delegation?.loyalty_on_use ?? 5}`, source: 'live', configPath: 'progression.reputation_system.executive_delegation.neglect_loyalty_gain / loyalty_on_use', ref: 'shared/engine/game-engine.ts resolveAutonomousExecMeetings' },
    ],
    hardcoded: false,
    ref: 'shared/engine/game-engine.ts resolveAutonomousExecMeetings (never-lapse, §4 of the delegation plan)',
    note: 'The pre-arc mental model — "I can save money by not spending a slot" — is now false for exec meetings. The player-legible trade is control (spend a slot, make the call) vs. handing the exec the wheel (free, but their call) — see the AUTO-vs-neglect table in the [REFERENCE] doc §10.4.',
  },
  {
    id: 'e-loyalty-escalation',
    from: 'executive_loyalty',
    to: 'side_events',
    mechanism: 'Escalation — a low-loyalty exec who self-resolves an urgent meeting can trigger a mandatory crisis NEXT week',
    formula: 'An urgent (reactive/pulse-dot) meeting self-resolved by autonomous resolution (never player-chosen), while that exec\'s PRE-UPDATE loyalty < escalation.loyalty_ceiling, sets flags.pending_side_event for the following week via the existing mandatory-crisis pipeline. Roll-free — zero RNG draws. Only the first qualifying exec per advance is captured; escalation wins any same-week collision with the weekly roll by running first in the pipeline.',
    values: [
      { label: 'escalation.loyalty_ceiling', value: reputationSystem.executive_delegation?.escalation?.loyalty_ceiling ?? 40, source: 'live', configPath: 'progression.reputation_system.executive_delegation.escalation.loyalty_ceiling', ref: 'shared/engine/game-engine.ts applyEscalation' },
      { label: 'escalation.enabled', value: String(reputationSystem.executive_delegation?.escalation?.enabled ?? true), source: 'live', configPath: 'progression.reputation_system.executive_delegation.escalation.enabled' },
    ],
    hardcoded: false,
    ref: 'shared/engine/game-engine.ts resolveAutonomousExecMeetings (capture) + applyEscalation (emission); shared/utils/executiveDelegation.ts ESCALATION_EVENT_BY_ROLE',
    note: 'One escalation-only event per core-four archetype (data/events.json escalation_only: true), injected via this path exclusively — never rolled by the weekly weighted draw. Kill-switches: escalation.enabled AND mandatory_side_events.enabled.',
  },
];

export const EDGES_BY_ID: Record<string, SystemEdge> = Object.fromEntries(EDGES.map((e) => [e.id, e]));

// ─────────────────────────────────────────────────────────────────────────────
// Non-edges — assumed-but-missing (or shadowed/dead) connections
// ─────────────────────────────────────────────────────────────────────────────

export const NON_EDGES: NonEdge[] = [
  {
    id: 'ne-energy-quality',
    from: 'artist_energy',
    to: 'song_quality',
    claim: 'Artist energy should influence song quality, like mood does.',
    evidence: 'No consumer — song_quality reads mood/talent/workEthic/popularity (SongGenerationProcessor.ts:404-445), never energy. Energy is set/clamped by meetings & dialogue only. Confirmed display-only.',
  },
  {
    id: 'ne-energy-streams',
    from: 'artist_energy',
    to: 'streams',
    claim: 'Artist energy should affect streaming performance.',
    evidence: 'No consumer anywhere in the streaming formulas (FinancialSystem.ts:726-789, 935-1063). Display-only, confirmed.',
  },
  {
    id: 'ne-reputation-decay',
    from: 'reputation',
    to: 'reputation',
    claim: 'Reputation should decay weekly, per its configured decay_rate.',
    evidence: 'progression.json reputation_system.decay_rate (0.1) is not consumed anywhere in the engine — reputation never decays in code.',
  },
  {
    id: 'ne-goal-failure-reputation',
    from: 'reputation',
    to: 'reputation',
    claim: 'Missing a campaign/tier goal should cost reputation, per goal_failure_penalty.',
    evidence: 'progression.json reputation_system.goal_failure_penalty (2) is still configured but dead — no engine code applies it. (The sibling flop_penalty is now LIVE — see edge e-flop-reputation, resolved balance-integrity slice 2 2026-07-10.)',
  },
  {
    id: 'ne-producer-multiplier-shadowed',
    from: 'producer_tier',
    to: 'song_quality',
    claim: 'quality.json producer_tier_system.multiplier should scale song quality.',
    evidence: 'Still NOT the right knob — producer_tier_system.multiplier feeds cost/duration ONLY. As of slice 1 (knob liberation), the quality skill-map IS tunable, but via a DISTINCT block: quality.json song_quality_formula.producer_skill_map (local 40/regional 55/national 75/legendary 95). Tune that, not producer_tier_system.multiplier. See edge e-producer-quality.',
  },
  {
    id: 'ne-time-multiplier-shadowed',
    from: 'time_investment',
    to: 'song_quality',
    claim: 'quality.json time_investment_system.multiplier should scale song quality.',
    evidence: 'Still NOT the right knob — time_investment_system.multiplier feeds cost/duration ONLY. As of slice 1 (knob liberation), the quality time multipliers ARE tunable, but via a DISTINCT block: quality.json song_quality_formula.time_multipliers (rushed 0.7/standard 1.0/extended 1.1/perfectionist 1.2). Tune that, not time_investment_system.multiplier. See edge e-time-quality.',
  },
  {
    id: 'ne-mood-streams-live',
    from: 'artist_mood',
    to: 'streams',
    claim: 'Raising an artist\'s mood should boost their already-released songs\' streams.',
    evidence: 'Indirect only — mood is snapshotted into song_quality at generation time (SongGenerationProcessor.ts:445). Changing mood after a song is released never moves that song\'s streams.',
  },
  {
    id: 'ne-creative-capital-quality',
    from: 'creative_capital',
    to: 'song_quality',
    claim: 'Creative capital should feed into recording/quality math like money (budget) does.',
    evidence: 'Gates action availability at the route/UI layer only — no engine revenue/quality/stream formula reads creative_capital.',
  },
  {
    id: 'ne-creative-capital-streams',
    from: 'creative_capital',
    to: 'streams',
    claim: 'Creative capital should feed into streaming/marketing math.',
    evidence: 'Gates action availability at the route/UI layer only — no engine revenue/quality/stream formula reads creative_capital.',
  },
];

export const NON_EDGES_BY_ID: Record<string, NonEdge> = Object.fromEntries(NON_EDGES.map((n) => [n.id, n]));
