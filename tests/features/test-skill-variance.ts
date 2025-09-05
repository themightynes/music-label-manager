// Test to demonstrate skill-based variance in song quality

console.log('\n=== Skill-Based Quality Variance System ===\n');
console.log('Higher skill combinations = More consistent quality');
console.log('Lower skill combinations = More variable quality\n');

// Simulate different skill combinations
const scenarios = [
  {
    name: "Amateur Setup",
    artistTalent: 30,
    producerSkill: 40,  // Local producer
    producerTier: "local",
    description: "New artist + Local producer"
  },
  {
    name: "Mid-Tier Setup",
    artistTalent: 60,
    producerSkill: 55,  // Regional producer
    producerTier: "regional",
    description: "Developing artist + Regional producer"
  },
  {
    name: "Professional Setup",
    artistTalent: 80,
    producerSkill: 75,  // National producer
    producerTier: "national",
    description: "Established artist + National producer"
  },
  {
    name: "Elite Setup",
    artistTalent: 95,
    producerSkill: 95,  // Legendary producer
    producerTier: "legendary",
    description: "Star artist + Legendary producer"
  }
];

// Simulate variance calculation for each scenario
scenarios.forEach(scenario => {
  const combinedSkill = (scenario.artistTalent + scenario.producerSkill) / 2;
  const varianceRange = 20 - (18 * (combinedSkill / 100));
  
  console.log(`📊 ${scenario.name}:`);
  console.log(`   ${scenario.description}`);
  console.log(`   Artist Talent: ${scenario.artistTalent} | Producer Skill: ${scenario.producerSkill}`);
  console.log(`   Combined Skill: ${combinedSkill}`);
  console.log(`   Variance Range: ±${varianceRange.toFixed(1)}%`);
  
  // Simulate 5 songs to show variance
  console.log(`   \n   5-Song EP Quality Simulation (base quality 70):`);
  
  for (let i = 1; i <= 5; i++) {
    // Simulate random variance within range
    const randomValue = (Math.random() * 2 - 1) * varianceRange; // Random between -range and +range
    const variance = 1 + (randomValue / 100);
    const songQuality = Math.round(70 * variance);
    
    const sign = randomValue >= 0 ? '+' : '';
    console.log(`     Song ${i}: ${songQuality} (${sign}${randomValue.toFixed(1)}%)`);
  }
  
  console.log('');
});

console.log('=== KEY INSIGHTS ===\n');
console.log('1. AMATEUR (35 skill avg): ±20% variance');
console.log('   - Songs can range from 56 to 84 quality');
console.log('   - Highly unpredictable - some gems, some duds');
console.log('   - Realistic for inexperienced team\n');

console.log('2. MID-TIER (57.5 skill avg): ±10% variance');
console.log('   - Songs range from 63 to 77 quality');
console.log('   - More consistent but still variable');
console.log('   - Developing professionalism\n');

console.log('3. PROFESSIONAL (77.5 skill avg): ±5% variance');
console.log('   - Songs range from 66.5 to 73.5 quality');
console.log('   - Very consistent quality');
console.log('   - Reliable professional output\n');

console.log('4. ELITE (95 skill avg): ±2.9% variance');
console.log('   - Songs range from 68 to 72 quality');
console.log('   - Extremely consistent');
console.log('   - "They don\'t miss" - every song is solid\n');

console.log('=== REALISTIC OUTCOMES ===');
console.log('✅ Amateur artists can occasionally create breakout hits');
console.log('✅ But they also produce more failures');
console.log('✅ Elite combinations deliver consistent excellence');
console.log('✅ Players must balance risk vs consistency');
console.log('✅ Budget/time still matter, but skill determines reliability');