import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Target } from 'lucide-react';

const AVAILABLE_GENRES = [
  "Pop",
  "Rock",
  "Hip-Hop",
  "Electronic",
  "Country",
  "R&B",
  "Jazz",
  "Classical",
  "Alternative",
  "Indie",
  "Folk"
];

interface GenreSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (primaryGenre: string, secondaryGenre?: string) => void;
  labelGenre?: string | null;
}

export function GenreSelectionModal({ open, onClose, onConfirm, labelGenre }: GenreSelectionModalProps) {
  const [primaryGenre, setPrimaryGenre] = useState<string>(labelGenre || '');
  const [secondaryGenre, setSecondaryGenre] = useState<string>('none');

  const handleConfirm = () => {
    if (!primaryGenre) return;
    const finalSecondaryGenre = secondaryGenre === 'none' ? undefined : secondaryGenre;
    onConfirm(primaryGenre, finalSecondaryGenre);
    onClose();
  };

  const handleCancel = () => {
    // Reset to label genre if available
    setPrimaryGenre(labelGenre || '');
    setSecondaryGenre('none');
    onClose();
  };

  const availableSecondaryGenres = AVAILABLE_GENRES.filter(g => g !== primaryGenre);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="sm:max-w-[500px] glass-panel chromatic-hairline border-0 text-text-primary">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-primary">
            <Target className="w-5 h-5 text-neon-lilac" />
            Specialized Search - Genre Targeting
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Focus your A&R efforts on specific genres to find artists that match your label's specialization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Primary Genre Selection */}
          <div className="space-y-2">
            <Label htmlFor="primaryGenre" className="text-sm font-medium text-text-primary">
              Primary Genre {labelGenre && (
                <Badge variant="outline" className="ml-2 rounded-pill font-mono text-[10px] uppercase tracking-[0.1em] border-neon-lilac/40 bg-neon-lilac/14 text-neon-lilac">
                  Label Focus
                </Badge>
              )}
            </Label>
            <Select value={primaryGenre} onValueChange={setPrimaryGenre}>
              <SelectTrigger id="primaryGenre">
                <SelectValue placeholder="Select target genre..." />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_GENRES.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                    {genre === labelGenre && <span className="ml-2 text-xs text-neon-lilac">(Your Label)</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-text-muted">
              {labelGenre
                ? `Defaulted to your label's genre focus: ${labelGenre}`
                : 'Select the primary genre to search for'}
            </p>
          </div>

          {/* Secondary Genre Selection (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="secondaryGenre" className="text-sm font-medium text-text-primary">
              Secondary Genre <span className="text-xs text-text-muted">(Optional Fallback)</span>
            </Label>
            <Select value={secondaryGenre} onValueChange={setSecondaryGenre} disabled={!primaryGenre}>
              <SelectTrigger id="secondaryGenre">
                <SelectValue placeholder="Select backup genre..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {availableSecondaryGenres.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-text-muted">
              If no artists match the primary genre, search will fall back to this genre
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-white/[0.03] border border-white/9 rounded-chip p-3">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-label mb-2">Search Priority:</h4>
            <ol className="text-xs text-text-body space-y-1 list-decimal list-inside">
              <li>Primary Genre: {primaryGenre || <span className="italic text-text-muted">Not selected</span>}</li>
              <li>Secondary Genre: {secondaryGenre === 'none' ? <span className="italic text-text-muted">None</span> : secondaryGenre}</li>
              <li>If both fail: Best artist from any genre</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-white/9 bg-white/[0.02] text-text-body hover:bg-white/[0.045] hover:text-text-primary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!primaryGenre}
            className="bg-gradient-to-br from-action-pink to-action-purple text-white shadow-action border-0 hover:opacity-90"
          >
            Start Specialized Search
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}