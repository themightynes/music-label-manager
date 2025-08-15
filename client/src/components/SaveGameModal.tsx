import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGameStore } from '@/store/gameStore';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface SaveGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveGameModal({ open, onOpenChange }: SaveGameModalProps) {
  const { gameState, saveGame } = useGameStore();
  const [newSaveName, setNewSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: saves = [] } = useQuery({
    queryKey: ['/api/saves'],
    enabled: open
  });

  const handleSave = async () => {
    if (!newSaveName.trim() || !gameState) return;

    setSaving(true);
    try {
      await saveGame(newSaveName);
      setNewSaveName('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save game:', error);
    } finally {
      setSaving(false);
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
        <DialogHeader className="border-b border-slate-200 pb-4">
          <DialogTitle className="text-lg font-semibold text-slate-900">Save Game</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Existing saves */}
          {saves.map((save: any) => (
            <div key={save.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900">{save.name}</div>
                  <div className="text-xs text-slate-600">
                    Month {save.month} • ${gameState?.money?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs text-slate-500">
                    Saved {formatDate(save.updatedAt)}
                  </div>
                </div>
                <i className="fas fa-save text-slate-400"></i>
              </div>
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, 3 - saves.length) }).map((_, index) => (
            <div key={`empty-${index}`} className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
              <i className="fas fa-plus text-slate-400 text-xl mb-2"></i>
              <p className="text-sm text-slate-500">Empty Slot</p>
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
              className="w-full bg-primary text-white hover:bg-indigo-700"
            >
              {saving ? 'Saving...' : 'Save Game'}
            </Button>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-between">
          <Button
            variant="ghost"
            onClick={handleExport}
            className="text-primary hover:text-indigo-700 font-medium"
          >
            Export JSON
          </Button>
          <div className="space-x-3">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-600 hover:text-slate-900"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
