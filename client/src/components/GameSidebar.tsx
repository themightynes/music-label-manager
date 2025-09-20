import { useState } from 'react';
import { useLocation } from 'wouter';
import {
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
import { UserButton, useUser } from '@clerk/clerk-react';
import {
  Home,
  Rocket,
  FastForward,
  Mic,
  Plus,
  Play,
  Save,
  Beaker,
  BarChart3,
  Users,
  Users2,
  Building2,
  Trophy,
  TrendingUp,
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
  const { user } = useUser();

  const displayName = user?.username || user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Signed in';
  const displayEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || null;

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
          {/* Group 1: Dashboard, Advance Month, Monthly Results */}
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

          {/* Group 2: The Office, Executives, Artists */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation('/office')} 
                    isActive={currentPath === '/office'}
                    tooltip="The Office"
                  >
                    <Building2 />
                    <span>The Office</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation('/executives')}
                    isActive={currentPath === '/executives'} 
                    tooltip="Executive Suite"
                  >
                    <Users2 />
                    <span>Executive Suite</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation('/artists')}
                    isActive={currentPath === '/artists' || currentPath.startsWith('/artist')}
                    tooltip="Artists"
                  >
                    <Users />
                    <span>Artists</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Group 3: Plan Release, Recording Sessions, Live Performance */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
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

          {/* Group 4: Charts */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation('/charts/top100')}
                    isActive={currentPath === '/charts/top100'}
                    tooltip="Top 100 Chart"
                  >
                    <Trophy />
                    <span>Top 100 Chart</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Group 5: Start New Game, Save Game */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
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

          <SidebarSeparator />

          {/* Group 6: Testing Tools */}
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
                  onClick={() => setLocation('/tour-variance-tester')}
                    isActive={currentPath === '/tour-variance-tester'}
                    tooltip="Tour Variance Tester"
                  >
                    <BarChart3 />
                    <span>Tour Variance Tester</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setLocation('/popularity-tester')}
                    isActive={currentPath === '/popularity-tester'}
                    tooltip="Popularity Tester"
                  >
                    <TrendingUp />
                    <span>Popularity Tester</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />


          <div className="px-3 pb-4 space-y-3">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
              <UserButton
                userProfileMode="navigation"
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'h-10 w-10',
                    userButtonTrigger: 'focus:ring-2 focus:ring-[#A75A5B] rounded-full transition-shadow',
                    userButtonPopoverCard: 'bg-[#1A111A] text-white border border-white/10 shadow-xl',
                    userButtonPopoverFooter: 'hidden',
                  },
                }}
              />
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium text-white truncate">{displayName}</p>
                {displayEmail && (
                  <p className="text-xs text-white/60 truncate">{displayEmail}</p>
                )}
              </div>
            </div>
          </div>
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
