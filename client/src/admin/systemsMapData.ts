// Systems Map — data module (admin dev tool)
//
// Hand-verified snapshot of shared/engine as of 2026-07-10. Every edge cites the
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

const qualitySystem = (quality as any).quality_system;
const budgetQualitySystem = qualitySystem.budget_quality_system;
const producerTierSystem = (quality as any).producer_tier_system;
const timeInvestmentSystem = (quality as any).time_investment_system;

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
    description: `0-100, starts at ${reputationSystem.starting_reputation} (progression.json reputation_system.starting_reputation), master gate for access tiers, producer tiers, and the 4th focus slot. Meeting choices can also apply a seeded rep_swing (ActionProcessor.ts:1049) and reputation itself never decays in code (see non-edges) despite a configured decay_rate.`,
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
    description: `Scales that executive's meeting outcomes via shared/utils/executiveMoodModifier.ts, config from progression.json reputation_system.exec_mood_modifiers: disgruntled below ${execMoodModifiers.disgruntled_below} (cost ×${execMoodModifiers.cost_multiplier_disgruntled}), content above ${execMoodModifiers.content_above} (cost ×${execMoodModifiers.cost_multiplier_content}), inspired above ${execMoodModifiers.inspired_above} (additionally all non-money effects ×${execMoodModifiers.effect_multiplier_inspired}). Positive money effects are never scaled. Set via ActionProcessor.processExecutiveActions (ActionProcessor.ts:564).`,
  },
  {
    id: 'executive_loyalty',
    label: 'Executive Loyalty',
    domain: 'meetings',
    col: 1,
    row: 1,
    description: `0-100. +5 when the exec is used in a meeting (ActionProcessor.ts:576); −5/week after 3 consecutive weeks ignored, idle mood drifts ±5 toward 50 (ArtistStateProcessor.ts:414, :420-427). Not itself read by any streams/quality/revenue formula — it's a relationship-health meter that gates future meeting flavor, not a documented direct multiplier in the reviewed engine paths.`,
  },
  {
    id: 'award_chances',
    label: 'Award Chances',
    domain: 'meetings',
    col: 1,
    row: 2,
    description: `A never-expiring pool, incremented by meeting choices (ActionProcessor.ts:1091). At campaign end: chance = min(${reputationSystem.award_chance_cap}, pool × ${reputationSystem.award_chance_per_point}) (progression.json award_chance_per_point / award_chance_cap), win adds +${reputationSystem.award_score_bonus} to the campaign score (progression.json award_score_bonus) via an isolated seeded roll — AchievementsEngine.ts:66-73. The score itself is a campaign-end abstraction with no dedicated system node, so this is not modeled as an edge.`,
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
    description: `Default 50. Feeds song_quality at generation time only (snapshotted — see non-edges for why it never moves an already-released song's streams). Set by meeting/dialogue choices (ActionProcessor.ts:660) and tour attendance (TourProcessor.ts:338-345).`,
  },
  {
    id: 'artist_energy',
    label: 'Artist Energy',
    domain: 'artist',
    col: 2,
    row: 2,
    description: `DISPLAY-ONLY. Set/clamped by meetings & dialogue (ActionProcessor.ts:765) but has NO consumer anywhere in the reviewed engine paths — confirmed dead end (see non-edges).`,
  },
  {
    id: 'song_quality',
    label: 'Song Quality',
    domain: 'artist',
    col: 2,
    row: 3,
    description: `25-98, computed once at generation (SongGenerationProcessor.calculateEnhancedSongQuality, SongGenerationProcessor.ts:385-573). Most factors are HARDCODED in-function rather than read from quality.json (see edges + non-edges for the specific shadowed knobs).`,
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
    description: `rushed / standard / extended / perfectionist. quality.json's time_investment_system.multiplier and duration_modifier feed cost/duration only — the quality formula hardcodes its own multiplier set (see non-edges).`,
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
      { label: 'variance range (rand)', value: '[0.9, 1.1]', source: 'hardcoded', ref: 'FinancialSystem.ts:451-454 (VARIANCE_RANGE)' },
      { label: 'base_streams_per_point', value: 1000, source: 'hardcoded', ref: 'server/data/gameData.ts:462 — ⚠ NOT markets.json, a same-value literal lives there independently' },
    ],
    hardcoded: true,
    ref: 'FinancialSystem.calculateStreamingOutcome, FinancialSystem.ts:726-789',
  },
  {
    id: 'e-access-streams-playlist',
    from: 'access_tiers',
    to: 'streams',
    mechanism: 'Streaming outcome — playlist reach component',
    formula: 'component = reach_multiplier × playlist_weight × PLAYLIST_COMPONENT_SCALE',
    values: [
      { label: 'playlist_weight', value: streamingCalc.playlist_weight, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.playlist_weight', ref: 'FinancialSystem.ts:749' },
      { label: 'PLAYLIST_COMPONENT_SCALE', value: 100, source: 'hardcoded', ref: 'FinancialSystem.ts:446' },
      { label: 'reach_multiplier (none/niche/mid/flagship)', value: '0.1 / 0.4 / 0.8 / 1.5', source: 'live', configPath: 'progression.access_tier_system.playlist_access.*.reach_multiplier' },
    ],
    hardcoded: true,
    ref: 'FinancialSystem.calculateStreamingOutcome, FinancialSystem.ts:749',
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
      { label: 'divisor', value: 1000, source: 'hardcoded', ref: 'FinancialSystem.ts:447' },
      { label: 'multiplier', value: 50, source: 'hardcoded', ref: 'FinancialSystem.ts:450' },
    ],
    hardcoded: true,
    ref: 'FinancialSystem.calculateStreamingOutcome, FinancialSystem.ts:751',
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
      { label: 'baseline', value: 50, source: 'hardcoded', ref: 'FinancialSystem.ts:455' },
      { label: 'reputation_bonus_factor', value: ongoingStreams.reputation_bonus_factor, source: 'live', configPath: 'markets.market_formulas.streaming_calculation.ongoing_streams.reputation_bonus_factor', ref: 'FinancialSystem.ts:973' },
    ],
    hardcoded: true,
    ref: 'FinancialSystem.calculateDecayRevenue, FinancialSystem.ts:973',
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
    formula: 'radio: (spend/10000) × 0.85 × 0.2; digital: (spend/8000) × 0.92 × 0.25; pr peaks week 3',
    values: [
      { label: 'radio/digital/pr week-2-4 formula', value: 'see formula', source: 'hardcoded', ref: 'FinancialSystem.ts:1085-1099' },
    ],
    hardcoded: true,
    ref: 'FinancialSystem.calculateDecayRevenue, FinancialSystem.ts:1085-1099',
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
      { label: 'thresholds (q≥80 → /40×0.65, q≥70 → /60×0.35, q≥60 → /80×0.15)', value: 'see formula', source: 'hardcoded', ref: 'ReleaseProcessor.ts:738-743' },
      { label: 'awareness multiplier on hit', value: 2.5, source: 'hardcoded', ref: 'ReleaseProcessor.ts:757' },
      { label: 'decay reduction at quality≥85', value: awarenessSystem.awareness_decay_rates.quality_bonus_reduction, source: 'live', configPath: 'markets.market_formulas.awareness_system.awareness_decay_rates.quality_bonus_reduction', ref: 'ReleaseProcessor.ts:801-816' },
    ],
    hardcoded: true,
    ref: 'ReleaseProcessor.ts:738-757, 801-816',
    note: 'C79: thresholds SHADOW markets.json awareness_system.breakthrough_thresholds — editing that JSON does nothing (see non-edges).',
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
    formula: 'threshold = 3000 × 2^(pop/25); points = min(10, log10(streams/threshold)); mult = 0.2 + 1.3/(1+(pop/35)^4)',
    values: [
      { label: 'baseThreshold', value: 3000, source: 'hardcoded', ref: 'ReleaseProcessor.ts:861-863' },
      { label: 'saturationPoint', value: 35, source: 'hardcoded', ref: 'ReleaseProcessor.ts:861-863' },
    ],
    hardcoded: true,
    ref: 'ReleaseProcessor.ts:619-648, 861-863',
  },
  {
    id: 'e-producer-quality',
    from: 'producer_tier',
    to: 'song_quality',
    mechanism: 'Talent/producer skill blend',
    formula: 'quality = talent × 0.65 + producerSkill × 0.35',
    values: [
      { label: 'weights (talent/producer)', value: '0.65 / 0.35', source: 'hardcoded', ref: 'SongGenerationProcessor.ts:395-405' },
      { label: 'skill map (local/regional/national/legendary)', value: '40 / 55 / 75 / 95', source: 'hardcoded', ref: 'SongGenerationProcessor.ts:395-405' },
    ],
    hardcoded: true,
    ref: 'SongGenerationProcessor.calculateEnhancedSongQuality, SongGenerationProcessor.ts:395-405',
    note: 'C79-class: quality.json producer_tier_system.multiplier is NOT read here (see non-edges) — it only affects cost/duration.',
  },
  {
    id: 'e-time-quality',
    from: 'time_investment',
    to: 'song_quality',
    mechanism: 'Time multiplier + work ethic',
    formula: 'quality *= timeMult × (1 + workEthic/100 × 0.3)',
    values: [
      { label: 'timeMult (rushed/standard/extended/perfectionist)', value: '0.7 / 1.0 / 1.1 / 1.2', source: 'hardcoded', ref: 'SongGenerationProcessor.ts:409-418' },
      { label: 'work ethic scale', value: 0.3, source: 'hardcoded', ref: 'SongGenerationProcessor.ts:409-418' },
    ],
    hardcoded: true,
    ref: 'SongGenerationProcessor.ts:409-418',
    note: 'C79-class: quality.json time_investment_system.multiplier is NOT read here (see non-edges) — it only affects cost/duration.',
  },
  {
    id: 'e-popularity-quality',
    from: 'artist_popularity',
    to: 'song_quality',
    mechanism: 'Popularity bonus + release fatigue',
    formula: 'quality *= 0.95 + 0.1 × sqrt(pop/100); fatigue *= 0.97^max(0, releaseCount-3)',
    values: [
      { label: 'popularity bonus coefficients', value: '0.95 / 0.1', source: 'hardcoded', ref: 'SongGenerationProcessor.ts:423' },
      { label: 'fatigue base / free releases', value: '0.97 / 3', source: 'hardcoded', ref: 'SongGenerationProcessor.ts:429' },
    ],
    hardcoded: true,
    ref: 'SongGenerationProcessor.ts:423,429',
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
    mechanism: 'Mood multiplier (snapshotted at generation)',
    formula: 'quality *= 0.9 + 0.2 × (mood/100)',
    values: [
      { label: 'mood multiplier coefficients', value: '0.9 / 0.2', source: 'hardcoded', ref: 'SongGenerationProcessor.ts:445' },
    ],
    hardcoded: true,
    ref: 'SongGenerationProcessor.ts:445',
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
    id: 'e-money-tour',
    from: 'money',
    to: 'tour_revenue',
    mechanism: 'Sell-through — marketing budget',
    formula: 'sellThrough = sell_through_base + (budget/capacity) × 11/100 × 0.15',
    values: [
      { label: 'sell_through_base', value: tourRevenue.sell_through_base, source: 'live', configPath: 'markets.market_formulas.tour_revenue.sell_through_base' },
      { label: 'budget scale (11/100 × 0.15)', value: '11/100 × 0.15', source: 'hardcoded', ref: 'FinancialSystem.ts:819' },
    ],
    hardcoded: true,
    ref: 'FinancialSystem.ts:819',
  },
  {
    id: 'e-access-tour-scaling',
    from: 'access_tiers',
    to: 'tour_revenue',
    mechanism: 'Venue capacity scaling + ticket price',
    formula: 'venueSizeModifier = (1-posInTier) × 0.5; popularityEffectiveness = 1-posInTier × 0.3; ticket = ticket_price_base × (1 + (pop/100) × (2.5 - posInTier×2)), cap-mult 0.003',
    values: [
      { label: 'venueSizeModifier / popularityEffectiveness coefficients', value: '0.5 / 0.3', source: 'hardcoded', ref: 'FinancialSystem.ts:461-462' },
      { label: 'ticket_price_base', value: tourRevenue.ticket_price_base, source: 'live', configPath: 'markets.market_formulas.tour_revenue.ticket_price_base', ref: 'FinancialSystem.ts:463' },
      { label: 'ticket formula scaling (2.5, cap-mult 0.003)', value: '2.5 / 0.003', source: 'hardcoded', ref: 'FinancialSystem.ts:463,643' },
    ],
    hardcoded: true,
    ref: 'FinancialSystem.ts:461-463, 643',
  },
  {
    id: 'e-tour-aggregation',
    from: 'access_tiers',
    to: 'tour_revenue',
    mechanism: 'Final revenue aggregation + costs',
    formula: 'revenue = capacity × sellThrough × ticket × (1 + merch_percentage) × cities; costs = venue cap×4 + production cap×2.7 per city',
    values: [
      { label: 'merch_percentage', value: tourRevenue.merch_percentage, source: 'live', configPath: 'markets.market_formulas.tour_revenue.merch_percentage', ref: 'FinancialSystem.ts:825-829' },
      { label: 'venue cost / production cost multipliers', value: '×4 / ×2.7', source: 'hardcoded', ref: 'FinancialSystem.ts:807-808' },
    ],
    hardcoded: true,
    ref: 'FinancialSystem.ts:807-808, 825-829',
  },
  {
    id: 'e-tour-mood',
    from: 'tour_revenue',
    to: 'artist_mood',
    mechanism: 'Attendance-based mood swing',
    formula: '<30% → -3; 30-50% → 0; 50-85% → +5; >85% → +8',
    values: [
      { label: 'attendance bands → mood delta', value: '-3 / 0 / +5 / +8', source: 'hardcoded', ref: 'TourProcessor.ts:338-345' },
    ],
    hardcoded: true,
    ref: 'TourProcessor.ts:338-345',
  },
  {
    id: 'e-tour-popularity',
    from: 'tour_revenue',
    to: 'artist_popularity',
    mechanism: 'Attendance-based popularity gain',
    formula: 'only attendance >70%: +1..+7 scaled by crowd size',
    values: [
      { label: 'attendance threshold / gain range', value: '>70% / +1..+7', source: 'hardcoded', ref: 'TourProcessor.ts:350-361' },
    ],
    hardcoded: true,
    ref: 'TourProcessor.ts:350-361',
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
    formula: 'first top-10 → +hit_single_bonus; first No.1 → +number_one_bonus',
    values: [
      { label: 'hit_single_bonus', value: reputationSystem.hit_single_bonus, source: 'live', configPath: 'progression.reputation_system.hit_single_bonus', ref: 'game-engine.ts:1150-1190' },
      { label: 'number_one_bonus', value: reputationSystem.number_one_bonus, source: 'live', configPath: 'progression.reputation_system.number_one_bonus' },
    ],
    hardcoded: false,
    ref: 'game-engine.ts:1150-1190',
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
    id: 'ne-energy-tour',
    from: 'artist_energy',
    to: 'tour_revenue',
    claim: 'Artist energy should affect tour performance/sell-through.',
    evidence: 'No consumer in TourProcessor.ts or FinancialSystem.ts:796-928. Display-only, confirmed.',
  },
  {
    id: 'ne-reputation-decay',
    from: 'reputation',
    to: 'reputation',
    claim: 'Reputation should decay weekly, per its configured decay_rate.',
    evidence: 'progression.json reputation_system.decay_rate (0.1) is not consumed anywhere in the engine — reputation never decays in code.',
  },
  {
    id: 'ne-flop-reputation',
    from: 'streams',
    to: 'reputation',
    claim: 'A flop release (low streams/chart failure) should cost reputation.',
    evidence: 'progression.json reputation_system.flop_penalty (3) and goal_failure_penalty (2) are configured but dead — no engine code applies them.',
  },
  {
    id: 'ne-breakthrough-thresholds-shadowed',
    from: 'song_quality',
    to: 'awareness',
    claim: 'Editing markets.json breakthrough_thresholds should retune the breakthrough roll.',
    evidence: 'SHADOWED (C79): ReleaseProcessor.ts:738-743 hardcodes its own 80/70/60 thresholds instead of reading markets.json market_formulas.awareness_system.breakthrough_thresholds. Same debt class: base_streams_per_point is hardcoded at server/data/gameData.ts:462, independent of markets.json.',
  },
  {
    id: 'ne-producer-multiplier-shadowed',
    from: 'producer_tier',
    to: 'song_quality',
    claim: 'quality.json producer_tier_system.multiplier should scale song quality.',
    evidence: 'NOT used by the quality formula — SongGenerationProcessor.ts:395-405 hardcodes its own skill map (local 40/regional 55/national 75/legendary 95). The JSON multiplier only feeds cost/duration.',
  },
  {
    id: 'ne-time-multiplier-shadowed',
    from: 'time_investment',
    to: 'song_quality',
    claim: 'quality.json time_investment_system.multiplier should scale song quality.',
    evidence: 'NOT used by the quality formula — SongGenerationProcessor.ts:409-418 hardcodes its own multiplier set (rushed 0.7/standard 1.0/extended 1.1/perfectionist 1.2). The JSON multiplier only feeds cost/duration.',
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
