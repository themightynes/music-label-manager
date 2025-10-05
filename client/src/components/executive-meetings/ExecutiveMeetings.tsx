import React, { useState, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { executiveMeetingMachine } from '../../machines/executiveMeetingMachine';
import { ExecutiveCard } from './ExecutiveCard';
import { MeetingSelector } from './MeetingSelector';
import { DialogueInterface } from './DialogueInterface';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowLeft, Loader2, Zap } from 'lucide-react';
import { fetchExecutives, fetchRoleMeetings, fetchMeetingDialogue, fetchAllRoles } from '../../services/executiveService';
import { useGameStore } from '../../store/gameStore';

interface ExecutiveMeetingsProps {
  gameId: string;
  onActionSelected: (action: string) => void;
  focusSlots: {
    total: number;
    used: number;
  };
  arOfficeStatus?: {
    arOfficeSlotUsed: boolean;
    arOfficeSourcingType: string | null;
    arOfficeOperationStart: number | null;
  };
  onImpactPreviewUpdate?: (preview: {
    immediate: Record<string, number>;
    delayed: Record<string, number>;
    selectedChoices: Array<{
      executiveName: string;
      meetingName: string;
      choiceLabel: string;
      effects_immediate: Record<string, number>;
      effects_delayed: Record<string, number>;
    }>;
  }) => void;
}

