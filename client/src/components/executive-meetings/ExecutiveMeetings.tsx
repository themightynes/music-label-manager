import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMachine } from '@xstate/react';
import { useQueryClient } from '@tanstack/react-query';
import { executiveMeetingMachine } from '../../machines/executiveMeetingMachine';
import { makeCachedFetchExecutives } from '../../hooks/useExecutives';
import { ExecutiveCard } from './ExecutiveCard';
import { MeetingSelector } from './MeetingSelector';
import { DialogueInterface } from './DialogueInterface';
import { AutoSelectReviewPanel } from './AutoSelectReviewPanel';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ArrowLeft, Loader2, Zap } from 'lucide-react';
import { fetchRoleMeetings, fetchMeetingDialogue, fetchAllRoles } from '../../services/executiveService';
import { useGameStore } from '../../store/gameStore';
import { useArtists } from '../../hooks/useArtists';

interface ExecutiveMeetingsProps {
  gameId: string;
  currentWeek: number;
  onActionSelected: (action: string) => void;
  focusSlots: {
    total: number;
    used: number;
  };
  /**
   * Remaining Creative Capital. Passed to the machine as the AUTO_SELECT budget
   * so auto-select can never assemble a set that overdraws CC (playtest bug #11).
   */
  creativeCapital?: number;
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
  creativeCapital,
  arOfficeStatus: arOfficeStatusProp,
  onImpactPreviewUpdate,
}: ExecutiveMeetingsProps) {
  const [roleSalaries, setRoleSalaries] = useState<Record<string, number>>({});
  /**
   * Meeting-relevance Tier 0 (PR-1): roles whose eligible meeting pool is EMPTY
   * this week (server answered meetings: []) — those execs sit out and cannot
   * be selected into a focus slot. Keyed per (gameId, week); the server pick is
   * deterministic per (gameId, week, roleId) so this prefetch always matches
   * what the machine's own fetch would return.
   */
  const [sitOutRoles, setSitOutRoles] = useState<Set<string>>(new Set());
  /**
   * Tier 2 (PR-2, Nes amendment 1 — urgency indicator): roles whose prefetched
   * meeting carries `reactiveContext` this week — a happening fired their
   * reactive meeting. Zero new requests: piggybacks on the SAME sit-out
   * prefetch below. The dot signals "something happened" WITHOUT revealing
   * content (no meeting name/trigger on the card) — the "why now" line is the
   * payoff on open (MeetingSelector / AutoSelectReviewPanel).
   */
  const [reactiveRoles, setReactiveRoles] = useState<Set<string>>(new Set());

  const { getAROfficeStatus, selectedActions } = useGameStore();
  // C74: the global GameHeader AUTO button sets this session intent + navigates
  // here; we consume it once (below) when the machine is idle by sending
  // AUTO_SELECT, routing the header AUTO through the same review gate.
  const pendingAutoSelectIntent = useGameStore((s) => s.pendingAutoSelectIntent);
  const consumePendingAutoSelectIntent = useGameStore(
    (s) => s.consumePendingAutoSelectIntent,
  );
  // Phase 3 PR-9: artists roster read from the TanStack Query cache, not Zustand.
  const { data: artists = [] } = useArtists();

  // Phase 3 PR-8: route the machine's executives fetch through the TanStack
  // Query cache (key ['executives', gameId]) so the meeting flow and any
  // useExecutives() consumers share ONE cached source. The machine keeps its
  // injected-service pattern — it never imports TanStack or the store itself.
  const queryClient = useQueryClient();
  const cachedFetchExecutives = useMemo(
    () => makeCachedFetchExecutives(queryClient),
    [queryClient],
  );

  // A&R office slot status — threaded to the machine so AUTO_SELECT excludes the
  // A&R head (head_ar, Marcus) while he's occupied, matching the manual UI.
  const arOfficeStatusForInput = arOfficeStatusProp ?? getAROfficeStatus();
  const arOfficeSlotUsedInitial = !!arOfficeStatusForInput?.arOfficeSlotUsed;

  // Track which executives have already been used this week (queued actions),
  // computed BEFORE the machine mounts so AUTO's exclusion list is threaded in
  // from the first render (playtest round-1 bug: manual Marcus pick + AUTO for
  // the remaining slots re-proposed Marcus).
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
  // Stable, order-independent key so effects don't re-fire on Set identity.
  const usedExecutiveRolesKey = Array.from(usedExecutiveRoles).sort().join(',');

  const [state, send] = useMachine(executiveMeetingMachine, {
    input: {
      gameId,
      currentWeek,
      focusSlotsTotal: focusSlots.total,
      creativeCapital,
      arOfficeSlotUsed: arOfficeSlotUsedInitial,
      usedExecutiveRoles: Array.from(usedExecutiveRoles),
      onActionSelected,
      fetchExecutives: cachedFetchExecutives,
      fetchRoleMeetings,
      fetchMeetingDialogue,
    },
  });

  const { context } = state;
  const previousWeekRef = useRef<number | null>(null);
  const hasAvailableSlots = context.focusSlotsUsed < context.focusSlotsTotal;
  // PR-3: hide the AUTO button while AUTO is computing or its proposal is under
  // review, so the flow can't be re-triggered on top of itself.
  const isAutoFlowActive = state.matches('autoSelecting') || state.matches('reviewingAutoSelections');
  const arOfficeStatus = arOfficeStatusForInput;
  const arOfficeSlotUsed = arOfficeSlotUsedInitial;
  const executives = context.executives;
  const executivesLoading = state.matches('loadingExecutives') || state.matches('refreshingExecutives');
  const executivesError = context.error;

  // Helper to check if an executive has been used (set computed above the
  // machine mount — see usedExecutiveRoles).
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

  // Meeting-relevance Tier 0 (PR-1): prefetch each role's weekly pool once per
  // (gameId, week) to learn which execs sit out (empty eligible pool). Fetch
  // errors fail OPEN (exec stays selectable) so a transient network problem
  // never locks a card. Tier 2 (PR-2): the SAME prefetch also records which
  // roles' selected meeting carries `reactiveContext` — zero new requests.
  useEffect(() => {
    if (!gameId) return;
    let isCancelled = false;
    const roleIds = ['ceo', 'head_ar', 'cco', 'cmo', 'head_distribution'];

    (async () => {
      const results = await Promise.all(
        roleIds.map(async (roleId) => {
          try {
            const meetings = await fetchRoleMeetings(roleId, gameId, currentWeek);
            const isReactive = meetings.some((m) => !!m.reactiveContext);
            return [roleId, meetings.length, isReactive] as const;
          } catch {
            return [roleId, -1, false] as const; // unknown → fail open
          }
        })
      );
      if (isCancelled) return;
      setSitOutRoles(new Set(results.filter(([, count]) => count === 0).map(([roleId]) => roleId)));
      setReactiveRoles(new Set(results.filter(([, , isReactive]) => isReactive).map(([roleId]) => roleId)));
    })();

    return () => {
      isCancelled = true;
    };
  }, [gameId, currentWeek]);

  // Sync focus slots (plus the Creative Capital budget and AUTO's exclusion
  // lists — AR-busy and already-used roles) with the machine
  useEffect(() => {
    send({
      type: 'SYNC_SLOTS',
      used: focusSlots.used,
      total: focusSlots.total,
      creativeCapital,
      arOfficeSlotUsed,
      usedExecutiveRoles: usedExecutiveRolesKey ? usedExecutiveRolesKey.split(',') : [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- usedExecutiveRolesKey stands in for the Set (stable, order-independent)
  }, [focusSlots.used, focusSlots.total, creativeCapital, arOfficeSlotUsed, usedExecutiveRolesKey, send]);

  // Sync current week with the machine (clears cache when week changes)
  useEffect(() => {
    send({
      type: 'SYNC_WEEK',
      currentWeek
    });
  }, [currentWeek, send]);

  // C74: consume the header AUTO intent exactly once. We wait until the machine
  // is `idle` (its resting state after executives load) before sending AUTO_SELECT
  // so we never fire on top of an in-flight AUTO/manual flow — if the player lands
  // mid-flow, the intent simply sits pending until the machine returns to idle.
  // The flag is cleared as soon as we send, so a re-render can't double-fire, and
  // it is session/UI state (never persisted), so a reload never re-triggers AUTO.
  const isMachineIdle = state.matches('idle');
  useEffect(() => {
    if (!pendingAutoSelectIntent) return;
    if (!isMachineIdle) return;
    consumePendingAutoSelectIntent();
    // Only actually open the review gate if slots are free; if none are free the
    // header button was disabled, but a slot could have filled between click and
    // arrival — in that case we just clear the intent (the machine's own
    // hasFocusSlots guard on AUTO_SELECT would no-op anyway).
    if (hasAvailableSlots) {
      send({ type: 'AUTO_SELECT' });
    }
  }, [
    pendingAutoSelectIntent,
    isMachineIdle,
    hasAvailableSlots,
    consumePendingAutoSelectIntent,
    send,
  ]);

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
    // Meeting-relevance PR-3 (AUTO Option A): review AUTO's proposed picks before
    // they commit. Execs that sat out never made it into autoOptions, so they
    // never appear here.
    if (state.matches('reviewingAutoSelections')) {
      return (
        <AutoSelectReviewPanel
          options={context.autoOptions}
          onConfirmAll={() => send({ type: 'CONFIRM_AUTO_SELECT' })}
          onCancel={() => send({ type: 'CANCEL_AUTO_SELECT' })}
          onOverrideRow={(executive) => send({ type: 'OVERRIDE_AUTO_ROW', executive })}
        />
      );
    }

    if (state.matches('autoSelecting')) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-neon-cyan mb-2" />
          <span className="text-text-body">AUTO is choosing meetings...</span>
        </div>
      );
    }

    if (state.matches('loadingMeetings')) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-neon-lilac mb-2" />
          <span className="text-text-body">Loading meetings...</span>
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
              aria-label="Back to executive list"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {config && (
              <Badge
                variant="secondary"
                className="text-xs px-3 py-1 font-mono uppercase tracking-wide bg-neon-lilac/10 text-neon-lilac border border-neon-lilac/40 rounded-pill"
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
          <Loader2 className="h-6 w-6 animate-spin text-neon-lilac mb-2" />
          <span className="text-text-body">Loading dialogue...</span>
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
              aria-label="Back to meeting list"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {config && (
              <Badge
                variant="secondary"
                className="text-xs px-3 py-1 font-mono uppercase tracking-wide bg-neon-lilac/10 text-neon-lilac border border-neon-lilac/40 rounded-pill"
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
              availableCreativeCapital={creativeCapital}
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
          <Loader2 className="h-6 w-6 animate-spin text-neon-lilac mb-2" />
          <span className="text-text-body">Processing your choice...</span>
        </div>
      );
    }

    if (state.matches('complete')) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="text-positive font-medium">Meeting completed!</div>
          <p className="text-sm text-text-muted mt-1">Returning to executives...</p>
        </div>
      );
    }

    // Default idle state - show loading if executives haven't loaded yet
    if (executivesLoading && executives.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-neon-lilac mb-2" />
          <span className="text-text-body">Loading executives...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center text-text-muted">
        Select an executive
      </div>
    );
  };

  return (
    <Card className="w-full bg-transparent border-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-text-primary font-display text-lg">
          Executive Meetings
          <div className="flex items-center gap-3">
            {hasAvailableSlots && !isAutoFlowActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => send({ type: 'AUTO_SELECT' })}
                disabled={!hasAvailableSlots || executives.length === 0}
                className="flex items-center gap-1.5 rounded-button border border-neon-cyan/35 bg-neon-cyan/[0.06] text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan"
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
            <div className="p-3 bg-negative/10 border border-negative/30 rounded-card mb-4">
              <p className="text-sm text-negative">Failed to load executives: {executivesError}</p>
              <p className="text-xs text-text-muted mt-1">Please refresh to try again</p>
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
                    sitOut={sitOutRoles.has(executive.role)}
                    hasReactiveMeeting={reactiveRoles.has(executive.role)}
                    onSelect={() => send({ type: 'SELECT_EXECUTIVE', executive })}
                    weeklySalary={roleSalaries[executive.role]}
                    arOfficeStatus={arOfficeStatus}
                    flipAvatar={true}
                    alignContent="left"
                    isSelected={context.selectedExecutive?.role === executive.role}
                    compactBadges={!!context.selectedExecutive}
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
                    sitOut={sitOutRoles.has(executive.role)}
                    hasReactiveMeeting={reactiveRoles.has(executive.role)}
                    onSelect={() => send({ type: 'SELECT_EXECUTIVE', executive })}
                    weeklySalary={roleSalaries[executive.role]}
                    arOfficeStatus={arOfficeStatus}
                    badgesOnLeft={true}
                    alignContent="right"
                    isSelected={context.selectedExecutive?.role === executive.role}
                    compactBadges={!!context.selectedExecutive}
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
                    sitOut={sitOutRoles.has(ceoExecutive.role)}
                    hasReactiveMeeting={reactiveRoles.has(ceoExecutive.role)}
                    onSelect={() => send({ type: 'SELECT_EXECUTIVE', executive: ceoExecutive })}
                    weeklySalary={roleSalaries['ceo']}
                    arOfficeStatus={arOfficeStatus}
                    isSelected={context.selectedExecutive?.role === ceoExecutive.role}
                    compactBadges={!!context.selectedExecutive}
                  />
                )}
              </div>
            </div>
          );
        })())
        }

        {context.error && (
          <div className="mt-4 p-3 bg-negative/10 border border-negative/30 rounded-card">
            <p className="text-sm text-negative">{context.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
