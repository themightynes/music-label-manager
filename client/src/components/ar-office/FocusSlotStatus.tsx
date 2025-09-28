import React from 'react';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import type { SourcingType } from '../../machines/arOfficeMachine';

interface FocusSlotStatusProps {
  focusSlotsUsed: number;
  focusSlotsTotal: number;
  machineState: string;
  sourcingType: SourcingType | null;
  operationStartTime: number | null;
  onCancelOperation?: () => void;
}

export function FocusSlotStatus({
  focusSlotsUsed,
  focusSlotsTotal,
  machineState,
  sourcingType,
  operationStartTime,
  onCancelOperation,
}: FocusSlotStatusProps) {
  const value = focusSlotsTotal > 0 ? (focusSlotsUsed / focusSlotsTotal) * 100 : 0;
  const remaining = Math.max(0, focusSlotsTotal - focusSlotsUsed);

  let statusColor = 'text-green-300';
  if (remaining === 0) statusColor = 'text-red-300';
  else if (remaining <= 1) statusColor = 'text-yellow-300';

  const opSince = operationStartTime ? new Date(operationStartTime).toLocaleTimeString() : null;

  return (
    <div className="flex items-center gap-3 min-w-[260px]" title={onCancelOperation ? 'A&R sourcing active - advance week to complete' : 'Select a sourcing mode to begin'}>
      <div className="w-40">
        <Progress value={value} />
      </div>
      <div className="text-xs text-white/80">
        <div className={`font-medium ${statusColor}`}>{focusSlotsUsed}/{focusSlotsTotal} Focus Slots Used</div>
        <div className="text-white/50">State: {machineState}</div>
      </div>
      {sourcingType && (
        <Badge variant="outline" className="text-xs">
          {sourcingType} {opSince ? `• since ${opSince}` : ''}
        </Badge>
      )}
      {onCancelOperation && (
        <Button size="sm" variant="outline" onClick={() => {
          if (window.confirm('Cancel A&R operation? You will lose this week\'s progress.')) {
            onCancelOperation();
          }
        }}>Cancel</Button>
      )}
    </div>
  );
}
