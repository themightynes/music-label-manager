import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { serverGameData } from '../data/gameData';
import { gameDataLoader } from '@shared/utils/dataLoader';
import { db } from '../db';
import { gameStates, projects, songs } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { requireClerkUser } from '../auth';

const router = Router();

// Debug endpoint to test data loading
router.get('/api/debug/data-load', requireClerkUser, async (req, res) => {
    const results: any = {};

    try {
      // Test loading each file individually
      const loader = gameDataLoader;

      try {
        results.artists = await loader.loadArtistsData();
        results.artistsStatus = 'OK';
      } catch (e: any) {
        results.artistsError = e.message;
      }

      try {
        results.balance = await loader.loadBalanceData();
        results.balanceStatus = 'OK';
      } catch (e: any) {
        results.balanceError = e.message;
      }

      try {
        results.world = await loader.loadWorldData();
        results.worldStatus = 'OK';
      } catch (e: any) {
        results.worldError = e.message;
      }

      try {
        results.dialogue = await loader.loadDialogueData();
        results.dialogueStatus = 'OK';
      } catch (e: any) {
        results.dialogueError = e.message;
      }

      try {
        results.events = await loader.loadEventsData();
        results.eventsStatus = 'OK';
      } catch (e: any) {
        results.eventsError = e.message;
      }

      try {
        results.roles = await loader.loadRolesData();
        results.rolesStatus = 'OK';
      } catch (e: any) {
        results.rolesError = e.message;
      }

      try {
        results.actions = await loader.loadActionsData();
        results.actionsStatus = 'OK';
      } catch (e: any) {
        results.actionsError = e.message;
      }

      res.json({
        success: true,
        results
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        results
      });
    }
  });

  // Data verification endpoints
