import { Card, CardContent } from '@/components/ui/card';
import { useGameStore } from '@/store/gameStore';

export function QuickStats() {
  const { gameState } = useGameStore();

  if (!gameState) return null;

  const getMonthlyStats = () => {
    const monthlyStats = gameState.monthlyStats as any;
    const currentMonthKey = `month${gameState.currentMonth - 1}`;
    const stats = monthlyStats?.[currentMonthKey] || {};
    
    return {
      streams: stats.streams || 0,
      pressMentions: stats.pressMentions || 0,
      revenue: stats.revenue || 0,
      expenses: stats.expenses || 3000
    };
  };

  const stats = getMonthlyStats();
  const netProfitLoss = stats.revenue - stats.expenses;

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <i className="fas fa-chart-bar text-success mr-2"></i>
          This Month's Performance
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Total Streams</span>
            <span className="font-mono font-semibold">{stats.streams.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Press Mentions</span>
            <span className="font-mono font-semibold">{stats.pressMentions}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Revenue</span>
            <span className="font-mono font-semibold text-success">${stats.revenue.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Expenses</span>
            <span className="font-mono font-semibold text-danger">${stats.expenses.toLocaleString()}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900">Net Profit/Loss</span>
            <span className={`font-mono font-bold ${netProfitLoss >= 0 ? 'text-success' : 'text-danger'}`}>
              {netProfitLoss >= 0 ? '+' : ''}${netProfitLoss.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
