import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Target, Compass, Rocket, Zap } from 'lucide-react';
import type { SourcingType } from '../../machines/arOfficeMachine';

interface SourcingModeSelectorProps {
  selectedMode: SourcingType | null;
  availableSlots: number;
  isOperationActive: boolean;
  onModeSelect: (mode: SourcingType) => void;
  disabled?: boolean;
}

export function SourcingModeSelector({ selectedMode, availableSlots, isOperationActive, onModeSelect, disabled }: SourcingModeSelectorProps) {
  const canConsume = availableSlots > 0 && !isOperationActive && !disabled;

  const CardOption = ({
    mode,
    title,
    description,
    icon,
    consumesSlot,
  }: { mode: SourcingType; title: string; description: string; icon: React.ReactNode; consumesSlot: boolean }) => {
    const active = selectedMode === mode;
    // Disable all options during an active operation, and enforce slot availability for consuming modes
    const isDisabled = isOperationActive || !!disabled || (consumesSlot ? !canConsume : false);

    return (
      <Card
        className={`w-full border-0 rounded-card transition-all ${
          active
            ? 'bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_0_16px_rgba(160,90,240,0.35)] ring-1 ring-neon-purple/50'
            : 'bg-surface-inner/60 ring-1 ring-white/6 hover:ring-white/12'
        }`}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-text-primary">
            {icon}
            {title}
            {consumesSlot && (
              <Badge
                variant="outline"
                className="ml-2 rounded-pill font-mono text-[10px] uppercase tracking-[0.1em] border-white/12 bg-white/5 text-text-label"
              >
                1 Focus Slot
              </Badge>
            )}
          </CardTitle>
          <Button
            size="sm"
            disabled={isDisabled}
            onClick={() => onModeSelect(mode)}
            title={isDisabled && isOperationActive ? 'Complete current operation or advance week to select a new mode' : undefined}
            className={
              active
                ? 'bg-gradient-to-br from-action-pink to-action-purple text-white shadow-action border-0 hover:opacity-90'
                : 'bg-white/[0.02] border border-white/9 text-text-body hover:bg-white/[0.045] hover:text-text-primary'
            }
          >
            {active ? 'Selected' : 'Select'}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-body">{description}</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-text-body">Choose your sourcing approach</div>
        <div className="text-xs text-text-muted">Available focus slots: <span className="font-mono font-medium text-text-primary">{availableSlots}</span></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <CardOption
          mode="active"
          title="Active Scouting"
          description="Dedicate focus to actively scout the scene. Unlocks higher-quality discoveries and detailed insights."
          icon={<Rocket className="w-4 h-4 text-neon-lilac" />}
          consumesSlot={true}
        />
        <CardOption
          mode="passive"
          title="Passive Browsing"
          description="Browse the standard discovery pool. Consumes 1 Focus Slot and completes after week advance."
          icon={<Compass className="w-4 h-4 text-neon-cyan" />}
          consumesSlot={true}
        />
        <CardOption
          mode="specialized"
          title="Specialized Search"
          description="Target specific genres to find artists that match your label's focus. Uses genre filtering with fallback options."
          icon={<Target className="w-4 h-4 text-neon-purple" />}
          consumesSlot={true}
        />
      </div>
      {isOperationActive && (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Zap className="w-3.5 h-3.5" />
          Sourcing operation in progress
        </div>
      )}
    </div>
  );
}
