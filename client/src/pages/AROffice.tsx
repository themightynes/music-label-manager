import React from 'react';
import GameLayout from '@/layouts/GameLayout';
import { useGameContext } from '@/contexts/GameContext';
import { useGameStore } from '@/store/gameStore';
import { AROffice as AROfficeComponent } from '@/components/ar-office/AROffice';
import type { GameState, Artist } from '@shared/schema';

export default function AROffice() {
  const { gameId } = useGameContext();
  const { gameState, artists, signArtist } = useGameStore();

  if (!gameId || !gameState) {
    return null;
  }

  const focusSlots = {
    total: gameState.focusSlots || 3,
    used: gameState.usedFocusSlots || 0,
  };

  // Function to handle image load error and fallback to blank_exec_office.png
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    if (img.src !== '/avatars/blank_exec_office.png') {
      img.src = '/avatars/blank_exec_office.png';
    }
  };

  return (
    <GameLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 mt-12">
          <div className="flex items-center mb-4">
            <img
              src="/avatars/AR_Office.png"
              alt="A&R Office"
              className="w-auto mr-4"
              style={{ width: '459px', height: '203px' }}
            />
          </div>
        </div>

        <div className="relative">
          {/* Marcus Rodriguez Executive Office Avatar */}
          <div className="absolute -top-72 -right-20 z-10">
            <img
              src="/avatars/marcus_rodriguez_exec_office.png"
              alt="Marcus Rodriguez in executive office"
              className="w-[500px] h-auto object-cover object-top"
              style={{ height: '350px' }}
              onError={handleImageError}
            />
          </div>

          <div className="relative z-20">
            <AROfficeComponent
              gameId={gameId}
              gameState={gameState}
              signedArtists={artists}
              focusSlots={focusSlots}
              onSignArtist={async (artist: Artist) => {
                await signArtist(artist);
              }}
            />
          </div>
        </div>
      </main>
    </GameLayout>
  );
}
