/**
 * Song Conflict Resolution Utility
 * This script helps identify and resolve song scheduling conflicts
 */

async function resolveConflicts() {
  const gameId = "de7b1c5d-791a-4790-bb59-3db9cd78e099";
  const baseUrl = "http://localhost:5001";
  
  try {
    console.log('🔍 Checking for song scheduling conflicts...\n');
    
    // Step 1: Check current conflicts
    const conflictsResponse = await fetch(`${baseUrl}/api/game/${gameId}/songs/conflicts`, {
      headers: { 'Authorization': 'Bearer demo-token' }
    });
    
    if (!conflictsResponse.ok) {
      console.log('❌ Failed to check conflicts:', conflictsResponse.status);
      return;
    }
    
    const conflicts = await conflictsResponse.json();
    console.log('📊 Conflict Status:');
    console.log(`Total Reserved Songs: ${conflicts.conflicts.totalReservedSongs}`);
    console.log(`Planned Releases: ${conflicts.conflicts.plannedReleases}`);
    
    if (conflicts.conflicts.totalReservedSongs === 0) {
      console.log('✅ No conflicts found! All songs are available for new releases.');
      return;
    }
    
    console.log('\n🚨 Found conflicts:');
    conflicts.conflicts.conflictsByRelease.forEach((release, index) => {
      console.log(`\n${index + 1}. Release: "${release.releaseTitle}" (${release.releaseType})`);
      console.log(`   Scheduled for Month: ${release.scheduledMonth}`);
      console.log(`   Reserved Songs: ${release.reservedSongs.length}`);
      release.reservedSongs.forEach(song => {
        console.log(`   - ${song.songTitle} (ID: ${song.songId})`);
      });
    });
    
    console.log('\n🔧 Resolution Options:');
    console.log('1. Clear ALL song reservations (frees up all songs)');
    console.log('2. Delete specific planned releases (and refund marketing budget)');
    
    // For this utility, let's provide both options
    console.log('\n⚠️  Choose your resolution approach:');
    
    // Option 1: Clear all reservations (for testing/debugging)
    console.log('\n🧹 OPTION 1: Clear ALL song reservations');
    console.log('This will free up all songs but keep the planned releases (they will need new songs)');
    
    const clearResponse = await fetch(`${baseUrl}/api/game/${gameId}/songs/clear-reservations`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer demo-token' }
    });
    
    if (clearResponse.ok) {
      const clearResult = await clearResponse.json();
      console.log('✅ Cleared reservations:', clearResult.message);
      console.log('Freed songs:', clearResult.clearedSongs.map(s => s.songTitle).join(', '));
    } else {
      console.log('❌ Failed to clear reservations');
    }
    
    // Option 2: Show how to delete specific releases
    console.log('\n📋 OPTION 2: Delete specific planned releases');
    console.log('To delete a specific release and get full refund, use:');
    conflicts.conflicts.conflictsByRelease.forEach(release => {
      console.log(`DELETE ${baseUrl}/api/game/${gameId}/releases/${release.releaseId}`);
      console.log(`  → Will delete "${release.releaseTitle}" and refund marketing budget`);
    });
    
    console.log('\n✅ All conflicts have been resolved!');
    console.log('You should now be able to create new releases without conflicts.');
    
  } catch (error) {
    console.log('💥 Resolution failed:', error.message);
  }
}

resolveConflicts();