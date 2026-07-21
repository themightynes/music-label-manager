import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Copy, Trash2, Pencil } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { SaveSummary } from './groupSaves';

interface SaveCardProps {
  save: SaveSummary;
  loading: boolean;
  deleting: boolean;
  onLoad: () => void;
  onFork: () => void;
  onDelete: () => void;
  /** When provided (manual saves only), shows the inline-rename pencil. */
  onRename?: (name: string) => Promise<void>;
  /** De-emphasized styling for autosaves inside a group's sub-cluster. */
  compact?: boolean;
}

function formatAbsoluteDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function SaveCard({
  save,
  loading,
  deleting,
  onLoad,
  onFork,
  onDelete,
  onRename,
  compact = false,
}: SaveCardProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(save.name);
  const [renaming, setRenaming] = useState(false);

  const busy = loading || deleting;

  const startEditing = () => {
    setDraftName(save.name);
    setEditing(true);
  };

  const commitRename = async () => {
    const trimmed = draftName.trim();
    if (!onRename || renaming) return;
    if (!trimmed || trimmed === save.name) {
      setEditing(false);
      return;
    }
    setRenaming(true);
    try {
      await onRename(trimmed);
      setEditing(false);
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div
      className={`rounded-xl border border-white/[0.06] bg-surface-inner/50 transition-colors hover:bg-white/[0.045] ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {editing ? (
              <Input
                autoFocus
                value={draftName}
                disabled={renaming}
                onChange={e => setDraftName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setEditing(false);
                }}
                onBlur={commitRename}
                className="h-7 max-w-[240px] text-sm"
              />
            ) : (
              <span className={`font-medium truncate ${compact ? 'text-white/60' : 'text-[#F7F4FB]'}`}>
                {save.name}
              </span>
            )}
            {save.isAutosave ? (
              <span className="font-mono text-[11px] px-[11px] py-[4px] rounded-pill bg-[rgba(55,214,255,0.1)] border border-[rgba(55,214,255,0.35)] text-neon-cyan shrink-0">
                Autosave
              </span>
            ) : (
              <span className="font-mono text-[11px] px-[11px] py-[4px] rounded-pill bg-[rgba(160,90,240,0.14)] border border-[rgba(160,90,240,0.4)] text-neon-lilac shrink-0">
                Manual
              </span>
            )}
            {onRename && !save.isAutosave && !editing && (
              <button
                type="button"
                onClick={startEditing}
                disabled={busy}
                aria-label={`Rename ${save.name}`}
                className="text-white/40 hover:text-white/80 transition-colors shrink-0"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="text-xs text-white/70 mt-1">
            Week {save.week} |{' '}
            <span className="font-mono text-money">
              ${typeof save.money === 'number' ? save.money.toLocaleString() : '--'}
            </span>{' '}
            | Rep {typeof save.reputation === 'number' ? save.reputation : '--'}
          </div>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="font-mono text-[11px] text-white/50 mt-1 w-fit cursor-default">
                  Saved {formatDistanceToNow(new Date(save.updatedAt), { addSuffix: true })}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">{formatAbsoluteDate(save.updatedAt)}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={onLoad}
            disabled={busy}
            className="text-xs rounded-button border-[rgba(55,214,255,0.35)] bg-[rgba(55,214,255,0.06)] text-neon-cyan hover:bg-[rgba(55,214,255,0.12)] hover:text-neon-cyan"
          >
            {loading ? 'Loading...' : 'Load'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onFork}
            disabled={busy}
            className="text-xs rounded-button border-white/[0.09] bg-white/[0.02] text-white/75 hover:bg-white/[0.06] hover:text-white"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            disabled={busy}
            className="text-xs rounded-button border-negative/40 bg-negative/[0.08] text-negative hover:bg-negative/[0.16] hover:text-negative"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}
