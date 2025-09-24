import fs from 'fs/promises';
import path from 'path';

async function compileBalance() {
  console.log('Compiling balance.json from modular files...');
  
  const dataDir = path.join(process.cwd(), 'data');
  const balanceDir = path.join(dataDir, 'balance');
  
  // Read all the balance module files
  const [
    economy,
    progression,
    quality,
    artists,
    markets,
    projects,
    events,
    config,
    content
  ] = await Promise.all([
    'economy.json',
    'progression.json', 
    'quality.json',
    'artists.json',
    'markets.json',
    'projects.json',
    'events.json',
    'config.json',
    'content.json'
  ].map(async (file) => {
    const data = await fs.readFile(path.join(balanceDir, file), 'utf-8');
    return JSON.parse(data);
  }));
  
  // This MUST match balance.ts structure exactly (lines 29-95)
  const balance = {
    // Root level properties from config
    version: config.version,
    generated: config.generated,
    description: config.description,
    
    // Economy section
    economy: economy,
    
    // Progression thresholds
    progression_thresholds: progression.progression_thresholds,
    
    // Quality calculations
    quality_calculations: quality.quality_calculations,
    
    // Artist progression
    artist_progression: artists.artist_progression,
    
    // Market formulas
    market_formulas: markets.market_formulas,
    
    // Reputation system
    reputation_system: progression.reputation_system,
    
    // Access tier system
    access_tier_system: progression.access_tier_system,
    
    // Artist stats
    artist_stats: artists.artist_stats,
    
    // Side events
    side_events: events.side_events,
    
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
    song_generation: content.song_generation,
    
    // Add any missing top-level properties that might be referenced
    song_count_cost_system: economy.song_count_cost_system,
    
    // Add campaign settings from projects.time_progression
    campaign_settings: projects.time_progression,
    
    // Time progression section - MUST match balance.ts structure exactly (line 48-55)
    time_progression: {
      campaign_length_weeks: projects.time_progression.campaign_length_weeks,
      focus_slots_base: projects.time_progression.focus_slots_base,
      focus_slots_unlock_threshold: projects.time_progression.focus_slots_unlock_threshold,
      focus_slots_max: projects.time_progression.focus_slots_max,
      project_durations: projects.time_progression.project_durations,
      seasonal_modifiers: markets.seasonal_modifiers  // THIS WAS MISSING! From balance.ts line 54
    },
    
    // Add quality_calculations if missing
    quality_calculations: quality.quality_calculations || {
      artist_multipliers: quality.artist_multipliers,
      production_modifiers: quality.production_modifiers,
      quality_ranges: quality.quality_ranges
    },
    
    // Add artist_progression if missing  
    artist_progression: artists.artist_progression || {
      morale_system: artists.morale_system,
      departure_thresholds: artists.departure_thresholds,
      collaboration_bonus: artists.collaboration_bonus,
      archetype_balance: artists.archetype_balance
    }
  };
  
  // Write the compiled balance.json
  const outputPath = path.join(dataDir, 'balance.json');
  await fs.writeFile(outputPath, JSON.stringify(balance, null, 2));
  
  console.log('✅ Successfully compiled balance.json');
  console.log('📁 Output:', outputPath);
  
  // Also create a backup of balance.ts for reference
  const balanceTsPath = path.join(dataDir, 'balance.ts');
  const backupPath = path.join(dataDir, 'balance.ts.backup');
  
  try {
    await fs.copyFile(balanceTsPath, backupPath);
    console.log('📋 Backed up balance.ts to balance.ts.backup');
  } catch (e) {
    console.log('⚠️  Could not backup balance.ts:', e.message);
  }
  
  // Verify the structure
  console.log('\n🔍 Verifying structure...');
  const verification = JSON.parse(await fs.readFile(outputPath, 'utf-8'));
  
  const requiredPaths = [
    'economy',
    'progression_thresholds',
    'quality_calculations',
    'artist_progression',
    'market_formulas',
    'reputation_system',
    'access_tier_system',
    'producer_tier_system',
    'time_investment_system'
  ];
  
  const missing = [];
  for (const path of requiredPaths) {
    if (!verification[path]) {
      missing.push(path);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required paths:', missing);
  } else {
    console.log('✅ All required paths present');
  }
  
  console.log('\n📊 Structure summary:');
  console.log('  Top-level keys:', Object.keys(verification).length);
  console.log('  Keys:', Object.keys(verification).join(', '));
}

compileBalance().catch(console.error);