/**
 * Phase 2: Enhanced Venue Capacity Selection - API Testing
 * Tests the enhanced tour estimation API with specific venue capacity
 */

const test_venue_capacity_api = async () => {
  console.log('🎯 Phase 2: Enhanced Venue Capacity Selection - API Testing\n');

  const baseUrl = 'http://localhost:3001/api/tour/estimate';
  const testGameId = '550e8400-e29b-41d4-a716-446655440001'; // Test UUID
  const testArtistId = '550e8400-e29b-41d4-a716-446655440000'; // Test UUID

  const tests = [
    {
      name: 'Test 1: Legacy API call (no venueCapacity)',
      data: {
        artistId: testArtistId,
        cities: 3,
        budgetPerCity: 2000,
        gameId: testGameId
      },
      expectStatus: 404 // Game not found (expected)
    },
    {
      name: 'Test 2: Enhanced API call with venueCapacity=500',
      data: {
        artistId: testArtistId,
        cities: 3,
        budgetPerCity: 2000,
        gameId: testGameId,
        venueCapacity: 500
      },
      expectStatus: 404 // Game not found (expected)
    },
    {
      name: 'Test 3: Invalid venueCapacity (too low)',
      data: {
        artistId: testArtistId,
        cities: 3,
        budgetPerCity: 2000,
        gameId: testGameId,
        venueCapacity: 25
      },
      expectStatus: 400 // Should validate capacity
    },
    {
      name: 'Test 4: Invalid venueCapacity (not a number)',
      data: {
        artistId: testArtistId,
        cities: 3,
        budgetPerCity: 2000,
        gameId: testGameId,
        venueCapacity: "invalid"
      },
      expectStatus: 400 // Should validate type
    }
  ];

  for (const test of tests) {
    console.log(`🧪 ${test.name}`);
    console.log(`📝 Request:`, JSON.stringify(test.data, null, 2));

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.data)
      });

      const result = await response.json();

      console.log(`📊 Status: ${response.status} (Expected: ${test.expectStatus})`);
      console.log(`📊 Response:`, JSON.stringify(result, null, 2));

      if (response.status === test.expectStatus) {
        console.log(`✅ SUCCESS: Status matches expected`);
      } else {
        console.log(`❌ FAILED: Expected ${test.expectStatus}, got ${response.status}`);
      }

      // Check for new fields in successful capacity-specific responses
      if (response.status === 200 && test.data.venueCapacity) {
        const requiredFields = ['selectedCapacity', 'tierRange', 'pricePerTicket', 'playerTier'];
        const missingFields = requiredFields.filter(field => !(field in result));

        if (missingFields.length === 0) {
          console.log(`✅ SUCCESS: All enhanced fields present`);
        } else {
          console.log(`❌ MISSING ENHANCED FIELDS:`, missingFields);
        }
      }

      console.log(''); // Empty line for readability

    } catch (error) {
      console.error(`🚨 REQUEST FAILED:`, error.message);
      console.log('');
    }
  }

  console.log('🎯 Phase 2 API Testing Complete');
};

// Run the test
test_venue_capacity_api();