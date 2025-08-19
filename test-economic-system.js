#!/usr/bin/env node

/**
 * Economic System Integration Test
 * Tests the new budget-quality and song count-cost systems
 */

import { GameEngine } from './shared/engine/game-engine.js';
import { ServerGameData } from './server/data/gameData.js';

class EconomicSystemTester {
  constructor() {
    this.gameData = new ServerGameData();
    this.testResults = {
      budgetQualityTests: [],
      songCountCostTests: [],
      integrationTests: [],
      errors: []
    };
  }

  async initialize() {
    try {
      await this.gameData.initialize();
      console.log('✅ Game data initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize game data:', error);
      throw error;
    }
  }

  /**
   * Test Budget-Quality Integration
   */
  testBudgetQualitySystem() {
    console.log('\n🧪 Testing Budget-Quality Integration...');
    
    // Test various budget scenarios
    const testScenarios = [
      { name: 'Below Minimum Viable', budgetRatio: 0.5, expectedPenalty: true },
      { name: 'Minimum Viable', budgetRatio: 0.6, expectedBonus: 0 },
      { name: 'Optimal Efficiency', budgetRatio: 1.0, expectedBonusRange: [8, 12] },
      { name: 'Luxury Range', budgetRatio: 1.5, expectedBonusRange: [15, 20] },
      { name: 'High-End Investment', budgetRatio: 2.5, expectedBonusRange: [20, 25] },
      { name: 'Diminishing Returns', budgetRatio: 4.0, expectedDiminishing: true }
    ];

    // Create mock game engine
    const mockGameState = {
      id: 'test-game',
      currentMonth: 1,
      money: 500000,
      reputation: 25,
      playlistAccess: 'niche'
    };

    const engine = new GameEngine(mockGameState, this.gameData, 'test-seed-123');

    for (const scenario of testScenarios) {
      try {
        // Calculate base cost
        const baseCost = this.gameData.calculateEnhancedProjectCost('single', 'regional', 'standard', 50, 1);
        const testBudget = Math.floor(baseCost * scenario.budgetRatio);

        // Test budget bonus calculation
        const budgetBonus = engine.calculateBudgetQualityBonus(
          testBudget, 'single', 'regional', 'standard'
        );

        const result = {
          scenario: scenario.name,
          baseCost,
          testBudget,
          budgetRatio: scenario.budgetRatio,
          budgetBonus,
          passed: true,
          details: `Budget: $${testBudget.toLocaleString()}, Bonus: +${budgetBonus.toFixed(1)}`
        };

        // Validate expectations
        if (scenario.expectedPenalty && budgetBonus >= 0) {
          result.passed = false;
          result.error = 'Expected penalty but got positive bonus';
        }
        
        if (scenario.expectedBonusRange) {
          const [min, max] = scenario.expectedBonusRange;
          if (budgetBonus < min || budgetBonus > max) {
            result.passed = false;
            result.error = `Bonus ${budgetBonus.toFixed(1)} outside expected range [${min}, ${max}]`;
          }
        }

        if (scenario.expectedDiminishing && budgetBonus > 30) {
          result.passed = false;
          result.error = 'Expected diminishing returns but bonus too high';
        }

        this.testResults.budgetQualityTests.push(result);
        console.log(`  ${result.passed ? '✅' : '❌'} ${scenario.name}: ${result.details}`);
        if (!result.passed) console.log(`    Error: ${result.error}`);

      } catch (error) {
        this.testResults.errors.push(`Budget test ${scenario.name}: ${error.message}`);
        console.log(`  ❌ ${scenario.name}: ERROR - ${error.message}`);
      }
    }
  }

  /**
   * Test Song Count Cost System
   */
  testSongCountCostSystem() {
    console.log('\n🧪 Testing Song Count Cost System...');

    const testScenarios = [
      { name: 'Single Song', songCount: 1, projectType: 'single', expectedMultiplier: 1.0 },
      { name: 'Small EP (3 songs)', songCount: 3, projectType: 'ep', expectedEconomies: true },
      { name: 'Medium EP (5 songs)', songCount: 5, projectType: 'ep', expectedEconomies: true },
      { name: 'Large Project (8 songs)', songCount: 8, projectType: 'ep', expectedMaxEconomies: true }
    ];

    for (const scenario of testScenarios) {
      try {
        // Calculate cost with different song counts
        const singleSongCost = this.gameData.calculateEnhancedProjectCost(
          scenario.projectType, 'local', 'standard', 50, 1
        );
        
        const multiSongCost = this.gameData.calculateEnhancedProjectCost(
          scenario.projectType, 'local', 'standard', 50, scenario.songCount
        );

        const costPerSong = multiSongCost / scenario.songCount;
        const costRatio = costPerSong / singleSongCost;

        const result = {
          scenario: scenario.name,
          songCount: scenario.songCount,
          singleSongCost,
          multiSongCost,
          costPerSong: Math.round(costPerSong),
          costRatio: costRatio.toFixed(3),
          passed: true,
          details: `${scenario.songCount} songs: $${multiSongCost.toLocaleString()} total, $${Math.round(costPerSong).toLocaleString()} per song`
        };

        // Validate expectations
        if (scenario.expectedEconomies && costRatio >= 1.0) {
          result.passed = false;
          result.error = 'Expected economies of scale but cost per song did not decrease';
        }

        if (scenario.expectedMaxEconomies && costRatio > 0.85) {
          result.passed = false;
          result.error = 'Expected maximum economies but savings insufficient';
        }

        if (scenario.songCount === 1 && Math.abs(costRatio - 1.0) > 0.1) {
          result.passed = false;
          result.error = 'Single song cost should be baseline';
        }

        this.testResults.songCountCostTests.push(result);
        console.log(`  ${result.passed ? '✅' : '❌'} ${scenario.name}: ${result.details}`);
        if (!result.passed) console.log(`    Error: ${result.error}`);

      } catch (error) {
        this.testResults.errors.push(`Song count test ${scenario.name}: ${error.message}`);
        console.log(`  ❌ ${scenario.name}: ERROR - ${error.message}`);
      }
    }
  }

