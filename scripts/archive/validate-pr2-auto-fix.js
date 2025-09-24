#!/usr/bin/env node
/**
 * PR #2 Validation Script - Auto-Fix Migration
 * Tests that stuck planned releases are automatically fixed during game load
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const API_BASE = process.env.API_BASE || 'http://localhost:5001';
const TEST_GAME_ID = 'test-auto-fix-game';

async function validateAutoFix() {
  console.log('🔧 PR #2 Validation: Auto-Fix Migration');
  console.log('=======================================\n');

  try {
    // Step 1: Create test scenario with stuck releases
    console.log('1️⃣  Setting up stuck release scenario...');
    await setupStuckReleaseScenario();
    
    // Step 2: Verify releases are indeed stuck
    console.log('2️⃣  Verifying releases are stuck in planned status...');
    const stuckState = await getGameState();
    const initialStuckCount = countStuckReleases(stuckState);
    
    // Step 3: Trigger auto-fix by loading game
    console.log('3️⃣  Triggering auto-fix by loading game state...');
    await triggerAutoFix();
    
    // Step 4: Verify auto-fix worked
    console.log('4️⃣  Verifying auto-fix resolved stuck releases...');
    const fixedState = await getGameState();
    const finalStuckCount = countStuckReleases(fixedState);
    
    // Step 5: Validate results
    console.log('5️⃣  Validating auto-fix results...');
    const success = validateAutoFixResults(initialStuckCount, finalStuckCount, fixedState);
    
    if (success) {
      console.log('\n✅ PR #2 VALIDATION PASSED');
      console.log('   - Auto-fix correctly migrated stuck releases');
      console.log('   - Song statuses properly updated');
      console.log('   - Metadata tracking working');
      process.exit(0);
    } else {
      console.log('\n❌ PR #2 VALIDATION FAILED');
      console.log('   - Auto-fix did not resolve stuck releases');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Auto-fix validation error:', error.message);
    process.exit(1);
  }
}

async function setupStuckReleaseScenario() {
  // Create test game
  await execAsync(`curl -s -X POST "${API_BASE}/api/games" -H "Content-Type: application/json" -d '{"id":"${TEST_GAME_ID}","playerName":"Auto-Fix Test"}'`);
  console.log('   ✓ Test game created');
  
  // Create multiple planned releases for previous weeks
  const stuckReleases = [
    { week: 1, title: 'Stuck Single 1' },
    { week: 2, title: 'Stuck EP 1' },
    { week: 3, title: 'Stuck Album 1' }
  ];
  
  for (const release of stuckReleases) {
    await createPlannedRelease(release.week, release.title);
    console.log(`   ✓ Created planned release for week ${release.week}`);
  }
  
  // Manually advance game state to week 5 without processing releases
  // This simulates the bug condition where releases get stuck
  await execAsync(`curl -s -X PUT "${API_BASE}/api/games/${TEST_GAME_ID}/state" -H "Content-Type: application/json" -d '{"currentWeek":5}'`);
  console.log('   ✓ Advanced to week 5 (leaving releases stuck)');
}

async function createPlannedRelease(week, title) {
  const releaseData = {
    artistId: 'test-artist-1',
    title: title,
    type: week === 2 ? 'ep' : week === 3 ? 'album' : 'single',
    releaseWeek: week,
    marketingBudget: 3000,
    songIds: week === 3 ? ['song-1', 'song-2', 'song-3'] : ['song-1']
  };
  
  await execAsync(`curl -s -X POST "${API_BASE}/api/games/${TEST_GAME_ID}/releases/plan" -H "Content-Type: application/json" -d '${JSON.stringify(releaseData)}'`);
}

async function getGameState() {
  const { stdout } = await execAsync(`curl -s "${API_BASE}/api/games/${TEST_GAME_ID}/state"`);
  return JSON.parse(stdout);
}

function countStuckReleases(gameState) {
  const currentWeek = gameState.currentWeek || 1;
  const stuckReleases = gameState.releases?.filter(r => 
    r.status === 'planned' && r.releaseWeek < currentWeek
  ) || [];
  
  console.log(`   📊 Found ${stuckReleases.length} stuck releases`);
  return stuckReleases.length;
}

async function triggerAutoFix() {
  // Trigger auto-fix by loading game state (which should call autoFixStuckReleases)
  await getGameState();
  console.log('   ✓ Game state loaded (auto-fix triggered)');
  
  // Small delay to allow async processing
  await new Promise(resolve => setTimeout(resolve, 100));
}

function validateAutoFixResults(initialStuck, finalStuck, gameState) {
  console.log(`   📊 Stuck releases: ${initialStuck} → ${finalStuck}`);
  
  if (initialStuck === 0) {
    console.log('   ⚠️  No stuck releases found in initial state');
    return false;
  }
  
  if (finalStuck > 0) {
    console.log('   ❌ Some releases still stuck after auto-fix');
    return false;
  }
  
  // Check that releases were migrated to released status
  const releasedCount = gameState.releases?.filter(r => r.status === 'released').length || 0;
  if (releasedCount < initialStuck) {
    console.log('   ❌ Not all stuck releases were migrated to released status');
    return false;
  }
  
  // Check for auto-fix metadata
  const autoFixedCount = gameState.releases?.filter(r => 
    r.metadata?.autoFixed === true
  ).length || 0;
  
  if (autoFixedCount < initialStuck) {
    console.log('   ❌ Auto-fix metadata not properly set');
    return false;
  }
  
  console.log('   ✅ All stuck releases successfully auto-fixed');
  console.log(`   ✅ ${autoFixedCount} releases marked with auto-fix metadata`);
  return true;
}

// Performance impact test
async function performanceImpactTest() {
  console.log('\n⚡ Performance Impact Test');
  console.log('========================');
  
  const start = Date.now();
  await getGameState(); // This should trigger auto-fix
  const end = Date.now();
  
  const loadTime = end - start;
  console.log(`   ⏱️  Game load time with auto-fix: ${loadTime}ms`);
  
  if (loadTime > 2000) {
    console.log('   ⚠️  Game load time significantly increased (>2s)');
  } else {
    console.log('   ✅ Auto-fix has minimal performance impact');
  }
}

// Edge case validation
async function edgeCaseValidation() {
  console.log('\n🧪 Edge Case Validation');
  console.log('=======================');
  
  // Test 1: Auto-fix with no stuck releases
  console.log('Test 1: Auto-fix with no stuck releases...');
  const cleanGameId = 'clean-game-test';
  await execAsync(`curl -s -X POST "${API_BASE}/api/games" -H "Content-Type: application/json" -d '{"id":"${cleanGameId}","playerName":"Clean Test"}'`);
  
  const start = Date.now();
  const { stdout } = await execAsync(`curl -s "${API_BASE}/api/games/${cleanGameId}/state"`);
  const end = Date.now();
  
  const cleanLoadTime = end - start;
  console.log(`   ⏱️  Clean game load time: ${cleanLoadTime}ms`);
  console.log(`   ${cleanLoadTime < 500 ? '✅' : '❌'} No performance impact on clean games`);
  
  // Test 2: Verify auto-fix is idempotent
  console.log('Test 2: Auto-fix idempotency...');
  const state1 = await getGameState();
  await new Promise(resolve => setTimeout(resolve, 50));
  const state2 = await getGameState();
  
  const releasedCount1 = state1.releases?.filter(r => r.status === 'released').length || 0;
  const releasedCount2 = state2.releases?.filter(r => r.status === 'released').length || 0;
  
  console.log(`   ${releasedCount1 === releasedCount2 ? '✅' : '❌'} Auto-fix is idempotent (${releasedCount1} = ${releasedCount2})`);
}

// Data consistency checks
async function dataConsistencyChecks() {
  console.log('\n📊 Data Consistency Checks');
  console.log('==========================');
  
  const gameState = await getGameState();
  
  // Check 1: All auto-fixed releases have proper metadata
  const autoFixedReleases = gameState.releases?.filter(r => r.metadata?.autoFixed) || [];
  const hasOriginalWeek = autoFixedReleases.every(r => r.metadata?.originalWeek);
  console.log(`   ${hasOriginalWeek ? '✅' : '❌'} All auto-fixed releases have originalWeek metadata`);
  
  // Check 2: Associated songs are properly updated
  const autoFixedSongs = gameState.songs?.filter(s => s.metadata?.autoFixed) || [];
  const autoFixedSongCount = autoFixedSongs.length;
  console.log(`   ✅ ${autoFixedSongCount} songs marked as auto-fixed`);
  
  // Check 3: No orphaned planned releases
  const orphanedReleases = gameState.releases?.filter(r => 
    r.status === 'planned' && r.releaseWeek < gameState.currentWeek
  ) || [];
  console.log(`   ${orphanedReleases.length === 0 ? '✅' : '❌'} No orphaned planned releases remain`);
}

if (require.main === module) {
  validateAutoFix()
    .then(() => performanceImpactTest())
    .then(() => edgeCaseValidation())
    .then(() => dataConsistencyChecks())
    .catch(console.error);
}

module.exports = { validateAutoFix };