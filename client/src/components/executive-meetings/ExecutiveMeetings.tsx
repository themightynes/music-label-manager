import React, { useState, useEffect, useRef } from 'react';
import { useMachine } from '@xstate/react';
import { executiveMeetingMachine } from '../../machines/executiveMeetingMachine';
import { ExecutiveCard } from './ExecutiveCard';
import { MeetingSelector } from './MeetingSelector';
import { DialogueInterface } from './DialogueInterface';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ArrowLeft, Loader2, Zap } from 'lucide-react';
import { fetchExecutives, fetchRoleMeetings, fetchMeetingDialogue, fetchAllRoles } from '../../services/executiveService';
import { useGameStore } from '../../store/gameStore';

interface ExecutiveMeetingsProps {
  gameId: string;
  currentWeek: number;
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
  currentWeek,
  onActionSelected,
  focusSlots,
  arOfficeStatus: arOfficeStatusProp,
  onImpactPreviewUpdate,
}: ExecutiveMeetingsProps) {
  const [roleSalaries, setRoleSalaries] = useState<Record<string, number>>({});

  const { getAROfficeStatus, selectedActions, artists } = useGameStore();

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
  const previousWeekRef = useRef<number | null>(null);
  const hasAvailableSlots = context.focusSlotsUsed < context.focusSlotsTotal;
  const arOfficeStatus = arOfficeStatusProp ?? getAROfficeStatus();
  const executives = context.executives;
  const executivesLoading = state.matches('loadingExecutives') || state.matches('refreshingExecutives');
  const executivesError = context.error;

  // Track which executives have already been used this week
  const usedExecutiveRoles = new Set<string>();
  selectedActions.forEach(actionString => {
    try {
      const action = JSON.parse(actionString);
      if (action.roleId) {
        usedExecutiveRoles.add(action.roleId);
      }
    } catch (e) {
      // Ignore invalid action strings
    }
  });

  // Helper to check if an executive has been used
  const isExecutiveUsed = (role: string) => usedExecutiveRoles.has(role);

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
  const isPreviewBlocked =
    state.matches('loadingExecutives') ||
    state.matches('refreshingExecutives') ||
    state.matches('fetchingImpactPreview');

  const lastPreviewActionsRef = useRef<string>('[]');

  useEffect(() => {
    if (isPreviewBlocked) return;
    const serialized = JSON.stringify(selectedActions);
    if (lastPreviewActionsRef.current === serialized) return;
    lastPreviewActionsRef.current = serialized;
    send({
      type: 'CALCULATE_IMPACT_PREVIEW',
      selectedActions
    });
  }, [isPreviewBlocked, selectedActions, send]);

  useEffect(() => {
    const previousWeek = previousWeekRef.current;
    if (previousWeek !== null && currentWeek > previousWeek) {
      if (
        !state.matches('loadingExecutives') &&
        !state.matches('refreshingExecutives') &&
        !state.matches('processingChoice') &&
        !state.matches('loadingMeetings') &&
        !state.matches('loadingDialogue')
      ) {
        send({ type: 'REFRESH_EXECUTIVES' });
      }
    }
    previousWeekRef.current = currentWeek;
  }, [currentWeek, send, state]);

  // Send impact preview to parent when it updates
  useEffect(() => {
    if (onImpactPreviewUpdate && context.impactPreview) {
      onImpactPreviewUpdate(context.impactPreview);
    }
  }, [context.impactPreview, onImpactPreviewUpdate]);

  // Render middle column content based on state
  const renderMiddleColumn = () => {
    if (state.matches('loadingMeetings')) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-white mb-2" />
          <span className="text-white/70">Loading meetings...</span>
        </div>
      );
    }

    if (state.matches('selectingMeeting')) {
      const roleConfig = {
        ceo: { shortTitle: 'CEO', name: 'You' },
        head_ar: { shortTitle: 'A&R', name: 'Marcus Rodriguez' },
        cco: { shortTitle: 'CCO', name: 'Dante Washington' },
        cmo: { shortTitle: 'CMO', name: 'Samara Chen' },
        head_distribution: { shortTitle: 'Distro', name: 'Patricia Williams' },
      } as const;

      const config = context.selectedExecutive?.role
        ? roleConfig[context.selectedExecutive.role as keyof typeof roleConfig]
        : null;

      return (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => send({ type: 'BACK_TO_EXECUTIVES' })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {config && (
              <Badge
                variant="secondary"
                className="text-xs px-3 py-1 bg-brand-mauve/60 text-white border-brand-purple-light"
              >
                {config.shortTitle} - {config.name}
              </Badge>
            )}
          </div>
          <MeetingSelector
            meetings={context.availableMeetings}
            signedArtists={artists.filter(a => a.signed) as any}
            onSelectMeeting={(meeting, selectedArtistId) => send({ type: 'SELECT_MEETING', meeting, selectedArtistId })}
            onBack={() => send({ type: 'BACK_TO_EXECUTIVES' })}
          />
        </div>
      );
    }

    if (state.matches('loadingDialogue')) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-white mb-2" />
          <span className="text-white/70">Loading dialogue...</span>
        </div>
      );
    }

    if (state.matches('inDialogue')) {
      const roleConfig = {
        ceo: { shortTitle: 'CEO', name: 'You' },
        head_ar: { shortTitle: 'A&R', name: 'Marcus Rodriguez' },
        cco: { shortTitle: 'CCO', name: 'Dante Washington' },
        cmo: { shortTitle: 'CMO', name: 'Samara Chen' },
        head_distribution: { shortTitle: 'Distro', name: 'Patricia Williams' },
      } as const;

      const config = context.selectedExecutive?.role
        ? roleConfig[context.selectedExecutive.role as keyof typeof roleConfig]
        : null;

      return (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => send({ type: 'BACK_TO_MEETINGS' })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {config && (
              <Badge
                variant="secondary"
                className="text-xs px-3 py-1 bg-brand-mauve/60 text-white border-brand-purple-light"
              >
                {config.shortTitle} - {config.name}
              </Badge>
            )}
          </div>
          {context.currentDialogue && (
            <DialogueInterface
              dialogue={context.currentDialogue}
              onSelectChoice={(choice) => send({ type: 'SELECT_CHOICE', choice })}
              onBack={() => send({ type: 'BACK_TO_MEETINGS' })}
              targetScope={context.selectedMeeting?.target_scope}
              selectedArtistName={
                context.selectedArtistId
                  ? artists.find(a => a.id === context.selectedArtistId)?.name
                  : undefined
              }
            />
          )}
        </div>
      );
    }

    if (state.matches('processingChoice')) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-white mb-2" />
          <span className="text-white/70">Processing your choice...</span>
        </div>
      );
    }

    if (state.matches('complete')) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="text-green-300 font-medium">Meeting completed!</div>
          <p className="text-sm text-white/50 mt-1">Returning to executives...</p>
        </div>
      );
    }

    // Default idle state - show loading if executives haven't loaded yet
    if (executivesLoading && executives.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-white mb-2" />
          <span className="text-white/70">Loading executives...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center text-white/50">
        Select an executive
      </div>
    );
  };

  return (
    <Card className="w-full bg-transparent border-none">
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
      <CardContent className="px-0">
        {executivesError ? (
          <div className="text-center p-8">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md mb-4">
              <p className="text-sm text-red-300">Failed to load executives: {executivesError}</p>
              <p className="text-xs text-white/50 mt-1">Please refresh to try again</p>
            </div>
          </div>
        ) : (
          (() => {
            const nonCeoExecutives = executives.filter(exec => exec.role !== 'ceo');
            const ceoExecutive = executives.find(exec => exec.role === 'ceo');

            return (
              <div className="grid grid-cols-[auto_1fr_auto] gap-12 w-full px-6">
              {/* Left Column - First 2 Executives */}
              <div className="space-y-6">
                {nonCeoExecutives.slice(0, 2).map((executive) => (
                  <ExecutiveCard
                    key={executive.role}
                    executive={executive}
                    disabled={!hasAvailableSlots || isExecutiveUsed(executive.role)}
                    onSelect={() => send({ type: 'SELECT_EXECUTIVE', executive })}
                    weeklySalary={roleSalaries[executive.role]}
                    arOfficeStatus={arOfficeStatus}
                    flipAvatar={true}
                    alignContent="left"
                  />
                ))}
              </div>

              {/* Middle Column - Dynamic content based on state */}
              <div className="flex items-start justify-center px-8">
                {renderMiddleColumn()}
              </div>

              {/* Right Column - Next 2 Executives */}
              <div className="space-y-6">
                {nonCeoExecutives.slice(2, 4).map((executive) => (
                  <ExecutiveCard
                    key={executive.role}
                    executive={executive}
                    disabled={!hasAvailableSlots || isExecutiveUsed(executive.role)}
                    onSelect={() => send({ type: 'SELECT_EXECUTIVE', executive })}
                    weeklySalary={roleSalaries[executive.role]}
                    arOfficeStatus={arOfficeStatus}
                    badgesOnLeft={true}
                    alignContent="right"
                  />
                ))}
              </div>

              {/* Bottom Row - CEO Badge Only */}
              <div className="col-span-3 flex items-center justify-center mt-8">
                {ceoExecutive && (
                  <ExecutiveCard
                    key="ceo"
                    executive={ceoExecutive}
                    disabled={!hasAvailableSlots || isExecutiveUsed(ceoExecutive.role)}
                    onSelect={() => send({ type: 'SELECT_EXECUTIVE', executive: ceoExecutive })}
                    weeklySalary={roleSalaries['ceo']}
                    arOfficeStatus={arOfficeStatus}
                  />
                )}
              </div>
            </div>
          );
        })())
        }

        {context.error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-red-300">{context.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}