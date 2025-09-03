#!/usr/bin/env tsx
/**
 * One-time migration script to move investment data from metadata to proper columns
 */

import { db } from '../server/db';
import { songs, projects } from '../shared/schema';
import { sql, eq } from 'drizzle-orm';

async function migrateSongInvestmentData() {
  console.log('Starting song investment data migration...');
  
  try {
    // Find all songs with projectId in metadata
    const songsWithMetadataProjectId = await db.select().from(songs)
      .where(sql`metadata->>'projectId' IS NOT NULL`);
    
    console.log(`Found ${songsWithMetadataProjectId.length} songs with metadata projectId`);
    
    let migrated = 0;
    let failed = 0;
    
    for (const song of songsWithMetadataProjectId) {
      try {
        const oldProjectId = (song.metadata as any)?.projectId;
        const perSongBudget = (song.metadata as any)?.perSongBudget || 0;
        
        if (!oldProjectId) {
          console.log(`Skipping song ${song.id} - no projectId in metadata`);
          continue;
        }
        
        // Get the project to fetch the budget if not in metadata
        let productionBudget = perSongBudget;
        if (!productionBudget) {
          const [project] = await db.select().from(projects)
            .where(eq(projects.id, oldProjectId));
          
          if (project) {
            productionBudget = project.budgetPerSong || 0;
          }
        }
        
        // Update the song with proper foreign key and budget
        await db.update(songs)
          .set({
            projectId: oldProjectId,
            productionBudget: Math.round(productionBudget)
          })
          .where(eq(songs.id, song.id));
        
        console.log(`✓ Migrated song ${song.title} (${song.id})`);
        migrated++;
        
      } catch (error) {
        console.error(`✗ Failed to migrate song ${song.id}:`, error);
        failed++;
      }
    }
    
    console.log('\n=== Migration Summary ===');
    console.log(`Successfully migrated: ${migrated} songs`);
    console.log(`Failed: ${failed} songs`);
    
    // Verify migration
    const songsWithNewProjectId = await db.select({
      count: sql<number>`count(*)`
    }).from(songs)
      .where(sql`project_id IS NOT NULL`);
    
    console.log(`\nSongs with proper project_id: ${songsWithNewProjectId[0].count}`);
    
    // Check ROI calculations
    const songsWithROI = await db.select({
      id: songs.id,
      title: songs.title,
      productionBudget: songs.productionBudget,
      totalRevenue: songs.totalRevenue,
      roiPercentage: songs.roiPercentage
    }).from(songs)
      .where(sql`roi_percentage IS NOT NULL`)
      .limit(5);
    
    if (songsWithROI.length > 0) {
      console.log('\n=== Sample ROI Calculations ===');
      songsWithROI.forEach(song => {
        console.log(`${song.title}: Investment=$${song.productionBudget}, Revenue=$${song.totalRevenue}, ROI=${song.roiPercentage?.toFixed(1)}%`);
      });
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run migration
migrateSongInvestmentData();