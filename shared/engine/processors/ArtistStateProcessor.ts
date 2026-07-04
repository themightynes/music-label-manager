/**
 * ArtistStateProcessor — weekly artist/executive state evolution.
 *
 * Phase 2 engine-seams §2 row 8 (ArtistStateProcessor half). VERBATIM move of the
 * artist-state cluster from `GameEngine`:
 *   - `applyArtistChangesToDatabase` — flush accumulated summary.artistChanges to DB
 *   - `processWeeklyMoodChanges` (+ helpers `calculateReleaseMoodBoost`,
 *     `calculateWorkloadStressPenalty`, `calculateNaturalMoodDrift`)
 *   - `processWeeklyPopularityChanges`
 *   - `processExecutiveMoodDecay` (+ helper `formatExecutiveRole`)
 *   - `selectHighestPopularityArtist`, `loadSignedArtists` (artist selection used by
 *     the ActionProcessor effects hub)
 *
 * Every log line, branch, summary mutation, and storage call is preserved
 * character-for-character, with only `this.` rebound to the injected
 * `WeekContext` (`this.gameState` → `ctx.gameState`, `this.storage` → `ctx.storage`)
 * and the intra-class helper calls rebound to `this.<helper>(...)`.
 *
 * RNG INVARIANT (see ./types.ts): the only seeded draw in this cluster is the
 * tie-break in `selectHighestPopularityArtist`. The pre-extraction engine used a
 * RAW `this.rng()` there; `ctx.getRandom(0, 1)` is the SAME draw
 * (`getRandom(min,max) = min + rng()*(max-min)`, so `getRandom(0,1) === rng()`),
 * from the engine's single seeded stream in the SAME pipeline position.
 *
 * The processor is stateless — all state flows through the `WeekContext`.
 * Same-signature engine delegates are kept for every method so external callers
 * (advanceWeek pipeline + the mood test suites that call these via
 * `(engine as any).method`) keep working byte-for-byte.
 */
import type { WeekContext } from './types';
import type { Artist } from '../../schema';
import type { WeekSummary, GameArtist } from '../../types/gameTypes';
import { ArtistChangeHelpers } from '../../types/gameTypes';

