import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGameStore } from '@/store/gameStore';
import { useGameState } from '@/hooks/useGameState';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGameContext } from '@/contexts/GameContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { GameSaveSnapshot } from '@shared/schema';
import { gameSaveSnapshotSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fetchSnapshotCollections } from '@/utils/emailSnapshot';
import { buildGameSnapshot } from '@/utils/buildGameSnapshot';
import { songsQueryKey } from '@/hooks/useSongs';
import { releasesQueryKey, releaseSongsQueryKey } from '@/hooks/useReleases';
import { projectsQueryKey } from '@/hooks/useProjects';
import { artistsQueryKey } from '@/hooks/useArtists';
import { useToast } from '@/hooks/use-toast';
import { Save, Copy, Trash2, Plus, Download, Upload } from 'lucide-react';

type SaveSummary = {
  id: string;
  name: string;
  week: number;
  isAutosave: boolean | null;
  createdAt: string;
  updatedAt: string;
  money: number | null;
  reputation: number | null;
};

type PendingImportState = {
  name: string;
  snapshot: GameSaveSnapshot;
  fileName: string;
};

interface SaveGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveGameModal({ open, onOpenChange }: SaveGameModalProps) {
  const gameState = useGameState();
  const { saveGame, loadGameFromSave } = useGameStore();
  const { setGameId } = useGameContext();
  const [newSaveName, setNewSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saveDetails, setSaveDetails] = useState<Record<string, GameSaveSnapshot>>({});
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImportState | null>(null);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setPendingDelete(null);
      setPendingImport(null);
      setImporting(false);
      setDeleting(null);
      setNewSaveName('');
    }
  }, [open]);

  const { data: saves = [], refetch: refetchSaves } = useQuery<SaveSummary[]>({
    queryKey: ['api', 'saves'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/saves');
      return response.json();
    },
    enabled: open
  });

  const manualSaves = useMemo(
    () => (saves || []).filter(save => !save.isAutosave),
    [saves]
  );

  const autosaveSaves = useMemo(
    () => (saves || []).filter(save => save.isAutosave),
    [saves]
  );

  const handleSave = async () => {
    if (!newSaveName.trim() || !gameState) return;

    setSaving(true);
    try {
      await saveGame(newSaveName);
      setNewSaveName('');
      refetchSaves(); // Refresh saves list
      toast({
        title: 'Game saved',
        description: 'Your game snapshot has been saved.',
      });
    } catch (error) {
      console.error('Failed to save game:', error);
      // Try to show more specific error message
      let errorMessage = 'Failed to save game. Please try again.';
      if (error instanceof Error) {
        errorMessage = `Save failed: ${error.message}`;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = `Save failed: ${(error as any).message}`;
      }
      toast({
        title: 'Save failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (saveId: string, mode: 'overwrite' | 'fork' = 'overwrite') => {
    setLoading(true);
    try {
      let snapshot = saveDetails[saveId];

      if (!snapshot) {
        const response = await apiRequest('GET', `/api/saves/${saveId}`);
        const save = await response.json();
        snapshot = gameSaveSnapshotSchema.parse(save.gameState);
        setSaveDetails(prev => ({ ...prev, [saveId]: snapshot }));
      }

      const restoredGameId = await loadGameFromSave(saveId, snapshot, mode);

      // Update the game context with the loaded game's ID. Prefer the id
      // returned by loadGameFromSave; fall back to the Zustand SESSION POINTER
      // id (the only spine field Zustand still holds after Phase 3.5 PR-6 — the
      // full record is cache-owned).
      const pointerGameId = useGameStore.getState().gameState?.id ?? null;
      const activeGameId = restoredGameId || pointerGameId;
      if (activeGameId) {
        setGameId(activeGameId);
      }

      onOpenChange(false);
      toast({
        title: 'Game loaded',
        description: mode === 'fork' ? 'Copied save created successfully.' : 'Save restored successfully.',
      });
    } catch (error) {
      console.error('Failed to load game:', error);
      let errorMessage = 'Failed to load game. Please try again.';
      if (error instanceof Error) {
        errorMessage = `Load failed: ${error.message}`;
      }
      toast({
        title: 'Load failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const requestDelete = (saveId: string, saveName: string) => {
    setPendingDelete({ id: saveId, name: saveName });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    const { id: saveId, name: saveName } = pendingDelete;
    setDeleting(saveId);
    try {
      const response = await apiRequest('DELETE', `/api/saves/${saveId}`);
      await response.json();

      setSaveDetails(prev => {
        const next = { ...prev };
        delete next[saveId];
        return next;
      });

      refetchSaves(); // Refresh saves list
      toast({
        title: 'Save deleted',
        description: `Removed "${saveName}" from your saves.`,
      });
      setPendingDelete(null);
    } catch (error) {
      console.error('Failed to delete save:', error);
      let errorMessage = 'Failed to delete save. Please try again.';
      if (error instanceof Error) {
        errorMessage = `Delete failed: ${error.message}`;
      }
      toast({
        title: 'Delete failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleExport = async () => {
    if (!gameState) return;

    try {
      const { emailSnapshot, releaseSongs: releaseSongsSnapshot, executives: executivesSnapshot, moodEvents: moodEventsSnapshot } =
        await fetchSnapshotCollections(gameState.id);

      // Export in the same format as game saves (nested snapshot structure).
      // Uses the shared buildGameSnapshot helper so the export snapshot's field
      // list (and emailMetadata shape, incl. `truncated`) stays identical to
      // manual saves / autosaves and validates against gameSaveSnapshotSchema.
      const {
        roles,
        executives,
        moodEvents,
        weeklyActions,
        weeklyOutcome
      } = useGameStore.getState();

      // Phase 3 PR-6/PR-7/PR-9: songs / releases / releaseSongs / projects /
      // artists are no longer store-owned. Source them from the TanStack Query
      // cache so the export snapshot shape stays byte-identical to manual saves /
      // autosaves.
      const songs = queryClient.getQueryData<any[]>(songsQueryKey(gameState.id)) ?? [];
      const releases = queryClient.getQueryData<any[]>(releasesQueryKey(gameState.id)) ?? [];
      const releaseSongs = queryClient.getQueryData<any[]>(releaseSongsQueryKey(gameState.id)) ?? [];
      const projects = queryClient.getQueryData<any[]>(projectsQueryKey(gameState.id)) ?? [];
      const artists = queryClient.getQueryData<any[]>(artistsQueryKey(gameState.id)) ?? [];

      const snapshotCandidate = buildGameSnapshot({
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

      const validatedSnapshot = gameSaveSnapshotSchema.parse(snapshotCandidate);

      const exportData = {
        snapshotVersion: validatedSnapshot.snapshotVersion,
        gameState: validatedSnapshot,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `music-label-manager-save-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (validatedSnapshot.emailMetadata?.truncated) {
        toast({
          title: 'Save exported (emails truncated)',
          description: 'This save hit the email history safety cap, so some older emails were left out of the export.',
        });
      } else {
        toast({
          title: 'Save exported',
          description: 'Your game snapshot has been downloaded.',
        });
      }
    } catch (error) {
      console.error('Failed to export save:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export save. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importData = JSON.parse(text);

        const candidateSnapshot = (() => {
          if (!importData || typeof importData !== 'object') return null;
          const wrapped = (importData as any).gameState;
          // Double-wrapped export: importData.gameState is itself a snapshot (has its own .gameState)
          if (wrapped && typeof wrapped === 'object' && typeof wrapped.gameState === 'object' && wrapped.gameState !== null) {
            return wrapped as Record<string, unknown>;
          }
          // Single-wrapped / raw snapshot: importData itself is the snapshot
          if (wrapped && typeof wrapped === 'object') {
            return importData as Record<string, unknown>;
          }
          return null;
        })();

        if (!candidateSnapshot) {
          throw new Error('Invalid save file: expected snapshotVersion and gameState structure.');
        }

        // Rely on the schema for structural validation (it already checks
        // gameState.id, gameState.currentWeek, etc.). A ZodError is surfaced
        // below as a readable field-level message.
        const parsedSnapshot = gameSaveSnapshotSchema.parse(candidateSnapshot);
        const importName = importData?.name || `Imported Save ${new Date().toLocaleString()}`;

        setPendingImport({
          name: importName,
          snapshot: parsedSnapshot,
          fileName: file.name,
        });
      } catch (error) {
        console.error('Failed to import save:', error);

        let description = 'Invalid save file format. Expected { snapshotVersion, gameState } payload.';
        if (error instanceof ZodError) {
          const fieldErrors = error.issues
            .map(issue => {
              const path = issue.path.join('.');
              return path ? `${path}: ${issue.message}` : issue.message;
            })
            .join('; ');
          description = `Invalid save data. ${fieldErrors}`;
        } else if (error instanceof Error) {
          description = error.message;
        }

        toast({
          title: 'Import failed',
          description,
          variant: 'destructive',
        });
      }
  };
  input.click();
};

  const finalizeImport = async (mode: 'overwrite' | 'fork') => {
    if (!pendingImport) {
      return;
    }

    const { name, snapshot } = pendingImport;
    setImporting(true);
    try {
      const createResponse = await apiRequest('POST', '/api/saves', {
        name,
        gameState: snapshot,
        week: snapshot.gameState.currentWeek,
        isAutosave: false,
      });

      const createdSave = await createResponse.json();
      setSaveDetails(prev => {
        if (mode === 'overwrite') {
          return prev;
        }
        return { ...prev, [createdSave.id]: snapshot };
      });

      const importedGameId = await loadGameFromSave(createdSave.id, snapshot, mode);
      if (importedGameId) {
        setGameId(importedGameId);
      }

      if (mode === 'overwrite') {
        try {
          await apiRequest('DELETE', `/api/saves/${createdSave.id}`);
        } catch (cleanupError) {
          console.warn('[Import] Failed to remove temporary imported save:', cleanupError);
        }
      }

      refetchSaves();
      setPendingImport(null);
      onOpenChange(false);
      toast({
        title: 'Save imported',
        description: mode === 'fork' ? 'Copied save created successfully.' : 'Save restored successfully.',
      });
    } catch (error) {
      console.error('Failed to import save:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Invalid save file format.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="border-b border-white/[0.06] pb-4">
            <DialogTitle className="text-lg font-semibold text-[#F7F4FB]">Save &amp; Load Game</DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
            {/* Manual saves */}
            {manualSaves.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(180,170,220,0.5)]">Manual Saves</h3>
                {manualSaves.map(save => {
                  const detail = saveDetails[save.id];
                  const money = save.money ?? detail?.gameState?.money ?? null;
                  const reputation = save.reputation ?? detail?.gameState?.reputation ?? null;
                  return (
                    <div key={save.id} className="rounded-xl border border-white/[0.06] bg-surface-inner/50 p-4 transition-colors hover:bg-white/[0.045]">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#F7F4FB]">{save.name}</span>
                            <span className="font-mono text-[11px] px-[11px] py-[4px] rounded-pill bg-[rgba(160,90,240,0.14)] border border-[rgba(160,90,240,0.4)] text-neon-lilac">
                              Manual
                            </span>
                          </div>
                          <div className="text-xs text-white/70 mt-1">
                            Week {save.week} | <span className="font-mono text-money">${typeof money === 'number' ? money.toLocaleString() : '--'}</span> | Rep {typeof reputation === 'number' ? reputation : '--'}
                          </div>
                          <div className="font-mono text-[11px] text-white/50 mt-1">
                            Saved {formatDate(save.updatedAt)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoad(save.id)}
                            disabled={loading || deleting === save.id}
                            className="text-xs rounded-button border-[rgba(55,214,255,0.35)] bg-[rgba(55,214,255,0.06)] text-neon-cyan hover:bg-[rgba(55,214,255,0.12)] hover:text-neon-cyan"
                          >
                            {loading ? 'Loading...' : 'Load'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoad(save.id, 'fork')}
                            disabled={loading || deleting === save.id}
                            className="text-xs rounded-button border-white/[0.09] bg-white/[0.02] text-white/75 hover:bg-white/[0.06] hover:text-white"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => requestDelete(save.id, save.name)}
                            disabled={loading || deleting === save.id}
                            className="text-xs rounded-button border-negative/40 bg-negative/[0.08] text-negative hover:bg-negative/[0.16] hover:text-negative"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            {deleting === save.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Autosaves */}
            {autosaveSaves.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(180,170,220,0.5)]">Autosaves</h3>
                {autosaveSaves.map(save => {
                  const detail = saveDetails[save.id];
                  const money = save.money ?? detail?.gameState?.money ?? null;
                  const reputation = save.reputation ?? detail?.gameState?.reputation ?? null;
                  return (
                    <div key={save.id} className="rounded-xl border border-white/[0.06] bg-surface-inner/50 p-4 transition-colors hover:bg-white/[0.045]">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#F7F4FB]">{save.name}</span>
                            <span className="font-mono text-[11px] px-[11px] py-[4px] rounded-pill bg-[rgba(55,214,255,0.1)] border border-[rgba(55,214,255,0.35)] text-neon-cyan">
                              Autosave
                            </span>
                          </div>
                          <div className="text-xs text-white/70 mt-1">
                            Week {save.week} | <span className="font-mono text-money">${typeof money === 'number' ? money.toLocaleString() : '--'}</span> | Rep {typeof reputation === 'number' ? reputation : '--'}
                          </div>
                          <div className="font-mono text-[11px] text-white/50 mt-1">
                            Saved {formatDate(save.updatedAt)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoad(save.id)}
                            disabled={loading || deleting === save.id}
                            className="text-xs rounded-button border-[rgba(55,214,255,0.35)] bg-[rgba(55,214,255,0.06)] text-neon-cyan hover:bg-[rgba(55,214,255,0.12)] hover:text-neon-cyan"
                          >
                            {loading ? 'Loading...' : 'Load'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoad(save.id, 'fork')}
                            disabled={loading || deleting === save.id}
                            className="text-xs rounded-button border-white/[0.09] bg-white/[0.02] text-white/75 hover:bg-white/[0.06] hover:text-white"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => requestDelete(save.id, save.name)}
                            disabled={loading || deleting === save.id}
                            className="text-xs rounded-button border-negative/40 bg-negative/[0.08] text-negative hover:bg-negative/[0.16] hover:text-negative"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            {deleting === save.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 3 - manualSaves.length) }).map((_, index) => (
              <div key={`empty-${index}`} className="rounded-xl border-2 border-dashed border-white/[0.09] p-4 text-center">
                <Plus className="h-5 w-5 text-white/50 mx-auto mb-2" />
                <p className="text-sm text-white/50">Empty Slot</p>
              </div>
            ))}
          </div>

          {/* New save input — pinned below the scrolling list */}
          <div className="px-6 pt-4 space-y-2 border-t border-white/[0.06]">
            <Input
              placeholder="Enter save name..."
              value={newSaveName}
              onChange={(e) => setNewSaveName(e.target.value)}
              className="w-full"
            />
            <Button
              onClick={handleSave}
              disabled={!newSaveName.trim() || saving}
              className="w-full rounded-button bg-gradient-to-br from-action-pink to-action-purple text-white shadow-action hover:opacity-95 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Game'}
            </Button>
          </div>

          <div className="p-6 border-t border-white/[0.06] flex justify-between">
            <div className="flex space-x-3">
              <Button
                variant="ghost"
                onClick={handleExport}
                className="text-neon-lilac hover:text-neon-lilac hover:bg-white/[0.045] font-medium"
              >
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              <Button
                variant="ghost"
                onClick={handleImport}
                disabled={importing}
                className="text-white/70 hover:text-white hover:bg-white/[0.045] font-medium"
              >
                <Upload className="h-4 w-4 mr-2" />
                {importing ? 'Processing...' : 'Import JSON'}
              </Button>
            </div>
            <div className="space-x-3">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-white/70 hover:text-white hover:bg-white/[0.045]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleting) {
            setPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent className="border-white/[0.06] bg-surface-panel text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F7F4FB]">Delete this save?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              {pendingDelete
                ? `This will permanently remove "${pendingDelete.name}" from your save slots.`
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting !== null}
              className="rounded-button border-white/[0.09] text-white hover:bg-white/[0.08]"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={() => confirmDelete()}
              disabled={deleting !== null}
              className="rounded-button bg-negative text-white hover:bg-negative/90"
            >
              {deleting !== null && pendingDelete && deleting === pendingDelete.id ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!pendingImport}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !importing) {
            setPendingImport(null);
          }
        }}
      >
        <AlertDialogContent className="border-white/[0.06] bg-surface-panel text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F7F4FB]">Import save file</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Choose how you want to apply the imported snapshot.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingImport && (
            <div className="space-y-2 rounded-xl border border-white/[0.06] bg-surface-inner/50 p-4 text-sm text-white/80">
              <div>
                <span className="font-semibold text-white/90">File:</span> {pendingImport.fileName}
              </div>
              <div>
                <span className="font-semibold text-white/90">Save name:</span> {pendingImport.name}
              </div>
              <div>
                <span className="font-semibold text-white/90">Week:</span>{' '}
                {pendingImport.snapshot.gameState?.currentWeek ?? 'Unknown'}
              </div>
            </div>
          )}

          <AlertDialogFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <AlertDialogCancel
              disabled={importing}
              className="rounded-button border-white/[0.09] text-white hover:bg-white/[0.08]"
            >
              Cancel
            </AlertDialogCancel>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Button
                variant="outline"
                className="rounded-button border-[rgba(55,214,255,0.35)] bg-[rgba(55,214,255,0.06)] text-neon-cyan hover:bg-[rgba(55,214,255,0.12)] hover:text-neon-cyan"
                disabled={importing}
                onClick={() => finalizeImport('fork')}
              >
                {importing ? 'Importing...' : 'Import as copy'}
              </Button>
              <Button
                className="rounded-button bg-gradient-to-br from-action-pink to-action-purple text-white shadow-action hover:opacity-95"
                disabled={importing}
                onClick={() => finalizeImport('overwrite')}
              >
                {importing ? 'Importing...' : 'Overwrite current game'}
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
