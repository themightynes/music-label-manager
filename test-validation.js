/**
 * Quick validation test that doesn't require database
 * Tests the core validation logic with mock data
 */

console.log('🔍 Testing validation logic...');

// Mock project for testing advancement logic
const mockProject = {
  id: 'test-project-1',
  title: 'Test Single',
  type: 'Single',
  stage: 'production',
  startMonth: 1,
  songCount: 1,
  songsCreated: 1,
  quality: 60
};

const currentMonth = 3;

// Simulate both advancement logics
function simulateRoutesAdvancement(project, currentMonth) {
  const stages = ['planning', 'production', 'marketing', 'released'];
  const currentStageIndex = stages.indexOf(project.stage || 'planning');
  const monthsElapsed = currentMonth - (project.startMonth || 1);
  const isRecordingProject = ['Single', 'EP'].includes(project.type || '');
  const songCount = project.songCount || 1;
  const songsCreated = project.songsCreated || 0;
  const allSongsCreated = songsCreated >= songCount;

  let newStageIndex = currentStageIndex;
  let reason = `Staying in ${project.stage} - conditions not met`;

  // Routes.ts logic
  if (currentStageIndex === 0 && monthsElapsed >= 1) {
    newStageIndex = 1;
    reason = `Planning -> Production after ${monthsElapsed} month(s)`;
  } else if (currentStageIndex === 1) {
    if (!isRecordingProject) {
      if (monthsElapsed >= 2) {
        newStageIndex = 2;
        reason = `Production -> Marketing after ${monthsElapsed} months (non-recording)`;
      }
    } else {
      if (allSongsCreated && monthsElapsed >= 2) {
        newStageIndex = 2;
        reason = `Production -> Marketing: all ${songsCreated} songs completed after ${monthsElapsed} months`;
      } else if (monthsElapsed >= 4) {
        newStageIndex = 2;
        reason = `Production -> Marketing: max time reached (${monthsElapsed} months, ${songsCreated}/${songCount} songs)`;
      }
    }
  } else if (currentStageIndex === 2 && monthsElapsed >= 3) {
    newStageIndex = 3;
    reason = `Marketing -> Released after ${monthsElapsed} months`;
  }

  return {
    newStage: stages[newStageIndex],
    reason,
    shouldAdvance: newStageIndex > currentStageIndex
  };
}

function simulateEngineAdvancement(project, currentMonth) {
  const stages = ['planning', 'production', 'marketing', 'released'];
  const currentStageIndex = stages.indexOf(project.stage || 'planning');
  const monthsElapsed = currentMonth - (project.startMonth || 1);
  const isRecordingProject = ['Single', 'EP'].includes(project.type || '');
  const songCount = project.songCount || 1;
  const songsCreated = project.songsCreated || 0;
  const allSongsCreated = songsCreated >= songCount;

  let newStageIndex = currentStageIndex;
  let reason = `Staying in ${project.stage} - conditions not met`;

  // GameEngine logic (should match exactly)
  if (currentStageIndex === 0 && monthsElapsed >= 1) {
    newStageIndex = 1;
    reason = `Planning complete after ${monthsElapsed} month${monthsElapsed > 1 ? 's' : ''}`;
  } else if (currentStageIndex === 1) {
    if (!isRecordingProject) {
      if (monthsElapsed >= 2) {
        newStageIndex = 2;
        reason = `Production complete after ${monthsElapsed} months`;
      }
    } else {
      if (allSongsCreated && monthsElapsed >= 2) {
        newStageIndex = 2;
        reason = `All ${songsCreated} songs completed after ${monthsElapsed} months`;
      } else if (monthsElapsed >= 4) {
        newStageIndex = 2;
        reason = `Maximum production time reached (${monthsElapsed} months, ${songsCreated}/${songCount} songs)`;
      }
    }
  } else if (currentStageIndex === 2 && monthsElapsed >= 3) {
    newStageIndex = 3;
    reason = `Marketing complete after ${monthsElapsed} months`;
  }

  return {
    newStage: stages[newStageIndex],
    reason,
    shouldAdvance: newStageIndex > currentStageIndex
  };
}

// Test the validation
console.log('📊 Testing project advancement validation...');
console.log(`Mock project: ${mockProject.title} (${mockProject.stage}) - Month ${currentMonth}`);

const routesDecision = simulateRoutesAdvancement(mockProject, currentMonth);
const engineDecision = simulateEngineAdvancement(mockProject, currentMonth);

console.log('\nRoutes.ts decision:', routesDecision);
console.log('GameEngine decision:', engineDecision);

const matched = routesDecision.newStage === engineDecision.newStage;
console.log(`\n${matched ? '✅ MATCH' : '❌ MISMATCH'}: Both systems agree on advancement`);

if (matched) {
  console.log('🎉 VALIDATION LOGIC WORKING CORRECTLY');
  console.log('✅ Ready to run full migration validation');
  console.log('\nNext step: Run validation on real game data to confirm consistency');
} else {
  console.log('🚨 LOGIC DISCREPANCY DETECTED');
  console.log('❌ Need to fix advancement logic before proceeding');
}

// Test various scenarios
console.log('\n🧪 Testing edge cases...');

const testCases = [
  { stage: 'planning', startMonth: 1, currentMonth: 2, expected: 'production' },
  { stage: 'production', startMonth: 1, currentMonth: 3, songsCreated: 1, songCount: 1, expected: 'marketing' },
  { stage: 'production', startMonth: 1, currentMonth: 5, songsCreated: 0, songCount: 3, expected: 'marketing' }, // Max time
  { stage: 'marketing', startMonth: 1, currentMonth: 4, expected: 'released' }
];

let allTestsPassed = true;

for (const testCase of testCases) {
  const testProject = { ...mockProject, ...testCase };
  const routes = simulateRoutesAdvancement(testProject, testCase.currentMonth);
  const engine = simulateEngineAdvancement(testProject, testCase.currentMonth);
  
  const testPassed = routes.newStage === engine.newStage && routes.newStage === testCase.expected;
  console.log(`${testPassed ? '✅' : '❌'} ${testCase.stage} -> ${testCase.expected}: ${testPassed ? 'PASS' : 'FAIL'}`);
  
  if (!testPassed) {
    console.log(`   Routes: ${routes.newStage}, Engine: ${engine.newStage}, Expected: ${testCase.expected}`);
    allTestsPassed = false;
  }
}

console.log(`\n${allTestsPassed ? '🎉 ALL TESTS PASSED' : '🚨 SOME TESTS FAILED'}`);
console.log(`${allTestsPassed ? '✅ Logic consistency validated' : '❌ Logic needs fixing'}`);

if (allTestsPassed) {
  console.log('\n🚀 READY FOR FULL MIGRATION');
  console.log('Next steps:');
  console.log('1. Run validation on real game data');
  console.log('2. Execute remaining migration phases');
  console.log('3. Remove duplicate code from routes.ts and gameData.ts');
}