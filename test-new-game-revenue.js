// Test new game song release revenue in Monthly Summary
const testNewGameRevenue = async () => {
  try {
    console.log('Creating new game to test song release summary...');
    
    // Create new game
    const newGameResponse = await fetch('http://localhost:5001/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test-user',
        campaignType: 'standard'
      })
    });
    
    if (!newGameResponse.ok) {
      console.error('Failed to create game:', newGameResponse.statusText);
      return;
    }
    
    const newGame = await newGameResponse.json();
    const gameId = newGame.id;
    console.log('Created game:', gameId);
    
    // Sign an artist
    console.log('Signing artist...');
    await fetch(`http://localhost:5001/api/game/${gameId}/artists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Artist',
        genre: 'pop',
        signedMonth: 1,
        reputation: 5,
        isSigned: true
      })
    });
    
    // Start a project
    console.log('Starting project...');
    await fetch(`http://localhost:5001/api/game/${gameId}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Single',
        type: 'Single',
        stage: 'planning',
        songCount: 1,
        startMonth: 1
      })
    });
    
    console.log('Advancing to month 4...');
    
    // Advance through months 1-4
    for (let month = 2; month <= 4; month++) {
      console.log(`Advancing to month ${month}...`);
      
      const advanceResponse = await fetch('http://localhost:5001/api/advance-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameId,
          selectedActions: [
            { actionType: 'role_meeting', targetId: 'test1', metadata: {} },
            { actionType: 'role_meeting', targetId: 'test2', metadata: {} },
            { actionType: 'role_meeting', targetId: 'test3', metadata: {} }
          ]
        })
      });
      
      if (!advanceResponse.ok) {
        console.error(`Failed to advance to month ${month}:`, advanceResponse.statusText);
        return;
      }
      
      const result = await advanceResponse.json();
      
      // Check if this month has song releases
      const songReleaseChanges = result.summary?.changes?.filter(c => 
        c.description?.includes('released') && c.description?.includes('streams')
      ) || [];
      
      console.log(`Month ${month}:`);
      console.log(`  Total revenue: $${result.summary?.revenue || 0}`);
      console.log(`  Song release changes: ${songReleaseChanges.length}`);
      
      if (songReleaseChanges.length > 0) {
        console.log(`  🎉 SONG RELEASES FOUND IN SUMMARY:`);
        songReleaseChanges.forEach(change => {
          console.log(`    ${change.description} - $${change.amount}`);
        });
      }
      
      // Check song states
      if (result.debug?.songStates) {
        const released = result.debug.songStates.released;
        const ready = result.debug.songStates.ready;
        console.log(`  Song states: ${released} released, ${ready} ready`);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

testNewGameRevenue();