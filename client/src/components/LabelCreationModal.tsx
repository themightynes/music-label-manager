import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Shuffle, Music } from "lucide-react";
import type { LabelData } from "@shared/types/gameTypes";

interface LabelCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateLabel: (labelData: LabelData) => void;
  isCreating?: boolean;
}

const suggestedNames = [
  "Midnight Records",
  "Sonic Boom Entertainment",
  "Velvet Sound Studios",
  "Neon Dreams Music",
  "Aurora Music Group",
  "Crimson Wave Records",
  "Electric Pulse Entertainment",
  "Silver Moon Studios"
];

const genreOptions = [
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

const prefixes = ["Sonic", "Midnight", "Crystal", "Electric", "Golden", "Silver", "Neon", "Aurora", "Crimson", "Velvet"];
const suffixes = ["Records", "Entertainment", "Studios", "Music", "Sound", "Group", "Label", "Productions"];

export function LabelCreationModal({ open, onOpenChange, onCreateLabel, isCreating = false }: LabelCreationModalProps) {
  const [labelName, setLabelName] = useState("");
  const [description, setDescription] = useState("");
  const [genreFocus, setGenreFocus] = useState("");
  const [startingYear, setStartingYear] = useState<number>(new Date().getFullYear());
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset form state when modal closes
useEffect(() => {
    if (!open) {
      setLabelName("");
      setDescription("");
      setGenreFocus("");
      setStartingYear(new Date().getFullYear());
      setErrors({});
    }
  }, [open]);

  const validateLabelName = (name: string): string | null => {
    if (!name.trim()) {
      return "Label name is required";
    }
    if (name.length < 1 || name.length > 50) {
      return "Label name must be between 1 and 50 characters";
    }
    if (!/^[a-zA-Z0-9\s\-']+$/.test(name)) {
      return "Label name can only contain letters, numbers, spaces, hyphens, and apostrophes";
    }
    return null;
  };

  const generateRandomName = () => {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const randomName = `${prefix} ${suffix}`;
    setLabelName(randomName);

    // Clear any existing errors when setting a valid random name
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: "" }));
    }
  };

  const handleSuggestedNameClick = (name: string) => {
    setLabelName(name);

    // Clear any existing errors when setting a valid suggested name
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: "" }));
    }
  };

  const handleLabelNameChange = (value: string) => {
    setLabelName(value);

    // Real-time validation
    const error = validateLabelName(value);
    setErrors(prev => ({ ...prev, name: error || "" }));
  };

const handleSubmit = () => {
    const nameError = validateLabelName(labelName);

    if (nameError) {
      setErrors({ name: nameError });
      return;
    }

    // Basic year validation
    const minYear = 1900;
    const maxYear = 2100;
    const year = Number(startingYear);
    if (!Number.isInteger(year) || year < minYear || year > maxYear) {
      setErrors(prev => ({ ...prev, year: `Starting year must be between ${minYear} and ${maxYear}` }));
      return;
    }

    const labelData: LabelData = {
      name: labelName.trim(),
      description: description.trim() || undefined,
      genreFocus: genreFocus || undefined,
      foundedYear: year,
    };

    onCreateLabel(labelData);
  };

  const isFormValid = !validateLabelName(labelName) && labelName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={isCreating ? undefined : onOpenChange}>
      <DialogContent
        className={`max-w-md bg-brand-dark-card border-brand-purple text-white ${
          isCreating ? '[&>button]:hidden' : ''
        }`}
        onEscapeKeyDown={(e) => {
          if (isCreating) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          if (isCreating) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="border-b border-brand-purple pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Music className="w-5 h-5 text-brand-burgundy" />
            Create Your Music Label
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Quick Start Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-300">Quick Start</Label>
            <div className="grid grid-cols-2 gap-2">
              {suggestedNames.slice(0, 4).map((name) => (
                <Button
                  key={name}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSuggestedNameClick(name)}
                  disabled={isCreating}
                  className="text-xs h-8 bg-brand-dark-card hover:bg-brand-dark-card border border-brand-purple text-gray-300 hover:text-white"
                >
                  {name}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateRandomName}
              disabled={isCreating}
              className="w-full h-8 bg-brand-dark-card hover:bg-brand-dark-card border-brand-purple text-gray-300 hover:text-white"
            >
              <Shuffle className="w-3 h-3 mr-2" />
              Random Name
            </Button>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Label Name */}
            <div className="space-y-2">
              <Label htmlFor="labelName" className="text-sm font-medium text-gray-300">
                Label Name <span className="text-brand-burgundy">*</span>
              </Label>
              <Input
                id="labelName"
                value={labelName}
                onChange={(e) => handleLabelNameChange(e.target.value)}
                placeholder="Enter your label name..."
                disabled={isCreating}
                className="bg-brand-dark-card border-brand-purple text-white placeholder-gray-500 focus:border-brand-burgundy"
              />
              {errors.name && (
                <p className="text-red-400 text-xs">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-300">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell the story of your label..."
                disabled={isCreating}
                rows={3}
                className="bg-brand-dark-card border-brand-purple text-white placeholder-gray-500 focus:border-brand-burgundy resize-none"
              />
            </div>

{/* Genre Focus */}
            <div className="space-y-2">
              <Label htmlFor="genreFocus" className="text-sm font-medium text-gray-300">
                Genre Focus
              </Label>
              <Select value={genreFocus} onValueChange={setGenreFocus} disabled={isCreating}>
                <SelectTrigger className="bg-brand-dark-card border-brand-purple text-white focus:border-brand-burgundy">
                  <SelectValue placeholder="Select a genre (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-brand-dark-card border-brand-purple">
                  {genreOptions.map((genre) => (
                    <SelectItem
                      key={genre}
                      value={genre}
                      className="text-white hover:bg-brand-dark-card focus:bg-brand-dark-card"
                    >
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Starting Year */}
            <div className="space-y-2">
              <Label htmlFor="startingYear" className="text-sm font-medium text-gray-300">
                Starting Year <span className="text-white/50 text-xs">(for calendar-based weeks)</span>
              </Label>
              <Input
                id="startingYear"
                type="number"
                min={1900}
                max={2100}
                value={startingYear}
                onChange={(e) => setStartingYear(Number(e.target.value))}
                disabled={isCreating}
                className="bg-brand-dark-card border-brand-purple text-white placeholder-gray-500 focus:border-brand-burgundy"
              />
              {errors.year && (
                <p className="text-red-400 text-xs">{errors.year}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
              className="flex-1 bg-brand-dark-card hover:bg-brand-dark-card border-brand-purple text-gray-300 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSubmit}
              disabled={!isFormValid || isCreating}
              className="flex-1"
            >
              {isCreating ? "Creating..." : "Create Label"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}