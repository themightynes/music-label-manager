/**
 * Debug script to trigger the release preview endpoint and see the detailed error
 */

async function testPreview() {
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
  
  const testData = {
    artistId: "fe5e74b6-a42d-4148-bec9-ce70a15ab21f", // Using the artist ID from the console log
    songIds: songsData.songs.slice(0, 1).map(s => s.id), // Use actual song IDs
    releaseType: "single",
    leadSingleId: null,
    seasonalTiming: "q4",
    scheduledReleaseMonth: 8,
    marketingBudget: {
      radio: 3000,
      digital: 2500,
      pr: 1500,
      influencer: 2000
    },
    leadSingleStrategy: null
  };
  
  console.log('📊 Using song IDs:', testData.songIds);

  try {
    console.log('🔍 Testing release preview with detailed error logging...\n');
    
    const response = await fetch('http://localhost:5000/api/game/de7b1c5d-791a-4790-bb59-3db9cd78e099/releases/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token'
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.log('❌ API Error Response:');
      console.log('Status:', response.status, response.statusText);
      console.log('Error Details:', JSON.stringify(errorData, null, 2));
    } else {
      const result = await response.json();
      console.log('✅ Success:', result);
    }
    
  } catch (error) {
    console.log('💥 Fetch Error:', error.message);
  }
}

testPreview();