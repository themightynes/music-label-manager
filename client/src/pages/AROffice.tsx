import React from 'react';
import GameLayout from '@/layouts/GameLayout';
import { useGameContext } from '@/contexts/GameContext';
import { useGameStore } from '@/store/gameStore';
import { useArtists } from '@/hooks/useArtists';
import { AROffice as AROfficeComponent } from '@/components/ar-office/AROffice';
import type { GameState, Artist } from '@shared/schema';

export default function AROffice() {
  const { gameId } = useGameContext();
  const { gameState, signArtist } = useGameStore();
  // Phase 3 PR-9: artists roster read from the TanStack Query cache, not Zustand.
  const { data: artists = [] } = useArtists();

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
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-label mb-2">
            A&amp;R Office
          </div>
          <h1 className="font-display text-text-primary text-2xl sm:text-3xl lowercase mb-3">
            talent discovery
          </h1>
          <div className="shimmer-bar w-40 mb-6" />
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
          {/* Marcus Rodriguez Executive Office Avatar — wrapper height matches the
              -top offset so the image is cropped exactly at the card's top edge
              (the card background is translucent, so it can't hide the overlap) */}
          <div className="absolute -top-72 -right-20 z-10 h-72 overflow-hidden">
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
