import fetch from 'node-fetch';

async function testServerDataEndpoints() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('Testing server data endpoints...\n');

  // Test artists endpoint
  try {
    console.log('Testing /api/artists/available...');
    const response = await fetch(`${baseUrl}/api/artists/available`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Artists endpoint working`);
      console.log(`   Found ${data.artists?.length || 0} artists`);
      if (data.artists?.length > 0) {
        console.log(`   First artist: ${data.artists[0].name}`);
      }
    } else {
      console.log(`❌ Artists endpoint failed`);
      console.log(`   Status: ${response.status}`);
      const text = await response.text();
      console.log(`   Response: ${text}`);
    }
  } catch (error) {
    console.log(`❌ Artists endpoint error: ${error.message}`);
  }

  console.log('\n---\n');

  // Test debug data load endpoint
  try {
    console.log('Testing /api/debug/data-load...');
    const response = await fetch(`${baseUrl}/api/debug/data-load`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Debug data-load endpoint working`);
      console.log(`   Balance loaded: ${data.balanceTest?.loaded || false}`);
      console.log(`   Artists loaded: ${data.artistsTest?.loaded || false}`);
      console.log(`   Roles loaded: ${data.rolesTest?.loaded || false}`);
    } else {
      console.log(`❌ Debug endpoint failed`);
      console.log(`   Status: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Debug endpoint error: ${error.message}`);
  }
}

testServerDataEndpoints();