import { useState, useEffect, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { UserButton, useUser } from '@clerk/clerk-react';
import { HoloDisc } from '@/components/ui/holo-disc';
import { useGameStore } from '@/store/gameStore';
import { useArtists } from '@/hooks/useArtists';
import { useGameContext } from '@/contexts/GameContext';
import { LabelCreationModal } from '@/components/LabelCreationModal';
import { SaveGameModal } from '@/components/SaveGameModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { LabelData } from '@shared/types/gameTypes';
import { useIsAdmin } from '@/auth/useCurrentUser';
import { Loader2 } from 'lucide-react';

/** Splash disc with the reference's vinyl dressing (rim shadow + dark center label). Decorative only. */
function SplashDisc({ size, spinSeconds }: { size: number; spinSeconds: number }) {
  return (
    <div
      className="relative shrink-0 rounded-full"
      style={{ width: size, height: size, boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}
    >
      <HoloDisc size={size} spinSeconds={spinSeconds} grooves />
      {/* rim inner shadow (per splash-disc.html) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.1), inset 0 0 40px rgba(0,0,0,0.55)' }}
      />
      {/* dark center label with gold micro-copy */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 flex h-[37%] w-[37%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full"
        style={{
          background: 'radial-gradient(circle at 50% 40%, #2a1821 0%, #190d15 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(212,163,115,0.35), 0 6px 18px rgba(0,0,0,0.5)',
        }}
      >
        <span className="mb-[14%] font-mono text-[8px] uppercase tracking-[0.28em] text-money">33⅓ rpm</span>
        <span
          className="block h-[11%] w-[11%] rounded-full"
          style={{ background: '#05030a', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,0,0,0.6)' }}
        />
        <span className="mt-[14%] font-mono text-[8px] uppercase tracking-[0.28em] text-text-muted">side a</span>
      </div>
    </div>
  );
}

interface OrbitOption {
  key: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  note?: string;
  subtitle?: ReactNode;
  /** radial placement on md+ */
  side: 'left' | 'right';
  y: number; // px offset from disc vertical center
  x: number; // px offset from disc edge (horizontal gap, arcs inward for top/bottom)
}

function orbitButtonClasses(opt: OrbitOption) {
  const base =
    'group whitespace-nowrap font-mono text-[13px] uppercase tracking-[0.22em] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(212,163,115,0.7)] rounded-sm';
  if (opt.disabled) return `${base} text-text-muted/50 cursor-not-allowed`;
  if (opt.primary)
    return `${base} text-money [text-shadow:0_0_14px_rgba(212,163,115,0.45)] hover:[text-shadow:0_0_20px_rgba(212,163,115,0.7)]`;
  return `${base} text-text-muted hover:text-money focus-visible:text-money hover:[text-shadow:0_0_14px_rgba(212,163,115,0.45)] focus-visible:[text-shadow:0_0_14px_rgba(212,163,115,0.45)]`;
}

function OrbitLabel({ opt }: { opt: OrbitOption }) {
  const caret = (
    <span
      aria-hidden="true"
      className={
        opt.primary
          ? 'text-money'
          : 'opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100'
      }
    >
      ▸{' '}
    </span>
  );
  return (
    <span className={`flex flex-col ${opt.side === 'left' ? 'items-end text-right' : 'items-start text-left'}`}>
      <span>
        {caret}
        {opt.label}
        {opt.note && <span className="ml-2 text-[10px] tracking-[0.18em] text-text-muted/60">{opt.note}</span>}
      </span>
      {opt.subtitle}
    </span>
  );
}

/** decorative connector (dot + thin line) pointing from the option toward the disc */
function Connector({ side }: { side: 'left' | 'right' }) {
  return (
    <span aria-hidden="true" className="pointer-events-none flex items-center">
      {side === 'right' && (
        <>
          <span className="h-px w-7 bg-[rgba(212,163,115,0.35)]" />
          <span className="mx-1.5 h-1 w-1 rounded-full bg-[rgba(212,163,115,0.55)]" />
        </>
      )}
      {side === 'left' && (
        <>
          <span className="mx-1.5 h-1 w-1 rounded-full bg-[rgba(212,163,115,0.55)]" />
          <span className="h-px w-7 bg-[rgba(212,163,115,0.35)]" />
        </>
      )}
    </span>
  );
}

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

  const hasContinue = Boolean(gameId && gameState?.currentWeek);
  const labelName = (gameState as any)?.musicLabel?.name || 'Your Label';

  const continueSubtitle = hasContinue ? (
    <span className="mt-1 font-mono text-[10px] normal-case tracking-[0.12em] text-text-muted">
      {labelName} · wk {gameState!.currentWeek}/52 ·{' '}
      <span className="text-money">${(gameState!.money || 0).toLocaleString()}</span> · {artists?.length || 0}{' '}
      {artists?.length === 1 ? 'artist' : 'artists'} · rep {gameState!.reputation || 0}
    </span>
  ) : undefined;

  // DOM order (a11y): Continue, New Game, Load, Options, About, Admin.
  // Radial placement (md+): left arc = Continue (~+25° upper-left), Load Game (180°), Admin (~-25° lower-left);
  // right arc = New Game (~+25° upper-right), Options (0°), About (~-25° lower-right).
  const options: OrbitOption[] = [
    ...(hasContinue
      ? [
          {
            key: 'continue',
            label: 'Continue',
            onClick: handleContinue,
            primary: true,
            subtitle: continueSubtitle,
            side: 'left' as const,
            y: -120,
            x: -16,
          },
        ]
      : []),
    { key: 'new-game', label: 'New Game', onClick: handleNewGame, side: 'right', y: -120, x: -16 },
    { key: 'load', label: 'Load Game', onClick: handleLoadGame, side: 'left', y: 0, x: 28 },
    { key: 'options', label: 'Options', disabled: true, note: 'coming soon', side: 'right', y: 0, x: 28 },
    { key: 'about', label: 'About', disabled: true, note: 'coming soon', side: 'right', y: 120, x: -16 },
    ...(isAdmin
      ? [{ key: 'admin', label: 'Admin', onClick: () => setLocation('/admin'), side: 'left' as const, y: 120, x: -16 }]
      : []),
  ];

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
        {/* optional liquid-chrome photo — tolerates absence (same pattern as PageBackdrop) */}
        <img
          src="/liquid-chrome-bg.jpg"
          alt=""
          aria-hidden="true"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          className="absolute inset-0 h-full w-full object-cover opacity-[0.22]"
          style={{ filter: 'saturate(1.05) brightness(0.9)' }}
        />
        <div className="backdrop-bloom" />
        <div className="backdrop-dotgrid" />
        <div className="backdrop-scrim" />
        {/* darkening center scrim so the disc reads on top (splash-disc.html) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(66% 66% at 50% 46%, rgba(5,3,8,0.7) 0%, rgba(5,3,8,0.45) 45%, rgba(3,1,5,0.8) 100%)',
          }}
        />
      </div>
      <div className="backdrop-grain" />

      {/* HUD corner ticks — gold, all 4 corners (splash accent, spec §8) */}
      <div className="pointer-events-none absolute top-6 left-6 h-8 w-8 border-t-[1.5px] border-l-[1.5px] border-[rgba(212,163,115,0.55)]" />
      <div className="pointer-events-none absolute top-6 right-6 h-8 w-8 border-t-[1.5px] border-r-[1.5px] border-[rgba(212,163,115,0.55)]" />
      <div className="pointer-events-none absolute bottom-6 left-6 h-8 w-8 border-b-[1.5px] border-l-[1.5px] border-[rgba(212,163,115,0.55)]" />
      <div className="pointer-events-none absolute bottom-6 right-6 h-8 w-8 border-b-[1.5px] border-r-[1.5px] border-[rgba(212,163,115,0.55)]" />

      {/* Header — top HUD strip */}
      <header className="relative z-10 flex items-center justify-between px-12 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <HoloDisc size={34} spinSeconds={20} />
          <span className="font-display text-sm lowercase text-text-primary">music label manager</span>
        </div>
        <div className="hidden md:flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.28em] text-[#D99696]">
          <span
            aria-hidden="true"
            className="h-[7px] w-[7px] rounded-full bg-brand-rose shadow-[0_0_10px_2px_rgba(167,90,91,0.8)]"
          />
          <span>{displayName}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block font-mono text-[11px] uppercase tracking-[0.28em] text-text-muted">
            est. mmxxvi · v0.1.0
          </span>
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

      {/* ── Center stage ────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center gap-7 px-6 py-10 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.5em] text-money pl-2">a record label simulation</p>

        {/* Loading state while checking for a saved game */}
        {isCheckingForGame && (
          <div className="flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-money/70" aria-hidden="true" />
            <span>Checking for saved game...</span>
          </div>
        )}

        {/* THE DISC + orbiting options (md+) */}
        <div className="relative hidden md:block">
          <SplashDisc size={360} spinSeconds={32} />
          {!isCheckingForGame && (
            <nav aria-label="Main menu">
              {options.map((opt) => (
                <button
                  key={opt.key}
                  onClick={opt.onClick}
                  disabled={opt.disabled}
                  className={`absolute flex items-center ${orbitButtonClasses(opt)}`}
                  style={{
                    top: `calc(50% + ${opt.y}px)`,
                    transform: 'translateY(-50%)',
                    ...(opt.side === 'left'
                      ? { right: `calc(100% + ${opt.x}px)` }
                      : { left: `calc(100% + ${opt.x}px)` }),
                  }}
                >
                  {opt.side === 'right' && <Connector side="right" />}
                  <OrbitLabel opt={opt} />
                  {opt.side === 'left' && <Connector side="left" />}
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* Smaller disc for narrow screens */}
        <div className="md:hidden">
          <SplashDisc size={200} spinSeconds={32} />
        </div>

        {/* wordmark */}
        <h1 className="font-display text-aberration text-[clamp(26px,4vw,46px)] leading-[0.92] font-normal lowercase text-text-primary tracking-tight">
          music label manager
        </h1>

        {/* Below-md fallback: options stack under the wordmark */}
        {!isCheckingForGame && (
          <nav aria-label="Main menu" className="md:hidden flex flex-col items-center gap-4">
            {options.map((opt) => (
              <button key={opt.key} onClick={opt.onClick} disabled={opt.disabled} className={orbitButtonClasses(opt)}>
                <span className="flex flex-col items-center text-center">
                  <span>
                    {opt.primary && (
                      <span aria-hidden="true" className="text-money">
                        ▸{' '}
                      </span>
                    )}
                    {opt.label}
                    {opt.note && <span className="ml-2 text-[10px] tracking-[0.18em] text-text-muted/60">{opt.note}</span>}
                  </span>
                  {opt.subtitle}
                </span>
              </button>
            ))}
          </nav>
        )}
      </main>

      {/* Footer — bottom HUD strip */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 px-12 pt-4 pb-10 font-mono text-[11px] uppercase tracking-[0.24em] text-text-muted">
        <span className="normal-case tracking-[0.06em] font-sans">
          Secure authentication provided by Clerk. Gameplay data is stored privately per account.
        </span>
        <span>© {new Date().getFullYear()} music label manager</span>
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
