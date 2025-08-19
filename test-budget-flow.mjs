#!/usr/bin/env node

/**
 * Test script to verify budget data flow from API to GameEngine
 * This simulates creating a project and advancing a month to trigger song generation
 */

const BASE_URL = 'http://localhost:5001';

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    method,
    headers: { 
      'Content-Type': 'application/json',
      // Add test user ID for authentication bypass
      'x-user-id': 'test-user-123' 
    },
  };
  
  if (data) {
    config.body = JSON.stringify(data);
  }
  
  try {
    console.log(`\n=== API REQUEST ===`);
    console.log(`${method} ${url}`);
    if (data) console.log('Body:', JSON.stringify(data, null, 2));
    
    const response = await fetch(url, config);
    const responseData = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(responseData, null, 2));
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return responseData;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

async function testBudgetFlow() {
  try {
    console.log('🧪 Testing Budget Data Flow Integration');
    console.log('=====================================');
    
    // Step 1: Create a new game
    console.log('\n📋 Step 1: Creating new game...');
    const gameState = await apiRequest('POST', '/api/game', {
      campaignType: 'startup',
      currentMonth: 1,
      money: 75000,
      reputation: 0,
      creativeCapital: 0,
      focusSlots: 3,
      usedFocusSlots: 0,
      playlistAccess: 'None',
      pressAccess: 'None',
      venueAccess: 'None',
      rngSeed: Math.random().toString(36),
      flags: {},
      monthlyStats: {},
      campaignCompleted: false
    });
    
    const gameId = gameState.id;
    console.log(`✅ Game created with ID: ${gameId}`);
    
    // Step 2: Create an artist
    console.log('\n🎤 Step 2: Creating test artist...');
    const artist = await apiRequest('POST', `/api/game/${gameId}/artists`, {
      name: 'Test Artist',
      genre: 'pop',
      mood: 70,
      archetype: 'workhorse',
      isSigned: true,
      signingCost: 5000,
      monthlyRoyalties: 1000,
      signedMonth: 1
    });
    
    console.log(`✅ Artist created: ${artist.name} (ID: ${artist.id})`);
    
    // Step 3: Create a project with specific budget data
    console.log('\n🎵 Step 3: Creating project with budget data...');
    console.log('   📊 Budget settings:');
    console.log('      - Budget per song: $4,000');
    console.log('      - Song count: 2');
    console.log('      - Producer tier: regional'); 
    console.log('      - Time investment: extended');
    console.log('      - Expected total cost: ~$17,600 (4000 * 2 * 1.8 * 1.4)');
    
    const project = await apiRequest('POST', `/api/game/${gameId}/projects`, {
      title: 'Budget Test EP',
      type: 'EP',
      artistId: artist.id,
      budgetPerSong: 4000,
      totalCost: 17600,
      songCount: 2,
      producerTier: 'regional',
      timeInvestment: 'extended'
    });
    
    console.log(`✅ Project created: ${project.title} (ID: ${project.id})`);
    
    // Step 4: Advance month to trigger song generation
    console.log('\n⏭️ Step 4: Advancing month to trigger song generation...');
    console.log('   🔄 This should trigger the GameEngine to process projects');
    console.log('   📝 Watch logs for budget data flow through song generation');
    
    const advanceResult = await apiRequest('POST', '/api/advance-month', {
      gameId: gameId,
      selectedActions: []
    });
    
    console.log(`✅ Month advanced. Current month: ${advanceResult.gameState.currentMonth}`);
    
    // Step 5: Check if songs were created
    console.log('\n🎶 Step 5: Checking generated songs...');
    const songs = await apiRequest('GET', `/api/game/${gameId}/songs`);
    
    console.log(`📈 Results: ${songs.length} songs generated`);
    if (songs.length > 0) {
      songs.forEach(song => {
        console.log(`   🎵 "${song.title}" - Quality: ${song.quality}/100`);
        console.log(`      Producer: ${song.producerTier} | Time: ${song.timeInvestment}`);
      });
    }
    
    console.log('\n✨ Test completed! Check server logs for detailed budget tracing.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testBudgetFlow();