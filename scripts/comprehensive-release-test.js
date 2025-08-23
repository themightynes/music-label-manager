#!/usr/bin/env node
/**
 * Comprehensive Release Bug Fix Validation
 * Tests both PR #1 and PR #2 together to ensure they work correctly in combination
 */

const { execSync } = require('child_process');
const { validateQueryFix } = require('./validate-pr1-query-fix');
const { validateAutoFix } = require('./validate-pr2-auto-fix');

async function comprehensiveValidation() {
  console.log('🎯 COMPREHENSIVE RELEASE BUG FIX VALIDATION');
  console.log('===========================================\n');
  
  const results = {
    pr1: false,
    pr2: false,
    integration: false,
    performance: false,
    userExperience: false
  };
  
  try {
    // Phase 1: Individual PR validation
    console.log('📋 PHASE 1: Individual PR Validation');
    console.log('====================================');
    
    console.log('\nRunning PR #1 validation...');
    try {
      await validateQueryFix();
      results.pr1 = true;
      console.log('✅ PR #1 (Query Fix) - PASSED');
    } catch (error) {
      console.log('❌ PR #1 (Query Fix) - FAILED:', error.message);
    }
    
    console.log('\nRunning PR #2 validation...');
    try {
      await validateAutoFix();
      results.pr2 = true;
      console.log('✅ PR #2 (Auto-Fix) - PASSED');
    } catch (error) {
      console.log('❌ PR #2 (Auto-Fix) - FAILED:', error.message);
    }
    
    // Phase 2: Integration testing
    console.log('\n\n📋 PHASE 2: Integration Testing');
    console.log('===============================');
    results.integration = await runIntegrationTests();
    
    // Phase 3: Performance validation
    console.log('\n\n📋 PHASE 3: Performance Validation');
    console.log('==================================');
    results.performance = await runPerformanceTests();
    
    // Phase 4: User experience validation
    console.log('\n\n📋 PHASE 4: User Experience Validation');
    console.log('======================================');
    results.userExperience = await runUserExperienceTests();
    
    // Final results
    console.log('\n\n🎯 FINAL VALIDATION RESULTS');
    console.log('===========================');
    printResults(results);
    
    const overallSuccess = Object.values(results).every(result => result);
    if (overallSuccess) {
      console.log('\n🎉 ALL VALIDATIONS PASSED - READY FOR DEPLOYMENT');
      process.exit(0);
    } else {
      console.log('\n💥 SOME VALIDATIONS FAILED - REVIEW REQUIRED');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Comprehensive validation failed:', error.message);
    process.exit(1);
  }
}

async function runIntegrationTests() {
  console.log('Testing PR #1 + PR #2 integration...');
  
  try {
    // Create scenario where both fixes are needed
    const gameId = 'integration-test-game';
    
    // Setup: Game with both current and overdue releases
    await createIntegrationTestScenario(gameId);
    
    // Test: Load game state (triggers auto-fix + query fix)
    const gameState = await loadGameState(gameId);
    
    // Validate: Both current and overdue releases handled correctly
    const currentReleases = gameState.releases?.filter(r => 
      r.releaseMonth === gameState.currentMonth && r.status === 'planned'
    ) || [];
    
    const overdueReleases = gameState.releases?.filter(r => 
      r.releaseMonth < gameState.currentMonth && r.status === 'planned'
    ) || [];
    
    const autoFixedReleases = gameState.releases?.filter(r => 
      r.metadata?.autoFixed === true
    ) || [];
    
    console.log(`   📊 Current releases: ${currentReleases.length}`);
    console.log(`   📊 Overdue releases: ${overdueReleases.length}`);
    console.log(`   📊 Auto-fixed releases: ${autoFixedReleases.length}`);
    
    const success = overdueReleases.length === 0 && autoFixedReleases.length > 0;
    console.log(`   ${success ? '✅' : '❌'} Integration test ${success ? 'PASSED' : 'FAILED'}`);
    
    return success;
    
  } catch (error) {
    console.log('   ❌ Integration test FAILED:', error.message);
    return false;
  }
}

async function runPerformanceTests() {
  console.log('Testing performance impact of fixes...');
  
  try {
    const gameId = 'performance-test-game';
    
    // Create game with many releases to test performance
    await createPerformanceTestScenario(gameId);
    
    // Measure query performance
    const queryStart = Date.now();
    const gameState = await loadGameState(gameId);
    const queryEnd = Date.now();
    
    const queryTime = queryEnd - queryStart;
    const releaseCount = gameState.releases?.length || 0;
    
    console.log(`   ⏱️  Query time: ${queryTime}ms for ${releaseCount} releases`);
    
    // Performance benchmarks
    const queryAcceptable = queryTime < 1000; // Should load in under 1 second
    const memoryAcceptable = process.memoryUsage().heapUsed < 100 * 1024 * 1024; // Under 100MB
    
    console.log(`   ${queryAcceptable ? '✅' : '❌'} Query performance acceptable`);
    console.log(`   ${memoryAcceptable ? '✅' : '❌'} Memory usage acceptable`);
    
    return queryAcceptable && memoryAcceptable;
    
  } catch (error) {
    console.log('   ❌ Performance test FAILED:', error.message);
    return false;
  }
}

async function runUserExperienceTests() {
  console.log('Testing user experience improvements...');
  
  try {
    const gameId = 'ux-test-game';
    
    // Test scenario: User has releases that disappeared from dashboard
    await createUserExperienceTestScenario(gameId);
    
    // Load game state (user opens game)
    const gameState = await loadGameState(gameId);
    
    // Validate user experience improvements
    const upcomingReleases = gameState.releases?.filter(r => 
      r.status === 'planned' && r.releaseMonth >= gameState.currentMonth
    ) || [];
    
    const releasedReleases = gameState.releases?.filter(r => 
      r.status === 'released' || r.status === 'catalog'
    ) || [];
    
    const disappearedReleases = gameState.releases?.filter(r => 
      r.status === 'planned' && r.releaseMonth < gameState.currentMonth
    ) || [];
    
    // Success criteria
    const noDisappearedReleases = disappearedReleases.length === 0;
    const hasReleasedReleases = releasedReleases.length > 0;
    const properStatusDistribution = upcomingReleases.length >= 0 && releasedReleases.length > 0;
    
    console.log(`   📊 Upcoming releases: ${upcomingReleases.length}`);
    console.log(`   📊 Released releases: ${releasedReleases.length}`);
    console.log(`   📊 Disappeared releases: ${disappearedReleases.length}`);
    
    console.log(`   ${noDisappearedReleases ? '✅' : '❌'} No disappeared releases`);
    console.log(`   ${hasReleasedReleases ? '✅' : '❌'} Has released releases`);
    console.log(`   ${properStatusDistribution ? '✅' : '❌'} Proper status distribution`);
    
    return noDisappearedReleases && hasReleasedReleases && properStatusDistribution;
    
  } catch (error) {
    console.log('   ❌ User experience test FAILED:', error.message);
    return false;
  }
}

// Helper functions
async function createIntegrationTestScenario(gameId) {
  // Create test game and releases for integration testing
  execSync(`curl -s -X POST "http://localhost:5001/api/games" -H "Content-Type: application/json" -d '{"id":"${gameId}","playerName":"Integration Test"}'`);
  
  // Create releases for different months
  const releases = [
    { month: 1, title: 'Past Release 1' },
    { month: 2, title: 'Past Release 2' }, 
    { month: 4, title: 'Current Release' },
    { month: 5, title: 'Future Release' }
  ];
  
  for (const release of releases) {
    const releaseData = JSON.stringify({
      artistId: 'test-artist',
      title: release.title,
      type: 'single',
      releaseMonth: release.month,
      marketingBudget: 3000,
      songIds: ['test-song']
    });
    
    execSync(`curl -s -X POST "http://localhost:5001/api/games/${gameId}/releases/plan" -H "Content-Type: application/json" -d '${releaseData}'`);
  }
  
  // Set current month to 4
  execSync(`curl -s -X PUT "http://localhost:5001/api/games/${gameId}/state" -H "Content-Type: application/json" -d '{"currentMonth":4}'`);
}

async function createPerformanceTestScenario(gameId) {
  // Create game with many releases for performance testing
  execSync(`curl -s -X POST "http://localhost:5001/api/games" -H "Content-Type: application/json" -d '{"id":"${gameId}","playerName":"Performance Test"}'`);
  
  // Create 50 releases across different months
  for (let i = 1; i <= 50; i++) {
    const releaseData = JSON.stringify({
      artistId: `artist-${i}`,
      title: `Performance Test Release ${i}`,
      type: 'single',
      releaseMonth: (i % 10) + 1,
      marketingBudget: 2000,
      songIds: [`song-${i}`]
    });
    
    execSync(`curl -s -X POST "http://localhost:5001/api/games/${gameId}/releases/plan" -H "Content-Type: application/json" -d '${releaseData}'`);
  }
  
  // Set current month to 6
  execSync(`curl -s -X PUT "http://localhost:5001/api/games/${gameId}/state" -H "Content-Type: application/json" -d '{"currentMonth":6}'`);
}

async function createUserExperienceTestScenario(gameId) {
  // Create scenario that mimics the original user bug report
  execSync(`curl -s -X POST "http://localhost:5001/api/games" -H "Content-Type: application/json" -d '{"id":"${gameId}","playerName":"UX Test"}'`);
  
  // Create releases that would have "disappeared"
  const disappearingReleases = [
    { month: 1, title: 'Disappeared EP' },
    { month: 2, title: 'Disappeared Single' },
    { month: 3, title: 'Disappeared Album' }
  ];
  
  for (const release of disappearingReleases) {
    const releaseData = JSON.stringify({
      artistId: 'test-artist',
      title: release.title,
      type: 'single',
      releaseMonth: release.month,
      marketingBudget: 4000,
      songIds: ['test-song']
    });
    
    execSync(`curl -s -X POST "http://localhost:5001/api/games/${gameId}/releases/plan" -H "Content-Type: application/json" -d '${releaseData}'`);
  }
  
  // Advance to month 5 to create the bug scenario
  execSync(`curl -s -X PUT "http://localhost:5001/api/games/${gameId}/state" -H "Content-Type: application/json" -d '{"currentMonth":5}'`);
}

async function loadGameState(gameId) {
  const { stdout } = execSync(`curl -s "http://localhost:5001/api/games/${gameId}/state"`);
  return JSON.parse(stdout);
}

function printResults(results) {
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    const description = getTestDescription(test);
    console.log(`   ${test.toUpperCase().padEnd(15)} ${status} - ${description}`);
  });
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  console.log(`\n   SUMMARY: ${passedCount}/${totalCount} tests passed`);
}

function getTestDescription(test) {
  const descriptions = {
    pr1: 'Inclusive query logic correctly finds overdue releases',
    pr2: 'Auto-fix migration resolves stuck releases on game load',
    integration: 'Both fixes work together without conflicts',
    performance: 'Fixes do not significantly impact query performance',
    userExperience: 'User no longer sees disappearing releases'
  };
  return descriptions[test] || 'Test validation';
}

if (require.main === module) {
  comprehensiveValidation().catch(console.error);
}

module.exports = { comprehensiveValidation };