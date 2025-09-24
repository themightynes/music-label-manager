import { useState } from 'react';
import { useLocation } from 'wouter';
import { fetchExecutives, fetchRoleMeetings } from '@/services/executiveService';
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
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useGameStore } from '@/store/gameStore';
import { useGameContext } from '@/contexts/GameContext';
import { ConfirmDialog } from './ConfirmDialog';
import { WeekSummary } from './WeekSummary';
import { LabelCreationModal } from './LabelCreationModal';
import type { LabelData } from '@shared/types/gameTypes';
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
  Zap,
  Settings,
} from 'lucide-react';

interface GameSidebarProps {
  onShowSaveModal?: () => void;
}

export function GameSidebar({
  onShowSaveModal
}: GameSidebarProps) {
  const [location, setLocation] = useLocation();
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [showWeekSummary, setShowWeekSummary] = useState(false);
  const { setGameId } = useGameContext();
  const {
    gameState,
    selectedActions,
    isAdvancingWeek,
    advanceWeek,
    createNewGame,
    weeklyOutcome,
    selectAction
  } = useGameStore();
  const { user } = useUser();
  const { gameId } = useGameContext();
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  // Simple AUTO function for sidebar
  const handleAutoSelect = async () => {
    if (!gameId || isAutoSelecting) return;

    setIsAutoSelecting(true);
    try {
      console.log('[SIDEBAR AUTO] Starting auto-selection...');

      // Fetch executives and meetings
      const executives = await fetchExecutives(gameId);
      const roles = ['ceo', 'head_ar', 'cmo', 'cco', 'head_distribution'];
      const allMeetings: Record<string, any[]> = {};

      for (const role of roles) {
        try {
          allMeetings[role] = await fetchRoleMeetings(role);
        } catch (error) {
          allMeetings[role] = [];
        }
      }

      // Score and select top options
      const options: any[] = [];
      executives.forEach(executive => {
        const meetings = allMeetings[executive.role as keyof typeof allMeetings] || [];
        if (meetings.length > 0) {
          const meeting = meetings[0];
          if (meeting.choices && meeting.choices.length > 0) {
            const choice = meeting.choices[0];

            const roleScores = {
              'ceo': 50, 'head_ar': 40, 'cmo': 30, 'cco': 20, 'head_distribution': 10
            };

            const score = (100 - (executive.mood || 50)) + (100 - (executive.loyalty || 50)) + (roleScores[executive.role as keyof typeof roleScores] || 0);

            const actionData = {
              roleId: executive.role,
              actionId: meeting.id,
              choiceId: choice.id,
              ...(executive.role !== 'ceo' && { executiveId: executive.id })
            };

            options.push({ score, actionData });
          }
        }
      });

      // Select top options for remaining slots
      const remainingSlots = (gameState?.focusSlots || 3) - (gameState?.usedFocusSlots || 0);
      const topOptions = options.sort((a, b) => b.score - a.score).slice(0, remainingSlots);

      // Apply selections
      for (const option of topOptions) {
        await selectAction(JSON.stringify(option.actionData));
      }

      console.log(`[SIDEBAR AUTO] Selected ${topOptions.length} actions`);
    } catch (error) {
      console.error('[SIDEBAR AUTO] Error:', error);
    } finally {
      setIsAutoSelecting(false);
    }
  };

  const displayName = user?.username || user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Signed in';
  const displayEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || null;

  const handleAdvanceWeek = async () => {
    try {
      await advanceWeek();
    } catch (error) {
      console.error('Failed to advance week:', error);
    }
  };

  const handleNewGame = async () => {
    if (gameState?.currentWeek && gameState.currentWeek > 1) {
      setShowNewGameConfirm(true);
    } else {
      setShowLabelModal(true);
    }
  };

  const handleCreateLabel = async (labelData: LabelData) => {
    try {
      setIsCreatingGame(true);
      const newGame = await createNewGame('standard', labelData);
      setGameId(newGame.id);
      setShowLabelModal(false);
      setShowNewGameConfirm(false);
      setLocation('/');
    } catch (error) {
      console.error('Failed to start new game:', error);
    } finally {
      setIsCreatingGame(false);
    }
  };

  const confirmNewGame = async () => {
    setShowNewGameConfirm(false);
    setShowLabelModal(true);
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
              <div className="text-sm font-semibold text-sidebar-foreground">{(gameState as any)?.musicLabel?.name || 'Music Label'}</div>
              <div className="flex items-center space-x-2 text-xs text-sidebar-foreground/70">
                <span>Week {gameState?.currentWeek || 1}/52</span>
                <span className="text-green-400">${(gameState?.money || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {/* Group 1: Dashboard, Advance Week, Weekly Results */}
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
                    onClick={handleAdvanceWeek}
                    disabled={selectedActions.length === 0 || isAdvancingWeek}
                    tooltip="Advance Week"
                  >
                    <FastForward />
                    <span>{isAdvancingWeek ? 'Processing...' : 'Advance Week'}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setShowWeekSummary(true)}
                    disabled={!weeklyOutcome}
                    tooltip={weeklyOutcome ? "Weekly Results" : "Advance a week to view results"}
                  >
                    <BarChart3 />
                    <span>Weekly Results</span>
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
                  <div className="flex items-center">
                    <SidebarMenuButton
                      onClick={() => setLocation('/executives')}
                      isActive={currentPath === '/executives'}
                      tooltip="Executive Suite"
                      className="flex-1"
                    >
                      <Users2 />
                      <span>Executive Suite</span>
                    </SidebarMenuButton>

                    {((gameState?.focusSlots || 3) - (gameState?.usedFocusSlots || 0)) > 0 && (
                      <HoverCard openDelay={300}>
                        <HoverCardTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-1 px-2 h-6 text-xs bg-burgundy-600/20 border-burgundy-400/30 hover:bg-burgundy-600/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAutoSelect();
                            }}
                            disabled={isAutoSelecting}
                          >
                            {isAutoSelecting ? (
                              <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Zap className="h-3 w-3" />
                            )}
                          </Button>
                        </HoverCardTrigger>
                        <HoverCardContent
                          side="right"
                          className="w-48 border-burgundy-600/50 text-white shadow-xl"
                          style={{ backgroundColor: '#1d0e18' }}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Zap className="h-3.5 w-3.5 text-yellow-400" />
                              <span className="font-medium text-sm">AUTO</span>
                            </div>
                            <p className="text-xs text-white/80">
                              Smart-fills {(gameState?.focusSlots || 3) - (gameState?.usedFocusSlots || 0)} slot{((gameState?.focusSlots || 3) - (gameState?.usedFocusSlots || 0)) !== 1 ? 's' : ''} with executives who need attention most.
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )}
                  </div>
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
                    onClick={() => setLocation('/recording-session')}
                    isActive={currentPath === '/recording-session'}
                    tooltip="Recording Session"
                  >
                    <Plus />
                    <span>Recording Session</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation('/live-performance')}
                    isActive={currentPath === '/live-performance'}
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setLocation('/markets-editor')}
                    isActive={currentPath === '/markets-editor'}
                    tooltip="Markets.json Editor"
                  >
                    <Settings />
                    <span>Markets Editor</span>
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
                userProfileUrl="/user-profile"
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
        currentWeek={gameState?.currentWeek ?? 1}
      />

      {/* Weekly Results Modal */}
      {showWeekSummary && weeklyOutcome && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowWeekSummary(false)}
        >
          <div
            className="bg-[#2C222A] border border-[#4e324c] rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <WeekSummary
              weeklyStats={weeklyOutcome}
              onAdvanceWeek={() => setShowWeekSummary(false)}
              isWeekResults={true}
              onClose={() => setShowWeekSummary(false)}
            />
          </div>
        </div>
      )}

      {/* No Results Available Modal */}
      {showWeekSummary && !weeklyOutcome && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2C222A] border border-[#4e324c] rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-white mb-2">No Weekly Results</h3>
              <p className="text-sm text-white/70 mb-6">
                Weekly results will be available after advancing to the next week.
              </p>
              <Button
                onClick={() => setShowWeekSummary(false)}
                className="bg-[#A75A5B] hover:bg-[#D99696] text-white border-0"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <LabelCreationModal
        open={showLabelModal}
        onOpenChange={setShowLabelModal}
        onCreateLabel={handleCreateLabel}
        isCreating={isCreatingGame}
      />
    </>
  );
}
