import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { UserButton, useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { HoloDisc } from '@/components/ui/holo-disc';
import { useGameStore } from '@/store/gameStore';
import { useArtists } from '@/hooks/useArtists';
import { useGameContext } from '@/contexts/GameContext';
import { LabelCreationModal } from '@/components/LabelCreationModal';
import { SaveGameModal } from '@/components/SaveGameModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { LabelData } from '@shared/types/gameTypes';
import { useIsAdmin } from '@/auth/useCurrentUser';
import { Play, FolderOpen, Settings, Info, Loader2, Shield } from 'lucide-react';

export default function MainMenuPage() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { gameId, setGameId } = useGameContext();
  const { gameState, createNewGame } = useGameStore();
  // Phase 3 PR-9: artists roster read from the TanStack Query cache, not Zustand.
  const { data: artists = [] } = useArtists();
  const { isAdmin } = useIsAdmin();
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showLoadGameModal, setShowLoadGameModal] = useState(false);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isCheckingForGame, setIsCheckingForGame] = useState(true);

  const displayName = user?.username || user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Player';

  // Track when game check is complete
  useEffect(() => {
    // Give a small delay to check for existing game
    const timer = setTimeout(() => {
      setIsCheckingForGame(false);
    }, 800); // 800ms should be enough for GameContext to load

    return () => clearTimeout(timer);
  }, []);

  const handleNewGame = () => {
    // If there's an active game, show confirmation
    if (gameId && gameState?.currentWeek && gameState.currentWeek > 1) {
      setShowNewGameConfirm(true);
    } else {
      setShowLabelModal(true);
    }
  };

  const confirmNewGame = () => {
    setShowNewGameConfirm(false);
    setShowLabelModal(true);
  };

  const handleSaveFirstClick = () => {
    setShowNewGameConfirm(false);
    setShowLoadGameModal(true); // Open Save/Load modal so user can save
  };

  const handleCreateLabel = async (labelData: LabelData) => {
    try {
      setIsCreatingGame(true);
      const newGame = await createNewGame('standard', labelData);
      setGameId(newGame.id);
      setShowLabelModal(false);
      setLocation('/game');
    } catch (error) {
      console.error('Failed to start new game:', error);
    } finally {
      setIsCreatingGame(false);
    }
  };

  const handleLoadGame = () => {
    setShowLoadGameModal(true);
  };

  const handleContinue = () => {
    if (gameId) {
      setLocation('/game');
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-surface-app text-text-primary overflow-hidden">
      {/* ── Backdrop stack (spec §9) ─────────────────────────────────────── */}
      <div className="backdrop-stack">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(80% 70% at 50% 40%, rgba(21,10,20,0.85) 0%, rgba(10,5,16,0.9) 48%, #050308 80%, #030205 100%)',
          }}
        />
        <div className="backdrop-bloom" />
        <div className="backdrop-dotgrid" />
        <div className="backdrop-scrim" />
      </div>
      <div className="backdrop-grain" />

      {/* HUD corner ticks */}
      <div className="hidden sm:block pointer-events-none absolute top-6 left-6 h-7 w-7 border-t-[1.5px] border-l-[1.5px] border-neon-purple/50" />
      <div className="hidden sm:block pointer-events-none absolute bottom-6 right-6 h-7 w-7 border-b-[1.5px] border-r-[1.5px] border-neon-cyan/50" />

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <img src="/logo4.png" alt="Music Label Manager" className="h-9 w-auto" />
          <span className="font-mono text-sm uppercase tracking-[0.28em] text-text-muted">MLM</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-body">Welcome, {displayName}</span>
          <UserButton
            userProfileMode="navigation"
            userProfileUrl="/user-profile"
            afterSignOutUrl="/"
            appearance={{
              elements: {
                userButtonAvatarBox: 'h-10 w-10',
                userButtonTrigger: 'focus:ring-2 focus:ring-neon-purple rounded-full transition-shadow',
                userButtonPopoverCard: 'bg-surface-panel text-text-primary border border-white/10 shadow-xl',
              },
            }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-10 text-center gap-8">
        <HoloDisc size={140} spinSeconds={20} className="w-[140px] h-[140px]" />

        <div className="space-y-3">
          <h1 className="font-display text-aberration text-[clamp(22px,3.4vw,34px)] leading-[0.95] font-normal text-text-primary tracking-tight">
            music label manager
          </h1>
          <p className="text-sm font-light tracking-[0.3em] uppercase text-text-muted">
            Run the label. Shape the charts.
          </p>
        </div>

        {/* Menu Buttons */}
        <nav className="w-full max-w-md space-y-3">
          {/* Continue Button - Show loading state or actual button */}
          {isCheckingForGame ? (
            <div className="w-full h-14 glass-panel chromatic-hairline flex items-center justify-center">
              <Loader2 className="h-5 w-5 text-neon-lilac/70 animate-spin mr-2" />
              <span className="text-sm text-text-muted tracking-wider font-mono uppercase">Checking for saved game...</span>
            </div>
          ) : (
            gameId && gameState?.currentWeek && (
              <button
                onClick={handleContinue}
                className="group glass-panel chromatic-hairline w-full py-3 px-4 border-neon-lilac/40 hover:border-neon-lilac/70 hover:shadow-glow-lilac transition-all duration-300 animate-in fade-in slide-in-from-top-2"
              >
                <div className="flex flex-col items-center w-full">
                  <div className="flex items-center justify-center">
                    <Play className="mr-2 h-5 w-5 text-neon-lilac" />
                    <span className="text-lg font-semibold tracking-wider text-text-primary">CONTINUE</span>
                  </div>
                  <span className="text-sm text-text-body font-normal mt-1.5">
                    {(gameState as any).musicLabel?.name || 'Your Label'} · Week {gameState.currentWeek}/52
                  </span>
                  <span className="text-xs text-text-muted font-normal mt-0.5 font-mono">
                    <span className="text-money">${(gameState.money || 0).toLocaleString()}</span> · {artists?.length || 0} {artists?.length === 1 ? 'Artist' : 'Artists'} · Rep: {gameState.reputation || 0}
                  </span>
                </div>
              </button>
            )
          )}

          <Button
            onClick={handleNewGame}
            className="group w-full h-14 justify-start gap-3 px-5"
          >
            <Play className="h-5 w-5" />
            <span className="text-base font-semibold tracking-wider">NEW GAME</span>
          </Button>

          <button
            onClick={handleLoadGame}
            className="group w-full h-14 glass-panel chromatic-hairline flex items-center gap-3 px-5 border-white/10 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-300 text-text-primary"
          >
            <FolderOpen className="h-5 w-5 text-neon-cyan" />
            <span className="text-base font-semibold tracking-wider">LOAD GAME</span>
          </button>

          <button
            onClick={() => {/* TODO: Options page */}}
            disabled
            className="group w-full h-14 glass-panel flex items-center gap-3 px-5 border-white/[0.06] text-text-muted cursor-not-allowed opacity-60"
          >
            <Settings className="h-5 w-5" />
            <span className="text-base font-semibold tracking-wider">OPTIONS</span>
            <span className="ml-auto text-xs text-text-muted font-mono uppercase">Coming Soon</span>
          </button>

          <button
            onClick={() => {/* TODO: About page */}}
            disabled
            className="group w-full h-14 glass-panel flex items-center gap-3 px-5 border-white/[0.06] text-text-muted cursor-not-allowed opacity-60"
          >
            <Info className="h-5 w-5" />
            <span className="text-base font-semibold tracking-wider">ABOUT</span>
            <span className="ml-auto text-xs text-text-muted font-mono uppercase">Coming Soon</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setLocation('/admin')}
              className="group w-full h-14 glass-panel chromatic-hairline flex items-center gap-3 px-5 border-neon-magenta/30 hover:border-neon-magenta/60 hover:shadow-glow-magenta transition-all duration-300 text-text-primary"
            >
              <Shield className="h-5 w-5 text-neon-magenta" />
              <span className="text-base font-semibold tracking-wider">ADMIN</span>
            </button>
          )}
        </nav>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 text-xs text-text-muted border-t border-white/[0.06] text-center space-y-1 font-mono">
        <p className="normal-case font-sans">Secure authentication provided by Clerk. Gameplay data is stored privately per account.</p>
        <p>© {new Date().getFullYear()} Music Label Manager v0.1.0</p>
      </footer>

      {/* Modals */}
      <LabelCreationModal
        open={showLabelModal}
        onOpenChange={setShowLabelModal}
        onCreateLabel={handleCreateLabel}
        isCreating={isCreatingGame}
      />

      <SaveGameModal
        open={showLoadGameModal}
        onOpenChange={setShowLoadGameModal}
      />

      <ConfirmDialog
        isOpen={showNewGameConfirm}
        onClose={() => setShowNewGameConfirm(false)}
        onCancel={handleSaveFirstClick}
        onConfirm={confirmNewGame}
        title="Start New Game?"
        description={`Your current game "${(gameState as any)?.musicLabel?.name || 'Your Label'}" (Week ${gameState?.currentWeek ?? 1}) will be replaced. To keep this game, save it first.`}
        confirmText="Start New Game"
        cancelText="Save First (Recommended)"
        variant="destructive"
        emoji="⚠️"
        currentWeek={gameState?.currentWeek ?? 1}
      />
    </div>
  );
}
