import React from 'react';

// Component to display performance metrics with backend ROI
function PerformanceMetricsComponent({
  artistId,
  avgQuality,
  projectCount,
  readySongs,
  popularity,
  roiData
}: {
  artistId: string;
  avgQuality: number;
  projectCount: number;
  readySongs: number;
  popularity: number;
  roiData?: any;
}) {
  // Use passed roiData to avoid duplicate API calls
  const overallROI = roiData?.overallROI ?? 0;
  const totalRevenue = roiData?.totalRevenue ?? 0;
  const totalStreams = roiData?.totalStreams ?? 0;
  const totalProductionCost = roiData?.totalProductionInvestment ?? 0;
  const totalMarketingCost = roiData?.totalMarketingInvestment ?? 0;

  return (
    <div className="space-y-4">
      {/* Main metrics grid */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="p-3 bg-blue-500/10 rounded-lg">
          <div className="text-lg font-bold text-blue-700">{avgQuality}</div>
          <div className="text-xs text-white/70">Avg Quality</div>
        </div>
        <div className="p-3 bg-green-500/10 rounded-lg">
          <div className="text-lg font-bold text-green-700">{projectCount}</div>
          <div className="text-xs text-white/70">Projects</div>
        </div>
        <div className="p-3 bg-brand-burgundy-dark/10 rounded-lg">
          <div className="text-lg font-bold text-brand-burgundy-dark">{readySongs}</div>
          <div className="text-xs text-white/70">Ready Songs</div>
        </div>
        <div className="p-3 bg-orange-500/10 rounded-lg">
          <div className="text-lg font-bold text-orange-700">{popularity}</div>
          <div className="text-xs text-white/70">Popularity</div>
        </div>
      </div>

      {/* Financial metrics - separate section */}
      <div className="pt-3 border-t border-brand-purple/50">
        <div className="grid grid-cols-2 gap-3">
          {/* Revenue and Streams */}
          <div className="p-3 bg-green-500/10 rounded-lg">
            <div className="text-lg font-bold text-green-700">
              ${(totalRevenue / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-white/70">Total Revenue</div>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg">
            <div className="text-lg font-bold text-blue-700">
              {(totalStreams / 1000).toFixed(0)}k
            </div>
            <div className="text-xs text-white/70">Total Streams</div>
          </div>

          {/* Costs */}
          <div className="p-3 bg-brand-purple-light/10 rounded-lg">
            <div className="text-lg font-bold text-brand-purple-light">
              ${(totalProductionCost / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-white/70">Recording Costs</div>
          </div>
          <div className="p-3 bg-brand-burgundy/10 rounded-lg">
            <div className="text-lg font-bold text-brand-burgundy">
              ${(totalMarketingCost / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-white/70">Marketing Costs</div>
          </div>

          {/* ROI - spans full width */}
          <div className={`col-span-2 p-3 ${overallROI >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'} rounded-lg`}>
            <div className={`text-xl font-bold ${overallROI >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {overallROI > 0 ? '+' : ''}{overallROI.toFixed(0)}%
            </div>
            <div className="text-xs text-white/70">Return on Investment</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const PerformanceMetrics = React.memo(PerformanceMetricsComponent);