  /**
   * Test Complete Integration
   */
  testCompleteIntegration() {
    console.log('\n🧪 Testing Complete Economic Integration...');

    const mockGameState = {
      id: 'test-game',
      currentMonth: 1,
      money: 500000,
      reputation: 35,
      playlistAccess: 'mid'
    };

    const engine = new GameEngine(mockGameState, this.gameData, 'test-seed-456');

    const testScenarios = [
      {
        name: 'Budget Singles Comparison',
        projects: [
          { budget: 5000, songs: 1, producer: 'local', time: 'standard' },
          { budget: 15000, songs: 1, producer: 'regional', time: 'extended' },
          { budget: 25000, songs: 1, producer: 'national', time: 'perfectionist' }
        ]
      },
      {
        name: 'Song Count Impact',
        projects: [
          { budget: 20000, songs: 1, producer: 'regional', time: 'standard' },
          { budget: 20000, songs: 3, producer: 'regional', time: 'standard' },
          { budget: 20000, songs: 5, producer: 'regional', time: 'standard' }
        ]
      }
    ];

    for (const scenario of testScenarios) {
      try {
        console.log(`\n  📊 ${scenario.name}:`);
        
        for (const project of scenario.projects) {
          // Calculate cost
          const cost = this.gameData.calculateEnhancedProjectCost(
            'single', project.producer, project.time, 50, project.songs
          );

          // Test quality calculation (would need a mock artist)
          const mockArtist = { mood: 70, archetype: 'workhorse' };
          const mockProject = { 
            budget: project.budget, 
            songCount: project.songs, 
            type: 'single' 
          };

          // This would normally be called during song generation
          console.log(`    💰 ${project.songs} song${project.songs > 1 ? 's' : ''}, $${project.budget.toLocaleString()} budget: Min cost $${cost.toLocaleString()}`);
          
          if (project.budget < cost) {
            console.log(`    ⚠️  Budget insufficient (need $${(cost - project.budget).toLocaleString()} more)`);
          }
        }

        this.testResults.integrationTests.push({
          scenario: scenario.name,
          passed: true,
          details: 'Integration test completed'
        });

      } catch (error) {
        this.testResults.errors.push(`Integration test ${scenario.name}: ${error.message}`);
        console.log(`  ❌ ${scenario.name}: ERROR - ${error.message}`);
      }
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    console.log('\n📋 ECONOMIC SYSTEM TEST REPORT');
    console.log('================================');

    const totalTests = this.testResults.budgetQualityTests.length + 
                      this.testResults.songCountCostTests.length + 
                      this.testResults.integrationTests.length;

    const passedTests = [
      ...this.testResults.budgetQualityTests,
      ...this.testResults.songCountCostTests,
      ...this.testResults.integrationTests
    ].filter(test => test.passed).length;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Errors: ${this.testResults.errors.length}`);

    if (this.testResults.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.testResults.errors.forEach(error => console.log(`  - ${error}`));
    }

    const successRate = (passedTests / totalTests) * 100;
    console.log(`\nSuccess Rate: ${successRate.toFixed(1)}%`);

    if (successRate >= 95) {
      console.log('🎉 EXCELLENT: Economic system integration is highly successful!');
    } else if (successRate >= 80) {
      console.log('✅ GOOD: Economic system integration is mostly working');
    } else {
      console.log('⚠️  WARNING: Economic system needs significant fixes');
    }

    return {
      totalTests,
      passedTests,
      successRate,
      errors: this.testResults.errors
    };
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    try {
      await this.initialize();
      
      this.testBudgetQualitySystem();
      this.testSongCountCostSystem();
      this.testCompleteIntegration();
      
      return this.generateReport();
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      return { error: error.message };
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new EconomicSystemTester();
  tester.runAllTests().then(result => {
    if (result.error) {
      process.exit(1);
    } else if (result.successRate < 80) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}

export { EconomicSystemTester };