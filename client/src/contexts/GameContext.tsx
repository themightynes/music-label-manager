import React, { createContext, useContext, useState, useEffect } from 'react';

interface GameContextType {
  gameId: string | null;
  setGameId: (id: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameId, setGameId] = useState<string | null>(null);

  useEffect(() => {
    // Get gameId from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('gameId');
    const idFromStorage = localStorage.getItem('currentGameId');
    
    const id = idFromUrl || idFromStorage;
    if (id) {
      setGameId(id);
    }
    // Remove hardcoded fallback - let the app handle missing game gracefully
  }, []);

  const updateGameId = (id: string) => {
    setGameId(id);
    localStorage.setItem('currentGameId', id);
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