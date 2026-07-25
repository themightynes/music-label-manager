import React from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronRight, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SaveCard } from './SaveCard';
import { UNKNOWN_GROUP_KEY, type SaveGroup, type SaveSummary } from './groupSaves';

interface SaveGroupListProps {
  groups: SaveGroup[];
  loading: boolean;
  deletingId: string | null;
  onLoad: (save: SaveSummary) => void;
  onFork: (save: SaveSummary) => void;
  onDelete: (save: SaveSummary) => void;
  onRename: (save: SaveSummary, name: string) => Promise<void>;
  onDeleteGroup: (group: SaveGroup) => void;
}

function GroupBody({
  group,
  loading,
  deletingId,
  onLoad,
  onFork,
  onDelete,
  onRename,
}: Omit<SaveGroupListProps, 'groups' | 'onDeleteGroup'> & { group: SaveGroup }) {
  const cardProps = (save: SaveSummary) => ({
    save,
    loading,
    deleting: deletingId === save.id,
    onLoad: () => onLoad(save),
    onFork: () => onFork(save),
    onDelete: () => onDelete(save),
    onRename: save.isAutosave ? undefined : (name: string) => onRename(save, name),
  });

  return (
    <div className="space-y-3">
      {group.manualSaves.map(save => (
        <SaveCard key={save.id} {...cardProps(save)} />
      ))}
      {group.autosaves.length > 0 && (
        <div className="border-l-2 border-white/[0.06] pl-4 space-y-2">
          <h4 className="font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(180,170,220,0.5)]">
            Autosaves
          </h4>
          {group.autosaves.map(save => (
            <SaveCard key={save.id} compact {...cardProps(save)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SaveGroupList({
  groups,
  loading,
  deletingId,
  onLoad,
  onFork,
  onDelete,
  onRename,
  onDeleteGroup,
}: SaveGroupListProps) {
  const bodyProps = { loading, deletingId, onLoad, onFork, onDelete, onRename };

  // Single playthrough: skip the group chrome entirely.
  if (groups.length === 1) {
    return <GroupBody group={groups[0]} {...bodyProps} />;
  }

  return (
    <div className="space-y-3">
      {groups.map(group => (
        <Collapsible key={group.key} defaultOpen={group.isCurrent}>
          <div className="glass-panel chromatic-hairline rounded-xl">
            <div className="flex items-center gap-2 p-4">
              <CollapsibleTrigger className="group flex flex-1 items-center justify-between gap-4 min-w-0 text-left">
                <div className="flex items-center gap-2 min-w-0">
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/50 transition-transform group-data-[state=open]:rotate-90" />
                  <span className="font-medium text-[#F7F4FB] truncate">{group.label}</span>
                  {group.isCurrent && (
                    <span className="font-mono text-[11px] px-[11px] py-[4px] rounded-pill bg-[rgba(160,90,240,0.14)] border border-[rgba(160,90,240,0.4)] text-neon-lilac shrink-0">
                      Current
                    </span>
                  )}
                </div>
                <span className="font-mono text-[11px] text-white/50 shrink-0">
                  {group.manualSaves.length + group.autosaves.length} saves ·{' '}
                  {formatDistanceToNow(new Date(group.lastPlayedAt), { addSuffix: true })}
                </span>
              </CollapsibleTrigger>
              {group.key !== UNKNOWN_GROUP_KEY && (
                <button
                  type="button"
                  onClick={() => onDeleteGroup(group)}
                  disabled={loading || deletingId !== null}
                  aria-label={`Delete playthrough ${group.label}`}
                  className="shrink-0 rounded-button p-1.5 text-white/35 hover:text-negative hover:bg-negative/[0.08] transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <CollapsibleContent className="px-4 pb-4">
              <GroupBody group={group} {...bodyProps} />
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  );
}