export class ArtistStateProcessor {
  /**
   * Apply per-artist mood/energy changes from meetings to database
   * Task 6.2: Updated to support per-artist mood targeting with database logging
   * Processes changes accumulated in summary.artistChanges[artistId].mood/energy
   * Note: Artist loyalty was refactored to energy
   */
  async applyArtistChangesToDatabase(ctx: WeekContext, dbTransaction?: any): Promise<void> {
    const { summary } = ctx;
    // Check if there are any artist changes to apply
    if (!summary.artistChanges || Object.keys(summary.artistChanges).length === 0) {
      return;
    }

    // Get storage methods
    if (!ctx.storage || !ctx.storage.getArtistsByGame || !ctx.storage.updateArtist) {
      console.warn('[ARTIST CHANGES] Storage not available for artist updates');
      return;
    }

    // Check if createMoodEvent method exists for logging
    const canLogMoodEvents = typeof ctx.storage.createMoodEvent === 'function';

    const artists = await ctx.storage.getArtistsByGame(ctx.gameState.id, dbTransaction);
    if (!artists || artists.length === 0) {
      console.log('[ARTIST CHANGES] No artists found for mood/energy updates');
      return;
    }

    // Iterate through each artist with accumulated changes
    for (const artistId of Object.keys(summary.artistChanges)) {
      const changes = summary.artistChanges[artistId];

      // Skip if this is not a per-artist object (it's a global number like energy/popularity)
      if (typeof changes !== 'object' || changes === null || Array.isArray(changes)) {
        continue;
      }

      // Skip if no mood/energy changes for this artist
      if (!changes.mood && !changes.energy) {
        continue;
      }

      const artist = artists.find((a: GameArtist) => a.id === artistId);
      if (!artist) {
        console.warn(`[ARTIST CHANGES] Artist ${artistId} not found in database, skipping`);
        continue;
      }

      const updates: any = {};
      let hasUpdates = false;

      // Apply mood change
      if (changes.mood && changes.mood !== 0) {
        const currentMood = artist.mood || 50;
        const newMood = Math.max(0, Math.min(100, currentMood + changes.mood));
        updates.mood = newMood;
        hasUpdates = true;

        console.log(`[ARTIST CHANGES] ${artist.name}: mood ${currentMood} → ${newMood} (${changes.mood > 0 ? '+' : ''}${changes.mood})`);

        // Task 2.4 & 6.2: Log mood event to database with event source detection
        if (canLogMoodEvents) {
          try {
            // Determine event type and metadata from eventSource (Task 2.4)
            const eventSource = changes.eventSource || { type: 'other' };
            let eventType: string;
            let description: string;
            const metadata: Record<string, any> = { week: ctx.gameState.currentWeek };

            if (eventSource.type === 'dialogue_choice') {
              eventType = 'dialogue_choice';
              description = `Mood ${changes.mood > 0 ? 'improved' : 'decreased'} from dialogue choice`;
              if (eventSource.sceneId) metadata.sceneId = eventSource.sceneId;
              if (eventSource.choiceId) metadata.choiceId = eventSource.choiceId;
            } else if (eventSource.type === 'executive_meeting') {
              eventType = 'executive_meeting';
              description = `Mood ${changes.mood > 0 ? 'improved' : 'decreased'} from executive meeting decision`;
              metadata.source = 'meeting_choice';
              if (eventSource.meetingName) metadata.meetingName = eventSource.meetingName;
            } else {
              eventType = 'other';
              description = `Mood ${changes.mood > 0 ? 'improved' : 'decreased'}`;
            }

            await ctx.storage.createMoodEvent({
              artistId: artistId,
              gameId: ctx.gameState.id,
              eventType,
              moodChange: changes.mood,
              moodBefore: currentMood,
              moodAfter: newMood,
              description,
              weekOccurred: ctx.gameState.currentWeek,
              metadata
            }, dbTransaction);
            console.log(`[MOOD EVENT] Logged ${eventType} mood event for ${artist.name}: ${changes.mood > 0 ? '+' : ''}${changes.mood}`);
          } catch (error) {
            console.error(`[MOOD EVENT] Failed to log mood event for ${artist.name}:`, error);
          }
        }
      }

      // Apply energy change
      if (changes.energy && changes.energy !== 0) {
        const currentEnergy = artist.energy || 50;
        const newEnergy = Math.max(0, Math.min(100, currentEnergy + changes.energy));
        updates.energy = newEnergy;
        hasUpdates = true;

        console.log(`[ARTIST CHANGES] ${artist.name}: energy ${currentEnergy} → ${newEnergy} (${changes.energy > 0 ? '+' : ''}${changes.energy})`);
      }

      // Artist loyalty was refactored to energy - no longer tracking loyalty for artists
      // (Executives still have loyalty tracking)

      // Update the artist in database
      if (hasUpdates) {
        await ctx.storage.updateArtist(artist.id, updates, dbTransaction);
      }
    }

    // Clear all per-artist changes since they've been applied
    for (const artistId of Object.keys(summary.artistChanges)) {
      const changes = summary.artistChanges[artistId];
      if (typeof changes === 'object') {
        changes.mood = 0;
        changes.energy = 0;
      }
    }
  }

  /**
   * Process weekly mood changes for all artists
   * Orchestrates mood calculations from multiple sources:
   * 1. Release-based changes (success/failure)
   * 2. Workload stress (too many projects)
   * 3. Natural drift toward neutral (50)
   */
  async processWeeklyMoodChanges(ctx: WeekContext): Promise<void> {
    const { summary } = ctx;
    const dbTransaction = ctx.dbTransaction;
    // Get artists and projects from storage
    if (!ctx.storage || !ctx.storage.getArtistsByGame) return;
    const artists = await ctx.storage.getArtistsByGame(ctx.gameState.id, dbTransaction);
    if (!artists || artists.length === 0) return;
    const projects = ctx.storage.getProjectsByGame ?
      await ctx.storage.getProjectsByGame(ctx.gameState.id, dbTransaction) : [];

    // Process each artist
    for (const artist of artists) {
      const currentMood = artist.mood || 50;

      // Calculate mood changes from each source (order matters for drift calculation!)
      const releaseMoodBoost = this.calculateReleaseMoodBoost(artist, summary);
      const workloadPenalty = this.calculateWorkloadStressPenalty(artist, projects, summary);
      const moodAfterImmediate = currentMood + releaseMoodBoost + workloadPenalty;
      const naturalDrift = this.calculateNaturalMoodDrift(artist, moodAfterImmediate, summary);

      // Calculate total mood change
      const totalMoodChange = releaseMoodBoost + workloadPenalty + naturalDrift;

      // Apply to database if changed
      if (totalMoodChange !== 0) {
        const newMood = Math.max(0, Math.min(100, currentMood + totalMoodChange));
        await ctx.storage.updateArtist(artist.id, { mood: newMood }, dbTransaction);

        // Log summary entry if non-drift changes occurred
        if (totalMoodChange !== naturalDrift) {
          summary.changes.push({
            type: 'mood',
            description: `${artist.name}'s mood ${totalMoodChange > 0 ? 'improved' : 'decreased'}`,
            amount: totalMoodChange,
            moodChange: totalMoodChange,
            artistId: artist.id,
            source: 'weekly_routine'
          });
        }
      }
    }
  }

