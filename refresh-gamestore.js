/**
 * Quick GameStore Data Refresh
 * This script calls the game data endpoints to see what releases exist
 */

async function refreshGameStoreData() {
  const gameId = "de7b1c5d-791a-4790-bb59-3db9cd78e099";
  const baseUrl = "http://localhost:5001";
  
  try {
    console.log('🔄 Refreshing game data to check for planned releases...\n');
    
    // Check what releases exist in the database
    console.log('📋 Fetching current releases...');
    const releasesResponse = await fetch(`${baseUrl}/api/game/${gameId}/releases`, {
      headers: { 'Authorization': 'Bearer demo-token' }
    });
    
    if (!releasesResponse.ok) {
      console.error('❌ Failed to fetch releases:', releasesResponse.status);
      return;
    }
    
    const releases = await releasesResponse.json();
    console.log(`Found ${releases.length} releases in database:\n`);
    
    releases.forEach((release, index) => {
      console.log(`${index + 1}. "${release.title}" (${release.type})`);
      console.log(`   Status: ${release.status}`);
      console.log(`   Artist ID: ${release.artistId}`);
      console.log(`   Release Month: ${release.releaseMonth || 'Not set'}`);
      console.log(`   Marketing Budget: $${(release.marketingBudget || 0).toLocaleString()}`);
      console.log(`   Created: ${new Date(release.createdAt).toLocaleString()}`);
      console.log('');
    });
    
    const plannedReleases = releases.filter(r => r.status === 'planned');
    const releasedReleases = releases.filter(r => r.status !== 'planned');
    
    console.log('📊 Summary:');
    console.log(`   Planned Releases: ${plannedReleases.length}`);
    console.log(`   Released/Other: ${releasedReleases.length}`);
    console.log('');
    
    if (plannedReleases.length > 0) {
      console.log('✅ You have planned releases! They should show up in the dashboard.');
      console.log('💡 If they\'re not showing, try refreshing the browser page.');
    } else {
      console.log('ℹ️  No planned releases found in database.');
    }
    
  } catch (error) {
    console.error('💥 Failed to refresh data:', error.message);
  }
}

refreshGameStoreData();