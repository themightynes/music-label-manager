import React from 'react';
import { ChartUpdate } from '../../../shared/types/gameTypes';
import {
  formatChartPosition,
  formatChartMovement,
  getChartPositionColor,
  getMovementColor,
  isSignificantMovement,
  getChartTier
} from '../../../shared/utils/chartUtils';

interface ChartPerformanceCardProps {
  chartUpdates: ChartUpdate[];
  className?: string;
  showHeader?: boolean;
  compact?: boolean;
  variant?: 'light' | 'dark';
}

export const ChartPerformanceCard: React.FC<ChartPerformanceCardProps> = ({
  chartUpdates,
  className = '',
  showHeader = true,
  compact = false,
  variant = 'light'
}) => {

  // Theme-aware styling
  const isDark = variant === 'dark';
  const containerClasses = isDark
    ? 'bg-brand-dark-card/66 border-brand-purple text-white'
    : 'bg-white border-gray-200 text-gray-900';

  const headerTextClasses = isDark ? 'text-white' : 'text-gray-900';
  const subTextClasses = isDark ? 'text-white/70' : 'text-gray-500';
  const sectionBgClasses = isDark ? 'bg-black/20' : 'bg-gray-50';
  const debutBgClasses = isDark ? 'bg-green-500/20 border-green-500/30' : 'bg-green-50 border-green-200';
  const movementBgClasses = isDark ? 'bg-blue-500/20 border-blue-500/30' : 'bg-blue-50 border-blue-200';
  const itemHoverClasses = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';
  if (!chartUpdates || chartUpdates.length === 0) {
    return (
      <div className={`${containerClasses} rounded-lg p-4 ${className}`}>
        {showHeader && (
          <h3 className={`text-lg font-semibold ${headerTextClasses} mb-3`}>Chart Performance</h3>
        )}
        <p className={`${subTextClasses} text-center py-4`}>No chart activity this week</p>
      </div>
    );
  }

  const debuts = chartUpdates.filter(update => update.isDebut);
  const movements = chartUpdates.filter(update => !update.isDebut && update.movement && update.movement !== 0);
  const significantMovements = movements.filter(update =>
    isSignificantMovement(update.movement || 0) && update.position !== null
  );

  return (
    <div className={`${containerClasses} rounded-lg p-4 ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${headerTextClasses}`}>Chart Performance</h3>
          <div className={`text-sm ${subTextClasses}`}>
            {chartUpdates.length} song{chartUpdates.length !== 1 ? 's' : ''} charting
          </div>
        </div>
      )}

      {/* Debuts Section */}
      {debuts.length > 0 && (
        <div className="mb-4">
          <h4 className={`text-sm font-medium ${headerTextClasses} mb-2 flex items-center`}>
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            New Debuts ({debuts.length})
          </h4>
          <div className="space-y-2">
            {debuts.map((update, index) => (
              <div key={index} className={`flex items-center justify-between p-2 ${debutBgClasses} rounded-md border`}>
                <div className="flex-1">
                  <div className={`font-medium text-sm ${headerTextClasses}`}>{update.songTitle}</div>
                  <div className={`text-xs ${subTextClasses}`}>
                    {update.artistName} • debuts at {formatChartPosition(update.position)}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getChartPositionColor(update.position)}`}>
                    {formatChartPosition(update.position)}
                  </span>
                  <span className="text-xs text-green-600 font-medium">DEBUT</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Significant Movements */}
      {significantMovements.length > 0 && (
        <div className="mb-4">
          <h4 className={`text-sm font-medium ${headerTextClasses} mb-2 flex items-center`}>
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Big Moves ({significantMovements.length})
          </h4>
          <div className="space-y-2">
            {significantMovements.map((update, index) => {
              const movement = update.movement || 0;
              const previousPosition = update.position !== null && update.position !== undefined ? update.position + movement : null;

              return (
                <div key={index} className={`flex items-center justify-between p-2 ${movementBgClasses} rounded-md border`}>
                  <div className="flex-1">
                    <div className={`font-medium text-sm ${headerTextClasses}`}>{update.songTitle}</div>
                    <div className={`text-xs ${subTextClasses}`}>
                      {update.artistName} • {movement > 0 ? 'climbed' : 'fell'} {previousPosition !== null && previousPosition > 0 ? `#{previousPosition} → ${formatChartPosition(update.position)}` : (movement > 0 ? `re-entered at ${formatChartPosition(update.position)}` : `from chart → ${formatChartPosition(update.position)}`)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {previousPosition !== null && previousPosition > 0 ? (
                      <span className={`text-xs ${subTextClasses}`}>
                        #{previousPosition} →
                      </span>
                    ) : (
                      <span className={`text-xs ${subTextClasses}`}>
                        {movement > 0 ? 're-entered at' : 'from chart →'}
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getChartPositionColor(update.position)}`}>
                      {formatChartPosition(update.position)}
                    </span>
                    <span className={`text-xs font-medium ${getMovementColor(movement)}`}>
                      {formatChartMovement(movement)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Chart Positions */}
      {!compact && (
        <div>
          <h4 className={`text-sm font-medium ${headerTextClasses} mb-2 flex items-center`}>
            <span className="inline-block w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
            All Positions
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {[...chartUpdates]
              .sort((a, b) => (a.position || 101) - (b.position || 101))
              .map((update, index) => {
                const movement = update.movement || 0;
                return (
                  <div key={index} className={`flex items-center justify-between p-2 ${itemHoverClasses} rounded-md`}>
                    <div className="flex-1">
                      <div className={`font-medium text-sm ${headerTextClasses}`}>{update.songTitle}</div>
                      <div className={`text-xs ${subTextClasses} flex items-center space-x-2`}>
                        <span>{update.artistName}</span>
                        {update.weeksOnChart && (
                          <span>• {update.weeksOnChart} week{update.weeksOnChart !== 1 ? 's' : ''}</span>
                        )}
                        {update.peakPosition && (
                          <span>• Peak {formatChartPosition(update.peakPosition)}</span>
                        )}
                        <span>• {getChartTier(update.position)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getChartPositionColor(update.position)}`}>
                        {formatChartPosition(update.position)}
                      </span>
                      {movement !== 0 && (
                        <span className={`text-xs ${getMovementColor(movement)}`}>
                          {formatChartMovement(movement)}
                        </span>
                      )}
                      {update.isDebut && (
                        <span className="text-xs bg-green-100 text-green-700 px-1 rounded">NEW</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Chart Summary Stats */}
      {chartUpdates.length > 3 && (
        <div className={`mt-4 pt-3 border-t ${isDark ? 'border-brand-purple' : 'border-gray-200'}`}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className={`text-lg font-semibold ${headerTextClasses}`}>
                {chartUpdates.filter(u => u.position && u.position <= 10).length}
              </div>
              <div className={`text-xs ${subTextClasses}`}>Top 10</div>
            </div>
            <div>
              <div className={`text-lg font-semibold ${headerTextClasses}`}>
                {chartUpdates.filter(u => u.position && u.position <= 40).length}
              </div>
              <div className={`text-xs ${subTextClasses}`}>Top 40</div>
            </div>
            <div>
              <div className={`text-lg font-semibold ${headerTextClasses}`}>{debuts.length}</div>
              <div className={`text-xs ${subTextClasses}`}>Debuts</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartPerformanceCard;