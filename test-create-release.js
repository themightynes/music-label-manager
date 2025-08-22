/**
 * Test script to validate the release creation endpoint
 */

async function testCreateRelease() {
  try {
    // First, get actual song IDs from the API
    console.log('📝 Getting actual songs from API...');
    const songsResponse = await fetch('http://localhost:5000/api/game/de7b1c5d-791a-4790-bb59-3db9cd78e099/artists/fe5e74b6-a42d-4148-bec9-ce70a15ab21f/songs/ready', {
      headers: { 'Authorization': 'Bearer demo-token' }
    });
    
    if (!songsResponse.ok) {
      console.log('❌ Failed to get songs:', songsResponse.status);
      return;
    }
    
    const songsData = await songsResponse.json();
    console.log('✅ Found songs:', songsData.songs?.length || 0);
    
    if (!songsData.songs || songsData.songs.length === 0) {
      console.log('❌ No ready songs found');
      return;
    }

    const releaseData = {
      artistId: "fe5e74b6-a42d-4148-bec9-ce70a15ab21f",
      title: "Test EP Release",
      type: "ep",
      songIds: songsData.songs.slice(0, 3).map(s => s.id), // Use 3 songs for EP
      leadSingleId: songsData.songs[0].id,
      seasonalTiming: "q4",
      scheduledReleaseMonth: 8,
      marketingBudget: {
        radio: 1000,
        digital: 1000,
        pr: 500,
        influencer: 500
      },
      leadSingleStrategy: {
        leadSingleId: songsData.songs[0].id,
        leadSingleReleaseMonth: 7,
        leadSingleBudget: {
          radio: 500,
          digital: 500,
          pr: 250,
          influencer: 250
        }
      },
      metadata: {
        estimatedStreams: 100000,
        estimatedRevenue: 5000,
        projectedROI: 25,
        totalInvestment: 4500
      }
    };

    console.log('🎯 Testing release creation...');
    console.log('Song IDs:', releaseData.songIds);
    
    const response = await fetch('http://localhost:5000/api/game/de7b1c5d-791a-4790-bb59-3db9cd78e099/releases/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token'
      },
      body: JSON.stringify(releaseData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Release created successfully!');
      console.log('Release ID:', result.release?.id);
      console.log('Release Title:', result.release?.title);
      console.log('Updated Money:', result.updatedGameState?.money);
    } else {
      const errorData = await response.json();
      console.log('❌ Failed to create release:');
      console.log('Status:', response.status, response.statusText);
      console.log('Error Details:', JSON.stringify(errorData, null, 2));
    }

  } catch (error) {
    console.log('💥 Test Failed:', error.message);
  }
}

testCreateRelease();