  /**
   * Calculate mood boost/penalty from releases completed this week
   * Reads from summary.artistChanges (unified format)
   *
   * @param artist - The artist to calculate mood boost for
   * @param summary - Week summary containing artist changes
   * @returns Numeric mood change from releases (positive or negative)
   */
  calculateReleaseMoodBoost(
    artist: any,
    summary: WeekSummary
  ): number {
    // Get mood boost from releases (uses type-safe helper)
    const releaseMoodBoost = ArtistChangeHelpers.getMood(summary.artistChanges, artist.id);

    // Add UI feedback if boost occurred
    if (releaseMoodBoost !== 0) {
      summary.changes.push({
        type: 'mood',
        description: `${artist.name}'s mood ${releaseMoodBoost > 0 ? 'improved from successful release' : 'decreased from poor tour performance'} (${releaseMoodBoost > 0 ? '+' : ''}${releaseMoodBoost})`,
        amount: releaseMoodBoost,
        moodChange: releaseMoodBoost,
        artistId: artist.id
      });
    }

    return releaseMoodBoost;
  }

  /**
   * Calculate mood penalty from artist workload
   * Artists with >2 active projects get stressed: -5 mood per extra project
   *
   * @param artist - The artist to calculate workload penalty for
   * @param projects - All projects in the game
   * @param summary - Week summary to add change entries to
   * @returns Numeric mood penalty from workload (0 or negative)
   */
  calculateWorkloadStressPenalty(
    artist: any,
    projects: any[],
    summary: WeekSummary
  ): number {
    // Count active projects for this artist
    const activeProjects = projects.filter(
      (p: any) => p.artistId === artist.id &&
      ['recording', 'mixing', 'mastering'].includes(p.stage)
    ).length;

    // Apply stress penalty if overworked
    if (activeProjects > 2) {
      const workloadPenalty = (activeProjects - 2) * -5;

      summary.changes.push({
        type: 'mood',
        description: `${artist.name} is stressed from workload (${activeProjects} active projects)`,
        amount: workloadPenalty,
        moodChange: workloadPenalty,
        artistId: artist.id
      });

      return workloadPenalty;
    }

    return 0;
  }

  /**
   * Calculate natural mood drift toward neutral (50)
   * IMPORTANT: Must be called AFTER calculating immediate mood changes
   * to preserve bugfix logic (drift based on post-change mood, not pre-change)
   *
   * @param artist - The artist to calculate drift for
   * @param moodAfterImmediate - Artist's mood after release and workload changes
   * @param summary - Week summary to add change entries to
   * @returns Numeric mood drift amount (+3, -3, or 0)
   */
  calculateNaturalMoodDrift(
    artist: any,
    moodAfterImmediate: number,
    summary: WeekSummary
  ): number {
    // Natural drift toward 50 (by 3 points max)
    let driftAmount = 0;

    if (moodAfterImmediate > 55) {
      driftAmount = -3;
    } else if (moodAfterImmediate < 45) {
      driftAmount = 3;
    }

    // Log drift as separate change entry if it occurred
    if (driftAmount !== 0) {
      summary.changes.push({
        type: 'mood',
        description: `${artist.name}'s mood ${driftAmount > 0 ? 'naturally improved' : 'naturally decreased'} (drift toward 50)`,
        amount: driftAmount,
        moodChange: driftAmount,
        artistId: artist.id,
        source: 'weekly_drift'
      });
    }

    return driftAmount;
  }

