import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Settings, TrendingUp, TrendingDown } from "lucide-react";

// Premium Music Industry Dashboard Components
const MetricCard = ({ title, value, subtitle, icon, trend }: {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
}) => (
  <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-yellow-500 transition-colors">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-white text-xl font-bold">{value}</p>
        {subtitle && (
          <div className="flex items-center space-x-1">
            <p className="text-gray-500 text-xs">{subtitle}</p>
            {trend && trend !== 'neutral' && (
              trend === 'up' ? 
                <TrendingUp className="w-3 h-3 text-green-400" /> :
                <TrendingDown className="w-3 h-3 text-red-400" />
            )}
          </div>
        )}
      </div>
      <div className="text-yellow-500 text-2xl">{icon}</div>
    </div>
  </div>
);

const AccessTierBadge = ({ tier, level }: { tier: string; level: string }) => (
  <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
    <span className="text-gray-400 text-sm capitalize">{tier}</span>
    <Badge variant={level === 'none' ? 'secondary' : 'default'} className="text-xs">
      {level === 'none' ? 'None' : level}
    </Badge>
  </div>
);

export default function GamePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<'dashboard' | 'planner' | 'summary'>('dashboard');
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [monthSummary, setMonthSummary] = useState<any>(null);

  // Fetch or create game state
  const { data: gameState, isLoading } = useQuery({
    queryKey: ['/api/game-state'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/game-state');
        if (!response.ok) {
          // Initialize new game if none exists
          const newGameResponse = await fetch('/api/game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentMonth: 1,
              money: 75000,
              reputation: 5,
              creativeCapital: 10,
              focusSlots: 3,
              usedFocusSlots: 0,
              playlistAccess: "none",
              pressAccess: "none",
              venueAccess: "none",
              campaignType: "standard",
              rngSeed: Math.random().toString(36).substring(7),
              flags: {},
              monthlyStats: {}
            })
          });
          if (!newGameResponse.ok) {
            throw new Error('Failed to create game');
          }
          return await newGameResponse.json();
        }
        return await response.json();
      } catch (error) {
        console.error('Game state error:', error);
        // Return default state if API fails
        return {
          id: 'demo',
          currentMonth: 1,
          money: 75000,
          reputation: 5,
          creativeCapital: 10,
          focusSlots: 3,
          usedFocusSlots: 0,
          playlistAccess: "none",
          pressAccess: "none",
          venueAccess: "none",
          campaignType: "standard"
        };
      }
    }
  });

  // Advance month mutation
  const advanceMonthMutation = useMutation({
    mutationFn: async (actions: string[]) => {
      const response = await fetch('/api/advance-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameId: gameState?.id, 
          selectedActions: actions 
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to advance month');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setMonthSummary(data);
      setView('summary');
      setSelectedActions([]);
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      
      toast({
        title: `Month ${data.month} Complete!`,
        description: `Net change: $${data.netChange?.toLocaleString() || '0'}`
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to advance month",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-yellow-500 text-xl">🎵 Loading Music Label Manager...</div>
      </div>
    );
  }

  // STEP 1: EXECUTIVE DASHBOARD
  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-yellow-500">🎵 Music Label Manager</h1>
            <div className="flex items-center space-x-4">
              <div className="text-gray-400">
                Month {gameState?.currentMonth || 1}/12
              </div>
              <Settings className="w-5 h-5 text-gray-400 cursor-pointer hover:text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Main Content */}
          <div className="flex-1 p-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard
                title="Finances"
                value={`$${(gameState?.money || 75000).toLocaleString()}`}
                subtitle="Monthly burn: ~$4.5k"
                icon="💰"
                trend="down"
              />
              <MetricCard
                title="Reputation"
                value={`${gameState?.reputation || 5}%`}
                subtitle="Global • USA: 3%"
                icon="📈"
                trend="neutral"
              />
              <MetricCard
                title="Artists"
                value="2 signed"
                subtitle="Avg. mood: ⭐⭐⭐⭐☆"
                icon="🎤"
                trend="up"
              />
              <MetricCard
                title="Focus Slots"
                value={`${gameState?.usedFocusSlots || 0}/${gameState?.focusSlots || 3}`}
                subtitle="Actions available"
                icon="⚡"
                trend="neutral"
              />
            </div>

            {/* Action Button */}
            <div className="text-center">
              <Button
                onClick={() => setView('planner')}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-3 text-lg"
              >
                📅 Plan Next Month
              </Button>
            </div>
          </div>

          {/* Right Sidebar - Access Tiers */}
          <div className="w-80 bg-gray-950 border-l border-gray-800 p-6">
            <h3 className="text-lg font-semibold mb-4 text-yellow-500">🎯 Access Tiers</h3>
            <div className="space-y-3">
              <AccessTierBadge tier="playlist" level={gameState?.playlistAccess || 'none'} />
              <AccessTierBadge tier="press" level={gameState?.pressAccess || 'none'} />
              <AccessTierBadge tier="venue" level={gameState?.venueAccess || 'none'} />
            </div>
            
            <div className="mt-8 p-4 bg-gray-800 rounded-lg">
              <h4 className="font-medium mb-2 text-yellow-500">Next Unlock</h4>
              <p className="text-gray-400 text-sm">Playlist Access: Local</p>
              <p className="text-gray-500 text-xs">Requires 15% reputation</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: MONTH PLANNER INTERFACE
  if (view === 'planner') {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-yellow-500">📅 Month Planner - Select up to 3 Focus Actions</h1>
            <Button variant="outline" onClick={() => setView('dashboard')}>← Back to Dashboard</Button>
          </div>

          {/* Industry Meetings Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Industry Meetings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'manager', name: 'Manager', relationship: 75, prompt: 'We can only push two tracks next month—what\'s the focus?' },
                { id: 'anr', name: 'A&R', relationship: 60, prompt: 'Pick the lead single approach.' },
                { id: 'producer', name: 'Producer', relationship: 65, prompt: 'Timeline is tight—what\'s the call?' },
                { id: 'pr', name: 'PR / Publicist', relationship: 50, prompt: 'Choose the story angle for this cycle.' },
                { id: 'digital', name: 'Digital Marketing', relationship: 55, prompt: 'Ad budget split this month?' },
                { id: 'streaming', name: 'Streaming Curator Pitches', relationship: 40, prompt: 'Which track and context for editorial pitch?' },
                { id: 'booking', name: 'Booking/Promoter', relationship: 45, prompt: 'Mini-tour scale choice?' },
                { id: 'ops', name: 'Distributor / Operations', relationship: 70, prompt: 'Release mechanics choice?' }
              ].map((role) => {
                const isSelected = selectedActions.includes(role.id);
                const isDisabled = selectedActions.length >= 3 && !isSelected;
                
                return (
                  <div
                    key={role.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-yellow-500 bg-yellow-500/10 shadow-lg shadow-yellow-500/20'
                        : 'border-gray-600 hover:border-gray-400'
                    } ${
                      isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => {
                      if (isDisabled) return;
                      
                      if (isSelected) {
                        setSelectedActions(prev => prev.filter(id => id !== role.id));
                      } else {
                        setSelectedActions(prev => [...prev, role.id]);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="text-yellow-500"
                      />
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{role.name}</h3>
                        <div className="text-yellow-500 text-sm">
                          {'★'.repeat(Math.floor(role.relationship / 20))}{'☆'.repeat(5 - Math.floor(role.relationship / 20))}
                        </div>
                        <p className="text-gray-400 text-sm italic">
                          "{role.prompt.slice(0, 40)}..."
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Projects Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'record-single', name: 'Record Single', cost: '$3k-12k' },
                { id: 'plan-ep', name: 'Plan EP', cost: '$15k-35k' },
                { id: 'plan-tour', name: 'Plan Mini-Tour', cost: '$5k-15k' }
              ].map((project) => {
                const isSelected = selectedActions.includes(project.id);
                const isDisabled = selectedActions.length >= 3 && !isSelected;
                
                return (
                  <div
                    key={project.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-yellow-500 bg-yellow-500/10 shadow-lg shadow-yellow-500/20'
                        : 'border-gray-600 hover:border-gray-400'
                    } ${
                      isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => {
                      if (isDisabled) return;
                      
                      if (isSelected) {
                        setSelectedActions(prev => prev.filter(id => id !== project.id));
                      } else {
                        setSelectedActions(prev => [...prev, project.id]);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="text-yellow-500"
                      />
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{project.name}</h3>
                        <p className="text-gray-400 text-sm">{project.cost}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Actions Bar */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">Selected Actions ({selectedActions.length}/3)</h3>
            <div className="flex flex-wrap gap-2">
              {selectedActions.length === 0 ? (
                <p className="text-gray-500">No actions selected</p>
              ) : (
                selectedActions.map((actionId) => (
                  <Badge key={actionId} className="bg-yellow-500 text-black">
                    {actionId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Advance Month Button */}
          <div className="text-center">
            <Button
              onClick={() => advanceMonthMutation.mutate(selectedActions)}
              disabled={selectedActions.length === 0 || advanceMonthMutation.isPending}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-12 py-4 text-xl"
            >
              🚀 ADVANCE MONTH
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 3: MONTH ADVANCEMENT SUMMARY
  if (view === 'summary' && monthSummary) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="bg-gray-900 border border-yellow-500 rounded-lg p-8 max-w-2xl w-full">
          <h1 className="text-3xl font-bold text-yellow-500 mb-6 text-center">
            Month {monthSummary.month} - Summary Report
          </h1>
          
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-500 mb-2">💰 Financial Changes</h3>
              <p className="text-green-400">Revenue: +${monthSummary.revenue?.toLocaleString() || '0'}</p>
              <p className="text-red-400">Expenses: -${monthSummary.expenses?.toLocaleString() || '0'}</p>
              <p className="text-white font-bold">Net: ${monthSummary.netChange?.toLocaleString() || '0'}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-500 mb-2">📈 Reputation Changes</h3>
              <p>Global reputation: {monthSummary.reputationChange > 0 ? '+' : ''}{monthSummary.reputationChange}%</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-500 mb-2">🎯 Next Month Preview</h3>
              <p>New opportunities await in Month {(monthSummary.month || 1) + 1}</p>
            </div>
          </div>

          <div className="text-center mt-8">
            <Button
              onClick={() => setView('dashboard')}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-3"
            >
              Continue to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}