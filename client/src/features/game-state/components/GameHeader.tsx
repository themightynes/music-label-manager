import React from 'react';
import { GameState } from '@shared/types/gameTypes';
import { Settings } from 'lucide-react';

interface GameHeaderProps {
  gameState: GameState;
}

export function GameHeader({ gameState }: GameHeaderProps) {
  return (
    <div className="bg-black border-b border-gray-800">
      <div className="px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-yellow-500">🎵 Music Label Manager</h1>
          <div className="flex gap-6 text-white">
            <div>
              <span className="text-gray-400">Money:</span>
              <span className="ml-2 font-semibold text-yellow-500">
                ${(gameState.money || 75000).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Month:</span>
              <span className="ml-2 font-semibold">{gameState.currentMonth || 1}</span>
            </div>
            <div>
              <span className="text-gray-400">Reputation:</span>
              <span className="ml-2 font-semibold">{gameState.reputation || 5}%</span>
            </div>
            <Settings className="w-6 h-6 text-gray-400 hover:text-yellow-500 cursor-pointer" />
          </div>
        </div>
      </div>
    </div>
  );
}