import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';
const DEMO_USER = 'demo';
const DEMO_PASS = 'maverickdemo';

async function testExecutiveUpdates() {
  console.log('=== Testing Executive Updates After Month Advancement ===\n');

  try {
    // 1. Login
    console.log('1. Logging in as demo user...');
    const loginResponse = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: DEMO_USER, password: DEMO_PASS })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json() as any;
    const userId = loginData.userId;
    console.log(`   ✓ Logged in successfully (userId: ${userId})\n`);

    // 2. Get game state
    console.log('2. Getting game state...');
    const gameResponse = await fetch(`${API_URL}/game`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': userId
      }
    });
    
    const gameData = await gameResponse.json() as any;
    const gameId = gameData.id;
    console.log(`   ✓ Game found (gameId: ${gameId})\n`);

    // 3. Get executives before action
    console.log('3. Getting executives BEFORE month advancement...');
    const execBeforeResponse = await fetch(`${API_URL}/game/${gameId}/executives`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': userId
      }
    });
    
    const execsBefore = await execBeforeResponse.json() as any[];
    console.log('   Executives before:');
    execsBefore.forEach(exec => {
      console.log(`   - ${exec.role}: mood=${exec.mood}, loyalty=${exec.loyalty}`);
    });
    console.log();

    // 4. Simulate month advancement with executive actions
    console.log('4. Advancing month with executive actions...');
    const selectedActions = [
      {
        actionType: 'role_meeting',
        targetId: 'ar_improve_studio_quality',
        metadata: {
          executiveId: execsBefore.find(e => e.role === 'head_ar')?.id
        }
      },
      {
        actionType: 'role_meeting', 
        targetId: 'cmo_social_media_push',
        metadata: {
          executiveId: execsBefore.find(e => e.role === 'cmo')?.id
        }
      },
      {
        actionType: 'role_meeting',
        targetId: 'cco_community_event',
        metadata: {
          executiveId: execsBefore.find(e => e.role === 'cco')?.id
        }
      }
    ];

    console.log('   Actions being sent:');
    selectedActions.forEach(action => {
      console.log(`   - ${action.targetId} with executiveId: ${action.metadata.executiveId}`);
    });

    const advanceResponse = await fetch(`${API_URL}/advance-month`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify({
        gameId: gameId,
        selectedActions: selectedActions
      })
    });

    if (!advanceResponse.ok) {
      const errorText = await advanceResponse.text();
      throw new Error(`Month advancement failed: ${advanceResponse.status} - ${errorText}`);
    }

    const advanceResult = await advanceResponse.json() as any;
    console.log(`   ✓ Month advanced successfully\n`);

    // 5. Get executives after action
    console.log('5. Getting executives AFTER month advancement...');
    const execAfterResponse = await fetch(`${API_URL}/game/${gameId}/executives`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': userId
      }
    });
    
    const execsAfter = await execAfterResponse.json() as any[];
    console.log('   Executives after:');
    execsAfter.forEach(exec => {
      const before = execsBefore.find(e => e.id === exec.id);
      const moodChange = exec.mood - (before?.mood || 0);
      const loyaltyChange = exec.loyalty - (before?.loyalty || 0);
      
      console.log(`   - ${exec.role}: mood=${exec.mood} (${moodChange >= 0 ? '+' : ''}${moodChange}), loyalty=${exec.loyalty} (${loyaltyChange >= 0 ? '+' : ''}${loyaltyChange})`);
    });
    console.log();

    // 6. Verify the changes
    console.log('6. Verification:');
    let changesDetected = false;
    
    execsAfter.forEach(exec => {
      const before = execsBefore.find(e => e.id === exec.id);
      if (before) {
        if (exec.mood !== before.mood || exec.loyalty !== before.loyalty) {
          changesDetected = true;
          console.log(`   ✓ ${exec.role} values changed!`);
        }
      }
    });

    if (!changesDetected) {
      console.log('   ✗ No changes detected in executive mood/loyalty!');
      console.log('   This indicates the bug still exists.');
    } else {
      console.log('\n   SUCCESS: Executive mood and loyalty are updating correctly!');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testExecutiveUpdates().catch(console.error);