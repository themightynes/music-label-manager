/**
 * SongGenerationProcessor — weekly recording-project song generation + the
 * enhanced (multiplicative) song-quality formula.
 *
 * Phase 2 engine-seams §2 row 5. VERBATIM move of nine `GameEngine` methods:
 * `processRecordingProjects`, `shouldGenerateProjectSongs`,
 * `generateWeeklyProjectSongs`, `getSongsPerWeek`, `generateSong`,
 * `calculateEnhancedSongQuality`, `generateSongMood`,
 * `generateSongEconomicInsight`, and `generateProjectCompletionSummary`.
 * Every log line, branch, RNG draw, budget calculation, summary mutation, and
 * storage/gameData call is preserved character-for-character. Only `this.` is
 * rebound: dependency access (`this.gameData` → `ctx.gameData`, `this.gameState`
 * → `ctx.gameState`, `this.getRandom` → `ctx.getRandom`, `this.financialSystem`
 * → `ctx.financialSystem`) flows through the injected `WeekContext`, while the
 * intra-processor method calls stay `this.*` (they now resolve within the class).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RNG INVARIANT (see ./types.ts) — HIGHEST-RISK PROCESSOR:
 *   `generateSong` and `calculateEnhancedSongQuality` make MANY sequential
 *   `ctx.getRandom(...)` draws (song-name pick, mood pick, the outlier roll at
 *   `:2376`, and the normal-variance draw at `:2394`). The outcome for a given
 *   seed depends on the EXACT ORDER of these draws — the quality formula is the
 *   game's "crown jewel". Bodies are moved wholesale with ZERO reordering so the
 *   golden master stays byte-identical.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The processor is stateless — all state flows through the `WeekContext`.
 * `processRecordingProjects` is still called from `GameEngine.advanceWeek`, and
 * `calculateEnhancedSongQuality` is still reached by the engine's
 * `getSystemStatus`-style diagnostics and `scripts/verification/
 * test-song-quality-scenarios.ts`; the engine's same-signature delegates keep
 * those call sites working.
 *
 * `FinancialSystem` is imported for its two static flavor-text helpers
 * (`generateSongEconomicInsight` / `generateProjectCompletionSummary`), exactly
 * as the pre-extraction engine methods called them.
 */
import type { WeekContext } from './types';
import type { WeekSummary } from '../../types/gameTypes';
import { FinancialSystem } from '../FinancialSystem';

export class SongGenerationProcessor {
  async processRecordingProjects(ctx: WeekContext, dbTransaction?: any): Promise<void> {
    const { summary } = ctx;

    try {
      // Get recording projects from database via ServerGameData
      const recordingProjects = await ctx.gameData.getActiveRecordingProjects(ctx.gameState.id || '', dbTransaction);

      if (!recordingProjects || recordingProjects.length === 0) {
        return;
      }

      for (const project of recordingProjects) {
        if (this.shouldGenerateProjectSongs(project)) {
          await this.generateWeeklyProjectSongs(ctx, project, summary, dbTransaction);
        }
      }
    } catch (error) {
      console.error('[SONG GENERATION] Error processing recording projects:', error);
    }
  }

  /**
   * Determines if a project should generate songs this week
   */
  shouldGenerateProjectSongs(project: any): boolean {
    // Only generate songs for recording projects (Singles, EPs) in production stage
    if (!['Single', 'EP'].includes(project.type) || project.stage !== 'production') {
      return false;
    }

    // Check if project still needs to create songs
    const songCount = project.songCount || 1;
    const songsCreated = project.songsCreated || 0;

    return songsCreated < songCount;
  }

