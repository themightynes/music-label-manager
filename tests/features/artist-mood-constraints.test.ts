/**
 * Tests for Artist Mood Database Constraints
 * Validates that mood values are properly constrained between 0 and 100
 */

import { db, pool } from '../../server/db';
import { artists } from '../../shared/schema';
import { sql } from 'drizzle-orm';

async function testMoodConstraints() {
  console.log('🧪 Testing Artist Mood Constraints');
  console.log('==================================\n');
  
  const results = {
    rejectsOver100: false,
    rejectsUnder0: false,
    defaultsTo50: false
  };
  
  try {
    // Test 1: Database rejects mood values > 100
    console.log('Test 1: Rejecting mood > 100...');
    try {
      await db.insert(artists).values({
        name: 'Test Artist',
        archetype: 'pop',
        mood: 101,
        game_id: '00000000-0000-0000-0000-000000000000'
      });
      console.log('❌ FAILED: Database accepted mood value > 100');
    } catch (error: any) {
      if (error.message.includes('check') || error.message.includes('constraint')) {
        results.rejectsOver100 = true;
        console.log('✅ PASSED: Database correctly rejected mood > 100');
      } else {
        console.log('❌ FAILED: Unexpected error:', error.message);
      }
    }
    
    // Test 2: Database rejects mood values < 0
    console.log('\nTest 2: Rejecting mood < 0...');
    try {
      await db.insert(artists).values({
        name: 'Test Artist 2',
        archetype: 'rock',
        mood: -1,
        game_id: '00000000-0000-0000-0000-000000000000'
      });
      console.log('❌ FAILED: Database accepted mood value < 0');
    } catch (error: any) {
      if (error.message.includes('check') || error.message.includes('constraint')) {
        results.rejectsUnder0 = true;
        console.log('✅ PASSED: Database correctly rejected mood < 0');
      } else {
        console.log('❌ FAILED: Unexpected error:', error.message);
      }
    }
    
    // Test 3: NULL values default to 50
    console.log('\nTest 3: NULL values default to 50...');
    const [artist] = await db.insert(artists).values({
      name: 'Test Artist 3',
      archetype: 'indie',
      game_id: '00000000-0000-0000-0000-000000000000'
    }).returning();
    
    if (artist.mood === 50) {
      results.defaultsTo50 = true;
      console.log('✅ PASSED: NULL mood correctly defaulted to 50');
    } else {
      console.log(`❌ FAILED: Expected mood 50, got ${artist.mood}`);
    }
    
    // Clean up test data (silently ignore if deletion fails due to foreign keys)
    try {
      await db.delete(artists).where(sql`${artists.name} LIKE 'Test Artist%'`);
    } catch {
      // Ignore cleanup errors - tests still passed
    }
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    const totalTests = 3;
    const passedTests = Object.values(results).filter(v => v).length;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 All tests passed! Mood constraints are working correctly.');
      process.exit(0);
    } else {
      console.log('\n⚠️ Some tests failed. Please check the constraints.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Test suite error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run tests if this file is executed directly
testMoodConstraints();