import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { UserButton, useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/store/gameStore';
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
  const { gameState, createNewGame, artists } = useGameStore();
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
    <div className="relative min-h-screen flex flex-col bg-gradient-to-br from-brand-dark via-brand-dark-card to-brand-dark overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-brand-pink/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-brand-purple/20 rounded-full blur-3xl animate-pulse [animation-duration:5s]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/logo4.png" alt="Music Label Manager" className="h-10 w-auto" />
          <span className="text-xl font-semibold tracking-wider text-white">MLM</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/70">Welcome, {displayName}</span>
          <UserButton
            userProfileMode="navigation"
            userProfileUrl="/user-profile"
            afterSignOutUrl="/"
            appearance={{
              elements: {
                userButtonAvatarBox: 'h-10 w-10',
                userButtonTrigger: 'focus:ring-2 focus:ring-brand-burgundy rounded-full transition-shadow',
                userButtonPopoverCard: 'bg-brand-dark text-white border border-white/10 shadow-xl',
              },
            }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="space-y-8 w-full max-w-md">
          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-white">
              MUSIC LABEL MANAGER
            </h1>
            <p className="text-lg font-light tracking-[0.3em] uppercase text-white/60">
              Run the label. Shape the charts.
            </p>
          </div>

          {/* Menu Buttons */}
          <nav className="space-y-4">
            {/* Continue Button - Show loading state or actual button */}
            {isCheckingForGame ? (
              <div className="w-full h-14 bg-black/40 border border-brand-pink/30 backdrop-blur-sm rounded-md flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-brand-pink/70 animate-spin mr-2" />
                <span className="text-sm text-white/60 tracking-wider">CHECKING FOR SAVED GAME...</span>
              </div>
            ) : (
              gameId && gameState?.currentWeek && (
                <Button
                  onClick={handleContinue}
                  className="group w-full h-auto py-3 px-4 bg-black/40 border border-brand-pink hover:bg-black/60 hover:border-brand-pink hover:shadow-[0_0_20px_5px_rgba(233,30,140,0.3)] text-white backdrop-blur-sm transition-all duration-300 transform hover:scale-105 animate-in fade-in slide-in-from-top-2 duration-500"
                >
                  <div className="flex flex-col items-center w-full">
                    <div className="flex items-center justify-center">
                      <Play className="mr-2 h-5 w-5" />
                      <span className="text-lg font-semibold tracking-wider">CONTINUE</span>
                    </div>
                    <span className="text-sm text-white/80 font-normal mt-1.5">
                      {(gameState as any).musicLabel?.name || 'Your Label'} · Week {gameState.currentWeek}/52
                    </span>
                    <span className="text-xs text-white/60 font-normal mt-0.5">
                      ${(gameState.money || 0).toLocaleString()} · {artists?.length || 0} {artists?.length === 1 ? 'Artist' : 'Artists'} · Rep: {gameState.reputation || 0}
                    </span>
                  </div>
                </Button>
              )
            )}

            <Button
              onClick={handleNewGame}
              className="group w-full h-14 bg-black/40 border border-brand-pink/70 hover:bg-black/60 hover:border-brand-pink hover:shadow-[0_0_20px_5px_rgba(233,30,140,0.3)] text-white backdrop-blur-sm transition-all duration-300 transform hover:scale-105"
            >
              <Play className="mr-2 h-5 w-5" />
              <span className="text-lg font-semibold tracking-wider">NEW GAME</span>
            </Button>

            <Button
              onClick={handleLoadGame}
              className="group w-full h-14 bg-black/40 border border-brand-pink/50 hover:bg-black/60 hover:border-brand-pink hover:shadow-[0_0_20px_5px_rgba(233,30,140,0.3)] text-white backdrop-blur-sm transition-all duration-300 transform hover:scale-105"
            >
              <FolderOpen className="mr-2 h-5 w-5" />
              <span className="text-lg font-semibold tracking-wider">LOAD GAME</span>
            </Button>

            <Button
              onClick={() => {/* TODO: Options page */}}
              disabled
              className="group w-full h-14 bg-black/40 border border-brand-pink/30 text-white/50 backdrop-blur-sm transition-all duration-300 cursor-not-allowed"
            >
              <Settings className="mr-2 h-5 w-5" />
              <span className="text-lg font-semibold tracking-wider">OPTIONS</span>
              <span className="ml-2 text-xs text-white/40">(Coming Soon)</span>
            </Button>

            <Button
              onClick={() => {/* TODO: About page */}}
              disabled
              className="group w-full h-14 bg-black/40 border border-brand-pink/30 text-white/50 backdrop-blur-sm transition-all duration-300 cursor-not-allowed"
            >
              <Info className="mr-2 h-5 w-5" />
              <span className="text-lg font-semibold tracking-wider">ABOUT</span>
              <span className="ml-2 text-xs text-white/40">(Coming Soon)</span>
            </Button>

            {isAdmin && (
              <Button
                onClick={() => setLocation('/admin')}
                className="group w-full h-14 bg-black/40 border border-brand-pink/60 hover:bg-black/60 hover:border-brand-pink hover:shadow-[0_0_20px_5px_rgba(233,30,140,0.3)] text-white backdrop-blur-sm transition-all duration-300 transform hover:scale-105"
              >
                <Shield className="mr-2 h-5 w-5" />
                <span className="text-lg font-semibold tracking-wider">ADMIN</span>
              </Button>
            )}
          </nav>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 text-xs text-white/40 border-t border-white/10 text-center space-y-1">
        <p>Secure authentication provided by Clerk. Gameplay data is stored privately per account.</p>
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
