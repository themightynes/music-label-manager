// Simple test to reproduce budget factor calculation issue
// Local producer, rushed, $4000 per song, 5 songs

const testCase = {
  budgetPerSong: 4000,
  projectType: 'ep',
  producerTier: 'local',
  timeInvestment: 'rushed',
  songCount: 5
};

console.log('\n=== Testing Budget Factor Calculation ===\n');
console.log('Test Parameters:');
console.log('- Budget per song: $' + testCase.budgetPerSong);
console.log('- Project type: ' + testCase.projectType);
console.log('- Producer tier: ' + testCase.producerTier);
console.log('- Time investment: ' + testCase.timeInvestment);
console.log('- Song count: ' + testCase.songCount);
console.log('');

// Step 1: Calculate minimum viable cost manually
const baseCostPerSong = 4000; // From economy.json for EP
const producerMultiplier = 1.0; // Local producer
const timeMultiplier = 0.7; // Rushed
const economiesMultiplier = 0.85; // 5 songs = medium project

console.log('Step 1 - Minimum Viable Cost Calculation:');
console.log('  Base cost per song (EP): $' + baseCostPerSong);
console.log('  Producer multiplier (local): ' + producerMultiplier + 'x');
console.log('  Time multiplier (rushed): ' + timeMultiplier + 'x');
console.log('  Economies of scale (5 songs = medium): ' + economiesMultiplier + 'x');

const minViableCost = baseCostPerSong * producerMultiplier * timeMultiplier * economiesMultiplier;
console.log('  Minimum viable cost: $' + baseCostPerSong + ' × ' + producerMultiplier + ' × ' + timeMultiplier + ' × ' + economiesMultiplier + ' = $' + minViableCost.toFixed(2));
console.log('');

// Step 2: Calculate efficiency ratio
const efficiencyRatio = testCase.budgetPerSong / minViableCost;
console.log('Step 2 - Efficiency Ratio:');
console.log('  $' + testCase.budgetPerSong + ' / $' + minViableCost.toFixed(2) + ' = ' + efficiencyRatio.toFixed(3) + 'x');
console.log('');

// Step 3: Determine segment and expected multiplier
console.log('Step 3 - Piecewise Function Segment:');
console.log('  Efficiency breakpoints: < 0.6 | 0.8 | 1.2 | 2.0 | 3.5 <');

let segment = '';
let expectedMultiplier = 1.0;

if (efficiencyRatio < 0.6) {
  segment = 'Heavy penalty (< 0.6x)';
  expectedMultiplier = 0.65;
} else if (efficiencyRatio < 0.8) {
  segment = 'Below standard (0.6-0.8x)';
  // Linear interpolation between 0.65 and 0.85
  const progress = (efficiencyRatio - 0.6) / (0.8 - 0.6);
  expectedMultiplier = 0.65 + (0.85 - 0.65) * progress;
} else if (efficiencyRatio <= 1.2) {
  segment = 'Efficient range (0.8-1.2x)';
  // Linear interpolation between 0.85 and 1.05
  const progress = (efficiencyRatio - 0.8) / (1.2 - 0.8);
  expectedMultiplier = 0.85 + (1.05 - 0.85) * progress;
} else if (efficiencyRatio <= 2.0) {
  segment = 'Premium range (1.2-2.0x)';
  // Linear interpolation between 1.05 and 1.20
  const progress = (efficiencyRatio - 1.2) / (2.0 - 1.2);
  expectedMultiplier = 1.05 + (1.20 - 1.05) * progress;
} else if (efficiencyRatio <= 3.5) {
  segment = 'Luxury range (2.0-3.5x)';
  // Linear interpolation between 1.20 and 1.35
  const progress = (efficiencyRatio - 2.0) / (3.5 - 2.0);
  expectedMultiplier = 1.20 + (1.35 - 1.20) * progress;
} else {
  segment = 'Diminishing returns (> 3.5x)';
  // Logarithmic growth
  expectedMultiplier = 1.35 + 0.25 * Math.log(efficiencyRatio / 3.5);
}

console.log('  Efficiency ' + efficiencyRatio.toFixed(3) + 'x falls in: ' + segment);
console.log('');

console.log('Step 4 - Expected Budget Factor:');
console.log('  Expected multiplier: ' + expectedMultiplier.toFixed(3));
console.log('');

if (expectedMultiplier > 1.3) {
  console.log('⚠️  PROBLEM IDENTIFIED:');
  console.log('  The calculation is correct! With efficiency ratio of ' + efficiencyRatio.toFixed(3) + 'x');
  console.log('  (budget $4000 / minimum viable $' + minViableCost.toFixed(2) + '),');
  console.log('  the budget factor of ' + expectedMultiplier.toFixed(3) + ' is actually correct.');
  console.log('');
  console.log('  EXPLANATION: With local producer + rushed time, the minimum viable cost');
  console.log('  is very low ($' + minViableCost.toFixed(2) + '). Spending $4000 per song is');
  console.log('  ' + efficiencyRatio.toFixed(1) + 'x the minimum, putting it in the "' + segment + '".');
  console.log('  This gives a high quality bonus as intended by the system.');
} else {
  console.log('✓ Budget factor seems reasonable at ' + expectedMultiplier.toFixed(3));
}