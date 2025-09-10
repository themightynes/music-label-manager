import { db } from '../server/db';
import { executives, gameStates } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testExecutiveFlow() {
  console.log('\n=== Testing Executive Flow ===\n');
  
  try {
    // 1. Find a game
    const games = await db.select().from(gameStates).limit(1);
    if (games.length === 0) {
      console.log('❌ No games found. Create a game first.');
      return;
    }
    
    const gameId = games[0].id;
    console.log(`✅ Found game: ${gameId}`);
    
    // 2. Check if executives exist
    const execs = await db.select().from(executives)
      .where(eq(executives.gameId, gameId));
    
    console.log(`\n📊 Executives in game:`);
    if (execs.length === 0) {
      console.log('❌ No executives found!');
      console.log('This is the problem - executives are not being created when game starts.');
    } else {
      execs.forEach(exec => {
        console.log(`  - ${exec.role}: mood=${exec.mood}, loyalty=${exec.loyalty}`);
      });
    }
    
    // 3. Check what roles should exist
    console.log('\n📋 Expected executives (from Phase 3 plan):');
    console.log('  - head_ar (mood=50, loyalty=50)');
    console.log('  - cmo (mood=50, loyalty=50)');
    console.log('  - cco (mood=50, loyalty=50)');
    console.log('  - head_distribution (mood=50, loyalty=50)');
    console.log('  - NO CEO (player is CEO)');
    
    // 4. Test updating an executive
    if (execs.length > 0) {
      const testExec = execs[0];
      console.log(`\n🔧 Testing update for ${testExec.role}...`);
      
      await db.update(executives)
        .set({ 
          mood: 75, 
          loyalty: 60,
          lastActionMonth: 1
        })
        .where(eq(executives.id, testExec.id));
      
      const updated = await db.select().from(executives)
        .where(eq(executives.id, testExec.id));
      
      console.log(`✅ Updated: mood=${updated[0].mood}, loyalty=${updated[0].loyalty}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testExecutiveFlow();