import { useGameStore } from '@/store/gameStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function MetricsDashboard() {
  const { gameState } = useGameStore();

  if (!gameState) return null;

  // Industry Standing calculations
  const getCurrentTier = (tierType: 'playlist' | 'press' | 'venue') => {
    const accessTiers = {
      playlist: [
        { name: 'None', level: 0 },
        { name: 'Niche', level: 1 },
        { name: 'Mid', level: 2 },
        { name: 'Flagship', level: 3 }
      ],
      press: [
        { name: 'None', level: 0 },
        { name: 'Blogs', level: 1 },
        { name: 'Mid-Tier', level: 2 },
        { name: 'Major', level: 3 }
      ],
      venue: [
        { name: 'None', level: 0 },
        { name: 'Clubs', level: 1 },
        { name: 'Theaters', level: 2 },
        { name: 'Arenas', level: 3 }
      ]
    };

    const currentTierName = tierType === 'playlist' ? gameState.playlistAccess :
                           tierType === 'press' ? gameState.pressAccess :
                           gameState.venueAccess;
    
    return accessTiers[tierType].find(t => t.name === currentTierName) || accessTiers[tierType][0];
  };

  const getAccessLevel = () => {
    return getCurrentTier('playlist').level + getCurrentTier('press').level + getCurrentTier('venue').level;
  };

  const getTotalUnlocks = () => {
    const playlistUnlocks = getCurrentTier('playlist').level + 1;
    const pressUnlocks = getCurrentTier('press').level + 1;
    const venueUnlocks = getCurrentTier('venue').level + 1;
    return playlistUnlocks + pressUnlocks + venueUnlocks - 3; // Subtract 3 to exclude the "None" tiers
  };

  const getReputationChange = () => {
    const monthlyStats = gameState.monthlyStats as any;
    const currentMonth = gameState.currentMonth || 1;
    const lastMonth = `month${currentMonth - 1}`;
    return monthlyStats?.[lastMonth]?.reputationChange || 0;
  };

  const getMonthlyStats = () => {
    const monthlyStats = gameState.monthlyStats as any;
    const currentMonth = gameState.currentMonth || 1;
    const currentMonthKey = `month${currentMonth - 1}`;
    const stats = monthlyStats?.[currentMonthKey] || {};
    
    return {
      streams: stats.streams || 0,
      pressMentions: stats.pressMentions || 0,
      revenue: stats.revenue || 0,
      expenses: stats.expenses || 0,
      expenseBreakdown: stats.expenseBreakdown || null
    };
  };

  const stats = getMonthlyStats();
  const netProfitLoss = stats.revenue - stats.expenses;
  const reputationChange = getReputationChange();

  const renderExpenseBreakdown = () => {
    if (!stats.expenseBreakdown) {
      return <div className="text-xs text-slate-500">No expense breakdown available</div>;
    }

    const breakdown = stats.expenseBreakdown;
    const total = breakdown.monthlyOperations + breakdown.artistSalaries + breakdown.projectCosts + breakdown.marketingCosts + breakdown.roleMeetingCosts;

    return (
      <div className="space-y-2 text-xs">
        <div className="font-semibold text-slate-700 mb-2">Expense Breakdown (${total.toLocaleString()})</div>
        {breakdown.monthlyOperations > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-600">Monthly Operations:</span>
            <span className="font-medium">${breakdown.monthlyOperations.toLocaleString()}</span>
          </div>
        )}
        {breakdown.artistSalaries > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-600">Artist Salaries:</span>
            <span className="font-medium">${breakdown.artistSalaries.toLocaleString()}</span>
          </div>
        )}
        {breakdown.projectCosts > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-600">Project Costs:</span>
            <span className="font-medium">${breakdown.projectCosts.toLocaleString()}</span>
          </div>
        )}
        {breakdown.marketingCosts > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-600">Marketing Costs:</span>
            <span className="font-medium">${breakdown.marketingCosts.toLocaleString()}</span>
          </div>
        )}
        {breakdown.roleMeetingCosts > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-600">Role Meeting Costs:</span>
            <span className="font-medium">${breakdown.roleMeetingCosts.toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  };

  const renderRevenueBreakdown = () => {
    const monthlyStats = gameState.monthlyStats as any;
    const currentMonth = gameState.currentMonth || 1;
    const currentMonthKey = `month${currentMonth - 1}`;
    const monthData = monthlyStats?.[currentMonthKey] || {};
    const changes = monthData.changes || [];

    // Categorize revenue sources from changes following pure function principles
    const revenueBreakdown = {
      streamingRevenue: 0,
      projectRevenue: 0,
      tourRevenue: 0,
      roleBenefits: 0,
      otherRevenue: 0
    };

    changes.forEach((change: any) => {
      if (change.amount > 0) {
        const description = change.description?.toLowerCase() || '';
        const amount = change.amount;

        if (change.type === 'ongoing_revenue' || description.includes('streaming') || description.includes('streams')) {
          revenueBreakdown.streamingRevenue += amount;
        } else if (change.type === 'revenue' && (description.includes('streaming') || description.includes('streams'))) {
          revenueBreakdown.streamingRevenue += amount;
        } else if (change.type === 'project_complete' || description.includes('revenue') || description.includes('complete')) {
          revenueBreakdown.projectRevenue += amount;
        } else if (description.includes('tour')) {
          revenueBreakdown.tourRevenue += amount;
        } else if (description.includes('role') || description.includes('meeting') || description.includes('benefit')) {
          revenueBreakdown.roleBenefits += amount;
        } else if (change.type === 'revenue') {
          revenueBreakdown.otherRevenue += amount;
        }
      }
    });

    const total = Object.values(revenueBreakdown).reduce((sum, amount) => sum + amount, 0);

    if (total === 0) {
      return <div className="text-xs text-slate-500">No revenue breakdown available</div>;
    }

    return (
      <div className="space-y-2 text-xs">
        <div className="font-semibold text-emerald-700 mb-2">Revenue Breakdown (${total.toLocaleString()})</div>
        {revenueBreakdown.streamingRevenue > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-600">🎵 Streaming Revenue:</span>
            <span className="font-medium text-emerald-600">${revenueBreakdown.streamingRevenue.toLocaleString()}</span>
          </div>
        )}
        {revenueBreakdown.projectRevenue > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-600">🎧 Project Completion:</span>
            <span className="font-medium text-emerald-600">${revenueBreakdown.projectRevenue.toLocaleString()}</span>
          </div>
        )}
        {revenueBreakdown.tourRevenue > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-600">🎤 Tour Revenue:</span>
            <span className="font-medium text-emerald-600">${revenueBreakdown.tourRevenue.toLocaleString()}</span>
          </div>
        )}
        {revenueBreakdown.roleBenefits > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-600">🤝 Role Benefits:</span>
            <span className="font-medium text-emerald-600">${revenueBreakdown.roleBenefits.toLocaleString()}</span>
          </div>
        )}
        {revenueBreakdown.otherRevenue > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-600">💼 Other Revenue:</span>
            <span className="font-medium text-emerald-600">${revenueBreakdown.otherRevenue.toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 rounded-2xl shadow-lg border-2 border-slate-200/50 p-4 md:p-6 mb-6">
        
        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-11 gap-6">
            
            {/* Core Status Section */}
            <div className="col-span-3 bg-white/60 rounded-xl p-4 border border-white/50">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                <i className="fas fa-tachometer-alt mr-2 text-blue-600"></i>
                Core Status
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-900">{gameState.reputation || 0}</div>
                  <div className="text-xs text-slate-500">Reputation</div>
                  <div className={`text-xs font-medium ${reputationChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {reputationChange >= 0 ? '+' : ''}{reputationChange}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-900">
                    {gameState.usedFocusSlots || 0}/{gameState.focusSlots || 3}
                  </div>
                  <div className="text-xs text-slate-500">Focus Slots</div>
                  <div className="text-xs text-slate-600">
                    {(gameState.focusSlots || 3) - (gameState.usedFocusSlots || 0)} available
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-700">{gameState.creativeCapital || 0}</div>
                  <div className="text-xs text-slate-500">Creative Capital</div>
                  <div className="text-xs text-slate-600">for projects</div>
                </div>
              </div>
            </div>

            {/* Monthly Performance Section */}
            <div className="col-span-5 bg-white/60 rounded-xl p-4 border border-white/50">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                <i className="fas fa-chart-line mr-2 text-green-600"></i>
                Monthly Performance
              </h3>
              <div className="grid grid-cols-5 gap-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-900">{stats.streams.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">total plays</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-900">{stats.pressMentions}</div>
                  <div className="text-xs text-slate-500">mentions</div>
                </div>
                <div className="text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="text-lg font-bold text-emerald-600">${stats.revenue.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">earned</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {renderRevenueBreakdown()}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="text-lg font-bold text-red-600">${stats.expenses.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">spent</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {renderExpenseBreakdown()}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${netProfitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {netProfitLoss >= 0 ? '+' : ''}${netProfitLoss.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500">{netProfitLoss >= 0 ? 'profit' : 'loss'}</div>
                </div>
              </div>
            </div>

            {/* Industry Standing Section */}
            <div className="col-span-3 bg-white/60 rounded-xl p-4 border border-white/50">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                <i className="fas fa-trophy mr-2 text-purple-600"></i>
                Industry Standing
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{gameState.reputation || 0}</div>
                  <div className="text-xs text-slate-500">Reputation</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{getAccessLevel()}</div>
                  <div className="text-xs text-slate-500">Access Level</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{getTotalUnlocks()}</div>
                  <div className="text-xs text-slate-500">Total Unlocks</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tablet Layout */}
        <div className="hidden md:block lg:hidden">
          <div className="space-y-3">
            {/* Core Status Row */}
            <div className="bg-white/60 rounded-xl p-3 border border-white/50">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                <i className="fas fa-tachometer-alt mr-2 text-blue-600"></i>
                Core Status
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="text-lg font-bold text-slate-900">{gameState.reputation || 0}</div>
                  <div className="text-xs text-slate-500">Reputation</div>
                  <div className={`text-xs font-medium ${reputationChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {reputationChange >= 0 ? '+' : ''}{reputationChange}
                  </div>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="text-lg font-bold text-slate-900">
                    {gameState.usedFocusSlots || 0}/{gameState.focusSlots || 3}
                  </div>
                  <div className="text-xs text-slate-500">Focus Slots</div>
                  <div className="text-xs text-slate-600">
                    {(gameState.focusSlots || 3) - (gameState.usedFocusSlots || 0)} available
                  </div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-700">{gameState.creativeCapital || 0}</div>
                  <div className="text-xs text-slate-500">Creative Capital</div>
                  <div className="text-xs text-slate-600">for projects</div>
                </div>
              </div>
            </div>

            {/* Performance Row */}
            <div className="bg-white/60 rounded-xl p-3 border border-white/50">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                <i className="fas fa-chart-line mr-2 text-green-600"></i>
                Monthly Performance
              </h3>
              <div className="grid grid-cols-5 gap-2">
                <div className="text-center p-2 bg-slate-50 rounded">
                  <div className="text-base font-bold text-slate-900">{stats.streams.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">plays</div>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded">
                  <div className="text-base font-bold text-slate-900">{stats.pressMentions}</div>
                  <div className="text-xs text-slate-500">press</div>
                </div>
                <div className="text-center p-2 bg-emerald-50 rounded">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="text-base font-bold text-emerald-600">${stats.revenue.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">earned</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {renderRevenueBreakdown()}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-center p-2 bg-red-50 rounded">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="text-base font-bold text-red-600">${stats.expenses.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">spent</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {renderExpenseBreakdown()}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded">
                  <div className={`text-base font-bold ${netProfitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {netProfitLoss >= 0 ? '+' : ''}${netProfitLoss.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500">net</div>
                </div>
              </div>
            </div>

            {/* Industry Standing Row */}
            <div className="bg-white/60 rounded-xl p-3 border border-white/50">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                <i className="fas fa-trophy mr-2 text-purple-600"></i>
                Industry Standing
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{gameState.reputation || 0}</div>
                  <div className="text-xs text-slate-500">Reputation</div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">{getAccessLevel()}</div>
                  <div className="text-xs text-slate-500">Access Level</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{getTotalUnlocks()}</div>
                  <div className="text-xs text-slate-500">Total Unlocks</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="block md:hidden">
          <div className="space-y-3">
            {/* Core Status */}
            <div className="bg-white/60 rounded-xl p-3 border border-white/50">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                <i className="fas fa-tachometer-alt mr-2 text-blue-600"></i>
                Core Status
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="text-base font-bold text-slate-900">{gameState.reputation || 0}</div>
                  <div className="text-xs text-slate-500">Reputation</div>
                  <div className={`text-xs font-medium ${reputationChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {reputationChange >= 0 ? '+' : ''}{reputationChange}
                  </div>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="text-base font-bold text-slate-900">
                    {gameState.usedFocusSlots || 0}/{gameState.focusSlots || 3}
                  </div>
                  <div className="text-xs text-slate-500">Focus</div>
                  <div className="text-xs text-slate-600">
                    {(gameState.focusSlots || 3) - (gameState.usedFocusSlots || 0)} left
                  </div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-base font-bold text-blue-700">{gameState.creativeCapital || 0}</div>
                  <div className="text-xs text-slate-500">Creative</div>
                  <div className="text-xs text-slate-600">capital</div>
                </div>
              </div>
            </div>

            {/* Performance Highlights */}
            <div className="bg-white/60 rounded-xl p-3 border border-white/50">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                <i className="fas fa-chart-line mr-2 text-green-600"></i>
                Performance
              </h4>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="text-base font-bold text-slate-900">{stats.streams.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">total streams</div>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className={`text-base font-bold ${netProfitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {netProfitLoss >= 0 ? '+' : ''}${netProfitLoss.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500">net {netProfitLoss >= 0 ? 'profit' : 'loss'}</div>
                </div>
              </div>
              
              {/* Secondary Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-emerald-600 font-medium cursor-help">${stats.revenue.toLocaleString()}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {renderRevenueBreakdown()}
                    </TooltipContent>
                  </Tooltip>
                  <div className="text-slate-500">revenue</div>
                </div>
                <div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-red-600 font-medium cursor-help">${stats.expenses.toLocaleString()}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {renderExpenseBreakdown()}
                    </TooltipContent>
                  </Tooltip>
                  <div className="text-slate-500">expenses</div>
                </div>
                <div>
                  <span className="text-slate-900 font-medium">{stats.pressMentions}</span>
                  <div className="text-slate-500">press</div>
                </div>
              </div>
            </div>

            {/* Industry Standing */}
            <div className="bg-white/60 rounded-xl p-3 border border-white/50">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                <i className="fas fa-trophy mr-2 text-purple-600"></i>
                Industry Standing
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="text-sm font-bold text-blue-600">{gameState.reputation || 0}</div>
                  <div className="text-xs text-slate-500">reputation</div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="text-sm font-bold text-purple-600">{getAccessLevel()}</div>
                  <div className="text-xs text-slate-500">access level</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="text-sm font-bold text-green-600">{getTotalUnlocks()}</div>
                  <div className="text-xs text-slate-500">unlocks</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        </div>
      </div>
    </TooltipProvider>
  );
}