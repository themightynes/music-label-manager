/**
 * Simple test to verify executive updates through role meetings
 */

import { config } from 'dotenv';
config();

const API_URL = 'http://localhost:5000/api';
const USER_ID = 'test-user';

async function testExecutiveAction() {
  console.log('=== Testing Executive Updates via Role Meeting ===\n');

  try {
    // 1. Get current game state
    console.log('1. Fetching current game state...');
    const gameStateResponse = await fetch(`${API_URL}/game-state`, {
      headers: { 'x-user-id': USER_ID }
    });
    
    if (!gameStateResponse.ok) {
      throw new Error(`Failed to fetch game state: ${gameStateResponse.status}`);
    }
    
    const gameState = await gameStateResponse.json();
    const gameId = gameState.id;
    console.log(`   Game ID: ${gameId}`);
    console.log(`   Current Week: ${gameState.currentWeek}`);
    
    // 2. Submit a role meeting action with executive metadata
    console.log('\n2. Submitting role meeting action with executive metadata...');
    
    // Create action for Head of A&R meeting
    // We'll include a fake executiveId to test if processExecutiveActions is called
    const testAction = {
      type: 'role_meeting',
      targetId: 'head_ar', // Role ID for Head of A&R
      details: {
        meetingId: 'ar_meeting_1',
        choiceId: 'ar_choice_1'
      },
      metadata: {
        executiveId: 'test-exec-123', // This will test if the method is called
        moodEffect: 20 // Test mood boost
      }
    };
    
    console.log('   Action:', JSON.stringify(testAction, null, 2));
    
    const actionResponse = await fetch(`${API_URL}/game/${gameId}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER_ID
      },
      body: JSON.stringify({ actions: [testAction] })
    });
    
    if (!actionResponse.ok) {
      const errorText = await actionResponse.text();
      throw new Error(`Failed to submit action: ${actionResponse.status} - ${errorText}`);
    }
    
    const result = await actionResponse.json();
    console.log('\n3. Action processed. Checking summary for executive updates...');
    
    // Look for executive_interaction changes
    const execChanges = result.summary?.changes?.filter((c: any) => 
      c.type === 'executive_interaction'
    );
    
    if (execChanges && execChanges.length > 0) {
      console.log('   ✅ Executive interaction detected!');
      execChanges.forEach((change: any) => {
        console.log(`   - ${change.description}`);
        if (change.moodChange !== undefined) {
          console.log(`     Mood change: ${change.moodChange}`);
        }
        if (change.loyaltyBoost !== undefined) {
          console.log(`     Loyalty boost: ${change.loyaltyBoost}`);
        }
      });
    } else {
      console.log('   ❌ No executive_interaction changes found');
      console.log('   All changes:', result.summary?.changes?.map((c: any) => c.type));
    }
    
    // Check server logs for debug output
    console.log('\n4. Check server console for debug logs:');
    console.log('   - Look for "[GAME-ENGINE] Processing executive actions"');
    console.log('   - Look for "[STORAGE] getExecutive called"');
    console.log('   - Look for "[STORAGE] updateExecutive called"');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run test
testExecutiveAction().then(() => {
  console.log('\n=== Test Complete ===');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});