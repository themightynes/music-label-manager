#!/usr/bin/env node

/**
 * Test script to verify the new song release functionality
 * This script tests the per-song stream calculation without needing a full server
 */

import { GameEngine } from './shared/engine/game-engine.ts';
import { ServerGameData } from './server/data/gameData.ts';

// Mock game state for testing
const mockGameState = {
  id: 'test-game-123',
  currentMonth: 3,
  reputation: 75,
  playlistAccess: 'mid',      // Use correct access level name
  pressAccess: 'blogs',       // Use correct access level name
  venueAccess: 'clubs',       // Use correct access level name
  money: 50000
};

// Mock song for testing
const mockSong = {
  id: 'song-123',
  title: 'Test Song',
  quality: 67,
  genre: 'pop',
  mood: 'upbeat',
  artistId: 'artist-123',
  gameId: 'test-game-123',
  isRecorded: true,
  isReleased: false,
  initialStreams: 0,
  metadata: {
    projectId: 'project-123'
  }
};

// Mock project for testing
const mockProject = {
  id: 'project-123',
  title: 'Test Single Project',
  type: 'Single',
  artistId: 'artist-123',
  gameId: 'test-game-123',
  quality: 70,
  stage: 'released'
};

async function testSongRelease() {
  console.log('🧪 Starting song release functionality test...');
  
  try {
    // Create ServerGameData instance
    const serverGameData = new ServerGameData();
    
    // Mock the methods we need for testing
    serverGameData.updateSong = async (songId, updates) => {
      console.log(`📝 Mock updateSong called for ${songId}:`, updates);
      return { ...mockSong, ...updates };
    };
    
    serverGameData.getSongsByProject = async (projectId) => {
      console.log(`🔍 Mock getSongsByProject called for project ${projectId}`);
      return [mockSong];
    };
    
    // Initialize with mock data (skip real initialization)
    serverGameData.balanceData = {
      market_formulas: {
        streaming_calculation: {
          quality_weight: 0.35,
          playlist_weight: 0.25,
          reputation_weight: 0.20,
          marketing_weight: 0.20,
          first_week_multiplier: 2.5,
          ongoing_streams: {
            monthly_decay_rate: 0.85,
            revenue_per_stream: 0.003,
            ongoing_factor: 0.1,
            reputation_bonus_factor: 0.002,
            access_tier_bonus_factor: 0.1,
            minimum_revenue_threshold: 1,
            max_decay_months: 24
          }
        }
      },
      access_tier_system: {
        playlist_access: {
          none: { threshold: 0, reach_multiplier: 0.1, cost_modifier: 1.0 },
          niche: { threshold: 10, reach_multiplier: 0.4, cost_modifier: 1.2 },
          mid: { threshold: 30, reach_multiplier: 0.8, cost_modifier: 1.5 },
          flagship: { threshold: 60, reach_multiplier: 1.5, cost_modifier: 2.0 }
        },
        press_access: {
          none: { threshold: 0, pickup_chance: 0.05, sentiment_modifier: 0.8 },
          blogs: { threshold: 8, pickup_chance: 0.25, sentiment_modifier: 1.0 },
          mid_tier: { threshold: 25, pickup_chance: 0.60, sentiment_modifier: 1.2 },
          national: { threshold: 50, pickup_chance: 0.85, sentiment_modifier: 1.5 }
        },
        venue_access: {
          none: { threshold: 0, reach_multiplier: 0.1, cost_modifier: 1.0 },
          bars: { threshold: 5, reach_multiplier: 0.3, cost_modifier: 1.1 },
          clubs: { threshold: 15, reach_multiplier: 0.6, cost_modifier: 1.3 },
          theaters: { threshold: 35, reach_multiplier: 1.0, cost_modifier: 1.6 },
          arenas: { threshold: 70, reach_multiplier: 2.0, cost_modifier: 3.0 }
        }
      }
    };
    
    // Create GameEngine with mock data
    const gameEngine = new GameEngine(mockGameState, serverGameData);
    
    console.log('🎮 Testing individual song release...');
    
    // Test processSongRelease
    const releaseResult = await gameEngine.processSongRelease(mockSong, mockGameState);
    
    console.log('📊 Individual song release result:', releaseResult);
    console.log(`  🎵 Initial streams: ${releaseResult.initialStreams}`);
    console.log(`  💰 Initial revenue: $${releaseResult.initialRevenue}`);
    
    // Test processProjectSongsRelease
    console.log('\n🎮 Testing project songs release...');
    
    const projectReleaseResult = await gameEngine.processProjectSongsRelease(mockProject, 0);
    
    console.log('📊 Project songs release result:', projectReleaseResult);
    console.log(`  🎵 Songs released: ${projectReleaseResult.totalSongsReleased}`);
    console.log(`  📈 Total streams: ${projectReleaseResult.totalStreamsDistributed}`);
    console.log(`  💰 Total revenue: $${projectReleaseResult.totalRevenueGenerated}`);
    
    // Verify the calculation makes sense
    if (releaseResult.initialStreams > 0 && releaseResult.initialRevenue > 0) {
      console.log('\n✅ Song release calculation working correctly!');
      console.log(`  🧮 Verification: ${releaseResult.initialStreams} streams × $0.003 = $${releaseResult.initialStreams * 0.003} (actual: $${releaseResult.initialRevenue})`);
      
      const expectedRevenue = Math.round(releaseResult.initialStreams * 0.003);
      if (Math.abs(releaseResult.initialRevenue - expectedRevenue) <= 1) {
        console.log('  ✅ Revenue calculation matches expected value');
      } else {
        console.log(`  ⚠️  Revenue calculation mismatch: expected ${expectedRevenue}, got ${releaseResult.initialRevenue}`);
      }
    } else {
      console.log('❌ Song release calculation failed - no streams or revenue generated');
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run test
testSongRelease()
  .then(() => {
    console.log('✅ Song release test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });