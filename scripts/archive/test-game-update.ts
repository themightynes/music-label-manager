import fetch from 'node-fetch';

async function testGameUpdate() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('Testing game update endpoint...\n');

  // First, we need to login
  console.log('1. Logging in as demo user...');
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'demo-user',
      password: 'demo-password'
    })
  });

  const cookies = loginResponse.headers.get('set-cookie');
  console.log('Login status:', loginResponse.status);
  
  if (!loginResponse.ok) {
    console.log('Login failed');
    return;
  }

  // Get or create a game
  console.log('\n2. Getting game state...');
  const gamesResponse = await fetch(`${baseUrl}/api/game`, {
    headers: {
      'Cookie': cookies || ''
    }
  });

  let gameId;
  if (gamesResponse.ok) {
    const games = await gamesResponse.json();
    if (games.length > 0) {
      gameId = games[0].id;
      console.log('Found existing game:', gameId);
    }
  }

  if (!gameId) {
    console.log('Creating new game...');
    const createResponse = await fetch(`${baseUrl}/api/game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify({
        currentMonth: 1,
        money: 500000
      })
    });

    if (createResponse.ok) {
      const newGame = await createResponse.json();
      gameId = newGame.id;
      console.log('Created game:', gameId);
    } else {
      console.log('Failed to create game');
      return;
    }
  }

  // Test the PATCH endpoint
  console.log('\n3. Testing PATCH /api/game/' + gameId);
  const patchResponse = await fetch(`${baseUrl}/api/game/${gameId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies || ''
    },
    body: JSON.stringify({
      currentMonth: 2,
      money: 450000
    })
  });

  console.log('Response status:', patchResponse.status);
  console.log('Response headers:', patchResponse.headers.raw());
  
  const responseText = await patchResponse.text();
  console.log('Response body:', responseText);

  // Try to parse as JSON
  try {
    const responseJson = JSON.parse(responseText);
    console.log('\n✅ Response is valid JSON');
    console.log('Updated game state:', responseJson);
  } catch (error) {
    console.log('\n❌ Response is not valid JSON');
    console.log('Parse error:', error.message);
  }
}

testGameUpdate();