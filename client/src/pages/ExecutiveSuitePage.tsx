import { useGameStore } from '@/store/gameStore';
import { useGameState } from '@/hooks/useGameState';
import { Zap } from 'lucide-react';
import { SelectionSummary } from '../components/SelectionSummary';
import { ExecutiveMeetings } from '../components/executive-meetings/ExecutiveMeetings';
import { useGameContext } from '@/contexts/GameContext';
import GameLayout from '@/layouts/GameLayout';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import logger from '@/lib/logger';

/**
 * Exec Console redesign (2026-07-11, "Exec Meetings — Console" direction): the
 * Executive Suite renders as "The Board" — a mixing-console deck. The page owns
 * the slim HUD header (title, week line, focus-slot pips, CC meter) and the
 * console deck framing; ExecutiveMeetings owns the screens inside it.
 */

interface SelectedChoice {
  executiveName: string;
  meetingName: string;
  choiceLabel: string;
  effects_immediate: Record<string, number>;
  effects_delayed: Record<string, number>;
}

interface ImpactPreview {
  immediate: Record<string, number>;
  delayed: Record<string, number>;
  selectedChoices: SelectedChoice[];
}

interface ExecutiveSuitePageProps {
  onAdvanceWeek?: () => Promise<void>;
  isAdvancing?: boolean;
  params?: Record<string, string | undefined>;
  location?: string;
  navigate?: (to: string) => void;
}

export default function ExecutiveSuitePage({
  onAdvanceWeek,
  isAdvancing,
}: ExecutiveSuitePageProps = {}) {
  const gameState = useGameState();
  const { selectedActions, removeAction, reorderActions, selectAction, getAROfficeStatus, advanceWeek, isAdvancingWeek } = useGameStore();
  const { gameId } = useGameContext();
  const [impactPreview, setImpactPreview] = useState<ImpactPreview>({
    immediate: {},
    delayed: {},
    selectedChoices: []
  });

  // Fallback advance week function if not provided
  const handleAdvanceWeek = onAdvanceWeek || (async () => {
    try {
      await advanceWeek();
    } catch (error) {
      logger.error('Advance week failed from ExecutiveSuitePage:', error);
      toast({
        title: "Failed to advance week",
        description: error instanceof Error ? error.message : "An error occurred while advancing the week. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  const handleIsAdvancing = (typeof isAdvancing === 'boolean') ? isAdvancing : !!isAdvancingWeek;

  if (!gameState || !gameId) return null;

  const totalSlots = gameState.focusSlots || 3;
  const usedSlots = gameState.usedFocusSlots || 0;
  const slotsLeft = totalSlots - usedSlots;
  const creativeCapital = gameState.creativeCapital ?? 0;
  const gridHint = slotsLeft > 0
    ? `${slotsLeft} focus slot${slotsLeft === 1 ? '' : 's'} remaining`
    : 'all slots committed — advance the week';

  return (
    <GameLayout>
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* ===== slim HUD header ===== */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl md:text-[26px] text-text-primary text-aberration">the board</h1>
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-neon-cyan">executive console</span>
            </div>
            <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted/70">
              week {gameState.currentWeek} · {gridHint}
              {totalSlots === 4 && (
                <span className="ml-3 inline-flex items-center gap-1 rounded-pill bg-positive/10 border border-positive/40 text-positive px-2.5 py-0.5 normal-case tracking-normal text-[10px]">
                  4th slot unlocked
                </span>
              )}
            </div>
            <div className="shimmer-bar w-40 mt-2" />
          </div>

          <div className="flex items-center gap-3">
            {/* focus slot pips */}
            <div className="chromatic-hairline relative flex items-center gap-3 overflow-hidden rounded-card border border-white/[0.08] bg-gradient-to-b from-surface-panel/85 to-surface-inner/85 px-4 py-2.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted">Focus</span>
              <div className="flex gap-1.5">
                {Array.from({ length: totalSlots }, (_, i) => (
                  <div
                    key={i}
                    className={`h-[7px] w-[22px] rounded-full border ${
                      i < usedSlots
                        ? 'border-neon-purple/70 bg-gradient-to-r from-action-pink to-neon-purple shadow-[0_0_12px_rgba(160,90,240,0.6)]'
                        : 'border-white/15 bg-white/5'
                    }`}
                  />
                ))}
              </div>
              <span className="font-mono text-sm font-semibold text-text-primary">{usedSlots}/{totalSlots}</span>
            </div>
            {/* creative capital meter */}
            <div className="relative flex items-center gap-2 overflow-hidden rounded-card border border-white/[0.09] bg-gradient-to-br from-neon-purple/15 to-neon-blue/10 px-4 py-2.5">
              <Zap className="h-3 w-3 text-neon-lilac/80" />
              <span className="font-mono text-sm font-semibold text-neon-lilac">{creativeCapital} CC</span>
            </div>
          </div>
        </header>

        {/* ===== console deck ===== */}
        {/* overflow-clip (not -hidden): a hidden-overflow box is still programmatically
            scrollable, and the blooms' offscreen extent let focus/scrollIntoView shift
            the whole deck sideways (scrollLeft > 0 → left edge visually cut). clip
            forbids scrolling entirely; the blooms use transforms, which never create
            scrollable overflow in the first place. */}
        <section className="chromatic-hairline hud-ticks glass-panel relative overflow-clip rounded-card p-6 md:p-8">
          {/* corner brackets */}
          <div className="pointer-events-none absolute left-[11px] top-[11px] h-[13px] w-[13px] border-l border-t border-neon-purple/50" aria-hidden />
          <div className="pointer-events-none absolute bottom-[11px] right-[11px] h-[13px] w-[13px] border-b border-r border-neon-cyan/50" aria-hidden />
          {/* ambient blooms (transform-offset, see note above) */}
          <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 -translate-y-32 translate-x-16 rounded-full bg-neon-purple/15 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 -translate-x-10 translate-y-40 rounded-full bg-neon-magenta/10 blur-3xl" aria-hidden />

          <div className="relative z-10">
            <ExecutiveMeetings
              gameId={gameId}
              currentWeek={gameState.currentWeek}
              onActionSelected={selectAction}
              focusSlots={{
                total: totalSlots,
                used: usedSlots,
              }}
              creativeCapital={creativeCapital}
              arOfficeStatus={getAROfficeStatus()}
              onImpactPreviewUpdate={setImpactPreview}
            />
          </div>
        </section>

        {/* ===== focus slots / selection summary ===== */}
        <div className="mt-6">
          <SelectionSummary
            selectedActions={selectedActions}
            onRemoveAction={removeAction}
            onReorderActions={reorderActions}
            onAdvanceWeek={handleAdvanceWeek}
            isAdvancing={handleIsAdvancing}
            impactPreview={impactPreview}
          />
        </div>
      </main>
    </GameLayout>
  );
}
