import { useState } from 'react';
import { useLocation } from 'wouter';
import { fetchExecutives, fetchRoleMeetings } from '@/services/executiveService';
import { prepareAutoSelectOptions, selectTopOptions, optionToActionData } from '@/services/executiveAutoSelect';
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
import { TooltipProvider } from '@/components/ui/tooltip';
import { useGameStore } from '@/store/gameStore';
import { useGameContext } from '@/contexts/GameContext';
import { ConfirmDialog } from './ConfirmDialog';
import { WeekSummary } from './WeekSummary';
import { LabelCreationModal } from './LabelCreationModal';
import { BugReportModal } from './BugReportModal';
import type { LabelData } from '@shared/types/gameTypes';
import { UserButton, useUser } from '@clerk/clerk-react';
import { useIsAdmin } from '@/auth/useCurrentUser';
import { toast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { formatWeekEndDate } from '@shared/utils/seasonalCalculations';
import {
  Home,
  Rocket,
  FastForward,
  Mic,
  Plus,
  Play,
  Save,
  BarChart3,
  Users,
  Users2,
  Building2,
  Trophy,
  Zap,
  Search,
  Shield,
  Bug,
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
  const [showBugReportModal, setShowBugReportModal] = useState(false);
  const { isAdmin } = useIsAdmin();

  // Simple AUTO function for sidebar (using shared service)
  const handleAutoSelect = async () => {
    if (!gameId || isAutoSelecting) return;

    setIsAutoSelecting(true);
    try {
      logger.debug('[SIDEBAR AUTO] Starting auto-selection...');

      // Fetch executives and meetings
      const executives = await fetchExecutives(gameId);
      const roles = ['ceo', 'head_ar', 'cmo', 'cco', 'head_distribution'];
      const meetingsByRole: Record<string, any[]> = {};
      const currentWeek = gameState?.currentWeek || 1;

      for (const role of roles) {
        try {
          // Pass gameId and currentWeek for weekly meeting randomization
          meetingsByRole[role] = await fetchRoleMeetings(role, gameId, currentWeek);
        } catch (error) {
          meetingsByRole[role] = [];
        }
      }

      // Use shared auto-select logic
      const options = prepareAutoSelectOptions(executives, meetingsByRole);
      const availableSlots = (gameState?.focusSlots || 3) - (gameState?.usedFocusSlots || 0);
      const topOptions = selectTopOptions(options, availableSlots);

      // Apply selections
      for (const option of topOptions) {
        const actionData = optionToActionData(option);
        await selectAction(JSON.stringify(actionData));
      }

      logger.debug(`[SIDEBAR AUTO] Selected ${topOptions.length} actions`);

      // Success toast
      if (topOptions.length > 0) {
        toast({
          title: "Auto-select complete",
          description: `Selected ${topOptions.length} meeting${topOptions.length !== 1 ? 's' : ''} for executives who need attention.`,
          duration: 3000,
        });
      } else {
        toast({
          title: "No meetings available",
          description: "All eligible executives have been assigned or no meetings are available.",
          variant: "default",
          duration: 3000,
        });
      }
    } catch (error) {
      logger.error('[SIDEBAR AUTO] Error:', error);
      toast({
        title: "Auto-select failed",
        description: error instanceof Error ? error.message : "Failed to auto-select executive meetings. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
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
      logger.error('Failed to advance week:', error);
      toast({
        title: "Failed to advance week",
        description: error instanceof Error ? error.message : "An error occurred while advancing the week. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
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
      setLocation('/game');
    } catch (error) {
      logger.error('Failed to start new game:', error);
      toast({
        title: "Failed to create new game",
        description: error instanceof Error ? error.message : "An error occurred while creating your new game. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
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
    <TooltipProvider>
      <>
        <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader>
          <div className="flex items-center space-x-3 p-2">
            <img
              src="/logo4.png"
              alt="Music Label Manager"
              className="h-8 w-auto object-contain group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
            />
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <div className="text-sm font-heading font-semibold text-sidebar-foreground">{(gameState as any)?.musicLabel?.name || 'Music Label'}</div>
              <div className="flex items-center space-x-2 text-xs text-sidebar-foreground/70">
                <span>
                  {(() => {
                    const week = gameState?.currentWeek || 1;
                    const startYear = (gameState as any)?.musicLabel?.foundedYear || new Date().getFullYear();
                    return formatWeekEndDate(startYear, week);
                  })()}
                </span>
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
                    onClick={() => setLocation('/game')}
                    isActive={currentPath === '/game'}
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
                      <div className="ml-1 group-data-[collapsible=icon]:hidden">
                        <HoverCard openDelay={300}>
                          <HoverCardTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="px-2 h-6 text-xs bg-burgundy-600/20 border-burgundy-400/30 hover:bg-burgundy-600/30"
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
                            className="w-48 bg-brand-dark border-burgundy-600/50 text-white shadow-xl"
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
                      </div>
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

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation('/ar-office')}
                    isActive={currentPath === '/ar-office' || currentPath.startsWith('/ar-office/')}
                    tooltip="A&R Office"
                  >
                    <Search />
                    <span>A&R Office</span>
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

          {/* Group 5: Main Menu, Save/Load Game */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation('/')}
                    tooltip="Main Menu"
                  >
                    <Play />
                    <span>Main Menu</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => onShowSaveModal ? onShowSaveModal() : setLocation('/?open=save')}
                    tooltip="Save/Load Game"
                  >
                    <Save />
                    <span>Save/Load Game</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setShowBugReportModal(true)}
                    tooltip="Report a Bug"
                  >
                    <Bug />
                    <span>Report a Bug</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Admin entry */}
          {isAdmin && (
            <>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setLocation('/admin')}
                        isActive={currentPath === '/admin' || currentPath.startsWith('/admin/')}
                        tooltip="Admin Tools"
                      >
                        <Shield />
                        <span>Admin</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarSeparator />
            </>
          )}


          <div className="px-3 pb-4 space-y-3">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
              <UserButton
                userProfileMode="navigation"
                userProfileUrl="/user-profile"
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'h-10 w-10',
                    userButtonTrigger: 'focus:ring-2 focus:ring-brand-burgundy rounded-full transition-shadow',
                    userButtonPopoverCard: 'bg-brand-dark text-white border border-white/10 shadow-xl',
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
            className="bg-brand-dark-card border border-brand-purple rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
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
          <div className="bg-brand-dark-card border border-brand-purple rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-white mb-2">No Weekly Results</h3>
              <p className="text-sm text-white/70 mb-6">
                Weekly results will be available after advancing to the next week.
              </p>
              <Button
                onClick={() => setShowWeekSummary(false)}
                className="bg-brand-burgundy hover:bg-brand-rose text-white border-0"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <BugReportModal
        open={showBugReportModal}
        onOpenChange={setShowBugReportModal}
        gameId={gameId}
        currentWeek={gameState?.currentWeek ?? null}
        defaultContactEmail={displayEmail}
      />

      <LabelCreationModal
        open={showLabelModal}
        onOpenChange={setShowLabelModal}
        onCreateLabel={handleCreateLabel}
        isCreating={isCreatingGame}
      />
      </>
    </TooltipProvider>
  );
}
