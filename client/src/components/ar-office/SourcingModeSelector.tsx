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
      <Card className={`w-full transition-colors ${active ? 'border-[#A75A5B]' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
            {consumesSlot && (
              <Badge variant="outline" className="ml-2">1 Focus Slot</Badge>
            )}
          </CardTitle>
          <Button size="sm" variant={active ? 'secondary' : 'outline'} disabled={isDisabled} onClick={() => onModeSelect(mode)} title={isDisabled && isOperationActive ? 'Complete current operation or advance week to select a new mode' : undefined}>
            {active ? 'Selected' : 'Select'}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-white/70">{description}</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/70">Choose your sourcing approach</div>
        <div className="text-xs text-white/50">Available focus slots: <span className="font-medium text-white">{availableSlots}</span></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <CardOption
          mode="active"
          title="Active Scouting"
          description="Dedicate focus to actively scout the scene. Unlocks higher-quality discoveries and detailed insights."
          icon={<Rocket className="w-4 h-4 text-[#A75A5B]" />}
          consumesSlot={true}
        />
        <CardOption
          mode="passive"
          title="Passive Browsing"
          description="Browse the standard discovery pool. Consumes 1 Focus Slot and completes after week advance."
          icon={<Compass className="w-4 h-4 text-[#A75A5B]" />}
          consumesSlot={true}
        />
        <CardOption
          mode="specialized"
          title="Specialized Search"
          description="Target specific genres to find artists that match your label's focus. Uses genre filtering with fallback options."
          icon={<Target className="w-4 h-4 text-[#A75A5B]" />}
          consumesSlot={true}
        />
      </div>
      {isOperationActive && (
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Zap className="w-3.5 h-3.5" />
          Sourcing operation in progress
        </div>
      )}
    </div>
  );
}
