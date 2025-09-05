#!/usr/bin/env node

/**
 * Song Quality Testing Script for 5-song EPs
 * Tests impact of talent, producer, time, and budget on quality
 */

import fs from 'fs';
import { GameDataLoader } from './dist/server/services/GameDataLoader.js';
import { FinancialSystem } from './dist/shared/engine/FinancialSystem.js';
import { GameEngine } from './dist/shared/engine/game-engine.js';

// Initialize systems
const gameData = new GameDataLoader();
const financialSystem = new FinancialSystem(gameData);

// Configuration
const SONG_COUNT = 5;
const PROJECT_TYPE = 'EP';
const SIMS_PER_SCENARIO = 5;

// Test matrix
const TALENTS = [30, 50, 70, 90];
const PRODUCERS = ['local', 'regional', 'national', 'legendary'];
const TIMES = ['rushed', 'standard', 'extended', 'perfectionist'];
const BUDGETS = [
  { name: 'minimum', mult: 0.5 },
  { name: 'below', mult: 0.7 },
  { name: 'efficient', mult: 1.0 },
  { name: 'premium', mult: 1.5 },
  { name: 'luxury', mult: 2.5 }
];

const results = [];

// Create test engine
function createEngine() {
  const engine = new GameEngine(gameData, {});
  let seed = Math.floor(Math.random() * 100000);
  engine.getRandom = (min, max) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return min + (max - min) * (seed / 2147483648);
  };
  return engine;
}

// Calculate stats
function getStats(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return {
    avg: Math.round(mean * 10) / 10,
    min: Math.min(...values),
    max: Math.max(...values),
    std: Math.round(Math.sqrt(variance) * 10) / 10,
    range: Math.round((Math.max(...values) - Math.min(...values)) / mean * 1000) / 10
  };
}

// Run tests
console.log('🎵 Song Quality Test - 5-Song EPs');
console.log('='.repeat(70));
console.log(`Testing: ${TALENTS.length} talents × ${PRODUCERS.length} producers × ${TIMES.length} times × ${BUDGETS.length} budgets`);
console.log(`Total scenarios: ${TALENTS.length * PRODUCERS.length * TIMES.length * BUDGETS.length}`);
console.log('='.repeat(70));
console.log();

let count = 0;
const total = TALENTS.length * PRODUCERS.length * TIMES.length * BUDGETS.length;

for (const talent of TALENTS) {
  for (const producer of PRODUCERS) {
    for (const time of TIMES) {
      for (const budget of BUDGETS) {
        count++;
        
        // Calculate budget
        const minViable = financialSystem.calculateDynamicMinimumViableCost(
          PROJECT_TYPE, producer, time, SONG_COUNT
        );
        const budgetPerSong = Math.round(minViable * budget.mult);
        
        // Get costs
        const projectCost = financialSystem.calculatePerSongProjectCost(
          budgetPerSong, SONG_COUNT, producer, time
        );
        
        // Get budget multiplier
        const budgetMult = financialSystem.calculateBudgetQualityMultiplier(
          budgetPerSong, PROJECT_TYPE, producer, time, SONG_COUNT
        );
        
        // Expected variance
        const skills = { local: 40, regional: 55, national: 75, legendary: 95 };
        const combined = (talent + skills[producer]) / 2;
        const expVar = Math.round((20 - 18 * combined / 100) * 10) / 10;
        
        // Run simulations
        const qualities = [];
        for (let sim = 0; sim < SIMS_PER_SCENARIO; sim++) {
          const engine = createEngine();
          const artist = {
            id: 'test', name: `T${talent}`, talent,
            workEthic: 60, popularity: 30, mood: 50, monthlyFee: 5000
          };
          
          for (let i = 0; i < SONG_COUNT; i++) {
            const q = engine.calculateEnhancedSongQuality(
              artist, producer, time, budgetPerSong, PROJECT_TYPE, SONG_COUNT
            );
            qualities.push(q);
          }
        }
        
        const stats = getStats(qualities);
        
        results.push({
          talent, producer, time, budget: budget.name,
          budgetPerSong, minViable: Math.round(minViable),
          efficiency: Math.round(budgetPerSong / minViable * 100) / 100,
          totalCost: projectCost.totalCost,
          budgetMult: Math.round(budgetMult * 1000) / 1000,
          ...stats, expVar, combined: Math.round(combined)
        });
        
        process.stdout.write(`\rProcessed ${count}/${total} scenarios...`);
      }
    }
  }
}

console.log('\n\n' + '='.repeat(70));
console.log('📊 ANALYSIS RESULTS');
console.log('='.repeat(70));

