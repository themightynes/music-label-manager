// Test to verify the calibration fix for budget factor calculation
// After adding 1.5x multiplier to minimum viable cost

const testCase = {
  budgetPerSong: 4000,
  projectType: 'ep',
  producerTier: 'local',
  timeInvestment: 'rushed',
  songCount: 5
};

console.log('\n=== Testing Budget Calibration Fix ===\n');
console.log('Test Parameters:');
console.log('- Budget per song: $' + testCase.budgetPerSong);
console.log('- Project type: ' + testCase.projectType);
console.log('- Producer tier: ' + testCase.producerTier);
console.log('- Time investment: ' + testCase.timeInvestment);
console.log('- Song count: ' + testCase.songCount);
console.log('');

// Step 1: Calculate NEW minimum viable cost with 1.5x multiplier
const baseCostPerSong = 4000; // From economy.json for EP
const producerMultiplier = 1.0; // Local producer
const timeMultiplier = 0.7; // Rushed
const economiesMultiplier = 0.85; // 5 songs = medium project
const baselineQualityMultiplier = 1.5; // NEW: For recording sessions

console.log('Step 1 - NEW Minimum Viable Cost Calculation:');
console.log('  Base cost per song (EP): $' + baseCostPerSong);
console.log('  Producer multiplier (local): ' + producerMultiplier + 'x');
console.log('  Time multiplier (rushed): ' + timeMultiplier + 'x');
console.log('  Economies of scale (5 songs): ' + economiesMultiplier + 'x');
console.log('  🆕 Baseline quality multiplier: ' + baselineQualityMultiplier + 'x');

const minViableCost = baseCostPerSong * economiesMultiplier * producerMultiplier * timeMultiplier * baselineQualityMultiplier;
console.log('  Calculation: $' + baseCostPerSong + ' × ' + economiesMultiplier + ' × ' + producerMultiplier + ' × ' + timeMultiplier + ' × ' + baselineQualityMultiplier);
console.log('  NEW minimum viable cost: $' + minViableCost.toFixed(2));
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
  const progress = (efficiencyRatio - 0.6) / (0.8 - 0.6);
  expectedMultiplier = 0.65 + (0.85 - 0.65) * progress;
} else if (efficiencyRatio <= 1.2) {
  segment = 'Efficient range (0.8-1.2x)';
  const progress = (efficiencyRatio - 0.8) / (1.2 - 0.8);
  expectedMultiplier = 0.85 + (1.05 - 0.85) * progress;
} else if (efficiencyRatio <= 2.0) {
  segment = 'Premium range (1.2-2.0x)';
  const progress = (efficiencyRatio - 1.2) / (2.0 - 1.2);
  expectedMultiplier = 1.05 + (1.20 - 1.05) * progress;
} else if (efficiencyRatio <= 3.5) {
  segment = 'Luxury range (2.0-3.5x)';
  const progress = (efficiencyRatio - 2.0) / (3.5 - 2.0);
  expectedMultiplier = 1.20 + (1.35 - 1.20) * progress;
} else {
  segment = 'Diminishing returns (> 3.5x)';
  expectedMultiplier = 1.35 + 0.25 * Math.log(efficiencyRatio / 3.5);
}

console.log('  Efficiency ' + efficiencyRatio.toFixed(3) + 'x falls in: ' + segment);
console.log('');

console.log('Step 4 - Expected Budget Factor:');
console.log('  Expected multiplier: ' + expectedMultiplier.toFixed(3));
console.log('');

console.log('=== RESULTS ===');
console.log('✅ BEFORE FIX:');
console.log('  - Minimum viable: $2,380');
console.log('  - Efficiency: 1.681x (Premium range)');
console.log('  - Budget factor: 1.14x');
console.log('  - Problem: 14% quality bonus for minimum budget!');
console.log('');
console.log('✅ AFTER FIX:');
console.log('  - Minimum viable: $' + minViableCost.toFixed(2));
console.log('  - Efficiency: ' + efficiencyRatio.toFixed(3) + 'x (' + segment + ')');
console.log('  - Budget factor: ' + expectedMultiplier.toFixed(3) + 'x');
console.log('  - Result: Nearly neutral quality for minimum budget with cheapest options');
console.log('');

if (expectedMultiplier < 1.05 && expectedMultiplier > 0.95) {
  console.log('✓ CALIBRATION SUCCESSFUL: Minimum budget with cheapest options gives ~neutral quality');
} else if (expectedMultiplier >= 1.05) {
  console.log('⚠️  Still giving quality bonus for minimum budget. May need larger multiplier.');
} else {
  console.log('⚠️  Now penalizing minimum budget. Multiplier may be too large.');
}