  /**
   * Process weekly popularity changes for all artists
   * UNIFIED FORMAT: Now reads from per-artist objects (artistChanges[artistId].popularity)
   * Mirrors processWeeklyMoodChanges pattern for consistency
   */
  async processWeeklyPopularityChanges(ctx: WeekContext): Promise<void> {
    const { summary } = ctx;
    const dbTransaction = ctx.dbTransaction;
    // Get artists from storage if available
    if (!ctx.storage || !ctx.storage.getArtistsByGame) {
      return;
    }

    const artists = await ctx.storage.getArtistsByGame(ctx.gameState.id, dbTransaction);
    if (!artists || artists.length === 0) return;

    for (const artist of artists) {
      let popularityChange = 0;
      const currentPopularity = artist.popularity || 0;

      // UNIFIED FORMAT: Read from per-artist object (uses type-safe helper)
      const popularityBoost = ArtistChangeHelpers.getPopularity(summary.artistChanges, artist.id);

      if (popularityBoost > 0) {
        popularityChange += popularityBoost;
      }

      // Apply popularity change
      if (popularityChange !== 0) {
        const newPopularity = Math.round(Math.max(0, Math.min(100, currentPopularity + popularityChange)));

        // Update artist popularity in storage
        if (ctx.storage.updateArtist) {
          await ctx.storage.updateArtist(artist.id, { popularity: newPopularity }, dbTransaction);
        }

        // Track change - always show the total popularity change
        summary.changes.push({
          type: 'popularity',
          description: `${artist.name}'s popularity increased (+${popularityChange.toFixed(1)})`,
          amount: popularityChange
        });
      }
    }
  }

  /**
   * Process weekly mood and loyalty decay for executives
   * - Loyalty decays when executives are ignored for 3+ weeks
   * - Mood naturally drifts toward neutral (50) over time
   */
  async processExecutiveMoodDecay(ctx: WeekContext, dbTransaction?: any): Promise<void> {
    const { summary } = ctx;
    try {
      // Check if storage has executive methods
      if (!ctx.storage || !ctx.storage.getExecutivesByGame) {
        console.log('[GAME-ENGINE] No executive storage methods available, skipping decay');
        return;
      }

      const executives = await ctx.storage.getExecutivesByGame(ctx.gameState.id, dbTransaction);
      if (!executives || executives.length === 0) {
        console.log('[GAME-ENGINE] No executives found for game, skipping decay');
        return;
      }

      const currentWeek = ctx.gameState.currentWeek || 1;
      console.log(`[GAME-ENGINE] Processing executive decay for week ${currentWeek}, ${executives.length} executives`);

      for (const exec of executives) {
      let moodChange = 0;
      let loyaltyChange = 0;
      const currentMood = exec.mood || 50;
      const currentLoyalty = exec.loyalty || 50;

      // Calculate loyalty decay for inactivity
      // If lastActionWeek is null/undefined, treat as never used (start from week 0)
      const lastAction = exec.lastActionWeek || 0;
      const weeksSinceAction = lastAction === 0 ? currentWeek : currentWeek - lastAction;

      // Check if executive was used this week using in-memory tracking
      // This avoids database transaction isolation issues
      const wasUsedThisWeek = (summary as any).usedExecutives.has(exec.id);

      console.log(`[DECAY] Executive ${exec.role}:`);
      console.log(`  - Current mood: ${currentMood}, loyalty: ${currentLoyalty}`);
      console.log(`  - Last used: Week ${lastAction === 0 ? 'Never' : lastAction}`);
      console.log(`  - Weeks since action: ${weeksSinceAction}`);
      console.log(`  - Used this week: ${wasUsedThisWeek}`);

      // Loyalty decay: -5 every week after being ignored for 3+ weeks
      if (weeksSinceAction >= 3 && !wasUsedThisWeek) {
        loyaltyChange = -5; // Consistent weekly penalty after 3 weeks of neglect
      }

      // Natural mood normalization toward 50 - but NOT for executives used this week
      // This prevents the +5/-5 conflict where used executives get cancelled out
      if (!wasUsedThisWeek) {
        if (currentMood > 55) {
          // Happy executives gradually calm down
          moodChange = -Math.min(5, currentMood - 50);
        } else if (currentMood < 45) {
          // Unhappy executives gradually recover
          moodChange = Math.min(5, 50 - currentMood);
        }
      }

      console.log(`  - Calculated mood change: ${moodChange}`);
      console.log(`  - Calculated loyalty change: ${loyaltyChange}`);

      // Apply changes if any
      if (moodChange !== 0 || loyaltyChange !== 0) {
        const newMood = Math.max(0, Math.min(100, currentMood + moodChange));
        const newLoyalty = Math.max(0, Math.min(100, currentLoyalty + loyaltyChange));

        console.log(`  - Final values: mood ${currentMood} → ${newMood}, loyalty ${currentLoyalty} → ${newLoyalty}`);

        // Update executive in storage with transaction context
        await ctx.storage.updateExecutive(exec.id, {
          mood: newMood,
          loyalty: newLoyalty
        }, dbTransaction);

        // Log loyalty decay to summary for user feedback
        if (loyaltyChange < 0) {
          summary.changes.push({
            type: 'executive_interaction',
            description: `${this.formatExecutiveRole(exec.role)}'s loyalty decreased (ignored for ${weeksSinceAction} weeks)`,
            amount: loyaltyChange,
            // Exec-meetings-revival PR-2: explicit discriminator so changeImportance
            // can promote genuine decay notices to 'notable' without string-matching.
            loyaltyChange
          });
        }

        // Log mood changes if significant
        if (Math.abs(moodChange) >= 3) {
          summary.changes.push({
            type: 'executive_interaction',
            description: `${this.formatExecutiveRole(exec.role)}'s mood ${moodChange > 0 ? 'improved' : 'declined'} naturally`,
            amount: moodChange
          });
        }
      } else {
        console.log(`  - No changes needed for ${exec.role}`);
      }
    }
    } catch (error) {
      console.error('[GAME-ENGINE] Error in processExecutiveMoodDecay:', error);
      // Don't throw - let the game continue even if executive decay fails
    }
  }

