#!/usr/bin/env node

/**
 * Comprehensive Song Quality Testing Script
 * Tests various recording session scenarios with 5-song EPs
 */

const path = require('path');
const fs = require('fs');

// Import the compiled JavaScript modules
const { GameDataLoader } = require('./dist/server/services/GameDataLoader.js');
const { FinancialSystem } = require('./dist/shared/engine/FinancialSystem.js');
const { GameEngine } = require('./dist/shared/engine/game-engine.js');

// Initialize systems
const gameData = new GameDataLoader();
const financialSystem = new FinancialSystem(gameData);

// Test configuration
const SONG_COUNT = 5;
const PROJECT_TYPE = 'EP';
const SIMULATIONS_PER_SCENARIO = 5;

// Test parameters
const ARTIST_TALENTS = [30, 50, 70, 90];
const PRODUCER_TIERS = ['local', 'regional', 'national', 'legendary'];
const TIME_INVESTMENTS = ['rushed', 'standard', 'extended', 'perfectionist'];
const BUDGET_LEVELS = [
  { name: 'minimum', multiplier: 0.5 },
  { name: 'below_standard', multiplier: 0.7 },
  { name: 'efficient', multiplier: 1.0 },
  { name: 'premium', multiplier: 1.5 },
  { name: 'luxury', multiplier: 2.5 }
];

const results = [];

// Create mock engine for testing
function createMockEngine() {
  const engine = new GameEngine(gameData, {});
  
  // Make getRandom deterministic but varied
  let seed = Math.floor(Math.random() * 100000);
  engine.getRandom = (min, max) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const random = seed / 2147483648;
    return min + (max - min) * random;
  };
  
  return engine;
}

