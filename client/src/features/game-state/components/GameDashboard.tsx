import React from 'react';
import { GameState } from '@shared/types/gameTypes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArtistList } from '../../artists/components/ArtistList';
import { ProjectList } from '../../projects/components/ProjectList';
import { MonthSummary } from './MonthSummary';
import { AccessTierBadges } from '@/components/AccessTierBadges';
import { ProjectCreationModal } from '@/components/ProjectCreationModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface GameDashboardProps {
  gameState: GameState & { artists?: any[]; projects?: any[] };
  onPlanMonth: () => void;
  isAdvancing: boolean;
}

export function GameDashboard({ gameState, onPlanMonth, isAdvancing }: GameDashboardProps) {
  return (
    <ErrorBoundary>
      <div className="container mx-auto px-6 py-8">
        {/* Access Tier Badges */}
        <div className="mb-8">
          <AccessTierBadges gameState={gameState} />
        </div>
        
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
                <CardContent className="space-y-4">
                  <ProjectList projects={gameState.projects || []} />
                  <ProjectCreationModal 
                    gameState={gameState}
                    artists={gameState.artists || []}
                    onCreateProject={(projectData) => {
                      console.log('Creating project:', projectData);
                      // TODO: Integrate with project creation API
                    }}
                    isCreating={false}
                  />
                </CardContent>
              </Card>
            </div>
            
            <div className="text-center">
              <Button
                onClick={onPlanMonth}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-3 text-lg"
              >
                📅 Plan Next Month
              </Button>
            </div>
          </div>

          <div>
            <MonthSummary 
              monthlyStats={gameState.monthlyStats}
              onAdvanceMonth={onPlanMonth}
              isAdvancing={isAdvancing}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}