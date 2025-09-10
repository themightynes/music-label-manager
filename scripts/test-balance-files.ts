import fetch from 'node-fetch';

async function testBalanceFiles() {
  const baseUrl = 'http://localhost:5000';
  
  const balanceFiles = [
    '/data/balance/economy.json',
    '/data/balance/progression.json',
    '/data/balance/quality.json',
    '/data/balance/config.json'
  ];

  console.log('Testing balance subdirectory files...\n');

  for (const endpoint of balanceFiles) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${endpoint}`);
        console.log(`   Data keys: ${Object.keys(data).slice(0, 5).join(', ')}${Object.keys(data).length > 5 ? '...' : ''}`);
      } else {
        console.log(`❌ ${endpoint}`);
        console.log(`   Status: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint}`);
      console.log(`   Error: ${error.message}`);
    }
  }
}

testBalanceFiles();