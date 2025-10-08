/**
 * Phase 2: Venue Capacity Validation Test
 * Tests input validation before database calls
 */

const test_capacity_validation = async () => {
  console.log('🎯 Phase 2: Venue Capacity Validation Testing\n');

  const baseUrl = 'http://localhost:3001/api/tour/estimate';

  const tests = [
    {
      name: 'Test 1: Missing required fields',
      data: {
        cities: 3,
        budgetPerCity: 2000
        // Missing artistId and gameId
      },
      expectStatus: 400
    },
    {
      name: 'Test 2: Invalid venueCapacity type (string)',
      data: {
        artistId: '550e8400-e29b-41d4-a716-446655440000',
        cities: 3,
        budgetPerCity: 2000,
        gameId: '550e8400-e29b-41d4-a716-446655440001',
        venueCapacity: "500"  // String instead of number
      },
      expectStatus: 400
    },
    {
      name: 'Test 3: Invalid venueCapacity (too low)',
      data: {
        artistId: '550e8400-e29b-41d4-a716-446655440000',
        cities: 3,
        budgetPerCity: 2000,
        gameId: '550e8400-e29b-41d4-a716-446655440001',
        venueCapacity: 25  // Below minimum of 50
      },
      expectStatus: 400
    },
    {
      name: 'Test 4: Valid venueCapacity passes validation',
      data: {
        artistId: '550e8400-e29b-41d4-a716-446655440000',
        cities: 3,
        budgetPerCity: 2000,
        gameId: '550e8400-e29b-41d4-a716-446655440001',
        venueCapacity: 500  // Valid capacity
      },
      expectStatus: 404  // Should pass validation, then fail on game lookup
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
        console.log(`✅ SUCCESS: Validation working as expected`);
      } else {
        console.log(`❌ FAILED: Expected ${test.expectStatus}, got ${response.status}`);
      }

      console.log(''); // Empty line for readability

    } catch (error) {
      console.error(`🚨 REQUEST FAILED:`, error.message);
      console.log('');
    }
  }

  console.log('🎯 Capacity Validation Testing Complete');
};

// Run the test
test_capacity_validation();