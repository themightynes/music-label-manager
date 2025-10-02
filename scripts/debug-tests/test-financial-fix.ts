import { GameEngine } from './shared/engine/game-engine';
import { ServerGameData } from './server/data/gameData';
import { DatabaseStorage } from './server/storage';
import { WeekSummary } from './shared/types/gameTypes';

async function testFinancialFix() {
  try {
    // Initialize game data
    const serverGameData = new ServerGameData();
    await serverGameData.initialize();
    
    // Create storage
    const storage = new DatabaseStorage();
    
    // Create a mock game state
    const mockGameState = {
      id: 'test-game',
      currentWeek: 5,
      money: 100000,
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
    
    // Create game engine
    const gameEngine = new GameEngine(mockGameState as any, serverGameData, storage);
    
    // Create a mock summary with some expenses that would normally be added during processing
    const mockSummary: WeekSummary = {
      week: 6,
      changes: [],
      revenue: 5000,  // Simulate some streaming revenue
      expenses: 0,    // Will be calculated
      reputationChanges: {},
      events: [],
      expenseBreakdown: {
        weeklyOperations: 0,  // Will be calculated
        artistSalaries: 0,      // Will be calculated  
        executiveSalaries: 0,
        signingBonuses: 0,
        projectCosts: 3000,     // Simulate a project moving to production
        marketingCosts: 2000,   // Simulate marketing budget
        roleMeetingCosts: 500   // Simulate role meeting costs
      }
    };
    
    console.log('\n=== TESTING FINANCIAL FIX ===');
    console.log('Starting money:', mockGameState.money);
    console.log('\nExpenses to be tracked:');
    console.log('  - Project costs: $3,000');
    console.log('  - Marketing costs: $2,000');
    console.log('  - Role meeting costs: $500');
    console.log('  - Operations: (to be calculated)');
    console.log('  - Artists: (to be calculated)');
    console.log('\nRevenue to be tracked:');
    console.log('  - Streaming revenue: $5,000');
    
    // Call the fixed calculateWeeklyFinancials function
    const financials = await (gameEngine as any).calculateWeeklyFinancials(mockSummary);
    
    console.log('\n=== RESULTS ===');
    console.log('Financial breakdown:', financials.breakdown);
    console.log('Starting balance:', financials.startingBalance);
    console.log('Ending balance:', financials.endingBalance);
    console.log('\nDetailed breakdown:');
    console.log('  - Operations:', financials.operations.total);
    console.log('  - Project costs:', financials.projects.costs);
    console.log('  - Marketing costs:', financials.marketing.costs);
    console.log('  - Role costs:', financials.roleEffects.costs);
    console.log('  - Total expenses:', 
      financials.operations.total + 
      financials.projects.costs + 
      financials.marketing.costs + 
      financials.roleEffects.costs
    );
    console.log('  - Total revenue:', financials.streamingRevenue);
    console.log('\n=== VERIFICATION ===');
    
    const expectedExpenses = financials.operations.total + 3000 + 2000 + 500;
    const expectedRevenue = 5000;
    const expectedEnding = 100000 + expectedRevenue - expectedExpenses;
    
    console.log('Expected ending balance:', expectedEnding);
    console.log('Actual ending balance:', financials.endingBalance);
    console.log('Match:', expectedEnding === financials.endingBalance ? '✅ PASS' : '❌ FAIL');
    
    // Check if the breakdown string includes all components
    const breakdownIncludesProject = financials.breakdown.includes('(projects)');
    const breakdownIncludesMarketing = financials.breakdown.includes('(marketing)');
    console.log('\nBreakdown string includes:');
    console.log('  - Projects:', breakdownIncludesProject ? '✅' : '❌');
    console.log('  - Marketing:', breakdownIncludesMarketing ? '✅' : '❌');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testFinancialFix();