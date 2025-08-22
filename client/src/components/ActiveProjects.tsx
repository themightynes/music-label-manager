import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
// PROJECT_TYPES moved to API - removed import
import { ProjectCreationModal, type ProjectCreationData } from './ProjectCreationModal';
import { useState } from 'react';

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
      case 'planning': return 'bg-slate-400 text-white';
      case 'writing': return 'bg-warning text-white';
      case 'recording': return 'bg-primary text-white';
      case 'recorded': return 'bg-green-500 text-white';
      case 'production': return 'bg-warning text-white'; // Legacy support
      case 'marketing': return 'bg-primary text-white'; // Legacy support 
      case 'released': return 'bg-success text-white'; // Legacy support
      default: return 'bg-slate-400 text-white';
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

  // Get songs for a specific project
  const getProjectSongs = (projectId: string) => {
    return songs.filter((song: any) => {
      const metadata = song.metadata as any;
      return metadata?.projectId === projectId;
    });
  };

  // Calculate aggregated metrics from individual songs
  const calculateProjectMetrics = (project: any) => {
    // Only show revenue metrics for actually released projects (legacy)
    // Recorded projects won't show revenue until songs are released via Plan Release
    if (project.stage !== 'released') return null;
    
    const projectSongs = getProjectSongs(project.id);
    if (projectSongs.length === 0) {
      // Fallback to legacy project metadata if no individual songs found
      const metadata = project.metadata as any || {};
      const revenue = metadata.revenue || 0;
      const streams = metadata.streams || 0;
      const songCount = metadata.songCount || 0;
      
      if (!revenue) return null;
      
      const investment = project.totalCost || project.budgetPerSong || 0;
      const roi = investment > 0 ? ((revenue - investment) / investment) * 100 : 0;
      return { roi, revenue, investment, streams, songCount, individual: false };
    }
    
    // Calculate aggregated metrics from individual songs
    const totalRevenue = projectSongs.reduce((sum: number, song: any) => sum + (song.totalRevenue || 0), 0);
    const totalStreams = projectSongs.reduce((sum: number, song: any) => sum + (song.totalStreams || 0), 0);
    const lastMonthRevenue = projectSongs.reduce((sum: number, song: any) => sum + (song.lastMonthRevenue || 0), 0);
    
    if (!totalRevenue) return null;
    
    const investment = project.totalCost || project.budgetPerSong || 0;
    const roi = investment > 0 ? ((totalRevenue - investment) / investment) * 100 : 0;
    
    return { 
      roi, 
      revenue: totalRevenue, 
      investment, 
      streams: totalStreams, 
      songCount: projectSongs.length,
      lastMonthRevenue,
      individual: true,
      songs: projectSongs
    };
  };

  const calculateProjectROI = (project: any) => {
    return calculateProjectMetrics(project);
  };

  const formatROI = (roi: number) => {
    const sign = roi >= 0 ? '+' : '';
    return `${sign}${roi.toFixed(1)}%`;
  };

  const getArtistName = (artistId: string) => {
    const artist = artists.find(a => a.id === artistId);
    return artist?.name || 'Unknown Artist';
  };

  const calculatePortfolioStats = () => {
    const releasedProjects = projects.filter(p => p.stage === 'released');
    if (releasedProjects.length === 0) return null;
    
    let totalRevenue = 0;
    let totalInvestment = 0;
    let totalStreams = 0;
    let profitableProjects = 0;
    let totalSongs = 0;
    
    releasedProjects.forEach(project => {
      const metrics = calculateProjectMetrics(project);
      if (metrics) {
        totalRevenue += metrics.revenue;
        totalInvestment += metrics.investment;
        totalStreams += metrics.streams;
        totalSongs += metrics.songCount;
        
        if (metrics.revenue > metrics.investment) {
          profitableProjects++;
        }
      }
    });
    
    const portfolioROI = totalInvestment > 0 ? ((totalRevenue - totalInvestment) / totalInvestment) * 100 : 0;
    const successRate = (profitableProjects / releasedProjects.length) * 100;
    
    return {
      totalRevenue,
      totalInvestment,
      totalStreams,
      totalSongs,
      portfolioROI,
      successRate,
      releasedCount: releasedProjects.length,
      profitableProjects
    };
  };

  const activeProjects = getActiveProjects();
  const completedProjects = getCompletedProjects();
  const currentProjects = activeTab === 'active' ? activeProjects : completedProjects;

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
      <CardContent className="p-4">
        <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center justify-between">
          <div className="flex items-center">
            <i className="fas fa-music text-primary mr-2"></i>
            Recording Sessions
          </div>
          <Badge variant="secondary" className="text-xs">
            {projects.length}
          </Badge>
        </h3>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-4 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'active'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
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
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
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

        {/* Compact Portfolio Summary */}
        {(() => {
          const stats = calculatePortfolioStats();
          if (stats) {
            return (
              <div className="mb-3 p-3 bg-slate-50 rounded-lg border">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-medium text-green-600">${stats.totalRevenue.toLocaleString()}</div>
                    <div className="text-slate-500">Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-medium ${stats.portfolioROI >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatROI(stats.portfolioROI)}
                    </div>
                    <div className="text-slate-500">ROI</div>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        <div className="space-y-3">
          {currentProjects.map(project => (
            <div key={project.id} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-medium text-slate-900 text-sm">{project.title}</h4>
                  <div className="text-xs text-slate-600">{getArtistName(project.artistId || '')}</div>
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
                      <span className="text-slate-500">Progress</span>
                      <span className="font-mono">{Math.round(getProjectProgress(project))}%</span>
                    </div>
                    <Progress value={getProjectProgress(project)} className="w-full h-1.5" />
                  </>
                )}

                {/* Simple info for completed sessions */}
                {activeTab === 'completed' && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Session Complete</span>
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
                  <span className="text-slate-500">
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
                    <div className="pt-2 border-t border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Songs Recorded</span>
                        <span className="font-mono text-green-600">
                          {recordedSongs.length} song{recordedSongs.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Ready for Release</span>
                        <span className="font-mono text-blue-600">
                          {readySongs.length} song{readySongs.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {readySongs.length > 0 && (
                        <div className="text-xs text-slate-600 italic">
                          Use Plan Release to publish these songs
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Enhanced Revenue Information for Released Projects (Legacy) */}
                {project.stage === 'released' && (() => {
                  const metrics = calculateProjectMetrics(project);
                  if (metrics) {
                    return (
                      <div className="pt-2 border-t border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Total Revenue</span>
                          <span className="font-mono text-green-600">
                            ${metrics.revenue.toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">ROI</span>
                          <span className={`font-mono font-medium ${metrics.roi >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {formatROI(metrics.roi)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Total Streams</span>
                          <span className="font-mono text-blue-600">
                            {metrics.streams.toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Songs Released</span>
                          <span className="font-mono text-purple-600">
                            {metrics.songCount} song{metrics.songCount > 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Show last month revenue if using individual tracking */}
                        {metrics.individual && metrics.lastMonthRevenue > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Last Month</span>
                            <span className="font-mono text-green-600">
                              +${metrics.lastMonthRevenue.toLocaleString()}
                            </span>
                          </div>
                        )}

                        {/* Show individual tracking indicator */}
                        {metrics.individual && (
                          <div className="text-xs text-center text-slate-400 mt-1">
                            🎵 Individual song tracking active
                          </div>
                        )}

                        {/* Legacy metadata fallback */}
                        {!metrics.individual && (() => {
                          const metadata = project.metadata as any || {};
                          const pressPickups = metadata.pressPickups;
                          const releaseMonth = metadata.releaseMonth;
                          
                          return (
                            <>
                              {pressPickups && pressPickups > 0 && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-500">Press Coverage</span>
                                  <span className="font-mono text-purple-600">
                                    {pressPickups} pickup{pressPickups > 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}

                              {releaseMonth && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-500">Released</span>
                                  <span className="font-mono text-slate-600">
                                    Month {releaseMonth}
                                  </span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          ))}

          {/* Add Project Button - Only show in active tab */}
          {activeTab === 'active' && (
            <Button
              variant="outline"
              className="w-full border-2 border-dashed border-slate-300 p-3 text-center hover:border-primary hover:bg-primary/5 text-xs"
              onClick={() => setShowProjectModal(true)}
              disabled={creatingProject || artists.length === 0}
            >
              <i className="fas fa-plus mr-1"></i>
              {creatingProject ? 'Creating...' : 'Start New Recording Session'}
            </Button>
          )}

          {/* Empty state for completed sessions */}
          {activeTab === 'completed' && completedProjects.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <i className="fas fa-music text-2xl mb-2 block text-slate-400"></i>
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
