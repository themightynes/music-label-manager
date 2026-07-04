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
  talent: number;
  onNavigate?: () => void;
};

const getMetricColor = (value: number) => {
  if (value >= 70) return 'text-positive';
  if (value >= 40) return 'text-warning';
  return 'text-negative';
};

const getMetricBarColor = (value: number) => {
  if (value >= 70) return 'bg-positive';
  if (value >= 40) return 'bg-warning';
  return 'bg-negative';
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'ON TOUR':
      return {
        label: 'On Tour',
        className: 'border-neon-magenta/40 bg-neon-magenta/[0.14] text-neon-magenta',
      };
    case 'RECORDING':
      return {
        label: 'Recording',
        className: 'border-neon-purple/40 bg-neon-purple/[0.14] text-neon-purple',
      };
    case 'PLANNING':
      return {
        label: 'Planning',
        className: 'border-neon-lilac/40 bg-neon-lilac/[0.14] text-neon-lilac',
      };
    default:
      return {
        label: 'Idle',
        className: 'border-white/10 bg-white/[0.06] text-text-muted',
      };
  }
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toLowerCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toLowerCase();
};

function MetricBar({ label, value }: { label: string; value: number }) {
  const rounded = Math.round(value);
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-[3px]">
        <span className="text-text-muted">{label}</span>
        <span className={`font-mono ${getMetricColor(value)}`}>{rounded}%</span>
      </div>
      <div className="h-[5px] rounded-pill bg-white/[0.08]">
        <div
          className={`h-full rounded-pill ${getMetricBarColor(value)}`}
          style={{ width: `${Math.max(0, Math.min(100, rounded))}%` }}
        />
      </div>
    </div>
  );
}

export function ArtistDashboardCard({
  artist,
  status,
  mood,
  energy,
  popularity,
  talent,
  onNavigate,
}: ArtistDashboardCardProps) {
  const statusMeta = getStatusLabel(status);

  return (
    <div className="w-48 rounded-card border border-white/[0.08] bg-surface-inner/50 p-3 flex gap-3">
      <div
        className="w-12 h-12 rounded-chip flex-shrink-0 flex items-center justify-center font-display text-sm text-text-primary/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] bg-[linear-gradient(150deg,#a05af0,#2f8fff)]"
      >
        {getInitials(artist.name)}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onNavigate}
            className="text-left text-sm font-semibold text-text-primary hover:text-neon-lilac transition-colors truncate"
          >
            {artist.name}
          </button>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-neon-lilac truncate">{artist.archetype ?? 'Unknown Archetype'}</span>
            <Badge variant="secondary" className={`px-2 py-0.5 text-[10px] font-semibold shrink-0 ${statusMeta.className}`}>
              {statusMeta.label}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-[7px]">
          <MetricBar label="Mood" value={mood} />
          <MetricBar label="Energy" value={energy} />
          <MetricBar label="Popularity" value={popularity} />
          <MetricBar label="Talent" value={talent} />
        </div>
      </div>
    </div>
  );
}
