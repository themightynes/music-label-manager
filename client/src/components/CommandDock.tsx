import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { UserButton, useUser } from '@clerk/clerk-react';
import { useIsAdmin } from '@/auth/useCurrentUser';
import { useGameStore } from '@/store/gameStore';
import { useGameState } from '@/hooks/useGameState';
import { useGameContext } from '@/contexts/GameContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HoloDisc } from '@/components/ui/holo-disc';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { WeekSummary } from './WeekSummary';
import { BugReportModal } from './BugReportModal';
import { audioManager, type AudioSettings } from '@/lib/audio';
import {
  UserRound,
  Building2,
  Users,
  Disc3,
  Rocket,
  SlidersHorizontal,
  Trophy,
  MoreHorizontal,
  BarChart3,
  Mic,
  Play,
  Save,
  Bug,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CommandDockProps {
  onShowSaveModal?: () => void;
}

interface DockNavItem {
  label: string;
  icon: LucideIcon;
  path: string;
  isActive: (path: string) => boolean;
  /** cyan glow notification dot (spec §7) */
  showDot?: boolean;
}

/** 46px icon button inside the dock pill, with tooltip + active treatment (spec §7). */
function DockItem({
  label,
  active = false,
  showDot = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  showDot?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          onClick={onClick}
          className={
            'relative flex h-[46px] w-[46px] items-center justify-center rounded-button transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
            (active
              ? 'bg-gradient-to-r from-neon-purple/25 to-neon-cyan/5 text-neon-lilac shadow-glow-purple'
              : 'text-white/60 hover:bg-white/[0.08] hover:text-white')
          }
        >
          {children}
          {showDot && (
            <span
              aria-hidden="true"
              className="absolute right-2 top-[5px] h-[7px] w-[7px] rounded-full bg-neon-cyan shadow-glow-cyan"
            />
          )}
          {active && (
            <span
              aria-hidden="true"
              className="absolute -bottom-[9px] left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-neon-lilac shadow-glow-lilac"
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={10} className="text-[11.5px] font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * CommandDock — the fixed bottom-center floating pill navigation (Design System v2 §7).
 * Replaces the old GameSidebar; all sidebar behaviors are re-homed here, in the
 * "More" overflow menu, or in GameHeader (Advance Week / balance / week-date).
 */
export function CommandDock({ onShowSaveModal }: CommandDockProps) {
  const [location, setLocation] = useLocation();
  const gameState = useGameState();
  const { weeklyOutcome, selectedActions } = useGameStore();
  const { gameId } = useGameContext();
  const { user } = useUser();
  const { isAdmin } = useIsAdmin();

  const [showWeekSummary, setShowWeekSummary] = useState(false);
  const [showBugReportModal, setShowBugReportModal] = useState(false);

  // Phase 4 PR-7: ambient HoloDisc pulse — pure garnish, no gameplay effect.
  // Two independent triggers, each a simple on/~duration/off timer:
  //  (1) a NEW weeklyOutcome lands (tracked by week number) carrying a
  //      hero/notable change or chart update -> pulse for ~6s.
  //  (2) the player grows their selectedActions -> a brief ~1s acknowledgment
  //      pulse. Both share one `pulse` boolean; whichever fires last wins the
  //      dock's visual state (deliberately simple).
  const [pulse, setPulse] = useState(false);
  const lastPulsedWeekRef = useRef<number | null>(null);
  const prevSelectedCountRef = useRef(selectedActions.length);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const firePulse = (durationMs: number) => {
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    setPulse(true);
    pulseTimeoutRef.current = setTimeout(() => {
      setPulse(false);
      pulseTimeoutRef.current = null;
    }, durationMs);
  };

  useEffect(() => {
    const week = weeklyOutcome?.week;
    if (typeof week !== 'number' || week === lastPulsedWeekRef.current) return;
    lastPulsedWeekRef.current = week;

    const changes = Array.isArray(weeklyOutcome?.changes) ? weeklyOutcome.changes : [];
    const chartUpdates = Array.isArray(weeklyOutcome?.chartUpdates) ? weeklyOutcome.chartUpdates : [];
    const isNotable = (entry: any) =>
      entry?.importance === 'hero'
      || entry?.importance === 'notable'
      || (entry?.importance === undefined && entry?.type === 'unlock');

    const hasNotableMoment = changes.some(isNotable) || chartUpdates.some(isNotable);
    if (hasNotableMoment) firePulse(6000);
  }, [weeklyOutcome]);

  useEffect(() => {
    if (selectedActions.length > prevSelectedCountRef.current) {
      firePulse(1000);
    }
    prevSelectedCountRef.current = selectedActions.length;
  }, [selectedActions.length]);

  useEffect(() => () => {
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
  }, []);

  // Phase 4 PR-6: sound settings (mute + volume), independent of the motion
  // preference. Local state mirrors the audio manager's persisted settings so
  // the More-menu control re-renders when either changes.
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => audioManager.getSettings());
  useEffect(() => audioManager.subscribe(setAudioSettings), []);

  const displayName =
    user?.username || user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Signed in';
  const displayEmail =
    user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || null;

  const freeFocusSlots =
    (gameState?.focusSlots || 3) - (gameState?.usedFocusSlots || 0);

  const leftItems: DockNavItem[] = [
    {
      label: 'Executive Suite',
      icon: UserRound,
      path: '/executives',
      isActive: (p) => p === '/executives',
      // Same indicator condition the sidebar used for its AUTO affordance:
      // free focus slots remain → executives still need attention this week.
      showDot: freeFocusSlots > 0,
    },
    {
      label: 'The Office',
      icon: Building2,
      path: '/office',
      isActive: (p) => p === '/office',
    },
    {
      label: 'Artists',
      icon: Users,
      path: '/artists',
      isActive: (p) => p === '/artists' || p.startsWith('/artist'),
    },
    {
      label: 'A&R Office',
      icon: Disc3,
      path: '/ar-office',
      isActive: (p) => p === '/ar-office' || p.startsWith('/ar-office/'),
    },
    {
      label: 'Top 100 Chart',
      icon: Trophy,
      path: '/charts/top100',
      isActive: (p) => p === '/charts/top100',
    },
  ];

  // Action trio grouped together (user request): plan → record → perform
  const rightItems: DockNavItem[] = [
    {
      label: 'Plan Release',
      icon: Rocket,
      path: '/plan-release',
      isActive: (p) => p === '/plan-release',
    },
    {
      label: 'Recording Session',
      icon: SlidersHorizontal,
      path: '/recording-session',
      isActive: (p) => p === '/recording-session',
    },
    {
      label: 'Live Performance',
      icon: Mic,
      path: '/live-performance',
      isActive: (p) => p === '/live-performance',
    },
  ];

  const moreIsActive = location === '/admin' || location.startsWith('/admin/');

  return (
    <TooltipProvider delayDuration={150}>
      <nav
        aria-label="Command dock"
        className="fixed bottom-7 left-1/2 z-20 -translate-x-1/2"
      >
        {/* purple under-glow blob */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[30px] left-1/2 h-[120px] w-[560px] -translate-x-1/2 opacity-50 blur-[50px]"
          style={{
            background:
              'radial-gradient(circle at 50% 60%, rgba(160,90,240,1) 0%, rgba(160,90,240,0) 70%)',
          }}
        />

        {/* the pill */}
        <div
          className="relative flex items-center gap-2 rounded-pill border border-white/[0.12] px-[18px] py-[11px] shadow-dock backdrop-blur-[20px]"
          style={{ background: 'rgba(18,14,32,0.72)' }}
        >
          {/* chromatic hairline, inset 24px (spec §7) */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-6 right-6 top-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,77,141,0.5), rgba(160,90,240,0.6), rgba(55,214,255,0.5), transparent)',
            }}
          />

          {/* left cluster */}
          {leftItems.map((item) => (
            <DockItem
              key={item.path}
              label={item.label}
              active={item.isActive(location)}
              showDot={item.showDot}
              onClick={() => setLocation(item.path)}
            >
              <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </DockItem>
          ))}

          {/* center: 60px holo disc elevated -26px = Dashboard / Home */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Dashboard · Home"
                aria-current={location === '/game' ? 'page' : undefined}
                onClick={() => setLocation('/game')}
                className="relative mx-2 -mt-[26px] rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* pulsing ring glow (ds-ring keyframes bake in the centering translate) */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[108px] w-[108px] -translate-x-1/2 -translate-y-1/2 animate-ds-ring rounded-full blur-[12px]"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(160,90,240,0.55) 0%, rgba(160,90,240,0.28) 42%, rgba(160,90,240,0) 72%)',
                  }}
                />
                <HoloDisc
                  size={60}
                  spinSeconds={12}
                  pulse={pulse}
                  className="relative"
                  style={{
                    boxShadow:
                      '0 0 0 2px rgba(160,90,240,0.65), 0 0 30px rgba(160,90,240,0.5)',
                  }}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={16} className="text-[11.5px] font-medium">
              Dashboard · Home
            </TooltipContent>
          </Tooltip>

          {/* right cluster */}
          {rightItems.map((item) => (
            <DockItem
              key={item.path}
              label={item.label}
              active={item.isActive(location)}
              onClick={() => setLocation(item.path)}
            >
              <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </DockItem>
          ))}

          {/* More — overflow menu for everything else the sidebar had */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="More"
                    className={
                      'relative flex h-[46px] w-[46px] items-center justify-center rounded-button transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-white/[0.08] data-[state=open]:text-white ' +
                      (moreIsActive
                        ? 'bg-gradient-to-r from-neon-purple/25 to-neon-cyan/5 text-neon-lilac shadow-glow-purple'
                        : 'text-white/60 hover:bg-white/[0.08] hover:text-white')
                    }
                  >
                    <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
                    {moreIsActive && (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-[9px] left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-neon-lilac shadow-glow-lilac"
                      />
                    )}
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={10} className="text-[11.5px] font-medium">
                More
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              side="top"
              sideOffset={18}
              align="end"
              className="min-w-[220px] border-white/[0.12] bg-surface-tooltip"
            >
              <DropdownMenuItem
                disabled={!weeklyOutcome}
                onSelect={() => setShowWeekSummary(true)}
              >
                <BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>
                  Weekly Results
                  {!weeklyOutcome && (
                    <span className="block text-[11px] text-text-muted">
                      Advance a week to view results
                    </span>
                  )}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/[0.08]" />
              {/* Sound settings (Phase 4 PR-6) — mute toggle + volume, fully
                  independent of any motion/reduced-motion preference.
                  onSelect is prevented so interacting with the slider/switch
                  doesn't close the menu. */}
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="flex flex-col items-stretch gap-2 focus:bg-transparent"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="flex items-center text-white/80">
                    {audioSettings.muted ? (
                      <VolumeX className="mr-2 h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Volume2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    Sound
                  </span>
                  <Switch
                    checked={!audioSettings.muted}
                    onCheckedChange={(checked) => audioManager.setMuted(!checked)}
                    aria-label="Toggle sound"
                  />
                </div>
                <Slider
                  value={[audioSettings.volume]}
                  min={0}
                  max={1}
                  step={0.05}
                  disabled={audioSettings.muted}
                  onValueChange={([value]) => audioManager.setVolume(value)}
                  aria-label="Sound volume"
                  className="px-1"
                />
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/[0.08]" />
              <DropdownMenuItem onSelect={() => setLocation('/')}>
                <Play className="mr-2 h-4 w-4" aria-hidden="true" />
                Main Menu
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  onShowSaveModal ? onShowSaveModal() : setLocation('/?open=save')
                }
              >
                <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                Save/Load Game
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShowBugReportModal(true)}>
                <Bug className="mr-2 h-4 w-4" aria-hidden="true" />
                Report a Bug
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator className="bg-white/[0.08]" />
                  <DropdownMenuItem onSelect={() => setLocation('/admin')}>
                    <Shield className="mr-2 h-4 w-4" aria-hidden="true" />
                    Admin
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* divider + Clerk user button */}
          <div aria-hidden="true" className="mx-1 h-[30px] w-px bg-white/[0.12]" />
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <UserButton
                  userProfileMode="navigation"
                  userProfileUrl="/user-profile"
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      userButtonAvatarBox: 'h-9 w-9',
                      userButtonTrigger:
                        'focus:ring-2 focus:ring-neon-purple rounded-full transition-shadow',
                      userButtonPopoverCard:
                        'bg-brand-dark text-white border border-white/10 shadow-xl',
                      userButtonPopoverFooter: 'hidden',
                    },
                  }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={10} className="text-[11.5px] font-medium">
              {displayName}
            </TooltipContent>
          </Tooltip>
        </div>
      </nav>

      {/* Weekly Results modal (migrated from GameSidebar) */}
      {showWeekSummary && weeklyOutcome && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setShowWeekSummary(false)}
        >
          <div
            className="mx-4 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-brand-purple bg-brand-dark-card"
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

      {/* No Results Available modal (migrated from GameSidebar) */}
      {showWeekSummary && !weeklyOutcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg border border-brand-purple bg-brand-dark-card p-6">
            <div className="text-center">
              <BarChart3 className="mx-auto mb-4 h-10 w-10 text-neon-lilac" aria-hidden="true" />
              <h3 className="mb-2 text-lg font-semibold text-white">No Weekly Results</h3>
              <p className="mb-6 text-sm text-white/70">
                Weekly results will be available after advancing to the next week.
              </p>
              <Button
                onClick={() => setShowWeekSummary(false)}
                className="border-0 bg-brand-burgundy text-white hover:bg-brand-rose"
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
    </TooltipProvider>
  );
}
