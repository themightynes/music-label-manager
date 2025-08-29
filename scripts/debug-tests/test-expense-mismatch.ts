import { GameEngine } from './shared/engine/game-engine';
import { ServerGameData } from './server/data/gameData';
import { DatabaseStorage } from './server/storage';

async function testExpenseMismatch() {
  try {
    // Initialize game data
    const serverGameData = new ServerGameData();
    await serverGameData.initialize();
    
    // Create storage
    const storage = new DatabaseStorage();
    
    // Create a mock game state for month 1
    const mockGameState = {
      id: 'test-game',
      currentMonth: 1,
      money: 500000,
      reputation: 5,
      creativeCapital: 10,
      focusSlots: 3,
      usedFocusSlots: 0,
      playlistAccess: 'none',
      pressAccess: 'none',
      venueAccess: 'none',
      campaignType: 'standard',
      rngSeed: 'test-seed-123',
      flags: {},
      monthlyStats: {}
    };
    
    // Create game engine
    const gameEngine = new GameEngine(mockGameState as any, serverGameData, storage);
    
    // Advance month with no actions (simulating month 1)
    const result = await gameEngine.advanceMonth([]);
    
    console.log('\n=== EXPENSE MISMATCH TEST ===');
    console.log('Month:', result.gameState.currentMonth);
    console.log('\nMoney:');
    console.log('  Starting:', mockGameState.money);
    console.log('  Ending:', result.gameState.money);
    console.log('  Actual spent:', mockGameState.money - result.gameState.money);
    
    console.log('\nSummary values:');
    console.log('  summary.expenses:', result.summary.expenses);
    console.log('  summary.revenue:', result.summary.revenue);
    
    console.log('\nExpense breakdown:');
    const breakdown = result.summary.expenseBreakdown;
    if (breakdown) {
      console.log('  monthlyOperations:', breakdown.monthlyOperations);
      console.log('  artistSalaries:', breakdown.artistSalaries);
      console.log('  projectCosts:', breakdown.projectCosts);
      console.log('  marketingCosts:', breakdown.marketingCosts);
      console.log('  roleMeetingCosts:', breakdown.roleMeetingCosts);
      
      const tooltipTotal = breakdown.monthlyOperations + 
                          breakdown.artistSalaries + 
                          breakdown.projectCosts + 
                          breakdown.marketingCosts + 
                          breakdown.roleMeetingCosts;
      
      console.log('\nCalculated totals:');
      console.log('  Tooltip total (sum of breakdown):', tooltipTotal);
      console.log('  Summary expenses:', result.summary.expenses);
      console.log('  Actual money deducted:', mockGameState.money - result.gameState.money);
      
      console.log('\nMISMATCH CHECK:');
      console.log('  Tooltip total vs summary.expenses:', 
        tooltipTotal === result.summary.expenses ? '✅ MATCH' : `❌ MISMATCH (${tooltipTotal} vs ${result.summary.expenses})`);
      console.log('  Summary.expenses vs actual deducted:', 
        result.summary.expenses === (mockGameState.money - result.gameState.money) ? '✅ MATCH' : `❌ MISMATCH`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testExpenseMismatch();