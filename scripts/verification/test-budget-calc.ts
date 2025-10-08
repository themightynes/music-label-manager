import { GameEngine } from './shared/engine/game-engine.js';
import { GameData } from './server/services/game-data.js';
import dotenv from 'dotenv';

dotenv.config();

async function testBudgetCalculation() {
  console.log('\n=== Testing Budget Factor Calculation ===\n');
  
  const gameData = new GameData();
  await gameData.initialize();
  
  const gameEngine = new GameEngine(gameData);
  const financialSystem = gameEngine.financialSystem;
  
  // Test scenario: Local producer, rushed, $4000 per song, 5 songs
  const testCase = {
    budgetPerSong: 4000,
    projectType: 'ep',
    producerTier: 'local',
    timeInvestment: 'rushed',
    songCount: 5
  };
  
  console.log('Test Parameters:');
  console.log('- Budget per song: $' + testCase.budgetPerSong);
  console.log('- Project type: ' + testCase.projectType);
  console.log('- Producer tier: ' + testCase.producerTier);
  console.log('- Time investment: ' + testCase.timeInvestment);
  console.log('- Song count: ' + testCase.songCount);
  console.log('');
  
  // Step 1: Calculate minimum viable cost
  const minViableCost = financialSystem.calculateDynamicMinimumViableCost(
    testCase.projectType,
    testCase.producerTier,
    testCase.timeInvestment,
    testCase.songCount
  );
  
  console.log('Step 1 - Minimum Viable Cost Calculation:');
  
  // Get base cost details
  const balance = gameData.getBalanceConfigSync();
  const economy = balance.economy;
  const songCountSystem = economy.song_count_cost_system;
  const baseCostPerSong = songCountSystem.base_per_song_cost[testCase.projectType.toLowerCase()] || 4000;
  
  console.log('  Base cost per song (EP): $' + baseCostPerSong);
  
  // Producer multiplier
  const producerSystem = balance.quality_system.producer_tier_system;
  const producerMultiplier = producerSystem[testCase.producerTier].multiplier;
  console.log('  Producer multiplier (local): ' + producerMultiplier + 'x');
  
  // Time multiplier
  const timeSystem = balance.quality_system.time_investment_system;
  const timeMultiplier = timeSystem[testCase.timeInvestment].multiplier;
  console.log('  Time multiplier (rushed): ' + timeMultiplier + 'x');
  
  // Economies of scale
  const economiesConfig = songCountSystem.economies_of_scale;
  let economiesMultiplier = 1.0;
  if (economiesConfig.enabled) {
    if (testCase.songCount >= economiesConfig.thresholds.large_project) {
      economiesMultiplier = economiesConfig.breakpoints.large_project;
    } else if (testCase.songCount >= economiesConfig.thresholds.medium_project) {
      economiesMultiplier = economiesConfig.breakpoints.medium_project;
    } else if (testCase.songCount >= economiesConfig.thresholds.small_project) {
      economiesMultiplier = economiesConfig.breakpoints.small_project;
    }
  }
  console.log('  Economies of scale (5 songs = medium): ' + economiesMultiplier + 'x');
  
  const calculatedMinViable = baseCostPerSong * producerMultiplier * timeMultiplier * economiesMultiplier;
  console.log('  Calculated: $' + baseCostPerSong + ' × ' + producerMultiplier + ' × ' + timeMultiplier + ' × ' + economiesMultiplier + ' = $' + calculatedMinViable.toFixed(2));
  console.log('  Actual minimum viable cost: $' + minViableCost.toFixed(2));
  console.log('');
  
  // Step 2: Calculate efficiency ratio
  const efficiencyRatio = testCase.budgetPerSong / minViableCost;
  console.log('Step 2 - Efficiency Ratio:');
  console.log('  $' + testCase.budgetPerSong + ' / $' + minViableCost.toFixed(2) + ' = ' + efficiencyRatio.toFixed(3) + 'x');
  console.log('');
  
  // Step 3: Determine which segment and calculate multiplier
  const budgetSystem = balance.quality_system.budget_quality_system;
  const breakpoints = budgetSystem.efficiency_breakpoints;
  
  console.log('Step 3 - Piecewise Function Segment:');
  console.log('  Breakpoints: < ' + breakpoints.penalty_threshold + ' | ' + 
    breakpoints.minimum_viable + ' | ' + 
    breakpoints.optimal_efficiency + ' | ' + 
    breakpoints.luxury_threshold + ' | ' + 
    breakpoints.diminishing_threshold + ' <');
  
  let segment = '';
  if (efficiencyRatio < breakpoints.penalty_threshold) {
    segment = 'Heavy penalty (< 0.6x)';
  } else if (efficiencyRatio < breakpoints.minimum_viable) {
    segment = 'Below standard (0.6-0.8x)';
  } else if (efficiencyRatio <= breakpoints.optimal_efficiency) {
    segment = 'Efficient range (0.8-1.2x)';
  } else if (efficiencyRatio <= breakpoints.luxury_threshold) {
    segment = 'Premium range (1.2-2.0x)';
  } else if (efficiencyRatio <= breakpoints.diminishing_threshold) {
    segment = 'Luxury range (2.0-3.5x)';
  } else {
    segment = 'Diminishing returns (> 3.5x)';
  }
  
  console.log('  Efficiency ' + efficiencyRatio.toFixed(3) + 'x falls in: ' + segment);
  console.log('');
  
  // Step 4: Get actual multiplier
  const budgetMultiplier = financialSystem.calculateBudgetQualityMultiplier(
    testCase.budgetPerSong,
    testCase.projectType,
    testCase.producerTier,
    testCase.timeInvestment,
    testCase.songCount
  );
  
  console.log('Step 4 - Final Budget Factor:');
  console.log('  Calculated multiplier: ' + budgetMultiplier);
  console.log('');
  
  // Get rating
  const ratingInfo = financialSystem.getBudgetEfficiencyRating(
    testCase.budgetPerSong,
    testCase.projectType,
    testCase.producerTier,
    testCase.timeInvestment,
    testCase.songCount
  );
  
  console.log('Step 5 - Efficiency Rating:');
  console.log('  Rating: ' + ratingInfo.rating);
  console.log('  Description: ' + ratingInfo.description);
  console.log('');
  
  if (budgetMultiplier > 1.3) {
    console.log('⚠️  WARNING: Budget factor is unusually high (' + budgetMultiplier + ')');
    console.log('    Expected maximum is around 1.35x');
  }
  
  process.exit(0);
}

testBudgetCalculation().catch(console.error);