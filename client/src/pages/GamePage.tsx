import React, { useState } from 'react';
import { useGameState, useAdvanceMonth } from '../features/game-state/hooks/useGameState';
import { GameHeader } from '../features/game-state/components/GameHeader';
import { ArtistList } from '../features/artists/components/ArtistList';
import { ProjectList } from '../features/projects/components/ProjectList';
import { MonthSummary } from '../features/game-state/components/MonthSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function GamePage() {
  const [view, setView] = useState<'dashboard' | 'planner'>('dashboard');
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  
  const { data: gameState, isLoading, error } = useGameState('demo-game');
  const advanceMonth = useAdvanceMonth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-yellow-500 text-xl">🎵 Loading Music Label Manager...</div>
      </div>
    );
  }
  
  if (error || !gameState) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500 text-xl">Failed to load game state</div>
      </div>
    );
  }

  const handleActionToggle = (actionId: string) => {
    setSelectedActions(prev => {
      if (prev.includes(actionId)) {
        return prev.filter(id => id !== actionId);
      } else if (prev.length < 3) {
        return [...prev, actionId];
      }
      return prev;
    });
  };

  if (view === 'planner') {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-black text-white">
          <GameHeader gameState={gameState} />
          
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-yellow-500">📅 Month Planner - Select up to 3 Focus Actions</h1>
              <Button variant="outline" onClick={() => setView('dashboard')}>
                ← Back to Dashboard
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-semibold mb-4">Industry Meetings</h2>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'manager', name: 'Manager', relationship: 75 },
                    { id: 'anr', name: 'A&R Rep', relationship: 65 },
                    { id: 'producer', name: 'Producer', relationship: 55 },
                    { id: 'pr', name: 'PR Specialist', relationship: 60 },
                    { id: 'digital', name: 'Digital Marketing', relationship: 50 },
                    { id: 'streaming', name: 'Streaming Curator', relationship: 45 },
                    { id: 'booking', name: 'Booking Agent', relationship: 40 },
                    { id: 'ops', name: 'Operations Manager', relationship: 55 }
                  ].map(role => (
                    <div
                      key={role.id}
                      onClick={() => handleActionToggle(role.id)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedActions.includes(role.id)
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{role.name}</h3>
                          <p className="text-sm text-gray-400">Relationship: {role.relationship}%</p>
                        </div>
                        <Badge variant={selectedActions.includes(role.id) ? 'default' : 'secondary'}>
                          {selectedActions.includes(role.id) ? 'Selected' : 'Available'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">Projects</h2>
                <div className="grid grid-cols-1 gap-3 mb-8">
                  {[
                    { id: 'record-single', name: 'Record Single', cost: '$3k-12k' },
                    { id: 'plan-ep', name: 'Plan EP', cost: '$15k-35k' },
                    { id: 'plan-tour', name: 'Plan Mini-Tour', cost: '$5k-15k' }
                  ].map(project => (
                    <div
                      key={project.id}
                      onClick={() => handleActionToggle(project.id)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedActions.includes(project.id)
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{project.name}</h3>
                          <p className="text-sm text-gray-400">{project.cost}</p>
                        </div>
                        <Badge variant={selectedActions.includes(project.id) ? 'default' : 'secondary'}>
                          {selectedActions.includes(project.id) ? 'Selected' : 'Available'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center">
                  <p className="text-gray-400 mb-4">
                    Selected: {selectedActions.length}/3 actions
                  </p>
                  <Button
                    onClick={() => {
                      advanceMonth.mutate(selectedActions);
                      setSelectedActions([]);
                      setView('dashboard');
                    }}
                    disabled={selectedActions.length === 0 || advanceMonth.isPending}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-12 py-4 text-xl"
                  >
                    🚀 ADVANCE MONTH
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black text-white">
        <GameHeader gameState={gameState} />
        
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-yellow-500">Artists</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ArtistList artists={gameState.artists || []} />
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-yellow-500">Projects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ProjectList projects={gameState.projects || []} />
                  </CardContent>
                </Card>
              </div>
              
              <div className="text-center">
                <Button
                  onClick={() => setView('planner')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-3 text-lg"
                >
                  📅 Plan Next Month
                </Button>
              </div>
            </div>

            <div>
              <MonthSummary 
                monthlyStats={gameState.monthlyStats}
                onAdvanceMonth={() => setView('planner')}
                isAdvancing={advanceMonth.isPending}
              />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}