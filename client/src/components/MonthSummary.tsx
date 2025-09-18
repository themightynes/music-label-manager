import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, Music, Trophy, Zap, X, BarChart3 } from 'lucide-react';
import { ChartPerformanceCard } from './ChartPerformanceCard';
import { MonthSummary as MonthSummaryType, GameChange } from '../../../shared/types/gameTypes';

interface MonthSummaryProps {
  monthlyStats: MonthSummaryType;
  onAdvanceMonth: () => void;
  isAdvancing?: boolean;
  isMonthResults?: boolean;
  onClose?: () => void;
}

export function MonthSummary({ monthlyStats, onAdvanceMonth, isAdvancing, isMonthResults, onClose }: MonthSummaryProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'projects'>('overview');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'project_complete': return '🎵'; // Changed from 🎉 for recording completion
      case 'revenue': return '💰';
      case 'ongoing_revenue': return '📻';
      case 'release': return '🚀'; // New releases generating initial revenue
      case 'expense': return '💸';
      case 'unlock': return '🔓';
      case 'artist': return '🎤';
      default: return '📊';
    }
  };

  const categorizeChanges = (changes: GameChange[]) => {
    const categories = {
      revenue: [] as GameChange[],
      expenses: [] as GameChange[],
      achievements: [] as GameChange[],
      other: [] as GameChange[]
    };

    changes.forEach(change => {
      if (change.type === 'revenue' || change.type === 'ongoing_revenue' || change.type === 'release') {
        categories.revenue.push(change);
      } else if (change.type === 'expense') {
        categories.expenses.push(change);
      } else if (change.type === 'unlock') {
        categories.achievements.push(change);
      } else if (change.type === 'project_complete') {
        // Projects go to other category, will be shown in Projects tab
        categories.other.push(change);
      } else {
        categories.other.push(change);
      }
    });

    return categories;
  };

  const revenue = monthlyStats?.revenue || 0;
  const expenses = monthlyStats?.expenses || 0;
  const netIncome = revenue - expenses;
  const changes = monthlyStats?.changes || [];
  const categorizedChanges = categorizeChanges(changes);

  return (
    <div className="bg-[#23121c] rounded-xl shadow-xl border border-[#4e324c] w-full max-w-7xl mx-auto">
      {/* Header Section - Clean and prominent */}
      <div className="bg-gradient-to-r from-[#3c252d]/50 to-[#A75A5B]/10 px-8 py-6 border-b border-[#4e324c]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              {isMonthResults ? `Month ${monthlyStats?.month || ''} Results` : 'Month Summary'}
            </h1>
            <p className="text-sm text-white/70 mt-1">
              Your financial performance and key achievements
            </p>
          </div>

          {/* Close button - only show if onClose is provided */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          
          {/* Big prominent net income display */}
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-lg ${netIncome >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {netIncome >= 0 ? (
                  <TrendingUp className={`h-5 w-5 ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <div className={`text-2xl font-bold font-mono ${
                  netIncome >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {netIncome >= 0 ? '+' : ''}{formatCurrency(netIncome)}
                </div>
                <div className="text-sm text-white/50 font-medium">Net Income</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Bar - Horizontal layout for easy scanning */}
      <div className="px-8 py-6 bg-[#3c252d]/20 border-b border-[#4e324c]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Revenue Card */}
          <div className="bg-[#3c252d]/66 rounded-lg p-6 border border-[#65557c] shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-green-700">Revenue</h3>
                  <p className="text-xs text-white/50">Income earned</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-700">
                  {formatCurrency(revenue)}
                </div>
              </div>
            </div>
          </div>

          {/* Expenses Card */}
          <div className="bg-[#3c252d]/66 rounded-lg p-6 border border-[#65557c] shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-red-700">Expenses</h3>
                  <p className="text-xs text-white/50">Costs incurred</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-red-700">
                  {formatCurrency(expenses)}
                </div>
              </div>
            </div>
          </div>

          {/* Profit Margin Card */}
          <div className="bg-[#3c252d]/66 rounded-lg p-6 border border-[#65557c] shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${netIncome >= 0 ? 'bg-[#A75A5B]/20' : 'bg-orange-500/20'}`}>
                  <DollarSign className={`h-5 w-5 ${netIncome >= 0 ? 'text-[#A75A5B]' : 'text-orange-600'}`} />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${netIncome >= 0 ? 'text-[#A75A5B]' : 'text-orange-700'}`}>
                    Profit Margin
                  </h3>
                  <p className="text-xs text-white/50">Performance ratio</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${netIncome >= 0 ? 'text-[#A75A5B]' : 'text-orange-700'}`}>
                  {revenue > 0 ? `${((netIncome / revenue) * 100).toFixed(1)}%` : '0%'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visual breakdown bar */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-semibold text-white/90">Financial Breakdown</h4>
            <div className="text-xs text-white/50">
              Revenue vs Expenses
            </div>
          </div>
          
          <div className="relative bg-[#610b16] rounded-full h-4 overflow-hidden">
            {revenue > 0 && (
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${(revenue / (revenue + expenses)) * 100}%` }}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-white/90">
                {revenue > 0 ? `${formatCurrency(revenue)} earned` : 'No revenue'}
                {expenses > 0 && ` • ${formatCurrency(expenses)} spent`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-8 py-6">
        {isMonthResults && (changes.length > 0 || (monthlyStats?.chartUpdates?.length ?? 0) > 0) ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <Trophy className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Charts</span>
              </TabsTrigger>
              <TabsTrigger value="projects" className="flex items-center space-x-2">
                <Music className="h-4 w-4" />
                <span>Projects</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Revenue Sources */}
                {categorizedChanges.revenue.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-green-700 text-sm">
                        <TrendingUp className="h-4 w-4" />
                        <span>Revenue Sources</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {categorizedChanges.revenue.map((change: GameChange, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm">{getChangeIcon(change.type)}</span>
                            <span className="text-sm font-medium text-green-800">{change.description}</span>
                          </div>
                          <Badge variant="outline" className="text-xs text-green-700 border-green-300 font-semibold">
                            +{formatCurrency(change.amount || 0)}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Chart Performance Summary for Overview */}
                {monthlyStats?.chartUpdates && monthlyStats.chartUpdates.filter((update: any) => !update.isCompetitorSong).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-yellow-700 text-sm">
                        <BarChart3 className="h-4 w-4" />
                        <span>Chart Highlights</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartPerformanceCard
                        chartUpdates={monthlyStats.chartUpdates?.filter((update: any) => !update.isCompetitorSong) || []}
                        showHeader={false}
                        compact={true}
                        variant="dark"
                        className="border-0 p-0 bg-transparent"
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Achievements */}
                {categorizedChanges.achievements.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-[#A75A5B] text-sm">
                        <Trophy className="h-4 w-4" />
                        <span>Achievements</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {categorizedChanges.achievements.map((change: GameChange, index: number) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-[#A75A5B]/10 rounded-lg border border-[#A75A5B]/20">
                          <span className="text-sm">{getChangeIcon(change.type)}</span>
                          <span className="text-sm font-medium text-[#A75A5B]">{change.description}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* Performance Summary */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className={`inline-flex items-center space-x-2 p-4 rounded-xl ${
                      netIncome >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {netIncome >= 0 ? (
                        <Zap className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                      <span className="text-sm font-semibold">
                        {netIncome >= 0 ? 
                          `Excellent! You generated ${formatCurrency(netIncome)} in profit this month.` :
                          `Focus needed: You had a ${formatCurrency(Math.abs(netIncome))} loss this month.`
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="charts" className="space-y-6">
              {monthlyStats?.chartUpdates && monthlyStats.chartUpdates.filter((update: any) => !update.isCompetitorSong).length > 0 ? (
                <div className="space-y-6">
                  <ChartPerformanceCard
                    chartUpdates={monthlyStats.chartUpdates?.filter((update: any) => !update.isCompetitorSong) || []}
                    variant="dark"
                    className="border-[#4e324c]"
                  />

                  {/* Chart Movement Summary */}
                  <Card className="border-[#4e324c]">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-white text-sm">
                        <BarChart3 className="h-4 w-4" />
                        <span>Chart Movement Analysis</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-500">
                            {monthlyStats.chartUpdates.filter((u: any) => u.isDebut && !u.isCompetitorSong).length}
                          </div>
                          <div className="text-sm text-white/70">New Debuts</div>
                          <div className="text-xs text-white/50 mt-1">Your songs entering charts</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-500">
                            {monthlyStats.chartUpdates.filter((u: any) => u.movement && u.movement > 0 && !u.isCompetitorSong).length}
                          </div>
                          <div className="text-sm text-white/70">Climbing</div>
                          <div className="text-xs text-white/50 mt-1">Your songs moving up</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-500">
                            {monthlyStats.chartUpdates.filter((u: any) => u.position && u.position <= 10 && !u.isCompetitorSong).length}
                          </div>
                          <div className="text-sm text-white/70">Top 10</div>
                          <div className="text-xs text-white/50 mt-1">Your songs in elite positions</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="border-[#4e324c]">
                  <CardContent className="p-12 text-center">
                    <BarChart3 className="h-10 w-10 text-white/50 mx-auto mb-4" />
                    <h3 className="text-sm font-semibold text-white/70 mb-2">No Chart Activity</h3>
                    <p className="text-xs text-white/50">No songs charted this month</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="projects" className="space-y-4">
              {changes.filter((c: GameChange) => c.type === 'project_complete' || c.type === 'song_release').length > 0 ? (
                <div className="grid gap-4">
                  {changes.filter((c: GameChange) => c.type === 'project_complete' || c.type === 'song_release').map((change: GameChange, index: number) => (
                    <Card key={index} className="border-[#4e324c] hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-green-500/20 rounded-full">
                              <Music className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-white">{change.description}</h4>
                              <div className="flex items-center space-x-4 text-xs text-white/50 mt-1">
                                <span>Revenue: {formatCurrency(change.amount || 0)}</span>
                                {change.projectId && <span>Project ID: {change.projectId}</span>}
                              </div>
                            </div>
                          </div>
                          <Badge className="bg-green-500/20 text-green-400 px-2 py-1 text-xs">
                            {change.type === 'project_complete' ? 'Recorded' : 'Released'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Music className="h-10 w-10 text-white/50 mx-auto mb-4" />
                    <h3 className="text-sm font-semibold text-white/70 mb-2">No Projects Completed</h3>
                    <p className="text-xs text-white/50">No projects were completed this month</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          /* Empty state for no results */
          <Card>
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-[#3c252d]/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white/50" />
              </div>
              <h3 className="text-base font-semibold text-white/70 mb-2">No Results Available</h3>
              <p className="text-sm text-white/50">No detailed results are available for this month</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-6 border-t border-[#4e324c] bg-[#3c252d]/20">
        <div className="max-w-md mx-auto">
          <Button
            onClick={onAdvanceMonth}
            disabled={isAdvancing}
            size="lg"
            className="w-full bg-[#A75A5B] hover:bg-[#A75A5B]/80 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {isAdvancing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Advancing...
              </span>
            ) : (
              <span className="flex items-center justify-center space-x-2">
                {isMonthResults ? (
                  <>
                    <DollarSign className="h-5 w-5" />
                    <span>Back to Dashboard</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    <span>Continue to Next Month</span>
                  </>
                )}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}