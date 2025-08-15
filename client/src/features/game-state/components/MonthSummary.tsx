import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MonthSummaryProps {
  monthlyStats: any;
  onAdvanceMonth: () => void;
  isAdvancing?: boolean;
}

export function MonthSummary({ monthlyStats, onAdvanceMonth, isAdvancing }: MonthSummaryProps) {
  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-yellow-500">Month Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {monthlyStats && Object.keys(monthlyStats).length > 0 && (
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
        )}
        
        <Button
          onClick={onAdvanceMonth}
          disabled={isAdvancing}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
        >
          {isAdvancing ? 'Advancing...' : '🚀 ADVANCE MONTH'}
        </Button>
      </CardContent>
    </Card>
  );
}