import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGameStore } from '@/store/gameStore';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGameContext } from '@/contexts/GameContext';
import { apiRequest } from '@/lib/queryClient';
import type { GameSaveSnapshot } from '@shared/schema';
import { gameSaveSnapshotSchema } from '@shared/schema';

type SaveSummary = {
  id: string;
  name: string;
  week: number;
  isAutosave: boolean | null;
  createdAt: string;
  updatedAt: string;
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
      // Show success feedback
      alert('Game saved successfully!');
    } catch (error) {
      console.error('Failed to save game:', error);
      // Try to show more specific error message
      let errorMessage = 'Failed to save game. Please try again.';
      if (error instanceof Error) {
        errorMessage = `Save failed: ${error.message}`;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = `Save failed: ${(error as any).message}`;
      }
      alert(errorMessage);
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
      alert('Game loaded successfully!');
    } catch (error) {
      console.error('Failed to load game:', error);
      let errorMessage = 'Failed to load game. Please try again.';
      if (error instanceof Error) {
        errorMessage = `Load failed: ${error.message}`;
      }
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (saveId: string, saveName: string) => {
    if (!confirm(`Are you sure you want to delete the save "${saveName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(saveId);
    try {
      const response = await apiRequest('DELETE', `/api/saves/${saveId}`);
      const result = await response.json();

      setSaveDetails(prev => {
        const next = { ...prev };
        delete next[saveId];
        return next;
      });

      refetchSaves(); // Refresh saves list
      alert(`Save "${saveName}" deleted successfully!`);
    } catch (error) {
      console.error('Failed to delete save:', error);
      let errorMessage = 'Failed to delete save. Please try again.';
      if (error instanceof Error) {
        errorMessage = `Delete failed: ${error.message}`;
      }
      alert(errorMessage);
    } finally {
      setDeleting(null);
    }
  };

  const handleExport = () => {
    if (!gameState) return;

    const exportData = {
      gameState,
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

        const parsedSnapshot = gameSaveSnapshotSchema.parse(importData.gameState);
        const importName = importData?.name || `Imported Save ${new Date().toLocaleString()}`;

        const createResponse = await apiRequest('POST', '/api/saves', {
          name: importName,
          gameState: parsedSnapshot,
          week: parsedSnapshot.gameState.currentWeek,
          isAutosave: false
        });

        const createdSave = await createResponse.json();
        setSaveDetails(prev => ({ ...prev, [createdSave.id]: parsedSnapshot }));

        const importedGameId = await loadGameFromSave(createdSave.id, parsedSnapshot, 'fork');
        if (importedGameId) {
          setGameId(importedGameId);
        }

        refetchSaves();
        onOpenChange(false);
        alert('Save imported successfully!');
      } catch (error) {
        console.error('Failed to import save:', error);
        alert('Invalid save file format');
      }
    };
    input.click();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
                const money = detail?.gameState?.money;
                const reputation = detail?.gameState?.reputation;
                return (
                  <div key={save.id} className="border border-brand-purple rounded-lg p-4 hover:bg-brand-burgundy/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-white">{save.name}</div>
                        <div className="text-xs text-white/70">
                          Week {save.week} • ${money?.toLocaleString?.() ?? '—'} • Rep {reputation ?? '—'}
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
                          onClick={() => handleDelete(save.id, save.name)}
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
                const money = detail?.gameState?.money;
                const reputation = detail?.gameState?.reputation;
                return (
                  <div key={save.id} className="border border-brand-purple/60 rounded-lg p-4 hover:bg-brand-burgundy/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-white">{save.name}</div>
                        <div className="text-xs text-white/70">
                          Week {save.week} • ${money?.toLocaleString?.() ?? '—'} • Rep {reputation ?? '—'}
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
                          onClick={() => handleDelete(save.id, save.name)}
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
              className="text-white/70 hover:text-white font-medium"
            >
              Import JSON
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
  );
}
