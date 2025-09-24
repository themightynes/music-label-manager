import { db } from '../../server/db';
import { gameStates } from '@shared/schema';
import fetch from 'node-fetch';

async function testExecutiveMeeting() {
  console.log('\n=== Testing Executive Meeting Flow ===\n');
  
  try {
    // 1. Get game ID
    const games = await db.select().from(gameStates).limit(1);
    if (games.length === 0) {
      console.log('❌ No games found.');
      return;
    }
    
    const gameId = games[0].id;
    console.log(`📊 Using game: ${gameId}`);
    
    // 2. Simulate what the client sends when advancing week with an executive meeting
    const testAction = {
      gameId: gameId,
      selectedActions: [
        {
          actionType: 'role_meeting',
          targetId: 'head_ar_mgr_priorities_studio_first', // Simulated action
          metadata: {
            executiveId: 'test-exec-id',  // This should be set by client
            roleId: 'head_ar'
          }
        }
      ]
    };
    
    console.log('\n📤 Sending advance week request with executive action...');
    console.log(JSON.stringify(testAction, null, 2));
    
    // 3. Call the advance-week endpoint
    const response = await fetch(`http://localhost:5000/api/advance-week`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testAction)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`\n❌ Server error: ${response.status}`);
      console.log(error);
    } else {
      const result = await response.json();
      console.log('\n✅ Week advanced successfully');
      console.log('Changes:', result.summary?.changes);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testExecutiveMeeting();