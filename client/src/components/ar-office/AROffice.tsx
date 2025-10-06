import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { arOfficeMachine, type SourcingType } from '../../machines/arOfficeMachine';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Music } from 'lucide-react';
import type { Artist as SharedArtist } from '@shared/schema';
import type { GameState } from '@shared/types/gameTypes';
import { useGameStore } from '@/store/gameStore';
import type { SourcingTypeString } from '@shared/types/gameTypes';
import { SourcingModeSelector } from './SourcingModeSelector';
import { ArtistDiscoveryTable, type UIArtist } from './ArtistDiscoveryTable';
import { FocusSlotStatus } from './FocusSlotStatus';
import { GenreSelectionModal } from './GenreSelectionModal';

interface AROfficeProps {
  gameId: string;
  gameState: GameState;
  signedArtists: SharedArtist[];
  focusSlots: { total: number; used: number };
  onSignArtist: (artist: SharedArtist) => Promise<void>;
}

export function AROffice({ gameId, gameState, signedArtists, focusSlots, onSignArtist }: AROfficeProps) {
  const [state, send] = useMachine(arOfficeMachine, {
    input: {
      gameId,
    },
  });

  const { context } = state;
  const [sourcingMode, setSourcingMode] = useState<SourcingType | null>(null);

  // Store methods to manage A&R slot usage
  const { startAROfficeOperation, cancelAROfficeOperation, discoveredArtists, loadDiscoveredArtists } = useGameStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArchetype, setSelectedArchetype] = useState<string>('All');
  const [signingArtist, setSigningArtist] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Genre selection for specialized search
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [selectedPrimaryGenre, setSelectedPrimaryGenre] = useState<string | null>(null);
  const [selectedSecondaryGenre, setSelectedSecondaryGenre] = useState<string | null>(null);

  // Sync focus slots into the machine
  useEffect(() => {
    send({ type: 'SYNC_SLOTS', used: focusSlots.used, total: focusSlots.total });
  }, [focusSlots.used, focusSlots.total, send]);

  // Sync A&R server status into the machine to derive operationComplete
  useEffect(() => {
    send({
      type: 'SYNC_STATUS',
      slotUsed: !!gameState.arOfficeSlotUsed,
      sourcingType: (gameState.arOfficeSourcingType as SourcingType | null) ?? null,
    });
  }, [gameState.arOfficeSlotUsed, gameState.arOfficeSourcingType, send]);

  const availableSlots = useMemo(() => Math.max(0, focusSlots.total - focusSlots.used), [focusSlots]);
  const isOperationActive = !!gameState.arOfficeSlotUsed;



  // Load discovered artists after an operation completes (true -> false transition)
  const prevArUsedRef = useRef<boolean>(!!gameState.arOfficeSlotUsed);
  const retryAttemptRef = useRef<number>(0);

  useEffect(() => {
    const prev = prevArUsedRef.current;
    const curr = !!gameState.arOfficeSlotUsed;

    // Log A&R operation lifecycle for debugging
    if (prev !== curr) {
      console.log(`[A&R] Operation state changed: ${prev} -> ${curr}`);
    }

    if (prev === true && curr === false) {
      console.log('[A&R] Operation completed, loading discovered artists');
      setLoading(true);
      setError(null); // Clear error state before starting retry sequence
      retryAttemptRef.current = 0;

      const loadWithRetry = async (attempt = 1): Promise<void> => {
        try {
          await loadDiscoveredArtists();
          console.log('[A&R] Successfully loaded discovered artists');
          setError(null); // Clear error state on successful load
          setLoading(false); // Clear loading state on successful load
        } catch (error) {
          console.error(`[A&R] Failed to load discovered artists (attempt ${attempt}):`, error);

          if (attempt < 3) {
            const delay = 500 * attempt; // Exponential backoff: 500ms, 1000ms, 1500ms
            console.log(`[A&R] Retrying in ${delay}ms...`);
            setTimeout(() => loadWithRetry(attempt + 1), delay);
          } else {
            console.error('[A&R] All retry attempts failed');
            setError('Failed to load discovered artists after multiple attempts');
            setLoading(false); // Clear loading state after final retry
          }
        }
      };

      loadWithRetry();
    }

    prevArUsedRef.current = curr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.arOfficeSlotUsed]);

  // Align the displayed sourcing mode with actual operation state
  // When operation is active, show the mode; when not, clear selection
  useEffect(() => {
    if (gameState.arOfficeSlotUsed && gameState.arOfficeSourcingType) {
      setSourcingMode(gameState.arOfficeSourcingType as SourcingType);
    } else {
      setSourcingMode(null);
    }
  }, [gameState.arOfficeSlotUsed, gameState.arOfficeSourcingType]);

  // On mount, if no active operation, attempt to load discovered artists
  useEffect(() => {
    if (!isOperationActive) {
      setLoading(true);
      setError(null); // Clear error state before loading
      loadDiscoveredArtists()
        .then(() => {
          setError(null); // Clear error state on successful load
        })
        .catch((error) => {
          console.error('[A&R] Failed to load discovered artists on mount:', error);
          setError(error instanceof Error ? error.message : String(error));
        })
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModeSelect = async (mode: SourcingType) => {
    setSourcingMode(mode);

    // If specialized search is selected, show genre selection modal
    if (mode === 'specialized') {
      setShowGenreModal(true);
      return;
    }

    // For active and passive, proceed directly
    if (availableSlots > 0) {
      try {
        // If there's already an operation active, cancel it first
        if (isOperationActive) {
          console.log('[A&R] Cancelling existing operation before starting new one');
          await cancelAROfficeOperation();
        }

        await startAROfficeOperation(mode as SourcingTypeString);
        send({ type: 'START_SOURCING', sourcingType: mode });
        console.log(`[A&R] Successfully started ${mode} operation`);
      } catch (e) {
        console.error('[A&R] Failed to start sourcing operation', e);
        setError(e instanceof Error ? e.message : 'Failed to start sourcing operation');
        // Reset the mode selection since the operation failed
        setSourcingMode(null);
      }
    }
  };

  const handleGenreConfirm = async (primaryGenre: string, secondaryGenre?: string) => {
    console.log(`[A&R] Starting specialized search with genres:`, { primaryGenre, secondaryGenre });
    setSelectedPrimaryGenre(primaryGenre);
    setSelectedSecondaryGenre(secondaryGenre || null);

    if (availableSlots > 0) {
      try {
        // If there's already an operation active, cancel it first
        if (isOperationActive) {
          console.log('[A&R] Cancelling existing operation before starting new one');
          await cancelAROfficeOperation();
        }

        // TODO: Update startAROfficeOperation to accept genre parameters
        await startAROfficeOperation('specialized' as SourcingTypeString, primaryGenre, secondaryGenre);
        send({ type: 'START_SOURCING', sourcingType: 'specialized' });
        console.log(`[A&R] Successfully started specialized operation with genres`);
      } catch (e) {
        console.error('[A&R] Failed to start specialized sourcing operation', e);
        setError(e instanceof Error ? e.message : 'Failed to start sourcing operation');
        // Reset the mode selection since the operation failed
        setSourcingMode(null);
        setSelectedPrimaryGenre(null);
        setSelectedSecondaryGenre(null);
      }
    }
  };

  const cancelOperation = async () => {
    try {
      await cancelAROfficeOperation();
    } catch (e) {
      console.error('[A&R] Cancel operation failed', e);
    } finally {
      send({ type: 'CANCEL_SOURCING' });
    }
  };


  const filteredArtists = useMemo(() => {
    const signedNames = new Set((signedArtists || []).map(a => (a.name || '').toLowerCase()));
    return (discoveredArtists as unknown as UIArtist[])
      .filter(a => !signedNames.has((a.name || '').toLowerCase()))
      .filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || (a.genre || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesArchetype = selectedArchetype === 'All' || a.archetype === selectedArchetype;
        return matchesSearch && matchesArchetype;
      });
  }, [discoveredArtists, searchTerm, selectedArchetype, signedArtists]);

  const handleSignArtist = async (artist: UIArtist) => {
    if (signingArtist || (gameState.money || 0) < (artist.signingCost || 0)) return;
    setSigningArtist(artist.id || artist.name);
    try {
      await onSignArtist(artist);
      // Optimistically remove from local discovered list and refresh from server
      try { useGameStore.getState().removeDiscoveredArtist(artist.id as string); } catch {}
      loadDiscoveredArtists();
    } catch (e) {
      console.error('[A&R] Sign artist failed', e);
    } finally {
      setSigningArtist(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Music className="w-5 h-5 text-brand-burgundy" />
            A&R Office
          </span>
          <FocusSlotStatus
            focusSlotsUsed={context.focusSlotsUsed}
            focusSlotsTotal={context.focusSlotsTotal}
            onCancelOperation={isOperationActive ? cancelOperation : undefined}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <SourcingModeSelector
            selectedMode={sourcingMode}
            availableSlots={availableSlots}
            isOperationActive={isOperationActive}
            onModeSelect={handleModeSelect}
          />

          <GenreSelectionModal
            open={showGenreModal}
            onClose={() => {
              setShowGenreModal(false);
              setSourcingMode(null);
            }}
            onConfirm={handleGenreConfirm}
            labelGenre={gameState.musicLabel?.genreFocus}
          />

          {state.matches('noSlotsAvailable') && (
            <div className="flex items-center gap-3">
              <div className="text-sm text-yellow-300">No focus slots available</div>
              <Button size="sm" variant="outline" onClick={() => send({ type: 'RETRY' })}>Retry</Button>
            </div>
          )}

          <ArtistDiscoveryTable
            artists={filteredArtists}
            loading={loading}
            error={error}
            searchTerm={searchTerm}
            selectedArchetype={selectedArchetype}
            sourcingMode={sourcingMode}
            gameState={gameState}
            signedArtists={signedArtists as unknown as UIArtist[]}
            signingArtist={signingArtist}
            onSignArtist={handleSignArtist}
            onRetry={loadDiscoveredArtists}
            onSearchChange={setSearchTerm}
            onArchetypeChange={setSelectedArchetype}
          />

          {isOperationActive && (
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={cancelOperation}>Cancel Operation</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
