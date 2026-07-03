import { ReactNode } from 'react';
import { PageBackdrop } from '@/components/ui/page-backdrop';
import { GameHeader } from '@/components/GameHeader';
import { CommandDock } from '@/components/CommandDock';

interface GameLayoutProps {
  children: ReactNode;
  onShowSaveModal?: () => void;
}

/**
 * GameLayout — v2 app shell (Design System v2 §7/§9).
 *
 * Backdrop stack → slim right-aligned header (balance / week / Advance Week) →
 * page content → floating Command Dock. The old GameSidebar is gone; navigation
 * lives in the dock, overflow actions in its "More" menu.
 */
export default function GameLayout({
  children,
  onShowSaveModal
}: GameLayoutProps) {
  return (
    <div className="relative min-h-screen">
      <PageBackdrop />

      {/* min-w-0 lets the content pane shrink below its content's intrinsic width —
          without it, wide tables push the whole page past the viewport instead of
          scrolling inside their overflow-auto wrappers.
          pb-44 keeps the floating dock from covering the end of the page. */}
      <div className="relative z-10 mx-auto w-full min-w-0 max-w-[1600px] px-4 pb-44 pt-6 sm:px-8">
        <GameHeader />
        <main className="min-w-0 pt-2">
          {children}
        </main>
      </div>

      <CommandDock onShowSaveModal={onShowSaveModal} />
    </div>
  );
}
