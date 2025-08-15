import { Card, CardContent } from '@/components/ui/card';
import { useGameStore } from '@/store/gameStore';

export function KPICards() {
  const { gameState } = useGameStore();

  if (!gameState) return null;

  const getReputationChange = () => {
    const monthlyStats = gameState.monthlyStats as any;
    const lastMonth = `month${gameState.currentMonth - 1}`;
    return monthlyStats?.[lastMonth]?.reputationChange || 0;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Reputation Card */}
      <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Reputation</h3>
            <i className="fas fa-star text-warning"></i>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{gameState.reputation}</div>
          <div className={`text-xs mt-1 ${getReputationChange() >= 0 ? 'text-success' : 'text-danger'}`}>
            <i className={`fas fa-arrow-${getReputationChange() >= 0 ? 'up' : 'down'}`}></i>
            {' '}{getReputationChange() >= 0 ? '+' : ''}{getReputationChange()} this month
          </div>
        </CardContent>
      </Card>

      {/* Creative Capital Card */}
      <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Creative Capital</h3>
            <i className="fas fa-lightbulb text-secondary"></i>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{gameState.creativeCapital}</div>
          <div className="text-xs text-slate-600 mt-1">
            Available for projects
          </div>
        </CardContent>
      </Card>

      {/* Focus Slots Card */}
      <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Focus Slots</h3>
            <i className="fas fa-calendar-check text-primary"></i>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            <span>{gameState.usedFocusSlots}</span>
            <span className="text-slate-400">/</span>
            <span>{gameState.focusSlots}</span>
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {gameState.focusSlots - gameState.usedFocusSlots} remaining this month
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