// Calculate standard deviation
function calculateStdDev(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

// Main test function
async function runTests() {
  console.log('🎵 Song Quality Testing - 5-Song EPs');
  console.log('='.repeat(80));
  console.log(`Testing ${ARTIST_TALENTS.length} talent levels × ${PRODUCER_TIERS.length} producers`);
  console.log(`× ${TIME_INVESTMENTS.length} time options × ${BUDGET_LEVELS.length} budget levels`);
  console.log(`= ${ARTIST_TALENTS.length * PRODUCER_TIERS.length * TIME_INVESTMENTS.length * BUDGET_LEVELS.length} total scenarios`);
  console.log('='.repeat(80));
  console.log();

  let scenarioCount = 0;

  for (const talent of ARTIST_TALENTS) {
    for (const producer of PRODUCER_TIERS) {
      for (const time of TIME_INVESTMENTS) {
        for (const budget of BUDGET_LEVELS) {
          scenarioCount++;
          
          // Calculate budget
          const minViableCost = financialSystem.calculateDynamicMinimumViableCost(
            PROJECT_TYPE, producer, time, SONG_COUNT
          );
          const budgetPerSong = Math.round(minViableCost * budget.multiplier);
          const efficiencyRatio = budgetPerSong / minViableCost;
          
          // Get project cost
          const projectCost = financialSystem.calculatePerSongProjectCost(
            budgetPerSong, SONG_COUNT, producer, time
          );
          
          // Get budget multiplier
          const budgetMultiplier = financialSystem.calculateBudgetQualityMultiplier(
            budgetPerSong, PROJECT_TYPE, producer, time, SONG_COUNT
          );
          
          // Calculate expected variance
          const producerSkillMap = {
            'local': 40, 'regional': 55, 'national': 75, 'legendary': 95
          };
          const producerSkill = producerSkillMap[producer];
          const combinedSkill = (talent + producerSkill) / 2;
          const expectedVariance = 20 - (18 * (combinedSkill / 100));
          
          // Run simulations
          const allQualities = [];
          
          for (let sim = 0; sim < SIMULATIONS_PER_SCENARIO; sim++) {
            const engine = createMockEngine();
            
            const mockArtist = {
              id: 'test',
              name: `Artist-T${talent}`,
              talent: talent,
              workEthic: 60,
              popularity: 30,
              mood: 50,
              weeklyFee: 5000
            };
            
            // Generate 5 songs
            for (let i = 0; i < SONG_COUNT; i++) {
              const quality = engine.calculateEnhancedSongQuality(
                mockArtist, producer, time, budgetPerSong, PROJECT_TYPE, SONG_COUNT
              );
              allQualities.push(quality);
            }
          }
          
          // Calculate stats
          const avgQuality = allQualities.reduce((a, b) => a + b, 0) / allQualities.length;
          const minQuality = Math.min(...allQualities);
          const maxQuality = Math.max(...allQualities);
          const stdDev = calculateStdDev(allQualities);
          const variance = ((maxQuality - minQuality) / avgQuality) * 100;
          
          results.push({
            scenario: `T${talent}_${producer}_${time}_${budget.name}`,
            talent,
            producer,
            time,
            budget: budget.name,
            budgetPerSong,
            minViableCost: Math.round(minViableCost),
            efficiency: efficiencyRatio,
            totalCost: projectCost.totalCost,
            budgetMult: budgetMultiplier,
            avgQuality: Math.round(avgQuality * 10) / 10,
            minQuality,
            maxQuality,
            stdDev: Math.round(stdDev * 10) / 10,
            variance: Math.round(variance * 10) / 10,
            expectedVar: Math.round(expectedVariance * 10) / 10
          });
          
          process.stdout.write(`\rProcessed ${scenarioCount} scenarios...`);
        }
      }
    }
  }
  
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 ANALYSIS RESULTS');
  console.log('='.repeat(80));
  
  // Show impact of each factor
  showTalentImpact();
  showProducerImpact();
  showTimeImpact();
  showBudgetImpact();
  showBestValueScenarios();
  showVarianceAnalysis();
  
  // Save results
  fs.writeFileSync('song-quality-results.json', JSON.stringify(results, null, 2));
  console.log('\n✅ Full results saved to: song-quality-results.json');
}

function showTalentImpact() {
  console.log('\n1️⃣ TALENT IMPACT (Regional Producer, Standard Time, Efficient Budget):');
  console.log('\nTalent | Avg Quality | Min-Max | Variance | Expected');
  console.log('-'.repeat(55));
  
  const filtered = results.filter(r => 
    r.producer === 'regional' && r.time === 'standard' && r.budget === 'efficient'
  );
  
  filtered.forEach(r => {
    console.log(`  ${String(r.talent).padEnd(4)} | ${String(r.avgQuality).padEnd(11)} | ${r.minQuality}-${String(r.maxQuality).padEnd(3)} | ${String(r.variance + '%').padEnd(8)} | ±${r.expectedVar}%`);
  });
}

function showProducerImpact() {
  console.log('\n2️⃣ PRODUCER IMPACT (Talent 50, Standard Time, Efficient Budget):');
  console.log('\nProducer   | Quality | Cost      | $/Quality | Variance');
  console.log('-'.repeat(60));
  
  const filtered = results.filter(r => 
    r.talent === 50 && r.time === 'standard' && r.budget === 'efficient'
  );
  
  filtered.forEach(r => {
    const costPerQ = Math.round(r.totalCost / r.avgQuality);
    console.log(`${r.producer.padEnd(10)} | ${String(r.avgQuality).padEnd(7)} | $${String(r.totalCost).padEnd(8)} | $${String(costPerQ).padEnd(8)} | ${r.variance}%`);
  });
}

function showTimeImpact() {
  console.log('\n3️⃣ TIME IMPACT (Talent 50, Regional Producer, Efficient Budget):');
  console.log('\nTime          | Quality | Cost      | vs Standard');
  console.log('-'.repeat(55));
  
  const filtered = results.filter(r => 
    r.talent === 50 && r.producer === 'regional' && r.budget === 'efficient'
  );
  
  const standard = filtered.find(r => r.time === 'standard');
  
  filtered.forEach(r => {
    const diff = ((r.avgQuality / standard.avgQuality - 1) * 100).toFixed(1);
    const sign = diff > 0 ? '+' : '';
    console.log(`${r.time.padEnd(13)} | ${String(r.avgQuality).padEnd(7)} | $${String(r.totalCost).padEnd(8)} | ${sign}${diff}%`);
  });
}

function showBudgetImpact() {
  console.log('\n4️⃣ BUDGET IMPACT (Talent 50, Regional Producer, Standard Time):');
  console.log('\nBudget        | $/Song  | Efficiency | Mult  | Quality');
  console.log('-'.repeat(60));
  
  const filtered = results.filter(r => 
    r.talent === 50 && r.producer === 'regional' && r.time === 'standard'
  );
  
  filtered.forEach(r => {
    console.log(`${r.budget.padEnd(13)} | $${String(r.budgetPerSong).padEnd(6)} | ${r.efficiency.toFixed(2).padEnd(10)} | ${r.budgetMult.toFixed(3).padEnd(5)} | ${r.avgQuality}`);
  });
}

function showBestValueScenarios() {
  console.log('\n5️⃣ BEST VALUE (Quality per $1000):');
  console.log('\nRank | Configuration                    | Quality/$1k | Quality | Cost');
  console.log('-'.repeat(75));
  
  const sorted = [...results].sort((a, b) => 
    (b.avgQuality / b.totalCost) - (a.avgQuality / a.totalCost)
  ).slice(0, 5);
  
  sorted.forEach((r, i) => {
    const value = (r.avgQuality / (r.totalCost / 1000)).toFixed(1);
    const config = `T${r.talent} ${r.producer} ${r.time} ${r.budget}`;
    console.log(`  ${i+1}  | ${config.padEnd(32)} | ${value.padEnd(11)} | ${String(r.avgQuality).padEnd(7)} | $${r.totalCost}`);
  });
}

function showVarianceAnalysis() {
  console.log('\n6️⃣ CONSISTENCY (Low Variance = More Consistent):');
  
  console.log('\nMost Consistent:');
  console.log('Configuration                    | Variance | Skill');
  console.log('-'.repeat(55));
  
  const sorted = [...results].sort((a, b) => a.variance - b.variance);
  sorted.slice(0, 3).forEach(r => {
    const config = `T${r.talent} ${r.producer} ${r.time} ${r.budget}`;
    const skill = { 'local': 40, 'regional': 55, 'national': 75, 'legendary': 95 }[r.producer];
    const combined = (r.talent + skill) / 2;
    console.log(`${config.padEnd(32)} | ${String(r.variance + '%').padEnd(8)} | ${combined}`);
  });
  
  console.log('\nLeast Consistent:');
  console.log('Configuration                    | Variance | Skill');
  console.log('-'.repeat(55));
  
  sorted.slice(-3).reverse().forEach(r => {
    const config = `T${r.talent} ${r.producer} ${r.time} ${r.budget}`;
    const skill = { 'local': 40, 'regional': 55, 'national': 75, 'legendary': 95 }[r.producer];
    const combined = (r.talent + skill) / 2;
    console.log(`${config.padEnd(32)} | ${String(r.variance + '%').padEnd(8)} | ${combined}`);
  });
}

// Run tests
runTests().catch(console.error);