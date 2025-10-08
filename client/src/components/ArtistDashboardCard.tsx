import React from 'react';
import { Badge } from '@/components/ui/badge';

type ArtistDashboardCardProps = {
  artist: {
    id: string;
    name: string;
    archetype?: string | null;
  };
  status: string;
  mood: number;
  energy: number;
  popularity: number;
  onNavigate?: () => void;
};

const getMetricBadgeStyles = (value: number) => {
  if (value >= 70) {
    return 'border-green-400/40 bg-green-500/15 text-green-300';
  }
  if (value >= 40) {
    return 'border-yellow-400/40 bg-yellow-500/15 text-yellow-200';
  }
  return 'border-red-500/40 bg-red-500/15 text-red-300';
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'ON TOUR':
      return {
        label: 'On Tour',
        className: 'border border-brand-burgundy/50 bg-brand-burgundy/40 text-white',
      };
    case 'RECORDING':
      return {
        label: 'Recording',
        className: 'border border-brand-purple-light/60 bg-brand-purple-light/40 text-white',
      };
    case 'PLANNING':
      return {
        label: 'Planning',
        className: 'border border-brand-purple/60 bg-brand-purple/25 text-white/80',
      };
    default:
      return {
        label: 'Idle',
        className: 'border border-brand-purple/40 bg-brand-dark-card/70 text-white/70',
      };
  }
};

export function ArtistDashboardCard({
  artist,
  status,
  mood,
  energy,
  popularity,
  onNavigate,
}: ArtistDashboardCardProps) {
  const statusMeta = getStatusLabel(status);

  return (
    <div className="w-48 rounded-lg border border-brand-purple-light/70 bg-brand-dark-card/50 p-3">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onNavigate}
          className="text-left text-sm font-semibold text-white hover:text-brand-purple-light"
        >
          {artist.name}
        </button>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/60">{artist.archetype ?? 'Unknown Archetype'}</span>
          <Badge variant="secondary" className={`px-2 py-1 text-[10px] font-semibold ${statusMeta.className}`}>
            {statusMeta.label}
          </Badge>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <Badge
          variant="secondary"
          className={`flex items-center justify-between gap-2 px-3 py-1 text-[11px] font-medium ${getMetricBadgeStyles(mood)}`}
        >
          <span className="text-white/60">Mood</span>
          <span className="font-semibold">{Math.round(mood)}%</span>
        </Badge>
        <Badge
          variant="secondary"
          className={`flex items-center justify-between gap-2 px-3 py-1 text-[11px] font-medium ${getMetricBadgeStyles(energy)}`}
        >
          <span className="text-white/60">Energy</span>
          <span className="font-semibold">{Math.round(energy)}%</span>
        </Badge>
        <Badge
          variant="secondary"
          className={`flex items-center justify-between gap-2 px-3 py-1 text-[11px] font-medium ${getMetricBadgeStyles(popularity)}`}
        >
          <span className="text-white/60">Popularity</span>
          <span className="font-semibold">{Math.round(popularity)}%</span>
        </Badge>
      </div>
    </div>
  );
}
