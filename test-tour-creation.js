// Test script to verify tour creation works via API

async function testTourCreation() {
  const baseUrl = 'http://localhost:5000';
  
  // Get current game state
  console.log('Getting current game state...');
  const gameStateResponse = await fetch(`${baseUrl}/api/game-state`, {
    credentials: 'include'
  });
  
  if (!gameStateResponse.ok) {
    console.error('Failed to get game state:', await gameStateResponse.text());
    console.log('\nNote: You may need to be logged in or have an active game session.');
    return;
  }
  
  const gameState = await gameStateResponse.json();
  const gameId = gameState.id;
  console.log('Found game ID:', gameId);
  
  // Get game data to find an artist
  const gameDataResponse = await fetch(`${baseUrl}/api/game/${gameId}`, {
    credentials: 'include'
  });
  
  if (!gameDataResponse.ok) {
    console.error('Failed to get game data:', await gameDataResponse.text());
    return;
  }
  
  const gameData = await gameDataResponse.json();
  const artists = gameData.artists || [];
  
  if (artists.length === 0) {
    console.error('No artists found in game');
    return;
  }
  
  const artist = artists[0];
  console.log('Using artist:', artist.name);
  
  // Create a tour project
  const tourData = {
    title: `${artist.name} Mini Tour Test`,
    type: 'Mini-Tour',
    artistId: artist.id,
    totalCost: 8000,
    budgetPerSong: 0,
    songCount: 0,
    producerTier: 'local',
    timeInvestment: 'standard',
    metadata: {
      performanceType: 'mini_tour',
      cities: 3,
      venueAccess: 'clubs',
      createdFrom: 'test-script'
    }
  };
  
  console.log('Creating tour with data:', JSON.stringify(tourData, null, 2));
  
  const createResponse = await fetch(`${baseUrl}/api/game/${gameId}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(tourData)
  });
  
  if (!createResponse.ok) {
    console.error('Failed to create tour:', await createResponse.text());
    return;
  }
  
  const createdProject = await createResponse.json();
  console.log('✅ Tour created successfully!');
  console.log('Created project:', JSON.stringify(createdProject, null, 2));
  
  // Verify it appears in projects list
  const verifyResponse = await fetch(`${baseUrl}/api/game/${gameId}`, {
    credentials: 'include'
  });
  
  if (verifyResponse.ok) {
    const verifyData = await verifyResponse.json();
    const tours = verifyData.projects.filter(p => p.type === 'Mini-Tour');
    console.log(`\n✅ Found ${tours.length} Mini-Tour projects in database`);
    tours.forEach(tour => {
      console.log(`  - ${tour.title} (Budget: $${tour.totalCost})`);
    });
  }
}

testTourCreation().catch(console.error);