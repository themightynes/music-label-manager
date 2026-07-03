/**
 * AROfficeProcessor — weekly A&R Office sourcing completion.
 *
 * First extraction of the Phase 2 engine-seams plan (§2 row 1). The body below
 * is a VERBATIM move of `GameEngine.processAROfficeWeekly`: every log line,
 * branch, and the passive-mode `getRandom` draw are preserved, with only
 * `this.` rebound to the injected `WeekContext` (`this.gameState` → `ctx.gameState`,
 * `this.gameData` → `ctx.gameData`, `this.storage` → `ctx.storage`,
 * `this.getRandom` → `ctx.getRandom`). The `selectBestArtist` helper is a local
 * closure inside the method (it was in the original), so it moves inline.
 *
 * The processor is stateless — construct it once and call, or reuse a shared
 * instance; all state flows through the `WeekContext`. See ./types.ts for the
 * RNG-order invariant this move preserves.
 */
import type { WeekContext } from './types';

export class AROfficeProcessor {
  async processAROfficeWeekly(ctx: WeekContext): Promise<void> {
    const { gameState, summary } = ctx;
    try {
      const slotUsed = (gameState as any).arOfficeSlotUsed;
      const sourcingType = (gameState as any).arOfficeSourcingType;
      const primaryGenre = (gameState as any).arOfficePrimaryGenre;
      const secondaryGenre = (gameState as any).arOfficeSecondaryGenre;
      console.log('[A&R DEBUG] Processing A&R operation:', {
        slotUsed,
        sourcingType,
        primaryGenre,
        secondaryGenre,
        gameId: gameState.id,
        currentWeek: gameState.currentWeek
      });

      if (slotUsed) {
        // Complete the one-week operation: free the slot, clear start time and genre parameters
        (gameState as any).arOfficeSlotUsed = false;
        (gameState as any).arOfficeOperationStart = null;
        (gameState as any).arOfficePrimaryGenre = null;
        (gameState as any).arOfficeSecondaryGenre = null;

        // Enhanced flags initialization and management
        let flags = (gameState.flags || {}) as any;
        if (!flags || typeof flags !== 'object') {
          console.log('[A&R DEBUG] Initializing flags object');
          flags = {};
          gameState.flags = flags;
        }

        // Carry the discovered artist across the inner try/catch scope. The legacy
        // singular flags (ar_office_discovered_artist_id / _info) are no longer
        // written (Phase 2 PR-12): the ar_office_discovered_artists array is the
        // canonical write. These locals reproduce the exact summary/description
        // values the old legacy-flag reads produced.
        let discoveredArtistId: string | null = null;
        let discoveredArtistName: string | undefined;

        // Clear start-week flag used by server validation
        if ('ar_office_start_week' in flags) {
          delete flags.ar_office_start_week;
        }

        // Add discovery timestamp for tracking (sim-time week for save-restore reproducibility — Phase 2 PR-1 / D2)
        flags.ar_office_discovery_time = gameState.currentWeek;
        flags.ar_office_sourcing_type = sourcingType;

        // Enhanced artist selection with better validation and error handling
        try {
          const allArtists = await ctx.gameData.getAllArtists();
          console.log('[A&R DEBUG] All artists loaded:', allArtists?.length, 'artists');

          if (!allArtists || allArtists.length === 0) {
            console.error('[A&R DEBUG] No artists available in game data');
            flags.ar_office_error = 'No artists available in game data';
          } else {
            let unsigned = [...allArtists];

            // Enhanced signed and discovered artist filtering
            try {
              if (ctx.storage?.getArtistsByGame) {
                const signed = await ctx.storage.getArtistsByGame(gameState.id);
                console.log('[A&R DEBUG] Signed artists:', signed?.length, 'signed');

                // BUGFIX: Match by name (case-insensitive) instead of ID
                // JSON artist IDs (e.g., "art_4") don't match database UUIDs
                const signedNames = new Set(
                  (signed || []).map((a: any) => String(a.name || '').toLowerCase())
                );

                // Also exclude already discovered artists from selection
                const discoveredNames = new Set();
                if (flags.ar_office_discovered_artists && Array.isArray(flags.ar_office_discovered_artists)) {
                  flags.ar_office_discovered_artists.forEach((discovered: any) => {
                    if (discovered.name) {
                      discoveredNames.add(String(discovered.name).toLowerCase());
                    }
                  });
                }
                console.log('[A&R DEBUG] Already discovered artists:', discoveredNames.size, 'discovered');

                // Filter out both signed and already discovered artists by name
                unsigned = allArtists.filter((a: any) => {
                  const artistName = String(a.name || '').toLowerCase();
                  return !signedNames.has(artistName) && !discoveredNames.has(artistName);
                });
                console.log('[A&R DEBUG] Available artists (unsigned + undiscovered):', unsigned?.length, 'available');
              }
            } catch (storageErr) {
              console.warn('[A&R DEBUG] Failed to filter signed/discovered artists, using all artists:', storageErr);
              // Continue with all artists if filtering fails
            }

            let picked: any | null = null;
            let genreUsed: string | null = null;
            const selectBestArtist = (artists: typeof unsigned) => {
              let bestArtist: (typeof unsigned)[number] | undefined;
              let bestScore = Number.NEGATIVE_INFINITY;

              for (const artist of artists) {
                if (!artist) {
                  continue;
                }

                const talent = artist.talent ?? 0;
                const popularity = artist.popularity ?? 0;
                const score = talent + popularity;

                if (score > bestScore) {
                  bestArtist = artist;
                  bestScore = score;
                }
              }

              return bestArtist;
            };

            if (unsigned.length > 0) {
              // SPECIALIZED mode: Apply genre filtering with fallback logic
              if (sourcingType === 'specialized') {
                let pool = [...unsigned];

                // Try primary genre first
                if (primaryGenre) {
                  const primaryMatches = pool.filter(a => a.genre === primaryGenre);
                  if (primaryMatches.length > 0) {
                    pool = primaryMatches;
                    genreUsed = primaryGenre;
                    console.log(`[A&R DEBUG] Found ${primaryMatches.length} artists matching primary genre: ${primaryGenre}`);
                  } else {
                    console.log(`[A&R DEBUG] No artists found for primary genre: ${primaryGenre}, trying secondary...`);
                    // Try secondary genre
                    if (secondaryGenre) {
                      const secondaryMatches = pool.filter(a => a.genre === secondaryGenre);
                      if (secondaryMatches.length > 0) {
                        pool = secondaryMatches;
                        genreUsed = secondaryGenre;
                        console.log(`[A&R DEBUG] Found ${secondaryMatches.length} artists matching secondary genre: ${secondaryGenre}`);
                      } else {
                        console.log(`[A&R DEBUG] No artists found for secondary genre: ${secondaryGenre}, using all available`);
                        genreUsed = 'any';
                      }
                    } else {
                      console.log(`[A&R DEBUG] No secondary genre specified, using all available`);
                      genreUsed = 'any';
                    }
                  }
                }

                // Pick best artist from filtered pool
                picked = selectBestArtist(pool);

              } else if (sourcingType === 'active') {
                // ACTIVE mode: Pick best artist overall (no genre filtering)
                picked = selectBestArtist(unsigned);
              } else {
                // PASSIVE mode: Random selection
                const idx = Math.floor(ctx.getRandom(0, unsigned.length));
                picked = unsigned[idx];
              }

              // Validate the picked artist has required fields
              if (picked) {
                const requiredFields = ['id', 'name', 'archetype'];
                const missingFields = requiredFields.filter(field => !picked[field]);

                if (missingFields.length > 0) {
                  console.warn('[A&R DEBUG] Selected artist missing required fields:', missingFields, 'Artist:', picked);
                  // Add fallback values
                  picked = {
                    ...picked,
                    name: picked.name || `Artist ${picked.id}`,
                    archetype: picked.archetype || 'Unknown',
                    talent: picked.talent || 50,
                    popularity: picked.popularity || 0
                  };
                }
              }
            }

            if (picked) {
              console.log('[A&R DEBUG] Selected artist:', picked.name, 'ID:', picked.id, 'Talent:', picked.talent, 'Popularity:', picked.popularity);

              // Initialize discovered artists array if it doesn't exist
              if (!flags.ar_office_discovered_artists) {
                flags.ar_office_discovered_artists = [];
              }

              // Add new discovered artist to the collection (no duplicate check needed since we pre-filtered)
              flags.ar_office_discovered_artists.push({
                id: picked.id,
                name: picked.name,
                archetype: picked.archetype,
                talent: picked.talent || 0,
                popularity: picked.popularity || 0,
                genre: picked.genre || null,
                discoveryTime: gameState.currentWeek, // sim-time week for save-restore reproducibility (Phase 2 PR-1 / D2)
                sourcingType: sourcingType,
                genreUsed: genreUsed || null // Track which genre filter was used
              });
              console.log('[A&R DEBUG] Added artist to discovered collection. Total discovered:', flags.ar_office_discovered_artists.length);
              if (genreUsed) {
                console.log('[A&R DEBUG] Genre filter result:', genreUsed);
              }

              // Track discovery for summary/description (replaces the retired legacy
              // ar_office_discovered_artist_id / _info flag reads — Phase 2 PR-12).
              discoveredArtistId = picked.id;
              discoveredArtistName = picked.name;

              // Populate week summary A&R section with discovered artist id
              // NOTE: This ID may differ from what /ar-office/artists returns if fallback logic is triggered
              summary.arOffice = {
                completed: true,
                sourcingType: sourcingType ?? null,
                discoveredArtistId: picked.id
              };
            } else {
              console.log('[A&R DEBUG] No artist selected - no unsigned artists available');
              flags.ar_office_error = 'No unsigned artists available';

              // Create synthetic "no artists available" flag for better client handling
              if (unsigned.length === 0) {
                flags.ar_office_no_artists_reason = 'all_signed';
              } else {
                flags.ar_office_no_artists_reason = 'unknown';
              }

              summary.arOffice = {
                completed: true,
                sourcingType: sourcingType ?? null,
                discoveredArtistId: null
              };
            }
          }

          // Ensure flags are properly set on gameState
          gameState.flags = flags;
          console.log('[A&R DEBUG] Final flags state:', JSON.stringify(flags, null, 2));

        } catch (selectErr) {
          console.error('[A&R] Failed to select/persist discovered artist:', selectErr);
          flags.ar_office_error = selectErr instanceof Error ? selectErr.message : 'Artist selection failed';
          gameState.flags = flags;
        }

        // Ensure WeekSummary A&R section is always properly populated
        if (!summary.arOffice) {
          summary.arOffice = {
            completed: true,
            sourcingType: sourcingType ?? null,
            discoveredArtistId: discoveredArtistId || null
          } as any;
        }

        // Add comprehensive change description
        let description;
        if (discoveredArtistName) {
          description = `A&R sourcing (${sourcingType || 'active'}) completed. Discovered ${discoveredArtistName}.`;
        } else if (flags.ar_office_error) {
          description = `A&R sourcing (${sourcingType || 'active'}) completed. ${flags.ar_office_error}`;
        } else {
          description = `A&R sourcing (${sourcingType || 'active'}) completed. Check discovered artists.`;
        }

        summary.changes.push({
          type: 'unlock',
          description,
          amount: 0
        });
      }
    } catch (e) {
      console.warn('[A&R] Failed to process weekly A&R completion:', e);
    }
  }
}
