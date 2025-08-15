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
    if (prev.money !== current.money) {
      const change = current.money - prev.money;
      const icon = change > 0 ? '💰' : '💸';
      toast({
        title: `${icon} Money ${change > 0 ? '+' : ''}${change.toLocaleString()}`,
        description: `Current balance: $${current.money.toLocaleString()}`,
        duration: 3000,
      });
    }

    // Check for reputation changes
    if (prev.reputation !== current.reputation) {
      const change = current.reputation - prev.reputation;
      const icon = change > 0 ? '⭐' : '📉';
      toast({
        title: `${icon} Reputation ${change > 0 ? '+' : ''}${change}`,
        description: `Current reputation: ${current.reputation}`,
        duration: 3000,
      });
    }

    // Check for creative capital changes
    if (prev.creativeCapital !== current.creativeCapital) {
      const change = current.creativeCapital - prev.creativeCapital;
      const icon = change > 0 ? '💡' : '🔥';
      toast({
        title: `${icon} Creative Capital ${change > 0 ? '+' : ''}${change}`,
        description: `Current creative capital: ${current.creativeCapital}`,
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
