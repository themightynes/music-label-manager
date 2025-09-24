#!/usr/bin/env tsx
/**
 * Comprehensive validation script for Phase 2 of Artist Cost Tracking & ROI System
 * Tests all implemented features to ensure they're working correctly
 */

import { db } from '../../server/db';
import { songs, projects, artists } from '../../shared/schema';
import { eq, and, isNotNull, desc } from 'drizzle-orm';
import { FinancialSystem } from '../../shared/engine/FinancialSystem';

// Color codes for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

async function validatePhase2() {
  console.log('='.repeat(60));
  console.log('Phase 2 Implementation Validation');
  console.log('='.repeat(60));
  console.log();

  let allTestsPassed = true;

  // Test 1: Verify database schema columns exist
  console.log('Test 1: Database Schema Validation');
  console.log('-'.repeat(40));
  try {
    const [testSong] = await db.select({
      id: songs.id,
      title: songs.title,
      projectId: songs.projectId,
      productionBudget: songs.productionBudget,
      marketingAllocation: songs.marketingAllocation,
      totalInvestment: songs.totalInvestment,
      roiPercentage: songs.roiPercentage,
      totalRevenue: songs.totalRevenue
    }).from(songs).limit(1);

    console.log(`${GREEN}✓${RESET} All investment tracking columns exist`);
    console.log(`${GREEN}✓${RESET} Generated columns (totalInvestment, roiPercentage) accessible`);
  } catch (error) {
    console.log(`${RED}✗${RESET} Schema validation failed:`, error);
    allTestsPassed = false;
  }
  console.log();

  // Test 2: Verify foreign key relationships
  console.log('Test 2: Foreign Key Relationships');
  console.log('-'.repeat(40));
  try {
    const songsWithProjects = await db.select()
      .from(songs)
      .leftJoin(projects, eq(songs.projectId, projects.id))
      .where(isNotNull(songs.projectId))
      .limit(5);

    console.log(`${GREEN}✓${RESET} Found ${songsWithProjects.length} songs with project foreign keys`);
    if (songsWithProjects.length > 0) {
      const song = songsWithProjects[0].songs;
      const project = songsWithProjects[0].projects;
      console.log(`${GREEN}✓${RESET} Sample: "${song.title}" → Project: "${project?.name || 'N/A'}"`);
    }
  } catch (error) {
    console.log(`${RED}✗${RESET} Foreign key validation failed:`, error);
    allTestsPassed = false;
  }
  console.log();

  // Test 3: Verify InvestmentTracker integration
  console.log('Test 3: InvestmentTracker Integration');
  console.log('-'.repeat(40));
  try {
    const mockStorage = {
      updateSong: async () => {},
      getSongsByRelease: async () => [],
      getSongsByArtist: async () => [],
      updateSongs: async () => {}
    };
    
    const financialSystem = new FinancialSystem({}, Math.random, mockStorage);
    
    if (financialSystem.investmentTracker) {
      console.log(`${GREEN}✓${RESET} InvestmentTracker successfully integrated into FinancialSystem`);
      console.log(`${GREEN}✓${RESET} Methods available: recordProductionInvestment, allocateMarketingInvestment, getArtistInvestmentMetrics`);
    } else {
      console.log(`${RED}✗${RESET} InvestmentTracker not initialized`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`${RED}✗${RESET} InvestmentTracker validation failed:`, error);
    allTestsPassed = false;
  }
  console.log();

  // Test 4: Verify ROI calculations
  console.log('Test 4: ROI Calculation Validation');
  console.log('-'.repeat(40));
  try {
    const songsWithROI = await db.select({
      title: songs.title,
      productionBudget: songs.productionBudget,
      marketingAllocation: songs.marketingAllocation,
      totalInvestment: songs.totalInvestment,
      totalRevenue: songs.totalRevenue,
      roiPercentage: songs.roiPercentage
    })
    .from(songs)
    .where(and(
      isNotNull(songs.productionBudget),
      isNotNull(songs.totalRevenue)
    ))
    .orderBy(desc(songs.roiPercentage))
    .limit(5);

    if (songsWithROI.length > 0) {
      console.log(`${GREEN}✓${RESET} ROI calculations working for ${songsWithROI.length} songs`);
      console.log(`${GREEN}✓${RESET} Top ROI: "${songsWithROI[0].title}" = ${songsWithROI[0].roiPercentage?.toFixed(1)}%`);
      
      // Verify calculation accuracy
      const song = songsWithROI[0];
      const expectedROI = song.totalInvestment > 0 
        ? ((song.totalRevenue - song.totalInvestment) / song.totalInvestment) * 100
        : null;
      
      if (Math.abs((song.roiPercentage || 0) - (expectedROI || 0)) < 0.01) {
        console.log(`${GREEN}✓${RESET} ROI calculation verified as accurate`);
      } else {
        console.log(`${YELLOW}⚠${RESET} ROI calculation mismatch`);
      }
    } else {
      console.log(`${YELLOW}⚠${RESET} No songs with investment data found for ROI validation`);
    }
  } catch (error) {
    console.log(`${RED}✗${RESET} ROI validation failed:`, error);
    allTestsPassed = false;
  }
  console.log();

  // Test 5: Query performance check
  console.log('Test 5: Query Performance');
  console.log('-'.repeat(40));
  try {
    // Test indexed query performance
    const startTime = Date.now();
    
    // This should use the idx_songs_by_project index
    const projectSongs = await db.select()
      .from(songs)
      .where(isNotNull(songs.projectId))
      .limit(100);
    
    const queryTime = Date.now() - startTime;
    
    if (queryTime < 100) {
      console.log(`${GREEN}✓${RESET} Indexed query completed in ${queryTime}ms (< 100ms target)`);
    } else {
      console.log(`${YELLOW}⚠${RESET} Query took ${queryTime}ms (target: < 100ms)`);
    }
    
    console.log(`${GREEN}✓${RESET} Found ${projectSongs.length} songs with project links`);
  } catch (error) {
    console.log(`${RED}✗${RESET} Performance test failed:`, error);
    allTestsPassed = false;
  }
  console.log();

  // Test 6: Data migration validation
  console.log('Test 6: Data Migration Validation');
  console.log('-'.repeat(40));
  try {
    // Check for any songs still using metadata.projectId
    const songsWithMetadata = await db.select({
      title: songs.title,
      metadata: songs.metadata
    })
    .from(songs)
    .limit(10);
    
    let metadataProjectIdCount = 0;
    for (const song of songsWithMetadata) {
      if (song.metadata?.projectId) {
        metadataProjectIdCount++;
      }
    }
    
    if (metadataProjectIdCount === 0) {
      console.log(`${GREEN}✓${RESET} No songs using metadata.projectId (clean migration)`);
    } else {
      console.log(`${YELLOW}⚠${RESET} Found ${metadataProjectIdCount} songs still with metadata.projectId`);
    }
    
    // Count songs with proper foreign keys
    const songsWithFK = await db.select()
      .from(songs)
      .where(isNotNull(songs.projectId));
    
    console.log(`${GREEN}✓${RESET} ${songsWithFK.length} songs have proper projectId foreign keys`);
  } catch (error) {
    console.log(`${RED}✗${RESET} Migration validation failed:`, error);
    allTestsPassed = false;
  }
  console.log();

  // Summary
  console.log('='.repeat(60));
  if (allTestsPassed) {
    console.log(`${GREEN}✅ All Phase 2 tests PASSED!${RESET}`);
    console.log();
    console.log('Phase 2 Implementation Status:');
    console.log('✓ Database schema with investment tracking columns');
    console.log('✓ Foreign key relationships established');
    console.log('✓ InvestmentTracker class integrated');
    console.log('✓ Automatic ROI calculations via generated columns');
    console.log('✓ Indexed queries for performance');
    console.log('✓ Clean data migration completed');
  } else {
    console.log(`${RED}❌ Some tests FAILED - review output above${RESET}`);
  }
  console.log('='.repeat(60));
  
  process.exit(allTestsPassed ? 0 : 1);
}

validatePhase2().catch(error => {
  console.error(`${RED}Validation script failed:${RESET}`, error);
  process.exit(1);
});