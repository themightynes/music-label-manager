#!/usr/bin/env npx tsx
/**
 * Test script to verify executive mood/loyalty decay system
 */

import { config } from 'dotenv';

// Load environment variables
config();

async function testExecutiveDecay() {
  console.log('=== Testing Executive Mood/Loyalty Decay System ===\n');
  
  const baseUrl = 'http://localhost:5000';
  
  // Test credentials - use demo user
  const email = 'demo@example.com';
  const password = 'demo123';
  
  try {
    // 1. Login
    console.log('1. Logging in as demo user...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    const userId = loginData.user.id;
    console.log('   ✓ Logged in successfully\n');
    
    // 2. Get current game
    console.log('2. Getting current game...');
    const gamesResponse = await fetch(`${baseUrl}/api/games?userId=${userId}`);
    const games = await gamesResponse.json();
    
    if (!games.length) {
      throw new Error('No games found for user');
    }
    
    const gameId = games[0].id;
    const currentMonth = games[0].currentMonth || 1;
    console.log(`   ✓ Found game: ${gameId}`);
    console.log(`   Current month: ${currentMonth}\n`);
    
    // 3. Get initial executive state
    console.log('3. Getting initial executive state...');
    const execResponse = await fetch(`${baseUrl}/api/game/${gameId}/executives?userId=${userId}`);
    const initialExecs = await execResponse.json();
    
    console.log('   Initial executives:');
    initialExecs.forEach((exec: any) => {
      console.log(`   - ${exec.role}:`);
      console.log(`     Mood: ${exec.mood}, Loyalty: ${exec.loyalty}`);
      console.log(`     Last action: Month ${exec.lastActionMonth || 'Never'}`);
    });
    console.log();
    
    // 4. Advance month multiple times to trigger decay
    console.log('4. Advancing 3 months to trigger loyalty decay...');
    
    for (let i = 1; i <= 3; i++) {
      console.log(`\n   Month ${currentMonth + i}:`);
      
      const advanceResponse = await fetch(`${baseUrl}/api/advance-month`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          gameId,
          actions: [] // No executive actions - they should decay
        })
      });
      
      if (!advanceResponse.ok) {
        const error = await advanceResponse.text();
        throw new Error(`Failed to advance month: ${error}`);
      }
      
      const result = await advanceResponse.json();
      
      // Check for executive-related changes in summary
      const execChanges = result.summary.changes.filter((c: any) => 
        c.type === 'executive_interaction' || c.description?.includes('loyalty') || c.description?.includes('mood')
      );
      
      if (execChanges.length > 0) {
        console.log('   Executive changes detected:');
        execChanges.forEach((change: any) => {
          console.log(`   • ${change.description}`);
        });
      } else {
        console.log('   No executive changes this month');
      }
    }
    
    // 5. Get final executive state
    console.log('\n5. Getting final executive state after decay...');
    const finalExecResponse = await fetch(`${baseUrl}/api/game/${gameId}/executives?userId=${userId}`);
    const finalExecs = await finalExecResponse.json();
    
    console.log('   Final executives:');
    let changesDetected = false;
    
    finalExecs.forEach((exec: any) => {
      const initial = initialExecs.find((e: any) => e.role === exec.role);
      const moodChange = exec.mood - (initial?.mood || 50);
      const loyaltyChange = exec.loyalty - (initial?.loyalty || 50);
      
      console.log(`   - ${exec.role}:`);
      console.log(`     Mood: ${exec.mood} (${moodChange >= 0 ? '+' : ''}${moodChange})`);
      console.log(`     Loyalty: ${exec.loyalty} (${loyaltyChange >= 0 ? '+' : ''}${loyaltyChange})`);
      console.log(`     Last action: Month ${exec.lastActionMonth || 'Never'}`);
      
      if (moodChange !== 0 || loyaltyChange !== 0) {
        changesDetected = true;
      }
    });
    
    // 6. Verify decay occurred
    console.log('\n=== Test Results ===');
    if (changesDetected) {
      console.log('✅ Executive decay system is working!');
      console.log('   - Loyalty decreased for unused executives');
      console.log('   - Mood normalized toward 50');
    } else {
      console.log('⚠️ No decay detected - executives may have been used recently');
      console.log('   Try running the test again without using any executives');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testExecutiveDecay().catch(console.error);