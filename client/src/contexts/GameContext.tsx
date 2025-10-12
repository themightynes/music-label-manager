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
    // Get gameId from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('gameId');
    const idFromStorage = localStorage.getItem('currentGameId');

    const id = idFromUrl || idFromStorage;
    if (id) {
      setGameId(id);
      loadGame(id).catch(error => {
        console.error('Failed to rehydrate game from server:', error);
      });
    }
    // Remove hardcoded fallback - let the app handle missing game gracefully
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