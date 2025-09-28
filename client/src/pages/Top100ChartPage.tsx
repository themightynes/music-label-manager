import React from 'react';
import { Top100ChartDisplay } from '../components/Top100ChartDisplay';
import GameLayout from '@/layouts/GameLayout';
import { useGameStore } from '@/store/gameStore';
import { Badge } from '@/components/ui/badge';

export function Top100ChartPage() {
  const { gameState } = useGameStore();

  return (
    <GameLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 mt-12">
          <div className="flex flex-col items-center mb-4">
            <img
              src="/avatars/Top_100.png"
              alt="Top 100"
              className="w-auto mb-3"
              style={{ width: '459px', height: '135px' }}
            />
            {gameState && (
              <Badge variant="outline" className="text-sm">
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