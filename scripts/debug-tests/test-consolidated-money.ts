import { GameEngine } from './shared/engine/game-engine';
import { ServerGameData } from './server/data/gameData';
import { DatabaseStorage } from './server/storage';

async function testConsolidatedMoney() {
  try {
    // Initialize game data
    const serverGameData = new ServerGameData();
    await serverGameData.initialize();
    
    // Create storage
    const storage = new DatabaseStorage();
    
    // Create a mock game state
    const mockGameState = {
      id: 'test-game',
      currentWeek: 1,
      money: 100000, // Starting with $100,000
      reputation: 10,
      creativeCapital: 10,
      focusSlots: 3,
      usedFocusSlots: 0,
      playlistAccess: 'mainstream',
      pressAccess: 'local',
      venueAccess: 'clubs',
      campaignType: 'standard',
      rngSeed: 'test-seed',
      flags: {},
      weeklyStats: {}
    };
    
    console.log('=== TESTING CONSOLIDATED MONEY CALCULATION ===\n');
    console.log('Starting money:', mockGameState.money);
    
    // Create game engine
    const gameEngine = new GameEngine(mockGameState as any, serverGameData, storage);
    
    // Manually track what we expect
    let expectedRevenue = 0;
    let expectedExpenses = 0;
    
    // Simulate various money changes by directly calling internal methods
    // This would normally happen during the week processing
    const summary = {
      week: 2,
      changes: [],
      revenue: 0,
      expenses: 0,
      reputationChanges: {},
      events: [],
      expenseBreakdown: {
        weeklyOperations: 4000,  // Simulate weekly operations
        artistSalaries: 1200,      // Simulate artist salary
        executiveSalaries: 0,
        signingBonuses: 0,
        projectCosts: 3000,        // Simulate a project cost
        marketingCosts: 2000,      // Simulate marketing
        roleMeetingCosts: 500      // Simulate role meeting cost
      }
    };
    
    // Calculate expected totals
    expectedExpenses = 4000 + 1200 + 0 + 0 + 3000 + 2000 + 500; // $10,700
    expectedRevenue = 5000; // Simulate some streaming revenue
    
    // Set the accumulated values
    summary.expenses = expectedExpenses;
    summary.revenue = expectedRevenue;
    
    console.log('\nExpected calculations:');
    console.log('  Total expenses:', expectedExpenses);
    console.log('  Total revenue:', expectedRevenue);
    console.log('  Net change:', expectedRevenue - expectedExpenses);
    console.log('  Expected final money:', mockGameState.money + expectedRevenue - expectedExpenses);
    
    // Now test that advanceWeek uses these correctly
    const result = await gameEngine.advanceWeek([]);
    
    console.log('\n=== RESULTS ===');
    console.log('Final money:', result.gameState.money);
    console.log('Summary expenses:', result.summary.expenses);
    console.log('Summary revenue:', result.summary.revenue);
    
    // Check for the console log that shows the money update
    console.log('\n=== VERIFICATION ===');
    console.log('Money calculation should show:');
    console.log(`  Starting: $${mockGameState.money}`);
    console.log(`  Revenue: $${result.summary.revenue}`);
    console.log(`  Expenses: $${result.summary.expenses}`);
    console.log(`  Final: $${result.gameState.money}`);
    
    const expectedFinal = mockGameState.money + result.summary.revenue - result.summary.expenses;
    const matchesExpected = result.gameState.money === expectedFinal;
    
    console.log('\nMoney update follows formula (start + revenue - expenses)?', matchesExpected ? '✅ YES' : '❌ NO');
    
    if (!matchesExpected) {
      console.error('MISMATCH!');
      console.error('  Expected:', expectedFinal);
      console.error('  Actual:', result.gameState.money);
      console.error('  Difference:', result.gameState.money - expectedFinal);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testConsolidatedMoney();