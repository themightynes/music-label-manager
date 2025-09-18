import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGameStore } from '@/store/gameStore';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGameContext } from '@/contexts/GameContext';
import { apiRequest } from '@/lib/queryClient';

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

  const { data: saves = [], refetch: refetchSaves } = useQuery({
    queryKey: ['api', 'saves'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/saves');
      return response.json();
    },
    enabled: open
  });

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

  const handleLoad = async (saveId: string) => {
    setLoading(true);
    try {
      await loadGameFromSave(saveId);
      
      // Update the game context with the loaded game's ID
      // We need to get the game ID from the loaded state
      const { gameState: loadedState } = useGameStore.getState();
      if (loadedState?.id) {
        setGameId(loadedState.id);
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

    console.log('=== CLIENT DELETE DEBUG ===');
    console.log('Deleting save:', saveId, saveName);

    setDeleting(saveId);
    try {
      const response = await apiRequest('DELETE', `/api/saves/${saveId}`);
      const result = await response.json();
      console.log('Delete success response:', result);
      
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
        
        if (importData.gameState) {
          // TODO: Implement import to game store
          console.log('Import data:', importData);
          alert('Import functionality coming soon!');
        }
      } catch (error) {
        console.error('Failed to import save:', error);
        alert('Invalid save file format');
      }
    };
    input.click();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b border-[#4e324c] pb-4">
          <DialogTitle className="text-lg font-semibold text-white">Save & Load Game</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Existing saves */}
          {(saves as any[]).map((save: any) => (
            <div key={save.id} className="border border-[#4e324c] rounded-lg p-4 hover:bg-[#A75A5B]/10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-white">{save.name}</div>
                  <div className="text-xs text-white/70">
                    Month {save.month} • ${gameState?.money?.toLocaleString() || '0'}
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
          ))}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, 3 - (saves as any[]).length) }).map((_, index) => (
            <div key={`empty-${index}`} className="border-2 border-dashed border-[#4e324c] rounded-lg p-4 text-center">
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
              className="w-full bg-[#A75A5B] text-white hover:bg-[#8B4A6C]"
            >
              {saving ? 'Saving...' : 'Save Game'}
            </Button>
          </div>
        </div>

        <div className="p-6 border-t border-[#4e324c] flex justify-between">
          <div className="flex space-x-3">
            <Button
              variant="ghost"
              onClick={handleExport}
              className="text-[#A75A5B] hover:text-[#8B4A6C] font-medium"
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
