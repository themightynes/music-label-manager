import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
import { PROJECT_TYPES } from '@/lib/gameData';
import { ProjectCreationModal, type ProjectCreationData } from './ProjectCreationModal';
import { useState } from 'react';

export function ActiveProjects() {
  const { projects, artists, createProject, gameState } = useGameStore();
  const [creatingProject, setCreatingProject] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const handleCreateProject = async (projectData: ProjectCreationData) => {
    if (creatingProject) return;

    setCreatingProject(true);
    try {
      await createProject({
        title: projectData.title,
        type: projectData.type,
        artistId: projectData.artistId,
        budget: projectData.budget,
        budgetUsed: 0,
        quality: 0,
        dueMonth: (gameState?.currentMonth || 1) + 3, // Due in 3 months
        songCount: projectData.songCount || 1, // Include song count for recording projects
        songsCreated: 0 // Initialize songs created counter
      });
      setShowProjectModal(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreatingProject(false);
    }
  };

  const getProjectProgress = (project: any) => {
    const stages = ['planning', 'production', 'marketing', 'released'];
    const currentStageIndex = stages.indexOf(project.stage || 'planning');
    return ((currentStageIndex + 1) / stages.length) * 100;
  };

  const getStatusBadgeClass = (stage: string) => {
    switch (stage) {
      case 'planning': return 'bg-slate-400 text-white';
      case 'production': return 'bg-warning text-white';
      case 'marketing': return 'bg-primary text-white';
      case 'released': return 'bg-success text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  const getStatusText = (stage: string) => {
    switch (stage) {
      case 'planning': return 'Planning';
      case 'production': return 'Production';
      case 'marketing': return 'Marketing';
      case 'released': return '✨ Released';
      default: return 'Planning';
    }
  };

  const calculateProjectROI = (project: any) => {
    if (project.stage !== 'released') return null;
    const metadata = project.metadata as any || {};
    const revenue = metadata.revenue || 0;
    if (!revenue) return null;
    
    const investment = project.budget || 0;
    const roi = investment > 0 ? ((revenue - investment) / investment) * 100 : 0;
    return { roi, revenue, investment };
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
    
    releasedProjects.forEach(project => {
      const metadata = project.metadata as any || {};
      const revenue = metadata.revenue || 0;
      const investment = project.budget || 0;
      const streams = metadata.streams || 0;
      
      totalRevenue += revenue;
      totalInvestment += investment;
      totalStreams += streams;
      
      if (revenue > investment) {
        profitableProjects++;
      }
    });
    
    const portfolioROI = totalInvestment > 0 ? ((totalRevenue - totalInvestment) / totalInvestment) * 100 : 0;
    const successRate = (profitableProjects / releasedProjects.length) * 100;
    
    return {
      totalRevenue,
      totalInvestment,
      totalStreams,
      portfolioROI,
      successRate,
      releasedCount: releasedProjects.length,
      profitableProjects
    };
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <i className="fas fa-tasks text-primary mr-2"></i>
          Active Projects
        </h3>

        {/* Portfolio Performance Summary */}
        {(() => {
          const stats = calculatePortfolioStats();
          if (stats) {
            return (
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border">
                <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center">
                  <i className="fas fa-chart-line text-slate-500 mr-2"></i>
                  Portfolio Performance
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Revenue</span>
                    <span className="font-mono font-medium text-green-600">
                      ${stats.totalRevenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Portfolio ROI</span>
                    <span className={`font-mono font-medium ${stats.portfolioROI >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatROI(stats.portfolioROI)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Released Projects</span>
                    <span className="font-mono text-slate-700">
                      {stats.releasedCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Success Rate</span>
                    <span className="font-mono text-blue-600">
                      {stats.successRate.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        <div className="space-y-4">
          {projects.map(project => (
            <div key={project.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-900">{project.title}</h4>
                <Badge className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClass(project.stage || 'planning')}`}>
                  {getStatusText(project.stage || 'planning')}
                </Badge>
              </div>
              
              <div className="text-xs text-slate-600 mb-3">{getArtistName(project.artistId || '')}</div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-mono">{Math.round(getProjectProgress(project))}%</span>
                </div>
                <Progress value={getProjectProgress(project)} className="w-full h-2" />
                
                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="text-slate-500">Budget Used</span>
                  <span className="font-mono">
                    ${(project.budgetUsed || 0).toLocaleString()} / ${(project.budget || 0).toLocaleString()}
                  </span>
                </div>

                {/* Revenue Information for Released Projects */}
                {project.stage === 'released' && (() => {
                  const roiData = calculateProjectROI(project);
                  if (roiData) {
                    return (
                      <div className="pt-2 border-t border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Revenue</span>
                          <span className="font-mono text-green-600">
                            ${roiData.revenue.toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">ROI</span>
                          <span className={`font-mono font-medium ${roiData.roi >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {formatROI(roiData.roi)}
                          </span>
                        </div>

                        {(() => {
                          const metadata = project.metadata as any || {};
                          const streams = metadata.streams;
                          const pressPickups = metadata.pressPickups;
                          const releaseMonth = metadata.releaseMonth;
                          
                          return (
                            <>
                              {streams && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-500">Streams</span>
                                  <span className="font-mono text-blue-600">
                                    {streams.toLocaleString()}
                                  </span>
                                </div>
                              )}

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

          {/* Add Project Button */}
          <Button
            variant="outline"
            className="w-full border-2 border-dashed border-slate-300 p-4 text-center hover:border-primary hover:bg-primary/5 group"
            onClick={() => setShowProjectModal(true)}
            disabled={creatingProject || artists.length === 0}
          >
            <div className="text-center">
              <i className="fas fa-plus text-slate-400 group-hover:text-primary text-xl mb-2 transition-colors"></i>
              <p className="text-sm text-slate-500 group-hover:text-primary transition-colors">
                {creatingProject ? 'Creating...' : 'Start New Project'}
              </p>
            </div>
          </Button>

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
