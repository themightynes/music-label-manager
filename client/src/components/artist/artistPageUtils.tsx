import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, PlayCircle, Disc, Music } from 'lucide-react';

// Pure presentational helpers shared across Artist page tabs.

export const getQualityColor = (quality: number) => {
  if (quality >= 90) return 'bg-green-500/20 text-green-800';
  if (quality >= 80) return 'bg-blue-500/20 text-blue-800';
  if (quality >= 70) return 'bg-yellow-500/20 text-yellow-800';
  return 'bg-red-500/20 text-red-800';
};

export const getReleaseTypeBadge = (type: string) => {
  const typeConfig = {
    single: { label: 'Single', color: 'bg-blue-500/20 text-blue-800' },
    ep: { label: 'EP', color: 'bg-brand-burgundy-dark/20 text-brand-burgundy-dark' },
    album: { label: 'Album', color: 'bg-green-500/20 text-green-800' }
  };

  const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.single;
  return <Badge className={config.color}>{config.label}</Badge>;
};

export const getStatusBadge = (status: string) => {
  const statusConfig = {
    planned: { label: 'Planned', color: 'bg-yellow-500/20 text-yellow-800', icon: Clock },
    released: { label: 'Released', color: 'bg-green-500/20 text-green-800', icon: PlayCircle },
    catalog: { label: 'Catalog', color: 'bg-gray-500/20 text-white', icon: Disc }
  };

  const config = statusConfig[status as keyof typeof statusConfig] ||
                 { label: status, color: 'bg-gray-500/20 text-white', icon: Music };
  return (
    <Badge className={`${config.color} flex items-center space-x-1`}>
      <config.icon className="w-3 h-3" />
      <span>{config.label}</span>
    </Badge>
  );
};
