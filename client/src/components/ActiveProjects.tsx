import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useGameStore } from '@/store/gameStore';
// PROJECT_TYPES moved to API - removed import
import { ProjectCreationModal, type ProjectCreationData } from './ProjectCreationModal';
import { useState } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, DollarSign, Users, Calculator } from 'lucide-react';
import { useProjectROI, usePortfolioROI } from '@/hooks/useAnalytics';

export function ActiveProjects() {
  const { projects, artists, createProject, cancelProject, gameState, songs } = useGameStore();
  const [creatingProject, setCreatingProject] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [projectToCancel, setProjectToCancel] = useState<any>(null);
  const [expandedCityDetails, setExpandedCityDetails] = useState<{[key: string]: boolean}>({});

  const toggleCityDetails = (cityKey: string) => {
    setExpandedCityDetails(prev => ({
      ...prev,
      [cityKey]: !prev[cityKey]
    }));
  };

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

  // Show cancellation modal for tours
  const handleCancelTour = (project: any) => {
    setProjectToCancel(project);
    setShowCancelModal(true);
  };

  // Confirm cancellation and process refund
  const handleConfirmCancellation = async () => {
    if (!projectToCancel) return;

    try {
      console.log('Cancelling tour:', projectToCancel.title);
      // Calculate cancellation penalty based on remaining cities
      const tourStats = projectToCancel.metadata?.tourStats;
      const citiesPlanned = projectToCancel.metadata?.cities || 1;
      const citiesCompleted = tourStats?.cities?.length || 0;
      const remainingCities = Math.max(0, citiesPlanned - citiesCompleted);
      
      // Calculate partial refund (60% of remaining cities cost)
      const refundPercentage = 0.6;
      const costPerCity = projectToCancel.totalCost / citiesPlanned;
      const refundAmount = Math.round(remainingCities * costPerCity * refundPercentage);
      
      console.log(`Cancellation details:`, {
        citiesPlanned,
        citiesCompleted, 
        remainingCities,
        originalCost: projectToCancel.totalCost,
        refundAmount
      });
      
      // Call API to cancel tour and process refund
      await cancelProject(projectToCancel.id, { refundAmount });
      
      // Close modal
      setShowCancelModal(false);
      setProjectToCancel(null);
      
      console.log(`✅ Tour cancelled. Refund: $${refundAmount.toLocaleString()}`);
    } catch (error) {
      console.error('Failed to cancel tour:', error);
      // Keep modal open on error
    }
  };

  // Calculate cancellation details for display
  const getCancellationDetails = (project: any) => {
    if (!project) return null;
    
    const tourStats = project.metadata?.tourStats;
    const citiesPlanned = project.metadata?.cities || 1;
    const citiesCompleted = tourStats?.cities?.length || 0;
    const remainingCities = Math.max(0, citiesPlanned - citiesCompleted);
    
    const refundPercentage = 0.6;
    const costPerCity = project.totalCost / citiesPlanned;
    const refundAmount = Math.round(remainingCities * costPerCity * refundPercentage);
    const sunkCosts = project.totalCost - refundAmount;
    
    return {
      citiesPlanned,
      citiesCompleted,
      remainingCities,
      refundAmount,
      sunkCosts,
      costPerCity
    };
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
      case 'cancelled': return 'bg-red-600 text-white'; // Cancelled tours
      default: return 'bg-[#65557c] text-white';
    }
  };

  const getStatusText = (stage: string, project?: any) => {
    // Tour-specific status text
    if (project?.type === 'Mini-Tour') {
      switch (stage) {
        case 'planning': return 'Planning';
        case 'production': {
          // Show current city progress for tours in production
          const tourStats = project.metadata?.tourStats;
          const citiesCompleted = tourStats?.cities?.length || 0;
          const citiesPlanned = project.metadata?.cities || 1;

          // If all cities are completed, show completion status instead of "City X+1 of Y"
          if (citiesCompleted >= citiesPlanned) {
            return '✓ Complete';
          }

          return `City ${citiesCompleted + 1} of ${citiesPlanned}`;
        }
        case 'recorded': return '✓ Complete';
        case 'cancelled': return '✗ Cancelled';
        default: return 'Planning';
      }
    }
    
    // Regular recording session status text
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

  // Filter projects by status and type
  const getActiveRecordingSessions = () => {
    return projects.filter(p => 
      p.type !== 'Mini-Tour' && (
        p.stage === 'planning' || 
        p.stage === 'writing' || 
        p.stage === 'recording' ||
        p.stage === 'production' // Legacy support
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

  const getActiveTours = () => {
    return projects.filter(p => {
      if (p.type !== 'Mini-Tour' || p.stage === 'cancelled') {
        return false;
      }

      // Always show planning stage tours as active
      if (p.stage === 'planning') {
        return true;
      }

      // For production stage tours, check if they're actually completed
      if (p.stage === 'production') {
        const tourStats = p.metadata?.tourStats;
        const citiesCompleted = tourStats?.cities?.length || 0;
        const citiesPlanned = p.metadata?.cities || 1;

        // Only move to completed if ALL cities are done AND there are actually completed cities recorded
        if (citiesCompleted > 0 && citiesCompleted >= citiesPlanned) {
          return false;
        }

        // Otherwise, keep in active
        return true;
      }

      return false;
    });
  };

  const getCompletedTours = () => {
    return projects.filter(p => {
      if (p.type !== 'Mini-Tour') {
        return false;
      }

      // Always include officially completed/cancelled tours
      if (p.stage === 'recorded' || p.stage === 'released' || p.stage === 'cancelled') {
        return true;
      }

      // Also include tours in 'production' stage that have completed all cities
      if (p.stage === 'production') {
        const tourStats = p.metadata?.tourStats;
        const citiesCompleted = tourStats?.cities?.length || 0;
        const citiesPlanned = p.metadata?.cities || 1;

        // Only consider completed if there are actually completed cities AND all are done
        return citiesCompleted > 0 && citiesCompleted >= citiesPlanned;
      }

      return false;
    });
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

  const activeRecordingSessions = getActiveRecordingSessions();
  const completedRecordingSessions = getCompletedRecordingSessions();
  const activeTours = getActiveTours();
  const completedTours = getCompletedTours();
  
  const currentRecordingSessions = activeTab === 'active' ? activeRecordingSessions : completedRecordingSessions;
  const currentTours = activeTab === 'active' ? activeTours : completedTours;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <h3 className="text-base font-semibold text-white mb-3 flex items-center justify-between">
          <div className="flex items-center">
            <i className="fas fa-music text-[#A75A5B] mr-2"></i>
            Projects
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
            Active Projects
            {(activeRecordingSessions.length + activeTours.length) > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {activeRecordingSessions.length + activeTours.length}
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
            Completed Projects
            {(completedRecordingSessions.length + completedTours.length) > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {completedRecordingSessions.length + completedTours.length}
              </Badge>
            )}
          </button>
        </div>


        <div className="space-y-4">
          {/* Recording Sessions Section */}
          {currentRecordingSessions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-white/90 mb-2 flex items-center">
                <i className="fas fa-microphone text-[#A75A5B] mr-2"></i>
                Recording Sessions
                <Badge variant="secondary" className="ml-2 text-xs">
                  {currentRecordingSessions.length}
                </Badge>
              </h4>
              <div className="space-y-3">
                {currentRecordingSessions.map(project => (
                  <div key={project.id} className="border border-[#4e324c] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-white text-sm">{project.title}</h4>
                        <div className="text-xs text-white/70">{getArtistName(project.artistId || '')}</div>
                      </div>
                      <Badge className={`text-xs px-2 py-1 ${getStatusBadgeClass(project.stage || 'planning')}`}>
                        {getStatusText(project.stage || 'planning', project)}
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
                    <span className="text-white/50">
                      {project.type === 'Mini-Tour' ? 'Tour Complete' : 'Session Complete'}
                    </span>
                    <span className="font-mono text-green-600">
                      {(() => {
                        if (project.type === 'Mini-Tour') {
                          const tourStats = project.metadata?.tourStats;
                          const citiesPlanned = project.metadata?.cities || 1;
                          const citiesCompleted = tourStats?.cities?.length || 0;
                          return `${citiesCompleted}/${citiesPlanned} cities`;
                        } else {
                          const projectSongs = getProjectSongs(project.id);
                          const recordedSongs = projectSongs.filter(song => song.isRecorded);
                          return `${recordedSongs.length} song${recordedSongs.length !== 1 ? 's' : ''} recorded`;
                        }
                      })()}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">
                    {project.type === 'Mini-Tour' 
                      ? 'Tour Budget' 
                      : (project.songCount || 1) > 1 ? 'Budget per song' : 'Budget'
                    }
                  </span>
                  <span className="font-mono">
                    {project.type === 'Mini-Tour' 
                      ? `$${(project.totalCost || 0).toLocaleString()}`
                      : (project.songCount || 1) > 1 
                        ? `$${(project.budgetPerSong || 0).toLocaleString()} × ${project.songCount || 1} = $${(project.totalCost || 0).toLocaleString()}`
                        : `$${(project.costUsed || 0).toLocaleString()} / $${(project.totalCost || project.budgetPerSong || 0).toLocaleString()}`
                    }
                  </span>
                </div>

                {/* Information for Completed Projects */}
                {(() => {
                  // Check if project is officially recorded or actually completed (for tours)
                  let isCompleted = project.stage === 'recorded';

                  // For tours, also check if all cities are completed
                  if (project.type === 'Mini-Tour' && !isCompleted) {
                    const tourStats = project.metadata?.tourStats;
                    const citiesCompleted = tourStats?.cities?.length || 0;
                    const citiesPlanned = project.metadata?.cities || 1;
                    isCompleted = citiesCompleted >= citiesPlanned;
                  }

                  if (!isCompleted) return null;

                  // Check if this is a tour project
                  if (project.type === 'Mini-Tour') {
                    const tourStats = project.metadata?.tourStats;
                    const citiesPlanned = project.metadata?.cities || 1;
                    const citiesCompleted = tourStats?.cities?.length || 0;
                    const totalRevenue = tourStats?.cities?.reduce((sum: number, city: any) => sum + (city?.revenue || 0), 0) || 0;
                    const avgAttendance = tourStats?.cities?.length > 0 
                      ? Math.round(tourStats.cities.reduce((sum: number, city: any) => sum + (city?.attendanceRate || 0), 0) / tourStats.cities.length)
                      : 0;
                    
                    return (
                      <div className="pt-2 border-t border-[#4e324c] space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Tour Completed</span>
                          <span className="font-mono text-green-600">
                            {citiesCompleted}/{citiesPlanned} cities
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Total Revenue</span>
                          <span className="font-mono text-green-600">
                            ${totalRevenue.toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Average Attendance</span>
                          <span className="font-mono text-[#A75A5B]">
                            {avgAttendance}%
                          </span>
                        </div>
                        
                        {tourStats?.cities?.length > 0 && (
                          <div className="text-xs text-white/70 italic mt-1">
                            Tour completed successfully
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // Original recording session logic
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
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Total Production Cost</span>
                          <span className="font-mono text-white/70">
                            ${((project.budgetPerSong || 0) * (project.songCount || 1)).toLocaleString()}
                          </span>
                        </div>
                        
                        {readySongs.length > 0 && (
                          <div className="text-xs text-white/70 italic mt-1">
                            Use Plan Release to publish these songs
                          </div>
                        )}
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tours Section */}
            {currentTours.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white/90 mb-2 flex items-center">
                  <i className="fas fa-route text-[#A75A5B] mr-2"></i>
                  Tours
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {currentTours.length}
                  </Badge>
                </h4>
                <div className="space-y-3">
                  {currentTours.map(project => (
                    <div key={project.id} className="border border-[#4e324c] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-white text-sm">{project.title}</h4>
                          <div className="text-xs text-white/70">{getArtistName(project.artistId || '')}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={`text-xs px-2 py-1 ${getStatusBadgeClass(project.stage || 'planning')}`}>
                            {getStatusText(project.stage || 'planning', project)}
                          </Badge>
                          {/* Cancel button for active tours only */}
                          {activeTab === 'active' && (project.stage === 'planning' || project.stage === 'production') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelTour(project)}
                              className="text-xs px-2 py-1 h-6 border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        {/* Only show progress for active tours */}
                        {activeTab === 'active' && (
                          <>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/50">Progress</span>
                              <span className="font-mono">{Math.round(getProjectProgress(project))}%</span>
                            </div>
                            <Progress value={getProjectProgress(project)} className="w-full h-1.5" />
                          </>
                        )}

                        {/* Simple info for completed tours */}
                        {activeTab === 'completed' && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/50">Tour Complete</span>
                            <span className="font-mono text-green-600">
                              {(() => {
                                const tourStats = project.metadata?.tourStats;
                                const citiesPlanned = project.metadata?.cities || 1;
                                const citiesCompleted = tourStats?.cities?.length || 0;
                                return `${citiesCompleted}/${citiesPlanned} cities`;
                              })()}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Tour Budget</span>
                          <span className="font-mono">
                            ${(project.totalCost || 0).toLocaleString()}
                          </span>
                        </div>

                        {/* City-by-City Details for Active Tours */}
                        {activeTab === 'active' && project.stage === 'production' && (() => {
                          const tourStats = project.metadata?.tourStats;
                          const citiesPlanned = project.metadata?.cities || 1;
                          const completedCities = tourStats?.cities || [];
                          
                          if (completedCities.length > 0) {
                            return (
                              <div className="pt-2 border-t border-[#4e324c] space-y-1">
                                <div className="text-xs text-white/60 font-medium mb-1">
                                  Cities Completed ({completedCities.length}/{citiesPlanned})
                                </div>
                                {completedCities.map((city: any, index: number) => (
                                  <div key={index} className="bg-[#3c252d]/30 rounded p-2 text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-white/70 font-medium">City {city.cityNumber}</span>
                                      <span className="font-mono text-green-500">${city.revenue?.toLocaleString() || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-white/50">
                                      <span>{city.venue} ({city.capacity} capacity)</span>
                                      <span>{city.ticketsSold} tickets • {city.attendanceRate}%</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Information for Completed Tours */}
                        {project.stage === 'recorded' && (() => {
                          const tourStats = project.metadata?.tourStats;
                          const citiesPlanned = project.metadata?.cities || 1;
                          const citiesCompleted = tourStats?.cities?.length || 0;
                          const totalRevenue = tourStats?.cities?.reduce((sum: number, city: any) => sum + (city?.revenue || 0), 0) || 0;
                          const avgAttendance = tourStats?.cities?.length > 0 
                            ? Math.round(tourStats.cities.reduce((sum: number, city: any) => sum + (city?.attendanceRate || 0), 0) / tourStats.cities.length)
                            : 0;
                          
                          return (
                            <div className="pt-2 border-t border-[#4e324c] space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-white/50">Tour Completed</span>
                                <span className="font-mono text-green-600">
                                  {citiesCompleted}/{citiesPlanned} cities
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-white/50">Total Revenue</span>
                                <span className="font-mono text-green-600">
                                  ${totalRevenue.toLocaleString()}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-white/50">Average Attendance</span>
                                <span className="font-mono text-[#A75A5B]">
                                  {avgAttendance}%
                                </span>
                              </div>
                              
                              {tourStats?.cities?.length > 0 && (
                                <>
                                  <div className="text-xs text-white/70 italic mt-1 mb-2">
                                    Tour completed successfully
                                  </div>
                                  
                                  {/* City-by-City Details for Completed Tours */}
                                  <div className="space-y-1">
                                    <div className="text-xs text-white/60 font-medium">
                                      City Details ({tourStats.cities.length} cities)
                                    </div>
                                    {tourStats.cities.map((city: any, index: number) => {
                                      const cityKey = `${project.id}-city-${city.cityNumber}`;
                                      const isExpanded = expandedCityDetails[cityKey];
                                      const hasEconomics = city.economics; // Check if enhanced data is available

                                      return (
                                        <div key={index} className="bg-[#3c252d]/40 rounded p-2 text-xs space-y-1">
                                          {/* Main city info - always visible */}
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                              <span className="text-white/80 font-medium">City {city.cityNumber}</span>
                                              {hasEconomics && (
                                                <button
                                                  onClick={() => toggleCityDetails(cityKey)}
                                                  className="text-white/50 hover:text-white/80 transition-colors"
                                                >
                                                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                </button>
                                              )}
                                            </div>
                                            <span className="font-mono text-green-400">${city.revenue?.toLocaleString() || 0}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-white/60">
                                            <span>{city.venue} ({city.capacity} capacity)</span>
                                            <span>{city.ticketsSold} tickets • {city.attendanceRate}%</span>
                                          </div>
                                          {city.month && (
                                            <div className="text-xs text-white/40">
                                              Month {city.month}
                                            </div>
                                          )}

                                          {/* Enhanced economic breakdown - expandable */}
                                          {hasEconomics && isExpanded && (
                                            <div className="mt-2 pt-2 border-t border-white/20 space-y-2">
                                              {/* Sell-Through Analysis */}
                                              <div className="bg-black/20 rounded p-2">
                                                <div className="flex items-center space-x-1 mb-1">
                                                  <Users className="w-3 h-3 text-blue-400" />
                                                  <span className="text-white/70 font-medium">Sell-Through Breakdown</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 text-xs">
                                                  <div className="flex justify-between">
                                                    <span className="text-white/50">Base Rate:</span>
                                                    <span className="font-mono text-white/70">{city.economics.sellThrough.baseRate}%</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-white/50">Reputation:</span>
                                                    <span className="font-mono text-blue-400">+{city.economics.sellThrough.reputationBonus}%</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-white/50">Popularity:</span>
                                                    <span className="font-mono text-purple-400">+{city.economics.sellThrough.popularityBonus}%</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-white/50">Marketing:</span>
                                                    <span className="font-mono text-yellow-400">+{city.economics.sellThrough.marketingBonus}%</span>
                                                  </div>
                                                  <div className="flex justify-between font-medium col-span-2 pt-1 border-t border-white/10">
                                                    <span className="text-white/70">Total:</span>
                                                    <span className="font-mono text-green-400">{city.economics.sellThrough.rate}%</span>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Revenue Breakdown */}
                                              <div className="bg-black/20 rounded p-2">
                                                <div className="flex items-center space-x-1 mb-1">
                                                  <DollarSign className="w-3 h-3 text-green-400" />
                                                  <span className="text-white/70 font-medium">Revenue Analysis</span>
                                                </div>
                                                <div className="space-y-1 text-xs">
                                                  <div className="flex justify-between">
                                                    <span className="text-white/50">Ticket Price:</span>
                                                    <span className="font-mono text-white/70">
                                                      ${city.economics.pricing.ticketPrice} (${city.economics.pricing.basePrice} + ${city.economics.pricing.capacityBonus})
                                                    </span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-white/50">Ticket Revenue:</span>
                                                    <span className="font-mono text-blue-400">${city.economics.revenue.tickets.toLocaleString()}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-white/50">Merch ({city.economics.revenue.merchRate}%):</span>
                                                    <span className="font-mono text-purple-400">${city.economics.revenue.merch.toLocaleString()}</span>
                                                  </div>
                                                  <div className="flex justify-between font-medium pt-1 border-t border-white/10">
                                                    <span className="text-white/70">Gross Revenue:</span>
                                                    <span className="font-mono text-green-400">${city.economics.revenue.total.toLocaleString()}</span>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Cost & Profit Analysis */}
                                              <div className="bg-black/20 rounded p-2">
                                                <div className="flex items-center space-x-1 mb-1">
                                                  <Calculator className="w-3 h-3 text-red-400" />
                                                  <span className="text-white/70 font-medium">Profitability</span>
                                                </div>
                                                <div className="space-y-1 text-xs">
                                                  <div className="flex justify-between">
                                                    <span className="text-white/50">Venue Fees:</span>
                                                    <span className="font-mono text-red-400">${city.economics.costs.venue.toLocaleString()}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-white/50">Production:</span>
                                                    <span className="font-mono text-red-400">${city.economics.costs.production.toLocaleString()}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-white/50">Marketing:</span>
                                                    <span className="font-mono text-red-400">${city.economics.costs.marketing.toLocaleString()}</span>
                                                  </div>
                                                  <div className="flex justify-between pt-1 border-t border-white/10">
                                                    <span className="text-white/60">Total Costs:</span>
                                                    <span className="font-mono text-red-300">${city.economics.costs.total.toLocaleString()}</span>
                                                  </div>
                                                  <div className="flex justify-between font-medium pt-1 border-t border-white/10">
                                                    <span className="text-white/70">Net Profit:</span>
                                                    <span className={`font-mono ${city.economics.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                      ${city.economics.profit.toLocaleString()}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state for completed projects */}
            {activeTab === 'completed' && (completedRecordingSessions.length + completedTours.length) === 0 && (
              <div className="text-center py-8 text-white/50">
                <i className="fas fa-music text-2xl mb-2 block text-white/50"></i>
                <p className="text-sm">No completed projects yet</p>
                <p className="text-xs">Projects will appear here once completed</p>
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

      {/* Tour Cancellation Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">Cancel Tour</DialogTitle>
          </DialogHeader>
          
          {projectToCancel && (() => {
            const details = getCancellationDetails(projectToCancel);
            if (!details) return null;
            
            return (
              <div className="space-y-4">
                <p className="text-white">
                  Are you sure you want to cancel <span className="font-semibold">"{projectToCancel.title}"</span>? 
                  This action cannot be undone.
                </p>
                
                {/* Cost Breakdown */}
                <div className="bg-[#23121c] border border-[#4e324c] rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-white mb-2">Cancellation Breakdown</h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Original Tour Cost:</span>
                      <span className="font-mono text-white">${projectToCancel.totalCost.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-white/70">Cities Planned:</span>
                      <span className="font-mono text-white">{details.citiesPlanned}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-white/70">Cities Completed:</span>
                      <span className="font-mono text-white">{details.citiesCompleted}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-white/70">Remaining Cities:</span>
                      <span className="font-mono text-white">{details.remainingCities}</span>
                    </div>
                    
                    <hr className="border-[#4e324c]" />
                    
                    <div className="flex justify-between">
                      <span className="text-red-400">Sunk Costs (non-refundable):</span>
                      <span className="font-mono text-red-400">-${details.sunkCosts.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between font-semibold">
                      <span className="text-green-400">Refund (60% of remaining):</span>
                      <span className="font-mono text-green-400">+${details.refundAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCancelModal(false)}
                    className="border-[#4e324c] text-white hover:bg-[#4e324c]"
                  >
                    Keep Tour
                  </Button>
                  <Button 
                    onClick={handleConfirmCancellation}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Cancel Tour
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
