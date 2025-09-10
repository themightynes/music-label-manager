// Import all balance modules
import economy from './balance/economy.json';
import progression from './balance/progression.json';
import quality from './balance/quality.json';
import artists from './balance/artists.json';
import markets from './balance/markets.json';
import projects from './balance/projects.json';
import events from './balance/events.json';
import config from './balance/config.json';
import content from './balance/content.json';

/**
 * IMPORTANT: Structure Synchronization Required!
 * 
 * This file defines the structure for combining balance JSON modules.
 * The structure below is MIRRORED in: shared/utils/dataLoader.ts (loadBalanceData method, lines ~197-270)
 * 
 * If you modify the structure here (add/remove/rename fields), you MUST also update:
 * - shared/utils/dataLoader.ts -> loadBalanceData() -> Node.js environment section
 * 
 * This duplication is necessary because:
 * - Browser/Vite builds can import this TypeScript module directly
 * - Node.js/tsx runtime cannot dynamically import TS files with JSON imports
 * - The dataLoader handles both environments appropriately
 */

// Reconstruct the exact original balance.json structure
// This ensures 100% backward compatibility
const balance = {
  // Root level properties from config
  version: config.version,
  generated: config.generated,
  description: config.description,
  
  // Economy section
  economy: {
    starting_money: economy.starting_money,
    monthly_burn_base: economy.monthly_burn_base,
    bankruptcy_threshold: economy.bankruptcy_threshold,
    rng_variance: economy.rng_variance,
    project_costs: economy.project_costs,
    song_count_cost_system: economy.song_count_cost_system,
    marketing_costs: economy.marketing_costs,
    talent_costs: economy.talent_costs
  },
  
  // Time progression section
  time_progression: {
    campaign_length_months: projects.time_progression.campaign_length_months,
    focus_slots_base: projects.time_progression.focus_slots_base,
    focus_slots_unlock_threshold: projects.time_progression.focus_slots_unlock_threshold,
    focus_slots_max: projects.time_progression.focus_slots_max,
    project_durations: projects.time_progression.project_durations,
    seasonal_modifiers: markets.seasonal_modifiers
  },
  
  // Reputation system
  reputation_system: progression.reputation_system,
  
  // Access tier system
  access_tier_system: progression.access_tier_system,
  
  // Artist stats
  artist_stats: artists.artist_stats,
  
  // Market formulas
  market_formulas: markets.market_formulas,
  
  // Side events
  side_events: events.side_events,
  
  // Progression thresholds
  progression_thresholds: progression.progression_thresholds,
  
  // Quality system
  quality_system: quality.quality_system,
  
  // Producer tier system
  producer_tier_system: quality.producer_tier_system,
  
  // Time investment system
  time_investment_system: quality.time_investment_system,
  
  // UI constants
  ui_constants: config.ui_constants,
  
  // Save system
  save_system: projects.save_system,
  
  // Difficulty modifiers
  difficulty_modifiers: progression.difficulty_modifiers,
  
  // Content generation
  song_generation: content.song_generation
};

// Default export for backward compatibility
export default balance;

// Named exports for optimized imports
export {
  economy,
  progression,
  quality,
  artists,
  markets,
  projects,
  events,
  config,
  content
};