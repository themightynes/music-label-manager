#!/usr/bin/env npx tsx

/**
 * Comprehensive Song Quality Testing Script
 * Tests various recording session scenarios with 5-song EPs
 * Analyzes impact of artist traits, time, budget, and producer levels
 */

import { GameEngine } from './shared/engine/game-engine';
import { GameDataLoader } from './server/services/GameDataLoader';
import { FinancialSystem } from './shared/engine/FinancialSystem';
import * as fs from 'fs';

// Initialize game data loader and systems
const gameData = new GameDataLoader();
const financialSystem = new FinancialSystem(gameData);

// Test configuration
const SONG_COUNT = 5; // EP with 5 songs
const PROJECT_TYPE = 'EP';
const SIMULATIONS_PER_SCENARIO = 10; // Run each scenario multiple times to see variance

// Test dimensions
const ARTIST_TALENTS = [30, 50, 70, 90]; // Amateur to Elite
const PRODUCER_TIERS = ['local', 'regional', 'national', 'legendary'];
const TIME_INVESTMENTS = ['rushed', 'standard', 'extended', 'perfectionist'];
const BUDGET_LEVELS = [
  { name: 'minimum', multiplier: 0.5 },    // 50% of minimum viable
  { name: 'below_standard', multiplier: 0.7 }, // 70% of minimum viable
  { name: 'efficient', multiplier: 1.0 },   // 100% of minimum viable
  { name: 'premium', multiplier: 1.5 },     // 150% of minimum viable
  { name: 'luxury', multiplier: 2.5 },      // 250% of minimum viable
  { name: 'excessive', multiplier: 4.0 }    // 400% of minimum viable
];

// Additional artist attributes for testing
const WORK_ETHICS = [30, 60, 90]; // Low, Medium, High
const POPULARITIES = [0, 30, 60, 90]; // Unknown to Very Popular
const MOODS = [30, 50, 70, 90]; // Unhappy to Very Happy

interface ScenarioResult {
  scenario: string;
  artistTalent: number;
  workEthic: number;
  popularity: number;
  mood: number;
  producerTier: string;
  timeInvestment: string;
  budgetLevel: string;
  budgetPerSong: number;
  minimumViableCost: number;
  efficiencyRatio: number;
  totalProjectCost: number;
  songQualities: number[];
  averageQuality: number;
  minQuality: number;
  maxQuality: number;
  qualityStdDev: number;
  qualityVariance: number;
  budgetMultiplier: number;
  expectedVarianceRange: number;
}

const results: ScenarioResult[] = [];

// Helper function to create a mock game engine for testing
function createMockEngine(): GameEngine {
  const engine = new GameEngine(gameData, {} as any);
  
  // Override getRandom to be deterministic but varied
  let seed = 12345;
  (engine as any).getRandom = (min: number, max: number): number => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const random = seed / 2147483648;
    return min + (max - min) * random;
  };
  
  return engine;
}

// Helper function to calculate standard deviation
function calculateStdDev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

