import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGameStore } from '@/store/gameStore';
import { LivePerformanceModal, type TourCreationData } from './LivePerformanceModal';
import { useState } from 'react';
import { ChevronDown, ChevronRight, DollarSign, Users, Calculator } from 'lucide-react';
import { getTourMetadata, getTourStats, getCompletedCities, getCityCounts } from '@/utils/tourHelpers';

// Completed Tours Table Component (integrated into main Tours UI)
function CompletedToursTable({ completedTours, getArtistName }: { completedTours: any[], getArtistName: (id: string) => string }) {

  const allCompletedTours = completedTours;
  const [sortBy, setSortBy] = useState<'city' | 'revenue' | 'profit' | 'attendance'>('city');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);

  // If no tours exist at all, show empty state
  if (allCompletedTours.length === 0) {
    return (
      <div className="text-center py-8 text-white/50">
        <i className="fas fa-route text-2xl mb-2 block text-white/50"></i>
        <p className="text-sm">No completed tours yet</p>
        <p className="text-xs">Tours will appear here once completed</p>
      </div>
    );
  }

  // Use the first available tour, or allow selection from all tours
  const selectedTour = allCompletedTours.find(t => t.id === selectedTourId) || allCompletedTours[0];
  const cities = getCompletedCities(selectedTour);




  const sortedCities = [...cities].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'city':
        aVal = a.cityName || `City ${a.cityNumber || 0}`;
        bVal = b.cityName || `City ${b.cityNumber || 0}`;
        break;
      case 'revenue':
        aVal = a.revenue || 0;
        bVal = b.revenue || 0;
        break;
      case 'profit':
        aVal = a.economics?.profit || 0;
        bVal = b.economics?.profit || 0;
        break;
      case 'attendance':
        aVal = a.attendanceRate || 0;
        bVal = b.attendanceRate || 0;
        break;
      default:
        aVal = a.cityNumber || 0;
        bVal = b.cityNumber || 0;
    }

    // Type-safe comparison with fallback to 0
    const safeAVal = aVal ?? 0;
    const safeBVal = bVal ?? 0;

    if (sortOrder === 'asc') {
      return safeAVal < safeBVal ? -1 : safeAVal > safeBVal ? 1 : 0;
    } else {
      return safeAVal > safeBVal ? -1 : safeAVal < safeBVal ? 1 : 0;
    }
  });

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Calculate totals with fallbacks for missing data
  const totals = cities.reduce(
    (acc, city) => ({
      revenue: (acc.revenue || 0) + (city.revenue || 0),
      profit: (acc.profit || 0) + (city.economics?.profit || 0),
      tickets: (acc.tickets || 0) + (city.ticketsSold || city.tickets || 0),
      capacity: (acc.capacity || 0) + (city.capacity || 0),
      costs: (acc.costs || 0) + (city.economics?.costs?.total || 0)
    }),
    { revenue: 0, profit: 0, tickets: 0, capacity: 0, costs: 0 }
  );

  return (
    <div className="border border-[#4e324c] rounded-lg p-4">
      {/* Tour Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h4 className="text-white font-medium text-sm">
            {selectedTour.title} - {getArtistName(selectedTour.artistId || '')} • {getTourMetadata(selectedTour).cities || 0} Cities
          </h4>
          <Badge className={`text-xs px-2 py-1 ${selectedTour.stage === 'cancelled' ? 'bg-red-600 text-white' : 'bg-green-500 text-white'}`}>
            {selectedTour.stage === 'cancelled' ? '✗ Cancelled' : '✓ Complete'}
          </Badge>
        </div>
        {/* Tour Selection Dropdown if multiple tours */}
        {allCompletedTours.length > 1 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-white/50">Select Tour:</span>
            <select
              value={selectedTour.id}
              onChange={(e) => setSelectedTourId(e.target.value)}
              className="bg-[#23121c] border border-[#4e324c] text-white text-xs px-2 py-1 rounded"
            >
              {allCompletedTours.map(tour => (
                <option key={tour.id} value={tour.id}>
                  {tour.title} - {getArtistName(tour.artistId || '')} {tour.stage === 'cancelled' ? '(Cancelled)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tour Table */}
      <Table>
        <TableHeader>
          <TableRow className="border-[#4e324c]">
            <TableHead
              className="text-white/70 text-sm cursor-pointer hover:text-white"
              onClick={() => handleSort('city')}
            >
              City {sortBy === 'city' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="text-white/70 text-sm">Venue</TableHead>
            <TableHead
              className="text-white/70 text-sm cursor-pointer hover:text-white text-right"
              onClick={() => handleSort('attendance')}
            >
              Attendance {sortBy === 'attendance' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead
              className="text-white/70 text-sm cursor-pointer hover:text-white text-right"
              onClick={() => handleSort('revenue')}
            >
              Revenue {sortBy === 'revenue' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="text-white/70 text-sm text-right">Costs</TableHead>
            <TableHead
              className="text-white/70 text-sm cursor-pointer hover:text-white text-right"
              onClick={() => handleSort('profit')}
            >
              Profit {sortBy === 'profit' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="text-white/70 text-sm text-right">ROI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cities.length === 0 ? (
            <>
              <TableRow className="border-[#4e324c]">
                <TableCell colSpan={7} className="text-center py-8 text-white/50">
                  {selectedTour.stage === 'cancelled' ? (
                    <div>
                      <i className="fas fa-ban text-red-400 text-xl mb-2 block"></i>
                      <p className="text-sm">Tour was cancelled before any performances</p>
                      <p className="text-xs text-white/30">No city performance data available</p>
                    </div>
                  ) : (
                    <div>
                      <i className="fas fa-chart-line text-white/30 text-xl mb-2 block"></i>
                      <p className="text-sm">No performance data available</p>
                      <p className="text-xs text-white/30">Tour completed without detailed analytics</p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
              {selectedTour.stage === 'cancelled' && (
                <TableRow className="border-t border-[#4e324c]">
                  <TableCell className="text-white font-bold text-sm">TOTAL LOSS</TableCell>
                  <TableCell className="text-white/50 text-sm">-</TableCell>
                  <TableCell className="text-right text-white font-bold text-sm">
                    <div className="font-mono">0/0</div>
                    <div className="text-xs text-white/50 font-mono">0%</div>
                  </TableCell>
                  <TableCell className="text-right text-white font-mono font-bold text-sm">$0</TableCell>
                  <TableCell className="text-right text-red-400 font-mono font-bold text-sm">
                    ${(selectedTour.totalCost || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-red-400 font-mono font-bold text-sm">
                    -${(selectedTour.totalCost || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-red-400 font-mono font-bold text-sm">-100%</TableCell>
                </TableRow>
              )}
            </>
          ) : (
            <>
              {sortedCities.map((city, index) => (
                <TableRow key={city.cityNumber || index} className="border-[#4e324c]">
                  <TableCell className="text-white text-sm">
                    {city.cityName || `City ${city.cityNumber}`}
                  </TableCell>
                  <TableCell className="text-white/60 text-sm">
                    {city.venue || 'Unknown Venue'}
                  </TableCell>
                  <TableCell className="text-right text-white text-sm">
                    <div className="font-mono">{(city.ticketsSold || 0).toLocaleString()}/{(city.capacity || 0).toLocaleString()}</div>
                    <div className="text-xs text-white/50 font-mono">{city.attendanceRate || 0}%</div>
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-mono text-sm">
                    ${(city.revenue || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-red-400 font-mono text-sm">
                    ${(city.economics?.costs?.total || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-mono text-sm">
                    ${(city.economics?.profit || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-white font-mono text-sm">
                    {city.economics?.costs?.total && city.economics?.profit ? (
                      `${Math.round((city.economics.profit / city.economics.costs.total) * 100)}%`
                    ) : (
                      '0%'
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals Row */}
              <TableRow className="border-t border-[#4e324c]">
                <TableCell className="text-white font-bold text-sm">TOTALS</TableCell>
                <TableCell className="text-white/50 text-sm">-</TableCell>
                <TableCell className="text-right text-white font-bold text-sm">
                  <div className="font-mono">{(totals.tickets || 0).toLocaleString()}</div>
                  <div className="text-xs text-white/50 font-mono">
                    {(totals.capacity || 0) > 0 ? Math.round(((totals.tickets || 0) / (totals.capacity || 1)) * 100) : 0}%
                  </div>
                </TableCell>
                <TableCell className="text-right text-green-600 font-mono font-bold text-sm">
                  ${(totals.revenue || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-red-400 font-mono font-bold text-sm">
                  ${(totals.costs || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-green-600 font-mono font-bold text-sm">
                  ${(totals.profit || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-white font-mono font-bold text-sm">
                  {(totals.costs || 0) > 0 ? `${Math.round(((totals.profit || 0) / (totals.costs || 1)) * 100)}%` : '0%'}
                </TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function ActiveTours() {
  const { projects, artists, cancelProject, createProject, gameState } = useGameStore();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [projectToCancel, setProjectToCancel] = useState<any>(null);
  const [expandedCityDetails, setExpandedCityDetails] = useState<{[key: string]: boolean}>({});
  const [showLivePerformanceModal, setShowLivePerformanceModal] = useState(false);

  const toggleCityDetails = (cityKey: string) => {
    setExpandedCityDetails(prev => ({
      ...prev,
      [cityKey]: !prev[cityKey]
    }));
  };

  const handleCancelTour = (project: any) => {
    setProjectToCancel(project);
    setShowCancelModal(true);
  };

  const handleConfirmCancellation = async () => {
    if (!projectToCancel) return;

    try {
      console.log('Cancelling tour:', projectToCancel.title);
      const cityCounts = getCityCounts(projectToCancel);
      const remainingCities = cityCounts.remaining;

      const refundPercentage = 0.6;
      const costPerCity = projectToCancel.totalCost / cityCounts.planned;
      const refundAmount = Math.round(remainingCities * costPerCity * refundPercentage);

      await cancelProject(projectToCancel.id, { refundAmount });

      setShowCancelModal(false);
      setProjectToCancel(null);

      console.log(`✅ Tour cancelled. Refund: $${refundAmount.toLocaleString()}`);
    } catch (error) {
      console.error('Failed to cancel tour:', error);
    }
  };

  const handleCreateTour = async (tourData: TourCreationData) => {
    try {
      const projectData = {
        title: tourData.title,
        type: 'Mini-Tour' as const,
        artistId: tourData.artistId,
        totalCost: tourData.budget,
        budgetPerSong: 0,
        songCount: 0,
        producerTier: 'local' as const,
        timeInvestment: 'standard' as const,
        metadata: {
          performanceType: 'mini_tour',
          cities: tourData.cities,
          venueAccess: tourData.venueAccess || 'none',
          venueCapacity: tourData.venueCapacity, // Store selected venue capacity
          createdFrom: 'ActiveTours'
        }
      };

      await createProject(projectData);
      setShowLivePerformanceModal(false);

      console.log(`✅ Tour "${tourData.title}" created successfully`);
    } catch (error) {
      console.error('Failed to create tour:', error);
    }
  };

  // REMOVED: getCancellationDetails - inlined since only used once

  const getProjectProgress = (project: any) => {
    // FIXED: Use correct tour stages instead of music project stages
    const stages = ['planning', 'production'];
    const currentStageIndex = stages.indexOf(project.stage || 'planning');
    if (currentStageIndex === -1) return 100; // Completed stages
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
      case 'cancelled': return 'bg-red-600 text-white';
      default: return 'bg-[#65557c] text-white';
    }
  };

  const getStatusText = (stage: string, project?: any) => {
    if (project?.type === 'Mini-Tour') {
      switch (stage) {
        case 'planning': return 'Planning';
        case 'production': {
          const cityCounts = getCityCounts(project);

          if (cityCounts.completed >= cityCounts.planned) {
            return '✓ Complete';
          }

          return `City ${cityCounts.completed + 1} of ${cityCounts.planned}`;
        }
        case 'recorded': return '✓ Complete';
        case 'cancelled': return '✗ Cancelled';
        default: return 'Planning';
      }
    }

    return 'Planning';
  };

  const getActiveTours = () => {
    return projects.filter(p => {
      if (p.type !== 'Mini-Tour' || p.stage === 'cancelled') {
        return false;
      }

      if (p.stage === 'planning') {
        return true;
      }

      if (p.stage === 'production') {
        const cityCounts = getCityCounts(p);

        if (cityCounts.completed > 0 && cityCounts.completed >= cityCounts.planned) {
          return false;
        }

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

      if (p.stage === 'recorded' || p.stage === 'released' || p.stage === 'cancelled') {
        return true;
      }

      if (p.stage === 'production') {
        const cityCounts = getCityCounts(p);

        return cityCounts.completed > 0 && cityCounts.completed >= cityCounts.planned;
      }

      return false;
    });
  };

  const getArtistName = (artistId: string) => {
    const artist = artists.find(a => a.id === artistId);
    return artist?.name || 'Unknown Artist';
  };

  const activeTours = getActiveTours();
  const completedTours = getCompletedTours();
  const currentTours = activeTab === 'active' ? activeTours : completedTours;

  return (
    <>
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-white flex items-center">
              <i className="fas fa-route text-[#A75A5B] mr-2"></i>
              Tours
            </h3>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {activeTours.length + completedTours.length}
              </Badge>
              <Button
                size="sm"
                onClick={() => setShowLivePerformanceModal(true)}
                className="bg-[#A75A5B] hover:bg-[#8a4a4b] text-white text-xs px-3 py-1.5"
              >
                + Live Performance
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
              Active Tours
              {activeTours.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {activeTours.length}
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
              Completed Tours
              {completedTours.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {completedTours.length}
                </Badge>
              )}
            </button>
          </div>

          {/* Tours List */}
          <div className="space-y-3">
            {activeTab === 'completed' ? (
              <CompletedToursTable completedTours={completedTours} getArtistName={getArtistName} />
            ) : currentTours.length === 0 ? (
              <div className="text-center py-8 text-white/50">
                <i className="fas fa-route text-2xl mb-2 block text-white/50"></i>
                <p className="text-sm">No active tours</p>
                <p className="text-xs">Create a Live Performance to book tours</p>
              </div>
            ) : (
              currentTours.map(project => (
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

                    {/* Note: This section is only for active tours - completed tours are handled by CompletedToursTable */}

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">Tour Budget</span>
                      <span className="font-mono">
                        ${(project.totalCost || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* City-by-City Details for Active Tours */}
                    {activeTab === 'active' && project.stage === 'production' && (() => {
                      const cityCounts = getCityCounts(project);
                      const completedCities = getCompletedCities(project);

                      if (completedCities.length > 0) {
                        return (
                          <div className="pt-2 border-t border-[#4e324c] space-y-1">
                            <div className="text-xs text-white/60 font-medium mb-1">
                              Cities Completed ({completedCities.length}/{cityCounts.planned})
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
                      const cityCounts = getCityCounts(project);
                      const completedCities = getCompletedCities(project);
                      const totalRevenue = completedCities.reduce((sum: number, city: any) => sum + (city?.revenue || 0), 0) || 0;
                      const avgAttendance = completedCities.length > 0
                        ? Math.round(completedCities.reduce((sum: number, city: any) => sum + (city?.attendanceRate || 0), 0) / completedCities.length)
                        : 0;

                      return (
                        <div className="pt-2 border-t border-[#4e324c] space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/50">Tour Completed</span>
                            <span className="font-mono text-green-600">
                              {cityCounts.completed}/{cityCounts.planned} cities
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

                          {completedCities.length > 0 && (
                            <>
                              <div className="text-xs text-white/70 italic mt-1 mb-2">
                                Tour completed successfully
                              </div>

                              {/* City-by-City Details for Completed Tours */}
                              <div className="space-y-1">
                                <div className="text-xs text-white/60 font-medium">
                                  City Details ({completedCities.length} cities)
                                </div>
                                {completedCities.map((city: any, index: number) => {
                                  const cityKey = `${project.id}-city-${city.cityNumber}`;
                                  const isExpanded = expandedCityDetails[cityKey];
                                  const hasEconomics = city.economics;

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
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tour Cancellation Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">Cancel Tour</DialogTitle>
          </DialogHeader>

          {projectToCancel && (() => {
            // INLINED: Cancellation details calculation using typed helpers
            const cityCounts = getCityCounts(projectToCancel);
            const remainingCities = cityCounts.remaining;
            const refundPercentage = 0.6;
            const costPerCity = projectToCancel.totalCost / cityCounts.planned;
            const refundAmount = Math.round(remainingCities * costPerCity * refundPercentage);
            const sunkCosts = projectToCancel.totalCost - refundAmount;

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
                      <span className="font-mono text-white">{cityCounts.planned}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-white/70">Cities Completed:</span>
                      <span className="font-mono text-white">{cityCounts.completed}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-white/70">Remaining Cities:</span>
                      <span className="font-mono text-white">{remainingCities}</span>
                    </div>

                    <hr className="border-[#4e324c]" />

                    <div className="flex justify-between">
                      <span className="text-red-400">Sunk Costs (non-refundable):</span>
                      <span className="font-mono text-red-400">-${sunkCosts.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between font-semibold">
                      <span className="text-green-400">Refund (60% of remaining):</span>
                      <span className="font-mono text-green-400">+${refundAmount.toLocaleString()}</span>
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

      {/* Live Performance Modal */}
      {gameState && (
        <LivePerformanceModal
          gameState={gameState}
          artists={artists}
          projects={projects}
          onCreateTour={handleCreateTour}
          isCreating={false}
          open={showLivePerformanceModal}
          onOpenChange={setShowLivePerformanceModal}
        />
      )}

    </>
  );
}

