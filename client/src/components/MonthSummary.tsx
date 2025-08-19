import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface MonthSummaryProps {
  monthlyStats: any;
  onAdvanceMonth: () => void;
  isAdvancing?: boolean;
  isMonthResults?: boolean;
}

export function MonthSummary({ monthlyStats, onAdvanceMonth, isAdvancing, isMonthResults }: MonthSummaryProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'events'>('overview');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'project_complete': return '🎉';
      case 'revenue': return '💰';
      case 'ongoing_revenue': return '📻'; // Radio icon for streaming revenue
      case 'expense': return '💸';
      case 'unlock': return '🔓';
      case 'artist': return '🎤';
      default: return '📊';
    }
  };

  const categorizeChanges = (changes: any[]) => {
    const categories = {
      revenue: [] as any[],
      expenses: [] as any[],
      achievements: [] as any[],
      other: [] as any[]
    };

    changes.forEach(change => {
      if (change.type === 'revenue' || change.type === 'project_complete' || change.type === 'ongoing_revenue') {
        categories.revenue.push(change);
      } else if (change.type === 'expense') {
        categories.expenses.push(change);
      } else if (change.type === 'unlock' || change.type === 'project_complete') {
        categories.achievements.push(change);
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
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-4xl w-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isMonthResults ? `Month ${monthlyStats?.month || ''} Results` : 'Month Summary'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Review your monthly performance and key metrics
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono text-slate-900">
              {formatCurrency(netIncome)}
            </div>
            <div className="text-xs text-slate-500">Net Income</div>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Revenue</p>
                  <p className="text-lg font-bold text-green-900">{formatCurrency(revenue)}</p>
                </div>
                <div className="text-2xl text-green-600">📈</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Expenses</p>
                  <p className="text-lg font-bold text-red-900">{formatCurrency(expenses)}</p>
                </div>
                <div className="text-2xl text-red-600">📉</div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${netIncome >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Net Income</p>
                  <p className={`text-lg font-bold ${netIncome >= 0 ? 'text-blue-900' : 'text-yellow-900'}`}>
                    {formatCurrency(netIncome)}
                  </p>
                </div>
                <div className="text-2xl">{netIncome >= 0 ? '💰' : '⚠️'}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar for Revenue vs Expenses */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Financial Breakdown</span>
            <span className="text-xs text-slate-500">
              {revenue > 0 ? `${((revenue / (revenue + expenses)) * 100).toFixed(0)}% revenue` : 'No revenue'}
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={revenue > 0 ? (revenue / (revenue + expenses)) * 100 : 0} 
              className="h-3 bg-red-100"
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-700">
              {revenue > 0 && expenses > 0 && `${formatCurrency(revenue)} / ${formatCurrency(revenue + expenses)}`}
            </div>
          </div>
        </div>

        {/* Tabs */}
        {isMonthResults && changes.length > 0 && (
          <>
            <div className="flex space-x-1 mb-4 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'projects'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🎵 Projects
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'events'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🎯 Events
              </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[200px]">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {categorizedChanges.revenue.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center">
                        💰 Revenue Sources
                      </h4>
                      <div className="space-y-2">
                        {categorizedChanges.revenue.map((change: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{getChangeIcon(change.type)}</span>
                              <span className="text-sm text-green-800">{change.description}</span>
                            </div>
                            <Badge variant="outline" className="text-green-700 border-green-300">
                              +{formatCurrency(change.amount || 0)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {categorizedChanges.achievements.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center">
                        🏆 Achievements
                      </h4>
                      <div className="space-y-2">
                        {categorizedChanges.achievements.map((change: any, index: number) => (
                          <div key={index} className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                            <span className="text-lg">{getChangeIcon(change.type)}</span>
                            <span className="text-sm text-blue-800">{change.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'projects' && (
                <div className="space-y-3">
                  {changes.filter((c: any) => c.type === 'project_complete').map((change: any, index: number) => (
                    <Card key={index} className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium text-slate-900">{change.description}</h4>
                            <div className="flex items-center space-x-4 text-xs text-slate-500">
                              <span>Revenue: {formatCurrency(change.amount || 0)}</span>
                              {change.projectId && <span>Project ID: {change.projectId}</span>}
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800">Released</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {changes.filter((c: any) => c.type === 'project_complete').length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <div className="text-4xl mb-2">🎵</div>
                      <p>No projects completed this month</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'events' && (
                <div className="space-y-3">
                  {monthlyStats?.events?.map((event: any, index: number) => (
                    <Card key={index} className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="text-2xl">📅</div>
                          <div>
                            <h4 className="font-medium text-slate-900">{event.title || 'Event'}</h4>
                            <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )) || (
                    <div className="text-center py-8 text-slate-500">
                      <div className="text-4xl mb-2">📅</div>
                      <p>No special events this month</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
        <Button
          onClick={onAdvanceMonth}
          disabled={isAdvancing}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
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
            isMonthResults ? '📊 Back to Dashboard' : '🚀 Continue to Next Month'
          )}
        </Button>
      </div>
    </div>
  );
}