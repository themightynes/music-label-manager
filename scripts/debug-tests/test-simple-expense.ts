// Simple test to show the expense calculation issue

// Simulate the calculation that happens in game-engine.ts

function getRandom(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Simulate what happens in the game engine
function simulateWeekAdvance() {
  console.log('=== SIMULATING WEEK ADVANCE ===\n');
  
  // Line 147: Calculate weekly burn FIRST TIME
  const baseBurn1 = Math.round(getRandom(3000, 6000));
  const artistCosts = 0; // No artists in week 1
  const totalBurn1 = baseBurn1 + artistCosts;
  
  console.log('FIRST CALCULATION (line 147):');
  console.log('  Base burn:', baseBurn1);
  console.log('  Artist costs:', artistCosts);
  console.log('  Total burn:', totalBurn1);
  
  // Lines 162-163: Store in expense breakdown
  const expenseBreakdown = {
    weeklyOperations: baseBurn1,
    artistSalaries: artistCosts,
    projectCosts: 0,
    marketingCosts: 0,
    roleMeetingCosts: 0
  };
  
  console.log('\nEXPENSE BREAKDOWN STORED:');
  console.log('  weeklyOperations:', expenseBreakdown.weeklyOperations);
  console.log('  artistSalaries:', expenseBreakdown.artistSalaries);
  
  // Line 3113: OLD WAY - Calculate weekly burn SECOND TIME (different random value!)
  // const baseBurn2 = Math.round(getRandom(3000, 6000));
  // const totalBurn2 = baseBurn2 + artistCosts;
  
  // NEW WAY - Use the already calculated values from expense breakdown
  const operations = {
    base: expenseBreakdown.weeklyOperations,
    artists: expenseBreakdown.artistSalaries,
    total: expenseBreakdown.weeklyOperations + expenseBreakdown.artistSalaries
  };
  
  console.log('\nFINANCIAL CALCULATION (line 3113):');
  console.log('  Operations base:', operations.base);
  console.log('  Operations artists:', operations.artists);
  console.log('  Operations total:', operations.total);
  
  // Line 188: Set summary.expenses
  const summaryExpenses = operations.total + expenseBreakdown.projectCosts + expenseBreakdown.marketingCosts + expenseBreakdown.roleMeetingCosts;
  
  console.log('\nFINAL VALUES:');
  console.log('  summary.expenses:', summaryExpenses);
  console.log('  Money deducted:', operations.total);
  
  // What the UI shows
  const tooltipTotal = expenseBreakdown.weeklyOperations + 
                      expenseBreakdown.artistSalaries + 
                      expenseBreakdown.projectCosts + 
                      expenseBreakdown.marketingCosts + 
                      expenseBreakdown.roleMeetingCosts;
  
  console.log('\nUI DISPLAY:');
  console.log('  "Spent" shown:', summaryExpenses);
  console.log('  Tooltip total:', tooltipTotal);
  console.log('  Tooltip "Weekly Operations":', expenseBreakdown.weeklyOperations);
  
  console.log('\nVERIFICATION:');
  console.log('  All values should match:', 
    summaryExpenses === tooltipTotal && tooltipTotal === operations.total ? '✅ YES' : '❌ NO');
}

// Run multiple times to show the issue
simulateWeekAdvance();