  /**
   * Helper to format executive role names for display
   */
  formatExecutiveRole(role: string): string {
    const roleNames: Record<string, string> = {
      'head_ar': 'Head of A&R',
      'cmo': 'Chief Marketing Officer',
      'cco': 'Chief Creative Officer',
      'head_distribution': 'Head of Distribution'
    };
    return roleNames[role] || role;
  }

  /**
   * Select artist with highest popularity for predetermined meetings
   * Handles edge cases: 0 artists (null), 1 artist (auto-select), ties (random)
   * Per FR-10 (Predetermined meeting logic)
   */
  async selectHighestPopularityArtist(ctx: WeekContext): Promise<Artist | null> {
    // Load signed artists from storage (BUGFIX: was using non-existent gameState.artists)
    if (!ctx.storage?.getArtistsByGame) {
      console.warn('[ARTIST SELECTION] Storage not available for artist selection');
      return null;
    }

    const allArtists = await ctx.storage.getArtistsByGame(ctx.gameState.id, ctx.dbTransaction);
    const signedArtists = allArtists.filter((a: Artist) => a.signed);

    // Edge case: No signed artists
    if (signedArtists.length === 0) {
      console.log('[ARTIST SELECTION] No signed artists available for predetermined meeting');
      return null;
    }

    // Edge case: Only 1 artist signed (auto-select)
    if (signedArtists.length === 1) {
      console.log(`[ARTIST SELECTION] Auto-selected only artist: ${signedArtists[0].name}`);
      return signedArtists[0];
    }

    // Find highest popularity
    const maxPopularity = Math.max(...signedArtists.map((a: Artist) => a.popularity || 0));
    const topArtists = signedArtists.filter((a: Artist) => (a.popularity || 0) === maxPopularity);

    // Handle tie-breaking with random selection
    if (topArtists.length > 1) {
      // RNG INVARIANT: raw `this.rng()` in the pre-extraction engine === `ctx.getRandom(0, 1)`
      // (getRandom(min,max) = min + rng()*(max-min)); same seeded stream, same position.
      const selectedIndex = Math.floor(ctx.getRandom(0, 1) * topArtists.length);
      const selectedArtist = topArtists[selectedIndex];
      console.log(`[ARTIST SELECTION] Predetermined selection: ${topArtists.length} artists tied at popularity ${maxPopularity}, selected ${selectedArtist.name} randomly`);
      return selectedArtist;
    }

    // Single artist with highest popularity
    const selectedArtist = topArtists[0];
    console.log(`[ARTIST SELECTION] Predetermined selection: ${selectedArtist.name} (highest popularity: ${maxPopularity})`);
    return selectedArtist;
  }

  /**
   * Load signed artists from storage (helper method)
   */
  async loadSignedArtists(ctx: WeekContext): Promise<Artist[]> {
    if (!ctx.storage?.getArtistsByGame) {
      return [];
    }
    const allArtists = await ctx.storage.getArtistsByGame(ctx.gameState.id, ctx.dbTransaction);
    return allArtists.filter((a: Artist) => a.signed);
  }
}