  /**
   * Generates songs for a recording project during weekly processing
   */
  async generateWeeklyProjectSongs(ctx: WeekContext, project: any, summary: WeekSummary, dbTransaction?: any): Promise<void> {

    try {
      const artist = await ctx.gameData.getArtistById(project.artistId);
      if (!artist) {
        console.error(`[SONG GENERATION] Artist not found for project ${project.id}`);
        return;
      }

      // Determine how many songs to generate this week
      const remainingSongs = (project.songCount || 1) - (project.songsCreated || 0);
      const songsPerWeek = this.getSongsPerWeek(project.type);
      const songsToGenerate = Math.min(remainingSongs, songsPerWeek);

      // Track songs generated in this batch so B6 (below) can fire the
      // per-song "ready for release" notification for the completing batch.
      const songsGeneratedThisWeek: any[] = [];

      for (let i = 0; i < songsToGenerate; i++) {
        const song = this.generateSong(ctx, project, artist);

        // Store song via ServerGameData (if available)
        if (ctx.gameData.createSong) {
          try {
            const savedSong = await ctx.gameData.createSong(song, dbTransaction);
          } catch (songError) {
            console.error(`[SONG GENERATION] Failed to save song:`, songError);
            continue;
          }
        } else {
          console.warn(`[SONG GENERATION] createSong method not available on gameData`);
        }

        // Update project progress
        project.songsCreated = (project.songsCreated || 0) + 1;
        songsGeneratedThisWeek.push(song);

        // Enhanced summary with economic insights
        const economicInsight = this.generateSongEconomicInsight(song, project);

        summary.changes.push({
          type: 'project_complete', // Using existing type for now
          description: `Created song: "${song.title}" for ${project.title} - ${economicInsight}`,
          projectId: project.id,
          amount: 0
        });
      }

      // Update project in database
      if (ctx.gameData.updateProject) {
        await ctx.gameData.updateProject(project.id, {
          songsCreated: project.songsCreated
        }, dbTransaction);
      }

      // Check if project completed all songs
      if (project.songsCreated >= project.songCount) {
        // B6 (Phase 2 engine-seams PR-9, decision D3): the deleted no-op
        // processNewlyRecordedProjects pass was SUPPOSED to fire a per-song
        // "recording completed - ready for release" notification once a project
        // finished recording. Songs are born isRecorded:true, so that pass never
        // ran. Fire the notification here, at the moment the project's last song
        // is generated — one per song completed in this final batch, matching the
        // dead pass's { type: 'unlock', description, amount: 0 } shape.
        for (const song of songsGeneratedThisWeek) {
          summary.changes.push({
            type: 'unlock',
            description: `🎵 "${song.title}" recording completed - ready for release`,
            amount: 0
          });
        }

        // Calculate project completion economic summary
        const completionSummary = this.generateProjectCompletionSummary(project);

        summary.changes.push({
          type: 'project_complete',
          description: `Recording completed for ${project.title} (${project.songsCreated}/${project.songCount} songs) - ${completionSummary}`,
          projectId: project.id,
          amount: 0
        });
      }

    } catch (error) {
      console.error(`[SONG GENERATION] Error generating songs for project ${project.id}:`, error);
    }
  }

  /**
   * Determines how many songs to generate per week based on project type
   */
  getSongsPerWeek(projectType: string): number {
    switch (projectType) {
      case 'Single': return 2; // Singles can generate up to 2 songs per week
      case 'EP': return 3;     // EPs can generate up to 3 songs per week
      default: return 2;
    }
  }

