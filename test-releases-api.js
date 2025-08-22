/**
 * Test the releases API endpoint directly
 */

async function testReleasesAPI() {
  const gameId = "de7b1c5d-791a-4790-bb59-3db9cd78e099";
  const baseUrl = "http://localhost:5001";
  
  try {
    console.log('🧪 Testing releases API endpoint directly...\n');
    
    // Test the API endpoint that the frontend should be calling
    console.log(`Calling: ${baseUrl}/api/game/${gameId}/releases`);
    const response = await fetch(`${baseUrl}/api/game/${gameId}/releases`, {
      headers: { 'Authorization': 'Bearer demo-token' }
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return;
    }
    
    const releases = await response.json();
    console.log('\n✅ API Response successful');
    console.log('Releases returned:', releases.length);
    console.log('Releases data:', JSON.stringify(releases, null, 2));
    
    // Check if this matches what we expect
    const plannedReleases = releases.filter(r => r.status === 'planned');
    console.log(`\n📊 Summary:`);
    console.log(`Total releases: ${releases.length}`);
    console.log(`Planned releases: ${plannedReleases.length}`);
    
    if (plannedReleases.length > 0) {
      console.log('\n✅ API endpoint is working correctly!');
      console.log('💡 The issue is that the frontend gameStore is not loading this data.');
    } else {
      console.log('\n⚠️  No planned releases found via API endpoint.');
    }
    
  } catch (error) {
    console.error('💥 API test failed:', error.message);
  }
}

testReleasesAPI();