// Main testing function
async function runQualityTests() {
  console.log('🎵 Music Label Manager - Song Quality Testing Suite');
  console.log('=' .repeat(80));
  console.log(`Testing Configuration:`);
  console.log(`- Project Type: ${PROJECT_TYPE} (${SONG_COUNT} songs)`);
  console.log(`- Simulations per scenario: ${SIMULATIONS_PER_SCENARIO}`);
  console.log(`- Total scenarios: ${ARTIST_TALENTS.length * PRODUCER_TIERS.length * TIME_INVESTMENTS.length * BUDGET_LEVELS.length}`);
  console.log('=' .repeat(80));
  console.log();

  let scenarioCount = 0;
  const totalScenarios = ARTIST_TALENTS.length * PRODUCER_TIERS.length * TIME_INVESTMENTS.length * BUDGET_LEVELS.length;

  // Test primary scenarios (varying main parameters)
  for (const talent of ARTIST_TALENTS) {
    for (const producer of PRODUCER_TIERS) {
      for (const time of TIME_INVESTMENTS) {
        for (const budget of BUDGET_LEVELS) {
          scenarioCount++;
          
          // Calculate budget based on minimum viable cost
          const minimumViableCost = financialSystem.calculateDynamicMinimumViableCost(
            PROJECT_TYPE,
            producer,
            time,
            SONG_COUNT
          );
          
          const budgetPerSong = Math.round(minimumViableCost * budget.multiplier);
          const efficiencyRatio = budgetPerSong / minimumViableCost;
          
          // Calculate total project cost
          const projectCostData = financialSystem.calculatePerSongProjectCost(
            budgetPerSong,
            SONG_COUNT,
            producer,
            time
          );
          
          // Get budget multiplier for this configuration
          const budgetMultiplier = financialSystem.calculateBudgetQualityMultiplier(
            budgetPerSong,
            PROJECT_TYPE,
            producer,
            time,
            SONG_COUNT
          );
          
          // Calculate expected variance range based on combined skill
          const producerSkillMap: Record<string, number> = {
            'local': 40,
            'regional': 55,
            'national': 75,
            'legendary': 95
          };
          const producerSkill = producerSkillMap[producer];
          const combinedSkill = (talent + producerSkill) / 2;
          const expectedVarianceRange = 20 - (18 * (combinedSkill / 100));
          
          // Run multiple simulations to see variance
          const allQualities: number[] = [];
          
          for (let sim = 0; sim < SIMULATIONS_PER_SCENARIO; sim++) {
            const engine = createMockEngine();
            
            // Create mock artist
            const mockArtist = {
              id: 'test-artist',
              name: `Test Artist (Talent: ${talent})`,
              talent: talent,
              workEthic: 60, // Default medium work ethic
              popularity: 30, // Default low popularity
              mood: 50, // Default neutral mood
              weeklyCost: 5000
            };
            
            // Calculate quality for each song
            const songQualities: number[] = [];
            for (let i = 0; i < SONG_COUNT; i++) {
              const quality = (engine as any).calculateEnhancedSongQuality(
                mockArtist,
                producer,
                time,
                budgetPerSong,
                PROJECT_TYPE,
                SONG_COUNT
              );
              songQualities.push(quality);
              allQualities.push(quality);
            }
          }
          
          // Calculate statistics
          const avgQuality = allQualities.reduce((a, b) => a + b, 0) / allQualities.length;
          const minQuality = Math.min(...allQualities);
          const maxQuality = Math.max(...allQualities);
          const stdDev = calculateStdDev(allQualities);
          const variance = ((maxQuality - minQuality) / avgQuality) * 100;
          
          // Create scenario name
          const scenarioName = `T${talent}_${producer}_${time}_${budget.name}`;
          
          const result: ScenarioResult = {
            scenario: scenarioName,
            artistTalent: talent,
            workEthic: 60,
            popularity: 30,
            mood: 50,
            producerTier: producer,
            timeInvestment: time,
            budgetLevel: budget.name,
            budgetPerSong: budgetPerSong,
            minimumViableCost: minimumViableCost,
            efficiencyRatio: efficiencyRatio,
            totalProjectCost: projectCostData.totalCost,
            songQualities: allQualities.slice(0, SONG_COUNT), // Show first simulation's qualities
            averageQuality: avgQuality,
            minQuality: minQuality,
            maxQuality: maxQuality,
            qualityStdDev: stdDev,
            qualityVariance: variance,
            budgetMultiplier: budgetMultiplier,
            expectedVarianceRange: expectedVarianceRange
          };
          
          results.push(result);
          
          // Progress indicator
          if (scenarioCount % 10 === 0 || scenarioCount === totalScenarios) {
            process.stdout.write(`\rProgress: ${scenarioCount}/${totalScenarios} scenarios tested`);
          }
        }
      }
    }
  }
  
  console.log('\n');
  console.log('=' .repeat(80));
  console.log('📊 TESTING COMPLETE - ANALYSIS RESULTS');
  console.log('=' .repeat(80));
  console.log();
  
  // Generate summary statistics
  generateSummaryReport(results);
  
  // Save detailed results to file
  saveDetailedResults(results);
  
  console.log('\n✅ Test results saved to: test-song-quality-results.json');
  console.log('📄 Summary report saved to: test-song-quality-summary.txt');
}

