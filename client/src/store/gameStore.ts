import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role, WeeklyAction, MusicLabel, GameSaveSnapshot } from '@shared/schema';
import type { GameState, LabelData, SourcingTypeString } from '@shared/types/gameTypes';
// Game engine moved to shared - client no longer calculates outcomes
import { apiRequest, queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { fetchSnapshotCollections, fetchEmailSnapshot } from '@/utils/emailSnapshot';
import { buildGameSnapshot } from '@/utils/buildGameSnapshot';
import { formatAutosaveName } from '@shared/utils/saveName';
import { EMAIL_LIST_SCOPE, EMAIL_UNREAD_SCOPE } from '@/hooks/useEmails';
import { executivesQueryKey } from '@/hooks/useExecutives';
import { CHART_TOP10_SCOPE, CHART_TOP100_SCOPE } from '@/hooks/useCharts';
import { releasesQueryKey, releaseSongsQueryKey } from '@/hooks/useReleases';
import { songsQueryKey } from '@/hooks/useSongs';
import { projectsQueryKey } from '@/hooks/useProjects';
import { artistsQueryKey } from '@/hooks/useArtists';
import {
  discoveredArtistsQueryKey,
  fetchDiscoveredArtists,
} from '@/hooks/useDiscoveredArtists';
import { gameStateQueryKey } from '@/hooks/useGameState';

// Internal helper: the shared 6-endpoint + email-snapshot parallel reload used
// identically by loadGame / loadGameFromSave / advanceWeek. Fans out the same
// seven GETs, parses the six JSON bodies, and returns the raw bundle. Callers
// keep their OWN gameState-sync + set(...) logic — only the common fetch+parse
// moved here (Phase 3 PR-4). Ordering and .json() semantics are preserved
// byte-identical to the previous inline copies.
interface GameBundle {
  gameData: any;
  songs: any;
  releases: any;
  releaseSongs: any;
  executives: any;
  moodEvents: any;
  emails: any[];
}

async function fetchGameBundle(gameId: string): Promise<GameBundle> {
  const [
    gameResponse,
    songsResponse,
    releasesResponse,
    releaseSongsResponse,
    executivesResponse,
    moodEventsResponse,
    emailSnapshot
  ] = await Promise.all([
    apiRequest('GET', `/api/game/${gameId}`),
    apiRequest('GET', `/api/game/${gameId}/songs`),
    apiRequest('GET', `/api/game/${gameId}/releases`),
    apiRequest('GET', `/api/game/${gameId}/release-songs`),
    apiRequest('GET', `/api/game/${gameId}/executives`),
    apiRequest('GET', `/api/game/${gameId}/mood-events`),
    fetchEmailSnapshot(gameId)
  ]);

  const gameData = await gameResponse.json();
  const songs = await songsResponse.json();
  const releases = await releasesResponse.json();
  const emails = emailSnapshot.emails;
  const releaseSongs = await releaseSongsResponse.json();
  const executives = await executivesResponse.json();
  const moodEvents = await moodEventsResponse.json();

  // Phase 3 PR-6: songs / releases / releaseSongs are owned by the TanStack
  // Query cache now, not Zustand. The fan-out already fetched them, so SEED the
  // query cache here with the fresh bodies (`setQueryData`) instead of firing a
  // second request from useSongs/useReleases/useReleaseSongs — zero extra GETs.
  // Callers no longer write these three arrays into the store.
  seedReleaseAndSongCache(gameId, { songs, releases, releaseSongs });

  // Phase 3 PR-7: projects are owned by the TanStack Query cache too. There is
  // no dedicated projects endpoint — they arrive inside the base game payload
  // (`gameData.projects`), so seed from there (zero extra GETs). useProjects
  // reads this key; callers no longer write `projects` into the store.
  seedProjectsCache(gameId, gameData?.projects);

  // Phase 3 PR-9: the artists roster is cache-owned too. Like projects, there is
  // no dedicated artists endpoint — artists arrive inside the base game payload
  // (`gameData.artists`), so seed from there (zero extra GETs). useArtists reads
  // this key; callers no longer write `artists` into the store.
  seedArtistsCache(gameId, gameData?.artists);

  return { gameData, songs, releases, releaseSongs, executives, moodEvents, emails };
}

// Phase 3 PR-6: seed the release/song query caches from an already-fetched
// bundle so the hooks (useSongs/useReleases/useReleaseSongs) read fresh data
// with no extra round-trip. Arrays are coerced to [] to match the hooks'
// queryFn contract (they always resolve an array).
function seedReleaseAndSongCache(
  gameId: string,
  data: { songs: unknown; releases: unknown; releaseSongs: unknown },
) {
  queryClient.setQueryData(
    songsQueryKey(gameId),
    Array.isArray(data.songs) ? data.songs : [],
  );
  queryClient.setQueryData(
    releasesQueryKey(gameId),
    Array.isArray(data.releases) ? data.releases : [],
  );
  queryClient.setQueryData(
    releaseSongsQueryKey(gameId),
    Array.isArray(data.releaseSongs) ? data.releaseSongs : [],
  );
}

// Phase 3 PR-7: seed the projects query cache from an already-fetched game
// payload so useProjects reads fresh data with no extra round-trip. Coerced to
// [] to match the hook's queryFn contract (it always resolves an array).
function seedProjectsCache(gameId: string, projects: unknown) {
  queryClient.setQueryData(
    projectsQueryKey(gameId),
    Array.isArray(projects) ? projects : [],
  );
}

// Phase 3 PR-9: seed the artists query cache from an already-fetched game
// payload (or a save snapshot) so useArtists reads fresh data with no extra
// round-trip. Coerced to [] to match the hook's queryFn contract (it always
// resolves an array).
function seedArtistsCache(gameId: string, artists: unknown) {
  queryClient.setQueryData(
    artistsQueryKey(gameId),
    Array.isArray(artists) ? artists : [],
  );
}

// Phase 3 PR-9: prime the discovered-artists query cache through the same
// fetch+synthesis code path useDiscoveredArtists uses. Replaces the former
// gameStore.loadDiscoveredArtists store write — the read path now lives entirely
// in the query cache (hooks/useDiscoveredArtists.ts). Best-effort: on failure it
// seeds [] (mirroring the old action's catch-and-empty for 404s) so a transient
// A&R read error never surfaces stale data. Errors are swallowed here because
// UI-driven retries (AROffice) invalidate the key and let the hook refetch.
async function primeDiscoveredArtistsCache(gameState: GameState | null) {
  if (!gameState?.id) return;
  const flags = (gameState as any)?.flags;
  try {
    const artists = await fetchDiscoveredArtists(gameState.id, flags);
    queryClient.setQueryData(discoveredArtistsQueryKey(gameState.id), artists);
  } catch (error) {
    console.error('[A&R] Failed to prime discovered artists cache:', error);
    queryClient.setQueryData(discoveredArtistsQueryKey(gameState.id), []);
  }
}

// Phase 3 PR-9: throwing variant used by advanceWeek's retry-with-backoff loop
// (which relies on a rejected promise to trigger the next attempt). Seeds the
// cache on success and RE-THROWS on failure so the retry logic is preserved
// byte-for-byte from the former gameStore.loadDiscoveredArtists behavior —
// including its 404 short-circuit: a 404 is an immediately-accepted empty
// result (seed [], no throw, no retries), matching the old
// `if (status === 404) { set({ discoveredArtists: [] }); return; }` branch.
// Any other failure seeds [] and re-throws so the backoff loop retries.
async function refetchDiscoveredArtistsCache(gameState: GameState | null) {
  if (!gameState?.id) return;
  const flags = (gameState as any)?.flags;
  try {
    const artists = await fetchDiscoveredArtists(gameState.id, flags);
    queryClient.setQueryData(discoveredArtistsQueryKey(gameState.id), artists);
  } catch (error) {
    const status = (error as any)?.status;
    if (status === 404) {
      console.warn('[A&R] No discovered artists found (404) - treating as empty result');
      queryClient.setQueryData(discoveredArtistsQueryKey(gameState.id), []);
      return;
    }
    queryClient.setQueryData(discoveredArtistsQueryKey(gameState.id), []);
    throw error; // Re-throw to allow retry logic to handle it
  }
}

// Phase 3.5 PR-6: THE commit funnel for the gameState spine — cache is now the
// SINGLE owner of the record.
//
// Through PR-4/PR-5 this funnel dual-wrote Zustand (`set({ gameState: next })`)
// AND the TanStack Query cache. PR-6 retires the Zustand copy: the full spine
// record now lives ONLY in the query cache at `gameStateQueryKey(next.id)`. The
// funnel is still its ONLY writer, so the record is a CLIENT-COMMITTED RECORD
// (staleTime/gcTime Infinity, no background refetch — see hooks/useGameState.ts).
//
// Zustand retains a MINIMAL SESSION POINTER only: `gameState = { id }` (or null).
// That pointer is what `useGameId` / `useGameState`'s gameId bootstrap /
// `partialize` read (`state.gameState?.id`) — the on-disk localStorage shape
// `{ gameState: { id } | null, ... }` is therefore unchanged. The full record is
// never in Zustand again; internal store reads go through `readGameState(get)`.
//
// `previousGameId` handles the game-SWITCH writers (loadGame / loadGameFromSave /
// createNewGame): when the committed game's id differs from the game we were on,
// the stale prior key is removed so a switched-away game never lingers in cache.
// The new key is always seeded BEFORE any gameId flip is observable (the write
// is synchronous and precedes the return), satisfying the PR-4 ordering pin.
//
// The `set` parameter is the Zustand setter (the store closure's `set`, or a
// `set`-compatible shim over `useGameStore.setState` for helpers outside the
// closure like `adoptServerBalances`).
type ZustandSet = (partial: Partial<GameStore>) => void;

/** The minimal Zustand session pointer that survives PR-6 (id only). */
type GameStatePointer = Pick<GameState, 'id'>;

function commitGameState(
  set: ZustandSet,
  next: GameState,
  previousGameId?: string | null,
) {
  // (a) Zustand write — now the SESSION POINTER only (`{ id }`), not the record.
  // This keeps `useGameId` / persist / the useGameState bootstrap working off
  // `state.gameState?.id` with the exact same on-disk shape as before.
  set({ gameState: next.id ? ({ id: next.id } as GameStatePointer) : null });
  // (b) Cache — the SINGLE owner of the full record. Drop the stale key first on
  // a game switch so a switched-away game never lingers in the cache.
  // `removeQueries` is guarded for the mocked queryClient in the characterization
  // harness (which may stub only invalidate/set/getQueryData).
  if (
    previousGameId &&
    next.id &&
    previousGameId !== next.id &&
    typeof queryClient.removeQueries === 'function'
  ) {
    queryClient.removeQueries({ queryKey: gameStateQueryKey(previousGameId) });
  }
  if (next.id) {
    queryClient.setQueryData(gameStateQueryKey(next.id), next);
  }
}

// Phase 3.5 PR-6: read the full spine record from its single owner, the query
// cache. The current game id comes from the Zustand session pointer
// (`get().gameState?.id`) — the only spine field Zustand still holds. Returns
// null when there is no current game or the record has not been committed yet,
// matching the old `get().gameState` null semantics exactly.
function readGameState(get: () => GameStore): GameState | null {
  const gameId = get().gameState?.id;
  if (!gameId) return null;
  return queryClient.getQueryData<GameState>(gameStateQueryKey(gameId)) ?? null;
}

// Phase 3 PR-10: adopt the SERVER-CANONICAL money + creativeCapital after a
// mutation instead of doing optimistic client-side arithmetic on gameState.
// signArtist / createProject / planRelease all recompute cost server-side (Phase
// 1 hardening: artistService derives signingCost, projects.ts recomputes
// totalCost, releasePlanningService validates the marketing budget) and none of
// their mutation responses carry BOTH updated fields:
//   - POST .../artists           -> res.json(artist)   (no money at all)
//   - POST .../projects          -> res.json(project)  (no money/creativeCapital)
//   - POST .../releases/plan     -> payload.updatedGameState.money only (no cc)
// So the single correct source for both fields is one refetch of GET
// /api/game/:id, whose gameState carries money AND creativeCapital. We merge
// ONLY those two fields onto the current store gameState so the synced A&R
// fields / musicLabel / usedFocusSlots already in the store are preserved
// (cancelProject stays on its response-field path — result.newBalance — because
// its response DOES carry the authoritative balance and it never touches
// creativeCapital). Returns silently on failure so a transient GET error never
// throws out of the mutation (the mutation itself already succeeded on the
// server); the next full reload reconciles.
async function adoptServerBalances(get: () => GameStore, gameId: string) {
  try {
    const response = await apiRequest('GET', `/api/game/${gameId}`);
    const data = await response.json();
    const serverGameState = data?.gameState;
    if (!serverGameState) return;
    // Phase 3.5 PR-6: read the current record from the cache (its single owner),
    // not the Zustand pointer.
    const current = readGameState(get);
    if (!current) return;
    // Phase 3.5 PR-4: route the two-field merge through the dual-write funnel so
    // the cache mirror stays in lock-step. Same-game write (id unchanged), so no
    // previous-key removal. `useGameStore.setState` is the setter here.
    commitGameState((partial) => useGameStore.setState(partial), {
      ...current,
      money: serverGameState.money,
      creativeCapital: serverGameState.creativeCapital,
    });
  } catch (error) {
    console.error('[PR-10] Failed to adopt server balances:', error);
  }
}

// Internal helper to sync focus slots and A&R operation status to the server
async function syncSlotsPatch(
  gameId: string,
  payload: {
    usedFocusSlots: number;
    arOfficeSlotUsed: boolean;
    arOfficeSourcingType: SourcingTypeString | null;
  }
) {
  try {
    await apiRequest('PATCH', `/api/game/${gameId}`, payload);
  } catch (error) {
    console.error('Failed to sync focus slots:', error);
  }
}

interface GameStore {
  // Phase 3.5 PR-6: `gameState` is now a MINIMAL SESSION POINTER (`{ id }` or
  // null), NOT the full spine record. The record is cache-owned
  // (gameStateQueryKey) and read via useGameState() / readGameState(). Only the
  // id survives in Zustand — it's the bootstrap handle for the cache + persist.
  gameState: GameStatePointer | null;
  roles: Role[];
  weeklyActions: WeeklyAction[];
  // Phase 3 PR-6: songs / releases / releaseSongs are no longer owned by the
  // store — they live in the TanStack Query cache (hooks/useSongs.ts,
  // hooks/useReleases.ts). Consumers read them via useSongs/useReleases/
  // useReleaseSongs; the fan-out seeds the cache, mutations invalidate it.
  // Phase 3 PR-7: `projects` is likewise cache-owned (hooks/useProjects.ts).
  // Consumers read it via useProjects; the fan-out seeds the cache and the
  // createProject/updateProject/cancelProject mutations invalidate it.
  // Phase 3 PR-9: `artists` (roster) and `discoveredArtists` are cache-owned too
  // (hooks/useArtists.ts, hooks/useDiscoveredArtists.ts). Consumers read them via
  // useArtists / useDiscoveredArtists; the fan-out seeds the artists cache and
  // signArtist/updateArtist invalidate it.
  emails: any[]; // Email system support
  executives: any[];
  moodEvents: any[];

  // UI state
  selectedActions: string[];
  isAdvancingWeek: boolean;
  weeklyOutcome: any | null;
  campaignResults: any | null;
  
  // Actions
  loadGame: (gameId: string) => Promise<void>;
  loadGameFromSave: (saveId: string, snapshot: GameSaveSnapshot, mode?: 'overwrite' | 'fork') => Promise<string>;
  createNewGame: (campaignType: string, labelData?: LabelData) => Promise<GameState>;

  // Weekly actions
  selectAction: (actionId: string) => Promise<void>;
  removeAction: (actionId: string) => Promise<void>;
  reorderActions: (startIndex: number, endIndex: number) => void;
  clearActions: () => void;
  advanceWeek: () => Promise<void>;
  
  // A&R Office operations
  consumeAROfficeSlot: (sourcingType: SourcingTypeString) => Promise<void>;
  releaseAROfficeSlot: () => Promise<void>;
  getAROfficeStatus: () => {
    arOfficeSlotUsed: boolean;
    arOfficeSourcingType: SourcingTypeString | null;
    arOfficeOperationStart: number | null;
  };
  startAROfficeOperation: (sourcingType: SourcingTypeString, primaryGenre?: string, secondaryGenre?: string) => Promise<void>;
  cancelAROfficeOperation: () => Promise<void>;

  // Artist management
  signArtist: (artistData: any) => Promise<void>;
  updateArtist: (artistId: string, updates: any) => Promise<void>;
  
  // Project management
  createProject: (projectData: any) => Promise<void>;
  updateProject: (projectId: string, updates: any) => Promise<void>;
  cancelProject: (projectId: string, cancellationData: { refundAmount: number }) => Promise<void>;
  
  // Release management
  planRelease: (releaseData: any) => Promise<void>;
  
  // Save management
  saveGame: (name: string, options?: { isAutosave?: boolean }) => Promise<void>;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state
      gameState: null,
      roles: [],
      weeklyActions: [],
      emails: [],
      executives: [],
      moodEvents: [],
      selectedActions: [],
      isAdvancingWeek: false,
      weeklyOutcome: null,
      campaignResults: null,

      // Load existing game
      loadGame: async (gameId: string) => {
        const previousGameId = get().gameState?.id ?? null;
        try {
          const {
            gameData: data,
            songs,
            releases,
            executives,
            moodEvents,
            emails: emailList,
          } = await fetchGameBundle(gameId);

          console.log('GameStore loadGame debug:', {
            gameId,
            gameData: !!data,
            songsCount: songs?.length || 0,
            releasesCount: releases?.length || 0,
            emailsCount: emailList?.length || 0,
            releases
          });
          
          // Preserve A&R status and sync usedFocusSlots with selectedActions + A&R usage
          const arOfficeSlotUsed = !!(data.gameState?.arOfficeSlotUsed);
          const arOfficeSourcingType = (data.gameState?.arOfficeSourcingType ?? null);
          const syncedGameState = {
            ...data.gameState,
            arOfficeSlotUsed,
            arOfficeSourcingType,
            // selectedActions will be set to [], so usedFocusSlots reflects only A&R usage here
            usedFocusSlots: (arOfficeSlotUsed ? 1 : 0)
          };
          
          // Include musicLabel in the gameState object
          const gameStateWithLabel = {
            ...syncedGameState,
            musicLabel: data.musicLabel || null
          };

          // Phase 3 PR-6/PR-7/PR-9: songs / releases / releaseSongs / projects /
          // artists are seeded into the TanStack Query cache by fetchGameBundle —
          // no longer written here.
          // Phase 3.5 PR-4: gameState flows through the dual-write funnel (Zustand
          // + cache); the remaining store fields keep their plain `set`. Game
          // switch → the funnel removes the previous game's stale record key.
          commitGameState(set, gameStateWithLabel, previousGameId);
          set({
            roles: data.roles,
            weeklyActions: data.weeklyActions,
            emails: emailList,
            executives: Array.isArray(executives) ? executives : [],
            moodEvents: Array.isArray(moodEvents) ? moodEvents : [],
            selectedActions: []
          });

          // Phase 3 PR-9: discovered artists are cache-owned (useDiscoveredArtists).
          // After loading game, prime the discovered-artists cache if no active
          // operation, so consumers see them without a separate store load.
          if (!arOfficeSlotUsed) {
            await primeDiscoveredArtistsCache(gameStateWithLabel);
          }
        } catch (error) {
          console.error('Failed to load game:', error);
          throw error;
        }
      },

      // Load game from save
      loadGameFromSave: async (saveId: string, snapshot: GameSaveSnapshot, mode: 'overwrite' | 'fork' = 'overwrite') => {
        const previousGameId = get().gameState?.id ?? null;
        try {
          if (!snapshot?.gameState?.id) {
            throw new Error('Invalid save data format');
          }

          const baseGameState = snapshot.gameState;
          const arOfficeSlotUsed = !!baseGameState.arOfficeSlotUsed;
          const arOfficeSourcingType = (baseGameState.arOfficeSourcingType ?? null) as SourcingTypeString | null;
          const interimGameState: GameState = {
            ...baseGameState,
            arOfficeSlotUsed,
            arOfficeSourcingType,
            usedFocusSlots: baseGameState.usedFocusSlots ?? (arOfficeSlotUsed ? 1 : 0),
            focusSlots: baseGameState.focusSlots ?? 0,
            playlistAccess: baseGameState.playlistAccess ?? 'none',
            pressAccess: baseGameState.pressAccess ?? 'none',
            venueAccess: baseGameState.venueAccess ?? 'none',
            campaignType: baseGameState.campaignType ?? 'Balanced',
            campaignCompleted: baseGameState.campaignCompleted ?? false,
            flags: baseGameState.flags ?? {},
            weeklyStats: baseGameState.weeklyStats ?? {},
            tierUnlockHistory: baseGameState.tierUnlockHistory ?? {},
            arOfficePrimaryGenre: baseGameState.arOfficePrimaryGenre ?? null,
            arOfficeSecondaryGenre: baseGameState.arOfficeSecondaryGenre ?? null,
            arOfficeOperationStart: baseGameState.arOfficeOperationStart ?? null,
            rngSeed: baseGameState.rngSeed ?? null,
            userId: (baseGameState.userId ?? null) as string | null,
            createdAt: null,
            updatedAt: null,
          };

          // Phase 3 PR-6: seed the release/song query cache from the snapshot so
          // the restored data shows immediately, then drop those arrays from the
          // store set(). The post-restore fetchGameBundle below re-seeds with the
          // server's authoritative copy.
          seedReleaseAndSongCache(baseGameState.id, {
            songs: snapshot.songs || [],
            releases: snapshot.releases || [],
            releaseSongs: snapshot.releaseSongs || [],
          });
          // Phase 3 PR-7: seed the projects cache from the snapshot so restored
          // projects show immediately; the post-restore fetchGameBundle below
          // re-seeds with the server's authoritative copy.
          seedProjectsCache(baseGameState.id, snapshot.projects || []);
          // Phase 3 PR-9: seed the artists cache from the snapshot so the restored
          // roster shows immediately; the post-restore fetchGameBundle re-seeds
          // with the server's authoritative copy.
          seedArtistsCache(baseGameState.id, snapshot.artists || []);

          // Phase 3.5 PR-4: commit the interim gameState through the funnel
          // (Zustand + cache). Game switch from `previousGameId` → its stale
          // record key is removed; the new interim key is seeded here BEFORE any
          // downstream gameId flip is observable.
          commitGameState(set, interimGameState, previousGameId);
          set({
            roles: (snapshot.roles || []) as unknown as Role[],
            emails: snapshot.emails || [],
            executives: snapshot.executives || [],
            moodEvents: snapshot.moodEvents || [],
            weeklyActions: (snapshot.weeklyActions || []) as unknown as WeeklyAction[],
            selectedActions: [],
            campaignResults: null,
            weeklyOutcome: snapshot.weeklyOutcome ?? null,
          });

          if (mode !== 'fork') {
            localStorage.setItem('currentGameId', baseGameState.id);
          }

          const restoreResponse = await apiRequest('POST', `/api/saves/${saveId}/restore`, { mode });
          const restoreResult = await restoreResponse.json();
          const restoredGameId = restoreResult.gameId || baseGameState.id;

          localStorage.setItem('currentGameId', restoredGameId);

          const {
            gameData,
            executives: executivesData,
            moodEvents: moodEventsData,
            emails: emailList,
          } = await fetchGameBundle(restoredGameId);

          const syncedGameState = {
            ...gameData.gameState,
            musicLabel: gameData.musicLabel || null,
            arOfficeSlotUsed: !!gameData.gameState?.arOfficeSlotUsed,
            arOfficeSourcingType: gameData.gameState?.arOfficeSourcingType ?? null,
          };

          // Phase 3 PR-6/PR-7/PR-9: songs / releases / releaseSongs / projects /
          // artists seeded into the query cache by fetchGameBundle above — no
          // longer written into the store.
          // Phase 3.5 PR-4: commit the post-restore gameState through the funnel.
          // On a FORK the restored id differs from the interim id — pass the
          // interim id as `previousGameId` so the interim key is cleared.
          commitGameState(set, syncedGameState, interimGameState.id);
          set({
            roles: gameData.roles || [],
            weeklyActions: gameData.weeklyActions || [],
            emails: emailList || [],
            executives: Array.isArray(executivesData) ? executivesData : [],
            moodEvents: Array.isArray(moodEventsData) ? moodEventsData : [],
            selectedActions: [],
            campaignResults: null,
            weeklyOutcome: snapshot.weeklyOutcome ?? null,
          });

          if (!syncedGameState.arOfficeSlotUsed) {
            await primeDiscoveredArtistsCache(syncedGameState);
          }

          // Invalidate email cache so the inbox reflects the restored save immediately
          // instead of showing stale pre-restore emails until a full page reload (C49).
          await queryClient.invalidateQueries({
            predicate: (query) =>
              (query.queryKey[0] === EMAIL_LIST_SCOPE || query.queryKey[0] === EMAIL_UNREAD_SCOPE) &&
              query.queryKey[1] === restoredGameId,
          });

          return restoredGameId;
        } catch (error) {
          console.error('Failed to load game from save:', error);
          throw error;
        }
      },

      // Create new game
      // Implements FR-2: Automatic Cleanup on New Game Creation (PRD-0006)
      // Purpose: Prevent orphaned games by cleaning up unsaved games before creating new ones
      createNewGame: async (campaignType: string, labelData?: LabelData) => {
        try {
          // ============================================================================
          // ORPHANED GAME CLEANUP LOGIC (PRD-0006 FR-2)
          // ============================================================================
          // Before creating a new game, check if the current game session has any saves.
          // If no saves exist, delete the current game to prevent orphaned data accumulation.
          // This is the PRIMARY prevention mechanism for orphaned games.
          // ============================================================================

          // Phase 3.5 PR-6: orphan-cleanup reads id/currentWeek from the cache
          // record (single owner), not the Zustand pointer.
          const currentGame = readGameState(get);
          const previousGameId = currentGame?.id ?? null;
          if (currentGame?.id) {
            console.log(`[ORPHANED GAME CLEANUP] Checking if current game ${currentGame.id} (Week ${currentGame.currentWeek}) has saves...`);

            try {
              // Step 1: Fetch all save files for the current user
              // Note: We fetch ALL saves and filter client-side (server doesn't have gameId filter)
              const savesResponse = await apiRequest('GET', '/api/saves');
              const allSaves = await savesResponse.json();

              // Step 2: Filter saves to find those belonging to the current game
              // The GameSaveSummary type includes gameId field extracted from save snapshot
              const currentGameSaves = allSaves.filter((save: any) => save.gameId === currentGame.id);

              if (!currentGameSaves || currentGameSaves.length === 0) {
                // Step 3: No saves found - this game is orphaned!
                // Delete it via the DELETE /api/game/:gameId endpoint
                // CASCADE foreign keys will automatically delete all related records:
                // artists, songs, projects, releases, emails, executives, mood events, etc.
                console.log(`[ORPHANED GAME CLEANUP] No saves found for game ${currentGame.id}. Deleting unsaved game...`);

                try {
                  await apiRequest('DELETE', `/api/game/${currentGame.id}`);

                  // Step 4: Log deletion event for DevOps monitoring (FR-10)
                  console.log(`[ORPHANED GAME CLEANUP] ✅ Cleaned up unsaved game: ${currentGame.id} (Week ${currentGame.currentWeek})`);

                  // Step 5: Show neutral toast notification to user (FR-2 requirement)
                  // Note: Neutral tone - not an error, just housekeeping
                  toast({
                    title: "Previous unsaved game cleaned up",
                    description: "Your new game is starting fresh.",
                    duration: 3000,
                  });
                } catch (deleteError) {
                  // Deletion failure is non-critical - log warning but continue
                  // User can still create new game even if cleanup fails
                  console.warn(`[ORPHANED GAME CLEANUP] Failed to delete unsaved game ${currentGame.id}:`, deleteError);
                  // Continue with new game creation even if deletion fails
                }
              } else {
                // Game has saves - don't delete it! User might want to load it later
                console.log(`[ORPHANED GAME CLEANUP] Current game ${currentGame.id} has ${currentGameSaves.length} save(s). Keeping it.`);
              }
            } catch (savesError) {
              // Save check failure is non-critical - log warning but continue
              console.warn(`[ORPHANED GAME CLEANUP] Failed to check saves for game ${currentGame.id}:`, savesError);
              // Continue with new game creation even if save check fails
            }
          }

          // ============================================================================
          // END ORPHANED GAME CLEANUP - Proceed with normal new game creation flow
          // ============================================================================

          // FR-2: Proceed with new game creation (existing flow)
          const newGameData = {
            // userId will be set by the server from authentication
            currentWeek: 1,
            // money will be set by server from balance.json
            // reputation will be set by server from balance.json
            // reputation and creativeCapital will be set by server from balance.json
            reputation: 0,
            focusSlots: 3,
            usedFocusSlots: 0,
            playlistAccess: 'none',
            pressAccess: 'none',
            venueAccess: 'none',
            campaignType,
            rngSeed: Math.random().toString(36),
            flags: {},
            weeklyStats: {},
            campaignCompleted: false,
            ...(labelData && { labelData })
          };

          const response = await apiRequest('POST', '/api/game', newGameData);
          const gameState = await response.json();

          console.log('=== CREATE NEW GAME DEBUG ===');
          console.log('New game created:', gameState);
          console.log('Week should be 1, actual:', gameState.currentWeek);
          console.log('Game ID:', gameState.id);

          // Follow-up GET request to ensure we have complete data including musicLabel
          const completeGameResponse = await apiRequest('GET', `/api/game/${gameState.id}`);
          const completeGameData = await completeGameResponse.json();

          // CRITICAL: Clear all localStorage game data first
          localStorage.removeItem('music-label-manager-game');
          localStorage.setItem('currentGameId', gameState.id);
          console.log('Cleared localStorage and set new gameId');

          // Ensure new game starts with 0 used slots and include musicLabel
          const syncedGameState = {
            ...completeGameData.gameState,
            usedFocusSlots: 0,  // New game starts with no slots used
            musicLabel: completeGameData.musicLabel || null
          };

          // Phase 3 PR-6: seed the new game's release/song caches empty so the
          // hooks read [] rather than any stale prior-game data.
          seedReleaseAndSongCache(gameState.id, { songs: [], releases: [], releaseSongs: [] });
          // Phase 3 PR-7: seed the new game's projects cache empty too.
          seedProjectsCache(gameState.id, []);
          // Phase 3 PR-9: seed the new game's artists + discovered-artists caches
          // empty so the hooks read [] rather than any stale prior-game data.
          seedArtistsCache(gameState.id, []);
          queryClient.setQueryData(discoveredArtistsQueryKey(gameState.id), []);

          // Clear campaign results and set new state.
          // Phase 3.5 PR-4: commit the new game's gameState through the funnel.
          // The new id differs from `previousGameId` (or there was none) → the
          // funnel removes the old game's stale record key and seeds the new one.
          commitGameState(set, syncedGameState, previousGameId);
          set({
            roles: [],
            weeklyActions: [],
            emails: [],
            executives: [],
            moodEvents: [],
            selectedActions: [],
            campaignResults: null,
            weeklyOutcome: null
          });

          // Return the new game state so the UI can update
          return gameState;
        } catch (error) {
          console.error('Failed to create game:', error);
          throw error;
        }
      },

      // Weekly action selection
      selectAction: async (actionId: string) => {
        const { selectedActions } = get();
        // Phase 3.5 PR-6: read the record from the cache (single owner).
        const gameState = readGameState(get);

        if (
          gameState &&
          selectedActions.length < ((gameState.focusSlots || 0) - ((gameState.arOfficeSlotUsed) ? 1 : 0)) &&
          !selectedActions.includes(actionId)
        ) {
          const newSelectedActions = [...selectedActions, actionId];
          try {
            const parsed = JSON.parse(actionId);
            console.log('[GAME STORE] Queued action payload:', parsed);
          } catch (err) {
            console.warn('[GAME STORE] Failed to parse queued action payload', err);
          }
          const arUsed = gameState.arOfficeSlotUsed ? 1 : 0;
          const newUsedSlots = newSelectedActions.length + arUsed;
          
          // Update local state. Phase 3.5 PR-4: gameState → dual-write funnel
          // (same game, no key removal); selectedActions keeps its plain `set`.
          set({ selectedActions: newSelectedActions });
          commitGameState(set, { ...gameState, usedFocusSlots: newUsedSlots });

          await syncSlotsPatch(gameState.id, {
            usedFocusSlots: newUsedSlots,
            arOfficeSlotUsed: !!gameState.arOfficeSlotUsed,
            arOfficeSourcingType: gameState.arOfficeSourcingType ?? null,
          });
        }
      },

      removeAction: async (actionId: string) => {
        const { selectedActions } = get();
        const gameState = readGameState(get);
        if (selectedActions.includes(actionId) && gameState) {
          const newSelectedActions = selectedActions.filter(id => id !== actionId);
          const arUsed = gameState.arOfficeSlotUsed ? 1 : 0;
          const newUsedSlots = newSelectedActions.length + arUsed;
          
          // Update local state. Phase 3.5 PR-4: gameState → dual-write funnel
          // (same game, no key removal); selectedActions keeps its plain `set`.
          set({ selectedActions: newSelectedActions });
          commitGameState(set, { ...gameState, usedFocusSlots: newUsedSlots });

          // Sync focus slots and A&R status to server to prevent desync issues
          await syncSlotsPatch(gameState.id, {
            usedFocusSlots: newUsedSlots,
            arOfficeSlotUsed: !!gameState.arOfficeSlotUsed,
            arOfficeSourcingType: gameState.arOfficeSourcingType ?? null,
          });
        }
      },

      reorderActions: (startIndex: number, endIndex: number) => {
        const { selectedActions } = get();
        const result = Array.from(selectedActions);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        set({ selectedActions: result });
      },

      clearActions: () => {
        const gameState = readGameState(get);
        const arUsed = gameState?.arOfficeSlotUsed ? 1 : 0;
        // Phase 3.5 PR-4: selectedActions keeps its plain `set`; gameState (when
        // present) flows through the dual-write funnel. When gameState is null it
        // stays null (no funnel write) — same as the prior conditional.
        set({ selectedActions: [] });
        if (gameState) {
          commitGameState(set, { ...gameState, usedFocusSlots: arUsed });
        }
      },

      // Advance week
      advanceWeek: async () => {
        const { selectedActions } = get();
        const gameState = readGameState(get);
        // Allow advancing the week if either there are selected actions OR an A&R operation is consuming a slot
        if (!gameState || (selectedActions.length === 0 && !gameState.arOfficeSlotUsed)) return;

        set({ isAdvancingWeek: true });

        try {
          // Use the NEW API endpoint with campaign completion logic
          console.log('[DEBUG CLIENT] Selected actions:', selectedActions);

          const advanceRequest = {
            gameId: gameState.id,
            selectedActions: selectedActions.map(actionStr => {
              // Parse the JSON string to get our structured data
              let actionData: any;
              try {
                actionData = JSON.parse(actionStr);
                console.log(`[DEBUG CLIENT] Parsed action data:`, actionData);
              } catch (e) {
                // Fallback for old format (shouldn't happen with new code)
                console.log(`[DEBUG CLIENT] Failed to parse, using legacy format for: ${actionStr}`);
                return {
                  actionType: 'role_meeting' as const,
                  targetId: actionStr,
                  metadata: {}
                };
              }
              
              const { roleId, actionId, choiceId, executiveId } = actionData;

              // Build complete metadata, preserving any additional fields like selectedArtistId
              const metadata: Record<string, any> = {
                roleId,
                actionId,
                choiceId,
                ...(executiveId ? { executiveId } : {}),
                ...(actionData.metadata ?? {})
              };

              const result = {
                actionType: 'role_meeting' as const,
                targetId: actionId,  // Use the clean action ID
                metadata
              };
              
              console.log(`[DEBUG CLIENT] Final action object:`, result);
              
              return result;
            })
          };
          
          console.log('[DEBUG CLIENT] Complete advance request:', JSON.stringify(advanceRequest, null, 2));

          const response = await apiRequest('POST', '/api/advance-week', advanceRequest);
          const result = await response.json();
          
          // Log the debugging information from our server response
          console.log('=== ADVANCE WEEK DEBUG INFO ===');
          console.log('Server response result:', result);
          if (result.debugInfo) {
            console.log('Server debug info:', result.debugInfo);
            if (result.debugInfo.processingSteps) {
              console.log('Processing steps:', result.debugInfo.processingSteps);
            }
            if (result.debugInfo.projectStates) {
              console.log('Project states:', result.debugInfo.projectStates);
            }
            if (result.debugInfo.songStates) {
              console.log('Song states:', result.debugInfo.songStates);
            }
          }
          console.log('===============================');
          
          // Reload game data to get updated projects, songs, and releases after processing
          const {
            gameData,
            songs,
            releases,
            executives: executivesData,
            moodEvents: moodEventsData,
            emails: emailList,
          } = await fetchGameBundle(gameState.id);

          console.log('=== POST-ADVANCE WEEK STATE SYNC ===');
          console.log('Game data releases count:', (gameData.releases || []).length);
          console.log('Direct releases fetch count:', (releases || []).length);
          console.log('Release statuses:', releases.map((r: any) => ({ id: r.id, title: r.title, status: r.status })));
          console.log('=====================================');

          const serverGameState = (gameData.gameState ?? {}) as Partial<GameState>;
          const resultGameState = (result?.gameState ?? {}) as Partial<GameState>;
          const arOfficeSlotUsed = !!(resultGameState.arOfficeSlotUsed ?? serverGameState.arOfficeSlotUsed);
          const arOfficeSourcingType = (resultGameState.arOfficeSourcingType ?? serverGameState.arOfficeSourcingType) ?? null;

          const syncedGameState: GameState = {
            ...resultGameState,
            ...serverGameState,
            arOfficeSlotUsed,
            arOfficeSourcingType,
            usedFocusSlots: arOfficeSlotUsed ? 1 : 0,
            musicLabel: gameData.musicLabel || (resultGameState as any)?.musicLabel || null,
          } as GameState;

          // Phase 3 PR-6/PR-7/PR-9: songs / releases / releaseSongs / projects /
          // artists seeded into the query cache by fetchGameBundle — no longer
          // written into the store. The artists seed reflects post-week mood
          // changes (formerly `artists: gameData.artists`).
          // Phase 3.5 PR-4: gameState → dual-write funnel (same game, no key
          // removal); the session/UI fields keep their plain `set`.
          commitGameState(set, syncedGameState);
          set({
            emails: emailList || [],
            executives: Array.isArray(executivesData) ? executivesData : [],
            moodEvents: Array.isArray(moodEventsData) ? moodEventsData : [],
            weeklyOutcome: result.summary,
            campaignResults: result.campaignResults,
            selectedActions: [],
            isAdvancingWeek: false
          });

          try {
            const labelName = syncedGameState.musicLabel?.name;
            const autosaveName = labelName
              ? formatAutosaveName(labelName, syncedGameState.currentWeek)
              : `Autosave - Week ${syncedGameState.currentWeek}`;
            await get().saveGame(autosaveName, { isAutosave: true });
          } catch (autosaveError) {
            console.warn('[Autosave] Failed to create autosave:', autosaveError);
          }

          // Trigger tier unlock toasts based on weekly summary changes
          try {
            const { triggerUnlockToasts } = await import('@/utils/unlockToasts')
            if (result?.summary) {
              triggerUnlockToasts(result.summary, toast)
            }
          } catch (toastErr) {
            console.warn('[UNLOCK TOASTS] Skipped due to error:', toastErr)
          }

          // Always attempt to load discovered artists after week advancement if there was an active A&R operation
          const hadActiveAROperation = result?.summary?.arOffice?.completed;
          if (hadActiveAROperation) {
            console.log('[A&R] A&R operation completed, attempting to load discovered artists');

            // Enhanced retry logic with exponential backoff
            const loadWithRetry = async (attempt = 1): Promise<void> => {
              try {
                await refetchDiscoveredArtistsCache(readGameState(get));
                console.log(`[A&R] Successfully loaded discovered artists (attempt ${attempt})`);
              } catch (error) {
                console.error(`[A&R] Failed to load discovered artists (attempt ${attempt}):`, error);

                if (attempt < 3) {
                  const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
                  console.log(`[A&R] Retrying in ${delay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                  return loadWithRetry(attempt + 1);
                } else {
                  console.error('[A&R] All retry attempts failed, discovered artists may not be available');
                  throw error;
                }
              }
            };

            try {
              await loadWithRetry();
            } catch (finalError) {
              console.warn('[A&R] Failed to load discovered artists after all retries:', finalError);
              // Don't throw - this is not critical enough to fail the entire week advancement
            }
          }
          
          // Invalidate React Query caches to refresh UI components.
          // Real analytics keys are shaped [url, 'analytics:<scope>-roi', { gameId, ... }]
          // (see client/src/hooks/useAnalytics.ts) — the scope string lives at
          // queryKey[1], not queryKey[0], so match it there and scope to the
          // current game via the params object at queryKey[2].
          const ROI_ANALYTICS_SCOPES = new Set([
            'analytics:artist-roi',
            'analytics:project-roi',
            'analytics:portfolio-roi',
            'analytics:release-roi',
          ]);
          await queryClient.invalidateQueries({
            predicate: (query) =>
              typeof query.queryKey[1] === 'string' &&
              ROI_ANALYTICS_SCOPES.has(query.queryKey[1] as string) &&
              (query.queryKey[2] as { gameId?: string } | undefined)?.gameId === syncedGameState.id,
          });
          // Phase 3 PR-8: refetch executives so post-week mood/loyalty changes
          // show. useExecutives + the meeting machine share the ['executives',
          // gameId] cache; invalidating it here is the weekly-refresh hook.
          await queryClient.invalidateQueries({
            queryKey: executivesQueryKey(syncedGameState.id),
          });
          // Invalidate emails cache to refresh inbox with new week's emails
          await queryClient.invalidateQueries({
            predicate: (query) =>
              (query.queryKey[0] === EMAIL_LIST_SCOPE || query.queryKey[0] === EMAIL_UNREAD_SCOPE) &&
              query.queryKey[1] === syncedGameState.id,
          });
          // Invalidate chart caches so Top 10 / Top 100 reflect the new week
          await queryClient.invalidateQueries({
            predicate: (query) =>
              (query.queryKey[0] === CHART_TOP10_SCOPE || query.queryKey[0] === CHART_TOP100_SCOPE) &&
              query.queryKey[1] === syncedGameState.id,
          });
        } catch (error) {
          console.error('=== ADVANCE WEEK ERROR ===');
          console.error('Error occurred during week advancement');
          console.error('Error type:', typeof error);
          console.error('Error constructor:', error?.constructor?.name);
          console.error('Error instanceof Error:', error instanceof Error);
          console.error('Error message:', error instanceof Error ? error.message : 'No message');
          console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
          
          // Try to extract additional error details
          if (error && typeof error === 'object') {
            console.error('Error properties:', Object.getOwnPropertyNames(error));
            console.error('Error status:', (error as any).status);
            console.error('Error statusText:', (error as any).statusText);
            console.error('Error url:', (error as any).url);
            console.error('Error details:', (error as any).details);
          }
          
          // Create a more descriptive error for the UI
          let displayError;
          if (error instanceof Error) {
            // Extract meaningful error information
            const status = (error as any).status;
            const statusText = (error as any).statusText;
            const details = (error as any).details;
            
            if (status && statusText) {
              displayError = new Error(`HTTP ${status}: ${statusText}. ${error.message}`);
            } else if (details && details.message) {
              displayError = new Error(`Server Error: ${details.message}`);
            } else {
              displayError = new Error(`Advance Week Failed: ${error.message}`);
            }
          } else {
            displayError = new Error(`Advance Week Failed: ${JSON.stringify(error)}`);
          }
          
          console.error('Final display error:', displayError.message);
          console.error('========================');
          
          set({ isAdvancingWeek: false });
          throw displayError;
        }
      },

      // Artist management
      signArtist: async (artistData: any) => {
        const gameState = readGameState(get);
        if (!gameState) return;

        try {
          await apiRequest('POST', `/api/game/${gameState.id}/artists`, {
            ...artistData,
            signedWeek: gameState.currentWeek,
            signed: true
          });

          // Phase 3 PR-9: the roster is cache-owned now. Invalidate the artists
          // key so useArtists refetches the authoritative roster (which includes
          // the just-signed artist) instead of hand-appending to a store array.
          await queryClient.invalidateQueries({
            queryKey: artistsQueryKey(gameState.id),
          });

          // Phase 3 PR-10: adopt the server-canonical money instead of the old
          // optimistic `money -= signingCost` subtraction. The sign response is
          // just the created artist row (no money field) and the signing cost is
          // derived server-side (artistService), so the displayed balance must
          // come from a refetch of GET /api/game/:id — not client arithmetic.
          await adoptServerBalances(get, gameState.id);

          // Phase 3 PR-9: the discovered-artists list is cache-owned too. The
          // signed artist should drop out of it; the server's A&R read already
          // filters signed-by-name, so invalidating the discovered key refetches
          // the correct (reduced) list. Replaces the former removeDiscoveredArtist
          // splice by id/name.
          await queryClient.invalidateQueries({
            queryKey: discoveredArtistsQueryKey(gameState.id),
          });
        } catch (error) {
          console.error('Failed to sign artist:', error);
          throw error;
        }
      },

      updateArtist: async (artistId: string, updates: any) => {
        const gameState = readGameState(get);

        try {
          await apiRequest('PATCH', `/api/artists/${artistId}`, updates);

          // Phase 3 PR-9: invalidate the artists cache so useArtists refetches the
          // updated artist instead of mapping over a store-owned array.
          await queryClient.invalidateQueries({
            queryKey: artistsQueryKey(gameState?.id),
          });
        } catch (error) {
          console.error('Failed to update artist:', error);
          throw error;
        }
      },

      // Project management
      createProject: async (projectData: any) => {
        const gameState = readGameState(get);
        if (!gameState) return;

        try {
          const response = await apiRequest('POST', `/api/game/${gameState.id}/projects`, {
            ...projectData,
            startWeek: gameState.currentWeek,
            stage: 'planning'
          });
          await response.json();

          // Phase 3 PR-7: projects are cache-owned now. Invalidate the projects
          // key so useProjects refetches the authoritative list (which includes
          // the just-created project) instead of hand-splicing the store array.
          await queryClient.invalidateQueries({
            queryKey: projectsQueryKey(gameState.id),
          });

          // Phase 3 PR-10: adopt the server-canonical money + creativeCapital
          // instead of the old optimistic `money -= projectCost; cc -= 1` math.
          // The create response is just the created project row (no money/cc) and
          // the cost is recomputed server-side (projects.ts recomputes totalCost
          // from budgetPerSong), so the displayed balances must come from a
          // refetch of GET /api/game/:id — not client arithmetic.
          await adoptServerBalances(get, gameState.id);
        } catch (error) {
          console.error('Failed to create project:', error);
          throw error;
        }
      },

      updateProject: async (projectId: string, updates: any) => {
        const gameState = readGameState(get);

        try {
          const response = await apiRequest('PATCH', `/api/projects/${projectId}`, updates);
          await response.json();

          // Phase 3 PR-7: invalidate the projects cache so useProjects refetches
          // the updated project instead of mapping over a store-owned array.
          await queryClient.invalidateQueries({
            queryKey: projectsQueryKey(gameState?.id),
          });
        } catch (error) {
          console.error('Failed to update project:', error);
          throw error;
        }
      },

      // Cancel project with refund calculation
      cancelProject: async (projectId: string, cancellationData: { refundAmount: number }) => {
        const gameState = readGameState(get);
        if (!gameState) return;

        try {
          console.log('[CANCEL PROJECT] Sending cancellation request:', { projectId, cancellationData });

          // Call the real API endpoint
          const response = await apiRequest('DELETE', `/api/projects/${projectId}/cancel`, cancellationData);
          const result = await response.json();

          console.log('[CANCEL PROJECT] API response:', result);

          // Update game state with new balance from server (optimistic delta
          // UNTOUCHED — adopts result.newBalance verbatim, per PR-10 scope note).
          const updatedGameState = {
            ...gameState,
            money: result.newBalance
          };
          // Phase 3.5 PR-4: dual-write funnel (same game).
          commitGameState(set, updatedGameState);

          // Phase 3 PR-7: projects are cache-owned now. Invalidate the projects
          // key so useProjects drops the cancelled project instead of filtering
          // a store-owned array.
          await queryClient.invalidateQueries({
            queryKey: projectsQueryKey(gameState.id),
          });

          console.log(`[CANCEL PROJECT] Project cancelled. Refund: $${result.refundAmount}, New balance: $${result.newBalance}`);
        } catch (error) {
          console.error('Failed to cancel project:', error);
          throw error;
        }
      },

      // Release management
      planRelease: async (releaseData: any) => {
        const gameState = readGameState(get);
        if (!gameState) return;

        try {
          const response = await apiRequest('POST', `/api/game/${gameState.id}/releases/plan`, releaseData);
          const result = await response.json();

          // Phase 3 PR-6: releases/releaseSongs/songs now live in the query cache
          // (formerly the store fan-out re-fetched them). Invalidate so the newly
          // planned release shows up without a full reload.
          await queryClient.invalidateQueries({ queryKey: releasesQueryKey(gameState.id) });
          await queryClient.invalidateQueries({ queryKey: releaseSongsQueryKey(gameState.id) });
          await queryClient.invalidateQueries({ queryKey: songsQueryKey(gameState.id) });

          // Phase 3 PR-10: adopt the server-canonical money + creativeCapital
          // instead of the old optimistic `money -= totalInvestment; cc -= 1`
          // math. The plan response DOES carry `updatedGameState.money`, but it
          // does NOT carry creativeCapital — so a single refetch of GET
          // /api/game/:id is the one correct source for BOTH fields (adopting
          // money from the response but refetching for cc would split one action
          // across two sources). Server validates the marketing budget itself.
          await adoptServerBalances(get, gameState.id);

          return result;
        } catch (error) {
          console.error('Failed to plan release:', error);
          throw error;
        }
      },

      // A&R Office operations
      consumeAROfficeSlot: async (sourcingType: SourcingTypeString) => {
        const { selectedActions } = get();
        const gameState = readGameState(get);
        if (!gameState) return;
        const arUsed = gameState.arOfficeSlotUsed ? 1 : 0;
        const totalUsed = selectedActions.length + arUsed;
        if (totalUsed >= (gameState.focusSlots || 0) || gameState.arOfficeSlotUsed) return;

        const updated: GameState = {
          ...gameState,
          arOfficeSlotUsed: true,
          arOfficeSourcingType: sourcingType,
          usedFocusSlots: selectedActions.length + 1,
        } as GameState;

        // Phase 3.5 PR-4: dual-write funnel (same game).
        commitGameState(set, updated);

        await syncSlotsPatch(gameState.id, {
          usedFocusSlots: updated.usedFocusSlots,
          arOfficeSlotUsed: updated.arOfficeSlotUsed ?? false,
          arOfficeSourcingType: updated.arOfficeSourcingType ?? null,
        });
      },

      releaseAROfficeSlot: async () => {
        const { selectedActions } = get();
        const gameState = readGameState(get);
        if (!gameState || !gameState.arOfficeSlotUsed) return;

        const updated: GameState = {
          ...gameState,
          arOfficeSlotUsed: false,
          arOfficeSourcingType: null,
          usedFocusSlots: selectedActions.length,
        } as GameState;

        // Phase 3.5 PR-4: dual-write funnel (same game).
        commitGameState(set, updated);

        await syncSlotsPatch(gameState.id, {
          usedFocusSlots: updated.usedFocusSlots,
          arOfficeSlotUsed: updated.arOfficeSlotUsed ?? false,
          arOfficeSourcingType: updated.arOfficeSourcingType ?? null,
        });
      },

      getAROfficeStatus: () => {
        const gameState = readGameState(get);
        return {
          arOfficeSlotUsed: !!gameState?.arOfficeSlotUsed,
          arOfficeSourcingType: (gameState?.arOfficeSourcingType as SourcingTypeString | null) ?? null,
          arOfficeOperationStart: gameState?.arOfficeOperationStart ?? null,
        };
      },

      startAROfficeOperation: async (sourcingType: SourcingTypeString, primaryGenre?: string, secondaryGenre?: string) => {
        const { consumeAROfficeSlot } = get();
        const gameState = readGameState(get);
        if (!gameState) return;
        console.log('[A&R CLIENT] Starting A&R operation:', { sourcingType, primaryGenre, secondaryGenre });
        try {
          const { startAROfficeOperation } = await import('../services/arOfficeService');
          // Call server to start the operation
          await startAROfficeOperation(gameState.id, sourcingType, primaryGenre, secondaryGenre);
          console.log('[A&R CLIENT] API call successful');

          // Immediately reflect the active operation locally so the UI stays in sync
          // This also patches usedFocusSlots and A&R flags to the server (idempotent)
          await consumeAROfficeSlot(sourcingType);

          // NOTE: No longer clearing discovered artists - we want to accumulate them across operations
        } catch (e) {
          console.error('[A&R CLIENT] API call failed:', e);
          throw e; // Re-throw so the calling code can handle it
        }
      },


      cancelAROfficeOperation: async () => {
        const gameState = readGameState(get);
        if (!gameState) return;
        try {
          const { cancelAROfficeOperation } = await import('../services/arOfficeService');
          await cancelAROfficeOperation(gameState.id);
          // NOTE: Keep discovered artists on cancel - they were earned from previous operations
        } catch (e) {
          console.error('[A&R] cancel operation API failed', e);
        } finally {
          await get().releaseAROfficeSlot();
        }
      },

      // Save game
      //
      // Phase 3 PR-9: the discovered-artists lifecycle (loadDiscoveredArtists /
      // clearDiscoveredArtists / removeDiscoveredArtist) was removed from the
      // store. The READ path now lives in the TanStack Query cache via
      // hooks/useDiscoveredArtists.ts. loadGame/loadGameFromSave prime the cache
      // (primeDiscoveredArtistsCache); advanceWeek refetches it on A&R completion
      // (refetchDiscoveredArtistsCache); signArtist invalidates the discovered key
      // so a signed artist drops out. The A&R server GET is a pure read (Phase 2),
      // so discovered artists survive a reload via the server — no client-side
      // persistence was load-bearing (they were never in the persist partialize).
      saveGame: async (name: string, options?: { isAutosave?: boolean }) => {
        const {
          roles,
          executives,
          moodEvents,
          weeklyActions,
          weeklyOutcome
        } = get();
        // Phase 3.5 PR-6: the spine record (with embedded musicLabel) comes from
        // the cache — its single owner — exactly as the five collections already
        // do below. Autosave runs right after advanceWeek's commit, so the cache
        // is freshly written here (same-tick, safe).
        const gameState = readGameState(get);
        if (!gameState) return;

        // Phase 3 PR-6/PR-7/PR-9: songs / releases / releaseSongs / projects /
        // artists are no longer store-owned. Source them from the TanStack Query
        // cache (seeded by the fan-out) so the snapshot shape is byte-identical to
        // before. Autosave runs right after advanceWeek's fan-out, so the cache is
        // freshly populated here.
        const songs = queryClient.getQueryData<any[]>(songsQueryKey(gameState.id)) ?? [];
        const releases = queryClient.getQueryData<any[]>(releasesQueryKey(gameState.id)) ?? [];
        const releaseSongs =
          queryClient.getQueryData<any[]>(releaseSongsQueryKey(gameState.id)) ?? [];
        const projects = queryClient.getQueryData<any[]>(projectsQueryKey(gameState.id)) ?? [];
        const artists = queryClient.getQueryData<any[]>(artistsQueryKey(gameState.id)) ?? [];

        try {
          const { emailSnapshot, releaseSongs: releaseSongsSnapshot, executives: executivesSnapshot, moodEvents: moodEventsSnapshot } =
            await fetchSnapshotCollections(gameState.id);

          const isAutosave = options?.isAutosave ?? false;
          const snapshot = buildGameSnapshot({
            gameState,
            emailSnapshot,
            artists,
            projects,
            roles,
            songs,
            releases,
            releaseSongs: releaseSongsSnapshot ?? releaseSongs,
            executives: executivesSnapshot ?? executives,
            moodEvents: moodEventsSnapshot ?? moodEvents,
            weeklyActions,
            weeklyOutcome,
          });
          const saveData = {
            // userId will be set by the server from authentication
            name,
            gameState: snapshot,
            week: gameState.currentWeek,
            isAutosave
          };

          await apiRequest('POST', '/api/saves', saveData);
          await queryClient.invalidateQueries({ queryKey: ['api', 'saves'] });
        } catch (error) {
          console.error('Failed to save game:', error);
          throw error;
        }
      }
    }),
    {
      name: 'music-label-manager-game',
      partialize: (state) => ({
        gameState: state.gameState ? { id: state.gameState.id } : null,
        selectedActions: state.selectedActions,
        isAdvancingWeek: state.isAdvancingWeek
      })
    }
  )
);
