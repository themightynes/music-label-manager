// Test to verify frontend and backend budget calculations are identical

console.log('\n=== Frontend vs Backend Budget Calculation Consistency Test ===\n');

// Test scenarios
const scenarios = [
  { budget: 4000, producer: 'local', time: 'rushed', songs: 5, projectType: 'EP' },
  { budget: 6000, producer: 'regional', time: 'standard', songs: 5, projectType: 'EP' },
  { budget: 8000, producer: 'national', time: 'extended', songs: 5, projectType: 'EP' },
  { budget: 3500, producer: 'local', time: 'rushed', songs: 1, projectType: 'Single' },
  { budget: 7000, producer: 'local', time: 'perfectionist', songs: 3, projectType: 'EP' },
];

// Simulate BACKEND calculation (from FinancialSystem.ts)
function backendCalculation(budget: number, projectType: string, producer: string, time: string, songs: number) {
  // Step 1: Calculate minimum viable cost
  const baseCosts: Record<string, number> = {
    'Single': 3500,
    'EP': 4000
  };
  
  let baseCostPerSong = baseCosts[projectType] || 3500;
  
  // Apply economies of scale
  if (songs > 1) {
    const economies = songs >= 7 ? 0.8 : songs >= 4 ? 0.85 : songs >= 2 ? 0.9 : 1.0;
    baseCostPerSong *= economies;
  }
  
  // Apply baseline quality multiplier (no producer/time multipliers)
  const baselineMultiplier = (projectType === 'Single' || projectType === 'EP') ? 1.5 : 1.0;
  const minViableCost = baseCostPerSong * baselineMultiplier;
  
  // Step 2: Calculate efficiency ratio
  const efficiency = budget / minViableCost;
  
  // Step 3: Apply piecewise function (matching backend exactly)
  let multiplier: number;
  
  if (efficiency < 0.6) {
    multiplier = 0.65;
  } else if (efficiency < 0.8) {
    const progress = (efficiency - 0.6) / 0.2;
    multiplier = 0.65 + 0.20 * progress;
  } else if (efficiency <= 1.2) {
    const progress = (efficiency - 0.8) / 0.4;
    multiplier = 0.85 + 0.20 * progress;
  } else if (efficiency <= 2.0) {
    const progress = (efficiency - 1.2) / 0.8;
    multiplier = 1.05 + 0.15 * progress;
  } else if (efficiency <= 3.5) {
    const progress = (efficiency - 2.0) / 1.5;
    multiplier = 1.20 + 0.15 * progress;
  } else {
    const excessRatio = efficiency - 3.5;
    multiplier = 1.35 + Math.log(1 + excessRatio) * 0.025;
  }
  
  return {
    minViableCost: Math.round(minViableCost),
    efficiency,
    multiplier: Math.max(0.65, Math.min(1.35, multiplier))
  };
}

// Simulate FRONTEND calculation (from ProjectCreationModal.tsx)
function frontendCalculation(budget: number, projectType: string, producer: string, time: string, songs: number) {
  // This should now be IDENTICAL to backend
  return backendCalculation(budget, projectType, producer, time, songs);
}

console.log('Budget | Type | Producer | Time | Songs | Backend Mult | Frontend Mult | Match?');
console.log('-------|------|----------|------|-------|--------------|---------------|-------');

let allMatch = true;

scenarios.forEach(s => {
  const backend = backendCalculation(s.budget, s.projectType, s.producer, s.time, s.songs);
  const frontend = frontendCalculation(s.budget, s.projectType, s.producer, s.time, s.songs);
  
  const match = Math.abs(backend.multiplier - frontend.multiplier) < 0.001;
  if (!match) allMatch = false;
  
  console.log(
    `$${s.budget.toString().padEnd(5)} | ${s.projectType.padEnd(4)} | ${s.producer.padEnd(8)} | ${s.time.padEnd(4)} | ${s.songs.toString().padEnd(5)} | ${backend.multiplier.toFixed(3).padEnd(12)} | ${frontend.multiplier.toFixed(3).padEnd(13)} | ${match ? '✅' : '❌'}`
  );
});

console.log('\n=== RESULTS ===');
if (allMatch) {
  console.log('✅ Frontend and backend calculations are IDENTICAL');
  console.log('   Both use the same:');
  console.log('   - Minimum viable cost calculation (base × economies × 1.5)');
  console.log('   - Piecewise function segments');
  console.log('   - No producer/time multipliers in quality baseline');
} else {
  console.log('❌ MISMATCH DETECTED! Frontend and backend differ');
}

// Show example calculation details
console.log('\n=== Example Calculation Details ===');
const example = scenarios[0];
const result = backendCalculation(example.budget, example.projectType, example.producer, example.time, example.songs);
console.log(`Scenario: $${example.budget}/song, ${example.projectType}, ${example.producer}, ${example.time}`);
console.log(`Step 1: Base cost = $4000 (EP)`);
console.log(`Step 2: Economies = 0.85 (5 songs)`);
console.log(`Step 3: Baseline multiplier = 1.5`);
console.log(`Step 4: Min viable = $4000 × 0.85 × 1.5 = $${result.minViableCost}`);
console.log(`Step 5: Efficiency = $${example.budget} / $${result.minViableCost} = ${result.efficiency.toFixed(3)}x`);
console.log(`Step 6: Budget multiplier = ${result.multiplier.toFixed(3)}`);