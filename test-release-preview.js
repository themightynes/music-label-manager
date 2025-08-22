/**
 * Test script to validate the enhanced release preview calculations
 */

const testReleasePreview = async () => {
  console.log('🎵 Setting up test data...\n');
  
  // Step 1: Create a new game
  console.log('📝 Creating test game...');
  const gameResponse = await fetch('http://localhost:5000/api/games', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer demo-token'
    },
    body: JSON.stringify({
      name: 'Test Game for Release Preview',
      difficulty: 'normal'
    })
  });
  
  const game = await gameResponse.json();
  const gameId = game.id;
  console.log(`✅ Game created: ${gameId}\n`);
  
  // Step 2: Get existing artists and songs
  console.log('🎤 Getting artists...');
  const artistsResponse = await fetch(`http://localhost:5000/api/game/${gameId}/artists/ready-for-release`, {
    headers: { 'Authorization': 'Bearer demo-token' }
  });
  const artistsData = await artistsResponse.json();
  
  if (!artistsData.artists || artistsData.artists.length === 0) {
    console.log('❌ No artists found - the game needs artists with ready songs');
    return;
  }
  
  const artist = artistsData.artists[0];
  console.log(`✅ Using artist: ${artist.name}\n`);
  
  // Step 3: Get songs for the artist
  console.log('🎵 Getting ready songs...');
  const songsResponse = await fetch(`http://localhost:5000/api/game/${gameId}/artists/${artist.id}/songs/ready`, {
    headers: { 'Authorization': 'Bearer demo-token' }
  });
  const songsData = await songsResponse.json();
  
  if (!songsData.songs || songsData.songs.length === 0) {
    console.log('❌ No ready songs found - the artist needs recorded songs');
    return;
  }
  
  const songs = songsData.songs.slice(0, 3); // Take up to 3 songs for EP
  console.log(`✅ Found ${songs.length} ready songs\n`);
  
  // Step 4: Test the release preview calculation
  const testData = {
    artistId: artist.id,
    songIds: songs.map(s => s.id),
    releaseType: songs.length === 1 ? "single" : songs.length <= 5 ? "ep" : "album",
    leadSingleId: songs.length > 1 ? songs[0].id : null,
    seasonalTiming: "q4",
    scheduledReleaseMonth: 8,
    marketingBudget: {
      radio: 3000,
      digital: 2500,
      pr: 1500,
      influencer: 2000
    },
    leadSingleStrategy: songs.length > 1 ? {
      leadSingleId: songs[0].id,
      leadSingleReleaseMonth: 7,
      leadSingleBudget: {
        radio: 1000,
        digital: 1500,
        pr: 500,
        influencer: 1000
      }
    } : null
  };

  try {
    console.log('🎵 Testing Release Preview Calculations...\n');
    
    const response = await fetch(`http://localhost:5000/api/game/${gameId}/releases/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ API Response Successful!\n');
      console.log('📊 Economic Calculation Results:');
      console.log('═'.repeat(50));
      console.log(`🎯 Release Type: ${result.preview.releaseType}`);
      console.log(`🎵 Song Count: ${result.preview.songCount}`);
      console.log(`⭐ Average Quality: ${result.preview.averageQuality}`);
      console.log('');
      console.log('💰 Financial Projections:');
      console.log(`📈 Estimated Streams: ${result.preview.estimatedStreams?.toLocaleString() || 'N/A'}`);
      console.log(`💵 Estimated Revenue: $${result.preview.estimatedRevenue?.toLocaleString() || 'N/A'}`);
      console.log(`💸 Total Marketing Cost: $${result.preview.totalMarketingCost?.toLocaleString() || 'N/A'}`);
      console.log(`📊 Projected ROI: ${result.preview.projectedROI || 'N/A'}%`);
      console.log('');
      console.log('🎛️ Marketing Multipliers:');
      console.log(`🏷️ Release Bonus: ${result.preview.releaseBonus || 'N/A'}%`);
      console.log(`🌍 Seasonal Multiplier: ${((result.preview.seasonalMultiplier || 1) * 100 - 100).toFixed(1)}%`);
      console.log(`📢 Marketing Multiplier: ${((result.preview.marketingMultiplier || 1) * 100 - 100).toFixed(1)}%`);
      console.log(`🎤 Lead Single Boost: ${((result.preview.leadSingleBoost || 1) * 100 - 100).toFixed(1)}%`);
      console.log(`🔗 Diversity Bonus: ${((result.preview.diversityBonus || 1) * 100 - 100).toFixed(1)}%`);
      console.log(`✨ Synergy Bonus: ${((result.preview.synergyBonus || 1) * 100 - 100).toFixed(1)}%`);
      console.log('');
      console.log('📱 Channel Effectiveness:');
      if (result.preview.channelEffectiveness) {
        Object.entries(result.preview.channelEffectiveness).forEach(([channel, data]) => {
          console.log(`${channel.padEnd(12)}: $${data.adjustedBudget?.toLocaleString() || 'N/A'} (${data.contribution?.toFixed(1) || 'N/A'}% - ${data.effectiveness || 'N/A'}% effectiveness)`);
          if (data.synergies && data.synergies.length > 0) {
            console.log(`${' '.repeat(15)}↳ Synergies: ${data.synergies.join(', ')}`);
          }
        });
      }
      console.log('');
      console.log('⚠️ Strategic Insights:');
      if (result.preview.risks && result.preview.risks.length > 0) {
        console.log('🚨 Risks:');
        result.preview.risks.forEach(risk => console.log(`  • ${risk}`));
      }
      if (result.preview.recommendations && result.preview.recommendations.length > 0) {
        console.log('💡 Recommendations:');
        result.preview.recommendations.forEach(rec => console.log(`  • ${rec}`));
      }
      
      console.log('\n🎉 All economic calculations completed successfully!');
      
    } else {
      console.log('❌ API Error:', result);
    }
    
  } catch (error) {
    console.log('💥 Test Failed:', error.message);
  }
};

// Run the test
testReleasePreview();