// 1. Talent Impact
console.log('\n1️⃣ TALENT IMPACT (Regional, Standard, Efficient):');
console.log('\nTalent | Quality | Min-Max | Variance');
console.log('-'.repeat(40));
results.filter(r => r.producer === 'regional' && r.time === 'standard' && r.budget === 'efficient')
  .forEach(r => {
    console.log(`  ${String(r.talent).padEnd(4)} | ${String(r.avg).padEnd(7)} | ${r.min}-${String(r.max).padEnd(3)} | ±${r.expVar}%`);
  });

// 2. Producer Impact
console.log('\n2️⃣ PRODUCER IMPACT (Talent 50, Standard, Efficient):');
console.log('\nProducer   | Quality | Cost     | $/Q');
console.log('-'.repeat(45));
results.filter(r => r.talent === 50 && r.time === 'standard' && r.budget === 'efficient')
  .forEach(r => {
    const cpq = Math.round(r.totalCost / r.avg);
    console.log(`${r.producer.padEnd(10)} | ${String(r.avg).padEnd(7)} | $${String(r.totalCost).padEnd(7)} | $${cpq}`);
  });

// 3. Time Impact
console.log('\n3️⃣ TIME IMPACT (Talent 50, Regional, Efficient):');
console.log('\nTime          | Quality | Cost     | vs Std');
console.log('-'.repeat(48));
const std = results.find(r => r.talent === 50 && r.producer === 'regional' && 
                         r.time === 'standard' && r.budget === 'efficient');
results.filter(r => r.talent === 50 && r.producer === 'regional' && r.budget === 'efficient')
  .forEach(r => {
    const diff = Math.round((r.avg / std.avg - 1) * 1000) / 10;
    const sign = diff >= 0 ? '+' : '';
    console.log(`${r.time.padEnd(13)} | ${String(r.avg).padEnd(7)} | $${String(r.totalCost).padEnd(7)} | ${sign}${diff}%`);
  });

// 4. Budget Impact
console.log('\n4️⃣ BUDGET IMPACT (Talent 50, Regional, Standard):');
console.log('\nBudget    | $/Song | Eff  | Mult  | Quality');
console.log('-'.repeat(50));
results.filter(r => r.talent === 50 && r.producer === 'regional' && r.time === 'standard')
  .forEach(r => {
    console.log(`${r.budget.padEnd(9)} | $${String(r.budgetPerSong).padEnd(5)} | ${String(r.efficiency).padEnd(4)} | ${String(r.budgetMult).padEnd(5)} | ${r.avg}`);
  });

// 5. Best Value
console.log('\n5️⃣ BEST VALUE (Quality/$1000):');
console.log('\nConfig                        | Q/$1k | Quality | Cost');
console.log('-'.repeat(60));
[...results].sort((a, b) => (b.avg / b.totalCost) - (a.avg / a.totalCost))
  .slice(0, 5)
  .forEach((r, i) => {
    const val = Math.round(r.avg / (r.totalCost / 1000) * 10) / 10;
    const cfg = `T${r.talent} ${r.producer.substring(0, 3)} ${r.time.substring(0, 3)} ${r.budget}`;
    console.log(`${cfg.padEnd(29)} | ${String(val).padEnd(5)} | ${String(r.avg).padEnd(7)} | $${r.totalCost}`);
  });

// 6. Highest Quality
console.log('\n6️⃣ HIGHEST QUALITY:');
console.log('\nConfig                        | Quality | Cost');
console.log('-'.repeat(50));
[...results].sort((a, b) => b.avg - a.avg)
  .slice(0, 5)
  .forEach((r, i) => {
    const cfg = `T${r.talent} ${r.producer.substring(0, 3)} ${r.time.substring(0, 3)} ${r.budget}`;
    console.log(`${cfg.padEnd(29)} | ${String(r.avg).padEnd(7)} | $${r.totalCost}`);
  });

// 7. Consistency
console.log('\n7️⃣ CONSISTENCY:');
console.log('\nMost Consistent (Low Variance):');
console.log('Config                        | Range% | Skill');
console.log('-'.repeat(50));
[...results].sort((a, b) => a.range - b.range)
  .slice(0, 3)
  .forEach(r => {
    const cfg = `T${r.talent} ${r.producer.substring(0, 3)} ${r.time.substring(0, 3)} ${r.budget}`;
    console.log(`${cfg.padEnd(29)} | ${String(r.range + '%').padEnd(6)} | ${r.combined}`);
  });

console.log('\nLeast Consistent (High Variance):');
console.log('Config                        | Range% | Skill');
console.log('-'.repeat(50));
[...results].sort((a, b) => b.range - a.range)
  .slice(0, 3)
  .forEach(r => {
    const cfg = `T${r.talent} ${r.producer.substring(0, 3)} ${r.time.substring(0, 3)} ${r.budget}`;
    console.log(`${cfg.padEnd(29)} | ${String(r.range + '%').padEnd(6)} | ${r.combined}`);
  });

// Save results
fs.writeFileSync('song-quality-results.json', JSON.stringify(results, null, 2));
console.log('\n✅ Full results saved to: song-quality-results.json');