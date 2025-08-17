import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { useGameStore } from '@/store/gameStore';
import { useEffect, useRef } from 'react';

export function ToastNotification() {
  const { toast } = useToast();
  const { gameState } = useGameStore();
  const prevGameState = useRef(gameState);

  useEffect(() => {
    if (!gameState || !prevGameState.current) {
      prevGameState.current = gameState;
      return;
    }

    const prev = prevGameState.current;
    const current = gameState;

    // Check for money changes
    const prevMoney = prev.money || 0;
    const currentMoney = current.money || 0;
    if (prevMoney !== currentMoney) {
      const change = currentMoney - prevMoney;
      const icon = change > 0 ? '💰' : '💸';
      toast({
        title: `${icon} Money ${change > 0 ? '+' : ''}${change.toLocaleString()}`,
        description: `Current balance: $${currentMoney.toLocaleString()}`,
        duration: 3000,
      });
    }

    // Check for reputation changes
    const prevRep = prev.reputation || 0;
    const currentRep = current.reputation || 0;
    if (prevRep !== currentRep) {
      const change = currentRep - prevRep;
      const icon = change > 0 ? '⭐' : '📉';
      toast({
        title: `${icon} Reputation ${change > 0 ? '+' : ''}${change}`,
        description: `Current reputation: ${currentRep}`,
        duration: 3000,
      });
    }

    // Check for creative capital changes
    const prevCC = prev.creativeCapital || 0;
    const currentCC = current.creativeCapital || 0;
    if (prevCC !== currentCC) {
      const change = currentCC - prevCC;
      const icon = change > 0 ? '💡' : '🔥';
      toast({
        title: `${icon} Creative Capital ${change > 0 ? '+' : ''}${change}`,
        description: `Current creative capital: ${currentCC}`,
        duration: 3000,
      });
    }

    // Check for access tier upgrades
    if (prev.playlistAccess !== current.playlistAccess) {
      toast({
        title: '🎵 Playlist Access Upgraded!',
        description: `You now have ${current.playlistAccess} playlist access`,
        duration: 4000,
      });
    }

    if (prev.pressAccess !== current.pressAccess) {
      toast({
        title: '📰 Press Access Upgraded!',
        description: `You now have ${current.pressAccess} press access`,
        duration: 4000,
      });
    }

    if (prev.venueAccess !== current.venueAccess) {
      toast({
        title: '🏟️ Venue Access Upgraded!',
        description: `You now have ${current.venueAccess} venue access`,
        duration: 4000,
      });
    }

    prevGameState.current = gameState;
  }, [gameState, toast]);

  return <Toaster />;
}
