/**
 * Phase 5: Testing & Validation - Tour API Test
 * Tests the tour estimation API with proper data
 */

const test_tour_estimation = async () => {
  console.log('🧪 Testing Tour Estimation API...\n');

  try {
    // Test data - using proper UUIDs
    const testData = {
      artistId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID format
      cities: 3,
      budgetPerCity: 2000,
      gameId: '550e8400-e29b-41d4-a716-446655440001'    // Valid UUID format
    };

    console.log('📝 Test Request:', JSON.stringify(testData, null, 2));

    const response = await fetch('http://localhost:3001/api/tour/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    console.log(`\n📊 Response Status: ${response.status}`);
    console.log('📊 Response Data:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ SUCCESS: API returned valid estimate data');

      // Validate response structure
      const requiredFields = ['estimatedRevenue', 'totalCosts', 'estimatedProfit', 'roi', 'canAfford'];
      const missingFields = requiredFields.filter(field => !(field in result));

      if (missingFields.length === 0) {
        console.log('✅ SUCCESS: All required fields present');
      } else {
        console.log('❌ MISSING FIELDS:', missingFields);
      }
    } else {
      console.log('\n❌ ERROR: API returned error');
      console.log('💡 This is expected if test data doesn\'t exist in database');
    }

  } catch (error) {
    console.error('\n🚨 REQUEST FAILED:', error.message);
  }
};

// Run the test
console.log('🎯 Phase 5: Tour Redundancy Elimination - API Validation Test\n');
test_tour_estimation();