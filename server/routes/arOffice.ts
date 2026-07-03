import { Router } from 'express';
import { storage } from '../storage';
import { serverGameData } from '../data/gameData';
import { requireClerkUser } from '../auth';
import { requireGameOwner } from '../middleware/requireGameOwner';

const router = Router();

  router.post('/api/game/:gameId/ar-office/start', requireClerkUser, requireGameOwner, async (req, res) => {
    try {
      const { gameId } = req.params;
      const { sourcingType, primaryGenre, secondaryGenre } = req.body || {};
      // Ownership + existence verified by requireGameOwner (404 GAME_NOT_FOUND
      // replaces the previous inline 'Game not found' 404).
      const gameState = req.gameState!;

      // Validate sourcingType
      const validSourcingTypes = ['active', 'passive', 'specialized'];
      if (!sourcingType || !validSourcingTypes.includes(sourcingType)) {
        return res.status(400).json({
          message: `Invalid sourcing type. Must be one of: ${validSourcingTypes.join(', ')}`,
          received: sourcingType,
          valid: validSourcingTypes
        });
      }

      const total = gameState.focusSlots || 3;
      const used = gameState.usedFocusSlots || 0;

      // Disallow starting if an operation is already active
      if (gameState.arOfficeSlotUsed) {
        return res.status(400).json({ message: 'A&R operation already in progress' });
      }

      // Validate available slot capacity
      if (used >= total) {
        return res.status(400).json({ message: 'No focus slots available', used, total });
      }

      const newUsed = Math.min(total, used + 1);

      // Track the start week in flags for completion validation
      const flags = (gameState.flags || {}) as any;
      flags.ar_office_start_week = gameState.currentWeek || 1;
      // NOTE: Keep previous discovered artists - new discoveries will be added to the pool

      const updated = await storage.updateGameState(gameId, {
        arOfficeSlotUsed: true,
        arOfficeSourcingType: sourcingType || 'active',
        arOfficePrimaryGenre: primaryGenre || null,
        arOfficeSecondaryGenre: secondaryGenre || null,
        arOfficeOperationStart: Date.now(),
        usedFocusSlots: newUsed,
        flags
      });

      console.log('[A&R] Started operation with genre filters:', { sourcingType, primaryGenre, secondaryGenre });

      return res.json({ success: true, status: {
        arOfficeSlotUsed: updated.arOfficeSlotUsed || false,
        arOfficeSourcingType: (updated as any).arOfficeSourcingType || null,
        arOfficePrimaryGenre: (updated as any).arOfficePrimaryGenre || null,
        arOfficeSecondaryGenre: (updated as any).arOfficeSecondaryGenre || null,
        arOfficeOperationStart: (updated as any).arOfficeOperationStart || null,
        usedFocusSlots: updated.usedFocusSlots || newUsed,
        focusSlots: updated.focusSlots || total
      }});
    } catch (error) {
      console.error('[A&R] Start operation error:', error);
      res.status(500).json({ message: 'Failed to start A&R operation' });
    }
  });


  // Cancel an A&R sourcing operation
  router.post('/api/game/:gameId/ar-office/cancel', requireClerkUser, requireGameOwner, async (req, res) => {
    try {
      const { gameId } = req.params;
      // Ownership + existence verified by requireGameOwner.
      const gameState = req.gameState!;

      const used = gameState.usedFocusSlots || 0;
      const newUsed = gameState.arOfficeSlotUsed ? Math.max(0, used - 1) : used;

      // Clear only operation-related flags on cancel (keep discovered artists)
      const flags = (gameState.flags || {}) as any;
      delete flags.ar_office_start_week;
      // NOTE: Keep ar_office_discovered_artists array - only clearing current operation state

      const updated = await storage.updateGameState(gameId, {
        arOfficeSlotUsed: false,
        arOfficeSourcingType: null,
        arOfficePrimaryGenre: null,
        arOfficeSecondaryGenre: null,
        usedFocusSlots: newUsed,
        flags
      });

      return res.json({ success: true, status: {
        arOfficeSlotUsed: updated.arOfficeSlotUsed || false,
        arOfficeSourcingType: (updated as any).arOfficeSourcingType || null,
        arOfficePrimaryGenre: null,
        arOfficeSecondaryGenre: null,
        usedFocusSlots: updated.usedFocusSlots || newUsed
      }});
    } catch (error) {
      console.error('[A&R] Cancel operation error:', error);
      res.status(500).json({ message: 'Failed to cancel A&R operation' });
    }
  });

  // Get current A&R status
  router.get('/api/game/:gameId/ar-office/status', requireClerkUser, requireGameOwner, async (req, res) => {
    try {
      // Ownership + existence verified by requireGameOwner.
      const gameState = req.gameState!;

      return res.json({
        arOfficeSlotUsed: gameState.arOfficeSlotUsed || false,
        arOfficeSourcingType: (gameState as any).arOfficeSourcingType || null,
        arOfficeOperationStart: (gameState as any).arOfficeOperationStart || null,
      });
    } catch (error) {
      console.error('[A&R] Status error:', error);
      res.status(500).json({ message: 'Failed to fetch A&R status' });
    }
  });

  // Get discovered artists for A&R (returns the persisted pick when operation is complete)
  router.get('/api/game/:gameId/ar-office/artists', requireClerkUser, requireGameOwner, async (req, res) => {
    try {
      const { gameId } = req.params;
      console.log('[A&R DEBUG] Backend: Getting discovered artists for game:', gameId);
      // Ownership + existence verified by requireGameOwner.
      const gameState = req.gameState!;

      // Initialize game data - if this fails, return empty list instead of 500 error
      try {
        await serverGameData.initialize();
      } catch (initError) {
        console.error('[A&R] Failed to initialize game data:', initError);
        return res.json({
          artists: [],
          metadata: {
            error: 'Failed to load game data',
            details: initError instanceof Error ? initError.message : String(initError)
          }
        });
      }

      console.log('[A&R DEBUG] Backend: A&R slot used:', gameState.arOfficeSlotUsed);
      console.log('[A&R DEBUG] Backend: A&R sourcing type:', (gameState as any).arOfficeSourcingType);

      // If operation is active, no artists yet
      if (gameState.arOfficeSlotUsed) {
        console.log('[A&R DEBUG] Backend: Operation active, returning empty list');
        return res.json({
          artists: [],
          metadata: {
            operationActive: true,
            sourcingType: (gameState as any).arOfficeSourcingType
          }
        });
      }

      // Enhanced flags reading and validation
      const flags = (gameState.flags || {}) as any;
      console.log('[A&R DEBUG] Backend: Full flags object:', JSON.stringify(flags, null, 2));

      // Check for new discovered artists array (preferred method)
      let discoveredArtistsArray = flags.ar_office_discovered_artists || [];
      const legacyArtistId = flags.ar_office_discovered_artist_id; // backwards compatibility
      const legacyArtistInfo = flags.ar_office_discovered_artist_info;

      console.log('[A&R DEBUG] Backend: Discovered artists array:', discoveredArtistsArray.length, 'artists');
      console.log('[A&R DEBUG] Backend: Legacy artist ID:', legacyArtistId);

      // Migrate legacy format to new array format if needed
      if (legacyArtistId && legacyArtistInfo && discoveredArtistsArray.length === 0) {
        console.log('[A&R DEBUG] Backend: Migrating legacy artist to array format');
        discoveredArtistsArray = [{
          id: legacyArtistId,
          name: legacyArtistInfo.name,
          archetype: legacyArtistInfo.archetype,
          talent: legacyArtistInfo.talent,
          popularity: legacyArtistInfo.popularity,
          genre: legacyArtistInfo.genre,
          discoveryTime: flags.ar_office_discovery_time,
          sourcingType: flags.ar_office_sourcing_type
        }];

        // Update flags with migrated data
        flags.ar_office_discovered_artists = discoveredArtistsArray;
        await storage.updateGameState(gameId, { flags });
        console.log('[A&R DEBUG] Backend: Migration complete, saved to database');
      }

      if (discoveredArtistsArray.length > 0) {
        // Return all discovered artists
        let allGameArtists;
        try {
          allGameArtists = await serverGameData.getAllArtists();
          console.log('[A&R DEBUG] Backend: Loaded', allGameArtists?.length, 'total game artists');
        } catch (artistLoadError) {
          console.error('[A&R] Failed to load game artists:', artistLoadError);
          // Return the discovered artist data we have in flags without enrichment
          return res.json({
            artists: discoveredArtistsArray.map((a: any) => ({
              ...a,
              isFallback: true,
              loadError: 'Could not enrich with full artist data'
            })),
            metadata: {
              totalDiscovered: discoveredArtistsArray.length,
              isDiscoveredCollection: true,
              enrichmentFailed: true,
              discoveryTime: flags.ar_office_discovery_time,
              sourcingType: flags.ar_office_sourcing_type
            }
          });
        }

        // Filter out artists already signed to this game by name
        const signedForGame = await storage.getArtistsByGame(gameId);
        const signedNames = new Set((signedForGame || []).map(a => String(a.name || '').toLowerCase()))
        const filteredDiscovered = discoveredArtistsArray.filter((a: any) => !signedNames.has(String(a?.name || '').toLowerCase()));

        const discoveredArtists = filteredDiscovered.map((discoveredArtist: any) => {
          // First try to find the full artist data
          const fullArtist = allGameArtists.find((a: any) => a.id === discoveredArtist.id);

          if (fullArtist) {
            // Return full artist data with discovery metadata
            return {
              ...fullArtist,
              discoveryTime: discoveredArtist.discoveryTime,
              discoveredVia: discoveredArtist.sourcingType
            };
          } else {
            // Fallback to stored artist info if full data not found
            return {
              id: discoveredArtist.id,
              name: discoveredArtist.name || 'Unknown Artist',
              archetype: discoveredArtist.archetype || 'Unknown',
              talent: discoveredArtist.talent || 0,
              popularity: discoveredArtist.popularity || 0,
              genre: discoveredArtist.genre || null,
              discoveryTime: discoveredArtist.discoveryTime,
              discoveredVia: discoveredArtist.sourcingType,
              isFallback: true
            };
          }
        });

        console.log('[A&R DEBUG] Backend: Returning', discoveredArtists.length, 'discovered artists');

        return res.json({
          artists: discoveredArtists,
          metadata: {
            totalDiscovered: discoveredArtists.length,
            isDiscoveredCollection: true,
            discoveryTime: flags.ar_office_discovery_time,
            sourcingType: flags.ar_office_sourcing_type
          }
        });
      } else if (legacyArtistId) {
        // Backwards compatibility: handle single legacy artist
        let allArtists;
        try {
          allArtists = await serverGameData.getAllArtists();
          console.log('[A&R DEBUG] Backend: Loaded', allArtists?.length, 'total artists for legacy mode');
        } catch (artistLoadError) {
          console.error('[A&R] Failed to load game artists for legacy mode:', artistLoadError);
          // Return fallback artist info if we can't load full data
          if (legacyArtistInfo) {
            return res.json({
              artists: [{
                id: legacyArtistId,
                name: legacyArtistInfo.name || 'Unknown Artist',
                archetype: legacyArtistInfo.archetype || 'Unknown',
                talent: legacyArtistInfo.talent || 50,
                popularity: legacyArtistInfo.popularity || 0,
                genre: legacyArtistInfo.genre || null,
                isFallback: true,
                loadError: 'Could not load full artist data'
              }],
              metadata: {
                isLegacyFallback: true,
                enrichmentFailed: true,
                discoveryTime: flags.ar_office_discovery_time,
                sourcingType: flags.ar_office_sourcing_type
              }
            });
          }
          // If no legacy info available, return empty
          return res.json({
            artists: [],
            metadata: {
              error: 'Could not load artist data',
              enrichmentFailed: true
            }
          });
        }

        const artist = (allArtists || []).find((a: any) => a.id === legacyArtistId);
        console.log('[A&R DEBUG] Backend: Found legacy artist for ID:', artist?.name || 'none');

        if (artist) {
          // Validate artist has all required fields
          const requiredFields = ['id', 'name', 'archetype', 'talent', 'popularity'];
          const missingFields = requiredFields.filter(field => (artist as any)[field] === undefined || (artist as any)[field] === null);

          if (missingFields.length > 0) {
            console.warn('[A&R DEBUG] Backend: Artist missing required fields:', missingFields);
            // Add fallback values for missing fields
            const enrichedArtist = {
              ...artist,
              talent: artist.talent ?? 50,
              popularity: artist.popularity ?? 0,
              archetype: artist.archetype ?? 'Unknown'
            };
            return res.json({
              artists: [enrichedArtist],
              metadata: {
                missingFields,
                enriched: true,
                discoveryTime: flags.ar_office_discovery_time
              }
            });
          }

          return res.json({
            artists: [artist],
            metadata: {
              discoveryTime: flags.ar_office_discovery_time,
              sourcingType: flags.ar_office_sourcing_type,
              isOriginalDiscovery: true,
              discoveredArtistId: legacyArtistId
            }
          });
        } else {
          // Artist ID not found in current data - fallback mechanism
          console.warn('[A&R DEBUG] Backend: Artist ID not found in current data, generating fallback');

          // Select a new random artist as fallback
          const unsignedArtists = (allArtists || []).filter((a: any) => !a.signed);
          if (unsignedArtists.length > 0) {
            const fallbackArtist = unsignedArtists[Math.floor(Math.random() * unsignedArtists.length)];

            // Update flags with new artist ID
            const updatedFlags = { ...flags, ar_office_discovered_artist_id: fallbackArtist.id };
            await storage.updateGameState(gameId, { flags: updatedFlags });

            console.log('[A&R DEBUG] Backend: Updated flags with fallback artist:', fallbackArtist.id);

            return res.json({
              artists: [fallbackArtist],
              metadata: {
                isFallback: true,
                isOriginalDiscovery: false,
                originalDiscoveredArtistId: legacyArtistId,
                discoveredArtistId: fallbackArtist.id,
                fallbackReason: 'Original artist not found in current data',
                discoveryTime: flags.ar_office_discovery_time,
                sourcingType: flags.ar_office_sourcing_type,
                warning: 'The artist shown differs from the one in the weekly summary due to data changes'
              }
            });
          }

          console.warn('[A&R DEBUG] Backend: No unsigned artists available for fallback');
          return res.json({
            artists: [],
            metadata: {
              error: 'Artist not found and no fallback available',
              isOriginalDiscovery: false,
              originalDiscoveredArtistId: legacyArtistId,
              discoveredArtistId: null,
              fallbackReason: 'Original artist not found and no unsigned artists available',
              warning: 'No artist available - the weekly summary may show a different result'
            }
          });
        }
      }

      // No persisted result yet (operation not completed properly) - return empty list
      console.log('[A&R DEBUG] Backend: No persisted artist, returning empty list');
      return res.json({
        artists: [],
        metadata: {
          noPersistedResult: true,
          hasFlags: Object.keys(flags).length > 0
        }
      });
    } catch (error) {
      console.error('[A&R] Get discovered artists error:', error);

      // Enhanced error response with details
      const errorDetails = {
        message: 'Failed to fetch discovered artists',
        type: error instanceof Error ? error.constructor.name : 'Unknown',
        details: error instanceof Error ? error.message : String(error)
      };

      res.status(500).json(errorDetails);
    }
  });
export default router;
