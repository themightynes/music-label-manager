import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Clock, Users, Zap } from 'lucide-react';

interface FocusSlotAttributionProps {
  focusSlotsTotal: number;
  focusSlotsUsed: number;
  selectedActionsCount: number;
  arOfficeStatus: {
    arOfficeSlotUsed: boolean;
    arOfficeSourcingType: string | null;
    arOfficeOperationStart: number | null;
  };
  selectedActions?: string[];
}

export function FocusSlotAttribution({
  focusSlotsTotal,
  focusSlotsUsed,
  selectedActionsCount,
  arOfficeStatus,
  selectedActions = []
}: FocusSlotAttributionProps) {
  const arUsed = arOfficeStatus.arOfficeSlotUsed ? 1 : 0;
  const execUsed = Math.max(0, focusSlotsUsed - arUsed);
  const available = Math.max(0, focusSlotsTotal - focusSlotsUsed);
  const progressValue = useMemo(() => focusSlotsTotal > 0 ? (focusSlotsUsed / focusSlotsTotal) * 100 : 0, [focusSlotsUsed, focusSlotsTotal]);

  return (
    <Card className="w-full glass-panel chromatic-hairline border-0">
      <CardHeader>
        <CardTitle className="text-base font-mono uppercase tracking-wide text-text-label">Focus Slot Attribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Progress value={progressValue} className="h-1.5 rounded-pill bg-white/[0.08]" />
          </div>
          <div className="text-xs font-mono text-text-body">{focusSlotsUsed}/{focusSlotsTotal} used</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-surface-inner/50 rounded-card">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-text-body" />
              <span className="text-text-body">Executive Meetings</span>
              <Badge variant="outline" className="ml-auto font-mono rounded-pill bg-neon-lilac/10 text-neon-lilac border-neon-lilac/40">{execUsed}</Badge>
            </div>
            {selectedActions.length > 0 && (
              <div className="mt-2 text-text-muted line-clamp-2">{selectedActions.slice(0, 3).join(', ')}{selectedActions.length > 3 ? '…' : ''}</div>
            )}
          </div>

          <div className="p-2 bg-surface-inner/50 rounded-card">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-text-body" />
              <span className="text-text-body">A&R Office</span>
              <Badge variant="outline" className="ml-auto font-mono rounded-pill bg-neon-lilac/10 text-neon-lilac border-neon-lilac/40">{arUsed}</Badge>
            </div>
            {arOfficeStatus.arOfficeSlotUsed && (
              <div className="mt-2 text-text-muted flex items-center gap-2">
                <span>{arOfficeStatus.arOfficeSourcingType || 'active'}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {arOfficeStatus.arOfficeOperationStart ? new Date(arOfficeStatus.arOfficeOperationStart).toLocaleTimeString() : '—'}
                </span>
              </div>
            )}
          </div>

          <div className="p-2 bg-surface-inner/50 rounded-card">
            <div className="flex items-center gap-2">
              <span className="text-text-body">Available</span>
              <Badge variant="outline" className="ml-auto font-mono rounded-pill bg-positive/10 text-positive border-positive/40">{available}</Badge>
            </div>
            <div className="mt-2 text-text-muted">Allocate remaining slots to meetings</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
