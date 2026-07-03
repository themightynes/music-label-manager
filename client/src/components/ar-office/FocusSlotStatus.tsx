import React, { useState } from 'react';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ConfirmDialog';

interface FocusSlotStatusProps {
  focusSlotsUsed: number;
  focusSlotsTotal: number;
  onCancelOperation?: () => void;
}

export function FocusSlotStatus({
  focusSlotsUsed,
  focusSlotsTotal,
  onCancelOperation,
}: FocusSlotStatusProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const value = focusSlotsTotal > 0 ? (focusSlotsUsed / focusSlotsTotal) * 100 : 0;
  const remaining = Math.max(0, focusSlotsTotal - focusSlotsUsed);

  let statusColor = 'text-positive';
  if (remaining === 0) {
    statusColor = 'text-negative';
  } else if (remaining <= 1) {
    statusColor = 'text-warning';
  }

  return (
    <div className="flex items-center gap-3 min-w-[260px]" title={onCancelOperation ? 'A&R sourcing active - advance week to complete' : 'Select a sourcing mode to begin'}>
      <div className="w-40">
        <Progress value={value} />
      </div>
      <div className="text-xs text-text-body">
        <div className={`font-mono font-medium ${statusColor}`}>{focusSlotsUsed}/{focusSlotsTotal} Focus Slots Used</div>
      </div>
      {onCancelOperation && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="border-white/9 bg-white/[0.02] text-text-body hover:bg-white/[0.045] hover:text-text-primary"
            onClick={() => setShowCancelConfirm(true)}
          >
            Cancel
          </Button>
          <ConfirmDialog
            isOpen={showCancelConfirm}
            onClose={() => setShowCancelConfirm(false)}
            onConfirm={() => {
              setShowCancelConfirm(false);
              onCancelOperation();
            }}
            title="Cancel A&R Operation?"
            description="You will lose this week's progress."
            confirmText="Cancel Operation"
            cancelText="Keep Sourcing"
            variant="destructive"
          />
        </>
      )}
    </div>
  );
}
