import React, { useState, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { executiveMeetingMachine } from '../../machines/executiveMeetingMachine';
import { ExecutiveCard } from './ExecutiveCard';
import { MeetingSelector } from './MeetingSelector';
import { DialogueInterface } from './DialogueInterface';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { fetchExecutives, fetchAllRoles } from '../../services/executiveService';
import { useGameStore } from '../../store/gameStore';
import type { Executive } from '../../../../shared/types/gameTypes';

interface ExecutiveMeetingsProps {
  gameId: string;
  onActionSelected: (action: string) => void;
  focusSlots: {
    total: number;
    used: number;
  };
}

export function ExecutiveMeetings({
  gameId,
  onActionSelected,
  focusSlots,
}: ExecutiveMeetingsProps) {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [executivesLoading, setExecutivesLoading] = useState(true);
  const [executivesError, setExecutivesError] = useState<string | null>(null);
  const [roleSalaries, setRoleSalaries] = useState<Record<string, number>>({});

  // Watch for month changes to refresh executive data
  const { gameState } = useGameStore();

  const [state, send] = useMachine(executiveMeetingMachine, {
    input: {
      gameId,
      focusSlotsTotal: focusSlots.total,
      onActionSelected,
    },
  });

  const { context } = state;
  const hasAvailableSlots = context.focusSlotsUsed < context.focusSlotsTotal;

  // Refetch executives when game loads or month changes
  useEffect(() => {
    async function loadExecutivesAndRoles() {
      try {
        setExecutivesLoading(true);
        setExecutivesError(null);

        // Load executives and roles data in parallel
        const [fetchedExecutives, rolesData] = await Promise.all([
          fetchExecutives(gameId),
          fetchAllRoles().catch(() => [])
        ]);

        setExecutives(fetchedExecutives);

        // Extract salary data from roles
        const salaryMap: Record<string, number> = {};
        rolesData.forEach((role: any) => {
          if (role.baseSalary !== undefined) {
            salaryMap[role.id] = role.baseSalary;
          }
        });
        setRoleSalaries(salaryMap);
      } catch (error) {
        console.error('Failed to load executives:', error);
        setExecutivesError(error instanceof Error ? error.message : 'Failed to load executives');
        setExecutives([]);
      } finally {
        setExecutivesLoading(false);
      }
    }

    if (gameId) {
      loadExecutivesAndRoles();
    }
  }, [gameId, gameState?.currentMonth]); // Added currentMonth dependency

  // Sync focus slots with the machine
  useEffect(() => {
    send({
      type: 'SYNC_SLOTS',
      used: focusSlots.used,
      total: focusSlots.total
    });
  }, [focusSlots.used, focusSlots.total, send]);

  // Track when we complete a meeting to trigger executives refetch
  const [lastCompletedMeeting, setLastCompletedMeeting] = useState<string | null>(null);

  // Monitor state transitions to detect meeting completion
  useEffect(() => {
    if (state.matches('complete')) {
      // Store a marker that a meeting was completed
      const meetingKey = `${context.selectedExecutive?.id}-${context.selectedMeeting?.id}`;
      setLastCompletedMeeting(meetingKey);
    }
  }, [state.value, context.selectedExecutive, context.selectedMeeting]);

  // Refetch executives when returning to idle after a completed meeting
  useEffect(() => {
    if (state.matches('idle') && lastCompletedMeeting) {
      // A meeting just completed, refetch executive data to get updated mood/loyalty
      async function refetchExecutives() {
        try {
          setExecutivesLoading(true);
          const fetchedExecutives = await fetchExecutives(gameId);
          setExecutives(fetchedExecutives);
          setLastCompletedMeeting(null); // Clear the completion marker
        } catch (error) {
          console.error('Failed to refetch executives after meeting:', error);
        } finally {
          setExecutivesLoading(false);
        }
      }
      refetchExecutives();
    }
  }, [state.value, lastCompletedMeeting, gameId]);

  if (state.matches('idle')) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Executive Meetings
            <span className="text-sm font-normal text-muted-foreground">
              {context.focusSlotsUsed}/{context.focusSlotsTotal} slots used
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {executivesLoading ? (
            <div className="text-center p-8">
              <Loader2 className="w-6 w-6 animate-spin mx-auto mb-2 text-white" />
              <p className="text-white/70">Loading executives...</p>
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
              <p className="text-sm text-white/50">Complete your current actions or advance the month to continue.</p>
            </div>
          ) : executives.length === 0 ? (
            <div className="text-center p-8 text-white/70">
              <p>No executives available</p>
              <p className="text-sm text-white/50">Hire executives to unlock meeting opportunities.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {executives.map((executive) => (
                <ExecutiveCard
                  key={executive.role}
                  executive={executive}
                  disabled={!hasAvailableSlots}
                  onSelect={() => send({ type: 'SELECT_EXECUTIVE', executive })}
                  monthlySalary={roleSalaries[executive.role]}
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
      <Card className="w-full">
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
      <Card className="w-full">
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
      <Card className="w-full">
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
      <Card className="w-full">
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
      <Card className="w-full">
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
      <Card className="w-full">
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