router.get("/api/test-data", requireClerkUser, async (req, res) => {
    try {
      await serverGameData.initialize();

      const [allRoles, allArtists, allEvents] = await Promise.all([
        serverGameData.getAllRoles(),
        serverGameData.getAllArtists(),
        serverGameData.getAllEvents()
      ]);

      const sampleRole = allRoles[0];

      res.json({
        counts: {
          roles: allRoles.length,
          artists: allArtists.length,
          events: allEvents.length
        },
        sample: {
          role: {
            name: sampleRole?.name || 'No role found',
            relationship: sampleRole?.relationship || 0
          }
        },
        status: 'Data loaded successfully'
      });
    } catch (error) {
      console.error('Test data loading error:', error);
      res.status(500).json({
        message: "Failed to load test data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

router.get("/api/validate-types", requireClerkUser, async (req, res) => {
    try {
      await serverGameData.initialize();

      const [sampleRole, sampleArtist] = await Promise.all([
        serverGameData.getRoleById('manager'),
        serverGameData.getArtistsByArchetype('Visionary')
      ]);

      const validationResults = {
        role: {
          found: !!sampleRole,
          data: sampleRole || null,
          hasValidStructure: sampleRole ? (
            typeof sampleRole.id === 'string' &&
            typeof sampleRole.name === 'string' &&
            typeof sampleRole.relationship === 'number' &&
            Array.isArray(sampleRole.meetings)
          ) : false
        },
        artist: {
          found: sampleArtist && sampleArtist.length > 0,
          data: sampleArtist?.[0] || null,
          hasValidStructure: sampleArtist?.[0] ? (
            typeof sampleArtist[0].id === 'string' &&
            typeof sampleArtist[0].name === 'string' &&
            typeof sampleArtist[0].archetype === 'string' &&
            typeof sampleArtist[0].talent === 'number'
          ) : false
        }
      };

      const dataIntegrityCheck = await serverGameData.validateDataIntegrity();

      res.json({
        validation: validationResults,
        integrity: dataIntegrityCheck,
        status: 'Type validation complete'
      });
    } catch (error) {
      console.error('Type validation error:', error);
      res.status(500).json({
        message: "Failed to validate types",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // DEBUG: Check project and song revenue status
  // TODO(phase-1): this endpoint has NO auth middleware (no requireClerkUser) and
  // exposes game data by gameId. Preserved as-is during the Phase 1 pure move; auth
  // hardening is a deliberate, separately-reviewed change (see plan §6).
  router.get("/api/debug/game/:gameId/revenue", async (req, res) => {
    try {
      const gameId = req.params.gameId;

      // Get all projects for this game
      const allProjects = await db.select().from(projects).where(eq(projects.gameId, gameId));

      // Get all songs for this game
      const allSongs = await db.select().from(songs).where(eq(songs.gameId, gameId));

      // Get released projects specifically
      const releasedProjects = await db.select().from(projects)
        .where(and(eq(projects.gameId, gameId), eq(projects.stage, 'released')));

      res.json({
        summary: {
          totalProjects: allProjects.length,
          releasedProjects: releasedProjects.length,
          totalSongs: allSongs.length,
          releasedSongs: allSongs.filter(s => s.isReleased).length
        },
        projects: allProjects.map(p => ({
          id: p.id,
          title: p.title,
          type: p.type,
          stage: p.stage,
          artistId: p.artistId,
          songCount: p.songCount,
          songsCreated: p.songsCreated,
          startWeek: p.startWeek,
          metadata: p.metadata
        })),
        songs: allSongs.map(s => ({
          id: s.id,
          title: s.title,
          artistId: s.artistId,
          quality: s.quality,
          isRecorded: s.isRecorded,
          isReleased: s.isReleased,
          createdWeek: s.createdWeek,
          metadata: s.metadata
        })),
        releasedProjects: releasedProjects.map(p => ({
          id: p.id,
          title: p.title,
          metadata: p.metadata,
          hasRevenue: !!(p.metadata as any)?.revenue,
          hasStreams: !!(p.metadata as any)?.streams
        }))
      });
    } catch (error) {
      console.error('[DEBUG] Error fetching revenue debug status:', error);
      res.status(500).json({ message: "Failed to fetch revenue debug status" });
    }
  });

  // Developer tools endpoints
  router.get('/api/dev/markets-config', requireClerkUser, async (req, res) => {
    try {
      const marketsPath = path.join(process.cwd(), 'data', 'balance', 'markets.json');
      const configData = await fs.readFile(marketsPath, 'utf8');
      const config = JSON.parse(configData);
      res.json(config);
    } catch (error) {
      console.error('Failed to load markets config:', error);
      res.status(500).json({ error: 'Failed to load markets configuration' });
    }
  });

  // TODO(phase-1): this write endpoint uses requireClerkUser (any authenticated
  // user), NOT requireAdmin — it likely should be admin-gated since it writes to
  // data/balance/markets.json. Preserved as-is during the Phase 1 pure move; auth
  // hardening is a deliberate, separately-reviewed change (see plan §6).
  router.post('/api/dev/markets-config', requireClerkUser, async (req, res) => {
    try {
      const { config } = req.body;

      if (!config) {
        return res.status(400).json({ error: 'Configuration data is required' });
      }

      // Validate the structure
      if (!config.market_formulas || !config.seasonal_modifiers) {
        return res.status(400).json({ error: 'Invalid configuration structure' });
      }

      const marketsPath = path.join(process.cwd(), 'data', 'balance', 'markets.json');
      const formattedConfig = JSON.stringify(config, null, 2);

      await fs.writeFile(marketsPath, formattedConfig, 'utf8');

      res.json({ success: true, message: 'Markets configuration updated successfully' });
    } catch (error) {
      console.error('Failed to save markets config:', error);
      res.status(500).json({ error: 'Failed to save markets configuration' });
    }
  });

  // Streaming decay testing endpoint
  router.post('/api/game/:gameId/test/streaming-decay', requireClerkUser, async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const {
        songQuality,
        artistPopularity,
        playlistAccess,
        reputation,
        marketingBudget,
        weeksToSimulate = 8,
        streamingConfig,
        awarenessConfig
      } = req.body;

      // Get game state for current week
      const [gameState] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
      if (!gameState) {
        return res.status(404).json({ error: 'Game not found' });
      }

      // Create mock song and release data for testing
      const mockSong = {
        id: 'test-song',
        quality: songQuality,
        releaseId: 'test-release',
        releaseWeek: gameState.currentWeek || 1,
        initialStreams: 0 // Will be calculated
      };

      const mockRelease = {
        id: 'test-release',
        releaseWeek: gameState.currentWeek || 1,
        metadata: {
          marketingBudgetBreakdown: marketingBudget,
          totalInvestment: Object.values(marketingBudget).reduce((a: number, b: unknown) => a + (typeof b === 'number' ? b : 0), 0)
        }
      };

      // Initialize storage mock for testing
      const storageMock = {
        getRelease: async (releaseId: string) => {
          if (releaseId === 'test-release') {
            return mockRelease;
          }
          return null;
        }
      };

      // Realistic streaming calculation that matches PlanReleasePage scale
      const calculateRealisticStreams = (quality: number, playlistAccess: string, reputation: number, popularity: number) => {
        // Base streaming formula scaled to match actual game values
        const qualityComponent = quality * 200; // Higher base for realistic numbers
        const playlistMultiplier = playlistAccess === 'arenas' ? 4.0 : playlistAccess === 'theaters' ? 2.5 : playlistAccess === 'clubs' ? 1.8 : 1.0;
        const playlistComponent = playlistMultiplier * 150;
        const reputationComponent = reputation * 100;
        const popularityComponent = popularity * 80;

        const baseStreams = qualityComponent + playlistComponent + reputationComponent + popularityComponent;
        const variance = 0.8 + (Math.random() * 0.4); // ±20% variance for more realistic spread
        const firstWeekMultiplier = 3.0; // Higher multiplier for realistic initial streams

        return Math.round(baseStreams * variance * firstWeekMultiplier);
      };

      // Load awareness system configuration (use custom config if provided)
      const balanceConfig = await serverGameData.getBalanceConfig();
      const defaultAwarenessConfig = balanceConfig?.market_formulas?.awareness_system;
      const finalAwarenessConfig = awarenessConfig || defaultAwarenessConfig;

      // Calculate awareness gain for a song based on marketing spend and channel coefficients
      const calculateAwarenessGain = (songQuality: number, artistPopularity: number, marketingBudget: any) => {
        if (!finalAwarenessConfig?.enabled) return 0;

        const channelCoefficients = finalAwarenessConfig.channel_awareness_coefficients || {
          radio: 0.1,
          digital: 0.2,
          pr: 0.4,
          influencer: 0.3
        };

        const perUnitSpend = finalAwarenessConfig.per_unit_spend || 1000;

        // Calculate base awareness gain from marketing channels
        let awarenessGain = 0;

        // Radio awareness contribution
        const radioSpend = marketingBudget.radio || 0;
        if (radioSpend > 0) {
          awarenessGain += (radioSpend / perUnitSpend) * channelCoefficients.radio;
        }

        // Digital awareness contribution
        const digitalSpend = marketingBudget.digital || 0;
        if (digitalSpend > 0) {
          awarenessGain += (digitalSpend / perUnitSpend) * channelCoefficients.digital;
        }

        // PR awareness contribution
        const prSpend = marketingBudget.pr || 0;
        if (prSpend > 0) {
          awarenessGain += (prSpend / perUnitSpend) * channelCoefficients.pr;
        }

        // Influencer awareness contribution
        const influencerSpend = marketingBudget.influencer || 0;
        if (influencerSpend > 0) {
          awarenessGain += (influencerSpend / perUnitSpend) * channelCoefficients.influencer;
        }

        // Apply quality multiplier
        const qualityMultiplier = songQuality / 100;
        awarenessGain *= qualityMultiplier;

        // Apply artist popularity bonus
        const popularityBonus = 1 + (artistPopularity / 200);
        awarenessGain *= popularityBonus;

        // Cap awareness gain at 25 points per week
        return Math.min(awarenessGain, 25);
      };

      // Calculate marketing boost factor for a given week
      const calculateMarketingBoost = (weeksSinceRelease: number, marketingBudget: any) => {
        if (weeksSinceRelease < 2 || weeksSinceRelease > 4) return 1.0;

        let totalBoost = 1.0;

        // Radio: 85% effectiveness, sustained discovery
        const radioSpend = marketingBudget.radio || 0;
        if (radioSpend > 0) {
          totalBoost += (radioSpend / 10000) * 0.85 * 0.2;
        }

        // Digital: 92% effectiveness, algorithm feeding
        const digitalSpend = marketingBudget.digital || 0;
        if (digitalSpend > 0) {
          totalBoost += (digitalSpend / 8000) * 0.92 * 0.25;
        }

        // PR: 78% effectiveness, peaks in week 3
        const prSpend = marketingBudget.pr || 0;
        if (prSpend > 0) {
          const prWeekMultiplier = weeksSinceRelease === 3 ? 1.2 : 0.8;
          totalBoost += (prSpend / 6000) * 0.78 * 0.3 * prWeekMultiplier;
        }

        // Influencer: 88% effectiveness, social momentum
        const influencerSpend = marketingBudget.influencer || 0;
        if (influencerSpend > 0) {
          totalBoost += (influencerSpend / 5000) * 0.88 * 0.22;
        }

        return Math.min(totalBoost, 1.5); // Cap at 50% boost
      };

      const initialStreams = calculateRealisticStreams(songQuality, playlistAccess, reputation, artistPopularity);

      // Initialize awareness tracking
      let currentAwareness = 0;
      let peakAwareness = 0;
      let breakthroughAchieved = false;

      // Calculate progression for each week
      const results = [];
      for (let week = 1; week <= weeksToSimulate; week++) {
        const weeksSinceRelease = week;

        // Awareness processing
        let awarenessGain = 0;
        let awarenessDecay = 0;
        let awarenessModifier = 1.0;
        let breakthroughPotential = 0;

        if (weeksSinceRelease >= 1 && weeksSinceRelease <= 4) {
          // Awareness Building Phase (Weeks 1-4)
          awarenessGain = calculateAwarenessGain(songQuality, artistPopularity, marketingBudget);
          currentAwareness = Math.min(currentAwareness + awarenessGain, 100);
          peakAwareness = Math.max(peakAwareness, currentAwareness);

          // Calculate breakthrough potential
          if (finalAwarenessConfig?.enabled) {
            const thresholds = finalAwarenessConfig.breakthrough_thresholds || {};
            if (songQuality >= 80) {
              breakthroughPotential = Math.min(currentAwareness / 40, 1) * 0.65;
            } else if (songQuality >= 70) {
              breakthroughPotential = Math.min(currentAwareness / 60, 1) * 0.35;
            } else {
              breakthroughPotential = Math.min(currentAwareness / 80, 1) * 0.15;
            }

            // Roll for breakthrough achievement (deterministic for testing)
            if (!breakthroughAchieved && breakthroughPotential > 0) {
              // Use week-based seed for deterministic results across runs
              const seed = songQuality + artistPopularity + week + currentAwareness;
              const random = (Math.sin(seed) + 1) / 2; // Deterministic pseudo-random [0,1]

              if (random < breakthroughPotential) {
                breakthroughAchieved = true;

                // BREAKTHROUGH EFFECTS: Apply awareness explosion
                const breakthroughEffects = finalAwarenessConfig.breakthrough_effects || {};
                const awarenessMultiplier = breakthroughEffects.awareness_multiplier || 2.5;
                currentAwareness = Math.min(currentAwareness * awarenessMultiplier, 100);
                peakAwareness = Math.max(peakAwareness, currentAwareness);
              }
            }
          }
        } else if (weeksSinceRelease >= 5 && currentAwareness > 0) {
          // Awareness Decay Phase (Weeks 5+)
          if (finalAwarenessConfig?.enabled) {
            const decayRates = finalAwarenessConfig.awareness_decay_rates || {};
            let decayRate = breakthroughAchieved
              ? (decayRates.breakthrough_songs || 0.03)
              : (decayRates.standard_songs || 0.05);

            // Apply quality bonus reduction for high-quality songs
            if (songQuality >= (decayRates.quality_bonus_threshold || 85)) {
              decayRate = Math.max(0, decayRate - (decayRates.quality_bonus_reduction || 0.01));
            }

            awarenessDecay = currentAwareness * decayRate;
            currentAwareness = Math.max(0, currentAwareness - awarenessDecay);

            // Apply awareness modifier for sustained impact
            const impactFactors = finalAwarenessConfig.awareness_impact_factors || {};
            let impactFactor = 0;
            if (weeksSinceRelease >= 7) {
              impactFactor = impactFactors.weeks_7_plus || 0.5;
            } else { // weeks 5-6
              impactFactor = impactFactors.weeks_3_6 || 0.3;
            }

            awarenessModifier = 1.0 + (currentAwareness / 100) * impactFactor;

            // Cap awareness modifier to prevent runaway multipliers
            const maxModifier = finalAwarenessConfig.max_awareness_modifier || 2.0;
            awarenessModifier = Math.min(awarenessModifier, maxModifier);
          }
        }

        // Base decay calculation (use custom config if provided)
        let decayRate = streamingConfig?.weekly_decay_rate || 0.85;

        // BREAKTHROUGH EFFECT: Enhanced decay rate for breakthrough songs
        if (breakthroughAchieved && finalAwarenessConfig?.enabled) {
          const breakthroughEffects = finalAwarenessConfig.breakthrough_effects || {};
          decayRate = breakthroughEffects.enhanced_decay_rate || 0.92;
        }

        const ongoingFactor = streamingConfig?.ongoing_factor || 0.8;
        const reputationBonus = 1 + (reputation - 50) * (streamingConfig?.reputation_bonus_factor || 0.002);
        const accessBonus = 1 + (playlistAccess === 'arenas' ? 3.0 : playlistAccess === 'theaters' ? 2.0 : playlistAccess === 'clubs' ? 1.5 : 1.0 - 1) * (streamingConfig?.access_tier_bonus_factor || 0.1);

        // Calculate base streaming with appropriate decay rate
        let baseStreams;

        // BREAKTHROUGH EFFECT: Stream growth during breakthrough period
        if (breakthroughAchieved && finalAwarenessConfig?.enabled) {
          const breakthroughEffects = finalAwarenessConfig.breakthrough_effects || {};
          const streamGrowthDuration = breakthroughEffects.stream_growth_duration || 4;

          if (weeksSinceRelease <= streamGrowthDuration) {
            // Stream growth phase: 20-40% increase instead of decay
            const growthRate = 1.2 + (Math.random() * 0.2); // 1.2x to 1.4x growth
            const growthDecay = Math.pow(growthRate, weeksSinceRelease - 1); // Growth instead of decay
            baseStreams = initialStreams * growthDecay * reputationBonus * accessBonus * ongoingFactor;
          } else {
            // After growth phase, use enhanced decay rate
            const postGrowthWeeks = weeksSinceRelease - streamGrowthDuration;
            const baseDecay = Math.pow(decayRate, postGrowthWeeks);
            // Apply growth peak as new baseline
            const peakStreams = initialStreams * Math.pow(1.3, streamGrowthDuration - 1); // Use average 1.3x growth
            baseStreams = peakStreams * baseDecay * reputationBonus * accessBonus * ongoingFactor;
          }
        } else {
          // Standard decay calculation
          const baseDecay = Math.pow(decayRate, weeksSinceRelease);
          baseStreams = initialStreams * baseDecay * reputationBonus * accessBonus * ongoingFactor;
        }

        // Calculate with marketing boost
        const marketingBoost = calculateMarketingBoost(weeksSinceRelease, marketingBudget);
        baseStreams *= marketingBoost;

        // Apply awareness modifier for weeks 5+
        if (weeksSinceRelease >= 5) {
          baseStreams *= awarenessModifier;
        }

        const withMarketing = Math.round(baseStreams);

        // Calculate withoutMarketing baseline (for comparison)
        let withoutMarketingStreams;
        if (breakthroughAchieved && finalAwarenessConfig?.enabled) {
          const breakthroughEffects = finalAwarenessConfig.breakthrough_effects || {};
          const streamGrowthDuration = breakthroughEffects.stream_growth_duration || 4;

          if (weeksSinceRelease <= streamGrowthDuration) {
            const growthRate = 1.3; // Use average growth for baseline
            const growthDecay = Math.pow(growthRate, weeksSinceRelease - 1);
            withoutMarketingStreams = initialStreams * growthDecay * reputationBonus * accessBonus * ongoingFactor;
          } else {
            const postGrowthWeeks = weeksSinceRelease - streamGrowthDuration;
            const baseDecay = Math.pow(decayRate, postGrowthWeeks);
            const peakStreams = initialStreams * Math.pow(1.3, streamGrowthDuration - 1);
            withoutMarketingStreams = peakStreams * baseDecay * reputationBonus * accessBonus * ongoingFactor;
          }
        } else {
          const standardDecayRate = streamingConfig?.weekly_decay_rate || 0.85;
          const baseDecay = Math.pow(standardDecayRate, weeksSinceRelease);
          withoutMarketingStreams = initialStreams * baseDecay * reputationBonus * accessBonus * ongoingFactor;
        }

        const withoutMarketing = Math.round(withoutMarketingStreams);

        results.push({
          week,
          withMarketing,
          withoutMarketing,
          marketingBoost,
          weeksSinceRelease,
          awareness: Math.round(currentAwareness),
          awarenessGain,
          awarenessDecay,
          awarenessModifier,
          breakthroughPotential
        });
      }

      res.json({
        success: true,
        results,
        initialStreams,
        parameters: {
          songQuality,
          artistPopularity,
          playlistAccess,
          reputation,
          marketingBudget,
          totalMarketingBudget: Object.values(marketingBudget).reduce((a: number, b: unknown) => a + (typeof b === 'number' ? b : 0), 0)
        }
      });

    } catch (error: any) {
      console.error('[STREAMING TEST] Error:', error);
      res.status(500).json({
        error: 'STREAMING_TEST_FAILED',
        message: error.message || 'Failed to calculate streaming progression'
      });
    }
  });

export default router;
