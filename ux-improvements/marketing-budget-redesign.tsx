import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, DollarSign, TrendingUp, Zap } from 'lucide-react';

// Improved Marketing Budget Component with Better Cognitive Load Management
export function ImprovedMarketingBudget({ 
  channelBudgets, 
  setChannelBudgets, 
  leadSingleBudget, 
  setLeadSingleBudget, 
  releaseType, 
  leadSingle,
  gameState,
  MARKETING_CHANNELS 
}) {
  const [budgetMode, setBudgetMode] = useState<'simple' | 'advanced'>('simple');
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  // Simple mode: preset budget packages
  const BUDGET_PRESETS = [
    {
      id: 'minimal',
      name: 'Minimal Push',
      total: 3000,
      description: 'Basic promotion',
      allocation: { radio: 0, digital: 2000, pr: 0, influencer: 1000 }
    },
    {
      id: 'balanced',
      name: 'Balanced Campaign',
      total: 8000,
      description: 'Multi-channel approach',
      allocation: { radio: 2500, digital: 3000, pr: 1500, influencer: 1000 }
    },
    {
      id: 'aggressive',
      name: 'Full Promotion',
      total: 15000,
      description: 'Maximum reach',
      allocation: { radio: 6000, digital: 5000, pr: 2500, influencer: 1500 }
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Marketing Strategy</span>
          </div>
          <div className="flex">
            <Button
              variant={budgetMode === 'simple' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBudgetMode('simple')}
            >
              Simple
            </Button>
            <Button
              variant={budgetMode === 'advanced' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBudgetMode('advanced')}
              className="ml-2"
            >
              Advanced
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {budgetMode === 'simple' ? (
          // Simple Mode: Preset Packages
          <div className="space-y-4">
            <p className="text-sm text-white/70 mb-4">
              Choose a marketing package to get started quickly:
            </p>
            <div className="grid gap-3">
              {BUDGET_PRESETS.map(preset => {
                const isSelected = JSON.stringify(channelBudgets) === JSON.stringify(preset.allocation);
                return (
                  <div
                    key={preset.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-brand-purple/50 hover:border-brand-purple-light/60'
                    }`}
                    onClick={() => setChannelBudgets(preset.allocation)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-white">{preset.name}</h4>
                      <Badge variant={isSelected ? 'default' : 'outline'}>
                        ${preset.total.toLocaleString()}
                      </Badge>
                    </div>
                    <p className="text-sm text-white/70">{preset.description}</p>
                    
                    {/* Quick channel breakdown */}
                    <div className="flex space-x-4 mt-2 text-xs text-white/50">
                      {MARKETING_CHANNELS.map(channel => {
                        const amount = preset.allocation[channel.id];
                        return amount > 0 ? (
                          <span key={channel.id}>
                            {channel.name}: ${amount.toLocaleString()}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-xs text-white/50 mb-2">Want more control?</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBudgetMode('advanced')}
                className="text-blue-600"
              >
                Switch to Advanced Mode
              </Button>
            </div>
          </div>
        ) : (
          // Advanced Mode: Granular Control with Better Organization
          <Tabs defaultValue="main-release" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="main-release">Main Release</TabsTrigger>
              {releaseType !== 'single' && leadSingle && (
                <TabsTrigger value="lead-single">Lead Single</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="main-release" className="mt-4">
              <AdvancedChannelBudgeting
                budgets={channelBudgets}
                setBudgets={setChannelBudgets}
                channels={MARKETING_CHANNELS}
                gameState={gameState}
                title="Main Release Budget"
              />
            </TabsContent>
            
            {releaseType !== 'single' && leadSingle && (
              <TabsContent value="lead-single" className="mt-4">
                <AdvancedChannelBudgeting
                  budgets={leadSingleBudget}
                  setBudgets={setLeadSingleBudget}
                  channels={MARKETING_CHANNELS}
                  gameState={gameState}
                  title="Lead Single Budget"
                />
              </TabsContent>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

// Improved Advanced Budgeting with Accordion-style Channels
function AdvancedChannelBudgeting({ budgets, setBudgets, channels, gameState, title }) {
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  
  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white/90">{title}</h4>
        <Badge variant="outline" className="font-mono">
          Total: ${totalBudget.toLocaleString()}
        </Badge>
      </div>
      
      {/* Quick total budget slider */}
      <div className="p-3 bg-brand-dark-card/10 rounded-lg">
        <label className="text-xs text-white/70 mb-2 block">Quick Budget Adjust</label>
        <Slider
          value={[totalBudget]}
          onValueChange={(value) => {
            // Proportionally adjust all channels
            const ratio = value[0] / Math.max(totalBudget, 1);
            const newBudgets = {};
            channels.forEach(channel => {
              newBudgets[channel.id] = Math.round((budgets[channel.id] || 0) * ratio);
            });
            setBudgets(newBudgets);
          }}
          max={Math.min(20000, gameState?.money || 0)}
          min={0}
          step={500}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-white/50 mt-1">
          <span>$0</span>
          <span>${Math.min(20000, gameState?.money || 0).toLocaleString()}</span>
        </div>
      </div>
      
      {/* Channel-by-channel breakdown */}
      <div className="space-y-2">
        {channels.map(channel => {
          const budget = budgets[channel.id] || 0;
          const isActive = budget > 0;
          const isExpanded = expandedChannel === channel.id;
          const percentage = totalBudget > 0 ? (budget / totalBudget) * 100 : 0;
          
          return (
            <div
              key={channel.id}
              className={`border rounded-lg transition-all ${
                isActive ? 'border-blue-200 bg-blue-50' : 'border-brand-purple/50'
              }`}
            >
              {/* Channel Header */}
              <div
                className="p-3 cursor-pointer"
                onClick={() => setExpandedChannel(isExpanded ? null : channel.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <i className={`${channel.icon} ${isActive ? 'text-blue-600' : 'text-white/40'}`} />
                    <div>
                      <h5 className="font-medium text-white">{channel.name}</h5>
                      <p className="text-xs text-white/50">{channel.targetAudience} • {channel.effectiveness}% effective</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold">${budget.toLocaleString()}</div>
                    <div className="text-xs text-white/50">{percentage.toFixed(1)}%</div>
                  </div>
                </div>
                
                {/* Mini progress bar */}
                {isActive && (
                  <div className="mt-2 bg-white rounded-full h-1">
                    <div 
                      className="bg-blue-500 h-1 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (budget / channel.maxBudget) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              
              {/* Expanded Channel Controls */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t bg-white">
                  <div className="pt-3 space-y-3">
                    <p className="text-xs text-white/70">{channel.description}</p>
                    
                    <Slider
                      value={[budget]}
                      onValueChange={(value) => 
                        setBudgets(prev => ({ ...prev, [channel.id]: value[0] }))
                      }
                      max={Math.min(channel.maxBudget, gameState?.money || 0)}
                      min={0}
                      step={250}
                      className="w-full"
                    />
                    
                    <div className="flex justify-between text-xs text-white/50">
                      <span>Min: ${channel.minBudget.toLocaleString()}</span>
                      <span>Max: ${channel.maxBudget.toLocaleString()}</span>
                    </div>
                    
                    {/* Quick preset buttons */}
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBudgets(prev => ({ ...prev, [channel.id]: 0 }))}
                      >
                        None
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBudgets(prev => ({ ...prev, [channel.id]: channel.minBudget }))}
                      >
                        Min
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBudgets(prev => ({ 
                          ...prev, 
                          [channel.id]: Math.round(channel.maxBudget * 0.6) 
                        }))}
                      >
                        Optimal
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}