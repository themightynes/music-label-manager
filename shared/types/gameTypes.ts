// Game Data Types for Music Label Manager

export interface GameArtist {
  id: string;
  name: string;
  archetype: 'Visionary' | 'Workhorse' | 'Trendsetter';
  talent: number;
  workEthic: number;
  popularity: number;
  temperament: number;
  loyalty: number;
  mood: number;
  signed: boolean;
}

export interface ChoiceEffect {
  money?: number;
  reputation?: number;
  creative_capital?: number;
  artist_loyalty?: number;
  artist_mood?: number;
  [key: string]: number | undefined;
}

export interface DialogueChoice {
  id: string;
  label: string;
  effects_immediate: ChoiceEffect;
  effects_delayed: ChoiceEffect;
}

export interface RoleMeeting {
  id: string;
  prompt: string;
  choices: DialogueChoice[];
}

export interface GameRole {
  id: string;
  name: string;
  relationship: number;
  access: Record<string, any>;
  kpis: string[];
  meetings: RoleMeeting[];
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
  speaker: string;
  archetype: string;
  prompt: string;
  choices: DialogueChoice[];
}

export interface GameState {
  id: string;
  currentMonth: number;
  money: number;
  reputation: number;
  creativeCapital: number;
  focusSlots: number;
  usedFocusSlots: number;
  playlistAccess: string;
  pressAccess: string;
  venueAccess: string;
  campaignType: string;
  rngSeed: string;
  flags: Record<string, any>;
  monthlyStats: Record<string, any>;
}

export interface GameProject {
  id: string;
  title: string;
  type: 'Single' | 'EP' | 'Mini-Tour';
  artistId: string;
  stage: 'planning' | 'production' | 'marketing' | 'released';
  quality: number;
  budget: number;
  budgetUsed: number;
  dueMonth: number;
  startMonth: number;
  metadata?: Record<string, any>;
}

export interface ProducerTierData {
  multiplier: number;
  unlock_rep: number;
  quality_bonus: number;
  description: string;
}

export interface TimeInvestmentData {
  multiplier: number;
  duration_modifier: number;
  quality_bonus: number;
  description: string;
}

export interface BalanceConfig {
  version: string;
  economy: {
    starting_money: number;
    monthly_burn_base: [number, number];
    bankruptcy_threshold: number;
    rng_variance: [number, number];
    project_costs: Record<string, any>;
    song_count_cost_system: Record<string, any>;
    marketing_costs: Record<string, any>;
    talent_costs: Record<string, any>;
  };
  time_progression: {
    campaign_length_months: number;
    focus_slots_base: number;
    focus_slots_unlock_threshold: number;
    focus_slots_max: number;
    project_durations: Record<string, [number, number]>;
    seasonal_modifiers: Record<string, number>;
  };
  reputation_system: {
    starting_reputation: number;
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
}

export interface WorldConfig {
  version: string;
  generated: string;
  seed: number;
  money_start: number;
  monthly_burn_base: [number, number];
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
export interface MonthlyOutcome {
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