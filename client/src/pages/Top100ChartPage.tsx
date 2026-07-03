import React from 'react';
import { Top100ChartDisplay } from '../components/Top100ChartDisplay';
import GameLayout from '@/layouts/GameLayout';
import { useGameState } from '@/hooks/useGameState';
import { Badge } from '@/components/ui/badge';

export function Top100ChartPage() {
  const gameState = useGameState();

  return (
    <GameLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 mt-12">
          <div className="flex flex-col items-center mb-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-text-label">
              Chart Feed
            </div>
            <img
              src="/avatars/Top_100.png"
              alt="Top 100"
              className="w-auto mb-3"
              style={{ width: '459px', height: '135px' }}
            />
            <div className="shimmer-bar w-40 mb-3" />
            {gameState && (
              <Badge
                variant="outline"
                className="rounded-chip border-neon-lilac/40 bg-neon-lilac/10 font-mono text-xs text-text-accent"
              >
                Week {gameState.currentWeek}
              </Badge>
            )}
          </div>
        </div>

        <Top100ChartDisplay />
      </main>
    </GameLayout>
  );
}

export default Top100ChartPage;