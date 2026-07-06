import { useState } from 'react';
import GameLayout from '@/layouts/GameLayout';
import { Button } from '@/components/ui/button';
import ActionsViewer from '@/admin/ActionsViewer';
import SideEventsEditor from '@/admin/SideEventsEditor';

// Tab shell for the Content Editor (content-editor-side-events-and-meetings plan,
// slice 3). No shadcn Tabs primitive exists in this repo yet (checked:
// client/src/components/ui/ has no tabs.tsx) — rather than add a new dependency for
// a two-tab admin page, this is a simple state + button shell matching admin styling.
// GameLayout wraps the page exactly once, here — ActionsViewer and SideEventsEditor
// are content-only components (no GameLayout of their own).
type ContentEditorTab = 'meetings' | 'side-events';

export default function ContentEditorPage() {
  const [tab, setTab] = useState<ContentEditorTab>('meetings');

  return (
    <GameLayout>
      <div className="container mx-auto px-6 pt-6">
        <h1 className="text-3xl font-bold text-white mb-4">Content Editor</h1>
        <div className="flex gap-2 border-b border-white/10 pb-2" role="tablist" aria-label="Content Editor tabs">
          <Button
            role="tab"
            aria-selected={tab === 'meetings'}
            variant={tab === 'meetings' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab('meetings')}
          >
            Meetings
          </Button>
          <Button
            role="tab"
            aria-selected={tab === 'side-events'}
            variant={tab === 'side-events' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab('side-events')}
          >
            Side Events
          </Button>
        </div>
      </div>
      {tab === 'meetings' ? <ActionsViewer /> : <SideEventsEditor />}
    </GameLayout>
  );
}
