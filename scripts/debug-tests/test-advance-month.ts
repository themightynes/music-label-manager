import { GameEngine } from './shared/engine/game-engine';
import { ServerGameData } from './server/data/gameData';
import { DatabaseStorage } from './server/storage';
import { db } from './server/db';
import { gameStates } from './shared/schema';
import { eq } from 'drizzle-orm';

async function testAdvanceWeek() {
  try {
    // Initialize game data
    const serverGameData = new ServerGameData();
    await serverGameData.initialize();
    
    // Create storage
    const storage = new DatabaseStorage();
    
    // Get the specific game state
    const gameId = '00ddfae0-c292-4fac-8eb4-ad43fafba8d1';
    const [gameState] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    
    if (!gameState) {
      console.log('No game state found');
      return;
    }
    
    console.log('Current game state money:', gameState.money);
    console.log('Current week:', gameState.currentWeek);
    
    // Create game engine
    const gameEngine = new GameEngine(gameState as any, serverGameData, storage);
    
    // Advance week with no actions
    const result = await gameEngine.advanceWeek([]);
    
    console.log('Result money:', result.gameState.money);
    console.log('Financial breakdown:', result.summary.financialBreakdown);
    console.log('Summary revenue:', result.summary.revenue);
    console.log('Summary expenses:', result.summary.expenses);
    console.log('Expense breakdown:', result.summary.expenseBreakdown);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testAdvanceWeek();