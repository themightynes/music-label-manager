import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
// PROJECT_TYPES moved to API - removed import
import { ProjectCreationModal, type ProjectCreationData } from './ProjectCreationModal';
import { useState } from 'react';
import { useProjectROI, usePortfolioROI } from '@/hooks/useAnalytics';

export function ActiveProjects() {
  const { projects, artists, createProject, gameState, songs } = useGameStore();
  const [creatingProject, setCreatingProject] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const handleCreateProject = async (projectData: ProjectCreationData) => {
    if (creatingProject) return;

    setCreatingProject(true);
    try {
      await createProject({
        title: projectData.title,
        type: projectData.type,
        artistId: projectData.artistId,
        budgetPerSong: projectData.budgetPerSong,
        totalCost: projectData.totalCost || 0,
        costUsed: 0,
        quality: 0,
        dueMonth: (gameState?.currentMonth || 1) + 3, // Due in 3 months
        songCount: projectData.songCount || 1, // Include song count for recording projects
        songsCreated: 0, // Initialize songs created counter
        metadata: {
          producerTier: projectData.producerTier,
          timeInvestment: projectData.timeInvestment,
          enhancedProject: true,
          createdAt: new Date().toISOString()
        }
      });
      setShowProjectModal(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreatingProject(false);
    }
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
      case 'production': return 'bg-warning text-white'; // Legacy support
      case 'marketing': return 'bg-[#A75A5B] text-white'; // Legacy support 
      case 'released': return 'bg-success text-white'; // Legacy support
      default: return 'bg-[#65557c] text-white';
    }
  };

  const getStatusText = (stage: string) => {
    switch (stage) {
      case 'planning': return 'Planning';
      case 'writing': return 'Writing';
      case 'recording': return 'Recording';
      case 'recorded': return '✓ Complete';
      case 'production': return 'Writing'; // Legacy support
      case 'marketing': return 'Recording'; // Legacy support
      case 'released': return '✨ Released'; // Legacy support
      default: return 'Planning';
    }
  };

  // Filter projects by status
  const getActiveProjects = () => {
    return projects.filter(p => 
      p.stage === 'planning' || 
      p.stage === 'writing' || 
      p.stage === 'recording' ||
      p.stage === 'production' || // Legacy support
      p.stage === 'marketing' // Legacy support
    );
  };

  const getCompletedProjects = () => {
    return projects.filter(p => p.stage === 'recorded' || p.stage === 'released');
  };

  // Get songs for a specific project (kept for display purposes)
  const getProjectSongs = (projectId: string) => {
    return songs.filter((song: any) => {
      const metadata = song.metadata as any;
      return metadata?.projectId === projectId;
    });
  };

  const formatROI = (roi: number) => {
    const sign = roi >= 0 ? '+' : '';
    return `${sign}${roi.toFixed(1)}%`;
  };

  const getArtistName = (artistId: string) => {
    const artist = artists.find(a => a.id === artistId);
    return artist?.name || 'Unknown Artist';
  };

  // Component to display project ROI using the backend hook
  const ProjectROIDisplay = ({ project }: { project: any }) => {
    const { data: metrics, isLoading } = useProjectROI(project.id);
    
    if (isLoading) return null;
    if (!metrics || !metrics.totalRevenue) return null;
    
    return (
      <div className="pt-2 border-t border-[#4e324c] space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/50">Total Revenue</span>
          <span className="font-mono text-green-600">
            ${metrics.totalRevenue.toLocaleString()}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/50">ROI</span>
          <span className={`font-mono font-medium ${metrics.roi >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatROI(metrics.roi)}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/50">Songs Released</span>
          <span className="font-mono text-[#791014]">
            {metrics.songCount} song{metrics.songCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>
    );
  };

  // Component to display portfolio stats using the backend hook
  const PortfolioStatsDisplay = () => {
    const { data: stats, isLoading } = usePortfolioROI();
    
    if (isLoading || !stats || stats.releasedSongs === 0) return null;
    
    return (
      <div className="mb-3 p-3 bg-[#3c252d]/20 rounded-lg border">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-center">
            <div className="font-medium text-green-600">${stats.totalRevenue.toLocaleString()}</div>
            <div className="text-white/50">Revenue</div>
          </div>
          <div className="text-center">
            <div className={`font-medium ${stats.overallROI >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatROI(stats.overallROI)}
            </div>
            <div className="text-white/50">ROI</div>
          </div>
        </div>
      </div>
    );
  };

  const activeProjects = getActiveProjects();
  const completedProjects = getCompletedProjects();
  const currentProjects = activeTab === 'active' ? activeProjects : completedProjects;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <h3 className="text-base font-semibold text-white mb-3 flex items-center justify-between">
          <div className="flex items-center">
            <i className="fas fa-music text-[#A75A5B] mr-2"></i>
            Recording Sessions
          </div>
          <Badge variant="secondary" className="text-xs">
            {projects.length}
          </Badge>
        </h3>

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
            {activeProjects.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {activeProjects.length}
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
            {completedProjects.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {completedProjects.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Compact Portfolio Summary - Using backend data */}
        <PortfolioStatsDisplay />

        <div className="space-y-3">
          {currentProjects.map(project => (
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

                {/* Simple info for completed sessions */}
                {activeTab === 'completed' && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">Session Complete</span>
                    <span className="font-mono text-green-600">
                      {(() => {
                        const projectSongs = getProjectSongs(project.id);
                        const recordedSongs = projectSongs.filter(song => song.isRecorded);
                        return `${recordedSongs.length} song${recordedSongs.length !== 1 ? 's' : ''} recorded`;
                      })()}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">
                    {(project.songCount || 1) > 1 ? 'Budget per song' : 'Budget'}
                  </span>
                  <span className="font-mono">
                    {(project.songCount || 1) > 1 
                      ? `$${(project.budgetPerSong || 0).toLocaleString()} × ${project.songCount || 1} = $${(project.totalCost || 0).toLocaleString()}`
                      : `$${(project.costUsed || 0).toLocaleString()} / $${(project.totalCost || project.budgetPerSong || 0).toLocaleString()}`
                    }
                  </span>
                </div>

                {/* Information for Recorded Projects */}
                {project.stage === 'recorded' && (() => {
                  const projectSongs = getProjectSongs(project.id);
                  const recordedSongs = projectSongs.filter(song => song.isRecorded);
                  const readySongs = projectSongs.filter(song => song.isRecorded && !song.isReleased);
                  
                  return (
                    <div className="pt-2 border-t border-[#4e324c] space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/50">Songs Recorded</span>
                        <span className="font-mono text-green-600">
                          {recordedSongs.length} song{recordedSongs.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/50">Ready for Release</span>
                        <span className="font-mono text-[#A75A5B]">
                          {readySongs.length} song{readySongs.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {readySongs.length > 0 && (
                        <div className="text-xs text-white/70 italic">
                          Use Plan Release to publish these songs
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Enhanced Revenue Information for Released Projects - Using Backend Data */}
                {project.stage === 'released' && <ProjectROIDisplay project={project} />}
              </div>
            </div>
          ))}



          {/* Empty state for completed sessions */}
          {activeTab === 'completed' && completedProjects.length === 0 && (
            <div className="text-center py-8 text-white/50">
              <i className="fas fa-music text-2xl mb-2 block text-white/50"></i>
              <p className="text-sm">No completed recording sessions yet</p>
              <p className="text-xs">Sessions will appear here once recording is complete</p>
            </div>
          )}

          {/* Project Creation Modal */}
          {gameState && (
            <ProjectCreationModal
              gameState={gameState}
              artists={artists}
              onCreateProject={handleCreateProject}
              isCreating={creatingProject}
              open={showProjectModal}
              onOpenChange={setShowProjectModal}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
