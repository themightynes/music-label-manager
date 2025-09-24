import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
import { useLocation } from 'wouter';
import { useState } from 'react';

export function ActiveRecordingSessions() {
  const { projects, artists, gameState, songs } = useGameStore();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const handleNavigateToRecordingSession = () => {
    setLocation('/recording-session');
  };

  const getProjectProgress = (project: any) => {
    const stages = ['planning', 'writing', 'recording'];
    const currentStageIndex = stages.indexOf(project.stage || 'planning');
    return ((currentStageIndex + 1) / stages.length) * 100;
  };

  const getStatusBadgeClass = (stage: string) => {
    switch (stage) {
      case 'planning': return 'bg-[#65557c] text-white';
      case 'writing': return 'bg-warning text-white';
      case 'recording': return 'bg-[#A75A5B] text-white';
      case 'recorded': return 'bg-green-500 text-white';
      case 'production': return 'bg-warning text-white';
      case 'marketing': return 'bg-[#A75A5B] text-white';
      case 'released': return 'bg-success text-white';
      default: return 'bg-[#65557c] text-white';
    }
  };

  const getStatusText = (stage: string) => {
    switch (stage) {
      case 'planning': return 'Planning';
      case 'writing': return 'Writing';
      case 'recording': return 'Recording';
      case 'recorded': return '✓ Complete';
      case 'production': return 'Writing';
      case 'marketing': return 'Recording';
      case 'released': return '✨ Released';
      default: return 'Planning';
    }
  };

  const getActiveRecordingSessions = () => {
    return projects.filter(p =>
      p.type !== 'Mini-Tour' && (
        p.stage === 'planning' ||
        p.stage === 'writing' ||
        p.stage === 'recording' ||
        p.stage === 'production'
      )
    );
  };

  const getCompletedRecordingSessions = () => {
    return projects.filter(p =>
      p.type !== 'Mini-Tour' && (
        p.stage === 'recorded' ||
        p.stage === 'released'
      )
    );
  };

  const getProjectSongs = (projectId: string) => {
    return songs.filter((song: any) => {
      const metadata = song.metadata as any;
      return metadata?.projectId === projectId;
    });
  };

  const getArtistName = (artistId: string) => {
    const artist = artists.find(a => a.id === artistId);
    return artist?.name || 'Unknown Artist';
  };


  const activeRecordingSessions = getActiveRecordingSessions();
  const completedRecordingSessions = getCompletedRecordingSessions();
  const currentRecordingSessions = activeTab === 'active' ? activeRecordingSessions : completedRecordingSessions;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white flex items-center">
            <i className="fas fa-microphone text-[#A75A5B] mr-2"></i>
            Recording Sessions
          </h3>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {activeRecordingSessions.length + completedRecordingSessions.length}
            </Badge>
            <Button
              size="sm"
              onClick={handleNavigateToRecordingSession}
              className="bg-[#A75A5B] hover:bg-[#8a4a4b] text-white text-xs px-3 py-1.5"
            >
              + Recording Session
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-4 bg-[#3c252d]/30 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'active'
                ? 'bg-[#A75A5B]/20 text-white border border-[#A75A5B]/40 shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Active Sessions
            {activeRecordingSessions.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {activeRecordingSessions.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'completed'
                ? 'bg-[#A75A5B]/20 text-white border border-[#A75A5B]/40 shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Completed Sessions
            {completedRecordingSessions.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {completedRecordingSessions.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Recording Sessions List */}
        <div className="space-y-3">
          {currentRecordingSessions.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              <i className="fas fa-microphone text-2xl mb-2 block text-white/50"></i>
              <p className="text-sm">
                {activeTab === 'active' ? 'No active recording sessions' : 'No completed sessions yet'}
              </p>
              <p className="text-xs">
                {activeTab === 'active' ? 'Create a new recording session to get started' : 'Sessions will appear here once completed'}
              </p>
            </div>
          ) : (
            currentRecordingSessions.map(project => (
              <div key={project.id} className="border border-[#4e324c] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-white text-sm">{project.title}</h4>
                    <div className="text-xs text-white/70">{getArtistName(project.artistId || '')}</div>
                  </div>
                  <Badge className={`text-xs px-2 py-1 ${getStatusBadgeClass(project.stage || 'planning')}`}>
                    {getStatusText(project.stage || 'planning')}
                  </Badge>
                </div>

                <div className="space-y-1">
                  {/* Only show progress for active sessions */}
                  {activeTab === 'active' && (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/50">Progress</span>
                        <span className="font-mono">{Math.round(getProjectProgress(project))}%</span>
                      </div>
                      <Progress value={getProjectProgress(project)} className="w-full h-1.5" />
                    </>
                  )}



                  {/* Information for Completed Projects */}
                  {project.stage === 'recorded' && (() => {
                    const projectSongs = getProjectSongs(project.id);
                    const releasedSongs = projectSongs.filter(song => song.isReleased);
                    const songsRecorded = project.songsCreated || project.songCount || 0;

                    return (
                      <div className="pt-2 border-t border-[#4e324c] space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Songs Recorded</span>
                          <span className="font-mono text-green-600">
                            {songsRecorded} song{songsRecorded !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Session Cost</span>
                          <span className="font-mono text-white/70">
                            ${(project.totalCost || 0).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Songs Released</span>
                          <span className="font-mono text-[#A75A5B]">
                            {releasedSongs.length} song{releasedSongs.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>
            ))
          )}
        </div>

      </CardContent>
    </Card>
  );
}