function generateSummaryReport(results: ScenarioResult[]) {
  console.log('🎯 KEY INSIGHTS:');
  console.log('-' .repeat(80));
  
  // 1. Impact of Artist Talent
  console.log('\n1️⃣ ARTIST TALENT IMPACT (with Regional Producer, Standard Time, Efficient Budget):');
  const talentComparison = results.filter(r => 
    r.producerTier === 'regional' && 
    r.timeInvestment === 'standard' && 
    r.budgetLevel === 'efficient'
  );
  
  console.log('\nTalent | Avg Quality | Min | Max | Variance | Expected Variance');
  console.log('-'.repeat(65));
  talentComparison.forEach(r => {
    console.log(`  ${String(r.artistTalent).padEnd(4)} | ${r.averageQuality.toFixed(1).padEnd(11)} | ${String(r.minQuality).padEnd(3)} | ${String(r.maxQuality).padEnd(3)} | ${r.qualityVariance.toFixed(1).padEnd(8)}% | ±${r.expectedVarianceRange.toFixed(1)}%`);
  });
  
  // 2. Impact of Producer Tier
  console.log('\n2️⃣ PRODUCER TIER IMPACT (with Talent 50, Standard Time, Efficient Budget):');
  const producerComparison = results.filter(r => 
    r.artistTalent === 50 && 
    r.timeInvestment === 'standard' && 
    r.budgetLevel === 'efficient'
  );
  
  console.log('\nProducer   | Avg Quality | Project Cost | Cost/Quality | Variance');
  console.log('-'.repeat(70));
  producerComparison.forEach(r => {
    const costPerQuality = (r.totalProjectCost / r.averageQuality).toFixed(0);
    console.log(`${r.producerTier.padEnd(10)} | ${r.averageQuality.toFixed(1).padEnd(11)} | $${String(r.totalProjectCost).padEnd(11)} | $${costPerQuality.padEnd(11)} | ${r.qualityVariance.toFixed(1)}%`);
  });
  
  // 3. Impact of Time Investment
  console.log('\n3️⃣ TIME INVESTMENT IMPACT (with Talent 50, Regional Producer, Efficient Budget):');
  const timeComparison = results.filter(r => 
    r.artistTalent === 50 && 
    r.producerTier === 'regional' && 
    r.budgetLevel === 'efficient'
  );
  
  console.log('\nTime          | Avg Quality | Project Cost | Quality Gain');
  console.log('-'.repeat(60));
  const standardQuality = timeComparison.find(r => r.timeInvestment === 'standard')?.averageQuality || 0;
  timeComparison.forEach(r => {
    const qualityGain = ((r.averageQuality / standardQuality - 1) * 100).toFixed(1);
    console.log(`${r.timeInvestment.padEnd(13)} | ${r.averageQuality.toFixed(1).padEnd(11)} | $${String(r.totalProjectCost).padEnd(11)} | ${qualityGain.padStart(5)}%`);
  });
  
  // 4. Impact of Budget Level
  console.log('\n4️⃣ BUDGET IMPACT (with Talent 50, Regional Producer, Standard Time):');
  const budgetComparison = results.filter(r => 
    r.artistTalent === 50 && 
    r.producerTier === 'regional' && 
    r.timeInvestment === 'standard'
  );
  
  console.log('\nBudget Level   | Budget/Song | Efficiency | Budget Mult | Avg Quality');
  console.log('-'.repeat(75));
  budgetComparison.forEach(r => {
    console.log(`${r.budgetLevel.padEnd(14)} | $${String(r.budgetPerSong).padEnd(10)} | ${r.efficiencyRatio.toFixed(2).padEnd(10)} | ${r.budgetMultiplier.toFixed(3).padEnd(11)} | ${r.averageQuality.toFixed(1)}`);
  });
  
  // 5. Best Value Scenarios
  console.log('\n5️⃣ BEST VALUE SCENARIOS (Quality per $1000 spent):');
  const sortedByValue = [...results].sort((a, b) => 
    (b.averageQuality / b.totalProjectCost) - (a.averageQuality / a.totalProjectCost)
  ).slice(0, 5);
  
  console.log('\nRank | Scenario Configuration                           | Quality/$1000');
  console.log('-'.repeat(75));
  sortedByValue.forEach((r, i) => {
    const value = (r.averageQuality / (r.totalProjectCost / 1000)).toFixed(2);
    const config = `T${r.artistTalent} ${r.producerTier} ${r.timeInvestment} ${r.budgetLevel}`;
    console.log(`  ${i + 1}  | ${config.padEnd(48)} | ${value}`);
  });
  
  // 6. Highest Quality Scenarios
  console.log('\n6️⃣ HIGHEST QUALITY SCENARIOS:');
  const sortedByQuality = [...results].sort((a, b) => b.averageQuality - a.averageQuality).slice(0, 5);
  
  console.log('\nRank | Configuration                                    | Avg Quality | Cost');
  console.log('-'.repeat(80));
  sortedByQuality.forEach((r, i) => {
    const config = `T${r.artistTalent} ${r.producerTier} ${r.timeInvestment} ${r.budgetLevel}`;
    console.log(`  ${i + 1}  | ${config.padEnd(48)} | ${r.averageQuality.toFixed(1).padEnd(11)} | $${r.totalProjectCost}`);
  });
  
  // 7. Variance Analysis
  console.log('\n7️⃣ VARIANCE ANALYSIS (Most vs Least Consistent):');
  const sortedByVariance = [...results].sort((a, b) => a.qualityVariance - b.qualityVariance);
  
  console.log('\nMost Consistent (Low Variance):');
  console.log('Configuration                                     | Variance | Combined Skill');
  console.log('-'.repeat(80));
  sortedByVariance.slice(0, 3).forEach(r => {
    const config = `T${r.artistTalent} ${r.producerTier} ${r.timeInvestment} ${r.budgetLevel}`;
    const producerSkill = { 'local': 40, 'regional': 55, 'national': 75, 'legendary': 95 }[r.producerTier];
    const combinedSkill = (r.artistTalent + producerSkill) / 2;
    console.log(`${config.padEnd(49)} | ${r.qualityVariance.toFixed(1).padEnd(8)}% | ${combinedSkill}`);
  });
  
  console.log('\nLeast Consistent (High Variance):');
  console.log('Configuration                                     | Variance | Combined Skill');
  console.log('-'.repeat(80));
  sortedByVariance.slice(-3).reverse().forEach(r => {
    const config = `T${r.artistTalent} ${r.producerTier} ${r.timeInvestment} ${r.budgetLevel}`;
    const producerSkill = { 'local': 40, 'regional': 55, 'national': 75, 'legendary': 95 }[r.producerTier];
    const combinedSkill = (r.artistTalent + producerSkill) / 2;
    console.log(`${config.padEnd(49)} | ${r.qualityVariance.toFixed(1).padEnd(8)}% | ${combinedSkill}`);
  });
}

