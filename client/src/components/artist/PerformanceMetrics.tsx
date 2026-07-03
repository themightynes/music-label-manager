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
      {/* Main metrics grid — hue-tinted stat tiles (design-system-v2 §6, artist-detail.html Performance panel) */}
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="p-3.5 rounded-chip bg-white/[0.02] border border-white/[0.05]">
          <div className="font-mono text-lg font-semibold text-text-primary">{avgQuality}</div>
          <div className="text-xs text-text-muted mt-1">Avg Quality</div>
        </div>
        <div className="p-3.5 rounded-chip bg-neon-purple/[0.08] border border-neon-purple/25">
          <div className="font-mono text-lg font-semibold text-neon-lilac">{projectCount}</div>
          <div className="text-xs text-text-muted mt-1">Projects</div>
        </div>
        <div className="p-3.5 rounded-chip bg-white/[0.02] border border-white/[0.05]">
          <div className="font-mono text-lg font-semibold text-text-primary">{readySongs}</div>
          <div className="text-xs text-text-muted mt-1">Ready Songs</div>
        </div>
        <div className="p-3.5 rounded-chip bg-negative/[0.08] border border-negative/25">
          <div className="font-mono text-lg font-semibold text-negative">{popularity}</div>
          <div className="text-xs text-text-muted mt-1">Popularity</div>
        </div>
      </div>

      {/* Financial metrics - separate section */}
      <div className="pt-3 border-t border-white/[0.07]">
        <div className="grid grid-cols-2 gap-3">
          {/* Revenue and Streams */}
          <div className="p-3.5 rounded-chip bg-positive/[0.08] border border-positive/[0.22]">
            <div className="font-mono text-base font-semibold text-positive">
              ${(totalRevenue / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-text-muted mt-1">Total Revenue</div>
          </div>
          <div className="p-3.5 rounded-chip bg-neon-cyan/[0.08] border border-neon-cyan/[0.22]">
            <div className="font-mono text-base font-semibold text-neon-cyan">
              {(totalStreams / 1000).toFixed(0)}k
            </div>
            <div className="text-xs text-text-muted mt-1">Total Streams</div>
          </div>

          {/* Costs */}
          <div className="p-3.5 rounded-chip bg-white/[0.02] border border-white/[0.05]">
            <div className="font-mono text-base font-semibold text-text-body">
              ${(totalProductionCost / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-text-muted mt-1">Recording Costs</div>
          </div>
          <div className="p-3.5 rounded-chip bg-white/[0.02] border border-white/[0.05]">
            <div className="font-mono text-base font-semibold text-text-body">
              ${(totalMarketingCost / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-text-muted mt-1">Marketing Costs</div>
          </div>

          {/* ROI - spans full width */}
          <div className={`col-span-2 p-3.5 rounded-chip flex items-center justify-between ${overallROI >= 0 ? 'bg-positive/[0.08] border border-positive/[0.22]' : 'bg-negative/[0.08] border border-negative/[0.22]'}`}>
            <span className="text-xs text-text-muted">Return on Investment</span>
            <div className={`font-mono text-xl font-semibold ${overallROI >= 0 ? 'text-positive' : 'text-negative'}`}>
              {overallROI > 0 ? '+' : ''}{overallROI.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const PerformanceMetrics = React.memo(PerformanceMetricsComponent);
