import fetch from 'node-fetch';

async function testDataEndpoints() {
  const baseUrl = 'http://localhost:5000';
  
  const endpoints = [
    '/data/artists.json',
    '/data/roles.json',
    '/data/events.json',
    '/data/actions.json',
    '/data/balance.json',
    '/data/world.json',
    '/data/dialogue.json'
  ];

  console.log('Testing data endpoints...\n');

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`);
      const contentType = response.headers.get('content-type');
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${endpoint}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Content-Type: ${contentType}`);
        console.log(`   Data keys: ${Object.keys(data).slice(0, 5).join(', ')}${Object.keys(data).length > 5 ? '...' : ''}`);
      } else {
        console.log(`❌ ${endpoint}`);
        console.log(`   Status: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint}`);
      console.log(`   Error: ${error.message}`);
    }
    console.log('');
  }
}

testDataEndpoints();