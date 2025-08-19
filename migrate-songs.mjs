// Migration script to populate individual song revenue fields for existing released songs
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { songs, projects } from './dist/shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function migrateSongData() {
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);
  
  console.log('🔄 Starting migration of existing song data...');
  
  try {
    // Get all released songs that don't have individual metrics yet
    const releasedSongs = await db.select().from(songs)
      .where(and(
        eq(songs.isReleased, true),
        eq(songs.totalRevenue, 0) // Only migrate songs without revenue data
      ));
    
    console.log(`📊 Found ${releasedSongs.length} released songs to migrate`);
    
    for (const song of releasedSongs) {
      console.log(`🎵 Migrating: "${song.title}" (Quality: ${song.quality})`);
      
      // Calculate individual metrics based on quality (same formula as new system)
      const songQuality = song.quality;
      const baseStreamsPerQuality = 50;
      const qualityBonus = Math.max(0, (songQuality - 40) / 60);
      const initialStreams = Math.round(songQuality * baseStreamsPerQuality * (1 + qualityBonus));
      const initialRevenue = Math.round(initialStreams * 0.5);
      
      // Update song with calculated metrics
      await db.update(songs)
        .set({
          initialStreams: initialStreams,
          totalStreams: initialStreams,
          totalRevenue: initialRevenue,
          monthlyStreams: initialStreams,
          lastMonthRevenue: initialRevenue,
          releaseMonth: song.createdMonth || 1 // Use creation month as release month fallback
        })
        .where(eq(songs.id, song.id));
      
      console.log(`✅ Updated "${song.title}": ${initialStreams} streams, $${initialRevenue} revenue`);
    }
    
    console.log('✨ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateSongData()
  .then(() => {
    console.log('🎉 Song data migration finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration error:', error);
    process.exit(1);
  });