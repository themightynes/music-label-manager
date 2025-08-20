/**
 * Test Script: Song Release Fix Verification
 * 
 * This script tests if songs properly move to "released" status when projects advance to "released" stage.
 * We're testing the consolidated GameEngine system that should handle song releases.
 */

const API_BASE = 'http://localhost:3001/api';

async function testSongReleaseFlow() {
  console.log('🎵 Testing Song Release Flow...\n');
  
  try {
    // 1. Create a new game
    console.log('1. Creating new game...');
    const gameResponse = await fetch(`${API_BASE}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        playerName: 'TestPlayer', 
        labelName: 'TestLabel' 
      })
    });
    
    if (!gameResponse.ok) {
      throw new Error(`Failed to create game: ${gameResponse.status} ${gameResponse.statusText}`);
    }
    
    const gameData = await gameResponse.json();
    const gameId = gameData.gameId;
    console.log(`✅ Game created: ${gameId}\n`);
    
    // 2. Get initial game state
    console.log('2. Getting initial game state...');
    const stateResponse = await fetch(`${API_BASE}/game/${gameId}`);
    const gameState = await stateResponse.json();
    console.log(`✅ Current month: ${gameState.currentMonth}, Money: $${gameState.money?.toLocaleString()}\n`);
    
    // 3. Create a single project
    console.log('3. Creating a Single project...');
    const createProjectResponse = await fetch(`${API_BASE}/game/${gameId}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'single',
        budget: 5000,
        quality: 75,
        artistId: gameState.artists?.[0]?.id || 'test-artist-id'
      })
    });
    
    if (!createProjectResponse.ok) {
      const errorText = await createProjectResponse.text();
      console.log(`❌ Failed to create project: ${createProjectResponse.status} - ${errorText}`);
      return;
    }
    
    const projectData = await createProjectResponse.json();
    console.log(`✅ Project created: "${projectData.title}" (ID: ${projectData.id})\n`);
    
    // 4. Advance months to get the project to released stage
    console.log('4. Advancing months to release the project...');
    let currentMonth = gameState.currentMonth;
    let releasedMonth = null;
    
    for (let i = 0; i < 6; i++) {
      console.log(`   Advancing to month ${currentMonth + 1}...`);
      
      const advanceResponse = await fetch(`${API_BASE}/game/${gameId}/advance-month`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedActions: ['manager', 'anr', 'producer'] // Default actions
        })
      });
      
      if (!advanceResponse.ok) {
        const errorText = await advanceResponse.text();
        console.log(`❌ Failed to advance month: ${advanceResponse.status} - ${errorText}`);
        return;
      }
      
      const monthResult = await advanceResponse.json();
      currentMonth = monthResult.gameState.currentMonth;
      
      // Check project status
      const projectsResponse = await fetch(`${API_BASE}/game/${gameId}/projects`);
      const projects = await projectsResponse.json();
      const testProject = projects.find(p => p.id === projectData.id);
      
      if (testProject) {
        console.log(`   Month ${currentMonth}: Project "${testProject.title}" is in "${testProject.stage}" stage`);
        
        if (testProject.stage === 'released' && !releasedMonth) {
          releasedMonth = currentMonth;
          console.log(`🎉 Project released in month ${currentMonth}!\n`);
          break;
        }
      }
    }
    
    if (!releasedMonth) {
      console.log('❌ Project did not advance to released stage after 6 months\n');
      return;
    }
    
    // 5. Check if songs were created and released
    console.log('5. Checking songs status...');
    const songsResponse = await fetch(`${API_BASE}/game/${gameId}/songs`);
    
    if (!songsResponse.ok) {
      console.log('❌ Failed to fetch songs');
      return;
    }
    
    const songs = await songsResponse.json();
    const projectSongs = songs.filter(song => {
      const metadata = song.metadata || {};
      return metadata.projectId === projectData.id;
    });
    
    console.log(`   Found ${projectSongs.length} songs for this project:`);
    
    for (const song of projectSongs) {
      console.log(`   Song: "${song.title}"`);
      console.log(`     - Quality: ${song.quality}`);
      console.log(`     - Recorded: ${song.isRecorded}`);
      console.log(`     - Released: ${song.isReleased}`);
      console.log(`     - Initial Streams: ${song.initialStreams || 0}`);
      console.log(`     - Total Revenue: $${song.totalRevenue || 0}`);
      console.log(`     - Release Month: ${song.releaseMonth || 'Not set'}`);
      console.log('');
    }
    
    // 6. Verify results
    const releasedSongs = projectSongs.filter(s => s.isReleased);
    const songsWithRevenue = projectSongs.filter(s => s.totalRevenue > 0);
    
    console.log('📊 RESULTS:');
    console.log(`   ✅ Project advanced to released: ${releasedMonth ? 'YES' : 'NO'}`);
    console.log(`   ✅ Songs created: ${projectSongs.length}`);
    console.log(`   ✅ Songs released: ${releasedSongs.length}/${projectSongs.length}`);
    console.log(`   ✅ Songs with revenue: ${songsWithRevenue.length}/${projectSongs.length}`);
    
    if (releasedSongs.length === projectSongs.length && songsWithRevenue.length > 0) {
      console.log('\n🎉 SUCCESS! Songs are properly moving to released and generating revenue!');
    } else {
      console.log('\n❌ ISSUE: Songs are not properly releasing or generating revenue');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testSongReleaseFlow();