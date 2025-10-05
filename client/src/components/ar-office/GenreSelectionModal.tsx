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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-burgundy" />
            Specialized Search - Genre Targeting
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Focus your A&R efforts on specific genres to find artists that match your label's specialization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Primary Genre Selection */}
          <div className="space-y-2">
            <Label htmlFor="primaryGenre" className="text-sm font-medium">
              Primary Genre {labelGenre && <Badge variant="outline" className="ml-2">Label Focus</Badge>}
            </Label>
            <Select value={primaryGenre} onValueChange={setPrimaryGenre}>
              <SelectTrigger id="primaryGenre">
                <SelectValue placeholder="Select target genre..." />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_GENRES.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                    {genre === labelGenre && <span className="ml-2 text-xs text-brand-burgundy">(Your Label)</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-white/60">
              {labelGenre
                ? `Defaulted to your label's genre focus: ${labelGenre}`
                : 'Select the primary genre to search for'}
            </p>
          </div>

          {/* Secondary Genre Selection (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="secondaryGenre" className="text-sm font-medium">
              Secondary Genre <span className="text-xs text-white/50">(Optional Fallback)</span>
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
            <p className="text-xs text-white/60">
              If no artists match the primary genre, search will fall back to this genre
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-white/5 border border-white/10 rounded-md p-3">
            <h4 className="text-xs font-medium text-white/80 mb-1">Search Priority:</h4>
            <ol className="text-xs text-white/60 space-y-1 list-decimal list-inside">
              <li>Primary Genre: {primaryGenre || <span className="italic">Not selected</span>}</li>
              <li>Secondary Genre: {secondaryGenre === 'none' ? <span className="italic">None</span> : secondaryGenre}</li>
              <li>If both fail: Best artist from any genre</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!primaryGenre}
            className="bg-brand-burgundy hover:bg-brand-burgundy"
          >
            Start Specialized Search
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}