import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MonthSummaryProps {
  monthlyStats: any;
  onAdvanceMonth: () => void;
  isAdvancing?: boolean;
  isMonthResults?: boolean;
}

export function MonthSummary({ monthlyStats, onAdvanceMonth, isAdvancing, isMonthResults }: MonthSummaryProps) {
  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-yellow-500">
          {isMonthResults ? `Month ${monthlyStats?.month || ''} Results` : 'Month Summary'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {monthlyStats && Object.keys(monthlyStats).length > 0 && (
          <>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Revenue:</span>
                <span className="text-green-400">${monthlyStats.revenue?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Expenses:</span>
                <span className="text-red-400">${monthlyStats.expenses?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-white">Net:</span>
                <span className={monthlyStats.netIncome >= 0 ? 'text-green-400' : 'text-red-400'}>
                  ${monthlyStats.netIncome?.toLocaleString() || '0'}
                </span>
              </div>
            </div>

            {/* Show detailed changes when in month results mode */}
            {isMonthResults && monthlyStats.changes && monthlyStats.changes.length > 0 && (
              <div className="border-t border-gray-600 pt-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Changes This Month:</h4>
                <div className="space-y-1 text-xs">
                  {monthlyStats.changes.map((change: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-400">{change.description}:</span>
                      <span className={change.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
                        ${Math.abs(change.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show events if any */}
            {isMonthResults && monthlyStats.events && monthlyStats.events.length > 0 && (
              <div className="border-t border-gray-600 pt-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Events:</h4>
                <div className="space-y-2 text-xs">
                  {monthlyStats.events.map((event: any, index: number) => (
                    <div key={index} className="p-2 bg-gray-800 rounded text-gray-300">
                      {event.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        <Button
          onClick={onAdvanceMonth}
          disabled={isAdvancing}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
        >
          {isAdvancing ? 'Advancing...' : (isMonthResults ? '📊 Back to Dashboard' : '🚀 ADVANCE MONTH')}
        </Button>
      </CardContent>
    </Card>
  );
}