function saveDetailedResults(results: ScenarioResult[]) {
  // Save JSON for data analysis
  fs.writeFileSync('test-song-quality-results.json', JSON.stringify(results, null, 2));
  
  // Save human-readable summary
  let summary = '🎵 SONG QUALITY TEST RESULTS - DETAILED REPORT\n';
  summary += '=' .repeat(80) + '\n';
  summary += `Generated: ${new Date().toISOString()}\n`;
  summary += `Total Scenarios Tested: ${results.length}\n`;
  summary += `Songs per Scenario: ${SONG_COUNT} (EP)\n`;
  summary += `Simulations per Scenario: ${SIMULATIONS_PER_SCENARIO}\n`;
  summary += '=' .repeat(80) + '\n\n';
  
  // Group results by budget level for easy comparison
  const budgetGroups = BUDGET_LEVELS.map(level => ({
    name: level.name,
    results: results.filter(r => r.budgetLevel === level.name)
  }));
  
  budgetGroups.forEach(group => {
    summary += `\n📊 BUDGET LEVEL: ${group.name.toUpperCase()}\n`;
    summary += '-'.repeat(80) + '\n';
    
    group.results.forEach(r => {
      summary += `\n${r.scenario}:\n`;
      summary += `  Artist Talent: ${r.artistTalent} | Producer: ${r.producerTier} | Time: ${r.timeInvestment}\n`;
      summary += `  Budget: $${r.budgetPerSong}/song (${r.efficiencyRatio.toFixed(2)}x minimum viable)\n`;
      summary += `  Total Cost: $${r.totalProjectCost} | Budget Multiplier: ${r.budgetMultiplier.toFixed(3)}x\n`;
      summary += `  Quality Range: ${r.minQuality}-${r.maxQuality} (Avg: ${r.averageQuality.toFixed(1)})\n`;
      summary += `  Variance: ${r.qualityVariance.toFixed(1)}% (Expected: ±${r.expectedVarianceRange.toFixed(1)}%)\n`;
      summary += `  Sample Qualities: [${r.songQualities.slice(0, 5).map(q => q.toFixed(0)).join(', ')}]\n`;
    });
  });
  
  fs.writeFileSync('test-song-quality-summary.txt', summary);
}

// Run the tests
runQualityTests().catch(console.error);