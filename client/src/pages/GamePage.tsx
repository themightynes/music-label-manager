import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Dashboard } from '@/components/Dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function GamePage() {
  const { gameState, createNewGame, loadGame } = useGameStore();
  const [isCreating, setIsCreating] = useState(false);
  const [campaignType, setCampaignType] = useState('Balanced');

  const handleCreateGame = async () => {
    setIsCreating(true);
    try {
      await createNewGame(campaignType);
    } catch (error) {
      console.error('Failed to create game:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // If no game is loaded, show the game creation screen
  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <i className="fas fa-music text-primary text-4xl mb-4"></i>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Music Label Manager</h1>
              <p className="text-slate-600">Start your journey as a record label executive</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Campaign Focus
                </label>
                <Select value={campaignType} onValueChange={setCampaignType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select campaign type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Commercial">Commercial King</SelectItem>
                    <SelectItem value="Critical">Critical Darling</SelectItem>
                    <SelectItem value="Balanced">Balanced Mogul</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  This determines how your success will be measured
                </p>
              </div>

              <Button
                onClick={handleCreateGame}
                disabled={isCreating}
                className="w-full bg-primary text-white hover:bg-indigo-700"
                size="lg"
              >
                {isCreating ? 'Creating Game...' : 'Start New Campaign'}
              </Button>

              <div className="text-center">
                <Button
                  variant="ghost"
                  className="text-slate-600 hover:text-slate-900"
                >
                  Load Existing Game
                </Button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="text-sm font-medium text-slate-900 mb-2">Game Overview</h3>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• 12-month campaign with monthly turns</li>
                <li>• Sign and develop up to 3 artists</li>
                <li>• Build relationships with 8 industry roles</li>
                <li>• Create singles, EPs, and mini-tours</li>
                <li>• Unlock access to playlists, press, and venues</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <Dashboard />;
}
