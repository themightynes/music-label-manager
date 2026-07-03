import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, PlayCircle, Disc, Music } from 'lucide-react';

// Pure presentational helpers shared across Artist page tabs.

export const getQualityColor = (quality: number) => {
  if (quality >= 90) return 'border-positive/40 bg-positive/[0.14] text-positive';
  if (quality >= 80) return 'border-neon-cyan/40 bg-neon-cyan/[0.14] text-neon-cyan';
  if (quality >= 70) return 'border-warning/40 bg-warning/[0.14] text-warning';
  return 'border-negative/40 bg-negative/[0.14] text-negative';
};

export const getReleaseTypeBadge = (type: string) => {
  const typeConfig = {
    single: { label: 'Single', color: 'border-neon-cyan/40 bg-neon-cyan/[0.14] text-neon-cyan' },
    ep: { label: 'EP', color: 'border-neon-lilac/40 bg-neon-lilac/[0.14] text-neon-lilac' },
    album: { label: 'Album', color: 'border-positive/40 bg-positive/[0.14] text-positive' }
  };

  const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.single;
  return <Badge className={config.color}>{config.label}</Badge>;
};

export const getStatusBadge = (status: string) => {
  const statusConfig = {
    planned: { label: 'Planned', color: 'border-warning/40 bg-warning/[0.14] text-warning', icon: Clock },
    released: { label: 'Released', color: 'border-positive/40 bg-positive/[0.14] text-positive', icon: PlayCircle },
    catalog: { label: 'Catalog', color: 'border-white/10 bg-white/[0.04] text-text-muted', icon: Disc }
  };

  const config = statusConfig[status as keyof typeof statusConfig] ||
                 { label: status, color: 'border-white/10 bg-white/[0.04] text-text-muted', icon: Music };
  return (
    <Badge className={`${config.color} flex items-center space-x-1`}>
      <config.icon className="w-3 h-3" />
      <span>{config.label}</span>
    </Badge>
  );
};
