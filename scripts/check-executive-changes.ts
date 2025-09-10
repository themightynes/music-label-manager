import { db } from '../server/db';
import { executives, gameStates } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function checkExecutiveChanges() {
  console.log('\n=== Checking Executive Mood/Loyalty ===\n');
  
  try {
    // Find the most recent game
    const games = await db.select()
      .from(gameStates)
      .orderBy(gameStates.currentMonth)
      .limit(1);
    
    if (games.length === 0) {
      console.log('❌ No games found.');
      return;
    }
    
    const game = games[0];
    console.log(`📊 Game: ${game.id}`);
    console.log(`📅 Current Month: ${game.currentMonth}`);
    
    // Get all executives for this game
    const execs = await db.select()
      .from(executives)
      .where(eq(executives.gameId, game.id));
    
    console.log(`\n👥 Executives Status:`);
    console.log('─'.repeat(60));
    
    execs.forEach(exec => {
      console.log(`\n${exec.role}:`);
      console.log(`  • Mood: ${exec.mood}/100`);
      console.log(`  • Loyalty: ${exec.loyalty}/100`);
      console.log(`  • Last Action Month: ${exec.lastActionMonth || 'Never'}`);
      console.log(`  • ID: ${exec.id}`);
      
      // Check if values changed from default
      if (exec.mood !== 50 || exec.loyalty !== 50) {
        console.log(`  ⚡ VALUES CHANGED FROM DEFAULT!`);
      }
    });
    
    console.log('\n─'.repeat(60));
    console.log('\n💡 Default values: mood=50, loyalty=50');
    console.log('If values are different, the update IS working in the database!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkExecutiveChanges();