/**
 * Song Conflict Resolution Fix
 * This script clears all song reservations to fix the "Song Scheduling Conflict Detected" error
 */

async function fixSongConflicts() {
  const gameId = "de7b1c5d-791a-4790-bb59-3db9cd78e099";  // Current game ID
  const baseUrl = "http://localhost:5001";
  
  try {
    console.log('🔧 Fixing song scheduling conflicts...\n');
    
    // Step 1: Check current conflicts
    console.log('📊 Checking current conflict status...');
    const conflictsResponse = await fetch(`${baseUrl}/api/game/${gameId}/songs/conflicts`, {
      headers: { 'Authorization': 'Bearer demo-token' }
    });
    
    if (conflictsResponse.ok) {
      const conflicts = await conflictsResponse.json();
      console.log(`Found ${conflicts.conflicts.totalReservedSongs} reserved songs in ${conflicts.conflicts.plannedReleases} planned releases\n`);
    }
    
    // Step 2: Clear all song reservations
    console.log('🧹 Clearing all song reservations...');
    const clearResponse = await fetch(`${baseUrl}/api/game/${gameId}/songs/clear-reservations`, {
      method: 'POST',
      headers: { 
        'Authorization': 'Bearer demo-token',
        'Content-Type': 'application/json'
      }
    });
    
    if (!clearResponse.ok) {
      console.error('❌ Failed to clear reservations:', clearResponse.status);
      const errorText = await clearResponse.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const result = await clearResponse.json();
    console.log('✅ Success!');
    console.log(`Cleared reservations for ${result.clearedSongs.length} songs:`);
    
    result.clearedSongs.forEach((song, index) => {
      console.log(`  ${index + 1}. "${song.songTitle}" (${song.songId})`);
    });
    
    // Step 3: Verify fix
    console.log('\n🔍 Verifying fix...');
    const verifyResponse = await fetch(`${baseUrl}/api/game/${gameId}/songs/conflicts`, {
      headers: { 'Authorization': 'Bearer demo-token' }
    });
    
    if (verifyResponse.ok) {
      const verifyConflicts = await verifyResponse.json();
      if (verifyConflicts.conflicts.totalReservedSongs === 0) {
        console.log('🎉 All conflicts resolved! You can now create planned releases.');
      } else {
        console.log(`⚠️  Still ${verifyConflicts.conflicts.totalReservedSongs} reserved songs remaining.`);
      }
    }
    
    console.log('\n✅ Song conflict resolution complete!');
    console.log('You should now be able to use the Plan Release feature without scheduling conflicts.');
    
  } catch (error) {
    console.error('💥 Fix failed:', error.message);
    console.error('Please check that the game server is running on port 5001');
  }
}

// Execute the fix
fixSongConflicts();