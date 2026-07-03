import { useGameStore } from '@/store/gameStore';
import { useGameState } from '@/hooks/useGameState';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Clock, Zap, BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchMeetingDialogue } from '@/services/executiveService';
import { AnimatedNumber } from '@/components/motion-primitives/animated-number';

interface SelectedChoice {
  executiveName: string;
  meetingName: string;
  choiceLabel: string;
  effects_immediate: Record<string, number>;
  effects_delayed: Record<string, number>;
}

interface ImpactPreview {
  immediate: Record<string, number>;
  delayed: Record<string, number>;
  selectedChoices: SelectedChoice[];
}

export function MetricsDashboard() {
  const gameState = useGameState();
  const { selectedActions } = useGameStore();
  const [impactPreview, setImpactPreview] = useState<ImpactPreview>({
    immediate: {},
    delayed: {},
    selectedChoices: []
  });

  // Calculate real impact preview when selectedActions change
  useEffect(() => {
    const calculateImpactPreview = async () => {
      if (selectedActions.length === 0) {
        setImpactPreview({ immediate: {}, delayed: {}, selectedChoices: [] });
        return;
      }

      const immediate: Record<string, number> = {};
      const delayed: Record<string, number> = {};
      const selectedChoices: SelectedChoice[] = [];

      try {
        for (const actionString of selectedActions) {
          const actionData = JSON.parse(actionString);
          const { roleId, actionId, choiceId } = actionData;

          // Fetch the meeting dialogue to get choice effects
          const dialogue = await fetchMeetingDialogue(roleId, actionId);
          const choice = dialogue.choices.find(c => c.id === choiceId);

          if (choice) {
            selectedChoices.push({
              executiveName: roleId.toUpperCase(),
              meetingName: actionId.replace(/_/g, ' '),
              choiceLabel: choice.label,
              effects_immediate: choice.effects_immediate as Record<string, number>,
              effects_delayed: choice.effects_delayed as Record<string, number>
            });

            // Accumulate immediate effects
            Object.entries(choice.effects_immediate).forEach(([effect, value]) => {
              if (value !== undefined) {
                immediate[effect] = (immediate[effect] || 0) + value;
              }
            });

            // Accumulate delayed effects
            Object.entries(choice.effects_delayed).forEach(([effect, value]) => {
              if (value !== undefined) {
                delayed[effect] = (delayed[effect] || 0) + value;
              }
            });
          }
        }

        setImpactPreview({ immediate, delayed, selectedChoices });
      } catch (error) {
        console.error('[METRICS IMPACT PREVIEW] Error:', error);
        setImpactPreview({ immediate: {}, delayed: {}, selectedChoices: [] });
      }
    };

    calculateImpactPreview();
  }, [selectedActions]);

  if (!gameState) return null;

  // Tier mapping - copied from AccessTierBadges for consistency
  const tierNameMap: Record<string, string> = {
    'none': 'None',
    'niche': 'Niche',
    'mid': 'Mid',
    'flagship': 'Flagship',
    'blogs': 'Blogs',
    'mid_tier': 'Mid-Tier',
    'national': 'Major',
    'clubs': 'Clubs',
    'theaters': 'Theaters',
    'arenas': 'Arenas'
  };

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

  const getCurrentTier = (tierType: 'playlist' | 'press' | 'venue') => {
    const currentTierName = tierType === 'playlist' ? gameState.playlistAccess :
                           tierType === 'press' ? gameState.pressAccess :
                           gameState.venueAccess;

    // Map lowercase tier names from gameState to UI tier names (same as AccessTierBadges)
    const mappedName = currentTierName ? (tierNameMap[currentTierName] || 'None') : 'None';
    return accessTiers[tierType].find(t => t.name === mappedName) || accessTiers[tierType][0];
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

  // Tier badge styling (v2 spec §6): locked = ghost chip; unlocked = gradient fill + glow
  const getTierBadgeClass = (level: number) => {
    if (level <= 0) {
      // Ghost chip for "None"
      return 'bg-white/[0.04] text-text-muted border border-white/[0.08]';
    }
    // Unlocked = mint→blue gradient with mint glow and dark text
    return 'bg-gradient-to-br from-[rgba(55,224,176,1)] to-[rgba(47,176,255,1)] text-[#04121a] border-0 shadow-glow-positive';
  };
  const getPlaylistTierColor = () => getTierBadgeClass(getCurrentTier('playlist').level);
  const getPressTierColor = () => getTierBadgeClass(getCurrentTier('press').level);
  const getVenueTierColor = () => getTierBadgeClass(getCurrentTier('venue').level);

  const getReputationChange = () => {
    const weeklyStats = gameState.weeklyStats as any;
    const currentWeek = gameState.currentWeek || 1;
    const lastWeek = `week${currentWeek - 1}`;
    return weeklyStats?.[lastWeek]?.reputationChange || 0;
  };

  const getWeeklyStats = () => {
    const weeklyStats = gameState.weeklyStats as any;
    const currentWeek = gameState.currentWeek || 1;
    const currentWeekKey = `week${currentWeek - 1}`;
    const stats = weeklyStats?.[currentWeekKey] || {};
    
    return {
      streams: stats.streams || 0,
      pressMentions: stats.pressMentions || 0,
      revenue: stats.revenue || 0,
      expenses: stats.expenses || 0,
      expenseBreakdown: stats.expenseBreakdown || null
    };
  };

  const stats = getWeeklyStats();
  const netProfitLoss = stats.revenue - stats.expenses;
  const reputationChange = getReputationChange();

  // Whole-dollar display with the sign before the $ ("-$16,688", not "$-16,687.5")
  const formatMoney = (amount: number) =>
    `${amount < 0 ? '-' : ''}$${Math.abs(Math.round(amount)).toLocaleString()}`;
  const formatSignedMoney = (amount: number) =>
    amount >= 0 ? `+${formatMoney(amount)}` : formatMoney(amount);

  const renderExpenseBreakdown = () => {
    if (!stats.expenseBreakdown) {
      return <div className="text-xs text-text-muted">No expense breakdown available</div>;
    }

    const breakdown = stats.expenseBreakdown;
    const total = breakdown.weeklyOperations +
      breakdown.artistSalaries +
      (breakdown.executiveSalaries || 0) +
      (breakdown.signingBonuses || 0) +
      breakdown.projectCosts +
      breakdown.marketingCosts +
      breakdown.roleMeetingCosts;

    return (
      <div className="space-y-2 text-xs">
        <div className="font-semibold text-negative mb-2 font-mono">Expense Breakdown (${total.toLocaleString()})</div>
        {breakdown.weeklyOperations > 0 && (
          <div className="flex justify-between">
            <span className="text-text-body">Weekly Operations:</span>
            <span className="font-medium font-mono text-money">${breakdown.weeklyOperations.toLocaleString()}</span>
          </div>
        )}
        {breakdown.artistSalaries > 0 && (
          <div className="flex justify-between">
            <span className="text-text-body">Artist Salaries:</span>
            <span className="font-medium font-mono text-money">${breakdown.artistSalaries.toLocaleString()}</span>
          </div>
        )}
        {breakdown.executiveSalaries > 0 && (
          <div className="flex justify-between">
            <span className="text-text-body">Executive Salaries:</span>
            <span className="font-medium font-mono text-money">${breakdown.executiveSalaries.toLocaleString()}</span>
          </div>
        )}
        {breakdown.signingBonuses > 0 && (
          <div className="flex justify-between">
            <span className="text-text-body">Signing Bonuses:</span>
            <span className="font-medium font-mono text-money">${breakdown.signingBonuses.toLocaleString()}</span>
          </div>
        )}
        {breakdown.projectCosts > 0 && (
          <div className="flex justify-between">
            <span className="text-text-body">Project Costs:</span>
            <span className="font-medium font-mono text-money">${breakdown.projectCosts.toLocaleString()}</span>
          </div>
        )}
        {breakdown.marketingCosts > 0 && (
          <div className="flex justify-between">
            <span className="text-text-body">Marketing Costs:</span>
            <span className="font-medium font-mono text-money">${breakdown.marketingCosts.toLocaleString()}</span>
          </div>
        )}
        {breakdown.roleMeetingCosts > 0 && (
          <div className="flex justify-between">
            <span className="text-text-body">Role Meeting Costs:</span>
            <span className="font-medium font-mono text-money">${breakdown.roleMeetingCosts.toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  };

  const renderRevenueBreakdown = () => {
    const weeklyStats = gameState.weeklyStats as any;
    const currentWeek = gameState.currentWeek || 1;
    const currentWeekKey = `week${currentWeek - 1}`;
    const weekData = weeklyStats?.[currentWeekKey] || {};
    const changes = weekData.changes || [];

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

        // Planned releases (type: 'release') are streaming revenue from initial release
        if (change.type === 'release' || description.includes('released:')) {
          revenueBreakdown.streamingRevenue += amount;
        } else if (change.type === 'ongoing_revenue' || description.includes('streaming') || description.includes('streams')) {
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
      return <div className="text-xs text-text-muted">No revenue breakdown available</div>;
    }

    return (
      <div className="space-y-2 text-xs">
        <div className="font-semibold text-positive mb-2 font-mono">Revenue Breakdown (${total.toLocaleString()})</div>
        {revenueBreakdown.streamingRevenue > 0 && (
          <div className="flex justify-between">
            <span className="text-text-body">🎵 Streaming Revenue:</span>
            <span className="font-medium font-mono text-positive">${revenueBreakdown.streamingRevenue.toLocaleString()}</span>
          </div>
        )}
        {revenueBreakdown.projectRevenue > 0 && (
          <div className="flex justify-between">
            <span className="text-text-body">🎧 Project Completion:</span>
            <span className="font-medium font-mono text-positive">${revenueBreakdown.projectRevenue.toLocaleString()}</span>
          </div>
        )}
        {revenueBreakdown.tourRevenue > 0 && (
          <div className="flex justify-between">
            <span className="text-text-body">🎤 Tour Revenue:</span>
            <span className="font-medium font-mono text-positive">${revenueBreakdown.tourRevenue.toLocaleString()}</span>
          </div>
        )}
        {revenueBreakdown.roleBenefits > 0 && (
          <div className="flex justify-between">
            <span className="text-text-body">🤝 Role Benefits:</span>
            <span className="font-medium font-mono text-positive">${revenueBreakdown.roleBenefits.toLocaleString()}</span>
          </div>
        )}
        {revenueBreakdown.otherRevenue > 0 && (
          <div className="flex justify-between">
            <span className="text-text-body">💼 Other Revenue:</span>
            <span className="font-medium font-mono text-positive">${revenueBreakdown.otherRevenue.toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Desktop Layout — v2 status rail: one glass panel split by verticals */}
        <div className="hidden lg:block mb-6">
          <div className="glass-panel chromatic-hairline hud-ticks flex items-stretch">

            {/* Core Status Section */}
            <div className="flex-1 min-w-0 p-6">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-label mb-[18px]">
                Core Status
              </div>
              <div className="flex gap-8">
                <div>
                  <div className="font-mono font-semibold text-xl leading-none text-text-primary">{gameState.reputation || 0}</div>
                  <div className="text-[11.5px] text-text-muted mt-1.5">
                    Reputation <span className={reputationChange >= 0 ? 'text-positive' : 'text-negative'}>{reputationChange >= 0 ? '+' : ''}{reputationChange}</span>
                  </div>
                </div>
                <div>
                  <div className="font-mono font-semibold text-xl leading-none text-text-primary">
                    {gameState.usedFocusSlots || 0}<span className="text-text-muted text-sm">/{gameState.focusSlots || 3}</span>
                  </div>
                  <div className="text-[11.5px] text-text-muted mt-1.5">Focus Slots</div>
                </div>
                <div>
                  <div className="font-mono font-semibold text-xl leading-none text-text-accent">{gameState.creativeCapital || 0}</div>
                  <div className="text-[11.5px] text-text-muted mt-1.5">Creative Capital</div>
                </div>
              </div>
            </div>

            <div className="w-px bg-white/[0.07]" />

            {/* Weekly Performance Section */}
            <div className="flex-[1.5] min-w-0 p-6">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-label mb-[18px]">
                Weekly Performance
              </div>
              <div className="flex flex-wrap gap-7">
                <div>
                  <div className="font-mono font-semibold text-xl leading-none text-text-primary">{stats.streams.toLocaleString()}</div>
                  <div className="text-[11.5px] text-text-muted mt-1.5">Total Plays</div>
                </div>
                <div>
                  <div className="font-mono font-semibold text-xl leading-none text-text-primary">{stats.pressMentions}</div>
                  <div className="text-[11.5px] text-text-muted mt-1.5">Mentions</div>
                </div>
                <div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="font-mono font-semibold text-xl leading-none text-positive">{formatMoney(stats.revenue)}</div>
                        <div className="text-[11.5px] text-text-muted mt-1.5">Earned</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {renderRevenueBreakdown()}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="font-mono font-semibold text-xl leading-none text-money">{formatMoney(stats.expenses)}</div>
                        <div className="text-[11.5px] text-text-muted mt-1.5">Spent</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {renderExpenseBreakdown()}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div>
                  <AnimatedNumber
                    value={netProfitLoss}
                    format={formatSignedMoney}
                    className={`block font-mono font-semibold text-xl leading-none ${netProfitLoss >= 0 ? 'text-positive' : 'text-negative'}`}
                  />
                  <div className="text-[11.5px] text-text-muted mt-1.5">{netProfitLoss >= 0 ? 'Profit' : 'Loss'}</div>
                </div>
              </div>
            </div>

            <div className="w-px bg-white/[0.07]" />

            {/* Access Tiers Section */}
            <div className="flex-1 min-w-0 p-6">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-label mb-[18px]">
                Access Tiers
              </div>
              <div className="flex gap-3">
                <div className="text-center">
                  <Badge className={`text-xs px-3 py-1.5 rounded-chip ${getPlaylistTierColor()}`}>
                    {getCurrentTier('playlist').name}
                  </Badge>
                  <div className="text-[10.5px] text-text-muted mt-[7px]">Playlist</div>
                </div>
                <div className="text-center">
                  <Badge className={`text-xs px-3 py-1.5 rounded-chip ${getPressTierColor()}`}>
                    {getCurrentTier('press').name}
                  </Badge>
                  <div className="text-[10.5px] text-text-muted mt-[7px]">Press</div>
                </div>
                <div className="text-center">
                  <Badge className={`text-xs px-3 py-1.5 rounded-chip ${getVenueTierColor()}`}>
                    {getCurrentTier('venue').name}
                  </Badge>
                  <div className="text-[10.5px] text-text-muted mt-[7px]">Venue</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tablet Layout */}
        <div className="hidden md:block lg:hidden">
          <div className="space-y-3">
            {/* Core Status Row */}
            <div className="glass-panel chromatic-hairline p-3">
              <h3 className="font-mono text-[10px] font-semibold text-text-label uppercase tracking-[0.2em] mb-2">
                Core Status
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-surface-inner/50 rounded-chip">
                  <div className="text-lg font-mono font-semibold text-text-primary">{gameState.reputation || 0}</div>
                  <div className="text-xs text-text-muted">Reputation</div>
                  <div className={`text-xs font-medium ${reputationChange >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {reputationChange >= 0 ? '+' : ''}{reputationChange}
                  </div>
                </div>
                <div className="text-center p-2 bg-surface-inner/50 rounded-chip">
                  <div className="text-lg font-mono font-semibold text-text-primary">
                    {gameState.usedFocusSlots || 0}/{gameState.focusSlots || 3}
                  </div>
                  <div className="text-xs text-text-muted">Focus Slots</div>
                  <div className="text-xs text-text-body">
                    {(gameState.focusSlots || 3) - (gameState.usedFocusSlots || 0)} available
                  </div>
                </div>
                <div className="text-center p-2 bg-surface-inner/50 rounded-chip">
                  <div className="text-lg font-mono font-semibold text-text-accent">{gameState.creativeCapital || 0}</div>
                  <div className="text-xs text-text-muted">Creative Capital</div>
                </div>
              </div>
            </div>

            {/* Performance Row */}
            <div className="glass-panel chromatic-hairline p-3">
              <h3 className="font-mono text-[10px] font-semibold text-text-label uppercase tracking-[0.2em] mb-2">
                Weekly Performance
              </h3>
              <div className="grid grid-cols-5 gap-2">
                <div className="text-center p-2 bg-surface-inner/50 rounded-chip">
                  <div className="text-base font-mono font-semibold text-text-primary">{stats.streams.toLocaleString()}</div>
                  <div className="text-xs text-text-muted">plays</div>
                </div>
                <div className="text-center p-2 bg-surface-inner/50 rounded-chip">
                  <div className="text-base font-mono font-semibold text-text-primary">{stats.pressMentions}</div>
                  <div className="text-xs text-text-muted">press</div>
                </div>
                <div className="text-center p-2 bg-surface-inner/50 rounded-chip">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="text-base font-mono font-semibold text-positive">{formatMoney(stats.revenue)}</div>
                        <div className="text-xs text-text-muted">earned</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {renderRevenueBreakdown()}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-center p-2 bg-surface-inner/50 rounded-chip">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="text-base font-mono font-semibold text-money">{formatMoney(stats.expenses)}</div>
                        <div className="text-xs text-text-muted">spent</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {renderExpenseBreakdown()}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-center p-2 bg-surface-inner/50 rounded-chip">
                  <div className={`text-base font-mono font-semibold ${netProfitLoss >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {formatSignedMoney(netProfitLoss)}
                  </div>
                  <div className="text-xs text-text-muted">net</div>
                </div>
              </div>
            </div>

            {/* Impact Preview Row */}
            <div className="glass-panel chromatic-hairline p-3">
              <h3 className="font-mono text-[10px] font-semibold text-text-label uppercase tracking-[0.2em] mb-2 flex items-center">
                <BarChart3 className="h-3.5 w-3.5 mr-2 text-money" />
                Impact Preview
              </h3>

              {selectedActions.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Zap className="h-3 w-3 text-neon-amber" />
                    <span className="text-xs font-medium text-text-body">This Week</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {Object.entries(impactPreview.immediate).map(([effect, value]) => (
                      <Badge key={effect} variant="outline" className={`text-xs ${value > 0 ? 'text-positive border-positive/30' : 'text-negative border-negative/30'}`}>
                        {value > 0 ? '+' : ''}{value} {effect.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                    {Object.keys(impactPreview.immediate).length === 0 && (
                      <span className="text-xs text-text-muted">No immediate effects</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mb-1">
                    <Clock className="h-3 w-3 text-neon-cyan" />
                    <span className="text-xs font-medium text-text-body">Delayed Effects</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(impactPreview.delayed).map(([effect, value]) => (
                      <Badge key={effect} variant="outline" className="text-xs border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
                        {value > 0 ? '+' : ''}{value} {effect.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                    {Object.keys(impactPreview.delayed).length === 0 && (
                      <span className="text-xs text-text-muted">No delayed effects</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 text-text-muted">
                  <p className="text-xs">No executive meeting choices made</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="block md:hidden">
          <div className="space-y-3">
            {/* Core Status */}
            <div className="glass-panel chromatic-hairline p-3">
              <h4 className="font-mono text-[10px] font-semibold text-text-label uppercase tracking-[0.2em] mb-2">
                Core Status
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-surface-inner/50 rounded-chip">
                  <div className="text-base font-mono font-semibold text-text-primary">{gameState.reputation || 0}</div>
                  <div className="text-xs text-text-muted">Reputation</div>
                  <div className={`text-xs font-medium ${reputationChange >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {reputationChange >= 0 ? '+' : ''}{reputationChange}
                  </div>
                </div>
                <div className="text-center p-2 bg-surface-inner/50 rounded-chip">
                  <div className="text-base font-mono font-semibold text-text-primary">
                    {gameState.usedFocusSlots || 0}/{gameState.focusSlots || 3}
                  </div>
                  <div className="text-xs text-text-muted">Focus</div>
                  <div className="text-xs text-text-body">
                    {(gameState.focusSlots || 3) - (gameState.usedFocusSlots || 0)} left
                  </div>
                </div>
                <div className="text-center p-2 bg-surface-inner/50 rounded-chip">
                  <div className="text-base font-mono font-semibold text-text-accent">{gameState.creativeCapital || 0}</div>
                  <div className="text-xs text-text-muted">Creative</div>
                  <div className="text-xs text-text-body">capital</div>
                </div>
              </div>
            </div>

            {/* Performance Highlights */}
            <div className="glass-panel chromatic-hairline p-3">
              <h4 className="font-mono text-[10px] font-semibold text-text-label uppercase tracking-[0.2em] mb-2">
                Performance
              </h4>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="text-center p-2 bg-surface-inner/50 rounded-chip">
                  <div className="text-base font-mono font-semibold text-text-primary">{stats.streams.toLocaleString()}</div>
                  <div className="text-xs text-text-muted">total streams</div>
                </div>
                <div className="text-center p-2 bg-surface-inner/50 rounded-chip">
                  <div className={`text-base font-mono font-semibold ${netProfitLoss >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {formatSignedMoney(netProfitLoss)}
                  </div>
                  <div className="text-xs text-text-muted">net {netProfitLoss >= 0 ? 'profit' : 'loss'}</div>
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-positive font-mono font-medium cursor-help">{formatMoney(stats.revenue)}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {renderRevenueBreakdown()}
                    </TooltipContent>
                  </Tooltip>
                  <div className="text-text-muted">revenue</div>
                </div>
                <div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-money font-mono font-medium cursor-help">{formatMoney(stats.expenses)}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {renderExpenseBreakdown()}
                    </TooltipContent>
                  </Tooltip>
                  <div className="text-text-muted">expenses</div>
                </div>
                <div>
                  <span className="text-text-primary font-mono font-medium">{stats.pressMentions}</span>
                  <div className="text-text-muted">press</div>
                </div>
              </div>
            </div>

            {/* Access Tiers Mobile */}
            <div className="glass-panel chromatic-hairline p-3">
              <h4 className="font-mono text-[10px] font-semibold text-text-label uppercase tracking-[0.2em] mb-2">
                Access Tiers
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <Badge className={`text-xs px-2 py-1 rounded-chip ${getPlaylistTierColor()}`}>
                    {getCurrentTier('playlist').name}
                  </Badge>
                  <div className="text-xs text-text-muted mt-1">Playlist</div>
                </div>
                <div className="text-center">
                  <Badge className={`text-xs px-2 py-1 rounded-chip ${getPressTierColor()}`}>
                    {getCurrentTier('press').name}
                  </Badge>
                  <div className="text-xs text-text-muted mt-1">Press</div>
                </div>
                <div className="text-center">
                  <Badge className={`text-xs px-2 py-1 rounded-chip ${getVenueTierColor()}`}>
                    {getCurrentTier('venue').name}
                  </Badge>
                  <div className="text-xs text-text-muted mt-1">Venue</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Impact Preview - Bottom Section */}
        {selectedActions.length > 0 && (
          <div className="mt-4">
            <div className="glass-panel chromatic-hairline p-4">
              <h3 className="font-mono text-[10px] font-semibold text-text-label uppercase tracking-[0.2em] mb-3 flex items-center">
                <BarChart3 className="h-3.5 w-3.5 mr-2 text-money" />
                Executive Meetings Impact Preview
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* This Week Column */}
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <Zap className="h-3 w-3 text-neon-amber" />
                    <span className="text-xs font-medium text-text-body">This Week</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(impactPreview.immediate).map(([effect, value]) => (
                      <Badge key={effect} variant="outline" className={`text-xs ${value > 0 ? 'text-positive border-positive/30' : 'text-negative border-negative/30'}`}>
                        {value > 0 ? '+' : ''}{value} {effect.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                    {Object.keys(impactPreview.immediate).length === 0 && (
                      <span className="text-xs text-text-muted">No immediate effects</span>
                    )}
                  </div>
                </div>

                {/* Delayed Effects Column */}
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <Clock className="h-3 w-3 text-neon-cyan" />
                    <span className="text-xs font-medium text-text-body">Delayed Effects</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(impactPreview.delayed).map(([effect, value]) => (
                      <Badge key={effect} variant="outline" className="text-xs border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
                        {value > 0 ? '+' : ''}{value} {effect.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                    {Object.keys(impactPreview.delayed).length === 0 && (
                      <span className="text-xs text-text-muted">No delayed effects</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}