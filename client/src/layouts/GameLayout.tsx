import { ReactNode } from 'react';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { GameSidebar } from '@/components/GameSidebar';

interface GameLayoutProps {
  children: ReactNode;
  onShowProjectModal?: () => void;
  onShowLivePerformanceModal?: () => void;
  onShowSaveModal?: () => void;
}

export default function GameLayout({
  children,
  onShowProjectModal,
  onShowLivePerformanceModal,
  onShowSaveModal
}: GameLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <GameSidebar
        onShowProjectModal={onShowProjectModal}
        onShowLivePerformanceModal={onShowLivePerformanceModal}
        onShowSaveModal={onShowSaveModal}
      />
      <SidebarInset className="bg-transparent">
        <div className="flex-1 p-0 min-h-screen bg-transparent">
          <div className="flex items-center gap-2 p-4 border-b border-[#D99696]/30">
            <SidebarTrigger className="h-4 w-4 text-white hover:bg-white/10" />
          </div>
          <main className="flex-1 bg-transparent">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}