import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  useSidebar,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/store/gameStore';
import { useGameContext } from '@/contexts/GameContext';
import { ConfirmDialog } from './ConfirmDialog';
import { MonthSummary } from './MonthSummary';
import {
  Home,
  Rocket,
  FastForward,
  Mic,
  Plus,
  FileText,
  Play,
  Save,
  Beaker,
  BarChart3
} from 'lucide-react';

interface GameSidebarProps {
  onShowProjectModal?: () => void;
  onShowLivePerformanceModal?: () => void;
  onShowSaveModal?: () => void;
}

export function GameSidebar({
  onShowProjectModal,
  onShowLivePerformanceModal,
  onShowSaveModal
}: GameSidebarProps) {
  const [location, setLocation] = useLocation();
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [showMonthSummary, setShowMonthSummary] = useState(false);
  const { setGameId } = useGameContext();
  const {
    gameState,
    selectedActions,
    isAdvancingMonth,
    advanceMonth,
    createNewGame,
    monthlyOutcome
  } = useGameStore();

  const handleAdvanceMonth = async () => {
    try {
      await advanceMonth();
    } catch (error) {
      console.error('Failed to advance month:', error);
    }
  };

  const handleNewGame = async () => {
    if (gameState?.currentMonth && gameState.currentMonth > 1) {
      setShowNewGameConfirm(true);
    } else {
      await confirmNewGame();
    }
  };

  const confirmNewGame = async () => {
    try {
      const newGame = await createNewGame('standard');
      setGameId(newGame.id);
      setShowNewGameConfirm(false);
      setLocation('/');
    } catch (error) {
      console.error('Failed to start new game:', error);
    }
  };

  const currentPath = location;

  return (
    <>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader>
          <div className="flex items-center space-x-3 p-2">
            <img
              src="/logo4.png"
              alt="Music Label Manager"
              className="h-8 w-auto"
            />
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <div className="text-sm font-semibold text-sidebar-foreground">Music Label</div>
              <div className="flex items-center space-x-2 text-xs text-sidebar-foreground/70">
                <span>Month {gameState?.currentMonth || 1}/36</span>
                <span className="text-green-400">${(gameState?.money || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation('/')}
                    isActive={currentPath === '/'}
                    tooltip="Dashboard"
                  >
                    <Home />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation('/plan-release')}
                    isActive={currentPath === '/plan-release'}
                    tooltip="Plan Release"
                  >
                    <Rocket />
                    <span>Plan Release</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setShowMonthSummary(true)}
                    disabled={!monthlyOutcome}
                    tooltip={monthlyOutcome ? "Monthly Results" : "Advance a month to view results"}
                  >
                    <BarChart3 />
                    <span>Monthly Results</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={handleAdvanceMonth}
                    disabled={selectedActions.length === 0 || isAdvancingMonth}
                    tooltip="Advance Month"
                  >
                    <FastForward />
                    <span>{isAdvancingMonth ? 'Processing...' : 'Advance Month'}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => onShowProjectModal ? onShowProjectModal() : setLocation('/?open=recording')}
                    tooltip="Recording Session"
                  >
                    <Plus />
                    <span>Recording Session</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => onShowLivePerformanceModal ? onShowLivePerformanceModal() : setLocation('/?open=tour')}
                    tooltip="Live Performance"
                  >
                    <Mic />
                    <span>Live Performance</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation('/quality-tester')}
                    isActive={currentPath === '/quality-tester'}
                    tooltip="Quality Tester"
                  >
                    <Beaker />
                    <span>Quality Tester</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={handleNewGame}
                    tooltip="Start New Game"
                  >
                    <Play />
                    <span>Start New Game</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => onShowSaveModal ? onShowSaveModal() : setLocation('/?open=save')}
                    tooltip="Save Game"
                  >
                    <Save />
                    <span>Save Game</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* New Game Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showNewGameConfirm}
        onClose={() => setShowNewGameConfirm(false)}
        onConfirm={confirmNewGame}
        title="Start New Game?"
        description="This will permanently delete your current progress.\nAre you sure you want to continue?"
        confirmText="Start New Game"
        cancelText="Cancel"
        variant="destructive"
        emoji="⚠️"
        currentMonth={gameState?.currentMonth}
      />

      {/* Monthly Results Modal */}
      {showMonthSummary && monthlyOutcome && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowMonthSummary(false)}
        >
          <div
            className="bg-[#2C222A] border border-[#4e324c] rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <MonthSummary
              monthlyStats={monthlyOutcome}
              onAdvanceMonth={() => setShowMonthSummary(false)}
              isMonthResults={true}
              onClose={() => setShowMonthSummary(false)}
            />
          </div>
        </div>
      )}

      {/* No Results Available Modal */}
      {showMonthSummary && !monthlyOutcome && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2C222A] border border-[#4e324c] rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-white mb-2">No Monthly Results</h3>
              <p className="text-sm text-white/70 mb-6">
                Monthly results will be available after advancing to the next month.
              </p>
              <Button
                onClick={() => setShowMonthSummary(false)}
                className="bg-[#A75A5B] hover:bg-[#D99696] text-white border-0"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}