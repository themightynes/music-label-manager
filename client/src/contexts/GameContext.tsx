import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';

interface GameContextType {
  gameId: string | null;
  setGameId: (id: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameId, setGameId] = useState<string | null>(null);
  const loadGame = useGameStore(state => state.loadGame);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // FR-5: Enhanced game loading with server fallback for localStorage sync
    const initializeGame = async () => {
      // Get gameId from URL or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const idFromUrl = urlParams.get('gameId');
      const idFromStorage = localStorage.getItem('currentGameId');

      const id = idFromUrl || idFromStorage;

      if (id) {
        // Have a gameId - load it normally
        setGameId(id);
        loadGame(id).catch(error => {
          console.error('Failed to rehydrate game from server:', error);
        });
      } else {
        // FR-5: No gameId in localStorage - try to fetch user's most recent game from server
        console.log('[GAME CONTEXT] No gameId in localStorage, checking for recent game on server...');

        try {
          const { apiRequest } = await import('@/lib/queryClient');
          const response = await apiRequest('GET', '/api/games');
          const games = await response.json();

          if (games && games.length > 0) {
            const mostRecentGame = games[0]; // Already sorted by createdAt desc
            console.log(`[GAME CONTEXT] Found most recent game ${mostRecentGame.id} (Week ${mostRecentGame.currentWeek}). Restoring...`);

            // Update localStorage and state with the recovered game
            localStorage.setItem('currentGameId', mostRecentGame.id);
            setGameId(mostRecentGame.id);
            loadGame(mostRecentGame.id).catch(error => {
              console.error('Failed to load recovered game from server:', error);
            });
          } else {
            console.log('[GAME CONTEXT] No existing games found on server. User can start a new game.');
          }
        } catch (error) {
          console.warn('[GAME CONTEXT] Failed to fetch most recent game from server:', error);
          // Not critical - user can still start a new game
        }
      }
    };

    initializeGame();
  }, [loadGame]);

  useEffect(() => {
    const channel = new BroadcastChannel('music-label-manager-game');
    channelRef.current = channel;
    channel.onmessage = (event) => {
      if (event.data?.type === 'game-selected') {
        const nextId = event.data.gameId as string | null;
        if (nextId && nextId !== gameId) {
          setGameId(nextId);
          localStorage.setItem('currentGameId', nextId);
          loadGame(nextId).catch(error => {
            console.error('Failed to synchronize game state in another tab:', error);
          });
        }
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [gameId, loadGame]);

  const updateGameId = (id: string) => {
    setGameId(id);
    localStorage.setItem('currentGameId', id);
    channelRef.current?.postMessage({ type: 'game-selected', gameId: id });
  };

  return (
    <GameContext.Provider value={{ gameId, setGameId: updateGameId }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within GameProvider');
  }
  return context;
}