  /**
   * Generates a single song for a recording project with enhanced quality calculation
   */
  generateSong(ctx: WeekContext, project: any, artist: any): any {
    const currentWeek = ctx.gameState.currentWeek || 1;

    // Get song names from data layer
    const songNamePools = ctx.gameData.getBalanceConfigSync()?.song_generation?.name_pools;
    const defaultSongNames = songNamePools?.default || [
      // Fallback if data not available
      'Midnight Dreams', 'City Lights', 'Hearts on Fire', 'Thunder Road'
    ];

    // Could use genre-specific names in future based on artist.genre
    const songNames = defaultSongNames;

    const randomName = songNames[Math.floor(ctx.getRandom(0, songNames.length))];

    // Get producer tier and time investment from project metadata (with defaults)
    const metadata = project.metadata || {};
    const producerTier = project.producerTier || metadata.producerTier || 'local';
    const timeInvestment = project.timeInvestment || metadata.timeInvestment || 'standard';

    console.log('[GENERATE SONG] Project budget data analysis:', {
      projectId: project.id,
      projectTitle: project.title,
      directBudgetPerSong: project.budgetPerSong,
      directTotalCost: project.totalCost,
      projectBudget: project.budget,
      projectSongCount: project.songCount,
      producerTier,
      timeInvestment,
      hasMetadata: !!metadata,
      metadataKeys: Object.keys(metadata)
    });

    // Extract economic decision data if available
    const economicDecisions = metadata.economicDecisions || {};
    const projectBudget = project.budgetPerSong ? (project.budgetPerSong * (project.songCount || 1)) :
                          (project.totalCost || project.budget || economicDecisions.finalBudget || 0);

    console.log('[GENERATE SONG] Budget calculation resolved:', {
      finalProjectBudget: projectBudget,
      calculationMethod: project.budgetPerSong ? 'budgetPerSong * songCount' :
                          (project.totalCost ? 'totalCost' :
                          (project.budget ? 'budget' :
                          (economicDecisions.finalBudget ? 'economicDecisions.finalBudget' : 'default 0')))
    });

    // Calculate enhanced song quality using new stacking formula with budget and song count
    const finalQuality = this.calculateEnhancedSongQuality(
      ctx,
      artist,
      project,
      producerTier,
      timeInvestment,
      projectBudget,
      project.songCount
    );

    // CRITICAL FIX: Ensure gameId and artistId are properly set
    // Use project.artistId consistently (this is the ID used in the UI)
    const gameId = project.gameId || ctx.gameState.id;
    const artistId = project.artistId; // Always use project's artistId, not the fetched artist.id

    // Calculate per-song budget allocation for tracking
    const perSongBudget = project.songCount > 1 ? Math.round(projectBudget / project.songCount) : projectBudget;

    console.log('[SONG GENERATION] Creating enhanced song with multiplicative quality:', {
      gameId,
      artistId,
      projectId: project.id,
      projectTitle: project.title,
      artistName: artist?.name || 'Unknown',
      artistTalent: artist?.talent || 50,
      artistWorkEthic: artist?.workEthic || 50,
      artistPopularity: artist?.popularity || 0,
      artistMood: artist?.mood || 50,
      producerTier,
      timeInvestment,
      finalQuality,
      projectBudget,
      perSongBudget,
      songCount: project.songCount
    });

    if (!gameId || !artistId) {
      console.error('[SONG GENERATION] MISSING REQUIRED FIELDS:', { gameId, artistId });
      throw new Error(`Cannot create song: missing gameId (${gameId}) or artistId (${artistId})`);
    }

    // Don't include 'id' field - let database generate it
    return {
      title: randomName,
      artistId: artistId,
      gameId: gameId,
      quality: Math.round(finalQuality),
      genre: artist.genre || 'pop', // Would come from artist data
      mood: this.generateSongMood(ctx),
      createdWeek: currentWeek,
      producerTier: producerTier,
      timeInvestment: timeInvestment,
      isRecorded: true,
      // Songs are born recorded (B6/D3): stamp recordedAt at creation. The deleted
      // processProjectSongRecording pass used to set this when it flipped songs to
      // recorded; now creation is the single point of truth. Wall-clock metadata —
      // the golden-master normalizer strips recordedAt.
      recordedAt: new Date(),
      isReleased: false,
      releaseId: null,
      // Direct foreign key and investment tracking
      projectId: project.id,
      productionBudget: Math.round(perSongBudget),
      marketingAllocation: 0, // Will be set when release is planned
      // Simplified metadata - only quality calculation details
      metadata: {
        artistAttributes: {
          talent: artist.talent || 50,
          workEthic: artist.workEthic || 50,
          popularity: artist.popularity || 0,
          mood: artist.mood || 50
        },
        qualityCalculation: {
          formula: 'multiplicative_v2',
          baseQuality: Math.round((artist.talent || 50) * 0.65 + (producerTier === 'legendary' ? 95 : producerTier === 'national' ? 75 : producerTier === 'regional' ? 55 : 40) * 0.35),
          factors: {
            time: timeInvestment,
            producer: producerTier,
            songCount: project.songCount || 1,
            budgetPerSong: perSongBudget
          },
          final: finalQuality
        },
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Calculates enhanced song quality using multiplicative formula with artist attributes
   * New formula incorporates talent, work ethic, and popularity
   */
  calculateEnhancedSongQuality(
    ctx: WeekContext,
    artist: any,
    project: any,
    producerTier: string,
    timeInvestment: string,
    budgetAmount?: number,
    songCount?: number
  ): number {
    // 1. BASE QUALITY (Talent + Producer Skill hybrid)
    const producerSkillMap: Record<string, number> = {
      'local': 40,
      'regional': 55,
      'national': 75,
      'legendary': 95
    };
    const producerSkill = producerSkillMap[producerTier] || 40;

    // Weighted average: talent matters more than producer
    const artistTalent = artist.talent || 50;
    const baseQuality = (artistTalent * 0.65 + producerSkill * 0.35);

    // 2. WORK ETHIC & TIME SYNERGY
    // Work ethic amplifies time investment effectiveness
    const timeMultipliers: Record<string, number> = {
      'rushed': 0.7,      // 70% efficiency
      'standard': 1.0,    // 100% efficiency (baseline)
      'extended': 1.1,    // 110% efficiency
      'perfectionist': 1.2 // 120% efficiency
    };

    const artistWorkEthic = artist.workEthic || 50;
    const workEthicBonus = (artistWorkEthic / 100) * 0.3; // up to 30% bonus
    const timeFactor = (timeMultipliers[timeInvestment] || 1.0) * (1 + workEthicBonus);

    // 3. POPULARITY IMPACT
    // Popularity attracts better session musicians, engineers, features
    const artistPopularity = artist.popularity || 0;
    const popularityFactor = 0.95 + 0.1 * Math.sqrt(artistPopularity / 100);
    // Results in 0.95x to 1.05x multiplier (10% total swing, more balanced)

    // 4. SESSION FATIGUE
    // Quality drops 3% per song after 3rd song
    const actualSongCount = songCount || project.songCount || 1;
    const focusFactor = Math.pow(0.97, Math.max(0, actualSongCount - 3));

    // 5. BUDGET IMPACT (using new multiplier method)
    const totalBudget = budgetAmount || project.totalCost || project.budgetPerSong || 0;
    const perSongBudget = totalBudget / actualSongCount;
    const budgetFactor = ctx.financialSystem.calculateBudgetQualityMultiplier(
      perSongBudget,
      project.type || 'single',
      producerTier,
      timeInvestment,
      actualSongCount
    );

    // 6. MOOD IMPACT (reduced influence)
    // Mood is temporary, shouldn't dominate permanent attributes
    const artistMood = artist.mood || 50;
    const moodFactor = 0.9 + 0.2 * (artistMood / 100); // 0.9x to 1.1x

    // 7. COMBINE WITH MULTIPLICATIVE APPROACH
    let quality = baseQuality;

    // Apply multiplicative factors
    quality *= timeFactor;        // 0.7x to 1.43x (with work ethic)
    quality *= popularityFactor;  // 0.8x to 1.1x
    quality *= focusFactor;       // 0.85x to 1.0x (for typical 1-5 songs)
    quality *= budgetFactor;      // 0.7x to 1.3x
    quality *= moodFactor;        // 0.9x to 1.1x

    // 8. SKILL-BASED VARIANCE WITH OUTLIER SYSTEM
    // Higher skill = more consistent results, Lower skill = more random
    // Combine artist talent and producer skill to determine consistency
    const combinedSkill = (artistTalent + producerSkill) / 2; // 0-100 scale

    // Calculate base variance range based on skill level
    // Low skill (25): ±35% base variance (was 20%)
    // Medium skill (50): ±20% base variance (was 10%)
    // High skill (75): ±10% base variance (was 5%)
    // Max skill (100): ±5% base variance (was 2%)
    const baseVarianceRange = 35 - (30 * (combinedSkill / 100)); // 35% down to 5%

    // Check for outlier events (10% chance)
    // Seeded RNG: getRandom(0, 1) is uniform [0,1), equivalent to Math.random() (Phase 2 PR-1)
    const outlierRoll = ctx.getRandom(0, 1);
    let variance: number;
    let outlierType = '';

    if (outlierRoll < 0.05) {
      // 5% chance of breakout hit (massive positive outlier)
      // Skill still matters: low skill gets bigger boost potential
      const outlierBoost = 1.5 + (0.5 * (1 - combinedSkill / 100)); // 1.5x to 2.0x for breakout
      variance = outlierBoost;
      outlierType = 'BREAKOUT HIT';
    } else if (outlierRoll < 0.10) {
      // 5% chance of critical failure (massive negative outlier)
      // Skill protects: high skill has less severe failures
      const outlierPenalty = 0.5 + (0.2 * (combinedSkill / 100)); // 0.5x to 0.7x for failure
      variance = outlierPenalty;
      outlierType = 'CRITICAL FAILURE';
    } else {
      // 90% normal variance within calculated range
      variance = 1 + (ctx.getRandom(-baseVarianceRange, baseVarianceRange) / 100);
    }

    quality *= variance;

    // Log the variance for debugging
    console.log(`[QUALITY VARIANCE] Skill-based variance:`, {
      artistTalent,
      producerSkill,
      combinedSkill: combinedSkill.toFixed(1),
      baseVarianceRange: `±${baseVarianceRange.toFixed(1)}%`,
      actualVariance: ((variance - 1) * 100).toFixed(1) + '%',
      outlierType: outlierType || 'NORMAL'
    });

    // 9. FLOOR AND CEILING
    // Ensure minimum quality even with bad inputs
    const QUALITY_FLOOR = 25;   // No song is completely worthless
    const QUALITY_CEILING = 98;  // Leave room for legendary moments

    const finalQuality = Math.round(Math.min(QUALITY_CEILING, Math.max(QUALITY_FLOOR, quality)));

    console.log(`[QUALITY CALC] New multiplicative song quality calculation:`, {
      baseQuality: baseQuality.toFixed(1),
      artistTalent,
      producerSkill,
      artistWorkEthic,
      timeFactor: timeFactor.toFixed(3),
      popularityFactor: popularityFactor.toFixed(3),
      focusFactor: focusFactor.toFixed(3),
      budgetFactor: budgetFactor.toFixed(3),
      moodFactor: moodFactor.toFixed(3),
      variance: variance.toFixed(3),
      rawQuality: quality.toFixed(1),
      finalQuality
    });

    return finalQuality;
  }

  /**
   * Generates a random mood for a song
   */
  generateSongMood(ctx: WeekContext): string {
    const moodTypes = ctx.gameData.getBalanceConfigSync()?.song_generation?.mood_types;
    const moods = moodTypes || ['upbeat', 'melancholic', 'aggressive', 'chill'];
    return moods[Math.floor(ctx.getRandom(0, moods.length))];
  }

  /**
   * Generates economic insight summary for song creation
   */
  // DELEGATED TO FinancialSystem
  generateSongEconomicInsight(song: any, project: any): string {
    return FinancialSystem.generateSongEconomicInsight(song, project);
  }

  /**
   * Generates economic summary for project completion
   */
  // DELEGATED TO FinancialSystem
  generateProjectCompletionSummary(project: any): string {
    return FinancialSystem.generateProjectCompletionSummary(project);
  }
}
