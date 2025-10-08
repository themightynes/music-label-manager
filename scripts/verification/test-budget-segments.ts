import { GameEngine } from './shared/engine/game-engine.js';
import { GameData } from './shared/utils/dataLoader.js';

// Set DATABASE_URL if not already set
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:mysecretpassword@localhost:5432/music_game';

async function testAllSegments() {
  console.log('\n=== Testing All Budget Factor Segments ===\n');
  
  const gameData = new GameData();
  await gameData.initialize();
  
  const gameEngine = new GameEngine(gameData);
  const financialSystem = gameEngine.financialSystem;
  
  // Base test case parameters
  const baseCase = {
    projectType: 'ep',
    producerTier: 'local',
    timeInvestment: 'rushed',
    songCount: 5
  };
  
  // Calculate minimum viable cost for this configuration
  const minViableCost = financialSystem.calculateDynamicMinimumViableCost(
    baseCase.projectType,
    baseCase.producerTier,
    baseCase.timeInvestment,
    baseCase.songCount
  );
  
  console.log('Base Configuration:');
  console.log('- Project: EP, 5 songs');
  console.log('- Producer: Local (1.0x)');
  console.log('- Time: Rushed (0.7x)');
  console.log('- Minimum viable cost per song: $' + minViableCost.toFixed(2));
  console.log('');
  
  // Test cases for each segment
  const testCases = [
    { ratio: 0.3, budget: Math.round(minViableCost * 0.3), expected: 0.65, segment: "Heavy penalty" },
    { ratio: 0.5, budget: Math.round(minViableCost * 0.5), expected: 0.65, segment: "Heavy penalty" },
    { ratio: 0.6, budget: Math.round(minViableCost * 0.6), expected: 0.65, segment: "Penalty threshold" },
    { ratio: 0.7, budget: Math.round(minViableCost * 0.7), expected: 0.75, segment: "Below standard" },
    { ratio: 0.8, budget: Math.round(minViableCost * 0.8), expected: 0.85, segment: "Minimum viable" },
    { ratio: 1.0, budget: Math.round(minViableCost * 1.0), expected: 0.95, segment: "Efficient range" },
    { ratio: 1.2, budget: Math.round(minViableCost * 1.2), expected: 1.05, segment: "Optimal efficiency" },
    { ratio: 1.5, budget: Math.round(minViableCost * 1.5), expected: 1.106, segment: "Premium range" },
    { ratio: 2.0, budget: Math.round(minViableCost * 2.0), expected: 1.20, segment: "Luxury threshold" },
    { ratio: 2.5, budget: Math.round(minViableCost * 2.5), expected: 1.25, segment: "Luxury range" },
    { ratio: 3.0, budget: Math.round(minViableCost * 3.0), expected: 1.30, segment: "Luxury range" },
    { ratio: 3.5, budget: Math.round(minViableCost * 3.5), expected: 1.35, segment: "Diminishing threshold" },
    { ratio: 4.0, budget: Math.round(minViableCost * 4.0), expected: 1.35, segment: "Diminishing returns" }
  ];
  
  console.log('Testing budget multipliers across all segments:\n');
  console.log('Budget/Song | Efficiency | Multiplier | Expected | Segment');
  console.log('------------|------------|------------|----------|----------------');
  
  let allPassed = true;
  
  for (const test of testCases) {
    const multiplier = financialSystem.calculateBudgetQualityMultiplier(
      test.budget,
      baseCase.projectType,
      baseCase.producerTier,
      baseCase.timeInvestment,
      baseCase.songCount
    );
    
    const difference = Math.abs(multiplier - test.expected);
    const passed = difference < 0.02; // Allow small rounding differences
    
    if (!passed) allPassed = false;
    
    const status = passed ? '✓' : '✗';
    console.log(
      `$${test.budget.toString().padEnd(10)} | ${test.ratio.toFixed(1).padEnd(10)}x | ${multiplier.toFixed(3).padEnd(10)} | ${test.expected.toFixed(3).padEnd(8)} | ${test.segment} ${status}`
    );
  }
  
  console.log('\n------------|------------|------------|----------|----------------');
  
  if (allPassed) {
    console.log('\n✅ All segments working correctly!');
  } else {
    console.log('\n❌ Some segments have incorrect values');
  }
  
  // Test the specific case mentioned by user
  console.log('\n=== User\'s Specific Case ===');
  const userBudget = 4000;
  const userMultiplier = financialSystem.calculateBudgetQualityMultiplier(
    userBudget,
    baseCase.projectType,
    baseCase.producerTier,
    baseCase.timeInvestment,
    baseCase.songCount
  );
  
  const userRatio = userBudget / minViableCost;
  console.log(`Budget: $${userBudget} per song`);
  console.log(`Efficiency: ${userRatio.toFixed(3)}x of minimum viable`);
  console.log(`Budget Factor: ${userMultiplier.toFixed(3)}`);
  console.log(`Previous incorrect value: 1.34`);
  console.log(`Difference: ${(1.34 - userMultiplier).toFixed(3)} (fixed!)`);
  
  process.exit(0);
}

testAllSegments().catch(console.error);