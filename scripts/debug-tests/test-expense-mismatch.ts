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
    
    // Create a mock game state for week 1
    const mockGameState = {
      id: 'test-game',
      currentWeek: 1,
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
      weeklyStats: {}
    };
    
    // Create game engine
    const gameEngine = new GameEngine(mockGameState as any, serverGameData, storage);
    
    // Advance week with no actions (simulating week 1)
    const result = await gameEngine.advanceWeek([]);
    
    console.log('\n=== EXPENSE MISMATCH TEST ===');
    console.log('Week:', result.gameState.currentWeek);
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
      console.log('  weeklyOperations:', breakdown.weeklyOperations);
      console.log('  artistSalaries:', breakdown.artistSalaries);
      console.log('  executiveSalaries:', breakdown.executiveSalaries);
      console.log('  signingBonuses:', breakdown.signingBonuses);
      console.log('  projectCosts:', breakdown.projectCosts);
      console.log('  marketingCosts:', breakdown.marketingCosts);
      console.log('  roleMeetingCosts:', breakdown.roleMeetingCosts);
      
      const tooltipTotal = breakdown.weeklyOperations + 
                          breakdown.artistSalaries + 
                          (breakdown.executiveSalaries || 0) +
                          (breakdown.signingBonuses || 0) +
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