export function ExecutiveMeetings({
  gameId,
  onActionSelected,
  focusSlots,
  arOfficeStatus: arOfficeStatusProp,
  onImpactPreviewUpdate,
}: ExecutiveMeetingsProps) {
  const [roleSalaries, setRoleSalaries] = useState<Record<string, number>>({});

  const { getAROfficeStatus, selectedActions } = useGameStore();

  const [state, send] = useMachine(executiveMeetingMachine, {
    input: {
      gameId,
      focusSlotsTotal: focusSlots.total,
      onActionSelected,
      fetchExecutives,
      fetchRoleMeetings,
      fetchMeetingDialogue,
    },
  });

  const { context } = state;
  const hasAvailableSlots = context.focusSlotsUsed < context.focusSlotsTotal;
  const arOfficeStatus = arOfficeStatusProp ?? getAROfficeStatus();
  const executives = context.executives;
  const executivesLoading = state.matches('loadingExecutives') || state.matches('refreshingExecutives');
  const executivesError = context.error;

  useEffect(() => {
    let mounted = true;
    const loadRoles = async () => {
      try {
        const rolesData = await fetchAllRoles().catch(() => [] as any[]);
        if (!mounted) return;
        const salaryMap: Record<string, number> = {};
        rolesData.forEach((role: any) => {
          if (role?.id && typeof role.baseSalary === 'number') {
            salaryMap[role.id] = role.baseSalary;
          }
        });
        setRoleSalaries(salaryMap);
      } catch (error) {
        console.error('Failed to load role salary data', error);
      }
    };

    loadRoles();
    return () => {
      mounted = false;
    };
  }, []);

  // Sync focus slots with the machine
  useEffect(() => {
    send({
      type: 'SYNC_SLOTS',
      used: focusSlots.used,
      total: focusSlots.total
    });
  }, [focusSlots.used, focusSlots.total, send]);

  // Calculate impact preview when selectedActions change
  useEffect(() => {
    send({
      type: 'CALCULATE_IMPACT_PREVIEW',
      selectedActions
    });
  }, [selectedActions, send]);

  // Send impact preview to parent when it updates
  useEffect(() => {
    if (onImpactPreviewUpdate && context.impactPreview) {
      onImpactPreviewUpdate(context.impactPreview);
    }
  }, [context.impactPreview, onImpactPreviewUpdate]);

  if (state.matches('idle')) {
    return (
      <Card className="w-full bg-[#3c252d]/50 backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Executive Meetings
            <div className="flex items-center gap-3">
              {hasAvailableSlots && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => send({ type: 'AUTO_SELECT' })}
                  disabled={!hasAvailableSlots || executives.length === 0}
                  className="flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  AUTO
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(executivesLoading || state.matches('autoSelecting')) ? (
            <div className="text-center p-8">
              <Loader2 className="w-6 w-6 animate-spin mx-auto mb-2 text-white" />
              <p className="text-white/70">
                {state.matches('autoSelecting') ? 'Auto-selecting focus slots...' : 'Loading executives...'}
              </p>
            </div>
          ) : executivesError ? (
            <div className="text-center p-8">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md mb-4">
                <p className="text-sm text-red-300">Failed to load executives: {executivesError}</p>
                <p className="text-xs text-white/50 mt-1">Please refresh to try again</p>
              </div>
            </div>
          ) : !hasAvailableSlots ? (
            <div className="text-center p-8 text-white/70">
              <p>No focus slots available</p>
              <p className="text-sm text-white/50">
                {arOfficeStatus.arOfficeSlotUsed ? 'A&R Office is consuming a focus slot this week.' : 'Complete your current actions or advance the week to continue.'}
              </p>
            </div>
          ) : executives.length === 0 ? (
            <div className="text-center p-8 text-white/70">
              <p>No executives available</p>
              <p className="text-sm text-white/50">Hire executives to unlock meeting opportunities.</p>
            </div>
          ) : (
            <div className="space-y-4">
                {executives.map((executive) => (
                  <ExecutiveCard
                    key={executive.role}
                    executive={executive}
                    disabled={!hasAvailableSlots}
                    onSelect={() => send({ type: 'SELECT_EXECUTIVE', executive })}
                    weeklySalary={roleSalaries[executive.role]}
                    arOfficeStatus={arOfficeStatus}
                  />
                ))}
            </div>
          )}

          {context.error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-red-300">{context.error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (state.matches('loadingMeetings')) {
    return (
      <Card className="w-full bg-[#3c252d]/50 backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => send({ type: 'RESET' })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            Loading Meetings...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
            <span className="ml-2 text-white/70">Loading available meetings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.matches('selectingMeeting')) {
    return (
      <Card className="w-full bg-[#3c252d]/50 backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => send({ type: 'BACK_TO_EXECUTIVES' })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {context.selectedExecutive?.role} Meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MeetingSelector
            meetings={context.availableMeetings}
            onSelectMeeting={(meeting) => send({ type: 'SELECT_MEETING', meeting })}
            onBack={() => send({ type: 'BACK_TO_EXECUTIVES' })}
          />
        </CardContent>
      </Card>
    );
  }

  if (state.matches('loadingDialogue')) {
    return (
      <Card className="w-full bg-[#3c252d]/50 backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => send({ type: 'BACK_TO_MEETINGS' })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            Loading Dialogue...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
            <span className="ml-2 text-white/70">Loading meeting dialogue...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.matches('inDialogue')) {
    return (
      <Card className="w-full bg-[#3c252d]/50 backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => send({ type: 'BACK_TO_MEETINGS' })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {context.selectedExecutive?.role} Meeting
          </CardTitle>
        </CardHeader>
        <CardContent>
          {context.currentDialogue && (
            <DialogueInterface
              dialogue={context.currentDialogue}
              onSelectChoice={(choice) => send({ type: 'SELECT_CHOICE', choice })}
              onBack={() => send({ type: 'BACK_TO_MEETINGS' })}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  if (state.matches('processingChoice')) {
    return (
      <Card className="w-full bg-[#3c252d]/50 backdrop-blur-sm border-white/10">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
            <span className="ml-2 text-white/70">Processing your choice...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.matches('complete')) {
    return (
      <Card className="w-full bg-[#3c252d]/50 backdrop-blur-sm border-white/10">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="text-green-300 font-medium">Meeting completed successfully!</div>
            <p className="text-sm text-white/50 mt-1">
              Returning to executive selection...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}