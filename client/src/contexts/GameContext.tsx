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
    
    // Only fallback to the hardcoded game if no storage or URL game ID exists
    const id = idFromUrl || idFromStorage;
    if (id) {
      setGameId(id);
    } else {
      // If no game ID is found, we'll let the game state hook handle creating a new game
      setGameId('5d0f61cb-0461-46af-9e47-bf8971223890');
    }
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