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
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGameContext } from '@/contexts/GameContext';
import { apiRequest } from '@/lib/queryClient';
import type { GameSaveSnapshot } from '@shared/schema';
import { gameSaveSnapshotSchema, SNAPSHOT_VERSION } from '@shared/schema';
import { fetchSnapshotCollections } from '@/utils/emailSnapshot';
import { useToast } from '@/hooks/use-toast';

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
  const { gameState, saveGame, loadGameFromSave } = useGameStore();
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

      // Update the game context with the loaded game's ID
      // We need to get the game ID from the loaded state
      const { gameState: loadedState } = useGameStore.getState();
      const activeGameId = restoredGameId || loadedState?.id;
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

      // Export in the same format as game saves (nested snapshot structure)
      // This ensures imported saves can be validated by gameSaveSnapshotSchema
      const { musicLabel, ...gameStateWithoutLabel } = gameState;
      const {
        artists,
        projects,
        roles,
        songs,
        releases,
        releaseSongs,
        executives,
        moodEvents,
        weeklyActions,
        weeklyOutcome
      } = useGameStore.getState();

      const exportData = {
        snapshotVersion: SNAPSHOT_VERSION,
        gameState: {
          gameState: gameStateWithoutLabel,
          musicLabel: musicLabel || null,
          artists,
          projects,
          roles,
          songs,
          releases,
          emails: emailSnapshot.emails,
          releaseSongs: releaseSongsSnapshot ?? releaseSongs,
          executives: executivesSnapshot ?? executives,
          moodEvents: moodEventsSnapshot ?? moodEvents,
          emailMetadata: {
            total: emailSnapshot.total,
            unreadCount: emailSnapshot.unreadCount
          },
          weeklyActions,
          weeklyOutcome: weeklyOutcome ?? null
        },
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

        if (!importData?.gameState) {
          throw new Error('Missing gameState payload');
        }

        const parsedSnapshot = gameSaveSnapshotSchema.parse({
          snapshotVersion: importData.snapshotVersion ?? SNAPSHOT_VERSION,
          ...importData.gameState,
        });
        const importName = importData?.name || `Imported Save ${new Date().toLocaleString()}`;

        setPendingImport({
          name: importName,
          snapshot: parsedSnapshot,
          fileName: file.name,
        });
      } catch (error) {
        console.error('Failed to import save:', error);
        toast({
          title: 'Import failed',
          description: error instanceof Error ? error.message : 'Invalid save file format.',
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
      setSaveDetails(prev => ({ ...prev, [createdSave.id]: snapshot }));

      const importedGameId = await loadGameFromSave(createdSave.id, snapshot, mode);
      if (importedGameId) {
        setGameId(importedGameId);
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
        <DialogContent className="w-full max-w-2xl">
          <DialogHeader className="border-b border-brand-purple pb-4">
            <DialogTitle className="text-lg font-semibold text-white">Save & Load Game</DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-4">
            {/* Manual saves */}
            {manualSaves.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-wide text-white/60">Manual Saves</h3>
                {manualSaves.map(save => {
                  const detail = saveDetails[save.id];
                  const money = save.money ?? detail?.gameState?.money ?? null;
                  const reputation = save.reputation ?? detail?.gameState?.reputation ?? null;
                  return (
                    <div key={save.id} className="border border-brand-purple rounded-lg p-4 hover:bg-brand-burgundy/10">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-white">{save.name}</div>
                          <div className="text-xs text-white/70">
                            Week {save.week} | ${typeof money === 'number' ? money.toLocaleString() : '--'} | Rep {typeof reputation === 'number' ? reputation : '--'}
                          </div>
                          <div className="text-xs text-white/50">
                            Saved {formatDate(save.updatedAt)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoad(save.id)}
                            disabled={loading || deleting === save.id}
                            className="text-xs"
                          >
                            {loading ? 'Loading...' : 'Load'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoad(save.id, 'fork')}
                            disabled={loading || deleting === save.id}
                            className="text-xs"
                          >
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => requestDelete(save.id, save.name)}
                            disabled={loading || deleting === save.id}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
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
                <h3 className="text-xs uppercase tracking-wide text-white/60">Autosaves</h3>
                {autosaveSaves.map(save => {
                  const detail = saveDetails[save.id];
                  const money = save.money ?? detail?.gameState?.money ?? null;
                  const reputation = save.reputation ?? detail?.gameState?.reputation ?? null;
                  return (
                    <div key={save.id} className="border border-brand-purple/60 rounded-lg p-4 hover:bg-brand-burgundy/10">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-white">{save.name}</div>
                          <div className="text-xs text-white/70">
                            Week {save.week} | ${typeof money === 'number' ? money.toLocaleString() : '--'} | Rep {typeof reputation === 'number' ? reputation : '--'}
                          </div>
                          <div className="text-xs text-white/50">
                            Saved {formatDate(save.updatedAt)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoad(save.id)}
                            disabled={loading || deleting === save.id}
                            className="text-xs"
                          >
                            {loading ? 'Loading...' : 'Load'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoad(save.id, 'fork')}
                            disabled={loading || deleting === save.id}
                            className="text-xs"
                          >
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => requestDelete(save.id, save.name)}
                            disabled={loading || deleting === save.id}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
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
              <div key={`empty-${index}`} className="border-2 border-dashed border-brand-purple rounded-lg p-4 text-center">
                <i className="fas fa-plus text-white/50 text-xl mb-2"></i>
                <p className="text-sm text-white/50">Empty Slot</p>
              </div>
            ))}

            {/* New save input */}
            <div className="space-y-2">
              <Input
                placeholder="Enter save name..."
                value={newSaveName}
                onChange={(e) => setNewSaveName(e.target.value)}
                className="w-full"
              />
              <Button
                onClick={handleSave}
                disabled={!newSaveName.trim() || saving}
                className="w-full bg-brand-burgundy text-white hover:bg-brand-burgundy"
              >
                {saving ? 'Saving...' : 'Save Game'}
              </Button>
            </div>
          </div>

          <div className="p-6 border-t border-brand-purple flex justify-between">
            <div className="flex space-x-3">
              <Button
                variant="ghost"
                onClick={handleExport}
                className="text-brand-burgundy hover:text-brand-burgundy font-medium"
              >
                Export JSON
              </Button>
              <Button
                variant="ghost"
                onClick={handleImport}
                disabled={importing}
                className="text-white/70 hover:text-white font-medium"
              >
                {importing ? 'Processing...' : 'Import JSON'}
              </Button>
            </div>
            <div className="space-x-3">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-white/70 hover:text-white"
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
        <AlertDialogContent className="border-brand-purple bg-brand-dark text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this save?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              {pendingDelete
                ? `This will permanently remove "${pendingDelete.name}" from your save slots.`
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting !== null}
              className="border-brand-purple text-white hover:bg-white/10"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={() => confirmDelete()}
              disabled={deleting !== null}
              className="bg-red-600 text-white hover:bg-red-700"
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
        <AlertDialogContent className="border-brand-purple bg-brand-dark text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Import save file</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Choose how you want to apply the imported snapshot.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingImport && (
            <div className="space-y-2 rounded-lg border border-brand-purple/40 bg-black/30 p-4 text-sm text-white/80">
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
              className="border-brand-purple text-white hover:bg-white/10"
            >
              Cancel
            </AlertDialogCancel>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Button
                variant="outline"
                className="border-brand-purple text-white hover:border-brand-burgundy hover:text-white"
                disabled={importing}
                onClick={() => finalizeImport('fork')}
              >
                {importing ? 'Importing...' : 'Import as copy'}
              </Button>
              <Button
                className="bg-brand-burgundy text-white hover:bg-brand-burgundy-light"
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
