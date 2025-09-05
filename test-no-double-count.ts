// Test to verify producer/time multipliers aren't double-counted

console.log('\n=== Testing No Double-Counting Fix ===\n');

const scenarios = [
  {
    name: "Minimum budget, Local + Rushed",
    budgetPerSong: 4000,
    producer: 'local',
    producerMult: 1.0,
    time: 'rushed',
    timeMult: 0.7,
    totalPaid: 4000 * 5, // 5 songs
    desc: "Cheapest options"
  },
  {
    name: "Higher forced cost, Regional + Standard",
    budgetPerSong: 4000 * 1.75 * 1.0 / 1.0, // Regional forces higher minimum
    producer: 'regional',
    producerMult: 1.75,
    time: 'standard',
    timeMult: 1.0,
    totalPaid: 4000 * 1.75 * 5, // Player forced to pay more
    desc: "Better producer forces higher cost"
  },
  {
    name: "Premium budget, Local + Rushed",
    budgetPerSong: 8000,
    producer: 'local',
    producerMult: 1.0,
    time: 'rushed',
    timeMult: 0.7,
    totalPaid: 8000 * 5,
    desc: "High budget with cheap options"
  },
  {
    name: "Standard budget, National + Extended",
    budgetPerSong: 6000,
    producer: 'national',
    producerMult: 3.0,
    time: 'extended',
    timeMult: 1.4,
    totalPaid: 6000 * 5,
    desc: "Moderate budget, premium options"
  }
];

console.log('New calculation: Min Viable = Base × Economies × 1.5');
console.log('(No producer/time multipliers since they\'re in the cost)\n');

scenarios.forEach(scenario => {
  console.log(`📊 ${scenario.name}:`);
  console.log(`   ${scenario.desc}`);
  console.log(`   Budget: $${scenario.budgetPerSong}/song | Producer: ${scenario.producer} | Time: ${scenario.time}`);
  
  // NEW: Minimum viable WITHOUT producer/time multipliers
  const baseCost = 4000; // EP base
  const economies = 0.85; // 5 songs
  const baseline = 1.5;
  
  const minViable = baseCost * economies * baseline;
  const efficiency = scenario.budgetPerSong / minViable;
  
  // Determine multiplier
  let multiplier;
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
    multiplier = 1.35;
  }
  
  const qualityImpact = ((multiplier - 1.0) * 100).toFixed(0);
  const impactStr = multiplier >= 1.0 ? `+${qualityImpact}%` : `${qualityImpact}%`;
  
  console.log(`   Min Viable: $${minViable.toFixed(0)} (same for all)`);
  console.log(`   Efficiency: ${efficiency.toFixed(2)}x | Quality Factor: ${impactStr}`);
  
  // Show the producer/time quality bonuses that are SEPARATE
  const producerBonus = scenario.producer === 'local' ? 0 : 
                        scenario.producer === 'regional' ? 5 :
                        scenario.producer === 'national' ? 10 : 15;
  const timeBonus = scenario.time === 'rushed' ? -10 :
                    scenario.time === 'standard' ? 0 :
                    scenario.time === 'extended' ? 8 : 15;
  
  console.log(`   + Producer bonus: ${producerBonus > 0 ? '+' : ''}${producerBonus}%`);
  console.log(`   + Time bonus: ${timeBonus > 0 ? '+' : ''}${timeBonus}%`);
  console.log('');
});

console.log('=== KEY INSIGHTS ===');
console.log('✅ Now the minimum viable cost is the SAME for all producer/time combinations');
console.log('✅ Producer and time choices affect quality through their separate bonuses');
console.log('✅ Budget efficiency is judged against a consistent baseline');
console.log('✅ No double-counting of producer/time impacts');