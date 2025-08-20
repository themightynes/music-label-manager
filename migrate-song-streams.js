#!/usr/bin/env node

/**
 * Migration script to add initialStreams to existing released songs
 * This fixes songs that were released before the per-song stream calculation was implemented
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { songs } from './shared/schema.ts';
import { eq, and } from 'drizzle-orm';

// Database connection
const client = postgres(process.env.DATABASE_URL || '', { prepare: false });
const db = drizzle(client);

async function migrateSongStreams() {
  console.log('🔍 Starting song streams migration...');
  
  try {
    // Find all released songs that have no initialStreams
    const releasedSongsWithoutStreams = await db
      .select()
      .from(songs)
      .where(and(
        eq(songs.isReleased, true),
        eq(songs.initialStreams, 0)
      ));
    
    console.log(`📊 Found ${releasedSongsWithoutStreams.length} released songs without initialStreams`);
    
    if (releasedSongsWithoutStreams.length === 0) {
      console.log('✅ No songs need migration - all released songs already have initialStreams');
      return;
    }
    
    let updatedCount = 0;
    
    for (const song of releasedSongsWithoutStreams) {
      console.log(`🎵 Processing song: "${song.title}" (Quality: ${song.quality})`);
      
      // Calculate streams based on song quality (simplified calculation)
      // Using a basic formula: quality * 1000 * quality bonus
      const baseStreams = 1000;
      const qualityMultiplier = song.quality || 40;
      const qualityBonus = Math.max(1, (song.quality || 40) / 40); // 1x to 2.5x multiplier
      const calculatedStreams = Math.round(baseStreams * qualityMultiplier * qualityBonus);
      
      // Calculate initial revenue
      const revenuePerStream = 0.003;
      const initialRevenue = Math.round(calculatedStreams * revenuePerStream);
      
      console.log(`  💰 Calculated: ${calculatedStreams} streams, $${initialRevenue} revenue`);
      
      // Update song with calculated values
      await db
        .update(songs)
        .set({
          initialStreams: calculatedStreams,
          totalStreams: calculatedStreams,
          monthlyStreams: calculatedStreams,
          totalRevenue: initialRevenue,
          lastMonthRevenue: initialRevenue,
          releaseMonth: song.releaseMonth || 1 // Default to month 1 if not set
        })
        .where(eq(songs.id, song.id));
      
      updatedCount++;
      console.log(`  ✅ Updated song "${song.title}"`);
    }
    
    console.log(`🎉 Migration complete! Updated ${updatedCount} songs with initialStreams`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run migration
migrateSongStreams()
  .then(() => {
    console.log('✅ Song streams migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });