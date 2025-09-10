import fetch from 'node-fetch';

async function testDemoLogin() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('Testing demo login...\n');
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'demo-user',
        password: 'demo-password'
      })
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Login successful!');
      console.log('Response:', data);
    } else {
      console.log('❌ Login failed');
      console.log('Response:', responseText);
    }
  } catch (error) {
    console.error('Error testing login:', error);
  }
}

testDemoLogin();